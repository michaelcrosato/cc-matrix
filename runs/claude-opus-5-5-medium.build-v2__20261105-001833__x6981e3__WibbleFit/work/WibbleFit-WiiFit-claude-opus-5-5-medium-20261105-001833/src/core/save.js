// Versioned JSON in one localStorage key. Falls back to memory when there is no storage.
export const SAVE_KEY = 'wibblefit:save';
export const SAVE_VERSION = 1;
export const DEFAULT_SETTINGS = { music: 0.1, sfx: 0.8, voice: 0.8, glyphs: 'ps', gentle: false, stepOffset: 0, reduceFlashes: false, look: 'default', pixelSize: '', mouseRadius: 70 };
const fresh = () => ({ version: SAVE_VERSION, settings: { ...DEFAULT_SETTINGS }, slots: [null, null, null], dropIn: {}, tunables: {} });
function storage() {
  try { const s = globalThis.localStorage; if (!s) return null; s.setItem('wibblefit:probe', '1'); s.removeItem('wibblefit:probe'); return s; } catch { return null; }
}
export class Save {
  memory = null; data = fresh(); corrupt = false;
  constructor(store = storage()) { this.store = store; this.load(); }
  load() {
    let raw = null;
    try { raw = this.store ? this.store.getItem(SAVE_KEY) : this.memory; } catch { raw = this.memory; }
    this.corrupt = false;
    if (!raw) { this.data = fresh(); return; }
    try {
      const d = JSON.parse(raw);
      if (!d || typeof d !== 'object' || d.version !== SAVE_VERSION || !Array.isArray(d.slots)) throw new Error('bad save');
      this.data = { ...fresh(), ...d, settings: { ...DEFAULT_SETTINGS, ...d.settings } };
    } catch { this.corrupt = true; this.data = fresh(); }
  }
  write() {
    const raw = JSON.stringify(this.data);
    this.memory = raw;
    try { this.store?.setItem(SAVE_KEY, raw); } catch { /* full or private: memory has it */ }
  }
  wipe() { this.data = fresh(); this.write(); }
}
export function newSlot(name, look, avatarIndex) {
  return { name, look, avatar: avatarIndex, week: 1, day: 1, phase: 'ferry', records: {}, drips: 0, milestones: 0, items: [], tests: [], chart: [], today: [], todayStars: [], todayFirst: 0, todayBeat: false, goalDone: false, confessed: false, wobbleToday: null, answers: {}, seconds: 0, plays: 0, hardUnlocked: false };
}
