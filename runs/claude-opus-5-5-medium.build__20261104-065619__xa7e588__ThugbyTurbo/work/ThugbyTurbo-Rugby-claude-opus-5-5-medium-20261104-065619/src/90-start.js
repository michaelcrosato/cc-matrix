/* ---- START ---- */

const SESSION = typeof AIHub !== 'undefined' && AIHub.active;
TT.cfg.session = !!SESSION;
const SETTINGS = [
  { key: 'glyphs', group: 'Display', label: 'Controller buttons', type: 'select', value: 'playstation', options: [['playstation', 'PlayStation ✕ ○ □ △'], ['xbox', 'Xbox A B X Y']], apply: (g, v) => { for (const p of g.players || [g.input]) p.glyphs = v; } },
  { key: 'uiScale', group: 'Display', label: 'TV text size', options: ['Large', 'Normal'], value: 'Large', apply: (g, v) => { if (typeof document !== 'undefined' && document.body) document.body.classList.toggle('tt-normal', v === 'Normal'); } },
  { key: 'camera', group: 'Display', label: 'Camera', options: ['Broadcast', 'High', 'Overhead'], value: 'Broadcast', help: 'R3 or V cycles them in play' },
  { key: 'difficulty', label: 'Difficulty', options: ['Pro', 'Rookie', 'Legend'], value: 'Pro', help: 'The CPU teams (each cup opponent shifts it a step)' },
  { key: 'halves', label: 'Half length', options: ['2 min', '3 min', '4 min', '5 min'], value: '2 min', help: 'Running clock; the TV clock shows 7:00' },
  { key: 'autoSwitch', label: 'Auto-switch', options: ['Assisted', 'Full', 'Manual'], value: 'Assisted', help: 'Who you control on defence' },
  { key: 'passAssist', label: 'Pass assist', options: ['On', 'Off'], value: 'On', help: 'Off: a pass with nobody that side is a dummy' },
  { key: 'turboMode', label: 'Turbo', options: ['Hold', 'Toggle'], value: 'Hold' },
  { key: 'commentary', label: 'Commentary', options: ['On', 'Text only', 'Off'], value: 'On' },
  { key: 'replays', label: 'Replays', options: ['Big moments', 'All tries', 'Off'], value: 'Big moments' },
  { key: 'refCone', label: "Show the ref's view", options: ['On', 'Off'], value: 'On' },
  { key: 'bigHeads', label: 'Big heads (after the cup)', options: ['Off', 'On'], value: 'Off', apply: () => { if (!TT.unlocks().bigHeads && TT.settings.bigHeads === 'On') TT.settings.bigHeads = 'Off'; TT.applyBigHeads && TT.applyBigHeads(); } },
  { key: 'crowd', group: 'Sound', label: 'Crowd volume', type: 'slider', value: .8 }
];
const game = TT.game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'broadcast', views: TT.VIEW_IDS, input: TT.KEYS, id: 'thugby-turbo', bg: '#06060c',
  corner: SESSION ? false : undefined, autoPause: SESSION ? false : undefined, fullscreen: SESSION ? false : undefined,
  menu: SESSION ? { items: [], settings: SETTINGS, quit: false, controls: { mouseL: false, view: 'Camera view' } } : {
    items: [['Restart match', () => { if (M && TT.mdata && !TT.mdata.drill) { game.resume(); game.go('match', Object.assign({}, TT.mdata, { seed: Date.now() & 0xffff })); } else if (M && M.drill) { game.resume(); TT.drills.reset(M); } }], ['DEV MODE', () => { game.resume(); TT.dev.openPanel(); }]],
    settings: SETTINGS, quit: 'title',
    controls: { x: 'Sidestep / Tackle', sq: 'Fend / Dive tackle', ci: 'Kick / Switch to ball', tri: 'Super', l1: 'Pass up / Switch up', r1: 'Pass down / Switch down', turbo: 'Turbo', view: 'Camera view (Show me in drills)', mouseL: false }
  }
});
TT.settings = game.settings;
TT.audio.init(game);
TT.comm.init(game);
TT.fx.install();
TUNE.load();
// the dev panel's key, once dev mode has been opened
if (typeof addEventListener === 'function') addEventListener('keydown', e => { if (e.code === 'Backquote' && TT.dev.enabled && game.scene === TT.scenes.match) { if (TT.dev.open) TT.dev.close(); else TT.dev.openPanel(); } });
// glyphs on joiners too
const _add = game.addPlayer.bind(game); game.addPlayer = o => { const q = _add(o); if (q) q.glyphs = TT.settings.glyphs; return q; };
game.input.glyphs = TT.settings.glyphs;
// the match's own step also runs the dev cheats
const _mu = TT.scenes.match.update; TT.scenes.match.update = function (dt) { TT.dev.tick(); return _mu.call(this, dt); };

