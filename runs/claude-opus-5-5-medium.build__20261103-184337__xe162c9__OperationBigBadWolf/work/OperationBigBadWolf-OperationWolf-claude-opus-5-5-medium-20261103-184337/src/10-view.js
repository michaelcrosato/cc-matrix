// The rail camera and the projection the sim hits with (the same math the renderer's Mode 7 draws with).
(() => {
const E = My3D2dge, WP = globalThis.WP;
// a rail: knots { d, x, y, angle, h, pitch, fov }, each value tweened linearly from the knot before
WP.Rail = class {
  constructor(knots) {
    let prev = { angle: -Math.PI / 2, h: 26, pitch: 6, fov: 60 };
    this.k = knots.map(k => (prev = Object.assign({}, prev, k)));
    this.end = this.k[this.k.length - 1].d;
  }
  at(d) {
    const K = this.k; let i = 0;
    while (i < K.length - 2 && d > K[i + 1].d) i++;
    const a = K[i], b = K[Math.min(K.length - 1, i + 1)], u = b.d > a.d ? E.clamp((d - a.d) / (b.d - a.d), 0, 1) : 0, l = WP.lerp;
    return { x: l(a.x, b.x, u), y: l(a.y, b.y, u), angle: l(a.angle, b.angle, u), h: l(a.h, b.h, u), pitch: l(a.pitch, b.pitch, u), fov: l(a.fov, b.fov, u) };
  }
};
WP.basis = cam => { const c = Math.cos(cam.angle), s = Math.sin(cam.angle), fx = Math.abs(c) < 1e-12 ? 0 : c, fy = Math.abs(s) < 1e-12 ? 0 : s; return { fx, fy, rx: -fy, ry: fx }; };
WP.camToWorld = (cam, lx, dz) => { const b = WP.basis(cam); return [cam.x + b.rx * lx + b.fx * dz, cam.y + b.ry * lx + b.fy * dz]; };
WP.worldToCam = (cam, x, y) => { const b = WP.basis(cam), dx = x - cam.x, dy = y - cam.y; return [dx * b.rx + dy * b.ry, dx * b.fx + dy * b.fy]; };
// the sim's view: an E.Mode7 used only for its math
WP.View = class {
  constructor() { this.m7 = new E.Mode7({ floor: () => [0, 0, 0], size: [2, 2] }); this.cam = null; this.f = 1; }
  begin(cam) { this.cam = cam; this.m7.begin({ W: WP.W, H: WP.H }, cam); this.f = this.m7._P.f; this.horizon = this.m7.horizon; return this; }
  project(x, y, z) { return this.m7.project(x, y, z || 0); }
  toFloor(sx, sy) { return this.m7.toFloor(sx, sy); }
  depth(x, y) { const b = WP.basis(this.cam); return (x - this.cam.x) * b.fx + (y - this.cam.y) * b.fy; }
  halfWidth(dz) { return dz * (WP.W / 2) / this.f; }
  // the world point along the view ray through a screen point at a forward distance (for throws above the horizon)
  rayAt(sx, sy, D) {
    const P = this.m7._P, b = WP.basis(this.cam), u = (P.cy - sy) / P.f, t = D / Math.max(.05, P.cp + u * P.sp), L = (sx - P.cx) / P.f * t;
    const dz = t * (u * P.cp - P.sp);   // camera space: depth t along the ray, turned by the pitch
    return [this.cam.x + b.fx * D + b.rx * L, this.cam.y + b.fy * D + b.ry * L, Math.max(0, this.cam.h + dz)];
  }
};
})();
