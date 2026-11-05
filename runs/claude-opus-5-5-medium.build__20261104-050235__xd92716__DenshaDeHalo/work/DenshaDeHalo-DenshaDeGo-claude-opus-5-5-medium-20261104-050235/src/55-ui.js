/* DENSHA DE HALO! · front-end screens: title, halo map (stage select), free run, briefing, results, game over,
 * ending and credits, Driver's Log, How to Drive, About & Credits. Big, few items, pixel art, controller-first: the
 * d-pad and stick move, confirm picks, cancel goes back; the mouse's hover moves the focus and a click picks. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, px = E.px, game = DH.game, I = () => game.input, R = Math.round;
const T = (g, s, x, y, c, o = {}) => E.font.text(g, s, R(x), R(y), c, Object.assign({ shadow: '#000', outline: false }, o));
const S = DH.scenes = DH.scenes || {};
const snd = n => DH.Sound.play(n);

/* ---------- a vertical list of big items: keys, pad, mouse hover and click ---------- */
class List {
  constructor(items, o = {}) { this.items = items; this.i = o.i || 0; this.rects = []; this.o = o; this.lastP = null; }
  get cur() { return this.items[this.i]; }
  move(d) { const n = this.items.length; for (let k = 0; k < n; k++) { this.i = (this.i + d + n) % n; if (!this.items[this.i].disabled) break; } snd('move'); }
  update() {
    const In = I();
    if (In.repeat('up', .3, .12) || In.repeat('power', .3, .12) && this.o.lever) this.move(-1);
    if (In.repeat('down', .3, .12)) this.move(1);
    if (this.o.horizontal) { if (In.repeat('left', .3, .12)) this.move(-1); if (In.repeat('right', .3, .12)) this.move(1); }
    const p = In.pointer && In.pointer();
    if (p && this.lastP && (p[0] !== this.lastP[0] || p[1] !== this.lastP[1])) { const k = this.rects.findIndex(r => r && p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3]); if (k >= 0 && k !== this.i && !this.items[k].disabled) { this.i = k; snd('move'); } }
    this.lastP = p ? p.slice() : null;
    const c = In.clicked && In.clicked();
    if (c) { const k = this.rects.findIndex(r => r && c[0] >= r[0] && c[0] < r[0] + r[2] && c[1] >= r[1] && c[1] < r[1] + r[3]); if (k >= 0 && !this.items[k].disabled) { this.i = k; snd('confirm'); this.items[k].fn && this.items[k].fn(); return true; } }
    if (In.pressed('confirm')) { const it = this.cur; if (it && !it.disabled) { snd('confirm'); it.fn && it.fn(); return true; } }
    if (In.pressed('cancel') && this.o.back) { snd('back'); this.o.back(); return true; }
    return false;
  }
  draw(g, x, y, o = {}) {
    const sc = o.scale || 2, lh = (o.lh || 15) * (sc / 2) + 4, w = o.w || 180, align = o.align || 'center';
    this.rects = [];
    this.items.forEach((it, i) => {
      const yy = y + i * lh, on = i === this.i, x0 = align === 'center' ? x - w / 2 : x;
      this.rects[i] = [x0, yy - 2, w, lh - 2];
      if (on) { px.blend(g, .7, 'normal', () => px.rect(g, x0, yy - 3, w, lh - 2, '#1a2a5a')); px.rect(g, x0, yy - 3, 3, lh - 2, DH.COL.gold); px.rect(g, x0 + w - 3, yy - 3, 3, lh - 2, DH.COL.gold); }
      const col = it.disabled ? '#5a5e78' : on ? '#ffe27a' : '#e8ecff';
      T(g, it.label, align === 'center' ? x : x + 10, yy, col, { align: align === 'center' ? 'center' : 'left', scale: sc });
      if (it.value !== undefined) T(g, '‹ ' + it.value + ' ›', x0 + w - 10, yy, on ? '#ffffff' : '#a8b0d0', { align: 'right', scale: sc });
    });
  }
}
DH.List = List;
/** the bottom prompt line: [confirm] SELECT  [cancel] BACK */
const prompts = (g, W, H, list) => {
  let x = 0; const parts = list.map(([a, w]) => [a, w, DH.Glyph.width(a) + 3 + E.font.width(w) + 12]);
  const tot = parts.reduce((s, p) => s + p[2], 0); x = R(W / 2 - tot / 2);
  for (const [a, w, ww] of parts) { DH.Glyph.prompt(g, a, w, x, H - 12, '#ffffff'); x += ww; }
};
DH.prompts = prompts;
const panel = (g, x, y, w, h, title) => { px.blend(g, .82, 'normal', () => px.rect(g, x, y, w, h, '#0e1430')); px.rect(g, x, y, w, 1, DH.COL.gold); px.rect(g, x, y + h - 1, w, 1, '#3a4a80'); if (title) T(g, title, x + 6, y + 4, DH.COL.gold); };
DH.panel = panel;
DH.logo = (g, x, y, sc = 4, t = 0) => {
  E.font.title(g, 'DENSHA DE HALO!', R(x), R(y), { scale: sc, colors: ['#fff6c8', '#ffe27a', '#f2c230', '#b8800a'], outline: '#1a0c10', depth: 2, depthColor: '#5a3a08', align: 'center' });
  const w = E.font.width('DENSHA DE HALO!', { scale: sc }), ox = x + w / 2 - E.font.width('O!', { scale: sc }) + E.font.width('O', { scale: sc }) / 2 - 2.5 * sc, oy = y - 1.5 * sc;
  for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2 + t * 1.5, cx = ox + Math.cos(a) * 4.5 * sc, cy = oy + Math.sin(a) * 1.4 * sc; px.rect(g, R(cx), R(cy), 2, 2, Math.sin(a) > 0 ? '#ffe27a' : '#c89a20'); }
  px.blend(g, .3 + .1 * Math.sin(t * 3), 'add', () => px.ell(g, ox, oy, 5 * sc, 2 * sc, '#ffd84a'));
};

