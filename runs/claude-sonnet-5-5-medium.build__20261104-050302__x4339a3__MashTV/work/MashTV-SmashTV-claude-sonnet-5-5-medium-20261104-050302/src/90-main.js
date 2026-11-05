// MASH TV: boot. Creates the game, registers scenes and settings, handles deep links and the debug handle.
(function boot() {
  const win = typeof window !== 'undefined' ? window : globalThis;
  const hub = win.AIHub, inSession = !!(hub && hub.active);
  MT.inSession = inSession;
  MT.loadTunes();
  const hash = (typeof location !== 'undefined' && location.hash) ? location.hash.slice(1) : '';
  const opts = {}; hash.split('&').forEach(p => { const [k, v] = p.split('='); if (k) opts[k] = v === undefined ? true : v; });
  MT.hashOpts = opts;
  const game = new E.Game({
    canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['threequarter', 'topdown'], input: MT.MENU, id: 'mashtv', headless: typeof document === 'undefined' ? true : undefined,
    corner: !inSession, autoPause: !inSession, backGesture: !inSession, fullscreen: inSession ? 'button' : undefined,
    menu: {
      items: inSession ? [] : [['Dev mode', () => MT.openDev && MT.openDev()], ['Episode map', () => MT.openMapOverlay && MT.openMapOverlay()], ['How to play', () => MT.openHowtoOverlay && MT.openHowtoOverlay()]],
      settings: [
        { key: 'aimAssist', label: 'Aim assist (controller)', value: true, help: 'Nudges the right stick toward enemies close to your aim' },
        { key: 'autoFire', label: 'Auto-fire with the right stick', value: true },
        { key: 'camView', label: 'Camera', options: ['Studio', 'Overhead'], value: 'Studio', help: 'Studio is the three-quarter camera; Overhead is straight down' },
        { key: 'subtitles', label: 'Subtitles', value: true },
        { key: 'chatter', label: 'Host chatter', options: ['Normal', 'Less', 'Off'], value: 'Normal' },
        { key: 'confetti', label: 'Confetti amount', options: ['Party', 'Tasteful'], value: 'Party' }],
      controls: MT.CONTROL_NAMES, quit: inSession ? false : 'title' }
  });
  MT.game = game; win.MT.game = game;
  try { MT.shell = new E.Shell(game, { theme: { ink: '#fff7e8', paper: 'rgba(20,8,34,.94)', accent: '#ffcc33', danger: '#ff4d6d', line: 'rgba(255,204,51,.35)', titleFont: 'Impact, "Arial Black", system-ui' } }); } catch (e) { game.fail && game.fail('shell theme', e); }
  MT.installInputHook(game); MT.idle.hook();
  MT.cab = new E.Arcade(game, { id: 'mashtv', hud: false, idle: 10 });
  game.input.touchEnabled = false;
  const scenes = {};
  for (const k in MT.scenes) { const s = Object.assign({ touch: [] }, MT.scenes[k]); scenes[k] = s; }
  if (MT.net && MT.net.scenes) for (const k in MT.net.scenes) scenes[k] = Object.assign({ touch: [] }, MT.net.scenes[k]);
  if (MT.attract && MT.attract.scene) scenes.attract = Object.assign({ touch: [] }, MT.attract.scene);
  MT.sceneTable = scenes;
  // debug handle
  game.debug = {
    snapshot() {
      const w = MT.worldNow, run = MT.run; const byKind = {}; if (w) for (const e of w.enemies) if (e.alive) byKind[e.kind] = (byKind[e.kind] || 0) + 1;
      return { scene: game.sceneName, mode: run && run.mode, ep: run && run.ep, room: w && w.rm && w.rm.id, phase: w && w.phase, wave: w && w.waveI, alive: w ? w.alive() : 0, byKind, bullets: w ? w.fShots.list.length : 0, pickups: w ? w.pickups.length : 0,
        R: w && w.rat.R, X: w && w.rat.X, keys: run && run.keys, prime: w && w.rat.prime,
        players: w ? w.cs.map(c => ({ slot: c.slot, x: Math.round(c.x), y: Math.round(c.y), hp: c.hp, lives: c.lives, cash: c.cash, wpn: c.wpn, state: c.state, bombs: c.bombs, kills: c.kills })) : [],
        boss: w && w.boss ? { kind: w.boss.kind, phase: w.boss.phase, sub: w.boss.sub, stage: w.boss.stage, parts: w.boss.parts.map(p => [p.id, Math.round(p.hp), p.alive]) } : null, errors: game.errors.length };
    },
    warp(target, o) { return MT.warp(target, o); }, spawn(kind, n, where) { return MT.devSpawn && MT.devSpawn(kind, n, where); }, give(kind, slot) { const w = MT.worldNow; if (w) w.giveWeapon(w.cs[slot || 0], kind); },
    cheat(name, on) { MT.cheats[name] = on === undefined ? true : on; }, tune(k, v) { MT.setTune(k, v); }, resetTunes() { MT.resetTunes(); },
    killAll() { const w = MT.worldNow; if (w) for (const e of w.enemies) if (e.alive) w.killEnemy(e, { slot: 0 }); }, clearRoom() { const w = MT.worldNow; if (w) { for (const e of w.enemies) if (e.alive) { e.noCash = true; w.killEnemy(e, null); } for (const d of Object.values(w.doors)) d.queue.length = 0; w.spawnQ.length = 0; w.wavesDone = true; w.waveI = (w.rm.waves || []).length; } },
    chooseExit(dir) { const w = MT.worldNow; if (w) { w.exitPicked = dir; w.exitT = .01; } }, teleport(slot, x, y) { const w = MT.worldNow; const c = w && w.cs[slot]; if (c) { c.x = c.body.x = x; c.y = c.body.y = y; } },
    bot(slot, o) { const w = MT.worldNow; const c = w && w.cs[slot]; if (c) { c.kind = 'bot'; c.botOpts = o || {}; } }, addBot(look) { return MT.addBot && MT.addBot(look); },
    netFake(h) { win.AIHub = h; MT.hubOverride = h; }, seed(n) { MT.seedAll(n); }, stateHash() { return MT.stateHash(); }
  };
  game.stateHash = () => game.debug.stateHash();
  MT.stateHash = function () { const w = MT.worldNow; if (!w) return 0; let h = 2166136261; const mix = v => { h ^= Math.round(v * 100) | 0; h = Math.imul(h, 16777619); }; for (const c of w.cs) { mix(c.x); mix(c.y); mix(c.hp); mix(c.cash); } for (const e of w.enemies) { mix(e.x); mix(e.y); mix(e.hp); } mix(w.rat.R); mix(w.time); return h >>> 0; };
  // warp (deep links, dev mode, tests)
  MT.warp = function (target, o = {}) {
    const ROOM = MT.ROOMS[target]; const players = []; const n = o.players || 1;
    const mkRun = (extra) => { const slots = []; for (let i = 0; i < n; i++) slots.push({ slot: i, look: i, bot: o.bot, input: i === 0 ? game.input : game.players[i] || null }); const run = MT.newRun(Object.assign({ mode: o.mode || 'test', diff: o.diff || 'CONTESTANT', players: slots, seed: o.seed || MT.seed }, extra)); if (o.keys) run.keys = o.keys; return run; };
    if (ROOM) { mkRun({ ep: ROOM.ep }); if (o.god) MT.cheats.god = true; for (const c of MT.run.cs) { if (o.lives) c.lives = o.lives; if (o.bot) c.kind = 'bot'; } game.go('play', { room: target, entry: o.entry || 'S' }, { fade: 0 }); return true; }
    const T = { title: () => game.go('title'), lobby: () => game.go('lobby', { diff: 'CONTESTANT' }), howto: () => game.go('howto'), scores: () => game.go('scores', {}), about: () => game.go('about'), attract: () => game.go('attract'), episodes: () => game.go('episodes'), difficulty: () => game.go('difficulty'),
      coldopen: () => { mkRun({}); game.go('coldOpen'); }, ep1: () => { mkRun({ ep: 1 }); game.go('episodeCard', { ep: 1 }); }, ep2: () => { mkRun({ ep: 2 }); game.go('episodeCard', { ep: 2 }); }, ep3: () => { mkRun({ ep: 3 }); game.go('episodeCard', { ep: 3 }); },
      recap1: () => { fakeRecap(1); }, recap2: () => { fakeRecap(2); }, recap3: () => { fakeRecap(3); }, gameover: () => { mkRun({}); game.go('gameover'); }, initials: () => { const r = mkRun({}); r.cs[0].cash = 123456; game.go('initials', { list: [0] }); },
      endinga: () => { mkRun({}); game.go('ending', { which: 'A' }); }, endingb: () => { mkRun({}); game.go('ending', { which: 'B' }); }, credits: () => { mkRun({}); game.go('credits', { which: 'A' }); },
      greenroom: () => { const r = mkRun({ ep: 3 }); r.keys = 6; game.go('play', { room: 'GR', entry: 'S' }, { fade: 0 }); }, card: () => { MT.net && MT.net.previewCard && MT.net.previewCard(); }, lightning: () => { MT.net && MT.net.previewLightning && MT.net.previewLightning(o); } };
    const fakeRecap = ep => { const r = mkRun({ ep }); r.cs.forEach((c, i) => { c.cash = 80000 + i * 20000; r.epStart[c.slot] = 0; for (const p of MT.EPISODES[ep].prizes.slice(0, 3 + i)) c.prizes.push({ name: p.name, value: p.value, joke: p.joke, ep }); }); game.go('recap', { ep }); };
    if (T[target]) { T[target](); return true; }
    return false;
  };
  const boot = { title: 'MASH TV', version: MT.VERSION, steps: [['Warming up the spotlights', () => { for (const k in MT.SETS) MT.SETS[k].floorTex(100, 100); }], ['Tuning the laugh track', () => { for (const k in MT.SONGS) MT.SONGS[k].tracks.length; }]], messages: ['Polishing the jumbotron', 'Teaching the goons to clap'] };
  game.start({ scenes, scene: 'title', boot });
  if (inSession && MT.net) MT.net.begin(game);
  else if (opts.room || opts.boss || opts.dev || opts.card || opts.lightning || Object.keys(opts).length) {
    const o = { seed: opts.seed ? +opts.seed : undefined, players: opts.players ? +opts.players : 1, bot: opts.bot ? true : false, god: !!opts.god };
    game.booted && game.booted.then ? game.booted.then(() => deep(o)) : deep(o);
  }
  function deep(o) {
    const key = ['room', 'boss', 'dev', 'card', 'lightning', 'greenroom', 'recap', 'ending', 'gameover', 'initials', 'credits', 'attract', 'title', 'lobby', 'howto', 'scores', 'about', 'continue', 'ep', 'coldopen'].find(k => k in opts); if (!key) return;
    let target = key;
    if (key === 'room') target = opts.room; else if (key === 'boss') target = ['1-B', '2-B', '3-B'][+opts.boss - 1]; else if (key === 'dev') { target = '1-1'; } else if (key === 'recap') target = 'recap' + opts.recap; else if (key === 'ending') target = 'ending' + opts.ending; else if (key === 'ep') target = 'ep' + opts.ep;
    MT.warp(target, o);
    if (key === 'dev') setTimeout(() => MT.openDev && MT.openDev(), 1200);
    if (key === 'continue') { MT.warp('1-1', o); setTimeout(() => { const s = game.scene; if (s && s.w) { for (const c of MT.run.cs) { c.lives = 0; c.state = 'out'; } if (s.allOut) s.allOut(); } }, 1500); }
  }
  MT.booted = true;
})();
})();
