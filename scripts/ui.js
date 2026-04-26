/**
 * ui.js - User Interaction Logic
 */
import { state } from './state.js';
import { getPinPos } from './components.js';

let isPanning = false;
let lastMousePos = { x: 0, y: 0 };
let dragStartPos = { x: 0, y: 0 };
let dragOffset = { x: 0, y: 0 };
let isSpacePressed = false;
let draggingNode = null; 

const canvas = document.getElementById('cvs');

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left - state.offset.x) / state.zoom,
        y: (e.clientY - rect.top - state.offset.y) / state.zoom
    };
}

function distToSegment(p, v, w) {
    const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = Math.max(0, Math.min(1, ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}

export function initUIListeners() {
    window.addEventListener('contextmenu', e => e.preventDefault(), false);

    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const nextZoom = Math.min(Math.max(state.zoom * delta, 0.1), 10);
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        state.offset.x = mouseX - (mouseX - state.offset.x) * (nextZoom / state.zoom);
        state.offset.y = mouseY - (mouseY - state.offset.y) * (nextZoom / state.zoom);
        state.zoom = nextZoom;
    }, { passive: false });

    canvas.addEventListener('mousedown', e => {
        const pos = getMousePos(e);
        dragStartPos = { ...pos };
        lastMousePos = { x: e.clientX, y: e.clientY };

        if (e.buttons === 4 || (e.buttons === 1 && isSpacePressed)) {
            isPanning = true; return;
        }
        
        if (e.button === 2) { 
            state.activeLine = null; 
            state.selectedObj = null; 
            updateUI(); return; 
        }

        // 1. ピンのクリック判定
        let hitPin = null;
        for (let c of state.components) {
            for (let p of c.pins) {
                const pinPos = getPinPos(c, p);
                if (Math.hypot(pos.x - pinPos.x, pos.y - pinPos.y) < 15 / state.zoom) {
                    hitPin = { comp: c, pin: p }; break;
                }
            }
            if (hitPin) break;
        }

        if (hitPin) {
            if (!state.activeLine) {
                state.activeLine = { startComp: hitPin.comp, startPin: hitPin.pin, points: [] };
            } else {
                state.wires.push({
                    from: { comp: state.activeLine.startComp, pin: state.activeLine.startPin },
                    to: { comp: hitPin.comp, pin: hitPin.pin },
                    points: [...state.activeLine.points]
                });
                state.activeLine = null;
            }
            updateUI(); return;
        }

        if (state.activeLine) {
            state.activeLine.points.push({ x: pos.x, y: pos.y });
            return;
        }

        // 2. 折れ点ドラッグ
        if (state.selectedObj?.type === 'wire') {
            const w = state.selectedObj.ref;
            for (let i = 0; i < w.points.length; i++) {
                if (Math.hypot(pos.x - w.points[i].x, pos.y - w.points[i].y) < 10 / state.zoom) {
                    draggingNode = { wire: w, index: i };
                    return;
                }
            }
        }

        // 3. 配線選択
        const hitWire = state.wires.find(w => {
            const pStart = getPinPos(w.from.comp, w.from.pin);
            const pEnd = getPinPos(w.to.comp, w.to.pin);
            const pts = [pStart, ...w.points, pEnd];
            for (let i = 0; i < pts.length - 1; i++) {
                if (distToSegment(pos, pts[i], pts[i + 1]) < 10 / state.zoom) return true;
            }
            return false;
        });
        if (hitWire) { 
            state.selectedObj = { type: 'wire', ref: hitWire }; 
            updateUI(); return; 
        }

        // 4. パーツ選択
        const hitC = [...state.components].reverse().find(c => 
            pos.x > c.x && pos.x < c.x + c.w && pos.y > c.y && pos.y < c.y + c.h
        );

        if (hitC) {
            state.selectedObj = { type: 'comp', ref: hitC };
            state.draggingObj = hitC;
            dragOffset = { x: pos.x - hitC.x, y: pos.y - hitC.y };
            if (hitC.type === 'PSW' && state.isSimulating) hitC.state = true;
        } else {
            state.selectedObj = null;
        }
        updateUI();
    });

    window.addEventListener('mousemove', e => {
        const mouseRaw = { x: e.clientX, y: e.clientY };
        if (isPanning) {
            state.offset.x += mouseRaw.x - lastMousePos.x;
            state.offset.y += mouseRaw.y - lastMousePos.y;
            lastMousePos = mouseRaw; return;
        }

        state.mouse = getMousePos(e);

        if (draggingNode) {
            draggingNode.wire.points[draggingNode.index].x = state.mouse.x;
            draggingNode.wire.points[draggingNode.index].y = state.mouse.y;
        } else if (state.draggingObj) {
            state.draggingObj.x = state.mouse.x - dragOffset.x;
            state.draggingObj.y = state.mouse.y - dragOffset.y;
        }
        lastMousePos = mouseRaw;
    });

    window.addEventListener('mouseup', (e) => {
        const pos = getMousePos(e);
        const moveDist = Math.hypot(pos.x - dragStartPos.x, pos.y - dragStartPos.y);

        if (!isPanning && moveDist < 5 && state.selectedObj?.type === 'comp') {
            const c = state.selectedObj.ref;
            if (c.type === 'SSW') c.state = !c.state;
        }

        state.components.forEach(c => { if (c.type === 'PSW') c.state = false; });
        state.draggingObj = null;
        draggingNode = null;
        isPanning = false;
    });

    window.addEventListener('keydown', e => { 
        if (e.code === 'Space') isSpacePressed = true; 
        if (e.key === 'Shift' && state.selectedObj?.type === 'comp') {
            const c = state.selectedObj.ref;
            c.angle = (c.angle || 0) + Math.PI / 2;
            if (c.angle >= Math.PI * 2) c.angle = 0;
        }
        if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
    });

    window.addEventListener('keyup', e => { 
        if (e.code === 'Space') isSpacePressed = false; 
    });

    document.getElementById('typeSelect')?.addEventListener('change', e => {
        if (state.selectedObj?.type === 'comp') {
            const c = state.selectedObj.ref;
            if (c.type === 'TR') c.trType = e.target.value;
            else if (c.type === 'LED') c.color = e.target.value;
        }
    });

    document.getElementById('valInput')?.addEventListener('input', e => {
        if (state.selectedObj?.type === 'comp') {
            const c = state.selectedObj.ref;
            if (['BAT', 'RES', 'CAP'].includes(c.type)) {
                c.val = Number(e.target.value);
                if (c.type === 'CAP') c.charge = 0;
            }
        }
    });
}

