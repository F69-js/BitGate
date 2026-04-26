/**
 * main.js - 全体の統括（エントリーポイント）
 */
import { state } from './state.js';
import { initUIListeners } from './ui.js';
import { drawComponent, getPinPos } from './components.js';

const canvas = document.getElementById('cvs');
const ctx = canvas.getContext('2d');
const physicsWorker = new Worker('scripts/worker.js');

// Workerからの結果を反映
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

function draw() {
    // シミュレーション実行中ならWorkerへ送信
    if (state.isSimulating) {
        physicsWorker.postMessage({
            type: 'SYNC',
            data: { components: state.components, wires: state.wires }
        });
        physicsWorker.postMessage({ type: 'TICK' });
    }

    // 描画開始
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(state.offset.x, state.offset.y);
    ctx.scale(state.zoom, state.zoom);

    // グリッド描画
    drawGrid();

    // 配線
    state.wires.forEach(w => {
        const p1 = getPinPos(w.from.comp, w.from.pin);
        const p2 = getPinPos(w.to.comp, w.to.pin);
        ctx.beginPath();
        ctx.strokeStyle = w.from.comp.currentI > 0 ? '#2ecc71' : '#333';
        ctx.lineWidth = 3 / state.zoom;
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
    });

    // 部品
    state.components.forEach(c => {
        drawComponent(ctx, c, state.selectedObj === c);
    });

    ctx.restore();
    requestAnimationFrame(draw);
}

function drawGrid() {
    const step = 50;
    ctx.beginPath();
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1 / state.zoom;
    // ...グリッド描画の詳細は以前のロジックと同じ...
    ctx.stroke();
}

// 起動
window.onload = () => {
    initUIListeners();
    requestAnimationFrame(draw);
};
