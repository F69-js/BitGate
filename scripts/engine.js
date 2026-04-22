function updateSimulation() {
    // 状態のリセット
    components.forEach(c => {
        c.currentI = 0;
        if (c.type === 'BAT') c.isShort = false;
    });
    
    if (!isSimulating) return;

    components.filter(c => c.type === 'BAT').forEach(bat => {
        const posP = bat.pins.find(p => p.type === 'POS');
        const negP = bat.pins.find(p => p.type === 'NEG');
        if (!posP || !negP) return;

        let visited = new Set();
        let queue = [posP.id];
        let pathComps = new Set();
        let closed = false;

        // --- 探索フェーズ ---
        while(queue.length > 0) {
            let currId = queue.shift();
            if (visited.has(currId)) continue;
            visited.add(currId);
            
            // マイナス端子に到達
            if (currId === negP.id) closed = true;

            // 1. 配線（Wire）の探索
            wires.forEach(w => {
                if (w.from.pin.id === currId) queue.push(w.to.pin.id);
                if (w.to.pin.id === currId) queue.push(w.from.pin.id);
            });

            // 2. コンポーネント（部品）内部の探索
            components.forEach(comp => {
                // 現在のピンがこの部品のピンに含まれているか確認
                const currentPinObj = comp.pins.find(p => p.id === currId);
                
                if (currentPinObj) {
                    // スイッチの場合の導通判定
                    let canPass = true;
                    if (comp.type === 'PSW' || comp.type === 'SSW') {
                        canPass = comp.state; // ONなら通れる、OFFなら通れない
                    }

                    if (canPass) {
                        pathComps.add(comp);
                        // 部品が導通している場合、その部品の「他のすべてのピン」を探索候補に入れる
                        comp.pins.forEach(p => {
                            if (p.id !== currId) {
                                queue.push(p.id);
                            }
                        });
                    }
                }
            });
        }

        // --- 計算フェーズ ---
        if (closed) {
            let totalR = 0;
            pathComps.forEach(c => {
                if (c.type === 'RES' || c.type === 'LED') {
                    // 焼損したLEDは断線(高抵抗)扱い
                    totalR += c.isBlown ? 10000000 : c.val;
                }
            });

            // ショート判定
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

            if (Array.from(pathComps).some(c => c.isBlown)) {
                document.getElementById('statusDisp').innerText = "💥 DEVICE BLOWN";
            } else {
                document.getElementById('statusDisp').innerText = "LIVE: " + amp.toFixed(4) + " A";
            }
        } else {
            document.getElementById('statusDisp').innerText = "CIRCUIT OPEN";
        }
    });
}

// 配線の当たり判定用
function distToSegment(p, v, w) {
    const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
    if (l2 == 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = Math.max(0, Math.min(1, ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}
