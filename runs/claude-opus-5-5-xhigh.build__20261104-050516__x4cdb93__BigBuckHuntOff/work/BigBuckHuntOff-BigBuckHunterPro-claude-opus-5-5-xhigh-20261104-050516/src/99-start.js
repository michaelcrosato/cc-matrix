// 99-start: the test handle (game.debug), the state hash, deep links, the boot steps and the start.
const r1 = v => Math.round(v * 10) / 10;
game.debug = {
  snapshot() {
    const H = G.hunt, seg = H && H.seg;
    return { scene: game.sceneName, segment: seg ? seg.kind : null, mode: H ? H.mode : null, hunt: H ? H.huntId : null, site: H && H.site ? H.site.id : null, siteTime: H && H.site ? r1(H.site.t) : 0,
      sitePhase: H && H.site ? H.site.phase : null, attract: G.attract ? G.attract.clip : null, devOpen: G.ui.screen === 'dev', paused: game.paused, ui: G.ui.screen,
      players: H ? H.players.map(p => ({ n: p.n, device: p.device, score: p.score, rounds: p.rifle.rounds, chambered: p.rifle.chambered, benched: p.benched, scoped: p.scope.up, breath: r1(p.scope.breath), calls: p.call.charges, reticle: [Math.round(p.rx), Math.round(p.ry)], bot: !!p.bot })) : [],
      actors: H ? H.actors.map(a => ({ id: a.id, kind: a.kind, sex: a.sex, cat: a.cat, state: a.state, x: Math.round(a.x / M), y: Math.round(a.y / M), z: r1(a.z / M), hp: r1(a.hp), wounded: a.wounds > 0, bagger: a.bagger, visible: a.visible, trophy: a.trophy || null, target: a.target })) : [],
      bucksLeft: H && H.site ? H.site.S.bucksLeft : 0, results: H && H.site ? H.site.results.map(r => ({ n: r.n, score: r.score, shots: r.shots, hits: r.hits, kills: r.kills.length, stars: r.stars })) : [],
      siteResults: H ? H.siteResults.map(s => ({ id: s.id, reason: s.endReason, scores: s.results.map(r => r.score), stars: s.results.map(r => r.stars) })) : [],
      trophy: H && H.trophyInfo ? { id: H.trophyInfo.id, seen: H.trophyInfo.seen, bagged: H.trophyInfo.bagged } : null, bonus: H && H.bonusResult ? { id: H.bonusResult.id, score: H.bonusResult.score, perfect: H.bonusResult.perfect } : null,
      cam: H ? { yaw: r1(H.cam.yaw / DEG), pitch: r1(H.cam.pitch), fov: r1(H.cam.fov) } : null, timeScale: game.timeScale,
      hub: G.hubLink ? G.hubLink.snapshot() : { active: HUB_ON },
      records: Records.d ? { trophies: Object.keys(Records.d.trophies).filter(k => Records.d.trophies[k].bagged), best: Object.assign({}, Records.d.best), badge: Records.d.badge, champion: Records.d.champion } : null,
      queue: H ? H.queue.map(q => q.kind) : [], errors: game.errors.length, touchOnly: G.touchOnly };
  },
  hunt: () => G.hunt,
  actor(id) { const H = G.hunt; return H && H.actors.find(a => a.id === id); },
  /** put a player's reticle on an actor's zone (the swayed point, so a scoped shot lands there) */
  aimAt(pn, actorId, zone = 'heart') {
    const H = G.hunt, p = H.players[pn - 1], a = typeof actorId === 'string' ? this.actor(actorId) : actorId; if (!p || !a) return false;
    const z = a.zones(), v = z.find(q => q.id === zone) || z.find(q => q.id === 'body') || z[0]; if (!v) return false;
    const c = v.kind === 'sphere' ? v.a : [(v.a[0] + v.b[0]) / 2, (v.a[1] + v.b[1]) / 2, (v.a[2] + v.b[2]) / 2];
    H.lens.setup({ x: H.cam.x, y: H.cam.y, z: H.cam.z, yaw: H.cam.yaw, pitch: H.cam.pitch, fov: H.cam.fov }, H.W, H.H);
    const q = H.lens.project(c[0], c[1], c[2]); if (!q) return false;
    const s = p.scope.raise > .05 ? p.scope.sway() : [0, 0]; p.rx = q[0] - s[0]; p.ry = q[1] - s[1]; return true;
  },
  fire(pn = 1) { const p = G.hunt.players[pn - 1]; G.hunt.trigger(p); },
  pump(pn = 1) { G.hunt.players[pn - 1].rifle.pump(); },
  scope(pn = 1, on = true) { const p = G.hunt.players[pn - 1]; p.scope.toggle = on; p.scope.update(0, on, false); p.scope.raise = on ? 1 : 0; },
  breath(pn = 1, on = true) { G.hunt.players[pn - 1].input.hold('breath', on); },
  call(pn = 1) { G.hunt.useCall(G.hunt.players[pn - 1]); },
  goto(huntId, kind, id) { if (!G.hunt || G.hunt.huntId !== huntId) { startHunt({ mode: 'single', hunt: huntId }); game.advance(.6); } G.hunt.skipTo(kind, id); },
  spawn(kind, o = {}) { const H = G.hunt; if (!H || !H.site) return null; return H.site.spawn(kind, Object.assign({ at: o.at || [0, 40], path: o.path, orders: o.orders || [['hold']], hidden: false }, o)); },
  skip() { if (G.hunt) G.hunt.skip(); },
  bagAll(pn = 1) { const H = G.hunt; if (!H) return 0; let n = 0; for (const a of H.actors.slice()) if (a.alive && a.target && a.cat === 'animal') { a.state = a.state === 'hidden' ? 'move' : a.state; const R = { kind: 'animal', actor: a, zone: 'heart', t: 100, point: [a.x, a.y, a.z + 16], dist: Math.hypot(a.x - H.cam.x, a.y - H.cam.y) / M, shot: { p: H.players[pn - 1], ray: H.lens.ray(H.W / 2, H.H / 2) } }; applyShot(H, R); n++; } return n; },
  bot(on = true, o = {}) { const H = G.hunt; if (!H) return; for (const p of H.players) p.bot = on ? new HunterBot(Object.assign({ skill: 'expert' }, o)) : null; },
  seed(n) { RNG.seed(n); },
  tuning(k, v) { if (v === undefined) return T(k); return game.settings.set('dev.' + k, v); }
};
game.stateHash = () => { const H = G.hunt; if (!H) return [game.sceneName]; return [H.time.toFixed(2)].concat(H.actors.map(a => Math.round(a.x) + ',' + Math.round(a.y) + ',' + a.state + ',' + a.hp.toFixed(2)), H.players.map(p => p.score + ':' + p.rifle.rounds)); };
/* ---------- deep links: #title, #menu, #hunt/hollow/1, #trophy/muskeg, #bonus/crow, #range, #lodge, #about, #attract, #party/2, #animallab, #soundlab, #dev ---------- */
function deepLink() {
  const h = (typeof location !== 'undefined' && location.hash || '').slice(1); if (!h) return null;
  const [k, a, b] = h.split('/');
  if (k === 'hunt' && has('hunt', a)) return () => { startHunt({ mode: 'single', hunt: a }); G.deepSite = { hunt: a, n: +(b || 1) }; };
  if (k === 'trophy' && has('hunt', a)) return () => { startHunt({ mode: 'single', hunt: a }); G.deepSkip = 'trophy'; };
  if (k === 'bonus') { const map = { crow: 'hollow', saucer: 'bugle', snowball: 'muskeg' }; const hid = map[a] || a; if (has('hunt', hid)) return () => startHunt({ mode: 'bonusOnly', hunt: hid }); }
  if (k === 'party') return () => { const n = clamp(+(a || 2), 2, 4); const players = [new Player(1, game.input)]; for (let i = 2; i <= n; i++) { const I = game.addPlayer({ pad: i - 1 }); players.push(new Player(i, I)); } for (const p of players) p.bot = new HunterBot({ skill: 'average' }); startHunt({ mode: 'party', hunt: 'hollow', players }); };
  if (k === 'range') return () => startHunt({ mode: 'range', hunt: 'range' });
  if (k === 'dev') return () => { startHunt({ mode: 'single', hunt: 'hollow' }); G.deepDev = true; };
  if (['title', 'menu', 'lodge', 'about', 'attract', 'animallab', 'soundlab'].includes(k)) return () => game.go(k, {}, { fade: 0 });
  return null;
}
bus.on('segment', seg => {
  const H = G.hunt; if (!H) return;
  if (G.deepSite && seg.kind === 'establish') { const n = G.deepSite.n; G.deepSite = null; H.skipTo('site', H.hunt.sites[n - 1]); }
  else if (G.deepSkip && seg.kind === 'establish') { const k = G.deepSkip; G.deepSkip = null; H.skipTo(k); }
  if (G.deepDev && seg.kind === 'site') { G.deepDev = false; G.dev && G.dev.open(); }
});
/* ---------- the scenes and the boot ---------- */
const SCENES = { title: titleScene, menu: menuScene, hunt: huntScene };
if (typeof attractScene !== 'undefined') SCENES.attract = attractScene;
if (typeof lodgeScene !== 'undefined') SCENES.lodge = lodgeScene;
if (typeof aboutScene !== 'undefined') SCENES.about = aboutScene;
if (typeof hubScene !== 'undefined') SCENES.hub = hubScene;
if (typeof animalLabScene !== 'undefined') SCENES.animallab = animalLabScene;
if (typeof soundLabScene !== 'undefined') SCENES.soundlab = soundLabScene;
Records.load();
const BOOT_STEPS = [
  ['Reading the trophy wall', () => { Records.load(); seedTables(); }],
  ['Raising Hollow Creek', () => { worldFor('hollow'); }],
  ['Teaching deer to walk', () => { for (const id of ['oak', 'maple', 'birch', 'tallgrass', 'bush', 'sumac', 'corn']) IMP.warm(id, .02, .6, 2); }],
  ['Tuning the banjo', () => {}]
];
const link = HUB_ON ? null : deepLink();
game.start({ scenes: SCENES, scene: HUB_ON && SCENES.hub ? 'hub' : 'title', boot: { title: TITLE, version: VERSION, steps: BOOT_STEPS, messages: ['Oiling the pump action', 'Counting antler points', 'Shooing the skunk', 'Warming up the chili', 'Straightening the scope', 'Hiding the does'], accent: '#e8843a' } });
if (link) { if (game.headless || !game.booted || !game.booted.then) link(); else game.booted.then(() => link()); }
/** the game's own parts, for the headless tests (tests/*.test.mjs) */
game.debug.internals = { G, REG, reg, has, regAll, RNG, T, TUNE_DEFAULT, Records, bus, HUD, Glyph, ZONES, resolveRay, resolveShots, applyShot, scoreKill, siteBonuses, rankFor, Rifle, Scope, Call, Player, Actor, APath, Site, Hunt, HunterBot, World, worldFor, startHunt, aimUpdate, BARKS, BEATS, CAST, SONGS, SFX_DEFS, HUB_TIMELINE, HubLink, Idle, M, DEG, raySphere, rayCapsule, rayVolume, rayEllipsoid, rayZones, IMP, DEV, ATTRACT, RANGE_STATIONS, SEG };
