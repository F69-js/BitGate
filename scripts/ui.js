// マウス位置取得（共通）
function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

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
                // 配線終了（中継点をコピーして保存）
                wires.push({ 
                    from: { comp: activeLine.startComp, pin: activeLine.startPin }, 
                    to: { comp: hitPin.comp, pin: hitPin.pin }, 
                    points: [...activeLine.points] 
                });
                activeLine = null;
            }
            updateUI(); return;
        }

        // 2. 配線中の「曲げ」：空地をクリック
        if (activeLine) {
            activeLine.points.push({ x: pos.x, y: pos.y });
            return;
        }

        // 3. 既存の中継点ドラッグ
        for (let w of wires) {
            for (let i = 0; i < w.points.length; i++) {
                if (Math.hypot(pos.x - w.points[i].x, pos.y - w.points[i].y) < 10) {
                    draggingPoint = { wire: w, index: i };
                    selectedObj = { type: 'wire', ref: w };
                    updateUI(); return;
                }
            }
        }

        // 4. パーツドラッグ
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
        if (draggingPoint) {
            draggingPoint.wire.points[draggingPoint.index].x = mouse.x;
            draggingPoint.wire.points[draggingPoint.index].y = mouse.y;
        }
    });

    window.addEventListener('mouseup', () => {
        components.forEach(c => { if (c.type === 'PSW') c.state = false; });
        draggingObj = null; draggingPoint = null;
    });
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
