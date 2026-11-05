// Measures the reference bot's time through each stage (the medals' and the clean mission's par are taken from it).
import { boot } from './boot.mjs';
const B = boot({ quiet: true }); const OB = B.OB;
const out = {};
for (const s of OB.STAGES) {
  const r = new OB.Race({ mode: 'trial', car: 'orchidea', seed: 11, route: [s.id], traffic: true, cheats: {}, bot: new OB.Brain({ forks: [], skill: 1, drift: true }) });
  for (let i = 0; i < 120 * 900 && r.status !== 'finish' && r.status !== 'goal'; i++) r.step(1 / 120, null);
  out[s.id] = +r.elapsed.toFixed(1);
}
console.log(JSON.stringify(out));
process.exit(0);
