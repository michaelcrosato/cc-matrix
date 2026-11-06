// Save slot: run state plus area flags. In a hub session storage is empty memory: no special case.
import { loadKey, saveKey, removeKey } from './store.js';
export function saveGame(data) { return saveKey('save', { v: 1, at: Date.now(), ...data }); }
export function loadGame() { const d = loadKey('save'); return d && d.v === 1 && d.run ? d : null; }
export function hasSave() { return !!loadGame(); }
export function clearSave() { removeKey('save'); }
export function loadBoard() { return loadKey('board', []); }
export function saveBoard(b) { return saveKey('board', b.slice(0, 10)); }
