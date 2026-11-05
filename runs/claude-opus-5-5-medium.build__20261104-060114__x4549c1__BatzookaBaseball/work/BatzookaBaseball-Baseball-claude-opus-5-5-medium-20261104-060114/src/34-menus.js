/* SCREENS: the title (with its mode menu), Options, Team Select with joining (1-4 players), the match scene, results,
 * the Playbook (help per context), the pause menu's items, and the save data. */
const SAVE_DEF = () => ({ v: 1, tour: { stop: 0, beaten: [], wins: 0, losses: 0, started: false, done: false }, fb: 0, upgrades: { lumber: 0, glove: 0, cleats: 0, arm: 0, hype: 0 }, unlocked: false, training: { done: [] }, derbyBest: 0 });
let SAVE = SAVE_DEF();
BZ.save = () => SAVE;
function initSaves() {
  const S = game.saves; if (!S) return;
  S.write = () => ({ data: JSON.parse(JSON.stringify(SAVE)), place: SAVE.tour.done ? 'TOUR COMPLETE' : 'TOUR STOP ' + (SAVE.tour.stop + 1), level: fmt(SAVE.fb) + ' FB' });
  S.read = s => { SAVE = Object.assign(SAVE_DEF(), s.data || {}); SAVE.tour = Object.assign(SAVE_DEF().tour, SAVE.tour); SAVE.upgrades = Object.assign(SAVE_DEF().upgrades, SAVE.upgrades); BZ.justLoaded = true; };
}
const hubActive = () => typeof AIHub !== 'undefined' && AIHub && AIHub.active;
const teamsUnlocked = () => TEAM_ORDER.filter(id => !TEAMS[id].locked || SAVE.unlocked || SAVE.tour.stop >= 4 || SAVE.tour.done);
const parksUnlocked = () => PARK_ORDER.filter(id => id !== 'megadome' || SAVE.unlocked || SAVE.tour.stop >= 4 || SAVE.tour.done);

/* ---- settings (the engine's screens show them; the game reads game.settings.x) ---- */
function defineSettings() {
  const D = (key, label, value, options, group = 'Game', help) => game.settings.define(Object.assign({ key, label, value, group, help }, options ? { options } : {}));
  D('difficulty', 'Difficulty', 'pro', [['rookie', 'Rookie'], ['pro', 'Pro'], ['allstar', 'All-Star'], ['batzooka', 'Batzooka']]);
  D('innings', 'Exhibition innings', 3, [[1, '1'], [3, '3'], [5, '5'], [9, '9']]);
  D('tourLength', 'Tour game length', 'standard', [['standard', 'Standard (3 innings)'], ['quick', 'Quick (1 inning)']]);
  D('mercy', 'Mercy rule (10 runs)', true); D('comeback', 'Comeback Boost', true); D('rhubarbs', 'Rhubarbs', true);
  D('derbyLength', 'Derby length', 'time', [['time', '2:00'], ['outs', '10 outs']]);
  D('batAssist', 'Batting assist', 'hints', [['off', 'Off'], ['hints', 'Timing hints'], ['big', 'Big sweet spot']], 'Assists');
  D('pitchAssist', 'Pitching assist', 'off', [['off', 'Off'], ['auto', 'Auto-aim']], 'Assists');
  D('fielding', 'Fielding', 'assisted', [['manual', 'Manual'], ['assisted', 'Assisted'], ['auto', 'Auto']], 'Assists');
  D('baserunning', 'Baserunning', 'auto', [['manual', 'Manual'], ['auto', 'Auto']], 'Assists');
  D('timingFeedback', 'Timing feedback', true, null, 'Display');
  D('zone', 'Strike zone', 'pitch', [['always', 'Always'], ['pitch', 'During the pitch'], ['off', 'Off']], 'Display');
  D('plateCam', 'Plate Cam', 'classic', [['classic', 'Classic'], ['close', 'Close']], 'Display');
  D('fieldCam', 'Field camera', 'broadcast', [['broadcast', 'Broadcast'], ['high', 'High'], ['iso', 'Isometric']], 'Display');
  D('replays', 'Replays', 'big', [['big', 'Big plays'], ['off', 'Off']], 'Display');
  D('commentary', 'Commentary', 'on', [['on', 'On'], ['big', 'Big plays only'], ['off', 'Off']], 'Sound');
  game.settings.define({ key: 'voices', label: 'Voices', type: 'slider', value: .8, min: 0, max: 1, step: .05, group: 'Sound' });
  D('keepTune', 'Keep dev tuning between visits', false, null, 'Developer');
}

