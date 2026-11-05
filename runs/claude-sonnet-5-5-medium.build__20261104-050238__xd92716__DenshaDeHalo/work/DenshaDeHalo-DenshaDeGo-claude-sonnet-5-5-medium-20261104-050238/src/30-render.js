/* The rail renderer: OutRun-style segments with square pixels, platforms, strips (buildings, walls, trains), things (signals,
 * signs, trees), catenary, sky, weather and night. It only reads state; it never changes it. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, px = E.px, R = DH.route, SEG = DH.SEG, N = R.n, LEN = R.length;
const mix = E.mix;

/* ---------- time of day ---------- */
// [hour, skyTop, skyBottom, light 0..1, ambient tint]
const TOD = [[0, '#050a1c', '#0c1838', .22], [4.5, '#0a1230', '#1d2a55', .25], [5.6, '#2a2a5c', '#e88a6a', .5], [7, '#4f86c9', '#bfe0f0', .9], [12, '#2f78d0', '#9fd2f2', 1], [16.5, '#3f7fcf', '#cfe4ee', .96],
  [18, '#6a5aa8', '#f4a860', .7], [19.2, '#2a2a66', '#c8647a', .45], [20.5, '#0c1235', '#3a3a70', .26], [24, '#050a1c', '#0c1838', .22]];
function todAt(clock) {
  const h = (clock / 3600) % 24; let a = TOD[0], b = TOD[1];
  for (let i = 0; i < TOD.length - 1; i++) if (h >= TOD[i][0] && h <= TOD[i + 1][0]) { a = TOD[i]; b = TOD[i + 1]; break; }
  const t = (h - a[0]) / (b[0] - a[0] || 1);
  return { top: mix(a[1], b[1], t), bot: mix(a[2], b[2], t), light: a[3] + (b[3] - a[3]) * t, h };
}
DH.todAt = todAt;
const WEATHER = {
  clear: { fog: 1700, dark: 0, name: 'Clear' }, rain: { fog: 900, dark: .18, name: 'Rain' }, fog: { fog: 260, dark: .12, name: 'Fog' }, storm: { fog: 600, dark: .3, name: 'Storm' }
};
DH.WEATHER = WEATHER;

let FR = null;   // per-frame cache
const cache = new Map();
function fogc(c, z) {
  const t = Math.min(1, Math.max(0, 1 - Math.exp(-Math.pow(z / FR.fogD, 1.7)))) * FR.fogMax, q = Math.round(t * 14);
  if (!q) return c; const k = c + q; let r = cache.get(k); if (r) return r;
  r = mix(c, FR.fogC, q / 14); if (cache.size > 6000) cache.clear(); cache.set(k, r); return r;
}
const sh = (c, a) => E.shade(c, a);
const hash = (a, b = 0) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177 | 0; return ((h ^ (h >> 16)) >>> 0) / 4294967296; };
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- sky ---------- */
function sky(g, W, H, cy, cam, tod, wx, t) {
  const bands = 18, hgt = cy + 2;
  for (let i = 0; i < bands; i++) { const y0 = Math.floor(i * hgt / bands), y1 = Math.floor((i + 1) * hgt / bands); px.rect(g, 0, y0, W, y1 - y0, mix(tod.top, tod.bot, Math.pow(i / (bands - 1), 1.4))); }
  const heading = cam.heading * 40, night = tod.light < .42;
  if (night) { for (let i = 0; i < 70; i++) { const x = ((hash(i, 1) * W * 2 - heading * .3) % W + W) % W, y = hash(i, 2) * cy * .8; if (wx.name !== 'Clear' && hash(i, 3) < .6) continue; px.rect(g, x, y, 1, 1, hash(i, 4) < .2 ? '#fff6c8' : '#aab4e8'); } }
  // sun or moon
  const h = tod.h;
  if (h > 5.4 && h < 19.3) { const u = (h - 5.4) / 13.9, x = W * (.12 + .76 * u) - heading * .15, y = cy - Math.sin(u * Math.PI) * cy * .8 - 6; if (wx.name === 'Clear' || wx.name === 'Fog') { px.blend(g, .35, 'add', () => px.disc(g, x, y, 15, '#ffe9a8')); px.disc(g, x, y, 7, '#fff6d0'); } }
  else { const u = ((h + 24 - 19) % 24) / 11, x = W * (.1 + .8 * Math.min(1, u)) - heading * .15, y = cy - Math.sin(Math.min(1, u) * Math.PI) * cy * .75 - 6; if (wx.name !== 'Storm') { px.disc(g, x, y, 6, '#f2f0e0'); px.disc(g, x + 2, y - 1, 5, mix(tod.top, tod.bot, .3)); } }
  // clouds
  const heavy = wx.name === 'Rain' || wx.name === 'Storm' || wx.name === 'Fog';
  const nc = heavy ? 14 : 6;
  for (let i = 0; i < nc; i++) {
    const w = 40 + hash(i, 7) * 60, x = (((hash(i, 8) * (W + 200) + t * (2 + hash(i, 9) * 3) - heading * .5) % (W + 200)) + W + 200) % (W + 200) - 100, y = 8 + hash(i, 10) * cy * (heavy ? .6 : .45);
    const col = heavy ? mix('#6b7280', tod.bot, .3 + (1 - tod.light) * .3) : mix('#ffffff', tod.bot, .25 + (1 - tod.light) * .5);
    px.blend(g, heavy ? .8 : .7, 'normal', () => { px.ell(g, x, y, w / 2, 5 + hash(i, 11) * 3, col); px.ell(g, x - w * .18, y - 4, w / 3, 5, col); px.ell(g, x + w * .2, y - 3, w / 3.2, 4, col); });
  }
  // far layers by zone
  const z = cam.zoneName || 'city', fogc2 = mix(tod.bot, '#5d6a86', .25), lum = tod.light;
  const far = mix('#6a82b0', tod.bot, .4 + (1 - lum) * .3), mid = mix('#566b92', tod.bot, .25 + (1 - lum) * .4);
  const off = -heading * 1.0;
  if (z === 'mountain' || z === 'hills' || z === 'sea') {
    for (let i = -1; i < 10; i++) { const bx = (((i * 80 + off * .35) % (W + 160)) + W + 160) % (W + 160) - 80, hh = 22 + hash(i + 40, 3) * 26; px.poly(g, [[bx - 70, cy], [bx, cy - hh], [bx + 70, cy]], far); }
    // Mt. Akari
    const mx = (((W * .7 + off * .25) % (W * 1.6)) + W * 1.6) % (W * 1.6) - W * .3; px.poly(g, [[mx - 130, cy], [mx - 10, cy - 66], [mx + 10, cy - 66], [mx + 130, cy]], mix('#7a8db8', tod.bot, .35 + (1 - lum) * .3)); px.poly(g, [[mx - 20, cy - 54], [mx - 10, cy - 66], [mx + 10, cy - 66], [mx + 20, cy - 54], [mx + 8, cy - 58], [mx, cy - 52], [mx - 8, cy - 58]], mix('#f2f4fa', tod.bot, .3 + (1 - lum) * .4));
  }
  if (z === 'city' || z === 'sea' || z === 'hills') {
    for (let i = 0; i < 26; i++) { const bx = (((i * 38 + off * .6) % (W + 120)) + W + 120) % (W + 120) - 60, bw = 20 + hash(i, 5) * 22, bh = (z === 'city' ? 26 : 10) + hash(i, 6) * (z === 'city' ? 42 : 14); px.rect(g, bx, cy - bh, bw, bh + 1, mid);
      if (night) for (let w = 0; w < bh - 4; w += 6) if (hash(i, w) < .45) px.rect(g, bx + 3 + hash(i, w + 1) * (bw - 8), cy - bh + 3 + w, 2, 2, '#ffe9a0'); }
  }
  if (z === 'sea') px.rect(g, 0, cy - 3, W, 4, mix('#4a7ea8', tod.bot, .4 + (1 - lum) * .4));
}

