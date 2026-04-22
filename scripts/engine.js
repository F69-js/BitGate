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
        
        let visited = new Set();
        let queue = [posP.id];
        let pathComps = [];
        let closed = false;

        // 経路探索（幅優先探索）
        while(queue.length > 0) {
            let currId = queue.shift();
            if (visited.has(currId)) continue;
            visited.add(currId);
            
            if (currId === negP.id) closed = true;

            // 配線を通じた移動
            wires.forEach(w => {
                if (w.from.pin.id === currId) queue.push(w.to.pin.id);
                if (w.to.pin.id === currId) queue.push(w.from.pin.id);
            });

            // コンポーネントを通じた移動
            components.forEach(comp => {
                if (comp.pins.some(p => p.id === currId)) {
                    // スイッチがオフなら導通しない
                    if ((comp.type === 'PSW' || comp.type === 'SSW') && !comp.state) return;
                    
                    pathComps.push(comp);
                    comp.pins.forEach(p => {
                        if (p.id !== currId) queue.push(p.id);
                    });
                }
            });
        }

        // 回路が閉じている場合の計算
        if (closed) {
            let totalR = 0;
            pathComps.forEach(c => {
                if (c.type === 'RES' || c.type === 'LED') {
                    // LEDが焼損している場合は断線状態（高抵抗）とみなす
                    totalR += c.isBlown ? 1000000 : c.val;
                }
            });

            // ショート判定 (合計抵抗が0.1Ω以下)
            if (totalR < 0.1) {
                bat.isShort = true;
                document.getElementById('statusDisp').innerText = "⚠️ SHORT CIRCUIT!";
                return;
            }

            const amp = bat.val / totalR;

            pathComps.forEach(c => {
                if (c.type === 'LED' && !c.isBlown) {
                    c.currentI = amp;
                    
                    // 破壊判定ロジック
                    // 1. 電流による判定: 0.03A (30mA) を超えると焼き切れる
                    // 2. 電圧による簡易判定: 抵抗が少なすぎる状態で高電圧をかけると即死
                    const excessiveCurrent = amp > 0.03;
                    const excessiveVoltage = (bat.val > 5.0 && totalR < 100); 

                    if (excessiveCurrent || excessiveVoltage) {
                        c.isBlown = true;
                    }
                }
            });

            // ステータス表示の更新
            if (pathComps.some(c => c.isBlown)) {
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
