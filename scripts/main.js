/**
 * main.js - Worker Integration
 */

let physicsWorker = new Worker('scripts/worker.js');
let isRunning = false;

// Workerからの結果受取
physicsWorker.onmessage = function(e) {
    if (e.data.type === 'RESULT') {
        const updated = e.data.components;
        // メインスレッドのコンポーネントに計算結果（電流・電荷）を同期
        updated.forEach(upd => {
            const target = components.find(c => c.id === upd.id);
            if (target) {
                target.currentI = upd.currentI;
                target.charge = upd.charge;
            }
        });
    }
};

// シミュレーションループ
function loop() {
    if (isRunning) {
        // Workerに計算を依頼（現在の回路データを同期してからTICK）
        physicsWorker.postMessage({
            type: 'SYNC',
            data: { components, wires }
        });
        physicsWorker.postMessage({ type: 'TICK' });
    }
    
    draw(); // 描画は常にメインスレッドで実行（サクサク動く）
    requestAnimationFrame(loop);
}

// RUNボタンのイベント
document.getElementById('startBtn').onclick = () => {
    isRunning = !isRunning;
    const btn = document.getElementById('startBtn');
    btn.classList.toggle('active', isRunning);
    btn.innerText = isRunning ? "STOP SYSTEM" : "RUN SYSTEM";
};

loop();
