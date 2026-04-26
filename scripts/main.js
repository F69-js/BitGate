/**
 * main.js - Canvas Context & Worker Integration
 */

let cvs, ctx;
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

/**
 * 描画関数本体
 */
function draw() {
    if (!ctx || !cvs) return; // コンテキストがない場合はスキップ

    // キャンバスのリセット
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.restore();

    // ズーム・パンの適用
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    // 1. 配線の描画 (ui.jsにあったロジックを統合)
    wires.forEach(w => {
        ctx.beginPath();
        // 電流が流れている配線は緑色、それ以外はグレー
        ctx.strokeStyle = w.from.comp.currentI > 0 ? "#2ecc71" : "#555";
        ctx.lineWidth = 3;
        // 本来は端子の相対座標を加味するが、まずは簡易的に中心座標で結ぶ
        ctx.moveTo(w.from.comp.x, w.from.comp.y);
        ctx.lineTo(w.to.comp.x, w.to.comp.y);
        ctx.stroke();
    });

    // 2. コンポーネントの描画
    components.forEach(c => {
        if (typeof renderComponent === 'function') {
            renderComponent(ctx, c); // components.js の関数を呼ぶ
        }
    });

    ctx.restore();
}

/**
 * メインループ
 */
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

/**
 * 初期化処理
 */
window.addEventListener('load', () => {
    // 1. まず ID 'canvas' で探す
    cvs = document.getElementById('canvas'); 
    
    // 2. 見つからない場合、タグ名で直接取得 (HTMLにcanvasが1つしかない場合有効)
    if (!cvs) {
        cvs = document.querySelector('canvas');
    }

    if (cvs) {
        ctx = cvs.getContext('2d');
        console.log("Canvas context secured.");
    } else {
        // それでもダメならエラーダイアログを出す（前回作った仕組みを活用！）
        if (typeof showErrorDialog === 'function') {
            showErrorDialog(
                "初期化失敗",
                "Canvas要素が見つかりません。HTMLの構造を確認してください。",
                "selector: document.querySelector('canvas') returns null"
            );
        }
    }

    // 以下、既存の処理...
    const startBtn = document.getElementById('startBtn');
    // ...
    loop(); 
});
