/* 90-main: new E.Game, the settings and pause items we add to the engine's standard ones, the boot steps, every
 * engine scene (title, menu, difficulty, select, coop, briefing, play, results, gameover, records, about, howto,
 * ending, attract, session, server) and game.debug for the tests and tools. */
const HUB = typeof AIHub !== 'undefined' && !!AIHub.active;
TC.HUB = HUB;
const SETTINGS = [
  { key: 'difficulty', group: 'Game', label: 'Difficulty (new runs)', type: 'select', value: 'normal', options: [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']], help: 'Lives, time and how hard the Black Current shoots' },
  { key: 'aimAssist', group: 'Game', label: 'Aim assist (controller)', type: 'select', value: 'medium', options: [['off', 'Off'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High']], apply: (g, v) => { TC.assistLevel = { off: 0, low: .35, medium: .6, high: .85 }[v]; } },
  { key: 'padSpeed', group: 'Game', label: 'Aim speed (controller)', type: 'slider', value: 1, min: .5, max: 2, step: .05, unit: '×', apply: (g, v) => { TC.settingsPadSpeed = v; } },
  { key: 'coverMode', group: 'Game', label: 'Cover control', type: 'select', value: 'hold', options: [['hold', 'Hold'], ['toggle', 'Toggle']], apply: (g, v) => { TC.coverToggle = v === 'toggle'; } },
  { key: 'autoFire', group: 'Game', label: 'Hold fire to repeat (handgun)', type: 'toggle', value: true, apply: (g, v) => { TC.autoFire = !!v; } },
  { key: 'reticle', group: 'Game', label: 'Reticle', type: 'select', value: 'cross', options: [['cross', 'Cross'], ['ring', 'Ring'], ['dot', 'Dot']], apply: (g, v) => { TC.reticleStyle = v; } },
  { key: 'reticleSize', group: 'Game', label: 'Reticle size', type: 'select', value: 'M', options: [['S', 'Small'], ['M', 'Medium'], ['L', 'Large']], apply: (g, v) => { TC.reticleSize = v; } },
  { key: 'threatSize', group: 'Game', label: 'Crisis rings', type: 'select', value: 'Normal', options: [['Normal', 'Normal'], ['Large', 'Large']], apply: (g, v) => { TC.threatSize = v; } },
  { key: 'subtitles', group: 'Game', label: 'Subtitles', type: 'toggle', value: true, apply: (g, v) => { TC.subtitles = !!v; } },
  { key: 'wobble', group: 'Game', label: 'Retro texture wobble', type: 'toggle', value: false, apply: (g, v) => { TC.wobble = !!v; } }
];
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, input: PRESET, id: 'tide-crisis-3', bg: '#04060c',
  autoPause: !HUB, corner: !HUB, fullscreen: HUB ? false : undefined, backGesture: !HUB,
  menu: HUB ? false : {
    items: [['Restart area', () => { game.resume(); if (TC.play) TC.play.sim.restartScene(); }], ['Restart stage', () => { game.resume(); if (TC.play) { const s = TC.play.sim; s.jump(s.stage.id, s.stage.scenes[0]); } }], ['How to play', () => { game.resume(); game.go('howto', { back: 'play' }); }], ['Dev mode', () => { if (game.shell) game.shell.hide(); game.resume(); TC.dev.show(); }]],
    settings: SETTINGS, controls: ACTION_NAMES, quit: 'title'
  }
});
TC.game = game;
for (const s of SETTINGS) if (s.apply) s.apply(game, game.settings[s.key]);
const arcade = new E.Arcade(game, { id: 'tide-crisis-3', lives: 5, hud: false });
TC.arcade = arcade;
if (!HEADLESS) addEventListener('keydown', () => { TC._keySeen = true; }, { capture: true });

/* ---- run state across scenes: the Sim of an ARCADE or STAGE run ---- */
TC.run = null;
function newRun(o) {
  const diff = o.difficulty || game.settings.difficulty || 'normal';
  const players = o.coop ? [{ name: 'P1', agent: 'kai', color: SEAT_COLORS[0] }, { name: 'P2', agent: 'rook', color: SEAT_COLORS[1] }] : [{ name: 'P1', agent: 'kai', color: SEAT_COLORS[0] }];
  TC.run = { mode: o.mode, stage: o.stage || 1, difficulty: diff, coop: !!o.coop, table: o.mode === 'arcade' ? (o.coop ? 'coop' : 'arcade') : 'stage' + (o.stage || 1), sim: null, players };
  return TC.run;
}
TC.newRun = newRun;
function startPlay(stage) {
  const run = TC.run;
  if (!run.sim) run.sim = new Sim({ mode: run.coop ? 'coop' : run.mode === 'range' ? 'range' : 'stage', stage, difficulty: run.difficulty, seed: (Date.now() & 0xffffff) ^ 0x51, players: run.players });
  else if (run.sim.stage.id !== stage) run.sim.nextStage(stage);
  game.go('play', {});
}
TC.startPlay = startPlay;

/* ---- the scenes ---- */
const scenes = {};
scenes.title = {
  camera: { zoom: false }, touch: [],
  enter() { Idle.reset(); Audio3.music('theme'); Audio3.ambience(null); game.timeScale = 1; game.allowJoin(false); this.t = 0; },
  update(dt) {
    this.t += dt;
    const I = game.input, idle = Idle.step(dt);
    if (touchOnly()) { const c = I.clicked(); if (c && this.gear && c[0] >= this.gear[0] && c[0] < this.gear[0] + this.gear[2] && c[1] >= this.gear[1] && c[1] < this.gear[1] + this.gear[3]) game.menu('settings'); if (idle > 10) game.go('attract'); return; }
    if (idle > 10) { game.go('attract'); return; }
    if (this.t > .5 && (I.anyPressed() || I.clicked())) { I.consumeAll(); Audio3.play('ui_ok'); game.go('menu'); }
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; Flyover.draw(g, W, H, 1 / 60);
      logo(g, W / 2, H * .22, Flyover.t);
      txt(g, 'A CREST OPERATION  •  PORT LUMEN, 23:40', W / 2, H * .22 + 46, '#9fe3ff', { align: 'center' });
      if (touchOnly()) {
        E.ui.box(g, W / 2 - 110, H * .56, 220, 34, { bg: ['#3a0a14', '#14060a'], border: '#ff3b30' });
        txt(g, 'Controller or keyboard required', W / 2, H * .56 + 6, '#ffffff', { align: 'center' }); txt(g, 'Connect one, or press any key', W / 2, H * .56 + 18, '#ffd36a', { align: 'center' });
        const gx = W / 2 - 40, gy = H * .74; this.gear = [gx, gy, 80, 26]; E.ui.box(g, gx, gy, 80, 26, { bg: ['#1e5aa0', '#0e2a5a'], border: '#ffd36a' }); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; px.rect(g, gx + 13 + Math.cos(a) * 6 - 1, gy + 13 + Math.sin(a) * 6 - 1, 3, 3, '#ffffff'); } px.disc(g, gx + 13, gy + 13, 4, '#ffffff'); px.disc(g, gx + 13, gy + 13, 2, '#0e2a5a'); txt(g, 'SETTINGS', gx + 24, gy + 9, '#ffffff');
      } else if ((this.t * 2 | 0) % 2 === 0) {
        const I = game.input, pad = I.lastDevice === 'gamepad', fresh = !I.mouse.active && I.lastDevice === 'keyboard' && !TC._keySeen;
        if (pad || fresh) { const lab = I.label('confirm', 'gamepad'), tail = fresh ? '  OR ENTER / CLICK' : '', w1 = F.width('PRESS ', { scale: 2 }), w2 = (PS_ICON[lab] ? 14 : F.width(lab, { scale: 2 })) + 16, w3 = F.width(tail, { scale: 2 }), x = W / 2 - (w1 + w2 + w3) / 2, y = H * .66; txt(g, 'PRESS ', x, y + 4, '#ffffff', { scale: 2 }); btn(g, lab, x + w1, y, { scale: 2 }); txt(g, tail, x + w1 + w2 + 2, y + 4, '#ffffff', { scale: 2 }); }
        else txt(g, 'PRESS ENTER OR CLICK', W / 2, H * .66, '#ffffff', { align: 'center', scale: 2, outline: '#08142a', shadow: false });
      }
      txt(g, '© 2026 CREST ARCADE  •  ' + E.versionLabel().replace(/[^\x20-\x7e]/g, '•'), W / 2, H - 12, '#5a7ab0', { align: 'center' });
    });
  }
};
scenes.menu = {
  camera: { zoom: false }, touch: [],
  enter() {
    Idle.reset(); Audio3.music('theme'); game.allowJoin(false);
    this.m = new UIMenu([
      { label: 'ARCADE', desc: 'Stages 1 to 3, the full mission, one agent', act: () => { if (!E.store.get('tc3:seenTraining', false) && !TC._seenTraining) { game.go('offer'); return; } newRun({ mode: 'arcade' }); game.go('difficulty', { next: () => game.go('briefing', { stage: 1 }) }); } },
      { label: 'CO-OP', desc: 'Two agents, split screen: a second controller joins', act: () => game.go('coop') },
      { label: 'STAGE SELECT', desc: 'Any stage, any difficulty, a table each', act: () => game.go('select') },
      { label: 'TRAINING', desc: 'The CREST range: four drills, every mechanic', act: () => { newRun({ mode: 'range', stage: 'range' }); TC.run.sim = null; startPlay('range'); } },
      { label: 'RECORDS', desc: 'High scores, the range record, intel found', act: () => game.go('records') },
      { label: 'SETTINGS', desc: 'Sound, display, comfort, controls', act: () => game.menu('settings') },
      { label: 'ABOUT', desc: 'How to play, credits, source and feedback', act: () => game.go('about') }
    ], { back: () => game.go('title') });
  },
  update(dt) { if (Idle.step(dt) > 10) { game.go('attract'); return; } if (game.paused) return; this.m.update(dt); },
  draw(r) { r.overlay(g => { Flyover.draw(g, r.W, r.H, 1 / 60); E.px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#04060c')); logo(g, r.W / 2, 14, Flyover.t, .55); this.m.draw(g, r.W / 2, 52, 200, { gap: Math.min(24, (r.H - 86) / 7), footer: r.H - 22 }); }); }
};
/** the first ARCADE start offers Training once (seenTraining remembers the answer) */
scenes.offer = {
  camera: { zoom: false }, touch: [],
  enter() { this.t = 0; const seen = () => { TC._seenTraining = true; E.store.set('tc3:seenTraining', true); }; this.m = new UIMenu([{ label: 'TRAINING FIRST', desc: 'Juno runs you through cover, weapons and the crisis rings', act: () => { seen(); newRun({ mode: 'range', stage: 'range' }); TC.run.sim = null; startPlay('range'); } }, { label: 'STRAIGHT TO THE MISSION', desc: 'Port Lumen is waiting. You can train any time from the menu', act: () => { seen(); newRun({ mode: 'arcade' }); game.go('difficulty', { next: () => game.go('briefing', { stage: 1 }) }); } }], { back: () => game.go('menu') }); },
  update(dt) { this.t += dt; if (game.paused) return; this.m.update(dt); },
  draw(r) { r.overlay(g => { frame(g, r.W, r.H, 'FIRST MISSION?', this.t); const rig = this.rig || (this.rig = new E.Humanoid(reg('speaker', 'juno').rig)); rig.update(1 / 60, { x: 0, y: 0, facing: Math.PI / 2 }); E.ui.box(g, r.W / 2 - 150, 44, 300, 46, { bg: ['#10244a', '#081428'], border: '#ffd34a' }); try { rig.drawPortrait(g, r.W / 2 - 146, 48, 38, { zoom: 3, turn: .5, bg: '#1a2a4a' }); } catch (e) { /* none */ } txt(g, 'JUNO', r.W / 2 - 102, 50, '#ffd34a'); F.wrap('First time out, agent? The CREST range takes three minutes.', 240, {}).slice(0, 3).forEach((L, k) => txt(g, L, r.W / 2 - 102, 62 + k * 9, '#ffffff')); this.m.draw(g, r.W / 2, 104, 230, { gap: 30, footer: r.H - 22 }); }); }
};
scenes.difficulty = {
  camera: { zoom: false }, touch: [],
  enter(d) { this.d = d || {}; const pick = id => { if (TC.run) TC.run.difficulty = id; game.settings.set('difficulty', id); this.d.next && this.d.next(id); }; this.m = new UIMenu([{ label: 'EASY', desc: '7 lives, more time, fewer crisis shots', act: () => pick('easy') }, { label: 'NORMAL', desc: '5 lives: the arcade as it was meant', act: () => pick('normal') }, { label: 'HARD', desc: '3 lives, less time, Red Tide everywhere', act: () => pick('hard') }], { back: () => game.go('menu'), i: ['easy', 'normal', 'hard'].indexOf(game.settings.difficulty || 'normal') }); },
  update(dt) { if (game.paused) return; this.m.update(dt); },
  draw(r) { r.overlay(g => { frame(g, r.W, r.H, 'DIFFICULTY', Flyover.t += 1 / 60); this.m.draw(g, r.W / 2, 60, 200, { gap: 34 }); }); }
};
scenes.select = {
  camera: { zoom: false }, touch: [],
  enter() {
    const go = n => { newRun({ mode: 'stage', stage: n }); game.go('difficulty', { next: () => game.go('briefing', { stage: n }) }); };
    this.m = new UIMenu([1, 2, 3].map(n => { const st = reg('stage', n); return { label: 'STAGE ' + n, desc: st.name + '  •  ' + st.place, act: () => go(n), n }; }), { back: () => game.go('menu'), horizontal: true });
  },
  update(dt) { if (game.paused) return; this.m.update(dt); },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; frame(g, W, H, 'STAGE SELECT', Flyover.t += 1 / 60); this.m.rects = [];
      const cw = Math.min(120, (W - 40) / 3), gap = 8, x0 = W / 2 - (cw * 3 + gap * 2) / 2;
      this.m.items.forEach((it, k) => {
        const st = reg('stage', it.n), x = x0 + k * (cw + gap), y = 52, on = k === this.m.i, h = H - 100;
        E.ui.box(g, x, y, cw, h, { bg: on ? ['#1e5aa0', '#0e2a5a'] : ['#10244a', '#081428'], border: on ? '#ffd36a' : '#3aa0e8' });
        F.title(g, String(it.n), x + cw / 2, y + 8, { scale: 5, colors: ['#fff3b0', '#ffd36a', '#ff8a2a', '#a81e1e'], outline: '#08142a', align: 'center' });
        txt(g, st.name, x + cw / 2, y + 52, '#ffffff', { align: 'center' }); txt(g, st.place, x + cw / 2, y + 64, '#9fe3ff', { align: 'center' }); txt(g, st.clock, x + cw / 2, y + 76, '#ffd36a', { align: 'center' });
        const best = (arcade.table('stage' + it.n)[0] || { score: 0 }).score; txt(g, 'BEST ' + fmt(best), x + cw / 2, y + h - 16, '#c8d4ec', { align: 'center' });
        this.m.rects[k] = [x, y, cw, h];
      });
      const I = game.input; promptLine(g, I, [{ a: 'left' }, ' ', { a: 'right' }, ' CHOOSE   ', { a: 'confirm' }, ' START'], W / 2, H - 40);
    });
  }
};
scenes.coop = {
  camera: { zoom: false }, touch: [],
  enter() { this.t = 0; this.joined = game.players.length > 1; game.allowJoin({ max: 2, keys: false, onJoin: () => { this.joined = true; Audio3.play('oneup'); } }); },
  update(dt) {
    this.t += dt; const I = game.input;
    if (game.paused) return;
    if (I.pressed('cancel')) { game.allowJoin(false); for (const p of game.players.slice(1)) game.removePlayer(p); game.go('menu'); return; }
    if (this.joined && (I.pressed('confirm') || I.clicked() || (game.players[1] && game.players[1].pressed('confirm')))) { game.allowJoin(false); newRun({ mode: 'arcade', coop: true }); game.go('difficulty', { next: () => game.go('briefing', { stage: 1 }) }); }
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; frame(g, W, H, 'CO-OP', this.t);
      for (let k = 0; k < 2; k++) {
        const x = W / 2 - 150 + k * 156, on = k === 0 || this.joined, sp = reg('speaker', k ? 'rook' : 'kai');
        E.ui.box(g, x, 52, 144, H - 110, { bg: on ? ['#1e5aa0', '#0e2a5a'] : ['#10244a', '#081428'], border: on ? SEAT_COLORS[k] : '#3a4a6a' });
        txt(g, 'PLAYER ' + (k + 1), x + 72, 58, SEAT_COLORS[k], { align: 'center', scale: 2 });
        if (on) { const rig = TC.Flyover.rig || (TC.Flyover.rig = {}); const rr = rig[k] || (rig[k] = new E.Humanoid(sp.rig)); rr.update(1 / 60, { x: 0, y: 0, facing: Math.PI / 2, pose: 'hips' }); rr.drawPortrait(g, x + 42, 80, 60, { zoom: 3, turn: .4, bg: '#1a2a4a' }); txt(g, sp.name, x + 72, 146, '#ffffff', { align: 'center' }); txt(g, k ? 'CONTROLLER' : 'KEYBOARD, MOUSE OR CONTROLLER', x + 72, 158, '#9fe3ff', { align: 'center' }); }
        else if ((this.t * 2 | 0) % 2) { txt(g, 'PRESS START', x + 72, 100, '#ffffff', { align: 'center', scale: 2 }); txt(g, 'ON A SECOND CONTROLLER', x + 72, 120, '#9fe3ff', { align: 'center' }); }
      }
      promptLine(g, game.input, this.joined ? [{ a: 'confirm' }, ' BEGIN   ', { a: 'cancel' }, ' BACK'] : [{ a: 'cancel' }, ' BACK'], W / 2, H - 38);
    });
  }
};
scenes.briefing = {
  camera: { zoom: false }, touch: [],
  enter(d) {
    this.stage = reg('stage', d.stage); this.n = d.stage; this.i = 0; this.t = 0; this.lt = 0; Audio3.music('briefing');
    this.pages = this.stage.briefing || []; this.portraits = {};
    if (this.pages.length) Voice.say(this.pages[0][1], this.pages[0][0]);
  },
  update(dt) {
    this.t += dt; this.lt += dt; const I = game.input;
    if (game.paused) return;
    if ((I.pressed('cancel') || (I.pressed('cover') && I.lastDevice === 'mouse')) && this.t > .3) { I.consumeAll(); startPlay(this.n); return; }
    if ((I.pressed('confirm') || I.pressed('fire') || I.clicked()) && this.lt > .25) {
      I.consumeAll(); this.i++; this.lt = 0;
      if (this.i >= this.pages.length) { startPlay(this.n); return; }
      Voice.say(this.pages[this.i][1], this.pages[this.i][0]); Audio3.play('ui_move');
    }
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, st = this.stage; frame(g, W, H, 'BRIEFING  •  STAGE ' + this.n, this.t);
      // the map of the Lumen Isles
      const mx = 16, my = 44, mw = Math.min(W * .48, 210), mh = H - 120;
      E.ui.box(g, mx, my, mw, mh, { bg: ['#0e2a4a', '#081a30'], border: '#3aa0e8' });
      for (let y = 0; y < mh - 4; y += 3) for (let x = 0; x < mw - 4; x += 3) { const n = E.noise2(x * .03 + 3, y * .03 + 7) + .3 * Math.sin(x * .05); if (n > .58) px.rect(g, mx + 2 + x, my + 2 + y, 3, 3, n > .7 ? '#5a7a4a' : '#3a5a3a'); }
      const pts = [[.25, .62, 'PORT LUMEN'], [.62, .3, "GULL'S REST"], [.82, .72, 'TIDEWALL']];
      pts.forEach(([u, v, name], k) => { const x = mx + u * mw, y = my + v * mh, on = k + 1 === this.n; px.disc(g, x, y, on ? 5 + Math.sin(this.t * 6) : 3, on ? '#ff3b30' : '#ffd36a'); txt(g, name, x, y + 7, on ? '#ffffff' : '#9fe3ff', { align: 'center' }); });
      for (let k = 0; k + 1 < pts.length; k++) { const a = pts[k], b = pts[k + 1]; for (let s = 0; s < 1; s += .04) px.dot(g, mx + lerp(a[0], b[0], s) * mw, my + lerp(a[1], b[1], s) * mh, '#ffffff'); }
      // objectives and the clock
      const ox = mx + mw + 12, ow = W - ox - 14;
      txt(g, st.name, ox, my, '#ffd36a', { scale: 2 }); txt(g, st.place + '  •  ' + st.clock, ox, my + 18, '#9fe3ff');
      (st.objectives || []).forEach((o, k) => { txt(g, '▸ ' + o, ox, my + 34 + k * 11, '#ffffff'); });
      // the speaker's page
      const pg = this.pages[Math.min(this.i, this.pages.length - 1)];
      if (pg) {
        const sp = reg('speaker', pg[0]), by = H - 70, rig = this.portraits[pg[0]] || (this.portraits[pg[0]] = new E.Humanoid(sp.rig));
        rig.update(1 / 60, { x: 0, y: 0, facing: Math.PI / 2 }); rig._talk = true;
        E.ui.box(g, 12, by, W - 24, 46, { bg: ['#10244a', '#081428'], border: sp.color });
        try { rig.drawPortrait(g, 16, by + 4, 38, { zoom: 3, turn: .5, bg: '#1a2a4a' }); } catch (e) { /* none */ }
        txt(g, sp.name, 60, by + 4, sp.color); const shown = Math.floor(this.lt * 40); let left = shown;
        F.wrap(pg[1], W - 84, {}).slice(0, 3).forEach((L, k) => { txt(g, L.slice(0, Math.max(0, left)), 60, by + 15 + k * 9, '#ffffff'); left -= L.length; });
      }
      promptLine(g, game.input, [{ a: 'confirm' }, ' NEXT   ', { a: 'cancel' }, ' SKIP'], W - 16, H - 18, 'right');
    });
  }
};
scenes.play = {
  // (not pausable while the dev panel is open: Escape / Options close the panel instead of opening the pause menu over it)
  get pausable() { return !HUB && !(TC.dev && TC.dev.open); }, camera: { zoom: false }, touch: [],
  enter(d = {}) {
    const run = TC.run;
    if (d.attract) return;
    const inputs = game.players.slice(0, run.sim.players.length);
    this.play = new Play({ sim: run.sim, inputs, bots: d.bots || {} });
    if (run.coop && inputs.length > 1) game.splitScreen(2, { layout: 'columns' }); else game.splitScreen(0);
    Audio3.music(run.sim.stage.music); Audio3.ambience(run.sim.stage.env.ambience || (run.sim.stage.env.storm ? 'storm' : 'festival'));
    this.endT = 0;
  },
  exit() { game.splitScreen(0); game.timeScale = 1; if (TC.dev) TC.dev.hide(); Audio3.ambience(null); },
  update(dt) {
    const P = this.play; if (!P) return;
    // a second pad's Start drops P2 in during ARCADE (split screen)
    P.update(dt);
    const sim = P.sim;
    if (sim.phase === 'done') { this.endT += dt; if (this.endT > 1.2) { Audio3.sting('clear'); game.go('results', {}); } }
    if (sim.phase === 'gameover') { this.endT += dt; if (this.endT > 1.5) game.go('gameover', { score: Math.max(...sim.players.map(p => p.score)), over: true }); }
  },
  draw(r) { if (this.play) this.play.draw(r); },
  hud() {}
};
scenes.results = {
  camera: { zoom: false }, touch: [],
  enter() { const run = TC.run; this.res = new Results(run.sim, 0, {}); Audio3.music('results'); },
  update(dt) {
    if (game.paused) return;
    this.res.update(dt, game.input);
    if (!this.res.done) return;
    const run = TC.run, sim = run.sim, n = sim.stage.id;
    if (run.mode === 'range') { const best = E.store.get('tc3:range', 0), t = sim.players[0].stats.time; if (!best || t < best) E.store.set('tc3:range', t); E.store.set('tc3:seenTraining', true); TC._seenTraining = true; game.go('menu'); return; }
    if (run.mode === 'arcade' && n < 3) { game.go('briefing', { stage: n + 1 }); return; }
    if (run.mode === 'arcade') { game.go('ending', {}); return; }
    game.go('gameover', { score: sim.players[0].score, won: true });
  },
  draw(r) { r.overlay(g => this.res.draw(g, r.W, r.H)); }
};
scenes.gameover = {
  camera: { zoom: false }, touch: [],
  enter(d) {
    this.d = d; this.t = 0; this.phase = 'over'; const run = TC.run; this.table = run ? run.table : 'arcade';
    Audio3.music(null); Audio3.sting(d.won ? 'clear' : 'gameover');
    this.score = d.score || 0;
  },
  update(dt) {
    this.t += dt; const I = game.input; arcade.update(dt);
    if (this.phase === 'over' && this.t > 2.4) { if (arcade.qualifies(this.score, this.table)) { this.phase = 'entry'; arcade.enter(this.score, this.table, () => { this.phase = 'table'; this.t = 0; }); } else { this.phase = 'table'; this.t = 0; } }
    if (this.phase === 'table' && this.t > .6 && (I.pressed('confirm') || I.clicked() || this.t > 12)) { I.consumeAll(); TC.run = null; game.go('menu'); }
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; frame(g, W, H, null, this.t);
      if (this.phase === 'over') { F.title(g, this.d.won ? 'MISSION COMPLETE' : 'GAME OVER', W / 2, H * .35, { scale: 3, colors: this.d.won ? ['#fff3b0', '#ffd36a', '#ff8a2a', '#a81e1e'] : ['#ffffff', '#ff9a8a', '#ff3b30', '#6a0a0a'], outline: '#08142a', depth: 3, align: 'center' }); txt(g, 'SCORE ' + fmt(this.score), W / 2, H * .55, '#ffffff', { align: 'center', scale: 2 }); }
      if (this.phase === 'entry') { txt(g, 'NEW HIGH SCORE!', W / 2, 30, '#ffd36a', { align: 'center', scale: 2 }); txt(g, fmt(this.score), W / 2, 50, '#ffffff', { align: 'center', scale: 2 }); }
      if (this.phase === 'table') arcade.drawTable({ overlay: f => f(g), W, H, text: (s, x, y, c, o) => txt(g, s, x, y, c, o) }, this.table, 30, 'HIGH SCORES  •  ' + this.table.toUpperCase());
    });
    if (this.phase === 'entry') arcade.draw(r);
  }
};
scenes.records = {
  camera: { zoom: false }, touch: [],
  enter() { this.pages = ['arcade', 'coop', 'stage1', 'stage2', 'stage3', 'range', 'intel']; this.i = 0; this.t = 0; },
  update(dt) {
    this.t += dt; const I = game.input; if (game.paused) return;
    if (I.pressed('cancel') || I.pressed('confirm') && this.t > .3 || (I.pressed('cover') && I.lastDevice === 'mouse')) { I.consumeAll(); game.go('menu'); return; }
    if (I.pressed('right') || I.pressed('next')) { this.i = (this.i + 1) % this.pages.length; Audio3.play('ui_move'); }
    if (I.pressed('left') || I.pressed('prev')) { this.i = (this.i + this.pages.length - 1) % this.pages.length; Audio3.play('ui_move'); }
    const c = I.clicked(); if (c) { this.i = (this.i + (c[0] > TC.game.screen.W / 2 ? 1 : this.pages.length - 1)) % this.pages.length; Audio3.play('ui_move'); }
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, pg = this.pages[this.i]; frame(g, W, H, 'RECORDS', this.t);
      txt(g, '← ' + (this.i + 1) + ' / ' + this.pages.length + ' ▸', W / 2, 38, '#9fe3ff', { align: 'center' });
      if (pg === 'range') { const b = E.store.get('tc3:range', 0); txt(g, 'CREST RANGE  •  BEST TIME', W / 2, 70, '#ffd36a', { align: 'center', scale: 2 }); txt(g, b ? b.toFixed(2) + ' s' : '--', W / 2, 100, '#ffffff', { align: 'center', scale: 3 }); }
      else if (pg === 'intel') { const got = E.store.get('tc3:intel', []); txt(g, 'INTEL  •  ' + got.length + ' / ' + INTEL.length + ' BOTTLES', W / 2, 52, '#ffd36a', { align: 'center', scale: 2 }); INTEL.forEach((s, k) => { const y = 74 + k * 22, on = got.includes(k); E.px.sprite(g, ICON.bottle, 20, y - 2); F.wrap(on ? s : '??? (a green bottle somewhere in stage ' + (Math.floor(k / 2) + 1) + ')', W - 50, {}).slice(0, 2).forEach((L, j) => txt(g, L, 36, y + j * 9, on ? '#ffffff' : '#5a6a80')); }); }
      else arcade.drawTable({ overlay: f => f(g), W, H, text: (s, x, y, c, o) => txt(g, s, x, y, c, o) }, pg, 52, pg.toUpperCase().replace('STAGE', 'STAGE '));
      promptLine(g, game.input, [{ a: 'prev' }, ' / ', { a: 'next' }, ' PAGE   ', { a: 'cancel' }, ' BACK'], W / 2, H - 20);
    });
  }
};
scenes.about = {
  camera: { zoom: false }, touch: [],
  enter() { this.i = 0; this.t = 0; },
  update(dt) {
    this.t += dt; const I = game.input, n = aboutFlow(game.screen.W, game.screen.H).length; if (game.paused) return;
    if (I.pressed('cancel') || (I.pressed('cover') && I.lastDevice === 'mouse')) { I.consumeAll(); game.go('menu'); return; }
    if (I.pressed('right') || I.pressed('next') || I.pressed('confirm')) { this.i = (this.i + 1) % n; Audio3.play('ui_move'); }
    if (I.pressed('left') || I.pressed('prev')) { this.i = (this.i + n - 1) % n; Audio3.play('ui_move'); }
    const c = I.clicked(); if (c) { this.i = (this.i + (c[0] > TC.game.screen.W / 2 ? 1 : n - 1)) % n; Audio3.play('ui_move'); }
  },
  draw(r) { r.overlay(g => drawAboutPage(g, r.W, r.H, this.i, this.t)); }
};
/** the About pages flowed to the screen: a long section continues on the next page, nothing is cut */
function aboutFlow(W, H) {
  const key = W + 'x' + H; if (TC._flow && TC._flow.key === key) return TC._flow.pages;
  const lh = 9, top = 52, maxY = H - 34, out = [];
  for (const pg of TC.ABOUT.pages) {
    let cur = { title: pg.title, lines: [] }, y = top; out.push(cur);
    const add = (text, color, x) => { if (y + lh > maxY) { cur = { title: pg.title + ' (cont.)', lines: [] }; out.push(cur); y = top; } cur.lines.push({ text, color, x, y }); y += lh; };
    for (const [k, v] of pg.rows) {
      if (k) { if (y + 2 * lh > maxY) y = maxY; add(k, '#ffd36a', 14); }
      for (const L of F.wrap(String(v), W - 34, {})) add(L, '#ffffff', k ? 22 : 14);
      y += 3;
    }
  }
  TC._flow = { key, pages: out }; return out;
}
TC.aboutFlow = aboutFlow;
function drawAboutPage(g, W, H, i, t) {
  const pages = aboutFlow(W, H), pg = pages[((i % pages.length) + pages.length) % pages.length]; frame(g, W, H, pg.title, t);
  txt(g, '← ' + (pages.indexOf(pg) + 1) + ' / ' + pages.length + ' →', W / 2, 38, '#9fe3ff', { align: 'center' });
  for (const L of pg.lines) txt(g, L.text, L.x, L.y, L.color);
  promptLine(g, game.input, [{ a: 'prev' }, ' / ', { a: 'next' }, ' PAGE   ', { a: 'cancel' }, ' BACK'], W / 2, H - 20);
}
TC.drawAboutPage = drawAboutPage;
scenes.howto = {
  camera: { zoom: false }, touch: [],
  enter(d) { this.d = d || {}; this.t = 0; },
  update(dt) { this.t += dt; const I = game.input; if (this.t > .3 && (I.pressed('cancel') || I.pressed('confirm') || I.clicked())) { I.consumeAll(); if (this.d.back === 'play' && TC.play) { game.go('play', { resume: true }); } else game.go('menu'); } },
  draw(r) { r.overlay(g => drawHowTo(g, r.W, r.H, this.t)); }
};
function drawHowTo(g, W, H, t) {
  frame(g, W, H, 'HOW TO PLAY', t); const I = game.input;
  const rows = [[['AIM: '], 'mouse or right stick (keys: arrows)'], [['FIRE: ', { a: 'fire' }], 'shoot what pops out'], [['HOLD ', { a: 'cover' }], 'duck behind cover: safe, and you reload there'], [[{ a: 'next' }, ' / ', { a: 'prev' }], 'switch weapons (or fire while in cover)'], [[{ a: 'reload' }], 'quick reload (ducks for a moment)'], [['RED RINGS '], 'a shot that WILL hit you: duck before it closes'], [['ORANGE VESTS '], 'carry ammo: drop them for the special weapons'], [['TIME '], 'beat the clock in every area or the tide takes a life']];
  rows.forEach((rw, k) => { const y = 48 + k * 21; promptLine(g, I, rw[0], 20, y, 'left'); txt(g, rw[1], 132, y + 2, '#c8d4ec'); });
  txt(g, 'PRESS ' + TC.label(I, 'confirm') + ' TO GO BACK', W / 2, H - 20, '#ffd36a', { align: 'center' });
}
TC.drawHowTo = drawHowTo;
scenes.ending = {
  camera: { zoom: false }, touch: [],
  enter() { this.t = 0; Audio3.music('ending'); this.lines = TC.ABOUT.credits; this.rigs = ['kai', 'rook', 'mari', 'juno', 'hale', 'tejada', 'krake', 'barracuda', 'hammerhead', 'gull'].map(id => ({ id, rig: new E.Humanoid(reg('speaker', id).rig) })); },
  update(dt) { this.t += dt; const I = game.input; for (const r of this.rigs) r.rig.update(dt, { x: 0, y: 0, facing: Math.PI / 2, pose: 'cheer' }); if (this.t > 2 && (I.pressed('confirm') || I.pressed('start') || I.clicked()) || this.t > 60) { I.consumeAll(); game.go('gameover', { score: TC.run ? Math.max(...TC.run.sim.players.map(p => p.score)) : 0, won: true }); } },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; frame(g, W, H, null, this.t); const y0 = H - this.t * 18;
      let y = y0; logo(g, W / 2, y, this.t, .6); y += 60;
      for (const L of this.lines) { if (y > -10 && y < H + 10) txt(g, L[1], W / 2, y, L[0] === 'h' ? '#ffd36a' : L[0] === 's' ? '#9fe3ff' : '#ffffff', { align: 'center', scale: L[0] === 'h' ? 2 : 1 }); y += L[0] === 'h' ? 22 : 12; }
      this.rigs.forEach((R, k) => { const yy = y + 20 + k * 56; if (yy > -60 && yy < H + 10) { R.rig.drawPortrait(g, W / 2 - 24, yy, 48, { zoom: 3, turn: .4, bg: '#1a2a4a' }); txt(g, reg('speaker', R.id).name, W / 2, yy + 50, reg('speaker', R.id).color, { align: 'center' }); } });
      if (y + 20 + 10 * 56 < 0) { F.title(g, 'THE END', W / 2, H / 2 - 10, { scale: 4, colors: ['#fff3b0', '#ffd36a', '#ff8a2a', '#a81e1e'], outline: '#08142a', align: 'center' }); }
    });
  }
};
scenes.session = sessionScene();
scenes.attract = { camera: { zoom: false }, touch: [], enter() { Idle.reset(); Attract.enter(); }, exit() { TC.game.timeScale = 1; }, update(dt) { Attract.update(dt); }, draw(r) { Attract.draw(r); } };
TC.scenes = scenes;

