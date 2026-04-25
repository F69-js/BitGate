/**
 * components.js - Component Definitions & Drawing
 * 修正内容: トランジスタ(TR)の追加と描画ロジック
 */

const COLOR_MAP = ["#000", "#8B4513", "#F00", "#FF8C00", "#FF0", "#0F0", "#00F", "#800080", "#808080", "#FFF", "#D4AF37", "#C0C0C0"];

function addComponent(type) {
    const id = Date.now();
    const spawnX = 150 + (components.length * 10 % 100);
    const spawnY = 150 + (components.length * 10 % 100);

    const obj = { 
        id, type, x: spawnX, y: spawnY, 
        val: (type === 'BAT' ? 9 : type === 'RES' ? 1000 : 20), 
        subType: 'NPN', // トランジスタ用
        currentI: 0, 
        state: false, 
        isBlown: false 
    };

    if (type === 'BAT') {
        obj.w = 100; obj.h = 60;
        obj.pins = [{ id: id+'p', type: 'POS', relX: 100, relY: 15 }, { id: id+'n', type: 'NEG', relX: 100, relY: 45 }];
    } else if (type === 'LED') {
        obj.w = 50; obj.h = 50;
        obj.pins = [{ id: id+'a', type: 'POS', relX: 0, relY: 15 }, { id: id+'k', type: 'NEG', relX: 0, relY: 35 }];
    } else if (type === 'RES') {
        obj.w = 80; obj.h = 30;
        obj.pins = [{ id: id+'1', type: 'NEU', relX: 0, relY: 15 }, { id: id+'2', type: 'NEU', relX: 80, relY: 15 }];
    } else if (type === 'TR') {
        obj.w = 60; obj.h = 60;
        // B(ベース), C(コレクタ), E(エミッタ)
        obj.pins = [
            { id: id+'b', type: 'B', relX: 0, relY: 30 }, 
            { id: id+'c', type: 'C', relX: 60, relY: 10 },
            { id: id+'e', type: 'E', relX: 60, relY: 50 }
        ];
    } else { 
        obj.w = 50; obj.h = 40;
        obj.pins = [{ id: id+'1', type: 'NEU', relX: 0, relY: 20 }, { id: id+'2', type: 'NEU', relX: 50, relY: 20 }];
    }
    components.push(obj);
}

function drawComponent(ctx, c, isSelected) {
    ctx.strokeStyle = isSelected ? '#2ecc71' : '#222';
    ctx.lineWidth = 2; ctx.fillStyle = '#fff';
    
    if (c.type === 'RES') {
        ctx.fillStyle = '#f3e5ab'; ctx.fillRect(c.x, c.y, c.w, c.h); ctx.strokeRect(c.x, c.y, c.w, c.h);
        let bands = (c.val <= 0) ? [0] : [parseInt(c.val.toString()[0]), parseInt(c.val.toString()[1] || 0), Math.max(0, Math.floor(c.val).toString().length - 2)];
        const startX = c.x + (bands.length === 1 ? 36 : 15);
        bands.forEach((idx, i) => { ctx.fillStyle = COLOR_MAP[idx]; ctx.fillRect(startX + (i * 12), c.y, 7, c.h); });
        if (c.val > 0) { ctx.fillStyle = COLOR_MAP[10]; ctx.fillRect(c.x + 55, c.y, 7, c.h); }
    } else if (c.type === 'LED') {
        ctx.beginPath(); ctx.arc(c.x+25, c.y+25, 20, 0, Math.PI*2);
        ctx.fillStyle = c.isBlown ? '#333' : `rgba(46, 204, 113, ${Math.min(c.currentI*40, 1)})`;
        ctx.fill(); ctx.stroke();
    } else if (c.type === 'TR') {
        // トランジスタの描画
        ctx.beginPath(); ctx.arc(c.x+35, c.y+30, 20, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(c.x+15, c.y+15); ctx.lineTo(c.x+15, c.y+45); ctx.stroke(); // ベースライン
        ctx.beginPath(); ctx.moveTo(c.x, c.y+30); ctx.lineTo(c.x+15, c.y+30); ctx.stroke(); // ベース線
        ctx.beginPath(); ctx.moveTo(c.x+15, c.y+25); ctx.lineTo(c.x+60, c.y+10); ctx.stroke(); // コレクタ
        ctx.beginPath(); ctx.moveTo(c.x+15, c.y+35); ctx.lineTo(c.x+60, c.y+50); ctx.stroke(); // エミッタ
        
        // 矢印 (NPN: 外向き, PNP: 内向き)
        const isNPN = c.subType === 'NPN';
        ctx.save();
        ctx.translate(isNPN ? c.x+45 : c.x+25, isNPN ? c.y+45 : c.y+38);
        ctx.rotate(isNPN ? 0.5 : -2.5);
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-8,-4); ctx.lineTo(-8,4); ctx.closePath();
        ctx.fillStyle = '#000'; ctx.fill();
        ctx.restore();
        ctx.font = "10px Arial"; ctx.fillText(c.subType, c.x+25, c.y+10);
    } else if (c.type === 'BAT') {
        ctx.fillStyle = c.isShort ? '#e74c3c' : '#fff';
        ctx.fillRect(c.x, c.y, c.w, c.h); ctx.strokeRect(c.x, c.y, c.w, c.h);
        ctx.fillStyle = c.isShort ? '#fff' : '#000';
        ctx.font = "bold 12px Arial"; ctx.fillText(c.isShort ? "!! SHORT !!" : c.val + "V PWR", c.x+10, c.y+35);
    } else {
        ctx.fillStyle = c.state ? '#2ecc71' : '#e74c3c';
        ctx.fillRect(c.x+10, c.y+10, 30, 20); ctx.strokeRect(c.x, c.y, c.w, c.h);
    }

    c.pins.forEach(p => {
        ctx.beginPath(); ctx.arc(c.x+p.relX, c.y+p.relY, 7 / (typeof zoom !== 'undefined' ? zoom : 1), 0, Math.PI*2);
        ctx.fillStyle = (p.type === 'POS' || p.type === 'C') ? '#e74c3c' : (p.type === 'NEG' || p.type === 'E') ? '#3498db' : '#95a5a6';
        ctx.fill(); ctx.stroke();
    });
}
