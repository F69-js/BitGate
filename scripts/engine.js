function updateSimulation() {
    components.forEach(c => {
        c.currentI = 0;
        // 充電フラグを一旦リセット
        c.isBeingCharged = false;
        if (c.type === 'BAT') c.isShort = false;
        if (c.type === 'TR') c.isBaseActive = false;
    });
    
    if (!isSimulating) return;

    const batteries = components.filter(c => c.type === 'BAT');
    const capacitors = components.filter(c => c.type === 'CAP');

    // 1. まず電池からの給電と充電を計算
    batteries.forEach(bat => {
        const posP = bat.pins.find(p => p.type === 'POS');
        const negP = bat.pins.find(p => p.type === 'NEG');
        checkLogicalStates(bat, posP, negP);
        processPowerSource(bat, posP, negP, Number(bat.val), true);
    });

    // 2. 次にコンデンサの放電を計算（電池からの充電がない場合のみ）
    capacitors.forEach(cap => {
        if (!cap.isBeingCharged && cap.charge > 0.01) {
            // コンデンサ自身を電源として放電パスを回す
            processPowerSource(cap, cap.pins[0], cap.pins[1], cap.charge, false);
        }
    });
    components.filter(c => c.type === 'NOT_IC').forEach(ic => {
       const vccPin = ic.pins.find(p => p.type === 'VCC');
       const gndPin = ic.pins.find(p => p.type === 'GND');
    
       // 電池のプラス(posP.id)とマイナス(negP.id)に繋がっているかチェック
       // batteries[0] は便宜上の参照。複数の電池がある場合は工夫が必要。
       if (batteries.length > 0) {
           const batPos = batteries[0].pins.find(p => p.type === 'POS');
           const batNeg = batteries[0].pins.find(p => p.type === 'NEG');
        
           const hasPower = isConnected(vccPin.id, batPos.id);
           const hasGnd = isConnected(gndPin.id, batNeg.id);
        
           ic.isActive = hasPower && hasGnd; // 両方繋がっていれば Active!
        }
    });

    // 自然放電（微量）
    capacitors.forEach(c => {
        if (!c.isBeingCharged && c.currentI === 0) c.charge *= 0.999;
    });

    const statusDisp = document.getElementById('statusDisp');
    if (statusDisp) {
        const totalA = batteries.reduce((s, b) => s + b.currentI, 0);
        statusDisp.innerText = "SYSTEM: " + totalA.toFixed(3) + " A";
    }
}

function processPowerSource(source, startPin, endPin, voltage, isExternalBat) {
    let allPaths = [];
    const findPaths = (currentPinId, visitedPins, currentPathComps) => {
        if (currentPinId === endPin.id) {
            allPaths.push([...currentPathComps]);
            return;
        }

        for (let comp of components) {
            if (comp === source) continue;
            const inPin = comp.pins.find(p => p.id === currentPinId);
            if (inPin) {
                let canPass = false;
                // 通過判定：抵抗、LED、TRのベース、またはON状態のスイッチ
                if (comp.type === 'RES' || comp.type === 'LED' || (comp.type === 'TR' && inPin.type === 'B')) canPass = true;
                else if (comp.type === 'CAP') canPass = true;
                else if (comp.type === 'PSW' || comp.type === 'SSW') canPass = comp.state;
                else if (comp.type === 'TR' && (inPin.type === 'C' || inPin.type === 'E')) canPass = comp.isBaseActive;
                else if (comp.type === 'DIO') {
                    if (inPin.type === 'POS') canPass = true; // A端子なら通過OK
                }

                if (canPass) {
                    for (let outPin of comp.pins) {
                        if (outPin.id !== currentPinId && !visitedPins.has(outPin.id)) {
                            visitedPins.add(outPin.id);
                            currentPathComps.push(comp);
                            findPaths(outPin.id, visitedPins, currentPathComps);
                            currentPathComps.pop();
                            visitedPins.delete(outPin.id);
                        }
                    }
                }
            }
        }
        for (let w of wires) {
            let next = (w.from.pin.id === currentPinId) ? w.to.pin.id : (w.to.pin.id === currentPinId) ? w.from.pin.id : null;
            if (next && !visitedPins.has(next)) {
                visitedPins.add(next);
                findPaths(next, visitedPins, currentPathComps);
                visitedPins.delete(next);
            }
        }
    };

    findPaths(startPin.id, new Set([startPin.id]), []);

    allPaths.forEach(path => {
        let r = path.reduce((sum, c) => {
            if (c.type === 'RES') return sum + Number(c.val);
            if (c.type === 'TR') return sum + 1000; // TRのベース抵抗をシミュレート
            if (c.type === 'LED') return sum + 20;
            if (c.type === 'DIO') return sum + 10; // 順方向抵抗
            return sum + 1;
        }, 1);
        
        const pAmp = voltage / r;
        const dt = 0.05; 
        // 1uFで一瞬、1000uFで数秒になる係数
        const capScale = 0.000002; 

        path.forEach(c => {
            c.currentI += pAmp;
            if (c.type === 'CAP' && isExternalBat) {
                c.isBeingCharged = true;
                // 充電
                c.charge = Math.min(voltage, c.charge + (pAmp * dt) / (Math.max(1, c.val) * capScale * 5));
            }
        });

        if (!isExternalBat) {
            // 放電：電荷を減らす
            source.charge = Math.max(0, source.charge - (pAmp * dt) / (Math.max(1, source.val) * capScale));
        }
    });
}

function checkLogicalStates(bat, posP, negP) {
    components.forEach(comp => {
        if (comp.type === 'TR') {
            const bP = comp.pins.find(p => p.type === 'B');
            const hasDirectPos = isConnected(bP.id, posP.id);
            const capV = getConnectedCapVoltage(bP.id);
            // 0.6V以上の電圧があればTRをONにする
            comp.isBaseActive = hasDirectPos || (capV > 0.6);
        }
    });
}

function getConnectedCapVoltage(startId) {
    let visited = new Set(), queue = [startId], maxV = 0;
    while(queue.length > 0) {
        let curr = queue.shift();
        if (visited.has(curr)) continue;
        visited.add(curr);
        for (let c of components) {
            if (c.pins.some(p => p.id === curr)) {
                if (c.type === 'CAP') maxV = Math.max(maxV, c.charge);
                if (c.type === 'RES' || c.type === 'CAP' || (c.type.includes('SW') && c.state)) {
                    c.pins.forEach(p => queue.push(p.id));
                }
            }
        }
        wires.forEach(w => {
            let next = (w.from.pin.id === curr) ? w.to.pin.id : (w.to.pin.id === curr) ? w.from.pin.id : null;
            if (next) queue.push(next);
        });
    }
    return maxV;
}

function isConnected(startId, targetId) {
    let visited = new Set(), queue = [startId];
    while(queue.length > 0) {
        let curr = queue.shift();
        if (curr === targetId) return true;
        if (visited.has(curr)) continue;
        visited.add(curr);
        wires.forEach(w => {
            let next = (w.from.pin.id === curr) ? w.to.pin.id : (w.to.pin.id === curr) ? w.from.pin.id : null;
            if (next) queue.push(next);
        });
        components.forEach(c => {
            if (c.pins.some(p => p.id === curr)) {
                if (c.type === 'RES' || c.type === 'LED' || c.type === 'CAP' || (c.type.includes('SW') && c.state)) {
                    c.pins.forEach(p => queue.push(p.id));
                }
            }
        });
    }
    return false;
}
