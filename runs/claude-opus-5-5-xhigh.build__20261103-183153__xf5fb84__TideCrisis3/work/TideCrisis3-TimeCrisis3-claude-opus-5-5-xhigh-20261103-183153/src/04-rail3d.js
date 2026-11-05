/* 04-rail3d: Rail3D, the perspective renderer. A z-buffered, perspective-correct, banded-light (the engine's five
 * bands, Bayer-dithered), fogged triangle rasterizer in JS into the game's own low-resolution buffer; the sky; engine
 * rigs (E.Humanoid) composited as depth-tested billboards drawn by the engine from the bearing they are seen at;
 * particles, glows, lines, decals and blob shadows. Reads the texture bank (02) and meshes (03). Canvas work happens
 * only in draw: headless, nothing here runs. */
const BAYER = new Float32Array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16));
TC.BAYER = BAYER;

class Rail3D {
  constructor() {
    this.W = 0; this.H = 0; this.col = null; this.dep = null; this.B = {}; this.dyn = []; this.env = null; this.t = 0;
    this.S = new Float64Array(8 * 7); this.C = new Float64Array(8 * 7); this.Q = new Float64Array(3 * 7);
    this.stats = { tris: 0, px: 0, actors: 0, shadows: 0, ms: {} }; this.wobble = false; this._views = new Map(); this._skyH = null;
    this.flash = 0; this.dim = 1;
  }
  size(w, h) {
    w = Math.max(8, Math.round(w)); h = Math.max(8, Math.round(h));
    if (w === this.W && h === this.H) return;
    this.W = w; this.H = h; this.col = new Uint32Array(w * h); this.dep = new Float32Array(w * h);
    if (!HEADLESS) { this.cv = document.createElement('canvas'); this.cv.width = w; this.cv.height = h; this.cg = this.cv.getContext('2d'); this.img = this.cg.createImageData(w, h); this.img32 = new Uint32Array(this.img.data.buffer); }
  }
  /** start a frame: camera pose, environment (fog, sky, light), the time */
  begin(cam, env, t) {
    const B = camBasis(cam, this.W, this.H, this.B); this.env = env; this.t = t; this.cam = cam;
    this.dep.fill(0); this.col.fill(0);
    const fog = env.fog || ['#000000', 1e5, 1e6]; this.fogC = hexRGB(fog[0]); this.fogN = fog[1]; this.fogF = fog[2]; this.fogInv = 1 / Math.max(1, fog[2] - fog[1]); this.far = fog[2] * 1.08;
    this.warm = hexRGB(env.warm || '#ffb347');
    const tw = B.tanH * this.W / this.H, th = B.tanH, lw = Math.hypot(1, tw), lh = Math.hypot(1, th);
    this.pl = [[1 / lw, 0, -tw / lw], [-1 / lw, 0, -tw / lw], [0, 1 / lh, -th / lh], [0, -1 / lh, -th / lh]];
    this.stats.tris = 0; this.stats.px = 0; this.stats.actors = 0; this.stats.shadows = 0; this.dyn.length = 0; this._decalN = 0;
    return this;
  }
  /** a dynamic light this frame (muzzle flash, explosion, flare, the lighthouse beam) */
  addLight(x, y, z, r, k = .8) { if (this.dyn.length < 12) this.dyn.push({ x, y, z, r, k }); }
  /** is a sphere (world) inside the view? */
  sees(cx, cy, cz, r) {
    const v = toView(this.B, cx, cy, cz); if (v[2] + r < this.B.near || v[2] - r > this.far) return false;
    for (const p of this.pl) if (p[0] * v[0] + p[1] * v[1] + p[2] * v[2] > r) return false;
    return true;
  }
  project(x, y, z) { return project(this.B, x, y, z); }

