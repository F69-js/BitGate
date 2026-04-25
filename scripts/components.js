const COLOR_MAP = ["#000", "#8B4513", "#F00", "#FF8C00", "#FF0", "#0F0", "#00F", "#800080", "#808080", "#FFF", "#D4AF37", "#C0C0C0"];


function addComponent(type) {
    const id = Date.now();
    const obj = {
        id, type, x: 200, y: 200,
        val: (type === 'BAT' ? 9 : type === 'RES' ? 1000 : 20),
        currentI: 0, state: false, isBlown: false,
        isPowered: false, inputActive: false // ロジックIC用フラグ
    };

    if (type === 'BAT') {
        obj.w = 100; obj.h = 60;
        obj.pins = [{ id: id + 'p', type: 'POS', relX: 100, relY: 15 }, { id: id + 'n', type: 'NEG', relX: 100, relY: 45 }];
    } else if (type === 'LED') {
        obj.w = 50; obj.h = 50;
        obj.pins = [{ id: id + 'a', type: 'POS', relX: 0, relY: 15 }, { id: id + 'k', type: 'NEG', relX: 0, relY: 35 }];
    } else if (type === 'RES') {
        obj.w = 80; obj.h = 30;
        obj.pins = [{ id: id + '1', type: 'NEU', relX: 0, relY: 15 }, { id: id + '2', type: 'NEU', relX: 80, relY: 15 }];
    } else if (type === 'NOT_IC') {
        obj.w = 160; obj.h = 80;
        obj.pins = [
            { id: id + 'vcc', type: 'VCC', relX: 10, relY: 0, label: 'VCC' },
            { id: id + 'gnd', type: 'GND', relX: 150, relY: 80, label: 'GND' },
            // 下側にIN1, OUT1, IN2, OUT2, IN3, OUT3
            { id: id + 'in1', type: 'IN', relX: 30, relY: 80, label: 'I1' },
            { id: id + 'out1', type: 'OUT', relX: 50, relY: 80, label: 'O1' },
            { id: id + 'in2', type: 'IN', relX: 70, relY: 80, label: 'I2' },
            { id: id + 'out2', type: 'OUT', relX: 90, relY: 80, label: 'O2' },
            { id: id + 'in3', type: 'IN', relX: 110, relY: 80, label: 'I3' },
            { id: id + 'out3', type: 'OUT', relX: 130, relY: 80, label: 'O3' },
            // 上側にIN4, OUT4, IN5, OUT5, IN6, OUT6
            { id: id + 'in4', type: 'IN', relX: 30, relY: 0, label: 'I4' },
            { id: id + 'out4', type: 'OUT', relX: 50, relY: 0, label: 'O4' },
            { id: id + 'in5', type: 'IN', relX: 70, relY: 0, label: 'I5' },
            { id: id + 'out5', type: 'OUT', relX: 90, relY: 0, label: 'O5' },
            { id: id + 'in6', type: 'IN', relX: 110, relY: 0, label: 'I6' },
            { id: id + 'out6', type: 'OUT', relX: 130, relY: 0, label: 'O6' }
        ];
        // 各回路の状態を保持する配列を追加
        obj.gates = [false, false, false, false, false, false];
    }else if (type === 'NPN' || type === 'PNP') {
    obj.type = 'TR';
    obj.trType = type;
    obj.w = 60; obj.h = 60;
    obj.pins = [
        { id: id + 'c', type: 'C', relX: 30, relY: 0, label: 'C' },
        { id: id + 'b', type: 'B', relX: 0, relY: 30, label: 'B' },
        { id: id + 'e', type: 'E', relX: 30, relY: 60, label: 'E' }
    ];
} else {
    obj.w = 50; obj.h = 40;
    obj.pins = [{ id: id + '1', type: 'NEU', relX: 0, relY: 20 }, { id: id + '2', type: 'NEU', relX: 50, relY: 20 }];
}
components.push(obj);
}

function drawComponent(ctx, c, isSelected, zoom) {
    const { x, y, w, h } = c;
    ctx.strokeStyle = isSelected ? '#2ecc71' : '#222';
    ctx.lineWidth = 2;

    if (c.type === 'RES') {
        ctx.fillStyle = '#f3e5ab'; ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
        if (Number(c.val) <= 0) {
            ctx.fillStyle = COLOR_MAP[0]; ctx.fillRect(x + w / 2 - 4, y, 8, h);
        } else {
            const s = Math.floor(c.val).toString();
            let b = (c.val < 10) ? [0, Math.floor(c.val), 0] : [parseInt(s[0]), parseInt(s[1]), s.length - 2];
            b.forEach((idx, i) => { ctx.fillStyle = COLOR_MAP[idx]; ctx.fillRect(x + 15 + (i * 12), y, 7, h); });
            ctx.fillStyle = COLOR_MAP[10]; ctx.fillRect(x + 55, y, 7, h);
        }
    } else if (c.type === 'LED') {
        ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, 20, 0, Math.PI * 2);
        ctx.fillStyle = c.isBlown ? '#333' : `rgba(46, 204, 113, ${Math.min(c.currentI * 50, 1)})`;
        ctx.fill(); ctx.stroke();
    } else if (c.type === 'NOT_IC') {
        ctx.fillStyle = '#2c3e50'; ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
        // 通電状態によってテキストの色を変える
        ctx.fillStyle = c.isPowered ? '#2ecc71' : '#fff';
        ctx.font = "bold 11px Arial";
        ctx.fillText(c.isPowered ? "74HC14 (LIVE)" : "74HC14", x + 20, y + 35);
    } else if (c.type === 'BAT') {
        ctx.fillStyle = c.isShort ? '#e74c3c' : '#fff';
        ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = c.isShort ? '#fff' : '#000';
        ctx.font = "bold 12px Arial"; ctx.fillText(c.val + "V PWR", x + 10, y + 35);
    } else {
        ctx.fillStyle = c.state ? '#2ecc71' : '#e74c3c';
        ctx.fillRect(x + 10, y + 10, w - 20, h - 20); ctx.strokeRect(x, y, w, h);
    }

    c.pins.forEach(p => {
        ctx.beginPath(); ctx.arc(x + p.relX, y + p.relY, 6, 0, Math.PI * 2);
        ctx.fillStyle = (p.type === 'POS' || p.type === 'VCC') ? '#e74c3c' : (p.type === 'NEG' || p.type === 'GND') ? '#3498db' : '#95a5a6';
        ctx.fill(); ctx.stroke();
        if (p.label) {
            ctx.fillStyle = "#000"; ctx.font = "8px Arial";
            ctx.fillText(p.label, x + p.relX - 4, y + p.relY + (p.relY === 0 ? -8 : 15));
        }
    });
}
