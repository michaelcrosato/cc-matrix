import { load } from '../tests/lib/vm.mjs';
import { runRace, errs, academyBot } from '../tests/lib/t.mjs';
const ctx = load(), SN = ctx.SN, g = ctx.My3D2dge.current, I = g.input;
const tap = (a, t = .25) => { I.tap(a); g.advance(t); };
g.settings.set('difficulty', 'Easy'); g.advance(.5); tap('confirm', .6);
SN.UI.focus = SN.UI.items().findIndex(i => i.id === 'academy'); tap('confirm', 1.5);
const A = SN.Academy, bot = academyBot(ctx);
for (let k = 0; k < 500 && g.sceneName === 'race'; k++) { if (A.phase === 'card') tap('confirm', .05); runRace(ctx, 1, bot); if (k % 20 === 0) console.log(k, A.i, A.phase, A.passed, A.retries, g.sceneName); }
console.log('end', g.sceneName, A.passed, A.retries, errs(g));
