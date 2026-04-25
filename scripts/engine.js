unction updateSimulation() {
    // 1. 全状態のリセット
    components.forEach(c => {
        c.currentI = 0;
        if (c.type === 'BAT') c.isShort = false;
    });
    
    if (!isSimulating) {
        document.getElementById('statusDisp').innerText = "SYSTEM READY";
        return;
    }

    // 2. 各電源（BAT）ごとに回路を探索
    components.filter(c => c.type === 'BAT').forEach(bat => {
        const posP = bat.pins.find(p => p.type === 'POS');
        const negP = bat.pins.find(p => p.type === 'NEG');
        if (!posP || !negP) return;

        let visitedPins = new Set();
        let queue = [posP.id]; 
        let parentMap = new Map(); // 経路復元用: { 到着ピンID: { fromPinId, viaComp } }
        let closed = false;
        let lastPinId = null;

        // --- 経路探索（BFS） ---
        while(queue.length > 0) {
            let currPinId = queue.shift();
            if (visitedPins.has(currPinId)) continue;
            visitedPins.add(currPinId);
            
            // マイナス端子に到達したか確認
            if (currPinId === negP.id) {
                closed = true;
                lastPinId = currPinId;
                break; // 到達したら探索終了
            }

            // A. 配線（Wire）を介して移動
            for (let w of wires) {
                let nextPinId = null;
                if (w.from.pin.id === currPinId) nextPinId = w.to.pin.id;
                else if (w.to.pin.id === currPinId) nextPinId = w.from.pin.id;

                if (nextPinId && !visitedPins.has(nextPinId)) {
                    queue.push(nextPinId);
                    parentMap.set(nextPinId, { fromPinId: currPinId, viaComp: null });
                }
            }

            // B. コンポーネント内部を介して移動
            for (let comp of components) {
                const hasThisPin = comp.pins.some(p => p.id === currPinId);
                if (hasThisPin) {
                    const isSwitch = (comp.type === 'PSW' || comp.type === 'SSW');
                    const canPass = isSwitch ? comp.state === true : true;

                    if (canPass) {
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
            let totalR = 0;
            let actualPathComps = new Set();

            // parentMapを逆流して、実際に電気が通っている部品だけを特定
            let traceId = lastPinId;
            while (traceId && parentMap.has(traceId)) {
                let edge = parentMap.get(traceId);
                if (edge.viaComp) actualPathComps.add(edge.viaComp);
                traceId = edge.fromPinId;
            }

            // 抵抗の合計計算
            actualPathComps.forEach(c => {
                if (c.type === 'RES' || c.type === 'LED') {
                    totalR += c.isBlown ? 10000000 : c.val;
                }
            });

            // 抵抗がほぼゼロならショート
            if (totalR < 0.1) {
                bat.isShort = true;
                document.getElementById('statusDisp').innerText = "⚠️ SHORT CIRCUIT!";
                return;
            }

            const amp = bat.val / totalR;
            actualPathComps.forEach(c => {
                c.currentI = amp;
                if (c.type === 'LED' && !c.isBlown) {
                    if (amp > 0.03 || (bat.val > 5.0 && totalR < 50)) {
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
