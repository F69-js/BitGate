/**
 * ui.js - User Interface & Interaction
 * 修正内容: スイッチの切り替えと移動(ドラッグ)の完全分離
 */

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

// クリック開始時の位置を保持（移動したかどうかの判定用）
let dragStartPos = { x: 0, y: 0 };
let hasMoved = false;

// 配線の当たり判定用：点と線分の距離を計算
function distToSegment(p, v, w) {
    const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}

function initUIListeners() {
    window.addEventListener('contextmenu', e => e.preventDefault(), false);

    canvas.addEventListener('mousedown', e => {
        const pos = getMousePos(e);
        dragStartPos = { ...pos };
        hasMoved = false;
        
        if (e.button === 2) {
            activeLine = null; selectedObj = null; updateUI(); return;
        }

        // 1. ピン判定（配線開始/終了）を最優先
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

        // 2. 配線中の曲げ
        if (activeLine) {
            activeLine.points.push({ x: pos.x, y: pos.y }); return;
        }

        // 3. 配線選択
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

        // 4. パーツ選択・ドラッグ開始
        const hitC = components.find(c => pos.x > c.x && pos.x < c.x + c.w && pos.y > c.y && pos.y < c.y + c.h);
        if (hitC) {
            selectedObj = { type: 'comp', ref: hitC }; 
            draggingObj = hitC;
            dragOffset = { x: pos.x - hitC.x, y: pos.y - hitC.y };
            
            // Push Switchの場合のみ、押した瞬間にON（シミュレーション中のみ）
            if (hitC.type === 'PSW' && isSimulating) {
                hitC.state = true;
            }
        } else {
            selectedObj = null;
        }
        updateUI();
    });

    window.addEventListener('mouseup', (e) => {
        const pos = getMousePos(e);
        
        // 移動距離が小さければ「クリック（操作）」とみなす
        const moveDist = Math.hypot(pos.x - dragStartPos.x, pos.y - dragStartPos.y);
        
        if (moveDist < 5 && selectedObj?.type === 'comp') {
            const c = selectedObj.ref;
            // スライドスイッチの切り替え
            if (c.type === 'SSW') {
                c.state = !c.state;
            }
        }

        // Push Switch は指を離すとOFF
        components.forEach(c => { if (c.type === 'PSW') c.state = false; });
        draggingObj = null;
    });

    window.addEventListener('mousemove', e => {
        mouse = getMousePos(e);
        if (draggingObj) { 
            draggingObj.x = mouse.x - dragOffset.x; 
            draggingObj.y = mouse.y - dragOffset.y; 
        }
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
    const delBtn = document.getElementById('delBtn');
    if (delBtn) delBtn.disabled = !selectedObj;
    
    const ea = document.getElementById('editArea');
    if (!ea) return;

    if (selectedObj?.type === 'comp' && (selectedObj.ref.type === 'BAT' || selectedObj.ref.type === 'RES')) {
        ea.style.visibility = 'visible';
        document.getElementById('targetLabel').innerText = selectedObj.ref.type === 'BAT' ? 'POWER (V)' : 'RES (Ω)';
        document.getElementById('valInput').value = selectedObj.ref.val;
    } else {
        ea.style.visibility = 'hidden';
    }
}
