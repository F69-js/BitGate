function updateSimulation() {
    components.forEach(c => {
        c.currentI = 0;
        c.isBeingCharged = false;
        if (c.type === 'BAT') c.isShort = false;
        if (c.type === 'TR') c.isBaseActive = false;
        if (c.type === 'NOT_IC') { c.isPowered = false; }
    });
    
    if (!isSimulating) return;

    const batteries = components.filter(c => c.type === 'BAT');
    batteries.forEach(bat => {
        const posP = bat.pins.find(p => p.type === 'POS');
        const negP = bat.pins.find(p => p.type === 'NEG');
        checkLogicalStates(bat, posP, negP);
        processPowerSource(bat, posP, negP, Number(bat.val), true);
    });

    const capacitors = components.filter(c => c.type === 'CAP');
    capacitors.forEach(cap => {
        // 充電されていない場合のみ「放電電源」として振る舞う
        if (!cap.isBeingCharged && cap.charge > 0.01) {
            processPowerSource(cap, cap.pins[0], cap.pins[1], cap.charge, false);
        }
    });

    // 自然放電（漏れ電流）を大幅に抑制：現実的な自己放電に近づける
    capacitors.forEach(c => {
        if (c.currentI === 0 && c.charge > 0) {
            c.charge *= 0.9995; 
        }
    });

    const totalDisplayAmp = batteries.reduce((s, c) => s + c.currentI, 0);
    document.getElementById('statusDisp').innerText = "SYSTEM: " + totalDisplayAmp.toFixed(3) + " A";
}

function processPowerSource(source, startPin, endPin, voltage, isExternalBat) {
    let allPaths = [];
    const findPaths = (currentPinId, visitedPins, currentPathComps) => {
        if (currentPinId === endPin.id) {
            allPaths.push([...currentPathComps]);
            return;
        }

        for (let comp of components) {
            if (comp === source) continue;
            const inPin = comp.pins.find(p => p.id === currentPinId);
            if (inPin) {
                let canPass = false;
                if (comp.type === 'RES' || comp.type === 'LED' || comp.type === 'CAP') canPass = true;
                else if (comp.type === 'PSW' || comp.type === 'SSW') canPass = comp.state;
                else if (comp.type === 'TR' && (inPin.type === 'C' || inPin.type === 'E')) canPass = comp.isBaseActive;
                else if (comp.type === 'NOT_IC' && comp.isPowered) {
                    if (inPin.type === 'VCC' || inPin.type === 'OUT') {
                        const label = inPin.label;
                        if (label && label.startsWith('O')) {
                            const gNum = label.substring(1);
                            if (!comp['inputActive' + gNum]) canPass = true;
                        } else if (inPin.type === 'VCC') canPass = true;
                    }
                }

                if (canPass) {
                    for (let outPin of comp.pins) {
                        if (outPin.id !== currentPinId && !visitedPins.has(outPin.id)) {
                            if (comp.type === 'NOT_IC') {
                                const isPair = (inPin.type === 'VCC' && outPin.label?.startsWith('O')) || 
                                               (inPin.label?.startsWith('O') && outPin.type === 'VCC');
                                if (!isPair) continue;
                            }
                            visitedPins.add(outPin.id);
                            currentPathComps.push(comp);
                            findPaths(outPin.id, visitedPins, currentPathComps);
                            currentPathComps.pop();
                            visitedPins.delete(outPin.id);
                        }
                    }
                }
            }
        }

        for (let w of wires) {
            let next = (w.from.pin.id === currentPinId) ? w.to.pin.id : (w.to.pin.id === currentPinId) ? w.from.pin.id : null;
            if (next && !visitedPins.has(next)) {
                visitedPins.add(next);
                findPaths(next, visitedPins, currentPathComps);
                visitedPins.delete(next);
            }
        }
    };

    findPaths(startPin.id, new Set([startPin.id]), []);

    if (allPaths.length > 0) {
        let pathData = allPaths.map(path => {
            let r = path.reduce((sum, c) => {
                if (c.type === 'LED') return sum + 20;
                if (c.type === 'RES') return sum + Number(c.val);
                if (c.type === 'NOT_IC') return sum + 200;
                if (c.type === 'CAP') return sum + 10; // 内部抵抗を下げて効率を上げる
                return sum + 0.5;
            }, 0.1);
            return { path, r };
        });

        pathData.forEach(p => {
            const pAmp = voltage / p.r;
            // シミュレーション速度の調整（dt）
            // val=1000μF, r=1000Ω のとき 5秒程度持たせるための調整係数
            const dt = 0.005; 

            p.path.forEach(c => {
                c.currentI += pAmp;
                if (c.type === 'LED' && c.currentI > 0.05) c.isBlown = true;
                
                if (c.type === 'CAP') {
                    const capFarad = c.val * 1e-6;
                    if (isExternalBat) {
                        c.isBeingCharged = true;
                        const dV = (pAmp * dt) / capFarad;
                        c.charge = Math.min(voltage, c.charge + dV);
                    }
                }
            });

            if (!isExternalBat) {
                const capFarad = source.val * 1e-6;
                const dV = (pAmp * dt) / capFarad;
                source.charge = Math.max(0, source.charge - dV);
            }
        });
    }
}

