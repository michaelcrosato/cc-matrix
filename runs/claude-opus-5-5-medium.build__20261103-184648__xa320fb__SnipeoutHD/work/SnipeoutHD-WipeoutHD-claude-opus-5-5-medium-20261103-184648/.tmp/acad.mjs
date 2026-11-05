import { load } from '../tests/lib/vm.mjs';
import { runRace, academyBot } from '../tests/lib/t.mjs';
const ctx = load(), SN = ctx.SN, g = ctx.My3D2dge.current, I = g.input; g.advance(.5);
SN.save.data.team = 'volta'; SN.save.data.pilot = 'luca'; g.go('loading', { setup: SN.Academy.setup() }); g.advance(1.2); const A = SN.Academy, bot = academyBot(ctx), R = SN.scenes.race.race;
for (let k = 0; k < 200 && g.sceneName === 'race'; k++) { if (A.phase === 'card') { I.tap('confirm'); g.advance(.05); } for (let q = 0; q < 6; q++) { runRace(ctx, 1/6, bot); const h = R.humans[0]; if (false) console.log(A.d.id, A.phase, 'u', (h.u/16).toFixed(1), 'gates', A.gates.map(x => x.done + ':' + (x.u/16) + '@' + (SN.wrapDiff(h.s, x.s, R.track.L)/16).toFixed(0)).join(' '), 'v', (h.V && SN.Ship.speed(h)/16).toFixed(0)); } if (A.i > 10) break; }
console.log('at', A.d.id, A.passed, A.retries, g.sceneName);
