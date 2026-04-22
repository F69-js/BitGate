function updateSimulation() {
    components.forEach(c => {
        c.currentI = 0;
        if (c.type === 'BAT') c.isShort = false; // ショートフラグのリセット
    });
    
    if (!isSimulating) return;

    components.filter(c => c.type === 'BAT').forEach(bat => {
        const posP = bat.pins.find(p => p.type === 'POS'), negP = bat.pins.find(p => p.type === 'NEG');
        let visited = new Set(), queue = [posP.id], pathComps = [], closed = false;

        while(queue.length > 0) {
            let currId = queue.shift();
            if (visited.has(currId)) continue;
            visited.add(currId);
            if (currId === negP.id) closed = true;

            wires.forEach(w => {
                if (w.from.pin.id === currId) queue.push(w.to.pin.id);
                if (w.to.pin.id === currId) queue.push(w.from.pin.id);
            });

            components.forEach(comp => {
                if (comp.pins.some(p => p.id === currId)) {
                    if ((comp.type === 'PSW' || comp.type === 'SSW') && !comp.state) return;
                    pathComps.push(comp);
                    comp.pins.forEach(p => { if (p.id !== currId) queue.push(p.id); });
                }
            });
        }

        if (closed) {
            let r = 0;
            pathComps.forEach(c => { if (c.type === 'LED' || c.type === 'RES') r += c.val; });
            
            // ショート判定 (抵抗が極めて低い場合)
            if (r < 0.1) {
                bat.isShort = true;
                document.getElementById('statusDisp').innerText = "⚠️ SHORT CIRCUIT!";
                return;
            }

            const amp = bat.val / r;
            pathComps.forEach(c => { 
                if (c.type === 'LED') {
                    c.currentI = amp;
                    // 過電圧判定 (0.05A以上で破壊)
                    if (amp > 0.05) c.isBlown = true;
                }
            });
            document.getElementById('statusDisp').innerText = "LIVE: " + amp.toFixed(4) + " A";
        } else {
            document.getElementById('statusDisp').innerText = "CIRCUIT OPEN";
        }
    });
}