/* ---------- a living background: a camera on the line (title, menus, briefing, results) ---------- */
class Backdrop {
  constructor(o) { this.o = o; this.R = DH.route(o.route || 'halo'); this.rail = DH.railFor(this.R); this.t = 0; this.grade = DH.grade(o.tod, o.weather, this.R); this.train = o.train ? new DH.TrainActor(Object.assign({ id: 'bg', kind: 'h8000', cars: 6, s: 0, dir: 1, lights: true, xAt: s => (this.R.trackX('A', DH.wrap(s, this.R.len)) || 0) }, o.train)) : null; }
  update(dt) {
    this.t += dt; const o = this.o;
    if (this.train && o.loopTrain) { const c = (this.t % 26), stop = o.loopTrain.stop; let s; if (c < 9) { const u = c / 9; s = stop - 260 * (1 - u) * (1 - u); } else if (c < 17) s = stop; else { const u = (c - 17) / 9; s = stop + 300 * u * u; } this.train.s = s; this.train.doorOpen = c > 10 && c < 16 ? 1 : 0; }
    if (o.move) this.camS = (o.cam.s || 0) + this.t * o.move;
  }
  draw(r) {
    const o = this.o, cam = Object.assign({ x: 0, h: 2.9, dir: 1, horizon: .5, fov: 70 }, o.cam); if (o.move) cam.s = this.camS;
    for (const sg of this.R.signals) if (sg.track === 'A') sg.aspect = 'G';
    DH.clockNow = (o.tod || 6) * 3600 + this.t;
    r.overlay(g => this.rail.paint(g, { x: 0, y: 0, w: r.W, h: r.H }, cam, { actors: this.train ? [this.train] : [], grade: this.grade, weather: o.weather, t: game.real, fogDist: 1100, headlight: true }));
  }
}
DH.Backdrop = Backdrop;
const dim = (r, a = .45) => r.overlay(g => px.blend(g, a, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05060c')));

/* ---------- title ---------- */
S.title = {
  enter() {
    DH.attractOn = false; DH.idle = 0; DH.music('title');
    this.bg = new Backdrop({ tod: 6.2, weather: 'clear', cam: { s: 15, x: -3.2, h: 2.8, dir: -1, horizon: .52, fov: 72 }, train: { s: -200 }, loopTrain: { stop: 0 } });
    const go = id => () => game.go(id, null, { fade: 'wipe' });
    this.list = new List([
      { label: 'CAREER', fn: go('halomap') }, { label: 'FREE RUN', fn: go('freerun') }, { label: 'DUEL (2P)', fn: go('duelLobby') },
      { label: "DRIVER'S LOG", fn: go('log') }, { label: 'HOW TO DRIVE', fn: () => DH.showHelp() }, { label: 'SETTINGS', fn: () => game.menu('settings') }, { label: 'ABOUT & CREDITS', fn: go('about') }
    ]);
    this.touchList = new List([{ label: 'SETTINGS', fn: () => game.menu('settings') }]);
    DH.checkTouchOnly();
  },
  update(dt) { this.bg.update(dt); if (game.shell && game.shell.screen) return; (DH.touchOnly ? this.touchList : this.list).update(); },
  draw(r) {
    this.bg.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H, t = game.real;
      px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, W, 64, '#05060c'));
      DH.logo(g, W / 2, 16, W < 380 ? 3 : 4, t);
      T(g, 'THE HALO LINE  •  AKARI CITY', W / 2, 52, '#c8d8ff', { align: 'center' });
      DH.drawHaro(g, W / 2 - 128, 150, 1.4, t);
      if (DH.touchOnly) {
        panel(g, W / 2 - 120, H * .45, 240, 34); T(g, 'Controller or keyboard required', W / 2, H * .45 + 13, '#ffffff', { align: 'center' });
        this.touchList.draw(g, W / 2, H * .45 + 50, { w: 150 });
      } else {
        panel(g, W / 2 - 100, 66, 200, 7 * 18 + 6);
        this.list.draw(g, W / 2, 71, { w: 192, lh: 14, scale: 2 });
        prompts(g, W, H, [['confirm', 'SELECT'], ['up', 'MOVE']]);
      }
      T(g, 'v' + DH.VERSION + '  engine v' + E.version, 4, H - 10, '#6a7090');
    });
  }
};

