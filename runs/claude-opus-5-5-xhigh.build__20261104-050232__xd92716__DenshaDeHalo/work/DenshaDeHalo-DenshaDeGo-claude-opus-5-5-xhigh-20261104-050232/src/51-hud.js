/* 51-hud: the HUD over the view, 10-foot rules (nothing under the 5x7 font, key numbers at scale 2-3, a 5% margin, at
 * most six groups, nothing in colour alone): the Halo Time ring (top left), the next station (top centre), the limit,
 * next limit, next signal and clock (top right, clear of the corner buttons), the Stop Gauge (600 m to 0, a +-2 m scale
 * inside 30 m, the braking guide), the centre banner (judgments, toasts), the subtitle box, and the Stop Cam inset. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, px = E.px, game = DH.game, F = E.font;
const T = (g, s, x, y, c, o = {}) => F.text(g, String(s), Math.round(x), Math.round(y), c, Object.assign({ outline: false }, o));
const JCOL = { perfect: '#ffd84a', great: '#4ae8ff', good: '#6aff7a', ok: '#ffffff', short: '#ffa040', overrun: '#ff5a4a', over: '#ff3a2a', ontime: '#ffd84a', late: '#ff6a5a', early: '#c8d0ff', smooth: '#ff9ad8' };
DH.JCOL = JCOL;
class Hud {
  constructor() { this.banner = null; this.toasts = []; this.deltas = []; this.stopCam = null; this.pulse = 0; this.flash = 0; }
  judge(J, run) {
    const lines = [{ t: J.label, c: JCOL[J.key] || '#ffffff', big: true }];
    if (J.time) lines.push({ t: J.time, c: JCOL[J.timeKey] || JCOL[J.time === 'SMOOTH!' ? 'smooth' : 'ok'] });
    if (J.smooth && !J.tut) lines.push({ t: 'SMOOTH!', c: JCOL.smooth });
    this.banner = { lines, t: 0, dur: 2.6, err: J.err };
    if (game.settings.stopCam && J.station !== 'mark' || J.tut) this.stopCam = { J, t: 0, dur: 3.2, v0: run.train.v };
  }
  toast(text, col = '#ffffff', dur = 1.6) { this.toasts.push({ text, col, t: 0, dur }); if (this.toasts.length > 3) this.toasts.shift(); }
  delta(d) { if (!d.sec) return; this.deltas.push({ text: (d.sec > 0 ? '+' : '') + (Math.round(d.sec * 10) / 10) + ' s', col: d.sec > 0 ? '#ffe070' : '#ff6a5a', t: 0 }); }
  update(dt) {
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }
    for (const t of this.toasts) t.t += dt; this.toasts = this.toasts.filter(t => t.t < t.dur);
    for (const d of this.deltas) d.t += dt; this.deltas = this.deltas.filter(d => d.t < 1.6);
    if (this.stopCam) { this.stopCam.t += dt; if (this.stopCam.t > this.stopCam.dur) this.stopCam = null; }
    this.pulse += dt;
  }
  skipStopCam() { if (this.stopCam && this.stopCam.t > .4) { this.stopCam = null; return true; } return false; }
  /** draw over the view; o: { top (the dash's top row), minimal, cornerX, guide, rail, cam, call } */
  draw(g, W, H, run, o = {}) {
    const m = Math.round(Math.min(W, H) * .04), top = o.top || H, cornerX = o.cornerX || W; this.W = W;
    if (!o.noRing) this._ring(g, m + 2, m + 2, run);
    if (!o.noStation) this._station(g, W / 2, m, run);
    this._right(g, Math.min(W - m, cornerX - 6), m + (W < 330 ? 26 : 0), run, o);
    const ns = run.nextStop();
    if (ns && !ns.pass && ns.dist < 600 && ns.dist > -50 && run.phase === 'run') this._gauge(g, W / 2, top - 30, Math.min(260, W * .62), run, ns, o);
    if (run.stage.tutorial && run.tut && run.tut.cur && run.tut.cur.mark && run.phase === 'run') { const d = run.tut.cur.mark - run.s; if (d < 600 && d > -50) this._gauge(g, W / 2, top - 30, Math.min(260, W * .62), run, { dist: d, p: { st: { name: 'MARK ' + (run.tut.cur.id === 'mark1' ? 1 : run.tut.cur.id === 'mark2' ? 2 : 3) } } }, o); }
    if (o.minimal) this._minimal(g, W, H, run, m);
    // the centre banner: a judgment, then the toasts under the station line
    if (this.banner) {
      const b = this.banner, k = Math.min(1, b.t / .12), y0 = Math.round(H * .3);
      b.lines.forEach((l, i) => { if (l.big) F.title(g, l.t, Math.round(W / 2), y0 - 6, { scale: 3, align: 'center', colors: [E.tones(l.c).hi, l.c, E.tones(l.c).sh], depth: 2 }); else T(g, l.t, W / 2, y0 + 20 + i * 12, l.c, { align: 'center', scale: 1, shadow: '#000', outline: '#000' }); });
      if (b.err !== undefined && b.t > .3) T(g, (b.err >= 0 ? '+' : '') + b.err.toFixed(2) + ' m', W / 2, y0 + 20 + b.lines.length * 12, '#e8e8f0', { align: 'center', shadow: '#000' });
    }
    this.toasts.forEach((t, i) => { const y = m + 30 + i * 12, a = t.t < .1 ? t.t / .1 : t.t > t.dur - .3 ? (t.dur - t.t) / .3 : 1; px.blend(g, a, 'normal', () => { E.ui.box(g, Math.round(W / 2 - F.width(t.text) / 2 - 5), y - 2, F.width(t.text) + 10, 12, { alpha: .75, bg: '#0a0c18', border: t.col }); T(g, t.text, W / 2, y, t.col, { align: 'center' }); }); });
    if (this.stopCam && !o.noStopCam) this._stopCam(g, W, H, run, top);
  }
  _ring(g, x, y, run) {
    const r = 14, cx = x + r, cy = y + r, f = Math.min(1, run.grace / 99), low = run.grace <= 10 && !run.frozen, pulse = low && Math.floor(this.pulse * 3) % 2 === 0;
    px.disc(g, cx, cy, r + 2, '#101018');
    for (let i = 0; i < 48; i++) { const a = -Math.PI / 2 + i / 48 * Math.PI * 2, on = i / 48 < f, c = on ? (pulse ? '#ff4a3a' : '#f2c230') : '#3a3420'; for (const rr of [r - 1, r, r + 1]) px.dot(g, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, c); }
    if (!pulse) px.blend(g, .25, 'add', () => { for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; px.dot(g, cx + Math.cos(a) * (r + 2), cy + Math.sin(a) * (r + 2), '#f2c230'); } });
    const s = run.frozen ? '--' : String(Math.floor(run.grace));
    T(g, s, cx, cy - 4, low ? '#ff8a7a' : '#fff4c0', { align: 'center', scale: s.length > 2 ? 1 : 1, shadow: '#000' });
    T(g, 'HALO', cx, cy + r + 4, '#f2c230', { align: 'center', shadow: '#000' });
    this.deltas.forEach((d, i) => T(g, d.text, cx + r + 6, cy - 6 + i * 9 - d.t * 6, d.col, { shadow: '#000' }));
  }
  _station(g, cx, y, run) {
    const ns = run.nextStop(); let l1, l2, c1 = '#ffffff';
    if (run.stage.tutorial) { const st = run.tut && run.tut.cur; l1 = 'DAWN DEPOT'; l2 = st ? st.hint : 'CERTIFIED'; }
    else if (run.phase === 'dwell' && run.dwell) { const d = run.dwell; l1 = d.stop.st.name; l2 = d.last ? 'LAST STOP' : 'DEP ' + DH.clockStr(d.dep) + (run.pilot ? '  READY' : '  ' + Math.max(0, Math.ceil(d.dep - run.clock)) + ' s'); c1 = '#ffe08a'; }
    else if (run.phase === 'finished') { l1 = run.stops[run.stops.length - 1].st.name; l2 = 'ARRIVED'; }
    else if (ns) { l1 = (ns.pass ? 'PASS  ' : 'NEXT  ') + ns.p.st.name; l2 = DH.fmtDist(ns.dist) + (ns.pass ? '  ·  PASS ' + DH.clockStr(ns.p.atT) : '  ·  ARR ' + DH.clockStr(ns.p.arrT)); c1 = ns.pass ? '#8ac8ff' : '#ffffff'; }
    else return;
    const sc = this.W < 330 ? 1 : 2, w = Math.max(F.width(l1, { scale: sc }), F.width(l2)) + 16, h = sc === 2 ? 30 : 22;
    E.ui.box(g, Math.round(cx - w / 2), y - 2, w, h, { alpha: .62, bg: '#0a0c18', border: '#3a3a5a' });
    T(g, l1, cx, y + 1, c1, { align: 'center', scale: sc, shadow: '#000' }); T(g, l2, cx, y + (sc === 2 ? 17 : 10), '#c8d0e8', { align: 'center', shadow: '#000' });
  }
  _right(g, xr, y, run, o) {
    // the limit in force (a white plate), the next signal as a mini 4-lamp head with its letter, the next limit, the clock
    const lim = run.limit < 900 ? run.limit : null, w = 34;
    if (lim) { E.ui.box(g, xr - w, y, w, 22, { bg: '#f8f8f4', border: '#202020', gradient: false }); T(g, lim, xr - w / 2, y + 4, '#101010', { align: 'center', scale: 2 }); }
    T(g, 'LIMIT', xr - w / 2, y + 24, '#c8d0e8', { align: 'center', font: 'tiny', shadow: '#000' });
    const sg = run.signalsAhead(o.fogSight || 600, 1)[0], sx = xr - w - 20;
    if (sg) {
      const on = DH.LAMPS[sg.g.aspect] || DH.LAMPS.R;
      E.ui.box(g, sx, y, 12, 26, { bg: '#101014', border: '#4a4a50', gradient: false });
      for (let i = 0; i < 4; i++) { const c = DH.LAMPC[i]; px.disc(g, sx + 6, y + 5 + i * 5.5, 2, on[i] ? c : '#2a2a2e'); if (on[i]) px.blend(g, .4, 'add', () => px.disc(g, sx + 6, y + 5 + i * 5.5, 4, c)); }
      T(g, sg.g.aspect, sx - 3, y + 4, sg.g.aspect === 'G' ? '#4aff8a' : sg.g.aspect === 'R' ? '#ff5a4a' : '#ffd040', { align: 'right', shadow: '#000' });
      T(g, Math.round(sg.d) + 'm', sx - 3, y + 14, '#c8d0e8', { align: 'right', font: 'tiny', shadow: '#000' });
    }
    const nl = run.nextLimit(); if (nl && nl.d < 1200) T(g, '▸' + nl.v + ' in ' + Math.round(nl.d) + ' m', xr, y + 34, nl.slow ? '#ffd040' : '#ffffff', { align: 'right', shadow: '#000' });
    T(g, DH.clockStr(run.clock), xr, y + 45, '#fff4c0', { align: 'right', shadow: '#000' });
  }
  _minimal(g, W, H, run, m) {
    const tr = run.train, kmh = Math.round(Math.max(0, tr.v));
    E.ui.box(g, m, H - m - 30, 70, 28, { alpha: .65 }); T(g, kmh, m + 40, H - m - 26, '#7aff9a', { align: 'right', scale: 2, shadow: '#000' }); T(g, 'km/h', m + 44, H - m - 20, '#a8c8b0', { font: 'tiny' });
    const nCol = tr.notch > 0 ? '#5ab8ff' : tr.notch < 0 ? (tr.isEB ? '#ff4a3a' : '#ffa040') : '#e8e8e8';
    E.ui.box(g, W - m - 46, H - m - 30, 44, 28, { alpha: .65 }); T(g, tr.name, W - m - 24, H - m - 25, nCol, { align: 'center', scale: 2, shadow: '#000' });
  }
  _gauge(g, cx, y, w, run, ns, o) {
    const d = ns.dist, fine = d < 30, x0 = Math.round(cx - w / 2), tr = run.train, v = tr.v;
    E.ui.box(g, x0 - 6, y - 16, w + 12, 30, { alpha: .7, bg: '#0a0c18', border: '#4a4a6a' });
    T(g, 'STOP AT ' + (run.cars >= 10 ? '10' : '6') + '  ' + (ns.p.st.name || ''), x0, y - 13, '#ffd040', { shadow: '#000' });
    T(g, (d >= 0 ? '' : '+') + Math.abs(d).toFixed(d < 100 ? 2 : 1) + ' m', x0 + w, y - 15, d < -1 ? '#ff6a5a' : '#ffffff', { align: 'right', scale: d < 100 ? 2 : 1, shadow: '#000' });
    const scale = fine ? 2 : 600, X = dd => x0 + w * .82 - (dd / scale) * w * (fine ? .4 : .8);
    px.rect(g, x0, y + 1, w, 6, '#1a1c24');
    if (fine) { for (let k = -20; k <= 20; k++) { const xx = X(-k / 10); if (xx < x0 || xx > x0 + w) continue; px.rect(g, xx, y + (k % 10 === 0 ? 0 : k % 5 === 0 ? 2 : 4), 1, k % 10 === 0 ? 9 : k % 5 === 0 ? 5 : 3, '#6a6a80'); } const ww = DH.TUNING.stopWindow * run.diff.window; px.blend(g, .4, 'normal', () => px.rect(g, X(ww * .1), y + 1, Math.max(1, X(-ww * .1) - X(ww * .1)), 6, '#ffd84a')); }
    else for (const k of [100, 200, 300, 400, 500]) px.rect(g, X(k), y + 2, 1, 4, '#4a4a60');
    // the braking guide: where B4 must start, and where the train would stop on its current notch
    if (o.guide && !fine && v > 3) {
      const aB4 = run.train.ty.bStep * 4 * DH.TUNING.brakeScale / 3.6, tau = DH.TUNING.brakeLag * run.train.ty.lagK, dB = (v / 3.6) ** 2 / (2 * aB4) + v / 3.6 * tau, zx = X(dB);
      if (zx > x0) px.blend(g, .5, 'normal', () => px.rect(g, Math.max(x0, zx - 6), y + 1, 12, 6, '#ffa020')); T(g, 'BRAKE', Math.max(x0 + 14, Math.min(x0 + w - 14, zx)), y + 9, '#ffb040', { align: 'center', font: 'tiny', shadow: '#000' });
    }
    if (o.guide && tr.notch < 0 && v > .5) { const pr = DH.predictStop(tr.st, tr.notch, { T: DH.TUNING, ty: tr.ty, grade: run.seg().grade || 0, wet: run.weather === 'rain', doors: true }, .1); const gx = X(d - pr.d); if (gx > x0 && gx < x0 + w) { px.rect(g, gx - 1, y - 1, 3, 10, '#8ad0ff'); } }
    // the stop marker and our nose
    const mx = X(0); px.rect(g, mx - 1, y - 2, 3, 12, '#ffd040'); T(g, run.cars >= 10 ? '10' : '6', mx, y + 10, '#ffd040', { align: 'center', font: 'tiny' });
    const nx = X(d), cl = Math.max(x0 - 2, Math.min(x0 + w + 2, nx)); px.poly(g, [[cl, y + 4], [cl - 6, y], [cl - 6, y + 8]], '#ffffff'); px.rect(g, cl - 12, y + 1, 6, 6, '#c8ccd4');
  }
  /** the Stop Cam: a side elevation of the front car easing onto its final place, the marker, the gap in metres */
  _stopCam(g, W, H, run, top) {
    const S = this.stopCam, J = S.J, easy = run.diff.label === 'EASY', iw = easy ? Math.round(W * .8) : Math.min(220, Math.round(W * .5)), ih = easy ? Math.round(H * .5) : 76;
    const slide = Math.min(1, S.t / .25), x0 = Math.round(W - iw - 8 + (1 - slide) * (iw + 20)), y0 = easy ? Math.round(H * .18) : Math.round(top - ih - 40);
    E.ui.box(g, x0, y0, iw, ih, { bg: ['#9ac8f0', '#d8eaf8'], border: '#f2c230' });
    const gy = y0 + ih - 18, ppm = iw / 8, mxs = x0 + iw * .62;   // 8 m across the inset; the marker at 62%
    px.rect(g, x0 + 2, gy, iw - 4, ih - (gy - y0) - 2, '#a8a49c'); px.rect(g, x0 + 2, gy, iw - 4, 2, '#f4f4ee'); px.rect(g, x0 + 2, gy + 3, iw - 4, 2, '#e8c020');
    for (let k = -4; k <= 4; k++) px.rect(g, mxs + k * ppm, gy + 6, 1, 3, '#6a665e');
    // the marker post
    px.rect(g, mxs - 1, gy - 26, 2, 26, '#c8ccd2'); px.rect(g, mxs - 7, gy - 34, 14, 12, '#101010'); px.rect(g, mxs - 6, gy - 33, 12, 10, run.cars >= 10 ? '#f86a30' : '#f8d020'); T(g, run.cars >= 10 ? '10' : '6', mxs, gy - 31, '#101010', { align: 'center', font: run.cars >= 10 ? 'tiny' : undefined });
    // the car's nose eases into place
    const u = Math.min(1, S.t / 1.2), ease = 1 - Math.pow(1 - u, 3), err = J.err, pos = err + (1 - ease) * -Math.max(3, Math.min(12, S.v0 * 2 + 4)), nose = mxs + pos * ppm;
    const L = livery(run), bodyTop = gy - 30;
    px.rect(g, x0 + 2, bodyTop, Math.max(0, nose - x0 - 8), 26, L.body); px.poly(g, [[nose - 8, bodyTop], [nose, bodyTop + 6], [nose, gy - 4], [nose - 8, gy - 4]], L.face || L.body);
    px.rect(g, x0 + 2, bodyTop + 13, Math.max(0, nose - x0 - 6), 2, L.stripe); px.rect(g, nose - 7, bodyTop + 4, 6, 7, '#2a3a4a');
    for (let k = 1; k < 4; k++) { const wx = nose - k * 2.2 * ppm; if (wx > x0 + 4) px.rect(g, wx, bodyTop + 4, Math.round(ppm * 1.2), 7, '#3a4a5c'); }
    const door = nose - 2.5 * ppm; if (door > x0 + 4) { px.rect(g, door - ppm * .6, bodyTop + 3, Math.round(ppm * 1.3), 23, L.door || '#c8ccd4'); }
    px.rect(g, x0 + 2, gy - 4, Math.max(0, nose - x0 - 2), 4, '#2a2a2e');
    // the dimension line
    if (u >= 1) { const a = Math.min(nose, mxs), b = Math.max(nose, mxs); px.rect(g, a, gy + 11, Math.max(1, b - a), 1, '#ffffff'); px.rect(g, a, gy + 9, 1, 5, '#ffffff'); px.rect(g, b, gy + 9, 1, 5, '#ffffff'); T(g, (err >= 0 ? '+' : '') + err.toFixed(2) + ' m', (a + b) / 2, y0 + 4, JCOL[J.key] || '#ffffff', { align: 'center', scale: 1, shadow: '#000' }); }
    T(g, 'STOP CAM', x0 + 5, y0 + 4, '#2a3a5a', { font: 'tiny' });
    if (J.key === 'perfect' && u >= 1 && DH.drawHaro) DH.drawHaro(g, x0 + iw - 22, y0 + 22 - Math.abs(Math.sin(S.t * 6)) * 4, 1, S.t);
  }
}
const livery = run => DH.LIVERIES[run.train.ty.livery] || DH.LIVERIES.h8000;
DH.Hud = Hud;
})();
