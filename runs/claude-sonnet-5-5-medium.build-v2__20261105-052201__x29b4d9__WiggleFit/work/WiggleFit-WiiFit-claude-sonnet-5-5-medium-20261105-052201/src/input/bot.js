import { gauss, fresh } from '../core/rng.js';
export const SKILLS = {
  sharp: { delay: 0.16, gain: 1.4, loadGain: 0.7, noise: 0, lag: 0.12, speedErr: 0.3, timing: 0.028 },
  average: { delay: 0.26, gain: 1.0, loadGain: 0.55, noise: 0.03, lag: 0.28, speedErr: 0.8, timing: 0.055 },
  clumsy: { delay: 0.38, gain: 0.8, loadGain: 0.45, noise: 0.07, lag: 0.5, speedErr: 1.4, timing: 0.095 },
};
// The human model: sees the dot `delay` seconds ago and corrects toward the goal.
export class Bot {
  constructor(skill = 'average', seed = 1) { this.skill = typeof skill === 'string' ? SKILLS[skill] : skill; this.name = typeof skill === 'string' ? skill : 'custom'; this.hist = []; this.t = 0; this.r = fresh('bot', seed); this.ph = this.r() * 6; }
  gaussT() { return gauss(this.r) * this.skill.timing; }
  // goal and cob in disc units
  steer(goalX, goalZ, cobX, cobZ, dt, load = false) {
    this.t += dt; this.hist.push([this.t, cobX, cobZ]); while (this.hist.length > 2 && this.hist[1][0] < this.t - this.skill.delay) this.hist.shift();
    const d = this.hist[0]; const g = load ? this.skill.loadGain : this.skill.gain; const n = this.skill.noise;
    let wx = goalX + g * (goalX - d[1]) + n * Math.sin(this.t * 2.3 + this.ph), wz = goalZ + g * (goalZ - d[2]) + n * Math.sin(this.t * 1.9 + this.ph * 1.3);
    const m = Math.hypot(wx, wz); if (m > 1) { wx /= m; wz /= m; } return [wx, wz];
  }
}