/* ---------- the world ---------- */
// cam: { s, h, dir, camX, lookX, pitch, heading, fov, horizon }
// scene: { run, weather, tod (clock secs), ghosts[], trainsDyn[] }
DH.drawWorld = function (g, W, H, cam, sc) {
  const run = sc.run, wx = WEATHER[sc.weather] || WEATHER.clear, tod = todAt(sc.clock);
  const fovT = Math.tan((cam.fov || 75) * Math.PI / 360), Fz = (W / 2) / fovT, cy = Math.round(H * (cam.horizon || .4) + (cam.pitch || 0)), cx = Math.round(W / 2 + (cam.lookX || 0));
  const dir = cam.dir || 1, sCam = cam.s, t = sc.time || 0;
  const DRAW = sc.draw || 230;
  const i0 = Math.floor(R.wrap(sCam) / SEG), frac = (R.wrap(sCam) - i0 * SEG) / SEG;
  const zoneName = R.zone[i0 % N] ? R.zone[i0 % N].sky : 'city';
  cam.heading = R.cumHeading[i0 % N] * dir * .03; cam.zoneName = zoneName;
  const lightDay = tod.light, lum = Math.max(.2, Math.min(1, lightDay - wx.dark));
  FR = { fogD: wx.fog, fogMax: wx.name === 'Fog' ? .95 : .85, fogC: mix(tod.bot, wx.name === 'Fog' || wx.name === 'Storm' || wx.name === 'Rain' ? '#9aa3ad' : '#c8d6e4', wx.name === 'Clear' ? .12 : .55), lights: [], glows: [], lum, tod, wx };
  if (wx.name === 'Fog' || wx.name === 'Rain' || wx.name === 'Storm') FR.fogC = mix(FR.fogC, '#000000', Math.max(0, .75 - lum) * .8);
  sky(g, W, H, cy, cam, tod, wx, t);
  const zone0 = R.zone[i0 % N]; px.rect(g, 0, cy, W, H - cy, fogc(zone0.g[0], 600));
  const camY = R.at.height(R.wrap(sCam)) + cam.h;
  // pass 1: projections near -> far
  const lat0 = new Float32Array(DRAW + 1), lat1 = new Float32Array(DRAW + 1), zN = new Float32Array(DRAW + 1), zF = new Float32Array(DRAW + 1), yN = new Float32Array(DRAW + 1), yF = new Float32Array(DRAW + 1);
  let x = 0, dx = -R.curve[dir > 0 ? i0 % N : (i0 + N) % N] * dir * frac * (dir > 0 ? 1 : -1);
  for (let n = 0; n < DRAW; n++) {
    const idx = dir > 0 ? (i0 + n) % N : (((i0 - n) % N) + N) % N, c = R.curve[idx] * (dir > 0 ? 1 : -1);
    lat0[n] = x; x += dx; dx += c; lat1[n] = x;
    zN[n] = Math.max(.7, (n - (dir > 0 ? frac : 1 - frac)) * SEG); zF[n] = Math.max(.8, (n + 1 - (dir > 0 ? frac : 1 - frac)) * SEG);
    yN[n] = R.at.height(R.wrap(sCam + dir * zN[n])); yF[n] = R.at.height(R.wrap(sCam + dir * zF[n]));
  }
  const camX = cam.camX || 0, ox = (lat, off, z) => cx + (lat + off * dir - camX) * Fz / z;   // dir -1 mirrors lateral
  const sy = (h, z) => cy - (h - camY) * Fz / z;
  // dynamic entities mapped to segments (trains)
  const dyn = new Map();
  const addDyn = (n, o) => { let a = dyn.get(n); if (!a) dyn.set(n, a = []); a.push(o); };
  for (const tr of sc.trains || []) {
    const cars = Math.max(1, Math.round(tr.len / 20));
    for (let k = 0; k < cars; k++) {
      const sFront = tr.rev ? tr.s + k * 20 : tr.s - k * 20, sBack = tr.rev ? sFront + 19 : sFront - 19;
      const sa = sBack, sb = sFront;
      const rel0 = (sa - sCam) * dir, rel1 = (sb - sCam) * dir; if (Math.max(rel0, rel1) < -2 || Math.min(rel0, rel1) > DRAW * SEG) continue;
      const lo = Math.min(rel0, rel1), hi = Math.max(rel0, rel1);
      for (let n = Math.max(0, Math.floor(lo / SEG)); n <= Math.min(DRAW - 1, Math.floor(hi / SEG)); n++) addDyn(n, { train: tr, car: k, s0: Math.min(sa, sb), s1: Math.max(sa, sb), first: k === 0, last: k === cars - 1 });
    }
  }
  for (const gh of sc.ghosts || []) { gh.len = gh.len || 120; gh.rev = false; }
  // pass 2: far -> near
  const sleeperMax = 150, objMin = .3;
  for (let n = DRAW - 1; n >= 0; n--) {
    const idx = dir > 0 ? (i0 + n) % N : (((i0 - n) % N) + N) % N, zn = zN[n], zf = zF[n];
    const syN = sy(yN[n], zn), syF = sy(yF[n], zf);
    const fl = R.flag[idx], zone = R.zone[idx] || zone0, bridge = fl & 2, tunnel = fl & 1, cross = fl & 4;
    const k = Fz / zn, kf = Fz / zf;
    const sNear = sCam + dir * zn;
    if (syF < syN + 0.5 || n === 0) {
      // ground band
      const gy0 = Math.floor(Math.min(syF, syN)), gy1 = Math.ceil(Math.max(syN, syF)) + 1;
      const alt = (Math.floor((idx) / 4) & 1);
      let gc = bridge ? (alt ? '#2b719a' : '#2f7aa4') : zone.g[alt]; if (zone.sky === 'city' && !bridge) gc = zone.g[alt];
      px.rect(g, 0, gy0, W, gy1 - gy0, fogc(gc, zn));
      if (bridge) { // water glints and the bridge deck
        for (let q = 0; q < 3; q++) { const gxx = hash(idx, q) * W, gyy = gy0 + hash(idx, q + 9) * (gy1 - gy0); if (hash(idx + Math.floor(t * 2), q) < .5) px.rect(g, gxx, gyy, Math.max(1, 6 * kf / 8), 1, fogc('#a8d8f0', zn)); }
      }
      if (cross) { // asphalt road across
        const ya = Math.floor(Math.min(syF, syN)), yb = Math.ceil(Math.max(syF, syN)); px.rect(g, 0, ya, W, Math.max(1, yb - ya + 1), fogc('#4a4c52', zn)); px.rect(g, 0, ya, W, 1, fogc('#d8d8d8', zn));
      }
    }
    // tunnel shell
    if (tunnel) {
      const a = ox(lat0[n], -3.2, zn), b = ox(lat0[n], 7.6, zn), a2 = ox(lat1[n], -3.2, zf), b2 = ox(lat1[n], 7.6, zf);
      const tn = sy(yN[n] + 6.4, zn), tf = sy(yF[n] + 6.4, zf);
      px.poly(g, [[a, syN], [a2, syF], [a2, tf], [a, tn]], fogc('#4c4a50', zn)); px.poly(g, [[b, syN], [b2, syF], [b2, tf], [b, tn]], fogc('#47454b', zn));
      px.poly(g, [[a, tn], [a2, tf], [b2, tf], [b, tn]], fogc('#38363c', zn)); if (n % 5 === 0 && zn < 200) FR.glows.push([ox(lat0[n], 0, zn), tn + 1, Math.max(2, 1.3 * k), '#ffd88a', .45]);
      if (hash(idx, 5) < .0) continue;
    }
    // track beds: ours at 0, the other at 3.8
    for (const tx of [0, 3.8]) {
      const ba = ox(lat0[n], tx - 1.7, zn), bb = ox(lat0[n], tx + 1.7, zn), fa = ox(lat1[n], tx - 1.7, zf), fb = ox(lat1[n], tx + 1.7, zf);
      px.poly(g, [[ba, syN], [fa, syF], [fb, syF], [bb, syN]], fogc(tx ? '#6b665d' : '#7c766b', zn));
      if (zn < sleeperMax) for (let q = 0; q < 2; q++) { const u0 = .08 + q * .5, u1 = u0 + .06; const ya = lerp(syN, syF, u0), yb = lerp(syN, syF, u1); const za = lerp(zn, zf, u0); const cxa = lerp(ox(lat0[n], tx, zn), ox(lat1[n], tx, zf), u0); const wa = 1.25 * Fz / za; px.rect(g, cxa - wa, Math.min(ya, yb), wa * 2, Math.max(1, Math.abs(yb - ya)), fogc('#4a4036', zn)); }
      for (const rx of [-.533, .533]) {
        const ra = ox(lat0[n], tx + rx - .05, zn), rb = ox(lat0[n], tx + rx + .05, zn), rc = ox(lat1[n], tx + rx - .05, zf), rd = ox(lat1[n], tx + rx + .05, zf);
        const wet = sc.weather === 'rain' || sc.weather === 'storm';
        px.poly(g, [[ra, syN], [rc, syF], [rd, syF], [rb, syN]], fogc(wet ? '#c8d6e6' : '#aab2bc', zn));
        if (zn < 60) px.line(g, (ra + rb) / 2, syN, (rc + rd) / 2, syF, fogc('#eef2f6', zn));
      }
    }
    // catenary wires
    if (!tunnel && n >= 2) {
      const w0 = [ox(lat0[n], 0, zn), sy(yN[n] + 5.2, zn)], w1 = [ox(lat1[n], 0, zf), sy(yF[n] + 5.2, zf)];
      px.line(g, w0[0], w0[1], w1[0], w1[1], fogc('#1d1f26', zn)); if (zn < 500) px.line(g, w0[0], w0[1] - .8 * k, w1[0], w1[1] - .8 * kf, fogc('#2a2c34', zn));
    }
    // strips
    const strips = R.stripsBy[idx];
    const drawn = [];
    if (strips) for (const st of strips) drawn.push(st);
    const dn = dyn.get(n); const stripsAll = drawn.map(st => ({ st, dist: Math.abs((st.x0 + st.x1) / 2 * dir - camX) })).concat(dn ? dn.map(d => ({ d, dist: Math.abs((d.train.x || 0) * dir - camX) })) : []);
    stripsAll.sort((a, b) => b.dist - a.dist);
    for (const it of stripsAll) {
      if (it.st) drawStrip(g, it.st, n, idx);
      else drawTrainCar(g, it.d, n);
    }
    // things
    const things = R.thingsBy[idx];
    if (things && k > objMin) {
      const sorted = things.length > 1 ? things.slice().sort((a, b) => Math.abs(b.x * dir - camX) - Math.abs(a.x * dir - camX)) : things;
      for (const th of sorted) {
        const u = clamp01((R.wrap(th.s) - idx * SEG) / SEG), uu = dir > 0 ? u : 1 - u, zz = lerp(zn, zf, uu);
        if (zz < 1) continue;
        const tx = ox(lerp(lat0[n], lat1[n], uu), th.x, zz), ty = sy(lerp(yN[n], yF[n], uu), zz), kk = Fz / zz;
        if (tx < -80 || tx > W + 80 || ty < -140) continue;
        drawThing(g, th, tx, ty, kk, sc, zz, run);
      }
    }
    // dynamic markers (slow zone)
    function clamp01(v) { return Math.max(0, Math.min(1, v)); }
    if (sc.extras) for (const ex of sc.extras) {
      const p = ex.s, rel = (p - (sCam + dir * (n * SEG - (dir > 0 ? frac : 1 - frac) * SEG)));
      const e0 = (p - sCam) * dir; if (e0 >= n * SEG - frac * SEG && e0 < (n + 1) * SEG - frac * SEG) {
        const uu = clamp01((e0 - (n - frac) * SEG) / SEG), zz = lerp(zn, zf, uu); if (zz < 1) continue;
        ex.draw(g, ox(lerp(lat0[n], lat1[n], uu), ex.x, zz), sy(lerp(yN[n], yF[n], uu), zz), Fz / zz, zz);
      }
    }
    // lights from the pass
    if (k > 1.5 && hash(idx, 99) < 0) {}
    function drawStrip(g, st, n, idx) {
      const xl = st.x0, xr = st.x1, cxm = camX * dir;
      const xs = dir > 0 ? [xl, xr] : [-xr, -xl];   // mirrored for rear views
      const a = xs[0], b = xs[1];
      const faceX = cxm < a ? a : cxm > b ? b : null;
      const y0n = yN[n] + st.y0, y0f = yF[n] + st.y0, y1n = yN[n] + st.y1, y1f = yF[n] + st.y1;
      const dim = lum, kk = Fz / zn;
      // clip the strip to its own s range inside this segment
      let un = 0, uf = 1;
      const segS0 = idx * SEG;
      if (dir > 0) { un = Math.max(0, (R.wrap(st.s0) - segS0) / SEG); if (R.wrap(st.s0) > segS0 + SEG) un = 0; uf = Math.min(1, (R.wrap(st.s1) - segS0) / SEG); if (uf <= 0 || (R.wrap(st.s1) < segS0 && R.wrap(st.s0) < segS0)) uf = 1; if (R.wrap(st.s0) < segS0 && st.s1 - st.s0 < LEN) un = 0; }
      const zA = zn, zB = zf;
      const pn = (xv, hv) => [ox(lat0[n], xv, zA), sy(hv, zA)], pf = (xv, hv) => [ox(lat1[n], xv, zB), sy(hv, zB)];
      const sideC = fogc(st.side, zn), topC = fogc(st.top || sh(st.side, -.2), zn);
      if (st.kind === 'canopy') {
        if (camY < y0n) { const qa = pn(xl, y0n), qb = pn(xr, y0n), qc = pf(xr, y0f), qd = pf(xl, y0f); px.poly(g, [qa, qb, qc, qd], fogc(st.under, zn)); }
        if (faceX !== null) { const p1 = pn(faceX, y0n), p2 = pn(faceX, y1n), p3 = pf(faceX, y1f), p4 = pf(faceX, y0f); px.poly(g, [p1, p2, p3, p4], sideC); }
        return;
      }
      if (faceX !== null) {
        const p1 = pn(faceX, y0n), p2 = pn(faceX, y1n), p3 = pf(faceX, y1f), p4 = pf(faceX, y0f);
        px.poly(g, [p1, p2, p3, p4], sideC);
        if ((st.kind === 'building' || st.kind === 'house') && kk > 1.4 && zn < 260) {
          const hgt = st.y1 - st.y0, floors = st.kind === 'house' ? 1 : Math.max(1, Math.floor(hgt / 3.4));
          for (let f = 0; f < floors; f++) for (let w = 0; w < 2; w++) {
            const uw = .15 + w * .5, fh0 = (f * (hgt / floors) + hgt / floors * .3) , fh1 = fh0 + hgt / floors * .38;
            const zw = lerp(zA, zB, uw), zw2 = lerp(zA, zB, uw + .22);
            const sxw = lerp(ox(lat0[n], faceX, zA), ox(lat1[n], faceX, zB), uw), sxw2 = lerp(ox(lat0[n], faceX, zA), ox(lat1[n], faceX, zB), uw + .22);
            const hb = lerp(y0n, y0f, uw) , hb2 = lerp(y0n, y0f, uw + .22);
            const litW = FR.lum < .5 && hash(st.seed || 0, f * 7 + w + idx) < .45;
            const cW = litW ? '#ffe39a' : st.win;
            px.poly(g, [[sxw, sy(hb + fh0, zw)], [sxw, sy(hb + fh1, zw)], [sxw2, sy(hb2 + fh1, zw2)], [sxw2, sy(hb2 + fh0, zw2)]], fogc(cW, zn));
            if (litW && kk > 2) FR.lights.push([sxw, sy(hb + fh1, zw), Math.max(1, sxw2 - sxw), Math.max(1, sy(hb + fh0, zw) - sy(hb + fh1, zw)), '#ffe9a0']);
          }
        }
        if (st.kind === 'container' && kk > 1) { const mid = [(p1[0] + p4[0]) / 2, (p1[1] + p2[1]) / 2]; px.line(g, p1[0], (p1[1] + p2[1]) / 2, p4[0], (p4[1] + p3[1]) / 2, sh(sideC, -.25)); }
        if (st.kind === 'platform') {
          // yellow tactile + white edge on the top face handled below
        }
      }
      if (camY > y1n) {
        const qa = pn(a, y1n), qb = pn(b, y1n), qc = pf(b, y1f), qd = pf(a, y1f);
        px.poly(g, [qa, qb, qc, qd], st.kind === 'house' ? fogc(st.top, zn) : topC);
        if (st.kind === 'platform') {
          const edgeX = st.x1 < 0 || (dir < 0 && st.x1 >= 0 && false) ? st.x1 : st.x0;
          const ex = (dir > 0 ? (st.x1 < 0 ? st.x1 : st.x0) : (st.x1 < 0 ? -st.x1 : -st.x0)), ex2 = ex + (dir > 0 ? (st.x1 < 0 ? -.8 : .8) : (st.x1 < 0 ? .8 : -.8));
          px.poly(g, [pn(ex, y1n), pn(ex2, y1n), pf(ex2, y1f), pf(ex, y1f)], fogc(st.tact, zn));
          px.poly(g, [pn(ex2, y1n), pn(ex2 + (ex2 - ex) * .12, y1n), pf(ex2 + (ex2 - ex) * .12, y1f), pf(ex2, y1f)], fogc(st.edge, zn));
        }
      }
      // end face toward the camera at the near end of the strip
      if (dir > 0 && un > 0 && cxm !== null && R.wrap(st.s0) >= segS0 && R.wrap(st.s0) < segS0 + SEG && faceX !== null) {
        const zz = lerp(zA, zB, un), lx = lerp(lat0[n], lat1[n], un), hb = lerp(yN[n], yF[n], un);
        const ex = faceX === a ? b : a;
        px.poly(g, [[ox(lx, a, zz), sy(hb + st.y0, zz)], [ox(lx, a, zz), sy(hb + st.y1, zz)], [ox(lx, b, zz), sy(hb + st.y1, zz)], [ox(lx, b, zz), sy(hb + st.y0, zz)]], fogc(sh(st.side, -.12), zz));
      }
    }
    function drawTrainCar(g, d, n) {
      const tr = d.train, xc = tr.x || 0, xs = dir > 0 ? [xc - 1.4, xc + 1.4] : [-xc - 1.4, -xc + 1.4];
      const a = xs[0], b = xs[1], cxm = camX * dir, T = tr.T || DH.TRAINS.H5;
      const faceX = cxm < a ? a : cxm > b ? b : null;
      const segS0 = idx * SEG, wr0 = R.wrap(d.s0), wr1 = R.wrap(d.s1);
      const rel0 = (d.s0 - sCam) * dir - (n - (dir > 0 ? frac : 1 - frac)) * SEG, rel1 = (d.s1 - sCam) * dir - (n - (dir > 0 ? frac : 1 - frac)) * SEG;
      let ua = Math.max(0, Math.min(1, Math.min(rel0, rel1) / SEG)), ub = Math.max(0, Math.min(1, Math.max(rel0, rel1) / SEG));
      if (ub <= ua) return;
      const za = lerp(zN[n], zF[n], ua), zb = lerp(zN[n], zF[n], ub);
      const Lx = u => lerp(lat0[n], lat1[n], u), Hy = u => lerp(yN[n], yF[n], u);
      const P = (xv, h, u, z) => [ox(Lx(u), xv, z), sy(Hy(u) + h, z)];
      const bodyC = fogc(tr.body || T.body, za), glass = fogc('#1c2a38', za), stripe = fogc(tr.stripe || T.stripe, za), under = fogc('#2a2d33', za);
      if (faceX !== null) {
        const hb = .55, ht = 3.65;
        const quad = (h0, h1, c) => px.poly(g, [P(faceX, h0, ua, za), P(faceX, h1, ua, za), P(faceX, h1, ub, zb), P(faceX, h0, ub, zb)], c);
        quad(.35, ht, bodyC); quad(.35, .75, under); quad(1.0, 1.35, stripe); quad(1.75, 2.75, glass);
        // doors: two lighter panels per car
        const k2 = Fz / za;
        if (k2 > 3) { for (const du of [.2, .75]) { const uA = lerp(ua, ub, du - .05), uB = lerp(ua, ub, du + .05), z1 = lerp(za, zb, du - .05), z2 = lerp(za, zb, du + .05); px.poly(g, [P(faceX, .6, uA, z1), P(faceX, 3.3, uA, z1), P(faceX, 3.3, uB, z2), P(faceX, .6, uB, z2)], fogc(sh(tr.body || T.body, -.2), za)); } }
        if (tr.lit && k2 > 2) FR.lights.push([P(faceX, 2.75, ua, za)[0], P(faceX, 2.75, ua, za)[1], Math.max(1, (P(faceX, 2.75, ub, zb)[0] - P(faceX, 2.75, ua, za)[0])), Math.max(1, P(faceX, 1.75, ua, za)[1] - P(faceX, 2.75, ua, za)[1]), '#ffe9a0']);
      }
      if (camY > 3.65) px.poly(g, [P(a, 3.65, ua, za), P(b, 3.65, ua, za), P(b, 3.65, ub, zb), P(a, 3.65, ub, zb)], fogc('#c8ced4', za));
      // the end faces
      const rearEnd = tr.rev ? tr.s + tr.len : tr.s - tr.len, frontNear = Math.abs(tr.s - sCam) < Math.abs(rearEnd - sCam);
      const faceAt = (sEnd, front) => {
        const rel = (sEnd - sCam) * dir - (n - (dir > 0 ? frac : 1 - frac)) * SEG; if (rel < 0 || rel > SEG) return;
        const u = rel / SEG, z = lerp(zN[n], zF[n], u);
        const c = front ? fogc(sh(tr.body || T.body, -.1), z) : fogc(sh(tr.body || T.body, -.25), z);
        px.poly(g, [P(a, .35, u, z), P(a, 3.65, u, z), P(b, 3.65, u, z), P(b, .35, u, z)], c);
        px.poly(g, [P(a + .3, 1.7, u, z), P(a + .3, 3.1, u, z), P(b - .3, 3.1, u, z), P(b - .3, 1.7, u, z)], glass);
        px.poly(g, [P(a, 1.0, u, z), P(a, 1.45, u, z), P(b, 1.45, u, z), P(b, 1.0, u, z)], stripe);
        if (front) { for (const xx of [a + .5, b - .5]) FR.glows.push([P(xx, .9, u, z)[0], P(xx, .9, u, z)[1], Math.max(1.5, 0.3 * Fz / z), '#fff3c0', tr.beam ? .9 : .6]); }
        else { for (const xx of [a + .35, b - .6]) px.rect(g, P(xx, .9, u, z)[0], P(xx, .9, u, z)[1], Math.max(1, .25 * Fz / z), Math.max(1, .2 * Fz / z), '#d83020'); }
      };
      if (d.first && frontNear) faceAt(tr.s, true);
      if (d.last && !frontNear) faceAt(rearEnd, false);
    }
  }
  // ----- night and weather over the world, then the lights -----
  const wl = FR.lum;
  if (wl < .98) {
    const a = Math.min(.82, (1 - wl) * 1.05);
    px.blend(g, a, 'multiply', () => px.rect(g, 0, 0, W, cy + (H - cy), mix('#4c5b9a', '#8a93c8', wl)));
  }
  for (const l of FR.lights) px.rect(g, l[0], l[1], l[2], l[3], l[4]);
  if (FR.lum < .7) {
    // headlight cast on the rails
    if (cam.headlight) px.blend(g, .32 * (1 - FR.lum), 'add', () => { px.poly(g, [[cx - 4, cy + 2], [cx + 4, cy + 2], [cx + W * .26, H], [cx - W * .26, H]], '#fff0b0'); });
  }
  for (const gl of FR.glows) { if (gl[4] < .5 && FR.lum > .85) continue; px.blend(g, gl[4] || .6, 'add', () => px.disc(g, gl[0], gl[1], gl[2], gl[3])); if (gl[2] > 3) px.disc(g, gl[0], gl[1], Math.max(1, gl[2] / 3), '#ffffff'); }
  const project = (sPos, off, hgt) => {
    const rel = (sPos - sCam) * dir; if (rel < 1 || rel > DRAW * SEG - SEG) return null;
    const nn = Math.min(DRAW - 1, Math.max(0, Math.floor(rel / SEG + (dir > 0 ? frac : 1 - frac)))), u = Math.max(0, Math.min(1, (rel - (nn - (dir > 0 ? frac : 1 - frac)) * SEG) / SEG)), z = lerp(zN[nn], zF[nn], u);
    return [ox(lerp(lat0[nn], lat1[nn], u), off, z), sy(lerp(yN[nn], yF[nn], u) + hgt, z), Fz / z];
  };
  return { cx, cy, Fz, camY, tod, lum, project };
};

