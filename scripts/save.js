/**
 * save.js - Direct File System Access with Fallback
 */

async function saveCircuit() {
    const data = {
        version: "1.7",
        components: components,
        wires: wires,
        zoom: zoom,
        offset: offset
    };
    let json={};
    try{
        json = JSON.stringify(data, null, 2);
    }catch(e){
        showErrorDialog("保存に失敗しました", "エラーが発生したため、ファイルを保存できませんでした。", e.message);
    }

    // 1. Direct File System Access API (Chrome/Edgeなど)
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: 'circuit.btg',
                types: [{
                    description: 'BitGate Circuit File',
                    accept: { 'application/octet-stream': ['.btg'] }, 
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(json);
            await writable.close();
            console.log("File saved via File System Access API");
            return;
        } catch (err) {
            if (err.name === 'AbortError') return;
            showErrorDialog("保存に失敗しました", "エラーが発生したため、ファイルを保存できませんでした。", err.message);
        }
    }

    // 2. Fallback: a#download (Firefox/Safariなど)
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bitgate_${Date.now()}.btg`;
    a.click();
    URL.revokeObjectURL(url);
}
