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
    const json = JSON.stringify(data, null, 2);

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
            console.error("Direct save failed, falling back to download...", err);
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
