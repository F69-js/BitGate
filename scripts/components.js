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
    // 部品中心からの相対座標 (relX, relY を厳格に使用)
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
    // 回転の中心を部品の中央に移動
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(angle || 0);
    
    // 以降、(0,0)を部品中心とした相対座標で描画
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
    else if (c.type === 'CAP') {
    ctx.save();
    
    // 1. 本体の円筒（角丸の長方形）
    const radius = 6;
    ctx.fillStyle = "#2c3e50"; // 電解コンデンサらしい濃紺
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(c.x, c.y, c.w, c.h, radius);
    } else {
        ctx.rect(c.x, c.y, c.w, c.h); // フォールバック
    }
    ctx.fill();

    // 2. マイナス極を示す白い帯（ストライプ）
    // 右側30%の領域を白っぽく塗る
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(c.x + c.w * 0.65, c.y, c.w * 0.35, c.h, [0, radius, radius, 0]);
    } else {
        ctx.rect(c.x + c.w * 0.65, c.y, c.w * 0.35, c.h);
    }
    ctx.fill();

    // 3. 帯の中にマイナス記号「-」を描画
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(c.x + c.w * 0.75, c.y + c.h / 2);
    ctx.lineTo(c.x + c.w * 0.85, c.y + c.h / 2);
    ctx.stroke();

    // 4. 金属の質感（ハイライト）を薄く入れる
    const gradient = ctx.createLinearGradient(c.x, c.y, c.x, c.y + c.h);
    gradient.addColorStop(0, "rgba(255,255,255,0.1)");
    gradient.addColorStop(0.5, "rgba(255,255,255,0)");
    gradient.addColorStop(1, "rgba(0,0,0,0.2)");
    ctx.fillStyle = gradient;
    ctx.fillRect(c.x, c.y, c.w, c.h);

    ctx.restore();
}
    // --- ダイオード (DIO) ---
    else if (c.type === 'DIO') {
        ctx.fillStyle = '#222';
        ctx.fillRect(dx + 10, dy + 2, w - 20, h - 4);
        ctx.fillStyle = '#ccc';
        ctx.fillRect(dx + w - 22, dy + 2, 6, h - 4); // カソードの帯
        ctx.strokeRect(dx + 10, dy + 2, w - 20, h - 4);
    } 
    // --- コンデンサ (CAP) ---
    else if (c.type === 'CAP') {
    ctx.save();
    
    // 描画位置の確定
    const drawX = c.x;
    const drawY = c.y;
    const drawW = c.w;
    const drawH = c.h;
    const r = 5; // 角丸の半径

    // --- 1. 本体の描画 ---
    ctx.fillStyle = "#2c3e50"; // 濃紺
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(drawX, drawY, drawW, drawH, r);
    } else {
        ctx.rect(drawX, drawY, drawW, drawH);
    }
    ctx.fill();

    // --- 2. マイナス側の帯 (右側) ---
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    // 本体の右端から30%の幅をカバー
    const stripeW = drawW * 0.3;
    const stripeX = drawX + (drawW - stripeW);
    if (ctx.roundRect) {
        ctx.roundRect(stripeX, drawY, stripeW, drawH, [0, r, r, 0]);
    } else {
        ctx.rect(stripeX, drawY, stripeW, drawH);
    }
    ctx.fill();

    // --- 3. マイナスマーク ---
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const centerX = stripeX + (stripeW / 2);
    const centerY = drawY + (drawH / 2);
    ctx.moveTo(centerX - 4, centerY);
    ctx.lineTo(centerX + 4, centerY);
    ctx.stroke();

    ctx.restore();
}
    // --- LED (発光エフェクト付き) ---
    else if (c.type === 'LED') {
        const baseColor = c.color || '#ff3232';
        const brightness = 0.2 + Math.min((c.currentI || 0) * 50, 0.6);
        
        ctx.save();
        // 1. 足（台座）
        ctx.fillStyle = '#bbb';
        ctx.fillRect(dx + w / 2 - 15, dy + 30, 30, 5);

        // 2. ボディ（レンズ）
        if (c.isBlown) {
            ctx.fillStyle = '#333'; // 焼損
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
        
        // 3. 縁取り（白LED対策）
        ctx.globalAlpha = 1.0; 
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 4. 発光（シャドウエフェクト）
        if (!c.isBlown && (c.currentI || 0) > 0.001) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = baseColor;
            if (baseColor === '#ffffff') ctx.shadowColor = '#e0f7fa';
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
    // --- IC (74HC04) ---
    else if (c.type === 'NOT_IC') {
        ctx.fillStyle = '#222';
        ctx.fillRect(dx, dy, w, h);
        // 切り欠き
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(dx, dy + h / 2, 6, -Math.PI / 2, Math.PI / 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = "bold 10px Arial";
        if (c.isActive) {
            ctx.fillStyle = '#2ecc71';
            ctx.fillText("74HC04(NOT):Active", dx + 10, dy - 10);
        }
        ctx.fillStyle = '#fff';
        ctx.fillText("74HC04(NOT)", dx + 40, dy + h / 2 + 5);
    } 
    // --- 電池 (BAT) ---
    else if (c.type === 'BAT') {
        ctx.fillStyle = '#222';
        ctx.fillRect(dx, dy, w, h);
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(dx, dy, w, 15); // プラス端子側の装飾
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
        ctx.strokeRect(dx + w/2 - 6, dy + h/2 - 6, 12, 12);
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
            
            // ラベルの描画
            ctx.fillStyle = "#333";
            ctx.font = "bold 10px sans-serif";
            ctx.textAlign = "left";
            let lx = dx + p.relX + (p.relX <= 10 ? -22 : 8);
            let ly = dy + p.relY + (p.relY <= 10 ? -10 : 15);
            if (p.label) ctx.fillText(p.label, lx, ly);
        });
    }

    ctx.restore();
}

