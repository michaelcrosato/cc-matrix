// Canvas screens (10.2), pixel art at 10 feet: a menu (scale 2, a pulsing chevron, mouse hover and click), the title,
// the op card and banners, the map, the tally, continue, game over, the ending, credits, initials, About, the touch
// notice, the squad lobby, and the cutscenes (briefing, interrogation, Kennel aftermath).
(() => {
const E = My3D2dge, WP = globalThis.WP, { px } = E, { clamp, lerp } = WP;
const F = (g, s, x, y, c = '#f2ead3', o = {}) => E.font.text(g, s, Math.round(x), Math.round(y), c, Object.assign({ outline: '#0c0a06' }, o));
const Sc = WP.Screens = { banners: [] };
const game = () => WP.ctx.game;
const I = () => game().input;
const any = f => (game().players || [game().input]).some(f);
// ---------- a canvas menu at 10 feet ----------
class Menu {
  constructor(items, o = {}) { this.items = items; this.i = o.i || 0; this.o = o; this.box = null; this._mt = null; this.active = true; this.skip(1); }
  skip(d) { for (let k = 0; k < this.items.length && this.items[this.i].disabled; k++) this.i = (this.i + d + this.items.length) % this.items.length; }
  update() {
    if (!this.active) return null;
    const n = this.items.length, old = this.i, inp = I(), b = this.box;
    const row = p => { if (!b || !p || p[0] < b.x || p[0] > b.x + b.w) return -1; const k = Math.floor((p[1] - b.y) / b.rh); return k >= 0 && k < n && !this.items[k].disabled ? k : -1; };
    const vert = !this.o.horizontal;
    if (any(q => q.repeat(vert ? 'up' : 'left'))) { this.i = (this.i + n - 1) % n; this.skip(-1); }
    if (any(q => q.repeat(vert ? 'down' : 'right'))) { this.i = (this.i + 1) % n; this.skip(1); }
    const pt = inp.pointer && inp.pointer(), pk = pt ? pt[0] + ',' + pt[1] : null;
    if (pk && pk !== this._mt) { const first = this._mt === undefined; this._mt = pk; const k = row(pt); if (k >= 0 && !first) this.i = k; }   // (the pointer moved over an entry: hover moves the focus)
    const tap = row(inp.clicked());
    if (tap >= 0) this.i = tap;
    if (this.i !== old) WP.Audio.play('menuMove');
    if ((any(q => q.pressed('confirm')) || tap >= 0) && !this.items[this.i].disabled) { WP.Audio.play('menuPick'); any(q => { q.consumeAll(); return false; }); return this.items[this.i]; }
    if (any(q => q.pressed('cancel')) && this.o.onCancel) { WP.Audio.play('menuBack'); any(q => { q.consumeAll(); return false; }); this.o.onCancel(); }
    return null;
  }
  draw(g, x, y, o = {}) {
    const sc = o.scale || 2, rh = 8 * sc + 6, w = o.w || Math.max(...this.items.map(it => E.font.width(it.label, { scale: sc }))) + 40;
    const x0 = o.align === 'left' ? x : x - w / 2; this.box = { x: x0, y: y - 3, w, rh };
    this.items.forEach((it, k) => {
      const sel = k === this.i && this.active, yy = y + k * rh, c = it.disabled ? '#6a6a5a' : sel ? '#ffd040' : '#e8e0c8';
      if (sel) { px.blend(g, .35 + .15 * Math.sin(WP.time * 6), 'add', () => px.rect(g, x0, yy - 3, w, rh - 1, '#5a4a14')); const cx = x0 + 6 + Math.round(Math.sin(WP.time * 8) * 2); px.poly(g, [[cx, yy], [cx + 7, yy + 4 * sc / 2 + 2], [cx, yy + 4 * sc + 2]], '#ffd040'); }
      F(g, it.label, o.align === 'left' ? x0 + 20 : x, yy, c, { scale: sc, align: o.align === 'left' ? 'left' : 'center' });
    });
  }
}
WP.UIMenu = Menu;
/** prompts in the last-used device's glyphs, bottom right */
Sc.prompts = (g, list) => {
  const s = list.map(([a, t]) => (I().map[a] ? I().label(a).toUpperCase() : a) + ' ' + t).join('   ');
  F(g, s, WP.W - 6, WP.H - 12, '#d8d0b0', { align: 'right' });
};
const glyph = a => I().label(a).toUpperCase();
Sc.glyph = glyph;
// ---------- backgrounds ----------
const NIGHT = { sky: ['#05060e', '#0c1024', '#1a1838', '#2a2040'], moon: { x: .72, y: .3, r: 26, color: '#f4ecd0' }, stars: 60, starsY: .8, layers: [{ kind: 'mountains', color: '#141626', y: .62, height: .3, parallax: .05, seed: 3 }, { kind: 'hills', color: '#0c0e18', y: .8, height: .15, parallax: .1, seed: 5 }] };
const nightBg = new E.Backdrop(NIGHT);
const wolfPoly = (x, y, s, flip) => {   // a howling wolf, sitting, head up
  const P = [[0, 0], [-4, -1], [-7, -3], [-8, -5], [-5, -4], [-2, -4], [-1, -9], [0, -14], [2, -18], [2, -22], [1, -26], [3, -24], [4, -27], [5, -23], [7, -24], [10, -28], [11.5, -28], [10, -25], [8, -21], [7, -17], [7, -12], [8, -7], [9, -1], [10, 0], [6, 0], [5, -4], [3, -4], [2, 0]];
  return P.map(([a, b]) => [x + (flip ? -a : a) * s, y + b * s]);
};
const nightNoMoon = new E.Backdrop(Object.assign({}, NIGHT, { moon: null }));
Sc.drawNight = (g, r, t, o = {}) => {
  (o.moon ? nightNoMoon : nightBg).draw(r, { x: t * 8, y: 0 });
  if (o.moon) {   // a big moon behind the ridge, its halo stepped
    const [mx, my, mr] = o.moon;
    for (let i = 4; i >= 1; i--) px.blend(g, .1, 'add', () => px.disc(g, mx, my, mr + i * 9, '#c8c0a0'));
    px.disc(g, mx, my, mr, '#f4ecd0'); px.disc(g, mx - mr * .3, my - mr * .2, mr * .18, '#e0d8b8'); px.disc(g, mx + mr * .25, my + mr * .3, mr * .12, '#e0d8b8'); px.disc(g, mx + mr * .4, my - mr * .35, mr * .09, '#e0d8b8');
  }
  // searchlights sweeping from the ridge
  for (const [bx, ph] of [[60, 0], [420, 2]]) { const a = -Math.PI / 2 + Math.sin(t * .5 + ph) * .7, L = 300; px.blend(g, .12, 'add', () => px.poly(g, [[bx, 220], [bx + Math.cos(a - .06) * L, 220 + Math.sin(a - .06) * L], [bx + Math.cos(a + .06) * L, 220 + Math.sin(a + .06) * L]], '#e8f0d0')); }
  // the ridge and the four wolves (in front of the moon on the title)
  const W0 = o.wolfX || 0;
  px.poly(g, [[0, 270], [0, 214], [90, 206], [170, 204], [250, 200], [300 + W0 * 0, 196], [330, 190], [370, 186], [420, 190], [480, 200], [480, 270]], '#06070c');
  if (o.wolves !== false) (o.moon ? [[316, 190, 1.5], [350, 186, 2.1, true], [388, 187, 1.7], [418, 190, 1.3, true]] : [[150, 204, 1.3], [210, 202, 1.6, true], [280, 200, 1.4], [330, 192, 1.15, true]]).forEach(([x, y, s, f], i) => { const hw = Math.max(0, Math.sin(t * .7 + i * 1.3)) * 2; px.poly(g, wolfPoly(x, y + hw * .3, s, f), '#06070c'); });
  // a helicopter crossing far away
  const hx = ((t * 22) % 700) - 110, hy = 70 + Math.sin(t * .8) * 6;
  px.rect(g, hx, hy, 14, 5, '#101018'); px.rect(g, hx - 10, hy + 1, 10, 2, '#101018'); px.line(g, hx - 6, hy - 2, hx + 20, hy - 2, Math.floor(t * 30) % 2 ? '#202030' : '#101018'); if (Math.floor(t * 2) % 2) px.dot(g, hx - 10, hy + 1, '#ff3a2a');
};
Sc.logo = (g, x, y, scale = 3) => {
  E.font.title(g, 'OPERATION', x, y, { scale: scale - 1, colors: ['#e8e0b8', '#c8b878', '#8a7a3a'], outline: '#0a0804', depth: 2, depthColor: '#3a3010', align: 'center' });
  E.font.title(g, 'WOLFPACK', x, y + 8 * (scale - 1) + 6, { scale: scale + 1, colors: ['#fff0a0', '#e8b040', '#9a6a1a'], outline: '#0a0804', depth: 4, depthColor: '#4a2a08', align: 'center' });
};
// ---------- the op card and banners (inside play) ----------
Sc.opCard = (g, sim, t, T) => {
  const st = sim.stage, [nm, card] = WP.TEXT.ops[st.id] || [st.name, ''], u = clamp(t / .35, 0, 1), out = clamp((T - t) / .3, 0, 1), k = Math.min(u, out);
  px.blend(g, .78 * k, 'normal', () => px.rect(g, 0, 60, WP.W, 110, '#06080a'));
  const sx = lerp(-200, 0, WP.smooth(u));
  F(g, 'OPERATION ' + st.n, WP.W / 2 + sx, 70, '#e0b040', { align: 'center', scale: 2 });
  E.font.title(g, nm, WP.W / 2 - sx, 90, { scale: 3, colors: ['#fff6c8', '#ffd36a', '#c86a2a'], outline: '#0a0804', depth: 2, depthColor: '#4a2a08', align: 'center' });
  F(g, card, WP.W / 2, 124, '#f2ead3', { align: 'center' });
  const ks = Object.keys(sim.quotaMax), Q = { soldier: 'i_soldier', vehicle: 'i_jeep', air: 'i_heli', boat: 'i_boat' };
  ks.forEach((q, i) => { const x = WP.W / 2 - ks.length * 30 + i * 60 + 10; g.drawImage(WP.SPR[Q[q]].cv, x, 138, 16, 16); F(g, '× ' + sim.quotaMax[q], x + 20, 142, '#f2ead3'); });
  F(g, t < T - .8 ? 'GET READY' : 'GO!', WP.W / 2, 160, t < T - .8 ? '#ffffff' : '#ffd040', { align: 'center', scale: t < T - .8 ? 1 : 2 });
};
Sc.banner = (title, sub, s = 2.4) => { Sc.banners.push({ title, sub, t: 0, s }); };
Sc.drawBanners = (g, dt) => {
  for (const b of Sc.banners) {
    b.t += dt; const u = clamp(b.t / .25, 0, 1) * clamp((b.s - b.t) / .3, 0, 1), on = Math.floor(b.t * 6) % 2 === 0;
    px.blend(g, .7 * u, 'normal', () => px.rect(g, 0, 84, WP.W, 44, '#300808'));
    if (on || b.t > 1) E.font.title(g, b.title, WP.W / 2, 88, { scale: 3, colors: ['#ffffff', '#ff6a40', '#a01a10'], outline: '#000', depth: 2, depthColor: '#400808', align: 'center' });
    F(g, b.sub, WP.W / 2, 116, '#ffe0c0', { align: 'center' });
  }
  Sc.banners = Sc.banners.filter(b => b.t < b.s);
};
// ---------- the title ----------
WP.titleScene = {
  enter() {
    if (WP.pendingBoot) { const f = WP.pendingBoot; WP.pendingBoot = null; if (f()) return; }
    const g = game(); this.t = 0; this.idle = 0; this.mode = 'menu'; WP.Music.play(g, 'title');
    const cleared = WP.Store.anyCleared();
    this.menu = new Menu([{ label: 'START MISSION', id: 'start' }, { label: 'SQUAD (CO-OP)', id: 'squad' }, { label: 'MISSION SELECT', id: 'select', disabled: !cleared }, { label: 'HIGH SCORES', id: 'scores' }, { label: 'SETTINGS', id: 'settings' }, { label: 'ABOUT / CREDITS', id: 'about' }]);
    this.diff = null; WP.Attract.reset();
    if (g.canvas) g.canvas.style.cursor = '';
  },
  update(dt) {
    const g = game(); this.t += dt; WP.time += dt;
    if (WP.Attract.title(dt, g, this)) return;
    if (WP.Touch.on) { if (WP.Touch.update(g)) return; return; }
    if (this.mode === 'scores') { if (any(q => q.pressed('confirm') || q.pressed('cancel')) || I().clicked()) { this.mode = 'menu'; WP.Audio.play('menuBack'); } return; }
    if (this.mode === 'diff') {
      const it = this.diffMenu.update(); if (it) { g.settings.set('difficulty', it.id); WP.Flow.newRun({ diff: it.id }); WP.Flow.run.players = (g.players || []).length; g.go('cutscene', { id: 'briefing', next: 'map' }); }
      return;
    }
    if (this.mode === 'select') { const it = this.selMenu.update(); if (it) { WP.Flow.newRun({ diff: g.settings.difficulty, select: true }); WP.Flow.run.single = true; g.go('opcard', { op: it.id }); } return; }
    const it = this.menu.update();
    if (it) {
      if (it.id === 'start') { this.mode = 'diff'; const cur = g.settings.difficulty; this.diffMenu = new Menu([{ label: 'RECRUIT', id: 'RECRUIT' }, { label: 'VETERAN', id: 'VETERAN' }, { label: 'ARCADE', id: 'ARCADE' }], { i: ['RECRUIT', 'VETERAN', 'ARCADE'].indexOf(cur), onCancel: () => { this.mode = 'menu'; } }); }
      else if (it.id === 'squad') g.go('squad');
      else if (it.id === 'select') { this.mode = 'select'; this.selMenu = new Menu(WP.OPS.map((o, i) => ({ label: 'OP ' + (i + 1) + '  ' + WP.TEXT.ops[o][0], id: o })), { onCancel: () => { this.mode = 'menu'; } }); }
      else if (it.id === 'scores') this.mode = 'scores';
      else if (it.id === 'settings') g.menu('settings');
      else if (it.id === 'about') g.go('about', { back: 'title' });
    }
  },
  draw(r) {
    if (!this.menu) return;
    r.overlay(g => {
      Sc.drawNight(g, r, this.t, { moon: [366, 150, 34] });
      Sc.logo(g, WP.W / 2, 14, 3);
      for (const [x, f] of [[WP.W / 2 - 112, true], [WP.W / 2 + 112, false]]) { px.poly(g, wolfPoly(x + 1, 59, .95, f), '#3a2008'); px.poly(g, wolfPoly(x, 58, .95, f), '#e8b040'); }
      if (WP.Touch.on) { WP.Touch.draw(g); return; }
      if (this.mode === 'scores') { Sc.table(g, 'campaign', 'HIGH SCORES'); Sc.prompts(g, [['confirm', 'BACK']]); return; }
      if (this.mode === 'diff') { px.blend(g, .6, 'normal', () => px.rect(g, 60, 90, 360, 130, '#06080a')); F(g, 'CHOOSE DIFFICULTY', WP.W / 2, 96, '#e0b040', { align: 'center', scale: 2 }); this.diffMenu.draw(g, WP.W / 2, 122); const d = this.diffMenu.items[this.diffMenu.i].id; F(g, { RECRUIT: 'GENTLER FIRE. A REFILL WHEN YOU RUN DRY.', VETERAN: 'THE INTENDED HUNT. AN EMERGENCY DROP WHEN DRY.', ARCADE: 'THE ORIGINAL RULE: RUN DRY AND YOU GO DOWN.' }[d], WP.W / 2, 206, '#c8c0a0', { align: 'center' }); Sc.prompts(g, [['confirm', 'SELECT'], ['cancel', 'BACK']]); return; }
      if (this.mode === 'select') { px.blend(g, .6, 'normal', () => px.rect(g, 110, 86, 260, 128, '#06080a')); F(g, 'MISSION SELECT', WP.W / 2, 92, '#e0b040', { align: 'center', scale: 2 }); this.selMenu.draw(g, WP.W / 2, 112, { scale: 1, w: 220 }); Sc.prompts(g, [['confirm', 'DEPLOY'], ['cancel', 'BACK']]); return; }
      px.blend(g, .55, 'normal', () => px.rect(g, 14, 92, 232, 148, '#06080a'));
      this.menu.draw(g, 130, 100, { w: 224 });
      if (Math.floor(this.t * 2) % 2 === 0) F(g, 'PRESS ' + glyph('start'), 366, 226, '#ffd040', { align: 'center' });
      F(g, 'v' + WP.VERSION + '  •  ' + (E.versionLabel ? E.versionLabel() : 'my-3D2dge'), 6, WP.H - 12, '#6a6a5a');
      F(g, '© 2026 • AN ORIGINAL GAME INSPIRED BY OPERATION WOLF', WP.W - 6, WP.H - 12, '#6a6a5a', { align: 'right' });
    });
  }
};
// the high-score table (E.Arcade's)
Sc.table = (g, mode, title) => {
  const t = WP.Store.cab ? WP.Store.cab.table(mode) : [];
  px.blend(g, .8, 'normal', () => px.rect(g, 90, 84, 300, 150, '#06080a'));
  F(g, title, WP.W / 2, 90, '#e0b040', { align: 'center', scale: 2 });
  t.slice(0, 10).forEach((e, i) => { const y = 112 + i * 11, c = i === 0 ? '#ffd040' : '#f2ead3'; F(g, (i + 1) + '.', 150, y, c, { align: 'right' }); F(g, e.name, 170, y, c); F(g, WP.fmt(e.score), 330, y, c, { align: 'right' }); });
};
// ---------- the opcard scene: a beat of black, then play ----------
WP.opcardScene = { enter(d) { this.d = d; this.t = 0; }, update(dt) { this.t += dt; if (this.t > .15) game().go('play', Object.assign({}, this.d), { fade: 0 }); }, draw(r) { r.overlay(g => px.rect(g, 0, 0, WP.W, WP.H, '#000')); } };
// ---------- the map of the Brimstone Coast ----------
const NODES = { op1: [96, 150], op2: [150, 110], op3: [230, 170], op4: [300, 120], op5: [372, 76], op6: [420, 160] };
WP.mapScene = {
  enter(d = {}) {
    const g = game(), run = WP.Flow.run || WP.Flow.newRun(); this.t = 0; this.next = WP.Flow.nextOp(run) || 'op6'; this.i = WP.OPS.indexOf(this.next); this.select = !!run.select;
    WP.Music.play(g, 'map'); WP.HUD.clearRadio(); this.said = false;
  },
  update(dt) {
    const g = game(), run = WP.Flow.run; this.t += dt; WP.time += dt; WP.HUD.update(dt);
    if (!this.said && this.t > .6) { this.said = true; WP.HUD.say('DEN', WP.TEXT.map[WP.OPS[this.i]]); }
    if (WP.Attract.idleTick(dt, g)) return;
    if (this.select) { if (any(q => q.repeat('left') || q.repeat('up'))) { this.i = (this.i + 5) % 6; WP.Audio.play('menuMove'); this.said = false; } if (any(q => q.repeat('right') || q.repeat('down'))) { this.i = (this.i + 1) % 6; WP.Audio.play('menuMove'); this.said = false; } }
    const p = I().pointer && I().pointer(); if (p && I().mouse.t !== this._mt) { this._mt = I().mouse.t; WP.OPS.forEach((o, k) => { const [x, y] = NODES[o]; if (Math.hypot(p[0] - x, p[1] - y) < 14 && (this.select || k === WP.OPS.indexOf(this.next))) { if (this.i !== k) { this.i = k; this.said = false; } } }); }
    const c = I().clicked(), clickNode = c && WP.OPS.findIndex(o => Math.hypot(c[0] - NODES[o][0], c[1] - NODES[o][1]) < 14) === this.i;
    if (any(q => q.pressed('confirm')) || clickNode) { WP.Audio.play('menuPick'); g.go('opcard', { op: WP.OPS[this.i] }); }
    if (any(q => q.pressed('cancel'))) { g.menu && g.menu('settings'); }
  },
  draw(r) {
    r.overlay(g => {
      px.rect(g, 0, 0, WP.W, WP.H, '#1a3a5a');
      for (let y = 0; y < WP.H; y += 4) px.blend(g, .15, 'normal', () => px.rect(g, 0, y, WP.W, 1, '#2a5a7a'));
      const coast = [[0, 230], [40, 200], [70, 210], [110, 186], [140, 196], [190, 214], [240, 206], [280, 220], [330, 200], [380, 214], [430, 198], [480, 206], [480, 0], [0, 0]];
      px.poly(g, coast.map(([x, y]) => [x, y - 6]), '#3a6a3a'); px.poly(g, coast, '#4a7a3a');
      px.poly(g, [[0, 0], [480, 0], [480, 60], [380, 50], [300, 70], [200, 50], [100, 64], [0, 50]], '#2e5a2a');
      // the volcano, the river, the roads
      px.poly(g, [[250, 70], [282, 24], [292, 24], [330, 70]], '#5a4a3a'); px.poly(g, [[276, 32], [282, 24], [292, 24], [298, 32]], '#e8502a'); for (let i = 0; i < 4; i++) px.blend(g, .4, 'normal', () => px.disc(g, 287 + Math.sin(this.t + i) * 4, 18 - i * 5 - (this.t * 4 % 5), 4 + i, '#6a6a6a'));
      px.line(g, 150, 210, 150, 110, '#4a8ab8', 3); px.line(g, 150, 110, 200, 60, '#4a8ab8', 2);
      for (let i = 0; i < 5; i++) { const a = NODES[WP.OPS[i]], b = NODES[WP.OPS[i + 1]], run = WP.Flow.run, done = run.opsDone.includes(WP.OPS[i]); for (let k = 0; k <= 10; k++) { if (k % 2 && !done) continue; const x = lerp(a[0], b[0], k / 10), y = lerp(a[1], b[1], k / 10); px.rect(g, x - 1, y - 1, 2, 2, done ? '#ffd040' : '#d8c8a0'); } }
      F(g, 'THE BRIMSTONE COAST', WP.W / 2, 4, '#f2ead3', { align: 'center', scale: 2 }); F(g, 'MT. BRIMSTONE', 288, 74, '#d8c8a0', { align: 'center' });
      WP.OPS.forEach((o, k) => {
        const [x, y] = NODES[o], done = WP.Flow.run.opsDone.includes(o), cur = k === this.i, pulse = cur ? 2 + Math.sin(this.t * 6) * 2 : 0;
        px.disc(g, x, y, 8 + pulse, '#000'); px.disc(g, x, y, 7 + pulse, done ? '#3a8a3a' : cur ? '#e8b040' : '#8a7a5a');
        F(g, String(k + 1), x, y - 3, '#0a0804', { align: 'center', outline: false });
        if (done) F(g, '✓', x + 9, y - 12, '#5aff6a');
        F(g, WP.TEXT.ops[o][0], x, y + 12, cur ? '#ffd040' : '#e8e0c8', { align: 'center' });
      });
      const o = WP.OPS[this.i];
      E.ui.box(g, 6, 226, 300, 38, { bg: ['#1a2214', '#0c1208'], border: '#8a9a5a', alpha: .92 });
      F(g, 'OPERATION ' + (this.i + 1) + ': ' + WP.TEXT.ops[o][0], 12, 231, '#e0b040'); F(g, WP.TEXT.ops[o][1], 12, 243, '#f2ead3');
      const perks = Object.keys(WP.Flow.run.perks); if (perks.length) F(g, 'PERKS: ' + perks.map(k => WP.TEXT.perk[k][0]).join(' • '), 12, 254, '#a8d8a8');
      WP.HUD.drawRadio(g, WP.ctx.bigText);
      Sc.prompts(g, [['confirm', 'DEPLOY']].concat(this.select ? [['← →', 'CHOOSE']] : []));
    });
  }
};
// ---------- the tally ----------
WP.tallyScene = {
  enter(d) {
    const g = game(), run = WP.Flow.run, op = d.op, n = WP.STAGE[op].n, p = d.players[0], all = d.players;
    this.d = d; this.t = 0; this.i = 0; this.shown = 0; this.done = false;
    const acc = all.reduce((a, q) => a + q.hits, 0) / Math.max(1, all.reduce((a, q) => a + q.shots, 0));
    const civ = all.reduce((a, q) => a + q.civHits, 0), kills = all.reduce((a, q) => a + q.kills, 0), heads = all.reduce((a, q) => a + q.headshots, 0), ints = all.reduce((a, q) => a + q.intercepts, 0);
    const lines = [['SOLDIERS AND VEHICLES', kills, 0], ['ACCURACY ' + Math.round(acc * 100) + '%', Math.round(acc * 100) * 100 * n, 1], ['HEADSHOTS × ' + heads, heads * 200, 1], ['INTERCEPTS × ' + ints, ints * 100, 1], [civ ? 'CIVILIANS HIT × ' + civ : 'CIVILIANS SPARED', civ ? -1000 * civ : 5000, 1], ['OPERATION BONUS', 10000 * n, 1]];
    if (d.objective) lines.splice(1, 0, ['MASTS ' + d.objective.done + '/' + d.objective.need, d.objective.done * 1000, 1]);
    if (op === 'op5' || op === 'op6') lines.push(['HOSTAGES × ' + d.hostages, d.hostages * 5000, 1]);
    this.lines = lines; this.bonus = lines.filter(l => l[2]).reduce((a, l) => a + l[1], 0);
    // the bonus goes to every player who finished, split evenly
    const share = Math.round(this.bonus / all.length); for (const q of all) { const lo = run.loadouts[q.pid]; if (lo) lo.score += share; }
    this.total = Math.max(...all.map(q => (run.loadouts[q.pid] || q).score));
    // the perk and the heal
    const st = WP.STAGE[op], perk = st.perk; this.perk = perk; this.heal = op === 'op3' ? 40 : WP.T.clearHeal;
    if (perk && !d.single) {
      run.perks[perk] = true;
      for (const pid in run.loadouts) { const lo = run.loadouts[pid]; lo.damage = Math.max(0, lo.damage - this.heal); if (perk === 'suppliesSeized') { const lim = 10; while (lo.spares.length < lim) lo.spares.push(Math.round(WP.T.magSize)); lo.grenades = WP.T.maxGrenades; } }
    }
    WP.Music.play(g, 'tally', { loop: false, restart: true });
    this.clearLine = WP.fill(WP.TEXT.clear[op] || '', { n: d.hostages });
  },
  update(dt) {
    const g = game(); this.t += dt; WP.time += dt;
    const per = .7;
    const k = Math.floor(this.t / per); if (k > this.i && this.i < this.lines.length + 2) { this.i = k; WP.Audio.play(this.i <= this.lines.length ? 'tallyTick' : 'tallyBig'); }
    const fin = this.i >= this.lines.length + 2;
    if (any(q => q.pressed('confirm')) || I().clicked()) { if (!fin) { this.t = (this.lines.length + 2) * per; this.i = this.lines.length + 2; } else { WP.Audio.play('menuPick'); WP.Flow.afterTally(g, this.d.op); } }
    if (fin && this.t > (this.lines.length + 2) * per + 8) WP.Flow.afterTally(g, this.d.op);
  },
  draw(r) {
    r.overlay(g => {
      Sc.drawNight(g, r, this.t * .3, { wolves: false });
      px.blend(g, .7, 'normal', () => px.rect(g, 40, 10, 400, 250, '#06080a'));
      const op = this.d.op, n = WP.STAGE[op].n;
      F(g, 'OPERATION ' + n + ' CLEAR!', WP.W / 2, 16, '#ffd040', { align: 'center', scale: 2 });
      F(g, this.clearLine, WP.W / 2, 36, '#f2ead3', { align: 'center', wrap: 380 });
      this.lines.forEach((l, k) => { if (k >= this.i) return; const y = 58 + k * 16; F(g, l[0], 70, y, '#e8e0c8', { scale: 1 }); const v = l[2] ? (l[1] >= 0 ? '+' : '') + WP.fmt(l[1]) : String(l[1]); F(g, v, 410, y, l[1] < 0 ? '#ff6a50' : '#ffffff', { align: 'right', scale: 1 }); });
      if (this.i > this.lines.length) { F(g, 'TOTAL BONUS', 70, 58 + this.lines.length * 16 + 4, '#e0b040', { scale: 2 }); F(g, WP.fmt(this.bonus), 410, 58 + this.lines.length * 16 + 4, '#ffd040', { align: 'right', scale: 2 }); }
      if (this.i > this.lines.length + 1 && this.perk && !this.d.single) {
        const [pn, pd] = WP.TEXT.perk[this.perk]; E.ui.box(g, 90, 200, 300, 44, { bg: ['#2a3418', '#141a0c'], border: '#e0b040' });
        F(g, 'PERK: ' + WP.fill(pn, { n: this.d.hostages }), WP.W / 2, 206, '#ffd040', { align: 'center', scale: 1 }); F(g, WP.fill(pd, { n: this.d.hostages }), WP.W / 2, 218, '#f2ead3', { align: 'center' });
        F(g, 'DAMAGE REPAIRED -' + this.heal, WP.W / 2, 230, '#a8ffa8', { align: 'center' });
      }
      Sc.prompts(g, [['confirm', this.i >= this.lines.length + 2 ? 'CONTINUE' : 'SKIP']]);
    });
  }
};
// ---------- continue and game over ----------
WP.continueScene = {
  enter(d) { this.d = d; this.t = 0; this.n = 10; this.over = false; this.overT = 0; WP.Music.play(game(), 'continue'); },
  update(dt) {
    const g = game(); this.t += dt; WP.time += dt;
    if (this.over) { this.overT += dt; if (this.overT > 4 || this.overT > 1 && (any(q => q.pressed('confirm')) || I().clicked())) WP.Flow.gameOver(g, this.d); return; }
    const n = 10 - Math.floor(this.t); if (n !== this.n) { this.n = n; WP.Audio.play('tick', { pitch: .8 }); }
    if (any(q => q.pressed('confirm')) || I().clicked()) { WP.Audio.play('coin'); WP.Flow.continueOp(g, this.d.op, Object.fromEntries(this.d.players.map(p => [p.pid, p.score]))); return; }
    if (any(q => q.pressed('cancel')) || this.t >= 10) { this.over = true; WP.Music.play(g, 'gameover', { loop: false, restart: true }); }
  },
  draw(r) {
    r.overlay(g => {
      px.rect(g, 0, 0, WP.W, WP.H, '#0a0404');
      if (this.over) { E.font.title(g, 'GAME OVER', WP.W / 2, 80, { scale: 4, colors: ['#ffffff', '#ff6a40', '#a01a10'], outline: '#000', depth: 3, depthColor: '#400808', align: 'center' }); F(g, WP.TEXT.gameOver, WP.W / 2, 130, '#f2ead3', { align: 'center', scale: 2 }); F(g, 'SCORE ' + WP.fmt(this.d.score), WP.W / 2, 160, '#ffd040', { align: 'center', scale: 2 }); return; }
      E.font.title(g, 'CONTINUE?', WP.W / 2, 60, { scale: 4, colors: ['#ffffff', '#ffd040', '#c86a2a'], outline: '#000', depth: 3, depthColor: '#4a2a08', align: 'center' });
      E.font.title(g, String(Math.max(0, this.n)), WP.W / 2, 110, { scale: 6, colors: ['#ffffff', '#ff6a40', '#a01a10'], outline: '#000', depth: 3, depthColor: '#400808', align: 'center' });
      F(g, 'CONTINUES USED: ' + (WP.Flow.run ? WP.Flow.run.continues : 0) + '   SCORE ' + WP.fmt(this.d.score), WP.W / 2, 180, '#f2ead3', { align: 'center' });
      F(g, 'THE OPERATION STARTS AGAIN. YOUR SCORE IS KEPT.', WP.W / 2, 196, '#a8a890', { align: 'center' });
      Sc.prompts(g, [['confirm', 'CONTINUE'], ['cancel', 'GIVE UP']]);
    });
  }
};
WP.Flow.gameOver = (g, d) => { const sc = d.score, cab = WP.Store.cab; if (cab && cab.qualifies(sc, 'campaign') && !(WP.Flow.run && WP.Flow.run.demo)) g.go('initials', { score: sc, mode: 'campaign', next: 'title' }); else g.go('title'); };
// ---------- initials (E.Arcade's letter wheel) ----------
WP.initialsScene = {
  enter(d) { this.d = d; this.t = 0; const cab = WP.Store.cab; this.done = false; cab.mode = 'over'; cab.enter(d.score, d.mode || 'campaign', () => { this.done = true; }); WP.Music.play(game(), 'title'); },
  update(dt) { this.t += dt; WP.time += dt; WP.Store.cab.update(dt); if (this.done) { this.done = false; const q = this.d.queue; if (q && q.length) game().go('initials', Object.assign({}, this.d, { score: q[0], queue: q.slice(1) })); else game().go(this.d.next || 'title'); } },
  draw(r) { r.overlay(g => { Sc.drawNight(g, r, this.t * .3); F(g, 'A NEW HIGH SCORE!', WP.W / 2, 30, '#ffd040', { align: 'center', scale: 2 }); F(g, WP.fmt(this.d.score), WP.W / 2, 52, '#ffffff', { align: 'center', scale: 2 }); F(g, 'ENTER YOUR INITIALS', WP.W / 2, 74, '#e0b040', { align: 'center' }); }); WP.Store.cab.draw(r); }
};
// ---------- About / Credits: pages ----------
/** the About text flowed into screens that fit (a page continues on the next screen) */
Sc.aboutScreens = () => {
  const out = [], top = 30, bottom = WP.H - 22;
  for (const p of WP.TEXT.about) {
    let cur = { title: p.title, rows: [] }, y = top; out.push(cur);
    for (const [k, v] of p.lines) {
      const ls = E.font.wrap(v, 450), need = (k ? 9 : 0) + ls.length * 9 + 3;
      if (y + need > bottom && cur.rows.length) { cur = { title: p.title, rows: [] }; y = top; out.push(cur); }
      if (k) { cur.rows.push(['k', k]); y += 9; } for (const l of ls) { cur.rows.push(['', l]); y += 9; } cur.rows.push(['gap', '']); y += 3;
    }
  }
  const counts = {}; for (const sc of out) counts[sc.title] = (counts[sc.title] || 0) + 1;
  const seen = {}; for (const sc of out) { seen[sc.title] = (seen[sc.title] || 0) + 1; if (counts[sc.title] > 1) sc.title += ' (' + seen[sc.title] + '/' + counts[sc.title] + ')'; }
  return out;
};
WP.aboutScene = {
  enter(d = {}) { this.d = d; this.page = 0; this.t = 0; this.screens = Sc.aboutScreens(); },
  update(dt) {
    const g = game(), n = this.screens.length; this.t += dt; WP.time += dt;
    if (any(q => q.repeat('right') || q.repeat('down')) || I().clicked() && I().clicked()[0] > WP.W / 2) { this.page = (this.page + 1) % n; WP.Audio.play('menuMove'); }
    if (any(q => q.repeat('left') || q.repeat('up')) || I().clicked() && I().clicked()[0] <= WP.W / 2) { this.page = (this.page + n - 1) % n; WP.Audio.play('menuMove'); }
    if (any(q => q.pressed('cancel')) || any(q => q.pressed('confirm')) && this.page === n - 1) { WP.Audio.play('menuBack'); g.go(this.d.back || 'title'); }
    if (WP.Attract.idleTick(dt, g)) return;
  },
  draw(r) {
    r.overlay(g => {
      px.rect(g, 0, 0, WP.W, WP.H, '#0c1008');
      const p = this.screens[this.page], n = this.screens.length;
      F(g, p.title, WP.W / 2, 8, '#e0b040', { align: 'center', scale: p.title.length > 26 ? 1 : 2 });
      F(g, (this.page + 1) + ' / ' + n, 8, WP.H - 12, '#8a8a7a');
      let y = 30;
      for (const [k, v] of p.rows) { if (k === 'k') { F(g, v, 14, y, '#ffd040'); y += 9; } else if (k === 'gap') y += 3; else { F(g, v, 22, y, '#f2ead3'); y += 9; } }
      Sc.prompts(g, [['← →', 'PAGE'], ['cancel', 'BACK']]);
    });
  }
};
// ---------- the squad lobby (local co-op) ----------
WP.squadScene = {
  enter() { this.t = 0; WP.Music.play(game(), 'map'); },
  update(dt) {
    const g = game(); this.t += dt; WP.time += dt;
    if (I().pressed('confirm') || I().pressed('start') || I().clicked()) { WP.Audio.play('menuPick'); g.go('title'); g.scenes.title && (g._wpStart = true); WP.Flow.newRun({ diff: g.settings.difficulty }); g.go('cutscene', { id: 'briefing', next: 'map' }); }
    if (I().pressed('cancel')) { WP.Audio.play('menuBack'); g.go('title'); }
  },
  draw(r) {
    r.overlay(g => {
      Sc.drawNight(g, r, this.t);
      F(g, 'THE WOLFPACK', WP.W / 2, 14, '#ffd040', { align: 'center', scale: 2 });
      const ps = game().players || [game().input];
      for (let i = 0; i < 4; i++) {
        const x = 20 + i * 115, p = ps[i];
        E.ui.box(g, x, 46, 105, 150, { bg: ['#1a2214', '#0c1208'], border: p ? WP.SEATS[i] : '#3a4a2a' });
        F(g, 'WOLF ' + (i + 1), x + 52, 52, p ? WP.SEATS[i] : '#6a6a5a', { align: 'center' });
        try { WP.Rigs.portrait(WP.CALLSIGNS[i].toLowerCase()).drawPortrait(g, x + 22, 66, 60, { zoom: 4, bg: p ? '#24361c' : '#141810', tint: p ? undefined : '#505050' }); } catch (e) { /* headless */ }
        F(g, WP.CALLSIGNS[i], x + 52, 134, p ? '#f2ead3' : '#6a6a5a', { align: 'center' });
        F(g, p ? (p.lastDevice === 'gamepad' || i > 0 ? 'CONTROLLER' : 'KEYS + MOUSE') : 'PRESS OPTIONS', x + 52, 150, p ? '#a8d8a8' : (Math.floor(this.t * 2) % 2 ? '#d8d0a8' : '#6a6a5a'), { align: 'center' });
        if (!p) F(g, 'TO JOIN', x + 52, 160, '#6a6a5a', { align: 'center' });
      }
      F(g, 'PRESS OPTIONS ON A CONTROLLER TO JOIN. EACH WOLF HAS THEIR OWN AMMO AND DAMAGE.', WP.W / 2, 206, '#c8c0a0', { align: 'center' });
      Sc.prompts(g, [['confirm', 'START'], ['cancel', 'BACK']]);
    });
  }
};
// ---------- cutscenes ----------
// a script: steps [kind, ...]: ['card', text, s], ['say', who, text], ['wait', s], ['howl'], ['shake']; hold confirm 1 s to skip
const CUTS = {
  briefing: () => [['music', 'briefing'], ...WP.TEXT.briefCards.map(t => ['card', t, 3.2]), ...WP.TEXT.briefLines.map(([w, t]) => ['say', w, t]), ['howl'], ['wait', 1.6]],
  interrogation: () => [['music', 'op5'], ...WP.TEXT.interrogation.map(([w, t]) => t === 'WRONG ANSWER.' ? [['say', w, t], ['shake']] : [['say', w, t]]).flat()],
  aftermath: () => { const n = WP.Flow.run ? WP.Flow.run.hostagesFreed : 5; return [['music', 'ending'], ['hostages'], ...WP.TEXT.aftermath.map(([w, t]) => ['say', w, WP.fill(t, { n })]), ['wait', 1]]; },
  takeoff: () => [['card', WP.TEXT['op6.board'].text, 1.5]]
};
WP.cutsceneScene = {
  enter(d) {
    this.d = d; this.steps = CUTS[d.id](); this.i = -1; this.t = 0; this.st = 0; this.hold = 0; this.box = null; this.shakeT = 0; this.lampA = 0;
    if (d.id === 'interrogation') { this.lobo = WP.Rigs.make('lobo'); this.giggs = WP.Rigs.make('giggs'); }
    if (d.id === 'briefing' || d.id === 'takeoff') { this.cine = WP.Cine.coast(); }
    this.nextStep();
  },
  nextStep() {
    this.i++; this.st = 0; const s = this.steps[this.i];
    if (!s) { const g = game(); g.go(this.d.next || 'map'); return; }
    if (s[0] === 'music') { WP.Music.play(game(), s[1]); this.nextStep(); return; }
    if (s[0] === 'say') { this.box = { who: s[1], text: s[2], shown: 0, done: false }; WP.Voice.line(s[1], s[2]); }
    if (s[0] === 'howl') { WP.Voice.howl(); }
    if (s[0] === 'shake') { this.shakeT = .5; game().shake(5); WP.Audio.play('thud'); this.nextStep(); return; }
  },
  update(dt) {
    const g = game(), s = this.steps[this.i]; this.t += dt; this.st += dt; WP.time += dt; if (!s) return;
    if (this.shakeT > 0) this.shakeT -= dt;
    // hold confirm for 1 s to skip the whole scene; a press finishes a line or turns it
    if (any(q => q.down('confirm')) || I().held.has('Mouse0')) { this.hold += dt; if (this.hold >= 1) { this.hold = 0; this.i = this.steps.length; this.nextStep(); return; } } else this.hold = 0;
    if (this.lobo) { this.lobo.update(dt, { x: 0, y: 0, z: 0, facing: 0, expr: 'angry' }); WP.Rigs.setCustom(this.lobo, 'collar', dt); this.giggs.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI, expr: this.box && this.box.who === 'GIGGS' ? 'shout' : 'wince', hurt: this.shakeT > 0 }); WP.Rigs.setCustom(this.giggs, 'handsUp', dt); }
    if (this.cine) this.cine.update(dt);
    if (s[0] === 'card' && this.st >= s[2]) this.nextStep();
    else if (s[0] === 'wait' && this.st >= s[1]) this.nextStep();
    else if (s[0] === 'howl' && this.st >= 1.4) this.nextStep();
    else if (s[0] === 'hostages' && this.st >= 2.6) this.nextStep();
    else if (s[0] === 'say') {
      const b = this.box, prev = Math.floor(b.shown); b.shown = Math.min(b.text.length, b.shown + dt * 40); if (Math.floor(b.shown) > prev) WP.Voice.letter(b.who, b.text, Math.floor(b.shown) - 1);
      const pressed = any(q => q.pressed('confirm')) || I().clicked();
      if (pressed && b.shown < b.text.length) b.shown = b.text.length;
      else if (pressed || b.shown >= b.text.length && this.st > b.text.length / 40 + 2.2) { this.box = null; this.nextStep(); }
    }
  },
  draw(r) {
    const s = this.steps[this.i], id = this.d.id;
    if (this.cine && (id === "briefing" || id === "takeoff")) this.cine.draw(r);
    r.overlay(g => {
      if (id === 'interrogation') WP.Cine.tent(g, this.t, this.lobo, this.giggs, this.shakeT);
      if (id === 'aftermath') WP.Cine.aftermath(g, this.t);
      if (s && s[0] === 'card') { const u = clamp(this.st / .4, 0, 1) * clamp((s[2] - this.st) / .4, 0, 1); px.blend(g, .6 * u, 'normal', () => px.rect(g, 0, 100, WP.W, 40, '#000')); E.font.text(g, s[1], WP.W / 2, 112, '#f2ead3', { align: 'center', scale: 2, outline: '#000' }); }
      if (this.box) { const b = this.box, y = 200; E.ui.box(g, 20, y, 440, 60, { bg: ['#1a2214', '#0c1208'], border: '#8a9a5a', alpha: .94 }); px.rect(g, 26, y + 6, 48, 48, '#0a0e08'); try { WP.Rigs.portrait(b.who).drawPortrait(g, 26, y + 6, 48, { zoom: 3.4, bg: b.who === 'GIGGS' ? '#3a1410' : '#18301c' }); } catch (e) { /* headless */ } F(g, WP.TEXT.speakers[b.who] || b.who, 82, y + 6, '#e0b040'); E.font.wrap(b.text.slice(0, Math.floor(b.shown)), 360, { scale: 1 }).forEach((l, i) => F(g, l, 82, y + 18 + i * 10, '#f2ead3')); }
      if (this.hold > 0) { const n = Math.round(this.hold * 24); for (let a = 0; a < n; a++) { const t = a / 24 * Math.PI * 2 - Math.PI / 2; px.rect(g, 16 + Math.cos(t) * 9, 16 + Math.sin(t) * 9, 2, 2, '#ffd040'); } }
      F(g, 'HOLD ' + glyph('confirm') + ' TO SKIP', 30, 12, '#8a8a7a');
    });
  }
};
})();
