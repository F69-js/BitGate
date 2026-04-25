function drawComponent(ctx, c, isSelected) {
    const {x, y, w, h} = c;
    ctx.strokeStyle = isSelected ? '#3498db' : '#222';
    ctx.lineWidth = 2;

    if (c.type === 'RES') {
        // 抵抗本体
        ctx.fillStyle = '#e6ccb3'; 
        ctx.beginPath(); ctx.roundRect(x+10, y, w-20, h, 5); ctx.fill(); ctx.stroke();
        
        const v = Math.floor(c.val);
        if (v === 0) {
            // 0Ω抵抗：中央に黒一本帯のみ（実体図の定石）
            ctx.fillStyle = '#000';
            ctx.fillRect(x + w/2 - 4, y, 8, h);
        } else {
            // 通常の抵抗：4本帯
            let bands = [];
            const s = v.toString();
            if (v < 10) {
                bands = [0, v, 0]; // 1Ω〜9Ω
            } else {
                // 10Ω以上：上位2桁 + 桁数（乗数）
                bands = [parseInt(s[0]), parseInt(s[1]), s.length - 2];
            }
            bands.forEach((idx, i) => {
                ctx.fillStyle = COLOR_MAP[idx] || '#000';
                ctx.fillRect(x + 25 + (i * 12), y, 6, h);
            });
            // 誤差：金帯 (5%)
            ctx.fillStyle = COLOR_MAP[10]; 
            ctx.fillRect(x + 65, y, 6, h);
        }

    } else if (c.type === 'BAT') {
        // 電池：電圧表記の場所を確実に更新
        ctx.fillStyle = '#222'; ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = '#f1c40f'; ctx.fillRect(x, y, w, 15);
        ctx.fillStyle = '#fff'; ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(c.val + "V BLOCK", x + w/2, y + 45);
        ctx.textAlign = "left"; // リセット

    } else if (c.type === 'NOT_IC') {
        // ICの描画
        ctx.fillStyle = '#222'; ctx.fillRect(x, y, w, h);
        // 切り欠き（1番ピン側）
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x, y+h/2, 6, -Math.PI/2, Math.PI/2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = "bold 10px Arial";
        ctx.fillText("74HC04 (NOT)", x+40, y+h/2+5);

    } else if (c.type === 'DIO') {
        // ダイオード：黒ボディ＋銀帯
        ctx.fillStyle = '#222'; ctx.fillRect(x+10, y+2, w-20, h-4);
        ctx.fillStyle = '#ccc'; ctx.fillRect(x+w-22, y+2, 6, h-4); // カソードマーク
        ctx.strokeRect(x+10, y+2, w-20, h-4);
    } 
    // ... (LED, TR などの描画は維持)

    // ピンとラベルの描画
    c.pins.forEach(p => {
        ctx.beginPath(); ctx.arc(x + p.relX, y + p.relY, 5, 0, Math.PI * 2);
        ctx.fillStyle = (p.type === 'POS' || p.type === 'VCC') ? '#e74c3c' : (p.type === 'NEG' || p.type === 'GND') ? '#3498db' : '#ecf0f1';
        ctx.fill(); ctx.stroke();
        
        ctx.fillStyle = "#333"; ctx.font = "bold 10px sans-serif";
        // ラベル位置を調整して重なりを防ぐ
        let lx = x + p.relX + (p.relX <= 0 ? -22 : 8);
        let ly = y + p.relY + (p.relY <= 0 ? -10 : 15);
        if (p.label) ctx.fillText(p.label, lx, ly);
    });
}
