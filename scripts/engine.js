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

        // 1. 論理状態の事前スキャン
        checkLogicalStates(bat, posP, negP);

        // 2. 経路探索
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
                        if (comp.isPowered) {
                            // 現在のピンが I1〜I6 または O1〜O6 のどれに該当するか特定
                            const label = inPin.label;
                            const gateNum = label.substring(1); // '1'〜'6'
                            const isInputSide = label.startsWith('I');
                            const isOutputSide = label.startsWith('O');

                            // NOTロジック: 入力がLowのときだけ、内部でVCCとOUTが繋がる
                            if (!comp['inputActive' + gateNum]) {
                                if (inPin.type === 'VCC' || isOutputSide) canPass = true;
                            }
                        }
                    }

                    if (canPass) {
                        for (let outPin of comp.pins) {
                            if (outPin.id !== currentPinId && !visitedPins.has(outPin.id)) {
                                if (comp.type === 'TR' && outPin.type === 'B') continue;
                                if (comp.type === 'NOT_IC') {
                                    const labelIn = inPin.label;
                                    const labelOut = outPin.label;
                                    const gateNum = labelIn.startsWith('VCC') ? labelOut.substring(1) : labelIn.substring(1);

                                    // VCC -> Ox への導通、または Ox -> VCC への導通のみ許可
                                    const isVccToOut = (inPin.type === 'VCC' && labelOut.startsWith('O'));
                                    const isOutToVcc = (labelIn.startsWith('O') && outPin.type === 'VCC');

                                    // 対応するゲートの入力がHighなら、VCCとの接続を遮断
                                    if ((isVccToOut || isOutToVcc) && comp['inputActive' + gateNum]) continue;

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

            // 3. 電流計算
            if (allPaths.length > 0) {
                let pathData = allPaths.map(path => {
                    let r = path.reduce((sum, c) => {
                        if (c.type === 'LED') return sum + 20;
                        if (c.type === 'RES') return sum + Number(c.val);
                        if (c.type === 'NOT_IC') return sum + 100; // IC内部を通る時に100Ωの抵抗を付加
                        return sum + 0.5; // 配線などの微小抵抗
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
            comp.isPowered = isConnected(vccPin.id, posP.id) && isConnected(gndPin.id, negP.id);

            // 6回路分の入力をスキャン
            for (let i = 1; i <= 6; i++) {
                const inPin = comp.pins.find(p => p.label === 'I' + i);
                // 各ゲートの入力がHighかどうかを保持
                comp['inputActive' + i] = isConnected(inPin.id, posP.id);
            }
        } else if (comp.type === 'TR') {
            const bPin = comp.pins.find(p => p.type === 'B');
            comp.isBaseActive = isConnected(bPin.id, posP.id);
        }
    });
}
function isConnected(startId, targetId) {
    let visited = new Set(), queue = [startId];
    while (queue.length > 0) {
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
                // 抵抗やON状態のスイッチは電気を通す
                if (c.type === 'RES' || c.type === 'LED' || ((c.type === 'PSW' || c.type === 'SSW') && c.state)) {
                    c.pins.forEach(p => queue.push(p.id));
                }
            }
        });
    }
    return false;
}
