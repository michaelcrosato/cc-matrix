/* =============================================================================
 * 90-start: the game object, our settings and pause items, the boot steps (parks,
 * floors, skies, rigs, sounds), the scenes table, deep links (#title #attract
 * #match/<park> #derby #training/<n> #tour/<stop> #about #gallery #hubcard
 * #touch), the AI Hub start, and game.debug: the one handle tests, dev mode and
 * the attract director use.
 * ========================================================================== */
BZ.makeViews();
BZ.hub.detect();
if (BZ.hubActive) { BZ.KEYS.pause = ['Escape', 'KeyP']; BZ.KEYS.start = ['Enter', 'NumpadEnter']; }
BZ.KEYS.options = ['Pad9'];
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'broadcast', bg: '#05060c', input: BZ.KEYS,
  menu: { items: () => BZ.pauseItems(), settings: BZ.SETTINGS, controls: BZ.ACTION_NAMES, quit: BZ.hubActive ? false : 'title', saves: { slots: 3, version: 1 } } });
BZ.game = game;
BZ.headless = !!game.headless;
BZ.cosmetic = !game.headless;
BZ.installShapes();
BZ.defineSounds(game);
BZ.tour.install(game);
BZ.arcade = new E.Arcade(game, { id: 'batzooka', hud: false, scores: 6 });
BZ.installDom(game);
BZ.loadTune();
if (BZ.hubActive) game.o.menu.quit = false;
// in a session the hub owns Create + Options; any input clears the touch-only card
BZ.sfxVaryZero = false;

/* ---- boot: heavy setup in steps behind the boot screen ---- */
const BOOT = [
  ['Building six ballparks', () => { for (const id of BZ.PARK_ORDER) BZ.park(id); }],
  ['Painting skies and Mode 7 floors', () => { if (!BZ.cosmetic) return; for (const id of BZ.PARK_ORDER) { BZ.backdrop(id); BZ.mode7(id); } }],
  ['Dressing the teams', () => { if (!BZ.cosmetic) return; for (const T of BZ.all('teams')) for (const p of T.players) for (const job of ['bat', 'run', 'field', 'pitch', 'catch', 'bench', 'fight']) BZ.rigFor(p, job); BZ.umpireRig(); for (const k of Object.keys(BZ.CAST)) BZ.castRig(k); }],
  ['Tuning the ballpark organ', () => { BZ.defineSounds(game); }]
];

