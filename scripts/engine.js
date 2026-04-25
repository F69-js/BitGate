/**
 * BitGate Engine v1.1.3 - Core Logic Path Fix
 * 修正内容: 電源内部のショートパス防止と厳密なパス計算
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
                // 【重要】電源内部でのショートを防ぐため、現在探索中の電源(bat)はスキップ
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
            let actualPathComps = new Set();
            let traceId = lastPinId;
            while (traceId && parentMap.has(traceId)) {
                let edge = parentMap.get(traceId);
                if (edge.viaComp) actualPathComps.add(edge.viaComp);
                traceId = edge.fromPinId;
            }

            // 抵抗計算
            let totalR = 0; 
            actualPathComps.forEach(c => {
                let val = Number(c.val) || 0;
                if (c.type === 'RES') totalR += c.isBlown ? 10e7 : val;
                else if (c.type === 'LED') totalR += c.isBlown ? 10e7 : Math.max(val, 20); // 最低20Ω
                else totalR += 0.05; // スイッチなどの微小抵抗
            });

            // しきい値を0.5Ω程度に設定（これ以下は物理的にほぼあり得ない）
            if (totalR < 0.5) {
                bat.isShort = true;
                document.getElementById('statusDisp').innerText = "⚠️ SHORT CIRCUIT!";
                return;
            }

            const amp = Number(bat.val) / totalR;
            actualPathComps.forEach(c => {
                c.currentI = amp;
                if (c.type === 'LED' && !c.isBlown && amp > 0.05) c.isBlown = true;
            });

            const hasBlown = Array.from(actualPathComps).some(c => c.isBlown);
            document.getElementById('statusDisp').innerText = hasBlown ? "💥 DEVICE BLOWN" : "LIVE: " + amp.toFixed(4) + " A";
        } else {
            document.getElementById('statusDisp').innerText = "CIRCUIT OPEN";
        }
    });
}
