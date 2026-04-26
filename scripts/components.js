/**
 * components.js - 部品の描画と座標計算
 */
import { state } from './state.js';

export function getPinPos(comp, pinIndex) {
    // 回転（comp.rotation）を考慮したピンの絶対座標を計算
    const rad = (comp.rotation || 0) * Math.PI / 180;
    const s = Math.sin(rad);
    const c = Math.cos(rad);

    // ピンの相対座標（部品中心から）
    const px = comp.pins[pinIndex].x;
    const py = comp.pins[pinIndex].y;

    // 回転行列による変換
    const rx = px * c - py * s;
    const ry = px * s + py * c;

    return {
        x: comp.x + rx,
        y: comp.y + ry
    };
}

export function drawComponent(ctx, comp, isSelected) {
    ctx.save();
    ctx.translate(comp.x, comp.y);
    ctx.rotate((comp.rotation || 0) * Math.PI / 180);

    // 選択時のハイライト
    if (isSelected) {
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 2 / state.zoom;
        ctx.strokeRect(-25, -25, 50, 50);
    }

    // 部品ごとの描画ロジック（例：抵抗）
    if (comp.type === 'RES') {
        ctx.fillStyle = '#d2b48c';
        ctx.fillRect(-20, -10, 40, 20);
    } 
    // LEDの場合（電流による発光）
    else if (comp.type === 'LED') {
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fillStyle = comp.currentI > 0 ? (comp.color || 'red') : '#333';
        ctx.fill();
        // 縁取り（白LED対策）
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1 / state.zoom;
        ctx.stroke();
    }

    ctx.restore();
}