/* ---- the title ---- */
const TITLE = { menu: null, sub: null, dot: null };
function titleMenu() {
  const go = (s, d) => () => game.go(s, d);
  TITLE.menu = new BigMenu([
    { label: 'CONTINUE', sub: 'Pick up the Tour', act: () => { const l = game.saves.latest && game.saves.latest(); if (l) { game.saves.load(l.slot); } game.go('tourMap'); } },
    { label: 'TOUR', sub: 'Save Kernel Field', act: go('tourMenu') },
    { label: 'EXHIBITION', sub: '1-4 players', act: go('teamSelect') },
    { label: 'BATZOOKA DERBY', sub: 'Home-run derby', act: go('derbySetup') },
    { label: 'SPRING TRAINING', sub: 'Learn the game', act: go('lessons') },
    { label: 'OPTIONS', sub: 'Settings · Controls · Playbook', act: () => { TITLE.sub = optionsMenu(); } },
    { label: 'ABOUT', sub: 'Credits and source', act: go('about') }
  ], { w: 168, h: 18, gap: 3, noSub: true });
}
function optionsMenu() {
  return new BigMenu([
    { label: 'SETTINGS', act: () => { TITLE.sub = null; game.menu('settings'); } },
    { label: 'CONTROLS', act: () => { TITLE.sub = null; game.menu('controls'); } },
    { label: 'PLAYBOOK', act: () => { TITLE.sub = null; PLAYBOOK.open = true; PLAYBOOK.page = 0; } },
    { label: 'BACK', act: () => { TITLE.sub = null; } }
  ], { w: 168, h: 18, gap: 3, onBack: () => { TITLE.sub = null; } });
}
SCENES.title = {
  input: KEYS, camera: { zoom: false },
  enter() {
    if (!TITLE.menu) titleMenu(); MENUBG.park = 'kernel'; music('title'); IDLE.t = 0; M = BZ.M = null; game.weather = { kind: 'leaves', amount: .1, wind: .2 };
    game.allowJoin(false); for (let i = game.players.length - 1; i >= 1; i--) game.removePlayer(game.players[i]);
    const has = game.saves && game.saves.latest && game.saves.latest(); TITLE.menu.items[0].hidden = !has; if (!has && TITLE.menu.i === 0) TITLE.menu.i = 1;
    if (!TITLE.dot && !HEADLESS) { TITLE.dot = makeRig(TEAMS.COM.roster[0], 'bat'); }
  },
  update(dt) {
    commonTick(dt);
    if (idleTick(dt) && !PLAYBOOK.open) return game.go('attract');
    if (PLAYBOOK.open) return playbookUpdate(dt);
    const I = game.input;
    if (BZ.touchOnly) { const c = I.clicked && I.clicked(); if (c && TITLE.touchBtn && c[0] >= TITLE.touchBtn.x && c[0] < TITLE.touchBtn.x + TITLE.touchBtn.w && c[1] >= TITLE.touchBtn.y && c[1] < TITLE.touchBtn.y + TITLE.touchBtn.h) game.menu('settings'); return; }
    if (TITLE.sub) TITLE.sub.update(I, dt); else TITLE.menu.update(I, dt);
    if (TITLE.dot) TITLE.dot.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: game.time % 6 < 1.5 ? 'cheer' : null, expr: 'smile' });
  },
  draw(r) {
    menuBackdrop(r, .35);
    r.overlay(g => {
      const W = r.W, H = r.H, top = 12;
      E.font.title(g, 'BATZOOKA', W / 2, top - 4, { scale: 4, colors: GOLD, align: 'center', depth: 3 });
      E.font.title(g, 'BASEBALL', W / 2, top + 28, { scale: 2, colors: ['#ffffff', '#c8d8ff', '#6a8adf'], align: 'center', depth: 2 });
      px.blend(g, .7, 'add', () => { for (let i = 0; i < 26; i++) { const x = W / 2 - 110 + i * 8.5 + Math.sin(game.real * 8 + i) * 2, y = top + 48 + Math.sin(i * .5 + game.real * 3) * 2; px.disc(g, x, y, 2.6 - i / 13, i % 3 ? '#ff8a2a' : '#ffe060'); } });
      if (TITLE.dot) { try { TITLE.dot.draw(g, Math.round(W * .17), Math.round(H * .78), E.VIEWS.side); } catch (e) { /* first frame */ } }
      if (BZ.touchOnly) {
        panel(g, W / 2 - 120, H / 2 - 34, 240, 96, { border: '#ffe680' });
        text(g, 'Controller or keyboard required', W / 2, H / 2 - 24, '#ffffff', { align: 'center' });
        // a controller and a keyboard, drawn
        px.rect(g, W / 2 - 60, H / 2 - 8, 40, 18, '#c8c8d8'); px.disc(g, W / 2 - 52, H / 2 + 1, 3, '#2a2c3a'); px.disc(g, W / 2 - 28, H / 2 + 1, 3, '#2a2c3a');
        px.rect(g, W / 2 + 14, H / 2 - 6, 48, 16, '#c8c8d8'); for (let i = 0; i < 8; i++) px.rect(g, W / 2 + 17 + i * 5.5, H / 2 - 3, 4, 4, '#2a2c3a');
        TITLE.touchBtn = { x: W / 2 - 50, y: H / 2 + 26, w: 100, h: 26 }; E.ui.box(g, TITLE.touchBtn.x, TITLE.touchBtn.y, 100, 26, { bg: ['#4a3a7a', '#2a1c4a'], border: '#ffe680' }); text(g, 'SETTINGS', W / 2, H / 2 + 35, '#ffffff', { align: 'center' });
      } else {
        const mn = TITLE.sub || TITLE.menu; mn.draw(g, W / 2, top + 56);
        if (mn.cur && mn.cur.sub) text(g, mn.cur.sub, W / 2, H - 38, '#ffe680', { align: 'center' });
        legend(g, W, H, [['confirm', 'SELECT'], TITLE.sub ? ['cancel', 'BACK'] : null]);
      }
      text(g, 'v' + BZ.version + ' · ' + (E.versionLabel ? E.versionLabel() : ''), W - SAFE, H - 10, '#6a6c88', { align: 'right' });
    });
    if (PLAYBOOK.open) playbookDraw(r);
  }
};