/* ---------- the halo map: the ring, its twelve stations, each stage an arc ---------- */
DH.STAGE_ARCS = { S1: ['akari', 'kujira'], S2: ['kujira', 'okiku'], S3: ['okiku', 'shotengai'], S4: ['shotengai', 'koen'], S5: ['koen', 'akari'] };
const ringPos = (id, cx, cy, rad) => { const i = DH.RING_ORDER.indexOf(id), st = DH.route('halo').station(id), a = (st.stop[6] / DH.LOOP) * Math.PI * 2 - Math.PI / 2; return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * .8, a]; };
const drawRing = (g, cx, cy, rad, sel, prog, t) => {
  for (let i = 0; i < 120; i++) { const a = i / 120 * Math.PI * 2; px.rect(g, R(cx + Math.cos(a) * rad) - 1, R(cy + Math.sin(a) * rad * .8) - 1, 3, 3, '#5a4a20'); }
  for (const id of ['S1', 'S2', 'S3', 'S4', 'S5']) {
    const [a0id, a1id] = DH.STAGE_ARCS[id], a0 = ringPos(a0id, cx, cy, rad)[2], a1raw = ringPos(a1id, cx, cy, rad)[2], a1 = a1raw <= a0 ? a1raw + Math.PI * 2 : a1raw;
    const unlocked = prog.unlocked.includes(id), on = sel === id, done = prog.ranks[id];
    for (let k = 0; k <= 40; k++) { const a = a0 + (a1 - a0) * k / 40, glow = on && ((k / 40 + t * .6) % 1) < .15; px.rect(g, R(cx + Math.cos(a) * rad) - 1, R(cy + Math.sin(a) * rad * .8) - 1, on ? 4 : 3, on ? 4 : 3, !unlocked ? '#3a3a48' : glow ? '#ffffff' : on ? '#ffe27a' : done ? '#f2c230' : '#a88a30'); }
    if (done) { const am = (a0 + a1) / 2; DH.stamp(g, cx + Math.cos(am) * (rad + 18), cy + Math.sin(am) * (rad + 18) * .8, done, .55); }
  }
  for (const id of DH.RING_ORDER) { const [x, y] = ringPos(id, cx, cy, rad); px.disc(g, x, y, 3, '#ffffff'); px.disc(g, x, y, 2, DH.COL.sky); }
};
DH.drawRing = drawRing;
DH.stamp = (g, x, y, rank, k = 1) => {   // the red hanko
  const r = 14 * k; px.disc(g, x, y, r + 1, '#7a1010'); px.disc(g, x, y, r, '#d02a20'); px.disc(g, x, y, r - 2 * k, '#f4ece0'); px.disc(g, x, y, r - 3 * k, '#d02a20');
  E.font.title(g, rank, R(x), R(y - 5 * Math.max(1, Math.round(k * 2))), { scale: Math.max(1, Math.round(k * 2)), colors: ['#fff4e8', '#fff4e8'], outline: false, depth: 0, align: 'center' });
};
S.halomap = {
  enter(data) {
    DH.idle = 0; DH.music('menu');
    const P = DH.progress, next = DH.CAREER.find(id => !P.ranks[id] && P.unlocked.includes(id)) || 'S1';
    this.order = DH.CAREER.slice(); this.i = Math.max(0, this.order.indexOf((data && data.sel) || next));
    this.rects = [];
  },
  pick() { const id = this.order[this.i]; if (!(DH.progress.unlocked.includes(id) || DH.dev.unlocked)) { snd('back'); return; } snd('confirm'); DH.startStage(id); },
  update() {
    if (game.shell && game.shell.screen) return;
    const In = I(), n = this.order.length;
    if (In.repeat('right', .3, .15) || In.repeat('down', .3, .15)) { this.i = (this.i + 1) % n; snd('move'); }
    if (In.repeat('left', .3, .15) || In.repeat('up', .3, .15)) { this.i = (this.i + n - 1) % n; snd('move'); }
    const p = In.pointer && In.pointer();
    if (p && this.lastP && (p[0] !== this.lastP[0] || p[1] !== this.lastP[1])) { const k = this.rects.findIndex(q => q && Math.hypot(p[0] - q[0], p[1] - q[1]) < q[2]); if (k >= 0 && k !== this.i) { this.i = k; snd('move'); } }
    this.lastP = p ? p.slice() : null;
    const c = In.clicked && In.clicked(); if (c) { const k = this.rects.findIndex(q => q && Math.hypot(c[0] - q[0], c[1] - q[1]) < q[2]); if (k >= 0) { this.i = k; this.pick(); return; } if (this.goRect && c[0] > this.goRect[0] && c[0] < this.goRect[0] + this.goRect[2] && c[1] > this.goRect[1] && c[1] < this.goRect[1] + this.goRect[3]) { this.pick(); return; } }
    if (In.pressed('confirm')) this.pick();
    if (In.pressed('cancel')) { snd('back'); game.go('title', null, { fade: 'wipe' }); }
  },
  draw(r) {
    r.sky(['#0a0e24', '#14204a', '#1a2a5a']);
    r.overlay(g => {
      const W = r.W, H = r.H, t = game.real, tall = H > W, cx = tall ? W / 2 : W * .32, cy = tall ? H * .3 : H * .52, rad = Math.min(W, H) * .3;
      T(g, 'THE HALO LINE', 8, 8, DH.COL.gold, { scale: 2 }); T(g, 'CAREER', 8, 26, '#c8d8ff');
      drawRing(g, cx, cy, rad, this.order[this.i], DH.progress, t);
      this.rects = this.order.map(id => {
        if (id === 'S0') { const x = cx, y = cy; return [x, y, 22]; }
        const [a0id, a1id] = DH.STAGE_ARCS[id], a0 = ringPos(a0id, cx, cy, rad)[2]; let a1 = ringPos(a1id, cx, cy, rad)[2]; if (a1 <= a0) a1 += Math.PI * 2; const am = (a0 + a1) / 2; return [cx + Math.cos(am) * rad, cy + Math.sin(am) * rad * .8, 26];
      });
      // the depot in the centre with Haro-kun
      const s0 = this.order[this.i] === 'S0'; px.disc(g, cx, cy + 6, 16, s0 ? '#2a3a7a' : '#141a3a'); if (s0) px.ell(g, cx, cy + 6, 18, 5, '#ffe27a');
      T(g, 'DEPOT', cx, cy + 14, s0 ? '#ffe27a' : '#8a90b0', { align: 'center' });
      DH.drawHaro(g, cx, cy + 4, 1, t);
      for (const id of DH.RING_ORDER) { const [x, y] = ringPos(id, cx, cy, rad + 12); const nm = DH.STATIONS[id].name; if (W > 380 || id === 'akari') T(g, nm.length > 9 ? nm.slice(0, 9) : nm, x, y - 3, '#a8b4e0', { align: x < cx - 5 ? 'right' : x > cx + 5 ? 'left' : 'center' }); }
      // the stage card
      const id = this.order[this.i], sg = DH.STAGES[id], unlocked = DH.progress.unlocked.includes(id) || DH.dev.unlocked;
      const cw = tall ? W - 24 : Math.min(150, W * .34), cx0 = tall ? 12 : W - cw - 8, cy0 = tall ? H * .58 : 40, ch = 150;
      panel(g, cx0, cy0, cw, ch, id === 'S0' ? 'TUTORIAL' : 'STAGE ' + id.slice(1));
      T(g, sg.name, cx0 + 6, cy0 + 16, '#ffffff', { scale: 1 });
      const lines = [DH.hm(sg.startClock + 16) + '  ' + (sg.weather === 'rain' ? 'RAIN' : sg.weather === 'fog' ? 'FOG, NIGHT' : sg.tod > 19 ? 'NIGHT' : sg.tod > 17 ? 'SUNSET' : sg.tod < 7 ? 'DAWN' : 'CLEAR'), DH.TRAINS[sg.train].name + '  ' + sg.cars + ' CARS', sg.stops.length - (sg.tutorial ? 0 : 1) + ' STOPS'];
      lines.forEach((l, i) => T(g, l, cx0 + 6, cy0 + 30 + i * 10, '#c8d8ff'));
      E.font.wrap(sg.teaches, cw - 12).slice(0, 5).forEach((l, i) => T(g, l, cx0 + 6, cy0 + 64 + i * 9, '#8a96c8'));
      const best = DH.progress.ranks[id]; if (best) { DH.stamp(g, cx0 + cw - 20, cy0 + 22, best, .8); T(g, 'BEST ' + DH.fmtNum(DH.progress.best[id] || 0), cx0 + cw - 6, cy0 + 112, '#ffd84a', { align: 'right' }); }
      this.goRect = [cx0 + 6, cy0 + ch - 22, cw - 12, 16];
      if (unlocked) { px.rect(g, cx0 + 6, cy0 + ch - 22, cw - 12, 16, '#2a3a7a'); DH.Glyph.prompt(g, 'confirm', 'START', cx0 + cw / 2, cy0 + ch - 14, '#ffe27a', 1, 'center'); }
      else T(g, 'LOCKED: finish the stage before', cx0 + cw / 2, cy0 + ch - 18, '#ff8a7a', { align: 'center' });
      prompts(g, W, H, [['left', 'STAGE'], ['confirm', 'GO'], ['cancel', 'BACK']]);
    });
  }
};

