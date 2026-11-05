// 04-rail3d: the renderer. A z-buffered, perspective-correct, banded-light, dithered-fog triangle rasterizer running
// in JS into the game's low-resolution buffer, with a procedural sky, engine Humanoid rigs composited as depth-tested
// billboards, depth-tested particles (additive and dithered), lines, screen-space rings, and present() through one
// r.overlay. Canvas work happens only in draw: scratch canvases are made lazily, so Node never needs one.
// Reads: TC.camSetup (00), TC.mat (02), batches and meshes (03).

class Rail3D {
  constructor() { this.W = 0; this.H = 0; this.stats = { tris: 0, px: 0, actors: 0, ms: 0 }; this._views = new Map(); this.wobble = false; this.dyn = []; }
  resize(W, H) {
    if (W === this.W && H === this.H) return;
    this.W = W; this.H = H; this.depth = new Float32Array(W * H);
    this.cv = E.mkCanvas(W, H); this.cg = this.cv.getContext('2d'); this.img = this.cg.createImageData(W, H); this.col = new Uint32Array(this.img.data.buffer);
  }
  // cam: { x, y, z, yaw, pitch, roll, fov }; env: the stage's look (fog, sky, ambient, sun)
  begin(cam, W, H, env, time) {
    this.resize(W, H);
    const cs = this.cs = camSetup(Object.assign({}, cam, { aspect: W / H }));
    this.F = (H / 2) / cs.t; this.cx = W / 2; this.cy = H / 2; this.env = env; this.time = time || 0;
    this.depth.fill(1e9); this.stats.tris = 0; this.stats.px = 0; this.stats.actors = 0;
    const fog = env.fog || ['#000000', 400, 2000]; this.fogC = hexRGB(fog[0]); this.fogN = fog[1]; this.fogF = fog[2];
    this.dyn.length = 0;
    this.fogK = 8 / (this.fogF - this.fogN);
    this.flash = env.flashNow || 0;
  }
  addLight(x, y, z, r, k, color = '#ffd090') { if (this.dyn.length < 12) this.dyn.push({ p: [x, y, z], r, k, c: hexRGB(color) }); }
  // view-space transform of a world point
  toView(p) { const cs = this.cs, dx = p[0] - cs.pos[0], dy = p[1] - cs.pos[1], dz = p[2] - cs.pos[2]; return [dx * cs.r[0] + dy * cs.r[1] + dz * cs.r[2], dx * cs.u[0] + dy * cs.u[1] + dz * cs.u[2], dx * cs.f[0] + dy * cs.f[1] + dz * cs.f[2]]; }
  // world point -> [sx, sy, z] in this viewport's pixels, or null behind the camera
  project(p) { const v = this.toView(p); if (v[2] < 2) return null; return [this.cx + v[0] * this.F / v[2], this.cy - v[1] * this.F / v[2], v[2]]; }
  sphereVisible(s) {
    const v = this.toView(s), r = s[3];
    if (v[2] < -r || v[2] - r > this.fogF + 60) return false;
    const kx = this.W / 2 / this.F, ky = this.H / 2 / this.F, z = v[2] + r;
    return Math.abs(v[0]) - r * 1.5 <= z * kx && Math.abs(v[1]) - r * 1.5 <= z * ky;
  }
  // ------------------------------------------------------------ triangles
  drawBatch(b) {
    if (!this.sphereVisible(b.sphere)) return;
    const cs = this.cs, n = b.n, pos = b.pos, uv = b.uv, L = b.L, nrm = b.nrm, M = b.mat, dl = this._dynFor(b.sphere);
    const px = cs.pos[0], py = cs.pos[1], pz = cs.pos[2];
    for (let t = 0; t < n; t++) {
      const o = t * 9;
      if (!M.double) { const nx = nrm[t * 3], ny = nrm[t * 3 + 1], nz = nrm[t * 3 + 2]; if ((pos[o] - px) * nx + (pos[o + 1] - py) * ny + (pos[o + 2] - pz) * nz >= 0) continue; }
      let l0 = L[t * 3], l1 = L[t * 3 + 1], l2 = L[t * 3 + 2];
      if (dl) { l0 += this._dynAt(dl, pos, o); l1 += this._dynAt(dl, pos, o + 3); l2 += this._dynAt(dl, pos, o + 6); }
      this._tri(pos[o], pos[o + 1], pos[o + 2], pos[o + 3], pos[o + 4], pos[o + 5], pos[o + 6], pos[o + 7], pos[o + 8], uv[t * 6], uv[t * 6 + 1], uv[t * 6 + 2], uv[t * 6 + 3], uv[t * 6 + 4], uv[t * 6 + 5], l0, l1, l2, M, b.tint[t]);
    }
  }
  _dynFor(s) { if (!this.dyn.length) return null; let out = null; for (const d of this.dyn) if (Math.hypot(d.p[0] - s[0], d.p[1] - s[1], d.p[2] - s[2]) < d.r + s[3]) (out || (out = [])).push(d); return out; }
  _dynAt(dl, pos, o) { let a = 0; for (const d of dl) { const dx = d.p[0] - pos[o], dy = d.p[1] - pos[o + 1], dz = d.p[2] - pos[o + 2], q = Math.sqrt(dx * dx + dy * dy + dz * dz); if (q < d.r) { const f = 1 - q / d.r; a += f * f * d.k; } } return a; }
  // a dynamic mesh: inst { mesh, x, y, z, yaw, pitch, roll, s, flash, tint }
  drawMesh(inst) {
    const m = inst.mesh, s = inst.s || 1, sph = [inst.x, inst.y, inst.z, m.r * s];
    if (!this.sphereVisible(sph)) return;
    const cy = Math.cos(inst.yaw || 0), sy = Math.sin(inst.yaw || 0), cp = Math.cos(inst.pitch || 0), sp = Math.sin(inst.pitch || 0), cr = Math.cos(inst.roll || 0), sr = Math.sin(inst.roll || 0);
    // R = Rz(yaw) * Ry(pitch) * Rx(roll)
    const R = [cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr, sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr, -sp, cp * sr, cp * cr];
    const env = this.env, amb = env.ambient === undefined ? .4 : env.ambient, sun = env.sun || { dir: [-.3, .4, .85], k: .5 }, sd = vnorm(sun.dir), dl = this._dynFor(sph);
    const T = this._T || (this._T = new Float32Array(9)), cs = this.cs, flash = inst.flash || 0;
    for (const g of m.groups) {
      const M = g.mat;
      for (let t = 0; t < g.n; t++) {
        const o = t * 9;
        for (let v = 0; v < 3; v++) { const a = g.pos[o + v * 3] * s, b = g.pos[o + v * 3 + 1] * s, c = g.pos[o + v * 3 + 2] * s; T[v * 3] = inst.x + R[0] * a + R[1] * b + R[2] * c; T[v * 3 + 1] = inst.y + R[3] * a + R[4] * b + R[5] * c; T[v * 3 + 2] = inst.z + R[6] * a + R[7] * b + R[8] * c; }
        const ln = [g.nrm[t * 3], g.nrm[t * 3 + 1], g.nrm[t * 3 + 2]], N = [R[0] * ln[0] + R[1] * ln[1] + R[2] * ln[2], R[3] * ln[0] + R[4] * ln[1] + R[5] * ln[2], R[6] * ln[0] + R[7] * ln[1] + R[8] * ln[2]];
        if (!M.double && (T[0] - cs.pos[0]) * N[0] + (T[1] - cs.pos[1]) * N[1] + (T[2] - cs.pos[2]) * N[2] >= 0) continue;
        let l = amb + Math.max(0, vdot(N, sd)) * sun.k + flash; if (M.glow) l = 1.2;
        const l0 = l + (dl ? this._dynAt(dl, T, 0) : 0), l1 = l + (dl ? this._dynAt(dl, T, 3) : 0), l2 = l + (dl ? this._dynAt(dl, T, 6) : 0);
        this._tri(T[0], T[1], T[2], T[3], T[4], T[5], T[6], T[7], T[8], g.uv[t * 6], g.uv[t * 6 + 1], g.uv[t * 6 + 2], g.uv[t * 6 + 3], g.uv[t * 6 + 4], g.uv[t * 6 + 5], l0, l1, l2, M, inst.tint || 0);
      }
    }
  }
  // one world triangle: view transform, near clip, project, raster
  _tri(x0, y0, z0, x1, y1, z1, x2, y2, z2, u0, v0, u1, v1, u2, v2, l0, l1, l2, M, tint) {
    const cs = this.cs, R = cs.r, Uu = cs.u, Ff = cs.f, ox = cs.pos[0], oy = cs.pos[1], oz = cs.pos[2];
    const vx = (x, y, z) => (x - ox) * R[0] + (y - oy) * R[1] + (z - oz) * R[2];
    const vy = (x, y, z) => (x - ox) * Uu[0] + (y - oy) * Uu[1] + (z - oz) * Uu[2];
    const vz = (x, y, z) => (x - ox) * Ff[0] + (y - oy) * Ff[1] + (z - oz) * Ff[2];
    const A = [vx(x0, y0, z0), vy(x0, y0, z0), vz(x0, y0, z0), u0, v0, l0], B = [vx(x1, y1, z1), vy(x1, y1, z1), vz(x1, y1, z1), u1, v1, l1], C = [vx(x2, y2, z2), vy(x2, y2, z2), vz(x2, y2, z2), u2, v2, l2];
    const NEAR = 2, far = this.fogF + 40;
    if (A[2] > far && B[2] > far && C[2] > far) return;
    if (A[2] < NEAR && B[2] < NEAR && C[2] < NEAR) return;
    // frustum side rejection (all three outside one side)
    const kx = this.W / 2 / this.F, ky = this.H / 2 / this.F;
    if (A[0] > A[2] * kx && B[0] > B[2] * kx && C[0] > C[2] * kx) return;
    if (-A[0] > A[2] * kx && -B[0] > B[2] * kx && -C[0] > C[2] * kx) return;
    if (A[1] > A[2] * ky && B[1] > B[2] * ky && C[1] > C[2] * ky) return;
    if (-A[1] > A[2] * ky && -B[1] > B[2] * ky && -C[1] > C[2] * ky) return;
    if (A[2] >= NEAR && B[2] >= NEAR && C[2] >= NEAR) { this._raster(this._proj(A), this._proj(B), this._proj(C), M, tint); return; }
    // Sutherland-Hodgman against z = NEAR
    const inp = [A, B, C], out = [];
    for (let i = 0; i < 3; i++) {
      const P = inp[i], Q = inp[(i + 1) % 3], pin = P[2] >= NEAR, qin = Q[2] >= NEAR;
      if (pin) out.push(P);
      if (pin !== qin) { const t = (NEAR - P[2]) / (Q[2] - P[2]); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t, NEAR, P[3] + (Q[3] - P[3]) * t, P[4] + (Q[4] - P[4]) * t, P[5] + (Q[5] - P[5]) * t]); }
    }
    if (out.length < 3) return;
    const pr = out.map(p => this._proj(p));
    for (let i = 1; i < pr.length - 1; i++) this._raster(pr[0], pr[i], pr[i + 1], M, tint);
  }
  _proj(p) {
    const iz = 1 / p[2], F = this.F; let sx = this.cx + p[0] * F * iz, sy = this.cy - p[1] * F * iz;
    if (this.wobble) { sx = Math.round(sx); sy = Math.round(sy); return [sx, sy, iz, p[3], p[4], p[5], 1]; }
    return [sx, sy, iz, p[3] * iz, p[4] * iz, p[5] * iz, 0];
  }
  // scanline raster of a projected triangle; each vertex [sx, sy, 1/z, u/z, v/z, L/z, affine]
  _raster(a, b, c, M, tint) {
    this.stats.tris++;
    const area = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
    if (Math.abs(area) < 1e-6) return;
    const W = this.W, H = this.H, col = this.col, dep = this.depth, ia = 1 / area;
    const g = q => [((b[q] - a[q]) * (c[1] - a[1]) - (c[q] - a[q]) * (b[1] - a[1])) * ia, ((c[q] - a[q]) * (b[0] - a[0]) - (b[q] - a[q]) * (c[0] - a[0])) * ia];
    const [dzx, dzy] = g(2), [dux, duy] = g(3), [dvx, dvy] = g(4), [dlx, dly] = g(5);
    // sort by y
    let p0 = a, p1 = b, p2 = c, t;
    if (p1[1] < p0[1]) { t = p0; p0 = p1; p1 = t; } if (p2[1] < p0[1]) { t = p0; p0 = p2; p2 = t; } if (p2[1] < p1[1]) { t = p1; p1 = p2; p2 = t; }
    const yStart = Math.max(0, Math.ceil(p0[1] - .5)), yEnd = Math.min(H, Math.ceil(p2[1] - .5));
    if (yStart >= yEnd) return;
    const bands = M.bands, glow = M.glow, water = M.water, alpha = M.alpha, sc = M.scale, affine = a[6] === 1;
    const fogC = this.fogC, fogN = this.fogN, fogK = this.fogK * (glow ? .5 : 1), fr = fogC[0], fgc = fogC[1], fb = fogC[2];
    const tr = tint ? tint & 255 : 128, tg = tint ? (tint >> 8) & 255 : 128, tb = tint ? (tint >> 16) & 255 : 128, tinted = tint && !(tr === 128 && tg === 128 && tb === 128);
    const time = this.time, bay = BAYER4, flash = this.flash;
    const ax = a[0], ay = a[1], az = a[2], au = a[3], av = a[4], al = a[5];
    for (let y = yStart; y < yEnd; y++) {
      const yc = y + .5;
      // long edge p0->p2, short edge p0->p1 or p1->p2
      const xl0 = p0[0] + (p2[0] - p0[0]) * (yc - p0[1]) / ((p2[1] - p0[1]) || 1e-9);
      let xs;
      if (yc < p1[1]) xs = p0[0] + (p1[0] - p0[0]) * (yc - p0[1]) / ((p1[1] - p0[1]) || 1e-9);
      else xs = p1[0] + (p2[0] - p1[0]) * (yc - p1[1]) / ((p2[1] - p1[1]) || 1e-9);
      let xa = xl0 < xs ? xl0 : xs, xb = xl0 < xs ? xs : xl0;
      let x0 = Math.max(0, Math.ceil(xa - .5)), x1 = Math.min(W, Math.ceil(xb - .5));
      if (x0 >= x1) continue;
      const dx0 = x0 + .5 - ax, dy0 = yc - ay;
      let iz = az + dzx * dx0 + dzy * dy0, uz = au + dux * dx0 + duy * dy0, vz = av + dvx * dx0 + dvy * dy0, lz = al + dlx * dx0 + dly * dy0;
      let idx = y * W + x0;
      const brow = (y & 3) * 4;
      for (let x = x0; x < x1; x++, idx++, iz += dzx, uz += dux, vz += dvx, lz += dlx) {
        if (iz <= 0) continue;
        const z = affine ? 1 / iz : 1 / iz;
        if (z >= dep[idx]) continue;
        let u, v, l;
        if (affine) { u = uz; v = vz; l = lz; } else { u = uz * z; v = vz * z; l = lz * z; }
        const th = bay[brow + (x & 3)];
        if (water) { l = l * .85 + .25 * Math.sin(u * .11 + time * 1.3) * Math.sin(v * .07 - time) + .1; }
        let band = (l * 4 + th) | 0; if (band > 4) band = 4; else if (band < 0) band = 0;
        if (glow) band = 4;
        const tu = ((u * sc) | 0) & 31, tv = 31 - (((v * sc) | 0) & 31);
        let cc = bands[band][(tv << 5) | tu];
        if (alpha && cc === 0) continue;
        let r = cc & 255, gg = (cc >> 8) & 255, bb = (cc >> 16) & 255;
        if (water && TC.vnoise((u + time * 8) * .25, v * .25, 40) > .8) { r = 200; gg = 220; bb = 255; }
        if (tinted) { r = (r * tr) >> 7; gg = (gg * tg) >> 7; bb = (bb * tb) >> 7; if (r > 255) r = 255; if (gg > 255) gg = 255; if (bb > 255) bb = 255; }
        if (flash) { r += (255 - r) * flash; gg += (255 - gg) * flash; bb += (255 - bb) * flash; }
        let f = (z - fogN) * fogK; if (f > 0) { f = (f + th) | 0; if (f > 8) f = 8; if (f > 0) { const k = 8 - f; r = (r * k + fr * f) >> 3; gg = (gg * k + fgc * f) >> 3; bb = (bb * k + fb * f) >> 3; } }
        col[idx] = 0xff000000 | (bb << 16) | (gg << 8) | r; dep[idx] = z;
      }
      this.stats.px += x1 - x0;
    }
  }
  // ------------------------------------------------------------ sky (pixels the world did not cover)
  sky(spec) {
    const W = this.W, H = this.H, col = this.col, dep = this.depth, cs = this.cs, F = this.F, cx = this.cx, cy = this.cy, t = this.time;
    const st = spec.stops.map(hexRGB), stars = spec.stars, moon = spec.moon, clouds = spec.clouds, sil = spec.sil || [], flash = (spec.flash || 0) + this.flash;
    const md = moon ? vnorm([Math.cos(moon.az) * Math.cos(moon.el), Math.sin(moon.az) * Math.cos(moon.el), Math.sin(moon.el)]) : null, mc = moon ? hexRGB(moon.color) : null;
    const cc = clouds ? hexRGB(clouds.color) : null, sl = sil.map(s => ({ c: hexRGB(s.color), h: s.h, lit: s.lit ? hexRGB(s.lit) : null }));
    const glow = spec.glow ? { c: hexRGB(spec.glow.color), az: spec.glow.az, w: spec.glow.w || .8, k: spec.glow.k || .5 } : null;
    for (let y = 0; y < H; y++) {
      const dyc = -(y + .5 - cy) / F;
      for (let x = 0; x < W; x++) {
        const idx = y * W + x; if (dep[idx] < 1e9) continue;
        const dxc = (x + .5 - cx) / F;
        const dX = cs.f[0] + cs.r[0] * dxc + cs.u[0] * dyc, dY = cs.f[1] + cs.r[1] * dxc + cs.u[1] * dyc, dZ = cs.f[2] + cs.r[2] * dxc + cs.u[2] * dyc;
        const il = 1 / Math.sqrt(dX * dX + dY * dY + dZ * dZ), ez = dZ * il, el = Math.asin(ez), az = Math.atan2(dY, dX);
        // gradient: bottom (horizon) -> mid -> top
        let k = clamp(el / .9, 0, 1), r, g, b;
        if (k < .25) { const q = k / .25; r = lerp(st[2][0], st[1][0], q); g = lerp(st[2][1], st[1][1], q); b = lerp(st[2][2], st[1][2], q); }
        else { const q = (k - .25) / .75; r = lerp(st[1][0], st[0][0], q); g = lerp(st[1][1], st[0][1], q); b = lerp(st[1][2], st[0][2], q); }
        if (el < 0) { const q = clamp(-el * 4, 0, 1); r = lerp(st[2][0], this.fogC[0], q); g = lerp(st[2][1], this.fogC[1], q); b = lerp(st[2][2], this.fogC[2], q); }
        if (glow) { const da = Math.abs(angDiff(az, glow.az)), q = Math.max(0, 1 - da / glow.w) * Math.max(0, 1 - el * 3) * glow.k; r += (glow.c[0] - r) * q; g += (glow.c[1] - g) * q; b += (glow.c[2] - b) * q; }
        const th = BAYER4[(y & 3) * 4 + (x & 3)];
        if (stars && el > .06) { const qx = Math.floor(az * 260), qy = Math.floor(el * 260), h = TC.noise2(qx, qy, 77); if (h > .993) { const tw = .6 + .4 * Math.sin(t * 3 + h * 900); r = g = b = 200 * tw + 40; } }
        if (clouds && el > .02) { const n = TC.vnoise(az * 3 + t * .01, el * 9, 5) * TC.vnoise(az * 7 - t * .02, el * 15, 6); const q = clamp((n - clouds.cover) * 4, 0, 1) * clouds.k; if (q > th * .9) { r = lerp(r, cc[0], q); g = lerp(g, cc[1], q); b = lerp(b, cc[2], q); } }
        if (md) { const dd = (dX * md[0] + dY * md[1] + dZ * md[2]) * il; if (dd > .99975) { r = mc[0]; g = mc[1]; b = mc[2]; } else if (dd > .9988) { const q = (dd - .9988) / .00095 * .5; r += (mc[0] - r) * q; g += (mc[1] - g) * q; b += (mc[2] - b) * q; } }
        for (let s = 0; s < sl.length; s++) { const L = sl[s], hh = L.h(az); if (el < hh && el > -.3) { r = L.c[0]; g = L.c[1]; b = L.c[2]; if (L.lit && TC.noise2(Math.floor(az * 300), Math.floor(el * 300), 9 + s) > .965) { r = L.lit[0]; g = L.lit[1]; b = L.lit[2]; } } }
        if (flash) { r += (235 - r) * flash; g += (240 - g) * flash; b += (255 - b) * flash; }
        col[idx] = 0xff000000 | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
      }
    }
  }
  // ------------------------------------------------------------ actors as billboards
  // a: { x, y, z (feet), chest (height of the depth point), h (world height), draw(g, ox, oy, view), light: [r, g, b] (1 = white), flash, alpha, clipZ }
  billboard(a) {
    const chest = [a.x, a.y, a.z + (a.chest || 16)], v = this.toView(chest);
    if (v[2] < 8 || v[2] > this.fogF + 40) return;
    const k = this.F / v[2], feet = this.project([a.x, a.y, a.z]); if (!feet) return;
    const hpx = (a.h || 30) * k; if (hpx < 3) return;
    const cs = this.cs, b = Math.atan2(a.y - cs.pos[1], a.x - cs.pos[0]), hd = Math.hypot(a.x - cs.pos[0], a.y - cs.pos[1]);
    const yawDeg = Math.round((-b * 180 / Math.PI - 90) / 2) * 2, pitchDeg = Math.max(3, Math.round(Math.atan2(cs.pos[2] - chest[2], hd) * 180 / Math.PI / 2) * 2), q = Math.max(1 / 16, Math.round(k * 16) / 16);
    const key = yawDeg + ':' + pitchDeg + ':' + q;
    let view = this._views.get(key); if (!view) { if (this._views.size > 600) this._views.clear(); view = new E.View('r3', 'Rail3D', yawDeg, pitchDeg, q, 1); this._views.set(key, view); }
    const S = Math.min(512, Math.ceil(hpx * 1.7 + 12)), fy = Math.round(S * .78);
    if (!this._bb || this._bb.width < S || this._bb.height < S) { this._bb = E.mkCanvas(Math.max(S, 128), Math.max(S, 128)); this._bbg = this._bb.getContext('2d', { willReadFrequently: true }); }
    const g = this._bbg; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, S, S); E.px.reset && E.px.reset(g);
    try { a.draw(g, Math.round(S / 2), fy, view); } catch (e) { return; }
    const img = g.getImageData(0, 0, S, S).data, W = this.W, H = this.H, col = this.col, dep = this.depth;
    const zc = v[2] - (a.bias === undefined ? 4 : a.bias), lr = a.light ? a.light[0] : 1, lg = a.light ? a.light[1] : 1, lb = a.light ? a.light[2] : 1, fl = a.flash || 0;
    const X0 = Math.round(feet[0] - S / 2), Y0 = Math.round(feet[1] - fy);
    const fogN = this.fogN, fogK = this.fogK, fc = this.fogC; let f = (zc - fogN) * fogK; f = f < 0 ? 0 : f > 8 ? 8 : f;
    const clipY = a.clipZ !== undefined ? (this.project([a.x, a.y, a.clipZ]) || [0, -1e9])[1] : 1e9;
    for (let j = 0; j < S; j++) {
      const Y = Y0 + j; if (Y < 0 || Y >= H || Y > clipY) continue;
      for (let i = 0; i < S; i++) {
        const s = (j * S + i) * 4; if (img[s + 3] < 128) continue;
        const X = X0 + i; if (X < 0 || X >= W) continue;
        const idx = Y * W + X; if (zc >= dep[idx]) continue;
        if (a.alpha !== undefined && a.alpha < 1 && BAYER4[(Y & 3) * 4 + (X & 3)] > a.alpha) continue;
        let r = img[s] * lr, gg = img[s + 1] * lg, bb = img[s + 2] * lb;
        if (fl) { r += (255 - r) * fl; gg += (255 - gg) * fl; bb += (255 - bb) * fl; }
        const ff = (f + BAYER4[(Y & 3) * 4 + (X & 3)]) | 0; if (ff > 0) { const kk = 8 - Math.min(8, ff); r = (r * kk + fc[0] * (8 - kk)) / 8; gg = (gg * kk + fc[1] * (8 - kk)) / 8; bb = (bb * kk + fc[2] * (8 - kk)) / 8; }
        col[idx] = 0xff000000 | (clamp(bb, 0, 255) << 16) | (clamp(gg, 0, 255) << 8) | clamp(r, 0, 255); dep[idx] = zc;
      }
    }
    this.stats.actors++;
  }
  // ------------------------------------------------------------ particles, lines
  // a round splat of world size s at p: mode 'add' (glows, sparks), 'alpha' (dithered: smoke, spray), 'solid'
  splat(p, s, rgb, mode = 'add', alpha = 1) {
    const v = this.toView(p); if (v[2] < 3) return;
    const k = this.F / v[2], R = s * k, sx = this.cx + v[0] * k, sy = this.cy - v[1] * k, z = v[2];
    if (sx + R < 0 || sx - R > this.W || sy + R < 0 || sy - R > this.H) return;
    const W = this.W, col = this.col, dep = this.depth, r2 = Math.max(.3, R * R);
    const x0 = Math.max(0, Math.floor(sx - R)), x1 = Math.min(W - 1, Math.ceil(sx + R)), y0 = Math.max(0, Math.floor(sy - R)), y1 = Math.min(this.H - 1, Math.ceil(sy + R));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = x + .5 - sx, dy = y + .5 - sy, d2 = dx * dx + dy * dy; if (d2 > r2 && !(R < .8 && x === (sx | 0) && y === (sy | 0))) continue;
      const idx = y * W + x; if (z >= dep[idx]) continue;
      const th = BAYER4[(y & 3) * 4 + (x & 3)];
      if (mode === 'add') { const fall = R < 1.5 ? 1 : 1 - d2 / r2 * .6, c = col[idx], k2 = alpha * fall; col[idx] = 0xff000000 | (Math.min(255, ((c >> 16) & 255) + rgb[2] * k2) << 16) | (Math.min(255, ((c >> 8) & 255) + rgb[1] * k2) << 8) | Math.min(255, (c & 255) + rgb[0] * k2); }
      else if (mode === 'alpha') { if (th > alpha * (1 - d2 / r2 * .5)) continue; col[idx] = 0xff000000 | (rgb[2] << 16) | (rgb[1] << 8) | rgb[0]; }
      else { col[idx] = 0xff000000 | (rgb[2] << 16) | (rgb[1] << 8) | rgb[0]; dep[idx] = z; }
    }
  }
  line(a, b, rgb, mode = 'add', alpha = 1) {
    let A = this.toView(a), B = this.toView(b); const NEAR = 3;
    if (A[2] < NEAR && B[2] < NEAR) return;
    if (A[2] < NEAR) { const t = (NEAR - A[2]) / (B[2] - A[2]); A = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, NEAR]; }
    if (B[2] < NEAR) { const t = (NEAR - B[2]) / (A[2] - B[2]); B = [B[0] + (A[0] - B[0]) * t, B[1] + (A[1] - B[1]) * t, NEAR]; }
    const F = this.F, ax = this.cx + A[0] * F / A[2], ay = this.cy - A[1] * F / A[2], bx = this.cx + B[0] * F / B[2], by = this.cy - B[1] * F / B[2];
    const n = Math.min(2000, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay))) + 1), W = this.W, H = this.H, col = this.col, dep = this.depth;
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = Math.round(ax + (bx - ax) * t), y = Math.round(ay + (by - ay) * t); if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const z = 1 / lerp(1 / A[2], 1 / B[2], t), idx = y * W + x; if (z >= dep[idx]) continue;
      if (mode === 'add') { const c = col[idx]; col[idx] = 0xff000000 | (Math.min(255, ((c >> 16) & 255) + rgb[2] * alpha) << 16) | (Math.min(255, ((c >> 8) & 255) + rgb[1] * alpha) << 8) | Math.min(255, (c & 255) + rgb[0] * alpha); }
      else col[idx] = 0xff000000 | (rgb[2] << 16) | (rgb[1] << 8) | rgb[0];
    }
  }
  // screen-space darkening / tint over the whole frame (cover vignette, smoke)
  vignette(k, rgb = [0, 0, 0]) {
    const W = this.W, H = this.H, col = this.col;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2), d = dx * dx * .7 + dy * dy, q = clamp((d - .35) * k, 0, .85);
      if (q <= BAYER4[(y & 3) * 4 + (x & 3)] * .9) continue;
      const i = y * W + x, c = col[i], m = 1 - q * .6; col[i] = 0xff000000 | (((((c >> 16) & 255) * m + rgb[2] * q * .6) & 255) << 16) | (((((c >> 8) & 255) * m + rgb[1] * q * .6) & 255) << 8) | (((c & 255) * m + rgb[0] * q * .6) & 255);
    }
  }
  haze(k, rgb) {
    const col = this.col, n = col.length, W = this.W;
    for (let i = 0; i < n; i++) { const x = i % W, y = (i / W) | 0; if (BAYER4[(y & 3) * 4 + (x & 3)] > k) continue; col[i] = 0xff000000 | (rgb[2] << 16) | (rgb[1] << 8) | rgb[0]; }
  }
  present(g, x, y) {
    this.cg.putImageData(this.img, 0, 0);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.drawImage(this.cv, x, y); g.restore();
  }
}
TC.Rail3D = Rail3D;
