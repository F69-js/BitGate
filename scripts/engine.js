function updateSimulation() {
    components.forEach(c => {
        c.currentI = 0;
        if (c.type === 'BAT') c.isShort = false;
        if (c.type === 'TR') c.isBaseActive = false;
        if (c.type === 'NOT_IC') { c.isPowered = false; c.inputActive = false; }
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
                    if (comp.type === 'RES' || comp.type === 'LED') canPass = true;
                    else if (comp.type === 'PSW' || comp.type === 'SSW') canPass = comp.state;
                    else if (comp.type === 'TR') {
                        if (inPin.type === 'C' || inPin.type === 'E') canPass = comp.isBaseActive;
                    } else if (comp.type === 'NOT_IC') {
                        if (comp.isPowered && !comp.inputActive) {
                            if (inPin.type === 'VCC' || inPin.type === 'OUT') canPass = true;
                        }
                    }

                    if (canPass) {
                        for (let outPin of comp.pins) {
                            if (outPin.id !== currentPinId && !visitedPins.has(outPin.id)) {
                                if (comp.type === 'TR' && outPin.type === 'B') continue;
                                if (comp.type === 'NOT_IC') {
                                    const valid = (inPin.type === 'VCC' && outPin.type === 'OUT') || (inPin.type === 'OUT' && outPin.type === 'VCC');
                                    if (!valid) continue;
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
                let nextPinId = (w.from.pin.id === currentPinId) ? w.to.pin.id : (w.to.pin.id === currentPinId) ? w.from.pin.id : null;
                if (nextPinId && !visitedPins.has(nextPinId)) {
                    visitedPins.add(nextPinId);
                    findPaths(nextPinId, visitedPins, currentPathComps);
                    visitedPins.delete(nextPinId);
                }
            }
        };

        findPaths(posP.id, new Set([posP.id]), []);

        if (allPaths.length > 0) {
            let pathData = allPaths.map(path => {
                let r = path.reduce((sum, c) => sum + (c.type === 'LED' ? 20 : (c.type === 'RES' ? Number(c.val) : 0.5)), 0.1);
                return { path, r };
            });
            let invTotalR = pathData.reduce((sum, p) => sum + (1 / p.r), 0);
            let totalR = 1 / invTotalR;
            const systemAmp = Number(bat.val) / totalR;

            pathData.forEach(p => {
                const pAmp = systemAmp * (totalR / p.r);
                p.path.forEach(c => c.currentI += pAmp);
            });

            // 焼損判定
            components.forEach(c => { if (c.type === 'LED' && c.currentI > 0.05) c.isBlown = true; });

            document.getElementById('statusDisp').innerText = "LIVE: " + systemAmp.toFixed(3) + " A";
        } else {
            document.getElementById('statusDisp').innerText = "CIRCUIT OPEN";
        }
    });
}

function checkLogicalStates(bat, posP, negP) {
    components.forEach(comp => {
        if (comp.type === 'TR' || comp.type === 'NOT_IC') {
            const inPin = (comp.type === 'TR') ? comp.pins.find(p => p.type === 'B') : comp.pins.find(p => p.type === 'IN');
            const vccPin = comp.pins.find(p => p.type === 'VCC');
            const gndPin = comp.pins.find(p => p.type === 'GND');

            if (comp.type === 'NOT_IC' && vccPin && gndPin) {
                comp.isPowered = isConnected(vccPin.id, posP.id) && isConnected(gndPin.id, negP.id);
                comp.inputActive = isConnected(inPin.id, posP.id);
            } else if (comp.type === 'TR' && inPin) {
                comp.isBaseActive = isConnected(inPin.id, posP.id);
            }
        }
    });
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
            if (c.pins.some(p => p.id === curr) && (c.type === 'RES' || (c.type.includes('SW') && c.state))) {
                c.pins.forEach(p => queue.push(p.id));
            }
        });
    }
    return false;
}
