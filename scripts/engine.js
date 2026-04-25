/**
 * engine.js - Logic IC Simulation
 */

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

        // 1. ベースとICの電源チェック
        checkLogicalStates(bat, posP, negP);

        // 2. 経路探索
        let allPaths = [];
        function findPaths(currentPinId, visitedPins, currentPathComps) {
            if (currentPinId === negP.id) {
                allPaths.push([...currentPathComps]);
                return;
            }

            for (let comp of components) {
                if (comp === bat) continue;
                if (comp.pins.some(p => p.id === currentPinId)) {
                    let canPass = false;
                    const inPin = comp.pins.find(p => p.id === currentPinId);

                    if (comp.type === 'RES' || comp.type === 'LED') {
                        canPass = true;
                    } else if (comp.type === 'PSW' || comp.type === 'SSW') {
                        canPass = comp.state;
                    } else if (comp.type === 'TR') {
                        if (inPin.type === 'C' || inPin.type === 'E') canPass = comp.isBaseActive;
                    } else if (comp.type === 'NOT_IC') {
                        // ICの内部を電気が通る判定 (OUTピンからNEGに流れるパスがあるか)
                        if (inPin.type === 'OUT' && comp.isPowered && !comp.inputActive) {
                            canPass = true; // 電源ONかつ入力OFFの時、内部でVCCとOUTがつながる
                        }
                    }

                    if (canPass) {
                        for (let outPin of comp.pins) {
                            if (outPin.id !== currentPinId && !visitedPins.has(outPin.id)) {
                                if (comp.type === 'TR' && outPin.type === 'B') continue;
                                if (comp.type === 'NOT_IC' && outPin.type !== 'OUT' && inPin.type === 'OUT') continue;
                                // NOT ICの入力ピン自体は電流を通さない(高インピーダンス)
                                if (comp.type === 'NOT_IC' && inPin.type === 'IN') continue;

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
        }

        findPaths(posP.id, new Set([posP.id]), []);

        // --- 電流計算 (簡略化) ---
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
            document.getElementById('statusDisp').innerText = "LIVE: " + systemAmp.toFixed(3) + " A";
        }
    });
}

function checkLogicalStates(bat, posP, negP) {
    components.forEach(comp => {
        if (comp.type === 'TR' || comp.type === 'NOT_IC') {
            const checkPin = (comp.type === 'TR') ? comp.pins.find(p => p.type === 'B') : comp.pins.find(p => p.type === 'IN');
            const vccPin = comp.pins.find(p => p.type === 'VCC');
            const gndPin = comp.pins.find(p => p.type === 'GND');

            // 簡易的な通電チェック (VCCとGNDが電池に繋がっているか)
            if (comp.type === 'NOT_IC') {
                comp.isPowered = isConnected(vccPin.id, posP.id) && isConnected(gndPin.id, negP.id);
                comp.inputActive = isConnected(checkPin.id, posP.id);
            } else {
                comp.isBaseActive = isConnected(checkPin.id, posP.id);
            }
        }
    });
}

function isConnected(startId, targetId) {
    let visited = new Set();
    let queue = [startId];
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
