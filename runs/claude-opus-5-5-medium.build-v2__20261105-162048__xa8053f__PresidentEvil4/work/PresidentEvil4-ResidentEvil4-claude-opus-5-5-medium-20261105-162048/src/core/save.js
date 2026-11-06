// localStorage with a slug prefix. In a hub session the client hands us an empty storage: nothing special needed.
import { SLUG } from '../config.js';
const mem = new Map();
const store = () => { try { return globalThis.localStorage || null; } catch { return null; } };
export const save = {
  get(k, d = null) { try { const s = store(); const v = s ? s.getItem(`${SLUG}.${k}`) : mem.get(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { const s = store(); const j = JSON.stringify(v); if (s) s.setItem(`${SLUG}.${k}`, j); else mem.set(k, j); } catch { /* storage full or denied: the game goes on */ } },
  del(k) { try { const s = store(); if (s) s.removeItem(`${SLUG}.${k}`); else mem.delete(k); } catch { /* ignored */ } },
};
export const DEFAULT_SETTINGS = { music: 0.1, sfx: 1, voice: 1, master: 0.8, padAim: 1, mouseAim: 1, invertY: false, aimAssist: 1, glyphs: 'ps', shake: 1, look: 'native', pixelSize: 'fine', quality: 'high', fps: 60 };
export function loadSettings() { return { ...DEFAULT_SETTINGS, ...save.get('settings', {}) }; }
export function storeSettings(s) { save.set('settings', s); }
