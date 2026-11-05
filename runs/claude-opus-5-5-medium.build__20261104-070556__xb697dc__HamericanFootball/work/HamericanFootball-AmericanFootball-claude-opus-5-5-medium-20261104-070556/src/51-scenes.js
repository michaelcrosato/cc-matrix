/* THE FRONT END: the title (the logo cracking, PRESS START with both chips, the touch-only gate), the main menu with a
 * live vignette, exhibition setup (controllers and teams in three columns, then stadium, weather, quarter, difficulty,
 * PLAY BALL!), PRACTICE, the HALL OF FIASCO and ABOUT & CREDITS (pages from window.FF_ABOUT). 10 s without input on the
 * title, the menu or setup starts the attract mode. Every screen works by keys, pad, and mouse (hover and click). */
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, { px } = E, game = FF.game, UI = FF.ui, GL = FF.glyph, Y = 16;
const W = () => game.W, H = () => game.H;
const T = (g, s, x, y, c, o = {}) => E.font.text(g, s, Math.round(x), Math.round(y), c, Object.assign({ outline: false, shadow: '#000' }, o));

/* ---- idle detection for the attract mode ---- */
const IDLE = FF.idle = {
  t: 0, last: null,
  reset() { IDLE.t = 0; },
  /** any input from any player, the mouse, a click, a touch or a stick */
  any() {
    for (const I of game.players || [game.input]) { if (I.anyPressed && I.anyPressed()) return true; const m = I.move(); if (Math.hypot(m[0], m[1]) > .3) return true; }
    const I = game.input, p = I.pointer && I.pointer();
    if (I.clicked && I.clicked()) return true;
    if (p && IDLE.last && Math.hypot(p[0] - IDLE.last[0], p[1] - IDLE.last[1]) > 6) { IDLE.last = p.slice(); return true; }
    if (p && !IDLE.last) IDLE.last = p.slice();
    return false;
  },
  update(dt, from) {
    if (IDLE.any()) { IDLE.t = 0; return; }
    const shell = game.shell && game.shell.screen;
    if (shell) { IDLE.t = 0; return; }
    IDLE.t += dt; if (IDLE.t >= 10) { IDLE.t = 0; game.go('attract', { from }, { fade: .3 }); }
  }
};

/* ---- the title's stage: Tumbleweed Field at dusk, two lines of players in stance at midfield ---- */
let stage = null;
function titleStage() {
  if (stage) return stage;
  const home = FF.team('fiascos'), away = FF.team('mudhogs');
  FF.Stadium.build('tumbleweed', home, away, {});
  FF.sim.newMatch({ home: 'fiascos', away: 'mudhogs', seed: 5, start: { possession: 0, los: 50, down: 1, toGo: 20 }, qLen: 120 });
  FF.control.setup([]);
  // the lineup moves up near the far stands, so the crowd is in the shot under the logo
  const dy = FF.FIELD.MID_Y - (FF.FIELD.SIDE_T + 6 * 16);
  for (const a of FF.sim.athletes) { a.b.y -= dy; if (a.home) a.home[1] -= dy; }
  FF.cast.build(); for (const x of FF.cast.refs) x.b.y = FF.FIELD.SIDE_T + 8 * 16;
  stage = { t: 0, y: FF.FIELD.SIDE_T - 1 * 16 };
  return stage;
}
function drawStage(r, dt, o = {}) {
  const S = FF.sim, st = titleStage(); st.t += dt;
  for (const a of S.athletes) { a.pose = a.team === 0 ? (a.pos === 'OL' ? 'STANCE3' : 'STANCE2') : (a.pos === 'NT' || a.pos === 'DE' ? 'STANCE3' : 'STANCE2'); if (a.slot === 'QB') a.pose = 'QB_UC'; FF.Rigs.drive(a, dt, {}); }
  FF.cast.update(dt); FF.Stadium.update(dt); FF.fx.update(dt);
  game.setZoom(o.zoom || 1.25); game.focus(o.x || 1024 + Math.sin(st.t * .15) * 60, o.y || st.y, 10);
  FF.Stadium.draw(r);
  const view = E.charView(r.view);
  for (const a of S.athletes) { if (!r.visible(a.b.x, a.b.y, 20)) continue; const rig = FF.Rigs.of(a); r.shadow(a.b.x, a.b.y, a.b.r, .35); r.actor(a.b.x, a.b.y, a.b.z, (g, ox, oy) => rig.draw(g, ox, oy, view)); }
  FF.cast.draw(r); FF.fx.draw(r);
}
FF.titleStage = { draw: drawStage, reset: () => { stage = null; } };

