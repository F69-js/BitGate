/**
 * BitGate Engine v1.6.0 - Proper Current Distribution
 */

function updateSimulation() {
    components.forEach(c => {
        c.currentI = 0;
        if (c.type === 'BAT') c.isShort = false;
        if (c.type === 'TR') c.isBaseActive = false;
    });
    
    if (!isSimulating) {
        document.getElementById('statusDisp').innerText = "SYSTEM READY";
        return;
    }

    components.filter(c => c.type === 'BAT').forEach(bat => {
        const posP = bat.pins.find(p => p.type === 'POS');
        const negP = bat.pins.find(p => p.type === 'NEG');
        if (!posP || !negP) return;

        // 1. ベースの活性化チェック (前回のロジックを維持)
        checkBaseActivation(bat, posP, negP);

        // 2. すべてのユニークな経路を探索
        let allPaths = [];
        function findPaths(currentPinId, visitedPins, currentPathComps) {
            if (currentPinId === negP.id) {
                allPaths.push([...currentPathComps]);
                return;
            }

            // コンポーネント経由の探索
            for (let comp of components) {
                if (comp === bat) continue;
                if (comp.pins.some(p => p.id === currentPinId)) {
                    let canPass = true;
                    if (comp.type === 'PSW' || comp.type === 'SSW') {
                        canPass = comp.state === true;
                    } else if (comp.type === 'TR') {
                        const currentPin = comp.pins.find(p => p.id === currentPinId);
                        // C-E間はベースがONの時だけ導通
                        if (currentPin.type === 'C' || currentPin.type === 'E') {
                            canPass = comp.isBaseActive;
                        }
                    }

                    if (canPass) {
                        for (let p of comp.pins) {
                            if (p.id !== currentPinId && !visitedPins.has(p.id)) {
                                visitedPins.add(p.id);
                                currentPathComps.push(comp);
                                findPaths(p.id, visitedPins, currentPathComps);
                                currentPathComps.pop();
                                visitedPins.delete(p.id);
                            }
                        }
                    }
                }
            }

            // 配線経由の探索
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

        // 3. 物理法則に基づいた電流計算
        if (allPaths.length > 0) {
            let pathData = allPaths.map(path => {
                // パスごとの合計抵抗を計算
                let r = path.reduce((sum, c) => {
                    let val = Number(c.val) || (c.type === 'LED' ? 20 : 0.1);
                    if (c.type === 'TR') val = 0.1; // ON状態のTRはほぼ抵抗なし
                    return sum + (c.isBlown ? 1e9 : val);
                }, 0.05); // 配線自体の微小抵抗
                return { path, r };
            });

            // 全体の合成抵抗: 1/R_total = 1/R1 + 1/R2 + ...
            let invTotalR = pathData.reduce((sum, p) => sum + (1 / p.r), 0);
            let totalR = 1 / invTotalR;

            if (totalR < 0.2) {
                bat.isShort = true;
                document.getElementById('statusDisp').innerText = "⚠️ SHORT CIRCUIT!";
                return;
            }

            // 各パスに流れる電流: I_path = V / R_path
            const voltage = Number(bat.val);
            let totalAmp = 0;

            pathData.forEach(p => {
                const pathAmp = voltage / p.r;
                totalAmp += pathAmp;
                p.path.forEach(c => {
                    c.currentI += pathAmp;
                    if (c.type === 'LED' && !c.isBlown && c.currentI > 0.1) c.isBlown = true;
                });
            });

            const hasBlown = components.some(c => c.isBlown);
            document.getElementById('statusDisp').innerText = hasBlown ? "💥 DEVICE BLOWN" : "LIVE: " + totalAmp.toFixed(3) + " A";
        } else {
            document.getElementById('statusDisp').innerText = "CIRCUIT OPEN";
        }
    });
}

function checkBaseActivation(bat, posP, negP) {
    components.filter(c => c.type === 'TR').forEach(tr => {
        const basePin = tr.pins.find(p => p.type === 'B');
        let visited = new Set();
        let queue = [basePin.id];
        let connectedToPos = false;

        while(queue.length > 0) {
            let curr = queue.shift();
            if (curr === posP.id) { connectedToPos = true; break; }
            if (visited.has(curr)) continue;
            visited.add(curr);

            wires.forEach(w => {
                let next = (w.from.pin.id === curr) ? w.to.pin.id : (w.to.pin.id === curr) ? w.from.pin.id : null;
                if (next) queue.push(next);
            });
            components.forEach(comp => {
                if (comp.pins.some(p => p.id === curr)) {
                    if (comp.type === 'RES' || ((comp.type === 'PSW' || comp.type === 'SSW') && comp.state)) {
                        comp.pins.forEach(p => queue.push(p.id));
                    }
                }
            });
        }
        tr.isBaseActive = (tr.subType === 'NPN') ? connectedToPos : !connectedToPos;
    });
}
