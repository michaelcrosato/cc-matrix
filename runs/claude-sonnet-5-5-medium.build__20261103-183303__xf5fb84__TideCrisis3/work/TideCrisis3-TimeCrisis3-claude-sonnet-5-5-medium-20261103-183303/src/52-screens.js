// 52-screens.js — title, main menu, difficulty, stage select, co-op join, briefing/cutscene pages, results,
// game over + initials, records, about, ending/credits, touch-only notice. 10-foot sizes (scale 2+), one big focus,
// hover moves focus, prompts from input.label().
const Backdrop = { sim: null, t: 0 };
function backdropSim() { if (!Backdrop.sim) { Backdrop.sim = new Sim({ scene: '1-1', stage: 1, players: [{}] }); } return Backdrop.sim; }
function drawBackdrop(g, W, H, t, dim = .35) {
  const sim = backdropSim(); const a = t * .12;
  drawWorld(g, sim, 0, W, H, t, { pose: { x: -90 + Math.sin(a) * 40, y: Math.sin(a * .7) * 50, z: 30 + Math.sin(a * .5) * 4, yaw: Math.sin(a * .9) * .35, pitch: .02, roll: 0, fov: 55 } });
  px.blend(g, dim, 'normal', () => px.rect(g, 0, 0, W, H, '#050a1c'));
}
const T = (g, s, x, y, col, o) => E.font.text(g, String(s).replace(/–/g, '-'), Math.round(x), Math.round(y), col, Object.assign({ shadow: '#000000', outline: false }, o));
function logo(g, W, y, t) {
  E.font.title(g, 'TIDE CRISIS', Math.round(W / 2 - 30), y, { scale: 4, colors: ['#ffffff', '#9fe3ff', '#3aa0e8', '#1a4f9c'], outline: '#08142a', depth: 3, depthColor: '#08142a', align: 'center' });
  E.font.title(g, '3', Math.round(W / 2 + 96), y - 4, { scale: 6, colors: ['#fff3b0', '#ffb347', '#ff5a2a', '#a81e1e'], outline: '#08142a', depth: 3, depthColor: '#2a0808', align: 'center' });
  for (let i = 0; i < 4; i++) { const yy = y + 42 + i * 2; for (let x = 0; x < W; x += 3) { const v = Math.sin(x * .05 + t * 2 + i) * 2; px.rect(g, x, yy + v, 3, 1, ['#3aa0e8', '#1a6fb8', '#124a88', '#0a2a58'][i]); } }
}
// ---- BigMenu: scale-2 entries, one wave-animated focus, hover/click, description line ----
class BigMenu {
  constructor(items, o = {}) { this.items = items; this.i = o.start || 0; this.o = o; this.t = 0; this.rects = []; this.mt = null; }
  inputs() { return game._players || [game.input]; }
  update(dt) {
    this.t += dt; const n = this.items.length, P = this.inputs(), I = P[0]; let moved = false;
    if (P.some(p => p.repeat('up'))) { this.i = (this.i + n - 1) % n; moved = true; } if (P.some(p => p.repeat('down'))) { this.i = (this.i + 1) % n; moved = true; }
    if (I.mouse.t !== this.mt) { this.mt = I.mouse.t; const pt = I.pointer(); if (pt) for (let k = 0; k < this.rects.length; k++) { const r = this.rects[k]; if (pt[0] >= r.x && pt[0] < r.x + r.w && pt[1] >= r.y && pt[1] < r.y + r.h && !this.items[k].disabled) { if (this.i !== k) { this.i = k; SND.play('select'); } } } }
    let tap = -1; const c = I.clicked(); if (c) for (let k = 0; k < this.rects.length; k++) { const r = this.rects[k]; if (c[0] >= r.x && c[0] < r.x + r.w && c[1] >= r.y && c[1] < r.y + r.h) tap = k; }
    if (tap >= 0) this.i = tap; if (moved) SND.play('select');
    if (this.items[this.i] && this.items[this.i].disabled && moved) this.i = (this.i + 1) % n;
    if ((P.some(p => p.pressed('confirm')) || tap >= 0) && !this.items[this.i].disabled) { SND.play('confirm'); P.forEach(p => p.consumeAll()); if (this.o.onPick) this.o.onPick(this.i, this.items[this.i]); return true; }
    if (P.some(p => p.pressed('cancel')) && this.o.onCancel) { SND.play('back'); P.forEach(p => p.consumeAll()); this.o.onCancel(); return true; }
    return false;
  }
  draw(g, W, H, y0 = 92, rowH = 22) {
    this.rects = []; const mid = W / 2;
    this.items.forEach((it, k) => {
      const sel = k === this.i, y = y0 + k * rowH, w = 190, x = mid - w / 2; this.rects.push({ x, y: y - 2, w, h: rowH });
      if (sel) { const wave = Math.sin(this.t * 6) * 2; px.rect(g, x - 4 + wave, y - 2, w + 8, rowH - 2, '#1a4f9c'); px.rect(g, x - 4 + wave, y - 2, w + 8, 1, '#9fe3ff'); px.rect(g, x - 4 + wave, y + rowH - 5, w + 8, 1, '#9fe3ff'); T(g, '▸', x + 2, y + 2, '#ffd36a', { scale: 2 }); }
      T(g, it.label, mid, y + 2, it.disabled ? '#5a6480' : sel ? '#ffd36a' : '#f4f7ff', { scale: 2, align: 'center' });
    });
    const it = this.items[this.i]; if (it && it.desc) T(g, it.desc, mid, y0 + this.items.length * rowH + 6, '#9fb8e8', { scale: 1, align: 'center' });
  }
}
function promptBar(g, W, H, pairs) {
  const inp = game.input; let s = ''; for (const [a, l] of pairs) s += '[' + inp.label(a) + '] ' + l + '    '; T(g, s.trim(), W / 2, H - 14, '#9fb8e8', { scale: 1, align: 'center' });
}
// any input resets the idle timer (a key, a button, the wheel, a stick past its dead zone, a pointer move > 4 px)
const Idle = { t: 0, last: null };
function idleStep(dt) {
  const I = game.input; let any = I.anyPressed(); const pt = I.pointer(); if (pt) { if (Idle.last && Math.hypot(pt[0] - Idle.last[0], pt[1] - Idle.last[1]) > 4) any = true; Idle.last = pt.slice(); }
  if (I.padAim || (I.padMove && Math.hypot(I.padMove[0], I.padMove[1]) > .3)) any = true;
  if (any) Idle.t = 0; else Idle.t += dt; return Idle.t;
}
const touchOnly = () => { try { return window.matchMedia && matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches && !(navigator.getGamepads && Array.from(navigator.getGamepads()).some(Boolean)) && !Run.keyed; } catch (e) { return false; } };
// ---- scenes ----
const Scenes = {};
Scenes.title = { camera: { zoom: false }, touch: [],
  enter() { if (Run.hub) { game.go(Run.hub.server ? 'server' : 'session', { fade: 0 }); return; } Idle.t = 0; musicFor(game, 'theme'); Run._song = 'theme'; game.splitScreen(0); Run.attract = false; Run.mode = 'arcade'; Run.hub = null; this.t = 0; },
  update(dt) {
    this.t += dt; const I = game.input;
    if (touchOnly()) { Idle.t += dt; if (I.clicked()) { const c = I.clicked(); if (c[0] > game.W - 40 && c[1] < 40) game.menu('settings'); else if (Idle.t > 2) { } } if (I.anyPressed()) { Run.keyed = true; } if (Idle.t > 10) game.go('attract'); return; }
    const idle = idleStep(dt); if (idle > 10) { game.go('attract'); return; }
    if (I.pressed('confirm') || I.pressed('start') || I.clicked() || I.pressed('fire')) { SND.play('confirm'); I.consumeAll(); game.go('menu'); }
  },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H; drawBackdrop(g, W, H, game.time, .25); logo(g, W, 40, game.time);
    if (touchOnly()) { T(g, 'Controller or keyboard required', W / 2, 124, '#ffd36a', { scale: 2, align: 'center' }); E.ui.box(g, W - 36, 6, 30, 26, { bg: ['#10244a', '#081428'], border: '#3aa0e8' }); T(g, '⚙', W - 21, 12, '#ffffff', { scale: 2, align: 'center' }); }
    else { const pad = game.input.lastDevice === 'gamepad'; if (Math.floor(game.real * 2) % 2 === 0) T(g, pad ? 'PRESS ' + game.input.label('confirm') : (game.input.lastDevice === 'keyboard' ? 'PRESS ENTER' : 'PRESS ENTER OR CLICK'), W / 2, 150, '#ffffff', { scale: 2, align: 'center' }); }
    T(g, 'An original arcade light-gun rail shooter — inspired by Time Crisis 3', W / 2, H - 24, '#9fb8e8', { scale: 1, align: 'center' }); T(g, E.versionLabel ? E.versionLabel() : '', W / 2, H - 12, '#6a7ea8', { scale: 1, align: 'center', font: 'tiny' }); }); }
};
const MAIN_ITEMS = () => [{ label: 'ARCADE', desc: 'One agent, three stages, one tide to beat.' }, { label: 'CO-OP', desc: 'Two agents, split screen, two controllers.' }, { label: 'STAGE SELECT', desc: 'Jump into any stage at any difficulty.' }, { label: 'TRAINING', desc: 'The CREST shooting range: four short drills.' }, { label: 'RECORDS', desc: 'High scores, best range time and intel.' }, { label: 'SETTINGS', desc: 'Sound, controls, aim assist and comfort.' }, { label: 'ABOUT', desc: 'How to play, credits and source information.' }];
Scenes.menu = { camera: { zoom: false }, touch: [],
  enter() { Idle.t = 0; this.m = new BigMenu(MAIN_ITEMS(), { start: Run.menuI || 0, onPick: (i) => { Run.menuI = i; this.pick(i); }, onCancel: () => game.go('title') }); if (Run._song !== 'theme') { musicFor(game, 'theme'); Run._song = 'theme'; } },
  pick(i) {
    if (i === 0) { Run.begin('arcade', 1, game.settings.difficulty, 1); game.go('difficulty', { next: 'arcade' }); }
    else if (i === 1) { game.go('coop'); } else if (i === 2) game.go('select'); else if (i === 3) { Run.begin('range', 0, 'normal', 1); game.go('briefing', { stage: 0 }); }
    else if (i === 4) game.go('records'); else if (i === 5) game.menu('settings'); else if (i === 6) game.go('about');
  },
  update(dt) { const idle = idleStep(dt); if (idle > 10 && !game.paused) { game.go('attract'); return; } this.m.update(dt); },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H; drawBackdrop(g, W, H, game.time, .5); logo(g, W, 14, game.time); this.m.draw(g, W, H, 66, 20); promptBar(g, W, H, [['confirm', 'SELECT'], ['cancel', 'BACK']]); }); }
};
Scenes.difficulty = { camera: { zoom: false }, touch: [],
  enter(d) { this.d = d || {}; const cur = ['easy', 'normal', 'hard'].indexOf(game.settings.difficulty || 'normal'); this.m = new BigMenu([{ label: 'EASY', desc: '7 lives · 25% more TIME · fewer threats' }, { label: 'NORMAL', desc: '5 lives · the way it is meant to be played' }, { label: 'HARD', desc: '3 lives · 15% less TIME · more threats at once' }], { start: cur < 0 ? 1 : cur, onPick: (i) => { const k = ['easy', 'normal', 'hard'][i]; Run.diff = k; game.settings.set && game.settings.set('difficulty', k); this.d.diff = k; if (this.d.next === 'arcade' || this.d.next === 'coop') game.go('briefing', { stage: 1 }); else game.go('briefing', { stage: this.d.stage }); }, onCancel: () => game.go('menu') }); },
  update(dt) { this.m.update(dt); },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H; drawBackdrop(g, W, H, game.time, .6); T(g, 'DIFFICULTY', W / 2, 24, '#ffffff', { scale: 3, align: 'center' }); this.m.draw(g, W, H, 80, 26); promptBar(g, W, H, [['confirm', 'SELECT'], ['cancel', 'BACK']]); }); }
};
Scenes.select = { camera: { zoom: false }, touch: [],
  enter() { this.i = 0; this.t = 0; this.rects = []; },
  update(dt) { this.t += dt; const P = game._players || [game.input], I = P[0];
    if (P.some(p => p.repeat('left'))) { this.i = (this.i + 2) % 3; SND.play('select'); } if (P.some(p => p.repeat('right'))) { this.i = (this.i + 1) % 3; SND.play('select'); }
    if (I.mouse.t !== this.mt) { this.mt = I.mouse.t; const pt = I.pointer(); if (pt) this.rects.forEach((q, k) => { if (pt[0] >= q.x && pt[0] < q.x + q.w && pt[1] >= q.y && pt[1] < q.y + q.h && this.i !== k) { this.i = k; SND.play('select'); } }); }
    const c = I.clicked(); let tap = -1; if (c) this.rects.forEach((q, k) => { if (c[0] >= q.x && c[0] < q.x + q.w && c[1] >= q.y && c[1] < q.y + q.h) tap = k; }); if (tap >= 0) this.i = tap;
    if (P.some(p => p.pressed('confirm')) || tap >= 0) { SND.play('confirm'); P.forEach(p => p.consumeAll()); Run.begin('stage', this.i + 1, game.settings.difficulty, 1); game.go('difficulty', { next: 'stage', stage: this.i + 1 }); }
    if (P.some(p => p.pressed('cancel'))) { SND.play('back'); P.forEach(p => p.consumeAll()); game.go('menu'); } },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H; drawBackdrop(g, W, H, game.time, .6); T(g, 'STAGE SELECT', W / 2, 16, '#ffffff', { scale: 3, align: 'center' }); this.rects = [];
    for (let k = 0; k < 3; k++) { const st = reg('stage', k + 1), w = 124, x = W / 2 - 190 + k * 128 + 2 * 0, y = 58, sel = k === this.i; this.rects.push({ x, y, w, h: 140 }); const wave = sel ? Math.sin(this.t * 6) * 1.5 : 0;
      E.ui.box(g, x, y + wave, w, 140, { bg: sel ? ['#1a4f9c', '#0a2858'] : ['#10244a', '#081428'], border: sel ? '#ffd36a' : '#3a5a98' });
      T(g, 'STAGE ' + (k + 1), x + w / 2, y + 8 + wave, sel ? '#ffd36a' : '#9fe3ff', { scale: 1, align: 'center' }); T(g, st.name, x + w / 2, y + 22 + wave, '#ffffff', { scale: 2, align: 'center', wrap: w - 10 });
      T(g, st.place, x + w / 2, y + 66 + wave, '#9fb8e8', { scale: 1, align: 'center' }); T(g, st.clock, x + w / 2, y + 80 + wave, '#ffb347', { scale: 2, align: 'center' });
      const hs = arcade.table('stage' + (k + 1))[0]; T(g, hs ? 'BEST ' + hs.score : 'NO SCORE YET', x + w / 2, y + 108 + wave, '#7cc0ff', { scale: 1, align: 'center' }); T(g, st.scenes.length + ' AREAS', x + w / 2, y + 122 + wave, '#6a7ea8', { scale: 1, align: 'center' }); }
    promptBar(g, W, H, [['left', 'MOVE'], ['confirm', 'SELECT'], ['cancel', 'BACK']]); }); }
};
Scenes.coop = { camera: { zoom: false }, touch: [],
  enter() { this.t = 0; game.allowJoin && game.allowJoin({ max: 2, onJoin: () => { SND.play('oneup'); } }); },
  exit() { game.allowJoin && game.allowJoin(false); },
  update(dt) { this.t += dt; const P = game.players || [game.input]; if (game.input.pressed('cancel')) { SND.play('back'); game.go('menu'); return; } if (P.length > 1 || game.input.pressed('more')) { if (P.length < 2) { game.addPlayer && game.addPlayer({ keys: 'right' }); } Run.begin('coop', 1, game.settings.difficulty, 2); game.go('difficulty', { next: 'coop' }); } },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H; drawBackdrop(g, W, H, game.time, .6); T(g, 'CO-OP', W / 2, 20, '#ffffff', { scale: 3, align: 'center' });
    E.ui.box(g, W / 2 - 150, 70, 140, 100, { bg: ['#4a1210', '#200808'], border: PCOL[0] }); T(g, 'PLAYER 1', W / 2 - 80, 80, PCOL[0], { scale: 2, align: 'center' }); T(g, 'KAI', W / 2 - 80, 104, '#ffffff', { scale: 2, align: 'center' }); T(g, 'READY', W / 2 - 80, 140, '#7cff8a', { scale: 2, align: 'center' });
    const joined = (game.players || []).length > 1; E.ui.box(g, W / 2 + 10, 70, 140, 100, { bg: joined ? ['#101e4a', '#080e20'] : ['#181c28', '#0c0e14'], border: joined ? PCOL[1] : '#444c60' }); T(g, 'PLAYER 2', W / 2 + 80, 80, joined ? PCOL[1] : '#6a7ea8', { scale: 2, align: 'center' });
    if (joined) { T(g, 'ROOK', W / 2 + 80, 104, '#ffffff', { scale: 2, align: 'center' }); T(g, 'READY', W / 2 + 80, 140, '#7cff8a', { scale: 2, align: 'center' }); } else if (Math.floor(this.t * 2) % 2) T(g, 'PRESS START', W / 2 + 80, 116, '#ffd36a', { scale: 2, align: 'center' });
    T(g, 'PLAYER 2 — PRESS START ON A CONTROLLER', W / 2, 190, '#9fe3ff', { scale: 1, align: 'center' }); T(g, 'P1 keeps the keyboard and mouse. Split screen: each agent has their own view and cover.', W / 2, 202, '#6a7ea8', { scale: 1, align: 'center' }); promptBar(g, W, H, [['cancel', 'BACK']]); }); }
};
// ---- briefing and cutscene pages ----
function startPages(pages, name) { this.pi = 0; this.chars = 0; this.hold = 0; this.skipping = false; this.pages = pages; this.name = name; this.sayStarted = -1; this.t = 0; }
const PageScene = (kind) => ({ camera: { zoom: false }, touch: [],
  enter(d) { this.d = d || {}; let def_; if (kind === 'brief') { def_ = reg('brief', 'brief' + (this.d.stage || 1)); } else { def_ = reg('cutscene', this.d.id); } if (!def_ || (kind === 'brief' && this.d.stage === 0)) { this.pages = [['juno', 'Welcome to the CREST range. Four drills: aim and fire, cover and reload, weapons, and reading the crisis flash.'], ['juno', 'Listen to the sirens. When the flash says a shot will hit—duck. Let\'s begin!']]; this.title = 'CREST RANGE'; this.obj = ['Aim & fire', 'Cover & reload', 'Weapons', 'Read the crisis']; } else { this.pages = def_.pages; this.title = def_.title || ''; this.obj = def_.obj; }
    this.pi = 0; this.chars = 0; this.hold = 0; this.t = 0; this.said = -1; this.sc = this.d.scene || (def_ && def_.scene) || '1-1'; Run._song = 'briefing'; musicFor(game, 'briefing'); this.stageN = this.d.stage; },
  update(dt) {
    this.t += dt; const I = game.input, pg = this.pages[this.pi]; if (!pg) { this.finish(); return; }
    if (this.said !== this.pi) { this.said = this.pi; this.dur = Voice.say(pg[1], pg[0]); this.chars = 0; }
    this.chars += dt * 48; const full = this.chars >= pg[1].length;
    if (I.down('confirm') && I.down('cancel') === false && false) { }
    if (I.down('start') || I.down('confirm')) this.hold += dt; else this.hold = 0;
    if (this.hold > .7) { this.finish(); return; }
    if (I.pressed('confirm') || I.clicked() || I.pressed('fire')) { if (!full) this.chars = 999; else { this.pi++; this.hold = 0; if (this.pi >= this.pages.length) this.finish(); } I.consumeAll(); }
  },
  finish() { I_(); if (kind === 'brief') { if (Run.mode === 'range') { Run.newSim(0, 'T-1', { mode: 'range', lives: 99 }); game.go('play'); } else { const sim = Run.sim && Run.mode !== 'arcade' ? null : Run.sim; const d = this.d; Run.newSim(d.stage || Run.stage); Run.stage = d.stage || Run.stage; const st = reg('stage', Run.stage); if (st.intro && !Run.hub) game.go('cutscene', { id: st.intro, scene: st.scenes[0], then: 'play' }); else game.go('play'); } } else { if (this.d.then === 'play') game.go('play'); else if (this.d.then === 'ending') game.go('ending'); else if (this.d.then === 'next') { if (Run._after) { const f = Run._after; Run._after = null; f(); } else game.go('menu'); } else game.go('menu'); } },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H, pg = this.pages[Math.min(this.pi, this.pages.length - 1)], who = reg('speaker', pg[0]);
    if (kind === 'cut') { const sc = reg('scene', this.sc), sim = backdropSim(); const a = this.t * .1; if (sc) { const fake = { scene: sc, rail: 0, phase: 'action', pose: () => ({}), players: sim.players, objs: [], enemies: [], proj: [], boss: null, coverBox: () => ({ x0: 0, x1: 0, y0: 0, y1: 0, z0: 0, z1: 0 }), t: this.t, timeMax: 1, timer: 1 }; drawWorld(g, fake, 0, W, H, this.t, { pose: { x: -100 + this.t * 8, y: Math.sin(a) * 30, z: 28, yaw: Math.sin(a * .7) * .3, pitch: .03, fov: 50 } }); }
      px.rect(g, 0, 0, W, 18, '#000000'); px.rect(g, 0, H - 18, W, 18, '#000000'); }
    else { drawBackdrop(g, W, H, game.time, .62); T(g, this.title, W / 2, 10, '#ffffff', { scale: 2, align: 'center' }); if (this.obj) { E.ui.box(g, W - 150, 36, 140, 74, { bg: ['#10244a', '#081428'], border: '#3aa0e8' }); T(g, 'OBJECTIVES', W - 80, 42, '#ffd36a', { scale: 1, align: 'center' }); this.obj.forEach((o, i) => T(g, '• ' + o, W - 144, 56 + i * 12, '#ffffff', { scale: 1 })); if (this.stageN) drawMap(g, 10, 36, 160, 80, this.stageN, this.t); } }
    // dialog box with live portrait
    const bh = 62, by = H - bh - (kind === 'cut' ? 22 : 12); E.ui.box(g, 10, by, W - 20, bh, { bg: ['#10244a', '#081428'], border: who ? who.color : '#3aa0e8' });
    const rig = speakerRig(pg[0]); if (rig) rig.drawPortrait(g, 38, by + 32, 48, {}); T(g, who ? who.name : '', 70, by + 6, who ? who.color : '#fff', { scale: 2 });
    const shown = pg[1].slice(0, this.chars | 0); const lines = E.font.wrap(shown, W - 96, { scale: 1 }); lines.slice(0, 4).forEach((l, i) => T(g, l, 70, by + 24 + i * 9, '#ffffff', { scale: 1 }));
    if (this.chars >= pg[1].length && Math.floor(game.real * 3) % 2) T(g, '▼', W - 22, by + bh - 12, '#ffd36a', { scale: 1 });
    T(g, 'HOLD [' + game.input.label('confirm') + '] TO SKIP', W - 10, 6, '#9fb8e8', { scale: 1, align: 'right' }); if (this.hold > .1) px.rect(g, W - 80, 16, Math.round(70 * clamp(this.hold / .7, 0, 1)), 2, '#ffd36a'); }); }
});
function I_() { game.input.consumeAll(); }
function drawMap(g, x, y, w, h, stage, t) {
  E.ui.box(g, x, y, w, h, { bg: ['#0a2848', '#06182c'], border: '#3aa0e8' });
  for (let i = 0; i < 40; i++) { const hx = hash32('m' + i); px.dot(g, x + 6 + (hx % (w - 12)), y + 6 + ((hx >> 8) % (h - 12)), '#123a68'); }
  const pts = [[.18, .65], [.38, .35], [.6, .6], [.8, .3]]; for (let i = 0; i < pts.length - 1; i++) px.line(g, x + pts[i][0] * w, y + pts[i][1] * h, x + pts[i + 1][0] * w, y + pts[i + 1][1] * h, '#2a6aa8', 1);
  px.poly(g, [[x + w * .1, y + h * .75], [x + w * .3, y + h * .5], [x + w * .55, y + h * .7], [x + w * .9, y + h * .45], [x + w * .9, y + h * .95], [x + w * .1, y + h * .95]], '#164a30');
  const at = pts[Math.min(3, (stage || 1))]; const pulse = 3 + Math.sin(t * 5) * 1.5; px.blend(g, .6, 'add', () => px.disc(g, x + at[0] * w, y + at[1] * h, pulse + 3, '#ff5a2a')); px.disc(g, x + at[0] * w, y + at[1] * h, 2, '#ffffff'); T(g, 'LUMEN ISLES', x + w / 2, y + 4, '#9fe3ff', { scale: 1, align: 'center' });
}
Scenes.briefing = PageScene('brief'); Scenes.cutscene = PageScene('cut');
// ---- results ----
function calcRank(sim, p) { const acc = p.st.shots ? p.st.hits / p.st.shots : 0, lost = p.st.lost - (p.st0 ? 0 : 0); if (p.continues > 0) return 'D'; if (acc >= .75 && p.st.lost === 0) return 'S'; if (acc >= .6 && p.st.lost <= 1) return 'A'; if (acc >= .45) return 'B'; return 'C'; }
Scenes.results = { camera: { zoom: false }, touch: [],
  enter(d) { this.d = d; const sim = d.sim; this.sim = sim; this.t = 0; this.rows = sim.players.map(p => { const acc = p.st.shots ? Math.round(p.st.hits / p.st.shots * 100) : 0; const bonusAcc = acc * 300, noDmg = p.st.lost === 0 ? 20000 : 0; return { p, acc, bonusAcc, noDmg, rank: calcRank(sim, p), stats: [['TIME', Math.round(sim.stageStats.time || sim.t) + 's'], ['ACCURACY', acc + '%'], ['KILLS', p.st.kills], ['HEADSHOTS', p.st.heads], ['COVER SAVES', p.st.saves], ['LIVES LOST', p.st.lost]] }; });
    for (const r of this.rows) { if (!r.done) { r.p.score += r.bonusAcc + r.noDmg; r.done = 1; } } Run.keepCarry(sim); Run._song = 'results'; musicFor(game, 'results'); this.stamped = false; this.best = sim.players[0].score; },
  update(dt) { this.t += dt; const I = game.input; if (this.t > 5.2 && !this.stamped) { this.stamped = true; Pres.trauma = .6; SND.play('stamp'); } if (this.t > .8 && (I.pressed('confirm') || I.clicked() || I.pressed('start'))) { I.consumeAll(); if (this.t < 5.5) this.t = 5.6; else this.next(); } },
  next() { nextAfterResults(this.d); },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H, st = reg('stage', this.d.stage); drawBackdrop(g, W, H, game.time, .7); T(g, st.name + ' - COMPLETE', W / 2, 10, '#ffd36a', { scale: 2, align: 'center' });
    const n = this.rows.length; this.rows.forEach((row, k) => { const x0 = n === 1 ? W / 2 - 150 : 10 + k * (W / 2), w = n === 1 ? 300 : W / 2 - 20; T(g, row.p.name, x0, 38, row.p.color, { scale: 2 });
      row.stats.forEach((s, i) => { const t = this.t - i * .6; if (t < 0) return; const v = typeof s[1] === 'number' ? Math.round(s[1] * clamp(t / .5, 0, 1)) : s[1]; T(g, s[0], x0, 58 + i * 16, '#9fb8e8', { scale: 1 }); T(g, String(v), x0 + w, 56 + i * 16, '#ffffff', { scale: 2, align: 'right' }); });
      if (this.t > 4) { T(g, 'ACCURACY BONUS +' + row.bonusAcc, x0, 160, '#9fe3ff', { scale: 1 }); if (row.noDmg) T(g, 'NO-DAMAGE BONUS +' + row.noDmg, x0, 170, '#7cff8a', { scale: 1 }); T(g, 'SCORE ' + row.p.score, x0, 182, '#ffffff', { scale: 2 }); }
      if (this.t > 5.2) { const sc = this.t < 5.5 ? 2 + (5.5 - this.t) * 8 : 6; T(g, row.rank, x0 + w - 20, 150, { S: '#ffd36a', A: '#7cff8a', B: '#9fe3ff', C: '#ffffff', D: '#ff8a8a' }[row.rank], { scale: Math.round(sc), align: 'center', outline: '#000000' }); } });
    if (this.t > 5.6) promptBar(g, W, H, [['confirm', 'CONTINUE']]); }); }
};
function nextAfterResults(d) {
  const sim = Run.sim, st = Run.stage; const pres = reg('stage', st);
  if (Run.mode === 'range') { const tt = Run.sim ? Run.sim.t : 0; const best = E.store.get('tc3.rangeBest', null); if (!best || tt < best) E.store.set('tc3.rangeBest', +tt.toFixed(1)); E.store.set('tc3.seenTraining', true); game.go('menu'); return; }
  const outro = pres.outro; const goNext = () => {
    if (Run.mode === 'stage') { enterInitials(sim, 'stage' + st); return; }
    if (st >= 3) { enterInitials(sim, Run.mode === 'coop' ? 'coop' : 'arcade', true); return; }
    Run.stage = st + 1; game.go('briefing', { stage: st + 1 });
  };
  Run._after = goNext; if (outro && st < 3) game.go('cutscene', { id: outro, scene: reg('cutscene', outro).scene, then: 'next' }); else if (st >= 3) game.go('cutscene', { id: outro, scene: '3-B', then: 'ending' }); else goNext();
}
function enterInitials(sim, table, ending) { Run.endTable = table; Run.finalScore = sim.players.reduce((a, p) => a + p.score, 0) / Math.max(1, sim.players.length); Run.finalScore = Math.max(...sim.players.map(p => p.score)); game.go('gameover', { sim, ok: true }); }
// ---- game over and initials ----
Scenes.gameover = { camera: { zoom: false }, touch: [],
  enter(d) { this.d = d || {}; this.t = 0; this.stage = 0; const sim = d.sim; this.score = Math.max(...sim.players.map(p => p.score)); this.table = Run.endTable || (Run.mode === 'coop' ? 'coop' : Run.mode === 'stage' ? 'stage' + sim.stage : 'arcade'); if (!d.ok) { Run._song = 'gameover'; musicFor(game, 'gameover', { loop: false }); this.table = Run.mode === 'coop' ? 'coop' : Run.mode === 'stage' ? 'stage' + sim.stage : 'arcade'; } else { Run._song = 'ending'; musicFor(game, 'results'); } Run.endTable = null; this.phase = 0; this.entered = false; },
  update(dt) { this.t += dt; const I = game.input; if (this.phase === 0 && this.t > (this.d.ok ? .6 : 2.2)) { if (Run.mode !== 'range' && arcade.qualifies(this.score, this.table) && this.score > 0) { this.phase = 1; arcade.enter(this.score, this.table, () => { this.phase = 2; this.t = 0; }); } else { this.phase = 2; this.t = 0; } }
    if (this.phase === 1) arcade.update(dt); if (this.phase === 2 && this.t > .6 && (I.pressed('confirm') || I.clicked())) { I.consumeAll(); game.go('records', { table: this.table, then: 1 }); } },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H; drawBackdrop(g, W, H, game.time, .75); if (this.phase === 0) T(g, this.d.ok ? 'MISSION COMPLETE' : 'GAME OVER', W / 2, 90, this.d.ok ? '#7cff8a' : '#ff5a5a', { scale: 4, align: 'center' }); if (this.phase !== 1) T(g, 'SCORE ' + this.score, W / 2, 140, '#ffffff', { scale: 2, align: 'center' }); }); if (this.phase === 1) arcade.draw(r); }
};
// ---- records ----
Scenes.records = { camera: { zoom: false }, touch: [],
  enter(d) { this.d = d || {}; this.tabs = ['arcade', 'coop', 'stage1', 'stage2', 'stage3', 'intel']; this.i = Math.max(0, this.tabs.indexOf(this.d.table || 'arcade')); this.t = 0; },
  update(dt) { this.t += dt; const P = game._players || [game.input], I = P[0]; if (P.some(p => p.repeat('left') || p.pressed('prev'))) { this.i = (this.i + this.tabs.length - 1) % this.tabs.length; SND.play('select'); } if (P.some(p => p.repeat('right') || p.pressed('next'))) { this.i = (this.i + 1) % this.tabs.length; SND.play('select'); } const c = I.clicked(); if (c && c[1] < 36) { const k = Math.floor(c[0] / (game.W / this.tabs.length)); if (k >= 0 && k < this.tabs.length) this.i = k; }
    if (P.some(p => p.pressed('cancel') || p.pressed('confirm')) && this.t > .3) { SND.play('back'); P.forEach(p => p.consumeAll()); game.go(this.d.then ? 'menu' : 'menu'); } },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H; drawBackdrop(g, W, H, game.time, .75); T(g, 'RECORDS', W / 2, 6, '#ffffff', { scale: 2, align: 'center' }); const names = ['ARCADE', 'CO-OP', 'STAGE 1', 'STAGE 2', 'STAGE 3', 'INTEL']; names.forEach((n, k) => { const x = k * (W / 6); px.rect(g, x + 1, 24, W / 6 - 2, 12, k === this.i ? '#1a4f9c' : '#10244a'); T(g, n, x + W / 12, 26, k === this.i ? '#ffd36a' : '#9fb8e8', { scale: 1, align: 'center' }); });
    const tab = this.tabs[this.i]; if (tab === 'intel') { const found = E.store.get('tc3.intel', {}); const ids = ['i1', 'i2', 'i3', 'i4', 'i5', 'i6']; let y = 46; T(g, 'MESSAGE BOTTLES FOUND ' + Object.keys(found).length + '/6', W / 2, 40, '#8aff8a', { scale: 1, align: 'center' }); ids.forEach((id, k) => { const got = found[id]; T(g, got ? reg('intel', id).text : '??? — shoot the green bottles to find this note', 20, 56 + k * 18, got ? '#ffffff' : '#555e70', { scale: 1, wrap: W - 40 }); });
      const best = E.store.get('tc3.rangeBest', null); T(g, 'BEST TRAINING TIME: ' + (best ? best.toFixed(1) + 's' : '—'), W / 2, 176, '#ffd36a', { scale: 1, align: 'center' }); }
    else arcade.drawTable(r, tab, 44, { arcade: 'ARCADE HIGH SCORES', coop: 'CO-OP HIGH SCORES', stage1: 'STAGE 1 — HARBOR LIGHTS', stage2: 'STAGE 2 — STORM SIGNAL', stage3: 'STAGE 3 — THE TIDEWALL' }[tab]);
    promptBar(g, W, H, [['prev', '◂'], ['next', '▸'], ['cancel', 'BACK']]); }); }
};
// ---- about / how to play ----
Scenes.about = { camera: { zoom: false }, touch: [],
  enter() { this.i = 0; this.t = 0; }, 
  pages() { return aboutPages(game.input); },
  update(dt) { this.t += dt; const P = game._players || [game.input], n = this.pages().length; if (P.some(p => p.repeat('left') || p.pressed('prev'))) { this.i = (this.i + n - 1) % n; SND.play('select'); } if (P.some(p => p.repeat('right') || p.pressed('next') || p.pressed('confirm'))) { this.i = (this.i + 1) % n; SND.play('select'); P.forEach(p => p.consumeAll()); } const c = P[0].clicked(); if (c) { this.i = c[0] < game.W / 2 ? (this.i + n - 1) % n : (this.i + 1) % n; SND.play('select'); P[0].consumeAll(); } if (P.some(p => p.pressed('cancel'))) { SND.play('back'); game.go('menu'); } },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H, pgs = this.pages(), pg = pgs[this.i]; drawBackdrop(g, W, H, game.time, .8); T(g, pg.title, W / 2, 6, '#ffd36a', { scale: 2, align: 'center' }); T(g, (this.i + 1) + ' / ' + pgs.length, W - 8, 6, '#6a7ea8', { scale: 1, align: 'right' });
    if (pg.draw) pg.draw(g, W, H, this.t); else { let y = 26; for (const l of pg.lines) { const lines = E.font.wrap(l.t, W - 36, { scale: l.s || 1 }); for (const ln of lines) { T(g, ln, 18, y, l.c || '#ffffff', { scale: l.s || 1 }); y += (l.s || 1) * 9 + 1; } y += 3; } }
    promptBar(g, W, H, [['prev', '◂'], ['next', '▸ NEXT'], ['cancel', 'BACK']]); }); }
};
function deviceName(inp) { return inp.lastDevice === 'gamepad' ? 'controller' : 'keyboard and mouse'; }
function howToPage(inp) {
  const L = a => inp.label(a), dev = inp.lastDevice;
  const rows = [['AIM', dev === 'gamepad' ? 'RIGHT STICK' : dev === 'keyboard' ? 'ARROWS / WASD' : 'MOUSE'], ['FIRE', L('fire')], ['TAKE COVER (HOLD)', L('cover')], ['NEXT / PREV WEAPON', L('next') + ' / ' + L('prev')], ['QUICK RELOAD (DUCKS)', L('reload')], ['PAUSE', dev === 'gamepad' ? 'OPTIONS' : 'ESC / P']];
  return { title: 'HOW TO PLAY', draw(g, W, H, t) { rows.forEach((r, i) => { T(g, r[0], 24, 30 + i * 17, '#9fb8e8', { scale: 1 }); E.ui.box(g, W / 2 + 10, 26 + i * 17, 140, 14, { bg: ['#10244a', '#081428'], border: '#3aa0e8' }); T(g, r[1], W / 2 + 80, 29 + i * 17, '#ffffff', { scale: 1, align: 'center' }); });
    const tips = ['Hold cover to dodge and reload — you cannot be hit in cover, but TIME keeps running.', 'Every shot that can hit you shows a shrinking red ring. Duck before it closes!', 'Shoot orange-vest quartermasters for machine-gun, shotgun and grenade ammo.', 'Fire while hiding to cycle weapons. Shoot grenades and rockets out of the air.', 'Never shoot civilians or hostages. Clear each area before TIME runs out.']; let y = 134; for (const s of tips) { for (const ln of E.font.wrap('• ' + s, W - 40, { scale: 1 })) { T(g, ln, 20, y, '#ffffff', { scale: 1 }); y += 9; } y += 1; } } };
}
