/* The game object, shared UI helpers and every non-driving scene: title, Halo map, free run, briefing, results, game over, ending, log, help, about. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, px = E.px, R = DH.route, clamp = E.clamp, txt = DH.txt;
const hubOn = () => !!(window.AIHub && AIHub.active);
DH.hubOn = hubOn;

const game = DH.game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'side', bg: '#05070d', input: DH.KEYS,
  menu: {
    items: () => DH.pauseItems ? DH.pauseItems() : [],
    settings: DH.SETTINGS,
    controls: { power: 'Lever: power (R2)', brake: 'Lever: brake (L2)', neutral: 'Neutral', eb: 'Emergency brake', call: 'Point and call', horn: 'Horn', ats: 'ATS confirm', view: 'Change view', up: 'Up (menus, lever)', down: 'Down (menus, lever)', left: 'Left (menus)', right: 'Right (menus)', confirm: 'Confirm', cancel: 'Back', start: false },
    quit: hubOn() ? false : 'title'
  }
});
DH.scenes = {};
const A = game.audio, I = game.input;
const scenes = DH.scenes;
I.glyphs = 'playstation';

/* ---------- idle detection: ten seconds on a menu screen starts the attract mode ---------- */
let idle = 0, lastMouse = -1;
DH.idleTick = (dt, can = true) => {
  const pt = I.mouse && I.mouse.t;
  if (I.anyPressed() || pt !== lastMouse || I.clicked()) { idle = 0; lastMouse = pt; } else idle += dt;
  if (can && idle > 10 && !hubOn()) { idle = 0; game.go('attract', null, { fade: 'wipe' }); }
};
DH.idleReset = () => { idle = 0; };

/* ---------- a list that works with pad, keys and mouse ---------- */
class ListMenu {
  constructor(items, o = {}) { this.items = items; this.i = o.start || 0; this.o = o; this.rects = []; this._mt = -1; }
  update() {
    const n = this.items.length, old = this.i; if (!n) return;
    if (I.repeat('up', .3, .12)) { do this.i = (this.i + n - 1) % n; while (this.items[this.i].disabled && this.i !== old); }
    if (I.repeat('down', .3, .12)) { do this.i = (this.i + 1) % n; while (this.items[this.i].disabled && this.i !== old); }
    const p = I.pointer(); if (I.mouse.t !== this._mt) { this._mt = I.mouse.t; const k = this.rects.findIndex(r => p && p[0] >= r.x && p[0] < r.x + r.w && p[1] >= r.y && p[1] < r.y + r.h); if (k >= 0 && !this.items[k].disabled) this.i = k; }
    const c = I.clicked(); let clicked = -1; if (c) clicked = this.rects.findIndex(r => c[0] >= r.x && c[0] < r.x + r.w && c[1] >= r.y && c[1] < r.y + r.h);
    if (clicked >= 0 && !this.items[clicked].disabled) this.i = clicked;
    if (this.i !== old) A.sfx('select');
    if (I.repeat('left', .3, .12) && this.o.onSide) this.o.onSide(-1, this.i);
    if (I.repeat('right', .3, .12) && this.o.onSide) this.o.onSide(1, this.i);
    if ((I.pressed('confirm') || (clicked >= 0 && !this.items[clicked].disabled)) && !this.items[this.i].disabled) { A.sfx('confirm'); I.consumeAll(); if (this.o.onPick) this.o.onPick(this.i, this.items[this.i]); }
    else if (I.pressed('cancel') && this.o.onCancel) { A.sfx('cancel'); I.consumeAll(); this.o.onCancel(); }
  }
  draw(g, x, y, w, rowH = 18) {
    this.rects = [];
    this.items.forEach((it, k) => {
      const on = k === this.i, ry = y + k * rowH, label = typeof it.label === 'function' ? it.label() : it.label;
      this.rects.push({ x, y: ry, w, h: rowH - 1 });
      px.rect(g, x, ry, w, rowH - 2, on ? '#ffd23acc' : '#0b1020b0'); if (on) px.rect(g, x, ry, 3, rowH - 2, '#fff6c0');
      txt(g, label, x + 10, ry + (rowH - 9) / 2 - (it.sub && rowH > 21 ? 3 : 0), it.disabled ? '#5a6278' : on ? '#10131a' : '#eef2fa', { shadow: on ? null : '#000' });
      if (it.sub && rowH > 21) txt(g, typeof it.sub === 'function' ? it.sub() : it.sub, x + 10, ry + rowH - 10, on ? '#3a3a2a' : '#8a96b0', { font: 'tiny', shadow: null });
      if (it.right) { const rs = typeof it.right === 'function' ? it.right() : it.right; txt(g, rs, x + w - 8, ry + (rowH - 9) / 2, on ? '#10131a' : '#ffd36a', { align: 'right', shadow: null }); }
    });
  }
}
DH.ListMenu = ListMenu;

