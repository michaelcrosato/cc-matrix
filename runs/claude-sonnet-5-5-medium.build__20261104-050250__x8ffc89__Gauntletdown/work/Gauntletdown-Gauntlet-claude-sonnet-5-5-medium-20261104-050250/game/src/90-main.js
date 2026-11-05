/* Start-up: the game object, standard menu adjustments, settings, scenes. */
tuneLoad();
const HUB = typeof AIHub !== 'undefined' && AIHub.active;
const HOWUI = { open: false, page: 0 };
function makeGame() {
  const menu = HUB ? { quit: 'title' } : {
    items: () => {
      const a = [['How to Play', () => { HOWUI.open = true; HOWUI.page = 0; game.resume(); }], ['Dev Tools', () => { DEVUI.open = true; DEVUI.i = 0; DEVUI.scroll = 0; DEVUI.age = 0; game.resume(); }]];
      if (W && game.scene === game.scenes.play) a.push(['Restart floor', () => { game.resume(); game.go('play', { step: W.step }, { fade: .3 }); }]);
      if (game.pausedBy > 1 && W) { const p = game.pausedBy; a.push(['Drop out (P' + p + ')', () => { const i = W.heroes.findIndex(h => h.input === game.players[p - 1]); if (i >= 0) { W.heroes.splice(i, 1); RUN.heroes = W.heroes; game.removePlayer(p); W.heroes.forEach((h, k) => h.slot = k); W.noJoinUntil = W.time + 1.5; game.input.consumeAll(); } game.resume(); }]); }
      return a;
    },
    controls: { fire: 'Fire', magic: 'Magic', plant: 'Plant', view: 'Camera view' }, quit: 'title'
  };
  game = new E.Game(Object.assign({ canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], input: GD_INPUT, bg: '#05030a', menu },
    HUB ? { corner: false, autoPause: false, backGesture: false, fullscreen: 'button' } : {}));
  return game;
}
function defineSettings() {
  const S = game.settings, def = (key, label, options, tip, apply) => S.define({ key, label, type: typeof OPT[key] === 'boolean' ? 'toggle' : 'select', options, value: OPT[key], group: 'Game', help: tip, apply: (g, v) => { OPT[key] = v; saveOpts(); if (apply) apply(v); } });
  def('cameraView', 'Camera view', ['Three-quarter', 'Top-down', 'Isometric'], 'The rules are the same in every view.', v => { game.setView && game.setView({ 'Three-quarter': 'threequarter', 'Top-down': 'topdown', 'Isometric': 'iso' }[v]); });
  def('difficulty', 'Difficulty', ['Easy', 'Normal', 'Hard']);
  def('aimAssist', 'Aim assist', ['Off', 'Low', 'High']);
  def('stickFires', 'Right stick fires', null);
  def('allyStun', 'Ally stun (from floor 6)', null);
  def('captions', 'Narrator captions', null);
  def('tips', 'Tips', null);
  def('names', 'Player names', null);
  def('lighting', 'Enhanced lighting', null);
  S.define({ key: 'voices', label: 'Voices', type: 'toggle', value: E.store.get('gauntletdown-voices', true), group: 'Sound', apply: (g, v) => { Voice.on = !!v; E.store.set('gauntletdown-voices', !!v); } });
  if (S.glyphs === 'auto') S.set('glyphs', 'playstation');
  Voice.on = true;
}
function makeDebug() {
  game.debug = {
    snapshot() { return { scene: game.sceneName, step: W && W.step, time: W && +W.time.toFixed(1), heroes: W ? W.heroes.map(h => ({ cls: h.C.id, hp: Math.round(h.hp), score: h.score, down: h.down, x: Math.round(h.x), y: Math.round(h.y), keys: h.keys, flasks: h.flasks })) : [], mons: W ? W.mons.filter(m => !m.dead).length : 0, gens: W ? W.gens.filter(g => !g.dead).length : 0, boss: W && W.boss ? Math.round(W.boss.hp) : null, descend: W && !!W.descend, errors: game.errors.length }; },
    W: () => W, RUN, DEV, TUNE, OPT, sim: simStep, startRun: (cls = [0]) => { RUN.heroes = cls.map((c, i) => makeHero(i, c, i === 0 ? game.input : game.players[i] || null)); RUN.step = 0; RUN.seed = 1234; RUN.mode = 'solo'; RUN.active = true; RUN.tipsSeen = {}; game.go('play', { step: 0 }, { fade: 0 }); },
    api: { devRows, DEVUI, hudPanel, drawFloorCard, buildWorld, makeHero, makeBot, simStep, damageMon, killMon, damageGen, pickup, hurtHero, useFlask, openDoorGroup, newMonster, spawnTithe, ringBell, genFloor, solvable, PLAN, CLASSES, MON, GEN, dropItem, heroFall, heroRise, fireShot, say, placeHeroes, shootItem, flaskBlast, bossPhaseCheck, continueRun, TUNE_DEF, getScores, addScore, qualifies, aboutPages, HOWTO, REALMS, LINES, SONGS, Voice, SFX_DEFS, newPuppet: null },
    botAll: on => { if (W) for (const h of W.heroes) h.bot = on ? makeBot(true) : null; RUN.botAll = on; },
    warp: s => devWarp(s), say, bot: on => { DEV.bot = on; if (W && W.heroes[0]) W.heroes[0].bot = on ? makeBot(true) : null; }
  };
}
function boot() {
  makeGame();
  game.screenGround = () => {
    const r = game.r; if (!r || !game.view.toGround) return null;
    const cx = game.cam.x, cy = game.cam.y; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const [sx, sy] of [[0, 0], [r.W, 0], [0, r.H], [r.W, r.H]]) { const p = game.view.toGround(cx + sx, cy + sy); if (!p) return null; const px_ = p.x !== undefined ? p.x : p[0], py_ = p.y !== undefined ? p.y : p[1]; x0 = Math.min(x0, px_); x1 = Math.max(x1, px_); y0 = Math.min(y0, py_); y1 = Math.max(y1, py_); }
    return { x0, x1, y0, y1 };
  };
  const scenes = { title: SCENE_TITLE, menu: SCENE_MENU, select: SCENE_SELECT, howto: SCENE_HOWTO, scores: SCENE_SCORES, about: SCENE_ABOUT, over: SCENE_OVER, ending: SCENE_ENDING, play: SCENE_PLAY, attract: SCENE_ATTRACT };
  for (const k in scenes) if (!scenes[k].input) scenes[k].input = GD_INPUT;
  if (typeof netScenes === 'function') Object.assign(scenes, netScenes());
  game.start({
    scene: HUB && typeof netScenes === 'function' ? 'netboot' : 'title', scenes,
    boot: { title: TITLE, steps: [['Digging the Gaunt', () => { defineSfx(); defineSettings(); }], ['Setting the table', () => { for (const c of CLASSES) c._r = c.rig(); }], ['Waking the ghosts', () => { makeDebug(); }]] }
  });
  window.__gd = { game, get W() { return W; }, RUN, DEV, TUNE, OPT };
}
boot();
