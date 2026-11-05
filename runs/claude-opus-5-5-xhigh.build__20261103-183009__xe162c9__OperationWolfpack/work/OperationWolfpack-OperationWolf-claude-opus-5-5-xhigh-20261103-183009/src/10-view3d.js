// WP.View3D: the Mode 7 math the Sim hit-tests with (the renderer's E.Mode7 is built from the same camera, so what you see
// is what you hit). WP.Rail: rail knots -> the camera ({ x, y, h, angle, pitch, fov }) by rail distance d, with holds.
(() => {
const E = My3D2dge, WP = globalThis.WP, { clamp, lerp } = WP;

class View3D {
  constructor() {
    this.m7 = new E.Mode7({ floor: () => [0, 0, 0], size: [2, 2] });
    this.cam = { x: 0, y: WP.Y0, h: 28, angle: -Math.PI / 2, pitch: 6, fov: 60 };
    this.P = this.m7._P; this.begin(this.cam);
  }
  begin(cam) { this.cam = cam; this.m7.begin({ W: WP.W, H: WP.H }, cam); this.P = this.m7._P; this.horizon = this.m7.horizon; return this; }
  project(x, y, z = 0) { return this.m7.project(x, y, z); }
  toFloor(sx, sy) { return this.m7.toFloor(sx, sy); }
  rowDepth(sy) { return this.m7.rowDepth(sy); }
  depth(x, y) { const P = this.P; return (x - P.x) * P.fx + (y - P.y) * P.fy; }
  lateral(x, y) { const P = this.P; return (x - P.x) * P.rx + (y - P.y) * P.ry; }
  /** the floor's half width (world units) visible at depth D */
  halfWidth(D) { const P = this.P; return (WP.W / 2) * (D * P.cp + P.h * P.sp) / P.f; }
  /** camera frame (lx right, dz ahead) -> world [x, y] */
  toWorld(lx, dz) { const P = this.P; return [P.x + P.fx * dz + P.rx * lx, P.y + P.fy * dz + P.ry * lx]; }
  /** the rig view scale the renderer draws with at k (E.Mode7.view's sixteenths) */
  q(k) { return Math.max(1 / 8, Math.round(k * 16) / 16); }
  /** screen point -> a world point at range along the view ray, at most maxD deep (for grenades above the horizon) */
  ray(sx, sy, D) {
    const P = this.P, kx = (sx - P.cx) / P.f, ky = (P.cy - sy) / P.f;
    // camera basis: forward (fx, fy, 0) pitched down; up; right
    const fwd = [P.fx * P.cp, P.fy * P.cp, -P.sp], up = [P.fx * P.sp, P.fy * P.sp, P.cp], rt = [P.rx, P.ry, 0];
    const dir = [fwd[0] + rt[0] * kx + up[0] * ky, fwd[1] + rt[1] * kx + up[1] * ky, fwd[2] + rt[2] * kx + up[2] * ky];
    const n = Math.hypot(...dir), t = D / n;
    return [P.x + dir[0] * t, P.y + dir[1] * t, P.h + dir[2] * t];
  }
  /** the world point on the view ray through (sx, sy) at depth D (impact effects) */
  atDepth(sx, sy, D) {
    const P = this.P, kx = (sx - P.cx) / P.f, ky = (P.cy - sy) / P.f;
    const dir = [P.fx * P.cp + P.rx * kx + P.fx * P.sp * ky, P.fy * P.cp + P.ry * kx + P.fy * P.sp * ky, -P.sp + P.cp * ky];
    const fd = dir[0] * P.fx + dir[1] * P.fy, t = D / Math.max(1e-4, fd);
    return [P.x + dir[0] * t, P.y + dir[1] * t, P.h + dir[2] * t];
  }
  onScreen(sx, sy, m = 0) { return sx > -m && sx < WP.W + m && sy > -m && sy < WP.PLAY_H + m; }
}
WP.View3D = View3D;

// ---------- the rail ----------
// knots: [{ d, x, y, angle, h, pitch, fov }]: position interpolated linearly by d (smoothstep on the tweened values);
// values missing from a knot carry over from the one before.
class Rail {
  constructor(knots, cam0) {
    const base = Object.assign({ h: 28, pitch: 6, fov: 60, angle: -Math.PI / 2 }, cam0 || {});
    let prev = null;
    this.k = knots.map(k => { const q = Object.assign({}, prev || base, k); prev = q; return q; });
    this.length = this.k[this.k.length - 1].d;
  }
  at(d) {
    const K = this.k; d = clamp(d, 0, this.length);
    let i = 0; while (i < K.length - 2 && K[i + 1].d < d) i++;
    const a = K[i], b = K[Math.min(i + 1, K.length - 1)], span = b.d - a.d, u = span > 0 ? clamp((d - a.d) / span, 0, 1) : 0, s = WP.smooth(u);
    return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), h: lerp(a.h, b.h, s), angle: lerp(a.angle, b.angle, s), pitch: lerp(a.pitch, b.pitch, s), fov: lerp(a.fov, b.fov, s) };
  }
}
WP.Rail = Rail;
})();
