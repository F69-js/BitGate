/**
 * save.js - Direct File System Access with Fallback
 */
import { state } from './state.js';

export async function saveCircuit() {
    // 現在のステートから保存用データを作成
    const data = {
        version: "1.7",
        components: state.components,
        wires: state.wires,
        zoom: state.zoom,
        offset: state.offset
    };

    let json = "";
    try {
        // JSON化（インデントありで整形）
        json = JSON.stringify(data, null, 2);
    } catch (e) {
        // ダイアログ関数がない場合のフォールバックを含めたエラー通知
        const msg = "保存に失敗しました: エラーが発生したため、ファイルを保存できませんでした。\n" + e.message;
        if (typeof showErrorDialog === 'function') {
            showErrorDialog("保存に失敗しました", "エラーが発生したため、ファイルを保存できませんでした。", e.message);
        } else {
            alert(msg);
        }
        return;
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
            // ユーザーによるキャンセル（AbortError）は無視
            if (err.name === 'AbortError') return;
            
            const msg = "保存に失敗しました: エラーが発生したため、ファイルを保存できませんでした。\n" + err.message;
            if (typeof showErrorDialog === 'function') {
                showErrorDialog("保存に失敗しました", "エラーが発生したため、ファイルを保存できませんでした。", err.message);
            } else {
                alert(msg);
            }
            // 失敗した場合は下のフォールバック（ダウンロード）へ
        }
    }

    // 2. Fallback: a#download (Firefox/Safariなど)
    try {
        const blob = new Blob([json], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bitgate_${Date.now()}.btg`;
        document.body.appendChild(a); // 一部のブラウザで必要
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log("File saved via download fallback");
    } catch (e) {
        alert("ダウンロードによる保存にも失敗しました。\n" + e.message);
    }
}
