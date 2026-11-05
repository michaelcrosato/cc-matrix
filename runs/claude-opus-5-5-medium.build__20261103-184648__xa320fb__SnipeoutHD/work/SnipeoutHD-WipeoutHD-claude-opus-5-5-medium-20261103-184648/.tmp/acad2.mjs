import { load } from '../tests/lib/vm.mjs';
import { runRace, academyBot } from '../tests/lib/t.mjs';
const ctx = load(), SN = ctx.SN, g = ctx.My3D2dge.current, I = g.input; g.advance(.5);
g.go('loading', { setup: Object.assign(SN.Academy.setup(), { startDrill: 5 }) }); g.advance(1.2); const A = SN.Academy, bot = academyBot(ctx), R = SN.scenes.race.race;
for (let k = 0; k < 80 && A.i === 5; k++) { if (A.phase === 'card') { I.tap('confirm'); g.advance(.05); } runRace(ctx, .25, bot); const h = R.humans[0]; console.log(A.phase, 't', A.t.toFixed(1), 'w', h.weapon, 'u', (h.u/16).toFixed(1), 'ds drone', A.drone ? (SN.wrapDiff(h.s, A.drone.s, R.track.L)/16).toFixed(0) : '-', 'dr u', A.drone && A.drone.u.toFixed(0), 'proj', R.weapons.proj.length, R.log.slice(-3).map(e => e.t).join(',')); }
