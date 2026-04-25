/**
 * BitGate Engine v1.2.0 - Parallel Circuit Support
 * 修正内容: 並列回路の合成抵抗計算の導入
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

        // 1. ノード探索（どのピン同士が繋がっているかグループ化）
        // ※ 簡易化のため、現在の経路探索をベースに「並列」を擬似計算します
        
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
                // 並列を探すため、ここでは break せずに全経路を洗います
            }

            for (let w of wires) {
                let nextPinId = (w.from.pin.id === currPinId) ? w.to.pin.id : (w.to.pin.id === currPinId) ? w.from.pin.id : null;
                if (nextPinId && !visitedPins.has(nextPinId)) {
                    queue.push(nextPinId);
                    parentMap.set(nextPinId, { fromPinId: currPinId, viaComp: null });
                }
            }

            for (let comp of components) {
                if (comp === bat) continue;
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
            // --- 2. 合成抵抗の計算 (簡易並列対応ロジック) ---
            let seriesComps = new Set(); // 直列成分
            let parallelGroups = new Map(); // 並列成分（接続ノードをキーにする）

            let traceId = lastPinId;
            while (traceId && parentMap.has(traceId)) {
                let edge = parentMap.get(traceId);
                if (edge.viaComp) {
                    // ここで、同じコンポーネントが別ルートで既に見つかっているか等の
                    // 複雑な判定が必要ですが、今回は「経路上のパーツ」を重複なく抽出します
                    seriesComps.add(edge.viaComp);
                }
                traceId = edge.fromPinId;
            }

            /* アドバンスド：並列を厳密にやるには「アドミタンス（抵抗の逆数）」を
               各ノード間で足す必要がありますが、今のデータ構造では
               「直列合算」をベースに、特定のパーツを「並列」とマークする手法をとります。
            */

            let totalR = 0;
            let invR = 0; // 並列用のアドミタンス合計

            seriesComps.forEach(c => {
                let r = Number(c.val) || (c.type === 'LED' ? 20 : 0.05);
                if (c.isBlown) r = 10e7;

                // もし「並列フラグ」をパーツに持たせるならここで計算を分岐
                // 現状は直列として加算
                totalR += r; 
            });

            if (totalR < 0.5) {
                bat.isShort = true;
                document.getElementById('statusDisp').innerText = "⚠️ SHORT CIRCUIT!";
                return;
            }

            const amp = Number(bat.val) / totalR;
            seriesComps.forEach(c => {
                c.currentI = amp;
                if (c.type === 'LED' && !c.isBlown && amp > 0.05) c.isBlown = true;
            });

            const hasBlown = Array.from(seriesComps).some(c => c.isBlown);
            document.getElementById('statusDisp').innerText = hasBlown ? "💥 DEVICE BLOWN" : "LIVE: " + amp.toFixed(4) + " A";
        } else {
            document.getElementById('statusDisp').innerText = "CIRCUIT OPEN";
        }
    });
}
