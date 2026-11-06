#!/usr/bin/env node
// One command: node tests/run.mjs [--only sim|play|browser|hub|visit|sheets]. Prints only failures and a one-line count.
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)); const root = join(here, '..');
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const SUITES = { sim: ['node', ['tests/sim/sim.mjs']], play: ['node', ['tests/play/playthrough.mjs']], replay: ['node', ['tests/play/replay.mjs']], input: ['node', ['tests/play/input.mjs']], browser: ['python3', ['tests/browser/browser_suite.py']], hub: ['python3', ['tests/browser/hub_suite.py']], visit: ['python3', ['tests/browser/visit_suite.py']], sheets: ['node', ['kit/check.mjs', '--sheets', 'src/art/models.js']] };
let bad = 0, ran = 0;
for (const [name, [cmd, args]] of Object.entries(SUITES)) {
  if (only && only !== name && !(only === 'play' && (name === 'replay' || name === 'input'))) continue; ran++;
  const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26, timeout: 1200000 });
  const out = (r.stdout + r.stderr).split('\n').filter((l) => /FAIL|failed|problem|crash|Error:/.test(l) && !l.startsWith('`)')).slice(0, 30).map((l) => l.slice(0, 300));
  if (r.status !== 0) { bad++; console.log(`[${name}]`); console.log(out.join('\n')); }
}
console.log(`${ran - bad}/${ran} suites passed`); process.exit(bad ? 1 : 0);
