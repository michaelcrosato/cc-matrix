import { load } from '../lib/load.mjs';
export default async t => {
  const { G, game } = load(); game.advance(.5); game.debug.tools.newVacation('lola', 4);
  G.poolBot = true; G.go('poolhop', null, { fade: 0 }); game.advance(.1); const P = G.SCENES.poolhop;
  for (let i = 0; i < 60 && P.state !== 'end'; i++) game.advance(1);
  t('a perfect bot clears under the time', P.won && P.k === 32, P.k + ' ' + P.state + ' left ' + P.timeLeft);
  t('all PERFECT, no falls', P.perfects === 32 && P.falls === 0, P.perfects + '/' + P.falls);
  t('prize formula', P.prize === Math.round((2000 + 400 * 32 + 150 * P.timeLeft) / 100) * 100 * 1, P.prize);
  G.poolBot = false; G.go('poolhop', null, { fade: 0 }); game.advance(.1); const Q = G.SCENES.poolhop;
  // a wrong-button bot: press the button after the right one, on the beat
  for (let s = 0; s < 120 * 12 && Q.falls === 0; s++) { if (Q.state === 'play') { const due = (Q.startBeat + Q.k + 1 + Q.offset) * Q.spb; if (Math.abs(Q.clock - due) < 1 / 240) game.input.tap(G.HOPS[(Q.padNeed(Q.k)[0] + 1) % 4]); } game.advance(1 / 120); }
  t('a wrong button falls', Q.falls >= 1);
  const states = new Set(); for (let s = 0; s < 120 * 5; s++) { game.advance(1 / 120); states.add(Q.state); }
  t('and recovers to play on', states.has('wait') && states.has('play'), [...states].join(','));
  t('double pads need two buttons', G.SCENES.poolhop.pads[25].need.length === 2 && G.SCENES.poolhop.pads[5].need.length === 1);
  t('no errors', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
};
