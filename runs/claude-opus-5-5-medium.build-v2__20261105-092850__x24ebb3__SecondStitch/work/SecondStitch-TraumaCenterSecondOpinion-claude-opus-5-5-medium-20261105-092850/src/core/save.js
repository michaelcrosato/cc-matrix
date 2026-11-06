// Guarded localStorage under a versioned key. In a session the client hands us an empty store.
const KEY = 'second-stitch:v1';
export const DEFAULT_SAVE = () => ({ next: 0, sceneDone: {}, ranks: {}, scores: {}, difficulty: 'resident', cleared: {}, finished: false, fails: {} });
export const DEFAULT_SETTINGS = () => ({ music: 0.1, sfx: 0.8, voices: 0.8, glyphs: 'ps', aim: 'low', cursor: 1, rumble: true, giftToggle: false, look: 'field', pixel: 1, shake: 1, reduceFlash: false, textSpeed: 1, difficulty: 'resident', fullscreen: false });
const store = () => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; } };
export function loadAll() {
  const s = store(); let raw = null;
  try { raw = s?.getItem(KEY); } catch { raw = null; }
  try { const d = raw ? JSON.parse(raw) : {}; return { save: { ...DEFAULT_SAVE(), ...d.save }, settings: { ...DEFAULT_SETTINGS(), ...d.settings } }; } catch { return { save: DEFAULT_SAVE(), settings: DEFAULT_SETTINGS() }; }
}
export function storeAll(save, settings) {
  try { store()?.setItem(KEY, JSON.stringify({ save, settings })); } catch { /* full or blocked: play on */ }
}
export const saveKey = KEY;
