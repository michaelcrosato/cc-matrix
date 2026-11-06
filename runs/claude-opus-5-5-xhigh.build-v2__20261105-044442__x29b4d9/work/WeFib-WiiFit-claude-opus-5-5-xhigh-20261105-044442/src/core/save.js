import { SAVE_KEY, SAVE_VERSION } from '../data/config.js';

const defaults = () => ({
  version: SAVE_VERSION,
  activeProfile: -1,
  profiles: [null, null, null, null],
  settings: {
    music: 10, sound: 80, voice: 80,
    glyphs: 'ps', rumble: true, autoBreathe: false, rhythmOffset: 0,
    uiScale: 100, ink: 100, reduceShake: false,
    difficulty: 'standard',
  },
});

export function newProfile(name, paint) {
  return {
    name, paint, hat: 'none', day: 1, stepsDone: 0, tutorialDone: false,
    today: { day: 1, checkin: false, age: null, done: [], question: false },
    ages: [], stamps: [], medals: {}, tiers: {}, seen: {},
    marbles: 0, marbleLog: [], floorExercises: 0, minutes: 0, classes: 0,
    levelled: false, lastSeen: 0, answers: {}, unlocked: [],
  };
}

export class Save {
  constructor(storage) {
    this.memoryOnly = false;
    this.storage = storage;
    this.data = this.load();
  }
  load() {
    let raw = null;
    try { raw = this.storage ? this.storage.getItem(SAVE_KEY) : null; } catch (e) { this.memoryOnly = true; }
    if (!raw) return defaults();
    try {
      const d = JSON.parse(raw);
      if (!d || typeof d !== 'object' || d.version !== SAVE_VERSION || !Array.isArray(d.profiles)) return defaults();
      const base = defaults();
      return { ...base, ...d, settings: { ...base.settings, ...(d.settings || {}) } };
    } catch (e) { return defaults(); }
  }
  write() {
    if (this.memoryOnly || !this.storage) return;
    try { this.storage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch (e) { this.memoryOnly = true; }
  }
  reset() {
    this.data = defaults();
    this.write();
  }
  get profile() { const p = this.data.profiles[this.data.activeProfile]; return p || null; }
  get settings() { return this.data.settings; }
}
