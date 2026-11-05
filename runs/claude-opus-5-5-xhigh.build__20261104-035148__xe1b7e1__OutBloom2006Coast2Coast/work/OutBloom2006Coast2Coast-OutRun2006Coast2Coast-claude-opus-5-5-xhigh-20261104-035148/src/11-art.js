/* OutBloom — art: a small pixel-art rasterizer that pre-renders the cars and traffic from low-poly models (a z-buffer,
 * flat shading banded to E.tones' five tones, a dark outline), into sprite banks by yaw (33 steering and drift frames,
 * 32 spin frames) with two layers (under and over, so the occupants sit between them) and lamp variants. Headless,
 * it hands out stand-in frames of the right size. Also: glyph icons, request icons and the small UI sprites. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, { clamp, px } = E;
const Art = OB.Art = OB.Art || {};
const HEADLESS = OB.env.headless;
const mk = (w, h) => E.mkCanvas(Math.max(1, w | 0), Math.max(1, h | 0));
const hexRGB = h => E.hex(h);
const toneCache = new Map();
const tones = c => { if (!toneCache.has(c)) { const t = E.tones(c); toneCache.set(c, [t.deep, t.sh, t.base, t.lt, t.hi].map(hexRGB)); } return toneCache.get(c); };

/* ---- the mesh builder: model units are metres; x right, y forward (the car's nose), z up ---- */
const Mesh = () => ({ tris: [] });
const tri = (m, a, b, c, mat, layer = 0, ds = false) => m.tris.push({ a, b, c, mat, layer, ds });
const quad = (m, a, b, c, d, mat, layer, ds) => { tri(m, a, b, c, mat, layer, ds); tri(m, a, c, d, mat, layer, ds); };
function box(m, x0, y0, z0, x1, y1, z1, mat, layer = 0, mats) {
  const P = (x, y, z) => [x, y, z], M = k => (mats && mats[k]) || mat;
  const a = P(x0, y0, z0), b = P(x1, y0, z0), c = P(x1, y1, z0), d = P(x0, y1, z0), e = P(x0, y0, z1), f = P(x1, y0, z1), g = P(x1, y1, z1), h = P(x0, y1, z1);
  quad(m, e, f, g, h, M('top'), layer); quad(m, a, d, c, b, M('bottom'), layer); quad(m, a, b, f, e, M('back'), layer); quad(m, c, d, h, g, M('front'), layer);
  quad(m, b, c, g, f, M('right'), layer); quad(m, d, a, e, h, M('left'), layer);
}
/** a loft: sections [{ y, pts: [[x, z], ...] (the right half, bottom to top) }], mirrored to the left; strip k uses mats[k] */
function loft(m, secs, mats, layer = 0, cap = true) {
  const n = secs[0].pts.length;
  for (let s = 0; s < secs.length - 1; s++) {
    const A = secs[s], B = secs[s + 1];
    for (let k = 0; k < n - 1; k++) {
      const mat = (B.mats || A.mats || mats)[k] || mats[mats.length - 1], ly = A.layer !== undefined ? A.layer : layer;
      for (const sd of [1, -1]) {
        const p = (S, i) => [S.pts[i][0] * sd, S.y, S.pts[i][1]];
        if (sd > 0) quad(m, p(A, k), p(B, k), p(B, k + 1), p(A, k + 1), mat, ly);
        else quad(m, p(A, k), p(A, k + 1), p(B, k + 1), p(B, k), mat, ly);
      }
    }
  }
  if (cap) for (const [S, dir] of [[secs[0], -1], [secs[secs.length - 1], 1]]) {   // the ends, as fans from the centre line
    const mat = S.capMat || mats[0], ly = S.layer !== undefined ? S.layer : layer, zc = (S.pts[0][1] + S.pts[n - 1][1]) / 2, c = [0, S.y, zc];
    for (let k = 0; k < n - 1; k++) for (const sd of [1, -1]) {
      const a = [S.pts[k][0] * sd, S.y, S.pts[k][1]], b = [S.pts[k + 1][0] * sd, S.y, S.pts[k + 1][1]];
      if (dir * sd > 0) tri(m, c, b, a, mat, ly); else tri(m, c, a, b, mat, ly);
    }
  }
}
/** a cylinder along x (a wheel): centre, radius, half width */
function wheel(m, cx, cy, cz, r, hw, tyre, rim, layer = 0) {
  const n = 12, P = (x, a, rr) => [x, cy + Math.cos(a) * rr, cz + Math.sin(a) * rr];
  for (let i = 0; i < n; i++) {
    const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
    quad(m, P(cx - hw, a0, r), P(cx - hw, a1, r), P(cx + hw, a1, r), P(cx + hw, a0, r), tyre, layer);
    const out = cx > 0 ? cx + hw : cx - hw, sd = cx > 0 ? 1 : -1, c = [out, cy, cz];
    if (sd > 0) { tri(m, c, P(out, a1, r), P(out, a0, r), tyre, layer); tri(m, c, P(out, a1, r * .62), P(out, a0, r * .62), rim, layer); }
    else { tri(m, c, P(out, a0, r), P(out, a1, r), tyre, layer); tri(m, c, P(out, a0, r * .62), P(out, a1, r * .62), rim, layer); }
  }
}
Art.mesh = { Mesh, tri, quad, box, loft, wheel };

