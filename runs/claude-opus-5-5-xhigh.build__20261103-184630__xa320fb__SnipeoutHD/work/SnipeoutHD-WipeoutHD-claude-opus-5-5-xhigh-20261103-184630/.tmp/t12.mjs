import { load } from '../tests/lib/vm.mjs';
import { drillBot, drive } from '../tests/lib/bot.mjs';
const { SN, game } = load({ quiet: true }); await game.booted;
SN.flow.start({ mode: 'academy', track: 'solenne', cls: 'SPARK', team: 'kestrel', pilot: 'vale', intro: false, drill: 4 }); game.advance(.5);
const R = game.debug.race(), A = R.academy, b = drillBot(SN, game), T = R.track;
game.advance(.7);
const pads = T.pads.filter(q => q.kind === 'speed');
for (let k = 0; k < 6000; k++) {
  drive(game, [b], 1 / 120); const s = R.player, ds = T.dS(A.data.s0, s.s) / 16;
  if (ds > 936 && ds < 948) { const p = pads[4]; console.log('PAD', p.id, (T.dS(p.s, s.s) / 16).toFixed(2), (p.hl / 16), ((s.u - p.u) / 16).toFixed(2), p.hw / 16, 'grounded', s.grounded, 'h', s.h.toFixed(1), 'cd', s.padCD[p.id], R.t.toFixed(2), 'state', R.state, A.state, R.events.map(e => e.t).join(',')); }
  if (ds > 1000 || A.state !== 'go') break;
}
console.log('END', A.state, A.i, 'pads', A.data.pads, A.msg, 'passed', A.passed);
