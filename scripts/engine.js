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
            pathComps.forEach(c => {
                if (c.type === 'LED' || c.type === 'RES') r += c.val; 
                if (c.type === 'LED') {
                    c.currentI = amp;
                    
                    // 【リアル化】LEDにかかる電圧を計算 (V = I * R)
                    // 本来は非線形ですが、簡易的に「このLEDが受け持っている電圧」を算出
                    const vApp = amp * c.val + (bat.val - amp * totalR) / (ledCount || 1); 
                    
                    // 1. 電圧による即死判定 (5V以上の圧力がかかったらアウト)
                    // 2. あるいは電流(20mA = 0.02A)を超え始めたら危険
                    if (bat.val > c.vMax && totalR < 100) { 
                        c.isBlown = true; 
                    }
                    if (amp > 0.03) { // 30mA超えでも焼き切れる
                        c.isBlown = true;
                    }
            });
            
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
