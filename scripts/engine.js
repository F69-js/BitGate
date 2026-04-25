function updateSimulation() {
    components.forEach(c => {
        c.currentI = 0;
        if (c.type === 'BAT') c.isShort = false;
        if (c.type === 'TR') c.isBaseActive = false;
        if (c.type === 'NOT_IC') { c.isPowered = false; }
    });
    
    if (!isSimulating) return;

    components.filter(c => c.type === 'BAT').forEach(bat => {
        const posP = bat.pins.find(p => p.type === 'POS');
        const negP = bat.pins.find(p => p.type === 'NEG');
        if (!posP || !negP) return;

        checkLogicalStates(bat, posP, negP);

        let allPaths = [];
        const findPaths = (currentPinId, visitedPins, currentPathComps) => {
            if (currentPinId === negP.id) {
                allPaths.push([...currentPathComps]);
                return;
            }

            for (let comp of components) {
                if (comp === bat) continue;
                const inPin = comp.pins.find(p => p.id === currentPinId);
                if (inPin) {
                    let canPass = false;
                    // コンデンサは電圧差がある間だけ電気を通す(簡易モデル)
                    if (comp.type === 'RES' || comp.type === 'LED' || comp.type === 'CAP') canPass = true;
                    else if (comp.type === 'PSW' || comp.type === 'SSW') canPass = comp.state;
                    else if (comp.type === 'TR' && (inPin.type === 'C' || inPin.type === 'E')) canPass = comp.isBaseActive;
                    else if (comp.type === 'NOT_IC' && comp.isPowered) {
                        if (inPin.type === 'VCC' || inPin.type === 'OUT') {
                            const label = inPin.label;
                            if (label && label.startsWith('O')) {
                                const gNum = label.substring(1);
                                if (!comp['inputActive' + gNum]) canPass = true;
                            } else if (inPin.type === 'VCC') {
                                canPass = true;
                            }
                        }
                    }

                    if (canPass) {
                        for (let outPin of comp.pins) {
                            if (outPin.id !== currentPinId && !visitedPins.has(outPin.id)) {
                                if (comp.type === 'NOT_IC') {
                                    const isPair = (inPin.type === 'VCC' && outPin.label?.startsWith('O')) || 
                                                   (inPin.label?.startsWith('O') && outPin.type === 'VCC');
                                    if (!isPair) continue;
                                    const gNum = outPin.label?.startsWith('O') ? outPin.label.substring(1) : inPin.label.substring(1);
                                    if (comp['inputActive' + gNum]) continue; 
                                }
                                if (comp.type === 'TR' && outPin.type === 'B') continue;

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

        findPaths(posP.id, new Set([posP.id]), []);

        if (allPaths.length > 0) {
            let pathData = allPaths.map(path => {
                let r = path.reduce((sum, c) => {
                    if (c.type === 'LED') return sum + 20;
                    if (c.type === 'RES') return sum + Number(c.val);
                    if (c.type === 'NOT_IC') return sum + 200;
                    if (c.type === 'CAP') return sum + 10; // 内部抵抗
                    return sum + 0.5;
                }, 0.1);
                
                // コンデンサによる電圧降下を考慮
                let vDrop = path.reduce((sum, c) => sum + (c.type === 'CAP' ? c.charge : 0), 0);
                return { path, r, vEff: Math.max(0, Number(bat.val) - vDrop) };
            });

            pathData.forEach(p => {
                const pAmp = p.vEff / p.r;
                p.path.forEach(c => {
                    c.currentI += pAmp;
                    if (c.type === 'LED' && c.currentI > 0.05) c.isBlown = true;
                    
                    // コンデンサの充電処理 (Q = CV, I = dQ/dt)
                    if (c.type === 'CAP') {
                        const dt = 0.1; // シミュレーションステップ
                        const capFarad = c.val * 1e-6;
                        const dV = (pAmp * dt) / capFarad;
                        c.charge = Math.min(Number(bat.val), c.charge + dV);
                    }
                });
            });
            
            const totalAmp = pathData.reduce((sum, p) => sum + (p.vEff / p.r), 0);
            document.getElementById('statusDisp').innerText = "LIVE: " + totalAmp.toFixed(3) + " A";
        } else {
            // 放電ロジック (回路が切れている場合、自己放電)
            components.forEach(c => {
                if (c.type === 'CAP' && c.charge > 0) {
                    c.charge *= 0.95; // 簡易的な放電
                }
            });
            document.getElementById('statusDisp').innerText = "CIRCUIT OPEN";
        }
    });
}

function checkLogicalStates(bat, posP, negP) {
    components.forEach(comp => {
        if (comp.type === 'NOT_IC') {
            const vccPin = comp.pins.find(p => p.type === 'VCC');
            const gndPin = comp.pins.find(p => p.type === 'GND');
            comp.isPowered = isConnected(vccPin.id, posP.id) && isConnected(gndPin.id, negP.id);
            
            for (let i = 1; i <= 6; i++) {
                const inP = comp.pins.find(p => p.label === 'I' + i);
                // コンデンサの電圧が閾値(例えば電池の半分)を超えていればHighとみなす
                const isHigh = isConnected(inP.id, posP.id);
                const capVoltage = getConnectedCapVoltage(inP.id);
                comp['inputActive' + i] = isHigh || (capVoltage > bat.val * 0.5);
            }
        } else if (comp.type === 'TR') {
            const bP = comp.pins.find(p => p.type === 'B');
            comp.isBaseActive = isConnected(bP.id, posP.id);
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
