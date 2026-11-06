// Saves: JSON with a `v` field and migrations. The grid and dirty flags are derived, never stored.
import { storage, KEYS } from './storage.js';
import { rebuildGrid, SAVE_V } from './world.js';
const MIGRATE = { 1: (w) => { w.v = 2; w.wishes ??= []; w.patternsUsed ??= {}; return w; } };
export function serialize(w) { const { grid, dirty, ...rest } = w; return JSON.stringify(rest); }
export function deserialize(text) { let w = JSON.parse(text); while (w.v < SAVE_V && MIGRATE[w.v]) w = MIGRATE[w.v](w); rebuildGrid(w); w.dirty = true; return w; }
export const hasSave = () => !!storage.get(KEYS.save);
export function saveNow(w, nowMs) { if (!w) return; w.lastReal = nowMs ?? w.lastReal; storage.set(KEYS.save, serialize(w)); }
export const loadSave = () => { const s = storage.get(KEYS.save); if (!s) return null; try { return deserialize(s); } catch { return null; } };
export const wipeSave = () => storage.del(KEYS.save);
/** Clean-exit flag: set while playing; cleared by bed or Save & Quit. Comedy only. */
export const markPlaying = (v) => storage.set(KEYS.session, v ? 'playing' : 'clean');
export const wasUnclean = () => storage.get(KEYS.session) === 'playing';
export const lifetime = () => storage.getJSON(KEYS.lifetime) ?? { pimm: 0 };
export const setLifetime = (o) => storage.setJSON(KEYS.lifetime, o);
