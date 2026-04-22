function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function initUIListeners() {
    // Edge/Chrome等の右クリックメニューを完全に封鎖
    window.addEventListener('contextmenu', e => {
        e.preventDefault();
    }, false);

    canvas.addEventListener('mousedown', e => {
        const pos = getMousePos(e);
        
        // 右クリックでキャンセル
        if (e.button === 2) {
            activeLine = null;
            selectedObj = null;
            updateUI();
            return;
        }

        if (isSimulating) {
            const hitSW = components.find(c => pos.x > c.x && pos.x < c.x + c.w && pos.y > c.y && pos.y < c.y + c.h);
            if (hitSW?.type === 'PSW' || hitSW?.type === 'SSW') {
                if (hitSW.type === 'PSW') hitSW.state = true; else hitSW.state = !hitSW.state;
                selectedObj = { type: 'comp', ref: hitSW };
                updateUI(); return;
            }
        }

        // 1. ピン判定
        let hitPin = null;
        for (let c of components) {
            for (let p of c.pins) {
                if (Math.hypot(pos.x - (c.x + p.relX), pos.y - (c.y + p.relY)) < 15) {
                    hitPin = { comp: c, pin: p };
                    break;
                }
            }
            if (hitPin) break;
        }

        if (hitPin) {
            if (!activeLine) {
                activeLine = { startComp: hitPin.comp, startPin: hitPin.pin, points: [] };
            } else {
                wires.push({ 
                    from: { comp: activeLine.startComp, pin: activeLine.startPin }, 
                    to: { comp: hitPin.comp, pin: hitPin.pin }, 
                    points: [...activeLine.points] 
                });
                activeLine = null;
            }
            updateUI(); return;
        }

        if (activeLine) {
            activeLine.points.push({ x: pos.x, y: pos.y });
            return;
        }

        // 2. 配線のクリック判定（選択削除用）
        const hitWire = wires.find(w => {
            const p1 = { x: w.from.comp.x + w.from.pin.relX, y: w.from.comp.y + w.from.pin.relY };
            const p2 = { x: w.to.comp.x + w.to.pin.relX, y: w.to.comp.y + w.to.pin.relY };
            const pts = [p1, ...w.points, p2];
            for (let i = 0; i < pts.length - 1; i++) {
                if (distToSegment(pos, pts[i], pts[i+1]) < 10) return true;
            }
            return false;
        });

        if (hitWire) {
            selectedObj = { type: 'wire', ref: hitWire };
            updateUI(); return;
        }

        // 3. パーツのドラッグ判定
        const hitC = components.find(c => pos.x > c.x && pos.x < c.x + c.w && pos.y > c.y && pos.y < c.y + c.h);
        if (hitC) {
            selectedObj = { type: 'comp', ref: hitC }; 
            draggingObj = hitC;
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

    // キーボードによる削除（Delete/Backspace）
    window.addEventListener('keydown', e => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            deleteSelected();
        }
    });
}

function deleteSelected() {
    if (!selectedObj) return;
    if (selectedObj.type === 'comp') {
        wires = wires.filter(w => w.from.comp !== selectedObj.ref && w.to.comp !== selectedObj.ref);
        components = components.filter(c => c !== selectedObj.ref);
    } else {
        wires = wires.filter(w => w !== selectedObj.ref);
    }
    selectedObj = null;
    updateUI();
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
