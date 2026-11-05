// The Vista renderer: a lens (sheared perspective: verticals stay vertical), a column-marched heightfield with a depth
// buffer, and "pixel volumes": shaded capsules, spheres and flat triangles drawn with depth and the engine's tones
// (E.tones: deep, sh, base, lt, hi with ordered dither), 1-pixel outlines on animals, fog, mist, water, a sky with sun,
// clouds and mountain ranges that turn with the camera, weather and a vignette. One pass draws into any rectangle: the
// main view, a scope lens (the same camera, magnified about a point), the Trophy Cam, the x-ray cards.
(() => {
const B = BB, E = B.E;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
const bay = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
B.bay = bay;

// ---- lens ----
class Lens {
  constructor(o = {}) { Object.assign(this, { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, fov: 32, roll: 0, W: 480, H: 270, ox: 0, oy: 0, mag: 1 }, o); this.update(); }
  set(o) { Object.assign(this, o); return this.update(); }
  update() {
    const fv = this.fov * B.DEG;
    this.cx = this.W / 2 + this.ox; this.cy = this.H / 2 + this.oy;
    this.f = (this.H / 2) / Math.tan(fv / 2) * this.mag;
    this.horizonY = this.cy - this.f * Math.tan(this.pitch * B.DEG);
    this.Fx = Math.cos(this.yaw); this.Fy = Math.sin(this.yaw); this.Rx = Math.sin(this.yaw); this.Ry = -Math.cos(this.yaw);
    return this;
  }
  // world point -> [sx, sy, k (pixels per metre), D (forward distance)] or null behind
  project(px, py, pz) {
    const dx = px - this.x, dy = py - this.y, D = dx * this.Fx + dy * this.Fy;
    if (D < .3) return null;
    const L = dx * this.Rx + dy * this.Ry, k = this.f / D;
    return [this.cx + L * k, this.horizonY - (pz - this.z) * k, k, D];
  }
  // screen point -> unit world direction
  ray(sx, sy) {
    const a = (sx - this.cx) / this.f, b = (this.horizonY - sy) / this.f;
    const dx = this.Fx + this.Rx * a, dy = this.Fy + this.Ry * a, dz = b, l = Math.hypot(dx, dy, dz);
    return [dx / l, dy / l, dz / l];
  }
  // the same camera magnified about screen point (sx0, sy0), drawn centred in a w x h target
  magnified(sx0, sy0, mag, w, h) {
    const L = new Lens({ x: this.x, y: this.y, z: this.z, yaw: this.yaw, pitch: this.pitch, fov: this.fov, W: this.W, H: this.H, mag: this.mag * mag });
    // aim: the ray through (sx0, sy0) must land at the target's centre
    const a = (sx0 - this.cx) / this.f, b = (this.horizonY - sy0) / this.f;
    L.W = w; L.H = h; L.mag = 1; L.f = this.f * mag; L.cx = w / 2 - a * L.f; L.horizonY = h / 2 + b * L.f;
    L.update = function () { return this; };
    return L;
  }
  clone(o = {}) { return new Lens(Object.assign({ x: this.x, y: this.y, z: this.z, yaw: this.yaw, pitch: this.pitch, fov: this.fov, W: this.W, H: this.H, ox: this.ox, oy: this.oy, mag: this.mag }, o)); }
}
B.Lens = Lens;

// ---- colour tools ----
const toneCache = new Map();
const unpack = c => [c & 255, c >> 8 & 255, c >> 16 & 255];
const pk = (r, g, b) => (255 << 24 | (b < 0 ? 0 : b > 255 ? 255 : b | 0) << 16 | (g < 0 ? 0 : g > 255 ? 255 : g | 0) << 8 | (r < 0 ? 0 : r > 255 ? 255 : r | 0)) >>> 0;
B.pk = pk; B.unpack = unpack;
const hexPk = h => { const c = E.hex(h); return pk(c[0], c[1], c[2]); };
B.hexPk = hexPk;
// five tones, packed
B.tones = hex => {
  let t = toneCache.get(hex);
  if (!t) { const o = E.tones(hex); t = [o.deep, o.sh, o.base, o.lt, o.hi].map(hexPk); toneCache.set(hex, t); }
  return t;
};
const mixPk = (a, b, t) => { const A = unpack(a), Bc = unpack(b); return pk(A[0] + (Bc[0] - A[0]) * t, A[1] + (Bc[1] - A[1]) * t, A[2] + (Bc[2] - A[2]) * t); };
B.mixPk = mixPk;

// ---- a target: frame, depth and ids ----
class Target {
  constructor(w, h) { this.resize(w, h); }
  resize(w, h) {
    this.W = w; this.H = h; this.n = w * h;
    this.frame = new Uint32Array(w * h); this.depth = new Float32Array(w * h); this.ids = new Uint16Array(w * h);
    this.tops = new Float32Array(w); this.cv = null; this.img = null;
  }
  canvas() {
    if (!this.cv || this.cv.width !== this.W || this.cv.height !== this.H) {
      this.cv = E.mkCanvas(this.W, this.H); this.cg = this.cv.getContext ? E.ctx2d(this.cv) : null;
      this.img = this.cg && this.cg.createImageData ? this.cg.createImageData(this.W, this.H) : null;
    }
    if (this.img) { new Uint32Array(this.img.data.buffer).set(this.frame); this.cg.putImageData(this.img, 0, 0); }
    return this.cv;
  }
}
B.Target = Target;

// ---- the rasterizer state for one pass ----
class Raster {
  constructor() { this.t = null; this.lens = null; this.id = 1; this.fogC = 0; this.fogNear = 100; this.fogFar = 900; this.fogMax = .9; this.time = 0; this.Lc = [0, .5, .8]; this.rim = 0; this.rimC = 0; this.xray = 0; }
  begin(t, lens, env) {
    this.t = t; this.lens = lens; this.env = env; this.time = env.time || 0;
    this.fogC = env.fogC; this.fogNear = env.fogNear; this.fogFar = env.fogFar; this.fogMax = env.fogMax;
    const L = env.sunV, l = lens;
    this.Lc = [l.Rx * L[0] + l.Ry * L[1], L[2], -(l.Fx * L[0] + l.Fy * L[1])];
    this.rim = env.rim || 0; this.rimC = env.rimC || 0; this.outlineC = env.outlineC || hexPk('#1a1410');
    this.obox = [];   // boxes of outlined objects this pass
  }
  fogAt(D, z) {
    let f = (D - this.fogNear) / (this.fogFar - this.fogNear); f = f < 0 ? 0 : f > 1 ? 1 : f; f *= this.fogMax;
    const e = this.env; if (e.mistTop !== undefined && z < e.mistTop && D > 25) f = Math.max(f, Math.min(.85, (e.mistTop - z) / e.mistDepth * Math.min(1, (D - 25) / 60) * e.mist));
    return f;
  }
  // shaded tone index from a screen-space normal
  shadeIdx(nx, ny, nz, x, y) {
    const L = this.Lc; let l = nx * L[0] + ny * L[1] + nz * L[2]; l = l < 0 ? 0 : l;
    const v = .42 + l * .7 + (bay(x, y) - .5) * .14;
    return v < .3 ? 0 : v < .55 ? 1 : v < .85 ? 2 : v < 1.02 ? 3 : 4;
  }
  // a tapered capsule from A (radius ra) to B (radius rb): limbs, bodies, trunks, cones (rb = 0)
  capsule(ax, ay, az, bx, by, bz, ra, rb, tones, o) {
    const l = this.lens, PA = l.project(ax, ay, az), PB = l.project(bx, by, bz);
    if (!PA || !PB) return;
    const t = this.t, W = t.W, H = t.H, F = t.frame, Dp = t.depth, I = t.ids;
    const pa = Math.max(.55, ra * PA[2]), pb = Math.max(rb > 0 ? .55 : 0, rb * PB[2]);
    const x0 = Math.max(0, Math.floor(Math.min(PA[0] - pa, PB[0] - pb))), x1 = Math.min(W - 1, Math.ceil(Math.max(PA[0] + pa, PB[0] + pb)));
    const y0 = Math.max(0, Math.floor(Math.min(PA[1] - pa, PB[1] - pb))), y1 = Math.min(H - 1, Math.ceil(Math.max(PA[1] + pa, PB[1] + pb)));
    if (x0 > x1 || y0 > y1) return;
    const vx = PB[0] - PA[0], vy = PB[1] - PA[1], l2 = vx * vx + vy * vy;
    const Dm = (PA[3] + PB[3]) / 2, fog = this.fogAt(Dm, (az + bz) / 2), fogC = this.fogC;
    const tn = fog > .02 ? fogTones(tones, fogC, fog) : tones;
    const id = (o && o.id) || 0, rough = o && o.rough, seed = (o && o.seed) || 0, flat = o && o.flat, xr = this.xray || (o && o.xray);
    const cxr = PA[0], cyr = PA[1];
    const rim = this.rim && !(o && o.noRim);
    for (let y = y0; y <= y1; y++) {
      const py = y + .5;
      for (let x = x0; x <= x1; x++) {
        const px = x + .5; let tt = l2 ? ((px - PA[0]) * vx + (py - PA[1]) * vy) / l2 : 0; tt = tt < 0 ? 0 : tt > 1 ? 1 : tt;
        const qx = px - (PA[0] + vx * tt), qy = py - (PA[1] + vy * tt), rr = pa + (pb - pa) * tt;
        const d2 = qx * qx + qy * qy; if (d2 > rr * rr) continue;
        const ox = qx / rr, oy = qy / rr; const o2 = ox * ox + oy * oy, nz = Math.sqrt(1 - (o2 > 1 ? 1 : o2));
        if (rough && o2 > .45 && B.hash2((x - cxr) | 0, (y - cyr) | 0, seed) < (o2 - .45) * 1.6) continue;
        const D = PA[3] + (PB[3] - PA[3]) * tt - (ra + (rb - ra) * tt) * nz * .9;
        const p = y * W + x; if (D >= Dp[p]) continue;
        if (xr && ((x + y) & 1)) continue;
        let k = flat ? 2 : this.shadeIdx(ox, -oy, nz, x, y);
        if (rough) { const h = B.hash2(((x - cxr) / 2) | 0, ((y - cyr) / 2) | 0, seed + 9); k += h < .22 ? -1 : h > .82 ? 1 : 0; k = k < 0 ? 0 : k > 4 ? 4 : k; }
        let c = tn[k];
        if (rim && nz < .45 && this.Lc[2] < -.15) c = this.rimC;
        F[p] = c; Dp[p] = D; I[p] = id;
      }
    }
    if (o && o.outline) this.obox.push([id, x0, y0, x1, y1]);
  }
  sphere(x, y, z, r, tones, o) { this.capsule(x, y, z, x, y, z + 1e-4, r, r, tones, o); }
  // a flat-shaded triangle with perspective-correct depth
  tri(a, b, c, color, o) {
    const l = this.lens, A = l.project(a[0], a[1], a[2]), Bp = l.project(b[0], b[1], b[2]), C = l.project(c[0], c[1], c[2]);
    if (!A || !Bp || !C) return;
    const t = this.t, W = t.W, H = t.H, F = t.frame, Dp = t.depth, I = t.ids;
    const x0 = Math.max(0, Math.floor(Math.min(A[0], Bp[0], C[0]))), x1 = Math.min(W - 1, Math.ceil(Math.max(A[0], Bp[0], C[0])));
    const y0 = Math.max(0, Math.floor(Math.min(A[1], Bp[1], C[1]))), y1 = Math.min(H - 1, Math.ceil(Math.max(A[1], Bp[1], C[1])));
    const area = (Bp[0] - A[0]) * (C[1] - A[1]) - (Bp[1] - A[1]) * (C[0] - A[0]);
    if (Math.abs(area) < 1e-6 || x0 > x1 || y0 > y1) return;
    const iA = 1 / A[3], iB = 1 / Bp[3], iC = 1 / C[3];
    const fog = this.fogAt((A[3] + Bp[3] + C[3]) / 3, (a[2] + b[2] + c[2]) / 3);
    let col = typeof color === 'number' ? color : color[2];
    if (fog > .02) col = mixPk(col, this.fogC, fog);
    const id = (o && o.id) || 0, dith = o && o.dither, alt = o && o.alt;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + .5, py = y + .5;
      const w0 = ((Bp[0] - px) * (C[1] - py) - (Bp[1] - py) * (C[0] - px)) / area, w1 = ((C[0] - px) * (A[1] - py) - (C[1] - py) * (A[0] - px)) / area, w2 = 1 - w0 - w1;
      if (w0 < -.001 || w1 < -.001 || w2 < -.001) continue;
      const D = 1 / (w0 * iA + w1 * iB + w2 * iC), p = y * W + x;
      if (D >= Dp[p]) continue;
      if (dith && dith < bay(x, y)) continue;
      F[p] = alt && ((x >> 1) + (y >> 1)) & 1 ? alt : col; Dp[p] = D; I[p] = id;
    }
    if (o && o.outline) this.obox.push([id, x0, y0, x1, y1]);
  }
  quad(a, b, c, d, color, o) { this.tri(a, b, c, color, o); this.tri(a, c, d, color, o); }
  // an oriented box: centre, half sizes [along facing, across, up], facing; faces shaded by the sun
  box(cx, cy, cz, hx, hy, hz, facing, hex, o) {
    const tn = typeof hex === 'string' ? B.tones(hex) : hex, c = Math.cos(facing), s = Math.sin(facing);
    const P = (a, b, h) => [cx + c * a * hx - s * b * hy, cy + s * a * hx + c * b * hy, cz + h * hz];
    const L = this.env.sunV;
    const face = (nx, ny, nz, q) => { const l = nx * L[0] + ny * L[1] + nz * L[2]; const k = l > .55 ? 3 : l > .15 ? 2 : l > -.2 ? 1 : 0; this.quad(q[0], q[1], q[2], q[3], tn[k], o); };
    face(c, s, 0, [P(1, -1, -1), P(1, 1, -1), P(1, 1, 1), P(1, -1, 1)]);
    face(-c, -s, 0, [P(-1, -1, -1), P(-1, 1, -1), P(-1, 1, 1), P(-1, -1, 1)]);
    face(-s, c, 0, [P(-1, 1, -1), P(1, 1, -1), P(1, 1, 1), P(-1, 1, 1)]);
    face(s, -c, 0, [P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1), P(-1, -1, 1)]);
    if (!(o && o.noTop)) face(0, 0, 1, [P(-1, -1, 1), P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1)]);
  }
  // a dot (particles): a square of size s pixels at least 1
  dot(x, y, z, sizeM, color, o) {
    const P = this.lens.project(x, y, z); if (!P) return;
    const t = this.t, W = t.W, H = t.H, s = Math.max(1, Math.round(sizeM * P[2])), x0 = Math.round(P[0] - s / 2), y0 = Math.round(P[1] - s / 2);
    let col = color; const fog = this.fogAt(P[3], z); if (fog > .05) col = mixPk(col, this.fogC, fog);
    for (let yy = Math.max(0, y0); yy < Math.min(H, y0 + s); yy++) for (let xx = Math.max(0, x0); xx < Math.min(W, x0 + s); xx++) {
      const p = yy * W + xx; if (P[3] - .05 >= t.depth[p]) continue;
      if (o && o.alpha !== undefined && o.alpha < bay(xx, yy)) continue;
      t.frame[p] = col; if (!(o && o.noDepth)) t.depth[p] = P[3];
    }
  }
  // 1-pixel outlines round the outlined objects drawn this pass
  outlines() {
    const t = this.t, W = t.W, H = t.H, I = t.ids, Dp = t.depth, F = t.frame, oc = this.outlineC;
    for (const [id, x0, y0, x1, y1] of this.obox) {
      if (!id) continue;
      for (let y = Math.max(0, y0 - 1); y <= Math.min(H - 1, y1 + 1); y++) for (let x = Math.max(0, x0 - 1); x <= Math.min(W - 1, x1 + 1); x++) {
        const p = y * W + x; if (I[p] === id) continue;
        let near = -1;
        if (x > 0 && I[p - 1] === id) near = p - 1; else if (x < W - 1 && I[p + 1] === id) near = p + 1; else if (y > 0 && I[p - W] === id) near = p - W; else if (y < H - 1 && I[p + W] === id) near = p + W;
        if (near >= 0 && Dp[p] > Dp[near] + .3) { F[p] = oc; Dp[p] = Dp[near] + .05; I[p] = 65535; }
      }
    }
  }
}
const fogToneCache = new Map();
function fogTones(tones, fc, f) {
  const q = Math.round(f * 12) / 12, key = tones[2] * 31 + tones[0] * 7 + q * 1000 + fc;
  let r = fogToneCache.get(key);
  if (!r) { r = tones.map(c => mixPk(c, fc, q)); if (fogToneCache.size > 6000) fogToneCache.clear(); fogToneCache.set(key, r); }
  return r;
}
B.Raster = Raster;

