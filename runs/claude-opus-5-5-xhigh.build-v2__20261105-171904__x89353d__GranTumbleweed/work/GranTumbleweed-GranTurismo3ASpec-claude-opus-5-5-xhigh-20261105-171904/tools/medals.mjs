// node tools/medals.mjs: runs each licence test's AI demonstration at 97% pace, and freezes the medal times.
// gold = T x 1.03, silver = T x 1.09, bronze = T x 1.18.
import { writeFileSync } from 'node:fs';
import { TESTS, TEST_IDS } from '../src/game/data/licences.js';
import { runHeadless } from '../src/game/sim/licence.js';
const out = {}; const lines = [];
for (const id of TEST_IDS) {
  const r = runHeadless(TESTS[id]);
  if (r.status !== 'pass') { console.log(`${id}: demonstration FAILED: ${r.reason}`); process.exitCode = 1; continue; }
  const T = r.time, f = (x) => Math.round(T * x * 100) / 100;
  out[id] = { demo: Math.round(T * 100) / 100, gold: f(1.03), silver: f(1.09), bronze: f(1.18) };
  lines.push(`  '${id}': ${JSON.stringify(out[id])},`);
  console.log(id, T.toFixed(2));
}
if (!process.exitCode) writeFileSync(new URL('../src/game/data/medals.js', import.meta.url), `// Written by tools/medals.mjs from the AI demonstrations (gold T x 1.03, silver x 1.09, bronze x 1.18). Frozen here.\nexport const MEDALS = {\n${lines.join('\n')}\n};\n`);
