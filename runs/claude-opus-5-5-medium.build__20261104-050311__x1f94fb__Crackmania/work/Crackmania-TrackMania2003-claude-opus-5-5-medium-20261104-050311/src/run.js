// A run: countdown, the step clock, checkpoints (once each, any order, either way), the finish (forward, all CPs),
// respawn (last CP, clock running) and restart; plus the autopilot that drives a run (tests, medals, rivals, attract).
import { BLOCKS } from './blocks.js';
import { makeCar, placeCar, stepCar, kmh } from './car.js';
import { carSI, CFG } from './config.js';
import { sampleRoute, plan, nearest } from './route.js';
import { dot, sub, add, cross, norm, len, clamp, rng, scale, rotate } from './v3.js';
import { worldToCell } from './track.js';

export const STEP = 1 / 120;
export const fmt = steps => { if (steps == null || !isFinite(steps)) return '-:--.--'; const cs = Math.floor(steps * 100 / 120), m = Math.floor(cs / 6000), s = Math.floor(cs / 100) % 60, c = cs % 100; return m + ':' + String(s).padStart(2, '0') + '.' + String(c).padStart(2, '0'); };
export const fmtDelta = d => (d < 0 ? '-' : '+') + (Math.floor(Math.abs(d) * 100 / 120) / 100).toFixed(2);

/** everything a track needs to be raced (shared by every run on it) */
export class Course {
  constructor(track, geo, phys) {
    this.track = track; this.geo = geo; this.phys = phys;
    this.route = track.route();
    this.samples = this.route.ok ? sampleRoute(track, this.route) : [];
    this.gates = geo.gates.filter(g => g.kind === 'CP' || g.kind === 'FN').map((g, i) => ({ ...g, i }));
    this.cps = this.gates.filter(g => g.kind === 'CP');
    const st = this.route.list[0];
    this.spawn = st ? track.frame(st, BLOCKS.ST.spawn) : null;
    this.startGate = st ? track.frame(st, BLOCKS.ST.gate) : null;
    this.length = this.samples.length ? this.samples[this.samples.length - 1].d : 0;
    this.plans = {};
  }
  plan(carId, skill) { const k = carId + ':' + skill.toFixed(3); return this.plans[k] || (this.plans[k] = plan(this.samples, carId, skill)); }
}

export class Run {
  constructor(course, carId, o = {}) {
    this.course = course; this.carId = carId; this.o = o;
    const sp = course.spawn, ln = o.lane || 0;   // split screen: cars side by side on the grid
    this.spawn = ln ? { p: add(sp.p, sp.r, ln), t: sp.t, u: sp.u, r: sp.r } : sp;
    this.car = makeCar(carId, this.spawn);
    this.reset(o.countdown ?? 3);
  }
  reset(countdown = 3) {
    placeCar(this.car, this.spawn); this.car.held = true;
    this.phase = countdown > 0 ? 'countdown' : 'racing'; this.cd = countdown; this.steps = 0; this.respawns = 0;
    this.passed = new Set(); this.splits = []; this.lastCp = null; this.finished = false; this.finishSteps = null;
    this.events = []; this.prev = this.car.p.slice(); this.progress = 0; this.idx = 0; this.stillT = 0; this.missingShown = false;
    this.outT = 0; this.respawnFx = 0;
    if (this.phase === 'racing') this.car.held = false;
  }
  /** one fixed step with the controls */
  step(ctl, dt = STEP) {
    this.events.length = 0;
    if (this.phase === 'countdown') {
      const before = Math.ceil(this.cd); this.cd -= dt; const after = Math.ceil(this.cd);
      if (after !== before && after > 0) this.events.push(['count', after]);
      if (this.cd <= 0) { this.phase = 'racing'; this.car.held = false; this.events.push(['go']); }
    }
    const c = this.car, phys = this.course.phys;
    this.prev = c.p.slice();
    stepCar(c, ctl, dt, phys);
    for (const e of c.events) this.events.push(e);
    if (this.phase === 'racing') { this.steps++; this.gates(); }
    // progress along the route
    const S = this.course.samples;
    if (S.length) { const n = nearest(S, c.p, this.idx, 8, 40); if (n.d2 < 30 * 30) { this.idx = n.i; this.progress = S[n.i].d; } }
    // out of bounds: fell in a canyon or the water
    const [cx, cy] = worldToCell(c.p[0], c.p[1]), ch = this.course.geo.chasms[cx + ',' + cy];
    if ((ch === 'water' && c.p[2] < -1.2) || c.p[2] < -25) {
      if (this.outT === 0) this.events.push([ch === 'water' && c.p[2] > -10 ? 'splash' : 'fall', c.p.slice()]);
      this.outT += dt; if (this.outT > .4) { this.outT = 0; this.respawn(); }
    }
    this.stillT = kmh(c) < 4 && this.phase === 'racing' ? this.stillT + dt : 0;
    if (this.respawnFx > 0) this.respawnFx -= dt;
  }
  gates() {
    const c = this.car, a = this.prev, b = c.p;
    for (const g of this.course.gates) {
      const da = dot(sub(a, g.p), g.t), db = dot(sub(b, g.p), g.t);
      if ((da < 0) === (db < 0)) continue;
      const k = da / (da - db), q = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k], rel = sub(q, g.p);
      if (Math.abs(dot(rel, g.r)) > g.hw + 1.5 || dot(rel, g.u) < -2 || dot(rel, g.u) > 8) continue;
      if (g.kind === 'CP') {
        if (this.passed.has(g.i)) continue;
        this.passed.add(g.i); this.lastCp = g; this.splits.push(this.steps);
        this.events.push(['cp', this.passed.size, this.steps, g]);
      } else if (g.kind === 'FN' && da < 0 && db >= 0) {
        if (this.passed.size < this.course.cps.length) { if (!this.missingShown) { this.events.push(['missing']); this.missingShown = true; } continue; }
        this.finished = true; this.finishSteps = this.steps; this.phase = 'finished'; this.events.push(['finish', this.steps]);
      }
    }
  }
  respawn() {
    const g = this.lastCp, c = this.car;
    if (g) { placeCar(c, { p: add(g.p, g.t, -6), t: g.t, u: g.u, r: g.r }); }
    else placeCar(c, this.spawn);
    if (this.phase === 'countdown') c.held = true;
    this.respawns++; this.events.push(['respawn']); this.respawnFx = .5;
    const S = this.course.samples; if (S.length) { const n = nearest(S, c.p, 0, 0, S.length); this.idx = n.i; }
  }
  get cpCount() { return this.passed.size; }
}

