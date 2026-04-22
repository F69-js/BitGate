function initUIListeners() {
    canvas.addEventListener('mousedown', e => {
        const pos = getMousePos(e);
        if (e.button === 2) { activeLine = null; selectedObj = null; updateUI(); return; }

        if (isSimulating) {
            const hitSW = components.find(c => pos.x > c.x && pos.x < c.x + c.w && pos.y > c.y && pos.y < c.y + c.h);
            if (hitSW?.type === 'PSW' || hitSW?.type === 'SSW') {
                if (hitSW.type === 'PSW') hitSW.state = true; else hitSW.state = !hitSW.state;
                selectedObj = { type: 'comp', ref: hitSW };
                updateUI(); return;
            }
        }

        // ピン判定
        for (let c of components) {
            for (let p of c.pins) {
                if (Math.hypot(pos.x - (c.x + p.relX), pos.y - (c.y + p.relY)) < 15) {
                    if (!activeLine) activeLine = { startComp: c, startPin: p };
                    else {
                        wires.push({ from: { comp: activeLine.startComp, pin: activeLine.startPin }, to: { comp: c, pin: p }, points: [] });
                        activeLine = null;
                    }
                    return;
                }
            }
        }

        const hitC = components.find(c => pos.x > c.x && pos.x < c.x + c.w && pos.y > c.y && pos.y < c.y + c.h);
        if (hitC) {
            selectedObj = { type: 'comp', ref: hitC }; draggingObj = hitC;
            dragOffset = { x: pos.x - hitC.x, y: pos.y - hitC.y };
        } else {
            selectedObj = null;
        }
        updateUI();
    });

    window.addEventListener('mousemove', e => {
        mouse = getMousePos(e);
        if (draggingObj) { draggingObj.x = mouse.x - dragOffset.x; draggingObj.y = mouse.y - dragOffset.y; }
    });

    window.addEventListener('mouseup', () => {
        components.forEach(c => { if (c.type === 'PSW') c.state = false; });
        draggingObj = null;
    });
}

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function updateUI() {
    document.getElementById('delBtn').disabled = !selectedObj;
    const ea = document.getElementById('editArea');
    if (selectedObj?.type === 'comp' && (selectedObj.ref.type === 'BAT' || selectedObj.ref.type === 'RES')) {
        ea.style.visibility = 'visible';
        document.getElementById('targetLabel').innerText = selectedObj.ref.type === 'BAT' ? 'POWER (V)' : 'RES (Ω)';
        document.getElementById('valInput').value = selectedObj.ref.val;
    } else ea.style.visibility = 'hidden';
}