// ---- environment per hunt (sky, sun, fog), with the dev time-of-day shift ----
B.envFor = (hunt, time) => {
  const P = hunt.palette, sun = hunt.sun, T = B.TUNING, shift = T.timeOfDay || 0;
  const el = (sun.elevation + shift * 14) * B.DEG, az = sun.azimuth * B.DEG;
  const sunV = [Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el)];
  const fd = T.fog;
  return {
    hunt, time, sunV, sunEl: el, sunAz: az,
    sky: P.sky.map(hexPk), sunC: hexPk(sun.disc || '#fff4d0'), glowC: hexPk(sun.glow || sun.color),
    fogC: hexPk(P.fog), fogNear: hunt.fog.near / Math.max(.15, fd), fogFar: hunt.fog.far / Math.max(.15, fd), fogMax: Math.min(1, hunt.fog.max * Math.min(1.4, fd)),
    mistTop: hunt.fog.mistTop, mistDepth: hunt.fog.mistDepth || 6, mist: (hunt.fog.mist || 0) * fd,
    water: P.water.map(hexPk), rim: hunt.rim || 0, rimC: hexPk(hunt.rimColor || '#ffc070'), outlineC: hexPk(P.outline || '#1a1410'),
    mountains: hunt.mountains || [], clouds: hunt.clouds || null, grassC: hexPk(P.ground.grass)
  };
};

