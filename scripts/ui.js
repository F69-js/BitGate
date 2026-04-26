/**
 * ui.js - Updated with Rotation, Shift key, and Dynamic Color Dropdown
 */
var zoom = 1.0;
var offset = { x: 0, y: 0 };
let isPanning = false;
let lastMousePos = { x: 0, y: 0 };
let dragStartPos = { x: 0, y: 0 };
let isSpacePressed = false;
let draggingNode = null; // ドラッグ中の頂点 { wire, index }

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left - offset.x) / zoom,
        y: (e.clientY - rect.top - offset.y) / zoom
    };
}

function distToSegment(p, v, w) {
    const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = Math.max(0, Math.min(1, ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}

function initUIListeners() {
    window.addEventListener('contextmenu', e => e.preventDefault(), false);

    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const nextZoom = Math.min(Math.max(zoom * delta, 0.1), 10);
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

        if (e.buttons === 4 || (e.buttons === 1 && isSpacePressed)) {
            isPanning = true; return;
        }
        if (e.button === 2) { activeLine = null; selectedObj = null; updateUI(); return; }

        let hitPin = null;
        for (let c of components) {
            for (let p of c.pins) {
                const pinPos = getPinPos(c, p);
                if (Math.hypot(pos.x - pinPos.x, pos.y - pinPos.y) < 15 / zoom) {
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

        if (activeLine) {
            activeLine.points.push({ x: pos.x, y: pos.y });
            return;
        }

        if (selectedObj?.type === 'wire') {
            const w = selectedObj.ref;
            for (let i = 0; i < w.points.length; i++) {
                if (Math.hypot(pos.x - w.points[i].x, pos.y - w.points[i].y) < 10 / zoom) {
                    draggingNode = { wire: w, index: i };
                    return;
                }
            }
        }

        const hitWire = wires.find(w => {
            const pStart = getPinPos(w.from.comp, w.from.pin);
            const pEnd = getPinPos(w.to.comp, w.to.pin);
            const pts = [pStart, ...w.points, pEnd];
            for (let i = 0; i < pts.length - 1; i++) {
                if (distToSegment(pos, pts[i], pts[i + 1]) < 10 / zoom) return true;
            }
            return false;
        });
        if (hitWire) { selectedObj = { type: 'wire', ref: hitWire }; updateUI(); return; }

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
            lastMousePos = mouseRaw; return;
        }

        mouse = getMousePos(e);

        if (draggingNode) {
            draggingNode.wire.points[draggingNode.index].x = mouse.x;
            draggingNode.wire.points[draggingNode.index].y = mouse.y;
        } else if (draggingObj) {
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
        draggingNode = null;
        isPanning = false;
    });

    window.addEventListener('keydown', e => { 
        if (e.code === 'Space') isSpacePressed = true; 
        if (e.key === 'Shift' && selectedObj?.type === 'comp') {
            const c = selectedObj.ref;
            c.angle = (c.angle || 0) + Math.PI / 2;
            if (c.angle >= Math.PI * 2) c.angle = 0;
        }
    });

    window.addEventListener('keyup', e => { 
        if (e.code === 'Space') isSpacePressed = false; 
    });

    // ドロップダウンの変更時の処理
    document.getElementById('typeSelect').addEventListener('change', e => {
        if (!selectedObj) return;
        const c = selectedObj.ref;
        if (c.type === 'TR') {
            c.trType = e.target.value;
        } else if (c.type === 'LED') {
            c.color = e.target.value;
        }
    });

    document.getElementById('valInput').addEventListener('input', e => {
        if (selectedObj?.type === 'comp') {
            const c = selectedObj.ref;
            if (c.type === 'BAT' || c.type === 'RES' || c.type === 'CAP') {
                c.val = Number(e.target.value);
                if (c.type === 'CAP') c.charge = 0;
            }
        }
    });
}

function updateUI() {
    const ea = document.getElementById('editArea');
    const ts = document.getElementById('typeSelect');
    const tl = document.getElementById('targetLabel');
    const vi = document.getElementById('valInput');
    const delBtn = document.getElementById('delBtn');

    if (delBtn) delBtn.disabled = !selectedObj;

    if (ea) {
        if (selectedObj?.type === 'comp') {
            const c = selectedObj.ref;
            ea.style.visibility = 'visible';

            if (c.type === 'BAT' || c.type === 'RES' || c.type === 'CAP') {
                vi.style.display = 'inline'; ts.style.display = 'none';
                tl.innerText = c.type === 'BAT' ? 'PWR(V)' : (c.type === 'RES' ? 'RES(Ω)' : 'CAP(μF)');
                vi.value = c.val;
            } else if (c.type === 'TR') {
                vi.style.display = 'none'; ts.style.display = 'inline';
                tl.innerText = 'TYPE';
                // innerHTML で TR 用の選択肢を生成
                ts.innerHTML = `<option value="NPN">NPN</option><option value="PNP">PNP</option>`;
                ts.value = c.trType || "NPN";
            } else if (c.type === 'LED') {
                vi.style.display = 'none'; ts.style.display = 'inline';
                tl.innerText = 'COLOR';
                // innerHTML で LED 用の色選択肢を生成
                ts.innerHTML = `
                    <option value="#ff3232">RED</option>
                    <option value="#32ff32">GREEN</option>
                    <option value="#3232ff">BLUE</option>
                    <option value="#ffff32">YELLOW</option>
                    <option value="#ffffff">WHITE</option>
                `;
                ts.value = c.color || "#ff3232";
            } else {
                ea.style.visibility = (c.type === 'NOT_IC' || c.type === 'DIO') ? 'hidden' : 'visible';
            }
        } else {
            ea.style.visibility = 'hidden';
        }
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
