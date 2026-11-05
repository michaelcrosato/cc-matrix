// The one test command: rebuilds, runs every suite (or --only a,b), prints only failing checks and one count line.
import { execFileSync } from 'node:child_process';
import { SUITES } from '../tests/suites.mjs';
import { results } from '../tests/harness.mjs';
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
if (!args.includes('--no-build')) execFileSync(process.execPath, [new URL('./build.mjs', import.meta.url).pathname], { stdio: 'ignore' });
const t0 = Date.now();
for (const name of Object.keys(SUITES)) {
  if (only && !only.includes(name)) continue;
  try { SUITES[name](); } catch (e) { results.fail++; results.failures.push(`${name} > suite crashed: ${e && e.stack ? e.stack.split('\n').slice(0, 2).join(' ') : e}`); }
}
for (const f of results.failures) console.log(f);
const s = Math.round((Date.now() - t0) / 1000);
console.log(`MASH TV tests: ${results.pass} passed, ${results.fail} failed (${Math.floor(s / 60)}m ${s % 60}s)`);
process.exit(results.fail ? 1 : 0);
