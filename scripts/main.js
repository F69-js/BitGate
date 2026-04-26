import { renderComponent } from './components.js'; // コンポーネント描画
import { initUIListeners } from './ui.js';       // UIイベント

export let components = [];
export let wires = [];
export let zoom = 1.0;
export let offset = { x: 0, y: 0 };
export let draggingObj = null; 
export let selectedObj = null;
export let activeLine = null;
export let isSimulating = false;

// setter関数を用意すると安全
export function setDraggingObj(val) { draggingObj = val; }
export function setSelectedObj(val) { selectedObj = val; }

const canvas = document.getElementById('cvs');
const ctx = canvas.getContext('2d');
const viewport = document.getElementById('viewport');
const physicsWorker = new Worker('scripts/worker.js');

// --- 2. Workerからの計算結果受取 ---
physicsWorker.onmessage = function(e) {
    if (e.data.type === 'RESULT') {
        const updated = e.data.components;
        // メインスレッドのオブジェクトに計算結果(電流/電荷)のみを反映
        updated.forEach(upd => {
            const target = components.find(c => c.id === upd.id);
            if (target) {
                target.currentI = upd.currentI;
                target.charge = upd.charge;
            }
        });
    }
};

// --- 3. システム制御 ---
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
    if (typeof initUIListeners === 'function') initUIListeners();
    requestAnimationFrame(draw);
});

window.addEventListener('resize', resizeCanvas);

document.getElementById('startBtn').addEventListener('click', () => {
    isSimulating = !isSimulating;
    const btn = document.getElementById('startBtn');
    btn.classList.toggle('active', isSimulating);
    btn.innerText = isSimulating ? "STOP SYSTEM" : "RUN SYSTEM";
});

// --- 4. 描画ループ ---
function draw() {
    // A. 物理演算をWorkerに依頼 (実行中のみ)
    if (isSimulating) {
        physicsWorker.postMessage({
            type: 'SYNC',
            data: { components, wires }
        });
        physicsWorker.postMessage({ type: 'TICK' });
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // ui.js で定義されている offset と zoom を使用
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    drawGrid();

    // B. 配線描画 (電流状態による色変化)
    wires.forEach(w => {
        const p1 = getPinPos(w.from.comp, w.from.pin);
        const p2 = getPinPos(w.to.comp, w.to.pin);
        const pts = [p1, ...w.points, p2];
        
        ctx.beginPath(); 
        ctx.lineWidth = (selectedObj?.ref === w) ? 5 / zoom : 3 / zoom;
        // 電流が流れていれば明るい緑(#2ecc71)、そうでなければ暗い色
        ctx.strokeStyle = (w.from.comp.currentI > 0) ? '#2ecc71' : (selectedObj?.ref === w ? '#555' : '#333');
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        ctx.moveTo(pts[0].x, pts[0].y);
        for(let i=1; i<pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
    });

    // C. コンポーネント描画
    components.forEach(c => {
        if (typeof drawComponent === 'function') {
            drawComponent(ctx, c, selectedObj?.ref === c);
        }
    });

    // D. 配線プレビュー
    if (activeLine) {
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

// グリッド描画 (提示されたロジックをそのまま採用)
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

// --- 5. エラーハンドリング ---
window.onerror = function(msg, url, line, col, error) {
    const detail = `予期しない状態の詳細: ファイル: ${url ? url.split('/').pop() : 'unknown'}、行: ${line}:${col}\n${msg}`;
    if (typeof showErrorDialog === 'function') {
        showErrorDialog(
            "予期しないエラーが発生しました",
            "予期しないエラーが発生したため、BitGateCadは動作を中止しました。\n問題を報告してから再読み込みしてください。",
            detail,
            true
        );
    }
    return true;
};