/* ---- the rasterizer: a yaw and a pitch, weak perspective, flat shading in five tones, outline, layers ---- */
const LIGHT = (() => { const l = [-.45, -.35, .82], k = Math.hypot(...l); return l.map(v => v / k); })();
function render(mesh, o) {
  const s = o.scale, yaw = o.yaw, ph = o.pitch === undefined ? .2 : o.pitch, cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(ph), sp = Math.sin(ph), D = o.persp || 14;
  const W = o.w, H = o.h, ax = o.ax, ay = o.ay, mats = o.mats;
  const proj = p => { const x = p[0] * cy + p[1] * sy, y = -p[0] * sy + p[1] * cy, z = p[2]; const depth = y * cp - z * sp, k = D / (D + depth * .9); return [ax + x * s * k, ay - (z * cp + y * sp) * s * k, depth, x, y, z]; };
  const zbuf = new Float32Array(W * H).fill(1e9), col = new Uint32Array(W * H), lay = new Uint8Array(W * H);
  const pack = (r, g, b) => (255 << 24) | (b << 16) | (g << 8) | r;
  for (const t of mesh.tris) {
    const A = proj(t.a), B = proj(t.b), C = proj(t.c);
    // the face's normal in the camera's frame (rotated model space), for culling and light
    const ux = B[3] - A[3], uy = B[4] - A[4], uz = B[5] - A[5], vx = C[3] - A[3], vy = C[4] - A[4], vz = C[5] - A[5];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    const area = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
    const M = mats[t.mat] || mats.body;
    if (Math.abs(area) < .01 || M.skip) continue;
    if (-ny * cp + nz * sp < 0) { nx = -nx; ny = -ny; nz = -nz; }   // (lit from the side the camera sees: no winding to get wrong)
    let rgb;
    if (M.glow) rgb = hexRGB(M.color);
    else {
      const lit = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]), view = Math.max(0, -ny * cp + nz * sp);
      let v = .18 + lit * .78 + (M.shine ? Math.pow(Math.max(0, lit), 12) * .8 : 0) - (1 - view) * .08;
      const T = tones(M.color), bands = M.bands || [.3, .5, .72, .93];
      let k = 0; for (const b of bands) if (v > b) k++;
      rgb = T[clamp(k, 0, 4)];
    }
    const c32 = pack(rgb[0], rgb[1], rgb[2]);
    const minX = Math.max(0, Math.floor(Math.min(A[0], B[0], C[0]))), maxX = Math.min(W - 1, Math.ceil(Math.max(A[0], B[0], C[0])));
    const minY = Math.max(0, Math.floor(Math.min(A[1], B[1], C[1]))), maxY = Math.min(H - 1, Math.ceil(Math.max(A[1], B[1], C[1])));
    const inv = 1 / area;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const px0 = x + .5, py0 = y + .5;
      const w0 = ((B[0] - px0) * (C[1] - py0) - (B[1] - py0) * (C[0] - px0)) * inv, w1 = ((C[0] - px0) * (A[1] - py0) - (C[1] - py0) * (A[0] - px0)) * inv, w2 = 1 - w0 - w1;
      if (w0 < -.0001 || w1 < -.0001 || w2 < -.0001) continue;
      const d = w0 * A[2] + w1 * B[2] + w2 * C[2] - (M.bias || 0), i = y * W + x;
      if (d < zbuf[i]) { zbuf[i] = d; col[i] = c32; lay[i] = t.layer; }
    }
  }
  // the outline: a dark pixel around the silhouette; layers split into canvases
  const outC = pack(...hexRGB(o.outline || '#1a1024')) >>> 0;
  const make = filter => {
    if (HEADLESS) return mk(W, H);
    const cv = mk(W, H), g = E.ctx2d(cv), img = g.createImageData(W, H), d32 = new Uint32Array(img.data.buffer);
    for (let i = 0; i < W * H; i++) if (col[i] && filter(lay[i])) d32[i] = col[i];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (d32[i]) continue;
      const n = (x > 0 && d32[i - 1] && d32[i - 1] !== outC) || (x < W - 1 && d32[i + 1] && d32[i + 1] !== outC) || (y > 0 && d32[i - W] && d32[i - W] !== outC) || (y < H - 1 && d32[i + W] && d32[i + W] !== outC);
      if (n && filter(lay[i - 1] || lay[i + 1] || 0)) d32[i] = outC;
    }
    g.putImageData(img, 0, 0); return cv;
  };
  const anchors = (o.anchors || []).map(p => { const q = proj(p); return [q[0], q[1]]; });
  return { full: make(() => true), under: o.layers ? make(l => l === 0) : null, over: o.layers ? make(l => l === 1) : null, w: W, h: H, ax, ay, anchors };
}
Art.render = render;