/* ---- deep links ---- */
BZ.deepLink = () => {
  const h = (typeof location !== 'undefined' && location.hash || '').replace(/^#/, ''), [k, a] = h.split('/');
  if (BZ.hubActive) return null;
  if (k === 'attract') { BZ.attract.start(); return true; }
  if (k === 'match') { BZ.startMatch({ mode: 'exhibition', park: a || 'kernel', away: 'krakens', home: (BZ.get('parks', a || 'kernel') || {}).team || 'comets', innings: 3, humans: { 0: [], 1: [game.input] }, seed: 5 }); return true; }
  if (k === 'derby') { game.go('derby', { players: 1, park: a || 'kernel' }); return true; }
  if (k === 'training') { BZ.training.start(clamp((+a || 1) - 1, 0, 7)); return true; }
  if (k === 'tour') { BZ.tour.newTour(); const i = clamp(+a || 1, 1, 5); BZ.tour.d().tour.stop = i - 1; BZ.tour.playNext(); return true; }
  if (k === 'about') { game.go('about'); return true; }
  if (k === 'sim') { BZ.startMatch({ mode: 'exhibition', park: a || 'kernel', away: 'eruptors', home: (BZ.get('parks', a || 'kernel') || {}).team || 'comets', innings: 9, humans: { 0: [], 1: [] }, seed: 21, cpuLevel: 'allstar' }); return true; }
  if (k === 'gallery') { game.go('gallery'); return true; }
  if (k === 'hubcard') { BZ.hub.mockCard(); return true; }
  return null;
};
BZ.scenes.boot = {
  enter() { this.t = 0; },
  update(dt) {
    this.t += dt;
    if (this.t < .02) return;
    if (BZ.hubActive && !BZ.hub.mock) { if (BZ.hub.phase === 'none') BZ.hub.begin(); return; }
    if (!BZ.deepLink()) game.go('title', null, { fade: .3 });
  },
  draw(r) { r.sky(['#05040e', '#1a1040']); r.overlay(g => { if (BZ.hubActive) E.font.text(g, 'Joining the round...', r.W / 2, r.H / 2, '#ffffff', { align: 'center', scale: 1 }); }); }
};

/* ---- game.debug: tests, dev mode and the attract director ---- */
BZ.debug = game.debug = {
  snapshot() {
    const M = BZ.M, b = M && M.ball, P = M && M.park;
    return {
      scene: game.sceneName, phase: M ? M.phase : null, sub: M && M.ab ? M.ab.sub : null, inning: M && M.inning, half: M && M.half, outs: M && M.outs, balls: M && M.balls, strikes: M && M.strikes,
      score: M ? [M.teams[0].runs, M.teams[1].runs] : null, bases: M ? M.bases.map(p => p && p.id) : null, batter: M && M.batter && M.batter.id, pitcher: M && M.pitcher && M.pitcher.id,
      ball: b ? { x: Math.round(b.x - P.H.x), y: Math.round(b.y - P.H.y), z: Math.round(b.z), vx: Math.round(b.vx), vy: Math.round(b.vy), vz: Math.round(b.vz), mode: b.mode } : null,
      lastContact: M && M.lastContact, meters: M ? [Math.round(M.teams[0].meter), Math.round(M.teams[1].meter)] : null, turbo: M ? [Math.round(M.teams[0].turbo), Math.round(M.teams[1].turbo)] : null,
      fielders: M ? M.fielders.map(f => ({ pos: f.pos, x: Math.round(f.x - P.H.x), y: Math.round(f.y - P.H.y), state: f.state })) : [],
      runners: M ? M.runners.map(r => ({ id: r.player.id, base: r.base, target: r.goal, p: +r.p.toFixed(2), state: r.state })) : [],
      cam: BZ.cams.replay ? 'replay' : BZ.cams.moon ? 'moonshot' : BZ.cams.mode === 'field' ? 'broadcast' : 'plate', result: M && M.result,
      tour: { stop: BZ.tour.d().tour.stop, fb: BZ.tour.d().fb, done: BZ.tour.d().tour.done }, attract: { on: BZ.attract.on, segment: BZ.attract.seg },
      hub: { active: BZ.hubActive, phase: BZ.hub.phase, score: BZ.hub.D ? BZ.hub.D.P.score : 0, sent: BZ.hub.msgs, reported: BZ.hub.reported }, dev: { open: BZ.dev.on, tab: BZ.DEV_TABS[BZ.dev.tab] },
      touchOnly: BZ.touchOnly, device: game.input.lastDevice, glyphs: BZ.family(), lesson: M && M.lesson ? { id: M.lesson.def.id, prog: M.lesson.prog, passed: M.lesson.passed } : null,
      derby: BZ.M && BZ.M.derby ? { state: BZ.M.derby.state, scores: BZ.M.derby.players.map(p => p.score), outs: BZ.M.derby.players.map(p => p.outs) } : null, errors: game.errors.length
    };
  },
  /** place a situation at once */
  setup(o = {}) {
    const M = BZ.M; if (!M) return;
    for (const k of ['inning', 'half', 'outs', 'balls', 'strikes']) if (o[k] !== undefined) M[k] = o[k];
    if (o.score) { M.teams[0].runs = o.score[0]; M.teams[1].runs = o.score[1]; }
    if (o.bases) { const O = BZ.offense(M); M.bases = o.bases.map((on, i) => on ? (typeof on === 'object' ? on : O.lineup[(O.order + 5 + i) % 9]) : null); }
    if (o.meters) { M.teams[0].meter = o.meters[0]; M.teams[1].meter = o.meters[1]; }
    if (o.turbo) { M.teams[0].turbo = o.turbo[0]; M.teams[1].turbo = o.turbo[1]; }
    if (o.seed !== undefined) BZ.seed(o.seed);
    if (o.batterIdx !== undefined) BZ.offense(M).order = o.batterIdx;
    BZ.match.setupDefense(M);
  },
  /** force outcomes: { nextPitch: { type, x, z, q }, contact: 'perfect' | 'miss' | { timingMs, dx, dz }, hazard: 'now', rhubarb: true, homer: true } */
  force(o = {}) {
    const M = BZ.M; if (!M) return;
    if (o.nextPitch) M.forcePitch = { type: o.nextPitch.type || 'heater', target: [o.nextPitch.x || 0, o.nextPitch.z || 17], q: o.nextPitch.q === undefined ? 1 : o.nextPitch.q, slot: o.nextPitch.slot };
    if (o.contact) M.forceContact = o.contact;
    if (o.hazard) BZ.hazards.now(M);
    if (o.rhubarb && M.ab) BZ.rhubarb.start(M, 'debug');
    if (o.homer) M.cheats.homer = true;
  },
  get tune() { return BZ.TUNE; }, resetTune: () => BZ.resetTune(),
  get events() { return BZ.bus.ring; },
  bot: { on: (side, o) => BZ.bot.on(side, o), off: side => BZ.bot.off(side) },
  step(n = 1) { for (let i = 0; i < n; i++) game.advance(1 / 120); },
  skip() { const M = BZ.M; if (M && M.cinematic) M.cinematic.done = true; BZ.cams.replay = null; if (BZ.cams.moon) { const cb = BZ.cams.moon.then; BZ.cams.moon = null; game.timeScale = TUNE.gameSpeed; if (cb) cb(); } if (BZ.talk.cutscene) BZ.talk.endCut(); },
  warp(scene, data) { BZ.attract.on = false; game.go(scene, data, { fade: 0 }); },
  hubMock() { return BZ.hub.mockCard(); }
};

game.start({ scenes: BZ.scenes, scene: 'boot', boot: { title: 'BATZOOKA BASEBALL', steps: BOOT } });
