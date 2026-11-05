// A run: the countdown, the clock in whole steps (120 a second), the checkpoints in order, the finish, respawn to the
// last checkpoint (the clock keeps running), restart to the start, falls, boost pads and the ghost (30 a second).
import { U, add, scale, len } from '../lib/vec.js';
import { stepCar, resetCar, TUNE } from '../car/sim.js';
import { nearestSample } from '../track/turtle.js';

export const STEP_HZ = 120, GHOST_EVERY = 4;   // the ghost is kept at 30 a second
export const COUNT = ['READY', '3', '2', '1', 'GO!'];

/** the car's place on the track at sample i: its position (engine units, lifted by the ride), frame */
function placeAt(T, i) {
  const p = scale(T.P[i], U), up = T.U[i];
  return { p: add(p, up, TUNE.ride * U), f: T.F[i], u: up };
}

export class Run {
  constructor(T, car, o = {}) {
    this.T = T; this.car = car; this.ghost = o.ghost || null; this.tune = o.tune || TUNE;
    this.gates = T.gates.map(g => g.i);                  // the checkpoints in order; the last is the finish
    this.reset();
  }
  reset() {
    this.phase = 'count'; this.countT = 0; this.steps = 0; this.nextGate = 0; this.lastGate = -1; this.lastCount = -1;
    this.splits = []; this.respawns = 0; this.bot = 0; this.progress = 0; this.recorded = []; this.lastNote = null;
    this.finished = false; this.finishSteps = 0; this.fallT = 0; this.events = [];
    this.placeCar(0);
  }
  placeCar(i) {
    const pl = placeAt(this.T, i);
    resetCar(this.car, pl.p, pl.f, pl.u);
    this.progress = i;
  }
  /** respawn: to the last checkpoint passed, standing; the clock keeps going */
  respawn() {
    if (this.phase !== 'run') return;
    this.respawns++; this.placeCar(this.lastGate >= 0 ? this.gates[this.lastGate] : 0); this.events.push('respawn');
  }
  /** restart: to the start, and the countdown again */
  restart() {
    this.reset(); this.events.push('restart');
  }
  /** one fixed step: ctl = { steer, gas, brake } from the player or the bot */
  step(dt, ctl, phys) {
    const car = this.car, T = this.T;
    this.events = [];
    if (this.phase === 'count') {
      this.countT += dt;
      const k = Math.floor(this.countT);
      if (this.countT >= COUNT.length - 1) { this.phase = 'run'; this.events.push('go'); }
      else if (k !== this.lastCount) { this.lastCount = k; this.events.push('count:' + k); }
      stepCar(car, { steer: 0, gas: 0, brake: 0 }, dt, phys, this.tune);   // (it waits where it was placed)
      return;
    }
    if (this.phase === 'run') {
      this.steps++;
      stepCar(car, ctl, dt, phys, this.tune);
      car.spin = (car.spin || 0) + len(car.v) / U * dt / .42;          // wheels turn with the road covered
      car.bob = Math.max(-.08, Math.min(.08, -(car.v[2] / U) * .004));  // the body dips on the throttle and rises in the air
      if (car.boostT === 0 && car.grounded && T.Boost[this.progress]) { car.boostT = TUNE.boostTime; this.events.push('boost'); }
      const near = nearestSample(T, scale(car.p, 1 / U), this.progress, 25, 60);
      if (near.dist < 14) this.progress = near.i;
      if (car.landed) this.events.push('land');
      // checkpoints in order
      while (this.nextGate < this.gates.length && this.progress >= this.gates[this.nextGate] - 1) {
        this.nextGate++;
        if (this.nextGate < this.gates.length) { this.lastGate = this.nextGate - 1; this.splits.push(this.steps); this.events.push('gate'); }
      }
      if (this.nextGate >= this.gates.length && !this.finished) {
        this.finished = true; this.finishSteps = this.steps; this.phase = 'done'; this.events.push('finish');
      }
      // a fall: below the road, or airborne for too long, is a respawn
      if (!car.grounded) this.fallT += dt; else this.fallT = 0;
      if (this.fallT > 2.2 || car.p[2] < -300) { this.fallT = 0; this.respawn(); }
      if (this.ghost && this.steps % GHOST_EVERY === 0) this.recorded.push(this.sample());
      if (this.recorded.length === 0 && this.steps === 1 && this.ghost) this.recorded.push(this.sample());
      return;
    }
    // done: the car coasts to a stop
    stepCar(car, { steer: 0, gas: 0, brake: .5 }, dt, phys, this.tune);
  }
  sample() { const c = this.car; return { p: c.p.map(v => Math.round(v * 4) / 4), f: c.f.map(v => +v.toFixed(3)), u: c.u.map(v => +v.toFixed(3)) }; }
  /** the clock as ms (integer steps) */
  ms() { return Math.round(this.steps * 1000 / STEP_HZ); }
  speedKmh() { return len(this.car.v) / U * 3.6; }
  countText() { const k = Math.floor(this.countT); return COUNT[Math.min(k, COUNT.length - 1)]; }
}

/** a ghost's pose at step s (interpolated), or null */
export function ghostAt(g, step) {
  if (!g || !g.frames.length) return null;
  const i = Math.min(g.frames.length - 1, Math.floor(step / GHOST_EVERY)), a = g.frames[i], b = g.frames[Math.min(g.frames.length - 1, i + 1)];
  const t = (step / GHOST_EVERY) - i;
  return { p: a.p.map((v, k) => v + (b.p[k] - v) * t), f: a.f, u: a.u };
}
