/*!
my-3D2dge module VISTA v0.85.2-bbho: a first-person landscape: a heightfield drawn a column at a time, billboards hidden by the hills in front of them, a lens that magnifies
https://github.com/michaelcrosato/my-3d2dge (MIT License)
Loads after: the full engine. Needs: no other module.

The early-90s voxel landscape (Comanche's, Delta Force's), in the engine's pixels: a camera at an eye over a heightfield,
looking along a heading; the ground marched a screen column at a time front to back, fogged, misted and lit by a baked
sun; water at its level; then billboards (impostor sprites, live rigs, particles) far to near, each column of each one
cut where nearer ground covers it, so a deer walks down behind a crest and its legs go under the creek's surface.
- const lens = new E.Lens(); lens.setup({ x, y, z, yaw, pitch: degrees down, fov: degrees across the height }, W, H)
  (or lens.set({ x, y, z, yaw, f, cx, hy }) directly); lens.project(x, y, z) -> [sx, sy, k, D] (k: pixels per unit there,
  D: the forward distance) or null; lens.ray(sx, sy) -> { x, y, z, dx, dy, dz } (d has a forward part of 1: the point at
  forward distance D is o + d * D); lens.magnified(s0x, s0y, mag, lx, ly) -> the lens of a scope about screen point s0
  with its centre at (lx, ly): an exact zoom of this one.
- const hf = new E.Heightfield({ N: 1024 (samples a side), cell: 16 (units a sample), farN: 512, farCell: 128 });
  hf.generate(spec) builds it from a seed and features (ridge, river, lake, flatten, field, trail, clearView, burn, mark),
  hf.bake(palette) lights and colours it; hf.height(x, y), hf.normal(x, y), hf.waterAt(x, y), hf.typeAt(x, y),
  hf.rayHit(o, d, maxT) -> t or null.
- const vista = new E.Vista({ hf, sky: E.Backdrop, fog: { color, near, far }, mist: { top, color, density }, sun:
  { yaw, elev, color }, water: { deep, shallow, glint }, grade: { mul, add }, vignette }); vista.render(T, lens, items)
  draws into a target (vista.target(W, H)); vista.draw(r, lens, items) is the whole frame as an overlay (sky, ground,
  billboards). T.occ(col, D) is the topmost row the ground nearer than D covers in that column.
- items: { x, y, z, imp, id, variant, facing, scale } (an impostor), { x, y, z, draw(g, ox, oy, k, view, D), box: [r, h],
  outline } (a rig or any drawing, read back and outlined), { x, y, z, dot: color, size } (a particle).
- const imp = new E.Impostors(); imp.define(id, { size: [r, h], paint(g, k, variant, facing, ox, oy), variants, facings })
  or { shape: 'rock', size, params, scale }: sprites drawn once per scale level (lazily), the nearest level below the
  scale asked for, read back to pixels.
Rules: the renderer owns the whole frame (draw nothing under it); everything is in world units (16 a metre by default);
headless (no canvas) it only answers geometry: project, ray, height, rayHit.
*/
(function (E) {
'use strict';
if (!E) throw new Error('my-3D2dge module VISTA: load engine/my-3d2dge.js first');
const { clamp, lerp } = E, TAU = Math.PI * 2;
const HAS_DOM = typeof document !== 'undefined';

/* ---------- small helpers ---------- */
const smooth = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const hexRGB = h => E.hex(h);
const pack = (r, g, b) => (0xff000000 | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;
const unpack = c => [c & 255, (c >>> 8) & 255, (c >>> 16) & 255];
function mixPack(c, fr, fg, fb, a) {   // c packed, mixed toward (fr, fg, fb) by a
  const r = c & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255;
  return (0xff000000 | (((b + (fb - b) * a) & 255) << 16) | (((g + (fg - g) * a) & 255) << 8) | ((r + (fr - r) * a) & 255)) >>> 0;
}
E.vistaPack = pack; E.vistaUnpack = unpack; E.vistaMix = mixPack;

/** a seeded 2D gradient noise, about -1..1: makeNoise(seed)(x, y) */
function makeNoise(seed) {
  const R = E.rng(seed >>> 0 || 1), p = new Uint8Array(512), gx = new Float32Array(256), gy = new Float32Array(256), perm = [];
  for (let i = 0; i < 256; i++) perm.push(i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  for (let i = 0; i < 256; i++) { p[i] = p[i + 256] = perm[i]; const a = R() * TAU; gx[i] = Math.cos(a); gy[i] = Math.sin(a); }
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10), v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    const a = p[p[X] + Y], b = p[p[X + 1] + Y], c = p[p[X] + Y + 1], d = p[p[X + 1] + Y + 1];
    const n00 = gx[a] * xf + gy[a] * yf, n10 = gx[b] * (xf - 1) + gy[b] * yf, n01 = gx[c] * xf + gy[c] * (yf - 1), n11 = gx[d] * (xf - 1) + gy[d] * (yf - 1);
    const x0 = n00 + (n10 - n00) * u, x1 = n01 + (n11 - n01) * u;
    return (x0 + (x1 - x0) * v) * 1.4;
  };
}
E.makeNoise = makeNoise;
function fbm(n, x, y, oct = 5, lac = 2, gain = .5) { let s = 0, a = 1, f = 1, m = 0; for (let i = 0; i < oct; i++) { s += n(x * f, y * f) * a; m += a; a *= gain; f *= lac; } return s / m; }
E.fbm = fbm;

/** a dense polyline (metres) through points, Catmull-Rom smoothed, a point every step */
function densePath(points, step = 1, smoothIt = true) {
  if (points.length < 2) return points.map(p => [p[0], p[1]]);
  const P = new E.Path(points.map(p => [p[0], p[1], 0]), { smooth: smoothIt ? 'catmull' : null }), out = [];
  for (let d = 0; d <= P.length; d += step) { const q = P.at(d); out.push([q.x, q.y]); }
  const e = P.at(P.length); out.push([e.x, e.y]); return out;
}
E.densePath = densePath;
function pointInPoly(x, y, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
function segDist(px, py, ax, ay, bx, by) { const vx = bx - ax, vy = by - ay, L = vx * vx + vy * vy; let t = L ? ((px - ax) * vx + (py - ay) * vy) / L : 0; t = t < 0 ? 0 : t > 1 ? 1 : t; const dx = ax + vx * t - px, dy = ay + vy * t - py; return [Math.sqrt(dx * dx + dy * dy), t]; }
function polyDist(x, y, poly) { let m = Infinity; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) m = Math.min(m, segDist(x, y, poly[j][0], poly[j][1], poly[i][0], poly[i][1])[0]); return m; }
E.pointInPoly = pointInPoly; E.polyDist = polyDist; E.segDist = segDist;

/* =============================================================================
 * LENS  the camera: a perspective with vertical verticals (an off-axis image plane: pitch moves the horizon)
 * ========================================================================== */
class Lens {
  constructor() { this.x = 0; this.y = 0; this.z = 0; this.yaw = 0; this.f = 200; this.cx = 160; this.hy = 120; this.W = 320; this.H = 240; this._trig(); }
  _trig() { this.Fx = Math.cos(this.yaw); this.Fy = Math.sin(this.yaw); this.Rx = -this.Fy; this.Ry = this.Fx; return this; }
  /** from a camera { x, y, z, yaw (radians: 0 east, PI/2 south), pitch (degrees, + down), fov (degrees across the
   *  height) } and a screen of W x H */
  setup(c, W, H) {
    this.x = c.x; this.y = c.y; this.z = c.z; this.yaw = c.yaw; this.W = W; this.H = H;
    this.f = (H / 2) / Math.tan((c.fov || 34) * Math.PI / 360); this.cx = W / 2; this.hy = H / 2 - this.f * Math.tan((c.pitch || 0) * Math.PI / 180);
    this.pitch = c.pitch || 0; this.fov = c.fov || 34; this.roll = c.roll || 0;
    return this._trig();
  }
  /** set the projection directly: { x, y, z, yaw, f, cx, hy, W, H } */
  set(o) { Object.assign(this, o); return this._trig(); }
  copy() { const l = new Lens(); Object.assign(l, this); return l._trig(); }
  /** world -> [sx, sy, k (pixels per unit there), D (forward distance)], or null within a unit of the camera's plane */
  project(x, y, z, out) {
    const dx = x - this.x, dy = y - this.y, D = dx * this.Fx + dy * this.Fy; if (D < 4) return null;
    const L = dx * this.Rx + dy * this.Ry, k = this.f / D, o = out || [0, 0, 0, 0];
    o[0] = this.cx + L * k; o[1] = this.hy - (z - this.z) * k; o[2] = k; o[3] = D; return o;
  }
  /** the ray through a screen point: origin and a direction whose forward part is 1 (the point at forward distance D is
   *  o + d * D) */
  ray(sx, sy) {
    const u = (sx - this.cx) / this.f, v = (this.hy - sy) / this.f;
    return { x: this.x, y: this.y, z: this.z, dx: this.Fx + this.Rx * u, dy: this.Fy + this.Ry * u, dz: v };
  }
  /** the ground angle (yaw) and the angle up from level of a screen point's ray (radians) */
  angles(sx, sy) { const r = this.ray(sx, sy); return [Math.atan2(r.dy, r.dx), Math.atan2(r.dz, Math.hypot(r.dx, r.dy))]; }
  /** the screen point of a ray given by its yaw and up angle (for ghosts: another player's aim) */
  fromAngles(yaw, up) {
    const dx = Math.cos(yaw), dy = Math.sin(yaw), D = dx * this.Fx + dy * this.Fy; if (D <= .01) return null;
    const L = dx * this.Rx + dy * this.Ry, z = Math.tan(up) * Math.hypot(dx, dy);
    return [this.cx + L / D * this.f, this.hy - z / D * this.f];
  }
  /** a scope's lens: the same camera magnified mag times about screen point (s0x, s0y), which lands at (lx, ly) of the
   *  scope's own target (W x H): its centre ray is this lens's ray through s0 */
  magnified(s0x, s0y, mag, lx, ly, W, H) {
    const l = this.copy(); l.f = this.f * mag; l.cx = lx + (this.cx - s0x) * mag; l.hy = ly + (this.hy - s0y) * mag; l.W = W; l.H = H; return l;
  }
}
E.Lens = Lens;

/* =============================================================================
 * HEIGHTFIELD  a core of 1 m samples and a far ring of coarse ones; water, ground types, forest; baked light
 * ========================================================================== */
const NOWATER = -1e9;
class Heightfield {
  constructor(o = {}) {
    this.N = o.N || 1024; this.cell = o.cell || 16; this.farN = o.farN || 512; this.farCell = o.farCell || 128;
    this.M = o.metre || 16;
    const N = this.N, FN = this.farN;
    this.size = N * this.cell; this.fx0 = (this.size - FN * this.farCell) / 2; this.fy0 = this.fx0;
    this.h = new Float32Array(N * N); this.fh = new Float32Array(FN * FN);
    this.water = new Float32Array(N * N).fill(NOWATER);
    this.type = new Uint8Array(N * N); this.mask = new Uint8Array(N * N); this.forest = new Uint8Array(N * N);
    this.canopy = new Uint8Array(N * N);
    this.crop = new Uint8Array(N * N);   // a crop's height (decimetres): corn, reed beds, drawn as raised ground from any distance; it hides but never blocks a shot
    this.col = null; this.fcol = null; this.ccol = null;   // packed colours (baked)
    this.hash = 0;
  }
  /* ---- sampling (world units) ---- */
  /** the ground's height at a world point (bilinear; the far ring outside the core) */
  height(x, y) {
    const c = this.cell, gx = x / c, gy = y / c, N = this.N;
    if (gx >= 0 && gy >= 0 && gx < N - 1 && gy < N - 1) {
      const ix = gx | 0, iy = gy | 0, fx = gx - ix, fy = gy - iy, i = iy * N + ix, h = this.h;
      return (h[i] * (1 - fx) + h[i + 1] * fx) * (1 - fy) + (h[i + N] * (1 - fx) + h[i + N + 1] * fx) * fy;
    }
    return this.farHeight(x, y);
  }
  farHeight(x, y) {
    const FN = this.farN, fc = this.farCell; let gx = (x - this.fx0) / fc, gy = (y - this.fy0) / fc;
    gx = clamp(gx, 0, FN - 1.001); gy = clamp(gy, 0, FN - 1.001);
    const ix = gx | 0, iy = gy | 0, fx = gx - ix, fy = gy - iy, i = iy * FN + ix, h = this.fh;
    return (h[i] * (1 - fx) + h[i + 1] * fx) * (1 - fy) + (h[i + FN] * (1 - fx) + h[i + FN + 1] * fx) * fy;
  }
  /** the water's surface height at a point, or null where there is none */
  waterAt(x, y) { const i = this._idx(x, y); if (i < 0) return null; const w = this.water[i]; return w > NOWATER / 2 ? w : null; }
  typeAt(x, y) { const i = this._idx(x, y); return i < 0 ? 0 : this.type[i]; }
  forestAt(x, y) { const i = this._idx(x, y); return i < 0 ? 0 : this.forest[i] / 255; }
  maskAt(x, y) { const i = this._idx(x, y); return i < 0 ? 0 : this.mask[i]; }
  _idx(x, y) { const gx = Math.round(x / this.cell), gy = Math.round(y / this.cell); return gx < 0 || gy < 0 || gx >= this.N || gy >= this.N ? -1 : gy * this.N + gx; }
  /** the ground's normal (unit [x, y, z]) */
  normal(x, y) { const e = this.cell, hx = this.height(x + e, y) - this.height(x - e, y), hy = this.height(x, y + e) - this.height(x, y - e), l = Math.hypot(hx, hy, 2 * e); return [-hx / l, -hy / l, 2 * e / l]; }
  /** where a ray first meets the ground (or the water's surface, water: true): the parameter t along d (d need not be a
   *  unit), or null within maxT */
  rayHit(o, d, maxT, water = false) {
    const dl = Math.hypot(d.dx, d.dy, d.dz) || 1; let t = 0, prev = 0, step = 8 / dl;
    const above = t => { const x = o.x + d.dx * t, y = o.y + d.dy * t, z = o.z + d.dz * t; let g = this.height(x, y); if (water) { const w = this.waterAt(x, y); if (w !== null && w > g) g = w; } return z - g; };
    if (above(0) < 0) return 0;
    while (t < maxT) {
      prev = t; t = Math.min(maxT, t + step); step = Math.max(8, t * dl * .01) / dl;
      if (above(t) < 0) { let a = prev, b = t; for (let i = 0; i < 18; i++) { const m = (a + b) / 2; if (above(m) < 0) b = m; else a = m; } return b; }
      if (t >= maxT) break;
    }
    return null;
  }

  /* ---- generation (metres) ---- */
  /** build from spec: { seed, base: { amp, scale, octaves, warp, offset, ridged }, features: [...], water: bool,
   *  forest(ctx) -> 0..1, types(ctx) -> id, canopy: { min, max } } */
  generate(spec) {
    const N = this.N, M = this.M, cm = this.cell / M, seed = spec.seed || 1, B = Object.assign({ amp: 20, scale: 300, octaves: 5, warp: 40, offset: 0 }, spec.base);
    const n1 = makeNoise(seed), n2 = makeNoise(seed * 7 + 3), n3 = makeNoise(seed * 13 + 5);
    this.noise = [n1, n2, n3];
    const baseAt = (xm, ym) => {
      const wx = xm + B.warp * n2(xm / B.scale * .7, ym / B.scale * .7), wy = ym + B.warp * n3(xm / B.scale * .7 + 31, ym / B.scale * .7 + 17);
      let v = fbm(n1, wx / B.scale, wy / B.scale, B.octaves);
      if (B.ridged) v = v * (1 - B.ridged) + (1 - Math.abs(v) * 2) * B.ridged * .5;
      return B.offset + v * B.amp + (B.tilt ? B.tilt[0] * xm + B.tilt[1] * ym : 0) + (B.bowl ? B.bowl.depth * -Math.exp(-((xm - B.bowl.c[0]) ** 2 + (ym - B.bowl.c[1]) ** 2) / (B.bowl.r * B.bowl.r)) : 0);
    };
    this.baseAt = baseAt;
    // the base on a coarse grid (it has no detail finer than a few metres), Catmull-Rom up to the samples
    const H = coarseField(N, 4, (x, y) => baseAt(x * cm, y * cm));   // metres
    this._Hm = H;
    const water = this.water.fill(NOWATER), mask = this.mask.fill(0);
    for (const f of spec.features || []) this._feature(f, H, water, mask, cm);
    // far ring: the same base, and the core's own heights where they overlap
    const FN = this.farN, fcm = this.farCell / M, fx0m = this.fx0 / M;
    const FB = coarseField(FN, 2, (x, y) => baseAt(fx0m + x * fcm, fx0m + y * fcm));
    for (let y = 0; y < FN; y++) for (let x = 0; x < FN; x++) {
      const xm = fx0m + x * fcm, ym = fx0m + y * fcm, cx = xm / cm, cy = ym / cm;
      let v = FB[y * FN + x];
      if (spec.far) v = spec.far(xm, ym, v);
      if (cx >= 0 && cy >= 0 && cx < N && cy < N) { const edge = Math.min(cx, cy, N - 1 - cx, N - 1 - cy) * cm; const t = smooth(edge / 60); v = v * (1 - t) + H[Math.floor(cy) * N + Math.floor(cx)] * t; }
      this.fh[y * FN + x] = v * M;
    }
    // core edges blend into the far ring's base so the horizon has no seam
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x; this.h[i] = H[i] * M; if (water[i] > NOWATER / 2) water[i] *= M; }
    // slope, water distance, types and forest
    const wd = this._waterDist(water, cm);
    this.wdist = wd;
    const ctx = { x: 0, y: 0, h: 0, slope: 0, water: false, wdist: 0, mask: 0, n: 0, n2: 0, rng: 0 };
    const NA = coarseField(N, 4, (x, y) => n1(x * cm / 23 + 100, y * cm / 23)), NB = coarseField(N, 2, (x, y) => n2(x * cm / 7, y * cm / 7 + 50));
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, xl = Math.max(0, x - 1), xr = Math.min(N - 1, x + 1), yu = Math.max(0, y - 1), yd = Math.min(N - 1, y + 1);
      const sx = (H[y * N + xr] - H[y * N + xl]) / ((xr - xl) * cm), sy = (H[yd * N + x] - H[yu * N + x]) / ((yd - yu) * cm);
      ctx.x = x * cm; ctx.y = y * cm; ctx.h = H[i]; ctx.slope = Math.hypot(sx, sy); ctx.water = water[i] > NOWATER / 2 && water[i] / M > H[i]; ctx.wl = ctx.water ? water[i] / M : null; ctx.wdist = wd[i]; ctx.mask = mask[i];
      ctx.n = NA[i]; ctx.n2 = NB[i]; ctx.rng = ((Math.imul(x * 374761393 + y * 668265263, 1274126177) >>> 8) & 65535) / 65536;
      const fo = spec.forest ? clamp(spec.forest(ctx), 0, 1) : 0; ctx.forest = fo; this.forest[i] = Math.round(fo * 255);
      this.type[i] = spec.types ? spec.types(ctx) : 0;
      this.crop[i] = spec.crop ? Math.round(clamp(spec.crop(ctx), 0, 25) * 10) : 0;
    }
    // canopy (distant forest drawn as a raised, leafy ground)
    const C = Object.assign({ min: 9, max: 17 }, spec.canopy);
    for (let i = 0; i < N * N; i++) { const f = this.forest[i] / 255; this.canopy[i] = f > .3 ? Math.round((C.min + (C.max - C.min) * (.5 + .5 * n3((i % N) * cm / 19, Math.floor(i / N) * cm / 19))) * smooth((f - .3) / .35)) : 0; }
    { const cf = new Float32Array(N * N); for (let i = 0; i < N * N; i++) cf[i] = this.canopy[i]; const bl = boxBlur(cf, N, 3); for (let i = 0; i < N * N; i++) this.canopy[i] = bl[i] > 1.5 ? Math.round(bl[i]) : 0; }   // soft forest edges, no walls
    // the far ring's forest, from the hunt's rule at those places
    this.fforest = new Uint8Array(FN * FN);
    if (spec.farForest) for (let y = 0; y < FN; y++) for (let x = 0; x < FN; x++) { const xm = fx0m + x * fcm, ym = fx0m + y * fcm; this.fforest[y * FN + x] = Math.round(clamp(spec.farForest(xm, ym, this.fh[y * FN + x] / M), 0, 1) * 255); }
    let hs = 0; for (let i = 0; i < N * N; i += 97) hs = (hs * 31 + Math.round(this.h[i] * 10)) | 0;
    this.hash = hs >>> 0; this.spec = spec;
    return this;
  }
  _waterDist(water, cm) {   // metres to the nearest water sample (a two-pass chamfer on a 2-sample grid, capped at 60 m)
    const N = this.N, n = N >> 1, d = new Float32Array(n * n), hh = this.h, INF = 60;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const i = (y * 2) * N + x * 2, w = water[i]; d[y * n + x] = w > -5e8 && w > hh[i] ? 0 : INF; }
    const a = cm * 2, b = cm * 2.8284;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x; let v = d[i], q;
      if (x > 0 && (q = d[i - 1] + a) < v) v = q;
      if (y > 0) { if ((q = d[i - n] + a) < v) v = q; if (x > 0 && (q = d[i - n - 1] + b) < v) v = q; if (x < n - 1 && (q = d[i - n + 1] + b) < v) v = q; }
      d[i] = v;
    }
    for (let y = n - 1; y >= 0; y--) for (let x = n - 1; x >= 0; x--) {
      const i = y * n + x; let v = d[i], q;
      if (x < n - 1 && (q = d[i + 1] + a) < v) v = q;
      if (y < n - 1) { if ((q = d[i + n] + a) < v) v = q; if (x < n - 1 && (q = d[i + n + 1] + b) < v) v = q; if (x > 0 && (q = d[i + n - 1] + b) < v) v = q; }
      d[i] = v;
    }
    const out = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) out[y * N + x] = d[Math.min(n - 1, y >> 1) * n + Math.min(n - 1, x >> 1)];
    return out;
  }
  /** for each sample within reach of a dense path (metres): fn(i, dist, along index, x, y) with the nearest point. Wide
   *  features are measured on a coarser grid and interpolated (a distance field is smooth away from its ridge) */
  _pathField(pts, reach, fn, cm, step) {
    const N = this.N, st = step || (reach > 40 ? 4 : reach > 16 ? 2 : 1); let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    const gx0 = clamp(Math.floor((x0 - reach) / cm), 0, N - 1), gy0 = clamp(Math.floor((y0 - reach) / cm), 0, N - 1), gx1 = clamp(Math.ceil((x1 + reach) / cm), 0, N - 1), gy1 = clamp(Math.ceil((y1 + reach) / cm), 0, N - 1);
    const cw = Math.floor((gx1 - gx0) / st) + 2, ch = Math.floor((gy1 - gy0) / st) + 2, D = new Float32Array(cw * ch).fill(1e9), A = new Float32Array(cw * ch), R = reach + st * cm * 1.5;
    for (let s = 0; s < pts.length - 1; s++) {
      const ax = pts[s][0], ay = pts[s][1], bx = pts[s + 1][0], by = pts[s + 1][1], vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy || 1e-9;
      const cx0 = Math.max(0, Math.floor(((Math.min(ax, bx) - R) / cm - gx0) / st)), cx1 = Math.min(cw - 1, Math.ceil(((Math.max(ax, bx) + R) / cm - gx0) / st));
      const cy0 = Math.max(0, Math.floor(((Math.min(ay, by) - R) / cm - gy0) / st)), cy1 = Math.min(ch - 1, Math.ceil(((Math.max(ay, by) + R) / cm - gy0) / st));
      for (let cy = cy0; cy <= cy1; cy++) { const py = (gy0 + cy * st) * cm; for (let cx = cx0; cx <= cx1; cx++) {
        const px2 = (gx0 + cx * st) * cm; let t = ((px2 - ax) * vx + (py - ay) * vy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const dx = ax + vx * t - px2, dy = ay + vy * t - py, d = dx * dx + dy * dy, j = cy * cw + cx;
        if (d < D[j]) { D[j] = d; A[j] = s + t; }
      } }
    }
    for (let j = 0; j < D.length; j++) D[j] = D[j] < 1e8 ? Math.sqrt(D[j]) : 1e9;
    for (let y = gy0; y <= gy1; y++) for (let x = gx0; x <= gx1; x++) {
      let d, a;
      if (st === 1) { const j = (y - gy0) * cw + (x - gx0); d = D[j]; a = A[j]; }
      else { const fx = (x - gx0) / st, fy = (y - gy0) / st, ix = Math.min(cw - 2, fx | 0), iy = Math.min(ch - 2, fy | 0), tx = fx - ix, ty = fy - iy, j = iy * cw + ix;
        const d00 = D[j], d10 = D[j + 1], d01 = D[j + cw], d11 = D[j + cw + 1]; if (d00 > 1e8 || d10 > 1e8 || d01 > 1e8 || d11 > 1e8) continue;
        d = (d00 * (1 - tx) + d10 * tx) * (1 - ty) + (d01 * (1 - tx) + d11 * tx) * ty; a = (A[j] * (1 - tx) + A[j + 1] * tx) * (1 - ty) + (A[j + cw] * (1 - tx) + A[j + cw + 1] * tx) * ty; }
      if (d <= reach) fn(y * N + x, d, a, x * cm, y * cm);
    }
  }
  _feature(f, H, water, mask, cm) {
    const N = this.N, kind = f.kind || f[0];
    if (kind === 'ridge') {
      const w = f.width || 40, pts = densePath(f.path, Math.max(2, w / 6));
      this._pathField(pts, w * 2.6, (i, d) => { H[i] += (f.height || 10) * Math.exp(-(d / w) * (d / w)); }, cm);
    } else if (kind === 'valley') {
      const w = f.width || 60, pts = densePath(f.path, Math.max(2, w / 6));
      this._pathField(pts, w * 2.6, (i, d) => { H[i] -= (f.depth || 6) * Math.exp(-(d / w) * (d / w)); }, cm);
    } else if (kind === 'river') {
      const pts = densePath(f.path, 1.5), w = f.width || 6, banks = f.banks || 6, depth = f.depth || 1.2, drop = f.drop || .5;
      // the water's level along the path: the ground there, smoothed, never rising downstream
      const hp = pts.map(p => H[clamp(Math.round(p[1] / cm), 0, N - 1) * N + clamp(Math.round(p[0] / cm), 0, N - 1)]), lv = hp.slice(), R = 12;
      for (let i = 0; i < hp.length; i++) { let s = 0, n = 0; for (let j = Math.max(0, i - R); j <= Math.min(hp.length - 1, i + R); j++) { s += hp[j]; n++; } lv[i] = s / n; }
      for (let i = 1; i < lv.length; i++) lv[i] = Math.min(lv[i], lv[i - 1] - (f.fall || .002));
      const levelAt = a => { const i = Math.floor(a), t = a - i; return lv[Math.min(i, lv.length - 1)] * (1 - t) + lv[Math.min(i + 1, lv.length - 1)] * t - drop; };
      const half = w / 2;
      this._pathField(pts, half + banks, (i, d, a) => {
        const L = levelAt(a);
        if (d < half) { const bed = L - depth * (1 - (d / half) * (d / half) * .6); H[i] = Math.min(H[i], bed); }
        else { const t = (d - half) / banks, up = L - .15 + t * t * (banks * .45 + 1.2); H[i] = Math.min(H[i], up); }
        if (H[i] < L) { water[i] = Math.max(water[i], L); mask[i] |= 8; }
        else if (d < half + banks * .6) mask[i] |= 16;
      }, cm);
      if (f.ford) for (const fd of f.ford) {   // a shallow crossing: the bed raised to a hand's depth
        this._pathField(densePath([[fd[0] - 8, fd[1]], [fd[0] + 8, fd[1]]], 1, false), fd[2] || 7, (i, d) => { const L = water[i]; if (L > NOWATER / 2) H[i] = Math.max(H[i], L - .25 - d * .02); }, cm);
      }
    } else if (kind === 'lake') {
      const [cxm, cym] = f.center, [rx, ry] = f.radii, shore = f.shore || 25, depth = f.depth || 4;
      let level = f.level;
      if (level === undefined || level === 'auto') { let m = Infinity; for (let a = 0; a < TAU; a += .05) { const x = cxm + Math.cos(a) * rx * 1.1, y = cym + Math.sin(a) * ry * 1.1; m = Math.min(m, H[clamp(Math.round(y / cm), 0, N - 1) * N + clamp(Math.round(x / cm), 0, N - 1)]); } level = m - .6; }
      this.lakeLevel = level;
      const gx0 = clamp(Math.floor((cxm - rx - shore) / cm), 0, N - 1), gx1 = clamp(Math.ceil((cxm + rx + shore) / cm), 0, N - 1), gy0 = clamp(Math.floor((cym - ry - shore) / cm), 0, N - 1), gy1 = clamp(Math.ceil((cym + ry + shore) / cm), 0, N - 1);
      const wob = makeNoise(77 + Math.round(cxm));
      for (let y = gy0; y <= gy1; y++) for (let x = gx0; x <= gx1; x++) {
        const i = y * N + x, dx = (x * cm - cxm) / rx, dy = (y * cm - cym) / ry, ang = Math.atan2(dy, dx), r = Math.hypot(dx, dy) * (1 + .18 * wob(Math.cos(ang) * 2 + 5, Math.sin(ang) * 2 + 5));
        const rs = 1 + shore / Math.min(rx, ry);
        if (r < 1) H[i] = Math.min(H[i], level - depth * (1 - r * r) - .3);
        else if (r < rs) { const t = (r - 1) / (rs - 1); H[i] = Math.min(H[i], lerp(level - .3, H[i], smooth(t)) + 0); }
        if (H[i] < level && r < rs) { water[i] = level; mask[i] |= 8; } else if (r < rs * 1.02) mask[i] |= 16;
      }
    } else if (kind === 'flatten') {
      const poly = f.poly, fo = f.falloff || 20; let z = f.z;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of poly) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
      const gx0 = clamp(Math.floor((x0 - fo) / cm), 0, N - 1), gx1 = clamp(Math.ceil((x1 + fo) / cm), 0, N - 1), gy0 = clamp(Math.floor((y0 - fo) / cm), 0, N - 1), gy1 = clamp(Math.ceil((y1 + fo) / cm), 0, N - 1);
      if (z === undefined || z === 'avg') { let s = 0, n = 0; for (let y = gy0; y <= gy1; y += 2) for (let x = gx0; x <= gx1; x += 2) if (pointInPoly(x * cm, y * cm, poly)) { s += H[y * N + x]; n++; } z = n ? s / n : 0; }
      if (typeof z === 'object') z = H[clamp(Math.round(z[1] / cm), 0, N - 1) * N + clamp(Math.round(z[0] / cm), 0, N - 1)] + (z[2] || 0);
      for (let y = gy0; y <= gy1; y++) for (let x = gx0; x <= gx1; x++) {
        const i = y * N + x, px = x * cm, py = y * cm, inside = pointInPoly(px, py, poly);
        if (inside) { H[i] = z; if (f.mark) mask[i] |= f.mark; }
        else { const d = polyDist(px, py, poly); if (d < fo) H[i] = lerp(z, H[i], smooth(d / fo)); }
      }
    } else if (kind === 'field' || kind === 'burn' || kind === 'mark') {
      const bit = kind === 'field' ? 1 : kind === 'burn' ? 4 : (f.bit || 64);
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of f.poly) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
      for (let y = clamp(Math.floor(y0 / cm), 0, N - 1); y <= clamp(Math.ceil(y1 / cm), 0, N - 1); y++) for (let x = clamp(Math.floor(x0 / cm), 0, N - 1); x <= clamp(Math.ceil(x1 / cm), 0, N - 1); x++) if (pointInPoly(x * cm, y * cm, f.poly)) mask[y * N + x] |= bit;
    } else if (kind === 'trail') {
      const pts = densePath(f.path, 1.5), w = f.width || 2.5;
      const hp = pts.map(p => H[clamp(Math.round(p[1] / cm), 0, N - 1) * N + clamp(Math.round(p[0] / cm), 0, N - 1)]), sm = hp.slice();
      for (let i = 0; i < hp.length; i++) { let s = 0, n = 0; for (let j = Math.max(0, i - 6); j <= Math.min(hp.length - 1, i + 6); j++) { s += hp[j]; n++; } sm[i] = s / n; }
      this._pathField(pts, w * 3, (i, d, a) => { const t = smooth(1 - d / (w * 3)), L = sm[Math.min(Math.round(a), sm.length - 1)]; if (water[i] < NOWATER / 2) H[i] = lerp(H[i], L, t * .6); if (d < w) mask[i] |= 2; }, cm);
    } else if (kind === 'clearView') {
      // nothing in the fan rises into the sightline from the eye: ground slopes up away from it, so every point shows
      const [vx, vy] = f.at, eye = (f.eyeZ !== undefined ? f.eyeZ : H[clamp(Math.round(vy / cm), 0, N - 1) * N + clamp(Math.round(vx / cm), 0, N - 1)] + (f.eye || 1.7)), base = f.yaw * Math.PI / 180;
      const a0 = f.bearings[0] * Math.PI / 180, a1 = f.bearings[1] * Math.PI / 180, far = f.dist[1], near = f.dist[0] || 3, stepA = .25 * Math.PI / 180, nA = Math.ceil((a1 - a0) / stepA) + 1, stepD = 1, nD = Math.ceil(far / stepD) + 1;
      const S = new Float32Array(nA * nD), margin = f.margin || .35;
      for (let ia = 0; ia < nA; ia++) {
        const a = base + a0 + ia * stepA, ca = Math.cos(a), sa = Math.sin(a);
        let lim = Infinity;
        for (let id = nD - 1; id >= 0; id--) {
          const d = Math.max(near, id * stepD), x = vx + ca * d, y = vy + sa * d, gx = clamp(Math.round(x / cm), 0, N - 1), gy = clamp(Math.round(y / cm), 0, N - 1);
          const s = (H[gy * N + gx] - eye) / d; lim = Math.min(lim, s); S[ia * nD + id] = lim;
        }
      }
      const R = far + 2, gx0 = clamp(Math.floor((vx - R) / cm), 0, N - 1), gx1 = clamp(Math.ceil((vx + R) / cm), 0, N - 1), gy0 = clamp(Math.floor((vy - R) / cm), 0, N - 1), gy1 = clamp(Math.ceil((vy + R) / cm), 0, N - 1);
      for (let y = gy0; y <= gy1; y++) for (let x = gx0; x <= gx1; x++) {
        const dx = x * cm - vx, dy = y * cm - vy, d = Math.hypot(dx, dy); if (d < near || d > far) continue;
        let a = Math.atan2(dy, dx) - base; while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU;
        const edge = .06; if (a < a0 - edge || a > a1 + edge) continue;
        const ia = clamp(Math.round((a - a0) / stepA), 0, nA - 1), id = clamp(Math.round(d / stepD), 0, nD - 1);
        const allowed = eye + S[ia * nD + id] * d - margin * (d / far), i = y * N + x;
        const w = a < a0 ? 1 - (a0 - a) / edge : a > a1 ? 1 - (a - a1) / edge : 1;
        if (H[i] > allowed && water[i] < NOWATER / 2) H[i] = lerp(H[i], allowed, w);
      }
    } else if (kind === 'shallow') {   // a bay's bed raised to wading depth (where there is water)
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of f.poly) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
      const fo = f.falloff || 20;
      for (let y = clamp(Math.floor((y0 - fo) / cm), 0, N - 1); y <= clamp(Math.ceil((y1 + fo) / cm), 0, N - 1); y++) for (let x = clamp(Math.floor((x0 - fo) / cm), 0, N - 1); x <= clamp(Math.ceil((x1 + fo) / cm), 0, N - 1); x++) {
        const i = y * N + x, L = water[i]; if (L < NOWATER / 2) continue; const px2 = x * cm, py = y * cm, inside = pointInPoly(px2, py, f.poly), d = inside ? 0 : polyDist(px2, py, f.poly); if (d > fo) continue;
        const tgt = L - (f.depth || .6) - d / fo * 1.5; if (H[i] < tgt) H[i] = tgt;
      }
    } else if (kind === 'bump') {   // a knoll or a hollow: { at, r, h }
      const [bx, by] = f.at, r = f.r || 20, R = r * 2.4, gx0 = clamp(Math.floor((bx - R) / cm), 0, N - 1), gx1 = clamp(Math.ceil((bx + R) / cm), 0, N - 1), gy0 = clamp(Math.floor((by - R) / cm), 0, N - 1), gy1 = clamp(Math.ceil((by + R) / cm), 0, N - 1);
      for (let y = gy0; y <= gy1; y++) for (let x = gx0; x <= gx1; x++) { const d = Math.hypot(x * cm - bx, y * cm - by); H[y * N + x] += (f.h || 5) * Math.exp(-(d / r) * (d / r)); }
    } else if (kind === 'plateau') {   // the ground at a point raised or lowered to z within r (a vantage's knoll top)
      const [bx, by] = f.at, r = f.r || 8, fo = f.falloff || 14, gx0 = clamp(Math.floor((bx - r - fo) / cm), 0, N - 1), gx1 = clamp(Math.ceil((bx + r + fo) / cm), 0, N - 1), gy0 = clamp(Math.floor((by - r - fo) / cm), 0, N - 1), gy1 = clamp(Math.ceil((by + r + fo) / cm), 0, N - 1);
      const ref = Array.isArray(f.z) ? f.z : null, z = ref ? H[clamp(Math.round(ref[1] / cm), 0, N - 1) * N + clamp(Math.round(ref[0] / cm), 0, N - 1)] + (ref[2] || 0) : f.z !== undefined ? f.z : H[clamp(Math.round(by / cm), 0, N - 1) * N + clamp(Math.round(bx / cm), 0, N - 1)] + (f.dz || 0);
      for (let y = gy0; y <= gy1; y++) for (let x = gx0; x <= gx1; x++) { const d = Math.hypot(x * cm - bx, y * cm - by), i = y * N + x; H[i] = d < r ? z : lerp(z, H[i], smooth((d - r) / fo)); }
    }
  }

  /* ---- bake: colours, light, shadows ---- */
  /** palette: { types: { id: { a, b, c, scale, speck } }, sun: { yaw, elev, color, ambient }, canopy: [colours],
   *  farTypes(h, slope, n) -> id } */
  bake(P) {
    if (!HAS_DOM && !P.force) { this.col = null; return this; }
    const N = this.N, M = this.M, cm = this.cell / M, H = this.h, n1 = this.noise[0], n2 = this.noise[1];
    const sy = P.sun.yaw * Math.PI / 180, se = P.sun.elev * Math.PI / 180, sx = Math.cos(sy) * Math.cos(se), syy = Math.sin(sy) * Math.cos(se), sz = Math.sin(se);
    const sunC = hexRGB(P.sun.color || '#fff0d0'), amb = hexRGB(P.sun.ambient || '#707890');
    const pal = {}; for (const k in P.types) { const t = P.types[k]; pal[k] = { a: hexRGB(t.a), b: hexRGB(t.b || t.a), c: hexRGB(t.c || t.b || t.a), scale: t.scale || 6, speck: t.speck || 0 }; }
    // ambient occlusion: the height against its blurred neighbourhood
    const blur = boxBlur(H, N, 8);
    this.col = new Uint32Array(N * N); this.ccol = new Uint32Array(N * N);
    const shadowAt = (x, y, h0, extra) => {   // marching toward the sun (metres), from a height
      const st = 2, tz = Math.tan(se); let px = x, py = y, hz = h0 + .3 + (extra || 0);
      for (let s = st; s < 160; s += st) { px += Math.cos(sy) * st; py += Math.sin(sy) * st; hz += tz * st; const gx = Math.round(px / cm), gy = Math.round(py / cm); if (gx < 0 || gy < 0 || gx >= N || gy >= N) return 1; const i = gy * N + gx; if (H[i] / M + this.canopy[i] * .9 > hz) return 0; }
      return 1;
    };
    const cp = (P.canopy || ['#2a4a2a', '#3a5a30', '#4a6a3a']).map(hexRGB);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, xl = Math.max(0, x - 1), xr = Math.min(N - 1, x + 1), yu = Math.max(0, y - 1), yd = Math.min(N - 1, y + 1);
      const dhx = (H[y * N + xr] - H[y * N + xl]) / M / ((xr - xl) * cm), dhy = (H[yd * N + x] - H[yu * N + x]) / M / ((yd - yu) * cm), nl = Math.hypot(dhx, dhy, 1);
      const nx = -dhx / nl, ny = -dhy / nl, nz = 1 / nl, L = Math.max(0, nx * sx + ny * syy + nz * sz);
      const t = pal[this.type[i]] || pal[0], xm = x * cm, ym = y * cm;
      const v = .5 + .5 * n1(xm / t.scale + 40, ym / t.scale), w = .5 + .5 * n2(xm / (t.scale * .37), ym / (t.scale * .37) + 9);
      let r = lerp(t.a[0], t.b[0], v), g = lerp(t.a[1], t.b[1], v), b = lerp(t.a[2], t.b[2], v);
      if (t.speck && w > 1 - t.speck) { r = t.c[0]; g = t.c[1]; b = t.c[2]; }
      const sh = L > 0 ? shadowAt(xm, ym, H[i] / M) : 0, ao = clamp(1 + (H[i] - blur[i]) / M * .06, .62, 1.12);
      const kr = (amb[0] / 255 * .7 + sunC[0] / 255 * L * sh * .95) * ao, kg = (amb[1] / 255 * .7 + sunC[1] / 255 * L * sh * .95) * ao, kb = (amb[2] / 255 * .7 + sunC[2] / 255 * L * sh * .95) * ao;
      this.col[i] = pack(clamp(r * kr * 1.15, 0, 255), clamp(g * kg * 1.15, 0, 255), clamp(b * kb * 1.15, 0, 255));
      if (this.crop[i] && P.crop) {   // a crop's top: its own colours in rows, lit
        const cc = P.crop[this.type[i]] || P.crop.default; if (cc) {
          const q = .5 + .5 * n2(xm / 1.3, ym / 1.3 + 17), row = (cc.rows ? (Math.floor((cc.rowsDeg ? (xm * Math.cos(cc.rowsDeg * Math.PI / 180) + ym * Math.sin(cc.rowsDeg * Math.PI / 180)) : xm) / 1.6) % 2) : 0), C3 = cc.c.map(hexRGB), c = q < .35 ? C3[0] : q < .75 ? C3[1] : C3[2], lk = (.62 + .45 * L) * (row ? .86 : 1);
          this.ccol[i] = pack(clamp(c[0] * lk, 0, 255), clamp(c[1] * lk, 0, 255), clamp(c[2] * lk, 0, 255));
        }
      }
      // canopy colour (far forest): leaf clumps lit from the sun's side
      if (this.canopy[i]) {
        const q = .5 + .5 * n2(xm / 5.5 + 3, ym / 5.5), c = q < .4 ? cp[0] : q < .75 ? cp[1] : cp[2], top = H[i] / M + this.canopy[i];
        const cs = shadowAt(xm, ym, top, 0), lk = .55 + .5 * cs * (.4 + .6 * L);
        this.ccol[i] = pack(clamp(c[0] * lk, 0, 255), clamp(c[1] * lk, 0, 255), clamp(c[2] * lk, 0, 255));
      }
    }
    // the far ring: its own coarse colours
    const FN = this.farN, fcm = this.farCell / M, fx0m = this.fx0 / M, FH = this.fh;
    this.fcol = new Uint32Array(FN * FN);
    for (let y = 0; y < FN; y++) for (let x = 0; x < FN; x++) {
      const i = y * FN + x, xl = Math.max(0, x - 1), xr = Math.min(FN - 1, x + 1), yu = Math.max(0, y - 1), yd = Math.min(FN - 1, y + 1);
      const dhx = (FH[y * FN + xr] - FH[y * FN + xl]) / M / ((xr - xl) * fcm), dhy = (FH[yd * FN + x] - FH[yu * FN + x]) / M / ((yd - yu) * fcm), nl = Math.hypot(dhx, dhy, 1);
      const L = Math.max(0, (-dhx * sx - dhy * syy + sz) / nl), hm = FH[i] / M, slope = Math.hypot(dhx, dhy), xm = fx0m + x * fcm, ym = fx0m + y * fcm;
      const ff = this.fforest[i] / 255;
      let tid = P.farTypes ? P.farTypes(hm, slope, n1(xm / 60, ym / 60), xm, ym) : 0, t = pal[tid] || pal[0];
      const v = .5 + .5 * n1(xm / 40 + 11, ym / 40);
      let r = lerp(t.a[0], t.b[0], v), g = lerp(t.a[1], t.b[1], v), b = lerp(t.a[2], t.b[2], v);
      if (ff > .35) { const q = .5 + .5 * n2(xm / 30, ym / 30), c = q < .45 ? cp[0] : q < .8 ? cp[1] : cp[2]; const m = smooth((ff - .35) / .3); r = lerp(r, c[0], m); g = lerp(g, c[1], m); b = lerp(b, c[2], m); }
      const kr = amb[0] / 255 * .7 + sunC[0] / 255 * L * .95, kg = amb[1] / 255 * .7 + sunC[1] / 255 * L * .95, kb = amb[2] / 255 * .7 + sunC[2] / 255 * L * .95;
      this.fcol[i] = pack(clamp(r * kr * 1.15, 0, 255), clamp(g * kg * 1.15, 0, 255), clamp(b * kb * 1.15, 0, 255));
    }
    // the far ring's heights carry its forest too (it is only ever seen from afar)
    if (!this._farCanopy) { this._farCanopy = true; for (let i = 0; i < FN * FN; i++) { const ff = this.fforest[i] / 255; if (ff > .35) FH[i] += smooth((ff - .35) / .3) * 13 * M; } }
    return this;
  }
  /** darken the baked colour in a soft ellipse (a tree's shadow), offset along the sun */
  stampShadow(x, y, rx, ry, strength, ang) {
    if (!this.col) return; const N = this.N, c = this.cell, ca = Math.cos(ang || 0), sa = Math.sin(ang || 0), R = Math.max(rx, ry);
    const gx0 = clamp(Math.floor((x - R) / c), 0, N - 1), gx1 = clamp(Math.ceil((x + R) / c), 0, N - 1), gy0 = clamp(Math.floor((y - R) / c), 0, N - 1), gy1 = clamp(Math.ceil((y + R) / c), 0, N - 1);
    for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) {
      const dx = gx * c - x, dy = gy * c - y, u = (dx * ca + dy * sa) / rx, v = (-dx * sa + dy * ca) / ry, d = u * u + v * v; if (d >= 1) continue;
      const i = gy * N + gx, k = 1 - strength * (1 - d) * (E.bayer(gx, gy) > .5 ? 1 : .8), q = this.col[i];
      this.col[i] = pack((q & 255) * k, ((q >>> 8) & 255) * k, ((q >>> 16) & 255) * k);
    }
  }
}
/** a field of N x N samples from fn(x, y) evaluated every step samples, Catmull-Rom between them */
function coarseField(N, step, fn) {
  const C = Math.ceil((N - 1) / step) + 3, G = new Float32Array(C * C);
  for (let j = 0; j < C; j++) for (let i = 0; i < C; i++) G[j * C + i] = fn((i - 1) * step, (j - 1) * step);
  const out = new Float32Array(N * N), cr = (p0, p1, p2, p3, t) => p1 + .5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
  const row = new Float32Array(4);
  for (let y = 0; y < N; y++) {
    const gy = y / step, j = Math.floor(gy), ty = gy - j;
    for (let x = 0; x < N; x++) {
      const gx = x / step, i = Math.floor(gx), tx = gx - i;
      for (let k = 0; k < 4; k++) { const b = (j + k) * C + i; row[k] = cr(G[b], G[b + 1], G[b + 2], G[b + 3], tx); }
      out[y * N + x] = cr(row[0], row[1], row[2], row[3], ty);
    }
  }
  return out;
}
E.coarseField = coarseField;
function boxBlur(H, N, r) {
  const tmp = new Float32Array(N * N), out = new Float32Array(N * N), w = 2 * r + 1;
  for (let y = 0; y < N; y++) { let s = 0; for (let x = -r; x <= r; x++) s += H[y * N + clamp(x, 0, N - 1)]; for (let x = 0; x < N; x++) { tmp[y * N + x] = s / w; s += H[y * N + clamp(x + r + 1, 0, N - 1)] - H[y * N + clamp(x - r, 0, N - 1)]; } }
  for (let x = 0; x < N; x++) { let s = 0; for (let y = -r; y <= r; y++) s += tmp[clamp(y, 0, N - 1) * N + x]; for (let y = 0; y < N; y++) { out[y * N + x] = s / w; s += tmp[clamp(y + r + 1, 0, N - 1) * N + x] - tmp[clamp(y - r, 0, N - 1) * N + x]; } }
  return out;
}
Heightfield.NOWATER = NOWATER;
E.Heightfield = Heightfield;

