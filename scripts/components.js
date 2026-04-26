/**
 * components.js - Drawing Logic & Physical Constants
 */
import { state } from './state.js';

// 抵抗器のカラーコード定数
export const COLOR_MAP = ["#000", "#8B4513", "#F00", "#FF8C00", "#FF0", "#0F0", "#00F", "#800080", "#808080", "#FFF", "#D4AF37", "#C0C0C0"];

/**
 * 回転後のピンの絶対座標を計算するヘルパー関数
 */
export function getPinPos(c, p) {
    if (!c || !p) return { x: 0, y: 0 };
    const angle = c.angle || 0;
    // 部品中心からの相対座標
    const rx = p.relX - c.w / 2;
    const ry = p.relY - c.h / 2;
    // 回転行列による計算
    const nx = rx * Math.cos(angle) - ry * Math.sin(angle);
    const ny = rx * Math.sin(angle) + ry * Math.cos(angle);
    return {
        x: c.x + c.w / 2 + nx,
        y: c.y + c.h / 2 + ny
    };
}

/**
 * コンポーネントをCanvasに描画する
 */
export function drawComponent(ctx, c, isSelected) {
    const { x, y, w, h, angle } = c;
    
    ctx.save();
    // 回転の中心を部品の中央に移動 (ここが原点 0,0 になる)
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(angle || 0);
    
    // 以降、(0,0)を部品中心とした相対座標で描画するためのオフセット
    const dx = -w / 2;
    const dy = -h / 2;

    // 選択時のハイライト設定
    ctx.strokeStyle = isSelected ? '#3498db' : '#222';
    ctx.lineWidth = 2 / (state.zoom || 1);

    // --- 抵抗器 (RES) ---
    if (c.type === 'RES') {
        ctx.fillStyle = '#e6ccb3';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(dx + 10, dy, w - 20, h, 5);
        else ctx.fillRect(dx + 10, dy, w - 20, h);
        ctx.fill();
        ctx.stroke();
        
        const v = Math.floor(c.val);
        if (v === 0) {
            ctx.fillStyle = '#000';
            ctx.fillRect(dx + w / 2 - 4, dy, 8, h);
        } else {
            let bands = [];
            const s = v.toString();
            if (v < 10) { bands = [0, v, 0]; }
            else { bands = [parseInt(s[0]), parseInt(s[1]), s.length - 2]; }
            bands.forEach((idx, i) => {
                ctx.fillStyle = COLOR_MAP[idx] || '#000';
                ctx.fillRect(dx + 25 + (i * 12), dy, 6, h);
            });
            ctx.fillStyle = COLOR_MAP[10]; // 金帯
            ctx.fillRect(dx + 65, dy, 6, h);
        }
    } 
    // --- コンデンサ (CAP) : 修正済み ---
    else if (c.type === 'CAP') {
        const radius = 6;
        // 本体
        ctx.fillStyle = "#2c3e50";
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(dx, dy, w, h, radius);
        else ctx.fillRect(dx, dy, w, h);
        ctx.fill();
        ctx.stroke();

        // マイナス側の帯
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.beginPath();
        const stripeW = w * 0.35;
        const stripeX = dx + (w - stripeW);
        if (ctx.roundRect) ctx.roundRect(stripeX, dy, stripeW, h, [0, radius, radius, 0]);
        else ctx.fillRect(stripeX, dy, stripeW, h);
        ctx.fill();

        // マイナスマーク
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(stripeX + stripeW * 0.3, dy + h / 2);
        ctx.lineTo(stripeX + stripeW * 0.7, dy + h / 2);
        ctx.stroke();
    }
    // --- ダイオード (DIO) ---
    else if (c.type === 'DIO') {
        ctx.fillStyle = '#222';
        ctx.fillRect(dx + 10, dy + 2, w - 20, h - 4);
        ctx.fillStyle = '#ccc';
        ctx.fillRect(dx + w - 22, dy + 2, 6, h - 4);
        ctx.strokeRect(dx + 10, dy + 2, w - 20, h - 4);
    } 
    // --- LED ---
    else if (c.type === 'LED') {
        const baseColor = c.color || '#ff3232';
        const brightness = 0.2 + Math.min((c.currentI || 0) * 50, 0.6);
        
        ctx.save();
        ctx.fillStyle = '#bbb';
        ctx.fillRect(dx + w / 2 - 15, dy + 30, 30, 5);

        if (c.isBlown) {
            ctx.fillStyle = '#333';
        } else {
            ctx.fillStyle = baseColor;
            ctx.globalAlpha = brightness;
        }
        
        ctx.beginPath();
        ctx.arc(dx + w / 2, dy + 15, 15, Math.PI, 0);
        ctx.lineTo(dx + w / 2 + 15, dy + 35);
        ctx.lineTo(dx + w / 2 - 15, dy + 35);
        ctx.closePath();
        ctx.fill();
        
        ctx.globalAlpha = 1.0; 
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (!c.isBlown && (c.currentI || 0) > 0.001) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = baseColor;
            ctx.strokeStyle = baseColor;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.restore();
    }
    // --- トランジスタ (TR) ---
    else if (c.type === 'TR') {
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(dx + w / 2, dy + 20, 20, Math.PI, 0);
        ctx.lineTo(dx + w / 2 + 20, dy + 40);
        ctx.lineTo(dx + w / 2 - 20, dy + 40);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = "bold 10px Arial";
        ctx.textAlign = "center";
        ctx.fillText(c.trType || "NPN", dx + w / 2, dy + 35);
    } 
    // --- IC ---
    else if (c.type === 'NOT_IC') {
        ctx.fillStyle = '#222';
        ctx.fillRect(dx, dy, w, h);
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(dx, dy + h / 2, 6, -Math.PI / 2, Math.PI / 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = "bold 10px Arial";
        ctx.textAlign = "center";
        if (c.isActive) {
            ctx.fillStyle = '#2ecc71';
            ctx.fillText("Active", dx + w/2, dy - 5);
        }
        ctx.fillStyle = '#fff';
        ctx.fillText("74HC04(NOT)", dx + w / 2, dy + h / 2 + 5);
    } 
    // --- 電池 (BAT) ---
    else if (c.type === 'BAT') {
        ctx.fillStyle = '#222';
        ctx.fillRect(dx, dy, w, h);
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(dx, dy, w, 15);
        ctx.fillStyle = '#fff';
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.fillText((c.val || 9) + "V BLOCK", dx + w / 2, dy + 45);
    } 
    // --- タクトスイッチ (PSW) ---
    else if (c.type === 'PSW') {
        ctx.fillStyle = '#bdc3c7';
        ctx.fillRect(dx + 5, dy + 5, w - 10, h - 10);
        ctx.strokeRect(dx + 5, dy + 5, w - 10, h - 10);
        ctx.fillStyle = c.state ? '#2ecc71' : '#2c3e50';
        ctx.beginPath(); ctx.arc(dx + w / 2, dy + h / 2, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } 
    // --- スライドスイッチ (SSW) ---
    else if (c.type === 'SSW') {
        ctx.fillStyle = '#34495e';
        ctx.fillRect(dx, dy + 5, w, h - 10);
        ctx.strokeRect(dx, dy + 5, w, h - 10);
        const sliderX = c.state ? dx + w - 15 : dx + 5;
        ctx.fillStyle = '#ecf0f1';
        ctx.fillRect(sliderX, dy, 10, h);
        ctx.strokeRect(sliderX, dy, 10, h);
    }

    // --- 共通のピン描画 ---
    if (c.pins) {
        c.pins.forEach(p => {
            ctx.beginPath();
            ctx.arc(dx + p.relX, dy + p.relY, 5, 0, Math.PI * 2);
            ctx.fillStyle = (p.type === 'POS' || p.type === 'VCC') ? '#e74c3c' : (p.type === 'NEG' || p.type === 'GND') ? '#3498db' : '#ecf0f1';
            ctx.fill();
            ctx.stroke();
            
            ctx.fillStyle = "#333";
            ctx.font = "bold 10px sans-serif";
            ctx.textAlign = "center";
            if (p.label) ctx.fillText(p.label, dx + p.relX, dy + p.relY - 8);
        });
    }

    ctx.restore();
}

/**
 * 部品の新規生成
 */
export function addComponent(type) {
    const id = Date.now();
    const obj = { 
        id, type, x: 200, y: 200, angle: 0, 
        val: (type === 'BAT' ? 9 : type === 'RES' ? 1000 : type === 'CAP' ? 1000 : 0), 
        currentI: 0, state: false, isBlown: false, charge: 0 
    };

    if (type === 'BAT') {
        obj.w = 110; obj.h = 65;
        obj.pins = [{ id: id+'p', type: 'POS', relX: 110, relY: 20, label: '+' }, { id: id+'n', type: 'NEG', relX: 110, relY: 45, label: '-' }];
    } else if (type === 'LED') {
        obj.w = 40; obj.h = 40;
        obj.pins = [{ id: id+'a', type: 'POS', relX: 10, relY: 40, label: 'A' }, { id: id+'k', type: 'NEG', relX: 30, relY: 40, label: 'K' }];
    } else if (type === 'RES') {
        obj.w = 90; obj.h = 20;
        obj.pins = [{ id: id+'1', type: 'NEU', relX: 0, relY: 10, label: '1' }, { id: id+'2', type: 'NEU', relX: 90, relY: 10, label: '2' }];
    } else if (type === 'DIO') {
        obj.w = 60; obj.h = 20;
        obj.pins = [{ id: id+'a', type: 'POS', relX: 0, relY: 10, label: 'A' }, { id: id+'k', type: 'NEG', relX: 60, relY: 10, label: 'K' }];
    } else if (type === 'CAP') {
        obj.w = 40; obj.h = 24;
        obj.pins = [
            { id: id + 'p1', type: 'NEU', relX: 0, relY: 12, label: '+' },
            { id: id + 'p2', type: 'NEU', relX: 40, relY: 12, label: '-' }
        ];
    } else if (type === 'NOT_IC') {
        obj.w = 160; obj.h = 60;
        obj.pins = [
            { id: id+'p14', type: 'VCC', relX: 10,  relY: 0,  label: 'VCC' },
            { id: id+'p7',  type: 'GND', relX: 150, relY: 60, label: 'GND' }
            // 他のピンは省略
        ];
    } else if (type === 'TR') {
        obj.w = 50; obj.h = 50; obj.trType = 'NPN';
        obj.pins = [
            { id: id+'c', type: 'C', relX: 10, relY: 50, label: 'C' },
            { id: id+'b', type: 'B', relX: 25, relY: 50, label: 'B' },
            { id: id+'e', type: 'E', relX: 40, relY: 50, label: 'E' }
        ];
    } else if (type === 'PSW' || type === 'SSW') {
        obj.w = 50; obj.h = 40;
        obj.pins = [{ id: id+'1', type: 'NEU', relX: 0, relY: 20, label: 'L' }, { id: id+'2', type: 'NEU', relX: 50, relY: 20, label: 'R' }];
    }

    state.components.push(obj);
}