/* ---- Team Select (Exhibition): two big cards, park, innings, difficulty; players join and pick sides ---- */
const TS = { away: 'COM', home: 'HCK', park: 'barnacle', innings: 3, diff: 'pro', sides: {}, menu: null, rigs: {} };
function cycle(list, cur, d) { const i = list.indexOf(cur); return list[(i + d + list.length) % list.length]; }
SCENES.teamSelect = {
  input: KEYS, camera: { zoom: false },
  enter() {
    MENUBG.park = TS.park; IDLE.t = 0; music('menu'); TS.innings = game.settings.innings || 3; TS.diff = game.settings.difficulty || 'pro';
    game.allowJoin({ max: 4, onJoin: (I, n) => { TS.sides[n] = n % 2 ? 1 : 0; sfx('ok'); } }); TS.sides[1] = TS.sides[1] === undefined ? 0 : TS.sides[1];
    TS.menu = new BigMenu([
      { label: 'AWAY', adjust: d => { TS.away = cycle(teamsUnlocked(), TS.away, d); }, value: () => TEAMS[TS.away].name },
      { label: 'HOME', adjust: d => { TS.home = cycle(teamsUnlocked(), TS.home, d); TS.park = TEAMS[TS.home].park; MENUBG.park = TS.park; }, value: () => TEAMS[TS.home].name },
      { label: 'PARK', adjust: d => { TS.park = cycle(parksUnlocked(), TS.park, d); MENUBG.park = TS.park; }, value: () => PARKS[TS.park].name },
      { label: 'INNINGS', adjust: d => { TS.innings = cycle([1, 3, 5, 9], TS.innings, d); }, value: () => String(TS.innings) },
      { label: 'DIFFICULTY', adjust: d => { TS.diff = cycle(DIFF_ORDER, TS.diff, d); }, value: () => DIFF[TS.diff].name },
      { label: 'P1 SIDE', adjust: d => { TS.sides[1] = TS.sides[1] === 0 ? 1 : TS.sides[1] === 1 ? -1 : 0; }, value: () => TS.sides[1] === 0 ? 'AWAY' : TS.sides[1] === 1 ? 'HOME' : 'WATCH (CPU VS CPU)' },
      { label: 'PLAY BALL!', act: () => startExhibition() }
    ], { w: 190, h: 18, gap: 3, onBack: () => game.go('title') });
  },
  exit() { game.allowJoin(false); },
  update(dt) {
    commonTick(dt); if (idleTick(dt) && game.players.length === 1) return game.go('attract');
    TS.menu.update(game.input, dt);
    for (let i = 1; i < game.players.length; i++) { const I = game.players[i], n = I.player; if (I.pressed('left')) TS.sides[n] = 0; if (I.pressed('right')) TS.sides[n] = 1; if (I.pressed('cancel')) { game.removePlayer(I); delete TS.sides[n]; } }
    for (const id of [TS.away, TS.home]) { const rig = TS.rigs[id] || (TS.rigs[id] = HEADLESS ? null : makeRig(TEAMS[id].captain, 'bat')); if (rig) rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 + Math.sin(game.time) * .6, expr: 'smile' }); }
  },
  draw(r) {
    menuBackdrop(r, .6);
    r.overlay(g => {
      const W = r.W, H = r.H; title(g, 'EXHIBITION', W / 2, 8, 3);
      [TS.away, TS.home].forEach((id, s) => {
        const T = TEAMS[id], cw = Math.min(100, (W - 190) / 2 - 18), x = s ? W - SAFE - cw : SAFE, y = 36;
        panel(g, x, y, cw, 110, { border: T.chip }); text(g, s ? 'HOME' : 'AWAY', x + cw / 2, y + 4, '#a8a8c8', { align: 'center' });
        if (TS.rigs[id]) try { TS.rigs[id].draw(g, Math.round(x + cw / 2), y + 74, E.VIEWS.side); } catch (e) { /* not posed yet */ }
        text(g, T.name, x + cw / 2, y + 80, '#ffffff', { align: 'center', scale: 1 });
        text(g, 'POW ' + '★'.repeat(T.stars[0]), x + cw / 2, y + 90, '#ffe680', { align: 'center' }); text(g, 'SPD ' + '★'.repeat(T.stars[1]), x + cw / 2, y + 99, '#ffe680', { align: 'center' });
        text(g, 'PIT ' + '★'.repeat(T.stars[2]), x + cw / 2, y + 108, '#ffe680', { align: 'center' });
      });
      TS.menu.draw(g, W / 2, 38);
      // the players' cards, slid to their sides
      const ps = game.players; ps.forEach((I, i) => { const n = I.player, sd = TS.sides[n], x = sd === 0 ? SAFE + 8 + i * 26 : sd === 1 ? W - SAFE - 34 - i * 26 : W / 2 - 13, y = 152;
        E.ui.box(g, x, y, 24, 18, { bg: I.color || E.PLAYER_COLORS[i], border: '#ffffff' }); text(g, 'P' + n, x + 12, y + 5, '#ffffff', { align: 'center' }); });
      para(g, ps.length < 4 ? 'More players: START on a free pad, or 2 on the keyboard. P2-P4: ←/→ picks a side.' : 'Four players in!', W / 2 - 150, 176, 300, '#c8c8d8');
      legend(g, W, H, [['confirm', 'SELECT'], [null, '←→ CHANGE'], ['cancel', 'BACK']]);
    });
  }
};
function sideCtrl() {
  const ctrl = [[null, null], [null, null]];
  for (const I of game.players) { const sd = TS.sides[I.player]; if (sd === 0 || sd === 1) { if (!ctrl[sd][0]) ctrl[sd][0] = I; else if (!ctrl[sd][1]) ctrl[sd][1] = I; } }
  return ctrl;
}
function startExhibition() {
  const cfg = { mode: 'exhibition', away: TS.away, home: TS.home, park: TS.park, innings: TS.innings, difficulty: TS.diff, ctrl: sideCtrl() };
  BZ.lastExhibition = cfg; game.go('match', cfg);
}