/* ---------- the backdrop: the autopilot drives the Halo Line forever behind every menu ---------- */
const BG = DH.BG = { run: null, clock: 7 * 3600, t: 0, view: 0, vt: 0, wx: 'clear' };
DH.bgStep = (dt) => {
  if (!BG.run || BG.run.failed || BG.run.finished) { BG.run = new DH.Run(DH.stageById('S0'), { difficulty: 'Normal' }); BG.run.stage = Object.assign({}, BG.run.stage); BG.run.lead = null; BG.run.obs = null; BG.run.slow = null; BG.run.cal = true; }
  const run = BG.run; run.cal = true; run.depSched = 0;
  for (let i = 0; i < 4; i++) { DH.autopilot(run, { cheat: true }); run.step(dt / 4, { horn: run.autoHorn }); }
  if (run.finished) { BG.run = null; }
  BG.clock += dt * 40; BG.t += dt; BG.vt += dt;
  if (BG.vt > 11) { BG.vt = 0; BG.view = (BG.view + 1) % 3; }
};
const VIEWS = ['cab', 'chase', 'front'];
DH.VIEWS = VIEWS;
DH.camFor = (view, run, t, shake = 0) => {
  switch (view) {
    case 'chase': return { s: run.s - run.T.len - 26, h: 7.5, dir: 1, horizon: .34, pitch: 0, fov: 66, camX: 0, headlight: false, lookX: 0 };
    case 'front': return { s: run.s + 70 + Math.min(40, run.v * 1.2), h: 3.6, dir: -1, horizon: .5, fov: 62, camX: 4.2, headlight: false, lookX: 0 };
    default: return { s: run.s - 1.5, h: 2.9, dir: 1, horizon: .40, fov: 75, camX: 0, headlight: true, lookX: shake, pitch: 0 };
  }
};
DH.trainsFor = (run, view, ghosts) => {
  const out = [];
  if (view !== 'cab') out.push({ s: run.s, len: run.T.len, x: 0, T: run.T, body: run.T.body, stripe: run.T.stripe, lit: FR_NIGHT(run), beam: true });
  if (run.lead) out.push({ s: run.lead.s, len: run.lead.len, x: 0, T: DH.TRAINS.H5, lit: FR_NIGHT(run) });
  for (const o of run.oncoming) out.push({ s: o.s, len: o.len, x: 3.8, T: DH.TRAINS.L3, rev: true, body: '#e8e0f0', stripe: '#8a52b8', lit: FR_NIGHT(run), facing: 'toward' });
  for (const gh of ghosts || []) out.push({ s: gh.s, len: gh.len || 120, x: gh.lane * 3.8, T: DH.TRAINS.H5, body: gh.color, stripe: '#fff', lit: true });
  return out;
};
function FR_NIGHT(run) { return DH.todAt(run.clock).light < .5; }
DH.drawBackdrop = (g, W, H, dim = .45) => {
  const run = BG.run; if (!run) return;
  const view = VIEWS[BG.view], cam = DH.camFor(view, run, BG.t);
  DH.drawWorld(g, W, H, cam, { run, weather: BG.wx, clock: BG.clock, time: BG.t, trains: DH.trainsFor(run, view), draw: 200 });
  if (view === 'cab') { px.rect(g, 0, H - Math.round(H * .31), W, Math.round(H * .31), '#181b24'); px.rect(g, 0, H - Math.round(H * .31), W, 2, '#3a4152'); }
  px.blend(g, dim, 'normal', () => px.rect(g, 0, 0, W, H, '#050810'));
};
const wrapSteps = (list, i, d) => (i + d + list.length) % list.length;

/* ---------- title ---------- */
DH.touchOnly = () => I.lastDevice === 'touch' || (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches && I.lastDevice !== 'keyboard' && I.lastDevice !== 'gamepad');
const hasSave = () => DH.save.get().plays > 0;
scenes.title = {
  input: DH.KEYS, res: 'ps1', expand: true,
  enter() {
    A.music(DH.SONGS.title); DH.soundStop(); idle = 0; game.follow(null); game.focus(0, 0, 0);
    this.menu = new ListMenu([
      { label: () => hasSave() ? 'CAREER: CONTINUE' : 'CAREER: NEW GAME', sub: 'Five shifts around the ring' },
      { label: 'FREE RUN', sub: 'Pick a stage, train, weather, time' },
      { label: "DRIVER'S LOG", sub: 'Records, postcards' },
      { label: 'HOW TO DRIVE', sub: 'Controls and rules' },
      { label: 'SETTINGS', sub: 'Sound, glyphs, lever direction' },
      { label: 'ABOUT & CREDITS', sub: 'About this game' },
      { label: 'LOCAL DUEL', sub: 'Two players, one keyboard, split screen' }
    ], { onPick: i => this.pick(i) });
    this.t = 0;
  },
  pick(i) {
    if (I.lastDevice === 'touch' && i !== 4) { DH.toast = { text: 'Controller or keyboard required', life: 3 }; return; }
    if (i === 0) game.go('halomap', null, { fade: 'wipe' });
    else if (i === 1) game.go('freerun'); else if (i === 2) game.go('log'); else if (i === 3) game.go('help', { from: 'title' }); else if (i === 4) game.menu('settings'); else if (i === 5) game.go('about'); else game.go('duel');
  },
  update(dt) {
    this.t += dt; DH.bgStep(dt);
    const to = DH.touchOnly(); this.menu.items.forEach((it, k) => { it.disabled = to && k !== 4; }); if (to) this.menu.i = 4;
    if (DH.toast) { DH.toast.life -= dt; if (DH.toast.life <= 0) DH.toast = null; }
    DH.idleTick(dt); this.menu.update();
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; DH.drawBackdrop(g, W, H, .38);
      const cx = W / 2, by = 14;
      E.font.title(g, 'DENSHA DE', cx, by, { align: 'center', scale: 3, colors: ['#ffffff', '#bfeaf4', '#27b3c6'], depth: 2, depthColor: '#0a2a34' });
      E.font.title(g, 'HALO!', cx, by + 28, { align: 'center', scale: 5, colors: ['#fffbe0', '#ffd23a', '#ff9a1a'], depth: 3, depthColor: '#4a2a00' });
      const hx = cx + 88, hy = by + 50; px.blend(g, .5, 'add', () => px.disc(g, hx, hy, 17, '#ffe58a')); for (let q = 0; q < 2; q++) px.ell(g, hx, hy - 7 + Math.sin(this.t * 2) * 1.5, 22 - q * 2, 6 - q, q ? '#ffd23a' : '#fff6c0');
      txt(g, 'ALL ABOARD THE HALO LINE', cx, by + 76, '#d9f2f8', { align: 'center' });
      const mw = 190, mx = Math.round(cx - mw / 2), my = by + 88;
      this.menu.draw(g, mx, my, mw, 16); txt(g, this.menu.items[this.menu.i].sub, cx, my + 7 * 16 + 2, '#9fd8ff', { align: 'center', font: 'tiny' });
      if (DH.touchOnly()) { px.rect(g, 0, H / 2 - 16, W, 32, '#000c'); txt(g, 'Controller or keyboard required', cx, H / 2 - 4, '#ffd36a', { align: 'center', scale: 2 }); txt(g, 'Open SETTINGS below, or wait for the demo', cx, H / 2 + 12, '#fff', { align: 'center', font: 'tiny' }); }
      DH.promptLine(g, [['confirm', 'SELECT'], ['up', 'MOVE']], cx, H - 10, 'center');
      txt(g, 'v' + DH.VERSION + '   ' + E.versionLabel(), 4, H - 8, '#6a7a90', { font: 'tiny' });
      txt(g, 'Idle 10 s: demo', W - 4, H - 8, '#6a7a90', { font: 'tiny', align: 'right' });
      if (DH.toast) txt(g, DH.toast.text, cx, H - 26, '#ffd36a', { align: 'center' });
    });
  }
};