/* ---- game.debug: tests, tools/check.mjs and the attract director read and drive the game through it ---- */
game.debug = {
  snapshot() {
    const sc = Object.keys(TT.scenes).find(k => TT.scenes[k] === game.scene) || null;
    if (!M) return { scene: sc };
    return { scene: sc, phase: M.phase, sub: M.sub, half: M.half, clock: +M.clock.toFixed(2), score: M.score.slice(), hype: M.hype.map(Math.round), possession: M.possession,
      ball: { x: Math.round(M.ball.x), y: Math.round(M.ball.y), z: Math.round(M.ball.z), state: M.ball.st, holder: M.ball.holder },
      players: M.players.map(p => ({ id: p.id, team: p.team, role: p.role, x: Math.round(p.x), y: Math.round(p.y), z: Math.round(p.z), st: p.st, ctl: p.ctl })),
      ref: { x: Math.round(M.ref.x), y: Math.round(M.ref.y), facing: +M.ref.facing.toFixed(2), down: M.ref.down > 0 }, cards: M.cards.length, powerup: M.pu && M.pu.kind, hazards: M.hazards.map(h => h.kind),
      lastEvents: M.events.slice(-8).map(e => e[1]), cup: TT.cup && { round: TT.cup.round, results: TT.cup.results }, attract: !!M.o.attract, dev: { open: TT.dev.open }, session: TT.cfg.session, replay: TT.replay.playing, drill: M.drill && { id: M.drill.id, done: M.drill.done, n: M.drill.n }, watchdogs: M.watchdogs, over: M.over };
  },
  teleport(id, x, y) { const p = M.players[id]; p.x = x; p.y = y; }, give(id) { TT.sim.giveBall(id, 'restart'); }, force: (n, o) => TT.force(n, o),
  tune: (k, v) => TUNE.set(k, v), seed: n => { M.rng = E.rng(n); }, step: s => game.advance(s), drill: id => TT.jump('drill:' + id), go: (s, d) => game.go(s, d)
};
window.__thugby = { game, TT, get M() { return M; } };

/* ---- start: the title (or a deep link: #match, #match/<venue>, #cup, #training, #training/<n>, #attract, #records, #about, #credits, #card) ---- */
const scenes = TT.scenes;
const [link, part] = (typeof location !== 'undefined' && location.hash ? location.hash.slice(1) : '').split('/');
let first = 'title', data;
if (!SESSION) {
  if (link === 'match') { first = 'match'; data = { home: 'mud', away: 'gul', venue: part || 'docks', seats: [{ input: game.input, team: 0 }] }; }
  else if (link === 'training' && part) { first = 'match'; data = { drill: TT.DRILLS[(+part - 1) || 0].id, home: 'mud', away: 'bad', venue: 'park', weather: 'clear', time: 'day', seats: [{ input: game.input, team: 0 }], seed: 5 }; }
  else if (link === 'attract') { first = 'match'; data = { attract: true, home: 'gul', away: 'irn', venue: 'furnace', seed: 11 }; }
  else if (link === 'card') { first = 'card'; data = { demo: true }; }
  else if (link === 'cup') { TT.cupLoad(); first = 'cup'; }
  else if (scenes[link] && ['menu', 'training', 'records', 'about', 'credits', 'title'].includes(link)) first = link;
}
game.start({
  scenes, scene: SESSION ? 'card' : first, data,
  boot: { title: 'THUGBY TURBO', version: '1.0', steps: [
    ['Mowing the stripes', () => { for (const v of TT.VENUES) TT.pres.map(v, TT.TEAMS[0].home); }],
    ['Inflating the oval balls', () => { TT.recordsInit(); }],
    ['Warming the pies', () => { TT.castRig('gristle'); TT.castRig('barry'); TT.castRig('ros'); }],
    ['Bribing the referee', () => { if (SESSION) TT.net.connect().then(info => { if (!info) { TT.cfg.session = false; game.go('title'); } else { AIHub.ready(); } }).catch(() => game.go('title')); }]
  ], messages: ['Checking for knock-ons', 'Hiding the chicken', 'Polishing the Mega Cup'] }
});
