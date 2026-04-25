/**
 * BitGate Engine v1.1.2 - Ultimate Stability Update
 * 修正内容: 数値計算の安全性強化とショート判定のバグ修正
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

        let visitedPins = new Set();
        let queue = [posP.id]; 
        let parentMap = new Map();
        let closed = false;
        let lastPinId = null;

        while(queue.length > 0) {
            let currPinId = queue.shift();
            if (visitedPins.has(currPinId)) continue;
            visitedPins.add(currPinId);
            
            if (currPinId === negP.id) {
                closed = true;
                lastPinId = currPinId;
                break;
            }

            for (let w of wires) {
                let nextPinId = (w.from.pin.id === currPinId) ? w.to.pin.id : (w.to.pin.id === currPinId) ? w.from.pin.id : null;
                if (nextPinId && !visitedPins.has(nextPinId)) {
                    queue.push(nextPinId);
                    parentMap.set(nextPinId, { fromPinId: currPinId, viaComp: null });
                }
            }

            for (let comp of components) {
                if (comp.pins.some(p => p.id === currPinId)) {
                    const isSwitch = (comp.type === 'PSW' || comp.type === 'SSW');
                    if (!isSwitch || comp.state === true) {
                        for (let p of comp.pins) {
                            if (p.id !== currPinId && !visitedPins.has(p.id)) {
                                queue.push(p.id);
                                parentMap.set(p.id, { fromPinId: currPinId, viaComp: comp });
                            }
                        }
                    }
                }
            }
        }

        if (closed) {
            let actualPathComps = new Set();
            let traceId = lastPinId;
            while (traceId && parentMap.has(traceId)) {
                let edge = parentMap.get(traceId);
                if (edge.viaComp) actualPathComps.add(edge.viaComp);
                traceId = edge.fromPinId;
            }

            // --- 抵抗計算 (型変換を厳密に) ---
            let totalR = 0.05; // 最小の配線抵抗
            actualPathComps.forEach(c => {
                let rVal = Number(c.val);
                if (isNaN(rVal)) rVal = 0;

                if (c.type === 'RES') {
                    totalR += c.isBlown ? 10000000 : rVal;
                } else if (c.type === 'LED') {
                    // LED自体に抵抗を持たせる(デフォルト20Ω)
                    totalR += c.isBlown ? 10000000 : (rVal > 0 ? rVal : 20);
                } else {
                    totalR += 0.01; // スイッチ等の微小抵抗
                }
            });

            // --- ショート判定判定の最終チェック ---
            // 抵抗が極端に低い (0.1Ω未満) 場合のみショート
            if (totalR < 0.1) {
                bat.isShort = true;
                document.getElementById('statusDisp').innerText = "⚠️ SHORT CIRCUIT!";
                return;
            }

            const amp = Number(bat.val) / totalR;
            actualPathComps.forEach(c => {
                c.currentI = amp;
                if (c.type === 'LED' && !c.isBlown) {
                    if (amp > 0.05) c.isBlown = true;
                }
            });

            const hasBlown = Array.from(actualPathComps).some(c => c.isBlown);
            document.getElementById('statusDisp').innerText = hasBlown ? "💥 DEVICE BLOWN" : "LIVE: " + amp.toFixed(4) + " A";
        } else {
            document.getElementById('statusDisp').innerText = "CIRCUIT OPEN";
        }
    });
}