/** the autopilot: drives a run along the racing line. skill 0..1; cheats: lane snap, extra grip, instant respawn */
export class Bot {
  constructor(run, o = {}) {
    this.run = run; this.skill = o.skill ?? 1; this.cheat = !!o.cheat; this.rnd = rng(o.seed || 1); this.idx = 0; this.offT = 0; this.slowT = 0; this.jit = 0;
    this.late = o.late || 0;
    this.plan = run.course.plan(run.carId, this.skill);
  }
  control() {
    const R = this.run, c = R.car, S = R.course.samples, P = this.plan, T = carSI(R.carId);
    if (!S.length) return { steer: 0, gas: 0, brake: 0 };
    const n = nearest(S, c.p, this.idx, 6, 30); this.idx = n.i;
    const sp = len(c.v);
    if (!c.grounded) return { steer: 0, gas: 1, brake: 0 };
    // lookahead target on the line
    if (this.skill < 1 && R.steps % 30 === 0) this.jit = (this.rnd() - .5) * .8 * (1 - this.skill);
    const look = 6 + .35 * sp + this.jit;
    let j = this.idx; while (j < S.length - 1 && S[j].d - S[this.idx].d < look) j++;
    const tp = P.pts[j], d = sub(tp, c.p), r = cross(c.u, c.f);
    const along = dot(d, c.f), side = dot(d, r), alpha = Math.atan2(side, Math.max(.1, along));
    const dmax = T.dlo + (T.dhi - T.dlo) * Math.pow(clamp(Math.abs(sp) / T.vtop, 0, 1), .7);
    const steer = clamp(1.6 * alpha / dmax, -1, 1);
    // target speed: the profile a little ahead
    let k = this.idx, target = 1e9; while (k < S.length && S[k].d - S[this.idx].d < 3 + sp * .15 + this.late) { target = Math.min(target, P.v[k]); k++; }
    let gas = 0, brake = 0;
    if (sp < target - .5) gas = 1; else if (sp > target + 1) brake = clamp((sp - target) / 5, 0, 1); else gas = .3;
    // recovery
    const lat = Math.abs(dot(sub(c.p, S[this.idx].p), S[this.idx].r));
    this.offT = lat > S[this.idx].hw + 4 || n.d2 > 400 ? this.offT + STEP : 0;
    this.slowT = R.phase === 'racing' && sp < 1 ? this.slowT + STEP : 0;
    if (this.cheat) {   // lane snap: pull toward the line
      const e = sub(P.pts[this.idx], c.p), lat2 = dot(e, r); c.p = add(c.p, r, clamp(lat2, -4 * STEP, 4 * STEP));
    }
    if (this.offT > (this.cheat ? .2 : .6) || this.slowT > 1.5) { this.offT = 0; this.slowT = 0; R.respawn(); this.idx = R.idx; return { steer: 0, gas: 0, brake: 0 }; }
    return { steer, gas, brake };
  }
}

/** run the bot to the finish (or a time limit): { steps, finished, respawns, ghost } */
export function botRun(course, carId, o = {}) {
  const run = new Run(course, carId, { countdown: 0 }), bot = new Bot(run, o), max = (o.limit || 240) * 120;
  const rec = o.record ? o.record(run) : null;
  for (let i = 0; i < max && !run.finished; i++) { run.step(bot.control()); if (rec) rec.sample(run); }
  return { steps: run.finished ? run.finishSteps : null, finished: run.finished, respawns: run.respawns, run, ghost: rec };
}
