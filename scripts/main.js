/**
 * main.js - 修正版
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

// メインループ
function loop() {
    if (isRunning) {
        physicsWorker.postMessage({
            type: 'SYNC',
            data: { components, wires }
        });
        physicsWorker.postMessage({ type: 'TICK' });
    }
    
    // draw() が ui.js 等で定義されていることを確認
    // もし ui.js 内で canvas 描画関数を別名にしている場合はここを書き換えてください
    if (typeof draw === 'function') {
        draw(); 
    } else {
        // デバッグ用：drawが見つからない場合の警告
        console.warn("draw function is not defined. Checking ui.js...");
    }
    
    requestAnimationFrame(loop);
}

// 起動！
loop();

// イベントリスナーは DOMContentLoaded の後か、スクリプト末尾で確実に
document.getElementById('startBtn').addEventListener('click', () => {
    isRunning = !isRunning;
    const btn = document.getElementById('startBtn');
    btn.classList.toggle('active', isRunning);
    btn.innerText = isRunning ? "STOP SYSTEM" : "RUN SYSTEM";
});
