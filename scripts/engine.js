/**
 * BitGate Engine v1.8.0 - Logical Circuit Optimization
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

    // 1. まず全トランジスタのベース状態を確定させる
    components.filter(c => c.type === 'BAT').forEach(bat => {
        checkBaseActivation(bat);
    });

    // 2. メインの電流計算
    components.filter(c => c.type === 'BAT').forEach(bat => {
        const posP = bat.pins.find(p => p.type === 'POS');
        const negP = bat.pins.find(p => p.type === 'NEG');
        if (!posP || !negP) return;

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

                    // --- 導通判定の厳格化 ---
                    if (comp.type === 'RES' || comp.type === 'LED') {
                        canPass = true; 
                    } else if (comp.type === 'PSW' || comp.type === 'SSW') {
                        canPass = comp.state === true;
                    } else if (comp.type === 'TR') {
                        // コレクタかエミッタに入ってきた場合、ベースがONなら通過可能
                        if (inPin.type === 'C' || inPin.type === 'E') {
                            canPass = comp.isBaseActive;
                        }
                    }

                    if (canPass) {
                        for (let outPin of comp.pins) {
                            if (outPin.id !== currentPinId && !visitedPins.has(outPin.id)) {
                                // トランジスタの場合、Bピンへの通り抜けは禁止（C-E間のみ）
                                if (comp.type === 'TR' && outPin.type === 'B') continue;
                                if (comp.type === 'TR' && inPin.type === 'B') continue;

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

        if (allPaths.length > 0) {
            let pathData = allPaths.map(path => {
                let r = path.reduce((sum, c) => {
                    let val = Number(c.val) || (c.type === 'LED' ? 20 : 0.1);
                    if (c.type === 'TR') val = 0.5; // トランジスタ自体の抵抗
                    return sum + (c.isBlown ? 1e9 : val);
                }, 0.1);
                return { path, r };
            });

            let invTotalR = pathData.reduce((sum, p) => sum + (1 / p.r), 0);
            let totalR = 1 / invTotalR;

            if (totalR < 0.2) {
                bat.isShort = true;
                document.getElementById('statusDisp').innerText = "⚠️ SHORT CIRCUIT!";
                return;
            }

            const totalSystemAmp = Number(bat.val) / totalR;

            pathData.forEach(p => {
                const pathAmp = totalSystemAmp * (totalR / p.r);
                p.path.forEach(c => {
                    c.currentI += pathAmp;
                    if (c.type === 'LED' && !c.isBlown && c.currentI > 0.1) c.isBlown = true;
                });
            });

            // NOT回路用のバイパス制御（低抵抗パスへの電流集中）
            components.forEach(c => {
                if (c.type === 'LED' && c.currentI > 0) {
                    const hasLowResPath = pathData.some(p => p.r < 2.0 && !p.path.includes(c));
                    if (hasLowResPath) c.currentI = 0; 
                }
            });

            document.getElementById('statusDisp').innerText = "LIVE: " + totalSystemAmp.toFixed(3) + " A";
        } else {
            document.getElementById('statusDisp').innerText = "CIRCUIT OPEN";
        }
    });
}

function checkBaseActivation(bat) {
    const posP = bat.pins.find(p => p.type === 'POS');
    const negP = bat.pins.find(p => p.type === 'NEG');

    components.filter(c => c.type === 'TR').forEach(tr => {
        const basePin = tr.pins.find(p => p.type === 'B');
        let visited = new Set();
        let queue = [basePin.id];
        let hasV = false;

        while(queue.length > 0) {
            let curr = queue.shift();
            if (curr === posP.id) { hasV = true; break; }
            if (visited.has(curr)) continue;
            visited.add(curr);

            wires.forEach(w => {
                let next = (w.from.pin.id === curr) ? w.to.pin.id : (w.to.pin.id === curr) ? w.from.pin.id : null;
                if (next) queue.push(next);
            });
            components.forEach(comp => {
                if (comp.pins.some(p => p.id === curr)) {
                    // ベースに電気を届けるのは、抵抗、スイッチ、または別のTR(ON状態)のみ
                    if (comp.type === 'RES' || ((comp.type === 'PSW' || comp.type === 'SSW') && comp.state) || (comp.type === 'TR' && comp.isBaseActive)) {
                        comp.pins.forEach(p => queue.push(p.id));
                    }
                }
            });
        }
        tr.isBaseActive = (tr.subType === 'NPN') ? hasV : !hasV;
    });
}
