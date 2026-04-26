/**
 * worker.js - 物理演算エンジン（本格装換版）
 * 簡略化・省略なし
 */

let components = [];
let wires = [];
let isSimulating = false;

// 外部から受信するメッセージのハンドリング
self.onmessage = (e) => {
    const { type, data } = e.data;
    if (type === 'SYNC') {
        components = data.components;
        wires = data.wires;
    } else if (type === 'TICK') {
        updateSimulation();
        // 演算結果をメインスレッドへ送り返す
        self.postMessage({
            type: 'RESULT',
            components: components.map(c => ({
                id: c.id,
                currentI: c.currentI,
                charge: c.charge,
                isActive: c.isActive,
                isBlown: c.isBlown,
                state: c.state,
                isBaseActive: c.isBaseActive
            }))
        });
    } else if (type === 'SET_SIM') {
        isSimulating = e.data.value;
    }
};

/**
 * メインエンジン：updateSimulation
 */
function updateSimulation() {
    components.forEach(c => {
        c.currentI = 0;
        // 充電フラグを一旦リセット
        c.isBeingCharged = false;
        if (c.type === 'BAT') c.isShort = false;
        if (c.type === 'TR') c.isBaseActive = false;
    });
    
    // シミュレーション停止中ならここで抜けるが、SYNCは維持される
    isSimulating = true; // 内部フラグを強制的に同期（メインスレッドの状態に依存）

    const batteries = components.filter(c => c.type === 'BAT');
    const capacitors = components.filter(c => c.type === 'CAP');

    // 1. まず電池からの給電と充電を計算
    batteries.forEach(bat => {
        const posP = bat.pins.find(p => p.type === 'POS');
        const negP = bat.pins.find(p => p.type === 'NEG');
        if (!posP || !negP) return;
        
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

    // 3. IC(74HC04 NOT) のロジック演算
    const ics = components.filter(c => c.type === 'NOT_IC');
    ics.forEach(ic => {
        const vccPin = ic.pins.find(p => p.type === 'VCC');
        const gndPin = ic.pins.find(p => p.type === 'GND');
        if (!vccPin || !gndPin) return;
        
        const isPowered = batteries.some(bat => {
            const bPos = bat.pins.find(p => p.type === 'POS');
            const bNeg = bat.pins.find(p => p.type === 'NEG');
            return isConnected(vccPin.id, bPos.id) && isConnected(gndPin.id, bNeg.id);
        });

        ic.isActive = isPowered;

        if (isPowered) {
            const gates = [
                {in: '1A', out: '1Y'}, {in: '2A', out: '2Y'}, {in: '3A', out: '3Y'},
                {in: '4A', out: '4Y'}, {in: '5A', out: '5Y'}, {in: '6A', out: '6Y'}
            ];

            gates.forEach(g => {
                const inPin = ic.pins.find(p => p.label === g.in);
                const outPin = ic.pins.find(p => p.label === g.out);

                const isHigh = batteries.some(bat => 
                    isConnected(inPin.id, bat.pins.find(p=>p.type==='POS').id)
                );

                if (!isHigh) {
                    const batNeg = batteries[0]?.pins.find(p => p.type === 'NEG');
                    if (batNeg) processPowerSource(ic, outPin, batNeg, 5, false); 
                }
            });
        }
    });
    
    // 自然放電（微量）
    capacitors.forEach(c => {
        if (!c.isBeingCharged && c.currentI === 0) c.charge *= 0.999;
    });
}

/**
 * 電源処理：経路を探索して電流を分配
 */
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
                if (comp.type === 'RES' || comp.type === 'LED' || (comp.type === 'TR' && inPin.type === 'B')) canPass = true;
                else if (comp.type === 'CAP') canPass = true;
                else if (comp.type === 'PSW' || comp.type === 'SSW') canPass = comp.state;
                else if (comp.type === 'TR' && (inPin.type === 'C' || inPin.type === 'E')) canPass = comp.isBaseActive;
                else if (comp.type === 'DIO') {
                    if (inPin.type === 'POS') canPass = true;
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
            if (c.type === 'TR') return sum + 1000; 
            if (c.type === 'LED') return sum + 20;
            if (c.type === 'DIO') return sum + 10; 
            return sum + 1;
        }, 1);
        
        const pAmp = voltage / r;
        const dt = 0.05; 
        const capScale = 0.000002; 

        path.forEach(c => {
            c.currentI += pAmp;
            if (c.type === 'CAP' && isExternalBat) {
                c.isBeingCharged = true;
                c.charge = Math.min(voltage, c.charge + (pAmp * dt) / (Math.max(1, c.val) * capScale * 5));
            }
        });

        if (!isExternalBat) {
            source.charge = Math.max(0, source.charge - (pAmp * dt) / (Math.max(1, source.val) * capScale));
        }
    });
}

/**
 * 論理状態チェック（トランジスタのベース電圧など）
 */
function checkLogicalStates(bat, posP, negP) {
    components.forEach(comp => {
        if (comp.type === 'TR') {
            const bP = comp.pins.find(p => p.type === 'B');
            if (!bP) return;
            const hasDirectPos = isConnected(bP.id, posP.id);
            const capV = getConnectedCapVoltage(bP.id);
            comp.isBaseActive = hasDirectPos || (capV > 0.6);
        }
    });
}

/**
 * 接続されているコンデンサの最大電圧を取得
 */
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

/**
 * 2つのピンが接続されているか判定（導通チェック）
 */
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