/* ---------- free run ---------- */
S.freerun = {
  enter() {
    DH.idle = 0; DH.music('menu');
    const st = DH.CAREER.slice(1).concat(['PR']), unl = id => id === 'PR' || DH.progress.unlocked.includes(id) || DH.dev.unlocked;
    this.opts = { stage: st.filter(unl), tod: ['DAWN', 'DAY', 'SUNSET', 'NIGHT'], weather: ['CLEAR', 'RAIN', 'FOG'], train: ['HALO 8000', 'HALO 3000'], diff: ['Easy', 'Normal', 'Expert'] };
    this.v = { stage: 0, tod: 1, weather: 0, train: 0, diff: ['Easy', 'Normal', 'Expert'].indexOf(game.settings.difficulty) };
    const row = (k, label) => ({ k, label, get value() { return S.freerun.show(k); } });
    this.list = new List([row('stage', 'STAGE'), row('tod', 'TIME'), row('weather', 'WEATHER'), row('train', 'TRAIN'), row('diff', 'DIFFICULTY'), { label: 'START', fn: () => this.start() }], { back: () => game.go('title', null, { fade: 'wipe' }) });
  },
  show(k) { const v = this.opts[k][this.v[k]]; return k === 'stage' ? v + ' ' + DH.STAGES[v].name : v; },
  start() {
    const id = this.opts.stage[this.v.stage], tod = [6.3, 12, 17.6, 22.5][this.v.tod], weather = ['clear', 'rain', 'fog'][this.v.weather], train = ['h8000', 'h3000'][this.v.train];
    game.settings.set('difficulty', this.opts.diff[this.v.diff]);
    game.go('drive', { stage: id, free: { free: true, tod, weather, train } }, { fade: 'wipe' });
  },
  update() {
    if (game.shell && game.shell.screen) return;
    const In = I(), it = this.list.cur;
    if (it.k) { const n = this.opts[it.k].length; if (In.repeat('right', .3, .15)) { this.v[it.k] = (this.v[it.k] + 1) % n; snd('move'); } if (In.repeat('left', .3, .15)) { this.v[it.k] = (this.v[it.k] + n - 1) % n; snd('move'); } }
    if (it.k && (In.pressed('confirm') || (In.clicked() && this.list.rects[this.list.i] && (() => { const c = In.clicked(), q = this.list.rects[this.list.i]; return c[0] > q[0] && c[0] < q[0] + q[2] && c[1] > q[1] && c[1] < q[1] + q[3]; })()))) { this.v[it.k] = (this.v[it.k] + 1) % this.opts[it.k].length; snd('move'); if (In.pressed('confirm')) return; }
    this.list.update();
  },
  draw(r) {
    r.sky(['#0a0e24', '#14204a', '#1a2a5a']);
    r.overlay(g => {
      const W = r.W, H = r.H; T(g, 'FREE RUN', W / 2, 10, DH.COL.gold, { align: 'center', scale: 2 });
      T(g, 'Any unlocked stage, any time, any weather. Records are not kept.', W / 2, 30, '#a8b4e0', { align: 'center' });
      panel(g, W / 2 - 150, 44, 300, 6 * 19 + 12); this.list.draw(g, W / 2, 52, { w: 288, lh: 15, scale: 1, align: 'left' });
      prompts(g, W, H, [['left', 'CHANGE'], ['confirm', 'START'], ['cancel', 'BACK']]);
    });
  }
};

/* ---------- briefing: the instructor and the conductor, then the stage card ---------- */
S.briefing = {
  enter(data) {
    DH.idle = 0; this.data = data; const sg = DH.STAGES[data.stage]; this.sg = sg; DH.music('brief');
    const R = DH.route(sg.route), st = R.station(sg.stops[0].id);
    this.bg = new Backdrop({ route: sg.route, tod: sg.tod, weather: sg.weather === 'fog' ? 'clear' : sg.weather, cam: sg.tutorial ? { s: 60, x: 0, h: 2.9, dir: 1, horizon: .45 } : { s: st.stop[6] + 15, x: st.doorSide === 'L' ? -3.2 : 3.2, h: 2.8, dir: -1, horizon: .5 }, train: { s: sg.tutorial ? 140 : st.stop[sg.cars >= 10 ? 10 : 6] || st.stop[6], kind: sg.train, cars: sg.cars } });
    this.talk = new E.Dialog(game, { speed: 45, lines: 3 });
    this.phase = 'talk'; this.k = 0; this.next();
    this.card = new List([{ label: 'START', fn: () => game.go('drive', { stage: data.stage, free: data.free }, { fade: 'iris' }) }, { label: 'HALO MAP', fn: () => game.go('halomap', { sel: data.stage }, { fade: 'wipe' }) }]);
  },
  next() {
    const L = this.sg.briefing[this.k];
    if (!L) { this.phase = 'card'; return; }
    const C = DH.CAST[L[0]];
    this.talk.nameColor = C.color; this.talk.voice = DH.Babble.dialogHook(C.voice);
    this.talk.say(L[1], { name: C.name, portrait: DH.portraitOf(L[0]) || undefined, portraitSize: 44, onDone: () => { this.k++; this.next(); } });
  },
  update(dt) {
    this.bg.update(dt);
    if (game.shell && game.shell.screen) return;
    if (this.phase === 'talk') { this.talk.update(dt); if (I().pressed('cancel') || I().pressed('pause')) { this.talk.close(); this.phase = 'card'; } return; }
    this.card.update();
  },
  draw(r) {
    this.bg.draw(r); dim(r, .25);
    const sg = this.sg;
    r.overlay(g => {
      const W = r.W, H = r.H;
      px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, W, 30, '#05060c'));
      T(g, (sg.tutorial ? 'TUTORIAL' : 'STAGE ' + sg.id.slice(1)) + '  ' + sg.name, W / 2, 6, DH.COL.gold, { align: 'center', scale: 2 });
      T(g, sg.sub.toUpperCase(), W / 2, 22, '#c8d8ff', { align: 'center' });
      if (this.phase === 'card') {
        const w = 230, x = W / 2 - w / 2, y = H * .3;
        panel(g, x, y, w, 120, 'STAGE CARD');
        const rows = [['TIME', DH.clock(sg.startClock + 16)], ['WEATHER', sg.weather.toUpperCase()], ['TRAIN', DH.TRAINS[sg.train].name + ' x' + sg.cars], ['STOPS', sg.stops.map(q => DH.STATIONS[q.id].name).slice(sg.tutorial ? 0 : 1).join(', ').slice(0, 34)], ['BEST', DH.progress.ranks[sg.id] || '-']];
        rows.forEach(([a, b], i) => { T(g, a, x + 8, y + 16 + i * 11, '#8a96c8'); T(g, b, x + 64, y + 16 + i * 11, '#ffffff'); });
        this.card.draw(g, W / 2, y + 76, { w: 160, scale: 1, lh: 15 });
        prompts(g, W, H, [['confirm', 'GO'], ['up', 'MOVE']]);
      } else prompts(g, W, H, [['confirm', 'NEXT'], ['cancel', 'SKIP']]);
    });
    if (this.phase === 'talk') this.talk.draw(r);
  }
};

