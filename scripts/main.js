/**
 * main.js - Core System & Drawing Loop
 */
import { state } from './state.js';
import { initUIListeners, updateUI, deleteSelected } from './ui.js';
import { drawComponent, getPinPos, addComponent } from './components.js';

const canvas = document.getElementById('cvs');
const ctx = canvas.getContext('2d');
const viewport = document.getElementById('viewport');

// --- WebWorkerの初期化 ---
const physicsWorker = new Worker('scripts/worker.js');

physicsWorker.onmessage = (e) => {
    if (e.data.type === 'RESULT') {
        e.data.components.forEach(upd => {
            const target = state.components.find(c => c.id === upd.id);
            if (target) {
                target.currentI = upd.currentI;
                target.charge = upd.charge;
                target.isActive = upd.isActive;
                target.isBlown = upd.isBlown;
            }
        });
    }
};

/**
 * キャンバスのリサイズ
 */
function resizeCanvas() {
    const w = viewport.clientWidth;
    const h = viewport.clientHeight;
    if (w > 0 && h > 0) {
        canvas.width = w;
        canvas.height = h;
    }
}

/**
 * 背景グリッド
 */
function drawGrid() {
    const gridStep = 50;
    const left = -state.offset.x / state.zoom;
    const top = -state.offset.y / state.zoom;
    const right = (canvas.width - state.offset.x) / state.zoom;
    const bottom = (canvas.height - state.offset.y) / state.zoom;
    
    ctx.save();
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
    ctx.restore();
}

/**
 * メインループ
 */
function draw() {
    // 1. シミュレーションの実行 (Workerへ送信)
    if (state.isSimulating) {
        physicsWorker.postMessage({
            type: 'SYNC',
            data: { 
                components: state.components, 
                wires: state.wires 
            }
        });
        physicsWorker.postMessage({ type: 'TICK' });
    }

    // 2. 画面クリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // 座標系の変形
    ctx.translate(state.offset.x, state.offset.y);
    ctx.scale(state.zoom, state.zoom);

    // 3. グリッド描画
    drawGrid();

    // 4. 配線の描画
    state.wires.forEach(w => {
        const p1 = getPinPos(w.from.comp, w.from.pin);
        const p2 = getPinPos(w.to.comp, w.to.pin);
        const pts = [p1, ...w.points, p2];
        
        ctx.beginPath(); 
        const isSelected = (state.selectedObj?.type === 'wire' && state.selectedObj.ref === w);
        ctx.lineWidth = isSelected ? 5 / state.zoom : 3 / state.zoom;
        // 電流が流れているときは赤
        ctx.strokeStyle = isSelected ? '#2ecc71' : (w.from.comp.currentI > 0.01 ? '#e74c3c' : '#333');
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        ctx.moveTo(pts[0].x, pts[0].y);
        for(let i=1; i<pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
    });

    // 5. 配線作成中のプレビュー描画
    if (state.activeLine) {
        const pStart = getPinPos(state.activeLine.startComp, state.activeLine.startPin);
        const pts = [pStart, ...state.activeLine.points, state.mouse];
        
        ctx.save();
        ctx.strokeStyle = '#2ecc71'; 
        ctx.lineWidth = 2 / state.zoom;
        ctx.setLineDash([5/state.zoom, 5/state.zoom]); 
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for(let i=1; i<pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke(); 
        ctx.restore();
    }

    // 6. コンポーネントの描画
    state.components.forEach(c => {
        const isSelected = (state.selectedObj?.type === 'comp' && state.selectedObj.ref === c);
        drawComponent(ctx, c, isSelected);
    });

    ctx.restore();
    requestAnimationFrame(draw);
}

// --- 初期化とグローバル公開 ---

window.addEventListener('load', () => {
    resizeCanvas();
    initUIListeners();
    updateUI();
    requestAnimationFrame(draw);
});

window.addEventListener('resize', resizeCanvas);

document.getElementById('startBtn')?.addEventListener('click', () => {
    state.isSimulating = !state.isSimulating;
    const btn = document.getElementById('startBtn');
    btn.classList.toggle('active', state.isSimulating);
    btn.innerText = state.isSimulating ? "STOP SYSTEM" : "RUN SYSTEM";
});

document.getElementById('delBtn')?.addEventListener('click', deleteSelected);

window.addComponent = addComponent;
window.deleteSelected = deleteSelected;
