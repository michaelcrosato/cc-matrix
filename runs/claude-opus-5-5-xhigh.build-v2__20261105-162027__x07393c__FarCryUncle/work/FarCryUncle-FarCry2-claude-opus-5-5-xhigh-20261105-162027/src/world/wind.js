// One vector, a slow random walk: direction changes by up to 15 degrees a minute, speed 0 to 8 m/s. Missions can pin it.
import { clamp } from '../core/rng.js';
export class Wind {
  dir = 0.6; speed = 3.5; pinned = null; gust = 0; weatherBoost = 0;
  constructor(rng) { this.rng = rng; }
  reset() { this.dir = 0.6; this.speed = 3.5; this.pinned = null; this.weatherBoost = 0; }
  pin(dirXZ, speed) { this.pinned = { dir: Math.atan2(dirXZ[1], dirXZ[0]), speed }; this.dir = this.pinned.dir; this.speed = speed; }
  unpin() { this.pinned = null; }
  step(dt) {
    if (this.pinned) { this.dir = this.pinned.dir; this.speed = this.pinned.speed; return; }
    const r = this.rng;
    this.dir += (r.range(-1, 1) * (15 * Math.PI / 180) / 60) * dt * 8 * 0.35;
    this.speed = clamp(this.speed + r.range(-1, 1) * 0.35 * dt * 4 * 0.25, 0, 8);
  }
  get x() { return Math.cos(this.dir); }
  get z() { return Math.sin(this.dir); }
  get vx() { return this.x * this.total; }
  get vz() { return this.z * this.total; }
  get total() { return clamp(this.speed + this.weatherBoost, 0, 12); }
}