/* ---------- things (point objects) ---------- */
const stat = (g, th, k) => {};
function drawThing(g, th, sx, sy, k, sc, z, run) {
  const f = (c) => fogc(c, z), night = FR.lum < .55;
  const R2 = Math.round;
  switch (th.k) {
    case 'tree': {
      const h = th.h * k, w = h * .55; if (h < 2) { px.rect(g, sx - 1, sy - h, 2, h, f(th.c)); break; }
      px.rect(g, sx - Math.max(1, k * .2), sy - h * .45, Math.max(1, k * .4), h * .45, f('#5b4030'));
      px.ell(g, sx, sy - h * .68, w / 2, h * .34, f(sh(th.c, -.15))); px.ell(g, sx - w * .1, sy - h * .74, w * .38, h * .27, f(th.c)); px.ell(g, sx + w * .12, sy - h * .86, w * .22, h * .15, f(sh(th.c, .2)));
      break;
    }
    case 'pine': {
      const h = th.h * k, w = h * .36; px.rect(g, sx - 1, sy - h * .2, Math.max(1, k * .3), h * .2, f('#4b3626'));
      for (let q = 0; q < 3; q++) px.poly(g, [[sx - w * (1 - q * .24), sy - h * (.18 + q * .25)], [sx, sy - h * (.52 + q * .25)], [sx + w * (1 - q * .24), sy - h * (.18 + q * .25)]], f(q % 2 ? th.c : sh(th.c, -.12)));
      break;
    }
    case 'pole': px.rect(g, sx - Math.max(1, k * .12), sy - th.h * k, Math.max(1, k * .24), th.h * k, f('#6d7078')); break;
    case 'crane': { const h = 26 * k; px.rect(g, sx - k * .4, sy - h, k * .8, h, f('#d9a021')); px.rect(g, sx - k * 8, sy - h, k * 16, k * .7, f('#d9a021')); px.line(g, sx, sy - h, sx + k * 8, sy - h * .7, f('#444')); break; }
    case 'lamp': px.rect(g, sx - Math.max(1, k * .08), sy - 4.2 * k, Math.max(1, k * .16), 4.2 * k, f('#5a5f68')); px.rect(g, sx - k * .4, sy - 4.35 * k, k * .8, Math.max(1, k * .2), f('#fff4c0')); if (night) FR.glows.push([sx, sy - 4.3 * k, Math.max(2, k * 1.1), '#ffe9a0', .5]); break;
    case 'pillar': px.rect(g, sx - Math.max(1, k * .15), sy - 3.8 * k - 1.1 * k, Math.max(1, k * .3), 4.9 * k, f('#aeb4bc')); break;
    case 'mast': {
      const h = 6.2 * k, w = Math.max(1, k * .18); px.rect(g, sx - w / 2, sy - h, w, h, f('#6a6e76'));
      px.line(g, sx, sy - 5.5 * k, sx - 1.9 * k, sy - 5.3 * k, f('#6a6e76')); if (k > 3) px.line(g, sx - 1.9 * k, sy - 5.3 * k, sx - 1.9 * k, sy - 5.1 * k, f('#2a2c34'));
      break;
    }
    case 'signal': {
      const ref = th.ref, ent = run && run.sig && run.sig.find(e => e.sg === ref), asp = ent ? ent.aspect : 'G';
      const h = 5 * k, w = Math.max(2, k * .9);
      px.rect(g, sx - Math.max(1, k * .09), sy - h, Math.max(1, k * .18), h, f('#4a4f58')); px.rect(g, sx - w / 2, sy - h - k * 1.4, w, k * 1.4, f('#22252b'));
      const lamps = [['G', '#25d36a', '#0c3b1e'], ['Y', '#f2c230', '#41350a'], ['R', '#f23a2a', '#4a0f0a']];
      lamps.forEach((l, q) => { const on = (asp === l[0]), ly = sy - h - k * 1.4 + k * (.25 + q * .45), r = Math.max(1, k * .17); px.disc(g, sx, ly, r, on ? l[1] : l[2]); if (on) FR.glows.push([sx, ly, Math.max(2, k * .8), l[1], .55]); });
      break;
    }
    case 'limit': {
      const h = 2.6 * k; px.rect(g, sx - Math.max(1, k * .07), sy - h, Math.max(1, k * .14), h, f('#7a7f88'));
      const r = Math.max(2, k * .75); px.disc(g, sx, sy - h - r * .5, r, f('#f4f4f0')); px.disc(g, sx, sy - h - r * .5, Math.max(1, r - Math.max(1, k * .13)), f('#d02a2a')); px.disc(g, sx, sy - h - r * .5, Math.max(1, r - Math.max(2, k * .26)), f('#f8f8f4'));
      if (k > 5) E.font.text(g, String(th.limit), R2(sx), R2(sy - h - r * .5 - 3), '#222', { align: 'center', outline: false, font: 'tiny' });
      break;
    }
    case 'distboard': { const h = 2.2 * k, w = Math.max(2, k * .9); px.rect(g, sx - Math.max(1, k * .06), sy - h, Math.max(1, k * .12), h, f('#7a7f88')); px.rect(g, sx - w / 2, sy - h - k * 1.2, w, k * 1.2, f('#f2f2ee')); for (let q = 0; q < th.n; q++) px.line(g, sx - w / 2 + (q + .5) * w / 3, sy - h - k * 1.1, sx - w / 2 + (q + 1) * w / 3 - 1, sy - h - k * .1, f('#222'), Math.max(1, k * .12)); break; }
    case 'marker': { const h = 1.9 * k, w = Math.max(2, k * .7); px.rect(g, sx - Math.max(1, k * .05), sy - h, Math.max(1, k * .1), h, f('#555')); px.rect(g, sx - w / 2, sy - h - k * .9, w, k * .9, f('#f0c428')); if (k > 4) { px.rect(g, sx - w / 2, sy - h - k * .9, w, Math.max(1, k * .12), f('#222')); E.font.text(g, '6', R2(sx), R2(sy - h - k * .75), '#222', { align: 'center', outline: false, font: 'tiny' }); } break; }
    case 'horn': { const h = 2.4 * k, w = Math.max(2, k * 1.1); px.rect(g, sx - Math.max(1, k * .06), sy - h, Math.max(1, k * .12), h, f('#555')); px.rect(g, sx - w / 2, sy - h - k * 1.1, w, k * 1.1, f('#2a62c8')); if (k > 3) { px.rect(g, sx - w * .3, sy - h - k * .7, w * .25, k * .3, '#fff'); px.poly(g, [[sx - w * .05, sy - h - k * .7], [sx + w * .3, sy - h - k * .95], [sx + w * .3, sy - h - k * .15], [sx - w * .05, sy - h - k * .4]], '#fff'); } break; }
    case 'nameboard': {
      const h = 2.0 * k, w = Math.max(4, k * 3.2); px.rect(g, sx - w * .45, sy - h, Math.max(1, k * .1), h, f('#aeb4bc')); px.rect(g, sx + w * .35, sy - h, Math.max(1, k * .1), h, f('#aeb4bc'));
      px.rect(g, sx - w / 2, sy - h - k * 1.0, w, k * 1.0, f('#17a3b8')); px.rect(g, sx - w / 2, sy - h - k * 1.0, w, Math.max(1, k * .1), '#fff');
      if (k > 4.5) E.font.text(g, th.text, R2(sx), R2(sy - h - k * .78), '#fff', { align: 'center', outline: false, font: k > 9 ? undefined : 'tiny' });
      break;
    }
    case 'person': {
      const h = th.h * k + Math.sin(sc.time * 2 + th.ph) * 0, ph = sy - 1.1 * k;
      if (k < 1.1) { px.rect(g, sx, ph - h, 1, h, f(th.c)); break; }
      px.rect(g, sx - k * .14, ph - h * .52 - 0, Math.max(1, k * .28), h * .5, f('#2d3340')); px.rect(g, sx - k * .22, ph - h * .9, Math.max(2, k * .44), h * .4, f(th.c)); px.disc(g, sx, ph - h * .96, Math.max(1, k * .17), f('#e8bd98'));
      break;
    }
    case 'gate': {
      const c = th.ref, closed = sc.closeGates && sc.closeGates(c), arm = closed ? 1 : 0.1; const h = 1.3 * k;
      px.rect(g, sx - k * .15, sy - h, Math.max(1, k * .3), h, f('#333'));
      const L = k * 3.2; px.line(g, sx, sy - h, sx + (th.x < 0 ? 1 : -1) * L * (closed ? 1 : .15), sy - h - (closed ? 0 : L * .9), f(closed ? '#e8e8e8' : '#e8e8e8'), Math.max(1, k * .14));
      if (closed) { const on = Math.floor(sc.time * 3) % 2; px.disc(g, sx, sy - h - k * .4, Math.max(1, k * .2), on ? '#ff3020' : '#501008'); if (on) FR.glows.push([sx, sy - h - k * .4, Math.max(2, k * .8), '#ff3020', .6]); }
      break;
    }
    case 'car': {
      if (sc.closeGates && !sc.closeGates(th.ref)) break; const w = k * 1.9, h = k * 1.4; px.rect(g, sx - w / 2, sy - h, w, h * .65, f(th.c)); px.rect(g, sx - w * .35, sy - h * 1.3, w * .7, h * .5, f(sh(th.c, -.2))); px.rect(g, sx - w * .28, sy - h * 1.22, w * .56, h * .32, f('#9cc4dc')); break;
    }
    case 'cone': px.poly(g, [[sx - k * .22, sy], [sx, sy - k * .75], [sx + k * .22, sy]], f('#f26a1b')); px.rect(g, sx - k * .1, sy - k * .45, k * .2, Math.max(1, k * .12), '#fff'); break;
    case 'worker': { const h = 1.7 * k; px.rect(g, sx - k * .2, sy - h * .6, k * .4, h * .6, f('#f26a1b')); px.disc(g, sx, sy - h * .75, Math.max(1, k * .2), f('#e8bd98')); px.rect(g, sx - k * .22, sy - h * .95, k * .44, k * .2, f('#f2d21b')); break; }
    case 'sign': { const h = 2.4 * k, w = Math.max(3, k * 2); px.rect(g, sx - Math.max(1, k * .06), sy - h, Math.max(1, k * .12), h, f('#555')); px.rect(g, sx - w / 2, sy - h - k * 1.6, w, k * 1.6, f(th.bg || '#f2d21b')); if (k > 5) E.font.text(g, th.text, R2(sx), R2(sy - h - k * 1.3), '#222', { align: 'center', outline: false, font: 'tiny' }); break; }
  }
}
DH.drawThing = drawThing;

/* ---------- screen-space weather ---------- */
DH.drawWeatherOverlay = function (g, W, H, wxName, t, speed, lightning) {
  if (wxName === 'rain' || wxName === 'storm') {
    const n = wxName === 'storm' ? 90 : 55, slant = wxName === 'storm' ? 6 : 2;
    for (let i = 0; i < n; i++) { const x = (hash(i, 1) * (W + 40) + t * 30 * (wxName === 'storm' ? 2 : 1)) % (W + 40) - 20, y = ((hash(i, 2) * H + t * (260 + hash(i, 3) * 120)) % H); px.line(g, x, y, x - slant, y + 8, '#c8d8ea'); }
  }
  if (wxName === 'fog') px.blend(g, .12, 'normal', () => px.rect(g, 0, 0, W, H, '#cdd4da'));
  if (lightning > 0) px.blend(g, Math.min(.8, lightning), 'add', () => px.rect(g, 0, 0, W, H, '#c8d8ff'));
};
})();
