/**
 * BitGate Engine v1.7.0 - Voltage Drop Logic
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

        checkBaseActivation(bat, posP, negP);

        let allPaths = [];
        function findPaths(currentPinId, visitedPins, currentPathComps) {
            if (currentPinId === negP.id) {
                allPaths.push([...currentPathComps]);
                return;
            }

            for (let comp of components) {
                if (comp === bat) continue;
                if (comp.pins.some(p => p.id === currentPinId)) {
                    let canPass = true;
                    if (comp.type === 'PSW' || comp.type === 'SSW') {
                        canPass = comp.state === true;
                    } else if (comp.type === 'TR') {
                        const currentPin = comp.pins.find(p => p.id === currentPinId);
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
            // 1. 各パスの抵抗計算
            let pathData = allPaths.map(path => {
                let r = path.reduce((sum, c) => {
                    let val = Number(c.val) || (c.type === 'LED' ? 20 : 0.1);
                    if (c.type === 'TR') val = 0.1; 
                    return sum + (c.isBlown ? 1e9 : val);
                }, 0.05);
                return { path, r };
            });

            // 2. 全体の合成抵抗を算出
            let invTotalR = pathData.reduce((sum, p) => sum + (1 / p.r), 0);
            let totalR = 1 / invTotalR;

            if (totalR < 0.2) {
                bat.isShort = true;
                document.getElementById('statusDisp').innerText = "⚠️ SHORT CIRCUIT!";
                return;
            }

            // 3. 電池全体の電流を計算
            const batVoltage = Number(bat.val);
            const totalSystemAmp = batVoltage / totalR;

            // 4. 各コンポーネントに「自分を通っているパスの合計電流」を割り当てる
            // ただし、並列部分での電圧降下を考慮し、電流を分配する
            pathData.forEach(p => {
                // そのパスが全電流のうちどれだけを占めるか (分流の法則)
                // I_path = I_total * (R_total / R_path)
                const pathAmp = totalSystemAmp * (totalR / p.r);
                
                p.path.forEach(c => {
                    c.currentI += pathAmp;
                    if (c.type === 'LED' && !c.isBlown && c.currentI > 0.1) c.isBlown = true;
                });
            });

            // NOT回路の救済ロジック：
            // もし「非常に抵抗の低いパス（トランジスタON）」が並列に存在する場合、
            // LEDなどの高い抵抗のパスに流れる電流は「見た目上0」に近くする
            components.forEach(c => {
                if (c.type === 'LED' && c.currentI > 0) {
                    // 他のパスに自分より圧倒的に低い抵抗があるかチェック
                    const hasLowResPath = pathData.some(p => p.r < 1.0 && !p.path.includes(c));
                    if (hasLowResPath) {
                        c.currentI *= 0.01; // 電流をカットして消灯させる
                    }
                }
            });

            const hasBlown = components.some(c => c.isBlown);
            document.getElementById('statusDisp').innerText = hasBlown ? "💥 DEVICE BLOWN" : "LIVE: " + totalSystemAmp.toFixed(3) + " A";
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
