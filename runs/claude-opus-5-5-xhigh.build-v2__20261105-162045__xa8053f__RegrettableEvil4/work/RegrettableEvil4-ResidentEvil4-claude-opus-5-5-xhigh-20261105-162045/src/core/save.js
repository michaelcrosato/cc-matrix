// Settings and the save slot, in localStorage under the game's slug. In a hub session the client hands
// the game an empty storage, so nothing here special-cases it. In Node a Map stands in.
import { SLUG } from '../config.js';

const memory = new Map();
const store = (typeof localStorage !== 'undefined') ? localStorage : {
  getItem: (k) => (memory.has(k) ? memory.get(k) : null),
  setItem: (k, v) => memory.set(k, String(v)),
  removeItem: (k) => memory.delete(k),
};
const read = (key) => { try { const t = store.getItem(`${SLUG}:${key}`); return t ? JSON.parse(t) : null; } catch { return null; } };
const write = (key, value) => { try { store.setItem(`${SLUG}:${key}`, JSON.stringify(value)); return true; } catch { return false; } };
export const removeKey = (key) => { try { store.removeItem(`${SLUG}:${key}`); } catch { /* storage may be unavailable */ } };

export const DEFAULT_SETTINGS = Object.freeze({
  music: 0.1, sfx: 1, voice: 1, master: 0.8,
  padAim: 1, mouseAim: 1, invertY: false, aimAssist: 1,
  glyphs: 'ps', shake: 1, look: 'native', pixelSize: 'fine', quality: 'high', fps: 60,
});

export function loadSettings() { return { ...DEFAULT_SETTINGS, ...(read('settings') ?? {}) }; }
export function saveSettings(s) { return write('settings', s); }

export function loadSave() { return read('save'); }
export function writeSave(data) { return write('save', data); }
export function hasSave() { return !!read('save'); }
export function clearSave() { removeKey('save'); }

export function loadBoard() { return read('board') ?? []; }
export function addToBoard(entry) {
  const board = loadBoard();
  board.push(entry);
  board.sort((a, b) => b.score - a.score);
  board.length = Math.min(board.length, 6);
  write('board', board);
  return board;
}
export function loadDevTuning() { return read('tuning'); }
export function saveDevTuning(t) { return write('tuning', t); }
