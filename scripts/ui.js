function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function initUIListeners() {
    window.addEventListener('contextmenu', e => e.preventDefault(), false);

    canvas.addEventListener('mousedown', e => {
        const pos = getMousePos(e);
        
        if (e.button === 2) {
            activeLine = null; selectedObj = null; updateUI(); return;
        }

        // 1. スイッチ操作の優先判定
        const hitC = components.find(c => pos.x > c.x && pos.x < c.x + c.w && pos.y > c.y && pos.y < c.y + c.h);
        
        if (hitC && (hitC.type === 'PSW' || hitC.type === 'SSW')) {
            if (isSimulating) {
                // シミュレーション中なら状態を反転
                if (hitC.type === 'PSW') {
                    hitC.state = true; // Push SWはMouseDownでON
                } else {
                    hitC.state = !hitC.state; // Slide SWはトグル
                }
                selectedObj = { type: 'comp', ref: hitC };
                updateUI();
                return; // 探索へ
            }
        }

        // 2. ピン判定（配線開始/終了）
        let hitPin = null;
        for (let c of components) {
            for (let p of c.pins) {
                if (Math.hypot(pos.x - (c.x + p.relX), pos.y - (c.y + p.relY)) < 15) {
                    hitPin = { comp: c, pin: p }; break;
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

        // 3. 配線中の曲げ
        if (activeLine) {
            activeLine.points.push({ x: pos.x, y: pos.y }); return;
        }

        // 4. 配線選択
        const hitWire = wires.find(w => {
            const pStart = { x: w.from.comp.x + w.from.pin.relX, y: w.from.comp.y + w.from.pin.relY };
            const pEnd = { x: w.to.comp.x + w.to.pin.relX, y: w.to.comp.y + w.to.pin.relY };
            const pts = [pStart, ...w.points, pEnd];
            for (let i = 0; i < pts.length - 1; i++) {
                if (distToSegment(pos, pts[i], pts[i+1]) < 10) return true;
            }
            return false;
        });

        if (hitWire) {
            selectedObj = { type: 'wire', ref: hitWire };
            updateUI(); return;
        }

        // 5. パーツドラッグ（スイッチ以外、または非シミュレーション時）
        if (hitC) {
            selectedObj = { type: 'comp', ref: hitC }; 
            draggingObj = hitC;
            dragOffset = { x: pos.x - hitC.x, y: pos.y - hitC.y };
        } else {
            selectedObj = null;
        }
        updateUI();
    });

    window.addEventListener('mouseup', () => {
        // Push Switch は指を離すとOFF
        components.forEach(c => { if (c.type === 'PSW') c.state = false; });
        draggingObj = null;
    });

    window.addEventListener('mousemove', e => {
        mouse = getMousePos(e);
        if (draggingObj) { draggingObj.x = mouse.x - dragOffset.x; draggingObj.y = mouse.y - dragOffset.y; }
    });

    window.addEventListener('keydown', e => {
        if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
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
    selectedObj = null; updateUI();
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
