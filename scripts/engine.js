/**
 * BitGate Engine v1.5.0 - Transistor & Multi-Path Logic
 */

function updateSimulation() {
    // 状態の初期化
    components.forEach(c => {
        c.currentI = 0;
        if (c.type === 'BAT') c.isShort = false;
        // トランジスタの内部状態をリセット
        if (c.type === 'TR') c.baseActive = false;
    });
    
    if (!isSimulating) {
        document.getElementById('statusDisp').innerText = "SYSTEM READY";
        return;
    }

    // 各バッテリーに対してシミュレーション実行
    components.filter(c => c.type === 'BAT').forEach(bat => {
        const posP = bat.pins.find(p => p.type === 'POS');
        const negP = bat.pins.find(p => p.type === 'NEG');
        if (!posP || !negP) return;

        // --- STEP 1: ベース(B)への通電チェック ---
        // 電源のプラスから「いずれかのトランジスタのBピン」までのパスがあるか探す
        let baseQueue = [posP.id];
        let visitedBase = new Set();
        while(baseQueue.length > 0) {
            let curr = baseQueue.shift();
            if(visitedBase.has(curr)) continue;
            visitedBase.add(curr);

            // トランジスタのBピンに到達したか？
            components.forEach(c => {
                if(c.type === 'TR') {
                    const bPin = c.pins.find(p => p.type === 'B');
                    if(curr === bPin.id) c.baseActive = true;
                }
            });

            // 配線経由
            wires.forEach(w => {
                if(w.from.pin.id === curr && !visitedBase.has(w.to.pin.id)) baseQueue.push(w.to.pin.id);
                if(w.to.pin.id === curr && !visitedBase.has(w.from.pin.id)) baseQueue.push(w.from.pin.id);
            });

            // コンポーネント内部経由 (TR以外)
            components.forEach(comp => {
                if(comp === bat || comp.type === 'TR') return;
                if(comp.pins.some(p => p.id === curr)) {
                    if((comp.type !== 'PSW' && comp.type !== 'SSW') || comp.state) {
                        comp.pins.forEach(p => { if(p.id !== curr) baseQueue.push(p.id); });
                    }
                }
            });
        }

        // --- STEP 2: 全経路(DFS)探索と合成抵抗計算 ---
        let allPaths = [];
        function findPaths(currentPinId, visitedPins, currentPathComps) {
            if (currentPinId === negP.id) {
                allPaths.push([...currentPathComps]);
                return;
            }

            // 配線経由
            for (let w of wires) {
                let next = (w.from.pin.id === currentPinId) ? w.to.pin.id : (w.to.pin.id === currentPinId) ? w.from.pin.id : null;
                if (next && !visitedPins.has(next)) {
                    visitedPins.add(next);
                    findPaths(next, visitedPins, currentPathComps);
                    visitedPins.delete(next);
                }
            }

            // コンポーネント経由
            for (let comp of components) {
                if (comp === bat) continue;
                if (comp.pins.some(p => p.id === currentPinId)) {
                    let canPass = false;
                    if (comp.type === 'RES' || comp.type === 'LED') canPass = true;
                    if ((comp.type === 'PSW' || comp.type === 'SSW') && comp.state) canPass = true;
                    
                    // トランジスタのスイッチング
                    if (comp.type === 'TR' && comp.baseActive) {
                        // C-E間のみ通れる
                        const pin = comp.pins.find(p => p.id === currentPinId);
                        if (pin.type === 'C' || pin.type === 'E') canPass = true;
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
        }

        findPaths(posP.id, new Set([posP.id]), []);

        // --- STEP 3: 結果の集計 ---
        if (allPaths.length > 0) {
            let invTotalR = 0;
            let pathResults = [];

            allPaths.forEach(path => {
                let pathR = 0.05; 
                path.forEach(c => {
                    let r = Number(c.val) || (c.type === 'LED' ? 20 : 0.05);
                    pathR += c.isBlown ? 10e7 : r;
                });
                invTotalR += (1 / pathR);
                pathResults.push({ path, pathR });
            });

            let totalR = 1 / invTotalR;

            if (totalR < 0.5) {
                bat.isShort = true;
                document.getElementById('statusDisp').innerText = "⚠️ SHORT CIRCUIT!";
                return;
            }

            const totalAmp = Number(bat.val) / totalR;
            pathResults.forEach(res => {
                const pathAmp = Number(bat.val) / res.pathR;
                res.path.forEach(c => {
                    c.currentI += pathAmp;
                    if (c.type === 'LED' && !c.isBlown && c.currentI > 0.05) c.isBlown = true;
                });
            });

            const hasBlown = components.some(c => c.isBlown);
            document.getElementById('statusDisp').innerText = hasBlown ? "💥 DEVICE BLOWN" : "LIVE: " + totalAmp.toFixed(4) + " A";
        } else {
            document.getElementById('statusDisp').innerText = "CIRCUIT OPEN";
        }
    });
}
