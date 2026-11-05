/* CAMERA DIRECTOR (§7.2): picks the shot that covers the walker's place on its edge and works out the pose. Shots cut
 * hard (Killer7's way) unless they ask for a blend. An edge's shots are authored in its cams, or generated: the edge is
 * cut into stretches and each gets a fixed corner shot, a dolly, a crane or a follow shot, picked by a seeded hash and
 * kept only if the camera stands in open space with a clear line to the hero all along its stretch. */
const LOOK_UP = 1.1 * M, EYE_H = 28;
S7.EYE_H = EYE_H;

/** a pose's basis: forward, right, up */
S7.basis = (yaw, pitch) => {
  const cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
  return { f: [cy * cp, sy * cp, sp], r: [-sy, cy, 0], u: [-cy * sp, -sy * sp, cp] };
};
/** project a world point through a pose: [sx, sy] in 0..1 screen fractions (y down) and depth, or null behind */
S7.project = (pose, x, y, z, aspect) => {
  const B = S7.basis(pose.yaw, pose.pitch), d = [x - pose.x, y - pose.y, z - pose.z];
  const zc = V.dot(d, B.f); if (zc < 1) return null;
  const tv = Math.tan((pose.fov || 55) * Math.PI / 360), th = tv * aspect;
  return [(1 + V.dot(d, B.r) / (zc * th)) / 2, (1 - V.dot(d, B.u) / (zc * tv)) / 2, zc];
};
/** the world ray through a screen fraction (sx, sy) of a pose: { o, d } */
S7.unproject = (pose, sx, sy, aspect) => {
  const B = S7.basis(pose.yaw, pose.pitch), tv = Math.tan((pose.fov || 55) * Math.PI / 360), th = tv * aspect;
  const nx = (sx * 2 - 1) * th, ny = (1 - sy * 2) * tv;
  return { o: [pose.x, pose.y, pose.z], d: V.norm(V.add(V.add(B.f, V.mul(B.r, nx)), V.mul(B.u, ny))) };
};

