// Persistent state across areas: health, money, the Case, weapons, treasure, notes, stats. Plain data.
import { Case } from '../game/caseModel.js';
import { WEAPONS, tunedStat } from '../data/weapons.js';
import { ITEMS, VALUABLES } from '../data/items.js';

export const DIFFICULTY = {
  assisted: { id: 'assisted', name: 'ASSISTED', dmg: 0.6, assist: 1.5, sawLethal: false, loot: 1.3, tokens: 0, text: 'ENEMIES HIT SOFTER, BOSSES CALL HALF AS MANY FRIENDS. AIM ASSIST UP. THE SAW IS NOT LETHAL.' },
  standard: { id: 'standard', name: 'STANDARD', dmg: 1, assist: 1, sawLethal: true, loot: 1, tokens: 0, text: 'THE POLICY AS WRITTEN.' },
  professional: { id: 'professional', name: 'PROFESSIONAL', dmg: 1.4, assist: 1, sawLethal: true, loot: 0.8, tokens: 1, text: 'ENEMIES HIT HARDER. ONE MORE ATTACKER AT A TIME.' },
};
export const CASE_SIZES = [[10, 6], [12, 7], [14, 8]];
export const CHAPTERS = ['CLAIM 1: ACT OF GOD', 'CLAIM 2: WEAR AND TEAR', 'CLAIM 3: ACT OF COMMODORE', 'FINAL SETTLEMENT'];

export class Run {
  constructor(difficulty = 'standard') {
    this.difficulty = difficulty;
    this.doubloons = 0;
    this.maxHp = 100; this.hp = 100;
    this.case = new Case(10, 6);
    this.mags = { pistol: 12 };
    this.tune = { pistol: [0, 0, 0, 0] };
    this.equipped = 'pistol';
    this.grenade = null;
    this.case.add('weapon', 'pistol'); this.case.add('item', 'ammo_pistol', 30);
    this.valuables = []; this.keyItems = []; this.notes = []; this.tannoys = []; this.perks = [];
    this.caseLevel = 0; this.chart = false; this.bought = {};
    this.stats = { time: 0, shots: 0, hits: 0, heads: 0, kicks: 0, deductions: 0, kills: 0, deaths: 0 };
    this.chapter = 0; this.areaId = 'quay'; this.flags = {};
    this.areaStart = { time: 0, shots: 0, hits: 0, heads: 0, kicks: 0, deductions: 0 };
  }
  get diff() { return DIFFICULTY[this.difficulty] || DIFFICULTY.standard; }
  owns(w) { return this.case.items.some((e) => e.kind === 'weapon' && e.id === w); }
  weapons() { return this.case.items.filter((e) => e.kind === 'weapon').map((e) => e.id); }
  stat(w) { return tunedStat(WEAPONS[w], this.tune[w]); }
  magSize(w) { return this.stat(w).mag; }
  ammo(w) { return this.case.count(WEAPONS[w].ammo); }
  /** Move up to n rounds from the Case into the weapon. Returns rounds loaded. */
  reload(w) {
    const need = this.magSize(w) - (this.mags[w] ?? 0);
    const take = Math.min(need, this.ammo(w));
    if (take > 0) { this.case.take(WEAPONS[w].ammo, take); this.mags[w] = (this.mags[w] ?? 0) + take; }
    return take;
  }
  addWeapon(w) {
    if (this.owns(w)) return true;
    const r = this.case.add('weapon', w);
    if (r.ok) { this.mags[w] = 0; this.tune[w] ||= [0, 0, 0, 0]; if (this.mags[w] === 0) { /* empty until reloaded */ } }
    return r.ok;
  }
  addItem(id, n = 1) { return this.case.add('item', id, n); }
  heal(f) { this.hp = Math.min(this.maxHp, this.hp + this.maxHp * f); }
  grenades() { return ['flare', 'depth', 'bottle'].filter((g) => this.case.count(g) > 0); }
  addValuable(id) { this.valuables.push({ id, sockets: [] }); }
  valuableValue(v) { const d = VALUABLES[v.id]; return d.sockets && v.sockets.length === d.sockets.length ? d.full : d.value; }
  socket(reliquaryIdx, gemId) {
    const rel = this.valuables[reliquaryIdx]; const d = VALUABLES[rel?.id];
    if (!d?.sockets || !d.sockets.includes(gemId) || rel.sockets.includes(gemId)) return false;
    const gi = this.valuables.findIndex((v, i) => i !== reliquaryIdx && v.id === gemId);
    if (gi < 0) return false;
    rel.sockets.push(gemId); this.valuables.splice(gi, 1); return true;
  }
  upgradeCase() {
    if (this.caseLevel >= 2) return false;
    this.caseLevel++; const [w, h] = CASE_SIZES[this.caseLevel]; this.case.resize(w, h); return true;
  }
  snapshotStart() { this.areaStart = { ...this.stats }; }
  serialize() { const o = { ...this, case: this.case.serialize() }; return JSON.parse(JSON.stringify(o)); }
  static from(d) { const r = new Run(d.difficulty); Object.assign(r, d); r.case = Case.from(d.case); return r; }
}
export function canSellItem(entry) { return !!entry; }
export function sellValue(entry) {
  if (entry.kind === 'weapon') return Math.floor(WEAPONS[entry.id].price / 2);
  const def = ITEMS[entry.id]; return Math.floor(((def.sell ?? def.price / 2) * (entry.count ?? 1)) / (def.stack ? 1 : 1));
}
