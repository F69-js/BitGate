/**
 * main.js - Core System & Drawing Loop
 * ES Module with WebWorker integration
 */
import { state } from './state.js';
import { initUIListeners, updateUI, deleteSelected } from './ui.js';
import { drawComponent, getPinPos } from './components.js';

const canvas = document.getElementById('cvs');
const ctx = canvas.getContext('2d');
const viewport = document.getElementById('viewport');

// --- Workerの設定 ---
// 注意: worker.js 側も ES Module として書いている場合は { type: "module" } が必要
const physicsWorker = new Worker('scripts/worker.js');

physicsWorker.onmessage = (e) => {
    if (e.data.type === 'RESULT') {
        // Workerからの計算結果（電流値や充電量）を反映
        e.data.components.forEach(upd => {
            const target = state.components.find(c => c.id === upd.id);
            if (target) {
                target.currentI = upd.currentI;
                target.charge = upd.charge;
                target.isActive = upd.isActive; // ICの状態など
                target.isBlown = upd.isBlown;   // LEDの焼損など
            }
        });
    }
};

/**
 * キャンバスのリサイズ処理
 */
function resizeCanvas() {
    const w = viewport.clientWidth;
    const h = viewport.clientHeight;
    if (w > 0 && h > 0) {
        canvas.width = w;
        canvas.height = h;
    }
}

// 起動処理
window.addEventListener('load', () => {
    resizeCanvas();
    initUIListeners();
    requestAnimationFrame(draw);
});

window.addEventListener('resize', resizeCanvas);

/**
 * UIボタン：システム実行/停止
 */
const startBtn = document.getElementById('startBtn');
if (startBtn) {
    startBtn.addEventListener('click', () => {
        state.isSimulating = !state.isSimulating;
        startBtn.classList.toggle('active', state.isSimulating);
        startBtn.innerText = state.isSimulating ? "STOP SYSTEM" : "RUN SYSTEM";
    });
}

/**
 * メインループ
 */
function draw() {
    // --- シミュレーション更新 (Worker通信) ---
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

    // --- 描画処理 ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // 座標系全体をズーム・オフセット適用
    ctx.translate(state.offset.x, state.offset.y);
    ctx.scale(state.zoom, state.zoom);

    drawGrid();

    // 1. 配線描画
    state.wires.forEach(w => {
        const p1 = getPinPos(w.from.comp, w.from.pin);
        const p2 = getPinPos(w.to.comp, w.to.pin);
        const pts = [p1, ...w.points, p2];
        
        ctx.beginPath(); 
        // 選択中の配線は太く強調
        const isSelected = (state.selectedObj?.type === 'wire' && state.selectedObj.ref === w);
        ctx.lineWidth = isSelected ? 5 / state.zoom : 3 / state.zoom;
        // 電流が流れている配線を色分け（Workerの結果を利用）
        ctx.strokeStyle = isSelected ? '#2ecc71' : (w.from.comp.currentI > 0 ? '#e74c3c' : '#333');
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        ctx.moveTo(pts[0].x, pts[0].y);
        for(let i=1; i<pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
    });

    // 2. コンポーネント描画
    state.components.forEach(c => {
        const isSelected = (state.selectedObj?.type === 'comp' && state.selectedObj.ref === c);
        drawComponent(ctx, c, isSelected);
    });

    // 3. 配線作成中のプレビュー
    if (state.activeLine) {
        const pStart = getPinPos(state.activeLine.startComp, state.activeLine.startPin);
        const pts = [pStart, ...state.activeLine.points, state.mouse];
        
        ctx.strokeStyle = '#2ecc71'; 
        ctx.lineWidth = 2 / state.zoom;
        ctx.setLineDash([5/state.zoom, 5/state.zoom]); 
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

/**
 * グリッド描画
 */
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

import { addComponent } from './components.js';

window.addComponent = addComponent;
window.deleteSelected = deleteSelected;

// システム起動時にUIを初期化
window.onload = () => {
    resizeCanvas();
    initUIListeners();
    updateUI(); // 初期状態のUI更新
    requestAnimationFrame(draw);
};