/* ---------- the ring map: pick a stage ---------- */
const STAGE_COLORS = ['#58e07a', '#4aa0e8', '#f2c230', '#ff8a3a', '#b86aff', '#ff4a6a'];
function drawRing(g, cx, cy, rx, ry, selStage, t) {
  const pos = i => { const a = -Math.PI / 2 + (R.stations[i].s - 400 + 0) / R.length * Math.PI * 2; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; };
  const posS = s => { const a = -Math.PI / 2 + (R.wrap(s) - 400) / R.length * Math.PI * 2; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; };
  px.blend(g, .4, 'normal', () => px.ell(g, cx, cy, rx + 6, ry + 6, '#0b1020'));
  for (let a = 0; a < 360; a += 3) { const q = posS(400 + a / 360 * R.length), q2 = posS(400 + (a + 3) / 360 * R.length); px.line(g, q[0], q[1], q2[0], q2[1], '#58637c', 3); }
  const dest = selStage ? [selStage.from].concat(selStage.stops) : [];
  if (selStage) { const s0 = R.markerOf(selStage.from); let total = 0; for (let k = 0; k < selStage.stops.length; k++) { total = R.fwd(s0, R.markerOf(selStage.stops[k])); if (total === 0) total = R.length; } for (let d = 0; d <= total; d += 25) { const q = posS(s0 + d), q2 = posS(s0 + d + 25); px.line(g, q[0], q[1], q2[0], q2[1], '#ffd23a', 3); } }
  R.stations.forEach((st, i) => { const p = pos(i), on = dest.includes(i); px.disc(g, p[0], p[1], on ? 5 : 3, on ? '#ffd23a' : '#d9e0ee'); px.disc(g, p[0], p[1], on ? 3 : 1, on ? '#fff6c0' : '#58637c'); if (on || true) { const a = -Math.PI / 2 + (st.s - 400) / R.length * Math.PI * 2, tx = cx + Math.cos(a) * (rx + 10), ty = cy + Math.sin(a) * (ry + 9); txt(g, st.name, tx, ty - 3, on ? '#fff6c0' : '#8a96b0', { font: 'tiny', align: Math.cos(a) > .3 ? 'left' : Math.cos(a) < -.3 ? 'right' : 'center' }); } });
  DH.haloIcon(g, cx, cy, 12); txt(g, 'HALO LINE', cx, cy + 16, '#d9e0ee', { align: 'center', font: 'tiny' }); txt(g, (R.length / 1000).toFixed(1) + ' km loop', cx, cy + 24, '#8a96b0', { align: 'center', font: 'tiny' });
  if (selStage) { const t0 = (t * .18) % 1, q = posS(R.markerOf(selStage.from) + t0 * 2000); px.disc(g, q[0], q[1], 3, '#ff5a4a'); }
}
scenes.halomap = {
  input: DH.KEYS, res: 'ps1', expand: true,
  enter() {
    const sv = DH.save.get(); this.sv = sv; this.t = 0;
    const items = DH.STAGES.filter(s => !s.parallel).map(s => ({ label: s.id + '  ' + s.title.toUpperCase(), disabled: s.n > sv.unlocked, right: sv.best[s.id] ? sv.best[s.id].rank : s.n > sv.unlocked ? 'LOCKED' : '', stage: s }));
    this.menu = new ListMenu(items, { start: Math.min(sv.unlocked, items.length - 1), onPick: (i, it) => game.go('briefing', { stage: it.stage, career: true }, { fade: 'wipe' }), onCancel: () => game.go('title') });
  },
  update(dt) { this.t += dt; DH.bgStep(dt); DH.idleTick(dt); this.menu.update(); },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; DH.drawBackdrop(g, W, H, .6);
      txt(g, 'THE HALO LINE', 12, 10, '#ffd36a', { scale: 2 }); txt(g, 'Choose your shift', 12, 28, '#d9e0ee');
      this.menu.draw(g, 10, 42, Math.min(200, W * .46), 21);
      const st = this.menu.items[this.menu.i].stage, tr = DH.TRAINS[st.train];
      drawRing(g, Math.round(W - 128), Math.round(H * .44), 66, 52, st, this.t);
      const ix = 10, iy = 42 + this.menu.items.length * 21 + 4;
      px.rect(g, ix, iy, Math.min(200, W * .46), 50, '#0b1020c0');
      txt(g, st.brief.length > 0 ? wrapOne(st.brief, 46)[0] : '', ix + 5, iy + 3, '#d9e0ee', { font: 'tiny' }); const wl = wrapOne(st.brief, 46); for (let k = 1; k < Math.min(wl.length, 4); k++) txt(g, wl[k], ix + 5, iy + 3 + k * 8, '#d9e0ee', { font: 'tiny' });
      txt(g, tr.name + ' / ' + (DH.WEATHER[st.weather].name) + ' / ' + DH.fmtClock(st.tod) + ' / ' + st.stops.length + ' stops', ix + 5, iy + 39, '#ffd36a', { font: 'tiny' });
      DH.promptLine(g, [['confirm', 'START'], ['cancel', 'BACK']], W / 2, H - 8, 'center');
    });
  }
};
function wrapOne(s, n) { const w = s.split(' '), out = []; let cur = ''; for (const x of w) { if ((cur + ' ' + x).length > n) { out.push(cur); cur = x; } else cur = (cur ? cur + ' ' : '') + x; } if (cur) out.push(cur); return out; }
DH.wrapText = wrapOne;