/* ---------- results: the stamp slams in ---------- */
const recordResult = (s, free) => {
  if (free || DH.attractOn) return [];
  const P = DH.progress, id = s.id, newCards = [];
  if (!P.ranks[id] || 'DCBAS'.indexOf(s.rank) > 'DCBAS'.indexOf(P.ranks[id])) P.ranks[id] = s.rank;
  P.best[id] = Math.max(P.best[id] || 0, s.score); P.done[id] = true;
  const errs = s.stats.stopErr.map(Math.abs); if (errs.length) P.bestErr[id] = Math.min(P.bestErr[id] === undefined ? 99 : P.bestErr[id], ...errs);
  P.perfects[id] = Math.max(P.perfects[id] || 0, s.stats.perfect);
  P.stats.km += s.stats.km; P.stats.stops += s.stats.stopErr.length; P.stats.perfect += s.stats.perfect; P.stats.calls += s.stats.calls;
  const nx = DH.CAREER[DH.CAREER.indexOf(id) + 1]; if (nx && !P.unlocked.includes(nx)) P.unlocked.push(nx);
  const card = n => { if (!P.postcards.includes(n)) { P.postcards.push(n); newCards.push(n); } };
  if (s.stats.perfect > 0) card(1);
  if (id === 'S1' && s.stops.find(q => q.id === 'hanabatake' && /PERFECT|GREAT/.test(q.label))) card(2);
  if (id === 'S2' && !s.stats.overruns && !s.stats.slides) card(3);
  if (id === 'S3' && s.stats.hazard) card(4);
  if (id === 'S4' && s.stops.every(q => q.ontime)) card(5);
  if (id === 'S5') card(6);
  if (!s.tutorial && s.stats.calls > 0 && s.stats.great >= s.stats.calls && !s.stats.missed) card(7);
  if (!s.tutorial && s.stops.length && s.stops.every(q => q.smooth)) card(8);
  // the attract table: career totals
  const tot = DH.CAREER.reduce((a, k) => a + (P.best[k] || 0), 0); P.careerTotal = tot;
  DH.saveProgress();
  return newCards;
};
DH.recordResult = recordResult;
S.results = {
  enter(data) {
    if (!data || !data.run) { data = DH.firstData; DH.firstData = null; }
    DH.idle = 0; this.d = data; this.s = data.run; this.t = 0; const rk = this.s.rank;
    DH.music(this.s.tutorial || rk === 'S' || rk === 'A' ? 'resultsHi' : rk === 'D' ? 'resultsLo' : 'resultsMid', { fade: .5 });
    this.cards = recordResult(this.s, data.free && data.free.free);
    const sg = DH.STAGES[this.s.id], nx = DH.CAREER[DH.CAREER.indexOf(this.s.id) + 1];
    const items = [];
    if (data.finale) items.push({ label: 'CONTINUE', fn: () => game.go('ending', {}, { fade: 'iris' }) });
    else if (nx && !(data.free && data.free.free)) items.push({ label: 'NEXT STAGE', fn: () => DH.startStage(nx) });
    items.push({ label: 'RETRY', fn: () => game.go('drive', { stage: this.s.id, free: data.free }, { fade: 'wipe' }) }, { label: data.free && data.free.free ? 'TITLE' : 'HALO MAP', fn: () => game.go(data.free && data.free.free ? 'title' : 'halomap', { sel: nx || this.s.id }, { fade: 'wipe' }) });
    this.list = new List(items, { horizontal: true });
    this.bg = new Backdrop({ route: sg.route, tod: sg.tod, weather: sg.weather === 'fog' ? 'clear' : sg.weather, cam: { s: (DH.route(sg.route).station(sg.stops[sg.stops.length - 1].id).stop[6]) - 140, x: 9, h: 14, dir: 1, horizon: .5, fov: 70 }, move: 3 });
    this.bg.camS = this.bg.o.cam.s;
  },
  update(dt) { this.t += dt; this.bg.update(dt); if (this.t > .6 && this.t - dt <= .6) { snd('stamp'); game.shake && game.shake(3); } if (this.t > 1.4 && this.cards.length && this.t - dt <= 1.4) snd('postcard'); if (game.shell && game.shell.screen) return; if (this.t > .8) this.list.update(); },
  draw(r) {
    this.bg.draw(r); dim(r, .55);
    const s = this.s, sg = DH.STAGES[s.id];
    r.overlay(g => {
      const W = r.W, H = r.H, x = W / 2 - 150, y = 18;
      T(g, s.tutorial ? 'TRAINING COMPLETE' : 'STAGE ' + s.id.slice(1) + ' CLEAR', W / 2, 6, DH.COL.gold, { align: 'center', scale: 2 });
      T(g, sg.name, W / 2, 24, '#c8d8ff', { align: 'center' });
      panel(g, x, y + 18, 300, 132);
      if (s.tutorial) { T(g, 'DRIVER CERTIFICATE', x + 150, y + 30, '#ffffff', { align: 'center', scale: 2 }); T(g, 'Signed: T. Hoshino, Chief Instructor', x + 150, y + 56, '#c8d8ff', { align: 'center' }); T(g, 'Stops: ' + s.stats.stopErr.map(e => (e >= 0 ? '+' : '') + e.toFixed(2)).join('  '), x + 150, y + 72, '#ffffff', { align: 'center' }); }
      else {
        const rows = [['STOPS', s.pts.stops, s.stops.map(q => q.label === 'PERFECT HALO!' ? 'PERFECT' : q.label.replace('!', '')).join(', ')], ['PUNCTUALITY', s.pts.punct, s.stops.filter(q => q.ontime).length + '/' + s.stops.length + ' on time'], ['CALLS & HORN', s.pts.calls, s.stats.great + '/' + s.stats.calls + ' great, ' + s.stats.horns + ' horn'], ['SMOOTHNESS', s.pts.smooth + s.comfort * 5, 'comfort ' + s.comfort], ['PENALTIES', s.pts.pen, s.stats.spad ? 'SPAD!' : s.stats.overruns ? s.stats.overruns + ' overrun' : 'none']];
        rows.forEach(([a, v, note], i) => { const yy = y + 26 + i * 16; T(g, a, x + 8, yy, '#c8d8ff'); T(g, DH.fmtNum(v), x + 160, yy, v < 0 ? '#ff6a5a' : '#ffffff', { align: 'right', scale: 1 }); T(g, note, x + 168, yy, '#8a96c8'); });
        T(g, 'HALO TIME ' + Math.round(s.grace) + ' s  x50', x + 8, y + 110, '#ffd84a');
        T(g, 'TOTAL', x + 8, y + 126, '#ffffff', { scale: 2 }); T(g, DH.fmtNum(s.score), x + 200, y + 126, '#ffe27a', { align: 'right', scale: 2 });
      }
      // the stamp
      const k = Math.min(1, Math.max(0, (this.t - .3) / .3)), sc = 2.5 - 1.5 * k;
      if (this.t > .3) DH.stamp(g, x + 262, y + 92, s.rank, sc);
      const line = s.tutorial ? DH.STAGES.S0.pass[0][1] : (sg.results || {})[s.rank] || '';
      if (this.t > .9) { DH.castRig('hoshino').drawPortrait(g, x + 4, y + 154, 30); T(g, 'HOSHINO', x + 40, y + 156, '#ffd36a'); E.font.wrap('"' + line + '"', 250).slice(0, 2).forEach((l, i) => T(g, l, x + 40, y + 166 + i * 9, '#ffffff')); }
      if (this.cards.length && this.t > 1.4) { const f = Math.min(1, (this.t - 1.4) / .4), cw = R(60 * Math.abs(Math.cos((1 - f) * Math.PI / 2))); px.rect(g, x + 262 - cw / 2, y + 26, cw, 40, '#f4ece0'); if (f >= 1) { T(g, 'NEW', x + 262, y + 32, '#d02a20', { align: 'center' }); T(g, 'POSTCARD', x + 262, y + 42, '#141824', { align: 'center' }); T(g, '#' + this.cards.join(' #'), x + 262, y + 52, '#2a3a6a', { align: 'center' }); } }
      this.list.rects = this.list.items.map((it, i) => [W / 2 - (this.list.items.length - 1) * 50 + i * 100 - 48, H - 32, 96, 14]);
      this.list.items.forEach((it, i) => { const on = i === this.list.i, xx = W / 2 - (this.list.items.length - 1) * 50 + i * 100; px.rect(g, xx - 48, H - 32, 96, 14, on ? '#2a3a7a' : '#141a3a'); T(g, it.label, xx, H - 29, on ? '#ffe27a' : '#c8d0f0', { align: 'center' }); });
    });
  }
};
// the horizontal results list draws itself above; List.draw is kept for its rects only
S.results._draw = null;

