// Guarded localStorage (a session client hands an empty store; Node has none).
const KEY = 'trauma-cantina:v1';
const mem = {};
const store = () => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; } };
export const DEFAULT_SETTINGS = { music: 0.1, sfx: 0.8, voices: 0.8, glyphs: 'ps', aim: 'low', cursor: 10, rumble: true, giftToggle: false, look: 'default', pixel: 1, shake: true, flashes: true, textSpeed: 2, difficulty: 'resident', fullscreen: false };
export const DEFAULT_SAVE = { cleared: {}, next: 0, difficulty: 'resident', quietOn: false, attempts: {}, seen: {}, finished: false, unlockedAll: false, log: {} };
export function loadSave() {
  let s = null; try { const t = store()?.getItem(KEY); s = t ? JSON.parse(t) : mem.save || null; } catch {}
  return { ...structuredClone(DEFAULT_SAVE), ...(s?.save || {}), };
}
export function loadSettings() {
  let s = null; try { const t = store()?.getItem(KEY); s = t ? JSON.parse(t) : mem.save || null; } catch {}
  return { ...DEFAULT_SETTINGS, ...(s?.settings || {}) };
}
export function persist(save, settings) {
  const blob = { save, settings }; mem.save = blob;
  try { store()?.setItem(KEY, JSON.stringify(blob)); } catch {}
}
export const saveExists = () => { try { return !!store()?.getItem(KEY); } catch { return false; } };
