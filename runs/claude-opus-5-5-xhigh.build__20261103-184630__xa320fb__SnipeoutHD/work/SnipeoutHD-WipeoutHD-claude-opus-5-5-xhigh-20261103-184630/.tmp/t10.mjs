import { load } from '../tests/lib/vm.mjs';
import { drillBot, drive } from '../tests/lib/bot.mjs';
const { SN, game } = load({ quiet: true }); await game.booted;
for (let d = 0; d < 11; d++) {
  SN.flow.start({ mode: 'academy', track: 'solenne', cls: 'SPARK', team: 'kestrel', pilot: 'vale', intro: false, drill: d }); game.advance(.5);
  const R = game.debug.race(), A = R.academy, b = drillBot(SN, game); let t = 0, res = null, msgs = [];
  while (t < 120) { drive(game, [b], .25); t += .25; if (A.state === 'pass' && A.i === d) { res = 'PASS'; break; } if (A.state === 'fail') { msgs.push(A.msg); if (msgs.length >= 3) break; } if (A.i > d) { res = 'PASS'; break; } }
  b.stop(); console.log(d, SN.DRILLS[d].id, res || 'FAIL', 'tries', msgs.length, msgs.join(' / '), 'kmh', Math.round(R.player.kmh), 'energy', Math.round(R.player.energy));
}
