/* BASKETBLAM - scene table, pause items, debug handle, start */
uiHooks.pauseItems = () => {
  if (game.sceneName !== 'match') return [];
  const items = [['How to Play', () => { game.resume(); S.howto = { page: 0 }; }]];
  if (S.mode !== 'camp') items.push(['Restart Game', () => { game.resume(); newMatch(Object.assign({}, S.cfg, { seed: undefined })); music(courtDef().music); }]);
  if (S.mode === 'camp') items.push(['Restart Lesson', () => { game.resume(); lessonSetup(); }]);
  items.push(['Dev Mode', () => { game.resume(); S.dev.open = true; S.dev.tab = 0; S.dev.row = -1; }]);
  return items;
};
scenes.hubwait.enter = scenes.hubwait.enter;
loadTuning();

const snapshot = () => {
  const M = S.match, B = S.ball;
  return {
    scene: game.sceneName, mode: S.mode, court: S.court, phase: M && M.phase, quarter: M && M.quarter, clock: M && +M.clock.toFixed(2), shotClock: M && +M.shotClock.toFixed(2), score: M && M.score.slice(), possession: M && M.possession,
    ball: B && { x: +B.x.toFixed(1), y: +B.y.toFixed(1), z: +B.z.toFixed(1), state: B.state, owner: B.owner ? B.owner.slot : null },
    players: S.players.map(p => ({ slot: p.slot, id: p.name, team: p.team, x: +p.x.toFixed(1), y: +p.y.toFixed(1), z: +p.z.toFixed(1), state: p.act ? p.act.type : p.stun > 0 ? 'down' : 'free', turbo: +p.turbo.toFixed(2), nova: novaOf(p), powerup: p.pu, source: p.input ? 'human' : 'cpu' })),
    lastEvents: S.events.slice(-10).map(e => e.type), ui: { screen: game.sceneName, dev: S.dev.open }, attract: { segment: attractN }, net: { role: S.hub ? 'parallel' : 'none' }
  };
};
game.debug = {
  snapshot,
  teleport(slot, x, y) { const p = S.players[slot]; p.x = x; p.y = y; },
  give(slot) { giveBall(S.players[slot]); },
  setScore(a, b) { S.match.score = [a, b]; },
  setClock(s) { S.match.clock = s; },
  setQuarter(q) { S.match.quarter = q; },
  force(name, ...args) { const f = { shatter: () => shatterBoard(HOOPS[1]), nova: t => { S.match.novaT[t || 0] = 40; }, powerup: (id, x, y) => S.powerups.push({ id, x, y, t: 0, life: 14 }), end: () => endGame(), quarterEnd: () => endQuarter() }[name]; return f && f(...args); },
  go(scene, data) { game.go(scene, data, { fade: 0 }); },
  spawnPowerup(id, x, y) { S.powerups.push({ id, x, y, t: 0, life: 14 }); },
  cheat(name, on) { S.cheats[name] = on; },
  tune(k, v) { if (TUNING[k]) TUNING[k].v = v; }
};
const __bb = { S, game, TUNING, TEAMS, COURTS, DUNKS, COURT, HOOPS, LESSONS, emit, on, newMatch, matchStep, cmdFor, aiCmd, resetTuning, tune, store, scenes, snapshot, debug: game.debug, giveBall, startTour, startCamp, startExhibition, setupState, hubState, hubFinish, rigState, finishMatch, resultsFor: () => resultsFor, NOCMD, startDunk, startJump, passTo, throwOop, startSwipe, startShove, startSpin, camp: () => camp, lessonSetup, devRows, DEV_TOOLS, SONGS, SFX, LINES, TOUR, announce, babble, VOICES, KEYS };
if (typeof globalThis !== 'undefined') globalThis.__bb = __bb;
if (HAS_WIN) window.__bb = __bb;

const hash = (HAS_WIN && window.location && window.location.hash || '').slice(1).split('/');
let first = HUB ? 'hubwait' : 'title', firstData;
if (!HUB && hash[0]) {
  if (hash[0] === 'attract') first = 'attract';
  else if (hash[0] === 'exhibition') { first = 'match'; firstData = { cfg: { teams: [TEAM_BY_ID[hash[2] && hash[2].split('-')[0]] ? TEAM_BY_ID[hash[2].split('-')[0]].idx : 0, TEAM_BY_ID[hash[2] && hash[2].split('-')[1]] ? TEAM_BY_ID[hash[2].split('-')[1]].idx : 1], court: COURTS[hash[1]] ? hash[1] : 'alley', mode: 'exhibition', humans: { 0: game.input }, qLen: 60, difficulty: 'Pro' } }; }
  else if (hash[0] === 'dev') { first = 'match'; firstData = { cfg: { teams: [0, 1], court: 'alley', mode: 'exhibition', humans: { 0: game.input }, qLen: 60, difficulty: 'Pro' } }; }
  else if (hash[0] === 'camp') { first = 'match'; firstData = { camp: true }; }
  else if (hash[0] === 'tour') { first = 'tourmap'; firstData = { team: 0, stop: clamp((+hash[1] || 1) - 1, 0, 3), phase: 'pre' }; }
  else if (scenes[hash[0]]) first = hash[0];
  else if (hash[0] === 'about') first = 'credits';
}
game.start({ scene: first, data: firstData, scenes: Object.assign({}, scenes), boot: { title: 'BASKETBLAM', steps: [['Waxing the court', () => { getCourtMap('alley'); }], ['Inflating the ball', () => { }]] } });
if (hash[0] === 'dev' && !HUB) S.dev.open = true;
if (HUB) hubConnect();