/* ---- the cars: a hull lofted from sections, a cockpit tub, seats, a windscreen, hoops, lamps, wheels ---- */
const NOSE = { round: [.62, .8], soft: [.55, .72], wedge: [.42, .6], long: [.5, .7], hyper: [.36, .52] };
function carMesh(id, lampsOn) {
  const C = OB.CARS[id], b = C.body, m = Mesh(), L = b.L, hw = b.Wd / 2, zb = .2, zt = .2 + b.H, fl = .36;
  const nose = NOSE[b.nose] || NOSE.soft, fins = b.tail === 'fins', diff = b.tail === 'diffuser';
  const prof = (w, top, kind) => {
    const tw = w * (b.nose === 'hyper' ? .9 : .94);
    if (kind === 'tub') return [[0, zb], [w * .82, zb], [w, zb + .12], [w * 1.0, top - .12], [w * .97, top], [w * .84, top + .01], [w * .7, fl + .12], [0, fl]];
    return [[0, zb], [w * .82, zb], [w, zb + .12], [w * 1.0, top - .12], [w * .97, top], [tw * .82, top + .03], [tw * .45, top + .05], [0, top + .055]];
  };
  const mats = ['under', 'under', 'body', 'body', 'body', 'body', 'body', 'body'], tubM = ['under', 'under', 'body', 'body', 'body', 'trim', 'leather', 'leather'];
  const ys = [[-.5, .92, .86, 0], [-.47, .98, .97, 0], [-.3, 1, 1, 0], [-.16, 1, 1, 0], [-.12, 1, .99, 1], [.12, 1, .99, 1], [.16, 1, .98, 0], [.32, .99, .93, 0], [.44, .94, nose[1] + .1, 0], [.5, .82, nose[0], 0]];
  const secs = ys.map(([fy, fw, fh, tub]) => ({ y: fy * L, pts: prof(hw * fw, zb + (zt - zb) * fh, tub ? 'tub' : ''), mats: tub ? tubM : mats, layer: fy < -.13 ? 1 : 0 }));
  secs[0].capMat = 'body';
  loft(m, secs, mats, 0);
  // the rear deck behind the seats is the 'over' layer (it hides the occupants' backs); a hump or two
  if (b.humps || b.hoops) for (const sd of [-1, 1]) {
    const x = sd * hw * .42;
    if (b.hoops) { for (const hx of [-.17, .17]) box(m, x + hx - .03, -.165 * L, zt, x + hx + .03, -.15 * L, zt + .3, 'chrome', 1); box(m, x - .2, -.165 * L, zt + .27, x + .2, -.15 * L, zt + .32, 'chrome', 1); }
    if (b.humps) loft(m, [{ y: -.42 * L, pts: [[.001, zt + .03], [.16, zt + .04], [.001, zt + .06]] }, { y: -.15 * L, pts: [[.001, zt + .03], [.18, zt + .05], [.001, zt + .2]] }].map(s2 => ({ y: s2.y, pts: s2.pts.map(p => [p[0] + Math.abs(x) * 0, p[1]]) })).map(s2 => ({ y: s2.y, pts: s2.pts })), ['body'], 1, false);
  }
  if (b.humps) for (const sd of [-1, 1]) { const x = sd * hw * .42; box(m, x - .17, -.4 * L, zt + .02, x + .17, -.15 * L, zt + .14, 'body', 1, { back: 'body', top: 'body' }); }
  if (b.targa) { box(m, -hw * .9, -.15 * L, zt, -hw * .78, -.12 * L, zt + .3, 'trim', 1); box(m, hw * .78, -.15 * L, zt, hw * .9, -.12 * L, zt + .3, 'trim', 1); box(m, -hw * .9, -.15 * L, zt + .24, hw * .9, -.12 * L, zt + .3, 'trim', 1); }
  // seats (two backs and headrests, in the over layer: they stand between the camera and the occupants' lower backs)
  for (const sd of [-1, 1]) { const x = sd * hw * .42; box(m, x - .22, -.13 * L, fl, x + .22, -.1 * L, zt + .06, 'leather', 1); box(m, x - .12, -.13 * L, zt + .06, x + .12, -.105 * L, zt + .16, 'leather', 1); box(m, x - .22, -.1 * L, fl, x + .22, .05 * L, fl + .16, 'leather', 0); }
  // dash, windscreen, steering wheel (left-hand drive)
  box(m, -hw * .9, .1 * L, fl, hw * .9, .14 * L, zt + .05, 'trim', 0);
  const wsH = b.windscreen || .34, wy = .14 * L;
  if (wsH > .05) { quad(m, [-hw * .9, wy, zt + .02], [hw * .9, wy, zt + .02], [hw * .78, wy - .28, zt + wsH], [-hw * .78, wy - .28, zt + wsH], 'glass', 0, true);
    box(m, -hw * .8, wy - .3, zt + wsH - .03, hw * .8, wy - .25, zt + wsH + .01, 'trim', 0);
    for (const sd of [-1, 1]) quad(m, [sd * hw * .9, wy, zt + .02], [sd * hw * .86, wy, zt + .02], [sd * hw * .75, wy - .28, zt + wsH], [sd * hw * .8, wy - .28, zt + wsH], 'trim', 0, true); }
  box(m, -hw * .42 - .14, .06 * L, zt - .05, -hw * .42 + .14, .075 * L, zt + .12, 'wheelrim', 0);
  // the tail: lamps, a plate, exhausts, a diffuser or fins; the nose: lamps
  const ry = -.5 * L - .012, lz = zb + (zt - zb) * .66, lamp = lampsOn ? 'lampOn' : 'lamp';
  const tl = b.lamps === 'round' || b.lamps === 'twin' ? (b.lamps === 'twin' ? [.78, .56] : [.72]) : null;
  for (const sd of [-1, 1]) {
    if (tl) for (const fx of tl) { const x = sd * hw * fx; box(m, x - .08, ry - .01, lz - .07, x + .08, ry + .02, lz + .07, lamp, 1); }
    else if (b.lamps === 'bar' || b.lamps === 'led') box(m, sd > 0 ? hw * .15 : -hw * .9, ry - .01, lz - .04, sd > 0 ? hw * .9 : -hw * .15, ry + .02, lz + .04, lamp, 1);
    box(m, sd * hw * .55 - .05, ry - .04, zb + .06, sd * hw * .55 + .05, ry + .02, zb + .14, 'exhaust', 1);
  }
  box(m, -.22, ry - .015, zb + .2, .22, ry + .01, zb + .31, 'plate', 1);
  if (fins) for (const sd of [-1, 1]) { const x = sd * hw * .9; tri(m, [x, -.5 * L, zt], [x, -.3 * L, zt], [x, -.48 * L, zt + .16], 'body', 1, true); }
  if (diff) for (let k = -3; k <= 3; k++) box(m, k * .2 - .04, ry - .12, zb - .02, k * .2 + .04, ry + .04, zb + .14, 'trim', 1);
  if (b.fins) for (const sd of [-1, 1]) box(m, sd * hw * .55 - .03, -.48 * L, zt, sd * hw * .55 + .03, -.3 * L, zt + .22, 'body', 1);
  if (b.strakes) for (const sd of [-1, 1]) for (let k = 0; k < 4; k++) box(m, sd * (hw + .005) - .01, -.2 * L + k * .12, zb + .22, sd * (hw + .005) + .01, -.2 * L + k * .12 + .06, zt - .16, 'trim', 0);
  if (b.stripe) { box(m, -.18, -.5 * L, zt + .04, -.1, .5 * L, zt + .06, 'stripe', 0); box(m, .1, -.5 * L, zt + .04, .18, .5 * L, zt + .06, 'stripe', 0); }
  if (b.chrome) box(m, -hw * .93, ry - .06, zb + .02, hw * .93, ry + .01, zb + .1, 'chrome', 1);
  for (const sd of [-1, 1]) box(m, sd * hw * .7 - .12, .5 * L - .005, zb + (zt - zb) * nose[0] * .6, sd * hw * .7 + .12, .5 * L + .02, zb + (zt - zb) * nose[0] * .85, b.lamps === 'led' ? 'ledhead' : 'head', 0);
  // wheels
  const wr = .33;
  for (const [sx, sy] of [[-1, -.31], [1, -.31], [-1, .31], [1, .31]]) wheel(m, sx * (hw - .14), sy * L, wr, wr, .13, 'tyre', 'wheelrim', sy < 0 ? 1 : 0);
  return m;
}
const carMats = (id, paint, edition) => {
  const C = OB.CARS[id], b = C.body;
  return { body: { color: paint, shine: true }, under: { color: E.shade(paint, -.45) }, trim: { color: '#2a2630' }, leather: { color: id === 'primavera' ? '#a86a3a' : id === 'girasole' ? '#2a2a30' : '#c8a070' },
    glass: { color: '#b8e0f0', skip: true }, chrome: { color: '#d8dce8', shine: true }, tyre: { color: '#24222a', bands: [.4, .6, .85, 1.2] }, wheelrim: { color: b.wheel || '#c8ccd4', shine: true },
    lamp: { color: '#c8242a', glow: true }, lampOn: { color: '#ff5a4a', glow: true }, head: { color: '#f0f4ff', glow: true }, ledhead: { color: '#e8fcff', glow: true }, exhaust: { color: '#3a3a40' }, plate: { color: '#f4f0e0', glow: true },
    stripe: { color: edition ? '#e8c050' : (b.stripe || '#ff7ab0') } };
};
const YAW_N = 33, YAW_MAX = Math.PI / 2, SPIN_N = 32;
Art.YAW_N = YAW_N; Art.SPIN_N = SPIN_N;
const PXM = 75;   // pixels a metre at the near size (480 x 270: the car about 143 px wide)
Art.PXM = PXM;
const carBank = new Map();
/** the sprite bank of a car in a paint: frames by yaw index (and spin), each { under, over, full, w, h, ax, ay, seats } */
Art.car = (id, paint, edition) => {
  const key = id + paint + (edition ? 'E' : '');
  if (carBank.has(key)) return carBank.get(key);
  const C = OB.CARS[id], L = C.body.L, size = Math.ceil(L * PXM * 1.15 + 20), H = Math.ceil(PXM * 2.6);
  const bank = { id, paint, frames: [], lit: [], spin: [], w: size, h: H, scale: PXM, ready: false };
  bank.make = (kind, k) => {
    const yaw = kind === 'spin' ? k / SPIN_N * Math.PI * 2 : -YAW_MAX + k / (YAW_N - 1) * 2 * YAW_MAX;
    const hw = C.body.Wd / 2, zt = .2 + C.body.H, seats = [[-hw * .42, -.11 * L, zt + .02], [hw * .42, -.11 * L, zt + .02], [-hw * .42, -.11 * L, .36], [hw * .42, -.11 * L, .36]];
    const mats = carMats(id, paint, edition);
    const meshes = bank.meshes || (bank.meshes = [carMesh(id, false), carMesh(id, true)]);
    const opts = { scale: PXM, yaw, pitch: .19, w: size, h: H, ax: size / 2, ay: H * .78, mats, layers: kind !== 'spin', anchors: seats };
    if (kind === 'lit') return render(meshes[1], Object.assign({}, opts, { layers: true }));
    return render(meshes[0], opts);
  };
  bank.frame = (yaw, lit) => {
    const k = clamp(Math.round((yaw + YAW_MAX) / (2 * YAW_MAX) * (YAW_N - 1)), 0, YAW_N - 1), list = lit ? bank.lit : bank.frames;
    return list[k] || (list[k] = bank.make(lit ? 'lit' : 'yaw', k));
  };
  bank.spinFrame = a => { const k = ((Math.round(a / (Math.PI * 2) * SPIN_N) % SPIN_N) + SPIN_N) % SPIN_N; return bank.spin[k] || (bank.spin[k] = bank.make('spin', k)); };
  carBank.set(key, bank); return bank;
};
/** draw a car at its foot (sx, sy) at scale k (1 = the near size): yaw (heading against the view), lamps, spin, occupants */
Art.drawCar = (g, bank, sx, sy, k, o = {}) => {
  const f = o.spin ? bank.spinFrame(o.spin) : bank.frame(o.yaw || 0, o.lit);
  const w = f.w * k, h = f.h * k, x = Math.round(sx - f.ax * k), y = Math.round(sy - f.ay * k - (o.lift || 0));
  if (w < 2) return f;
  const old = g.globalAlpha; if (o.alpha !== undefined) g.globalAlpha = old * o.alpha;
  if (o.shadow !== false) { g.globalAlpha = (o.alpha === undefined ? 1 : o.alpha) * old * .45; px.ell(g, Math.round(sx), Math.round(sy - 2 * k), Math.round(f.w * k * .3), Math.max(1, Math.round(9 * k)), '#100818'); g.globalAlpha = old * (o.alpha === undefined ? 1 : o.alpha); px.reset(g); }
  if (o.occupants && f.under && !o.spin) {
    g.drawImage(f.under, x, y, Math.round(w), Math.round(h));
    o.occupants(g, f.anchors.map(a => [x + a[0] * k, y + a[1] * k]), k);
    g.drawImage(f.over, x, y, Math.round(w), Math.round(h));
  } else g.drawImage(f.full, x, y, Math.round(w), Math.round(h));
  g.globalAlpha = old;
  return f;
};

