const canvas = document.getElementById('cvs');
const ctx = canvas.getContext('2d');
let isSimulating = false, components = [], wires = [], activeLine = null;
let draggingObj = null, draggingPoint = null, dragOffset = {x:0, y:0}, selectedObj = null, mouse = {x:0, y:0};

// マウスの状態を管理
let isMouseDown = false;
function draw() {
    updateSimulation();
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // ズームとパンの適用
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    // Grid描画 (無限グリッドっぽく見せるために範囲を広げて描画)
    ctx.strokeStyle = '#f1f1f1'; ctx.lineWidth = 1/zoom;
    const gridStep = 50;
    const left = -offset.x / zoom;
    const top = -offset.y / zoom;
    const right = (canvas.width - offset.x) / zoom;
    const bottom = (canvas.height - offset.y) / zoom;

    for(let i = Math.floor(left/gridStep)*gridStep; i < right; i += gridStep) {
        ctx.beginPath(); ctx.moveTo(i, top); ctx.lineTo(i, bottom); ctx.stroke();
    }
    for(let i = Math.floor(top/gridStep)*gridStep; i < bottom; i += gridStep) {
        ctx.beginPath(); ctx.moveTo(left, i); ctx.lineTo(right, i); ctx.stroke();
    }

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

    // 各コンポーネント描画
    components.forEach(c => drawComponent(ctx, c, selectedObj?.ref === c));

    // 作成中の配線
    if (activeLine) {
        const pStart = { x: activeLine.startComp.x + activeLine.startPin.relX, y: activeLine.startComp.y + activeLine.startPin.relY };
        const pts = [pStart, ...activeLine.points, mouse];
        ctx.strokeStyle = '#2ecc71'; ctx.lineWidth = 2/zoom;
        ctx.setLineDash([5/zoom, 5/zoom]); ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for(let i=1; i<pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke(); ctx.setLineDash([]);
    }

    ctx.restore(); // ズーム設定をリセット（UIパーツを別途描画する場合のため）
    
    requestAnimationFrame(draw);
}

// UIイベントの初期化
initUIListeners();

document.getElementById('startBtn').addEventListener('click', e => {
    isSimulating = !isSimulating;
    e.target.classList.toggle('active', isSimulating);
    e.target.textContent = isSimulating ? "STOP SYSTEM" : "RUN SYSTEM";
});

document.getElementById('valInput').addEventListener('input', e => {
    if (selectedObj?.type === 'comp') selectedObj.ref.val = parseFloat(e.target.value) || 0;
});

document.getElementById('delBtn').addEventListener('click', () => deleteSelected());

draw();
