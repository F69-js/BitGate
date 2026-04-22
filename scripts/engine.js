function updateSimulation() {
    // 1. 状態の完全リセット
    components.forEach(c => {
        c.currentI = 0;
        if (c.type === 'BAT') c.isShort = false;
    });
    
    // シミュレーション実行中（RUN SYSTEM）でなければ計算しない
    if (!isSimulating) return;

    // 2. 各電源（BAT）ごとに回路を探索
    components.filter(c => c.type === 'BAT').forEach(bat => {
        const posP = bat.pins.find(p => p.type === 'POS');
        const negP = bat.pins.find(p => p.type === 'NEG');
        if (!posP || !negP) return;

        let visited = new Set();
        let queue = [posP.id]; // プラス端子からスタート
        let pathComps = new Set();
        let closed = false;

        // --- 経路探索（BFS） ---
        while(queue.length > 0) {
            let currId = queue.shift();
            if (visited.has(currId)) continue;
            visited.add(currId);
            
            // マイナス端子に到達したか
            if (currId === negP.id) {
                closed = true;
            }

            // A. 配線（Wire）を辿る
            for (let w of wires) {
                if (w.from.pin.id === currId) queue.push(w.to.pin.id);
                if (w.to.pin.id === currId) queue.push(w.from.pin.id);
            }

            // B. コンポーネント（部品）内部を辿る
            for (let comp of components) {
                // その部品が今調べているピン(currId)を持っているか？
                let hasThisPin = false;
                for (let p of comp.pins) {
                    if (p.id === currId) {
                        hasThisPin = true;
                        break;
                    }
                }

                if (hasThisPin) {
                    // 導通チェック（スイッチがOFFなら、その部品内の他ピンへは行かせない）
                    let canPass = true;
                    if (comp.type === 'PSW' || comp.type === 'SSW') {
                        canPass = comp.state; 
                    }

                    if (canPass) {
                        pathComps.add(comp);
                        // 部品内の「他のピン」をすべて探索候補に入れる
                        for (let p of comp.pins) {
                            if (p.id !== currId) {
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
            pathComps.forEach(c => {
                if (c.type === 'RES' || c.type === 'LED') {
                    // 焼損したLEDは断線(10MΩ)扱い
                    totalR += c.isBlown ? 10000000 : c.val;
                }
            });

            // 合計抵抗が極端に低い場合はショート
            if (totalR < 0.1) {
                bat.isShort = true;
                document.getElementById('statusDisp').innerText = "⚠️ SHORT CIRCUIT!";
                return;
            }

            const amp = bat.val / totalR;
            pathComps.forEach(c => {
                if (c.type === 'LED' && !c.isBlown) {
                    c.currentI = amp;
                    // 焼損判定 (30mA以上、または高圧直結)
                    if (amp > 0.03 || (bat.val > 5.0 && totalR < 100)) {
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

// 配線の当たり判定（配線削除用：ui.jsから参照）
function distToSegment(p, v, w) {
    const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
    if (l2 == 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = Math.max(0, Math.min(1, ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}
