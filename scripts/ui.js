function initUIListeners() {
    canvas.addEventListener('mousedown', e => {
        const pos = getMousePos(e);
        
        // 右クリックでキャンセル
        if (e.button === 2) { 
            activeLine = null; 
            selectedObj = null; 
            updateUI(); 
            return; 
        }

        // シミュレーション中のスイッチ操作
        if (isSimulating) {
            const hitSW = components.find(c => pos.x > c.x && pos.x < c.x + c.w && pos.y > c.y && pos.y < c.y + c.h);
            if (hitSW?.type === 'PSW' || hitSW?.type === 'SSW') {
                if (hitSW.type === 'PSW') hitSW.state = true; else hitSW.state = !hitSW.state;
                selectedObj = { type: 'comp', ref: hitSW };
                updateUI(); return;
            }
        }

        // 1. ピン（端子）判定
        let hitPin = null;
        for (let c of components) {
            for (let p of c.pins) {
                if (Math.hypot(pos.x - (c.x + p.relX), pos.y - (c.y + p.relY)) < 15) {
                    hitPin = { comp: c, pin: p };
                    break;
                }
            }
            if (hitPin) break;
        }

        if (hitPin) {
            if (!activeLine) {
                // 配線開始
                activeLine = { startComp: hitPin.comp, startPin: hitPin.pin, points: [] };
            } else {
                // 配線終了（接続）
                wires.push({ 
                    from: { comp: activeLine.startComp, pin: activeLine.startPin }, 
                    to: { comp: hitPin.comp, pin: hitPin.pin }, 
                    points: activeLine.points // 中継点を引き継ぐ
                });
                activeLine = null;
            }
            return;
        }

        // 2. 配線中の「曲げ（中継点追加）」処理
        if (activeLine) {
            activeLine.points.push({ x: pos.x, y: pos.y });
            return;
        }

        // 3. 既存の中継点のドラッグ判定
        for (let w of wires) {
            for (let i = 0; i < w.points.length; i++) {
                if (Math.hypot(pos.x - w.points[i].x, pos.y - w.points[i].y) < 10) {
                    draggingPoint = { wire: w, index: i };
                    selectedObj = { type: 'wire', ref: w };
                    updateUI(); return;
                }
            }
        }

        // 4. コンポーネントのドラッグ判定
        const hitC = components.find(c => pos.x > c.x && pos.x < c.x + c.w && pos.y > c.y && pos.y < c.y + c.h);
        if (hitC) {
            selectedObj = { type: 'comp', ref: hitC }; 
            draggingObj = hitC;
            dragOffset = { x: pos.x - hitC.x, y: pos.y - hitC.y };
        } else {
            selectedObj = null;
        }
        updateUI();
    });

    window.addEventListener('mousemove', e => {
        mouse = getMousePos(e);
        if (draggingObj) { draggingObj.x = mouse.x - dragOffset.x; draggingObj.y = mouse.y - dragOffset.y; }
        if (draggingPoint) {
            draggingPoint.wire.points[draggingPoint.index].x = mouse.x;
            draggingPoint.wire.points[draggingPoint.index].y = mouse.y;
        }
    });

    window.addEventListener('mouseup', () => {
        components.forEach(c => { if (c.type === 'PSW') c.state = false; });
        draggingObj = null;
        draggingPoint = null;
    });
}