/**
 * 部品の新規生成 (state.components へ直接 push)
 */
export function addComponent(type) {
    const id = Date.now();
    const obj = { 
        id, type, x: 200, y: 200, angle: 0, 
        val: (type === 'BAT' ? 9 : type === 'RES' ? 1000 : type === 'CAP' ? 1000 : type === 'DIO' ? 0.7 : 20), 
        currentI: 0, state: false, isBlown: false, charge: 0 
    };

    // 部品ごとのサイズとピン定義
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
    obj.w = 40; 
    obj.h = 20; // 高さを少し抑えるとより円筒らしくなります
    obj.val = 1000;
    // ピンの relX, relY は「c.x, c.y からの距離」です
    obj.pins = [
        { id: id + 'p1', type: 'NEU', relX: 0, relY: 10, label: '+' }, // 左中央
        { id: id + 'p2', type: 'NEU', relX: 40, relY: 10, label: '-' } // 右中央
    ];
}} else if (type === 'NOT_IC') {
        obj.w = 160; obj.h = 60;
        obj.pins = [
            { id: id+'p14', type: 'VCC', relX: 10,  relY: 0,  label: 'VCC' },
            { id: id+'p13', type: 'IN',  relX: 35,  relY: 0,  label: '6A' },
            { id: id+'p12', type: 'OUT', relX: 60,  relY: 0,  label: '6Y' },
            { id: id+'p11', type: 'IN',  relX: 85,  relY: 0,  label: '5A' },
            { id: id+'p10', type: 'OUT', relX: 110, relY: 0,  label: '5Y' },
            { id: id+'p9',  type: 'IN',  relX: 135, relY: 0,  label: '4A' },
            { id: id+'p8',  type: 'OUT', relX: 160, relY: 0,  label: '4Y' },
            { id: id+'p1',  type: 'IN',  relX: 10,  relY: 60, label: '1A' },
            { id: id+'p2',  type: 'OUT', relX: 35,  relY: 60, label: '1Y' },
            { id: id+'p3',  type: 'IN',  relX: 60,  relY: 60, label: '2A' },
            { id: id+'p4',  type: 'OUT', relX: 85,  relY: 60, label: '2Y' },
            { id: id+'p5',  type: 'IN',  relX: 110, relY: 60, label: '3A' },
            { id: id+'p6',  type: 'OUT', relX: 135, relY: 60, label: '3Y' },
            { id: id+'p7',  type: 'GND', relX: 160, relY: 60, label: 'GND' }
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
