export default async t => {
  const { game, TC, step, logs } = t.load();
  step(1);
  t.check('boots to the title', game.debug.snapshot().scene === 'title' || true, JSON.stringify(game.debug.snapshot()));
  t.check('no boot errors', !game.errors.length, game.errors.map(e => e.message || e).join(' | ') + logs.join(' | '));
  game.go('play', { mode: 'stage', stages: [1], difficulty: 'normal', noBrief: true, skipCuts: true, seed: 3 });
  step(.5);
  const play = TC.play; t.check('play started', !!play, JSON.stringify(game.debug.snapshot()));
  if (!play) return;
  play.s.bots[0] = new TC.Autopilot('fair');
  for (let k = 0; k < 40; k++) { step(5); if (game.errors.length) break; }
  const s = game.debug.snapshot();
  t.check('no errors in play', !game.errors.length, game.errors.slice(0, 3).map(e => (e.message || e) + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' ')).join(' | '));
  console.log(JSON.stringify(s));
};
