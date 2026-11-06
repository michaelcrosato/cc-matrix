// Runs tools/audit.mjs: every line of PLAN.md has evidence, and the plan's numbers and words match the game's data.
import { spawnSync } from 'node:child_process';
import { suite } from './_lib.mjs';
const t = suite(), r = spawnSync(process.execPath, ['tools/audit.mjs'], { encoding: 'utf8', maxBuffer: 1 << 26 }), out = String(r.stdout).trim().split('\n');
for (const l of out.filter((x) => x.startsWith('FAIL'))) t.ok(false, l);
t.ok(r.status === 0, `audit exit ${r.status}: ${out.at(-1)}`); t.ok(/audit: \d+ lines, 0 failing/.test(out.at(-1)), out.at(-1));
t.done();