// ---- the frame ----
const SKY_INF = 1e9;
class Vista {
  constructor() { this.main = new Target(8, 8); this.ras = new Raster(); this.scratch = new Map(); }
  target(key, w, h) { let t = this.scratch.get(key); if (!t) { t = new Target(w, h); this.scratch.set(key, t); } else if (t.W !== w || t.H !== h) t.resize(w, h); return t; }
  // draw a world through a lens into target t; objs: drawables { x, y, z, rad, draw(ras, lens) }
  render(t, lens, world, env, objs, o = {}) {
    const ras = this.ras; ras.begin(t, lens, env); ras.xray = 0;
    t.depth.fill(SKY_INF); t.ids.fill(0);
    if (world && world.col) this.terrain(t, lens, world, env, o); else this.flat(t, lens, env);
    this.sky(t, lens, env);
    if (objs) {
      for (const ob of objs) {
        if (ob.cull !== false) {
          const P = lens.project(ob.x, ob.y, ob.z + (ob.rad || 1) * .5);
          const r = (ob.rad || 1) * 1.6;
          if (!P) { const dx = ob.x - lens.x, dy = ob.y - lens.y; if (dx * lens.Fx + dy * lens.Fy < -r) continue; }
          else { const rp = r * P[2]; if (P[0] + rp < 0 || P[0] - rp > t.W || P[1] + rp * 1.5 < 0 || P[1] - rp * 1.5 > t.H) continue; if (P[3] > (ob.maxD || 1400)) continue; }
        }
        ob.draw(ras, lens);
      }
    }
    ras.outlines();
  }
  flat(t, lens, env) { // a flat floor, for tests and the range's paper field
    const W = t.W, H = t.H, F = t.frame, Dp = t.depth, hz = lens.horizonY, gc = env.grassC;
    for (let y = Math.max(0, Math.ceil(hz)); y < H; y++) { const D = (lens.z) * lens.f / (y + .5 - hz); const f = Math.min(.9, Math.max(0, (D - env.fogNear) / (env.fogFar - env.fogNear))); const c = mixPk(gc, env.fogC, f); for (let x = 0; x < W; x++) { F[y * W + x] = ((x + y) & 3) === 0 ? mixPk(c, 0xff000000, .06) : c; Dp[y * W + x] = D; } t.tops[0] = 0; }
    for (let x = 0; x < W; x++) t.tops[x] = Math.max(0, Math.ceil(hz));
  }
  terrain(t, lens, w, env, o) {
    const W = t.W, H = t.H, F = t.frame, Dp = t.depth, I = t.ids;
    const top = w.top, col = w.col, water = w.water, type = w.type, N = w.N, CELL = w.cell, far = w.far, farCol = w.farCol;
    const SIZE = N * CELL, camZ = lens.z, f = lens.f, hz = lens.horizonY, maxTop = w.maxTop + 2;
    const fogC = env.fogC, fnr = env.fogNear, ffr = env.fogFar, fmax = env.fogMax, mistTop = env.mistTop === undefined ? -1e9 : env.mistTop, mistDepth = env.mistDepth, mist = env.mist;
    const wat = env.water, time = env.time, sunAz = env.sunAz, sky1 = env.sky[env.sky.length - 1];
    const fogR = fogC & 255, fogG = fogC >> 8 & 255, fogB = fogC >> 16 & 255;
    const maxD = o.maxD || 3200, sm = Math.min(1, 470 / f), nearStep = .12 * Math.max(.4, sm);
    for (let sx = 0; sx < W; sx++) {
      const a = (sx + .5 - lens.cx) / f;
      const dx = lens.Fx + lens.Rx * a, dy = lens.Fy + lens.Ry * a;
      let ytop = H, D = .8, prevH = 0;
      while (D < maxD) {
        const x = lens.x + dx * D, y = lens.y + dy * D;
        let h, c, ty = 1, wl = NaN, cidx = -1, inCore = x >= 0 && y >= 0 && x < SIZE - CELL && y < SIZE - CELL;
        let fx, fy, x0, y0, tx, ty2;
        if (inCore) {
          fx = x / CELL; fy = y / CELL; x0 = fx | 0; y0 = fy | 0; tx = fx - x0; ty2 = fy - y0;
          const i0 = y0 * N + x0, A = top[i0], Bv = top[i0 + 1], C = top[i0 + N], Dv = top[i0 + N + 1];
          h = A + (Bv - A) * tx + (C - A) * ty2 + (A - Bv - C + Dv) * tx * ty2;
          cidx = (ty2 < .5 ? y0 : y0 + 1) * N + (tx < .5 ? x0 : x0 + 1); wl = water[cidx]; ty = type[cidx];
          if (wl === wl && wl > h) h = wl; else wl = NaN;
        } else {
          fx = (x + 1536) / 16; fy = (y + 1536) / 16; x0 = Math.floor(fx); y0 = Math.floor(fy);
          if (x0 < 0 || y0 < 0 || x0 >= 255 || y0 >= 255) break;
          tx = fx - x0; ty2 = fy - y0; const i0 = y0 * 256 + x0, A = far[i0], Bv = far[i0 + 1], C = far[i0 + 256], Dv = far[i0 + 257];
          h = A + (Bv - A) * tx + (C - A) * ty2 + (A - Bv - C + Dv) * tx * ty2;
        }
        const syf = hz - (h - camZ) * f / D;
        if (syf < ytop) {
          let y0s = syf < 0 ? 0 : Math.ceil(syf - .5);
          if (y0s < ytop) {
            // colour
            if (wl === wl) {
              const fres = Math.min(1, 8 / (D + 4)), rip = Math.sin(x * 1.3 + Math.sin(y * .7) * 2 - time * 2.2) * Math.sin(y * 1.1 + time * 1.3) > .78 ? 1 : 0;
              c = mixPk(wat[1], sky1, .12 + .3 * (1 - fres)); if (D < 40) c = mixPk(wat[0], c, D / 40);
              if (rip) c = mixPk(c, wat[2], .35);
              const brg = Math.abs(B.wrapA(Math.atan2(dy, dx) - sunAz)); if (brg < .12 && ((sx * 7 + y0s * 3 + (time * 9 | 0)) % 5 === 0)) c = wat[2];
            } else if (inCore) {
              const i0 = y0 * N + x0, A = col[i0], Bc = col[i0 + 1], Cc = col[i0 + N], Dc = col[i0 + N + 1];
              const w0 = (1 - tx) * (1 - ty2), w1 = tx * (1 - ty2), w2 = (1 - tx) * ty2, w3 = tx * ty2;
              let r = (A & 255) * w0 + (Bc & 255) * w1 + (Cc & 255) * w2 + (Dc & 255) * w3, g = (A >> 8 & 255) * w0 + (Bc >> 8 & 255) * w1 + (Cc >> 8 & 255) * w2 + (Dc >> 8 & 255) * w3, b = (A >> 16 & 255) * w0 + (Bc >> 16 & 255) * w1 + (Cc >> 16 & 255) * w2 + (Dc >> 16 & 255) * w3;
              if (D < 45) { const m = .88 + B.hash2(Math.floor(x * 3), Math.floor(y * 3), 5) * .24; r *= m; g *= m; b *= m; }
              else if (ty === 12 && D < 420) { const m = .82 + B.hash2(Math.floor(x * .9), Math.floor(y * .9 + h * .9), 6) * .3; r *= m; g *= m; b *= m; }
              c = (255 << 24 | (b > 255 ? 255 : b | 0) << 16 | (g > 255 ? 255 : g | 0) << 8 | (r > 255 ? 255 : r | 0)) >>> 0;
            } else {
              c = farCol[y0 * 256 + x0];
            }
            // fog and mist
            let fg = (D - fnr) / (ffr - fnr); fg = fg < 0 ? 0 : fg > 1 ? 1 : fg; fg *= fmax;
            if (h < mistTop && D > 25) { const m = Math.min(.85, (mistTop - h) / mistDepth * Math.min(1, (D - 25) / 60) * mist); if (m > fg) fg = m; }
            if (fg > .01) { const r = c & 255, g = c >> 8 & 255, b = c >> 16 & 255; c = (255 << 24 | (b + (fogB - b) * fg) << 16 | (g + (fogG - g) * fg) << 8 | (r + (fogR - r) * fg)) >>> 0; }
            // grass tufts near the camera
            if (inCore && D < 14 && (ty === 1 || ty === 2 || ty === 10) && wl !== wl) {
              const tuft = Math.floor(B.hash2(Math.floor(x * 6), Math.floor(y * 6), 3) * 3.4 * (1 - D / 14));
              const yt = Math.max(0, y0s - tuft);
              for (let yy = yt; yy < y0s && yy < ytop; yy++) { const p = yy * W + sx; F[p] = mixPk(c, 0xff102010, .25); Dp[p] = D; I[p] = 0; }
              if (yt < y0s) { for (let yy = y0s; yy < ytop; yy++) { const p = yy * W + sx; F[p] = c; Dp[p] = D; I[p] = 0; } ytop = yt; prevH = h; D += D < 6 ? nearStep : D * .02; continue; }
            }
            const tall = ytop - y0s;
            if (inCore && tall > 2 && h - prevH > .6 && (ty === 12 || ty === 9 || ty === 11)) {
              // a side face: canopy, corn or reeds seen from the side, darker toward its foot
              for (let yy = y0s; yy < ytop; yy++) { const k = (yy - y0s) / tall, p = yy * W + sx; let cc = c; if (k > .25) cc = mixPk(c, 0xff081008, Math.min(.55, (k - .25) * .9)); if (ty === 12 && k > .55 && ((sx + (x * 2 | 0)) % 4 === 0)) cc = mixPk(cc, 0xff102030, .5); F[p] = cc; Dp[p] = D; I[p] = 0; }
            } else {
              for (let yy = y0s; yy < ytop; yy++) { const p = yy * W + sx; F[p] = c; Dp[p] = D; I[p] = 0; }
            }
            ytop = y0s;
            if (ytop <= 0) break;
          }
        }
        prevH = h;
        if (hz - (maxTop - camZ) * f / D >= ytop) break;
        D += D < 6 ? nearStep : (D < 40 ? D * .02 : D < 400 ? D * .012 : D * .02) * sm;
      }
      t.tops[sx] = ytop;
    }
  }
  sky(t, lens, env) {
    const W = t.W, H = t.H, F = t.frame, hz = lens.horizonY, f = lens.f, sky = env.sky, n = sky.length - 1;
    // the gradient by elevation angle (so a scope magnifies it correctly)
    const rowC = new Uint32Array(H);
    for (let y = 0; y < H; y++) { const e = Math.atan((hz - y - .5) / f) / (Math.PI / 2); let k = 1 - B.clamp(e / .55, 0, 1); k = Math.pow(k, 1.6) * n; const i = Math.min(n - 1, Math.floor(k)); rowC[y] = mixPk(sky[i], sky[i + 1], k - i); }
    // sun direction on screen
    const sv = env.sunV, sD = sv[0] * lens.Fx + sv[1] * lens.Fy, sL = sv[0] * lens.Rx + sv[1] * lens.Ry;
    const sunX = sD > 0 ? lens.cx + sL / sD * f : -9999, sunY = sD > 0 ? hz - sv[2] / sD * f : -9999, sunR = Math.max(2, .012 * f);
    const mts = env.mountains, clouds = env.clouds;
    for (let x = 0; x < W; x++) {
      const yt = Math.min(H, Math.ceil(t.tops[x]));
      if (yt <= 0) continue;
      const brg = lens.yaw - Math.atan((x + .5 - lens.cx) / f);
      // mountain silhouettes: elevation angle by bearing, far layer first
      const mtTop = [];
      for (const m of mts) { const u = brg * m.freq; const e = (m.base + m.amp * (B.fbm(u, m.seed, m.seed, 4) * .5 + .5)) * B.DEG; mtTop.push(hz - Math.tan(e) * f); }
      for (let y = 0; y < yt; y++) {
        const p = y * W + x; let c = rowC[y];
        // sun glow and disc
        if (sD > 0) { const ddx = x + .5 - sunX, ddy = y + .5 - sunY, d = Math.sqrt(ddx * ddx + ddy * ddy); if (d < sunR) c = env.sunC; else if (d < sunR * 5) { const k = 1 - (d - sunR) / (sunR * 4); if (k * k * .7 > bay(x, y) * .9) c = mixPk(c, env.glowC, .45 * k); } }
        // clouds: bands at an elevation, broken by noise on the bearing
        if (clouds) { const e = Math.atan((hz - y - .5) / f) / B.DEG; for (const cl of clouds) { if (e > cl.el - cl.th && e < cl.el + cl.th) { const nv = B.fbm(brg * cl.freq + env.time * cl.drift, e * .35, cl.seed, 3) * .5 + .5 - Math.abs(e - cl.el) / cl.th * .45; if (nv > cl.cover) c = mixPk(c, hexCache(cl.color), Math.min(1, (nv - cl.cover) * 6) > bay(x, y) ? cl.alpha : cl.alpha * .4); } } }
        for (let m = 0; m < mts.length; m++) if (y + .5 >= mtTop[m]) { const M = mts[m]; c = y + .5 < mtTop[m] + 1.5 && M.edge ? hexCache(M.edge) : hexCache(M.color); if (M.snow && y + .5 < mtTop[m] + (y - mtTop[m] < 999 ? M.snow * f / 500 : 0)) c = hexCache(M.snowColor || '#e8eef8'); }
        F[p] = c;
      }
    }
  }
}
const hc = new Map(); function hexCache(h) { let v = hc.get(h); if (v === undefined) { v = hexPk(h); hc.set(h, v); } return v; }
B.hexCache = hexCache;
B.Vista = Vista;
B.vista = new Vista();
})();
