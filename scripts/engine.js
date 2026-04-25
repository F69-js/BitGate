/**
 * BitGate Engine v1.3.0 - Multi-Path Parallel Support
 * 修正内容: 複数経路の探索と合成抵抗（逆数和）による電流計算
 */

function updateSimulation() {
    components.forEach(c => {
        c.currentI = 0;
        if (c.type === 'BAT') c.isShort = false;
    });
    
    if (!isSimulating) {
        document.getElementById('statusDisp').innerText = "SYSTEM READY";
        return;
    }

    components.filter(c => c.type === 'BAT').forEach(bat => {
        const posP = bat.pins.find(p => p.type === 'POS');
        const negP = bat.pins.find(p => p.type === 'NEG');
        if (!posP || !negP) return;

        // 1. 全ての「独立した経路」を探す (簡易的な深さ優先探索)
        let allPaths = [];
        function findPaths(currentPinId, visitedPins, currentPathComps) {
            if (currentPinId === negP.id) {
                allPaths.push([...currentPathComps]);
                return;
            }

            // A. 配線経由
            for (let w of wires) {
                let nextPinId = (w.from.pin.id === currentPinId) ? w.to.pin.id : (w.to.pin.id === currentPinId) ? w.from.pin.id : null;
                if (nextPinId && !visitedPins.has(nextPinId)) {
                    visitedPins.add(nextPinId);
                    findPaths(nextPinId, visitedPins, currentPathComps);
                    visitedPins.delete(nextPinId);
                }
            }

            // B. コンポーネント経由
            for (let comp of components) {
                if (comp === bat) continue;
                if (comp.pins.some(p => p.id === currentPinId)) {
                    const isSwitch = (comp.type === 'PSW' || comp.type === 'SSW');
                    if (!isSwitch || comp.state === true) {
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
        }

        findPaths(posP.id, new Set([posP.id]), []);

        // 2. 電流計算 (並列回路の合成抵抗計算)
        if (allPaths.length > 0) {
            let invTotalR = 0;
            let pathResults = [];

            allPaths.forEach(path => {
                let pathR = 0.05; // 経路ごとの微小抵抗
                path.forEach(c => {
                    let r = Number(c.val) || (c.type === 'LED' ? 20 : 0.01);
                    pathR += c.isBlown ? 10e7 : r;
                });
                
                // アドミタンス (1/R) を加算
                invTotalR += (1 / pathR);
                pathResults.push({ path, pathR });
            });

            let totalR = 1 / invTotalR;

            if (totalR < 0.5) {
                bat.isShort = true;
                document.getElementById('statusDisp').innerText = "⚠️ SHORT CIRCUIT!";
                return;
            }

            // 全体電流 I = V / R_total
            const totalAmp = Number(bat.val) / totalR;

            // 各経路に電流を分配 (I_n = V / R_n)
            pathResults.forEach(res => {
                const pathAmp = Number(bat.val) / res.pathR;
                res.path.forEach(c => {
                    // 同じ部品が複数の経路に含まれる場合は電流を加算
                    c.currentI += pathAmp;
                    if (c.type === 'LED' && !c.isBlown && c.currentI > 0.05) {
                        c.isBlown = true;
                    }
                });
            });

            const hasBlown = components.some(c => c.isBlown);
            document.getElementById('statusDisp').innerText = hasBlown ? "💥 DEVICE BLOWN" : "LIVE: " + totalAmp.toFixed(4) + " A";
        } else {
            document.getElementById('statusDisp').innerText = "CIRCUIT OPEN";
        }
    });
}
