/**
 * ui.js - UIイベントリスナーと操作
 */
import { state } from './state.js';

export function initUIListeners() {
    const canvas = document.getElementById('cvs');

    // マウス移動：座標変換を考慮
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        state.mouse.x = (e.clientX - rect.left - state.offset.x) / state.zoom;
        state.mouse.y = (e.clientY - rect.top - state.offset.y) / state.zoom;

        if (state.draggingObj) {
            state.draggingObj.x = state.mouse.x;
            state.draggingObj.y = state.mouse.y;
        }
    });

    canvas.addEventListener('mousedown', (e) => {
        // クリック判定ロジック（簡略化）
        const clicked = state.components.find(c => {
            const dx = c.x - state.mouse.x;
            const dy = c.y - state.mouse.y;
            return Math.sqrt(dx*dx + dy*dy) < 30;
        });

        if (clicked) {
            state.draggingObj = clicked;
            state.selectedObj = clicked;
        } else {
            state.selectedObj = null;
        }
    });

    window.addEventListener('mouseup', () => {
        state.draggingObj = null;
    });

    // ズーム（ホイール操作）
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        state.zoom *= delta;
    }, { passive: false });
}