function checkLogicalStates(bat, posP, negP) {
    components.forEach(comp => {
        if (comp.type === 'NOT_IC') {
            const vccPin = comp.pins.find(p => p.type === 'VCC');
            const gndPin = comp.pins.find(p => p.type === 'GND');
            comp.isPowered = isConnected(vccPin.id, posP.id) && isConnected(gndPin.id, negP.id);
            
            for (let i = 1; i <= 6; i++) {
                const inP = comp.pins.find(p => p.label === 'I' + i);
                const isHigh = isConnected(inP.id, posP.id);
                const capVoltage = getConnectedCapVoltage(inP.id);
                // 閾値を少し下げて、放電後半でもロジックが維持されるように調整
                comp['inputActive' + i] = isHigh || (capVoltage > Number(bat.val) * 0.3);
            }
        } else if (comp.type === 'TR') {
            const bP = comp.pins.find(p => p.type === 'B');
            comp.isBaseActive = isConnected(bP.id, posP.id) || (getConnectedCapVoltage(bP.id) > 0.7);
        }
    });
}

function getConnectedCapVoltage(startId) {
    let visited = new Set(), queue = [startId], maxV = 0;
    while(queue.length > 0) {
        let curr = queue.shift();
        if (visited.has(curr)) continue;
        visited.add(curr);
        for (let c of components) {
            if (c.pins.some(p => p.id === curr)) {
                if (c.type === 'CAP') maxV = Math.max(maxV, c.charge);
                if (c.type === 'RES' || c.type === 'CAP' || (c.type.includes('SW') && c.state)) {
                    c.pins.forEach(p => queue.push(p.id));
                }
            }
        }
        wires.forEach(w => {
            let next = (w.from.pin.id === curr) ? w.to.pin.id : (w.to.pin.id === curr) ? w.from.pin.id : null;
            if (next) queue.push(next);
        });
    }
    return maxV;
}

function isConnected(startId, targetId) {
    let visited = new Set(), queue = [startId];
    while(queue.length > 0) {
        let curr = queue.shift();
        if (curr === targetId) return true;
        if (visited.has(curr)) continue;
        visited.add(curr);
        wires.forEach(w => {
            let next = (w.from.pin.id === curr) ? w.to.pin.id : (w.to.pin.id === curr) ? w.from.pin.id : null;
            if (next) queue.push(next);
        });
        components.forEach(c => {
            if (c.pins.some(p => p.id === curr)) {
                if (c.type === 'RES' || c.type === 'LED' || c.type === 'CAP' || (c.type.includes('SW') && c.state)) {
                    c.pins.forEach(p => queue.push(p.id));
                }
            }
        });
    }
    return false;
}