/* ---- the match scene: exhibition, tour and lessons all play here ---- */
SCENES.match = {
  pausable: true, input: KEYS, view: 'broadcast', camera: { zoom: false },
  enter(cfg) {
    BZ.matchCfg = cfg = cfg || BZ.matchCfg || { away: 'COM', home: 'HCK' };
    const s = game.settings;
    newMatch(Object.assign({ difficulty: s.difficulty, mercy: s.mercy, comeback: s.comeback, rhubarbs: s.rhubarbs, innings: s.innings }, cfg, { onEnd: cfg.onEnd || (m => game.after(2.2, () => game.go('results', { cfg }))) }));
    if (cfg.boss) M.boss = { speed: 1, circuit: 0, rally: false };
    if (cfg.tune) Object.assign(TUNE, cfg.tune);
    music(M.park.song); game.setView(fieldView()); game.weather = M.park.weather; CAMS.x = HX; CAMS.y = HY - 300; CAMS.z = 1;
    if (cfg.lesson) lessonEnter(cfg.lesson);
    game.timeScale = TUNE.gameSpeed;
    if (cfg.after) cfg.after(M);
  },
  exit() { game.timeScale = 1; RADIO.who = null; game.weather = null; if (BZ.matchCfg && BZ.matchCfg.tune) BZ.resetTune(); },
  update(dt) {
    commonTick(dt); radioTick(dt);
    if (BZ.dev && BZ.dev.open) return devUpdate(dt);
    if (PLAYBOOK.open) return playbookUpdate(dt);
    if (!M) return;
    if (M.lesson && M.lesson.introOpen) { const I = game.input; if (I.pressed('confirm') || I.pressed('south')) { I.consumeAll(); M.lesson.introOpen = false; } return; }
    if (M.lesson) lessonTick(dt);
    matchUpdate(dt); animateRigs(dt); broadcastFocus(dt); hudTick(dt);
    if (M.fielders.some(f => f.human) && defHumanInput() && defHumanInput().pressed('l1') && !holderF()) switchFielder();
    pinTick();
  },
  draw(r) { drawMatchWorld(r); drawHUD(r); if (M && M.lesson) lessonDraw(r);  if (PLAYBOOK.open) playbookDraw(r); devDraw(r); pinDraw(r); },
  back() { if (PLAYBOOK.open) { PLAYBOOK.open = false; return true; } if (BZ.dev && BZ.dev.open) { BZ.dev.open = false; return true; } return false; }
};
function switchFielder() {
  const b = M.ball; if (!b) return; const cur = M.fielders.find(f => f.human);
  const list = M.fielders.slice().sort((a, c) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c.x - b.x, c.y - b.y));
  const nxt = list[(list.indexOf(cur) + 1) % 3]; for (const F of M.fielders) F.human = false; nxt.human = true; nxt.job = 'chase'; nxt.react = 0; sfx('menu');
}