/* ---- traffic: boxier lofts in their paints, nine yaws, lamps ---- */
function trafficMesh(type, lampsOn) {
  const T = OB.TRAFFIC[type], m = Mesh(), shape = T.shape, lamp = lampsOn ? 'lampOn' : 'lamp';
  const dims = { hatch: [3.8, 1.7, 1.45], sedan: [4.5, 1.8, 1.45], van: [4.9, 1.95, 2.3], pickup: [4.8, 1.9, 1.75], camper: [5, 2, 2.4], bus: [10, 2.5, 3.2], truck: [9.5, 2.5, 3.1], tractor: [3.6, 2.2, 2.6], scooter: [1.8, .7, 1.4], icecream: [5.2, 2, 2.6] }[shape];
  const [L, Wd, Ht] = dims, hw = Wd / 2, zb = shape === 'scooter' ? .25 : .3;
  if (shape === 'scooter') {
    box(m, -.18, -.8, .25, .18, .7, .55, 'body'); box(m, -.15, -.55, .55, .15, .1, .72, 'seat'); box(m, -.05, .55, .5, .05, .62, 1.1, 'trim'); box(m, -.3, .6, 1.05, .3, .65, 1.1, 'trim');
    box(m, -.2, -.35, .7, .2, .05, 1.3, 'rider'); box(m, -.14, -.3, 1.3, .14, -.02, 1.55, 'helmet');
    wheel(m, 0, -.6, .25, .25, .07, 'tyre', 'wheelrim'); wheel(m, 0, .6, .25, .25, .07, 'tyre', 'wheelrim');
    box(m, -.12, -.82, .45, .12, -.8, .55, lamp); return { m, L, Wd };
  }
  if (shape === 'tractor') {
    box(m, -.6, -.4, .55, .6, 1.6, 1.2, 'body'); box(m, -.75, -1.2, .7, .75, -.3, 2.4, 'glass', 0, { top: 'body', back: 'glass' }); box(m, -.8, -1.25, 2.35, .8, -.25, 2.5, 'body');
    wheel(m, -.95, -.7, .75, .75, .26, 'tyre', 'wheelrim'); wheel(m, .95, -.7, .75, .75, .26, 'tyre', 'wheelrim'); wheel(m, -.8, 1.3, .45, .45, .16, 'tyre', 'wheelrim'); wheel(m, .8, 1.3, .45, .45, .16, 'tyre', 'wheelrim');
    box(m, -.12, -.3, 2.5, .12, -.2, 2.62, 'beacon'); return { m, L, Wd };
  }
  // the lower body
  const belt = shape === 'bus' || shape === 'truck' || shape === 'van' || shape === 'camper' || shape === 'icecream' ? Ht * .55 : Ht * .52;
  const prof = (w, top, roof) => [[0, zb], [w * .85, zb], [w, zb + .15], [w, top - .1], [w * .95, top], [w * .5, top + .02], [0, top + .03]];
  loft(m, [{ y: -L / 2, pts: prof(hw * .96, belt * .96), capMat: 'body' }, { y: -L / 2 + .25, pts: prof(hw, belt) }, { y: L / 2 - .4, pts: prof(hw, belt) }, { y: L / 2, pts: prof(hw * .94, belt * .78), capMat: 'body' }], ['under', 'under', 'body', 'body', 'body', 'body', 'body'], 0);
  // the cabin / greenhouse / box
  const gh = (y0, y1, z0, z1, w0, mat, top) => { box(m, -w0, y0, z0, w0, y1, z1, mat, 0, { top: top || 'roof', front: 'glass', back: mat === 'glass' ? 'glass' : mat }); };
  if (shape === 'hatch') { gh(-L / 2 + .2, L / 2 - 1.3, belt, Ht, hw * .86, 'glass'); }
  else if (shape === 'sedan') { gh(-L / 2 + 1, L / 2 - 1.5, belt, Ht, hw * .86, 'glass'); }
  else if (shape === 'pickup') { gh(-.2, L / 2 - 1.4, belt, Ht, hw * .88, 'glass'); box(m, -hw, -L / 2, belt, -hw + .08, -.25, belt + .35, 'body'); box(m, hw - .08, -L / 2, belt, hw, -.25, belt + .35, 'body'); box(m, -hw * .6, -L / 2 + .3, belt, hw * .6, -.6, belt + .4, 'crate'); }
  else if (shape === 'van' || shape === 'icecream' || shape === 'camper') { box(m, -hw, -L / 2, belt, hw, L / 2 - 1.1, Ht, 'body', 0, { front: 'glass' }); box(m, -hw * .86, L / 2 - 1.1, belt, hw * .86, L / 2 - .6, Ht * .9, 'glass', 0, { top: 'roof' }); }
  else if (shape === 'bus') { box(m, -hw, -L / 2, belt, hw, L / 2, belt + .25, 'body'); box(m, -hw * .98, -L / 2 + .02, belt + .25, hw * .98, L / 2 - .02, Ht - .35, 'glassside', 0, { top: 'body', front: 'glass', back: 'glass' }); for (let k = 0; k < 7; k++) box(m, -hw - .005, -L / 2 + .6 + k * 1.3, belt + .25, hw + .005, -L / 2 + .7 + k * 1.3, Ht - .35, 'body'); box(m, -hw, -L / 2, Ht - .35, hw, L / 2, Ht, 'roof'); box(m, -hw * .7, -L / 2 - .03, Ht - .3, hw * .7, -L / 2 + .02, Ht - .05, 'decal'); }
  else if (shape === 'truck') { box(m, -hw, -L / 2, belt * .7, hw, L / 2 - 2.2, Ht, 'cargo', 0, { top: 'plants', back: 'cargo' }); for (let k = 0; k < 5; k++) box(m, -hw - .01, -L / 2 + .8 + k * 1.4, Ht * .45, hw + .01, -L / 2 + 1.5 + k * 1.4, Ht * .8, 'decal'); box(m, -hw * .8, -L / 2 - .03, Ht * .35, hw * .8, -L / 2 + .02, Ht * .85, 'decal'); box(m, -hw * .95, L / 2 - 2.1, belt * .8, hw * .95, L / 2, Ht * .85, 'body', 0, { front: 'glass' }); }
  if (shape === 'camper') { box(m, -.35, -L / 2 + .6, Ht, .35, L / 2 - 1.4, Ht + .12, 'surf'); }
  if (T.roof === 'taxi') box(m, -.25, -.2, Ht, .25, .2, Ht + .18, 'taxi');
  if (shape === 'icecream') { box(m, -.25, -.4, Ht, .25, .2, Ht + .45, 'cone'); box(m, -.4, -.5, Ht + .45, .4, .3, Ht + .85, 'scoop'); }
  if (T.decal === 'flower') for (const sd of [-1, 1]) box(m, sd * (hw + .01) - .01, -1, belt * .5, sd * (hw + .01) + .01, .6, belt * .95, 'decal');
  const ry = -L / 2 - .01, lz = zb + (belt - zb) * .7;
  for (const sd of [-1, 1]) box(m, sd * hw * .8 - .13, ry - .015, lz - .1, sd * hw * .8 + .13, ry + .02, lz + .1, lamp);
  box(m, -.25, ry - .015, zb + .2, .25, ry + .01, zb + .34, 'plate');
  const wr = shape === 'bus' || shape === 'truck' ? .5 : .34;
  const axles = shape === 'bus' || shape === 'truck' ? [-L / 2 + 1.6, L / 2 - 1.8] : [-L / 2 + .8, L / 2 - .8];
  for (const ay of axles) for (const sd of [-1, 1]) wheel(m, sd * (hw - .15), ay, wr, wr, .15, 'tyre', 'wheelrim');
  return { m, L, Wd };
}
const trafficMats = (type, paint) => ({ body: { color: paint, shine: true }, under: { color: E.shade(paint, -.45) }, roof: { color: E.shade(paint, .08) }, glass: { color: '#7ab0d0', shine: true }, glassside: { color: '#6aa0c8', shine: true },
  trim: { color: '#3a3640' }, tyre: { color: '#24222a' }, wheelrim: { color: '#b8bcc4' }, lamp: { color: '#c8242a', glow: true }, lampOn: { color: '#ff5a4a', glow: true }, plate: { color: '#f4f0e0', glow: true },
  seat: { color: '#3a3440' }, rider: { color: '#e88a6a' }, helmet: { color: '#f4f4f4', shine: true }, crate: { color: '#b88a50' }, surf: { color: '#ffb0c8', shine: true }, taxi: { color: '#ffffff', glow: true },
  cone: { color: '#e8b870' }, scoop: { color: '#ffb0d0', shine: true }, decal: { color: '#ff7ab0' }, cargo: { color: '#f4f0e8' }, plants: { color: '#5ab05a' }, beacon: { color: '#ffa020', glow: true } });