/* ---------- free run ---------- */
const TODS = [['Stage default', null], ['Dawn 06:00', 6 * 3600], ['Morning 09:00', 9 * 3600], ['Noon 12:30', 12.5 * 3600], ['Dusk 18:20', 18.33 * 3600], ['Night 22:00', 22 * 3600]];
scenes.freerun = {
  input: DH.KEYS, res: 'ps1', expand: true,
  enter() {
    this.sv = DH.save.get(); this.o = { stage: 0, train: 0, tod: 0, wx: 0, diff: 1 }; this.t = 0;
    const trains = [null, 'H5', 'X7', 'L3'], wxs = [null, 'clear', 'rain', 'fog', 'storm'], diffs = ['Easy', 'Normal', 'Hard'];
    this.stages = DH.STAGES.filter(s => !s.parallel && s.n <= this.sv.unlocked);
    this.opts = () => ({ stage: this.stages[this.o.stage], train: trains[this.o.train], tod: TODS[this.o.tod][1], weather: wxs[this.o.wx], difficulty: diffs[this.o.diff] });
    const cyc = (k, len) => (d) => { this.o[k] = (this.o[k] + d + len) % len; };
    const rows = [['stage', this.stages.length, () => { const s = this.stages[this.o.stage]; return s.id + ' ' + s.title; }, 'STAGE'], ['train', 4, () => trains[this.o.train] ? DH.TRAINS[trains[this.o.train]].name : 'Stage default', 'TRAIN'], ['tod', TODS.length, () => TODS[this.o.tod][0], 'TIME OF DAY'], ['wx', 5, () => wxs[this.o.wx] ? DH.WEATHER[wxs[this.o.wx]].name : 'Stage default', 'WEATHER'], ['diff', 3, () => diffs[this.o.diff], 'DIFFICULTY']];
    const items = rows.map(r => ({ label: r[3], right: () => '< ' + r[2]() + ' >', k: r[0], len: r[1] })); items.push({ label: 'START RUN', right: '' });
    this.menu = new ListMenu(items, { onSide: (d, i) => { const it = items[i]; if (it.k) { cyc(it.k, it.len)(d); A.sfx('select'); } }, onPick: (i, it) => { if (it.k) { cyc(it.k, it.len)(1); } else { const o = this.opts(); game.go('drive', { stage: o.stage, opts: o, free: true }, { fade: 'wipe' }); } }, onCancel: () => game.go('title') });
  },
  update(dt) { this.t += dt; DH.bgStep(dt); DH.idleTick(dt); this.menu.update(); },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; DH.drawBackdrop(g, W, H, .6);
      txt(g, 'FREE RUN', 12, 10, '#ffd36a', { scale: 2 }); txt(g, 'Pick your own conditions. Records are not kept here.', 12, 28, '#d9e0ee', { font: 'tiny' });
      this.menu.draw(g, 10, 44, Math.min(300, W - 20), 24);
      const st = this.stages[this.o.stage]; const tr = DH.TRAINS[this.opts().train || st.train];
      txt(g, tr.name + ' (' + tr.kind + ')  max ' + tr.maxKmh + ' km/h, ' + tr.pn + ' power notches', 12, 44 + 6 * 24 + 6, '#ffd36a', { font: 'tiny' });
      txt(g, tr.blurb, 12, 44 + 6 * 24 + 16, '#d9e0ee', { font: 'tiny' });
      DH.promptLine(g, [['left', 'CHANGE'], ['confirm', 'SELECT'], ['cancel', 'BACK']], W / 2, H - 8, 'center');
    });
  }
};

