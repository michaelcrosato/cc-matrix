// CRACKMANIA run (PLAN §4.6): countdown, a step clock, gates (checkpoints once each in any order and either way; the
// finish only forward with every checkpoint), respawn at the last checkpoint with the clock running, restart, splits,
// the ghost recording, events for the HUD, sound and effects
import { newCar, placeCar, stepCar, tuning } from '../car/sim.js';
import { dot, sub, add, mul, len, cross } from '../lib/v3.js';
import { GhostRecorder } from './ghost.js';

export const STEP = 1 / 120;
export class Run {
  /** course: Course; model: car id; o: { countdown (s), best: { steps, splits } } */
  constructor(course, model, o = {}) {
    this.course = course; this.model = model; this.T = tuning(model);
    this.car = newCar(model); this.phase = 'countdown'; this.count = o.countdown ?? 3; this.countMax = this.count;
    this.steps = 0; this.cps = new Set(); this.cpOrder = []; this.splits = []; this.respawns = 0; this.finished = false; this.finishSteps = 0;
    this.last = null; this.ev = []; this.best = o.best || null; this.missingShown = false; this.oobT = 0; this.events = [];
    this.rec = new GhostRecorder(); this.held = 0;
    if (course.spawn) placeCar(this.car, course.spawn, this.T);
    this.rec.sample(this.car, 0, 0);
  }
  get racing() { return this.phase === 'racing'; }
  get cpTotal() { return this.course.cpCount; }
  /** one step: ctl { steer, gas, brake }; returns nothing; read this.ev for what happened (cleared by the caller) */
  step(ctl, dt = STEP) {
    const car = this.car, c = this.course;
    if (this.phase === 'countdown') {
      this.count -= dt;
      const was = Math.ceil(this.count + dt);
      if (Math.ceil(this.count) !== was && this.count > 0) this.ev.push({ type: 'count', n: Math.ceil(this.count) });
      if (this.count <= 0) { this.phase = 'racing'; this.ev.push({ type: 'go' }); }
      // held at the line: the engine revs, the car doesn't roll
      stepCar(car, { steer: 0, gas: 0, brake: 1 }, dt, c.ph, this.T, { assist: c.assistOf });
      if (c.spawn && car.grounded) { car.v = [0, 0, 0]; }
      this.held = ctl.gas || 0;
      return;
    }
    if (this.phase === 'finished') { stepCar(car, { steer: 0, gas: 0, brake: .6 }, dt, c.ph, this.T, { assist: c.assistOf }); this._drain(); return; }
    const p0 = car.p.slice();
    stepCar(car, ctl, dt, c.ph, this.T, { assist: c.assistOf, gripMul: ctl.gripMul });
    this.steps++;
    this._drain();
    // gates: the segment from where the car was to where it is through the gate's plane, within its width and height
    for (const g of c.gates) {
      const a = dot(sub(p0, g.p), g.t), b = dot(sub(car.p, g.p), g.t);
      if ((a < 0) === (b < 0) || a === b) continue;
      const k = a / (a - b), x = add(p0, sub(car.p, p0), k), dx = sub(x, g.p), lat = dot(dx, g.r), up = dot(dx, g.u);
      if (Math.abs(lat) > g.hw || up < -2 || up > 8) continue;
      const fwd = b > a;
      if (g.kind === 'cp') {
        if (this.cps.has(g.id)) continue;
        this.cps.add(g.id); this.cpOrder.push(g.id); this.splits.push(this.steps); this.last = { g, fwd };
        const bs = this.best && this.best.splits && this.best.splits[this.splits.length - 1];
        this.ev.push({ type: 'cp', i: this.splits.length, steps: this.steps, delta: bs ? this.steps - bs : null, g });
        this.rec.mark('cp', this.steps);
      } else if (fwd) {
        if (this.cps.size < c.cpCount) { if (!this.missingShown) { this.missingShown = true; this.ev.push({ type: 'missingCp' }); } continue; }
        this.phase = 'finished'; this.finished = true; this.finishSteps = this.steps;
        this.ev.push({ type: 'finish', steps: this.steps, delta: this.best ? this.steps - this.best.steps : null });
        this.rec.mark('finish', this.steps);
      }
    }
    // out of bounds: a canyon, the mill pond, off the world
    const water = c.chasmAt(car.p[0], car.p[1]) === 'water' && car.p[2] < -1.2;
    if (car.p[2] < -25 || water || Math.abs(car.p[2]) > 600) {
      if (this.oobT === 0) this.ev.push({ type: water ? 'splash' : 'fall' });
      this.oobT += dt; if (this.oobT > (water ? .25 : .4)) { this.respawn(); }
    } else this.oobT = 0;
    if (this.steps % 4 === 0) this.rec.sample(car, this.steps);
  }
  _drain() { for (const e of this.car.ev) this.ev.push(e); this.car.ev.length = 0; }
  /** back to the last checkpoint passed (or the start), standing, the clock still running */
  respawn() {
    const c = this.course, car = this.car;
    if (this.last) {
      const g = this.last.g, t = this.last.fwd ? g.t : mul(g.t, -1);
      placeCar(car, { p: sub(g.p, [0, 0, 0]), t, u: g.u }, this.T);
      car.p = add(car.p, t, 1);
    } else if (c.spawn) placeCar(car, c.spawn, this.T);
    this.respawns++; this.oobT = 0; this.ev.push({ type: 'respawn' }); this.rec.mark('respawn', this.steps);
  }
  /** seconds on the clock */
  get time() { return (this.finished ? this.finishSteps : this.steps) / 120; }
}
/** M:SS.cc from steps (hundredths rounded down) */
export function fmt(steps, sign = false) {
  if (steps === null || steps === undefined) return '-:--.--';
  const neg = steps < 0, cs = Math.floor(Math.abs(steps) * 100 / 120), m = Math.floor(cs / 6000), s = Math.floor(cs / 100) % 60, c = cs % 100;
  const t = (m ? m + ':' + String(s).padStart(2, '0') : String(s)) + '.' + String(c).padStart(2, '0');
  return sign ? (neg ? '-' : '+') + t : (m ? '' : '0:') + t.padStart(m ? 0 : 5, '0');
}
