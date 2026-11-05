/* BATZOOKA BASEBALL: boot and start. Deep links: #title #attract #match #derby #training/<n> #tour #about #touch #hub */
BZ.debugApi = () => ({
  snapshot() { const M = BZ.M; return { scene: game.sceneName, phase: M && M.phase, score: M && M.score, inn: M && M.inn, half: M && M.half, outs: M && M.outs, balls: M && M.balls, strikes: M && M.strikes, over: M && M.over, errors: game.errors.length }; },
  M: () => BZ.M, BZ, setup(o) { game.go('match', o); }
});
game.debug = BZ.debugApi();
const hash = (location.hash || '').replace('#', '').split('/');
const startScene = (window.AIHub && window.AIHub.active) ? 'hub' : hash[0] === 'hub' ? 'hub' : 'title';
const scenes = BZ.scenes;
for (const k in scenes) { scenes[k].name = k; }
game.start({
  scene: startScene, scenes,
  boot: { title: 'BATZOOKA BASEBALL', steps: [['Painting the ballpark', () => { BZ.buildPark(BZ.get('parks', 'corn')); }], ['Warming up the organ', () => { BZ.initAudio(game); }]] }
});
// deep links: the title follows one once, on its first frame (#match, #derby, #attract, #training/<n>, ...)
BZ.deepLink = () => {
  const h = hash[0]; BZ.deepLink = null;
  if (startScene === 'hub') return false;
  if (h === 'match') game.go('match', { park: hash[1] || 'corn', away: { team: 'hay' }, home: { team: 'cin' }, innings: 3, humans: [true, false] });
  else if (h === 'derby') game.go('match', { derby: true, park: hash[1] || 'corn', players: ['P1'], outs: 7, humans: [true, false], innings: 99 });
  else if (h === 'attract') game.scene.startAttract();
  else if (h === 'training' && hash[1]) game.go('match', { lesson: +hash[1], humans: [true, false], park: 'corn', away: { team: 'hay' }, home: { team: 'cin' }, innings: 99, diff: .4 });
  else if (['tour', 'about', 'setup', 'training', 'derbysetup', 'tourmap', 'clubhouse', 'results'].includes(h)) game.go(h);
  else return false;
  return true;
};