/* ---------- briefing: the dialog, then the stage card ---------- */
scenes.briefing = {
  input: DH.KEYS, res: 'ps1', expand: true,
  enter(d) {
    this.d = d; this.stage = d.stage; this.t = 0; this.phase = 'talk'; this.idx = -1; this.lines = (DH.STORY[this.stage.id] || { brief: [] }).brief;
    this.rigs = {}; for (const k in DH.CAST) this.rigs[k] = null;
    this.talk = new E.Dialog(game, { speed: 42, voice: (ch) => DH.voiceChar(ch, this.who), place: 'bottom', lines: 3, bg: '#101a30', border: '#27b3c6' });
    A.music(DH.SONGS.drive); this.next();
  },
  rig(k) { return this.rigs[k] || (this.rigs[k] = DH.CAST[k].rig()); },
  next() {
    this.idx++; if (this.idx >= this.lines.length) { this.phase = 'card'; return; }
    const [who, text] = this.lines[this.idx]; this.who = DH.CAST[who].voice; this.talk.say([text], { name: DH.CAST[who].name, portrait: this.rig(who), portraitSize: 44, onDone: () => this.next() });
  },
  go() { game.go('drive', { stage: this.stage, opts: { difficulty: game.settings.difficulty || 'Normal' }, career: this.d.career, retryFrom: this.d.retryFrom }, { fade: 'wipe' }); },
  update(dt) {
    this.t += dt; DH.bgStep(dt);
    if (this.phase === 'talk') { if (I.pressed('cancel')) { this.talk.close(); this.phase = 'card'; return; } this.talk.update(dt); this.rig(this.lines[Math.max(0, Math.min(this.idx, this.lines.length - 1))] ? this.lines[Math.max(0, Math.min(this.idx, this.lines.length - 1))][0] : 'hoshino').update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0 }); }
    else { if (I.pressed('confirm') || I.clicked()) { I.consumeAll(); A.sfx('confirm'); this.go(); } else if (I.pressed('cancel')) { game.go(this.d.career ? 'halomap' : 'freerun'); } }
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; DH.drawBackdrop(g, W, H, .55);
      const st = this.stage, tr = DH.TRAINS[(this.d.opts && this.d.opts.train) || st.train];
      txt(g, st.sub.toUpperCase(), W / 2, 18, '#27b3c6', { align: 'center' });
      E.font.title(g, st.title.toUpperCase(), W / 2, 30, { align: 'center', scale: 2, colors: ['#fffbe0', '#ffd23a', '#ff9a1a'], depth: 2, depthColor: '#4a2a00' });
      if (this.phase === 'card') {
        const bw = Math.min(300, W - 30), bx = (W - bw) / 2, by = 64; px.rect(g, bx, by, bw, 100, '#0b1020d8'); px.rect(g, bx, by, bw, 2, '#27b3c6');
        const wl = wrapOne(st.brief, 52); wl.forEach((l, k) => txt(g, l, bx + 8, by + 8 + k * 9, '#d9e0ee', { font: 'tiny' }));
        const rows = [['TRAIN', tr.name + ' / ' + tr.kind], ['STOPS', st.stops.map(i => R.stations[i].name).join(', ')], ['START', DH.fmtClock(st.tod) + ' at ' + R.stations[st.from].name], ['WEATHER', DH.WEATHER[st.weather].name]];
        rows.forEach((rw, k) => { txt(g, rw[0], bx + 8, by + 46 + k * 11, '#ffd36a', { font: 'tiny' }); const l = wrapOne(rw[1], 44)[0]; txt(g, l, bx + 56, by + 46 + k * 11, '#fff', { font: 'tiny' }); });
        DH.promptLine(g, [['confirm', 'TAKE THE CAB'], ['cancel', 'BACK']], W / 2, by + 112, 'center');
      } else { px.rect(g, 0, H - 100, W, 100, '#0000'); this.talk.draw(r); DH.promptLine(g, [['confirm', 'NEXT'], ['cancel', 'SKIP']], W - 8, 8, 'right'); }
    });
  }
};

/* ---------- results ---------- */
scenes.results = {
  input: DH.KEYS, res: 'ps1', expand: true,
  enter(d) {
    this.d = d; this.sum = d.sum; this.stage = d.stage; this.t = 0; this.k = 0; A.music(DH.SONGS.results);
    const items = [];
    if (d.career && this.sum.rank !== 'F') items.push({ label: this.stage.n >= 5 ? 'FINISH THE RING' : 'NEXT SHIFT', k: 'next' });
    items.push({ label: 'RETRY STAGE', k: 'retry' }); items.push({ label: d.career ? 'HALO MAP' : 'FREE RUN', k: 'map' }); items.push({ label: 'TITLE', k: 'title' });
    this.menu = new ListMenu(items, { onPick: (i, it) => this.pick(it.k) });
    const sv = DH.save.update(s => { s.plays++; s.stops += this.sum.stops; s.perfect += this.sum.perfect; s.km += (d.km || 0);
      if (d.career && this.sum.rank !== 'F') { s.unlocked = Math.max(s.unlocked, Math.min(5, this.stage.n + 1)); const b = s.best[this.stage.id]; if (!b || this.sum.score > b.score) s.best[this.stage.id] = { score: this.sum.score, rank: this.sum.rank }; if ('SAB'.includes(this.sum.rank) && !s.cards.includes(this.stage.id)) s.cards.push(this.stage.id); } });
    this.newCard = d.career && 'SAB'.includes(this.sum.rank);
    if (this.sum.rank === 'F') DH.sfx.fail(); else DH.sfx.win();
  },
  pick(k) {
    if (k === 'next') { if (this.stage.n >= 5) game.go('ending'); else game.go('briefing', { stage: DH.STAGES[this.stage.n + 1], career: true }, { fade: 'wipe' }); }
    else if (k === 'retry') game.go('briefing', { stage: this.stage, career: this.d.career }, { fade: 'wipe' });
    else if (k === 'map') game.go(this.d.career ? 'halomap' : 'freerun'); else game.go('title');
  },
  update(dt) { this.t += dt; this.k += dt * .5; DH.bgStep(dt); DH.idleTick(dt, false); this.menu.update(); },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; DH.drawBackdrop(g, W, H, .7);
      const s = this.sum, st = this.stage;
      txt(g, st.title.toUpperCase() + ' - SHIFT COMPLETE', 12, 8, '#ffd36a', { scale: 1 });
      // rank
      const rc = { S: ['#fffbe0', '#ffd23a', '#ff9a1a'], A: ['#f4f8ff', '#c8d4e8', '#8a98b4'], B: ['#fff0e0', '#e0a070', '#a8632e'], C: ['#e8f0f0', '#9ab0b0', '#5a7878'], F: ['#ffe0e0', '#ff6a6a', '#c82a2a'] }[s.rank];
      E.font.title(g, s.rank, 46, 26, { align: 'center', scale: 6, colors: rc, depth: 3, depthColor: '#10131a' });
      txt(g, DH.RANKS[s.rank], 46, 76, '#fff', { align: 'center', font: 'tiny' });
      DH.haloIcon(g, 46, 98, 11);
      txt(g, 'SCORE ' + s.score, 12, 118, '#fff', { scale: 1 }); txt(g, 'Halo Time left ' + s.halo + '   Comfort ' + s.comfort + '%', 12, 130, '#d9e0ee', { font: 'tiny' }); txt(g, 'PERFECT stops ' + s.perfect + '/' + s.stops + '   Calls ' + s.calls + ' (missed ' + s.callsMissed + ')', 12, 139, '#d9e0ee', { font: 'tiny' });
      // stops table
      const tx = 100, tw = Math.min(W - tx - 10, 310); px.rect(g, tx, 20, tw, 12 + s.results.length * 12, '#0b1020d0');
      txt(g, 'STATION', tx + 4, 23, '#8a96b0', { font: 'tiny' }); txt(g, 'MARK', tx + tw * .5, 23, '#8a96b0', { font: 'tiny' }); txt(g, 'TIME', tx + tw * .68, 23, '#8a96b0', { font: 'tiny' }); txt(g, 'RIDE', tx + tw * .86, 23, '#8a96b0', { font: 'tiny' });
      s.results.forEach((q, k) => { const y = 33 + k * 12; txt(g, q.name, tx + 4, y, '#fff', { font: 'tiny' }); txt(g, q.grade + ' ' + (q.e > 0 ? '+' : '') + Math.round(q.e * 100) + 'cm', tx + tw * .5, y, q.grade === 'PERFECT' ? '#ffd23a' : q.grade === 'OVERRUN' || q.grade === 'SHORT' ? '#ff7a6a' : '#9ef0c0', { font: 'tiny' }); txt(g, q.timeGrade, tx + tw * .68, y, q.timeGrade === 'ON TIME' ? '#9ef0c0' : '#ffb090', { font: 'tiny' }); txt(g, q.smooth, tx + tw * .86, y, q.smooth === 'SMOOTH' ? '#9ef0c0' : q.smooth === 'JOLT' ? '#ff7a6a' : '#fff', { font: 'tiny' }); });
      // stop cam
      const rec = s.results[Math.floor(this.t / 4.5) % Math.max(1, s.results.length)];
      if (rec) { const cw = Math.min(150, W - 210), cx2 = W - cw - 10, cy2 = 34 + s.results.length * 12 + 14; if (cy2 + 70 < H) DH.drawStopCam(g, cx2, cy2, cw, 62, rec, st.train ? DH.TRAINS[st.train] : DH.TRAINS.H5, (this.t % 4.5) / 2.5); }
      if (this.newCard) { px.rect(g, 12, 152, 180, 30, '#fff6d0'); txt(g, 'NEW POSTCARD', 18, 156, '#8a5a00', { font: 'tiny', shadow: null }); const l = wrapOne(DH.POSTCARDS[st.id] || '', 40); l.slice(0, 2).forEach((x, k) => txt(g, x, 18, 165 + k * 8, '#3a2a10', { font: 'tiny', shadow: null })); }
      this.menu.draw(g, Math.round(W - 150), Math.max(Math.round(H - 20 - this.menu.items.length * 18), 150), 140, 18);
    });
  }
};

