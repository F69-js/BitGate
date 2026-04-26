/**
 * main.js - Core Entry Point (ES Module)
 */
import { state } from './state.js';
import { initUIListeners } from './ui.js';
import { drawComponent, getPinPos } from './components.js';

const canvas = document.getElementById('cvs');
const ctx = canvas.getContext('2d');
const viewport = document.getElementById('viewport');
const physicsWorker = new Worker('scripts/worker.js');

function resizeCanvas() {
    const w = viewport.clientWidth;
    const h = viewport.clientHeight;
    if (w > 0 && h > 0) {
        canvas.width = w;
        canvas.height = h;
    }
}

// Workerからの通信
physicsWorker.onmessage = (e) => {
    if (e.data.type === 'RESULT') {
        e.data.components.forEach(upd => {
            const target = state.components.find(c => c.id === upd.id);
            if (target) {
                target.currentI = upd.currentI;
                target.charge = upd.charge;
            }
        });
    }
};

window.addEventListener('load', () => {
    resizeCanvas();
    initUIListeners(); // ui.js から import された関数
    requestAnimationFrame(draw);
});

window.addEventListener('resize', resizeCanvas);

function draw() {
    if (state.isSimulating) {
        physicsWorker.postMessage({
            type: 'SYNC',
            data: { components: state.components, wires: state.wires }
        });
        physicsWorker.postMessage({ type: 'TICK' });
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(state.offset.x, state.offset.y);
    ctx.scale(state.zoom, state.zoom);

    drawGrid();

    // 配線描画
    state.wires.forEach(w => {
        const p1 = getPinPos(w.from.comp, w.from.pin);
        const p2 = getPinPos(w.to.comp, w.to.pin);
        const pts = [p1, ...w.points, p2];
        
        ctx.beginPath(); 
        ctx.lineWidth = (state.selectedObj === w) ? 5 / state.zoom : 3 / state.zoom;
        ctx.strokeStyle = (w.from.comp.currentI > 0) ? '#2ecc71' : '#333';
        ctx.lineJoin = 'round';
        
        ctx.moveTo(pts[0].x, pts[0].y);
        for(let i=1; i<pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
    });

    // コンポーネント描画
    state.components.forEach(c => {
        drawComponent(ctx, c, state.selectedObj === c);
    });

    ctx.restore();
    requestAnimationFrame(draw);
}

function drawGrid() {
    const gridStep = 50;
    const left = -state.offset.x / state.zoom;
    const top = -state.offset.y / state.zoom;
    const right = (canvas.width - state.offset.x) / state.zoom;
    const bottom = (canvas.height - state.offset.y) / state.zoom;
    
    ctx.strokeStyle = '#f1f1f1'; 
    ctx.lineWidth = 1 / state.zoom;
    ctx.beginPath();
    for(let i = Math.floor(left/gridStep)*gridStep; i < right; i += gridStep) {
        ctx.moveTo(i, top); ctx.lineTo(i, bottom);
    }
    for(let i = Math.floor(top/gridStep)*gridStep; i < bottom; i += gridStep) {
        ctx.moveTo(left, i); ctx.lineTo(right, i);
    }
    ctx.stroke();
}