  /* ---- meshes ---- */
  /** a baked world: its chunks culled by sphere */
  drawWorld(world, skip) {
    if (!world) return;
    for (const ch of world.chunks) { const s = ch.sphere; if (this.sees(s[0], s[1], s[2], s[3])) this.drawMesh(ch, null, skip); }
  }
  /** a mesh: M (3x4, null for a world-space baked mesh); o: { lit: true (compute light from env), flash (0..1 white),
   *  tint (packed color multiply), dim } */
  drawMesh(mesh, M, o) {
    const B = this.B, env = this.env, dynL = [];
    if (M) { const s = mesh.sphere, c = xform(M, s), k = Math.hypot(M[0], M[4], M[8]); if (!this.sees(c[0], c[1], c[2], s[3] * k)) return; for (const l of this.dyn) if (Math.hypot(l.x - c[0], l.y - c[1], l.z - c[2]) < l.r + s[3] * k) dynL.push(l); }
    else { const s = mesh.sphere; for (const l of this.dyn) if (Math.hypot(l.x - s[0], l.y - s[1], l.z - s[2]) < l.r + s[3]) dynL.push(l); }
    const Q = this.Q, sun = env.sun || { dir: [0, 0, 1], k: .4 }, sd = V3.norm(sun.dir), flash = o && o.flash || 0, lit = !!M;
    const skipTag = o && o.skipTag;
    for (const g of mesh.groups) {
      if (o && o.hide && o.hide.has(g.tex)) continue;
      const T = texOf(g.tex), P = g.pos, N = g.nrm, UV = g.uv, GL = g.L, GT = g.T, nt = N.length / 3;
      for (let t = 0; t < nt; t++) {
        if (skipTag && g.tag && skipTag.has(g.tag[t])) continue;
        const i = t * 9;
        let ax = P[i], ay = P[i + 1], az = P[i + 2], bx = P[i + 3], by = P[i + 4], bz = P[i + 5], cx = P[i + 6], cy = P[i + 7], cz = P[i + 8];
        let nx = N[t * 3], ny = N[t * 3 + 1], nz = N[t * 3 + 2];
        if (M) {
          let x = ax, y = ay, z = az; ax = M[0] * x + M[1] * y + M[2] * z + M[3]; ay = M[4] * x + M[5] * y + M[6] * z + M[7]; az = M[8] * x + M[9] * y + M[10] * z + M[11];
          x = bx; y = by; z = bz; bx = M[0] * x + M[1] * y + M[2] * z + M[3]; by = M[4] * x + M[5] * y + M[6] * z + M[7]; bz = M[8] * x + M[9] * y + M[10] * z + M[11];
          x = cx; y = cy; z = cz; cx = M[0] * x + M[1] * y + M[2] * z + M[3]; cy = M[4] * x + M[5] * y + M[6] * z + M[7]; cz = M[8] * x + M[9] * y + M[10] * z + M[11];
          x = nx; y = ny; z = nz; nx = M[0] * x + M[1] * y + M[2] * z; ny = M[4] * x + M[5] * y + M[6] * z; nz = M[8] * x + M[9] * y + M[10] * z; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
        }
        if (!T.double && nx * (B.x - ax) + ny * (B.y - ay) + nz * (B.z - az) <= 0) continue;
        // view space
        const vax = (ax - B.x) * B.rx + (ay - B.y) * B.ry + (az - B.z) * B.rz, vay = (ax - B.x) * B.ux + (ay - B.y) * B.uy + (az - B.z) * B.uz, vaz = (ax - B.x) * B.fx + (ay - B.y) * B.fy + (az - B.z) * B.fz;
        const vbx = (bx - B.x) * B.rx + (by - B.y) * B.ry + (bz - B.z) * B.rz, vby = (bx - B.x) * B.ux + (by - B.y) * B.uy + (bz - B.z) * B.uz, vbz = (bx - B.x) * B.fx + (by - B.y) * B.fy + (bz - B.z) * B.fz;
        const vcx = (cx - B.x) * B.rx + (cy - B.y) * B.ry + (cz - B.z) * B.rz, vcy = (cx - B.x) * B.ux + (cy - B.y) * B.uy + (cz - B.z) * B.uz, vcz = (cx - B.x) * B.fx + (cy - B.y) * B.fy + (cz - B.z) * B.fz;
        if (vaz < B.near && vbz < B.near && vcz < B.near) continue;
        if (vaz > this.far && vbz > this.far && vcz > this.far) continue;
        // light per corner
        let La, Lb, Lc, Ta, Tb, Tc;
        if (lit) {
          let L = env.ambient + sun.k * Math.max(0, nx * sd[0] + ny * sd[1] + nz * sd[2]) + (nz > .7 ? env.skyK || .06 : 0);
          if (o && o.dim) L *= o.dim;
          La = Lb = Lc = L + (o && o.glow || 0); Ta = Tb = Tc = 0;
        } else { La = GL[t * 3]; Lb = GL[t * 3 + 1]; Lc = GL[t * 3 + 2]; Ta = GT[t * 3]; Tb = GT[t * 3 + 1]; Tc = GT[t * 3 + 2]; }
        for (const l of dynL) {
          let d = Math.hypot(l.x - ax, l.y - ay, l.z - az); if (d < l.r) { const f = 1 - d / l.r, k = l.k * f * f; La += k; Ta += k; }
          d = Math.hypot(l.x - bx, l.y - by, l.z - bz); if (d < l.r) { const f = 1 - d / l.r, k = l.k * f * f; Lb += k; Tb += k; }
          d = Math.hypot(l.x - cx, l.y - cy, l.z - cz); if (d < l.r) { const f = 1 - d / l.r, k = l.k * f * f; Lc += k; Tc += k; }
        }
        const j = t * 6;
        Q[0] = vax; Q[1] = vay; Q[2] = vaz; Q[3] = UV[j]; Q[4] = UV[j + 1]; Q[5] = La; Q[6] = Ta;
        Q[7] = vbx; Q[8] = vby; Q[9] = vbz; Q[10] = UV[j + 2]; Q[11] = UV[j + 3]; Q[12] = Lb; Q[13] = Tb;
        Q[14] = vcx; Q[15] = vcy; Q[16] = vcz; Q[17] = UV[j + 4]; Q[18] = UV[j + 5]; Q[19] = Lc; Q[20] = Tc;
        this._clipDraw(T, flash, o && o.tint);
      }
    }
  }
  /** near-clip the triangle in Q (view space + attributes), project, raster */
  _clipDraw(T, flash, tint) {
    const Q = this.Q, S = this.S, B = this.B, near = B.near; let n = 0;
    const inA = Q[2] >= near, inB = Q[9] >= near, inC = Q[16] >= near;
    if (inA && inB && inC) { S.set(Q.subarray(0, 21)); n = 3; }
    else {
      for (let k = 0; k < 3; k++) {
        const a = k * 7, b = ((k + 1) % 3) * 7, za = Q[a + 2], zb = Q[b + 2], ia = za >= near, ib = zb >= near;
        if (ia) { for (let m = 0; m < 7; m++) S[n * 7 + m] = Q[a + m]; n++; }
        if (ia !== ib) { const f = (near - za) / (zb - za); for (let m = 0; m < 7; m++) S[n * 7 + m] = Q[a + m] + (Q[b + m] - Q[a + m]) * f; n++; }
      }
      if (n < 3) return;
    }
    // project in place: [sx, sy, iz, u/z, v/z, L/z, T/z]
    const F = B.F, cx = B.cx, cy = B.cy, wob = this.wobble;
    for (let k = 0; k < n; k++) {
      const o = k * 7, iz = 1 / S[o + 2]; let sx = cx + S[o] * F * iz, sy = cy - S[o + 1] * F * iz;
      if (wob) { sx = Math.round(sx); sy = Math.round(sy); }
      S[o] = sx; S[o + 1] = sy; const u = S[o + 3], v = S[o + 4], L = S[o + 5], Tt = S[o + 6];
      S[o + 2] = iz; S[o + 3] = u * iz; S[o + 4] = v * iz; S[o + 5] = L * iz; S[o + 6] = Tt * iz;
    }
    for (let k = 1; k + 1 < n; k++) this._tri(0, k * 7, (k + 1) * 7, T, flash, tint);
  }
  _tri(a, b, c, T, flash, tint) {
    const S = this.S, W = this.W, H = this.H;
    const x0 = S[a], y0 = S[a + 1], x1 = S[b], y1 = S[b + 1], x2 = S[c], y2 = S[c + 1];
    const e1x = x1 - x0, e1y = y1 - y0, e2x = x2 - x0, e2y = y2 - y0, det = e1x * e2y - e2x * e1y;
    if (det > -1e-7 && det < 1e-7) return;
    const id = 1 / det;
    let d1 = S[b + 2] - S[a + 2], d2 = S[c + 2] - S[a + 2]; const gzx = (d1 * e2y - d2 * e1y) * id, gzy = (d2 * e1x - d1 * e2x) * id;
    d1 = S[b + 3] - S[a + 3]; d2 = S[c + 3] - S[a + 3]; const gux = (d1 * e2y - d2 * e1y) * id, guy = (d2 * e1x - d1 * e2x) * id;
    d1 = S[b + 4] - S[a + 4]; d2 = S[c + 4] - S[a + 4]; const gvx = (d1 * e2y - d2 * e1y) * id, gvy = (d2 * e1x - d1 * e2x) * id;
    d1 = S[b + 5] - S[a + 5]; d2 = S[c + 5] - S[a + 5]; const glx = (d1 * e2y - d2 * e1y) * id, gly = (d2 * e1x - d1 * e2x) * id;
    d1 = S[b + 6] - S[a + 6]; d2 = S[c + 6] - S[a + 6]; const gtx = (d1 * e2y - d2 * e1y) * id, gty = (d2 * e1x - d1 * e2x) * id;
    const ymin = Math.max(0, Math.ceil(Math.min(y0, y1, y2) - .5)), ymax = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2) - .5) - 1);
    if (ymin > ymax) return;
    this.stats.tris++;
    const col = this.col, dep = this.dep, n = T.n, mask = T.mask, bands = T.bands, face = T.face, alpha = T.alpha, glow = T.glow, water = T.water;
    const fogN = this.fogN, fogInv = this.fogInv, fr = this.fogC[0], fgc = this.fogC[1], fb = this.fogC[2], wr = this.warm[0], wg = this.warm[1], wb = this.warm[2];
    const tt = this.t, glowBand = glow >= 1 ? 4 : 3, dim = this.dim;
    const tr = tint ? (tint & 255) / 255 : 1, tg = tint ? ((tint >> 8) & 255) / 255 : 1, tb = tint ? ((tint >> 16) & 255) / 255 : 1;
    const uk = face ? n : TEX_PX, vflow = water && T.flow ? tt * T.flow : 0;
    let px = 0;
    for (let y = ymin; y <= ymax; y++) {
      const yc = y + .5; let xl = 1e9, xr = -1e9;
      if ((yc >= y0) !== (yc >= y1)) { const x = x0 + (yc - y0) * (x1 - x0) / (y1 - y0); if (x < xl) xl = x; if (x > xr) xr = x; }
      if ((yc >= y1) !== (yc >= y2)) { const x = x1 + (yc - y1) * (x2 - x1) / (y2 - y1); if (x < xl) xl = x; if (x > xr) xr = x; }
      if ((yc >= y2) !== (yc >= y0)) { const x = x2 + (yc - y2) * (x0 - x2) / (y0 - y2); if (x < xl) xl = x; if (x > xr) xr = x; }
      const xs = Math.max(0, Math.ceil(xl - .5)), xe = Math.min(W - 1, Math.ceil(xr - .5) - 1);
      if (xs > xe) continue;
      const dx = xs + .5 - x0, dy = yc - y0;
      let iz = S[a + 2] + gzx * dx + gzy * dy, uz = S[a + 3] + gux * dx + guy * dy, vz = S[a + 4] + gvx * dx + gvy * dy, lz = S[a + 5] + glx * dx + gly * dy, tz = S[a + 6] + gtx * dx + gty * dy;
      const row = y * W, by = (y & 3) << 2;
      for (let x = xs; x <= xe; x++, iz += gzx, uz += gux, vz += gvx, lz += glx, tz += gtx) {
        const idx = row + x; if (iz <= dep[idx]) continue;
        const z = 1 / iz, bay = BAYER[by | (x & 3)];
        let c;
        if (water) {
          const u = uz * z, v = vz * z + vflow, L = lz * z;
          const wv = Math.sin(u * .11 + tt * 1.3) * Math.sin(v * .07 - tt) * .6 + Math.sin(u * .31 - v * .23 + tt * 2.1) * .3;
          let bnd = (L * 4 + wv + bay) | 0; bnd = bnd < 0 ? 0 : bnd > 4 ? 4 : bnd;
          c = T.ramp[bnd];
          const sp = Math.sin(u * 1.7 + tt * 3.1) * Math.sin(v * 2.3 - tt * 2.3) * Math.sin(u * .53 + v * .71 + tt);
          if (sp > .8 - L * .12 && bay > .55) { const sr = T.sparkle; c = pack(sr[0], sr[1], sr[2]); }
        } else {
          let tu, tv;
          if (face) { tu = (uz * z * n) | 0; tv = (vz * z * n) | 0; tu = tu < 0 ? 0 : tu > mask ? mask : tu; tv = tv < 0 ? 0 : tv > mask ? mask : tv; }
          else { tu = ((uz * z * uk + 65536) | 0) & mask; tv = ((vz * z * uk + 65536) | 0) & mask; }
          let bnd;
          if (glow) bnd = glowBand;
          else { bnd = (lz * z * 4 * dim + bay) | 0; bnd = bnd < 0 ? 0 : bnd > 4 ? 4 : bnd; }
          c = bands[bnd][(mask - tv) * n + tu];
          if (alpha && c === 0) continue;
        }
        let f = (z - fogN) * fogInv; const tw = glow ? 0 : tz * z;
        if (f > 0 || tw > .04 || flash || tint) {
          let r = c & 255, g = (c >> 8) & 255, b2 = (c >> 16) & 255;
          if (tint) { r *= tr; g *= tg; b2 *= tb; }
          if (tw > .04) { const k = tw > 1 ? .55 : tw * .55; r += wr * k; g += wg * k; b2 += wb * k; }
          if (flash) { r += (255 - r) * flash; g += (255 - g) * flash; b2 += (255 - b2) * flash; }
          if (f > 0) { if (f > 1) f = 1; f = f * Math.sqrt(f) * (glow ? .5 : 1); const fq = ((f * 8 + bay) | 0) * .125; if (fq > 0) { r += (fr - r) * fq; g += (fgc - g) * fq; b2 += (fb - b2) * fq; } }
          c = (255 << 24 | (b2 > 255 ? 255 : b2) << 16 | (g > 255 ? 255 : g) << 8 | (r > 255 ? 255 : r)) >>> 0;
        }
        col[idx] = c; dep[idx] = iz; px++;
      }
    }
    this.stats.px += px;
  }

  /* ---- the sky, into every pixel nothing has covered ---- */
  sky() {
    const B = this.B, W = this.W, H = this.H, col = this.col, dep = this.dep, env = this.env, sk = env.sky || {}, t = this.t;
    const stops = (sk.colors || ['#0b1026', '#1b2a52', '#3a3060']).map(hexRGB), below = hexRGB(sk.below || (env.fog ? env.fog[0] : '#101820')), glowC = sk.glow ? hexRGB(sk.glow) : null;
    const moon = sk.moon, md = moon ? V3.norm(moon.dir) : null, mc = moon ? hexRGB(moon.color || '#fff6d8') : null, mr = moon ? Math.cos((moon.r || 2.2) * DEG) : 0, mh = moon ? Math.cos((moon.r || 2.2) * 4 * DEG) : 0;
    const layers = this._skyLayers(sk), flash = this.flash, iF = 1 / B.F, cloud = sk.clouds ? hexRGB(sk.clouds) : null, ck = sk.cloudK || .5;
    const stars = sk.stars;
    for (let y = 0; y < H; y++) {
      const Yc = -(y + .5 - B.cy) * iF, row = y * W, by = (y & 3) << 2;
      for (let x = 0; x < W; x++) {
        const idx = row + x; if (dep[idx] > 0) continue;
        const Xc = (x + .5 - B.cx) * iF;
        let dx = B.rx * Xc + B.ux * Yc + B.fx, dy = B.ry * Xc + B.uy * Yc + B.fy, dz = B.rz * Xc + B.uz * Yc + B.fz;
        const l = 1 / Math.hypot(dx, dy, dz); dx *= l; dy *= l; dz *= l;
        const e = dz, bay = BAYER[by | (x & 3)];
        let r, g, b;
        if (e < 0) { const k = Math.min(1, -e * 6); r = stops[2][0] + (below[0] - stops[2][0]) * k; g = stops[2][1] + (below[1] - stops[2][1]) * k; b = stops[2][2] + (below[2] - stops[2][2]) * k; }
        else if (e < .28) { const k = smooth(e / .28 + (bay - .5) * .08); r = stops[2][0] + (stops[1][0] - stops[2][0]) * k; g = stops[2][1] + (stops[1][1] - stops[2][1]) * k; b = stops[2][2] + (stops[1][2] - stops[2][2]) * k; }
        else { const k = smooth((e - .28) / .55 + (bay - .5) * .08); r = stops[1][0] + (stops[0][0] - stops[1][0]) * k; g = stops[1][1] + (stops[0][1] - stops[1][1]) * k; b = stops[1][2] + (stops[0][2] - stops[1][2]) * k; }
        if (glowC && e > -.05 && e < .12) { const k = (1 - Math.abs(e - .02) / .1) * .45; if (k > 0) { r += (glowC[0] - r) * k; g += (glowC[1] - g) * k; b += (glowC[2] - b) * k; } }
        const az = Math.atan2(dy, dx);
        if (stars && e > .06) { const qa = Math.floor(az * 260), qe = Math.floor(e * 260), h = Math.sin(qa * 12.9898 + qe * 78.233) * 43758.5453, f = h - Math.floor(h); if (f > .994) { const tw = .6 + .4 * Math.sin(t * 3 + f * 900); r += 180 * tw; g += 180 * tw; b += 170 * tw; } }
        if (cloud && e > .01 && e < .6) { const n = E.noise2(az * 3 + t * .004, e * 9) * .6 + E.noise2(az * 7 - t * .007, e * 21) * .4, k = (n - .52) * 3 * (1 - e * 1.4); if (k > bay * .9) { const m = Math.min(1, k) * ck; r += (cloud[0] - r) * m; g += (cloud[1] - g) * m; b += (cloud[2] - b) * m; } }
        if (md) { const c = dx * md[0] + dy * md[1] + dz * md[2]; if (c > mr) { r = mc[0]; g = mc[1]; b = mc[2]; if (moon.phase && dx * md[1] - dy * md[0] > (c - mr) * 40 - .002) { r *= .7; g *= .7; b *= .75; } } else if (c > mh) { const k = (c - mh) / (mr - mh) * .35; r += (mc[0] - r) * k; g += (mc[1] - g) * k; b += (mc[2] - b) * k; } }
        if (layers) for (const L of layers) {
          const ai = ((az / TAU + 1) % 1) * L.n | 0, hgt = L.h[ai];
          if (e < hgt && e > L.base) { if (L.lit && L.win[ai] && ((y * 7 + x * 3) % 11 === 0) && e < hgt - .01) { r = L.lit[0]; g = L.lit[1]; b = L.lit[2]; } else { r = L.c[0]; g = L.c[1]; b = L.c[2]; } }
        }
        if (flash) { r += (255 - r) * flash; g += (255 - g) * flash; b += (255 - b) * flash; }
        col[idx] = (255 << 24 | (b > 255 ? 255 : b < 0 ? 0 : b) << 16 | (g > 255 ? 255 : g < 0 ? 0 : g) << 8 | (r > 255 ? 255 : r < 0 ? 0 : r)) >>> 0;
      }
    }
  }
  _skyLayers(sk) {
    if (!sk.layers) return null;
    if (sk._built) return sk._built;
    sk._built = sk.layers.map((L, li) => {
      const n = 1024, h = new Float32Array(n), win = new Uint8Array(n), R = E.rng(L.seed || (li * 31 + 7));
      let cur = L.height || .05, block = 0;
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU;
        if (L.kind === 'city') { if (block-- <= 0) { block = 4 + (R() * 14 | 0); cur = (L.height || .06) * (.4 + R() * 1.1); } h[i] = cur; win[i] = 1; }
        else if (L.kind === 'hills') h[i] = (L.height || .05) * (.55 + .45 * E.noise2(a * 2.2 + li * 3, 0.5) + .2 * Math.sin(a * 5 + li));
        else if (L.kind === 'wall') h[i] = Math.abs(Math.cos(a - (L.at || 0))) > (L.arc || .8) ? (L.height || .03) : -1;
        else h[i] = L.height || .03;
        if (L.from !== undefined) { const d = angWrap(a - L.from); if (d < 0 || d > (L.span || Math.PI)) h[i] = -1; }
      }
      return { n, h, win, c: hexRGB(L.color || '#101828'), lit: L.lit ? hexRGB(L.lit) : null, base: L.base === undefined ? -1 : L.base };
    });
    return sk._built;
  }

  /* ---- billboards: engine rigs and sprites ---- */
  _view(yawDeg, pitchDeg, k) {
    const yq = Math.round(yawDeg / 2) * 2, pq = Math.round(pitchDeg / 2) * 2, kq = Math.max(1 / 16, Math.round(k * 16) / 16), key = yq + ':' + pq + ':' + kq;
    let v = this._views.get(key); if (!v) { if (this._views.size > 600) this._views.clear(); v = new E.View('r3', 'Rail3D', yq, pq, kq, 1); this._views.set(key, v); }
    return v;
  }
  _scratch(w, h) {
    if (!this._sc || this._sc.width < w || this._sc.height < h) { this._sc = document.createElement('canvas'); this._sc.width = Math.max(w, this._sc ? this._sc.width : 0); this._sc.height = Math.max(h, this._sc ? this._sc.height : 0); this._sg = this._sc.getContext('2d', { willReadFrequently: true }); this._sg.imageSmoothingEnabled = false; }
    return this._sg;
  }
  /** an engine rig standing at (x, y, z): drawn by the engine from the bearing it is seen at, at the size its distance
   *  gives, composited with depth. o: { light (0.45..1.25 by default from the scene), flash (0..1), alpha (dither 0..1),
   *  height (its world height for culling, 30), tint } -> its screen box or null */
  drawRig(rig, x, y, z, o = {}) {
    const B = this.B, ht = (o.height || 28) * (rig.o ? rig.o.size : 1);
    const vf = toView(B, x, y, z), vc = toView(B, x, y, z + ht * .55);
    if (vc[2] < 6 || vc[2] > this.far) return null;
    const k = B.F / vc[2]; if (k * ht < 3) return null;
    const sx = B.cx + vf[0] * B.F / Math.max(1, vf[2]), sy = B.cy - vf[1] * B.F / Math.max(1, vf[2]);
    if (sx < -k * 40 || sx > this.W + k * 40 || sy < -k * 10 || sy > this.H + k * ht * 1.5) return null;
    const bear = Math.atan2(y - B.y, x - B.x), hd = Math.hypot(x - B.x, y - B.y), el = Math.atan2(B.z - (z + ht * .5), Math.max(1, hd)) / DEG;
    const view = this._view(-bear / DEG - 90, clamp(el, 3, 60), k);
    const w = Math.ceil(k * ht * 2.6 + 16), h = Math.ceil(k * ht * 1.8 + 16), ox = w >> 1, oy = Math.ceil(k * ht * 1.45) + 6;
    const g = this._scratch(w, h); g.clearRect(0, 0, w, h);
    if (E.px.reset) E.px.reset(g);
    try { rig.draw(g, ox, oy, view); } catch (e) { return null; }
    const d = g.getImageData(0, 0, w, h).data;
    const iz = 1 / Math.max(2, vc[2] - (o.depthBias || 4)), light = o.light === undefined ? this.actorLight(x, y, z + ht * .6) : o.light;
    return this._composite(d, w, h, Math.round(sx - ox), Math.round(sy - oy), iz, light, o.flash || 0, o.alpha === undefined ? 1 : o.alpha, o.tint, vc[2]);
  }
  /** pixels (RGBA, w x h) at screen (x0, y0) with depth iz: light multiplies, flash mixes to white, alpha dithers */
  _composite(d, w, h, x0, y0, iz, light, flash, alpha, tint, zv) {
    const W = this.W, H = this.H, col = this.col, dep = this.dep, fogN = this.fogN, fogInv = this.fogInv, fc = this.fogC;
    let f = (zv - fogN) * fogInv; f = f <= 0 ? 0 : f >= 1 ? .85 : f * Math.sqrt(f) * .85;
    const wm = this.warm, wk = Math.max(0, light - 1) * .5, tr = tint ? tint[0] / 255 : 1, tg = tint ? tint[1] / 255 : 1, tb = tint ? tint[2] / 255 : 1;
    let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9, n = 0;
    for (let yy = 0; yy < h; yy++) {
      const Y = y0 + yy; if (Y < 0 || Y >= H) continue;
      for (let xx = 0; xx < w; xx++) {
        const j = (yy * w + xx) * 4; if (d[j + 3] < 128) continue;
        const X = x0 + xx; if (X < 0 || X >= W) continue;
        const idx = Y * W + X; if (iz <= dep[idx]) continue;
        if (alpha < 1 && BAYER[((Y & 3) << 2) | (X & 3)] > alpha) continue;
        let r = d[j] * light * tr, g = d[j + 1] * light * tg, b = d[j + 2] * light * tb;
        if (wk > 0) { r += wm[0] * wk * .3; g += wm[1] * wk * .3; b += wm[2] * wk * .3; }
        if (flash) { r += (255 - r) * flash; g += (255 - g) * flash; b += (255 - b) * flash; }
        if (f) { r += (fc[0] - r) * f; g += (fc[1] - g) * f; b += (fc[2] - b) * f; }
        col[idx] = (255 << 24 | (b > 255 ? 255 : b) << 16 | (g > 255 ? 255 : g) << 8 | (r > 255 ? 255 : r)) >>> 0; dep[idx] = iz; n++;
        if (X < bx0) bx0 = X; if (X > bx1) bx1 = X; if (Y < by0) by0 = Y; if (Y > by1) by1 = Y;
      }
    }
    this.stats.actors++;
    return n ? [bx0, by0, bx1, by1] : null;
  }
  /** the light on an actor at a point: ambient + sun + the static and dynamic lights there, kept readable */
  actorLight(x, y, z) {
    const env = this.env; let L = env.ambient + (env.sun ? env.sun.k * .6 : .2);
    const ls = env._lights || []; for (const l of ls) { const d = Math.hypot(l.x - x, l.y - y, l.z - z); if (d < l.r) { const f = 1 - d / l.r; L += l.k * f * f * .8; } }
    for (const l of this.dyn) { const d = Math.hypot(l.x - x, l.y - y, l.z - z); if (d < l.r) { const f = 1 - d / l.r; L += l.k * f * f; } }
    return clamp(L * (env.actorK || 1.15), .5, 1.3);
  }
  /** an E.sprite (or any canvas) as a billboard of world height hw, its foot at (x, y, z) */
  drawSprite(spr, x, y, z, hw, o = {}) {
    const p = this.project(x, y, z); if (!p || p[2] > this.far) return null;
    const cv = spr.cv || spr, k = this.B.F / p[2], hpx = hw * k; if (hpx < 1) return null;
    const s = hpx / cv.height, w = Math.max(1, Math.round(cv.width * s)), h = Math.max(1, Math.round(cv.height * s));
    const g = this._scratch(w, h); g.clearRect(0, 0, w, h); g.drawImage(cv, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data;
    return this._composite(d, w, h, Math.round(p[0] - w / 2), Math.round(p[1] - h), 1 / Math.max(2, p[2] - (o.depthBias || 1)), o.light === undefined ? 1 : o.light, o.flash || 0, 1, null, p[2]);
  }

  /* ---- particles, glows, lines, decals, shadows ---- */
  /** a square splat of world size s at a point: mode 0 opaque, 1 additive, 2 half (dithered) */
  splat(x, y, z, s, c, mode = 0, alpha = 1) {
    const B = this.B, dx = x - B.x, dy = y - B.y, dz = z - B.z, Z = dx * B.fx + dy * B.fy + dz * B.fz;
    if (Z < B.near || Z > this.far) return;
    const X = dx * B.rx + dy * B.ry + dz * B.rz, Y = dx * B.ux + dy * B.uy + dz * B.uz, k = B.F / Z, sx = B.cx + X * k, sy = B.cy - Y * k, r = Math.max(.5, s * k * .5);
    const x0 = Math.max(0, Math.round(sx - r)), x1 = Math.min(this.W - 1, Math.round(sx + r) - 1), y0 = Math.max(0, Math.round(sy - r)), y1 = Math.min(this.H - 1, Math.round(sy + r) - 1);
    const iz = 1 / Z, col = this.col, dep = this.dep, W = this.W, cr = c[0], cg = c[1], cb = c[2];
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
      const idx = yy * W + xx; if (dep[idx] >= iz) continue;
      if ((mode === 2 || alpha < 1) && BAYER[((yy & 3) << 2) | (xx & 3)] > (mode === 2 ? .5 : 1) * alpha) continue;
      if (mode === 1) { const o = col[idx]; let r = (o & 255) + cr * alpha, g = ((o >> 8) & 255) + cg * alpha, b = ((o >> 16) & 255) + cb * alpha; col[idx] = (255 << 24 | (b > 255 ? 255 : b) << 16 | (g > 255 ? 255 : g) << 8 | (r > 255 ? 255 : r)) >>> 0; }
      else col[idx] = pack(cr, cg, cb);
    }
  }
  /** a soft additive glow disc (world radius) */
  glow(x, y, z, rad, c, k = 1) {
    const p = this.project(x, y, z); if (!p || p[2] > this.far) return;
    const r = rad * this.B.F / p[2]; if (r < .5) return;
    const iz = 1 / Math.max(2, p[2] - rad), col = this.col, dep = this.dep, W = this.W, H = this.H;
    const x0 = Math.max(0, Math.floor(p[0] - r)), x1 = Math.min(W - 1, Math.ceil(p[0] + r)), y0 = Math.max(0, Math.floor(p[1] - r)), y1 = Math.min(H - 1, Math.ceil(p[1] + r));
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
      const idx = yy * W + xx; if (dep[idx] > iz) continue;
      const d = Math.hypot(xx + .5 - p[0], yy + .5 - p[1]) / r; if (d >= 1) continue;
      let a = (1 - d) * (1 - d) * k; a = Math.round(a * 4) / 4; if (a <= 0) continue;
      const o = col[idx]; let rr = (o & 255) + c[0] * a, g = ((o >> 8) & 255) + c[1] * a, b = ((o >> 16) & 255) + c[2] * a;
      col[idx] = (255 << 24 | (b > 255 ? 255 : b) << 16 | (g > 255 ? 255 : g) << 8 | (rr > 255 ? 255 : rr)) >>> 0;
    }
  }
  /** a depth-tested line between two world points (tracers, lasers, ropes); additive with mode 1 */
  line(a, b, c, mode = 0, width = 1) {
    const B = this.B; let va = toView(B, a[0], a[1], a[2]), vb = toView(B, b[0], b[1], b[2]);
    if (va[2] < B.near && vb[2] < B.near) return;
    if (va[2] < B.near) { const f = (B.near - va[2]) / (vb[2] - va[2]); va = V3.lerp(va, vb, f); }
    if (vb[2] < B.near) { const f = (B.near - vb[2]) / (va[2] - vb[2]); vb = V3.lerp(vb, va, f); }
    const x0 = B.cx + va[0] * B.F / va[2], y0 = B.cy - va[1] * B.F / va[2], x1 = B.cx + vb[0] * B.F / vb[2], y1 = B.cy - vb[1] * B.F / vb[2];
    const n = Math.min(2000, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) + 1), iza = 1 / va[2], izb = 1 / vb[2], col = this.col, dep = this.dep, W = this.W, H = this.H;
    for (let i = 0; i <= n; i++) {
      const f = i / n, X = Math.round(x0 + (x1 - x0) * f), Y = Math.round(y0 + (y1 - y0) * f); if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const iz = iza + (izb - iza) * f;
      for (let w = 0; w < width; w++) {
        const XX = X + (w & 1 ? 1 : 0) * ((w + 1) >> 1), YY = Y + (w & 1 ? 0 : 1) * (w >> 1); if (XX >= W || YY >= H) continue;
        const idx = YY * W + XX; if (dep[idx] > iz * 1.002) continue;
        if (mode === 1) { const o = col[idx]; let r = (o & 255) + c[0], g = ((o >> 8) & 255) + c[1], b = ((o >> 16) & 255) + c[2]; col[idx] = (255 << 24 | (b > 255 ? 255 : b) << 16 | (g > 255 ? 255 : g) << 8 | (r > 255 ? 255 : r)) >>> 0; }
        else col[idx] = pack(c[0], c[1], c[2]);
      }
    }
  }
  /** a dithered dark ellipse on the ground under an actor */
  shadow(x, y, z, r = 7) {
    const B = this.B, p = this.project(x, y, z + .3); if (!p) return;
    const k = B.F / p[2], rx = r * k, el = Math.max(.15, Math.abs(Math.sin(Math.atan2(B.z - z, Math.max(1, Math.hypot(x - B.x, y - B.y)))))), ry = rx * el;
    if (rx < 1) return;
    this.stats.shadows++;
    const iz = 1 / Math.max(2, p[2] - 3), col = this.col, dep = this.dep, W = this.W, H = this.H;
    for (let yy = Math.max(0, Math.floor(p[1] - ry)); yy <= Math.min(H - 1, Math.ceil(p[1] + ry)); yy++) for (let xx = Math.max(0, Math.floor(p[0] - rx)); xx <= Math.min(W - 1, Math.ceil(p[0] + rx)); xx++) {
      const dx = (xx + .5 - p[0]) / rx, dy = (yy + .5 - p[1]) / ry; if (dx * dx + dy * dy > 1) continue;
      const idx = yy * W + xx; if (dep[idx] > iz * 1.05 || dep[idx] === 0) continue;
      if (((xx + yy) & 1) && dx * dx + dy * dy > .45) continue;
      const o = col[idx]; col[idx] = (255 << 24 | (((o >> 16) & 255) * .5) << 16 | (((o >> 8) & 255) * .5) << 8 | ((o & 255) * .5)) >>> 0;
    }
  }
  /** darken or tint the whole frame (cover vignette, smoke, flashes) */
  vignette(k, c = [0, 0, 0], edge = true) {
    const col = this.col, W = this.W, H = this.H, cx = W / 2, cy = H / 2, inv = 1 / Math.hypot(cx, cy);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = edge ? Math.hypot(x - cx, y - cy) * inv : 1, a = clamp((d - .45) * 1.8, 0, 1) * k; if (a <= 0) continue;
      if (BAYER[((y & 3) << 2) | (x & 3)] > a * 1.6) continue;
      const i = y * W + x, o = col[i], m = 1 - Math.min(1, a);
      col[i] = (255 << 24 | (((o >> 16) & 255) * m + c[2] * (1 - m)) << 16 | (((o >> 8) & 255) * m + c[1] * (1 - m)) << 8 | ((o & 255) * m + c[0] * (1 - m))) >>> 0;
    }
  }
  /** copy the frame onto the game's buffer at (x, y) */
  present(g, x, y) {
    if (HEADLESS || !this.img) return;
    this.img32.set(this.col); this.cg.putImageData(this.img, 0, 0); g.drawImage(this.cv, x, y);
  }
}
TC.Rail3D = Rail3D;
