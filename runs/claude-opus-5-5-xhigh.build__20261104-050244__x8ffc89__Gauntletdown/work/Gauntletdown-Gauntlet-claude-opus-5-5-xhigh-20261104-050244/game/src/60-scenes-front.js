/* ---- FRONT END: title, main menu, class select, How to Play, High Scores, About & Credits. Every one: Back with
   circle / Esc / Backspace / right click, and 10 s idle starts the attract mode ---- */
const TITLE_COLORS = ['#fff4d0', '#ffd060', '#c8862a', '#6a3a14'];
let TOUCH_ONLY = false;
if (typeof window !== 'undefined' && !HEADLESS) {
  TOUCH_ONLY = touchOnly();
  const wake = () => { if (TOUCH_ONLY) { TOUCH_ONLY = false; } };
  addEventListener('keydown', wake); addEventListener('gamepadconnected', wake);
}
const frontRigs = {};
function frontRig(cls) { return frontRigs[cls] || (frontRigs[cls] = HERO_RIGS[cls]()); }
/** a rig drawn on a canvas screen (no world): standing at screen (x, y), turned to face */
function drawRigAt(g, rig, x, y, dt, st = {}) {
  rig.update(dt, Object.assign({ x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 }, st));
  rig.draw(g, x, y, E.charView(game.view));
}
function logo(g, r, y, scale = 4) {
  E.font.title(g, 'GAUNTLETDOWN', r.W / 2, y, { align: 'center', scale, colors: TITLE_COLORS, depth: 3, depthColor: '#2a1206', outline: '#0a0402' });
}
const frontScene = (o) => Object.assign({ view: 'threequarter', touch: [], camera: false, expand: true }, o);

scenes.title = frontScene({
  enter(d = {}) {
    ui.idle = 0; game.allowJoin(false); this.t = 0; this.menu = d.menu || false; music('throwdown'); clearNarrator();
    L.enabled = false; game.weather = null; game.input.touchEnabled = false;
    this.big = new BigMenu([
      ...(RUN && RUN.ended && PARTY.length ? [{ label: 'CONTINUE TO DESCENT II', fn: () => descentTwo() }] : []),
      { label: 'START DESCENT', fn: () => game.go('select', { descent: 1 }) },
      { label: 'HOW TO PLAY', fn: () => game.go('howto') },
      { label: 'HIGH SCORES', fn: () => game.go('scores') },
      { label: 'SETTINGS', fn: () => game.menu('settings') },
      { label: 'ABOUT & CREDITS', fn: () => game.go('about') }
    ], { y: 120 });
  },
  update(dt) {
    this.t += dt; ui.step();
    if (TOUCH_ONLY) { const c = game.input.clicked(); if (c && this.settingsBtn && c[0] >= this.settingsBtn[0] && c[0] < this.settingsBtn[0] + this.settingsBtn[2] && c[1] >= this.settingsBtn[1] && c[1] < this.settingsBtn[1] + this.settingsBtn[3]) game.menu('settings'); ui.watchIdle(dt); return; }
    if (ui.watchIdle(dt)) return;
    if (!this.menu) { if ((game._players || [game.input]).some(I => I.pressed('confirm') || I.pressed('start')) || game.input.clicked()) { this.menu = true; sfx('select'); game.input.consumeAll(); } return; }
    if (ui.back()) { this.menu = false; sfx('back'); return; }
    this.big.update();
  },
  draw(r) {
    r.overlay(g => {
      drawShaft(g, r, this.t);
      logo(g, r, 26, r.W > 380 ? 4 : 3);
      tx(g, 'FOUR FOOLS. ONE HUNGRY DUNGEON.', r.W / 2, 70, '#e8c890', { align: 'center' });
      // the four heroes at the pit's edge, looking down into it
      const y = r.H - 6; CLASSES.forEach((c, i) => drawRigAt(g, frontRig(c), r.W / 2 + (i - 1.5) * 34, y, 1 / 60, { facing: -Math.PI / 2 + (i - 1.5) * .15, pose: i === 3 ? 'cast' : null }));
      px.blend(g, .45, 'multiply', () => px.rect(g, 0, r.H - 52, r.W, 52, '#1a0a10'));
      if (TOUCH_ONLY) { this.settingsBtn = touchNotice(g, r); return; }
      if (!this.menu) { if (Math.floor(this.t * 2) % 2 === 0) tx(g, 'PRESS ' + key(game.input, 'confirm'), r.W / 2, 132, '#ffe8b0', { align: 'center', scale: 2 }); }
      else this.big.draw(g, r);
      tx(g, 'MY-3D2DGE ' + String(E.versionLabel ? E.versionLabel() : 'v0.85.2').replace(/[^\x20-\x7e]/g, '-'), 4, r.H - 10, '#6a5a4a', { font: 'tiny' });
      tx(g, 'GAUNTLETDOWN ' + VERSION, r.W - 4, r.H - 11, '#6a5a4a', { align: 'right' });
    });
  }
});
/** touch-only devices: no touch controls; a notice and a SETTINGS button (its box returned for the tap) */
function touchNotice(g, r) {
  const w = Math.min(300, r.W - 20), h = 92, x = Math.round((r.W - w) / 2), y = 92;
  E.ui.box(g, x, y, w, h, { bg: ['#2a1a10', '#140a06'], border: '#ffd060' });
  tx(g, 'Controller or keyboard required', r.W / 2, y + 10, '#ffe8b0', { align: 'center' });
  tx(g, 'Connect a controller or a keyboard to play.', r.W / 2, y + 26, '#c8b8a0', { align: 'center' });
  const b = [Math.round(r.W / 2 - 50), y + 48, 100, 30];
  E.ui.box(g, b[0], b[1], b[2], b[3], { bg: ['#6a4a1a', '#3a2a0a'], border: '#ffd060' }); tx(g, 'SETTINGS', r.W / 2, b[1] + 8, '#ffe8b0', { align: 'center', scale: 2 });
  return b;
}