/* ---------- game over ---------- */
S.gameover = {
  enter(d) {
    DH.idle = 0; this.d = d; this.t = 0;
    const items = [{ label: 'RETRY STAGE', fn: () => game.go('drive', { stage: d.stage, free: d.free }, { fade: 'wipe' }) }];
    if (d.checkpoint) items.push({ label: 'CONTINUE FROM LAST STATION', fn: () => game.go('drive', { stage: d.stage, free: d.free, restore: { snap: d.checkpoint, cont: true } }, { fade: 'wipe' }) });
    items.push({ label: 'HALO MAP', fn: () => game.go('halomap', { sel: d.stage }, { fade: 'wipe' }) });
    this.list = new List(items);
  },
  update(dt) { this.t += dt; if (game.shell && game.shell.screen) return; if (this.t > .8) this.list.update(); },
  draw(r) {
    r.sky(['#101014', '#1a1a20', '#24242c']);
    r.overlay(g => {
      const W = r.W, H = r.H;
      DH.drawCrackedHalo(g, W / 2, H * .25, 2 + this.t);
      const sg = DH.STAGES[this.d.stage];
      DH.castRig('hoshino').drawPortrait(g, W / 2 - 120, H * .42, 34);
      T(g, '"' + (sg.gameOver || "That's enough. Hand me the key.") + '"', W / 2 - 80, H * .42 + 12, '#ffffff');
      T(g, 'Continue: Halo Time back to the start, score halved.', W / 2, H * .42 + 40, '#8a90b0', { align: 'center' });
      panel(g, W / 2 - 120, H * .62, 240, this.list.items.length * 17 + 8);
      this.list.draw(g, W / 2, H * .62 + 6, { w: 228, scale: 1, lh: 13 });
    });
  }
};

/* ---------- the ending: the finale on the platform, then the credits round the ring at night ---------- */
S.ending = {
  enter() {
    DH.idle = 0; this.t = 0; this.phase = 'finale'; DH.music('ending');
    const R = DH.route('halo');
    this.bg = new Backdrop({ tod: 23.3, weather: 'clear', cam: { s: 15, x: -3.2, h: 2.8, dir: -1, horizon: .5 }, train: { s: 0 } });
    this.people = [];
    for (let i = 0; i < 9; i++) this.people.push(DH.personThing({ s: -4 - i * 4, x: -3 - (i % 2) * .7, p: i === 0 ? { rig: DH.castRig('ota') } : i === 1 ? { rig: DH.castRig('mika') } : { rig: DH.makeStaff(), col: '#1e3058' }, facing: 0, pose: 'bow' }));
    this.people.push(DH.personThing({ s: 3, x: -2.6, p: { rig: DH.castRig('hoshino') }, facing: -Math.PI / 2 + Math.PI }));
    this.talk = new E.Dialog(game, { speed: 40, lines: 3 }); this.k = 0; this.nextLine();
    this.credits = DH.CREDITS_ROLL();
  },
  nextLine() {
    const L = DH.FINALE[this.k]; if (!L) { this.phase = 'credits'; this.t = 0; this.bg = new Backdrop({ tod: 23.6, weather: 'clear', cam: { s: 0, x: 8, h: 30, dir: 1, horizon: .5, fov: 70 }, move: 60 }); this.bg.camS = 0; return; }
    const C = DH.CAST[L[0]]; this.talk.nameColor = C.color; this.talk.voice = DH.Babble.dialogHook(C.voice);
    this.talk.say(L[1], { name: C.name, portrait: DH.portraitOf(L[0]) || undefined, portraitSize: 44, onDone: () => { this.k++; this.nextLine(); } });
  },
  update(dt) {
    this.t += dt; this.bg.update(dt);
    for (const p of this.people) DH.stepPerson(p, dt);
    if (this.phase === 'finale') { this.talk.update(dt); if (I().pressed('cancel')) { this.talk.close(); this.k = 99; this.nextLine(); } return; }
    if (this.t > this.credits.length * 11 / 14 + 14 || ((I().pressed('confirm') || I().pressed('cancel')) && this.t > 2)) game.go('title', null, { fade: 'wipe' });
  },
  draw(r) {
    if (this.phase === 'finale') {
      this.bg.draw(r);
      r.overlay(g => { const rail = this.bg.rail; const C = { tint: (h) => h, d: 10, t: game.real, dir: -1, rail, night: 1 }; for (const p of this.people) { const q = rail.project(p.s, p.x, 1.1); if (q) p.draw(g, q[0], q[1], q[2], Object.assign(C, { d: q[3] }), p); } });
      this.talk.draw(r); return;
    }
    this.bg.draw(r); dim(r, .35);
    r.overlay(g => {
      const W = r.W, H = r.H, y0 = H - this.t * 14;
      this.credits.forEach((l, i) => { const y = y0 + i * 11; if (y < -10 || y > H) return; T(g, l[0], W / 2, y, l[1] || '#ffffff', { align: 'center', scale: l[2] || 1 }); });
      if (y0 + this.credits.length * 11 < H * .45) T(g, 'THANK YOU FOR RIDING THE HALO LINE', W / 2, H * .45, DH.COL.gold, { align: 'center', scale: 2 });
    });
  }
};
DH.CREDITS_ROLL = () => {
  const out = [['DENSHA DE HALO!', DH.COL.gold, 3], [''], ['an original homage to Densha de Go! (Taito); not affiliated', '#a8b4e0'], [''],
    ['THE HALO LINE', '#ffd84a'], ['Chief Instructor  TETSUO HOSHINO'], ['Conductor  MIKA AOBA'], ['Station Master  OTA'], ['Train fan  KOTA'], ['Regular passenger  GRANDMA FUJI'], ['Always late  KENJI'], ['Sky Liner driver  REN KUROSAWA'], ['Inner loop  SATO'], ['Mascot  HARO-KUN'], [''],
    ['MADE WITH', '#ffd84a'], ['my-3D2dge v' + E.version + ' by Michael Crosato (MIT)'], ['rail.js pseudo-3D railway renderer (new)'], ['AI Hub Session Protocol 1, client 1.4.0'], [''],
    ['BUILT BY', '#ffd84a'], ['Anthropic claude-opus-5-5, reasoning effort medium'], ['from PLAN.md'], [''], ['All art, music, sound and voices made in code.'], [''], ['A loop has no last station.', '#ffd84a'], ['Every ending is the next departure.', '#ffd84a']];
  return out;
};

