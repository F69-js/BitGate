/**
 * load.js - File Loading Logic
 */
import { state } from './state.js';
import { updateUI } from './ui.js';

export async function loadCircuit() {
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
        if (!file) return;
        const reader = new FileReader();
        reader.onload = f => applyData(f.target.result);
        reader.readAsText(file);
    };
    input.click();
}

function applyData(jsonText) {
    try {
        const data = JSON.parse(jsonText);
        
        // 1. コンポーネントの復元
        state.components = data.components || [];
        
        // 2. 配線の復元と再紐付け
        // JSONでは参照が切れるため、IDをもとに state.components 内のオブジェクトを指すように再構築
        state.wires = (data.wires || []).map(w => {
            const fromComp = state.components.find(c => c.id === w.from.comp.id);
            const toComp = state.components.find(c => c.id === w.to.comp.id);
            
            // ピン自体の参照も再構築（ID一致を確認）
            const fromPin = fromComp?.pins.find(p => p.id === w.from.pin.id);
            const toPin = toComp?.pins.find(p => p.id === w.to.pin.id);
            
            if (fromComp && toComp && fromPin && toPin) {
                return {
                    ...w,
                    from: { comp: fromComp, pin: fromPin },
                    to: { comp: toComp, pin: toPin }
                };
            }
            return null;
        }).filter(w => w !== null);

        // 3. 表示設定の復元
        state.zoom = data.zoom || 1.0;
        state.offset = data.offset || { x: 0, y: 0 };
        state.selectedObj = null;
        
        updateUI();
        console.log("Circuit loaded successfully.");
    } catch (err) {
        alert("BTGファイルの読み込みに失敗しました。データが破損しているか形式が違います。");
        console.error(err);
    }
}
