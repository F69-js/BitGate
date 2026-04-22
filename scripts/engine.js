function updateSimulation() {
    // 全コンポーネントの状態リセット
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
            
            if (currId === negP.id) {
                closed = true;
            }

            // 1. 配線(Wire)の探索
            wires.forEach(w => {
                if (w.from.pin.id === currId) queue.push(w.to.pin.id);
                if (w.to.pin.id === currId) queue.push(w.from.pin.id);
            });

            // 2. コンポーネント内部の探索
            components.forEach(comp => {
                const hasPin = comp.pins.some(p => p.id === currId);
                
                if (hasPin) {
                    // 導通フラグ: スイッチ以外は常にtrue、スイッチはstateがtrueの時だけtrue
                    let isConductive = true;
                    if (comp.type === 'PSW' || comp.type === 'SSW') {
                        isConductive = comp.state; 
                    }

                    if (isConductive) {
                        pathComps.add(comp);
                        // 導通している場合のみ、反対側のピンを次の探索対象(Queue)に入れる
                        comp.pins.forEach(p => {
                            if (p.id !== currId) {
                                queue.push(p.id);
                            }
                        });
                    }
                    // isConductiveがfalse(スイッチOFF)なら、ここで探索の連鎖が止まる
                }
            });
        }

        // --- 計算フェーズ ---
        if (closed) {
            let totalR = 0;
            pathComps.forEach(c => {
                if (c.type === 'RES' || c.type === 'LED') {
                    // 焼損したLEDは巨大な抵抗(断線)として扱う
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
                    
                    // リアルな焼損判定
                    // 9V直結(R=20)なら 0.45A 流れるので即死
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
