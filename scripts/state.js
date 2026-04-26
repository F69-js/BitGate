/**
 * state.js - 全てのグローバル変数の実家
 */
export const state = {
    components: [],
    wires: [],
    zoom: 1.0,
    offset: { x: 0, y: 0 },
    isSimulating: false,
    selectedObj: null, // {type: 'comp'|'wire', ref: object}
    draggingObj: null,
    dragOffset: { x: 0, y: 0 },
    activeLine: null,
    mouse: { x: 0, y: 0 }
};
