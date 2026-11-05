/* 50-cab: the cab overlay in screen pixels, scaled to any width: the windshield frame (pillars, header, a sun visor
 * that drops in glare, wipers and droplets in rain), and the dashboard (the bottom 30%): the master controller with a
 * white-gloved hand, the notch readout and strip, the speedometer, the timetable card and pocket watch, the BC gauge,
 * the lamps (pilot, doors, ATS, SLIP, WSP), the passengers' mood, and the ATS / horn / EB buttons. Every widget has a
 * hit box: the mouse hovers (focus) and clicks them. Halo 8000: a grey panel and one T-handle; Halo 3000: green, two. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, px = E.px, game = DH.game, F = E.font;
const T = (g, s, x, y, c, o = {}) => F.text(g, String(s), Math.round(x), Math.round(y), c, Object.assign({ outline: false }, o));
const C = {
  modern: { panel: '#3e424a', panelLt: '#565a64', panelDk: '#2a2d33', frame: '#24262c', trim: '#f2c230', face: '#0e1014', glass: '#1a2a3a' },
  classic: { panel: '#3e5a4a', panelLt: '#567a64', panelDk: '#2a3e33', frame: '#22302a', trim: '#e8a040', face: '#f0ead8', glass: '#1a2a2a' }
};
class Cab {
  constructor() { this.handle = 0; this.hand = { mode: 'rest', t: 0, tx: 0, ty: 0 }; this.drops = []; this.wiper = 0; this.wipeDir = 1; this.visor = 0; this.needle = 0; this.bc = 0; this.mr = 8; this.hits = []; this.hover = null; this.press = {}; this.r = E.rng(5); this.lightsT = 0; }
  /** per step: tweens and the weather on the glass */
  update(dt, run, o = {}) {
    const tr = run.train, ty = tr.ty, n = tr.notch;
    this.handle += (n - this.handle) * Math.min(1, dt / .08);
    this.needle += (tr.v - this.needle) * Math.min(1, dt * 6);
    this.bc += ((tr.st.B * 70) - this.bc) * Math.min(1, dt * 3); this.mr = 7.8 + Math.sin(run.t * .3) * .1;
    for (const k in this.press) { this.press[k] -= dt; if (this.press[k] <= 0) delete this.press[k]; }
    const h = this.hand; h.t += dt; if (h.mode === 'point' && h.t > 1.0) { h.mode = 'rest'; h.t = 0; } if (h.mode === 'press' && h.t > .25) { h.mode = 'rest'; h.t = 0; }
    this.visor += ((o.glare > .2 ? 1 : 0) - this.visor) * Math.min(1, dt * 2);
    if (run.weather === 'rain') {
      const spd = Math.max(0, tr.v) / 100; if (this.r() < dt * (8 + spd * 20) && this.drops.length < 70) this.drops.push({ x: this.r(), y: this.r() * .9, r: 1 + Math.floor(this.r() * 2), run: 0 });
      for (const d of this.drops) d.y += dt * (.004 + spd * .02) * (d.r);
      this.wiper += dt * 1.6 * this.wipeDir; if (this.wiper > 1) { this.wiper = 1; this.wipeDir = -1; } if (this.wiper < 0) { this.wiper = 0; this.wipeDir = 1; }
      const wa = this.wiper; this.drops = this.drops.filter(d => d.y < 1 && Math.abs(d.x - (.18 + wa * .64)) > .05);
    } else this.drops.length = 0;
  }
  point(sx, sy) { this.hand = { mode: 'point', t: 0, tx: sx, ty: sy }; }
  pressBtn(id) { this.press[id] = .2; this.hand = { mode: 'press', t: 0, tx: 0, ty: 0, btn: id }; }
  /** the dash's top row in screen pixels */
  top(r) { return Math.round(r.H * .7); }
  draw(r, run, o = {}) {
    r.overlay(g => this.paint(g, r.W, r.H, run, o));
  }
  paint(g, W, H, run, o) {
    const tr = run.train, ty = tr.ty, P = C[ty.cab === 'classic' ? 'classic' : 'modern'], top = Math.round(H * .7), night = o.night || 0;
    this.hits = [];
    // ---- the glass: droplets, wipers, a faint reflection at night ----
    if (this.drops.length) for (const d of this.drops) { const x = d.x * W, y = d.y * top; px.blend(g, .5, 'normal', () => px.rect(g, x, y, d.r, d.r + 1, '#c8d8e8')); px.dot(g, x, y, '#f0f8ff'); }
    if (run.weather === 'rain') for (const [cx0, k] of [[.3, 0], [.7, 1]]) {
      const pxv = cx0 * W, pyv = top - 2, a = Math.PI * (1.0 - this.wiper * .8) + (k ? .1 : 0), L = top * .5;
      px.line(g, pxv, pyv, pxv + Math.cos(a) * L, pyv - Math.sin(a) * L, '#16161a', 2); px.line(g, pxv, pyv, pxv + Math.cos(a) * L * .35, pyv - Math.sin(a) * L * .35, '#4a4a52', 2);
    }
    if (night > .5) px.blend(g, .08, 'add', () => px.poly(g, [[W * .58, 12], [W * .66, 12], [W * .5, top], [W * .42, top]], '#8090c0'));
    // ---- the frame: pillars, header, visor ----
    px.poly(g, [[0, 0], [16, 0], [24, top], [0, top]], P.frame); px.poly(g, [[W, 0], [W - 16, 0], [W - 24, top], [W, top]], P.frame);
    px.line(g, 16, 0, 24, top, '#4a4e58'); px.line(g, W - 16, 0, W - 24, top, '#4a4e58');
    px.rect(g, 0, 0, W, 8, P.frame); px.rect(g, 0, 8, W, 1, '#4a4e58');
    const vh = Math.round(4 + this.visor * top * .26); px.rect(g, 40, 8, Math.round(W * .32), vh, '#3a3020'); px.rect(g, 40, 8 + vh - 2, Math.round(W * .32), 2, '#5a4a30');
    if (this.visor > .1) px.blend(g, .5, 'normal', () => px.rect(g, 40, 8, Math.round(W * .32), vh, '#1a1408'));
    // ---- the dashboard ----
    const dh = H - top;
    px.rect(g, 0, top, W, dh, P.panel); px.rect(g, 0, top, W, 2, P.panelLt); px.rect(g, 0, top + 2, W, 1, P.panelDk);
    for (let y = top + 6; y < H; y += 6) px.rect(g, 0, y, W, 1, P.panelDk);
    const L = Math.max(320, W);
    // master controller (bottom-left) and the notch readout
    this._controller(g, 6, top, dh, run, P);
    const nx = 84, nName = tr.name, nCol = tr.notch > 0 ? '#5ab8ff' : tr.notch < 0 ? (tr.isEB ? '#ff4a3a' : '#ffa040') : '#e8e8e8';
    E.ui.box(g, nx, top + 6, 44, 26, { bg: '#0e1014', border: '#101014', gradient: false });
    T(g, nName, nx + 22, top + 9, nCol, { scale: 2, align: 'center', shadow: '#000' });
    this._strip(g, nx - 6, top + 36, 56, ty, tr, P);
    if (tr.isEB && Math.abs(tr.v) < .1) T(g, 'EB RELEASE', nx + 22, top + 46, '#ff8a70', { align: 'center', font: 'tiny' });
    // speedometer
    const R = Math.max(22, Math.min(28, Math.round(dh * .38))), sx = 134 + R, sy = top + Math.round(dh * .5);
    this._speedo(g, sx, sy, R, run, P);
    // the timetable card and pocket watch (a narrow screen keeps the watch; the HUD shows the next stop)
    const narrow = W < 400, cx = sx + R + 8, cw = narrow ? 0 : Math.max(100, Math.min(160, W - cx - 120));
    if (!narrow) this._card(g, cx, top + 6, cw, dh - 12, run, o);
    this._watch(g, cx + cw + 14, top + 18, 10, run, P);
    // lamps and buttons: three columns of three; the BC gauge where there is room
    const rx = cx + cw + 34;
    this._lamps(g, rx, top + 6, W - rx - 4, dh - 10, run, P, o);
  }
  _controller(g, x, top, dh, run, P) {
    const tr = run.train, ty = tr.ty, nP = ty.notchP, nB = ty.notchB + 1, total = nP + nB + 1, h = this.handle;
    const sx = x + 10, sw = 58, sy = top + 10, sh = dh - 16;
    // the slot in perspective: power up (far), brake down (near)
    px.poly(g, [[sx + 14, sy], [sx + 34, sy], [sx + 46, sy + sh], [sx + 2, sy + sh]], '#1a1c20');
    px.poly(g, [[sx + 16, sy + 2], [sx + 32, sy + 2], [sx + 42, sy + sh - 2], [sx + 6, sy + sh - 2]], '#2a2c32');
    for (let i = 0; i <= total - 1; i++) { const u = i / (total - 1), y = sy + 2 + u * (sh - 4), w = 16 + u * 20, n = nP - i, c = n > 0 ? '#5ab8ff' : n === 0 ? '#ffffff' : n === -nB ? '#ff4a3a' : '#ffa040'; px.rect(g, sx + 24 - w / 2 - 6, y, 4, 1, c); }
    // the handle: a T at the notch, the glove on it
    const u = (nP - h) / (total - 1), hy = sy + 2 + u * (sh - 4), hx = sx + 24, hw = 18 + u * 14;
    px.rect(g, hx - 2, hy, 4, sy + sh - hy + 4, '#5a5e66');
    px.rect(g, hx - hw / 2, hy - 4, hw, 6, '#1a1a1e'); px.rect(g, hx - hw / 2 + 1, hy - 4, hw - 2, 2, '#4a4a52');
    if (ty.cab === 'classic') { const bu = (nB - 1 + Math.min(0, h)) / nB; px.rect(g, sx + 46, sy + 4 + (1 - bu) * (sh - 12), 10, 5, '#8a2a1a'); px.rect(g, sx + 50, sy + 9 + (1 - bu) * (sh - 12), 2, 20, '#5a5e66'); }
    this.hits.push({ id: 'handle', x: sx, y: sy - 4, w: sw, h: sh + 8, total, nP });
    if (this.hand.mode === 'rest' || this.hand.mode === 'press' && this.hand.btn !== 'eb') this._glove(g, hx + 1, hy - 6, 'grip');
  }
  _strip(g, x, y, w, ty, tr, P) {
    const nP = ty.notchP, nB = ty.notchB + 1, total = nP + nB + 1, cw = Math.max(3, Math.floor(w / total));
    for (let i = 0; i < total; i++) { const n = nP - i, on = tr.notch === n, base = n > 0 ? '#2a5aa0' : n === 0 ? '#606068' : n === -nB ? '#a02a1a' : '#a06020', lit = n > 0 ? '#8ad0ff' : n === 0 ? '#ffffff' : n === -nB ? '#ff5a4a' : '#ffc060'; px.rect(g, x + i * cw, y, cw - 1, 7, on ? lit : base); }
    T(g, 'P', x, y + 9, '#8ad0ff', { font: 'tiny' }); T(g, 'N', x + nP * cw, y + 9, '#ffffff', { font: 'tiny' }); T(g, 'EB', x + (total - 1) * cw - 3, y + 9, '#ff5a4a', { font: 'tiny' });
    this.hits.push({ id: 'n', x: x + nP * cw - 2, y, w: cw + 4, h: 8 });
  }
  _speedo(g, cx, cy, R, run, P) {
    const v = Math.max(0, this.needle), lim = run.limit < 900 ? run.limit : null, dark = P.face === '#0e1014';
    px.disc(g, cx, cy, R + 2, '#101014'); px.disc(g, cx, cy, R, P.face);
    const ang = k => Math.PI * (1.25 - 1.5 * k / 120);
    if (lim) for (let k = lim; k <= 120; k += 1) { const a = ang(k); px.dot(g, cx + Math.cos(a) * (R - 2), cy - Math.sin(a) * (R - 2), '#e84a3a'); }
    for (let k = 0; k <= 120; k += 10) { const a = ang(k), big = k % 20 === 0, c = dark ? '#d8d8d8' : '#202020'; px.line(g, cx + Math.cos(a) * (R - (big ? 5 : 3)), cy - Math.sin(a) * (R - (big ? 5 : 3)), cx + Math.cos(a) * (R - 1), cy - Math.sin(a) * (R - 1), c); if (big && R > 24 && k % 40 === 0) T(g, k, cx + Math.cos(a) * (R - 11) - 4, cy - Math.sin(a) * (R - 11) - 3, c, { font: 'tiny' }); }
    const a = ang(Math.min(125, v)); px.line(g, cx, cy, cx + Math.cos(a) * (R - 4), cy - Math.sin(a) * (R - 4), '#ff5a2a', 2); px.disc(g, cx, cy, 2, '#808088');
    const kmh = Math.round(v); E.ui.box(g, cx - 17, cy + 4, 34, 15, { bg: '#060608', border: '#3a3a40', gradient: false });
    T(g, kmh, cx + 14, cy + 6, lim && v > lim + .5 ? '#ff6a4a' : '#7aff9a', { align: 'right', scale: 1 }); T(g, 'km/h', cx - 15, cy + 8, '#5a8a6a', { font: 'tiny' });
    // the ATS lamps: white ATS (power), red ATS (ringing)
    const A = run.ats, ring = A.ringing && Math.floor(run.t * 4) % 2 === 0;
    E.ui.box(g, cx - R - 2, cy - R - 2, 18, 9, { bg: '#1a1a1a', border: '#3a3a3a', gradient: false }); T(g, 'ATS', cx - R, cy - R, '#e8e8e8', { font: 'tiny' });
    E.ui.box(g, cx + R - 16, cy - R - 2, 18, 9, { bg: ring ? '#ff2a1a' : '#3a1210', border: '#3a3a3a', gradient: false }); T(g, 'ATS', cx + R - 14, cy - R, ring ? '#ffffff' : '#6a3a30', { font: 'tiny' });
  }
  _card(g, x, y, w, h, run, o) {
    E.ui.box(g, x, y, w, h, { bg: '#f4f0e4', border: '#2a2a2a', gradient: false });
    T(g, 'STATION', x + 4, y + 3, '#6a6a6a', { font: 'tiny' }); T(g, 'ARR', x + w - 58, y + 3, '#6a6a6a', { font: 'tiny' }); T(g, 'DEP', x + w - 28, y + 3, '#6a6a6a', { font: 'tiny' });
    px.rect(g, x + 2, y + 10, w - 4, 1, '#c8c0b0');
    const rows = []; run.stops.forEach((p, i) => rows.push({ name: p.st.name, arr: p.arrT, dep: p.depT, i, pass: false, s: p.target }));
    for (const p of run.passes) rows.push({ name: p.st.name, arr: p.atT, dep: null, pass: true, s: p.target, done: p.done });
    rows.sort((a, b) => a.s - b.s);
    const n = Math.max(1, Math.floor((h - 12) / 9)), cur = rows.findIndex(r => !r.pass ? r.i >= run.stopIdx : !r.done && r.s > run.s), start = Math.max(0, Math.min(rows.length - n, (cur < 0 ? rows.length : cur) - 1));
    rows.slice(start, start + n).forEach((rw, k) => {
      const yy = y + 13 + k * 9, isNext = rows.indexOf(rw) === cur, done = rw.pass ? rw.done : rw.i < run.stopIdx;
      if (isNext) px.rect(g, x + 2, yy - 1, w - 4, 9, '#ffe08a');
      const c = done ? '#8a8a8a' : '#101010', mx = Math.max(6, Math.floor((w - 70) / 4.4)), nm = rw.name.length > mx ? rw.name.slice(0, mx - 1) + '.' : rw.name;
      T(g, nm, x + 4, yy, c, { font: 'tiny' });
      if (rw.pass) T(g, 'PASS', x + w - 58, yy, rw.done ? '#8a8a8a' : '#2a5ac0', { font: 'tiny' });
      else if (rw.arr !== null && rw.arr !== undefined) T(g, DH.clockStr(rw.arr).slice(0, 8), x + w - 62, yy, c, { font: 'tiny' });
      if (!rw.pass && rw.dep !== null && rw.dep !== undefined) T(g, DH.clockStr(rw.dep).slice(3, 8), x + w - 26, yy, c, { font: 'tiny' });
    });
  }
  _watch(g, cx, cy, R, run, P) {
    px.disc(g, cx, cy, R + 2, '#c8a040'); px.disc(g, cx, cy, R, '#f8f4e8'); px.rect(g, cx - 1, cy - R - 5, 3, 3, '#c8a040');
    const t = run.clock, s = (t % 60) / 60 * Math.PI * 2, m = (t / 60 % 60) / 60 * Math.PI * 2, hh = (t / 3600 % 12) / 12 * Math.PI * 2;
    px.line(g, cx, cy, cx + Math.sin(hh) * R * .5, cy - Math.cos(hh) * R * .5, '#101010'); px.line(g, cx, cy, cx + Math.sin(m) * R * .8, cy - Math.cos(m) * R * .8, '#101010');
    px.line(g, cx, cy, cx + Math.sin(Math.floor(t % 60) / 60 * Math.PI * 2) * R * .9, cy - Math.cos(Math.floor(t % 60) / 60 * Math.PI * 2) * R * .9, '#d02a1a');
    T(g, DH.clockStr(t), cx, cy + R + 4, '#fff4c0', { align: 'center', font: 'tiny', shadow: '#000' });
  }
  _lamps(g, x, y, w, h, run, P, o) {
    const tr = run.train, lamp = (lx, ly, on, col, label) => { px.disc(g, lx, ly, 5, '#101014'); px.disc(g, lx, ly, 4, on ? col : E.tones(col).deep); if (on) px.blend(g, .4, 'add', () => px.disc(g, lx, ly, 7, col)); T(g, label, lx, ly + 7, on ? '#ffffff' : '#8a8a90', { align: 'center', font: 'tiny' }); };
    const c1 = x + 10, c2 = x + 34, c3 = x + 58, r1 = y + 5, r2 = y + 25, r3 = y + 46;
    lamp(c1, r1, run.pilot, '#ffa030', 'PILOT');
    const dOpen = run.doors > .05; lamp(c2, r1, dOpen && run.doorSide === 'L', '#ffe040', '<DOOR'); lamp(c3, r1, dOpen && run.doorSide === 'R', '#ffe040', 'DOOR>');
    lamp(c1, r2, tr.st.slipT > 0, '#ff5a3a', 'SLIP'); lamp(c2, r2, !!tr.st.slide, '#ff9a3a', 'WSP');
    // the passengers' mood (comfort)
    const cm = run.comfort, mood = cm > 85 ? 0 : cm > 60 ? 1 : cm > 35 ? 2 : 3, fx = c3, fy = r2;
    px.disc(g, fx, fy, 6, ['#ffd84a', '#f0e070', '#f0a050', '#e86040'][mood]); px.dot(g, fx - 2, fy - 2, '#202020'); px.dot(g, fx + 2, fy - 2, '#202020');
    if (mood === 0) { px.rect(g, fx - 2, fy + 2, 5, 1, '#202020'); px.dot(g, fx - 3, fy + 1, '#202020'); px.dot(g, fx + 3, fy + 1, '#202020'); } else if (mood === 1) px.rect(g, fx - 2, fy + 2, 5, 1, '#202020'); else { px.rect(g, fx - 2, fy + 3, 5, 1, '#202020'); px.dot(g, fx - 3, fy + 4, '#202020'); px.dot(g, fx + 3, fy + 4, '#202020'); }
    T(g, 'RIDE', fx, fy + 8, '#c8c8d0', { align: 'center', font: 'tiny' });
    // buttons: ATS confirm, horn, EB (they depress when used)
    const btn = (id, bx2, by2, r, col, label, glyph) => {
      const dn = this.press[id] > 0 || (id === 'horn' && run.horn), hov = this.hover === id;
      px.disc(g, bx2, by2 + 2, r, '#101014'); px.disc(g, bx2, by2 + (dn ? 2 : 0), r, dn ? E.tones(col).sh : col); if (!dn) px.disc(g, bx2 - r * .3, by2 - r * .3, r * .35, E.tones(col).lt);
      if (hov) for (let a = 0; a < 20; a++) px.dot(g, bx2 + Math.cos(a / 20 * 6.28) * (r + 2), by2 + Math.sin(a / 20 * 6.28) * (r + 2), '#ffffff');
      T(g, label, bx2, by2 + r + 3, '#e8e8e8', { align: 'center', font: 'tiny' });
      this.hits.push({ id, x: bx2 - r - 2, y: by2 - r - 2, w: r * 2 + 4, h: r * 2 + 10 });
    };
    btn('ats', c1, r3, 6, '#e8c020', 'ATS', 'ats'); btn('horn', c2, r3, 6, '#3a3a40', 'HORN', 'horn'); btn('eb', c3, r3 - 1, 7, '#e02a1a', 'EB', 'eb');
    // the camera icon, top right of the block; the BC gauge where there is room
    const vx = x + 70, vy = y - 4; px.rect(g, vx, vy, 12, 8, this.hover === 'view' ? '#ffffff' : '#c8c8d0'); px.rect(g, vx + 3, vy - 2, 6, 2, '#c8c8d0'); px.disc(g, vx + 6, vy + 4, 2, '#2a2a30');
    this.hits.push({ id: 'view', x: vx - 2, y: vy - 4, w: 16, h: 14 });
    if (w >= 104) {
      const bx = x + 90, by = y + 16; px.disc(g, bx, by, 11, '#101014'); px.disc(g, bx, by, 10, P.face === '#0e1014' ? '#1a1c22' : '#f0ead8');
      const a = Math.PI * (1.2 - 1.4 * Math.min(1, this.bc / 450)); px.line(g, bx, by, bx + Math.cos(a) * 8, by - Math.sin(a) * 8, '#ff5a2a'); const a2 = Math.PI * (1.2 - 1.4 * this.mr / 10); px.line(g, bx, by, bx + Math.cos(a2) * 6, by - Math.sin(a2) * 6, '#ffffff');
      T(g, 'BC/MR', bx, by + 12, '#c8c8d0', { align: 'center', font: 'tiny' });
    }
  }
  /** a white glove: 'grip' (on the handle), 'point' (index finger out toward the target) */
  _glove(g, x, y, pose, ang = 0) {
    const W = '#f8f8f4', S = '#c8c8c0';
    if (pose === 'grip') { px.rect(g, x - 7, y, 14, 8, S); px.rect(g, x - 7, y, 13, 7, W); for (let i = 0; i < 4; i++) px.rect(g, x - 6 + i * 3, y + 7, 2, 2, S); px.rect(g, x + 5, y + 2, 5, 12, S); px.rect(g, x + 4, y + 2, 5, 11, W); return; }
  }
  /** the point-and-call hand: rises from the bottom, points at (tx, ty), returns */
  drawPoint(g, W, H) {
    const h = this.hand; if (h.mode !== 'point') return;
    const t = h.t, rise = t < .15 ? t / .15 : t < .75 ? 1 : Math.max(0, 1 - (t - .75) / .25), bx = W * .62, by = H + 10;
    const tx = bx + (h.tx - bx) * .55 * rise, ty = by + (h.ty - by) * .55 * rise;
    const ang = Math.atan2(h.ty - ty, h.tx - tx);
    // the sleeve and glove
    px.line(g, bx + 14, by + 20, tx, ty + 8, '#1a2a4a', 16); px.line(g, bx + 14, by + 20, tx, ty + 8, '#24365e', 12);
    px.disc(g, tx, ty, 8, '#c8c8c0'); px.disc(g, tx - 1, ty - 1, 7, '#f8f8f4');
    const fx = tx + Math.cos(ang) * 14, fy = ty + Math.sin(ang) * 14; px.line(g, tx, ty, fx, fy, '#c8c8c0', 4); px.line(g, tx, ty - 1, fx, fy - 1, '#f8f8f4', 3);
    px.line(g, tx - 2, ty + 3, tx + Math.cos(ang + .9) * 6, ty + 3 + Math.sin(ang + .9) * 6, '#e8e8e0', 3);
  }
  /** which widget is under a screen point */
  hit(x, y) { for (const h of this.hits) if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h; return null; }
}
DH.Cab = Cab;
})();