/* =============================================================================
 * IMPOSTORS  props drawn once per scale level, read back to pixels, picked by the scale a distance gives
 * ========================================================================== */
const LV0 = .012, LVR = 1.15, LVN = 44;
class Impostors {
  constructor() { this.defs = {}; this.cache = new Map(); this.built = 0; }
  /** define(id, { size: [half width, height] (world units), paint(g, k, variant, facing, ox, oy) or shape: id (the engine's
   *  library or a store set's), params, scale, variants: 1, facings: 1 }) */
  define(id, d) { this.defs[id] = Object.assign({ variants: 1, facings: 1, size: [16, 32] }, d); return this; }
  static level(k) { return clamp(Math.floor(Math.log(k / LV0) / Math.log(LVR)), 0, LVN - 1); }
  static levelK(i) { return LV0 * Math.pow(LVR, i); }
  /** the sprite for an impostor at scale k (pixels a unit): { w, h, px, ox, oy, k } */
  get(id, variant, facing, k) {
    const d = this.defs[id]; if (!d || !HAS_DOM) return null;
    const lv = Impostors.level(k), v = variant % d.variants, f = facing % d.facings, key = id + '|' + v + '|' + f + '|' + lv;
    let s = this.cache.get(key); if (s !== undefined) return s;
    s = this._build(d, v, f, Impostors.levelK(lv)); this.cache.set(key, s); this.built++; return s;
  }
  _build(d, v, f, k) {
    const [r, h] = d.size, W = Math.max(4, Math.ceil(r * 2 * k * 1.25) + 8), Hh = Math.max(4, Math.ceil(h * k * 1.15) + 8), ox = W / 2, oy = Hh - 4;
    const cv = E.mkCanvas(W, Hh), g = E.ctx2d(cv); E.px.reset(g);
    try {
      if (d.paint) d.paint(g, k, v, f, ox, oy);
      else if (d.shape) {
        const view = viewFor(k * (d.scale || 1), -90, d.pitch === undefined ? 8 : d.pitch), fac = (d.facing || 0) + f * TAU / d.facings;
        const spr = E.shapeSprite(d.shape, { view, facing: fac, size: 1, params: d.params ? d.params(v) : undefined, outline: d.outline === undefined ? true : d.outline });
        if (spr && spr.cv) g.drawImage(spr.cv, Math.round(ox - spr.foot[0]), Math.round(oy - spr.foot[1]));
      }
    } catch (e) { if (E.current) E.current.fail('impostor', e); }
    const data = g.getImageData(0, 0, W, Hh), px32 = new Uint32Array(data.data.buffer);
    let x0 = W, y0 = Hh, x1 = -1, y1 = -1;
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) if (px32[y * W + x] >>> 24 > 100) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return { w: 0, h: 0, px: null, ox: 0, oy: 0, k };
    const w = x1 - x0 + 1, hh = y1 - y0 + 1, out = new Uint32Array(w * hh);
    for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) { const c = px32[(y + y0) * W + x + x0]; out[y * w + x] = c >>> 24 > 100 ? (c | 0xff000000) >>> 0 : 0; }
    return { w, h: hh, px: out, ox: ox - x0, oy: oy - y0, k };
  }
  /** build the levels between two scales now (a boot step), so play never waits for one */
  warm(id, kMin, kMax, variants) {
    const d = this.defs[id]; if (!d || !HAS_DOM) return 0; let n = 0;
    for (let lv = Impostors.level(kMin); lv <= Impostors.level(kMax); lv++) for (let v = 0; v < Math.min(d.variants, variants || d.variants); v++) for (let f = 0; f < d.facings; f++) { this.get(id, v, f, Impostors.levelK(lv) * 1.0001); n++; }
    return n;
  }
}
E.Impostors = Impostors;
const _views = new Map();
/** the engine view a rig or shape at k pixels a unit is drawn with, from yaw (degrees, mode7's) and pitch; its heights
 *  at k exactly (zBoost undoes the pitch's shortening: verticals stay vertical in the lens) */
