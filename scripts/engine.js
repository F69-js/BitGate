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

        // 1. まず物理的な接続ルート（配線）をすべて洗い出す（スイッチの状態無視）
        let visited = new Set();
        let queue = [posP.id];
        let pathComps = new Set();
        let closed = false;

        while(queue.length > 0) {
            let currId = queue.shift();
            if (visited.has(currId)) continue;
            visited.add(currId);
            
            if (currId === negP.id) closed = true;

            // 配線(Wire)の探索
            wires.forEach(w => {
                if (w.from.pin.id === currId) queue.push(w.to.pin.id);
                if (w.to.pin.id === currId) queue.push(w.from.pin.id);
            });

            // コンポーネント内部の探索（ここではスイッチのON/OFFに関わらず「道」として通る）
            components.forEach(comp => {
                if (comp.pins.some(p => p.id === currId)) {
                    pathComps.add(comp);
                    comp.pins.forEach(p => {
                        if (p.id !== currId) queue.push(p.id);
                    });
                }
            });
        }

        // 2. 回路が物理的に繋がっている場合、スイッチの状態をチェック
        if (closed) {
            // ルート上にある全てのスイッチがONであることを確認 (AND条件)
            let allSwitchesOn = true;
            pathComps.forEach(c => {
                if ((c.type === 'PSW' || c.type === 'SSW') && !c.state) {
                    allSwitchesOn = false;
                }
            });

            if (!allSwitchesOn) {
                document.getElementById('statusDisp').innerText = "CIRCUIT OPEN (SW OFF)";
                return; // 導通していないので計算終了
            }

            // 3. 計算フェーズ (全てONの場合のみ)
            let totalR = 0;
            pathComps.forEach(c => {
                if (c.type === 'RES' || c.type === 'LED') {
                    totalR += c.isBlown ? 10000000 : c.val;
                }
            });

            if (totalR < 0.1) {
                bat.isShort = true;
                document.getElementById('statusDisp').innerText = "⚠️ SHORT CIRCUIT!";
                return;
            }

            const amp = bat.val / totalR;
            pathComps.forEach(c => {
                if (c.type === 'LED' && !c.isBlown) {
                    c.currentI = amp;
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

function distToSegment(p, v, w) {
    const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
    if (l2 == 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = Math.max(0, Math.min(1, ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}
