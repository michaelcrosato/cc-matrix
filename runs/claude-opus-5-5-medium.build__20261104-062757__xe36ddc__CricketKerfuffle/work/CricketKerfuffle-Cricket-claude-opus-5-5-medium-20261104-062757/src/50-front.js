// ---- the front end (5.15.3): the title (and the touch-only gate), the main menu, story, setup, the versus lobby, the
// toss, the story map, cutscenes, results and About/Credits. One decision per screen, big type, the focus a cricket ball.
const SC = {};
const IDLE = { t: 0, sig: '' };
// any input resets the idle timer (an action, a key, the mouse, a pad's stick or buttons, a touch)
function inputSig() {
  const I = game.input; const m = I.mouse || {}; const pm = I.padMove || [0, 0];
  const mv = I.move(), touch = I.stickOn || (I.drag && I.drag()), ptr = I.pointer ? I.pointer() : null;
  return [I.anyPressed() ? game.time : '', m.t, Math.abs(pm[0]) > .3 || Math.abs(pm[1]) > .3 || hyp(mv[0], mv[1]) > .3 ? game.time : '', I.clicked && I.clicked() ? game.time : '', touch ? game.time : '', ptr ? ptr[0] + ',' + ptr[1] : '', I.lastDevice].join('|');
}
function anyInput() { const I = game.input; const s = inputSig(); const changed = s !== IDLE.sig; IDLE.sig = s; return changed || I.anyPressed(); }
function idleStep(dt, scene) {
  if (HUB) return;
  if (anyInput()) IDLE.t = 0; else IDLE.t += dt;
  if (IDLE.t >= 10) { IDLE.t = 0; game.go('attract', { from: scene }); }
}
// a scenery match: the ground with a batter knocking up, fielders and Doris, behind the menus
let BACK = null;
function backdrop(gid = 'green') {
  if (BACK && BACK.gid === gid) return BACK;
  const m = new Match({ teams: ['ker', 'mud'], ground: gid, overs: 2, mode: 'scenery', seed: 7, kerfuffle: false });
  m._placeAll(); m.setBowler(m.eligibleBowlers()[0].id); m._placeAll();
  m.critters = [{ kind: 'cow', x: 300, y: 380, vx: -6, vy: 2, t: 0 }];
  BACK = { gid, m, t: 0 };
  return BACK;
}
function drawBackdrop(r, dt, o = {}) {
  const B = backdrop(o.gid || 'green'), m = B.m; B.t += dt;
  useGround(B.gid, m);
  if (game.view !== VIEWS.story) game.setView(VIEWS.story);
  const ang = B.t * .05;
  game.cam.smooth = 0; game.focus(OX + Math.sin(ang) * 120, OY + 150 + Math.cos(ang) * 80, 0);
  m.chaosStep(dt);
  for (const k of m.critters) if (Math.abs(k.x) > 500) k.vx = -k.vx;
  const b0 = m.batters[0]; b0.animT += dt; if (b0.animT > 2.4) { b0.anim = 'swing'; b0.sw = { fam: pick(['drive', 'pull', 'loft']), at: .13, th: (Math.random() - .5) * 2, h: 1 }; b0.animT = 0; } else if (b0.anim === 'swing' && b0.animT > 1) b0.anim = 'stance';
  for (const f of m.fielders) f.animT += dt;
  m.time = o.time || 'dusk';
  drawWorld(r, m, dt);
}
// ---------------------------------------------------------------- the title
SC.title = {
  enter(d) { music('title'); this.phase = d && d.menu ? 'menu' : 'press'; this.t = 0; IDLE.t = 0; this.menu = mainMenu(); game.allowJoin(false); while (game.players.length > 1) game.removePlayer(game.players[game.players.length - 1]); },
  update(dt) {
    this.t += dt; idleStep(dt, 'title');
    const I = game.input;
    if (I.anyPressed() && (I.lastDevice === 'gamepad' || I.lastDevice === 'keyboard')) TOUCH.seenKey = true;
    if (TOUCH.gate !== touchOnly()) TOUCH.gate = touchOnly();
    if (TOUCH.gate) { const c = I.clicked && I.clicked(); if (c && this.gateBtn && c[0] >= this.gateBtn[0] && c[0] < this.gateBtn[0] + this.gateBtn[2] && c[1] >= this.gateBtn[1] && c[1] < this.gateBtn[1] + this.gateBtn[3]) game.menu('settings'); return; }
    if (this.phase === 'press') { if (I.pressed('confirm') || I.pressed('start') || (I.clicked && I.clicked()) || I.pressed('shot')) { sfx('confirm'); this.phase = 'menu'; I.consumeAll(); } return; }
    this.menu.update(dt);
  },
  draw(r) {
    drawBackdrop(r, 1 / 60, { time: 'dusk' });
    r.overlay(g => {
      const W = r.W, H = r.H;
      px.blend(g, .35, 'normal', () => px.rect(g, 0, 0, W, H, '#0a0818'));
      const menu = this.phase === 'menu' && !TOUCH.gate, ts = menu ? 3 : 4, ty = menu ? 8 : 22;
      bigTitle(g, 'CRICKET', W / 2, ty, { scale: ts }); bigTitle(g, 'KERFUFFLE', W / 2, ty + ts * 8, { scale: ts, colors: ['#ffffff', '#ff8a5a', '#c83a2a'] });
      E.font.text(g, 'EVERY BALL A COMMOTION. THE TEA IS ALWAYS STEWED.', W / 2, ty + ts * 16 + 6, '#f4f0e0', { align: 'center', shadow: '#000' });
      if (TOUCH.gate) {
        panel(g, W / 2 - 130, H / 2 - 10, 260, 90, { rule: '#ffd23a' });
        E.font.text(g, 'CONTROLLER OR KEYBOARD REQUIRED', W / 2, H / 2, '#ffd23a', { align: 'center', shadow: '#000' });
        // a pad and a keyboard, drawn
        px.rect(g, W / 2 - 70, H / 2 + 16, 40, 18, '#3a3a46'); px.disc(g, W / 2 - 64, H / 2 + 25, 5, '#3a3a46'); px.disc(g, W / 2 - 36, H / 2 + 25, 5, '#3a3a46'); px.disc(g, W / 2 - 40, H / 2 + 22, 2, '#7aa7ff'); px.disc(g, W / 2 - 60, H / 2 + 24, 2, '#c8c8d0');
        px.rect(g, W / 2 + 20, H / 2 + 16, 52, 18, '#3a3a46'); for (let k = 0; k < 8; k++) for (let j = 0; j < 3; j++) px.rect(g, W / 2 + 23 + k * 6, H / 2 + 19 + j * 5, 4, 3, '#d8d8e0');
        this.gateBtn = [W / 2 - 40, H / 2 + 46, 80, 18]; px.rect(g, ...this.gateBtn, '#ffd23a'); E.font.text(g, 'SETTINGS', W / 2, H / 2 + 51, '#1a1430', { align: 'center' , outline: false, shadow: false });
        return;
      }
      if (this.phase === 'press') { if (Math.floor(this.t * 2) % 2 === 0) { const w = measureGlyph(game.input, 'confirm'); E.font.text(g, 'PRESS', W / 2 - w / 2 - 4, H - 60, '#ffffff', { align: 'right', scale: 2, shadow: '#000' }); glyph(g, game.input, 'confirm', W / 2 - w / 2 + 2, H - 54); } E.font.text(g, E.versionLabel ? 'my-3D2dge ' + String(E.versionLabel()).replace(/[^\x20-\x7e]/g, '-') : '', W / 2, H - 12, '#8a84a8', { align: 'center' }); return; }
      this.menu.draw(g, W / 2, 76, 210, { lh: 18 });
      footer(g, r, [['confirm', 'Select'], ['cancel', 'Back']]);
    });
  }
};
function mainMenu() {
  const hasSave = profile.story.chapter > 1 || Object.keys(profile.story.stars).length > 0;
  return new BigMenu([
    { label: 'Story', note: 'THE GRAND KERFUFFLE: FIVE MATCHES TO SAVE THE GREEN', act: () => game.go('story', { hasSave }) },
    { label: 'Quick Match', note: 'ANY TWO TEAMS, ANY GROUND, ONE TO FIVE OVERS', act: () => game.go('setup', { mode: 'quick' }) },
    { label: 'Versus', note: '2 TO 4 PLAYERS ON ONE SCREEN: PADS OR TWO ON A KEYBOARD', act: () => game.go('setup', { mode: 'versus' }) },
    { label: 'Super Over Showdown', note: 'ONE OVER. THE THRUMPTONATOR. HIGH SCORES.', act: () => game.go('showmenu') },
    { label: 'Nets', note: 'LESSONS WITH MRS CRUMB, PRACTICE, THE SIX MACHINE', act: () => game.go('netsmenu') },
    { label: 'Extras', note: 'SETTINGS, CONTROLS, ABOUT AND CREDITS', act: () => game.go('extras') }
  ], { onBack: () => { SC.title.phase = 'press'; } });
}
// a simple list screen over the backdrop
function listScene(name, titleText, items, back = 'title', o = {}) {
  return {
    enter(d) { this.d = d || {}; this.menu = new BigMenu(typeof items === 'function' ? items(this.d) : items, { onBack: () => game.go(back, { menu: true }) }); IDLE.t = 0; if (o.music) music(o.music); },
    update(dt) { idleStep(dt, name); this.menu.update(dt); },
    draw(r) { drawBackdrop(r, 1 / 60, { time: o.time || 'day', gid: o.gid }); r.overlay(g => { px.blend(g, .45, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0818')); bigTitle(g, titleText, r.W / 2, 18, { scale: 3 }); if (o.sub) E.font.text(g, o.sub(this.d), r.W / 2, 46, '#c8c0e0', { align: 'center', shadow: '#000' }); this.menu.draw(g, r.W / 2, 66, 240); footer(g, r, [['confirm', 'Select'], ['cancel', 'Back']]); }); }
  };
}
SC.story = listScene('story', 'THE GRAND KERFUFFLE', d => [
  { label: 'Continue', disabled: !d.hasSave, note: 'CHAPTER ' + profile.story.chapter + ': ' + upper((CHAPTERS[Math.min(4, profile.story.chapter - 1)] || CHAPTERS[0]).title), act: () => game.go('storymap') },
  { label: d.hasSave ? 'New Game (starts again)' : 'New Game', note: d.hasSave ? 'YOUR STARS ARE KEPT ON THE MAP. PRESS AGAIN TO CONFIRM.' : 'FROM THE PROLOGUE', act: it => { if (d.hasSave && !it.sure) { it.sure = true; it.label = 'Are you sure? Press again'; return; } profile.story = { chapter: 1, stars: profile.story.stars, best: {}, done: false }; saveProfile(); game.go('cutscene', { lines: PROLOGUE, ground: 'green', title: 'PROLOGUE', next: () => game.go('storymap') }); } },
  { label: 'Back', act: () => game.go('title', { menu: true }) }
], 'title', { sub: () => 'SAVE THE VILLAGE GREEN FROM LORD THRUMPTON' });
SC.extras = listScene('extras', 'EXTRAS', [
  { label: 'Settings', act: () => game.menu('settings') }, { label: 'Controls', act: () => game.menu('controls') },
  { label: 'About and Credits', act: () => game.go('about') }, { label: 'Back', act: () => game.go('title', { menu: true }) }
]);
SC.showmenu = listScene('showmenu', 'SUPER OVER SHOWDOWN', [
  { label: 'Bat', note: 'SIX BALLS FROM THE THRUMPTONATOR 3000, TWO WICKETS. SCORE = RUNS.', act: () => startShowdown('bat') },
  { label: 'Bowl', note: 'DEFEND 14 AGAINST KEV "THONGS" MALONE. SCORE = (14 - RUNS) × 10 + 25 A WICKET.', act: () => startShowdown('bowl') },
  { label: 'High Scores', act: () => game.go('table', { modes: ['bat', 'bowl'] }) },
  { label: 'Back', act: () => game.go('title', { menu: true }) }
], 'title', { gid: 'dome', time: 'night', music: 'showdown' });
SC.netsmenu = listScene('netsmenu', 'THE NETS', [
  { label: 'Lessons', note: 'ELEVEN LESSONS WITH MRS CRUMB', act: () => game.go('lessons') },
  { label: 'Free Practice: Bat', note: 'THE BOWLING MACHINE, ANY DELIVERY', act: () => startNets({ kind: 'bat' }) },
  { label: 'Free Practice: Bowl', note: 'BOWL AT A DUMMY BATTER', act: () => startNets({ kind: 'bowl' }) },
  { label: 'The Six Machine', note: 'TWELVE BALLS. RUNS PLUS TARGET BONUSES. A HIGH-SCORE TABLE.', act: () => startNets({ kind: 'six' }) },
  { label: 'Back', act: () => game.go('title', { menu: true }) }
]);
SC.lessons = listScene('lessons', 'LESSONS', () => LESSONS.map((L, k) => ({ label: (profile.lessons.includes(L.id) ? '★ ' : '') + (k + 1) + '. ' + L.title, note: upper(L.text[0]).slice(0, 60), act: () => startNets({ kind: 'lesson', lesson: k }) })).concat([{ label: 'Back', act: () => game.go('netsmenu') }]), 'netsmenu');
// ---------------------------------------------------------------- match setup (quick match and versus)
SC.setup = {
  enter(d) {
    this.mode = d.mode; IDLE.t = 0; this.joined = []; this.side = [];
    const unl = profile.unlocked, teams = TEAMS.map(t => t.id).filter(id => this.mode === 'versus' || unl.includes(id) || id === 'ker');
    const opp = TEAMS.map(t => t.id);
    this.cfg = { a: 'ker', b: this.mode === 'versus' ? 'gen' : 'mud', ground: 'green', overs: +(game.settings.overs || 2), wickets: +(game.settings.wickets || 5), diff: game.settings.difficulty || 'County', time: 'Default', weather: 'Default', kerf: game.settings.kerfuffle !== false };
    const tName = id => TEAM[id].name, gName = id => GROUNDS[id].name;
    this.items = [
      opt(this.mode === 'versus' ? 'Home side' : 'Your team', teams, 'ker', v => { this.cfg.a = v; }, { show: tName }),
      opt('Opponents', opp.filter(id => this.mode === 'versus' || profile.unlocked.includes(id) || id === 'mud' || true), this.cfg.b, v => { this.cfg.b = v; }, { show: id => tName(id) + (this.mode !== 'versus' && !profile.unlocked.includes(id) ? ' (beat them to unlock)' : '') }),
      opt('Ground', GROUND_ORDER, 'green', v => { this.cfg.ground = v; }, { show: gName }),
      opt('Overs', [1, 2, 3, 4, 5], this.cfg.overs, v => { this.cfg.overs = v; }),
      opt('Wickets', [2, 3, 5, 10], this.cfg.wickets, v => { this.cfg.wickets = v; }),
      opt('Difficulty', ['Village', 'County', 'Test', 'Kerfuffle!'], this.cfg.diff, v => { this.cfg.diff = v; }),
      opt('Time of day', ['Default', 'Day', 'Dusk', 'Night'], 'Default', v => { this.cfg.time = v; }),
      opt('Weather', ['Default', 'Clear', 'Overcast', 'Rain', 'Fog'], 'Default', v => { this.cfg.weather = v; }),
      opt('Kerfuffle rules', ['On', 'Off'], this.cfg.kerf ? 'On' : 'Off', v => { this.cfg.kerf = v === 'On'; }, { note: 'OFF: PURIST ARCADE. NO ITEMS, SPECIALS OR CHAOS.' }),
      { label: this.mode === 'versus' ? 'Start (players join first)' : 'Play', act: () => this.start() }
    ];
    this.menu = new BigMenu(this.items, { onBack: () => game.go('title', { menu: true }) });
    if (this.mode === 'versus') { game.allowJoin({ max: 4, onJoin: (inp, n) => { this.side[n - 1] = (n - 1) % 2; sfx('coin'); } }); this.side = [0]; }
    music('title');
  },
  exit() { if (this.mode === 'versus') game.allowJoin(false); },
  start() {
    const c = this.cfg, diff = { Village: 'village', County: 'county', Test: 'test', 'Kerfuffle!': 'kerfuffle' }[c.diff];
    const humans = [[], []];
    if (this.mode === 'versus') game.players.forEach((p, k) => humans[this.side[k] || 0].push(p)); else humans[0].push(game.input);
    if (this.mode === 'versus' && game.players.length < 2) { callout('A SECOND PLAYER: PRESS START ON A PAD, OR 2', '#ffd23a', 2, { small: true }); return; }
    const cfg = { mode: this.mode === 'versus' ? 'versus' : 'quick', teams: [c.a, c.b === c.a ? (c.a === 'ker' ? 'mud' : 'ker') : c.b], ground: c.ground, overs: c.overs, wickets: c.wickets, difficulty: diff, kerfuffle: c.kerf,
      timeOfDay: c.time === 'Default' ? null : c.time.toLowerCase(), weather: c.weather === 'Default' ? null : c.weather.toLowerCase(), humans, toss: true };
    game.go('toss', { cfg });
  },
  update(dt) {
    idleStep(dt, 'setup'); this.menu.update(dt); hudStep(dt);
    if (this.mode === 'versus') for (let k = 1; k < game.players.length; k++) { const p = game.players[k]; if (p.pressed('left')) this.side[k] = 0; if (p.pressed('right')) this.side[k] = 1; }
    if (this.mode === 'versus') { const p = game.input; if (this.menu.i === this.items.length - 1 && (p.pressed('left') || p.pressed('right'))) this.side[0] = 1 - (this.side[0] || 0); }
  },
  draw(r) {
    drawBackdrop(r, 1 / 60, { gid: this.cfg.ground, time: 'day' });
    r.overlay(g => {
      const W = r.W, H = r.H; px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, W, H, '#0a0818'));
      bigTitle(g, this.mode === 'versus' ? 'VERSUS' : 'QUICK MATCH', W / 2, 8, { scale: 2 });
      this.menu.draw(g, W / 2, 34, Math.min(300, W - 40), { lh: 15, scale: 1 });
      // the team cards
      for (const [id, x] of [[this.cfg.a, 26], [this.cfg.b, W - 26]]) { const t = TEAM[id], st = squad(t)[0]; const rig = rigFor(st, 'bat'); rig.drawPortrait(g, x - 14, H - 64, 28, { zoom: 3, turn: .4, bg: t.chip }); E.font.text(g, t.code, x, H - 34, '#f4f0e0', { align: 'center', shadow: '#000' }); }
      if (this.mode === 'versus') {
        E.font.text(g, 'PLAYERS JOIN: START ON A FREE PAD, OR 2 ON THE KEYBOARD. LEFT / RIGHT PICKS A SIDE.', W / 2, H - 30, '#c8c0e0', { align: 'center', shadow: '#000' });
        game.players.forEach((p, k) => { const s = this.side[k] || 0, x = s ? W - 70 : 70; E.font.text(g, p.name || 'P' + (k + 1), x, H - 84 - (k >> 1) * 10 + (k & 1) * 10, p.color || E.PLAYER_COLORS[k], { align: 'center', shadow: '#000' }); });
      }
      footer(g, r, [['up', ''], ['left', 'Change'], ['confirm', 'Select'], ['cancel', 'Back']]);
      for (const c of CALL.list) E.font.text(g, c.text, W / 2, H / 2, c.color, { align: 'center', shadow: '#000' });
    });
  }
};
// ---------------------------------------------------------------- the toss
SC.toss = {
  enter(d) { this.cfg = d.cfg; this.t = 0; this.phase = 'call'; this.call = null; sting('toss'); const R = E.rng(this.cfg.seed || (Math.random() * 1e9) >>> 0); this.heads = R() < .5; this.cpuChoice = R() < .5 ? 'bat' : 'bowl'; this.vs = this.cfg.mode === 'versus'; },
  update(dt) {
    this.t += dt; const I = game.input;
    if (this.phase === 'call') { if (I.pressed('confirm') || I.pressed('shot')) { this.call = 'heads'; this.phase = 'flip'; this.t = 0; sfx('coin'); } else if (I.pressed('cancel') || I.pressed('block')) { this.call = 'tails'; this.phase = 'flip'; this.t = 0; sfx('coin'); } else if (this.t > 15) { this.call = 'heads'; this.phase = 'flip'; this.t = 0; } return; }
    if (this.phase === 'flip' && this.t > 1.6) { this.won = (this.call === 'heads') === this.heads; this.phase = this.won ? 'choose' : 'lost'; this.t = 0; }
    if (this.phase === 'choose') { if (I.pressed('confirm') || I.pressed('shot')) this.go('bat'); else if (I.pressed('cancel') || I.pressed('block')) this.go('bowl'); }
    if (this.phase === 'lost' && (this.t > 2.2 || I.pressed('confirm'))) this.go(this.cpuChoice === 'bat' ? 'bowl' : 'bat');
  },
  go(choice) { const c = this.cfg; c.batFirst = choice === 'bat' ? c.teams[0] : c.teams[1]; startMatch(c); },
  draw(r) {
    drawBackdrop(r, 1 / 60, { gid: this.cfg.ground, time: 'day' });
    r.overlay(g => {
      const W = r.W, H = r.H; px.blend(g, .4, 'normal', () => px.rect(g, 0, 0, W, H, '#0a0818'));
      bigTitle(g, 'THE TOSS', W / 2, 20, { scale: 3 });
      const spin = this.phase === 'flip' ? this.t * 14 : 0, yy = H / 2 - 20 - (this.phase === 'flip' ? Math.sin(Math.min(1, this.t / 1.6) * Math.PI) * 50 : 0), wd = Math.max(1, Math.abs(Math.cos(spin)) * 16);
      const showHeads = this.phase === 'flip' ? Math.cos(spin) > 0 : this.heads;
      px.ell ? px.ell(g, W / 2, yy, wd, 16, '#c8a040') : px.disc(g, W / 2, yy, 16, '#c8a040'); px.disc(g, W / 2, yy, Math.min(wd, 13), '#e8c060'); if (wd > 8) E.font.text(g, this.phase === 'call' ? '?' : showHeads ? 'H' : 'T', W / 2, yy - 3, '#6a4a10', { align: 'center' , outline: false, shadow: false });
      const I = game.input;
      if (this.phase === 'call') prompts(g, I, [['confirm', 'Heads'], ['cancel', 'Tails']], W / 2, H - 50, { align: 'center' });
      if (this.phase === 'choose') { E.font.text(g, 'YOU WON THE TOSS', W / 2, H - 70, '#ffd23a', { align: 'center', scale: 2, shadow: '#000' }); prompts(g, I, [['confirm', 'Bat first'], ['cancel', 'Bowl first']], W / 2, H - 44, { align: 'center' }); }
      if (this.phase === 'lost') { E.font.text(g, (this.vs ? 'THE OTHER SIDE WINS THE TOSS: THEY ' : 'THEY WIN THE TOSS AND ') + (this.cpuChoice === 'bat' ? 'BAT' : 'BOWL'), W / 2, H - 60, '#f4f0e0', { align: 'center', shadow: '#000' }); }
    });
  }
};
// ---------------------------------------------------------------- the story map
const MAP_PINS = [[.18, .7], [.36, .45], [.55, .74], [.72, .4], [.86, .62]];
SC.storymap = {
  enter() { music('map'); this.i = Math.min(4, profile.story.chapter - 1); this.t = 0; this.bus = this.i; IDLE.t = 0; if (!HUB) try { game.saves.autosave(); } catch (e) { /* storage blocked */ } },
  update(dt) {
    this.t += dt; idleStep(dt, 'storymap'); const I = game.input, max = Math.min(4, profile.story.chapter - 1);
    if (I.repeat('left', .3, .15) || I.repeat('up', .3, .15)) { this.i = Math.max(0, this.i - 1); sfx('select'); }
    if (I.repeat('right', .3, .15) || I.repeat('down', .3, .15)) { this.i = Math.min(max, this.i + 1); sfx('select'); }
    const p = !HEADLESS && I.pointer && I.pointer(), c = I.clicked && I.clicked();
    if (this.pins) { if (p) { const k = this.pins.findIndex(q => hyp(q[0] - p[0], q[1] - p[1]) < 12); if (k >= 0 && k <= max && k !== this.i) { this.i = k; sfx('select'); } } if (c) { const k = this.pins.findIndex(q => hyp(q[0] - c[0], q[1] - c[1]) < 12); if (k >= 0 && k <= max) { this.i = k; this.play(); return; } } }
    this.bus += (this.i - this.bus) * Math.min(1, dt * 3);
    if (I.pressed('confirm')) this.play();
    if (I.pressed('cancel')) game.go('title', { menu: true });
  },
  play() { sfx('confirm'); sting('chapter'); startChapter(this.i + 1); },
  draw(r) {
    r.sky(['#6a9a4a', '#5a8a3a']);
    r.overlay(g => {
      const W = r.W, H = r.H;
      // a painted county: fields, hedges, a river, the road between the grounds
      const R = E.rng(5); for (let k = 0; k < 40; k++) { const x = R() * W, y = R() * H, w = 30 + R() * 60, h = 20 + R() * 40; px.rect(g, x, y, w, h, pick(['#7aaa52', '#6a9a48', '#8ab85a', '#c8b86a'], R)); px.rect(g, x, y, w, 1, '#3f6a2a'); }
      for (let x = 0; x < W; x++) px.rect(g, x, Math.round(H * .25 + Math.sin(x * .02) * 12), 1, 5, '#4a8ad0');
      this.pins = MAP_PINS.map(([fx, fy]) => [Math.round(fx * W), Math.round(fy * H)]);
      for (let k = 0; k < 4; k++) { const [x0, y0] = this.pins[k], [x1, y1] = this.pins[k + 1]; for (let s = 0; s <= 20; s++) px.rect(g, Math.round(x0 + (x1 - x0) * s / 20), Math.round(y0 + (y1 - y0) * s / 20), 3, 3, '#d8c8a0'); }
      const max = Math.min(4, profile.story.chapter - 1);
      CHAPTERS.forEach((C, k) => {
        const [x, y] = this.pins[k], open = k <= max, foc = k === this.i, stars = profile.story.stars[C.n] || 0;
        px.disc(g, x, y, foc ? 9 : 7, open ? (foc ? '#ffd23a' : '#f4f0e0') : '#6a6a6a'); px.disc(g, x, y, foc ? 6 : 4, open ? GROUNDS[C.ground].accent : '#3a3a3a');
        E.font.text(g, String(C.n), x, y - 3, '#ffffff', { align: 'center' });
        for (let s = 0; s < 3; s++) E.font.text(g, '★', x - 8 + s * 8, y + 10, s < stars ? '#ffd23a' : '#3a3a3a', { align: 'center' });
      });
      // the minibus
      const bi = Math.floor(this.bus), bf = this.bus - bi, a = this.pins[bi], b = this.pins[Math.min(4, bi + 1)], bx = a[0] + (b[0] - a[0]) * bf, by = a[1] + (b[1] - a[1]) * bf;
      px.rect(g, bx - 8, by - 20, 16, 8, '#2f6b3a'); px.rect(g, bx - 8, by - 24, 16, 4, '#f2ead8'); px.disc(g, bx - 5, by - 12, 2, '#1a1a1a'); px.disc(g, bx + 5, by - 12, 2, '#1a1a1a');
      const C = CHAPTERS[this.i];
      panel(g, 8, 8, W - 16, 52, { rule: GROUNDS[C.ground].accent });
      E.font.text(g, 'CHAPTER ' + C.n + ': ' + upper(C.title), 14, 13, '#ffd23a', { scale: 2, shadow: '#000' });
      E.font.text(g, upper(TEAM[C.opp].name) + ' AT ' + upper(GROUNDS[C.ground].name), 14, 31, '#f4f0e0', { shadow: '#000' });
      E.font.wrap(C.blurb, W - 40).slice(0, 2).forEach((l, k) => E.font.text(g, l, 14, 41 + k * 9, '#c8c0e0'));
      C.goals.forEach(([gname], k) => { const got = (profile.story.best[C.n] || []).includes(k); E.font.text(g, (got ? '★ ' : '• '.replace('•', '•') + ' ') + upper(gname), 14, H - 50 + k * 10, got ? '#ffd23a' : '#f4f0e0', { shadow: '#000' }); });
      footer(g, r, [['left', 'Choose'], ['confirm', 'Play'], ['cancel', 'Back']]);
    });
  }
};
// ---------------------------------------------------------------- cutscenes: a vignette on the ground with the cast posed
SC.cutscene = {
  enter(d) {
    this.d = d; this.i = 0; this.t = 0; this.hold = 0; this.finished = false; this.caption = null; this.waitCap = false; music('tea');
    this.talk = new E.Dialog(game, { lines: 3, place: 'bottom', voice: null, border: '#ffd23a', bg: ['#1a1430', '#0e0c1c'] });
    this.next();
  },
  next() {
    const L = this.d.lines;
    if (this.i >= L.length) { this.done(); return; }
    const [who, text] = L[this.i++];
    if (who === '*') { this.caption = text.replace(/\{[^}]*\}/g, ''); this.capT = 0; this.talk.close(); this.waitCap = true; return; }
    this.caption = null; this.waitCap = false;
    const V_ = VOICES[who] || VOICES.aubrey;
    this.talk.say(text, { name: V_.name, portrait: portraitRig(who), onDone: () => this.next() });
    say(text, who); this.who = who;
  },
  done() { if (this.finished) return; this.finished = true; const n = this.d.next; this.talk.close(); if (n) n(); else game.go('storymap'); },
  update(dt) {
    this.t += dt; const I = game.input;
    // hold confirm for a second to skip the scene (or cancel)
    if (I.down('confirm') || I.down('shot')) this.hold += dt; else this.hold = 0;
    if (this.hold > 1 || I.pressed('cancel')) { this.done(); return; }
    if (this.waitCap) { this.capT += dt; if (this.capT > 3 || (this.capT > .4 && (I.pressed('confirm') || I.pressed('shot') || (I.clicked && I.clicked())))) this.next(); return; }
    this.talk.update(dt);
  },
  draw(r) {
    const gid = this.d.ground || 'green';
    drawBackdrop(r, 1 / 60, { gid, time: gid === 'dome' ? 'night' : 'day' });
    // the speakers stand together near the pavilion
    r.overlay(g => {
      const W = r.W, H = r.H; px.blend(g, .25, 'normal', () => px.rect(g, 0, 0, W, H, '#0a0818'));
      if (this.d.title) bigTitle(g, this.d.title, W / 2, 14, { scale: 2 });
      if (this.caption) { panel(g, 20, H / 2 - 24, W - 40, 40, { rule: '#c8c0e0' }); E.font.wrap(this.caption, W - 60).slice(0, 3).forEach((l, k) => E.font.text(g, l, W / 2, H / 2 - 16 + k * 10, '#f4f0e0', { align: 'center', shadow: '#000' })); }
      if (this.hold > 0) { const a = Math.round(this.hold * 16); E.font.text(g, 'SKIPPING', W - 50, 12, '#ffd23a'); px.rect(g, W - 50, 22, a * 2, 2, '#ffd23a'); }
      prompts(g, game.input, [['confirm', 'Next (hold: skip)']], W - 6, 30, { align: 'right', color: '#c8c0e0' });
    });
    this.talk.draw(r);
  }
};
// ---------------------------------------------------------------- results: banner, player of the match, the report
SC.results = {
  enter(d) {
    this.m = d.m; this.d = d; this.t = 0; music(null);
    const m = this.m, story = m.cfg.mode === 'story';
    this.report = matchReport(m);
    this.pom = playerOfMatch(m);
    if (story) this.stars = storyStars(m);
    if (m.won && m.cfg.mode === 'quick') { const opp = m.cfg.teams[1]; if (!profile.unlocked.includes(opp)) profile.unlocked.push(opp); }
    profile.stats.matches++; saveProfile();
    const items = [];
    if (m.highlights && m.highlights.length) items.push({ label: '▸ Highlights', act: () => { this.hl = { k: 0, t: 0 }; } });
    if (story) {
      if (m.won) items.push({ label: 'Continue', act: () => storyWin(m.cfg.chapter) });
      else items.push({ label: 'Retry', act: () => startChapter(m.cfg.chapter) }, { label: 'Retry on Village difficulty', act: () => startChapter(m.cfg.chapter, { difficulty: 'village' }) }, { label: 'Map', act: () => game.go('storymap') });
    } else if (m.cfg.mode === 'showdown') items.push({ label: 'Enter your initials', act: () => game.go('table', { mode: m.cfg.showdown, score: showdownScore(m) }) });
    else items.push({ label: 'Rematch', act: () => { const c = Object.assign({}, m.cfg, { seed: (Math.random() * 1e9) >>> 0, humans: m.humans }); startMatch(c); } }, { label: 'Main Menu', act: () => game.go('title', { menu: true }) });
    this.menu = new BigMenu(items, {});
    if (m.won) sting('win'); else if (m.result && m.result.winner !== null) sting('lose');
  },
  update(dt) {
    this.t += dt; hudStep(dt);
    if (this.hl) { this.hl.t += dt; const H_ = this.m.highlights[this.hl.k]; if (!H_ || game.input.pressed('confirm') || game.input.pressed('cancel')) { this.hl = null; game.input.consumeAll(); } else if (this.hl.t > H_.frames.length / 60 / .6) { this.hl.k++; this.hl.t = 0; if (this.hl.k >= this.m.highlights.length) this.hl = null; } return; }
    if (this.t > .6) this.menu.update(dt);
  },
  draw(r) {
    const m = this.m;
    if (this.hl) { const H_ = m.highlights[this.hl.k]; m.replay = { on: true, from: 0, to: H_.frames.length - 1, t: this.hl.t * 1.2, dur: 99, shot: 'wide' }; const save = m.rec; m.rec = H_.frames; director(m, 1 / 60); drawWorld(r, m, 1 / 60); m.rec = save; m.replay = null; r.overlay(g => { px.rect(g, 6, 8, 64, 11, '#c82a32'); E.font.text(g, 'HIGHLIGHTS', 38, 10, '#ffffff', { align: 'center' }); E.font.text(g, H_.label, r.W / 2, r.H - 20, '#ffd23a', { align: 'center', scale: 2, shadow: '#000' }); }); return; }
    drawBackdrop(r, 1 / 60, { gid: m.g.id, time: m.time === 'night' ? 'night' : 'dusk' });
    r.overlay(g => {
      const W = r.W, H = r.H; px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, W, H, '#0a0818'));
      const res = m.result || { text: 'Match abandoned' }, win = res.winner !== null && res.winner !== undefined ? m.teams[res.winner] : null;
      bigTitle(g, win ? (m.isHumanSideIdx() < 0 || m.won || m.cfg.mode === 'versus' ? upper(win.code) + ' WIN!' : 'DEFEAT') : 'TIED!', W / 2, 8, { scale: 3, colors: m.won || !m.humans[0].length ? ['#ffffff', '#ffd23a', '#e8803a'] : ['#ffffff', '#c8c8d0', '#6a6a7a'] });
      E.font.text(g, upper(res.text), W / 2, 36, '#f4f0e0', { align: 'center', shadow: '#000' });
      // the three numbers
      m.inn.filter(I => !I.so).forEach((I, k) => E.font.text(g, m.teams[I.bat].code + ' ' + I.runs + '/' + I.wkts + ' (' + m.overStr(I) + ')', W / 2 + (k ? 60 : -60), 48, '#c8c0e0', { align: 'center', shadow: '#000' }));
      if (this.pom) { panel(g, 10, 60, 120, 52, { rule: '#ffd23a' }); rigFor(this.pom.p, 'bat').drawPortrait(g, 14, 64, 30, { zoom: 3, turn: .4, bg: '#1a1430' }); E.font.text(g, 'PLAYER OF', 48, 64, '#ffd23a'); E.font.text(g, 'THE MATCH', 48, 73, '#ffd23a'); E.font.text(g, this.pom.p.short.slice(0, 12), 48, 84, '#f4f0e0'); E.font.text(g, this.pom.line, 14, 100, '#c8c0e0'); }
      const lines = E.font.wrap(this.report, Math.min(260, W - 160)).slice(0, 5);
      panel(g, 140, 60, Math.min(270, W - 150), 14 + lines.length * 9, { rule: '#c8c0e0' });
      E.font.text(g, 'THE KERFUFFLE ALMANACK REPORTS', 146, 63, '#c8c0e0');
      lines.forEach((l, k) => E.font.text(g, l, 146, 73 + k * 9, '#f4f0e0'));
      if (this.stars) { this.stars.goals.forEach(([n, got], k) => E.font.text(g, (got ? '★ ' : '- ') + upper(n), 146, 124 + k * 10, got ? '#ffd23a' : '#8a84a8', { shadow: '#000' })); }
      this.menu.draw(g, W / 2, H - 70, 220, { lh: 16, scale: 1 });
      footer(g, r, [['confirm', 'Select']]);
    });
  }
};
function playerOfMatch(m) {
  let best = null, bs = -1;
  for (const I of m.inn) { for (const c of I.cards) { const s = c.runs + c.sixes * 2; if (s > bs) { bs = s; best = { p: c.p, line: c.runs + (c.out ? '' : '*') + ' (' + c.balls + ')' }; } } for (const id in I.bowl) { const b = I.bowl[id], s = b.wkts * 12 - b.runs * .3; if (s > bs) { bs = s; best = { p: m.squads[1 - I.bat].find(p => p.id === id), line: b.wkts + ' for ' + b.runs }; } } }
  return best && best.p ? best : null;
}
function matchReport(m) {
  const res = m.result; if (!res) return 'Play was abandoned, and the tea was drunk regardless.';
  const w = res.winner, I0 = m.inn[0], I1 = m.inn[1] || I0;
  const winI = w === null ? I1 : m.inn.find(I => I.bat === w) || I0, loseI = w === null ? I0 : m.inn.find(I => I.bat !== w) || I1;
  const top = winI.cards.slice().sort((a, b) => b.runs - a.runs)[0];
  let tb = null; for (const id in loseI.bowl) { const b = loseI.bowl[id]; if (!tb || b.wkts > tb.wkts) tb = Object.assign({ id }, b); }
  const tbP = tb ? m.squads[1 - loseI.bat].find(p => p.id === tb.id) : null;
  const tgt = m.targetsHit.length ? m.g.targets.find(t => t.id === m.targetsHit[0]).name : 'the scorer\'s flask';
  const chaos = m.chaosLog.length ? CHAOS[m.chaosLog[0]].name.toLowerCase() : 'a pigeon';
  const v = { winner: w === null ? '' : m.teams[w].name, loser: w === null ? '' : m.teams[1 - w].name, topBat: top ? top.p.name : 'the tail', topRuns: top ? top.runs : 0, notOut: top && !top.out ? ' not out' : '', sixes: top ? top.sixes : 0, sixPl: top && top.sixes === 1 ? '' : 'es',
    collapse: loseI.wkts >= 3 ? 'a collapse of ' + loseI.wkts + ' wickets' : 'a sluggish start', topBowl: tbP ? tbP.name : 'the bowling', wkts: tb ? tb.wkts : 0, bowlRuns: tb ? tb.runs : 0, target: I1.target || I0.runs + 1, spare: (I1.overs * 6 - I1.legal) + ((I1.overs * 6 - I1.legal) === 1 ? ' ball' : ' balls'), chaosThing: chaos, margin: res.short.replace('won by ', ''), targetHit: tgt };
  let tpl = w === null ? REPORTS.tie : (m.inn.find(I => I.so) ? REPORTS.tie : (w === I1.bat && I1.target ? REPORTS.chase : (tb && tb.wkts >= 2 ? REPORTS.bowlWin : (Math.abs(I0.runs - I1.runs) <= 3 ? REPORTS.close : REPORTS.bigWin))));
  let s = fmt(tpl, v);
  if (m.targetsHit.length) s += ' One blow went through ' + tgt + '.';
  return s;
}
on('chaos', d => { if (COMM.m && d.id) COMM.m.chaosLog.push(d.id); });
// ---------------------------------------------------------------- About / Credits (paged)
SC.about = {
  enter(d) { this.p = d && d.page || 0; this.t = 0; this.fromEnding = d && d.ending; music('tea'); },
  update(dt) {
    this.t += dt; const I = game.input, n = ABOUT_PAGES.length;
    if (I.repeat('right', .3, .15) || I.pressed('run')) { this.p = (this.p + 1) % n; sfx('select'); }
    if (I.repeat('left', .3, .15) || I.pressed('back')) { this.p = (this.p - 1 + n) % n; sfx('select'); }
    const c = I.clicked && I.clicked(); if (c) { if (c[0] > game.W * .66) { this.p = (this.p + 1) % n; sfx('select'); } else if (c[0] < game.W * .33) { this.p = (this.p - 1 + n) % n; sfx('select'); } }
    if (I.pressed('cancel') || I.pressed('confirm')) game.go(this.fromEnding ? 'title' : 'extras', { menu: true });
  },
  draw(r) {
    drawBackdrop(r, 1 / 60, { time: 'dusk' });
    r.overlay(g => {
      const W = r.W, H = r.H, P = ABOUT_PAGES[this.p]; px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, W, H, '#0a0818'));
      bigTitle(g, P[0], W / 2, 8, { scale: 2 });
      let y = 30; const cw = Math.min(W - 24, 400);
      for (const line of P[1]) { const wr = E.font.wrap(line, cw); for (const l of wr) { if (y > H - 30) break; E.font.text(g, l, W / 2 - cw / 2, y, line.startsWith('•') ? '#c8c0e0' : '#f4f0e0', { shadow: '#000' }); y += 9; } y += 2; }
      E.font.text(g, (this.p + 1) + ' / ' + ABOUT_PAGES.length, W / 2, H - 28, '#8a84a8', { align: 'center' });
      footer(g, r, [['left', 'Page'], ['cancel', 'Back']]);
    });
  }
};
