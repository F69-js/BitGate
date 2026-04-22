const COLOR_MAP = ["#000", "#8B4513", "#F00", "#FF8C00", "#FF0", "#0F0", "#00F", "#800080", "#808080", "#FFF", "#D4AF37", "#C0C0C0"];

function addComponent(type) {
    const id = Date.now();
    // 初期状態: state は false (OFF) を明示
    const obj = { 
        id, type, x: 100, y: 100, 
        val: (type === 'BAT' ? 9 : type === 'RES' ? 1000 : 20), 
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
    } else { // PSW, SSW
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
        const s = Math.floor(c.val).toString();
        let b = (c.val < 10) ? [0, Math.floor(c.val), 0] : [parseInt(s[0]), parseInt(s[1]), s.length - 2];
        b.forEach((idx, i) => { ctx.fillStyle = COLOR_MAP[idx]; ctx.fillRect(c.x + 15 + (i * 12), c.y, 7, c.h); });
        ctx.fillStyle = COLOR_MAP[10]; ctx.fillRect(c.x + 55, c.y, 7, c.h);
    } else if (c.type === 'LED') {
        ctx.beginPath(); ctx.arc(c.x+25, c.y+25, 20, 0, Math.PI*2);
        if (c.isBlown) {
            ctx.fillStyle = '#333';
        } else {
            ctx.fillStyle = `rgba(46, 204, 113, ${Math.min(c.currentI*40, 1)})`;
        }
        ctx.fill(); ctx.stroke();
    } else if (c.type === 'BAT') {
        ctx.fillStyle = c.isShort ? '#e74c3c' : '#fff';
        ctx.fillRect(c.x, c.y, c.w, c.h); ctx.strokeRect(c.x, c.y, c.w, c.h);
        ctx.fillStyle = c.isShort ? '#fff' : '#000';
        ctx.font = "bold 12px Arial"; ctx.fillText(c.isShort ? "!! SHORT !!" : c.val + "V PWR", c.x+10, c.y+35);
    } else {
        // スイッチの描画（OFF=赤, ON=緑）
        ctx.fillStyle = c.state ? '#2ecc71' : '#e74c3c';
        ctx.fillRect(c.x+10, c.y+10, 30, 20); ctx.strokeRect(c.x, c.y, c.w, c.h);
    }

    c.pins.forEach(p => {
        ctx.beginPath(); ctx.arc(c.x+p.relX, c.y+p.relY, 7, 0, Math.PI*2);
        ctx.fillStyle = (p.type === 'POS') ? '#e74c3c' : (p.type === 'NEG') ? '#3498db' : '#95a5a6';
        ctx.fill(); ctx.stroke();
    });
}