function viewFor(k, yawDeg, pitchDeg) {
  const q = k < 1 ? Math.max(1 / 64, Math.round(k * 64) / 64) : Math.round(k * 32) / 32, yw = Math.round(yawDeg / 2) * 2, pt = clamp(Math.round(pitchDeg / 2) * 2, 0, 44), key = q + ':' + yw + ':' + pt;
  let v = _views.get(key); if (!v) { if (_views.size > 2000) _views.clear(); v = new E.View('vista', 'Vista', yw, pt, q, 1 / Math.cos(pt * Math.PI / 180)); _views.set(key, v); }
  return v;
}
E.vistaView = viewFor;
/** the lens's own projection about an item, as a view: the quantised view's angles (for facing and depth order) with
 *  the true screen rows, so a thing drawn near the screen's edge (where the lens stretches) or close up lands exactly
 *  where its points project; offsets are in the item's units (k: pixels per unit there) */
function exactView(vq, L, e, k, it) {
  const v = Object.assign(Object.create(Object.getPrototypeOf(vq)), vq), u = (e.sx - L.cx) / L.f, w = ((it.z || 0) - L.z) / e.D;
  v.ax = k * (L.Rx - u * L.Fx); v.ay = k * (L.Ry - u * L.Fy); v.bx = k * w * L.Fx; v.by = k * w * L.Fy; v.bz = -k; v.scale = k;
  return v;
}
E.vistaExactView = exactView;

