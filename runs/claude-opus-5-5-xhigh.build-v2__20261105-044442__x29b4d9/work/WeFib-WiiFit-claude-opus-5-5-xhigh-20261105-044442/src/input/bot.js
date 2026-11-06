import { mulberry32 } from '../core/rng.js';

// The human model behind every skill number: a delayed correction with noise.
export const SKILLS = {
  sharp: { delay: 0.16, gain: 1.4, gainLoad: 0.7, noise: 0, tremble: 1, see: 0.04, lag: 0.12, speedErr: 0.3, timing: 0.028 },
  average: { delay: 0.26, gain: 1.0, gainLoad: 0.55, noise: 0.03, tremble: 1.1, see: 0.09, lag: 0.28, speedErr: 0.8, timing: 0.055 },
  clumsy: { delay: 0.38, gain: 0.8, gainLoad: 0.45, noise: 0.07, tremble: 0.95, see: 0.095, lag: 0.5, speedErr: 1.4, timing: 0.095 },
};

// see: reading the dot takes a moment on top of the table's delay, longer for slower hands, except under load, where the plan
// measured its own delay and gain. see and tremble (a rate the plan leaves open) were swept against the plan's measured skills.
export function makeBot(skill, seedExtra = 0) { return new Bot(skill, seedExtra); }

export class Bot {
  constructor(skill = 'average', seedExtra = 0) {
    this.skillName = skill; this.s = SKILLS[skill] || SKILLS.average;
    this.r = mulberry32(((skill.length * 7919) ^ (seedExtra * 104729) ^ 0xBEEF) >>> 0);
    this.hist = []; this.t = 0; this.dotX = 0; this.dotZ = 0;
    this.data = {};
    this.ph = this.r() * 6.28; this.ph2 = this.r() * 6.28;
  }
  /** See the dot, a moment late. Keeps a little history: what is seen depends on what you are doing. */
  observe(lane, dt) {
    this.t += dt;
    this.step = dt;
    this.hist.push(lane.dotX, lane.dotZ);
    const n = Math.round((this.s.delay + 0.15) / dt);
    if (this.hist.length > n * 2) this.hist.splice(0, this.hist.length - n * 2);
  }
  /** The dot as it was: the table's delay, plus the moment it takes to read it. */
  seen(load) {
    const back = Math.max(1, Math.round((this.s.delay + (load ? 0 : this.s.see)) / (this.step || 1 / 120)));
    const i = Math.max(0, this.hist.length - back * 2);
    this.dotX = this.hist[i] ?? 0; this.dotZ = this.hist[i + 1] ?? 0;
  }
  /** wish = goal + gain × (goal − dot) + noise × sin(...) */
  steer(gx, gz, load = false) {
    this.seen(load);
    const g = load ? this.s.gainLoad : this.s.gain, n = this.s.noise;
    let x = gx + g * (gx - this.dotX) + n * Math.sin(this.t * 2 * this.s.tremble + this.ph);
    let z = gz + g * (gz - this.dotZ) + n * Math.sin(this.t * 1.65 * this.s.tremble + this.ph2);
    const m = Math.hypot(x, z);
    if (m > 1) { x /= m; z /= m; }
    return [x, z];
  }
  /** A plain push toward a spot, with no correction: what you do when there is no time to watch the dot. */
  aim(gx, gz) {
    const n = this.s.noise;
    let x = gx + n * Math.sin(this.t * 2 * this.s.tremble + this.ph), z = gz + n * Math.sin(this.t * 1.65 * this.s.tremble + this.ph2);
    const m = Math.hypot(x, z);
    if (m > 1) { x /= m; z /= m; }
    return [x, z];
  }
  /** Breathing with the ring: sharp always, average mostly, clumsy for one cycle in two. */
  breathe(lane) {
    if (lane.noBreath) return false;
    const off = this.s.lag > 0.4 ? this.t % 16 < 8 : this.s.lag > 0.2 ? this.t % 24 < 4 : false;
    return off ? false : lane.breath.growing;
  }
  /** A gaussian-ish timing error in seconds. */
  timing() { return (this.r() + this.r() + this.r() - 1.5) * 2 * this.s.timing; }
  chance(p) { return this.r() < p; }
}