/* ---- the logo: AMERICAN FOOTBALL over a cracked FIASCO, a football bouncing off the O ---- */
function logo(g, t, cx, y) {
  const drop = Math.min(1, t / .5), shake = t > .5 && t < .9 ? Math.sin(t * 80) * 2 : 0;
  E.font.title(g, 'HAMERICAN', Math.round(cx), Math.round(y - (1 - drop) * 60), { scale: 3, colors: ['#ffffff', '#fff2d8', '#ffb060', '#e0602a'], align: 'center', outline: '#1a0a20', depth: 3, depthColor: '#4a1a6a' });
  E.font.title(g, 'FOOTBALL', Math.round(cx + shake), Math.round(y + 26), { scale: 5, colors: ['#fff6a0', '#ffd040', '#ff8a1a', '#e03a1a'], align: 'center', outline: '#1a0a20', depth: 4, depthColor: '#5a1a2a' });
  if (t > .5) { const w = E.font.width('FOOTBALL', { scale: 5 }); px.line(g, cx - w * .32, y + 32, cx - w * .1, y + 48, '#1a0a20', 1); px.line(g, cx - w * .1, y + 48, cx + w * .05, y + 40, '#1a0a20', 1); px.line(g, cx + w * .05, y + 40, cx + w * .25, y + 60, '#1a0a20', 1); }
  // the football bouncing off the O
  const bt = (t % 4) / 4, bx = cx + 90 - bt * 40, by = y + 30 - Math.abs(Math.sin(bt * Math.PI * 3)) * 26 / (1 + bt * 2);
  FF.drawBall(g, bx, by, t * 6, true, 2); for (let k = 1; k < 4; k++) px.line(g, bx + 8 + k * 4, by - 2 + k, bx + 12 + k * 4, by - 2 + k, '#ffffff');
}
FF.logo = logo;

/* ---- touch-only devices: no touch controls; 'CONTROLLER OR KEYBOARD REQUIRED' and a SETTINGS button ---- */
FF.detectTouchOnly = () => {
  if (typeof matchMedia !== 'function' || typeof navigator === 'undefined') return false;
  const coarse = matchMedia('(pointer: coarse)').matches, fine = matchMedia('(any-pointer: fine)').matches, touch = (navigator.maxTouchPoints || 0) > 0;
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].some(Boolean) : false;
  return coarse && !fine && touch && !pads;
};
FF.unlockTouch = () => { if (!FF.touchOnly) return; const I = game.input; if (FF.inputUsed || (I.anyPressed && I.anyPressed() && I.lastDevice !== 'touch' && I.lastDevice !== 'mouse')) FF.touchOnly = false; };

/* ---- TITLE ---- */
const title = {
  input: FF.KEYS, view: 'broadcast', camera: { zoom: false },
  enter() { FF.titleStage.reset(); title.t = 0; IDLE.reset(); FF.music.play('ANTHEM'); FF.noSave = false; game.input.touchEnabled = false; FF.Stadium.applyLights(game, {}); game.weather = null; },
  update(dt) {
    title.t += dt;
    if (FF.touchOnly) { FF.unlockTouch(); const c = game.input.clicked && game.input.clicked(); if (c && inside(c, settingsBtn())) game.menu('settings'); IDLE.update(dt, 'title'); return; }
    const I = game.input;
    if (title.t > .4 && (I.pressed('start') || I.pressed('confirm') || I.pressed('b1') || (I.clicked && I.clicked()))) { FF.sfx('menuSelect'); game.go('menu'); return; }
    IDLE.update(dt, 'title');
  },
  draw(r) {
    drawStage(r, 1 / 60, { zoom: 1 });
    r.overlay(g => {
      logo(g, title.t, W() / 2, H() * .1);
      if (FF.touchOnly) {
        T(g, 'CONTROLLER OR KEYBOARD REQUIRED', W() / 2, H() * .62, '#ffe040', { align: 'center', scale: 2 });
        const b = settingsBtn(); UI.button(g, b, 'SETTINGS', true);
      } else if (Math.floor(title.t * 2) % 2 || title.t < .5) {
        const dev = FF.inputUsed ? GL.device() : null;
        if (!dev) { const y = H() * .84, w1 = GL.measure('start', { device: 'keyboard' }), tw = E.font.width('PRESS START'), total = w1 + 4 + E.font.width('OR') + 4 + 11 + 6 + tw; let x = W() / 2 - total / 2; E.ui.box(g, x - 6, y - 3, total + 12, 17, { bg: '#0c0c18', border: '#3a3a52', alpha: .85 }); x += GL.chip(g, x, y, 'start', { device: 'keyboard' }) + 4; T(g, 'OR', x, y + 2, '#f4f0e6'); x += E.font.width('OR') + 4; x += GL.chip(g, x, y, 'b1', { device: 'gamepad' }) + 6; T(g, 'PRESS START', x, y + 2, '#f4f0e6'); }
        else GL.row(g, W() / 2, H() * .84, [[dev === 'gamepad' ? 'b1' : 'start', 'PRESS START', { mouse: 'L' }]], { align: 'center', panel: true });
      }
      T(g, (E.versionLabel ? E.versionLabel() : 'my-3D2dge') + ' · HAMERICAN FOOTBALL ' + FF.version, 8, H() - 12, '#8a86a0', { font: 'tiny' });
      T(g, '© A HAMERICAN PRODUCTION', W() - 8, H() - 12, '#8a86a0', { font: 'tiny', align: 'right' });
    });
  }
};
const settingsBtn = () => ({ x: W() / 2 - 70, y: H() * .72, w: 140, h: 28 });
const inside = (p, r) => p[0] >= r.x && p[0] < r.x + r.w && p[1] >= r.y && p[1] < r.y + r.h;
FF.inside = inside;

