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

        // 1. 論理状態のスキャン
        checkLogicalStates(bat, posP, negP);

        // 2. パス探索
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
                    else if (comp.type === 'TR' && (inPin.type === 'C' || inPin.type === 'E')) canPass = comp.isBaseActive;
                    else if (comp.type === 'NOT_IC' && comp.isPowered) {
                        // NOTロジック: 入力がLowならVCCからOUTへ通電
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
                                    // 内部パスを VCC <-> Ox のペアに限定（ショート防止）
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

        // 3. 電流計算
        if (allPaths.length > 0) {
            let pathData = allPaths.map(path => {
                let r = path.reduce((sum, c) => {
                    if (c.type === 'LED') return sum + 20;
                    if (c.type === 'RES') return sum + Number(c.val);
                    if (c.type === 'NOT_IC') return sum + 200; // IC内部抵抗
                    return sum + 0.5;
                }, 0.1);
                return { path, r };
            });
            let invTotalR = pathData.reduce((sum, p) => sum + (1 / p.r), 0);
            let totalR = 1 / invTotalR;
            const systemAmp = Number(bat.val) / totalR;

            pathData.forEach(p => {
                const pAmp = systemAmp * (totalR / p.r);
                p.path.forEach(c => {
                    c.currentI += pAmp;
                    if (c.type === 'LED' && c.currentI > 0.05) c.isBlown = true;
                });
            });
            document.getElementById('statusDisp').innerText = "LIVE: " + systemAmp.toFixed(3) + " A";
        } else {
            document.getElementById('statusDisp').innerText = "CIRCUIT OPEN";
        }
    });
}

function checkLogicalStates(bat, posP, negP) {
    components.forEach(comp => {
        if (comp.type === 'NOT_IC') {
            const vccPin = comp.pins.find(p => p.type === 'VCC');
            const gndPin = comp.pins.find(p => p.type === 'GND');
            // 通電判定: VCCとGNDが電池の正負にそれぞれ接続されているか
            comp.isPowered = isConnected(vccPin.id, posP.id) && isConnected(gndPin.id, negP.id);
            
            for (let i = 1; i <= 6; i++) {
                const inP = comp.pins.find(p => p.label === 'I' + i);
                comp['inputActive' + i] = isConnected(inP.id, posP.id);
            }
        } else if (comp.type === 'TR') {
            const bP = comp.pins.find(p => p.type === 'B');
            comp.isBaseActive = isConnected(bP.id, posP.id);
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
            if (c.pins.some(p => p.id === curr)) {
                // ロジックICの内部はisConnected判定では通さない（ショート判定ミス防止）
                if (c.type === 'RES' || c.type === 'LED' || (c.type.includes('SW') && c.state)) {
                    c.pins.forEach(p => queue.push(p.id));
                }
            }
        });
    }
    return false;
}
