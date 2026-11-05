import { load } from '../lib/load.mjs';
export default function (t) {
  const { game, G } = load({});
  game.advance(.3);
  G.state = G.newState('mei', 2); G.dayStart(); G.state.slot = 1;
  const go = d => { game.go('poolhop', d, { fade: 0 }); game.advance(.05); return game.scene; };
  const P = go({ bot: true, seed: 3 }); for (let i = 0; i < 120 * 45 && P.state !== 'results'; i++) game.advance(1 / 120);
  const PR = P.result; t.ok('a perfect bot clears it, all PERFECT, in time', PR && PR.cleared && PR.perf === 32 && PR.falls === 0, JSON.stringify(PR));
  // a wrong-button player falls, swims back and goes again
  const Q = go({ seed: 3 }); let fell = false, resumed = false;
  for (let i = 0; i < 120 * 30 && Q.state !== 'results'; i++) {
    if (Q.state === 'hop') { const next = Q.i + 1, due = Q.dueBeat(next), b = Q.beat(), want = Q.padButtons(next, due); if (b > due - .02) { const k = fell && !resumed ? want[0] : (want[0] + 1) % 4; game.input.tap(['hopA', 'hopB', 'hopX', 'hopY'][k]); if (want.length > 1 && fell && !resumed) game.input.tap(['hopA', 'hopB', 'hopX', 'hopY'][want[1]]); } }
    game.advance(1 / 120); if (Q.state === 'fall') fell = true; if (fell && Q.state === 'hop' && Q.i > 0) resumed = true;
  }
  t.ok('a wrong button: she falls', fell && Q.falls >= 1); t.ok('she swims back and hops on', resumed);
  // double pads need both buttons
  const R = go({ seed: 3 }); const p = R.pads.findIndex((q, i) => i > 0 && q.b !== null); t.ok('double pads from pad 22', p === G.POOL.DOUBLE && R.pads[p].b !== null);
  t.ok('wobble pads from pad 12', R.pads[12].alt !== null && R.pads[11].alt === null);
  // the payout formula
  t.ok('prize: 2,000 + 400 a perfect + 150 a second left', PR.prize === Math.round((2000 + 400 * PR.perf + 150 * Math.max(0, G.T.poolTime - PR.time)) * G.T.prizeMul), PR.prize);
  t.ok('no errors', !game.errors.length, game.errors.slice(0, 2).map(e => e.message).join('|'));
}
