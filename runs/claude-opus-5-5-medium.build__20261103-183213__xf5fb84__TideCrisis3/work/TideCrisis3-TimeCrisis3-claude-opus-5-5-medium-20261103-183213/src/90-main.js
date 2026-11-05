// 90-main: new E.Game with the engine's standard features adjusted (pause menu items, our settings, control names),
// the scenes (title, menu, difficulty, select, coop join, play with its briefing / results / game over / initials /
// credits states, records, about, how to play, attract; the AI Hub's session and server scenes come from 62), the
// boot steps, and game.debug for the tests and tools. Reads: everything above.

const HUB = typeof window !== 'undefined' && window.AIHub && window.AIHub.active;
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, input: TC_INPUT, id: 'tidecrisis3', bg: '#000000',
  autoPause: !HUB, corner: !HUB, fullscreen: HUB ? false : undefined,
  menu: HUB ? false : {
    items: [['Restart area', () => TC.play && TC.play.restartScene()], ['Restart stage', () => TC.play && TC.play.restartStage()], ['How to play', () => { game.resume(); TC.play && (TC.play.howto = 0); }], ['Dev mode', () => { game.resume(); TC.dev.open(TC.play); }]],
    settings: [
      { key: 'difficulty', label: 'Difficulty (new runs)', options: ['Easy', 'Normal', 'Hard'], value: 'Normal' },
      { key: 'aimAssist', label: 'Aim assist (controller)', options: ['Off', 'Low', 'Medium', 'High'], value: 'Medium' },
      { key: 'padSpeed', label: 'Aim speed (controller)', type: 'slider', min: .5, max: 2, step: .1, value: 1 },
      { key: 'coverMode', label: 'Cover control', options: ['Hold', 'Toggle'], value: 'Hold' },
      { key: 'autoFire', label: 'Hold fire to repeat (handgun)', value: true },
      { key: 'reticle', label: 'Reticle', options: ['Cross', 'Ring', 'Dot'], value: 'Cross' },
      { key: 'reticleSize', label: 'Reticle size', options: ['S', 'M', 'L'], value: 'M' },
      { key: 'threatSize', label: 'Crisis rings', options: ['Normal', 'Large'], value: 'Normal' },
      { key: 'subtitles', label: 'Subtitles', value: true },
      { key: 'wobble', label: 'Retro texture wobble', value: false }],
    controls: TC.CONTROL_NAMES, quit: 'title' } });
TC.game = game;
TC.view = new WorldView(game);
TC.cab = E.Arcade ? new E.Arcade(game, { id: 'tidecrisis3', hud: false }) : null;
const portraits = new Map();
TC.portrait = id => { if (!has('speaker', id)) return null; let r = portraits.get(id); if (!r) { r = new E.Humanoid(Object.assign({}, get('speaker', id).rig, { size: 1 })); r.update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2 }); portraits.set(id, r); } return r; };
const diffId = () => ({ Easy: 'easy', Normal: 'normal', Hard: 'hard' })[(game.settings && game.settings.difficulty) || 'Normal'] || 'normal';
const sfxUI = n => game.audio.sfx && game.audio.sfx('tc-' + n);
if (typeof window !== 'undefined') { window.addEventListener('keydown', () => { TC._keyed = true; }, { capture: true }); }

// ---------------------------------------------------------------- the title's flyover
let flySim = null;
const flyover = (g, r, t) => {
  if (!flySim) { flySim = new Sim({ mode: 'attract', stages: [1], stage: 1, scene: '1-1', skipCuts: true }); }
  const a = t * .06, cx = 200 + Math.cos(a) * 340, cy = 40 + Math.sin(a) * 260;
  if (fxRand() < .02) { const at = [300 + fxRand() * 600, -500 - fxRand() * 400, 200 + fxRand() * 150]; FX.burst(at, 30, { rgb: [[255, 90, 90], [255, 211, 74], [90, 209, 255]][(fxRand() * 3) | 0], size: 2.4, speed: 90, life: 1.2, g: 40, drag: 1.2, mode: 'add' }); }
  FX.step(1 / 60);
  TC.view.draw(g, flySim, 0, { x: 0, y: 0, w: r.W, h: r.H }, { cam: { x: cx, y: cy, z: 70 + Math.sin(t * .2) * 20, yaw: Math.atan2(-20 - cy, 300 - cx), pitch: -.1, roll: 0, fov: 55 } });
};

