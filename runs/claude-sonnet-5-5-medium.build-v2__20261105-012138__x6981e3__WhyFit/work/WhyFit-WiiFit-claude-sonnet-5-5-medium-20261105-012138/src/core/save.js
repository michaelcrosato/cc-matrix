// Versioned JSON saves in localStorage (in-memory fallback). One key, 3 guest slots.
export const SAVE_KEY = 'whyfit:save:v1';
export const VERSION = 1;
const mem = {};
function store() {
  try { if (typeof localStorage !== 'undefined' && localStorage) { localStorage.setItem('whyfit:probe', '1'); localStorage.removeItem('whyfit:probe'); return localStorage; } } catch { /* private mode */ }
  return { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
}
export const newSlot = (name = 'Guest', avatar = 0) => ({
  name, avatar, day: 1, phase: 'new', started: false, drips: 0, stars: {}, best: {}, played: {}, doneToday: [], goalDone: false,
  ages: [], trueAges: [], confessed: false, week2: false, minutes: 0, look: null, jarSeen: 0, ended: false, intro: false, beatDennis: false,
  tests: [], questions: {}, unlockedItems: [], dayStars: 0, dayDrips: 0, dayMinutes: 0, ounceFiled: [],
});
export const defaultData = () => ({ v: VERSION, slots: [null, null, null], settings: {}, records: {}, lastSlot: 0 });
export class Save {
  constructor() { this.data = defaultData(); this.load(); }
  load() {
    try {
      const raw = store().getItem(SAVE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (!d || typeof d !== 'object' || d.v !== VERSION || !Array.isArray(d.slots)) throw new Error('bad save');
      this.data = { ...defaultData(), ...d, slots: [0, 1, 2].map((i) => (d.slots[i] ? { ...newSlot(), ...d.slots[i] } : null)) };
    } catch { this.data = defaultData(); }
  }
  write() { try { store().setItem(SAVE_KEY, JSON.stringify(this.data)); } catch { /* full */ } }
  get settings() { return this.data.settings; }
  get records() { return this.data.records; }
  slot(i) { return this.data.slots[i]; }
  setSlot(i, s) { this.data.slots[i] = s; this.data.lastSlot = i; this.write(); }
  clear() { this.data = defaultData(); this.write(); }
}
