/**
 * main.js - Worker Integration & Drawing Logic
 */

let physicsWorker = new Worker('scripts/worker.js');
let isRunning = false;

// Workerからの結果受取
physicsWorker.onmessage = function(e) {
    if (e.data.type === 'RESULT') {
        const updated = e.data.components;
        updated.forEach(upd => {
            const target = components.find(c => c.id === upd.id);
            if (target) {
                target.currentI = upd.currentI;
                target.charge = upd.charge;
            }
        });
    }
};

// --- 描画関数本体 ---
function draw() {
    if (!ctx) return;

    // キャンバスのリセット
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.restore();

    // ズーム・パンの適用
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    // 1. 配線の描画
    wires.forEach(w => {
        ctx.beginPath();
        ctx.strokeStyle = w.from.comp.currentI > 0 ? "#2ecc71" : "#555";
        ctx.lineWidth = 3;
        ctx.moveTo(w.from.comp.x, w.from.comp.y); // 本来は端子座標だが簡略化
        ctx.lineTo(w.to.comp.x, w.to.comp.y);
        ctx.stroke();
    });

    // 2. コンポーネントの描画
    components.forEach(c => {
        // components.js で定義されている各部品の描画関数を呼び出す
        if (typeof renderComponent === 'function') {
            renderComponent(ctx, c);
        }
    });

    ctx.restore();
}

// メインループ
function loop() {
    if (isRunning) {
        physicsWorker.postMessage({
            type: 'SYNC',
            data: { components, wires }
        });
        physicsWorker.postMessage({ type: 'TICK' });
    }
    
    draw(); 
    requestAnimationFrame(loop);
}

// 初期化と起動
window.onload = () => {
    loop();
    
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.onclick = () => {
            isRunning = !isRunning;
            startBtn.classList.toggle('active', isRunning);
            startBtn.innerText = isRunning ? "STOP SYSTEM" : "RUN SYSTEM";
        };
    }
};