class CameraDirector {
  constructor(sim) {
    this.sim = sim; this.cache = {}; this.shotId = null; this.pose = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, fov: 55 };
    this.prev = Object.assign({}, this.pose); this.override = null; this.aimK = 0; this.cutT = 0; this.follow = null; this.shake = 0;
  }
  reset() { this.cache = {}; this.shotId = null; this.override = null; this.follow = null; this.aimK = 0; }
  /** the shots for edge e walked in direction dir (authored, or generated and cached) */
  shots(e, dir) {
    const key = e.id + ':' + dir;
    if (this.cache[key]) return this.cache[key];
    let list = (dir < 0 && e.rcams) || e.cams;
    if (list) list = list.map((c, i) => this._author(e, dir, c, i));
    else list = this._generate(e, dir);
    this.cache[key] = list;
    return list;
  }
  _author(e, dir, c, i) {
    const s = Object.assign({ id: e.id + ':' + dir + ':' + i, s: [0, 1] }, c);
    if (s.at) s.at = S7.tw(s.at).map((v, k) => v === null ? (k === 2 ? 3 * M : 0) : v);
    if (s.at && s.at[2] !== null && c.at && c.at.length < 3) s.at[2] = this.sim.grid.floorAt(s.at[0], s.at[1]) + 3 * M;
    if (Array.isArray(s.look)) s.look = S7.tw(s.look);
    if (s.path) s.path = s.path.map(p => S7.tw(p));
    return s;
  }
  _hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return (h >>> 0) / 4294967296; }
  _generate(e, dir) {
    const G = this.sim.grid, L = e.length, out = [];
    const terrain = G.kind === 'terrain', fast = e.kind === 'ski' || e.kind === 'lift' || e.kind === 'jump';
    const segLen = fast ? 22 * M : 7 * M, n = Math.max(1, Math.min(10, Math.round(L / segLen)));
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n, id = e.id + ':' + dir + ':' + i;
      const h = this._hash(id), side = h < .5 ? 1 : -1;
      const sAt = u => dir > 0 ? u * L : (1 - u) * L;
      const P = u => e.path.at(sAt(u));
      const mid = P((u0 + u1) / 2), fy = mid.yaw + (dir < 0 ? Math.PI : 0), fwd = [Math.cos(fy), Math.sin(fy)], perp = [-fwd[1], fwd[0]];
      const cands = [];
      const fixedAt = (back, sideD, up, fov) => ({ shot: 'fixed', at: [mid.x - fwd[0] * back + perp[0] * sideD * side, mid.y - fwd[1] * back + perp[1] * sideD * side, mid.z + up], look: 'hero', fov });
      if (fast) {
        cands.push({ shot: 'follow', back: 4.5, side: 1.2 * side, up: 2.2, ahead: 4, fov: 60, lag: .1 });
        if (h > .55) cands.unshift(fixedAt(-10 * M, 7 * M, 4 * M, 50));
      } else {
        const pick = Math.floor(h * 6), out = this.sim.areaDef && (this.sim.areaDef.outdoor || terrain) ? 1.7 : 1;
        const order = [
          () => fixedAt(-2 * M * out, 5.5 * M * out, 1.4 * M, 54),                    // low corner: the hero walks past, looming
          () => fixedAt(-1.5 * M * out, 7 * M * out, 4 * M, 46),                      // wide and high from the side: the hero small in the room
          () => fixedAt(-7 * M * out, 1.6 * M, 1.2 * M, 46),                          // low from the front: the hero walks at us
          () => ({ shot: 'dolly', off: [perp[0] * 5 * M * out * side, perp[1] * 5 * M * out * side, 1.8 * M], lead: .6 * M, fov: 52 }),
          () => ({ shot: 'crane', at: [mid.x + perp[0] * 4.5 * M * out * side, mid.y + perp[1] * 4.5 * M * out * side], zFrom: 4.5 * M, zTo: 1.6 * M, look: 'hero', fov: 54 }),
          () => fixedAt(5 * M * out, 2 * M, 3.2 * M, 52)                              // behind and above
        ];
        for (let k = 0; k < order.length; k++) cands.push(order[(pick + k) % order.length]());
        cands.push(fixedAt(-5 * M, 1.2 * M, 1.6 * M, 50), fixedAt(-1 * M, -4.5 * M, 2.2 * M, 54), fixedAt(4 * M, .8 * M, 2.6 * M, 56), fixedAt(-1.5 * M, 3.4 * M, 2.4 * M, 56), fixedAt(2.2 * M, .5 * M, 2.4 * M, 58));
        cands.push({ shot: 'follow', back: 3.6, side: 1.1, up: 1.9, ahead: 2.5, fov: 55, lag: .12 });
      }
      let chosen = null;
      for (const c of cands) {
        if (c.shot === 'crane' && c.at) c.at = [c.at[0], c.at[1], null];
        if (this._valid(e, dir, c, u0, u1, P)) { chosen = c; break; }
      }
      if (!chosen) chosen = cands[cands.length - 1];
      out.push(Object.assign({ id, s: [u0, u1], gen: true }, chosen));
    }
    return out;
  }
  /** does a candidate shot stand in open space and see the hero's chest at 5 points of its stretch? */
  _valid(e, dir, c, u0, u1, P) {
    const G = this.sim.grid;
    for (let k = 0; k < 5; k++) {
      const u = u0 + (u1 - u0) * (k + .5) / 5, p = P(u), chest = [p.x, p.y, p.z + LOOK_UP];
      const cam = this._camPoint(c, p, (k + .5) / 5, e, dir);
      if (!cam) return false;
      if (G.solidAt(cam[0], cam[1], cam[2]) || G.solidAt(cam[0], cam[1], cam[2] - 8)) return false;
      if (G.kind !== 'terrain') {
        const cell = G.cell(Math.floor(cam[0] / M), Math.floor(cam[1] / M)); if (!cell || cell.k === 'wall' || cell.k === 'pillar' || cell.k === 'pit') return false;
        if (k === 0) for (let a = 0; a < 8; a++) { const q = [cam[0] + Math.cos(a * Math.PI / 4) * .8 * M, cam[1] + Math.sin(a * Math.PI / 4) * .8 * M]; if (G.solidAt(q[0], q[1], cam[2])) return false; }   // clear of walls and pillars
        if (cam[2] > this.ceiling()) return false;
      }
      if (!G.los(cam, chest, 3) || !G.los(cam, [p.x, p.y, p.z + 1.75 * M], 3)) return false;
      if (V.dist(cam, chest) < 1.2 * M) return false;
    }
    return true;
  }
  /** how high a camera may stand above the floor here: below the walls' tops (indoors there is no ceiling) */
  ceiling() { const A = this.sim.areaDef; return A && A.world && A.world.kind === 'level' ? (A.world.wallH || 4) * M - 6 : 1e9; }
  /** where a shot's camera stands for hero point p (u: 0..1 through the shot's stretch) */
  _camPoint(c, p, u, e, dir) {
    if (c.shot === 'fixed') return c.at;
    if (c.shot === 'dolly') {
      if (c.path) { const a = c.path[0], b = c.path[c.path.length - 1]; return V.lerp3(a, b, u).map((v, i) => i === 2 && (v === null || v === undefined) ? p.z + 2 * M : v); }
      return [p.x + c.off[0], p.y + c.off[1], p.z + c.off[2]];
    }
    if (c.shot === 'crane') return [c.at[0], c.at[1], this.sim.grid.floorAt(c.at[0], c.at[1]) + lerp(c.zFrom, c.zTo, u)];
    if (c.shot === 'follow') {
      const fy = p.yaw + (dir < 0 ? Math.PI : 0), f = [Math.cos(fy), Math.sin(fy)], r = [-f[1], f[0]];
      return [p.x - f[0] * c.back * M + r[0] * c.side * M, p.y - f[1] * c.back * M + r[1] * c.side * M, p.z + c.up * M];
    }
    return null;
  }
  /** this step's rail pose for the walker (hero feet h = { x, y, z, yaw }), the shot covering (e, s, dir) */
  railPose(e, s, dir, h, dt) {
    const shots = this.shots(e, dir), u = dir > 0 ? s / e.length : 1 - s / e.length;
    let sh = shots[shots.length - 1];
    for (const c of shots) if (u >= c.s[0] - 1e-6 && u <= c.s[1] + 1e-6) { sh = c; break; }
    const cut = sh.id !== this.shotId;
    if (cut) { this.shotId = sh.id; this.cutT = 0; this.follow = null; this.sim.emit && this.sim.emit('cut', { shot: sh.id }); }
    this.cutT += dt;
    const lu = (u - sh.s[0]) / Math.max(1e-6, sh.s[1] - sh.s[0]);
    return this._poseOf(sh, h, clamp(lu, 0, 1), e, dir, dt, cut);
  }
  _poseOf(sh, h, u, e, dir, dt, cut) {
    const chest = [h.x, h.y, h.z + (sh.lookUp !== undefined ? sh.lookUp * M : LOOK_UP)];
    let cam;
    if (sh.shot === 'follow') {
      const fy = h.yaw, f = [Math.cos(fy), Math.sin(fy)], r = [-f[1], f[0]];
      const want = [h.x - f[0] * sh.back * M + r[0] * (sh.side || 0) * M, h.y - f[1] * sh.back * M + r[1] * (sh.side || 0) * M, h.z + sh.up * M];
      if (!this.follow || cut) this.follow = want.slice();
      const k = 1 - Math.exp(-dt / Math.max(.01, sh.lag || .12));
      for (let i = 0; i < 3; i++) this.follow[i] += (want[i] - this.follow[i]) * k;
      cam = this.follow.slice();
      const G = this.sim.grid, fl = G.floorAt(cam[0], cam[1]) + 1.2 * M; if (cam[2] < fl) cam[2] = fl;
      // pull in along the line of sight when a wall gets between
      const d = V.sub(cam, chest), L = V.len(d), hit = G.ray(chest, V.mul(d, 1 / (L || 1)), L, 3);
      if (hit < L) cam = V.add(chest, V.mul(d, Math.max(.2, (hit - 6) / L)));
      const ah = sh.ahead ? sh.ahead * M : 0;
      const look = [h.x + f[0] * ah, h.y + f[1] * ah, chest[2]];
      return this._aim(cam, look, sh.fov);
    }
    cam = this._camPoint(sh, h, u, e, dir);
    const look = sh.look && sh.look !== 'hero' ? sh.look : chest;
    return this._aim(cam, look, sh.fov);
  }
  /** a camera point pulled in toward `from` until nothing solid stands between (area and boss cameras) */
  pullIn(from, cam) {
    const G = this.sim.grid, d = V.sub(cam, from), L = V.len(d); if (L < 1) return cam;
    const hit = G.ray(from, V.mul(d, 1 / L), L, 3);
    return hit < L ? V.add(from, V.mul(d, Math.max(.15, (hit - 8) / L))) : cam;
  }
  /** _aim with the camera pulled clear of walls first, looking from the hero's chest */
  aimSafe(h, cam, look, fov) { return this._aim(this.pullIn([h.x, h.y, h.z + 1.4 * M], cam), look, fov); }
  _aim(cam, look, fov) {
    const d = V.sub(look, cam), hz = Math.hypot(d[0], d[1]);
    return { x: cam[0], y: cam[1], z: cam[2], yaw: Math.atan2(d[1], d[0]), pitch: Math.atan2(d[2], hz), roll: 0, fov: fov || 55 };
  }
  /** an override shot (beats, bosses): { at, look, fov } in units, or { orbit: { c, r, h, speed } } */
  poseOverride(o, t) {
    if (o.orbit) {
      const a = o.orbit.a0 + t * o.orbit.speed, c = o.orbit.c;
      return this._aim([c[0] + Math.cos(a) * o.orbit.r, c[1] + Math.sin(a) * o.orbit.r, c[2] + o.orbit.h], c, o.fov || 55);
    }
    if (o.pose) return Object.assign({ roll: 0, fov: 55 }, o.pose);
    const at = typeof o.at === 'function' ? o.at(t) : o.at, look = typeof o.look === 'function' ? o.look(t) : o.look;
    return this._aim(at, look, o.fov);
  }
}
S7.CameraDirector = CameraDirector;