/* ---------- game over ---------- */
scenes.gameover = {
  input: DH.KEYS, res: 'ps1', expand: true,
  enter(d) {
    this.d = d; this.t = 0; A.music(null); DH.soundStop();
    const items = [{ label: 'RETRY STAGE', k: 'retry' }]; if (d.run && d.run.nextIdx > 0 && d.run.nextIdx < d.run.stops.length) items.push({ label: 'RETRY FROM LAST STATION', k: 'last' }); items.push({ label: d.free ? 'FREE RUN' : 'HALO MAP', k: 'map' }, { label: 'TITLE', k: 'title' });
    this.menu = new ListMenu(items, { onPick: (i, it) => this.pick(it.k) });
  },
  pick(k) {
    const d = this.d;
    if (k === 'retry') game.go('drive', { stage: d.stage, opts: d.opts, career: d.career, free: d.free }, { fade: 'wipe' });
    else if (k === 'last') { const run = d.run, from = run.stops[run.nextIdx - 1], st = Object.assign({}, d.stage, { from, stops: run.stops.slice(run.nextIdx), id: d.stage.id }); game.go('drive', { stage: st, opts: d.opts, career: d.career, free: d.free, partial: true }, { fade: 'wipe' }); }
    else if (k === 'map') game.go(d.free ? 'freerun' : 'halomap'); else game.go('title');
  },
  update(dt) { this.t += dt; DH.bgStep(dt); DH.idleTick(dt, false); this.menu.update(); },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; DH.drawBackdrop(g, W, H, .78);
      E.font.title(g, 'SERVICE SUSPENDED', W / 2, 24, { align: 'center', scale: 3, colors: ['#ffe0e0', '#ff7a6a', '#c8202a'], depth: 2, depthColor: '#3a0810' });
      txt(g, this.d.why, W / 2, 62, '#fff', { align: 'center', scale: 2 });
      const run = this.d.run; txt(g, 'Stops made ' + run.results.length + ' of ' + run.stops.length + '   Score ' + Math.round(run.score), W / 2, 86, '#d9e0ee', { align: 'center' });
      const tip = DH.TIPS[(Math.floor(this.t / 5) + (this.d.stage.n || 0)) % DH.TIPS.length]; wrapOne('TIP: ' + tip, 60).forEach((l, k) => txt(g, l, W / 2, 104 + k * 9, '#ffd36a', { align: 'center', font: 'tiny' }));
      this.menu.draw(g, Math.round(W / 2 - 100), 132, 200, 20);
    });
  }
};

