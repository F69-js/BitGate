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
        if (!cap.isBeingCharged && cap.charge > 0.01) {
            // コンデンサ自身を電源として、Pin1(＋想定)からPin2(－想定)へのパスを探す
            processPowerSource(cap, cap.pins[0], cap.pins[1], cap.charge, false);
        }
    });

    const statusDisp = document.getElementById('statusDisp');
    if (statusDisp) statusDisp.innerText = "SYSTEM: " + batteries.reduce((s, b) => s + b.currentI, 0).toFixed(3) + " A";
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
                // 放電パスとしてTRのベース(B)も許可する
                if (comp.type === 'RES' || comp.type === 'LED' || comp.type === 'CAP' || (comp.type === 'TR' && inPin.type === 'B')) canPass = true;
                else if (comp.type === 'PSW' || comp.type === 'SSW') canPass = comp.state;
                else if (comp.type === 'TR' && (inPin.type === 'C' || inPin.type === 'E')) canPass = comp.isBaseActive;

                if (canPass) {
                    for (let outPin of comp.pins) {
                        if (outPin.id !== currentPinId && !visitedPins.has(outPin.id)) {
                            // TRのBに入ったらE（またはC）へ抜けるパスを許可
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

    allPaths.forEach(path => {
        let r = path.reduce((sum, c) => {
            if (c.type === 'RES') return sum + Number(c.val);
            if (c.type === 'TR') return sum + 500; // ベース抵抗的な内部抵抗
            return sum + 20;
        }, 1);
        
        const pAmp = voltage / r;
        const dt = 0.1;
        const sensitivity = 0.00001; 

        path.forEach(c => {
            c.currentI += pAmp;
            if (c.type === 'CAP' && isExternalBat) {
                c.isBeingCharged = true;
                c.charge = Math.min(voltage, c.charge + (pAmp * dt) / (Math.max(1, c.val) * sensitivity * 10));
            }
        });

        if (!isExternalBat) {
            source.charge = Math.max(0, source.charge - (pAmp * dt) / (Math.max(1, source.val) * sensitivity));
        }
    });
}

function checkLogicalStates(bat, posP, negP) {
    components.forEach(comp => {
        if (comp.type === 'TR') {
            const bP = comp.pins.find(p => p.type === 'B');
            // 電池に直結しているか、またはコンデンサの電荷が一定以上あるか
            const hasDirectPos = isConnected(bP.id, posP.id);
            const capV = getConnectedCapVoltage(bP.id);
            comp.isBaseActive = hasDirectPos || (capV > 0.6);
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
