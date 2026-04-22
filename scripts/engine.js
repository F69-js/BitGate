function updateSimulation() {
    components.forEach(c => c.currentI = 0);
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
            const amp = r > 0 ? bat.val / r : 0;
            pathComps.forEach(c => { if (c.type === 'LED') c.currentI = amp; });
            document.getElementById('statusDisp').innerText = "LIVE: " + amp.toFixed(4) + " A";
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
