/**
 * ui.js - Interaction, Zoom, and Pan (Final Fix)
 */

let zoom = 1.0;
let offset = { x: 0, y: 0 };
let isPanning = false;
let lastMousePos = { x: 0, y: 0 };
let dragStartPos = { x: 0, y: 0 };
let isSpacePressed = false; // フラグを関数の外へ移動

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return { 
        x: (e.clientX - rect.left - offset.x) / zoom, 
        y: (e.clientY - rect.top - offset.y) / zoom 
    };
}

// 配線の当たり判定（これがないとエラーになります）
function distToSegment(p, v, w) {
    const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = Math.max(0, Math.min(1, ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}

function initUIListeners() {
    // typeSelect のイベントリスナーを initUIListeners に追加
 document.getElementById('typeSelect').addEventListener('change', e => {
   if (selectedObj?.ref.type === 'TR') selectedObj.ref.subType = e.target.value;
});
    
    window.addEventListener('contextmenu', e => e.preventDefault(), false);

    // ズーム機能
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const nextZoom = Math.min(Math.max(zoom * delta, 0.2), 5);
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        offset.x = mouseX - (mouseX - offset.x) * (nextZoom / zoom);
        offset.y = mouseY - (mouseY - offset.y) * (nextZoom / zoom);
        zoom = nextZoom;
    }, { passive: false });

    canvas.addEventListener('mousedown', e => {
        const pos = getMousePos(e);
        dragStartPos = { ...pos };
        lastMousePos = { x: e.clientX, y: e.clientY };

        // スペースキーまたは中ボタンでパン
        if (e.buttons === 4 || (e.buttons === 1 && isSpacePressed)) {
            isPanning = true;
            return;
        }

        if (e.button === 2) { activeLine = null; selectedObj = null; updateUI(); return; }

        // 1. ピン判定
        let hitPin = null;
        for (let c of components) {
            for (let p of c.pins) {
                if (Math.hypot(pos.x - (c.x + p.relX), pos.y - (c.y + p.relY)) < 15 / zoom) {
                    hitPin = { comp: c, pin: p }; break;
                }
            }
            if (hitPin) break;
        }

        if (hitPin) {
            if (!activeLine) {
                activeLine = { startComp: hitPin.comp, startPin: hitPin.pin, points: [] };
            } else {
                wires.push({ from: { comp: activeLine.startComp, pin: activeLine.startPin }, to: { comp: hitPin.comp, pin: hitPin.pin }, points: [...activeLine.points] });
                activeLine = null;
            }
            updateUI(); return;
        }

        // 2. 配線選択
        const hitWire = wires.find(w => {
            const pStart = { x: w.from.comp.x + w.from.pin.relX, y: w.from.comp.y + w.from.pin.relY };
            const pEnd = { x: w.to.comp.x + w.to.pin.relX, y: w.to.comp.y + w.to.pin.relY };
            const pts = [pStart, ...w.points, pEnd];
            for (let i = 0; i < pts.length - 1; i++) {
                if (distToSegment(pos, pts[i], pts[i+1]) < 10 / zoom) return true;
            }
            return false;
        });

        if (hitWire) { selectedObj = { type: 'wire', ref: hitWire }; updateUI(); return; }

        // 3. パーツ判定
        const hitC = components.find(c => pos.x > c.x && pos.x < c.x + c.w && pos.y > c.y && pos.y < c.y + c.h);
        if (hitC) {
            selectedObj = { type: 'comp', ref: hitC }; 
            draggingObj = hitC;
            dragOffset = { x: pos.x - hitC.x, y: pos.y - hitC.y };
            if (hitC.type === 'PSW' && isSimulating) hitC.state = true;
        } else {
            selectedObj = null;
        }
        updateUI();
    });

    window.addEventListener('mousemove', e => {
        const mouseRaw = { x: e.clientX, y: e.clientY };
        if (isPanning) {
            offset.x += mouseRaw.x - lastMousePos.x;
            offset.y += mouseRaw.y - lastMousePos.y;
            lastMousePos = mouseRaw;
            return;
        }
        mouse = getMousePos(e);
        if (draggingObj) { 
            draggingObj.x = mouse.x - dragOffset.x; 
            draggingObj.y = mouse.y - dragOffset.y; 
        }
        lastMousePos = mouseRaw;
    });

    window.addEventListener('mouseup', (e) => {
        const pos = getMousePos(e);
        const moveDist = Math.hypot(pos.x - dragStartPos.x, pos.y - dragStartPos.y);
        if (!isPanning && moveDist < 5 && selectedObj?.type === 'comp') {
            const c = selectedObj.ref;
            if (c.type === 'SSW') c.state = !c.state;
        }
        components.forEach(c => { if (c.type === 'PSW') c.state = false; });
        draggingObj = null;
        isPanning = false;
    });

    window.addEventListener('keydown', e => {
        if (e.code === 'Space') isSpacePressed = true;
    });
    window.addEventListener('keyup', e => {
        if (e.code === 'Space') isSpacePressed = false;
    });
}

function updateUI() {
    const delBtn = document.getElementById('delBtn');
    if (delBtn) delBtn.disabled = !selectedObj;
    
    const ea = document.getElementById('editArea');
    const typeSelect = document.getElementById('typeSelect'); // HTMLに追加が必要
    if (!ea) return;

    if (selectedObj?.type === 'comp') {
        const c = selectedObj.ref;
        if (c.type === 'BAT' || c.type === 'RES') {
            ea.style.visibility = 'visible';
            typeSelect.style.display = 'none';
            document.getElementById('targetLabel').innerText = c.type === 'BAT' ? 'POWER (V)' : 'RES (Ω)';
            document.getElementById('valInput').value = c.val;
        } else if (c.type === 'TR') {
            ea.style.visibility = 'visible';
            typeSelect.style.display = 'block';
            document.getElementById('targetLabel').innerText = 'TRANSISTOR TYPE';
            typeSelect.value = c.subType;
        } else {
            ea.style.visibility = 'hidden';
        }
    } else {
        ea.style.visibility = 'hidden';
    }
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