export function updateUI() {
    const ea = document.getElementById('editArea');
    const ts = document.getElementById('typeSelect');
    const tl = document.getElementById('targetLabel');
    const vi = document.getElementById('valInput');
    const delBtn = document.getElementById('delBtn');

    if (delBtn) delBtn.disabled = !state.selectedObj;
    if (!ea) return;

    if (state.selectedObj?.type === 'comp') {
        const c = state.selectedObj.ref;
        ea.style.visibility = 'visible';
        if (['BAT', 'RES', 'CAP'].includes(c.type)) {
            vi.style.display = 'inline'; ts.style.display = 'none';
            tl.innerText = c.type === 'BAT' ? 'PWR(V)' : (c.type === 'RES' ? 'RES(Ω)' : 'CAP(μF)');
            vi.value = c.val;
        } else if (c.type === 'TR') {
            vi.style.display = 'none'; ts.style.display = 'inline';
            tl.innerText = 'TYPE';
            ts.innerHTML = `<option value="NPN">NPN</option><option value="PNP">PNP</option>`;
            ts.value = c.trType || "NPN";
        } else if (c.type === 'LED') {
            vi.style.display = 'none'; ts.style.display = 'inline';
            tl.innerText = 'COLOR';
            ts.innerHTML = `<option value="#ff3232">RED</option><option value="#32ff32">GREEN</option><option value="#3232ff">BLUE</option><option value="#ffff32">YELLOW</option><option value="#ffffff">WHITE</option>`;
            ts.value = c.color || "#ff3232";
        } else {
            ea.style.visibility = (c.type === 'NOT_IC' || c.type === 'DIO') ? 'hidden' : 'visible';
        }
    } else {
        ea.style.visibility = 'hidden';
    }
}

export function deleteSelected() {
    if (!state.selectedObj) return;
    if (state.selectedObj.type === 'comp') {
        const target = state.selectedObj.ref;
        state.wires = state.wires.filter(w => w.from.comp !== target && w.to.comp !== target);
        state.components = state.components.filter(c => c !== target);
    } else {
        state.wires = state.wires.filter(w => w !== state.selectedObj.ref);
    }
    state.selectedObj = null; 
    updateUI();
}
