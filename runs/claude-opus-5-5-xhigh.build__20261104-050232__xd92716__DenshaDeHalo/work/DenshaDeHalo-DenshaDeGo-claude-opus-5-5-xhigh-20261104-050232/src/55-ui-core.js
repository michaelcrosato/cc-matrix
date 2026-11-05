/* 55-ui-core: the front end's shared pieces, 10-foot and controller-first: a big pixel menu (scale-2 entries, the d-pad
 * or stick moves, confirm picks, cancel backs out, the mouse hovers to focus and clicks to pick, option rows turn with
 * left/right or a click on their arrows), scenic backgrounds drawn by the rail renderer, the prompt line, the idle
 * clock that starts attract mode, and the save: progress, records, postcards and stats in E.store. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, game = DH.game, px = E.px, F = E.font;
const T = (g, s, x, y, c, o = {}) => F.text(g, String(s), Math.round(x), Math.round(y), c, Object.assign({ outline: false }, o));
DH.T = T;
/* ---- the big menu ---- */
class BigMenu {
  /** items: [{ label, sub, disabled, options: [[v, label]], value, onChange(v), onPick() }]; o: { x, y, w, align, scale, onCancel, gap } */
  constructor(items, o = {}) { this.items = items; this.i = 0; Object.assign(this, { x: 'center', y: 60, w: 200, scale: 2, onCancel: null, gap: 4, active: true }, o); this.box = []; this._skip(1); }
  _skip(d) { for (let k = 0; k < this.items.length && this.items[this.i] && this.items[this.i].disabled; k++) this.i = (this.i + d + this.items.length) % this.items.length; }
  get rowH() { return F.lineHeight({ scale: this.scale }) + this.gap + (this.scale > 1 ? 4 : 6); }
  update(dt, I = game.input, again) {
    if (!this.active || !this.items.length) return null;
    const n = this.items.length, old = this.i, it = () => this.items[this.i];
    if (I.repeat('up', .3, .12)) { this.i = (this.i + n - 1) % n; this._skip(-1); }
    if (I.repeat('down', .3, .12)) { this.i = (this.i + 1) % n; this._skip(1); }
    const ptr = I.pointer && I.pointer(), moved = I.mouse && I.mouse.t !== this._mt;
    if (moved) { this._mt = I.mouse.t; const k = this.hitRow(ptr); if (k >= 0 && !this.items[k].disabled) this.i = k; }
    if (this.i !== old) game.audio.sfx('move');
    const cur = it(), ck = I.clicked && I.clicked();
    if (cur && cur.options) {
      let d = I.repeat('left', .3, .15) ? -1 : I.repeat('right', .3, .15) ? 1 : 0;
      if (ck) { const k = this.hitRow(ck); if (k === this.i) { const b = this.box[k]; d = ck[0] < b.x + b.w / 2 ? -1 : 1; } }
      if (d) { const os = cur.options, j = Math.max(0, os.findIndex(q => q[0] === cur.value)); cur.value = os[(j + d + os.length) % os.length][0]; game.audio.sfx('move'); if (cur.onChange) cur.onChange(cur.value); return null; }
    }
    const clickRow = ck ? this.hitRow(ck) : -1;
    if (clickRow >= 0 && clickRow !== this.i && !this.items[clickRow].disabled && !this.items[clickRow].options) { this.i = clickRow; return this.update(0, I, true); }
    if ((I.pressed('confirm') || (clickRow >= 0 && clickRow === this.i && !(cur && cur.options))) && cur && !cur.disabled) { if (cur.onPick) { game.audio.sfx('ok'); I.consumeAll(); cur.onPick(cur); } return cur; }
    if (I.pressed('cancel') && this.onCancel) { game.audio.sfx('back'); I.consumeAll(); this.onCancel(); }
    return null;
  }
  hitRow(p) { if (!p) return -1; for (let k = 0; k < this.box.length; k++) { const b = this.box[k]; if (b && p[0] >= b.x && p[0] < b.x + b.w && p[1] >= b.y && p[1] < b.y + b.h) return k; } return -1; }
  draw(g, W, H, o = {}) {
    const rh = this.rowH, w = this.w, x0 = this.x === 'center' ? Math.round((W - w) / 2) : this.x, y0 = this.y, t = game.real;
    this.box = [];
    this.items.forEach((it, k) => {
      const y = y0 + k * rh, sel = k === this.i && this.active, off = it.disabled;
      if (sel) { E.ui.box(g, x0, y - 2, w, rh - 2, { bg: ['#3a3220', '#241c10'], border: '#f2c230', alpha: .92 }); px.blend(g, .3 + .15 * Math.sin(t * 4), 'add', () => px.rect(g, x0 + 2, y - 1, w - 4, 2, '#f2c230')); }
      else if (o.plates !== false) E.ui.box(g, x0, y - 2, w, rh - 2, { bg: '#0a0c18', border: '#2a2a40', alpha: .7 });
      const col = off ? '#6a6878' : sel ? '#ffe9a0' : '#e8e4f0';
      if (it.options) {
        const lab = it.label, val = (it.options.find(q => q[0] === it.value) || it.options[0])[1];
        T(g, lab, x0 + 10, y + 2, col, { scale: this.scale === 2 ? 1 : 1, shadow: '#000' });
        T(g, '◂ ' + val + ' ▸', x0 + w - 10, y + 2, sel ? '#ffffff' : '#c8c0d8', { align: 'right', shadow: '#000' });
      } else {
        T(g, it.label, this.align === 'left' ? x0 + 12 : x0 + w / 2, y + 1, col, { scale: this.scale, align: this.align === 'left' ? 'left' : 'center', shadow: '#000' });
        if (it.badge) T(g, it.badge, x0 + w - 8, y + 4, it.badgeCol || '#f2c230', { align: 'right', shadow: '#000' });
      }
      if (sel && it.sub && o.subs !== false) T(g, it.sub, W / 2, y0 + this.items.length * rh + 4, '#c8d0e8', { align: 'center', shadow: '#000' });
      this.box[k] = { x: x0, y: y - 2, w, h: rh - 2 };
    });
  }
}
DH.BigMenu = BigMenu;
/* ---- scenic backgrounds: the rail renderer at a fixed camera, a train passing now and then ---- */
const SCENES = {
  title: { route: 'halo', s: 20, h: 5.9, dir: -1, x: 3.4, h0: 2.6, horizon: .55, train: { track: 'A', livery: 'h8000', cars: 6, from: -900, to: 0, period: 34 } },
  map: { route: 'halo', s: 14600, h: 17.6, dir: 1, x: 2, h0: 14, horizon: .5, train: { track: 'C', livery: 'skyliner', cars: 6, from: 14200, to: 15200, period: 26 } },
  briefing: null,
  free: { route: 'halo', s: 2500, h: 7.4, dir: 1, x: -16, h0: 9, horizon: .5, train: { track: 'A', livery: 'h8000', cars: 6, from: 2300, to: 3300, period: 22 } },
  log: { route: 'halo', s: 8250, h: 14.2, dir: 1, x: -2, h0: 5, horizon: .5 },
  over: { route: 'halo', s: 6000, h: 21, dir: 1, x: 0, h0: 3, horizon: .5, w: 'fog' },
  duel: { route: 'halo', s: 12300, h: 12, dir: 1, x: 3.5, h0: 16, horizon: .5, train: { track: 'A', livery: 'h8000', cars: 6, from: 12000, to: 13200, period: 18, also: { track: 'C', livery: 'h8000', colour: '#3b82f6' } } }
};
DH.MENU_SCENES = SCENES;
DH.drawScenic = (r, id, o = {}) => {
  const S = Object.assign({}, typeof id === 'string' ? SCENES[id] : id, o); if (!S.route) return;
  const R = DH.route(S.route), rail = DH.railFor(R), G = DH.grade(S.h, S.w || 'clear', S.w === 'fog' ? 1 : 0);
  DH.clockNow = S.h * 3600 + game.real;
  for (const tr in R.signals) for (const sg of R.signals[tr]) sg.aspect = sg.force || (sg.kind === 'start' ? 'R' : 'G');
  const cam = { s: S.s + (S.drift ? game.real * S.drift : 0), x: S.x || 0, h: S.h0 || 2.9, dir: S.dir || 1, horizon: S.horizon || .5, fov: 70 };
  const actors = [];
  if (S.train) { const T0 = S.train, u = (game.real % T0.period) / T0.period, e = u < .7 ? 1 - Math.pow(1 - u / .7, 2) : 1, s = T0.from + (T0.to - T0.from) * (u < .85 ? e : 1 + (u - .85) * 6); const tr = S._tr || (S._tr = Object.assign({ dir: 1, lights: true }, T0)); tr.s = s; actors.push({ items: DH.trainItems(tr, R) }); if (T0.also) { const t2 = S._t2 || (S._t2 = Object.assign({ dir: 1, cars: 6, lights: true }, T0.also)); t2.s = s - 12; actors.push({ items: DH.trainItems(t2, R) }); } }
  const hd = rail.headingAt(R.wrap(cam.s)) + (cam.dir < 0 ? Math.PI : 0), zone = R.segs[rail.segAt(cam.s)].zone;
  rail.draw(r, cam, { grade: DH.railGrade(G), sky: DH.skyFor(G, zone, hd, 1.1, 70), turn: -hd * 300, t: game.time, fogScale: G.fogScale, actors, headlight: false });
};
/* ---- the prompt line along the bottom ---- */
DH.promptLine = (g, W, H, items, o = {}) => { if (DH.touchOnly()) return; DH.Glyph.row(g, items, W / 2, H - 18 - (o.raise || 0), { align: 'center', box: true }); };
/* ---- the idle clock: 10 s with no input on a menu screen starts attract mode ---- */
DH.lastInput = 0; let lastMouse = null;
if (!game.headless && typeof addEventListener === 'function') {
  for (const ev of ['keydown', 'pointerdown', 'wheel', 'touchstart']) addEventListener(ev, () => { DH.lastInput = game.real; }, { capture: true, passive: true });
  addEventListener('pointermove', e => { if (!lastMouse || Math.hypot(e.clientX - lastMouse[0], e.clientY - lastMouse[1]) > 4) { lastMouse = [e.clientX, e.clientY]; DH.lastInput = game.real; } }, { passive: true });
}
DH.idleTick = (dt) => {
  const I = game.input, pad = I.padMove && Math.hypot(I.padMove[0], I.padMove[1]) > 0 || I.padAim;
  if (I.anyPressed() || pad || (I.held && I.held.size)) DH.lastInput = game.real;
  if (game.shell && game.shell.screen) { DH.lastInput = game.real; return; }
  if (DH.hubInfo) return;
  if (game.real - DH.lastInput >= (DH.attractDelay || 10)) { DH.lastInput = game.real; game.go('attract', null, { fade: 'dissolve' }); }
};
/* ---- progress: unlocks, ranks, records, postcards, stats ---- */
const P0 = () => ({ unlocked: ['S0'], ranks: {}, best: {}, stats: { km: 0, stops: 0, perfect: 0, calls: 0 }, postcards: [], cleared: [] });
DH.Progress = {
  get() { const p = DH.store.get('progress', null); return p && p.unlocked ? Object.assign(P0(), p) : P0(); },
  save(p) { DH.store.set('progress', p); },
  unlocked(id) { const p = this.get(); return p.unlocked.includes(id) || (id === 'PR' && p.unlocked.includes('S1')) || !!DH.devUnlockAll; },
  nextCareer() { const p = this.get(); for (const id of DH.CAREER) if (!p.cleared.includes(id)) return id; return 'S5'; },
  /** a career run finished: the rank, records, stats, the next stage unlocked, postcards */
  record(sum, run) {
    if (DH.attractOn || DH.hubInfo) return [];
    const p = this.get(), id = sum.stage, ORDER = 'SABCD';
    if (!sum.over) {
      if (!p.cleared.includes(id) && (!sum.tut || sum.tut.passed)) p.cleared.push(id);
      const i = DH.CAREER.indexOf(id); if (i >= 0 && DH.CAREER[i + 1] && !p.unlocked.includes(DH.CAREER[i + 1])) p.unlocked.push(DH.CAREER[i + 1]);
      if (!p.ranks[id] || ORDER.indexOf(sum.rank) < ORDER.indexOf(p.ranks[id])) p.ranks[id] = sum.rank;
      const b = p.best[id] || {}; p.best[id] = { score: Math.max(b.score || 0, sum.score), err: b.err === undefined || sum.best !== null && sum.best < b.err ? sum.best : b.err, perfect: Math.max(b.perfect || 0, sum.perfect) };
    }
    this._stats(p, sum);
    const got = this.checkCards(p, sum, run); this.save(p); return got;
  },
  recordFree(sum, run) { if (DH.attractOn || DH.hubInfo) return []; const p = this.get(); this._stats(p, sum); const got = this.checkCards(p, sum, run); this.save(p); return got; },
  _stats(p, sum) { p.stats.km += sum.km; p.stats.stops += sum.judgments.filter(j => !j.tut).length; p.stats.perfect += sum.perfect; p.stats.calls += sum.calls.made; },
  /** postcards: which conditions this run met (each card once) */
  checkCards(p, sum, run) {
    const got = [], give = n => { if (!p.postcards.includes(n)) { p.postcards.push(n); got.push(n); } }, J = sum.judgments.filter(j => !j.tut), id = sum.stage;
    if (sum.over) return got;
    if (J.some(j => j.key === 'perfect')) give(1);
    if (id === 'S1' && J.some(j => j.station === 'hanabatake' && (j.key === 'perfect' || j.key === 'great'))) give(2);
    if (id === 'S2' && !J.some(j => j.key === 'overrun' || j.key === 'over') && !(run && run.train.st.slideCount)) give(3);
    if (id === 'S3' && sum.misc.hazard) give(4);
    if (id === 'S4' && J.length && J.every(j => j.timeKey === 'ontime')) give(5);
    if (id === 'S5') give(6);
    if (!sum.tut && sum.calls.possible > 0 && sum.calls.great >= sum.calls.possible) give(7);
    if (J.length && J.every(j => j.smooth)) give(8);
    return got;
  },
  reset() { this.save(P0()); DH.store.set('tips', []); DH.store.set('board', null); }
};
/* ---- the attract table: today's best drivers ---- */
DH.board = () => { const b = DH.store.get('board', null); return Array.isArray(b) && b.length ? b : [['HOSHINO', 99990], ['SATO', 88420], ['AOBA', 71250], ['KUROSAWA', 66800], ['OTA', 52100]]; };
DH.boardAdd = (name, score) => { if (DH.attractOn || DH.hubInfo) return; const b = DH.board().slice(); b.push([name, score]); b.sort((x, y) => y[1] - x[1]); DH.store.set('board', b.slice(0, 5)); };
/* ---- the stage card (briefing, halo map, free run) ---- */
DH.stageCard = (g, x, y, w, id, o = {}) => {
  const S = DH.STAGES[id], p = DH.Progress.get(), h = o.h || 116, tr = DH.TRAINS[o.train || S.train], tod = o.tod !== undefined ? o.tod : S.tod, wx = o.weather || S.weather;
  E.ui.box(g, x, y, w, h, { bg: ['#141a3a', '#0a0c18'], border: '#f2c230', alpha: .92 });
  T(g, id === 'S0' ? 'TUTORIAL' : id === 'PR' ? 'FESTIVAL' : 'STAGE ' + id.slice(1), x + 8, y + 6, '#f2c230', { font: 'tiny' });
  T(g, S.name, x + 8, y + 14, '#ffffff', { scale: w > 180 ? 2 : 1, shadow: '#000' });
  const rows = [['TIME', DH.clockStr(DH.parseClock(S.stops[0].dep), false) + '  ' + DH.todName(tod)], ['WEATHER', wx.toUpperCase()], ['TRAIN', tr.name + '  ' + (o.cars || S.cars) + ' CARS'], ['STOPS', S.stops.slice(1).map(q => DH.route(S.route).stations.find(st => st.id === q.id).name).join(', ')]];
  let ry = y + 34; rows.forEach(([a, b], i) => { T(g, a, x + 8, ry, '#8a90b0'); const lines = F.wrap(b, w - 74).slice(0, i === 3 ? 2 : 1); lines.forEach((ln, k) => T(g, ln, x + 66, ry + k * 10, '#e8e4f0')); ry += 12 + (lines.length - 1) * 10; });
  const rk = p.ranks[id]; T(g, 'BEST', x + 8, y + h - 16, '#8a90b0'); if (rk) DH.stamp(g, x + w - 26, y + h - 26, rk, 1, 0); else T(g, '--', x + 66, y + h - 16, '#6a6a7a');
  if (p.best[id]) T(g, String(p.best[id].score), x + 66, y + h - 16, '#ffe08a');
  // the weather and time icons
  const ix = x + w - 22, iy = y + 8; if (wx === 'rain') { px.disc(g, ix, iy + 4, 5, '#8a96a8'); for (let k = 0; k < 3; k++) px.line(g, ix - 3 + k * 3, iy + 9, ix - 4 + k * 3, iy + 13, '#6aa8ff'); } else if (tod > 19 || tod < 5) { px.disc(g, ix, iy + 5, 5, '#f2ecd8'); px.disc(g, ix + 2, iy + 4, 4, '#141a3a'); } else { px.disc(g, ix, iy + 5, 5, tod > 16.5 ? '#ff9a4a' : '#ffe070'); }
};
/** the red hanko rank stamp */
DH.stamp = (g, cx, cy, rank, scale = 1, rot = 0) => {
  const r = Math.round(14 * scale), c = '#d02a2a';
  for (let a = 0; a < 40; a++) { const t = a / 40 * Math.PI * 2; for (const rr of [r, r - 1]) px.dot(g, cx + Math.cos(t) * rr, cy + Math.sin(t) * rr, c); }
  F.title(g, rank, Math.round(cx), Math.round(cy - 7 * scale), { scale: Math.max(1, Math.round(2 * scale)), align: 'center', colors: ['#ff6a5a', '#d02a2a', '#a01a1a'], depth: 0 });
};
DH.showHelp = () => {
  const L = DH.Glyph.label, I = game.input;
  const keys = [[L('lever'), 'Lever: power up, brake down (' + (game.settings.leverDir === 'brakeUp' ? 'Up = Brake' : 'Up = Power') + ')'], [I.label('up') + ' / ' + I.label('down'), 'Lever up / down'], [L('neutral'), 'Lever to N'], [L('eb'), 'Emergency brake'], [L('call'), 'Point and call'], [L('horn'), 'Horn (hold)'], [L('ats'), 'ATS confirm'], [L('view'), 'Change view'], ['Right stick / right-drag', 'Glance around'], [I.label('pause'), 'Pause']];
  const show = () => game.shell.show('help', { title: 'How to Drive', keys, sections: [
    ['The lever', 'One lever from EB through the brakes (B8 to B1) and N to power (P1 to P5). Power pulls slowly at first; the brakes take a moment to bite and a moment to let go. You cannot steer, reverse, or work the doors: the track, the computer and your conductor do that.'],
    ['Stop on the mark', 'The Stop Gauge appears 600 m out. Put the nose on the 6 (or the 10 for ten cars). Within 10 cm is a PERFECT HALO. Ease to B1 just before you stop for a SMOOTH stop. Short? Creep up. Far over? The train backs up, at a cost.'],
    ['Be on time', 'Arrive within 2 seconds of the timetable for ON TIME. Late costs Halo Time; early earns nothing. Halo Time is your life: stops, calls and the horn earn it; mistakes spend it. At zero, the instructor takes the key.'],
    ['Point and call', 'When a bracket appears round a signal or a board, point and call it. 120 to 60 m ahead is GREAT. At departure, call the starting signal before you power.'],
    ['Signals and ATS', 'Four lamps: G green (line speed), YG (65), Y (45), YY (25), R (stop). Passing a red signal\'s beacon rings the ATS bell: confirm within 5 seconds or the ATS stops the train. Never pass a red.']
  ], actions: [['Back', () => game.shell.back()]] });
  if (game.shell) show();
};
})();
