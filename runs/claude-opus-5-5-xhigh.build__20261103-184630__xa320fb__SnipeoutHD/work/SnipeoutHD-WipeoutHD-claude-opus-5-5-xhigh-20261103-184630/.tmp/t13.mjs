import { load } from '../tests/lib/vm.mjs';
import { drillBot, drive } from '../tests/lib/bot.mjs';
const { SN, game } = load({ quiet: true }); await game.booted;
SN.flow.start({ mode: 'academy', track: 'solenne', cls: 'SPARK', team: 'kestrel', pilot: 'vale', intro: false, drill: 4 }); game.advance(1.2);
const R = game.debug.race(), A = R.academy, b = drillBot(SN, game), T = R.track;
const pads = T.pads.filter(q => q.kind === 'speed');
let nPadEv = 0;
for (let k = 0; k < 6000; k++) {
  drive(game, [b], 1 / 120); const s = R.player;
  for (const e of R.events) if (e.t === 'pad') { nPadEv++; console.log('pad event', R.t.toFixed(2), 'ship', e.ship.idx, e.ship === s, 'D.pads', A.data.pads, 'state', A.state, 'near', pads.map(p => Math.round(T.dS(p.s, s.s) / 16)).join(',')); }
  { const p = pads[4], d = T.dS(p.s, s.s) / 16; if (d > -60 && d < 8 && k % 6 === 0) console.log('to pad2', d.toFixed(1), 'u', (s.u / 16).toFixed(2), 'pad u', p.u / 16, 'vp', SN.vpad[0].steer.toFixed(2), SN.vpad[0].brakeL.toFixed(1), SN.vpad[0].brakeR.toFixed(1), 'kmh', Math.round(s.kmh), 'wall', s.u > 0 ? '' : ''); }
  if (A.state !== 'go') break;
}
console.log('END', A.state, 'pads', A.data.pads, 'events', nPadEv, 'drone?', R.ships.map(s => s.control + (s.hidden ? 'H' : '')));
