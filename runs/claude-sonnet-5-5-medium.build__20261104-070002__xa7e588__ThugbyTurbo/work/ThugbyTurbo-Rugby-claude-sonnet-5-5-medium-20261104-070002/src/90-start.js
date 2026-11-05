/* THUGBY TURBO — start-up: the game, settings, standard menu additions, boot steps, debug handle. */
(async function start() {
  const inSession = !!(HUB && HUB.active);
  detectTouchOnly();
  const SET = (key, label, options, value, group = 'Game', extra = {}) => Object.assign({ key, label, options, value, group, type: 'select', apply: (g, v) => { TT.settings[extra.map || key] = v; } }, extra);
  const game = TT.game = new E.Game({
    canvas: 'screen', res: 'ps1', expand: true, view: 'broadcast', views: CAM_VIEWS, input: KEYS, id: 'thugby-turbo',
    autoPause: !inSession, corner: !inSession ? undefined : false, fullscreen: inSession ? false : undefined,
    menu: {
      items: inSession ? [] : [['DEV MODE', () => { TT.devMode = true; TT.devOpenReq = true; game.resume(); }]],
      quit: inSession ? false : 'title',
      settings: [
        SET('glyphs2', 'Controller buttons', [['playstation', 'PlayStation ✕ ○ □ △'], ['xbox', 'Xbox A B X Y']], 'playstation', 'Display', { map: 'glyphs' }),
        SET('difficulty', 'Difficulty', ['Rookie', 'Pro', 'Legend'], 'Pro'),
        SET('autoSwitch', 'Auto-switch player', ['Assisted', 'Full', 'Manual'], 'Assisted'),
        { key: 'passAssist', label: 'Pass assist', value: true, group: 'Game', apply: (g, v) => { TT.settings.passAssist = v; } },
        { key: 'holdTurbo', label: 'Hold to turbo (off: toggle)', value: true, group: 'Game', apply: (g, v) => { TT.settings.holdTurbo = v; } },
        { key: 'refView', label: 'Show the referee\'s view', value: true, group: 'Game', apply: (g, v) => { TT.settings.refView = v; } },
        SET('replays', 'Instant replays', ['Big moments', 'All tries', 'Off'], 'Big moments'),
        { key: 'suddenDeath', label: 'Sudden death when level', value: true, group: 'Game', apply: (g, v) => { TT.settings.suddenDeath = v; } },
        { key: 'halfSecs', label: 'Default half length (s)', value: 120, min: 60, max: 300, step: 30, group: 'Game', apply: (g, v) => { TUNE.base.halfLength = v; TUNE.v.halfLength = v; } }
      ],
      controls: { x: 'Sidestep / Tackle', sq: 'Fend / Dive tackle', ci: 'Kick / Switch to ball', tri: 'Super', l1: 'Pass up / Switch up', r1: 'Pass down / Switch down', turbo: 'Turbo', click: 'Pass / Switch (mouse)', rclick: 'Kick toward cursor', cam: 'Camera view' }
    }
  });
  addEventListener('keydown', e => { if (e.code === 'Backquote') TT.devToggleReq = true; });
  game.debug = { snapshot() { const s = TT.S; return { scene: game.scene && game.scene.name, phase: s && s.phase, half: s && s.half, clock: s && +s.clock.toFixed(1), score: s && s.score, hype: s && s.hype.map(Math.round), possession: s && s.poss, ball: s && { x: Math.round(s.ball.x), y: Math.round(s.ball.y), z: Math.round(s.ball.z), st: s.ball.st, holder: s.ball.holder ? s.ball.holder.id : -1 }, events: s && s.events.slice(-6).map(e => e.n), counts: s && s.counts, dev: DEV.open, attract: !!(s && s.cfg.mode === 'attract'), touchOnly: TT.touchOnly, settings: TT.settings }; }, go(scene, d) { game.go(scene, d); }, tune(k, v) { TUNE.set(k, v); }, step(sec) { game.advance(sec); }, force(name) { if (FORCE[name]) FORCE[name](); }, devPanel(on) { TT.devMode = true; DEV.open = on !== false; } };
  window.__thugby.game = game; window.__thugby.TT = TT; window.__thugby.sim = { get S() { return S; }, startScrum, startLineout, startPenalty, startConversion, giveBall, place, scoreTry, cardPlayer, refDown, doKickoff, FORCE };
  let net = null; if (inSession) net = await hubBoot();
  if (net) SCENES.match.pausable = false;
  game.start({ scene: net ? 'match' : 'title', data: net ? { mode: 'online', seed: net.seed } : undefined, scenes: SCENES,
    boot: { title: 'THUGBY TURBO', steps: [['Dressing the commentators', () => { getPortraits(); }], ['Reading the league tables', () => { getRecords(); CUPSAVE(); }], ['Tuning the balance sliders', () => { TUNE.applyLayers(); }]] } });
  if (net) { setTimeout(() => HUB.ready(), 200); }
})();