/* ---------- Driver's Log: records, postcards, stats ---------- */
DH.renderShot = (shot, w, h) => {
  if (game.headless || typeof document === 'undefined') return null;
  const cv = E.mkCanvas(w, h), g = E.ctx2d(cv), sg = DH.STAGES[shot.stage], R = DH.route(sg.route), rail = DH.railFor(R);
  const cam = shot.cam === 'platform' ? { s: shot.s + 40, x: -3.2, h: 2.8, dir: -1, horizon: .5, fov: 70 } : shot.cam === 'chase' ? { s: shot.s - 145, x: 2, h: 9, dir: 1, horizon: .5, fov: 70 } : shot.cam === 'chaseHigh' ? { s: shot.s - 240, x: 6, h: 22, dir: 1, horizon: .5, fov: 70 } : { s: shot.s, x: 0, h: 2.9, dir: 1, horizon: .45 };
  const tr = new DH.TrainActor({ id: 'pc', kind: sg.train, cars: sg.cars, s: shot.s, dir: 1, xAt: s => R.trackX('A', DH.wrap(s, R.len)) || 0 });
  rail.paint(g, { x: 0, y: 0, w, h }, cam, { actors: shot.cam === 'cab' ? [] : [tr], grade: DH.grade(shot.tod, shot.weather || 'clear', R), weather: shot.weather, t: 1, fogDist: 1100, headlight: true });
  return cv;
};
S.log = {
  enter() { DH.idle = 0; DH.music('menu'); this.tab = 0; this.sel = 0; this.big = null; this.shots = {}; this.rects = []; },
  update() {
    if (game.shell && game.shell.screen) return;
    const In = I();
    if (this.big !== null) { if (In.pressed('confirm') || In.pressed('cancel') || In.clicked()) { this.big = null; snd('back'); } return; }
    if (In.pressed('cancel')) { snd('back'); game.go('title', null, { fade: 'wipe' }); return; }
    const tabs = 3;
    if (this.tab === 1) {
      if (In.repeat('right', .3, .15)) { this.sel = (this.sel + 1) % 8; snd('move'); } if (In.repeat('left', .3, .15)) { this.sel = (this.sel + 7) % 8; snd('move'); }
      if (In.repeat('down', .3, .15)) { if (this.sel >= 4) { this.tab = 2; } else this.sel += 4; snd('move'); } else if (In.repeat('up', .3, .15)) { if (this.sel < 4) this.tab = 0; else this.sel -= 4; snd('move'); }
      if (In.pressed('confirm') && DH.progress.postcards.includes(this.sel + 1)) { this.big = this.sel; snd('postcard'); }
    } else { if (In.repeat('right', .3, .15) || In.repeat('down', .3, .15)) { this.tab = (this.tab + 1) % tabs; snd('move'); } if (In.repeat('left', .3, .15) || In.repeat('up', .3, .15)) { this.tab = (this.tab + tabs - 1) % tabs; snd('move'); } }
    const p = In.pointer && In.pointer(), c = In.clicked && In.clicked();
    const mv = p && this.lastP && (p[0] !== this.lastP[0] || p[1] !== this.lastP[1]); this.lastP = p ? p.slice() : null;
    for (const q of this.rects) { if (mv && p[0] >= q.x && p[0] < q.x + q.w && p[1] >= q.y && p[1] < q.y + q.h) { if (q.tab !== undefined) this.tab = q.tab; if (q.card !== undefined) { this.tab = 1; this.sel = q.card; } } if (c && c[0] >= q.x && c[0] < q.x + q.w && c[1] >= q.y && c[1] < q.y + q.h) { if (q.card !== undefined && DH.progress.postcards.includes(q.card + 1)) { this.big = q.card; snd('postcard'); } if (q.tab !== undefined) { this.tab = q.tab; snd('move'); } } }
  },
  draw(r) {
    r.sky(['#0a0e24', '#14204a', '#1a2a5a']);
    r.overlay(g => {
      const W = r.W, H = r.H, P = DH.progress; this.rects = [];
      T(g, "DRIVER'S LOG", W / 2, 6, DH.COL.gold, { align: 'center', scale: 2 });
      ['RECORDS', 'POSTCARDS', 'STATS'].forEach((t, i) => { const x = W / 2 - 120 + i * 80; px.rect(g, x, 24, 76, 14, i === this.tab ? '#2a3a7a' : '#141a3a'); T(g, t, x + 38, 27, i === this.tab ? '#ffe27a' : '#a8b0d0', { align: 'center' }); this.rects.push({ x, y: 24, w: 76, h: 14, tab: i }); });
      if (this.tab === 0) DH.CAREER.forEach((id, i) => {
        const x = W / 2 - 150 + (i % 3) * 102, y = 46 + Math.floor(i / 3) * 76, sg = DH.STAGES[id];
        panel(g, x, y, 96, 70); T(g, id + ' ' + sg.name.slice(0, 13), x + 4, y + 4, '#ffffff');
        if (P.ranks[id]) { DH.stamp(g, x + 76, y + 36, P.ranks[id], .7); T(g, DH.fmtNum(P.best[id] || 0), x + 4, y + 22, '#ffe27a'); T(g, 'best stop ' + (P.bestErr[id] !== undefined ? P.bestErr[id].toFixed(2) + ' m' : '-'), x + 4, y + 36, '#c8d0f0'); T(g, (P.perfects[id] || 0) + ' perfect', x + 4, y + 48, '#c8d0f0'); }
        else T(g, P.unlocked.includes(id) ? 'not yet driven' : 'locked', x + 4, y + 30, '#6a7090');
      });
      if (this.tab === 1) DH.POSTCARDS.forEach((pc, i) => {
        const cw = Math.min(90, (W - 40) / 4), ch = R(cw * .66), x = W / 2 - cw * 2 - 6 + (i % 4) * (cw + 4), y = 46 + Math.floor(i / 4) * (ch + 22), got = P.postcards.includes(pc.id), on = this.sel === i;
        this.rects.push({ x, y, w: cw, h: ch + 18, card: i });
        px.rect(g, x - 1, y - 1, cw + 2, ch + 2, on ? DH.COL.gold : '#3a4a80');
        if (got) { if (!this.shots[i]) this.shots[i] = DH.renderShot(pc.shot, 160, 100) || 'none'; if (this.shots[i] !== 'none') g.drawImage(this.shots[i], 0, 0, 160, 100, x, y, cw, ch); else px.rect(g, x, y, cw, ch, '#3a5a8a'); }
        else { px.rect(g, x, y, cw, ch, '#141a3a'); T(g, '?', x + cw / 2, y + ch / 2 - 7, '#3a4a80', { align: 'center', scale: 2 }); }
        T(g, got ? pc.title : '???', x + cw / 2, y + ch + 4, on ? '#ffe27a' : '#c8d0f0', { align: 'center' });
      });
      if (this.tab === 2) { const st = P.stats, items = [[st.km.toFixed(1), 'KM DRIVEN'], [st.stops, 'STOPS MADE'], [st.perfect, 'PERFECT STOPS'], [st.calls, 'CALLS MADE']]; items.forEach(([v, l], i) => { const x = W / 2 - 150 + (i % 2) * 154, y = 50 + Math.floor(i / 2) * 70; panel(g, x, y, 146, 60); T(g, String(v), x + 73, y + 12, '#ffe27a', { align: 'center', scale: 3 }); T(g, l, x + 73, y + 42, '#c8d0f0', { align: 'center' }); }); }
      if (this.big !== null) {
        const pc = DH.POSTCARDS[this.big], w = Math.min(W - 20, 300), h = Math.min(H - 20, 200), x = W / 2 - w / 2, y = H / 2 - h / 2;
        px.rect(g, x - 2, y - 2, w + 4, h + 4, '#3a2a18'); px.rect(g, x, y, w, h, '#f4ece0');
        const iw = R(w * .55), ih = R(iw * .62); if (this.shots[this.big] && this.shots[this.big] !== 'none') g.drawImage(this.shots[this.big], 0, 0, 160, 100, x + 8, y + 8, iw, ih);
        T(g, pc.title, x + iw + 16, y + 10, '#2a3a6a', { shadow: null }); T(g, 'from ' + pc.from, x + iw + 16, y + 22, '#7a5a3a', { shadow: null });
        E.font.wrap(pc.note, w - iw - 26).forEach((l, i) => T(g, l, x + iw + 16, y + 38 + i * 10, '#3a2a18', { shadow: null }));
        px.rect(g, x + w - 30, y + 8, 22, 26, '#d02a20'); DH.drawHaro(g, x + w - 19, y + 30, .6, game.real, { still: true });
      }
      DH.prompts(g, W, H, [['left', 'MOVE'], ['confirm', 'OPEN'], ['cancel', 'BACK']]);
    });
  }
};

