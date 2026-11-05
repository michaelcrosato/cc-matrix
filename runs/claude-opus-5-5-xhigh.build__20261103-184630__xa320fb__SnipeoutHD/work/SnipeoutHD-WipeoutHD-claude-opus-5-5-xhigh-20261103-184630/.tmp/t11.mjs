import { load } from '../tests/lib/vm.mjs';
import { drillBot, drive } from '../tests/lib/bot.mjs';
const { SN, game } = load({ quiet: true }); await game.booted;
SN.flow.start({ mode: 'academy', track: 'solenne', cls: 'SPARK', team: 'kestrel', pilot: 'vale', intro: false, drill: 4 }); game.advance(.5);
const R = game.debug.race(), A = R.academy, b = drillBot(SN, game), T = R.track;
console.log('pads', T.pads.filter(p => p.kind === 'speed').map(p => [Math.round(T.dS(A.data.s0, p.s) / 16), Math.round(p.u / 16)]));
for (let k = 0; k < 200; k++) { drive(game, [b], .1); const s = R.player; if (k % 8 === 0 || A.state !== 'go') console.log(k, A.state, 'ds', Math.round(T.dS(A.data.s0, s.s) / 16), 'u', (s.u / 16).toFixed(1), 'pads', A.data.pads, 'kmh', Math.round(s.kmh), A.msg || ''); if (A.state !== 'go') break; }
