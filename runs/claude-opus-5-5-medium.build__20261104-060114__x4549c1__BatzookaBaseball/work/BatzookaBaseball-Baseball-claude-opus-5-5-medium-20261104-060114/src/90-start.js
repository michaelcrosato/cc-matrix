/* START: the scenes table, deep links, game.debug (the tests', the dev mode's and the attract director's handle) and the
 * boot. Every scene's update first runs the common tick (babble voices, the crowd). */
function commonTick(dt) { babble.update(dt); crowdStep(dt); }
game.debug = {
  snapshot() {
    const b = M && M.ball;
    return { scene: game.sceneName, phase: M && M.phase, inning: M && M.inning, half: M && M.half, outs: M && M.outs, balls: M && M.balls, strikes: M && M.strikes,
      score: M ? [M.teams[0].runs, M.teams[1].runs] : null, bases: M ? [1, 2, 3].map(k => runnerOn(k) ? runnerOn(k).p.name : null) : null,
      ball: b ? { x: Math.round(b.x), y: Math.round(b.y), z: Math.round(b.z), mode: b.mode } : null, lastContact: M && M.lastContact, cam: M && M.cam,
      meters: M ? M.teams.map(t => Math.round(t.meter)) : null, device: game.input.lastDevice, glyphs: game.input.glyphs, touchOnly: BZ.touchOnly, errors: game.errors.length,
      attract: { on: game.sceneName === 'attract', segment: ATT.seg }, dev: { open: DEV.open, tab: DEV_TABS[DEV.tab] }, hub: { phase: HUB.phase, score: HUB.score, sent: HUB.sent },
      tour: { stop: SAVE.tour.stop, fb: SAVE.fb, done: SAVE.tour.done }, derby: M && M.derby ? { score: M.derby.score, hrs: M.derby.hrs, outs: M.derby.outs } : null };
  },
  BZ, tune: TUNE, resetTune: BZ.resetTune, events: BZ.bus.log,
  match: o => newMatch(o), M: () => M, save: () => SAVE, setSave: s => { SAVE = s; },
  force(o) { M.force = Object.assign(M.force || {}, o); if (o.rhubarb) M.forceRhubarb = true; },
  warp: (scene, data) => game.go(scene, data, { fade: 0 }),
  step(dt) { matchUpdate(dt); }, botStep: dt => botStep(dt),
  fns: { startRhubarb, devOpen, devUpdate, playStop, newDerby, derbyDone, lessonGoal, pitchingChange, hubConnect, startExhibition, applySituation, devRows, promptsFor, iconInfo, nextSeg }
};
SCENES.boot = { enter() { game.go(firstScene(), null, { fade: 0 }); }, update() {} };
function firstScene() {
  if (hubActive()) return 'hubDerby';
  const h = typeof location !== 'undefined' && location.hash ? location.hash.slice(1) : '';
  const [s, a] = h.split('/');
  if (s === 'match') { const ht = a ? PARKS[a].team : 'HCK'; BZ.matchCfg = { mode: 'exhibition', away: ht === 'COM' ? 'HCK' : 'COM', home: ht, park: a || 'barnacle', innings: 3, ctrl: [[game.input, null], [null, null]] }; return 'match'; }
  if (s === 'derby') { DB.turn = 0; DB.scores = []; return 'derby'; }
  if (s === 'hubcard') { BZ.hubMockBoot = true; return 'hubMock'; }
  if (s === 'tour') { SAVE.tour.started = true; return 'tourMap'; }
  if (['title', 'attract', 'about', 'gallery', 'credits', 'lessons', 'teamSelect', 'derbySetup', 'clubhouse', 'tourMap'].includes(s)) return s;
  if (s === 'touch') { BZ.touchOnly = true; return 'title'; }
  return 'title';
}
SCENES.hubMock = { enter() { game.go('hubDerby', { mock: true }, { fade: 0 }); }, update() {} };
for (const k in SCENES) BZ.def('scenes', k, SCENES[k]);
function bootGame() {
  detectTouch(); initSaves(); defineSettings();
  if (game.settings.keepTune) { try { const t = E.store.get('bz:tune', null); if (t) for (const m of TUNE_META) if (typeof t[m.key] === 'number') TUNE[m.key] = clamp(t[m.key], m.min, m.max); } catch (e) { /* storage blocked */ } }
  game.input.use(KEYS);
  game.start({ scenes: SCENES, scene: 'boot', boot: HEADLESS ? false : { title: 'BATZOOKA BASEBALL', steps: [['Building the ballparks', () => { for (const id of PARK_ORDER) parkKit(id); }], ['Dressing the teams', () => { for (const id of TEAM_ORDER) for (const p of TEAMS[id].roster) { makeRig(p, 'bat'); makeRig(p, 'field'); } }], ['Tuning the organ', () => {}]] } });
}
bootGame();
if (typeof window !== 'undefined') window.BZ = BZ;
Object.assign(BZ, { newTour, playStop, DB, LESSONS, LINES, ABOUT: ABOUT_DATA, lessonCfg: n => Object.assign(LESSONS[n].cfg(), { mode: 'training', innings: 99, lesson: LESSONS[n] }) });
