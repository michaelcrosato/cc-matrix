// ---- the game: the engine, its scenes, the debug handle for tests and the bot, and the start ------------------------
const GAME_VERSION = 'demo 1.0';
GAME = new E.Game({
  canvas: 'screen', res: [480, 270], expand: true, bg: '#05040a',
  input: Object.assign({}, E.Input.DEFAULT, {
    fire: ['Space', 'Mouse0', 'Pad7', 'KeyF'],
    pump: ['KeyR', 'Pad2'],
    scope: ['ShiftLeft', 'ShiftRight', 'Mouse2', 'Pad6'],
    call: ['KeyC', 'Pad3'],
  }),
  menu: {
    settings: [
      { key: 'buttons', label: 'Button names', options: ['PlayStation', 'Xbox'], value: 'PlayStation' },
      { key: 'attract', label: 'Attract mode after 10 s', value: true },
    ],
    controls: { fire: 'Shoot', pump: 'Pump', scope: 'Scope', call: 'Call', attack: false, dash: false, skill: false, jump: false },
    items: [
      ['Restart site', () => { if (HUNT_RUN.phase === 'play' || HUNT_RUN.phase === 'intro') startSeg(); }],
      ['Dev mode', () => GAME.go('dev', { from: 'hunt' })],
    ],
    quit: HUB_ACTIVE ? false : 'title',
  },
  fullscreen: 'tap',
});

// the hunt is pausable only when the player can pause (not in attract mode, not in a hub round)
const huntScene = {
  pausable: true,
  enter(data = {}) {
    if (!(data.resume && HUNT_RUN.active)) {
      HUNT_RUN.active = true;
      const mode = data.mode || 'campaign';
      startHunt(mode, data.hunt || 0, data.game);
    }
    this.pausable = !(HUNT_RUN.bot || HUB_ACTIVE);
    GAME.audio.music(HUNT_RUN.bot ? SONGS.hunt : HUNT_RUN.plan[HUNT_RUN.seg] && HUNT_RUN.plan[HUNT_RUN.seg].type === 'bonus' ? SONGS.bonus : SONGS.hunt);
  },
  update(dt) {
    GAME.input.glyphs = GAME.settings.buttons === 'Xbox' ? 'xbox' : 'playstation';
    if (HUB.ended) return;
    if (HUNT_RUN.bot && GAME.input.anyPressed()) { exitAttract(GAME); return; }
    hubTick(dt, GAME);
    if (HUNT_RUN.hubOver) return;
    huntUpdate(dt, GAME, GAME.input);
  },
  draw: huntDraw,
};

const scenes = { title, menu: menuScene, hunt: huntScene, hub: hubScene, lodge: lodgeScene, about: aboutScene, dev: devScene, animallab: animalLabScene, soundlab: soundLabScene };
const sceneNames = Object.keys(scenes);

wireAudioEvents();
hubBoot();

GAME.debug = {
  scene: () => GAME.sceneName,
  snapshot() {
    const seg = HUNT_RUN.plan[HUNT_RUN.seg] || null;
    return {
      scene: GAME.sceneName, phase: HUNT_RUN.phase, seg: HUNT_RUN.seg, segType: seg ? seg.type : null,
      clock: Math.round(HUNT_RUN.clock * 100) / 100, points: HUNT_RUN.totals ? HUNT_RUN.totals.points : 0,
      site: { points: HUNT_RUN.site ? HUNT_RUN.site.points : 0, bagged: HUNT_RUN.site ? HUNT_RUN.site.bagged : 0,
        shots: HUNT_RUN.site ? HUNT_RUN.site.shots : 0, doe: HUNT_RUN.site ? HUNT_RUN.site.doeShots : 0,
        benched: GUN.benched, bucksWanted: HUNT_RUN.site ? HUNT_RUN.site.bucksWanted : 0 },
      gun: { chamber: GUN.chamber, tube: GUN.tube, rackT: Math.round(GUN.rackT * 100) / 100, calls: GUN.calls, x: Math.round(GUN.x * 1000) / 1000, y: Math.round(GUN.y * 1000) / 1000 },
      timelineHead: HUNT_RUN.timeline.slice(0, 4).map(e => [e.species, Math.round(e.at * 100) / 100, Math.round(e.d * 1000) / 1000]),
      animals: LIVE.map(a => ({ id: a.id, sp: a.species, fall: Math.round((a.fall || 0) * 100) / 100, head: Math.round(headT(a) * 100) / 100, x: Math.round(a.x * 1000) / 1000, state: a.state, dead: a.dead, wounded: a.wounded, d: a.d, dir: a.dir })),
      bot: HUNT_RUN.bot, savedRank: HUNT_RUN.savedRank, tuning: Object.assign({}, TUNING), errors: GAME.errors.length,
      hub: { started: HUB.started, ended: HUB.ended, resultSent: HUB.resultSent },
    };
  },
  // the reticle onto an animal's chest (or a given point), then the shot. Tests use this instead of the mouse.
  aimAt(id) {
    const a = LIVE.find(x => x.id === id);
    if (!a) return false;
    GUN.x = a.x; GUN.y = a.fy - a.hn * .55;
    return true;
  },
  aimAtZone(id, u, v) {
    const a = LIVE.find(x => x.id === id);
    if (!a) return false;
    const sp = SPECIES[a.species], bw = a.hn * sp.aspect * (GAME.H / GAME.W);
    const uu = a.dir >= 0 ? u : 1 - u;
    GUN.x = a.x - bw / 2 + uu * bw; GUN.y = a.fy - a.hn + v * a.hn;
    return true;
  },
  fire() { fireOrReport(GAME.W, GAME.H, GAME.time); return GUN.chamber; },
  pump() { return pumpGun(); },
  scope(on) { GUN.scoped = !!on; },
  call() { const n = callNear(GUN.x, .3); GUN.calls = Math.max(0, GUN.calls - 1); return n; },
  skipSeg() { if (HUNT_RUN.phase === 'play') endSegPlay(); else if (HUNT_RUN.phase === 'intro') { HUNT_RUN.phase = 'play'; } },
  nextPhase() { if (HUNT_RUN.phase === 'tally') { HUNT_RUN.seg++; startSeg(); } else if (HUNT_RUN.phase === 'outro') { recordSeg(); HUNT_RUN.phase = 'tally'; } },
  bagAll() { for (const a of LIVE.slice()) { if (SPECIES[a.species].sex === 'buck' && !a.dead) { knockDown(a); HUNT_RUN.site.bagged += 1; HUNT_RUN.site.points += 1000; } } },
  spawn(species, opts = {}) { return spawnAnimal(species, opts).id; },
  bot(on) { HUNT_RUN.bot = !!on; },
  seed(n) { RNG.spawn = mulberry(n); },
  tuning(key, value) { if (value !== undefined) TUNING[key] = value; return TUNING[key]; },
  resetTuning() { resetTuning(); },
  go(name, data) { GAME.go(name, data); },
  start(mode = 'campaign', hunt = 0) { HUNT_RUN.active = true; startHunt(mode, hunt); GAME.go('hunt', { resume: true }); },
  setTouchOnly(v) { return v; },
};

GAME.start({ scenes, scene: HUB_ACTIVE ? 'hub' : 'title' });
