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
    } else if (type === 'NOT_IC') {
        obj.w = 160; obj.h = 60;
        // DIP14パッケージのピン配置 (1:1A, 2:1Y, ... 7:GND, 14:VCC)
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
    } else { // Switch類
        obj.w = 50; obj.h = 40;
        obj.pins = [{ id: id+'1', type: 'NEU', relX: 0, relY: 20, label: 'L' }, { id: id+'2', type: 'NEU', relX: 50, relY: 20, label: 'R' }];
    }
    components.push(obj);
}
function drawComponent(ctx, c, isSelected) {
    const { x, y, w, h } = c;
    ctx.strokeStyle = isSelected ? '#3498db' : '#222';
    ctx.lineWidth = 2;

    if (c.type === 'RES') {
        // 抵抗：実体図（4本帯カラーコード）
        ctx.fillStyle = '#e6ccb3';
        ctx.beginPath();
        ctx.roundRect(x + 10, y, w - 20, h, 5);
        ctx.fill();
        ctx.stroke();
        const v = Math.floor(c.val);
        if (v === 0) {
            ctx.fillStyle = '#000';
            ctx.fillRect(x + w / 2 - 4, y, 8, h);
        } else {
            let bands = [];
            const s = v.toString();
            if (v < 10) { bands = [0, v, 0]; }
            else { bands = [parseInt(s[0]), parseInt(s[1]), s.length - 2]; }
            bands.forEach((idx, i) => {
                ctx.fillStyle = COLOR_MAP[idx] || '#000';
                ctx.fillRect(x + 25 + (i * 12), y, 6, h);
            });
            ctx.fillStyle = COLOR_MAP[10]; // 金帯
            ctx.fillRect(x + 65, y, 6, h);
        }
    } 
    else if (c.type === 'DIO') {
        // ダイオード：黒ボディ＋銀帯
        ctx.fillStyle = '#222';
        ctx.fillRect(x + 10, y + 2, w - 20, h - 4);
        ctx.fillStyle = '#ccc';
        ctx.fillRect(x + w - 22, y + 2, 6, h - 4);
        ctx.strokeRect(x + 10, y + 2, w - 20, h - 4);
    } 
    else if (c.type === 'CAP') {
        // コンデンサ：青い円筒
        ctx.fillStyle = '#1e3799';
        ctx.fillRect(x, y, w, h - 10);
        ctx.fillStyle = '#ccc'; // マイナス帯
        ctx.fillRect(x, y + 2, 5, h - 14);
        ctx.strokeRect(x, y, w, h - 10);
        // 充電量インジケータ（おまけ）
        const fillH = Math.min((c.charge / 9), 1) * (h - 10);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(x, y + (h - 10), w, -fillH);
    } 
    else if (c.type === 'LED') {
        // LED：砲弾型
        ctx.fillStyle = c.isBlown ? '#333' : `rgba(255, 50, 50, ${0.4 + Math.min(c.currentI * 40, 0.6)})`;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + 15, 15, Math.PI, 0);
        ctx.lineTo(x + w / 2 + 15, y + 35);
        ctx.lineTo(x + w / 2 - 15, y + 35);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        if (!c.isBlown && c.currentI > 0.001) {
            ctx.shadowBlur = 15; ctx.shadowColor = "red"; ctx.stroke(); ctx.shadowBlur = 0;
        }
    } 
    else if (c.type === 'TR') {
        // トランジスタ：TO-92パッケージ
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(x + w / 2, y + 20, 20, Math.PI, 0);
        ctx.lineTo(x + w / 2 + 20, y + 40);
        ctx.lineTo(x + w / 2 - 20, y + 40);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = "bold 10px Arial";
        ctx.fillText(c.trType || "NPN", x + w / 2 - 10, y + 35);
    } 
    else if (c.type === 'NOT_IC') {
        // IC：74HC04
        ctx.fillStyle = '#222';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#111'; // 切り欠き
        ctx.beginPath(); ctx.arc(x, y + h / 2, 6, -Math.PI / 2, Math.PI / 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = "bold 10px Arial";
        if (c.isActive) { // あるいは通電状態を判定する変数
           ctx.fillStyle = '#2ecc71'; // NASAっぽいネオングリーン
           ctx.fillText("74HC04(NOT):Active", x + 10, y - 10); // ICの上に表示
        }
        ctx.fillText("74HC04(NOT)", x + 40, y + h / 2 + 5);
    } 
    else if (c.type === 'BAT') {
        // 電池
        ctx.fillStyle = '#222';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(x, y, w, 15);
        ctx.fillStyle = '#fff';
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(c.val + "V BLOCK", x + w / 2, y + 45);
        ctx.textAlign = "left";
    } 
    else if (c.type === 'PSW') {
        // タクトスイッチ：銀のボディに黒いボタン
        ctx.fillStyle = '#bdc3c7'; // 金属色
        ctx.fillRect(x + 5, y + 5, w - 10, h - 10);
        ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);
        
        // 中央の丸いボタン
        ctx.fillStyle = c.state ? '#2ecc71' : '#2c3e50'; // 押されてる間は緑
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // 四角いボタンの台座
        ctx.strokeRect(x + w/2 - 6, y + h/2 - 6, 12, 12);
    } 
    else if (c.type === 'SSW') {
        // スライドスイッチ：黒い長方形にスライダー
        ctx.fillStyle = '#34495e';
        ctx.fillRect(x, y + 5, w, h - 10);
        ctx.strokeRect(x, y + 5, w, h - 10);
        
        // スライダー部分
        const sliderX = c.state ? x + w - 15 : x + 5;
        ctx.fillStyle = '#ecf0f1';
        ctx.fillRect(sliderX, y, 10, h);
        ctx.strokeRect(sliderX, y, 10, h);
    }
    else {
        // その他未定義部品
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
    }

    // ピンとラベル
    c.pins.forEach(p => {
        ctx.beginPath();
        ctx.arc(x + p.relX, y + p.relY, 5, 0, Math.PI * 2);
        ctx.fillStyle = (p.type === 'POS' || p.type === 'VCC') ? '#e74c3c' : (p.type === 'NEG' || p.type === 'GND') ? '#3498db' : '#ecf0f1';
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#333";
        ctx.font = "bold 10px sans-serif";
        let lx = x + p.relX + (p.relX <= 0 ? -22 : 8);
        let ly = y + p.relY + (p.relY <= 0 ? -10 : 15);
        if (p.label) ctx.fillText(p.label, lx, ly);
    });
}
