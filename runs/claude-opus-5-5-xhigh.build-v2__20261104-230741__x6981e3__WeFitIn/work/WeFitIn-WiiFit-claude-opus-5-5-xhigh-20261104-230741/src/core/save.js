// Saves: localStorage, versioned JSON, one key, 3 guest slots. Missing storage falls back to memory.
export const SAVE_KEY = 'we-fit-in:save';
export const SAVE_VERSION = 1;

export const DEFAULT_SETTINGS = {
  music: 0.1, sfx: 1, voice: 1, glyphs: 'ps', gentle: false, mouseLeanRadius: 70,
  stepOffsetMs: 0, reduceFlashes: false, look: 'default', pixelSize: 0,
};

export function newSlotData(name, look) {
  return {
    name, look, week: 1, day: 1, phase: 'ferry', drips: 0, milestone: 0,
    records: {}, tests: [], ages: [], todayDone: [], todayStars: 0, todaySeconds: 0, todayDrips: 0, todayNew: [],
    goalPaid: false, confessed: false, wardrobe: [], heardBeat: 0, beatDennis: false, answers: 0, unlockedAll: false,
  };
}

export class Store {
  memory = null;
  data = null;

  constructor(storage = null) {
    this.storage = storage;
    if (storage === null) {
      try { if (typeof localStorage !== 'undefined') this.storage = localStorage; } catch { this.storage = null; }
    }
    this.load();
  }

  blank() {
    return { v: SAVE_VERSION, settings: { ...DEFAULT_SETTINGS }, slots: [null, null, null], current: -1 };
  }

  load() {
    let raw = null;
    try { raw = this.storage ? this.storage.getItem(SAVE_KEY) : this.memory; } catch { raw = this.memory; }
    this.data = this.blank();
    this.recovered = false;
    if (!raw) return this.data;
    try {
      const d = JSON.parse(raw);
      if (d && typeof d === 'object' && d.v === SAVE_VERSION && Array.isArray(d.slots)) {
        this.data.settings = { ...DEFAULT_SETTINGS, ...(d.settings ?? {}) };
        this.data.slots = [0, 1, 2].map((i) => (d.slots[i] && typeof d.slots[i] === 'object' ? d.slots[i] : null));
        this.data.current = Number.isInteger(d.current) ? d.current : -1;
        if (d.dropin && typeof d.dropin === 'object') this.data.dropin = d.dropin;
      } else this.recovered = true;
    } catch { this.recovered = true; }
    return this.data;
  }

  write() {
    const raw = JSON.stringify(this.data);
    this.memory = raw;
    try { this.storage?.setItem(SAVE_KEY, raw); } catch { /* full or private: memory keeps it */ }
  }

  get settings() { return this.data.settings; }
  get slot() { return this.data.current >= 0 ? this.data.slots[this.data.current] : null; }
  use(i) { this.data.current = i; this.write(); return this.slot; }
  create(i, name, look) { this.data.slots[i] = newSlotData(name, look); this.data.current = i; this.write(); return this.slot; }
  erase(i) { this.data.slots[i] = null; if (this.data.current === i) this.data.current = -1; this.write(); }
  resetAll() { const s = this.data.settings; this.data = this.blank(); this.data.settings = s; this.write(); }
}
