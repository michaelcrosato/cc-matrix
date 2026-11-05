// Cameras, worked out in the fixed steps (metres), handed to the 3D engine's 'fixed' camera in engine units with their
// own up vector (engine change E2): far chase, close chase, hood, the intro flyover, the finish orbit, TV, free orbit.
import { add, sub, scale, norm, dot, cross, len, clamp, lerp3 } from './v3.js';
import { CFG } from './config.js';
import { U } from './v3.js';

export const CAM_MODES = ['far', 'close', 'hood'];
export class ChaseCam {
  constructor() { this.mode = 'far'; this.fc = null; this.uc = null; this.pos = null; this.look = null; this.fov = 70; this.up = [0, 0, 1]; this.shake = 0; }
  reset(car) { this.fc = car.f.slice(); this.uc = car.u.slice(); this.pos = null; }
  /** follow a car (sim state) one step; phys for pulling in past the track */
  follow(car, dt, phys, o = {}) {
    if (!this.fc) this.reset(car);
    const spd = len(car.v), kmh = spd * 3.6;
    if (car.grounded || car.flop > 0) {
      this.fc = norm(add(this.fc, sub(car.f, this.fc), Math.min(1, 6 * dt)));
      this.uc = norm(add(this.uc, sub(car.u, this.uc), Math.min(1, 4 * dt)));
    } else {
      const vh = spd > 2 ? scale(car.v, 1 / spd) : car.f;
      this.fc = norm(add(this.fc, sub(vh, this.fc), Math.min(1, 3 * dt)));
      this.uc = norm(add(this.uc, sub([0, 0, 1], this.uc), Math.min(1, 1.5 * dt)));
    }
    // keep fc square to uc
    this.fc = norm(sub(this.fc, scale(this.uc, dot(this.fc, this.uc))));
    let fov = CFG.camFov + CFG.camFovSpeed * clamp((kmh - 100) / 150, 0, 1) + (car.boostT > 0 ? 6 : 0);
    if (o.reduceMotion) fov = CFG.camFov;
    if (this.mode === 'hood') {
      this.pos = add(add(car.p, car.f, .6), car.u, 1.0); this.look = add(this.pos, car.f, 10); this.up = car.u.slice(); this.fov = 80; return;
    }
    const close = this.mode === 'close', dist = close ? 5 + .006 * spd : CFG.camDist + .012 * spd, hgt = close ? 1.6 : CFG.camHeight;
    const T = add(add(car.p, this.uc, 1.0), this.fc, 4);
    let pos = add(sub(car.p, scale(this.fc, dist)), this.uc, hgt);
    // pull in when the track is between the camera and the car
    if (phys) { const d = sub(pos, T), L = len(d); const h = phys.ray(T, scale(d, 1 / L), L); if (h && h.toi > .5) pos = add(T, scale(d, 1 / L), h.toi - .4); }
    this.pos = pos; this.look = T; this.up = this.uc.slice(); this.fov = close ? fov + 5 : fov;
  }
  /** look at a point from a point (flyovers, TV, orbits) */
  set(pos, look, fov = 60, up = [0, 0, 1]) { this.pos = pos; this.look = look; this.fov = fov; this.up = up; }
  /** the engine's fixed pose (engine units) */
  pose() {
    const p = this.pos || [0, 0, 100], l = this.look || [0, 0, 0], d = norm(sub(l, p));
    return { x: p[0] * U, y: p[1] * U, z: p[2] * U, yaw: Math.atan2(d[1], d[0]), pitch: Math.asin(clamp(d[2], -1, 1)), fov: this.fov, up: this.up.slice() };
  }
}
/** the intro flyover: rides 25 m above and 30 m beside the route from start to finish over `secs` */
export function flyover(cam, samples, k) {
  if (!samples.length) return;
  const e = k * k * (3 - 2 * k), i = Math.min(samples.length - 1, Math.floor(e * (samples.length - 1))), s = samples[i], j = Math.min(samples.length - 1, i + 15);
  const pos = add(add(s.p, s.r, -30), [0, 0, 25]), look = samples[j].p;
  cam.set(pos, look, 62);
}
/** an orbit round a point: angle a, distance d, height h */
export function orbit(cam, center, a, d, h, fov = 55) { cam.set([center[0] + Math.cos(a) * d, center[1] + Math.sin(a) * d, center[2] + h], [center[0], center[1], center[2] + 1], fov); }
/** TV cameras: spots beside the route every ~120 m, 25 m out and 6 m up; the nearest films */
export function tvSpots(samples) {
  const out = []; let next = 0;
  for (const s of samples) if (s.d >= next) { next += 120; const side = out.length % 2 ? 1 : -1; out.push(add(add(s.p, s.r, side * 24), [0, 0, 6 + (s.p[2] > 4 ? 6 : 0)])); }
  return out;
}
export function tv(cam, spots, target) {
  let best = spots[0], bd = 1e18; for (const s of spots) { const d = (s[0] - target[0]) ** 2 + (s[1] - target[1]) ** 2 + (s[2] - target[2]) ** 2; if (d < bd) { bd = d; best = s; } }
  if (!best) return;
  const dist = Math.sqrt(bd), fov = clamp(2 * Math.atan(9 / Math.max(10, dist)) * 180 / Math.PI * 1.5, 12, 60);
  cam.set(best, [target[0], target[1], target[2] + .6], fov);
}
