// CRACKMANIA mesh kit: static scenery merged into one vertex-coloured toon mesh per track (with an ink shell like the
// pen's outlines), so hundreds of props cost a few draw calls. Shapes in world metres (x east, y south, z up)
const E = globalThis.My3D2dge;
const hexRGB = c => { const v = parseInt(c.slice(1), 16); return [(v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255]; };
const lin = c => c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4);
const cache = new Map();
const colOf = c => { let v = cache.get(c); if (!v) { v = hexRGB(c).map(lin); cache.set(c, v); } return v; };
export class MeshKit {
  constructor() { this.pos = []; this.nrm = []; this.col = []; this.idx = []; }
  get n() { return this.pos.length / 3; }
  _v(p, n, c) { this.pos.push(p[0], p[2], p[1]); this.nrm.push(n[0], n[2], n[1]); this.col.push(c[0], c[1], c[2]); return this.n - 1; }
  /** a quad a b c d (counter-clockwise seen from outside, world axes) with a flat normal */
  quad(a, b, c, d, color) {
    const C = colOf(color), u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; const l = Math.hypot(...n) || 1; n = n.map(x => x / l);
    const i = this._v(a, n, C); this._v(b, n, C); this._v(c, n, C); this._v(d, n, C);
    // three's winding is the mirror of ours (y and z swap): a d c, a c b
    this.idx.push(i, i + 2, i + 1, i, i + 3, i + 2);
  }
  /** a box centred at (x, y, z) w x d x h, turned by yaw about z */
  box(x, y, z, w, d, h, color, yaw = 0, top = null) {
    const c = Math.cos(yaw), s = Math.sin(yaw), P = (dx, dy, dz) => [x + dx * c - dy * s, y + dx * s + dy * c, z + dz];
    const W = w / 2, D = d / 2, H = h / 2;
    const v = [P(-W, -D, -H), P(W, -D, -H), P(W, D, -H), P(-W, D, -H), P(-W, -D, H), P(W, -D, H), P(W, D, H), P(-W, D, H)];
    this.quad(v[4], v[5], v[6], v[7], top || color);   // top (+z)
    this.quad(v[0], v[3], v[2], v[1], color);          // bottom
    this.quad(v[0], v[1], v[5], v[4], color);          // -y
    this.quad(v[1], v[2], v[6], v[5], color);          // +x
    this.quad(v[2], v[3], v[7], v[6], color);          // +y
    this.quad(v[3], v[0], v[4], v[7], color);          // -x
  }
  /** a cylinder (or a cone with r1 = 0) from (x, y, z0) up h, n sides */
  cyl(x, y, z0, r0, r1, h, color, n = 8, top = null) {
    for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const A = [x + c0 * r0, y + s0 * r0, z0], B = [x + c1 * r0, y + s1 * r0, z0], C = [x + c1 * r1, y + s1 * r1, z0 + h], D = [x + c0 * r1, y + s0 * r1, z0 + h];
      if (r1 > .001) this.quad(A, B, C, D, color); else this.tri(A, B, C, color);
      if (r1 > .001 && top !== false) this.tri([x, y, z0 + h], D, C, top || color);
    }
  }
  tri(a, b, c, color) {
    const C = colOf(color), u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; const l = Math.hypot(...n) || 1; n = n.map(q => q / l);
    const i = this._v(a, n, C); this._v(b, n, C); this._v(c, n, C); this.idx.push(i, i + 2, i + 1);
  }
  /** a low ball (an octahedron-ish ellipsoid, 8 x 4) */
  ball(x, y, z, rx, ry, rz, color, n = 8) {
    const R = (a, b) => [x + Math.cos(a) * Math.sin(b) * rx, y + Math.sin(a) * Math.sin(b) * ry, z + Math.cos(b) * rz];
    for (let i = 0; i < n; i++) for (let j = 0; j < 4; j++) {
      const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, b0 = j / 4 * Math.PI, b1 = (j + 1) / 4 * Math.PI;
      if (j === 0) this.tri(R(a0, b1), R(a1, b1), R(a0, b0), color); else if (j === 3) this.tri(R(a0, b0), R(a0, b1), R(a1, b0), color); else this.quad(R(a0, b1), R(a1, b1), R(a1, b0), R(a0, b0), color);
    }
  }
  /** three.js meshes: the coloured mesh and its ink shell (or null without a renderer) */
  build(mat, ink) {
    if (!this.idx.length || !E.World3D.renderer) return null;
    const T = E.THREE, geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(this.pos, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(this.nrm, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(this.col, 3)); geo.setIndex(this.idx);
    const m = new T.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true;
    const g = new T.Group(); g.add(m);
    if (ink) {   // the shell: every vertex pushed out along its normal, drawn from the back in ink
      const sp = new Float32Array(this.pos.length); for (let i = 0; i < this.pos.length; i++) sp[i] = this.pos[i] + this.nrm[i] * .07;
      const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.Float32BufferAttribute(sp, 3)); sg.setAttribute('normal', new T.Float32BufferAttribute(this.nrm, 3)); sg.setIndex(this.idx);
      const s = new T.Mesh(sg, ink); g.add(s);
    }
    return g;
  }
}
