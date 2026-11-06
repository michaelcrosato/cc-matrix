// The replay director: camera posts every ~280 m beside the road, some authored shots, and a cut every 4 to 8 s toward what is interesting.
import { THREE } from '../../pixel-engine.js';
import { trackPoint, wrapS } from '../sim/race.js';
const { Vector3 } = THREE;
const REACH = 180, NEAR_BEHIND = 90, LOST = 170, GONE = 300, HOLD = 4; // metres a post can see, a car has left, a car has gone; seconds a shot holds
export class TvDirector {
  constructor(tr, field, seed = 7) {
    this.tr = tr; this.posts = []; this.shot = null; this.cutT = 0; this.held = 0; this.pos = new Vector3(); this.look = new Vector3(); let s = 0, a = seed;
    const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
    while (s < tr.length) {
      const side = rnd() > 0.5 ? 1 : -1, i = Math.round(s / tr.ds) % tr.N, wall = side > 0 ? tr.wallR[i] : tr.wallL[i], off = tr.width[i] / 2 + Math.max(wall + 2, 15 + rnd() * 10), x = tr.x[i] - tr.tz[i] * off * side, z = tr.z[i] + tr.tx[i] * off * side;
      this.posts.push({ s, x, y: tr.y[i] + 3 + rnd() * 5 + (tr.surface === 'dirt' ? 3 : 0), z, fov: 18 + rnd() * 12 });
      s += 240 + rnd() * 80;
    }
    // Authored: low at the start line, a helicopter on the straight, the gantry.
    const a0 = trackPoint(tr, 6, tr.width[0] / 2 + 2.2); this.posts.push({ s: 0, x: a0.x, y: a0.y + 0.7, z: a0.z, fov: 32, low: true });
    const h = trackPoint(tr, -200, 0); this.heli = { s: -200, x: h.x, y: h.y + 42, z: h.z, fov: 24, heli: true };
    const g = trackPoint(tr, 3, 0); this.posts.push({ s: 40, x: g.x, y: g.y + 8.6, z: g.z, fov: 40, gantry: true });
    this.posts.sort((p, q) => p.s - q.s);
  }
  // The next post ahead that can still see the car; failing that, one just behind it. Between posts, the helicopter.
  pick(s, f) {
    const tr = this.tr, L = tr.length; let best = null, bd = Infinity;
    for (const p of this.posts) {
      if (p === this.shot) continue;
      const far = Math.hypot(p.x - f.x, p.z - f.z), d = wrapS(tr, p.s - s), ahead = d < L / 2;
      if (far > (ahead ? REACH : NEAR_BEHIND)) continue;
      const score = ahead ? d : L - d + 1e4;
      if (score < bd) { bd = score; best = p; }
    }
    return best ?? (this.shot === this.heli ? this.shot : this.heli);
  }
  force() { this.cutT = 0; }
  // focus: { x, y, z, s }. Returns true on a cut. A shot holds for 4 to 8 s, unless the car has left it.
  update(dt, focus, cam, { busy = false } = {}) {
    this.cutT -= dt; this.held += dt; let cut = false;
    const shot = this.shot, dist = shot ? Math.hypot(shot.x - focus.x, shot.z - focus.z) : 1e9;
    if (!shot || this.cutT <= 0 || dist > GONE || (dist > LOST && this.held >= HOLD && !shot.heli)) {
      const swoop = Math.abs(Math.sin(focus.s * 3.3)) > 0.97 && shot !== this.heli, next = swoop ? this.heli : this.pick(focus.s, focus);
      this.cutT = next === shot ? 0.5 : HOLD + Math.abs(Math.sin(focus.s * 13.1)) * 4 * (busy ? 0.25 : 1); // nothing else can see the car yet: look again soon
      if (next !== shot) { this.shot = next; this.held = 0; cut = true; if (next === this.heli) { next.x = focus.x + 20; next.z = focus.z - 34; next.y = focus.y + 36; } }
    }
    const S = this.shot;
    this.pos.set(S.x, S.y, S.z);
    if (S.heli) { S.x += (focus.x + 16 - S.x) * Math.min(1, dt * 0.8); S.z += (focus.z - 30 - S.z) * Math.min(1, dt * 0.8); }
    this.look.set(focus.x, focus.y + 0.7, focus.z);
    cam.position.copy(this.pos); cam.lookAt(this.look);
    const d2 = this.pos.distanceTo(this.look), wantFov = S.low || S.gantry ? S.fov : Math.max(12, Math.min(44, (S.fov * 60) / Math.max(30, d2)));
    cam.fov = wantFov; cam.updateProjectionMatrix();
    return cut;
  }
}