// ---------------------------------------------------------------- the menu flow
const menuScreen = { t: 0, list: null,
  enter() { this.t = 0; Attract.idle = 0; this.list = new ListMenu([
    { label: 'ARCADE', desc: 'All three stages, story and bosses', on: () => startRun({ mode: 'arcade', stages: [1, 2, 3] }) },
    { label: 'CO-OP', desc: 'Two agents, split screen (P2 on a controller)', on: () => game.go('coop') },
    { label: 'STAGE SELECT', desc: 'Any stage, any difficulty', on: () => game.go('select') },
    { label: 'TRAINING', desc: 'The CREST range: learn every move', on: () => startRun({ mode: 'range', stages: ['R'] }) },
    { label: 'RECORDS', desc: 'High scores, best times, intel found', on: () => game.go('records') },
    { label: 'HOW TO PLAY', desc: 'Controls for the device you are using', on: () => game.go('howto') },
    { label: 'SETTINGS', desc: 'Sound, display, controls, assists', on: () => game.menu('settings') },
    { label: 'ABOUT', desc: 'Credits, sources and feedback', on: () => game.go('about') }], { back: () => game.go('title') }); game.audio.music && game.audio.music(TC.song('theme'), { fade: .5 }); },
  update(dt) { this.t += dt; if (Attract.anyInput(game)) Attract.idle = 0; else Attract.idle += dt; if (Attract.idle > 10) { game.go('attract'); return; } this.list.update(dt, game); },
  draw(r) { r.overlay(g => { flyover(g, r, this.t + 40); E.px.blend(g, .55, 'multiply', () => E.px.rect(g, 0, 0, r.W, r.H, '#203050')); logo(g, r, 14, this.t, 3); this.list.draw(g, r, r.W / 2, 62, { rowH: 18 }); hintLine(g, r, game.input, [['confirm', 'SELECT'], ['cancel', 'BACK']]); }); }
};
function startRun(o) {
  const go = d => game.go('play', Object.assign({ difficulty: d }, o));
  if (o.mode === 'range') return go(diffId());
  game.go('difficulty', { next: go, arcade: o.mode === 'arcade' });
}
const difficultyScreen = { t: 0,
  enter(d) { this.t = 0; this.next = d.next; const cur = diffId(), offer = d.arcade && !E.store.get('tc3:seenTraining', false); this.list = new ListMenu([
    ...(offer ? [{ label: 'TRAINING FIRST', desc: 'New agent? The CREST range teaches every move in 3 minutes', on: () => { E.store.set('tc3:seenTraining', true); startRun({ mode: 'range', stages: ['R'] }); } }] : []),
    { label: 'EASY', desc: '7 lives · more time · fewer crisis shots', on: () => { game.settings.set && game.settings.set('difficulty', 'Easy'); this.next('easy'); } },
    { label: 'NORMAL', desc: '5 lives · the arcade experience', on: () => { game.settings.set && game.settings.set('difficulty', 'Normal'); this.next('normal'); } },
    { label: 'HARD', desc: '3 lives · less time · sharper shooters', on: () => { game.settings.set && game.settings.set('difficulty', 'Hard'); this.next('hard'); } }], { i: ['easy', 'normal', 'hard'].indexOf(cur) + (offer ? 1 : 0), back: () => game.go('menu') }); },
  update(dt) { this.t += dt; this.list.update(dt, game); },
  draw(r) { r.overlay(g => { frame(g, r, 'DIFFICULTY', this.t); this.list.draw(g, r, r.W / 2, 70, { rowH: 26 }); hintLine(g, r, game.input, [['confirm', 'START'], ['cancel', 'BACK']]); }); }
};
const selectScreen = { t: 0, i: 0,
  enter() { this.t = 0; this.rects = []; },
  update(dt) {
    this.t += dt; const I = game.input;
    if (I.repeat('right', .3, .12)) { this.i = (this.i + 1) % 3; sfxUI('ui'); } if (I.repeat('left', .3, .12)) { this.i = (this.i + 2) % 3; sfxUI('ui'); }
    const ptr = I.pointer && I.pointer(); if (ptr) { const k = this.rects.findIndex(q => ptr[0] >= q[0] && ptr[0] < q[0] + q[2] && ptr[1] >= q[1] && ptr[1] < q[1] + q[3]); if (k >= 0 && k !== this.i && (!this.lp || this.lp[0] !== ptr[0] || this.lp[1] !== ptr[1])) { this.i = k; sfxUI('ui'); } this.lp = ptr.slice(); }
    const cl = I.clicked && I.clicked(); const hit = cl ? this.rects.findIndex(q => cl[0] >= q[0] && cl[0] < q[0] + q[2] && cl[1] >= q[1] && cl[1] < q[1] + q[3]) : -1;
    if (I.pressed('confirm') || hit >= 0) { if (hit >= 0) this.i = hit; sfxUI('uiok'); I.consumeAll(); startRun({ mode: 'stage', stages: [this.i + 1] }); }
    if (I.pressed('cancel')) { sfxUI('uiback'); game.go('menu'); }
  },
  draw(r) { r.overlay(g => {
    frame(g, r, 'STAGE SELECT', this.t); this.rects = [];
    const w = Math.min(130, (r.W - 40) / 3), gap = 8, x0 = (r.W - (w * 3 + gap * 2)) / 2;
    for (let k = 0; k < 3; k++) { const st = get('stage', k + 1), x = x0 + k * (w + gap), y = 50, on = k === this.i, hi = TC.cab ? (TC.cab.table('stage' + (k + 1))[0] || { score: 0 }).score : 0; this.rects.push([x, y, w, 140]);
      E.ui.box(g, x, y, w, 140, { bg: on ? ['#2a5aa0', '#10305e'] : ['#10244a', '#081428'], border: on ? UI.gold : '#2a3a5a' });
      E.font.title(g, String(k + 1), x + w / 2, y + 8, { scale: 4, colors: on ? ['#fff3b0', '#ffb347', '#ff5a2a'] : ['#9fc3e8', '#3a6aa8'], outline: '#000', align: 'center' });
      E.font.wrap(st.name, w - 10).forEach((l, j) => T(g, l, x + w / 2, y + 50 + j * 10, '#ffffff', { align: 'center' })); T(g, st.place, x + w / 2, y + 76, '#9fc3e8', { align: 'center', font: 'tiny' }); T(g, st.clock, x + w / 2, y + 86, '#9fc3e8', { align: 'center', font: 'tiny' });
      T(g, 'BEST', x + w / 2, y + 108, UI.dim, { align: 'center', font: 'tiny' }); T(g, hi, x + w / 2, y + 118, UI.gold, { align: 'center' }); }
    hintLine(g, r, game.input, [['left', '◂▸'], ['confirm', 'SELECT'], ['cancel', 'BACK']]); }); }
};
const coopScreen = { t: 0,
  enter() { this.t = 0; this.p2 = null; game.allowJoin && game.allowJoin({ max: 2, keys: false, onJoin: (inp) => { this.p2 = inp; sfxUI('uiok'); } }); },
  exit() { game.allowJoin && game.allowJoin(false); },
  update(dt) { this.t += dt; const I = game.input; if (this.p2 && (I.pressed('confirm') || I.pressed('start') || this.p2.pressed('confirm'))) { I.consumeAll(); const p2 = this.p2; startRun({ mode: 'coop', stages: [1, 2, 3], players: [{ input: game.input, agent: 'kai' }, { input: p2, agent: 'rook' }] }); } if (I.pressed('cancel')) { if (this.p2 && game.removePlayer) { game.removePlayer(this.p2); this.p2 = null; } game.go('menu'); } },
  draw(r) { r.overlay(g => {
    frame(g, r, 'CO-OP', this.t);
    for (const [k, id, ok] of [[0, 'kai', true], [1, 'rook', !!this.p2]]) { const x = r.W / 2 + (k ? 20 : -150), y = 50; E.ui.box(g, x, y, 130, 120, { bg: ok ? ['#2a5aa0', '#10305e'] : ['#10244a', '#081428'], border: ok ? ['#e8443a', '#3b82f6'][k] : '#2a3a5a' }); const rig = TC.portrait(id); if (rig) rig.drawPortrait(g, x + 41, y + 10, 48, { zoom: 2.6, turn: .5, bg: '#0a1426', frame: true, tint: ok ? undefined : '#606070' }); T(g, 'PLAYER ' + (k + 1), x + 65, y + 66, ok ? '#ffffff' : '#7a8aa8', { align: 'center', scale: 2 }); T(g, get('speaker', id).name, x + 65, y + 84, get('speaker', id).color, { align: 'center' }); T(g, k === 0 ? 'KEYBOARD, MOUSE OR PAD' : ok ? 'READY' : ((this.t * 2 | 0) % 2 ? 'PRESS START ON A CONTROLLER' : ''), x + 65, y + 100, k === 0 || ok ? '#8aff8a' : UI.gold, { align: 'center', font: 'tiny' }); }
    hintLine(g, r, game.input, this.p2 ? [['confirm', 'START'], ['cancel', 'BACK']] : [['cancel', 'BACK']]); }); }
};
const recordsScreen = { t: 0, page: 0,
  enter() { this.t = 0; this.page = 0; },
  update(dt) { this.t += dt; const I = game.input, n = 6; if (I.pressed('right') || I.pressed('next')) { this.page = (this.page + 1) % n; sfxUI('ui'); } if (I.pressed('left') || I.pressed('prev')) { this.page = (this.page + n - 1) % n; sfxUI('ui'); } const cl = I.clicked && I.clicked(); if (cl) { this.page = (this.page + (cl[0] > 213 ? 1 : 5)) % 6; sfxUI('ui'); } if (I.pressed('cancel') || I.pressed('confirm')) game.go('menu'); },
  draw(r) { r.overlay(g => {
    const pages = [['ARCADE', 'arcade'], ['CO-OP', 'coop'], ['STAGE 1', 'stage1'], ['STAGE 2', 'stage2'], ['STAGE 3', 'stage3'], ['RANGE & INTEL', null]], [title, mode] = pages[this.page];
    frame(g, r, 'RECORDS · ' + title, this.t);
    if (mode && TC.cab) { const tb = TC.cab.table(mode); for (let k = 0; k < 10; k++) { const e = tb[k]; T(g, (k + 1) + '.', r.W / 2 - 80, 40 + k * 15, UI.dim); T(g, e ? e.name : '---', r.W / 2 - 60, 40 + k * 15, e ? '#ffffff' : '#5a6078', { scale: 1 }); T(g, e ? e.score : 0, r.W / 2 + 80, 40 + k * 15, e ? UI.gold : '#5a6078', { align: 'right' }); } }
    else { const best = E.store.get('tc3:rangeBest', null); T(g, 'CREST RANGE BEST', 30, 40, UI.gold); T(g, best ? best.toFixed(2) + ' s' : '--', 30, 52, '#ffffff', { scale: 2 }); const got = E.store.get('tc3:intel', []); T(g, 'INTEL  ' + got.length + ' / 6', 30, 78, UI.gold); all('intel').forEach((it, k) => { const has1 = got.includes(it.id); E.font.wrap(has1 ? '▸ ' + it.note : '▸ (STAGE ' + it.stage + ': not found yet)', r.W - 60).slice(0, 2).forEach((l, j) => T(g, l, 30, 92 + k * 20 + j * 9, has1 ? '#ffffff' : '#5a6078')); }); }
    T(g, '◂ ' + (this.page + 1) + ' / 6 ▸', r.W / 2, r.H - 24, '#9fc3e8', { align: 'center' });
    hintLine(g, r, game.input, [['left', 'PAGE'], ['cancel', 'BACK']]); }); }
};
const aboutScreen = { t: 0, page: 0, scroll: 0,
  enter() { this.t = 0; this.page = 0; this.scroll = 0; },
  update(dt) { this.t += dt; const I = game.input, n = TC.about.pages().length; if (I.pressed('right') || I.pressed('next')) { this.page = (this.page + 1) % n; this.scroll = 0; sfxUI('ui'); } if (I.pressed('left') || I.pressed('prev')) { this.page = (this.page + n - 1) % n; this.scroll = 0; sfxUI('ui'); } if (I.down('down')) this.scroll += dt * 60; if (I.down('up')) this.scroll = Math.max(0, this.scroll - dt * 60); const cl = I.clicked && I.clicked(); if (cl) { this.page = (this.page + (cl[0] > 213 ? 1 : n - 1)) % n; this.scroll = 0; } if (I.pressed('cancel') || I.pressed('confirm')) game.go('menu'); },
  draw(r) { r.overlay(g => {
    const pages = TC.about.pages(), P = pages[this.page]; frame(g, r, P.title, this.t);
    let y = 34 - this.scroll; const maxY = r.H - 30;
    for (const [k, v] of P.rows) { const lines = E.font.wrap(TC.txt(v), r.W - (k ? 140 : 40)); if (y > 26 && y < maxY) T(g, k, 16, y, UI.gold, { font: 'tiny' }); lines.forEach((l, j) => { const yy = y + j * 9; if (yy > 26 && yy < maxY) T(g, l, k ? 120 : 20, yy, '#ffffff'); }); y += Math.max(1, lines.length) * 9 + 4; }
    if (y > maxY) this.scroll = Math.min(this.scroll, y + this.scroll - maxY + 6);
    T(g, '◂ ' + (this.page + 1) + ' / ' + pages.length + ' ▸', r.W / 2, r.H - 24, '#9fc3e8', { align: 'center' });
    hintLine(g, r, game.input, [['left', 'PAGE'], ['down', 'SCROLL'], ['cancel', 'BACK']]); }); }
};
const howtoScreen = { t: 0, enter() { this.t = 0; }, update(dt) { this.t += dt; const I = game.input; if (I.pressed('cancel') || I.pressed('confirm') || (I.clicked && I.clicked())) game.go('menu'); }, draw(r) { r.overlay(g => { drawHowto(g, r, game.input, this.t); hintLine(g, r, game.input, [['cancel', 'BACK']]); }); } };
const titleScreen = { t: 0,
  enter() { this.t = 0; Attract.idle = 0; game.audio.music && game.audio.music(TC.song('theme'), { fade: .5 }); },
  update(dt) {
    this.t += dt; const I = game.input, touch = TC.touchOnly(game);
    const cl = I.clicked && I.clicked();
    if (touch && cl && this.gear && cl[0] >= this.gear[0] && cl[0] < this.gear[0] + this.gear[2] && cl[1] >= this.gear[1] && cl[1] < this.gear[1] + this.gear[3]) { game.menu('settings'); return; }
    if (Attract.anyInput(game)) { Attract.idle = 0; if (!touch && (I.anyPressed() || cl)) { I.consumeAll(); sfxUI('uiok'); game.go('menu'); return; } } else Attract.idle += dt;
    if (Attract.idle > 10) game.go('attract');
  },
  draw(r) { r.overlay(g => {
    flyover(g, r, this.t); logo(g, r, r.H * .2, this.t, 4);
    T(g, 'C.R.E.S.T. · COVERT RESPONSE & EMERGENCY STRIKE TEAM', r.W / 2, r.H * .2 + 54, '#cfe0ff', { align: 'center', font: 'tiny' });
    const I = game.input, touch = TC.touchOnly(game);
    if (touch) { E.ui.box(g, r.W / 2 - 120, r.H * .62, 240, 26, { bg: UI.bg, border: UI.warn }); T(g, 'Controller or keyboard required', r.W / 2, r.H * .62 + 9, '#ffffff', { align: 'center' }); this.gear = [r.W / 2 - 22, r.H * .62 + 32, 44, 30]; E.ui.box(g, this.gear[0], this.gear[1], 44, 30, { bg: ['#2a5aa0', '#10305e'], border: UI.gold }); T(g, '⚙', r.W / 2, this.gear[1] + 8, '#ffffff', { align: 'center', scale: 2 }); T(g, 'SETTINGS', r.W / 2, this.gear[1] + 34, UI.dim, { align: 'center', font: 'tiny' }); }
    else if (((this.t * 1.6) | 0) % 2 === 0) { const pad = I.lastDevice === 'gamepad', any = !TC._keyed && I.lastDevice !== 'gamepad' && I.lastDevice !== 'mouse'; T(g, any ? 'PRESS ' + TC.label(I, 'confirm', 'gamepad') + ' OR ' + TC.label(I, 'confirm', 'keyboard') + ' OR CLICK' : pad ? 'PRESS ' + TC.label(I, 'confirm') : 'PRESS ' + TC.label(I, 'confirm', 'keyboard') + ' OR CLICK', r.W / 2, r.H * .66, '#ffffff', { align: 'center', scale: 2, outline: '#000' }); }
    T(g, E.versionLabel ? 'TC3 ' + TC.version + ' · ' + E.versionLabel() : 'TC3 ' + TC.version, r.W / 2, r.H - 10, '#6a7aa0', { align: 'center', font: 'tiny' });
    T(g, '© 2026 AN ORIGINAL GAME · INSPIRED BY TIME CRISIS 3', 6, 6, '#6a7aa0', { font: 'tiny' }); }); }
};
const attractScreen = { t: 0,
  enter() { this.t = 0; Attract.phase = 'demo'; this.s = Attract.startDemo(game); this.cycle = 0; },
  exit() { game.timeScale = 1; TC.Voice.stopAll(); },
  update(dt) {
    this.t += dt; const I = game.input;
    if (Attract.anyInput(game) && this.t > .3) { I.consumeAll(); game.go('title'); return; }
    if (Attract.phase === 'demo') {
      this.s.update(dt); this.s.sim.players[0].lives = Math.max(3, this.s.sim.players[0].lives);
      if (!Attract.progressed(this.s.sim)) Attract.watch.t += dt;
      const sp = this.s.sim.phase;
      if (this.t > Attract.len || Attract.watch.t > 8 || sp === 'results' || sp === 'done' || (sp === 'clear' && this.s.sim.sceneIdx + 1 >= this.s.sim.stage.scenes.length)) { this.cycle++; this.t = 0; Attract.phase = this.cycle % 2 ? 'scores' : 'title'; game.timeScale = 1; }
    } else if (Attract.phase === 'scores' && this.t > 6) { this.t = 0; Attract.phase = 'demo'; this.s = Attract.startDemo(game); }
    else if (Attract.phase === 'title' && this.t > 8) { this.t = 0; Attract.phase = 'demo'; this.s = Attract.startDemo(game); }
  },
  draw(r) {
    if (Attract.phase === 'demo') { this.s.draw(r); r.overlay(g => { E.ui.box(g, r.W / 2 - 64, r.H - 36, 128, 30, { bg: ['#10244a', '#081428'], border: UI.gold, alpha: .85 }); T(g, 'DEMO PLAY', r.W / 2, r.H - 32, UI.gold, { align: 'center' }); if (((this.t * 1.6) | 0) % 2 === 0) T(g, TC.touchOnly(game) ? 'TAP FOR THE TITLE' : 'PRESS START', r.W / 2, r.H - 20, '#ffffff', { align: 'center', scale: 1 }); }); return; }
    r.overlay(g => {
      if (Attract.phase === 'scores') { frame(g, r, 'HIGH SCORES', this.t); const tb = TC.cab ? TC.cab.table('arcade') : []; for (let k = 0; k < 10; k++) { const e = tb[k]; T(g, (k + 1) + '.', r.W / 2 - 80, 40 + k * 15, UI.dim); T(g, e ? e.name : '---', r.W / 2 - 60, 40 + k * 15, '#ffffff'); T(g, e ? e.score : 0, r.W / 2 + 80, 40 + k * 15, UI.gold, { align: 'right' }); } }
      else { flyover(g, r, this.t + 80); logo(g, r, r.H * .25, this.t, 4); if (((this.t * 1.6) | 0) % 2 === 0) T(g, 'PRESS START', r.W / 2, r.H * .66, '#ffffff', { align: 'center', scale: 2 }); }
    });
  }
};

