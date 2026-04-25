const COLOR_MAP = ["#000", "#8B4513", "#F00", "#FF8C00", "#FF0", "#0F0", "#00F", "#800080", "#808080", "#FFF", "#D4AF37", "#C0C0C0"];

function addComponent(type) {
    const id = Date.now();
    const obj = { 
        id, type, x: 200, y: 200, 
        val: (type === 'BAT' ? 9 : type === 'RES' ? 1000 : type === 'CAP' ? 1000 : 20), 
        currentI: 0, state: false, isBlown: false,
        isPowered: false,
        charge: 0 
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
    } else if (type === 'CAP') {
        obj.w = 40; obj.h = 40;
        obj.pins = [{ id: id+'1', type: 'NEU', relX: 0, relY: 20 }, { id: id+'2', type: 'NEU', relX: 40, relY: 20 }];
    } else if (type === 'TR' || type === 'NPN' || type === 'PNP') {
        obj.type = 'TR';
        obj.trType = (type === 'TR') ? 'NPN' : type; 
        obj.w = 60; obj.h = 60;
        obj.pins = [
            { id: id+'c', type: 'C', relX: 30, relY: 0, label: 'C' },
            { id: id+'b', type: 'B', relX: 0, relY: 30, label: 'B' },
            { id: id+'e', type: 'E', relX: 30, relY: 60, label: 'E' }
        ];
    } else {
        obj.w = 50; obj.h = 40;
        obj.pins = [{ id: id+'1', type: 'NEU', relX: 0, relY: 20 }, { id: id+'2', type: 'NEU', relX: 50, relY: 20 }];
    }
    components.push(obj);
}

function drawComponent(ctx, c, isSelected) {
    const {x, y, w, h} = c;
    ctx.strokeStyle = isSelected ? '#2ecc71' : '#222';
    ctx.lineWidth = 2;

    if (c.type === 'RES') {
        ctx.fillStyle = '#f3e5ab'; ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
        const valStr = Math.floor(c.val).toString();
        let colors = (c.val < 10) ? [0, Math.floor(c.val), 0] : [parseInt(valStr[0]), parseInt(valStr[1]), valStr.length - 2];
        colors.forEach((idx, i) => {
            ctx.fillStyle = COLOR_MAP[idx] || '#000';
            ctx.fillRect(x + 15 + (i * 12), y, 7, h);
        });
        ctx.fillStyle = COLOR_MAP[10]; ctx.fillRect(x + 55, y, 7, h);
    } else if (c.type === 'CAP') {
        ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
        ctx.beginPath();
        ctx.moveTo(x + 15, y + 5); ctx.lineTo(x + 15, y + 35);
        ctx.moveTo(x + 25, y + 5); ctx.lineTo(x + 25, y + 35);
        ctx.stroke();
        // 青いアニメーション：c.charge (0V〜9V想定) に基づいて描画
        const fillH = (c.charge / 9) * 30;
        ctx.fillStyle = '#3498db';
        ctx.fillRect(x + 16, y + 35, 8, -fillH);
        ctx.fillStyle = "#000"; ctx.font = "10px Arial";
        ctx.fillText(c.val + "uF", x, y - 5);
    } else if (c.type === 'LED') {
        ctx.beginPath(); ctx.arc(x+w/2, y+h/2, 20, 0, Math.PI*2);
        ctx.fillStyle = c.isBlown ? '#333' : `rgba(46, 204, 113, ${Math.min(c.currentI*50, 1)})`;
        ctx.fill(); ctx.stroke();
    } else if (c.type === 'TR') {
        ctx.beginPath(); ctx.arc(x+w/2, y+h/2, 25, 0, Math.PI*2);
        ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x+22, y+15); ctx.lineTo(x+22, y+45); ctx.stroke();
        ctx.font = "bold 10px Arial"; ctx.fillStyle = "#000";
        ctx.fillText(c.trType || "NPN", x+18, y+35);
    } else if (c.type === 'BAT') {
        ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = '#000'; ctx.font = "bold 12px Arial";
        ctx.fillText(c.val + "V PWR", x+10, y+35);
    } else {
        ctx.fillStyle = c.state ? '#2ecc71' : '#e74c3c';
        ctx.fillRect(x+10, y+10, w-20, h-20); ctx.strokeRect(x, y, w, h);
    }

    c.pins.forEach(p => {
        ctx.beginPath(); ctx.arc(x + p.relX, y + p.relY, 6, 0, Math.PI * 2);
        ctx.fillStyle = (p.type === 'POS') ? '#e74c3c' : (p.type === 'NEG') ? '#3498db' : '#95a5a6';
        ctx.fill(); ctx.stroke();
    });
}
