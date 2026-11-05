/* ---- START: the match scene (every mode of a match runs in it: exhibition, the tour, camp, the hub's round, the attract's
 * segments and the dev panel's jumps), the boot path (a hub's round opens straight into its card), the deep links and the
 * debug handle. The scene table is `scenes`, filled by the fragments above. ---- */
const courtCamera = { zoom: [.8, 1.4], start: 1 };
const courtDraw = r => { drawCourt(r, S.courtDef); hudDraw(r); if (S.camp) campDraw(r); hubCountdown(r); devDraw(r); };
scenes.court = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true, pausable: !HUB, camera: courtCamera,   // the engine's standard pause (an HTML Shell), themed
  enter(d) {
    d = d || {};
    S.scene = 'court';
    if (!(HUB && S.hubReady)) {
      S.lastHumans = d.humans || [{ slot: 0, input: game.input }];
      if (d.cheats) S.cheats = Object.assign({}, d.cheats);
      else S.cheats = {};
      setupMatch({ court: d.court || 'skybox', home: d.home, away: d.away, humans: S.lastHumans, qLen: d.qLen || 120, powerups: d.powerups !== false, twists: d.twists !== false, mode: d.mode || 'exhibition', difficulty: d.difficulty });
      if (d.passive) for (const p of S.players) if (!p.human && p.side === AWAY) p.brain = null;
      if (d.tourStop !== undefined) S.setup.tourStop = d.tourStop;
      if (d.bigHeads) for (const p of S.players) p.rig.o.headR = (p.rig.o.headR || 1) * 1.9;   // §10.8: heads × 1.9 (the rig's own head size, kept)
      S.cameraView = setting('camera') === 'High' ? 'threequarter' : BROADCAST;
      if (game.view !== S.cameraView) game.setView(S.cameraView);
    }
    S.gameOver = false; S.resultsQueued = false; S.netReplay = false;
    L.enabled = true; L.ambient = (S.courtDef && S.courtDef.ambient) || .5;
  },
  update(dt) {
    if (S.net.ended) return;                                    // the hub's end: the match is frozen until the hub removes it
    if (HUB && S.net.role === 'client') { hubStep(dt); cameraStep(dt); matchFrame(dt); crowdSet(S.match ? (S.match.quarter >= 4 ? .8 : .4) : .3); return; }
    if (HUB && AIHub.time && AIHub.time() < 0) { cameraStep(dt); return; }   // the countdown before the tip
    if (S.dev && S.dev.open) devStep(dt);
    sessionOverlayStep();
    subUIStep();
    if (S.camp) campStep(dt);
    matchStep(dt); cameraStep(dt); matchFrame(dt);
    hubStep(dt);
    if (S.camp && S.camp.done && S.camp.doneT > 2) { S.camp = null; game.go('camp', null, { fade: .2 }); }
    crowdSet(S.match ? (S.match.score[0] + S.match.score[1] > 0 && Math.abs(S.match.score[0] - S.match.score[1]) < 6 ? .8 : .4) : .3);
    if (S.match && S.match.over && S.net.role === 'host' && S.hubReady) { /* the host's finish is sent by the game's end */ }
  },
  draw(r) { courtDraw(r); sessionOverlayDraw(r); }
};
game.debug = { snapshot: () => ({ scene: game.sceneName, phase: S.match && S.match.phase, clock: S.match && +S.match.clock.toFixed(2), shotClock: S.match && +S.match.shotClock.toFixed(2), score: S.match && S.match.score.slice(), quarter: S.match && S.match.quarter, over: S.match && S.match.over, ball: S.ball && { state: S.ball.state, x: +S.ball.x.toFixed(1), y: +S.ball.y.toFixed(1), z: +S.ball.z.toFixed(1), owner: S.ball.owner ? S.ball.owner.slot : null }, players: S.players.map(p => ({ slot: p.slot, id: p.id, side: p.side, human: p.human, x: +p.body.x.toFixed(1), y: +p.body.y.toFixed(1), z: +p.body.z.toFixed(1), state: p.state, turbo: +p.turbo.toFixed(2), juice: +p.juice.toFixed(2), nova: p.nova, hasBall: p.hasBall, source: p.human ? 'human' : (p.brain ? 'cpu' : 'none') })), lastEvents: S.events.slice(-10).map(e => e.type), ui: { screen: game.sceneName }, attract: { segment: S.attract ? S.attract.seg : null }, net: { role: S.net.role, seat: S.net.seat }, tour: S.progress && S.progress.tour ? { stop: S.progress.tour.stop, won: S.progress.tour.won.slice() } : null }) };
/* deep links: #<scene>[/<arg>] jumps into a scene (the menus reach the same ones); #court/<court> starts a match */
const deepLink = (() => { const h = (typeof location !== 'undefined' && location.hash || '').replace(/^#/, ''); const [a, b] = h.split('/'); return { a: a || '', b: b || '' }; })();
if (typeof document !== 'undefined' && document.head) { const st = document.createElement('style'); st.id = 'zf-shell-theme'; st.textContent = `html .esh{--ink:#fff7ec;--paper:#140c24;--accent:#ff3ca6;--muted:#9a8fb8;--line:#3a2a5a;--danger:#ff5a3a;--font:700 1rem/1.35 "Trebuchet MS",system-ui,sans-serif;--title:900 1.6rem/1 Impact,"Arial Black",system-ui}html .esh{font-size:clamp(18px,2.6vh,42px)}`; document.head.appendChild(st); }   // the pause menu and the settings in the game's own colours (the engine's Shell, themed)
if (typeof addEventListener === 'function') addEventListener('keydown', () => { S.everKey = true; });   // a key lifts the touch-only notice (§11.7)
const bootScene = HUB ? 'hubcard' : (deepLink.a && scenes[deepLink.a] ? deepLink.a : 'title');
const bootData = deepLink.a === 'court' ? { court: deepLink.b || 'skybox' } : undefined;
game.start({ scenes, scene: bootScene, data: bootData });
window.__bb = { S, game, TUNING, tune, RIMW, shotPoints, goaltendCheck, emit, on, debug: game.debug, phys: { newBall, ballPlace, ballStep, ballRelease, ballFlight, ballSubstep, RIMW, OX, OY }, setupMatch, matchStep, hubConnect, COURTS, SETUP, startMatchFromSetup, resultsData, tourResult, playBeat, BEATS, PREGAME, ATTRACT_SEGMENTS, REG, all, get, LINE_BANKS, SFX, SONGS, STINGS, POWERUPS, DUNKS, CAMP_LESSONS, GAME_SETTINGS, VOICE_PROFILES, lineFor, voicePlan, TUNING_GROUPS, KEYS, ACTION_NAMES, glyphOf: (a, dev, style) => promptTokens('{' + a + '}', { lastDevice: dev }), padGlyph, keyLabel, navDir, anyPressed, dsp, BROADCAST, TOUR_STOPS, CAPTAIN, SPEAKERS, fillLine, rosterOf, startExhibition, goTourNew, tourStartStop, campStep, startCampLesson, forceTwist, devRows, devAct, devToggle, devOpen, devClose, devStep, pauseItems, attractStart, twistStart, twistStep, powerupStep, overclockOn, ventLaunch, startDunk, pickDunk, shotChance, releaseShot, setSettingFor: (k, v) => game.settings.set(k, v), checkTouchOnly, hubRoster, netSnapshot, netApplySnapshot, netApply, hubMessage, hubStep, S2: S };
if (HUB) hubConnect().catch(e => game.fail('hub', e));
