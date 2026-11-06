// Saves: localStorage under a key built from the title, in try/catch, versioned JSON. Sessions never save.
import { SAVE_KEY } from '../data/meta.js';
import { newAccount } from '../sim/town.js';
import { newCampaign } from '../sim/campaign.js';

const VERSION = 2;
export const DEFAULT_SETTINGS = { glyphs: 'ps', shake: 1, numbers: true, zoom: 1, look: 'none', pixel: 0, quality: 'high', fullscreen: false, master: 0.8, music: 0.1, sfx: 1, voices: 1 };
const HERO_FIELDS = ['seat', 'cls', 'name', 'level', 'xp', 'gear', 'inv', 'skills', 'vows', 'gold', 'mats', 'gems', 'reliquary', 'deaths', 'kills', 'uid', 'devPoints', 'grandKeys'];

export const serializeHero = (h) => { const o = {}; for (const k of HERO_FIELDS) o[k] = JSON.parse(JSON.stringify(h[k] === undefined ? null : h[k])); return o; };
export class SaveStore {
  constructor() { this.data = this.load(); }
  blank() { return { v: VERSION, slots: [null, null, null], acct: newAccount(), settings: { ...DEFAULT_SETTINGS }, guests: {} }; }
  load() {
    try {
      if (typeof localStorage === 'undefined') return this.blank();
      const raw = localStorage.getItem(SAVE_KEY); if (!raw) return this.blank();
      const d = JSON.parse(raw); if (!d || d.v !== VERSION) return this.blank();
      d.settings = { ...DEFAULT_SETTINGS, ...(d.settings || {}) }; d.acct = { ...newAccount(), ...(d.acct || {}) }; d.guests = d.guests || {}; return d;
    } catch { return this.blank(); }
  }
  flush() { try { if (typeof localStorage !== 'undefined' && !this.disabled) localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); return true; } catch { return false; } }
  slot(i) { return this.data.slots[i]; }
  putSlot(i, hero, camp, extra = {}) { this.data.slots[i] = { hero: serializeHero(hero), camp: JSON.parse(JSON.stringify(camp)), zone: extra.zone || 'town', diff: extra.diff || 'pilgrim', t: extra.t || 0, seed: extra.seed || 1, lastBell: !!extra.lastBell }; this.flush(); }
  deleteSlot(i) { this.data.slots[i] = null; this.flush(); }
  setSettings(s) { Object.assign(this.data.settings, s); this.flush(); }
  get settings() { return this.data.settings; }
  get acct() { return this.data.acct; }
}
