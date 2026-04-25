/**
 * BitGate Engine v1.1.1 - Circuit Simulation Logic
 * 修正内容: ショート判定の安定化と経路計算の精度向上
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

        // --- 経路探索（BFS） ---
        while(queue.length > 0) {
            let currPinId = queue.shift();
            if (visitedPins.has(currPinId)) continue;
            visitedPins.add(currPinId);
            
            if (currPinId === negP.id) {
                closed = true;
                lastPinId = currPinId;
                break;
            }

            // A. 配線経由
            for (let w of wires) {
                let nextPinId = (w.from.pin.id === currPinId) ? w.to.pin.id : (w.to.pin.id === currPinId) ? w.from.pin.id : null;
                if (nextPinId && !visitedPins.has(nextPinId)) {
                    queue.push(nextPinId);
                    parentMap.set(nextPinId, { fromPinId: currPinId, viaComp: null });
                }
            }

            // B. コンポーネント内部経由
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

        // --- 電流計算フェーズ ---
        if (closed) {
            let actualPathComps = new Set();
            let traceId = lastPinId;
            while (traceId && parentMap.has(traceId)) {
                let edge = parentMap.get(traceId);
                if (edge.viaComp) actualPathComps.add(edge.viaComp);
                traceId = edge.fromPinId;
            }

            // 抵抗の計算（配線抵抗 0.01Ω を隠し味に追加して「真のゼロ」を防ぐ）
            let totalR = 0.01; 
            actualPathComps.forEach(c => {
                if (c.type === 'RES') {
                    totalR += c.isBlown ? 10000000 : (parseFloat(c.val) || 0);
                } else if (c.type === 'LED') {
                    // LEDは点灯時に一定の抵抗値を持つものとする（簡易化）
                    totalR += c.isBlown ? 10000000 : (parseFloat(c.val) || 20); 
                } else {
                    // スイッチなどもごくわずかに抵抗があるものとする
                    totalR += 0.01;
                }
            });

            // ショート判定のしきい値を少し緩和（0.1Ω以下をショートとする）
            if (totalR < 0.1) {
                bat.isShort = true;
                document.getElementById('statusDisp').innerText = "⚠️ SHORT CIRCUIT!";
                // ショート時も一応猛烈な電流が流れていることにする
                const shortAmp = bat.val / 0.01;
                actualPathComps.forEach(c => c.currentI = shortAmp);
                return;
            }

            const amp = bat.val / totalR;
            actualPathComps.forEach(c => {
                c.currentI = amp;
                if (c.type === 'LED' && !c.isBlown) {
                    // 電流または電圧過多で死亡判定
                    if (amp > 0.05 || (bat.val > 12 && totalR < 100)) {
                        c.isBlown = true;
                    }
                }
            });

            const hasBlown = Array.from(actualPathComps).some(c => c.isBlown);
            document.getElementById('statusDisp').innerText = hasBlown ? "💥 DEVICE BLOWN" : "LIVE: " + amp.toFixed(4) + " A";
        } else {
            document.getElementById('statusDisp').innerText = "CIRCUIT OPEN";
        }
    });
}

function distToSegment(p, v, w) {
    const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
    if (l2 == 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = Math.max(0, Math.min(1, ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}