/* ---- MAIN MENU ---- */
const MENU_ITEMS = () => {
  const latest = game.saves && game.saves.latest && game.saves.latest();
  return [
    { id: 'story', label: 'STORY: THE FIASCO CUP', sub: latest ? 'CONTINUE OR START OVER' : 'FIVE CHAPTERS OF GLORIOUS DISASTER' },
    { id: 'exh', label: 'EXHIBITION', sub: '1 TO 4 PLAYERS, ANY TEAMS' },
    { id: 'practice', label: 'PRACTICE', sub: 'THE TRYOUT DRILLS' },
    { id: 'records', label: 'HALL OF FIASCO', sub: 'RECORDS' },
    { id: 'options', label: 'OPTIONS', sub: 'SETTINGS AND CONTROLS' },
    { id: 'about', label: 'ABOUT & CREDITS', sub: 'HOW IT WAS MADE' }
  ];
};
const menu = {
  input: FF.KEYS, view: 'broadcast', camera: { zoom: false },
  enter() { menu.m = menu.m || new UI.Menu({ items: MENU_ITEMS, layout: UI.listLayout(14, (w, h) => Math.max(50, h * .21), (w) => Math.min(250, w * .55), 26, 3), onPick: it => menu.pick(it) }); IDLE.reset(); FF.music.play('LOCKER'); menu.t = 0; },
  pick(it) {
    if (it.id === 'story') game.go('story');
    if (it.id === 'exh') game.go('setup');
    if (it.id === 'practice') game.go('practice');
    if (it.id === 'records') game.go('records');
    if (it.id === 'options') game.menu('settings');
    if (it.id === 'about') game.go('about');
  },
  update(dt) { menu.t += dt; menu.m.update(); if (game.input.pressed('cancel')) game.go('title'); IDLE.update(dt, 'menu'); },
  draw(r) {
    drawStage(r, 1 / 60, { zoom: 1.25, x: 1100, y: FF.FIELD.MID_Y });
    r.overlay(g => {
      px.blend(g, .45, 'normal', () => px.rect(g, 0, 0, W(), H(), '#05050c'));
      E.font.title(g, 'HAMERICAN', 14, 12, { scale: 3, colors: ['#fff6a0', '#ffd040', '#ff8a1a', '#e03a1a'], outline: '#1a0a20', depth: 2, depthColor: '#5a1a2a' });
      T(g, 'MAIN MENU', 16, 42, '#a9a6c0');
      menu.m.draw(g, { style: { align: 'left', scale: 2 } });
      vignette(g, MENU_ITEMS()[menu.m.i].id, W() * .62, H() * .28, menu.t);
      GL.bar(g, [['confirm', 'SELECT', { mouse: 'L' }], ['cancel', 'BACK']]);
    });
  }
};
// the live vignette beside the main menu: a little picture for the focused item
function vignette(g, id, x, y, t) {
  const w = Math.min(170, W() * .34), h = 110;
  UI.panel(g, x, y, w, h, { alpha: .85, border: '#ffb02e' });
  const cx = x + w / 2, cy = y + h / 2;
  if (id === 'story') { const ch = FF.story ? FF.story.state() : null; for (let i = 0; i < 5; i++) { const bx = x + 10 + i * (w - 20) / 5, done = ch && ch.done && ch.done[i + 1]; E.ui.box(g, bx, cy - 20, (w - 20) / 5 - 4, 40, { bg: done ? ['#3a6a2a', '#1a3a1a'] : ['#3a2a1a', '#1a1008'], border: '#c8a040', alpha: 1 }); T(g, String(i + 1), bx + (w - 20) / 10 - 2, cy - 4, '#ffe890', { align: 'center' }); } T(g, 'THE BRACKET BOARD', cx, y + h - 14, '#c8b080', { align: 'center', font: 'tiny' }); }
  else if (id === 'exh') { const k = Math.abs(Math.sin(t * 2)); helmet(g, cx - 30 + k * 10, cy, '#e8742a', '#4a2a6a', 1); helmet(g, cx + 30 - k * 10, cy, '#4a6a2a', '#e8c040', -1); if (k > .95) UI.burst(g, cx, cy - 20, 'CLANG!', .3, { scale: 1 }); }
  else if (id === 'practice') { const k = (t % 1.5) / 1.5; px.rect(g, cx - 5, cy - 18 + (k > .5 ? 12 : 0), 10, k > .5 ? 10 : 22, '#d04a3a'); px.rect(g, cx - 5, cy + 4, 10, 2, '#5a2a1a'); T(g, k > .5 ? 'FLATTENED!' : 'TACKLING DUMMY', cx, y + h - 14, '#c8b080', { align: 'center', font: 'tiny' }); }
  else if (id === 'records') { for (let i = 0; i < 3; i++) { const tx = cx - 40 + i * 40, th = 20 + (i === 1 ? 10 : 0); px.rect(g, tx - 6, cy + 10 - th, 12, th, '#c8a030'); px.disc(g, tx, cy + 6 - th, 7, '#ffd84a'); } T(g, 'THE TROPHY CASE', cx, y + h - 14, '#c8b080', { align: 'center', font: 'tiny' }); }
  else if (id === 'options') { for (const [ox, rr, sp] of [[-20, 16, 1], [18, 11, -1.4]]) { for (let i = 0; i < 8; i++) { const a = t * sp + i / 8 * 6.283; px.rect(g, cx + ox + Math.cos(a) * rr - 2, cy + Math.sin(a) * rr - 2, 4, 4, '#a9a6c0'); } px.disc(g, cx + ox, cy, rr - 3, '#6a6880'); px.disc(g, cx + ox, cy, 3, '#2a2a3a'); } }
  else if (id === 'about') { const R = FF.talk.portraits(); R.C.drawPortrait(g, cx - 44, cy - 22, 40, { zoom: 3, turn: .5, frame: true, bg: '#3a2a5a' }); R.L.drawPortrait(g, cx + 4, cy - 22, 40, { zoom: 3, turn: .5, frame: true, bg: '#1a3a4a' }); T(g, 'THE BOOTH', cx, y + h - 14, '#c8b080', { align: 'center', font: 'tiny' }); }
}
function helmet(g, x, y, c, st, f) { const t = E.tones(c); px.disc(g, x, y, 16, t.sh); px.disc(g, x - 1, y - 1, 15, t.base); px.disc(g, x - 5 * f, y - 6, 4, t.hi); px.line(g, x - 14, y - 4, x + 12, y - 4, st, 2); px.line(g, x + 12 * f, y + 2, x + 20 * f, y + 2, '#a0a4ac', 2); px.line(g, x + 12 * f, y + 8, x + 20 * f, y + 8, '#a0a4ac', 2); px.line(g, x + 20 * f, y, x + 20 * f, y + 10, '#a0a4ac', 2); }
FF.drawHelmet = helmet;

