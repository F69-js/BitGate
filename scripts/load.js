/**
 * load.js - File Loading Logic
 */

async function loadCircuit() {
    // 1. Direct File System Access API
    if ('showOpenFilePicker' in window) {
        try {
            const [handle] = await window.showOpenFilePicker({
                types: [{
                    description: 'BitGate Circuit File',
                    accept: { 'application/octet-stream': ['.btg'] },
                }],
            });
            const file = await handle.getFile();
            const text = await file.text();
            applyData(text);
            return;
        } catch (err) {
            if (err.name === 'AbortError') return;
            console.error("Direct load failed, falling back to input[file]...", err);
        }
    }

    // 2. Fallback: input#file
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.btg';
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = f => applyData(f.target.result);
        reader.readAsText(file);
    };
    input.click();
}

function applyData(jsonText) {
    try {
        const data = JSON.parse(jsonText);
        
        // 1. まずコンポーネントを復元
        components = data.components || [];
        
        // 2. 配線の復元と再紐付け
        // JSON化で失われた「どの部品オブジェクトか」という参照をIDで検索して繋ぎ直す
        wires = (data.wires || []).map(w => {
            const fromComp = components.find(c => c.id === w.from.comp.id);
            const toComp = components.find(c => c.id === w.to.comp.id);
            
            if (fromComp && toComp) {
                return {
                    ...w,
                    from: { ...w.from, comp: fromComp },
                    to: { ...w.to, comp: toComp }
                };
            }
            return null; // 紐付け失敗した配線は破棄
        }).filter(w => w !== null);

        // 3. 画面表示の復元
        zoom = data.zoom || 1.0;
        offset = data.offset || { x: 0, y: 0 };
        
        selectedObj = null;
        if (typeof updateUI === 'function') updateUI();
        console.log("Circuit re-linked and loaded successfully.");
    } catch (err) {
        alert("BTGファイルの読み込みに失敗しました。");
        console.error(err);
    }
}