// ---------------------------------------------------------------- play: the session and its states
const playScreen = { pausable: !HUB,
  enter(d) {
    TC.play = this; this.d = d; this.state = 'brief'; this.howto = -1; this.t = 0;
    const ps = d.players || [{ input: game.input, agent: 'kai' }];
    this.s = new Session(game, { mode: d.mode, stages: d.stages, difficulty: d.difficulty, players: ps, seed: d.seed, skipCuts: d.skipCuts });
    if (ps.length > 1 && game.splitScreen) game.splitScreen(0);
    if (d.mode === 'range') for (const p of this.s.sim.players) p.lives = 9;
    this.brief = d.mode !== 'range' && !d.noBrief ? new Briefing('b' + this.s.sim.stageId, TC.portrait) : null;
    if (!this.brief) this.state = 'run';
    if (this.brief) game.audio.music && game.audio.music(TC.song('briefing'), { fade: .5 });
    if (d.mode === 'arcade' && game.allowJoin) game.allowJoin({ max: 2, keys: false, onJoin: inp => { this.s.addPlayer(inp, 'rook'); } });
    this.s.onEvent = e => { if (e.type === 'out' && this.s.sim.players.length === 1) game.audio.music && game.audio.music(TC.song('continue'), { fade: .3 }); if (e.type === 'continue') this.s.music = null; };
  },
  exit() { TC.play = null; game.timeScale = 1; if (game.allowJoin) game.allowJoin(false); TC.Voice.stopAll(); TC.Amb.stop(); if (typeof document !== 'undefined' && game.canvas) game.canvas.style.cursor = ''; TC.dev.close(); },
  restartScene() { game.resume(); const sim = this.s.sim; sim.jump(sim.stageId, sim.sceneId); this.state = 'run'; },
  restartStage() { game.resume(); const sim = this.s.sim; sim.jump(sim.stageId, sim.stage.scenes[0]); this.state = 'run'; },
  update(dt) {
    this.t += dt; const sim = this.s.sim, I = game.input;
    if (typeof document !== 'undefined' && game.canvas) game.canvas.style.cursor = this.state === 'run' && sim.phase === 'action' && (I.lastDevice === 'mouse' || I.lastDevice === 'keyboard') ? 'none' : '';
    if (TC.dev.isOpen) { TC.dev.update(dt); return; }
    if (this.howto >= 0) { this.howto += dt; if ((I.pressed('cancel') || I.pressed('confirm')) && this.howto > .2) { this.howto = -1; I.consumeAll(); } return; }
    if (this.state === 'brief') { this.brief.update(dt, game); if (this.brief.done) { this.state = 'run'; I.consumeAll(); this.s.music = null; if (this.pendingNext) { this.pendingNext = false; sim.nextStage(); } } return; }
    if (this.state === 'run') {
      this.s.update(dt);
      if (sim.phase === 'results') { if (sim.mode === 'range' || sim.stageId === 'R') { this.state = 'range'; this.rangeT = sim.stageT; const b = E.store.get('tc3:rangeBest', null); if (!b || this.rangeT < b) E.store.set('tc3:rangeBest', this.rangeT); E.store.set('tc3:seenTraining', true); this.t = 0; } else { this.state = 'results'; this.res = new Results(sim, sim.players[0]); game.audio.music && game.audio.music(TC.song('results'), { fade: .5 }); } }
      if (sim.phase === 'gameover') { this.state = 'over'; this.t = 0; game.audio.music && game.audio.music(TC.song('gameover'), { loop: false }); }
      if (sim.phase === 'done') { this.state = 'credits'; this.cred = new Credits(TC.portrait, sim.players[0].score); game.audio.music && game.audio.music(TC.song('ending'), { fade: 1 }); }
      return;
    }
    if (this.state === 'results') { if (this.res.update(dt, game, sim)) { I.consumeAll(); if (sim.stageIdx + 1 < sim.stageList.length) { this.brief = new Briefing('b' + sim.stageList[sim.stageIdx + 1], TC.portrait); this.state = 'brief'; this.pendingNext = true; game.audio.music && game.audio.music(TC.song('briefing'), { fade: .5 }); } else { sim.nextStage(); this.state = 'run'; this.s.music = null; } } return; }
    if (this.state === 'range') { if (this.t > 1 && (I.pressed('confirm') || I.pressed('fire'))) { I.consumeAll(); game.go('menu'); } return; }
    if (this.state === 'over') { if (this.t > 3 || (this.t > 1 && I.pressed('confirm'))) this.toInitials(); return; }
    if (this.state === 'credits') { if (this.cred.update(dt, game)) { I.consumeAll(); this.toInitials(); } return; }
    if (this.state === 'initials') { if (TC.cab) TC.cab.update(dt); if (!TC.cab || !TC.cab.entry) game.go('records'); }
  },
  toInitials() {
    const sim = this.s.sim, mode = this.d.mode === 'coop' ? 'coop' : this.d.mode === 'stage' ? 'stage' + sim.stageList[0] : 'arcade', score = Math.max(...sim.players.map(p => p.score));
    if (TC.cab && TC.cab.qualifies(score, mode)) { this.state = 'initials'; TC.cab.enter(score, mode, () => {}); } else game.go('records');
  },
  draw(r) {
    const sim = this.s.sim;
    if (this.state === 'brief') { r.overlay(g => this.brief.draw(g, r, game)); return; }
    if (this.state === 'results') { r.overlay(g => this.res.draw(g, r, game)); return; }
    if (this.state === 'credits') { r.overlay(g => this.cred.draw(g, r, game)); return; }
    if (this.state === 'initials') { r.overlay(g => { frame(g, r, 'NEW HIGH SCORE', this.t); T(g, 'ENTER YOUR INITIALS', r.W / 2, 34, UI.gold, { align: 'center' }); }); if (TC.cab) TC.cab.draw(r); return; }
    this.s.draw(r);
    r.overlay(g => {
      if (this.state === 'over') { E.px.blend(g, .6, 'multiply', () => E.px.rect(g, 0, 0, r.W, r.H, '#300808')); E.font.title(g, 'GAME OVER', r.W / 2, r.H * .4, { scale: 4, colors: ['#ffffff', '#ff8a80', '#ff3b30'], outline: '#000', align: 'center' }); }
      if (this.state === 'range') { E.ui.box(g, r.W / 2 - 110, r.H / 2 - 40, 220, 80, { bg: UI.bg, border: UI.gold }); E.font.title(g, 'TRAINING COMPLETE', r.W / 2, r.H / 2 - 32, { scale: 2, colors: ['#ffffff', '#ffd36a'], outline: '#000', align: 'center' }); T(g, 'TIME ' + this.rangeT.toFixed(2) + ' s', r.W / 2, r.H / 2 - 6, '#ffffff', { align: 'center', scale: 2 }); const b = E.store.get('tc3:rangeBest', null); T(g, 'BEST ' + (b ? b.toFixed(2) : '--') + ' s', r.W / 2, r.H / 2 + 14, UI.gold, { align: 'center' }); hintLine(g, r, game.input, [['confirm', 'MENU']]); }
      if (this.howto >= 0) drawHowto(g, r, game.input, this.howto);
      if (TC.dev.isOpen) TC.dev.draw(g, r);
    });
  }
};