const TYAW_N = 9, TYAW_MAX = .7;
const trafBank = new Map();
Art.traffic = (type, paint) => {
  const key = type + paint; if (trafBank.has(key)) return trafBank.get(key);
  const T = OB.TRAFFIC[type], sc = type === 'bus' || type === 'truck' ? 52 : 64;
  const dimL = { hatch: 3.8, sedan: 4.5, van: 4.9, pickup: 4.8, camper: 5, bus: 10, truck: 9.5, tractor: 3.6, scooter: 1.8, icecream: 5.2 }[T.shape], size = Math.ceil(Math.max(dimL * .8, 3.2) * sc + 24), H = Math.ceil(4 * sc);
  const bank = { frames: [], lit: [], scale: sc, w: size, h: H };
  bank.frame = (yaw, lit) => {
    const k = clamp(Math.round((yaw + TYAW_MAX) / (2 * TYAW_MAX) * (TYAW_N - 1)), 0, TYAW_N - 1), list = lit ? bank.lit : bank.frames;
    if (!list[k]) { const ms = bank.ms || (bank.ms = [trafficMesh(type, false), trafficMesh(type, true)]); list[k] = render(ms[lit ? 1 : 0].m, { scale: sc, yaw: -TYAW_MAX + k / (TYAW_N - 1) * 2 * TYAW_MAX, pitch: .19, w: size, h: H, ax: size / 2, ay: H * .8, mats: trafficMats(type, paint) }); }
    return list[k];
  };
  trafBank.set(key, bank); return bank;
};
/** draw a traffic vehicle where the road put it: its yaw from where it sits on screen, lamps when braking or at night */
Art.drawTraffic = (g, v, sx, sy, scale, t) => {
  const bank = Art.traffic(v.type, v.paint), view = OB.Art.viewCenter || 240, focalUnits = scale;
  const yaw = clamp(-Math.atan2((sx - view) / Math.max(.001, focalUnits), OB.Art.focal / Math.max(.0001, scale)) * .9 + (v.changeT > 0 ? (v.toLane > v.lane ? .12 : -.12) : 0) + (v.spinT > 0 ? Math.sin(v.spinT * 9) * .6 : 0), -TYAW_MAX, TYAW_MAX);
  const lit = v.braking > 0 || OB.Art.night;
  const f = bank.frame(yaw, lit), k = scale * 500 / bank.scale;   // (500 units a metre)
  const w = f.w * k, h = f.h * k; if (w < 1.5) return;
  const x = Math.round(sx - f.ax * k), y = Math.round(sy - f.ay * k);
  const a = g.globalAlpha; g.globalAlpha = a * .4; px.ell(g, Math.round(sx), Math.round(sy - 1), Math.round(w * .3), Math.max(1, Math.round(h * .05)), '#100818'); g.globalAlpha = a; px.reset(g);
  g.drawImage(f.full, x, y, Math.round(w), Math.round(h));
  if (lit && OB.Art.night && w > 8) { g.globalAlpha = a * .5; for (const sd of [-1, 1]) px.disc(g, Math.round(sx + sd * w * .2), Math.round(sy - h * .12), Math.max(1, Math.round(w * .05)), '#ff6a5a'); g.globalAlpha = a; px.reset(g); }
  if (v.blink > 0 && Math.floor(t * 6) % 2 === 0 && w > 6) px.rect(g, Math.round(sx + (v.toLane > v.lane ? 1 : -1) * w * .26), Math.round(sy - h * .15), Math.max(1, Math.round(w * .05)), Math.max(1, Math.round(w * .03)), '#ffb020');
  if (v.ribbon && !v.ribbon.snapped && v.pair && v.pairScreen) { const p2 = v.pairScreen; px.line(g, Math.round(sx), Math.round(sy - h * .2), Math.round(p2[0]), Math.round(p2[1] - h * .2), v.ribbon.color, Math.max(1, Math.round(w * .03))); }
  if (v.honk > 0 && w > 10) E.font.text(g, '♪', Math.round(sx), Math.round(y - 4), '#ffffff', { align: 'center', outline: true });
  v.screen = [sx, sy]; if (v.pair) v.pair.pairScreen = [sx, sy];
};

