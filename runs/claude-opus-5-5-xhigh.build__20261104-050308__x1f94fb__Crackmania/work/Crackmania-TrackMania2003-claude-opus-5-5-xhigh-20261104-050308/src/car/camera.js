// CRACKMANIA cameras (PLAN §4.5): far chase, close chase, hood (loop-safe: they carry their own up, engine change E2),
// the flyover, the finish orbit, TV cameras, a free orbit. Worked out in the steps; drawn part way (game.alpha)
import { CFG } from '../config.js';
import { add, sub, mul, dot, cross, norm, len, lerp3, clamp } from '../lib/v3.js';
const U = 16, Z = [0, 0, 1];
export const MODES = ['far', 'close', 'hood'];
export class ChaseCam {
  constructor() { this.mode = 'far'; this.fc = [1, 0, 0]; this.uc = [0, 0, 1]; this.pos = null; this.look = null; this.up = [0, 0, 1]; this.fov = 70; this.prev = null; this.cut = true; }
  snap() { this.cut = true; }
  /** one step: car (sim state); ph (TrackPhysics, to pull in before walls) */
  update(car, dt, ph, o = {}) {
    const k1 = Math.min(1, 6 * dt), k2 = Math.min(1, 4 * dt), sp = len(car.v), vh = sp > 1 ? mul(car.v, 1 / sp) : car.f;
    if (this.cut) { this.fc = car.f.slice(); this.uc = car.u.slice(); }
    if (car.grounded || car.flop > 0) { this.fc = norm(add(this.fc, sub(car.f, this.fc), k1)); this.uc = norm(add(this.uc, sub(car.u, this.uc), k2)); }
    else { this.fc = norm(add(this.fc, sub(sp > 4 ? vh : car.f, this.fc), Math.min(1, 3 * dt))); this.uc = norm(add(this.uc, sub(Z, this.uc), Math.min(1, 1.5 * dt))); }
    // keep up and forward square
    this.uc = norm(sub(this.uc, mul(this.fc, dot(this.uc, this.fc)))); if (!isFinite(this.uc[0])) this.uc = [0, 0, 1];
    const kmh = sp * 3.6, boost = car.boostT > 0 && !o.reduce ? 6 : 0;
    let pos, look, fov, up = this.uc;
    if (this.mode === 'hood') {
      pos = add(add(car.p, car.f, .6), car.u, 1.15); look = add(pos, car.f, 10); up = car.u; fov = 80 + (o.reduce ? 0 : 6 * clamp((kmh - 120) / 150, 0, 1));
    } else {
      const far = this.mode === 'far', T = add(add(car.p, car.u, 1.2), car.f, far ? 3 : 2), back = far ? CFG.camDist + .012 * sp : 4.2, hi = far ? CFG.camHeight : 1.3;
      pos = add(sub(T, mul(this.fc, back)), this.uc, hi); look = add(T, this.fc, 4);
      fov = (far ? CFG.camFov : 75) + (o.reduce ? 0 : CFG.camFovSpeed * clamp((kmh - 100) / 150, 0, 1) + boost);
      if (ph) { const d = sub(pos, T), L = len(d), h = ph.ray(T, mul(d, 1 / L), L, c => true); if (h && h.toi < L) pos = add(T, mul(d, 1 / L), Math.max(1.2, h.toi - .4)); }
    }
    if (this.cut || !this.pos) { this.prev = null; this.cut = false; } else this.prev = { pos: this.pos, look: this.look, up: this.up, fov: this.fov };
    this.pos = pos; this.look = look; this.up = up; this.fov = fov;
  }
  /** the pose for World3D (engine units), part way between the last two steps */
  pose(alpha = 1) { return poseOf(this.prev, { pos: this.pos, look: this.look, up: this.up, fov: this.fov }, alpha); }
}
export function poseOf(a, b, alpha = 1) {
  if (!b || !b.pos) return null;
  const k = a ? alpha : 1, P = a ? lerp3(a.pos, b.pos, k) : b.pos, L = a ? lerp3(a.look, b.look, k) : b.look, up = a ? norm(lerp3(a.up, b.up, k)) : b.up, fov = a ? a.fov + (b.fov - a.fov) * k : b.fov;
  const d = sub(L, P), yaw = Math.atan2(d[1], d[0]), pitch = Math.atan2(d[2], Math.hypot(d[0], d[1]));
  return { x: P[0] * U, y: P[1] * U, z: P[2] * U, yaw, pitch, fov, up, look: [L[0] * U, L[1] * U, L[2] * U], ortho: false };
}
/** a simple camera state: { pos, look, up, fov } stepped by the caller (flyover, orbit, TV, editor) */
export class FreeCam {
  constructor() { this.cur = null; this.prev = null; }
  set(pos, look, fov = 60, up = [0, 0, 1], cut = false) { this.prev = cut || !this.cur ? null : this.cur; this.cur = { pos, look, up, fov }; }
  pose(alpha = 1) { return poseOf(this.prev, this.cur, alpha); }
}
/** TV cameras along a route: spots every ~5 blocks, 25 m aside and 6 m up; the nearest with a clear view films */
export function tvSpots(samples, ph) {
  const out = []; if (!samples.length) return out;
  for (let i = 10; i < samples.length; i += 70) {
    const s = samples[i], side = (out.length % 2) ? 1 : -1, p = add(add(s.p, mul(s.r || [0, 1, 0], side * 25)), [0, 0, 6 + (s.p[2] > 4 ? 4 : 0)]);
    out.push({ p, i });
  }
  return out;
}
export function tvPick(spots, car, ph, cur) {
  let best = null, bd = 1e9;
  for (const s of spots) {
    const d = len(sub(s.p, car.p)); if (d > 140) continue;
    const dir = sub(add(car.p, [0, 0, 1]), s.p), L = len(dir), h = ph ? ph.ray(s.p, mul(dir, 1 / L), L - 3, c => true) : null; if (h) continue;
    const score = d - (s === cur ? 30 : 0); if (score < bd) { bd = score; best = s; }
  }
  return best;
}
