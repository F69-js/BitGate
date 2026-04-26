/**
 * state.js - グローバルステートの完全定義
 */
export const state = {
    components: [],
    wires: [],
    zoom: 1.0,
    offset: { x: 0, y: 0 },
    isSimulating: false,
    selectedObj: null, // {type: 'comp'|'wire', ref: object}
    draggingObj: null,
    activeLine: null,  // 配線作成中：{startComp, startPin, points:[]}
    mouse: { x: 0, y: 0 }
};
