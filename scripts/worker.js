/**
 * worker.js - Background Physics Engine
 */

// シミュレーションの状態
let components = [];
let wires = [];

// メインスレッドからの指示を処理
self.onmessage = function(e) {
    const { type, data } = e.data;

    if (type === 'SYNC') {
        // 全データを同期
        components = data.components;
        wires = data.wires;
    } else if (type === 'TICK') {
        // 1ステップ計算を実行
        updateSimulation();
        // 計算結果をメインスレッドへ返送
        self.postMessage({
            type: 'RESULT',
            components: components
        });
    }
};

function updateSimulation() {
    // 1. 電流状態のリセット
    components.forEach(c => {
        c.currentI = 0;
        if (c.type !== 'CAP') c.charge = 0; // コンデンサ以外は電荷を持たない
    });

    // 2. 電源から探索（簡易版電流伝搬ロジック）
    const batteries = components.filter(c => c.type === 'BAT');
    batteries.forEach(bat => {
        propagateCurrent(bat, bat.val || 9, []);
    });

    // 3. コンデンサの容量反映（前回実装したロジック）
    components.filter(c => c.type === 'CAP').forEach(cap => {
        if (cap.currentI > 0) {
            const capacity = Math.max(cap.val, 0.1);
            const chargeStep = (cap.currentI * 0.01) / (capacity / 1000);
            cap.charge = Math.min(9, (cap.charge || 0) + chargeStep);
        } else {
            cap.charge = (cap.charge || 0) * 0.98; // 自然放電
        }
    });
}

// 再帰的な電流探索ロジック (簡易版)
function propagateCurrent(comp, voltage, visited) {
    if (visited.includes(comp.id)) return;
    visited.push(comp.id);

    comp.currentI = voltage; // 簡易的に電圧を電流フラグとして使用

    const connectedWires = wires.filter(w => w.from.comp.id === comp.id || w.to.comp.id === comp.id);
    connectedWires.forEach(w => {
        const nextComp = (w.from.comp.id === comp.id) ? w.to.comp : w.from.comp;
        
        // ダイオードやスイッチの論理チェック
        let canPass = true;
        if (comp.type === 'PSW' && !comp.state) canPass = false;
        if (comp.type === 'SSW' && !comp.state) canPass = false;
        
        if (canPass) {
            propagateCurrent(nextComp, voltage, visited);
        }
    });
}