const scenes = { title: titleScreen, menu: menuScreen, difficulty: difficultyScreen, select: selectScreen, coop: coopScreen, play: playScreen, records: recordsScreen, about: aboutScreen, howto: howtoScreen, attract: attractScreen };
for (const k in scenes) { scenes[k].camera = { zoom: false }; scenes[k].touch = []; }
if (TC.netScenes) Object.assign(scenes, TC.netScenes(game));
game.input.touchEnabled = false;
game.debug = {
  snapshot() { const s = TC.play && TC.play.s ? TC.play.s.sim : TC.Net && TC.Net.session ? TC.Net.session.sim : null; return { scene: game.sceneName || game.scene && game.scene.name, state: TC.play ? TC.play.state : null, phase: s && s.phase, stage: s && s.stageId, area: s && s.sceneId, timer: s && +s.timer.toFixed(2), players: s && s.players.map(p => ({ score: p.score, lives: p.lives, c: +p.c.toFixed(2), w: p.w, mag: p.mag, ammo: p.ammo })), enemies: s && s.enemies.filter(e => !e.dead).length, threats: s && s.threats.filter(t => !t.done).length, boss: s && s.boss && { id: s.boss.id, hp: s.boss.parts.map(p => +p.hp.toFixed(1)) }, errors: game.errors.length }; },
  get sim() { return TC.play && TC.play.s ? TC.play.s.sim : null; }, tune: () => tune, TC
};
// dev deep links for tools and screenshots: #play=1:1-2&bot  ·  #scene=menu
const LINK = typeof location !== 'undefined' && !HUB ? location.hash.slice(1) : '';
if (LINK) setTimeout(() => {
  const q = Object.fromEntries(LINK.split('&').map(kv => kv.split('=')));
  if (q.play) { const [st, sc] = q.play.split(':'); const stage = isNaN(+st) ? st : +st; game.go('play', { mode: 'stage', stages: [stage], difficulty: 'normal', noBrief: true, skipCuts: true, seed: 5 }); const go = () => { if (!TC.play) { setTimeout(go, 100); return; } const sim = TC.play.s.sim; if (sc) sim.jump(stage, sc); if ('bot' in q) TC.play.s.bots[0] = new TC.Autopilot(q.bot || 'showoff'); if ('god' in q) sim.cheats.god = true; if ('cut' in q) sim.startCut(q.cut, () => sim.startScene(0)); if ('p2' in q) TC.play.s.addPlayer(null, 'rook', new TC.Autopilot('fair')); if ('dev' in q) TC.dev.open(TC.play); if ('pause' in q) game.pause(); }; setTimeout(go, 200); }
  else if (q.scene) game.go(q.scene, {});
}, 400);
game.start({ scene: HUB ? 'session' : 'title', scenes, boot: { title: 'TIDE CRISIS 3', version: TC.version, steps: [
  ['Charting the Lumen Isles', () => { const errs = TC.validate(); if (errs.length) game.fail && game.fail('content', new Error(errs.join('; '))); }],
  ['Tuning the sirens', () => { TC.defineSfx(game.audio); }],
  ['Waking the night watch', () => { if (HUB && TC.netBoot) return TC.netBoot(game); }]], messages: ['Polishing the lantern lenses', 'Counting the floodgates', 'Checking the tide tables'] } });
