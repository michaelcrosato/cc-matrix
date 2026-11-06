// The human model: a delayed correction. Sees the dot `delay` seconds ago.
import { mulberry32 } from '../core/rng.js';
export const SKILLS = {
  sharp:   { delay: .16, gain: 1.4, gainLoad: .7, noise: 0, lag: .12, speedErr: .3, timing: .028, trackErr: .05, cadence: .03 },
  average: { delay: .26, gain: 1, gainLoad: .55, noise: .03, lag: .28, speedErr: .8, timing: .055, trackErr: .12, cadence: .08 },
  clumsy:  { delay: .38, gain: .8, gainLoad: .45, noise: .07, lag: .5, speedErr: 1.4, timing: .095, trackErr: .2, cadence: .16 },
};
export class Brain {
  constructor(skill = 'average', seed = 1) { this.name = skill; this.s = SKILLS[skill] || SKILLS.average; this.hist = []; this.t = 0; this.r = mulberry32(seed * 977 + 13); this.mem = {}; this.gaussSpare = null; }
  gauss() { const u = Math.max(1e-6, this.r()), v = this.r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185 * v); }
  /** Each tick: record the dot; returns [wishX, wishZ] toward goal. */
  correct(dt, lane, gx, gz, load = false, gainScale = 1) {
    this.t += dt; const dotX = lane.bal ? lane.bal.cobX : 0, dotZ = lane.bal ? lane.bal.cobZ : 0;
    this.hist.push({ t: this.t, x: dotX, z: dotZ });
    while (this.hist.length > 2 && this.hist[1].t < this.t - this.s.delay) this.hist.shift();
    const seen = this.hist[0];
    const g = (load ? this.s.gainLoad : this.s.gain) * gainScale * (this.gainMul ?? 1);
    const n = this.s.noise;
    const wx = gx + g * (gx - seen.x) + n * Math.sin(this.t * Brain.noiseX + 1.3);
    const wz = gz + g * (gz - seen.z) + n * Math.sin(this.t * Brain.noiseZ + .4);
    const m = Math.hypot(wx, wz); return m > 1 ? [wx / m, wz / m] : [wx, wz];
  }
  timingError() { return this.gauss() * this.s.timing; }
}
Brain.noiseX = 1.8; Brain.noiseZ = 2; // The plan does not state these. Scores are sensitive to them: see notes/art-pass.md.
