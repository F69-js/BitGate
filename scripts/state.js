/**
 * state.js - アプリの状態を一括管理
 */
export const state = {
    components: [],
    wires: [],
    zoom: 1.0,
    offset: { x: 0, y: 0 },
    isSimulating: false,
    selectedObj: null,
    draggingObj: null,
    activeLine: null,
    mouse: { x: 0, y: 0 }
};