/* ---- boot ---- */
const boot = { title: 'TIDE CRISIS 3', version: E.version, messages: ['Raising the harbor', 'Hanging the lanterns', 'Winding the lighthouse', 'Filling the sluices', 'Briefing the agents', 'Tuning the radios'], steps: [
  ['Building Port Lumen', () => worldOf(reg('stage', 1))],
  ["Building Gull's Rest", () => reg('stage', 2) && worldOf(reg('stage', 2))],
  ['Building the Tidewall', () => reg('stage', 3) && worldOf(reg('stage', 3))],
  ['Building the CREST range', () => reg('stage', 'range') && worldOf(reg('stage', 'range'))],
  ['Painting the textures', () => { if (!HEADLESS) { for (const m of regAll('material')) texOf(m.id); refreshCanvasMaterials(); } }]
] };
game.debug = {
  snapshot() { const P = TC.play; return { scene: game.sceneName, run: TC.run ? TC.run.mode : null, sim: P && game.sceneName === 'play' ? P.sim.snapshot() : null, attract: TC.attract ? TC.attract.state : null, errors: game.errors.length }; },
  get sim() { return TC.play && TC.play.sim; },
  get tune() { return tune; },
  jump(stage, scene) { const s = TC.play.sim; s.jump(stage, scene); },
  cheat(k, v = true) { TC.play.sim.cheats[k] = v; },
  bot(on = true, style = 'fair', i = 0) { if (on) TC.play.bots[i] = new Autopilot(style); else delete TC.play.bots[i]; },
  start(o = {}) { newRun(Object.assign({ mode: 'stage', stage: 1 }, o)); TC.run.sim = new Sim({ mode: o.coop ? 'coop' : o.mode === 'range' ? 'range' : 'stage', stage: o.stage || 1, scene: o.scene, difficulty: o.difficulty || 'normal', seed: o.seed || 7, players: TC.run.players, cheats: o.cheats }); game.go('play', {}); }
};
TC.debug = game.debug;
TC.boot = () => game.start({ scene: HUB ? 'session' : 'title', scenes, boot });