/* ---- results ---- */
const RES = { menu: null, cfg: null, stars: [], fbShown: 0 };
SCENES.results = {
  input: KEYS, camera: { zoom: false },
  enter(d) {
    RES.cfg = d.cfg; const m = M; RES.m = m; RES.fbShown = 0; music(null); sting(m.winner === humanSide() || humanSide() < 0 ? 'victory' : 'defeat'); MENUBG.park = m.parkId;
    // the three stars: hits, homers, strikeouts
    const all = []; for (const t of m.teams) for (const p of t.def.roster) { const s = m.stats[p.id]; if (s) all.push({ p, sc: s.h * 2 + s.hr * 4 + s.rbi * 2 + s.k * 1.5 + s.sb, line: (s.ab ? s.h + '-' + s.ab : '') + (s.hr ? ', ' + s.hr + ' HR' : '') + (s.rbi ? ', ' + s.rbi + ' RBI' : '') + (s.k && p.pos === 'P' ? s.k + ' K' : '') }); }
    RES.stars = all.sort((a, b) => b.sc - a.sc).slice(0, 3);
    const items = d.cfg.mode === 'tour' ? [{ label: 'CONTINUE', act: () => d.cfg.next && d.cfg.next(m) }] :
      [{ label: 'REMATCH', act: () => game.go('match', BZ.lastExhibition || d.cfg) }, { label: 'CHANGE TEAMS', act: () => game.go('teamSelect') }, { label: 'TITLE', act: () => game.go('title') }];
    RES.menu = new BigMenu(items, { w: 112, h: 20, gap: 4, cols: items.length, onBack: d.cfg.mode === 'tour' ? null : () => game.go('title') });
  },
  update(dt) { commonTick(dt); RES.menu.update(game.input, dt); RES.fbShown = Math.min(RES.fbTarget || 0, RES.fbShown + dt * 900); },
  draw(r) {
    menuBackdrop(r, .65);
    r.overlay(g => {
      const W = r.W, H = r.H, m = RES.m, hs = humanSide();
      title(g, 'FINAL', W / 2, 10, 3);
      text(g, m.teams[0].def.name + '  ' + m.teams[0].runs + '   -   ' + m.teams[1].runs + '  ' + m.teams[1].def.name, W / 2, 40, '#ffffff', { align: 'center', scale: 2 });
      if (hs >= 0) E.font.title(g, m.winner === hs ? 'YOU WIN!' : 'TOUGH LOSS', W / 2, 60, { scale: 2, colors: m.winner === hs ? GREEN : RED, align: 'center' });
      text(g, 'R ' + m.teams[0].runs + '  H ' + m.teams[0].hits + '  E ' + m.teams[0].errors + '      R ' + m.teams[1].runs + '  H ' + m.teams[1].hits + '  E ' + m.teams[1].errors, W / 2, 82, '#c8c8d8', { align: 'center' });
      RES.stars.forEach((s, i) => { const x = W / 2 - 165 + i * 112, y = 96; panel(g, x, y, 106, 52, { border: '#ffe680' }); text(g, '★'.repeat(3 - i), x + 53, y + 4, '#ffe680', { align: 'center' }); const rig = s.p.rigs && (s.p.rigs.bat || s.p.rigs.field); if (rig) try { rig.drawPortrait(g, x + 4, y + 14, 34, { bg: TEAMS[s.p.team].chip }); } catch (e) { /* none */ } text(g, s.p.name.replace(/"[^"]*" /, '').slice(0, 14), x + 42, y + 18, '#ffffff'); text(g, s.line.slice(0, 16), x + 42, y + 30, '#c8c8d8'); });
      if (RES.cfg.mode === 'tour' && RES.fbTarget) text(g, '+' + fmt(RES.fbShown) + ' FAN BUCKS', W / 2, 156, '#ffe680', { align: 'center', scale: 2 });
      RES.menu.draw(g, W / 2, H - 52);
      legend(g, W, H, [['confirm', 'SELECT']]);
    });
  }
};
const humanSide = () => M ? M.teams.findIndex(t => t.ctrl.cap) : -1;

/* ---- the Playbook: one page per context, the buttons in the player's own glyphs ---- */
const PLAYBOOK = { open: false, page: 0 };
const PB_PAGES = [
  ['BATTING', [['up', 'Aim the sweet spot (stick, WASD or the mouse)'], ['south', 'Contact swing: big sweet spot'], ['west', 'Power swing: small spot, big hits'], ['north', 'Bunt: hold to square around'], ['r1', 'Arm the BATZOOKA (meter full)'], ['l1', 'Hold + a base button: steal']]],
  ['PITCHING', [['l1', '+ a base button: pickoff throw'], ['south', 'Heater (keyboard: 1)'], ['east', 'Breaking ball (2)'], ['west', 'Off-speed (3)'], ['north', 'Signature pitch (4)'], ['r1', 'Team super pitch (5), meter full'], ['up', 'Aim during the windup; press again on the ring; steer early in flight']]],
  ['FIELDING', [['up', 'Run (the chaser runs by itself on Assisted)'], ['east', 'Throw to 1st (keyboard 1, or click the base)'], ['north', 'Throw to 2nd (2)'], ['west', 'Throw to 3rd (3)'], ['south', 'Throw home (4)'], ['r2', 'Dive'], ['r1', 'Jump; climb the wall near the fence'], ['l1', 'Switch fielder']]],
  ['RUNNING', [['r1', 'Before the pitch: take an extra lead'], ['r1', 'All runners go'], ['l1', 'All runners back'], ['l2', 'Turbo'], ['r1', '+ L2 with half a meter: Afterburners'], ['east', 'With R1 or L1: only the runner to that base']]],
  ['SUPERS', [['r1', 'BATZOOKA: the crowd fills the meter; arm it, then swing'], ['r1', 'Super pitch: every team has one'], ['r1', '+ a base: LASER ARM throw (half a meter)'], ['l2', 'Turbo for runners and fielders']]],
  ['RHUBARB', [['south', 'Punch combo'], ['west', 'Shove'], ['north', 'Grab and toss'], ['east', 'Dodge'], ['up', 'Move. Most knockdowns in 12 seconds wins +50 meter']]],
  ['HOUSE RULES', [[null, 'What you CAN\'T do in Batzooka Baseball:'], [null, 'No balks, no infield fly rule, no appeals'], [null, 'No check swings: every swing is committed'], [null, 'No dropped third strikes, no intentional walks'], [null, 'No substitutions but a pitching change (pause menu)'], [null, 'No arguing with the umpire. Believe us, we tried.']]]
];
function playbookUpdate(dt) {
  const I = game.input;
  if (I.pressed('right') || I.pressed('r1')) { PLAYBOOK.page = (PLAYBOOK.page + 1) % PB_PAGES.length; sfx('menu'); }
  if (I.pressed('left') || I.pressed('l1')) { PLAYBOOK.page = (PLAYBOOK.page + PB_PAGES.length - 1) % PB_PAGES.length; sfx('menu'); }
  const c = I.clicked && I.clicked(); if (c) { PLAYBOOK.page = (PLAYBOOK.page + (c[0] > game.W / 2 ? 1 : -1) + PB_PAGES.length) % PB_PAGES.length; }
  if (I.pressed('cancel') || I.pressed('confirm')) { I.consumeAll(); PLAYBOOK.open = false; sfx('back'); }
}
function playbookDraw(r) {
  r.overlay(g => {
    const W = r.W, H = r.H, [name, rows] = PB_PAGES[PLAYBOOK.page], I = game.input;
    px.blend(g, .75, 'normal', () => px.rect(g, 0, 0, W, H, '#05060c'));
    title(g, 'PLAYBOOK', W / 2, 10, 2); text(g, '← ' + name + ' →   ' + (PLAYBOOK.page + 1) + '/' + PB_PAGES.length, W / 2, 30, '#ffe680', { align: 'center', scale: 2 });
    panel(g, W / 2 - 170, 50, 340, rows.length * 18 + 12);
    rows.forEach(([a, t], i) => { const y = 58 + i * 18; let x = W / 2 - 160; if (a) x += glyph(g, I, a, x, y, 11) + 6; text(g, t, x, y + 2, '#ffffff'); });
    legend(g, W, H, [[null, '←→ PAGE'], ['cancel', 'CLOSE']]);
  });
}

/* ---- the pause menu's own items (hidden in AI Hub sessions) ---- */
BZ.pauseItems = () => {
  const hub = hubActive() && BZ.hub && BZ.hub.phase !== 'off';
  const inMatch = game.sceneName === 'match' && M;
  const defHuman = inMatch && M.teams[1 - M.half].ctrl.cap && M.teams[1 - M.half].bullpen.length;
  return [
    !hub && ['Playbook', () => { game.resume(); PLAYBOOK.open = true; PLAYBOOK.page = 0; }],
    !hub && defHuman && ['Pitching Change', () => { game.resume(); pitchingChange(1 - M.half); }],
    !hub && inMatch && ['Restart', () => { game.resume(); game.go('match', BZ.matchCfg); }],
    !hub && ['Dev Mode', () => { game.resume(); devOpen(); }],
    !hub && game.sceneName !== 'title' && ['Quit to title', () => { game.resume(); game.go('title'); }]
  ].filter(Boolean);
};
