import { load } from '../lib/load.mjs';
export default async t => {
  const { G, game } = load(); game.advance(.5); const T = game.debug.tools;
  T.newVacation('rin', 2); G.go('location', { loc: 'beach' }, { fade: 0 }); game.advance(.3);
  G.dev.open(); game.advance(.1); t('Dev Mode opens and freezes time', G.overlay.has('dev') && game.timeScale === 0);
  G.dev.tab = 5; G.dev.focus.i = 2; game.advance(.05); const row = G.dev.focus.cur; t('the Tuning tab lists sliders', row && row.kind === 'slider', row && row.label);
  const k0 = row.key, v0 = G.T[k0]; game.input.tap('right'); game.advance(.05); t('a slider changes G.T live', G.T[k0] !== v0, k0 + ' ' + v0 + ' -> ' + G.T[k0]);
  G.resetTuning(); t('reset restores defaults', G.T[k0] === v0);
  // gravity changes the flight time
  const B = G.Ball, L1 = B.make(0, [0, 0, 20], [0, 0, 150]); G.T.ballGravity = 450; const L2 = B.make(0, [0, 0, 20], [0, 0, 150]); G.resetTuning();
  t('gravity changes the flight', L2.tLand < L1.tLand);
  game.input.tap('cancel'); game.advance(.1); t('Back restores time', !G.overlay.has('dev') && game.timeScale === 1);
  T.match({ opp: ['lola', 'tess'] }); game.advance(1); t('jump tools land in the right scenes', game.sceneName === 'match');
  T.forcePoint(0); game.advance(.1); t('force a point', G.M.score[0] === 1, G.M.score);
  T.goto('poolhop'); game.advance(.2); t('goto Pool Hop', game.sceneName === 'poolhop');
  t('no errors', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
};
