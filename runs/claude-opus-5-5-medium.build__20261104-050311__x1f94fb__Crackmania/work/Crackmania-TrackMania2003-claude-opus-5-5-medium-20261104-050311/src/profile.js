// The player's profile in E.store (versioned): coppers, records, medals, unlocks, paint, custom tracks, replays, story.
import { TRACKS, PUZZLES, ENV_ORDER, ENV_INFO } from './data.js';
import { CFG } from './config.js';

const E = globalThis.My3D2dge;
const KEY = 'crackmania:profile', VERSION = 1;
export const REWARD = { race: [0, 60, 90, 150, 300], puzzle: [0, 80, 120, 200, 300] };
export const MEDALS = ['NONE', 'BRONZE', 'SILVER', 'GOLD', 'AUTHOR'];
export const MEDAL_COL = ['#606070', '#c87a3a', '#c8d0d8', '#ffd23a', '#3ae8a0'];

export function fresh() {
  return { version: VERSION, name: 'PLAYER', coppers: 300, records: {}, puzzles: {}, survival: {}, packs: { basic: true }, patterns: [0, 1, 2], paint: {}, slots: [null, null, null, null, null, null], replays: [], seen: {}, tips: {}, unlockAll: false, golds: 0, ended: false, hotseatNames: [] };
}
export function migrate(p) {
  if (!p || typeof p !== 'object') return fresh();
  const f = fresh();
  for (const k in f) if (p[k] === undefined) p[k] = f[k];
  p.version = VERSION; return p;
}
export class Profile {
  constructor(store = true) { this.store = store; this.data = fresh(); }
  load() { if (this.store) { try { this.data = migrate(E.store.get(KEY, null)); } catch (e) { this.data = fresh(); } } return this; }
  save() { if (this.store) try { E.store.set(KEY, this.data); } catch (e) { /* storage blocked: kept for the visit */ } }
  reset() { this.data = fresh(); this.save(); }
  get coppers() { return this.data.coppers; }
  spend(n) { if (this.data.coppers < n) return false; this.data.coppers -= n; this.save(); return true; }
  earn(n) { this.data.coppers += Math.round(n); this.save(); }
  rec(id) { return this.data.records[id] || (this.data.records[id] = { best: null, splits: [], medal: 0, ghost: null, attempts: 0 }); }
  medal(id) { const r = this.data.records[id] || this.data.puzzles[id]; return r ? r.medal : 0; }
  /** a finished run: returns { newBest, medalWas, medal, coppers (paid), rewardParts } */
  finish(id, steps, medal, splits, ghost, kind = 'race', env = 'dustbowl') {
    const R = kind === 'puzzle' ? (this.data.puzzles[id] || (this.data.puzzles[id] = { best: null, medal: 0, attempts: 0 })) : this.rec(id);
    R.attempts = (R.attempts || 0) + 1;
    const newBest = R.best === null || steps < R.best, was = R.medal || 0;
    if (newBest) { R.best = steps; if (splits) R.splits = splits.slice(); if (ghost) R.ghost = ghost; }
    let paid = 0;
    if (medal > was) { const tbl = REWARD[kind === 'puzzle' ? 'puzzle' : 'race'], mult = (kind === 'puzzle' ? 1 : ENV_INFO[env].mult) * CFG.copperMult; for (let m = was + 1; m <= medal; m++) paid += tbl[m] * mult; R.medal = medal; }
    paid = Math.round(paid); this.data.coppers += paid;
    this.save();
    return { newBest, was, medal: Math.max(medal, was), paid };
  }
  // ---- unlocks ----
  medalsIn(env) { return TRACKS.filter(t => t.env === env && this.medal(t.id) > 0).length; }
  goldsIn(env) { return TRACKS.filter(t => t.env === env && this.medal(t.id) >= 3).length; }
  envOpen(env) { if (this.data.unlockAll) return true; const i = ENV_ORDER.indexOf(env); return i === 0 || this.medalsIn(ENV_ORDER[i - 1]) >= 3; }
  trackOpen(id) {
    if (this.data.unlockAll) return true;
    const t = TRACKS.find(x => x.id === id); if (!t || !this.envOpen(t.env)) return false;
    const list = TRACKS.filter(x => x.env === t.env), i = list.indexOf(t);
    return i <= (t.env === 'dustbowl' ? 1 : 0) || this.medal(list[i - 1].id) > 0;
  }
  puzzlesOpen(env) { if (this.data.unlockAll) return true; const list = TRACKS.filter(x => x.env === env); return this.envOpen(env) && this.medal(list[1].id) > 0; }
  survivalOpen(env) { if (this.data.unlockAll) return true; const list = TRACKS.filter(x => x.env === env); return this.envOpen(env) && this.medal(list[2].id) > 0; }
  hasPack(p) { return !!this.data.packs[p] || this.data.unlockAll; }
  buyPack(p, price) { if (this.hasPack(p)) return true; if (!this.spend(price)) return false; this.data.packs[p] = true; this.save(); return true; }
  hasPattern(i) { return this.data.patterns.includes(i) || this.data.unlockAll; }
  buyPattern(i, price = 100) { if (this.hasPattern(i)) return true; if (!this.spend(price)) return false; this.data.patterns.push(i); this.save(); return true; }
  totalGolds() { return TRACKS.filter(t => this.medal(t.id) >= 3).length; }
  seen(k) { return !!this.data.seen[k]; }
  see(k) { this.data.seen[k] = true; this.save(); }
}
export { PUZZLES };