/* ---------- ending ---------- */
scenes.ending = {
  input: DH.KEYS, res: 'ps1', expand: true,
  enter() {
    this.t = 0; this.phase = 'talk'; this.idx = -1; this.lines = DH.STORY.ENDING; this.rigs = {}; A.music(DH.SONGS.ending);
    this.talk = new E.Dialog(game, { speed: 36, voice: ch => DH.voiceChar(ch, this.who), place: 'bottom', lines: 3, bg: '#101a30', border: '#ffd23a' });
    this.next(); DH.BG.run = null;
  },
  rig(k) { return this.rigs[k] || (this.rigs[k] = DH.CAST[k].rig()); },
  next() { this.idx++; if (this.idx >= this.lines.length) { this.phase = 'credits'; this.t = 0; return; } const [who, text] = this.lines[this.idx]; this.who = DH.CAST[who].voice; this.talk.say([text], { name: DH.CAST[who].name, portrait: this.rig(who), portraitSize: 44, onDone: () => this.next() }); },
  update(dt) {
    DH.bgStep(dt); this.t += dt;
    if (this.phase === 'talk') { this.talk.update(dt); if (I.pressed('cancel')) { this.talk.close(); this.phase = 'credits'; this.t = 0; } }
    else if ((this.t > 3 && (I.pressed('confirm') || I.pressed('cancel'))) || this.t > 52) { game.go('title', null, { fade: 'wipe' }); }
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; DH.drawBackdrop(g, W, H, .3);
      if (this.phase === 'talk') { this.talk.draw(r); return; }
      px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, W, H, '#000'));
      const lines = ['DENSHA DE HALO!', '', 'The ring is closed.', '', 'A riff on Densha de Go!', '', 'Design, code, art, sound: claude-sonnet-5-5', 'Plan: claude-opus-5-5', 'Engine: my-3D2dge', 'Online: AI Hub Session Protocol', '', 'Chief Instructor Hoshino retired at 17:00 sharp.', 'He was never once late.', '', 'THANK YOU FOR RIDING'];
      lines.forEach((l, k) => { const y = H - this.t * 16 + k * 14; if (y > -10 && y < H + 10) txt(g, l, W / 2, y, k === 0 || k === lines.length - 1 ? '#ffd23a' : '#fff', { align: 'center', scale: k === 0 ? 2 : 1 }); });
      DH.promptLine(g, [['confirm', 'TITLE']], W / 2, H - 8, 'center');
    });
  }
};

/* ---------- driver's log ---------- */
scenes.log = {
  input: DH.KEYS, res: 'ps1', expand: true,
  enter() { this.sv = DH.save.get(); this.t = 0; },
  update(dt) { this.t += dt; DH.bgStep(dt); DH.idleTick(dt); if (I.pressed('cancel') || I.pressed('confirm')) { I.consumeAll(); game.go('title'); } },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; DH.drawBackdrop(g, W, H, .7); const sv = this.sv;
      txt(g, "DRIVER'S LOG", 12, 10, '#ffd36a', { scale: 2 });
      const rows = [['Shifts driven', sv.plays], ['Stops made', sv.stops], ['PERFECT stops', sv.perfect], ['Distance', (sv.km || 0).toFixed(1) + ' km']];
      rows.forEach((q, k) => { txt(g, q[0], 14, 34 + k * 11, '#d9e0ee'); txt(g, String(q[1]), 130, 34 + k * 11, '#fff'); });
      txt(g, 'BEST RANKS', 14, 84, '#ffd36a', { font: 'tiny' });
      DH.STAGES.filter(s => !s.parallel).forEach((s, k) => { const b = sv.best[s.id]; txt(g, s.id + ' ' + s.title, 14, 95 + k * 10, '#d9e0ee', { font: 'tiny' }); txt(g, b ? b.rank + '  ' + b.score : '-', 150, 95 + k * 10, b ? '#ffd23a' : '#5a6278', { font: 'tiny' }); });
      const px0 = Math.max(250, W * .55); txt(g, 'POSTCARDS', px0, 10, '#ffd36a', { font: 'tiny' });
      Object.keys(DH.POSTCARDS).forEach((id, k) => { const got = sv.cards.includes(id), y = 22 + k * 28; px.rect(g, px0, y, W - px0 - 8, 25, got ? '#fff6d0' : '#0b1020c0'); if (got) wrapOne(DH.POSTCARDS[id], Math.floor((W - px0 - 20) / 4)).slice(0, 3).forEach((l, q) => txt(g, l, px0 + 4, y + 3 + q * 7, '#3a2a10', { font: 'tiny', shadow: null })); else txt(g, id + ': earn a B rank or better', px0 + 4, y + 9, '#5a6278', { font: 'tiny' }); });
      DH.promptLine(g, [['cancel', 'BACK']], W / 2, H - 8, 'center');
    });
  }
};

