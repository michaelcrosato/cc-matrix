// A licence test attempt on top of RaceSim: start, judging, cones, boxes, medals. Plan section 6 (Licences).
import { RaceSim, getTrack } from './race.js';
import { aiDrive } from './sim.js';
import { defaultInstall } from './tuning.js';
const wrap = (a, L) => ((a % L) + L) % L;
export function resolveS(tr, sec) { if (!sec) return null; return sec[0] === 'C' ? wrap(tr.cornerS[sec[1]] + sec[2], tr.length) : wrap(sec[1], tr.length); }
export class TestRun {
  constructor(test, { runIndex = 0, demo = false, install = null, seed = 1, skill = 0.97 } = {}) {
    this.test = test; this.demo = demo; this.runIndex = runIndex; this.carId = (test.cars ?? [test.carId])[runIndex];
    const probe = getTrack(test.track).tr, L = probe.length; this.L = L;
    this.sA = resolveS(probe, test.a); this.sB = test.b ? resolveS(probe, test.b) : null; this.span = this.sB != null ? wrap(this.sB - this.sA, L) : null;
    const inst = install ?? { ...defaultInstall(), tyre: test.tyre ?? null };
    const flying = test.start === 'flying', standing = test.start === 'standing';
    this.sim = new RaceSim({ track: test.track, laps: 1, seed, contact: false, start: standing ? 'flying' : 'flying', startS: flying ? L - 70 : this.sA, startSpeed: standing ? 0 : (test.startKmh ?? 60) / 3.6, laneT: 0, wearMul: 0.5, rain: false, noRecover: true, env: { wearRate: 0, fuelRate: 0 },
      field: [{ id: 'player', carId: this.carId, name: 'YOU', player: true, skill, install: inst, colour: 'red' }] });
    this.car = this.sim.cars[0]; this.car.ai = demo; this.car.skill = skill; this.sim.state = 'racing'; this.sim.greenAt = 0; this.car.crossings = flying ? 0 : 1;
    this.t = 0; this.started = flying ? false : !standing; this.done = false; this.passed = false; this.reason = ''; this.time = null; this.penalty = 0; this.offT = 0; this.lastD = 0; this.moved = false; this.cones = [];
    if (test.cones) for (let k = 0; k < test.cones.n; k++) this.cones.push({ s: wrap(test.cones.s0 + k * test.cones.gap, L), hit: false });
    this.events = []; if (demo) this.car.custom = (car, sim) => this.demoInput(car, sim);
    this.runTimes = []; this.maxT = (test.lap ? 400 : 240);
  }
  dist(s) { return wrap(s - this.sA, this.L); }
  demoInput(car, sim) {
    const c = car.c, t = this.test, tr = sim.tr, u = Math.hypot(c.vx, c.vz), kind = t.demo;
    const base = aiDrive(c, tr, sim.line, car.prof, { skill: car.skill, lane: kind === 'weave' ? 2.4 * Math.cos((Math.PI * (c.loc.s - t.cones.s0)) / t.cones.gap) : 0, tcs: 0.7, asm: 0.6 }, null);
    if (kind === 'stop') { const stop = (t.box[0] + t.box[1]) / 2 - 3, dist = stop - c.loc.s, a = t.id === 'B-1' ? 8.5 : 7.5, vT = Math.sqrt(2 * a * Math.max(0, dist)); base.throttle = u < vT - 1 ? 1 : 0; base.brake = u > vT ? Math.min(t.id === 'B-1' ? 0.8 : 1, 0.2 + (u - vT) / 3) : 0; base.abs = t.assists?.abs !== false; if (dist < 0.5 && u < 1) { base.brake = 1; base.throttle = 0; } if (t.id === 'C-1') { base.throttle = Math.min(base.throttle, u < 28 ? 1 : 0.7); } base.steer = 0; }
    if (kind === 'weave') { base.throttle = Math.min(base.throttle, u < 13.9 ? 0.6 : 0.2); }
    return base;
  }
  step(input, dt = 1 / 60) {
    if (this.done) return; const sim = this.sim, car = this.car, c = car.c, tr = sim.tr, test = this.test;
    sim.step({ player: input }, dt); this.events = sim.events.slice(); const u = Math.hypot(c.vx, c.vz), d = this.dist(c.loc.s);
    if (!this.started) { // standing: first movement; flying: crossing the line
      if (test.start === 'standing') { if (u > 0.3 || (input?.throttle ?? 0) > 0.2) { this.started = true; } } else if (test.start === 'flying') { if (car.crossings >= 1) { this.started = true; this.t = 0; } }
      if (!this.started) { if (test.start === 'flying') this.t = 0; return; }
    }
    this.t += dt;
    if (u > 1) this.moved = true;
    for (const k of this.cones) if (!k.hit) { let ds = wrap(c.loc.s - k.s + this.L / 2, this.L) - this.L / 2; if (Math.abs(ds) < 2.4 && Math.abs(c.loc.t) < 1.45) { k.hit = true; this.penalty += test.penalty ?? 1; this.events.push({ type: 'cone', s: k.s }); } }
    // limits
    if (test.limits?.off && !c.onTrack) { this.offT += dt; if (this.offT > 1.0) return this.finishRun(false, 'OFF THE ROAD'); } else this.offT = Math.max(0, this.offT - dt);
    if (test.limits?.wall && c.wallHits > 0) return this.finishRun(false, 'TOUCHED THE WALL');
    if (car.failed) return this.finishRun(false, 'RECOVERED');
    if (this.t > this.maxT) return this.finishRun(false, 'TIME');
    // finish conditions
    if (test.lap) { if (car.crossings >= 2) return this.finishRun(true); }
    else if (test.box) { const [b0, b1] = test.box; if (this.moved && u < 0.35) { const s = c.loc.s; return this.finishRun(s >= b0 && s <= b1, s < b0 ? 'STOPPED SHORT OF THE BOX' : s > b1 ? 'STOPPED PAST THE BOX' : ''); } if (c.loc.s > b1 + 40 && u > 0.5 && c.loc.s < this.L / 2) return this.finishRun(false, 'DROVE PAST THE BOX'); }
    else if (this.span != null) { if (d >= this.span - 0.01 && this.lastD < this.span / 2 + this.L / 4) return this.finishRun(true); }
    this.lastD = d;
  }
  finishRun(ok, reason = '') { this.done = true; this.passed = ok; this.reason = reason; this.time = ok ? this.t + this.penalty : null; this.sim.events.push({ type: 'testEnd', ok }); return null; }
}
// Runs a whole test (all cars) with the demo driver. Returns { time, ok, runs }.
export function runDemo(test, skill = 0.97) {
  let total = 0, runs = []; const n = (test.cars ?? [test.carId]).length;
  for (let r = 0; r < n; r++) { const tr = new TestRun(test, { runIndex: r, demo: true, skill }); for (let i = 0; i < 60 * tr.maxT && !tr.done; i++) tr.step(null); if (!tr.passed) return { ok: false, reason: tr.reason, runs }; runs.push(tr.time); total += tr.time; }
  return { ok: true, time: total, runs };
}
