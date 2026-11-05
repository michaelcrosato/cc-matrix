import { load } from '../tests/lib/vm.mjs';
import { drillBot, drive } from '../tests/lib/bot.mjs';
const { SN, game } = load({ quiet: true }); await game.booted;
SN.flow.start({ mode: 'academy', track: 'solenne', cls: 'SPARK', team: 'kestrel', pilot: 'vale', intro: false, drill: 1 }); game.advance(.5);
const R = game.debug.race(), A = R.academy, b = drillBot(SN, game);
console.log('drill', A.i, A.state);
for (let k = 0; k < 40; k++) { drive(game, [b], .1); const s = R.player, g = A.gates && A.gates[A.data.gates]; console.log(k, A.state, 'gates', A.data.gates, 'ds', g ? Math.round(R.track.dS(s.s, g.s)) : '-', 'u', Math.round(s.u), 'gu', g ? g.u : '-', 'kmh', Math.round(s.kmh), A.msg || '', 'vp', SN.vpad[0].steer.toFixed(2)); if (A.state !== 'go' && k > 5) break; }