/* ---- CHOOSE YOUR FOOL: four cards, a cursor per joined player; fire locks; START once everyone has locked ---- */
scenes.select = frontScene({
  enter(d = {}) {
    ui.idle = 0; this.descent = d.descent || 1; this.t = 0; music('throwdown');
    this.cur = [{ I: game.input, i: 0, locked: false }];
    for (const q of game.players.slice(1)) this.cur.push({ I: q, i: this.cur.length % 4, locked: false });
    game.allowJoin({ max: 4, onJoin: q => { const free = [0, 1, 2, 3].find(k => !this.cur.some(c => c.i === k && c.locked)) || 0; this.cur.push({ I: q, i: free, locked: false }); sfx('join'); } });
    this.cards = [];
  },
  exit() { },
  update(dt) {
    this.t += dt; ui.step();
    if (ui.watchIdle(dt)) return;
    if (this.t < .25) { (game._players || [game.input]).forEach(I => I.consumeAll()); return; }   // (a press from the screen before is not a pick)
    const taken = k => this.cur.some(c => c.locked && c.i === k);
    for (const c of this.cur) {
      const I = c.I;
      if (!c.locked) {
        if (I.repeat('left')) { c.i = (c.i + 3) % 4; sfx('move'); }
        if (I.repeat('right')) { c.i = (c.i + 1) % 4; sfx('move'); }
        if (I === game.input) { const p = I.pointer(); if (p && I.mouse.t !== this._mt) { this._mt = I.mouse.t; const k = this.cards.findIndex(b => p[0] >= b[0] && p[0] < b[0] + b[2] && p[1] >= b[1] && p[1] < b[1] + b[3]); if (k >= 0 && k !== c.i) { c.i = k; sfx('move'); } } }
        const click = I === game.input ? I.clicked() : null, ck = click ? this.cards.findIndex(b => click[0] >= b[0] && click[0] < b[0] + b[2] && click[1] >= b[1] && click[1] < b[1] + b[3]) : -1;
        if (ck >= 0) c.i = ck;
        if ((I.pressed('confirm') || I.pressed('fire') || ck >= 0) && !taken(c.i)) { c.locked = true; sfx('select'); speak(QUIPS[CLASSES[c.i]].slice(0, 30), get('heroes', CLASSES[c.i]).voice); I.consumeAll(); }
        else if ((I.pressed('confirm') || ck >= 0) && taken(c.i)) sfx('back');
      } else if (I.pressed('cancel')) { c.locked = false; sfx('back'); I.consumeAll(); continue; }
    }
    if (this.cur.every(c => !c.locked) && ui.back()) { game.go('title', { menu: true }); return; }
    const ready = this.cur.length && this.cur.every(c => c.locked);
    if (ready && (this.cur.some(c => c.I.pressed('start') || c.I.pressed('confirm')) || this.cur.length === 1)) {
      if (this.cur.length > 1 && !this.cur.some(c => c.I.pressed('start') || c.I.pressed('confirm'))) return;
      this.begin();
    }
  },
  begin() {
    startRun(this.cur.map((c, k) => ({ seat: k, cls: CLASSES[c.i], input: c.I, name: 'P' + (k + 1), color: SEAT_COLORS[k] })), { descent: this.descent });
    game.go('play', { floor: 0, card: true }, { fade: 'iris' });
  },
  draw(r) {
    r.overlay(g => {
      drawShaft(g, r, this.t * .3, { gauntlet: false, speed: 20 });
      px.blend(g, .5, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#2a1a20'));
      E.font.title(g, 'CHOOSE YOUR FOOL', r.W / 2, 8, { align: 'center', scale: 2, colors: TITLE_COLORS, depth: 2, depthColor: '#2a1206' });
      if (this.descent > 1) tx(g, 'DESCENT II', r.W / 2, 30, '#ff8a6a', { align: 'center' });
      const cw = Math.min(100, Math.floor((r.W - 20) / 4)), ch = Math.min(r.H - 74, 196), x0 = Math.round((r.W - cw * 4 - 9) / 2), y0 = 40;
      this.cards = [];
      CLASSES.forEach((cls, k) => {
        const D = get('heroes', cls), x = x0 + k * (cw + 3), here = this.cur.filter(c => c.i === k), lock = this.cur.find(c => c.locked && c.i === k);
        this.cards.push([x, y0, cw, ch]);
        E.ui.box(g, x, y0, cw, ch, { bg: lock ? ['#3a2a14', '#1a1008'] : ['#241a14', '#0e0a08'], border: lock ? SEAT_COLORS[this.cur.indexOf(lock)] : here.length ? '#ffd060' : '#5a4a3a' });
        tx(g, D.name, x + cw / 2, y0 + 5, D.color, { align: 'center' });
        tx(g, D.who, x + cw / 2, y0 + 15, '#a89a88', { align: 'center', font: 'tiny' });
        const rig = frontRig(cls), swing = here.length && Math.floor(this.t * 1.2) % 3 === 0;
        drawRigAt(g, rig, x + cw / 2, y0 + Math.round(ch * .44), 1 / 60, { facing: Math.PI / 2 + Math.sin(this.t * .8 + k) * 1.2, attack: swing ? E.move(D.melee.moves[0], (this.t * 1.2 % 1), 'active') : null, pose: lock ? 'cheer' : null });
        const labels = ['ARMOR', 'SHOTS', 'MELEE', 'MAGIC', 'SPEED'];
        labels.forEach((l, i) => { const yy = y0 + Math.round(ch * .47) + i * 9; tx(g, l, x + 5, yy, '#c8b8a0', { font: 'tiny' }); for (let p = 0; p < 5; p++) px.rect(g, x + cw - 36 + p * 6, yy, 5, 5, p < D.pips[i] ? D.color : '#3a3028'); });
        const q = E.font.wrap(QUIPS[cls], cw - 8, { font: 'tiny' }), qy = y0 + Math.round(ch * .47) + 48; q.slice(0, 4).forEach((l, i) => tx(g, l, x + cw / 2, qy + i * 7, '#e8dcc8', { align: 'center', font: 'tiny' }));
        here.forEach((c, j) => { const pi = this.cur.indexOf(c), col = SEAT_COLORS[pi]; px.rect(g, x + 4 + j * 12, y0 + ch - 12, 10, 8, col); tx(g, 'P' + (pi + 1), x + 5 + j * 12, y0 + ch - 11, '#000', { font: 'tiny', shadow: false }); });
        if (lock) tx(g, this.cur.indexOf(lock) === this.cur.indexOf(here[0]) ? 'READY' : 'TAKEN', x + cw - 6, y0 + ch - 12, '#ffe08a', { align: 'right' });
      });
      const by = y0 + ch + 6, ready = this.cur.every(c => c.locked);
      const msg = ready ? 'PRESS ' + key(game.input, 'start') + ' TO DESCEND' : 'CHOOSE: ' + key(game.input, 'left') + key(game.input, 'right') + '   PICK: ' + key(game.input, 'confirm') + '   BACK: ' + key(game.input, 'cancel');
      tx(g, msg, r.W / 2, by, ready && Math.floor(this.t * 3) % 2 ? '#ffffff' : '#ffe8b0', { align: 'center' });
      if (this.cur.length < 4) tx(g, 'MORE FOOLS: [2] ON THE KEYBOARD, OR ' + '[' + E.Input.prototype.codeLabel.call(game.input, 'Pad9') + '] ON A FREE CONTROLLER', r.W / 2, by + 12, '#a89a88', { align: 'center', font: 'tiny' });
    });
  }
});

/* ---- HOW TO PLAY: one idea a page, a live picture on each, left and right to page ---- */
scenes.howto = frontScene({
  enter(d = {}) { ui.idle = 0; this.page = 0; this.t = 0; this.from = d.from || 'title'; },
  update(dt) {
    this.t += dt; ui.step(); if (ui.watchIdle(dt)) return;
    const P = game._players || [game.input], n = HOWTO.length, c = game.input.clicked();
    if (P.some(I => I.repeat('right')) || (c && c[0] > game.W * .66)) { this.page = (this.page + 1) % n; sfx('move'); }
    if (P.some(I => I.repeat('left')) || (c && c[0] < game.W * .33)) { this.page = (this.page + n - 1) % n; sfx('move'); }
    if (ui.back() || P.some(I => I.pressed('confirm')) && this.page === n - 1) game.go('title', { menu: true });
  },
  draw(r) {
    r.overlay(g => {
      px.rect(g, 0, 0, r.W, r.H, '#120a0e'); drawShaft(g, r, this.t * .2, { gauntlet: false, speed: 10 }); px.blend(g, .55, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#201018'));
      const p = HOWTO[this.page], I = game.input;
      tx(g, 'HOW TO PLAY  ' + (this.page + 1) + ' / ' + HOWTO.length, r.W / 2, 8, '#a89a88', { align: 'center' });
      E.font.title(g, p.title, r.W / 2, 22, { align: 'center', scale: 2, colors: TITLE_COLORS, depth: 2 });
      howtoArt(g, r, p.art, this.t);
      const lines = E.font.wrap(keysIn(p.text, I), Math.min(r.W - 40, 380), { scale: r.W > 400 ? 1 : 1 });
      lines.forEach((l, i) => tx(g, l, r.W / 2, r.H - 64 + i * 11, '#ffe8b0', { align: 'center' }));
      tx(g, '← ' + key(I, 'left') + '      ' + key(I, 'right') + ' →      BACK ' + key(I, 'cancel'), r.W / 2, r.H - 12, '#a89a88', { align: 'center' });
    });
  }
});
/** the live pictures on the How to Play pages */
function howtoArt(g, r, art, t) {
  const cx = r.W / 2, cy = 120, dt = 1 / 60;
  switch (art) {
    case 'king': { const k = frontRigs.king || (frontRigs.king = MON_RIGS.king()); drawRigAt(g, k, cx, cy + 40, dt, { pose: 'hips' }); drawSpinningGauntlet(g, cx + 60, cy - 20 + Math.sin(t * 2) * 6, 2, t * 2); break; }
    case 'move': { const h = frontRig('ranger'), a = t * 1.5; drawRigAt(g, h, cx + Math.cos(a) * 40, cy + 20 + Math.sin(a) * 14, dt, { vx: -Math.sin(a) * 60, vy: Math.cos(a) * 60, facing: a + Math.PI / 2 }); break; }
    case 'fire': { const h = frontRig('berserker'), u = (t * 1.5) % 1; drawRigAt(g, h, cx - 60, cy + 30, dt, { facing: 0, attack: E.move('throw', u, u < .4 ? 'wind' : 'active') }); px.sprite(g, SHOT_SPR.axe, cx - 40 + u * 110, cy + 2, { rot: t * 18 }); const s = monRigCached('gnasher'); drawRigAt(g, s, cx + 70, cy + 30, dt, { facing: Math.PI, hurt: u > .9 }); break; }
    case 'food': { const hp = Math.max(0, 700 - Math.floor((t * 20) % 700)); tx(g, String(hp), cx, cy - 30, hp < 200 ? RED : INK, { align: 'center', scale: 3 }); px.sprite(g, SPR.jug, cx - 40, cy + 10, { scale: 2 }); px.sprite(g, E.shapeSprite(ASH('wholer-ham', 'pot'), { view: 'threequarter' }), cx - 10, cy); px.sprite(g, E.shapeSprite(ASH('bowl-soup', 'pot'), { view: 'threequarter' }), cx + 30, cy + 4); tx(g, 'NO!', cx + 38, cy + 26, '#9ae84a', { align: 'center' }); break; }
    case 'magic': { const u = (t * .8) % 1; px.sprite(g, SPR.flask, cx - 4, cy - 10, { scale: 3 }); px.blend(g, .4, 'add', () => px.disc(g, cx, cy, 10 + u * 120, '#b8d8ff')); for (let i = 0; i < 5; i++) { const a = i * 1.26 + t * .3; px.sprite(g, SPR.skull, cx + Math.cos(a) * 80 - 2, cy + Math.sin(a) * 30, { scale: 2 }); } break; }
    case 'door': { px.sprite(g, SPR.key, cx - 70, cy, { scale: 3 }); for (let k = 0; k < 6; k++) px.rect(g, cx - 20 + k * 6, cy - 30 + ((t * 20) % 40 > 20 ? -Math.min(30, ((t * 20) % 40 - 20) * 2) : 0), 2, 40, '#5a5a66'); for (let s = 0; s < 5; s++) px.rect(g, cx + 50, cy - 20 + s * 8, 30, 7, E.shade('#8a7a64', -s * .15)); tx(g, 'E', cx + 64, cy - 32, '#ffe08a', { align: 'center' }); break; }
    case 'gen': { const sp = E.shapeSprite('gd-den', { view: 'threequarter', params: { dmg: Math.floor(t) % 3 } }); px.sprite(g, sp, cx - sp.w / 2, cy - sp.h / 2 + 10); for (const [i, rk] of [[0, 3], [1, 2], [2, 1]]) { const s2 = monRigCached('gnasher' + rk, () => MON_RIGS.gnasher(rk)); drawRigAt(g, s2, cx + 60 + i * 26, cy + 40, dt, { facing: Math.PI }); tx(g, 'I'.repeat(rk), cx + 60 + i * 26, cy + 44, '#ffe08a', { align: 'center', font: 'tiny' }); } break; }
    case 'friends': CLASSES.forEach((c, i) => { const h = frontRig(c); drawRigAt(g, h, cx + (i - 1.5) * 50, cy + 36, dt, { pose: 'cheer' }); px.rect(g, cx + (i - 1.5) * 50 - 8, cy + 42, 16, 3, SEAT_COLORS[i]); }); break;
  }
}
const monRigCached = (k, make) => frontRigs[k] || (frontRigs[k] = make ? make() : MON_RIGS[k](2));

/* ---- HIGH SCORES (the arcade table, large) ---- */
const CAB = new E.Arcade(game, { id: 'gauntletdown', hud: false });
const TABLE_MODE = 'descent';
function drawTable(g, r, y, o = {}) {
  const t = CAB.table(TABLE_MODE), lh = Math.max(14, Math.floor((r.H - y - 60) / 10)), cx = r.W / 2, C0 = cx - 150, C1 = cx - 120, C2 = cx - 10, C3 = cx + 10, C4 = cx + 110;
  E.font.title(g, 'HIGH SCORES', r.W / 2, y, { align: 'center', scale: 2, colors: TITLE_COLORS, depth: 2 });
  for (const [s, x, al] of [['NAME', C1, 'left'], ['SCORE', C2, 'right'], ['FOOL', C3, 'left'], ['FLOOR', C4, 'left']]) tx(g, s, x, y + 24, '#a89a88', { align: al });
  for (let i = 0; i < 10; i++) {
    const e = t[i], yy = y + 38 + i * lh, c = o.hi === i ? (Math.floor(game.real * 4) % 2 ? '#ffffff' : '#ffd060') : i ? '#e8dcc8' : '#ffd060';
    tx(g, (i + 1) + '.', C0 + 16, yy, c, { align: 'right' });
    tx(g, e ? e.name : '---', C1, yy, c, { scale: 2 });
    tx(g, String(e ? e.score : 0), C2, yy, c, { align: 'right', scale: 2 });
    if (e && e.cls) { tx(g, get('heroes', e.cls).name, C3, yy + 3, get('heroes', e.cls).color); tx(g, String(e.floor || '?') + (e.cont ? '  (+' + e.cont + ')' : ''), C4, yy + 3, '#a89a88'); }
  }
}
scenes.scores = frontScene({
  enter(d = {}) { ui.idle = 0; this.t = 0; this.hi = d.hi; music('namethyself'); },
  update(dt) { this.t += dt; ui.step(); if (ui.watchIdle(dt)) return; if (ui.back() || (game._players || [game.input]).some(I => I.pressed('confirm')) || game.input.clicked()) game.go('title', { menu: true }); },
  draw(r) { r.overlay(g => { drawShaft(g, r, this.t * .3, { gauntlet: false, speed: 15 }); px.blend(g, .6, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#201018')); drawTable(g, r, 14, { hi: this.hi }); tx(g, 'BACK ' + key(game.input, 'cancel'), r.W / 2, r.H - 12, '#a89a88', { align: 'center' }); }); }
});

/* ---- ABOUT & CREDITS: paged; the Source Information and the feedback, word for word as the chat reply ---- */
const ABOUT_PAGES = () => [['CREDITS', ABOUT.credits], ['SOURCE INFORMATION', ABOUT.source], ['TESTING FEEDBACK', ABOUT.testing], ['ENGINE FEEDBACK', ABOUT.engine], ['PROMPT FEEDBACK', ABOUT.prompt]];
scenes.about = frontScene({
  enter() { ui.idle = 0; this.page = 0; this.scroll = 0; this.t = 0; },
  update(dt) {
    this.t += dt; ui.step(); if (ui.watchIdle(dt)) return;
    const P = game._players || [game.input], n = ABOUT_PAGES().length, c = game.input.clicked();
    if (P.some(I => I.repeat('right')) || (c && c[0] > game.W * .7)) { this.page = (this.page + 1) % n; this.scroll = 0; sfx('move'); }
    if (P.some(I => I.repeat('left')) || (c && c[0] < game.W * .3)) { this.page = (this.page + n - 1) % n; this.scroll = 0; sfx('move'); }
    if (P.some(I => I.down('down'))) this.scroll = Math.min(this.max || 0, this.scroll + 90 * dt);
    if (P.some(I => I.down('up'))) this.scroll = Math.max(0, this.scroll - 90 * dt);
    const z = game.input.zoom ? game.input.zoom() : 1; if (z !== 1) this.scroll = clamp(this.scroll + (z > 1 ? -24 : 24), 0, this.max || 0);
    if (ui.back()) game.go('title', { menu: true });
  },
  draw(r) {
    r.overlay(g => {
      px.rect(g, 0, 0, r.W, r.H, '#100a0c');
      const [title, lines] = ABOUT_PAGES()[this.page];
      tx(g, 'ABOUT & CREDITS  ' + (this.page + 1) + ' / ' + ABOUT_PAGES().length, r.W / 2, 8, '#a89a88', { align: 'center' });
      E.font.title(g, title, r.W / 2, 22, { align: 'center', scale: 2, colors: TITLE_COLORS, depth: 2 });
      this.max = drawPage(g, r, lines, this.scroll, { y: 48, w: Math.min(r.W - 40, 420), bottom: 24 });
      tx(g, '← → PAGE   ↑ ↓ SCROLL   BACK ' + key(game.input, 'cancel'), r.W / 2, r.H - 12, '#a89a88', { align: 'center' });
    });
  }
});