/* ---- EXHIBITION SETUP: controllers and teams, then the game options ---- */
const TEAMS = () => FF.data.teams.filter(t => !t.hidden);
const setup = {
  input: FF.KEYS, view: 'broadcast', camera: { zoom: false },
  enter() {
    setup.step = 1; setup.sel = [0, 1]; setup.slots = [];
    game.allowJoin({ max: 4, onJoin: (I, n) => { setup.slots.push({ input: I, side: -1, ready: false }); FF.sfx('menuSelect'); void n; } });
    for (const I of game.players) if (!setup.slots.some(s => s.input === I)) setup.slots.push({ input: I, side: -1, ready: false });
    setup.opts = { stadium: -1, weather: 'stadium', q: game.settings.quarterLen, diff: game.settings.difficulty };
    IDLE.reset(); FF.music.play('LOCKER');
    setup.menu2 = new UI.Menu({ items: () => setup.optItems(), layout: UI.listLayout((w) => w / 2 - 140, 50, 280, 26, 4), onPick: it => it.fn && it.fn(), onSide: (dx, it) => { if (it.cycle) { it.cycle(dx); FF.sfx('menuMove'); return true; } return false; }, onBack: () => { setup.step = 1; for (const s of setup.slots) s.ready = false; } });
  },
  exit() { game.allowJoin(false); },
  optItems() {
    const st = FF.data.stadiums, o = setup.opts, home = TEAMS()[setup.sel[0]];
    const sIdx = o.stadium < 0 ? st.findIndex(s => s.id === home.stadium) : o.stadium, W2 = ['stadium', 'clear', 'rain', 'snow'], QL = [60, 90, 120, 180, 300], D = ['rookie', 'pro', 'fiasco'];
    const cyc = (arr, cur, set) => dx => set(arr[(arr.indexOf(cur) + dx + arr.length) % arr.length]);
    return [
      { id: 'st', label: '◂ STADIUM: ' + st[sIdx].name + ' ▸', cycle: dx => { o.stadium = (sIdx + dx + st.length) % st.length; }, fn: () => { o.stadium = (sIdx + 1) % st.length; } },
      { id: 'w', label: '◂ WEATHER: ' + o.weather.toUpperCase() + ' ▸', cycle: cyc(W2, o.weather, v => o.weather = v), fn: () => cyc(W2, o.weather, v => o.weather = v)(1) },
      { id: 'q', label: '◂ QUARTERS: ' + FF.fmtClock(o.q) + ' ▸', cycle: cyc(QL, o.q, v => o.q = v), fn: () => cyc(QL, o.q, v => o.q = v)(1) },
      { id: 'd', label: '◂ DIFFICULTY: ' + o.diff.toUpperCase() + ' ▸', cycle: cyc(D, o.diff, v => o.diff = v), fn: () => cyc(D, o.diff, v => o.diff = v)(1) },
      { id: 'go', label: 'PLAY BALL!', fn: () => setup.play(), style: { bg: ['#6a2a1a', '#3a1008'] } }
    ];
  },
  play() {
    const o = setup.opts, home = TEAMS()[setup.sel[0]], away = TEAMS()[setup.sel[1]], st = FF.data.stadiums, sIdx = o.stadium < 0 ? st.findIndex(s => s.id === home.stadium) : o.stadium;
    const weather = o.weather === 'stadium' ? undefined : o.weather === 'clear' ? null : { kind: o.weather, amount: .6, wind: .2 };
    const humans = setup.slots.filter(s => s.side >= 0).map(s => ({ input: s.input, team: s.side }));
    game.settings.set('quarterLen', o.q); game.settings.set('difficulty', o.diff);
    game.go('match', { mode: 'exhibition', home: home.id, away: away.id, stadium: st[sIdx].id, humans, qLen: o.q, difficulty: o.diff, weather, cards: [[rndCard()], [rndCard()]] });
  },
  update(dt) {
    IDLE.update(dt, 'setup');
    if (setup.step === 2) { setup.menu2.update(); return; }
    const S = setup.slots;
    for (const s of S) {
      const I = s.input;
      if (s.ready) { if (I.pressed('b2') || I.pressed('cancel')) { s.ready = false; FF.sfx('menuBack'); } continue; }
      if (I.pressed('left')) { s.side = s.side === 1 ? -1 : 0; FF.sfx('menuMove'); }
      if (I.pressed('right')) { s.side = s.side === 0 ? -1 : 1; FF.sfx('menuMove'); }
      if (s.side >= 0 && S.find(x => x.side === s.side) === s) { if (I.pressed('up')) { setup.cycle(s.side, -1); } if (I.pressed('down')) { setup.cycle(s.side, 1); } }
      if (s === S[0] && I.pressed('b4')) { const cpu = [0, 1].find(t => !S.some(x => x.side === t)); if (cpu !== undefined) setup.cycle(cpu, 1); }
      if (I.pressed('b1') || I.pressed('confirm')) { s.ready = true; FF.sfx('menuSelect'); }
      if ((I.pressed('cancel') || I.pressed('b2')) && s === S[0]) { game.go('menu'); return; }
    }
    // the mouse: click a team panel's arrows, the sides, READY
    const c = game.input.clicked && game.input.clicked();
    if (c) {
      const L = setup.layout();
      for (const t of [0, 1]) { if (inside(c, L.up[t])) setup.cycle(t, -1); if (inside(c, L.down[t])) setup.cycle(t, 1); if (inside(c, L.side[t])) { S[0].side = t; FF.sfx('menuMove'); } }
      if (inside(c, L.cpu)) S[0].side = -1;
      if (inside(c, L.ready)) { S[0].ready = true; for (const s of S) if (s.side < 0) s.ready = true; }
    }
    if (S.length && S.every(s => s.ready) && setup.sel[0] !== setup.sel[1]) { setup.step = 2; setup.menu2.i = 4; FF.sfx('menuSelect'); }
    else if (S.length && S.every(s => s.ready)) { for (const s of S) s.ready = false; setup.cycle(1, 1); }
  },
  cycle(t, d) { const n = TEAMS().length; setup.sel[t] = (setup.sel[t] + d + n) % n; FF.sfx('menuMove'); },
  layout() { const w = W(), h = H(), pw = Math.min(150, w * .32); return { pw, x: [12, w - 12 - pw], up: [0, 1].map(t => ({ x: (t ? w - 12 - pw : 12) + pw / 2 - 12, y: 34, w: 24, h: 12 })), down: [0, 1].map(t => ({ x: (t ? w - 12 - pw : 12) + pw / 2 - 12, y: 150, w: 24, h: 12 })), side: [0, 1].map(t => ({ x: t ? w - 12 - pw : 12, y: 48, w: pw, h: 100 })), cpu: { x: w / 2 - 40, y: 60, w: 80, h: 90 }, ready: { x: w / 2 - 60, y: h - 50, w: 120, h: 22 } }; },
  draw(r) {
    drawStage(r, 1 / 60, { zoom: 1.25, x: 900, y: FF.FIELD.MID_Y });
    r.overlay(g => {
      px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, W(), H(), '#05050c'));
      if (setup.step === 2) {
        UI.title(g, 'GAME OPTIONS', W() / 2, 12, 2);
        setup.menu2.draw(g, { style: { scale: 1 } });
        const home = TEAMS()[setup.sel[0]], away = TEAMS()[setup.sel[1]];
        T(g, home.short + '  VS  ' + away.short, W() / 2, 34, '#ffe040', { align: 'center' });
        GL.bar(g, [['confirm', 'SELECT', { mouse: 'L' }], ['left', 'CHANGE'], ['cancel', 'BACK']]);
        return;
      }
      UI.title(g, 'CONTROLLERS & TEAMS', W() / 2, 6, 2);
      const L = setup.layout();
      for (const t of [0, 1]) teamPanel(g, L.x[t], 30, L.pw, TEAMS()[setup.sel[t]], t ? 'AWAY' : 'HOME', setup.slots.some(s => s.side === t));
      T(g, 'CPU', W() / 2, 46, '#a9a6c0', { align: 'center', scale: 2 });
      setup.slots.forEach((s, i) => {
        const col = E.PLAYER_COLORS[i % 4], x = s.side < 0 ? W() / 2 : s.side === 0 ? L.x[0] + L.pw / 2 : L.x[1] + L.pw / 2, y = 70 + i * 22 + (s.side >= 0 ? 104 : 0);
        E.ui.box(g, x - 26, y, 52, 18, { bg: [col, E.shade(col, -.4)], border: s.ready ? '#ffffff' : '#000000', alpha: 1 });
        const dev = s.input.half ? 'KEYS ' + String(s.input.half).toUpperCase().slice(0, 1) : s.input.lastDevice === 'gamepad' ? 'PAD' : 'KEYS';
        T(g, 'P' + (i + 1) + ' ' + dev, x, y + 2, '#ffffff', { align: 'center', font: 'tiny' }); T(g, s.ready ? 'READY' : '◂ ▸', x, y + 10, '#ffffff', { align: 'center', font: 'tiny' });
      });
      if (setup.sel[0] === setup.sel[1]) T(g, 'PICK TWO DIFFERENT TEAMS', W() / 2, H() - 70, '#ff8a6a', { align: 'center' });
      UI.button(g, L.ready, 'READY', false, { scale: 1 });
      T(g, 'MORE PLAYERS: START ON A PAD, OR 2 ON THE KEYBOARD', W() / 2, H() - 64, '#a9a6c0', { align: 'center', font: 'tiny' });
      GL.bar(g, [['left', 'SIDE'], ['up', 'TEAM'], ['b1', 'READY', { mouse: 'L' }], ['b4', 'CPU TEAM'], ['b2', 'BACK']]);
    });
  }
};
function teamPanel(g, x, y, w, team, side, human) {
  UI.panel(g, x, y, w, 132, { border: team.colors.primary, alpha: .95 });
  T(g, side + (human ? '' : ' (CPU)'), x + w / 2, y + 3, '#a9a6c0', { align: 'center', font: 'tiny' });
  T(g, '▲', x + w / 2, y + 6, '#ffe040', { align: 'center' });
  FF.hud.logo(g, team, x + 8, y + 18, 2);
  helmet(g, x + w - 30, y + 34, team.colors.helmet, team.colors.stripe, -1);
  T(g, team.short, x + w / 2, y + 54, '#ffffff', { align: 'center', scale: 2 });
  T(g, team.city, x + w / 2, y + 70, '#c8c4e0', { align: 'center', font: 'tiny' });
  let k = 0; for (const [n, v] of Object.entries(team.bars)) { const by = y + 80 + k * 9; T(g, n, x + 6, by, '#a9a6c0', { font: 'tiny', shadow: false }); E.ui.bar(g, x + 50, by, w - 58, 5, Math.min(1, v), team.colors.primary === '#1a1a2a' ? team.colors.secondary : team.colors.primary); k++; }
  T(g, '★ ' + team.star.name, x + w / 2, y + 118, '#ffe040', { align: 'center', font: 'tiny' });
  T(g, '▼', x + w / 2, y + 122, '#ffe040', { align: 'center' });
}
function rndCard() { const c = FF.data.cards; return c[Math.floor(FF.rf() * c.length)].id; }
FF.rndCard = rndCard;

