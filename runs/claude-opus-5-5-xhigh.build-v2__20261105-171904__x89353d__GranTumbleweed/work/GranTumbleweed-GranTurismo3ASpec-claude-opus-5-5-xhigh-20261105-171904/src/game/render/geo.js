// A batch of flat-shaded, vertex-coloured triangles: one draw call for a whole world of chunky shapes.
import { glowMaterial, PALETTE, THREE, toonMaterial } from '../../pixel-engine.js';
const { BufferGeometry, Color, Float32BufferAttribute, Mesh } = THREE;
const cache = new Map();
export function rgb(c) {
  if (c && typeof c === 'object') return c;
  let v = cache.get(c);
  if (!v) { const col = new Color(typeof c === 'string' ? PALETTE[c] : c); v = { r: col.r, g: col.g, b: col.b }; cache.set(c, v); }
  return v;
}
export const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return { r: A.r + (B.r - A.r) * t, g: A.g + (B.g - A.g) * t, b: A.b + (B.b - A.b) * t }; };
export const shade = (a, k) => { const A = rgb(a); return { r: A.r * k, g: A.g * k, b: A.b * k }; };
export class GeoBatch {
  constructor() { this.pos = []; this.nor = []; this.col = []; }
  get triangles() { return this.pos.length / 9; }
  tri(a, b, c, color) {
    const C = rgb(color), ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2]; let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    this.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    this.nor.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
    this.col.push(C.r, C.g, C.b, C.r, C.g, C.b, C.r, C.g, C.b);
  }
  quad(a, b, c, d, color) { this.tri(a, b, c, color); this.tri(a, c, d, color); }
  // A box standing on (x, y0, z), turned by yaw about Y. topC colours the top face.
  box(x, y0, z, w, h, d, color, yaw = 0, topC = null) {
    const s = Math.sin(yaw), c = Math.cos(yaw), P = (lx, ly, lz) => [x + lx * c + lz * s, y0 + ly, z - lx * s + lz * c], hw = w / 2, hd = d / 2;
    const a = P(-hw, 0, -hd), b = P(hw, 0, -hd), e = P(hw, 0, hd), f = P(-hw, 0, hd), g = P(-hw, h, -hd), i = P(hw, h, -hd), j = P(hw, h, hd), k = P(-hw, h, hd);
    this.quad(a, g, i, b, color); this.quad(b, i, j, e, color); this.quad(e, j, k, f, color); this.quad(f, k, g, a, color); this.quad(g, k, j, i, topC ?? color); this.quad(a, b, e, f, color);
  }
  // A box between two points, width w and height h, standing on the line.
  beam(p, q, w, h, color) {
    const dx = q[0] - p[0], dz = q[2] - p[2], l = Math.hypot(dx, dz) || 1, rx = (dz / l) * (w / 2), rz = (-dx / l) * (w / 2);
    const a = [p[0] - rx, p[1], p[2] - rz], b = [p[0] + rx, p[1], p[2] + rz], c = [q[0] + rx, q[1], q[2] + rz], d = [q[0] - rx, q[1], q[2] - rz], up = (v) => [v[0], v[1] + h, v[2]];
    this.quad(a, up(a), up(d), d, color); this.quad(c, up(c), up(b), b, color); this.quad(up(a), up(b), up(c), up(d), color); this.quad(d, up(d), up(c), c, color); this.quad(b, up(b), up(a), a, color);
  }
  cone(x, y0, z, r, h, n, color, r1 = 0, yaw = 0) {
    const top = y0 + h;
    for (let i = 0; i < n; i++) {
      const a0 = yaw + (i / n) * Math.PI * 2, a1 = yaw + ((i + 1) / n) * Math.PI * 2, A = [x + Math.sin(a0) * r, y0, z + Math.cos(a0) * r], B = [x + Math.sin(a1) * r, y0, z + Math.cos(a1) * r];
      if (r1 > 0) { const C = [x + Math.sin(a1) * r1, top, z + Math.cos(a1) * r1], D = [x + Math.sin(a0) * r1, top, z + Math.cos(a0) * r1]; this.quad(A, B, C, D, color); this.tri(D, C, [x, top, z], color); }
      else this.tri(A, B, [x, top, z], color);
    }
  }
  ball(x, y, z, r, color, n = 6, sy = 1) { // a low-poly lump: two rings and two poles
    const ring = (k, f, ry) => { const out = []; for (let i = 0; i < n; i++) { const a = ((i + k) / n) * Math.PI * 2; out.push([x + Math.sin(a) * r * f, y + ry * r * sy, z + Math.cos(a) * r * f]); } return out; };
    const r0 = ring(0, 0.85, 0.5), r1 = ring(0.5, 0.85, -0.5), T = [x, y + r * sy, z], B = [x, y - r * sy, z];
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; this.tri(r0[i], r0[j], T, color); this.tri(r1[j], r1[i], B, color); this.tri(r1[i], r1[j], r0[j], color); this.tri(r1[i], r0[j], r0[i], color); }
  }
  // A vertical panel facing +normal side (both sides drawn).
  panel(p, q, h, color) { const a = p, b = q, c = [q[0], q[1] + h, q[2]], d = [p[0], p[1] + h, p[2]]; this.quad(a, b, c, d, color); this.quad(b, a, d, c, color); }
  geometry() {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new Float32BufferAttribute(this.col, 3));
    return g;
  }
  mesh({ cast = false, receive = true, glow = false } = {}) {
    let mat;
    if (glow) { mat = glowMaterial(0xffffff).clone(); mat.vertexColors = true; mat.userData = {}; } else mat = toonMaterial(0xffffff, { vertexColors: true });
    const m = new Mesh(this.geometry(), mat);
    m.castShadow = cast; m.receiveShadow = receive && !glow; m.frustumCulled = false;
    return m;
  }
}
// Value noise on a coarse grid, for hills and blotches.
export function noise2(seed = 1) {
  const h = (x, y) => { let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2147483647 / 3 | 0); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const s = (t) => t * t * (3 - 2 * t);
  return (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), u = s(x - xi), v = s(y - yi); const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
}
export function seeded(seed = 1) { let a = seed >>> 0; const f = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; f.range = (x, y) => x + (y - x) * f(); f.pick = (l) => l[Math.floor(f() * l.length) % l.length]; return f; }
