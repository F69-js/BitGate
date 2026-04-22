const canvas = document.getElementById('cvs');
const ctx = canvas.getContext('2d');
let isSimulating = false, components = [], wires = [], activeLine = null;
let draggingObj = null, draggingPoint = null, dragOffset = {x:0, y:0}, selectedObj = null, mouse = {x:0, y:0};

function draw() {
    updateSimulation();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Grid
    ctx.strokeStyle = '#f1f1f1'; ctx.lineWidth = 1;
    for(let i=0; i<canvas.width; i+=50) {
        ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(canvas.width,i); ctx.stroke();
    }

    // 確定済み配線の描画
    wires.forEach(w => {
        const p1 = { x: w.from.comp.x + w.from.pin.relX, y: w.from.comp.y + w.from.pin.relY };
        const p2 = { x: w.to.comp.x + w.to.pin.relX, y: w.to.comp.y + w.to.pin.relY };
        const pts = [p1, ...w.points, p2];
        ctx.beginPath(); 
        ctx.lineWidth = (selectedObj?.ref === w) ? 5 : 3;
        ctx.strokeStyle = (selectedObj?.ref === w) ? '#2ecc71' : '#333';
        ctx.moveTo(pts[0].x, pts[0].y);
        for(let i=1; i<pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
    });

    // 各コンポーネントの描画
    components.forEach(c => drawComponent(ctx, c, selectedObj?.ref === c));

    // 現在作成中の配線（activeLine）の描画
    if (activeLine) {
        const pStart = { x: activeLine.startComp.x + activeLine.startPin.relX, y: activeLine.startComp.y + activeLine.startPin.relY };
        const pts = [pStart, ...activeLine.points, mouse];
        ctx.strokeStyle = '#2ecc71'; ctx.setLineDash([5,5]); ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for(let i=1; i<pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke(); ctx.setLineDash([]);
    }
    requestAnimationFrame(draw);
}

initUIListeners();

document.getElementById('startBtn').addEventListener('click', e => {
    isSimulating = !isSimulating;
    e.target.classList.toggle('active', isSimulating);
    e.target.textContent = isSimulating ? "STOP SYSTEM" : "RUN SYSTEM";
});

document.getElementById('valInput').addEventListener('input', e => {
    if (selectedObj?.type === 'comp') selectedObj.ref.val = parseFloat(e.target.value) || 0;
});

document.getElementById('delBtn').addEventListener('click', () => {
    if (!selectedObj) return;
    if (selectedObj.type === 'comp') {
        wires = wires.filter(w => w.from.comp !== selectedObj.ref && w.to.comp !== selectedObj.ref);
        components = components.filter(c => c !== selectedObj.ref);
    } else {
        wires = wires.filter(w => w !== selectedObj.ref);
    }
    selectedObj = null; updateUI();
});

draw();
