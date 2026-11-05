// mission: objectives in order ('after'), optional ones, triggers once, the timer's fail, the escort's fail, the generic
// fail hook, checkpoints; the score formula by hand; rank thresholds; unlocks; the save round trip
export default async function (t) {
  const { B, check, game } = t; t.step(.3);
  t.load('m1', { mode: 'story', cheats: { god: true } }); B.Cutscene.clear(); let M = B.M;
  const ob = id => M.objectives.find(o => o.id === id);
  check('escape waits for the kill and the boss', ob('escape').state === 'hidden', ob('escape').state);
  check('the ledger is optional and active', ob('ledger').optional && ob('ledger').state === 'active', ob('ledger').state);
  const p = M.pickups.find(p => p.id === 'ledger'); game.debug.teleport(p.x, p.y, p.z); t.step(.3);
  check('taking the ledger completes the optional task', ob('ledger').state === 'done' && M.stats.optionalDone === 1, ob('ledger').state);
  const tr = M.triggers.find(x => x.id === 'l'); check('a trigger fires once', tr.fired, tr.fired);
  game.debug.kill('kanemori'); t.step(.3); check('the kill completes its objective, the boss shows', ob('kill').state === 'done' && ob('boss').state === 'active', ob('boss').state);
  M.bosses[0].hp = 1; B.Bosses.defeat(M.bosses[0], M); M.bosses[0].alive = false; t.step(.3);
  check('escape opens after both', ob('escape').state === 'active', ob('escape').state);
  // the timer (Moon over Kokaku)
  t.load('m3', { mode: 'story' }); B.Cutscene.clear(); M = B.M; M.timer.t = 1; t.step(1.6);
  check('the moon timer fails the mission', M.ended && M.result === 'fail' && /cup/.test(M.failed), M.failed);
  for (let i = 0; i < 20 && game.sceneName !== 'story'; i++) t.step(.25); check('the lord raises his cup (the fail cutscene)', game.sceneName === 'story', game.sceneName);
  t.step(.5); t.hold('start'); t.step(1); t.hold('start', false); for (let i = 0; i < 20 && !(game.sceneName === 'mission' && B.M.overMenu); i++) t.step(.25); check('then the fail overlay in the mission', game.sceneName === 'mission' && !!B.M.overMenu, game.sceneName + ' ' + !!B.M.overMenu);
  // the escort (Kiri Lake)
  t.load('m2', { mode: 'story' }); B.Cutscene.clear(); M = B.M; B.Mission.actions(M, [['release']]); t.step(.2); M.escort.hp = 1; B.damage(null, M.escort, 5, { kind: 'test' }); t.step(.2);
  check('Tobei falls: the mission fails', M.ended && M.failed === 'Tobei has fallen.', M.failed);
  t.load('m2', { mode: 'story' }); B.Cutscene.clear(); M = B.M; B.Mission.fail(M, 'The target escaped.'); check('the generic fail hook', M.failed === 'The target escaped.' && M.result === 'fail', M.failed);
  // checkpoints keep objectives and positions
  t.load('m2', { mode: 'story' }); B.Cutscene.clear(); M = B.M; B.Mission.actions(M, [['release']]); t.step(.2); game.debug.teleport(40 * 16, 20 * 16, 0); B.Mission.checkpoint(M, 'quiet');
  const N = B.Mission.restore(M, M.snap); check('a checkpoint restores objectives and the hero', N.objectives.find(o => o.id === 'rescue').state === 'done' && Math.abs(N.hero.x - 640) < 1 && !N.escort.caged && N.stats.retries === 1, JSON.stringify(N.objectives.map(o => o.state)));
  // the score by hand
  M.stats = { time: 500, silentCuts: 4, kills: 2, cleanKills: 1, detections: 1, civiliansHarmed: 0, optionalDone: 1, toolsUsed: 3, retries: 1, damageTaken: 10, marks: 0, cutKinds: {} };
  const want = 1000 + 600 + 50 + 100 + 300 - 150 + 0 - 0 - 200 + 0 + Math.min(500, 720 - 500), sc = B.Score.story(M, 720).total;
  M.stats.detections = 6; const capped = B.Score.story(M, 720).total; check('the detection penalty is capped at three', capped === want - 300, capped + ' vs ' + (want - 300)); M.stats.detections = 1;
  check('the score formula', sc === want, sc + ' vs ' + want);
  const R = v => B.Score.rank(v)[1]; check('rank thresholds', R(2600) === 'Grand Kaiseki' && R(2599) === 'Makunouchi' && R(1400) === 'Ekiben' && R(600) === 'Hinomaru' && R(599) === 'Leftovers', [R(2600), R(2599), R(1400), R(600), R(599)].join(','));
  const sv = B.Save.fresh();
  check('unlocks by rank', B.Score.unlocks('m1', 'Ekiben', sv).includes('dango') && !B.Score.unlocks('m1', 'Hinomaru', sv).includes('dango') && B.Score.unlocks('training', 'Makunouchi', sv).includes('plum') && B.Score.unlocks('m2', 'Makunouchi', sv).includes('firepot') && B.Score.unlocks('training', 'Grand Kaiseki', sv).includes('cloak'), '');
  B.Save.data = Object.assign(B.Save.fresh('kaede'), { nextMission: 'm2', completed: { training: true, m1: true }, tools: ['dango'] }); B.Save.write(); B.Save.data = null;
  const s = game.saves.latest(); game.saves.load(s.slot); const d = B.Save.get();
  check('the save round trip', d.character === 'kaede' && d.nextMission === 'm2' && d.completed.m1 && d.tools.includes('dango'), JSON.stringify(d));
}
