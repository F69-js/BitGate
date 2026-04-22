function updateSimulation() {
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

        while(queue.length > 0) {
            let currId = queue.shift();
            if (visited.has(currId)) continue;
            visited.add(currId);
            
            if (currId === negP.id) closed = true;

            // 1. 配線を辿る
            for (let w of wires) {
                if (w.from.pin.id === currId) queue.push(w.to.pin.id);
                if (w.to.pin.id === currId) queue.push(w.from.pin.id);
            }

            // 2. 部品内部を辿る
            for (let comp of components) {
                if (comp.pins.some(p => p.id === currId)) {
                    // 導通判定の改善: 
                    // スイッチ系パーツ(PSW, SSW)の場合のみ state を参照し、それ以外は常に導通
                    const isSwitch = (comp.type === 'PSW' || comp.type === 'SSW');
                    const canPass = isSwitch ? comp.state : true;

                    if (canPass) {
                        pathComps.add(comp);
                        for (let p of comp.pins) {
                            if (p.id !== currId) queue.push(p.id);
                        }
                    }
                }
            }
        }

        if (closed) {
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
                    if (amp > 0.03 || (bat.val > 5.0 && totalR < 100)) c.isBlown = true;
                }
            });

            const hasBlown = Array.from(pathComps).some(c => c.isBlown);
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
