/**
 * main.js - Button Text Toggle & Main Loop
 */

const canvas = document.getElementById('cvs');
const ctx = canvas.getContext('2d');
const viewport = document.getElementById('viewport');

function resizeCanvas() {
    const w = viewport.clientWidth;
    const h = viewport.clientHeight;
    if (w > 0 && h > 0) {
        canvas.width = w;
        canvas.height = h;
    }
}

window.addEventListener('load', () => {
    resizeCanvas();
    initUIListeners();
    requestAnimationFrame(draw);
});

window.addEventListener('resize', resizeCanvas);

// --- グローバル変数 ---
let components = [];
let wires = [];
let isSimulating = false;
let selectedObj = null;
let draggingObj = null;
let dragOffset = { x: 0, y: 0 };
let activeLine = null;
let mouse = { x: 0, y: 0 };

// ボタンイベント (テキスト切り替え)
document.getElementById('startBtn').addEventListener('click', () => {
    isSimulating = !isSimulating;
    const btn = document.getElementById('startBtn');
    btn.classList.toggle('active', isSimulating);
    // 状態に応じてテキストを変更
    btn.innerText = isSimulating ? "STOP SYSTEM" : "RUN SYSTEM";
});

document.getElementById('delBtn').addEventListener('click', deleteSelected);

// --- メインループ (変更なし) ---
function draw() {
    updateSimulation();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    if (typeof offset !== 'undefined' && typeof zoom !== 'undefined') {
        ctx.translate(offset.x, offset.y);
        ctx.scale(zoom, zoom);
    }

    drawGrid();

    // 配線描画
    wires.forEach(w => {
        const p1 = { x: w.from.comp.x + w.from.pin.relX, y: w.from.comp.y + w.from.pin.relY };
        const p2 = { x: w.to.comp.x + w.to.pin.relX, y: w.to.comp.y + w.to.pin.relY };
        const pts = [p1, ...w.points, p2];
        ctx.beginPath(); 
        ctx.lineWidth = (selectedObj?.ref === w) ? 5/zoom : 3/zoom;
        ctx.strokeStyle = (selectedObj?.ref === w) ? '#2ecc71' : '#333';
        ctx.moveTo(pts[0].x, pts[0].y);
        for(let i=1; i<pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
    });

    components.forEach(c => drawComponent(ctx, c, selectedObj?.ref === c));

    if (activeLine) {
        const pStart = { x: activeLine.startComp.x + activeLine.startPin.relX, y: activeLine.startComp.y + activeLine.startPin.relY };
        const pts = [pStart, ...activeLine.points, mouse];
        ctx.strokeStyle = '#2ecc71'; ctx.lineWidth = 2/zoom;
        ctx.setLineDash([5/zoom, 5/zoom]); ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for(let i=1; i<pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke(); ctx.setLineDash([]);
    }

    ctx.restore();
    requestAnimationFrame(draw);
}

function drawGrid() {
    const gridStep = 50;
    const left = -offset.x / zoom;
    const top = -offset.y / zoom;
    const right = (canvas.width - offset.x) / zoom;
    const bottom = (canvas.height - offset.y) / zoom;
    ctx.strokeStyle = '#f1f1f1'; ctx.lineWidth = 1/zoom;
    ctx.beginPath();
    for(let i = Math.floor(left/gridStep)*gridStep; i < right; i += gridStep) {
        ctx.moveTo(i, top); ctx.lineTo(i, bottom);
    }
    for(let i = Math.floor(top/gridStep)*gridStep; i < bottom; i += gridStep) {
        ctx.moveTo(left, i); ctx.lineTo(right, i);
    }
    ctx.stroke();
}
