/**
 * components.js - Added NOT IC (74HC14 Style)
 */

const COLOR_MAP = ["#000", "#8B4513", "#F00", "#FF8C00", "#FF0", "#0F0", "#00F", "#800080", "#808080", "#FFF", "#D4AF37", "#C0C0C0"];

function addComponent(type) {
    const id = Date.now();
    const spawnX = 150 + (components.length * 10 % 100);
    const spawnY = 150 + (components.length * 10 % 100);

    const obj = { 
        id, type, x: spawnX, y: spawnY, 
        val: (type === 'BAT' ? 9 : type === 'RES' ? 1000 : 20), 
        subType: 'NPN',
        currentI: 0, 
        state: false, 
        isBlown: false,
        isPowered: false // IC用の電源フラグ
    };

    if (type === 'BAT') {
        obj.w = 100; obj.h = 60;
        obj.pins = [{ id: id+'p', type: 'POS', relX: 100, relY: 15 }, { id: id+'n', type: 'NEG', relX: 100, relY: 45 }];
    } else if (type === 'NOT_IC') {
        obj.w = 100; obj.h = 80;
        obj.pins = [
            { id: id+'vcc', type: 'VCC', relX: 0, relY: 15 },  // 電源+
            { id: id+'in',  type: 'IN',  relX: 0, relY: 55 },  // 入力
            { id: id+'gnd', type: 'GND', relX: 100, relY: 15 }, // 電源-
            { id: id+'out', type: 'OUT', relX: 100, relY: 55 }  // 出力
        ];
    } else if (type === 'LED') {
        obj.w = 50; obj.h = 50;
        obj.pins = [{ id: id+'a', type: 'POS', relX: 0, relY: 15 }, { id: id+'k', type: 'NEG', relX: 0, relY: 35 }];
    } else if (type === 'RES') {
        obj.w = 80; obj.h = 30;
        obj.pins = [{ id: id+'1', type: 'NEU', relX: 0, relY: 15 }, { id: id+'2', type: 'NEU', relX: 80, relY: 15 }];
    } else if (type === 'TR') {
        obj.w = 60; obj.h = 60;
        obj.pins = [{ id: id+'b', type: 'B', relX: 0, relY: 30 }, { id: id+'c', type: 'C', relX: 60, relY: 10 }, { id: id+'e', type: 'E', relX: 60, relY: 50 }];
    } else { 
        obj.w = 50; obj.h = 40;
        obj.pins = [{ id: id+'1', type: 'NEU', relX: 0, relY: 20 }, { id: id+'2', type: 'NEU', relX: 50, relY: 20 }];
    }
    components.push(obj);
}

function drawComponent(ctx, c, isSelected) {
    const fixedLW = 2 / zoom;
    ctx.strokeStyle = isSelected ? '#2ecc71' : '#222';
    ctx.lineWidth = fixedLW;
    ctx.fillStyle = '#fff';
    
    if (c.type === 'NOT_IC') {
        // ICのボディ (黒いチップ)
        ctx.fillStyle = '#333';
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.strokeRect(c.x, c.y, c.w, c.h);
        
        // ラベル
        ctx.fillStyle = c.isPowered ? '#2ecc71' : '#666';
        ctx.font = `bold ${12/zoom}px Arial`;
        ctx.fillText("74HC14", c.x + 25, c.y + 35);
        ctx.font = `${9/zoom}px Arial`;
        ctx.fillText("NOT GATE", c.x + 25, c.y + 50);

        // ピンラベル
        ctx.fillStyle = "#fff";
        ctx.font = `${8/zoom}px Arial`;
        ctx.fillText("VCC", c.x + 5, c.y + 18);
        ctx.fillText("IN", c.x + 5, c.y + 58);
        ctx.fillText("GND", c.x + 75, c.y + 18);
        ctx.fillText("OUT", c.x + 75, c.y + 58);

    } else if (c.type === 'RES') {
        ctx.fillStyle = '#f3e5ab'; ctx.fillRect(c.x, c.y, c.w, c.h); ctx.strokeRect(c.x, c.y, c.w, c.h);
        let bands = (c.val <= 0) ? [0] : [parseInt(c.val.toString()[0]), parseInt(c.val.toString()[1] || 0), Math.max(0, Math.floor(c.val).toString().length - 2)];
        const startX = c.x + (bands.length === 1 ? 36 : 15);
        bands.forEach((idx, i) => { ctx.fillStyle = COLOR_MAP[idx]; ctx.fillRect(startX + (i * 12), c.y, 7, c.h); });
    } else if (c.type === 'LED') {
        ctx.beginPath(); ctx.arc(c.x+25, c.y+25, 20, 0, Math.PI*2);
        ctx.fillStyle = c.isBlown ? '#333' : `rgba(46, 204, 113, ${Math.min(c.currentI*40, 1)})`;
        ctx.fill(); ctx.stroke();
    } else if (c.type === 'TR') {
        ctx.beginPath(); ctx.arc(c.x+35, c.y+30, 20, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(c.x+15, c.y+15); ctx.lineTo(c.x+15, c.y+45); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(c.x, c.y+30); ctx.lineTo(c.x+15, c.y+30); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(c.x+15, c.y+25); ctx.lineTo(c.x+60, c.y+10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(c.x+15, c.y+35); ctx.lineTo(c.x+60, c.y+50); ctx.stroke();
        const isNPN = c.subType === 'NPN';
        ctx.save();
        ctx.translate(isNPN ? c.x+45 : c.x+25, isNPN ? c.y+45 : c.y+38);
        ctx.rotate(isNPN ? 0.5 : -2.5);
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-8/zoom,-4/zoom); ctx.lineTo(-8/zoom,4/zoom); ctx.closePath();
        ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
        ctx.font = `${10/zoom}px Arial`; ctx.fillStyle = "#000"; ctx.fillText(c.subType, c.x+25, c.y+10);
    } else if (c.type === 'BAT') {
        ctx.fillStyle = c.isShort ? '#e74c3c' : '#fff';
        ctx.fillRect(c.x, c.y, c.w, c.h); ctx.strokeRect(c.x, c.y, c.w, c.h);
        ctx.fillStyle = c.isShort ? '#fff' : '#000';
        ctx.font = `bold ${12/zoom}px Arial`; ctx.fillText(c.isShort ? "!! SHORT !!" : c.val + "V PWR", c.x+10, c.y+35);
    } else {
        ctx.fillStyle = c.state ? '#2ecc71' : '#e74c3c';
        ctx.fillRect(c.x+10, c.y+10, 30, 20); ctx.strokeRect(c.x, c.y, c.w, c.h);
    }

    c.pins.forEach(p => {
        ctx.beginPath(); ctx.arc(c.x+p.relX, c.y+p.relY, 6 / zoom, 0, Math.PI*2);
        ctx.fillStyle = (p.type === 'POS' || p.type === 'VCC' || p.type === 'C') ? '#e74c3c' : (p.type === 'NEG' || p.type === 'GND' || p.type === 'E') ? '#3498db' : '#95a5a6';
        ctx.fill(); ctx.lineWidth = 1 / zoom; ctx.strokeStyle = "#000"; ctx.stroke();
    });
}
