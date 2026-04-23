function updateSimulation() {
    // 1. 全状態のリセット
    components.forEach(c => {
        c.currentI = 0;
        if (c.type === 'BAT') c.isShort = false;
    });
    
    if (!isSimulating) return;

    // 2. 各電源（BAT）ごとに回路を探索
    components.filter(c => c.type === 'BAT').forEach(bat => {
        const posP = bat.pins.find(p => p.type === 'POS');
        const negP = bat.pins.find(p => p.type === 'NEG');
        if (!posP || !negP) return;

        let visitedPins = new Set();
        let queue = [posP.id]; 
        let pathComps = new Set();
        let closed = false;

        // --- 経路探索（BFS） ---
        while(queue.length > 0) {
            let currPinId = queue.shift();
            if (visitedPins.has(currPinId)) continue;
            visitedPins.add(currPinId);
            
            // マイナス端子に到達したか確認
            if (currPinId === negP.id) {
                closed = true;
            }

            // A. 配線（Wire）を介して隣のピンへ移動
            for (let w of wires) {
                if (w.from.pin.id === currPinId) queue.push(w.to.pin.id);
                if (w.to.pin.id === currPinId) queue.push(w.from.pin.id);
            }

            // B. コンポーネント（部品）の内部を介して反対側のピンへ移動
            for (let comp of components) {
                // この部品に現在探索中のピンが含まれているか
                const hasThisPin = comp.pins.some(p => p.id === currPinId);
                
                if (hasThisPin) {
                    // 【重要】導通判定
                    // スイッチ系ならONの時だけ、それ以外は常に導通
                    const isSwitch = (comp.type === 'PSW' || comp.type === 'SSW');
                    const canPass = isSwitch ? comp.state === true : true;

                    if (canPass) {
                        // 導通している場合のみ、この部品を経路リストに追加
                        pathComps.add(comp);
                        // 部品内の「他のすべてのピン」を次回の探索候補に入れる
                        for (let p of comp.pins) {
                            if (p.id !== currPinId) {
                                queue.push(p.id);
                            }
                        }
                    }
                }
            }
        }

        // --- 電流計算フェーズ ---
        if (closed) {
            let totalR = 0;
            // 実際に電気が流れている（pathCompsに含まれる）部品の抵抗を合計
            pathComps.forEach(c => {
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
            pathComps.forEach(c => {
                if (c.type === 'LED' && !c.isBlown) {
                    c.currentI = amp;
                    // 焼損判定
                    if (amp > 0.03 || (bat.val > 5.0 && totalR < 50)) {
                        c.isBlown = true;
                    }
                }
            });

            const hasBlown = Array.from(pathComps).some(c => c.isBlown);
            document.getElementById('statusDisp').innerText = hasBlown ? "💥 DEVICE BLOWN" : "LIVE: " + amp.toFixed(4) + " A";
        } else {
            document.getElementById('statusDisp').innerText = "CIRCUIT OPEN";
        }
    });
}

// 配線の当たり判定（ui.js用）
function distToSegment(p, v, w) {
    const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
    if (l2 == 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = Math.max(0, Math.min(1, ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}