/* ---------- How to Drive (the Shell's help screen, the keys for the current device) ---------- */
DH.showHelp = () => {
  const dev = DH.device(), k = a => DH.glyphLabel(a, dev);
  const keys = [[k('power') + ' / ' + k('brake'), 'Lever: power up, brake down (one notch a press)'], [k('neutral'), 'Lever to N'], [k('eb'), 'Emergency brake'], [k('call'), 'Point and call'], [k('horn'), 'Horn (hold)'], [k('ats'), 'ATS confirm'], [k('view'), 'Change view'], [dev === 'gamepad' ? 'Right stick' : 'Right-drag', 'Look around']];
  game.shell.show('help', { title: 'How to Drive', keys, sections: [
    ['The lever', 'One lever runs from EB through the brake notches (B8 to B1), N, then power (P1 to P5). The doors must be shut and the orange PILOT lamp lit before power works. You cannot steer, reverse, or work the doors: the track and the conductor do that.'],
    ['Stop on the mark', 'Each platform has a yellow stop marker for your train length (6 or 10). The Stop Gauge appears 600 m out and zooms in for the last 30 m. Within 10 cm is a PERFECT HALO. Ease to B1 just before you stop for SMOOTH.'],
    ['Be on time', 'Arrive within 2 seconds of the timetable on your dash. Late costs Halo Time; early earns nothing. Halo Time is your life: at zero, the instructor takes the key.'],
    ['Point and call', 'When a white bracket frames a signal or board, press call: the glove points, you say it. Best between 120 and 60 m. At departure, call "Shuppatsu, shinko!" before the first power notch.'],
    ['Signals & ATS', 'Green proceed, yellow-green 65, yellow 45, two yellows 25, red stop. Passing a red signal\'s beacon rings the ATS bell: confirm within 5 seconds, then brake. Horn boards: hold the horn in the next 150 m.']] });
};

/* ---------- About & Credits: pages of pixel text ---------- */
S.about = {
  enter() { DH.idle = 0; DH.music('menu'); this.page = 0; this.scroll = 0; },
  update(dt) {
    if (game.shell && game.shell.screen) return;
    const In = I(), pages = DH.ABOUT_PAGES();
    if (In.repeat('right', .3, .15)) { this.page = (this.page + 1) % pages.length; this.scroll = 0; snd('move'); }
    if (In.repeat('left', .3, .15)) { this.page = (this.page + pages.length - 1) % pages.length; this.scroll = 0; snd('move'); }
    if (In.down('down') || DH.wheelQueue.includes('brake')) this.scroll += 90 * dt * (DH.wheelQueue.length ? 4 : 1);
    if (In.down('up') || DH.wheelQueue.includes('power')) this.scroll -= 90 * dt * (DH.wheelQueue.length ? 4 : 1);
    DH.wheelQueue.length = 0; this.scroll = Math.max(0, this.scroll);
    const c = In.clicked && In.clicked(); if (c) { if (c[0] < game.W * .2) { this.page = (this.page + pages.length - 1) % pages.length; this.scroll = 0; } else if (c[0] > game.W * .8) { this.page = (this.page + 1) % pages.length; this.scroll = 0; } }
    if (In.pressed('cancel')) { snd('back'); game.go('title', null, { fade: 'wipe' }); }
  },
  draw(r) {
    r.sky(['#0a0e24', '#14204a', '#1a2a5a']);
    r.overlay(g => {
      const W = r.W, H = r.H, pages = DH.ABOUT_PAGES(), pg = pages[this.page], tw = Math.min(W - 40, 380);
      T(g, 'ABOUT & CREDITS  ' + (this.page + 1) + '/' + pages.length, W / 2, 6, DH.COL.gold, { align: 'center', scale: 1 });
      T(g, pg[0], W / 2, 18, '#ffffff', { align: 'center', scale: 2 });
      const lines = []; for (const para of pg[1]) { for (const l of E.font.wrap(para, tw)) lines.push(l); lines.push(''); }
      const maxS = Math.max(0, lines.length * 10 - (H - 64)); this.scroll = Math.min(this.scroll, maxS);
      g.save(); g.beginPath(); g.rect(0, 38, W, H - 58); g.clip();
      lines.forEach((l, i) => { const y = 40 + i * 10 - this.scroll; if (y > 30 && y < H - 18) T(g, l, (W - tw) / 2, y, /^[A-Z][A-Za-z &]+:/.test(l) ? '#ffd84a' : '#e0e6ff'); });
      g.restore(); px.reset(g);
      DH.prompts(g, W, H, [['left', 'PAGE'], ['up', 'SCROLL'], ['cancel', 'BACK']]);
    });
  }
};
})();
