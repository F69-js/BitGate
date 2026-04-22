const fs = require('fs');
const { JSDOM } = require('jsdom');

// index.htmlを読み込む
const html = fs.readFileSync('index.html', 'utf8');

// ブラウザ環境をエミュレート
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable" });
const { window } = dom;

// HTML内の変数をテスト用に取得
setTimeout(() => {
    try {
        console.log("--- BitGate Logic Test Starting ---");
        
        // 1. 基本的な部品追加テスト
        window.addComponent('BAT');
        window.addComponent('RES');
        if (window.components.length === 2) {
            console.log("✅ Component Addition: PASSED");
        } else {
            throw new Error("Component Addition: FAILED");
        }

        // 2. シミュレーションエンジンの存在確認
        if (typeof window.updateSimulation === 'function') {
            console.log("✅ Simulation Engine Load: PASSED");
        } else {
            throw new Error("Simulation Engine Load: FAILED");
        }

        // 3. 今後のIC実装に向けたロジック検証（プレースホルダ）
        // ここに「電池→スイッチ→LED」の導通テストなどを追加可能

        console.log("--- All Tests PASSED ---");
        process.exit(0);
    } catch (err) {
        console.error("❌ Test FAILED:", err.message);
        process.exit(1);
    }
}, 500); // スクリプトのパース待ち
