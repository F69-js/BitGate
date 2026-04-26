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
        
        // データの復元
        // 注意: 配線(wires)はオブジェクト参照を含むため、読み込み後にID等で再紐付けが必要な場合があります
        components = data.components || [];
        wires = data.wires || [];
        zoom = data.zoom || 1.0;
        offset = data.offset || { x: 0, y: 0 };
        
        selectedObj = null;
        if (typeof updateUI === 'function') updateUI();
        console.log("Circuit loaded successfully");
    } catch (err) {
        alert("ファイルの読み込みに失敗しました。");
        console.error(err);
    }
}
