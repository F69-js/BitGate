/**
 * main.js - Drawing Loop with Zoom Correction
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

let selectedComponent = null;

// キャンバスクリック時の処理
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / zoom;
    const mouseY = (e.clientY - rect.top) / zoom;

    // ピンのクリック判定
    let clickedPin = null;
    components.forEach(c => {
        c.pins.forEach(p => {
            const px = c.x + p.relX;
            const py = c.y + p.relY;
            if (Math.hypot(px - mouseX, py - mouseY) < 10) {
                clickedPin = p;
            }
        });
    });

    if (clickedPin) {
        // ワイヤ作成ロジック（既存）
        startWire(clickedPin);
    } else {
        // コンポーネントの選択判定
        const found = [...components].reverse().find(c => 
            mouseX > c.x && mouseX < c.x + c.w && mouseY > c.y && mouseY < c.y + c.h
        );
        
        selectedComponent = found || null;
        updateInspector(); // ここでUIを更新
    }
});

function updateInspector() {
    const inspector = document.getElementById('inspector');
    if (!inspector) {
        // もしHTMLに存在しない場合は動的に作成
        const panel = document.createElement('div');
        panel.id = 'inspector';
        panel.style = "position:fixed; top:10px; right:10px; background:white; padding:10px; border:1px solid #ccc; display:none;";
        document.body.appendChild(panel);
    }

    const ins = document.getElementById('inspector');
    
    if (selectedComponent && (selectedComponent.type === 'RES' || selectedComponent.type === 'CAP' || selectedComponent.type === 'BAT')) {
        let label = "値: ";
        let unit = "";
        
        if (selectedComponent.type === 'RES') { label = "抵抗値: "; unit = " Ω"; }
        if (selectedComponent.type === 'CAP') { label = "容量: "; unit = " μF"; }
        if (selectedComponent.type === 'BAT') { label = "電圧: "; unit = " V"; }

        ins.style.display = 'block';
        ins.innerHTML = `
            <div style="font-weight:bold; margin-bottom:5px;">${selectedComponent.type} 設定</div>
            ${label} <input type="number" id="compVal" value="${selectedComponent.val}" style="width:80px;">${unit}
            <button onclick="saveValue()" style="display:block; margin-top:5px;">保存</button>
        `;
    } else {
        ins.style.display = 'none';
    }
}

// グローバル関数として定義（HTMLのonclickから呼ぶため）
window.saveValue = function() {
    if (selectedComponent) {
        const newVal = document.getElementById('compVal').value;
        selectedComponent.val = parseFloat(newVal);
        // コンデンサの場合、値を変更したら電荷をリセット（安全のため）
        if (selectedComponent.type === 'CAP') selectedComponent.charge = 0;
        updateInspector();
    }
};

// コンポーネント追加後の自動選択
const originalAddComponent = window.addComponent;
window.addComponent = function(type) {
    originalAddComponent(type);
    selectedComponent = components[components.length - 1];
    updateInspector();
};

window.addEventListener('load', () => {
    resizeCanvas();
    initUIListeners();
    requestAnimationFrame(draw);
});

window.addEventListener('resize', resizeCanvas);

let components = [];
let wires = [];
let isSimulating = false;
let selectedObj = null;
let draggingObj = null;
let dragOffset = { x: 0, y: 0 };
let activeLine = null;
let mouse = { x: 0, y: 0 };

document.getElementById('startBtn').addEventListener('click', () => {
    isSimulating = !isSimulating;
    const btn = document.getElementById('startBtn');
    btn.classList.toggle('active', isSimulating);
    btn.innerText = isSimulating ? "STOP SYSTEM" : "RUN SYSTEM";
});

document.getElementById('delBtn').addEventListener('click', deleteSelected);

function draw() {
    updateSimulation();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // ここで座標系全体をズーム
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    drawGrid();

    // 配線描画
    wires.forEach(w => {
        const p1 = { x: w.from.comp.x + w.from.pin.relX, y: w.from.comp.y + w.from.pin.relY };
        const p2 = { x: w.to.comp.x + w.to.pin.relX, y: w.to.comp.y + w.to.pin.relY };
        const pts = [p1, ...w.points, p2];
        
        ctx.beginPath(); 
        // 見た目の太さを一定にする
        ctx.lineWidth = (selectedObj?.ref === w) ? 5 / zoom : 3 / zoom;
        ctx.strokeStyle = (selectedObj?.ref === w) ? '#2ecc71' : '#333';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.moveTo(pts[0].x, pts[0].y);
        for(let i=1; i<pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
    });

    components.forEach(c => drawComponent(ctx, c, selectedObj?.ref === c));

    // 配線作成中のプレビュー
    if (activeLine) {
        const pStart = { x: activeLine.startComp.x + activeLine.startPin.relX, y: activeLine.startComp.y + activeLine.startPin.relY };
        const pts = [pStart, ...activeLine.points, mouse];
        ctx.strokeStyle = '#2ecc71'; 
        ctx.lineWidth = 2 / zoom;
        // 点線の間隔も補正
        ctx.setLineDash([5/zoom, 5/zoom]); 
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for(let i=1; i<pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke(); 
        ctx.setLineDash([]);
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
    
    ctx.strokeStyle = '#f1f1f1'; 
    ctx.lineWidth = 1 / zoom;
    ctx.beginPath();
    for(let i = Math.floor(left/gridStep)*gridStep; i < right; i += gridStep) {
        ctx.moveTo(i, top); ctx.lineTo(i, bottom);
    }
    for(let i = Math.floor(top/gridStep)*gridStep; i < bottom; i += gridStep) {
        ctx.moveTo(left, i); ctx.lineTo(right, i);
    }
    ctx.stroke();
}
