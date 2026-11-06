// The host's authoritative sim: runs on a timer from AIHub.time() (never from the renderer), so a hidden tab or a server copy keeps going.
import { createOp, step, drainEvents, result } from '../sim/op.js';
import { BY_ID, SESSION_ROUNDS } from '../content/ops/index.js';
import { resetConfig } from '../core/config.js';
import { encodeKey, encodeSnap } from './codec.js';
export class HostSim {
  constructor(AIHub, info) {
    this.hub = AIHub; this.info = info; const def = SESSION_ROUNDS[((info.round || 1) - 1 + SESSION_ROUNDS.length * 100) % SESSION_ROUNDS.length]; this.def = def; resetConfig();
    const rng = AIHub.rng('deal'); this.seed = Math.floor(rng() * 1e9);
    const n = info.players.length; this.n = n;
    this.sim = createOp(def, { seed: this.seed, difficulty: 'resident', seats: info.players.map((p, i) => ({ id: i, doctor: i % 2 === 0 ? 'ilya' : 'sabine' })), quietOn: true, humans: n });
    this.sim.hintOn = true; this.inputs = {}; this.queue = []; this.pendEv = []; this.last = new Map(); this.sn = 0; this.finished = false; this.tokens = 40; this.lastFill = performance.now();
    this.stats = {}; this.timer = null; this.alive = new Set(info.players.map((_, i) => i));
  }
  onInput(from, m) { if (!this.alive.has(from)) return; this.inputs[from] = { px: m.x, pz: m.z, tool: TOOLN2[m.tool] || m.tool, use: !!m.use, gift: !!m.gift, steady: !!m.steady, use2: !!m.use2, force: 1 }; }
  setLocal(id, inp) { this.inputs[id] = inp; }
  retire(id) { this.alive.delete(id); this.inputs[id] = {}; }
  start() { if (this.timer) return; this.timer = setInterval(() => this.tick(), 16); }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }
  send(data, o) { const now = performance.now(); this.tokens = Math.min(40, this.tokens + (now - this.lastFill) / 50); this.lastFill = now; if (this.tokens < 1) return false; this.tokens--; return this.hub.send(data, o); }
  tick() {
    if (this.finished) return; const t = this.hub.time(); if (!(t >= 0)) return;
    const target = Math.floor((t / 1000) * 60); let n = 0;
    while (this.sim.tick < target && n < 8 && !this.sim.over) { step(this.sim, this.inputs); n++; const evs = drainEvents(this.sim); this.queue.push(...evs); this.pendEv.push(...evs.filter((e) => e.e !== 'fx' || true)); }
    const ms = performance.now();
    if (!this.lastSnap || ms - this.lastSnap > 85) { this.lastSnap = ms; this.send(encodeSnap(this.sim, ++this.sn, this.last), { reliable: false }); }
    if (!this.lastKey || ms - this.lastKey > 250) { this.lastKey = ms; const evs = this.pendEv.splice(0).filter((e) => e.e !== 'spawn').slice(-20); this.send({ t: 'k', k: encodeKey(this.sim, evs) }, { reliable: true }); }
    if (this.sim.over && !this.finished) this.finish(this.sim.over === 'win');
  }
  finish(won) {
    if (this.finished) return; this.finished = true; const sim = this.sim, per = sim.score.per; const scores = {}, stats = {}, awards = [];
    const ids = this.info.players.map((_, i) => i); ids.forEach((i) => { const p = per[i] || { pts: 0, clean: 0, good: 0, sloppy: 0, mistakes: 0, stitches: 0 }; scores[i] = Math.max(0, Math.round(p.pts)); stats[i] = { POINTS: String(scores[i]), CLEAN: String(p.clean), STITCHES: String(p.stitches), MISTAKES: String(p.mistakes), SLOPPY: String(p.sloppy) }; });
    const best = (f, hi = true) => { let b = null; ids.forEach((i) => { const v = f(per[i] || {}); if (b === null || (hi ? v > f(per[b] || {}) : v < f(per[b] || {}))) b = i; }); return b; };
    awards.push({ id: best((p) => -(p.mistakes || 0) - (p.sloppy || 0) * 0.1), title: 'STEADIEST HAND', detail: 'FEWEST MISTAKES AT THE TABLE' }, { id: best((p) => p.stitches || 0), title: 'MOST STITCHES', detail: 'SEWED THE MOST WOUNDS SHUT' }, { id: best((p) => p.pts || 0), title: 'SAVED THE DAY', detail: 'HIGHEST SCORE ON THE TABLE' }, { id: best((p) => p.sloppy || 0), title: 'SLOPPIEST (KINDLY)', detail: 'GAVE THE NURSES MATERIAL' });
    const groups = []; [...ids].sort((a, b) => scores[b] - scores[a]).forEach((i) => { const g = groups[groups.length - 1]; if (g && scores[g[0]] === scores[i]) g.push(i); else groups.push([i]); });
    try { this.hub.finish({ standings: groups, scores, won: !!won, stats, awards: awards.filter((a) => a.id !== null && a.id !== undefined) }); } catch (e) {}
    this.stop();
  }
}
const TOOLN2 = ['scalpel', 'forceps', 'suture', 'drain', 'syringe', 'gel', 'laser', 'scanner'];
