import { G } from './sim.mjs';
const { createMatch } = G;
let shown = 0;
for (let s = 1; s < 40 && shown < 2; s++) {
G.RNG.play = G.mkrng(s);
const M = createMatch({ overs: 2, wickets: 3, diff: 1, chaos: 'none' }); M.start();
let log = [], st = 0, was = false;
const offs = [];
for (const t of ['contact', 'pickup', 'throw', 'stumps', 'run', 'ball:end', 'dropped', 'boundary']) offs.push(G.on(t, e => log.push(M.t.toFixed(2) + ' ' + t + ' ' + JSON.stringify(e).slice(0, 60))));
let rec = false;
while (!M.over && st < 120 * 100 && shown < 2) { 
  const before = M.ph; M.step(1 / 120, {}); st++;
  if (M.ph === 'between' && before === 'inplay') { if (log.some(l => /throw|run/.test(l)) && log.some(l=>/stumps/.test(l))) { console.log('--- seed', s); console.log(log.join('\n')); shown++; } log = []; }
  if (M.ph === 'setup') log = [];
}
for (const o of offs) o();
}