/* =============================================================================
 * VISTA  the renderer: sky, ground a column at a time, water, fog and mist, billboards hidden by the ground
 * ========================================================================== */
const MB = 640;
class Target {
  constructor(W, H) {
    this.W = W; this.H = H; this.buf = new Uint32Array(W * H); this.occD = new Float32Array(W * MB); this.occY = new Int16Array(W * MB); this.occN = new Uint16Array(W);
    this.depth = new Float32Array(W);   // the farthest ground drawn per column (the sky's start)
    if (HAS_DOM) { this.cv = E.mkCanvas(W, H); this.g = this.cv.getContext('2d', { willReadFrequently: true }); this.img = this.g.createImageData(W, H); this.img32 = new Uint32Array(this.img.data.buffer); }
  }
  /** the topmost row the ground nearer than D covers in column col (H: none) */
  occ(col, D) {
    const n = this.occN[col], b = col * MB, d = this.occD; if (!n || d[b] >= D) return this.H;
    let lo = 0, hi = n - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (d[b + m] < D) lo = m; else hi = m - 1; }
    return this.occY[b + lo];
  }
}
E.VistaTarget = Target;

class Vista {
  constructor(o = {}) {
    this.o = o; this.hf = o.hf || null; this.time = 0; this.targets = new Map();
    this.setLook(o);
    this.scratch = HAS_DOM ? E.mkCanvas(64, 64) : null; this.sg = this.scratch ? this.scratch.getContext('2d', { willReadFrequently: true }) : null;
    this.stats = { cols: 0, samples: 0, items: 0, drawn: 0 };
  }
  /** fog, mist, sun, water, grade and the sky (a Backdrop) */
  setLook(o) {
    Object.assign(this.o, o);
    const O = this.o, F = O.fog || { color: '#c8d0d8', near: 200 * 16, far: 2600 * 16 }, MI = O.mist || { top: 0, color: '#e0e4e8', density: 0 };
    this.fog = { c: hexRGB(F.color), near: F.near, far: F.far, max: F.max === undefined ? 1 : F.max, fill: !!F.fill };
    this.mist = { c: hexRGB(MI.color || '#e0e4e8'), top: (MI.top || 0) * 16, density: MI.density || 0, range: (MI.range || 120) * 16, base: (MI.base || 0) * 16 };
    const W = O.water || {};
    this.water = { deep: hexRGB(W.deep || '#1a3a4a'), shallow: hexRGB(W.shallow || '#3a6a7a'), sky: hexRGB(W.sky || '#9ab8d0'), foam: hexRGB(W.foam || '#d8e8f0'), glint: hexRGB(W.glint || '#fff8e0'), ice: W.ice ? hexRGB(W.ice) : null };
    this.sun = O.sun || { yaw: 0, elev: 20, color: '#fff0c0' };
    const G = O.grade || {}; this.lut = makeLUT(G);
    this.canopyFrom = (O.canopyFrom || 150) * 16; this.billboardFar = (O.billboardFar || 210) * 16;
    this.micro = O.micro || null;
    return this;
  }
  target(W, H, key = 'main') { let t = this.targets.get(key); if (!t || t.W !== W || t.H !== H) { t = new Target(W, H); this.targets.set(key, t); } return t; }
  /** draw the ground and the items into T through the lens */
  render(T, L, items, opts = {}) {
    const W = T.W, H = T.H, buf = T.buf, hf = this.hf; buf.fill(0);
    const f = L.f, cx = L.cx, hy = L.hy, Cx = L.x, Cy = L.y, Cz = L.z, Fx = L.Fx, Fy = L.Fy, Rx = L.Rx, Ry = L.Ry;
    const fog = this.fog, fr = fog.c[0], fg = fog.c[1], fb = fog.c[2], fN = fog.near, fF = fog.far, fM = fog.max, fogK = 1 / Math.max(1, fF - fN);
    const mist = this.mist, mr = mist.c[0], mg = mist.c[1], mbb = mist.c[2], mTop = mist.top, mDen = mist.density, mRange = mist.range;
    const far = opts.far || fF * 1.02, Wt = this.water, t = this.time;
    const occD = T.occD, occY = T.occY, occN = T.occN;
    let samples = 0;
    if (hf) {
      const N = hf.N, cell = hf.cell, hh = hf.h, wat = hf.water, col = hf.col, ccol = hf.ccol, can = hf.canopy, crop = hf.crop, typ = hf.type, FN = hf.farN, fc = hf.farCell, fh = hf.fh, fcol = hf.fcol, fx0 = hf.fx0, fy0 = hf.fy0, M = hf.M;
      const cf = this.canopyFrom, cfr = 1 / (60 * 16), NEAR = (opts.near === undefined ? 28 : opts.near) * 16, micro = this.micro, nearOK = !!(micro && col);
      const lim = N - 1.001, flim = FN - 1.001, step0 = 3, stepK = .0062 * (opts.quality || 1);
      for (let sx = 0; sx < W; sx++) {
        const u = (sx + .5 - cx) / f, dx = Fx + Rx * u, dy = Fy + Ry * u, base = sx * MB;
        let top = H, nb = 0, D = opts.start || 12, pY = H + 50, pD = D, pWater = false;
        while (D < far && top > 0) {
          const wx = Cx + dx * D, wy = Cy + dy * D;
          let gx = wx / cell, gy = wy / cell, h, c = 0, inCore = gx >= 0 && gy >= 0 && gx < lim && gy < lim, wl = NOWATER, ci = 0, onCan = false;
          if (inCore) {
            const ix = gx | 0, iy = gy | 0, ax = gx - ix, ay = gy - iy, i = iy * N + ix;
            h = (hh[i] * (1 - ax) + hh[i + 1] * ax) * (1 - ay) + (hh[i + N] * (1 - ax) + hh[i + N + 1] * ax) * ay;
            ci = (ay < .5 ? iy : iy + 1) * N + (ax < .5 ? ix : ix + 1);
            wl = wat[ci];
            if (crop[i] | crop[i + 1] | crop[i + N] | crop[i + N + 1]) {
              const ch = ((crop[i] * (1 - ax) + crop[i + 1] * ax) * (1 - ay) + (crop[i + N] * (1 - ax) + crop[i + N + 1] * ax) * ay) * M * .1;
              if (ch > 3) { h += ch; onCan = true; if (!crop[ci]) ci = crop[i] ? i : crop[i + 1] ? i + 1 : crop[i + N] ? i + N : i + N + 1; }
            } else if (D > cf && (can[i] | can[i + 1] | can[i + N] | can[i + N + 1])) {
              const k = Math.min(1, (D - cf) * cfr), ch = ((can[i] * (1 - ax) + can[i + 1] * ax) * (1 - ay) + (can[i + N] * (1 - ax) + can[i + N + 1] * ax) * ay) * M * k;
              if (ch > 10) { h += ch; onCan = true; if (!can[ci]) ci = can[i] ? i : can[i + 1] ? i + 1 : can[i + N] ? i + N : i + N + 1; }
            }
          } else {
            let ux = (wx - fx0) / fc, uy = (wy - fy0) / fc; if (ux < 0) ux = 0; else if (ux > flim) ux = flim; if (uy < 0) uy = 0; else if (uy > flim) uy = flim;
            const ix = ux | 0, iy = uy | 0, ax = ux - ix, ay = uy - iy, i = iy * FN + ix;
            h = (fh[i] * (1 - ax) + fh[i + 1] * ax) * (1 - ay) + (fh[i + FN] * (1 - ax) + fh[i + FN + 1] * ax) * ay;
            ci = (ay < .5 ? iy : iy + 1) * FN + (ax < .5 ? ix : ix + 1);
          }
          const isW = wl > h; if (isW) h = wl;
          const y = hy - (h - Cz) * f / D;
          let yi = Math.ceil(y); if (yi < 0) yi = 0;
          samples++;
          if (yi < top) {
            // the colour of this sample (fogged, misted)
            let a = (D - fN) * fogK; a = a < 0 ? 0 : a > 1 ? fM : a * fM;
            let ma = 0; if (mDen > 0 && h < mTop) { ma = (mTop - h) / mTop * mDen * Math.min(1, D / mRange); if (ma > .85) ma = .85; }
            if (isW) {
              const fres = Math.min(1, D / (90 * 16)), rip = Math.sin(wx * .045 + wy * .013 + t * 1.7) + Math.sin(wx * .011 - wy * .05 - t * 1.1) * .6, band = rip > 1.15 ? .16 : rip < -1.3 ? -.08 : 0;
              let wr = Wt.deep[0] + (Wt.sky[0] - Wt.deep[0]) * fres, wg = Wt.deep[1] + (Wt.sky[1] - Wt.deep[1]) * fres, wb = Wt.deep[2] + (Wt.sky[2] - Wt.deep[2]) * fres;
              if (inCore) { const gd = h - hh[ci]; if (gd < 4) { const s = 1 - gd / 4; wr += (Wt.foam[0] - wr) * s * .6; wg += (Wt.foam[1] - wg) * s * .6; wb += (Wt.foam[2] - wb) * s * .6; } else if (gd < 14) { const s = 1 - (gd - 4) / 10; wr += (Wt.shallow[0] - wr) * s * .5; wg += (Wt.shallow[1] - wg) * s * .5; wb += (Wt.shallow[2] - wb) * s * .5; } }
              if (Wt.ice && inCore && hf.wdist && typ[ci] === 9) { wr = Wt.ice[0]; wg = Wt.ice[1]; wb = Wt.ice[2]; }
              wr *= 1 + band; wg *= 1 + band; wb *= 1 + band;
              c = pack(clamp(wr, 0, 255), clamp(wg, 0, 255), clamp(wb, 0, 255));
            } else if (inCore) { c = onCan ? (ccol ? ccol[ci] : 0xff2a4a2a) : (col ? col[ci] : 0xff3a6a3a); if (onCan && crop[ci] && D < 120 * 16 && yi < top - 1 && ((wx * .37 + wy * .21) & 3) === 0) c = mixPack(c, 40, 30, 20, .3); }
            else c = fcol ? fcol[ci] : 0xff3a5a4a;
            if (ma > 0) c = mixPack(c, mr, mg, mbb, ma);
            if (a > 0) c = mixPack(c, fr, fg, fb, a);
            const yEnd = top;
            if (nearOK && D < NEAR && inCore && !isW && !onCan) {
              // near ground: each pixel's own ground point, the type's micro texture over the baked colour
              const ipD = 1 / pD, iD = 1 / D, span = pY - y || 1;
              for (let row = yi; row < yEnd; row++) {
                let tt = (row + .5 - y) / span; if (tt < 0) tt = 0; else if (tt > 1) tt = 1;
                const Dp = 1 / (iD + (ipD - iD) * tt), px = Cx + dx * Dp, py = Cy + dy * Dp;
                const qx = px / cell, qy = py / cell, ix = qx | 0, iy = qy | 0;
                if (ix < 0 || iy < 0 || ix >= N - 1 || iy >= N - 1) { buf[row * W + sx] = c; continue; }
                const j = iy * N + ix, ax = qx - ix, ay = qy - iy, ty = typ[(ay < .5 ? iy : iy + 1) * N + (ax < .5 ? ix : ix + 1)], mt = micro[ty] || micro[0];
                const c00 = col[j], c10 = col[j + 1], c01 = col[j + N], c11 = col[j + N + 1], w00 = (1 - ax) * (1 - ay), w10 = ax * (1 - ay), w01 = (1 - ax) * ay, w11 = ax * ay;
                const m = 1 + mt[((py * 1.6) & 63) * 64 + ((px * 1.6) & 63)] / 128, dz = (E.bayer(sx, row) - .5) * 6;
                let r = ((c00 & 255) * w00 + (c10 & 255) * w10 + (c01 & 255) * w01 + (c11 & 255) * w11) * m + dz;
                let g = (((c00 >>> 8) & 255) * w00 + ((c10 >>> 8) & 255) * w10 + ((c01 >>> 8) & 255) * w01 + ((c11 >>> 8) & 255) * w11) * m + dz;
                let b = (((c00 >>> 16) & 255) * w00 + ((c10 >>> 16) & 255) * w10 + ((c01 >>> 16) & 255) * w01 + ((c11 >>> 16) & 255) * w11) * m + dz;
                let cc = pack(r > 255 ? 255 : r < 0 ? 0 : r, g > 255 ? 255 : g < 0 ? 0 : g, b > 255 ? 255 : b < 0 ? 0 : b);
                if (ma > 0) cc = mixPack(cc, mr, mg, mbb, ma);
                if (a > 0) cc = mixPack(cc, fr, fg, fb, a);
                buf[row * W + sx] = cc;
              }
            } else for (let row = yi; row < yEnd; row++) buf[row * W + sx] = c;
            if (nb < MB) { occD[base + nb] = D; occY[base + nb] = yi; nb++; }
            top = yi;
          }
          pY = y; pD = D; pWater = isW;
          D += D * stepK > step0 ? D * stepK : step0;
        }
        if (fog.fill && top > 0) { const fc = pack(fr, fg, fb); for (let row = 0; row < top; row++) buf[row * W + sx] = fc; }   // a fog bank: the air itself, no sky beyond it
        occN[sx] = nb; T.depth[sx] = D;
      }
    } else {   // a flat floor at z 0 (the fallback, and the first milestone)
      for (let sx = 0; sx < W; sx++) {
        occN[sx] = 0;
        for (let row = Math.max(0, Math.ceil(hy)); row < H; row++) { const D = Cz * f / Math.max(.01, row + .5 - hy); let a = clamp((D - fN) * fogK, 0, 1) * fM; buf[row * W + sx] = mixPack(pack(70, 110, 60), fr, fg, fb, a); }
      }
    }
    this.stats.samples = samples;
    if (items && items.length) this._items(T, L, items);
    return T;
  }
  _items(T, L, items) {
    this._L = L;
    const W = T.W, H = T.H, list = [], p = [0, 0, 0, 0];
    for (const it of items) {
      if (!L.project(it.x, it.y, it.z || 0, p)) continue;
      const k = p[2] * (it.scale || 1), D = p[3];
      if (D > (it.far || this.billboardFar * (it.imp ? 1 : 1.6))) continue;
      const r = (it.box ? it.box[0] : it.size ? it.size : 24) * k, h = (it.box ? it.box[1] : 48) * k;
      if (p[0] + r * 1.6 + 4 < 0 || p[0] - r * 1.6 - 4 > W || p[1] + 6 < 0 || p[1] - h - 10 > H) continue;
      list.push({ it, sx: p[0], sy: p[1], k, D });
    }
    list.sort((a, b) => b.D - a.D);
    this.stats.items = list.length;
    const fog = this.fog, fN = fog.near, fogK = 1 / Math.max(1, fog.far - fN);
    for (const e of list) {
      const it = e.it; let a = (e.D - fN) * fogK; a = a < 0 ? 0 : a > 1 ? fog.max : a * fog.max;
      let ma = 0; const mist = this.mist; if (mist.density > 0 && (it.z || 0) < mist.top) { ma = (mist.top - (it.z || 0)) / mist.top * mist.density * Math.min(1, e.D / mist.range) * .8; }
      if (it.dot) this._dot(T, e, a, ma);
      else if (it.imp) this._imp(T, e, a, ma);
      else if (it.draw) this._live(T, L, e, a, ma);
    }
  }
  /** an item standing in water (it.wade: the surface's height) shows nothing below the waterline: the screen row
   *  where that line crosses the item, or a huge number */
  _wadeY(it, e) {
    if (it.wade === undefined || it.wade === null) return 1e9;
    const p = this._wp || (this._wp = [0, 0, 0, 0]); if (!this._L || !this._L.project(it.x, it.y, it.wade, p)) return 1e9;
    return Math.round(p[1]);
  }
  _fogged(c, a, ma) {
    if (ma > 0) c = mixPack(c, this.mist.c[0], this.mist.c[1], this.mist.c[2], ma);
    return a > 0 ? mixPack(c, this.fog.c[0], this.fog.c[1], this.fog.c[2], a) : c;
  }
  _dot(T, e, a, ma) {
    const it = e.it, s = Math.max(1, Math.round((it.size || 1) * e.k)), x0 = Math.round(e.sx - s / 2), y0 = Math.round(e.sy - s / 2), W = T.W, H = T.H;
    const c = this._fogged(typeof it.dot === 'number' ? it.dot : (it._c || (it._c = pack(...hexRGB(it.dot)))), it.fog === false ? 0 : a, ma), bias = it.bias || 8;
    for (let x = Math.max(0, x0); x < Math.min(W, x0 + s); x++) { const oc = T.occ(x, e.D - bias); for (let y = Math.max(0, y0); y < Math.min(H, y0 + s, oc); y++) T.buf[y * W + x] = c; }
  }
  _imp(T, e, a, ma) {
    const it = e.it, spr = it.imp.get(it.id, it.variant || 0, it.facing || 0, e.k); if (!spr || !spr.px) return;
    const s = e.k / spr.k, W = T.W, H = T.H, buf = T.buf, sp = spr.px, sw = spr.w, sh = spr.h;
    const x0 = Math.round(e.sx - spr.ox * s), y0 = Math.round(e.sy - spr.oy * s), dw = Math.max(1, Math.round(sw * s)), dh = Math.max(1, Math.round(sh * s)), bias = (it.bias === undefined ? 10 : it.bias);
    const fr = this.fog.c[0], fg = this.fog.c[1], fb = this.fog.c[2], mi = this.mist.c, inv = 1 / s;
    const sway = it.sway ? it.sway : 0, wy = this._wadeY(it, e);
    for (let dx = 0; dx < dw; dx++) {
      const X = x0 + dx; if (X < 0 || X >= W) continue;
      const oc = Math.min(T.occ(X, e.D - bias), wy), yEnd = Math.min(y0 + dh, oc, H);
      for (let Y = Math.max(0, y0); Y < yEnd; Y++) {
        const ry = (Y - y0) * inv | 0; let rx = dx * inv | 0;
        if (sway && ry < sh * .55) { rx = Math.round(rx - sway * (1 - ry / (sh * .55)) * inv); if (rx < 0 || rx >= sw) continue; }
        const c = sp[ry * sw + rx]; if (!c) continue;
        let cc = c; if (ma > 0) cc = mixPack(cc, mi[0], mi[1], mi[2], ma); if (a > 0) cc = mixPack(cc, fr, fg, fb, a);
        buf[Y * W + X] = cc;
      }
    }
    E.vistaDrawn = (E.vistaDrawn || 0) + 1;
  }
  _live(T, L, e, a, ma) {
    const it = e.it, W = T.W, H = T.H, k = e.k, bw = Math.ceil((it.box ? it.box[0] : 24) * k * 2.4) + 10, bh = Math.ceil((it.box ? it.box[1] : 40) * k * 1.3) + 12;
    const x0 = Math.round(e.sx - bw / 2), y0 = Math.round(e.sy - bh + Math.max(6, bh * .18)), cx0 = Math.max(0, x0), cy0 = Math.max(0, y0), cx1 = Math.min(W, x0 + bw), cy1 = Math.min(H, y0 + bh);
    if (cx1 <= cx0 || cy1 <= cy0) return;
    const sc = this.scratch; if (!sc) return;
    if (sc.width < W || sc.height < H) { sc.width = Math.max(sc.width, W); sc.height = Math.max(sc.height, H); this.sg = sc.getContext('2d', { willReadFrequently: true }); }
    const g = this.sg; g.clearRect(cx0, cy0, cx1 - cx0, cy1 - cy0); E.px.reset(g); g.imageSmoothingEnabled = false;
    g.save(); g.beginPath(); g.rect(cx0, cy0, cx1 - cx0, cy1 - cy0); g.clip();
    const dx = it.x - L.x, dy = it.y - L.y, gd = Math.hypot(dx, dy) || 1, yawDeg = -Math.atan2(dy, dx) * 180 / Math.PI - 90, pitch = Math.atan2(L.z - (it.z || 0) - (it.box ? it.box[1] * .45 : 0), gd) * 180 / Math.PI;
    const view = exactView(viewFor(k, yawDeg, Math.max(0, pitch)), L, e, k, it);
    try { it.draw(g, e.sx, e.sy, k, view, e.D); } catch (er) { if (E.current) E.current.fail('vista item', er); }
    g.restore();
    const ww = cx1 - cx0, hh = cy1 - cy0, img = g.getImageData(cx0, cy0, ww, hh), P = new Uint32Array(img.data.buffer);
    // a 1-pixel outline round the opaque shape (in the item's colour, or the hunt's)
    const oc = it.outline === false ? 0 : (it._oc || (it._oc = pack(...hexRGB(it.outline || '#140c10')))), buf = T.buf, bias = it.bias === undefined ? 10 : it.bias;
    const fr = this.fog.c[0], fg = this.fog.c[1], fb = this.fog.c[2], mi = this.mist.c, alphaK = it.alpha === undefined ? 1 : it.alpha;
    const wy = this._wadeY(it, e), foam = wy < 1e9 ? this._fogged(pack(214, 228, 236), a, ma) : 0;
    for (let x = 0; x < ww; x++) {
      const X = cx0 + x, ocT = T.occ(X, e.D - bias), ocY = Math.min(ocT, wy);
      if (foam && wy < ocT && wy >= cy0 && wy < cy0 + hh) { const i = (wy - cy0) * ww + x; if (P[i] >>> 24 > 90 || (x > 0 && P[i - 1] >>> 24 > 90) || (x < ww - 1 && P[i + 1] >>> 24 > 90)) buf[wy * W + X] = foam; }   // the water round the legs
      for (let y = 0; y < hh; y++) {
        const Y = cy0 + y; if (Y >= ocY) break;
        const i = y * ww + x, c = P[i]; let cc;
        if (c >>> 24 > 90) cc = (c | 0xff000000) >>> 0;
        else if (oc && ((x > 0 && P[i - 1] >>> 24 > 90) || (x < ww - 1 && P[i + 1] >>> 24 > 90) || (y > 0 && P[i - ww] >>> 24 > 90) || (y < hh - 1 && P[i + ww] >>> 24 > 90))) cc = oc;
        else continue;
        if (ma > 0) cc = mixPack(cc, mi[0], mi[1], mi[2], ma);
        if (a > 0) cc = mixPack(cc, fr, fg, fb, a);
        if (alphaK < 1) { const q = buf[Y * W + X]; if (q) cc = mixPack(q, cc & 255, (cc >>> 8) & 255, (cc >>> 16) & 255, alphaK); else if (E.bayer(X, Y) > alphaK) continue; }
        buf[Y * W + X] = cc;
      }
    }
  }
  /** the sky into a canvas the size of the screen: a Backdrop turned with the heading, the sun's disc and its glow */
  drawSky(g, r, L, W, H) {
    const sky = this.o.sky;
    if (sky && sky.draw) {
      const c = this._skyCv && this._skyCv.width === W && this._skyCv.height === H ? this._skyCv : (this._skyCv = E.mkCanvas(W, H)), cg = E.ctx2d(c);
      const turn = L.yaw * L.f * 3, val = value => ({ value });
      cg.clearRect(0, 0, W, H); E.px.reset(cg);
      const hyOff = Math.round(L.hy - H * .5);
      cg.save(); cg.translate(0, hyOff);
      try { sky.draw(Object.create(r, { ctx: val(cg), bw: val(W), bh: val(H), W: val(W), H: val(H), ix: val(turn), iy: val(0), tgt: val(cg) })); } catch (e) { if (E.current) E.current.fail('sky', e); }
      cg.restore();
      if (hyOff > 0) { const sk = sky.sky || ['#6080c0']; cg.fillStyle = sk[0]; cg.fillRect(0, 0, W, hyOff); }
      g.drawImage(c, 0, 0);
    } else { g.fillStyle = '#8ab0d8'; g.fillRect(0, 0, W, H); }
    E.px.reset(g);
    // the sun (or moon): placed by its bearing and elevation
    const S = this.sun; if (S && S.disc !== false) {
      const sy = S.yaw * Math.PI / 180, se = S.elev * Math.PI / 180, dx = Math.cos(sy) * Math.cos(se), dy = Math.sin(sy) * Math.cos(se), dz = Math.sin(se);
      const fwd = dx * L.Fx + dy * L.Fy;
      if (fwd > .05) {
        const lat = dx * L.Rx + dy * L.Ry, sx = L.cx + lat / fwd * L.f, syy = L.hy - dz / fwd * L.f, rr = Math.max(3, Math.round((S.r || 5) * L.f / 440));
        if (sx > -60 && sx < W + 60) {
          const c = S.disc || '#fff6d8';
          E.px.ddisc(g, sx, syy, rr * 5, S.glow || '#ffe0a0', .35); E.px.ddisc(g, sx, syy, rr * 2.4, S.glow || '#ffe8b0', .5);
          E.px.disc(g, sx, syy, rr, c); E.px.disc(g, sx - rr * .25, syy - rr * .25, Math.max(1, rr * .6), '#ffffff');
          this.sunScreen = [sx, syy];
        } else this.sunScreen = null;
      } else this.sunScreen = null;
    }
  }
  /** the whole frame as an overlay: the sky, then the ground and the items over it */
  draw(r, L, items, opts = {}) {
    const W = r.W, H = r.H, T = this.target(W, H, opts.key || 'main');
    r.overlay(g => {
      const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
      this.drawSky(g, r, L, W, H);
      this.render(T, L, items, opts);
      this.present(g, T, 0, 0);
      if (opts.after) opts.after(g, T);
      this.stats.ms = (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
    });
    return T;
  }
  /** copy a target onto g at (x, y) through the grade (a target's alpha-0 pixels let the sky through) */
  present(g, T, x, y, mask) {
    if (!T.img) return;
    const src = T.buf, dst = T.img32, lut = this.lut, n = src.length;
    if (lut) for (let i = 0; i < n; i++) { const c = src[i]; dst[i] = c ? (0xff000000 | lut[2][(c >>> 16) & 255] << 16 | lut[1][(c >>> 8) & 255] << 8 | lut[0][c & 255]) >>> 0 : 0; }
    else dst.set(src);
    if (mask) mask(dst, T.W, T.H);
    T.g.putImageData(T.img, 0, 0);
    g.drawImage(T.cv, x, y);
    E.px.reset(g);
  }
}
function makeLUT(G) {
  if (!G || (!G.mul && !G.add && !G.gamma)) return null;
  const mul = G.mul ? hexRGB(G.mul) : [255, 255, 255], add = G.add ? hexRGB(G.add) : [0, 0, 0], gm = G.gamma || 1, con = G.contrast || 1;
  return [0, 1, 2].map(ch => { const t = new Uint8Array(256); for (let v = 0; v < 256; v++) { let x = Math.pow(v / 255, gm); x = (x - .5) * con + .5; x = x * mul[ch] / 255 + add[ch] / 255; t[v] = clamp(Math.round(x * 255), 0, 255); } return t; });
}
E.Vista = Vista;
})(typeof My3D2dge !== 'undefined' ? My3D2dge : undefined);
