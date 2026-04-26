/**
 * main.js - Drawing Loop with Rotation and Zoom Correction
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
    // 座標系全体をズーム・オフセット適用
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    drawGrid();

    // 配線描画
    wires.forEach(w => {
        // getPinPos を使用して回転後の絶対座標を取得
        const p1 = getPinPos(w.from.comp, w.from.pin);
        const p2 = getPinPos(w.to.comp, w.to.pin);
        const pts = [p1, ...w.points, p2];
        
        ctx.beginPath(); 
        // 選択中の配線は太く強調
        ctx.lineWidth = (selectedObj?.ref === w) ? 5 / zoom : 3 / zoom;
        ctx.strokeStyle = (selectedObj?.ref === w) ? '#2ecc71' : '#333';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        ctx.moveTo(pts[0].x, pts[0].y);
        for(let i=1; i<pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
    });

    // コンポーネント描画
    components.forEach(c => drawComponent(ctx, c, selectedObj?.ref === c));

    // 配線作成中のプレビュー
    if (activeLine) {
        // 開始点も回転後の座標を取得
        const pStart = getPinPos(activeLine.startComp, activeLine.startPin);
        const pts = [pStart, ...activeLine.points, mouse];
        
        ctx.strokeStyle = '#2ecc71'; 
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([5/zoom, 5/zoom]); 
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for(let i=1; i<pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
        }
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
window.onerror = function(msg, url, line, col, error) {
    const detail = `予期しない状態の詳細: ファイル: ${url.split('/').pop()}、行: ${line}:${col}\n${msg}`;
    showErrorDialog(
        "予期しないエラーが発生しました",
        "予期しないエラーが発生したため、BitGateCadは動作を中止しました。\n問題を報告してから再読み込みしてください。",
        detail,
        true // 再読み込みボタンを有効化
    );
    return true; // ブラウザ標準のコンソールエラー出力を抑制（任意）
};
