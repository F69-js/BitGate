function updateUI() {
    const delBtn = document.getElementById('delBtn');
    if (delBtn) delBtn.disabled = !selectedObj;
    
    const ea = document.getElementById('editArea');
    const ts = document.getElementById('typeSelect');
    const tl = document.getElementById('targetLabel');
    const vi = document.getElementById('valInput');

    if (ea) {
        if (selectedObj?.type === 'comp') {
            const c = selectedObj.ref;
            ea.style.visibility = 'visible';

            // ここを修正：CAPを追加
            if (c.type === 'BAT' || c.type === 'RES' || c.type === 'CAP') {
                vi.style.display = 'inline'; 
                ts.style.display = 'none';
                
                // ラベルをタイプに合わせて切り替え
                if (c.type === 'BAT') tl.innerText = 'POWER (V)';
                else if (c.type === 'RES') tl.innerText = 'RES (Ω)';
                else if (c.type === 'CAP') tl.innerText = 'CAP (μF)';
                
                vi.value = c.val;
            } else if (c.type === 'TR') {
                vi.style.display = 'none'; 
                ts.style.display = 'inline';
                tl.innerText = 'TYPE'; 
                ts.value = c.subType;
            } else { 
                ea.style.visibility = 'hidden'; 
            }
        } else { 
            ea.style.visibility = 'hidden'; 
        }
    }
}
