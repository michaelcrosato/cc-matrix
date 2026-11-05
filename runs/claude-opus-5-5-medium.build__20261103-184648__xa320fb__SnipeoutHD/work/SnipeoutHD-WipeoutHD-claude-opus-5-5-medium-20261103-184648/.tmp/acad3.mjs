import { load } from '../tests/lib/vm.mjs';
import { runRace, academyBot } from '../tests/lib/t.mjs';
const ctx = load(), SN = ctx.SN, g = ctx.My3D2dge.current, I = g.input; g.advance(.5);
SN.save.data.team = process.argv[2] || 'volta'; SN.save.data.pilot = 'luca';
g.go('loading', { setup: Object.assign(SN.Academy.setup(), { startDrill: 2 }) }); g.advance(1.2); const A = SN.Academy, bot = academyBot(ctx), R = SN.scenes.race.race;
for (let k = 0; k < 3; k++) { if (A.phase === 'card') { I.tap('confirm'); g.advance(.05); } for (let q = 0; q < 40 && A.phase === 'run'; q++) { runRace(ctx, .25, bot); const h = R.humans[0]; if (q % 2 == 0) console.log(q, 'kmh', (SN.Ship.fwdSpeed(h) * SN.KMH).toFixed(0), 'u', (h.u / 16).toFixed(1), 'brake', A.st.brake.toFixed(2), 'wall', A.st.wall, 'bL', (h.ctl.brakeL||0).toFixed(2), 'bR', (h.ctl.brakeR||0).toFixed(2), 'in', R.track.inRange(h.s, R.track.knots[18], R.track.knots[20])); } console.log('result', A.ok, A.phase); g.advance(2.5); }
