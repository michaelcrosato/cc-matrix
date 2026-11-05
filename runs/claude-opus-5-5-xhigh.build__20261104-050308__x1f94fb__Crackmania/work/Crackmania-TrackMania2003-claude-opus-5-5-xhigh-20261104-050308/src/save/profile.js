// CRACKMANIA profile (PLAN §5.1): one per browser in E.store ('crackmania:profile', versioned with a migrate hook):
// the name, coppers, records per track (best steps, splits, medal, ghost, attempts), puzzle records, Survival's best
// rank per gauntlet, packs and patterns owned, paint per car, 6 custom track slots, 10 replay slots, story beats seen
import { E, ctx } from '../ctx.js';
import { CFG } from '../config.js';
import { DEFAULT_PAINT } from '../car/draw.js';
export const KEY = 'crackmania:profile', VERSION = 1;
export const REWARD = { race: [0, 60, 90, 150, 300], puzzle: [0, 80, 120, 200, 300] };
export const ENV_MUL = { dustbowl: 1, hedgerow: 1.25, frostpeak: 1.5 };
export function fresh() {
  return { v: VERSION, name: 'PLAYER', coppers: 300, records: {}, puzzles: {}, survival: {}, packs: { BASIC: true }, patterns: { 0: true, 1: true, 2: true }, paint: JSON.parse(JSON.stringify(DEFAULT_PAINT)),
    slots: [null, null, null, null, null, null], replays: [], beats: {}, tips: {}, stats: { races: 0, km: 0 }, ended: false, created: Date.now() };
}
export function migrate(p, from) { if (!p || typeof p !== 'object') return fresh(); const f = fresh(); for (const k of Object.keys(f)) if (p[k] === undefined) p[k] = f[k]; p.v = VERSION; return p; }
export class Profile {
  constructor(game, o = {}) { this.game = game; this.temp = !!o.temp; this.p = fresh(); this.saved = true; }
  load() { const raw = this.temp ? null : E.store.get(KEY, null); this.p = raw ? migrate(raw, raw.v) : fresh(); return this.p; }
  save() { if (this.game.headless && !this.forceSave) return true; if (this.temp) return true; this.saved = E.store.set(KEY, this.p); return this.saved; }
  reset() { this.p = fresh(); this.save(); }
  get coppers() { return this.p.coppers; }
  record(id) { return this.p.records[id] || null; }
  medal(id) { const r = this.p.records[id] || this.p.puzzles[id]; return r ? r.medal || 0 : 0; }
  /** a finished run: the record kept if better, medals paid once per tier. Returns { better, medal, newMedal, coppers, prevBest } */
  finish(id, kind, steps, medal, ghost, splits, env) {
    const book = kind === 'puzzle' ? this.p.puzzles : this.p.records, r = book[id] || (book[id] = { bestSteps: null, bestSplits: null, medal: 0, ghost: null, attempts: 0 });
    r.attempts++;
    const prevBest = r.bestSteps, better = prevBest === null || steps < prevBest;
    if (better) { r.bestSteps = steps; r.bestSplits = splits; r.ghost = ghost; }
    let paid = 0; const was = r.medal || 0;
    if (medal > was) { const tab = REWARD[kind === 'puzzle' ? 'puzzle' : 'race'], mul = kind === 'puzzle' ? 1 : ENV_MUL[env] || 1; for (let m = was + 1; m <= medal; m++) paid += Math.round(tab[m] * mul * CFG.copperMul); r.medal = medal; this.p.coppers += paid; }
    this.p.stats.races++;
    this.save();
    return { better, medal, newMedal: medal > was, wasMedal: was, coppers: paid, prevBest };
  }
  spend(n) { if (this.p.coppers < n) return false; this.p.coppers -= n; this.save(); return true; }
  earn(n) { this.p.coppers += n; this.save(); }
  seen(beat) { return !!this.p.beats[beat]; }
  mark(beat) { this.p.beats[beat] = true; this.save(); }
  paint(model) { return this.p.paint[model] || DEFAULT_PAINT[model]; }
  addReplay(rep) { this.p.replays.unshift(rep); if (this.p.replays.length > 10) this.p.replays.length = 10; this.save(); }
}