/* ---- RECORDS ---- */
const records = {
  input: FF.KEYS, view: 'broadcast', camera: { zoom: false },
  enter() { records.page = 0; },
  update(dt) {
    const I = game.input, n = Math.ceil(FF.records.KEYS.length / 6);
    if (I.pressed('right') || I.pressed('rb')) records.page = (records.page + 1) % n;
    if (I.pressed('left') || I.pressed('lb')) records.page = (records.page - 1 + n) % n;
    const c = I.clicked && I.clicked(); if (c && inside(c, { x: 8, y: H() - 30, w: 80, h: 22 })) game.go('menu');
    if (I.pressed('cancel') || I.pressed('b2') || I.pressed('confirm')) game.go('menu');
    IDLE.update(dt, 'records');
  },
  draw(r) {
    drawStage(r, 1 / 60, { zoom: 1.25 });
    r.overlay(g => {
      px.blend(g, .65, 'normal', () => px.rect(g, 0, 0, W(), H(), '#05050c'));
      UI.title(g, 'HALL OF FIASCO', W() / 2, 8, 3);
      const rec = FF.records.all(), keys = FF.records.KEYS.slice(records.page * 6, records.page * 6 + 6);
      keys.forEach(([k, label, unit], i) => {
        const y = 52 + i * 27, v = rec[k]; UI.panel(g, W() / 2 - 170, y, 340, 24, { alpha: .9 });
        if (v && v.team) FF.hud.logo(g, FF.team(v.team), W() / 2 - 166, y + 6, 1);
        T(g, label, W() / 2 - 150, y + 3, '#ffb02e');
        T(g, v ? (k === 'cupTime' ? FF.fmtClock(v.v) : v.v + unit) : '--', W() / 2 + 160, y + 5, '#ffffff', { align: 'right', scale: 2 });
        T(g, v ? (v.name || '') + (v.date ? '  ' + v.date : '') : 'NOT SET YET', W() / 2 - 150, y + 13, '#a9a6c0', { font: 'tiny' });
      });
      T(g, 'PAGE ' + (records.page + 1) + ' / ' + Math.ceil(FF.records.KEYS.length / 6), W() / 2, H() - 40, '#a9a6c0', { align: 'center' });
      UI.button(g, { x: 8, y: H() - 30, w: 80, h: 22 }, 'BACK', false, { scale: 1 });
      GL.bar(g, [['left', 'PAGE'], ['cancel', 'BACK', { mouse: 'L' }]]);
    });
  }
};

