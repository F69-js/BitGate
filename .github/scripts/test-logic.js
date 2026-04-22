const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('index.html', 'utf8');

// virtualConsoleを使ってブラウザ内のエラーをNodeのコンソールに出力するようにする
const { JSDOM: { virtualConsole } } = require('jsdom');
const vConsole = new (require('jsdom').VirtualConsole)();
vConsole.sendTo(console);

const dom = new JSDOM(html, { 
    runScripts: "dangerously", 
    resources: "usable",
    virtualConsole: vConsole
});

const { window } = dom;

// スクリプト実行完了を待つためのイベントリスナー
window.addEventListener('load', () => {
    // 少しだけ余裕を持って実行
    setTimeout(() => {
        try {
            console.log("--- BitGate Logic Test Starting ---");

            // components配列が存在するかチェック
            if (!window.components) {
                throw new Error("window.components is undefined. Script might not be parsed correctly.");
            }

            // 1. 部品追加テスト
            window.addComponent('BAT');
            if (window.components.length === 1) {
                console.log("✅ Component Addition: PASSED");
            } else {
                throw new Error(`Component Addition: FAILED (Expected 1, got ${window.components.length})`);
            }

            // 2. 関数存在チェック
            if (typeof window.updateSimulation === 'function') {
                console.log("✅ Simulation Engine Load: PASSED");
            } else {
                throw new Error("window.updateSimulation is not a function.");
            }

            console.log("--- All Tests PASSED ---");
            process.exit(0);
        } catch (err) {
            console.error("❌ Test FAILED:", err.message);
            process.exit(1);
        }
    }, 100);
});