/* ---------- how to drive ---------- */
scenes.help = {
  input: DH.KEYS, res: 'ps1', expand: true,
  enter(d) { this.d = d || {}; this.page = 0; this.t = 0; },
  update(dt) { this.t += dt; DH.bgStep(dt); DH.idleTick(dt); if (I.repeat('left', .3, .2)) this.page = (this.page + 3) % 4; if (I.repeat('right', .3, .2) || I.pressed('confirm')) this.page = (this.page + 1) % 4; if (I.pressed('cancel')) { I.consumeAll(); game.go(this.d.back || 'title'); } const c = I.clicked(); if (c) this.page = (this.page + 1) % 4; },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; DH.drawBackdrop(g, W, H, .72); const p = this.page, bx = 12, bw = W - 24;
      txt(g, 'HOW TO DRIVE  ' + (p + 1) + '/4', bx, 8, '#ffd36a', { scale: 1 });
      const body = (lines, y0) => lines.forEach((l, k) => txt(g, l, bx, y0 + k * 9, l.startsWith('#') ? '#ffd36a' : '#e8ecf4', { font: 'tiny' }));
      if (p === 0) {
        txt(g, 'CONTROLS', bx, 22, '#ffd36a');
        const rows = [['power', 'Lever toward POWER (also up)'], ['brake', 'Lever toward BRAKE (also down)'], ['neutral', 'Snap to neutral'], ['eb', 'Emergency brake'], ['call', 'Point and call'], ['horn', 'Horn (hold)'], ['ats', 'ATS confirm'], ['view', 'Change view']];
        rows.forEach((q, k) => { DH.badge(g, q[0], bx + 4, 38 + k * 14); txt(g, q[1], bx + 62, 35 + k * 14, '#fff', { font: 'tiny' }); });
        txt(g, 'Mouse: wheel moves the lever, click the cab buttons, click to call.', bx, 38 + 8 * 14 + 4, '#9fd8ff', { font: 'tiny' });
        txt(g, 'The lever direction can be flipped in Settings (Up = Power / Up = Brake).', bx, 38 + 8 * 14 + 13, '#9fd8ff', { font: 'tiny' });
      } else if (p === 1) {
        body(['#READING THE CAB', 'Dial: your speed. The orange mark on it is the speed limit.', 'Stop gauge: metres to the stop marker. Aim the front of the train at it.', 'The white tick on the bar is where B8 would stop you. Red means too late.', 'Lever strip: EB, B8..B1, N, P1..P5. The handle shows where you are.', 'Lamps: DOORS (open), GO (may depart), ATS, EB, RED / CAUT (signal ahead).', 'Halo Time (top left) is your life. Penalties drain it. Zero ends the shift.', '', '#SIGNALS', 'Green: carry on.  Yellow: be at 45 km/h by the signal.  Red: stop short.', 'A slower train may be ahead. The block behind it shows red.'], 22);
      } else if (p === 2) {
        body(['#THE RULES', 'Stop with the front of the train on the marker. Within 35 cm is PERFECT.', 'Arrive on the second. Early waits, late costs Halo Time.', 'Ease the brake off just before you stop. A lurch costs comfort.', 'Point and call (E / cross) when the bracket flashes: signals and the marker.', 'Hold the horn at blue boards before crossings and tunnels.', 'ATS: when you break a limit it rings. Confirm it, slow down, or it brakes for you.', '', '#WHAT YOU CANNOT DO', 'You cannot steer: the track does that.', 'You cannot open or close the doors: the conductor does.', 'You cannot move with the doors open, or reverse.', 'You cannot choose the route. It is a ring. That is the point.'], 22);
      } else {
        body(['#SCORING', 'Stop: PERFECT 1000, GREAT 700, GOOD 400, OK 200.', 'Time: on time 500, early 250, late 0 (and a penalty).', 'Ride: comfort and a smooth stop up to 450 more.', 'Calls and horns: bonus points and a little Halo Time.', 'Ranks: S Halo of Gold, A Silver, B Bronze, C Tin.', '', '#MODES', 'Career: six shifts, one story. Free Run: choose everything.', 'AI Hub: the Parallel Run, 1 to 4 players on the same line. Local Duel: two players, one keyboard, split screen.', 'Pause menu: Retry, Dev Mode (balance sliders), Settings.', 'Idle on a menu for 10 seconds and the demo runs.'], 22);
      }
      DH.promptLine(g, [['left', 'PAGE'], ['cancel', 'BACK']], W / 2, H - 8, 'center');
    });
  }
};

/* ---------- about & credits: Source Information, Testing, Engine and Prompt feedback, five pages, up/down scrolls ---------- */
scenes.about = {
  input: DH.KEYS, res: 'ps1', expand: true,
  enter() { this.page = 0; this.scroll = 0; this.t = 0; },
  pages() {
    const A2 = DH.ABOUT, names = { date: 'Date', source: 'Source', plan: 'Plan', genre: 'Genre', perspective: 'Perspective', tech: 'Tech', artDirection: 'Art Direction', animation: 'Animation', audio: 'Audio', online: 'Online', testing: 'Testing', research: 'Research', environment: 'Environment', model: 'Model', usage: 'Usage' };
    const kv = keys => keys.map(k => [names[k], A2.info[k]]);
    return [{ title: 'SOURCE INFORMATION 1/2', rows: kv(['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation']) }, { title: 'SOURCE INFORMATION 2/2', rows: kv(['audio', 'online', 'testing', 'research', 'environment', 'model', 'usage']) },
      { title: 'TESTING FEEDBACK', lines: A2.testing }, { title: 'ENGINE FEEDBACK', lines: A2.engine }, { title: 'PROMPT FEEDBACK', lines: A2.prompt }];
  },
  update(dt) {
    this.t += dt; DH.bgStep(dt); DH.idleTick(dt); const n = 5;
    if (I.repeat('left', .3, .2)) { this.page = (this.page + n - 1) % n; this.scroll = 0; } if (I.repeat('right', .3, .2) || I.pressed('confirm')) { this.page = (this.page + 1) % n; this.scroll = 0; }
    if (I.repeat('down', .2, .05)) this.scroll += 8; if (I.repeat('up', .2, .05)) this.scroll = Math.max(0, this.scroll - 8);
    if (I.pressed('cancel')) { I.consumeAll(); game.go('title'); }
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; DH.drawBackdrop(g, W, H, .78); const pg = this.pages()[this.page], cpl = Math.floor((W - 24) / 4);
      const rows = []; if (pg.rows) for (const [k, v] of pg.rows) { const w = wrapOne(String(v), cpl - 14); w.forEach((l, i) => rows.push([i ? '' : k, l])); } else for (const q of pg.lines) wrapOne(q, cpl).forEach((l, i) => rows.push(['', (i ? '  ' : '') + l]));
      const maxScroll = Math.max(0, rows.length * 8 - (H - 52)); this.scroll = Math.min(this.scroll, maxScroll);
      txt(g, 'ABOUT & CREDITS', 12, 6, '#ffd36a'); txt(g, pg.title + '   (' + (this.page + 1) + '/5)', 12, 17, '#9fd8ff', { font: 'tiny' });
      g.save(); g.beginPath(); g.rect(0, 28, W, H - 44); g.clip();
      rows.forEach((q, i) => { const y = 30 + i * 8 - this.scroll; if (y < 22 || y > H - 12) return; if (pg.rows) { txt(g, q[0], 12, y, '#ffd36a', { font: 'tiny' }); txt(g, q[1], 12 + 56, y, '#fff', { font: 'tiny' }); } else txt(g, q[1], 12, y, '#e8ecf4', { font: 'tiny' }); });
      g.restore(); if (maxScroll > 0) txt(g, this.scroll < maxScroll ? 'more below' : 'end', W - 8, H - 18, '#8a96b0', { font: 'tiny', align: 'right' });
      DH.promptLine(g, [['left', 'PAGE'], ['down', 'SCROLL'], ['cancel', 'BACK']], W / 2, H - 8, 'center');
    });
  }
};
DH.ABOUT = DH.ABOUT || { info: {}, testing: [], engine: [], prompt: [] };
})();
