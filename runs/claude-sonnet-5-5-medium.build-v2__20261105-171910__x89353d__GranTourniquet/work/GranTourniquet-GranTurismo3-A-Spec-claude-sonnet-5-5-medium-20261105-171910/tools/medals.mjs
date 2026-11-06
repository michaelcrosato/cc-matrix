// node tools/medals.mjs : runs the AI demonstration for every test and freezes medal times into src/game/data/medals.js
import { writeFileSync } from 'node:fs';
import { TESTS } from '../src/game/data/licences.js';
import { runDemo } from '../src/game/sim/licence.js';
const out = {}; let bad = 0;
for (const t of TESTS) { const r = runDemo(t); if (!r.ok) { console.log('FAIL', t.id, r.reason, r.runs); bad++; continue; } const T = r.time, f = (m) => Math.round(T * m * 100) / 100; out[t.id] = { demo: Math.round(T * 100) / 100, gold: f(1.03), silver: f(1.09), bronze: f(1.18) }; console.log(t.id, JSON.stringify(out[t.id])); }
if (!bad) writeFileSync(new URL('../src/game/data/medals.js', import.meta.url), '// Frozen by tools/medals.mjs: the AI demonstration at skill 0.97 is T; gold T*1.03, silver T*1.09, bronze T*1.18.\nexport const MEDALS = ' + JSON.stringify(out, null, 1) + ';\n');
process.exit(bad ? 1 : 0);
