/* Boot: build the game, define audio, scenes, the test handle (game.debug), then start. */
(() => {
const BB = globalThis.BB, E = BB.E, clamp = BB.clamp;

BB.snapshot = () => {
  const game = BB.game, H = BB.H, ctx = BB.curSite;
  return {
    scene: game.sceneName || (game.scene && game.scene.name) || '', phase: H.phase, qi: H.qi, seg: H.seg ? H.seg.t + ':' + (H.seg.id || H.seg.key || '') : '',
    site: ctx ? { id: ctx.id, t: Math.round(ctx.t * 100) / 100, state: ctx.state, kills: ctx.kills.length, escaped: ctx.escaped.length, spawnIdx: ctx.spawnIdx, animals: ctx.animals.map(a => ({ id: a.id, sex: a.sex, age: a.age, mode: a.mode, dead: a.dead, x: Math.round(a.x * 10) / 10, y: Math.round(a.y * 10) / 10, hp: a.hp, target: a.target })), critters: ctx.critters.length, results: ctx.results ? ctx.results.map(r => r.total) : null } : null,
    players: BB.players.map(p => ({ idx: p.idx, score: p.score, siteScore: p.siteScore, rounds: p.rounds, chambered: p.chambered, benched: p.benched, kills: p.kills, shots: p.shots, hits: p.hits, rx: Math.round(p.rx), ry: Math.round(p.ry), bot: !!p.bot, calls: p.calls, scoped: p.scoped })),
    tuning: Object.assign({}, BB.T), dev: { open: BB.dev.open, god: BB.dev.god }
  };
};
BB.stateHash = () => { const ctx = BB.curSite; if (!ctx) return 0; let h = 0; for (const a of ctx.animals) h = (h * 31 + Math.round(a.x * 100) + Math.round(a.y * 100) * 7 + (a.dead ? 1 : 0)) | 0; for (const p of BB.players) h = (h * 31 + p.siteScore + p.shots) | 0; return h; };

BB.installDebug = (game) => {
  const find = (id) => { const c = BB.curSite; return c ? c.animals.find(a => a.id === id) : null; };
  game.debug = {
    snapshot: () => BB.snapshot(),
    stateHash: () => BB.stateHash(),
    aimAt(pi, actorId, zone = 'heart') {
      const c = BB.curSite, p = BB.players[pi], a = find(actorId); if (!c || !p || !a) return false;
      const pr = BB.project(c.view, a.x, a.y, a.z); if (!pr) return false;
      const z = BB.animalZones(a, pr[0], pr[1], pr[2]).find(q => q.kind === zone); if (!z) return false;
      const cx = z.cx !== undefined ? z.cx : (z.x0 + z.x1) / 2, cy = z.cy !== undefined ? z.cy : (z.y0 + z.y1) / 2;
      p.rx = cx - p.sx; p.ry = cy - p.sy; p.ax = cx; p.ay = cy; return true;
    },
    fire(pi) { const c = BB.curSite, p = BB.players[pi]; if (c && p) { p.ax = p.rx + p.sx; p.ay = p.ry + p.sy; BB.fireFor(p, c); } },
    pump(pi) { const c = BB.curSite, p = BB.players[pi]; if (c && p) BB.tryPump(p, c); },
    scope(pi, on) { const p = BB.players[pi]; if (p) { p.forceScope = on; p.scoped = on; p.scopeT = on ? 1 : 0; } },
    call(pi) { const c = BB.curSite, p = BB.players[pi]; if (c && p) BB.callFor(p, c); },
    goto(siteId, mode = 'single') {
      const g = game, s = BB.SITES[siteId]; const ps = [BB.makePlayer(0, { input: g.input })];
      BB.pendingRun = { mode: s.range ? 'range' : mode, o: {}, players: ps, queue: [{ t: s.bonus ? 'bonus' : 'site', id: siteId, hunt: s.hunt }], seed: 5 };
      g.go('hunt', null, { fade: 0 });
    },
    skip() { const c = BB.curSite; if (c) c.t = c.timeLimit; },
    bagAll() { BB.devBagAll(); },
    bot(on, opts = {}) { const p = BB.players[0]; if (!p) return; if (!on) { p.bot = null; return; } p.bot = BB.makeBot(opts.skill || 'average', !!opts.cheat); p.bot.rx = p.rx; p.bot.ry = p.ry; p.bot.auto = true; },
    seed(n) { BB.RNG.reseed(n); },
    tuning(k, v) { if (k in BB.T) BB.T[k] = v; return BB.T[k]; },
    startRun(mode, o) { BB.startRun(mode, o || {}); },
    startParty(n, skill = 'average') { BB.party = [{ type: 'human', input: game.input }]; for (let i = 1; i < n; i++) BB.party.push({ type: 'bot', skill }); BB.startRun('party', { hunt: 'hollow' }); },
    BB
  };
};
BB.main = async (opts = {}) => {
  const hubOn = !opts.headless && typeof AIHub !== 'undefined' && AIHub.active;
  const extra = hubOn ? { menu: false, autoPause: false } : undefined;
  const game = BB.makeGame({ headless: opts.headless, extra });
  BB.loadTuning(); BB.loadRecords();
  const scenes = BB.buildScenes(game);
  scenes.hunt = BB.buildHuntScene(game); scenes.attract = BB.buildAttractScene(game); scenes.hubcard = BB.buildHubCard(game);
  BB.installDebug(game);
  BB.defineAudio(game.audio);
  if (game.screen) game.screen.scale = 'fill';
  let hub = false; if (hubOn) hub = await BB.hubConnect();
  /* the pause menu 'Dev mode' needs the hunt scene's handles */
  game.start({ scene: hub ? 'hubcard' : 'title', scenes, boot: { title: 'BIG BUCK HUNT-OFF', steps: [['Loading the lodge', () => { BB.loadRecords(); }], ['Tuning the rifle', () => { BB.loadTuning(); }]] } });
  return game;
};
if (typeof window !== 'undefined' && !globalThis.BB_NO_AUTOSTART) BB.main({});
})();
