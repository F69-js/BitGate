const canvas = document.getElementById('cvs');
const ctx = canvas.getContext('2d');
let isSimulating = false, components = [], wires = [], activeLine = null, draggingObj = null, dragOffset = {x:0, y:0}, selectedObj = null, mouse = {x:0, y:0};

function draw() {
    updateSimulation();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Grid
    ctx.strokeStyle = '#f1f1f1'; ctx.lineWidth = 1;
    for(let i=0; i<canvas.width; i+=50) {
        ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(canvas.width,i); ctx.stroke();
    }

    wires.forEach(w => {
        ctx.beginPath(); ctx.lineWidth = (selectedObj?.ref === w) ? 5 : 3;
        ctx.strokeStyle = (selectedObj?.ref === w) ? '#2ecc71' : '#333';
        ctx.moveTo(w.from.comp.x + w.from.pin.relX, w.from.comp.y + w.from.pin.relY);
        ctx.lineTo(w.to.comp.x + w.to.pin.relX, w.to.comp.y + w.to.pin.relY);
        ctx.stroke();
    });

    components.forEach(c => drawComponent(ctx, c, selectedObj?.ref === c));

    if (activeLine) {
        ctx.strokeStyle = '#2ecc71'; ctx.setLineDash([5,5]); ctx.beginPath();
        ctx.moveTo(activeLine.startComp.x + activeLine.startPin.relX, activeLine.startComp.y + activeLine.startPin.relY);
        ctx.lineTo(mouse.x, mouse.y); ctx.stroke(); ctx.setLineDash([]);
    }
    requestAnimationFrame(draw);
}

// 初期化
initUIListeners();
document.getElementById('startBtn').addEventListener('click', e => {
    isSimulating = !isSimulating;
    e.target.classList.toggle('active', isSimulating);
    e.target.textContent = isSimulating ? "STOP SYSTEM" : "RUN SYSTEM";
});
document.getElementById('valInput').addEventListener('input', e => { if (selectedObj?.type === 'comp') selectedObj.ref.val = parseFloat(e.target.value) || 0; });
document.getElementById('delBtn').addEventListener('click', () => { /* 削除ロジック */ });

draw();
