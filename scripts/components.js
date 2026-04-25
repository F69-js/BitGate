const COLOR_MAP = ["#000", "#8B4513", "#F00", "#FF8C00", "#FF0", "#0F0", "#00F", "#800080", "#808080", "#FFF", "#D4AF37", "#C0C0C0"];

function addComponent(type) {
    const id = Date.now();
    const obj = { 
        id, type, x: 200, y: 200, 
        val: (type === 'BAT' ? 9 : type === 'RES' ? 1000 : type === 'CAP' ? 1000 : type === 'DIO' ? 0.7 : 20), 
        currentI: 0, state: false, isBlown: false, charge: 0 
    };

    if (type === 'BAT') {
        obj.w = 110; obj.h = 65;
        obj.pins = [{ id: id+'p', type: 'POS', relX: 110, relY: 20 }, { id: id+'n', type: 'NEG', relX: 110, relY: 45 }];
    } else if (type === 'LED') {
        obj.w = 40; obj.h = 40;
        obj.pins = [{ id: id+'a', type: 'POS', relX: 10, relY: 40 }, { id: id+'k', type: 'NEG', relX: 30, relY: 40 }];
    } else if (type === 'RES') {
        obj.w = 80; obj.h = 20;
        obj.pins = [{ id: id+'1', type: 'NEU', relX: 0, relY: 10 }, { id: id+'2', type: 'NEU', relX: 80, relY: 10 }];
    } else if (type === 'CAP') {
        obj.w = 30; obj.h = 45;
        obj.pins = [{ id: id+'1', type: 'NEU', relX: 5, relY: 45 }, { id: id+'2', type: 'NEU', relX: 25, relY: 45 }];
    } else if (type === 'DIO') { // ダイオード
        obj.w = 60; obj.h = 20;
        obj.pins = [{ id: id+'a', type: 'POS', relX: 0, relY: 10, label: 'A' }, { id: id+'k', type: 'NEG', relX: 60, relY: 10, label: 'K' }];
    } else if (type === 'TR') {
        obj.type = 'TR'; obj.trType = 'NPN'; obj.w = 50; obj.h = 50;
        obj.pins = [
            { id: id+'c', type: 'C', relX: 10, relY: 50, label: 'C' },
            { id: id+'b', type: 'B', relX: 25, relY: 50, label: 'B' },
            { id: id+'e', type: 'E', relX: 40, relY: 50, label: 'E' }
        ];
    } else {
        obj.w = 40; obj.h = 40;
        obj.pins = [{ id: id+'1', type: 'NEU', relX: 0, relY: 20 }, { id: id+'2', type: 'NEU', relX: 40, relY: 20 }];
    }
    components.push(obj);
}

function drawComponent(ctx, c, isSelected) {
    const {x, y, w, h} = c;
    ctx.strokeStyle = isSelected ? '#3498db' : '#222';
    ctx.lineWidth = 2;

    if (c.type === 'RES') {
        // 抵抗：実体図風（肌色の円筒）
        ctx.fillStyle = '#e6ccb3'; 
        ctx.beginPath(); ctx.roundRect(x+10, y, w-20, h, 5); ctx.fill(); ctx.stroke();
        const valStr = Math.floor(c.val).toString();
        let colors = (c.val < 10) ? [0, Math.floor(c.val), 0] : [parseInt(valStr[0]), parseInt(valStr[1]), valStr.length - 2];
        colors.forEach((idx, i) => {
            ctx.fillStyle = COLOR_MAP[idx] || '#000';
            ctx.fillRect(x + 20 + (i * 10), y, 6, h);
        });
    } else if (c.type === 'DIO') {
        // ダイオード：黒いボディに銀色の帯（カソード側）
        ctx.fillStyle = '#222'; ctx.fillRect(x+10, y+2, w-20, h-4);
        ctx.fillStyle = '#ccc'; ctx.fillRect(x+w-25, y+2, 8, h-4); // 極性帯
        ctx.strokeRect(x+10, y+2, w-20, h-4);
    } else if (c.type === 'CAP') {
        // 電解コンデンサ：青い円筒
        ctx.fillStyle = '#1e3799'; ctx.fillRect(x, y, w, h-10);
        ctx.fillStyle = '#ccc'; ctx.fillRect(x, y+2, 5, h-14); // マイナス側の帯
        ctx.strokeRect(x, y, w, h-10);
        const fillH = (c.charge / 9) * (h-10);
        ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x, y+(h-10), w, -fillH);
    } else if (c.type === 'LED') {
        // LED：砲弾型
        ctx.fillStyle = c.isBlown ? '#333' : `rgba(255, 0, 0, ${0.3 + Math.min(c.currentI*50, 0.7)})`;
        ctx.beginPath();
        ctx.arc(x+w/2, y+15, 15, Math.PI, 0); ctx.lineTo(x+w/2+15, y+35); ctx.lineTo(x+w/2-15, y+35); ctx.closePath();
        ctx.fill(); ctx.stroke();
        if(!c.isBlown && c.currentI > 0.001) { // 発光エフェクト
            ctx.shadowBlur = 15; ctx.shadowColor = "red"; ctx.stroke(); ctx.shadowBlur = 0;
        }
    } else if (c.type === 'TR') {
        // トランジスタ：半円筒形 (TO-92パッケージ)
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.arc(x+w/2, y+20, 20, Math.PI, 0); ctx.lineTo(x+w/2+20, y+40); ctx.lineTo(x+w/2-20, y+40); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = "8px Arial"; ctx.fillText(c.trType, x+w/2-10, y+35);
    } else if (c.type === 'BAT') {
        // 9V電池風
        ctx.fillStyle = '#222'; ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = '#f1c40f'; ctx.fillRect(x, y, w, 15);
        ctx.fillStyle = '#fff'; ctx.font = "bold 12px Arial"; ctx.fillText("9V BLOCK", x+10, y+45);
    } else {
        ctx.fillStyle = c.state ? '#2ecc71' : '#e74c3c';
        ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
    }

    // 足（リード線）の描画
    c.pins.forEach(p => {
        ctx.beginPath(); ctx.arc(x + p.relX, y + p.relY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#95a5a6'; ctx.fill(); ctx.stroke();
    });
}