/* ---- small sprites: glyphs (PlayStation, Xbox, keys, mouse), request icons, UI icons ---- */
const S = (rows, pal, sc = 1) => E.sprite(rows, pal, sc);
Art.icons = {
  cross: S(['..bbbbb...', '.bBBBBBb..', 'bBwBBBwBb.', 'bBBwBwBBb.', 'bBBBwBBBb.', 'bBBwBwBBb.', 'bBwBBBwBb.', '.bBBBBBb..', '..bbbbb...'], { b: '#14182a', B: '#5a8ae8', w: '#ffffff' }),
  circle: S(['..bbbbb...', '.bBBBBBb..', 'bBBwwwBBb.', 'bBwBBBwBb.', 'bBwBBBwBb.', 'bBwBBBwBb.', 'bBBwwwBBb.', '.bBBBBBb..', '..bbbbb...'], { b: '#14182a', B: '#e8505a', w: '#ffffff' }),
  square: S(['..bbbbb...', '.bBBBBBb..', 'bBBBBBBBb.', 'bBwwwwwBb.', 'bBwBBBwBb.', 'bBwwwwwBb.', 'bBBBBBBBb.', '.bBBBBBb..', '..bbbbb...'], { b: '#14182a', B: '#e070c0', w: '#ffffff' }),
  triangle: S(['..bbbbb...', '.bBBBBBb..', 'bBBBwBBBb.', 'bBBwBwBBb.', 'bBwBBBwBb.', 'bBwwwwwBb.', 'bBBBBBBBb.', '.bBBBBBb..', '..bbbbb...'], { b: '#14182a', B: '#3ac890', w: '#ffffff' }),
  heart: S(['.rr.rr.', 'rRRrRRr', 'rRRRRRr', '.rRRRr.', '..rRr..', '...r...'], { r: '#a01a4a', R: '#ff5a9a' }),
  flower: S(['.pp.pp.', 'pPPpPPp', 'pPPyPPp', '.pyYyp.', 'pPPyPPp', 'pPPpPPp', '.pp.pp.'], { p: '#c83a7a', P: '#ff8ac0', y: '#ffb020', Y: '#fff0a0' }),
  flowerOff: S(['.pp.pp.', 'pPPpPPp', 'pPPyPPp', '.pyYyp.', 'pPPyPPp', 'pPPpPPp', '.pp.pp.'], { p: '#2a1a3a', P: '#4a3a5a', y: '#5a4a6a', Y: '#6a5a7a' }),
  petal: S(['.pp.', 'pPPp', 'pPPp', '.pp.'], { p: '#e05a90', P: '#ffb0d0' }),
  seed: S(['.bb.', 'bBBb', 'bBBb', 'bBBb', '.bb.'], { b: '#6a4020', B: '#c8904a' }),
  lock: S(['.yyy.', 'y...y', 'y...y', 'YYYYY', 'YYbYY', 'YYbYY', 'YYYYY'], { y: '#c8c0b0', Y: '#e8c050', b: '#3a2a10' }),
  sun: S(['..y..', '.yYy.', 'yYYYy', '.yYy.', '..y..'], { y: '#ff9a3a', Y: '#ffe060' }),
  note: S(['..ww', '..w.', '..w.', 'www.', 'ww..'], { w: '#ffffff' }),
  star: S(['..y..', '..y..', 'yyYyy', '.yYy.', 'y...y'], { y: '#ffd23a', Y: '#ffffff' }),
  check: S(['.....g', '....gg', 'g..gg.', 'gggg..', '.gg...'], { g: '#5ae07a' }),
  balloon: S(['.rr.', 'rRRr', 'rRRr', '.rr.', '..w.', '..w.'], { r: '#d02a5a', R: '#ff6a9a', w: '#ffffff' }),
  gnome: S(['..r..', '.rrr.', '.www.', 'wbwbw', '.www.', '.bbb.'], { r: '#e03a3a', w: '#f0d8b8', b: '#3a5ab0' }),
  bee: S(['.ww.', 'yKyK', 'yKyK', '.ww.'], { w: '#e8f8ff', y: '#ffd23a', K: '#2a2010' }),
  cone: S(['..o..', '..o..', '.owo.', '.ooo.', 'owwwo', 'ooooo'], { o: '#ff7a1a', w: '#ffffff' }),
  arch: S(['.pppp.', 'p....p', 'p....p', 'g....g', 'g....g'], { p: '#ff7ab8', g: '#5ab05a' }),
  bouquet: S(['prpyp', '.pyp.', '..g..', '.g.g.', '..g..'], { p: '#ff7ab8', r: '#e83a5a', y: '#ffd23a', g: '#3a9a4a' }),
  camera: S(['.kk...', 'kkkkkk', 'kwWwkk', 'kWwWkk', 'kwWwkk', 'kkkkkk'], { k: '#2a2a32', w: '#8ab0d0', W: '#e0f0ff' }),
  ribbon: S(['p...p', '.p.p.', '..p..', '.p.p.', 'p...p'], { p: '#ff7ab8' }),
  car: S(['.rrrr.', 'rwwwwr', 'rrrrrr', 'k.rr.k'], { r: '#e8463a', w: '#a8d8f0', k: '#24222a' }),
  speed: S(['..yy', '.yy.', 'yyyy', '.yy.', 'yy..'], { y: '#ffd23a' }),
  shield: S(['wwwww', 'wBBBw', 'wBBBw', '.wBw.', '..w..'], { w: '#ffffff', B: '#5ab0e8' }),
  draft: S(['w.w.w', '.w.w.', 'w.w.w'], { w: '#c8e8ff' }),
  close: S(['.w.w.', 'w...w', '.....', 'w...w', '.w.w.'], { w: '#ffe060' }),
  drift: S(['.www.', 'w...w', 'w....', 'w...w', '.www.'], { w: '#ffffff' }),
  trophy: S(['yyyyy', 'yYYYy', '.yYy.', '..y..', '.yyy.'], { y: '#c89020', Y: '#ffd23a' })
};
Art.REQ_ICON = { pass: 'car', drift: 'drift', ribbons: 'ribbon', balloons: 'balloon', gnomes: 'gnome', bees: 'bee', cones: 'cone', arches: 'arch', speed: 'speed', clean: 'shield', draft: 'draft', close: 'close', bouquets: 'bouquet', photo: 'camera' };
Art.icon = (g, name, x, y, scale = 1) => { const s = Art.icons[name]; if (!s) return; if (scale === 1) px.sprite(g, s, Math.round(x), Math.round(y)); else g.drawImage(s.cv, Math.round(x), Math.round(y), s.w * scale, s.h * scale); };
Art.focal = 148; Art.viewCenter = 240; Art.night = false;
})();