/* ---- ABOUT & CREDITS: pages from window.FF_ABOUT (the same object as exit-interview.json) ---- */
FF.aboutPages = () => {
  const A = (typeof window !== 'undefined' && window.FF_ABOUT) || {}, si = A.sourceInformation || {};
  const lab = { date: 'Date', source: 'Source', plan: 'Plan', genre: 'Genre', perspective: 'Perspective', tech: 'Tech', artDirection: 'Art Direction', animation: 'Animation', audio: 'Audio', online: 'Online', testing: 'Testing', research: 'Research', environment: 'Environment', model: 'Model', usage: 'Usage' };
  const TQ = ['How many issues did testing catch?', 'How many were critical or game breaking?', 'The most helpful test', 'The least helpful test'];
  const EQ = ['What I liked most about the engine', 'Did I get stuck or guess wrong?', 'The most important thing I built myself', 'The hardest part of using the engine', 'What I changed in the engine, and why', 'One thing I would change'];
  const PQ = ['What I liked most about the prompt', 'What was confusing', 'The hardest thing to do', 'What I would change'];
  const qa = (qs, as) => qs.map((q, i) => [q, (as || [])[i] || 'unknown']);
  return [
    { title: 'SOURCE INFORMATION', rows: Object.keys(lab).map(k => [lab[k], si[k] || 'unknown']) },
    { title: 'TESTING FEEDBACK', rows: qa(TQ, A.testingFeedback) },
    { title: 'ENGINE FEEDBACK', rows: qa(EQ, A.engineFeedback) },
    { title: 'PROMPT FEEDBACK', rows: qa(PQ, A.promptFeedback) },
    { title: 'CREDITS', rows: (A.credits || []).map(c => [c[0], c[1]]) },
    { title: 'ENGINE CHANGES', rows: (A.engineChanges || []).map(c => [c[0], c[1]]) }
  ];
};
const about = {
  input: FF.KEYS, view: 'broadcast', camera: { zoom: false },
  enter(d) { about.page = 0; about.scroll = 0; about.back = d && d.back || 'menu'; },
  update(dt) {
    const I = game.input, pages = FF.aboutPages(), n = pages.length;
    if (I.pressed('right') || I.pressed('rb')) { about.page = (about.page + 1) % n; about.scroll = 0; FF.sfx('menuMove'); }
    if (I.pressed('left') || I.pressed('lb')) { about.page = (about.page - 1 + n) % n; about.scroll = 0; FF.sfx('menuMove'); }
    if (I.down('down')) about.scroll += dt * 90; if (I.down('up')) about.scroll = Math.max(0, about.scroll - dt * 90);
    const c = I.clicked && I.clicked();
    if (c) { if (c[0] < 40 && c[1] > 40 && c[1] < H() - 40) about.page = (about.page - 1 + n) % n; else if (c[0] > W() - 40 && c[1] > 40 && c[1] < H() - 40) about.page = (about.page + 1) % n; else if (inside(c, { x: 8, y: H() - 30, w: 80, h: 22 })) { game.go(about.back); return; } }
    if (I.pressed('cancel') || I.pressed('b2')) game.go(about.back);
  },
  draw(r) {
    r.sky(['#0a0a18', '#1a1030', '#2a1440']);
    r.overlay(g => {
      const pages = FF.aboutPages(), p = pages[about.page];
      UI.title(g, p.title, W() / 2, 6, 2);
      T(g, (about.page + 1) + ' / ' + pages.length, W() / 2, 26, '#a9a6c0', { align: 'center', font: 'tiny' });
      T(g, '◂', 14, H() / 2, '#ffb02e', { scale: 3 }); T(g, '▸', W() - 26, H() / 2, '#ffb02e', { scale: 3 });
      let y = 40 - about.scroll; const x = 40, w = W() - 80;
      for (const [k, v] of p.rows) {
        const lines = E.font.wrap ? E.font.wrap(String(v), w - 8) : [String(v)];
        const h = 12 + lines.length * 9;
        if (y > 30 && y < H() - 40) { T(g, k, x, y, '#ffb02e'); }
        lines.forEach((ln, i) => { const yy = y + 10 + i * 9; if (yy > 30 && yy < H() - 40) T(g, ln, x + 6, yy, '#f4f0e6'); });
        y += h + 4;
      }
      about.maxScroll = Math.max(0, y + about.scroll - (H() - 50));
      if (about.scroll > about.maxScroll) about.scroll = about.maxScroll;
      UI.button(g, { x: 8, y: H() - 30, w: 80, h: 22 }, 'BACK', false, { scale: 1 });
      GL.bar(g, [['left', 'PAGE'], ['up', 'SCROLL'], ['cancel', 'BACK', { mouse: 'L' }]]);
    });
  }
};

FF.scenes = Object.assign(FF.scenes || {}, { title, menu, setup, records, about });
})();
