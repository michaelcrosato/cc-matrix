import { G } from './sim.mjs';
const { createMatch } = G; let shown = 0;
for (let s = 1; s <= 60 && shown < 3; s++) {
  G.RNG.play = G.mkrng(s * 5);
  const M = createMatch({ overs: 3, wickets: 99, diff: 1, chaos: 'none' }); M.start(); let st = 0, log = [];
  const offs = ['contact', 'pickup', 'throw', 'stumps', 'run', 'ball:end'].map(t => G.on(t, e => log.push(M.t.toFixed(2) + ' ' + t + (t === 'ball:end' ? ' ' + e.kind + ' ' + (e.how || e.runs) : ''))));
  let hit = null;
  while (M.inn === 0 && !M.over && st < 120 * 400 && shown < 3) {
    const ph0 = M.ph; M.step(1 / 120, {}); st++;
    if (M.ph === 'setup') log = [];
    if (ph0 === 'inplay' && M.ph === 'between' && M.last.how === 'runout') { console.log('seed', s); console.log(log.join('\n')); console.log('batters', M.batters.map(b => b.y | 0)); shown++; }
  }
  offs.forEach(o => o());
}
