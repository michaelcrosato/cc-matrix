// THE test command: node tests/run.mjs [filter] [--browser]. Runs each suite in its own process (the engine loads into
// the process's own context), prints only failures and one line: "N passed, M failed (T s)". Exit code 1 on a failure.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const DIR = join(dirname(fileURLToPath(import.meta.url)), 'suites');
const args = process.argv.slice(2), browser = args.includes('--browser'), filter = args.find(a => !a.startsWith('--'));
const t0 = Date.now(); let pass = 0, fail = 0;
for (const f of readdirSync(DIR).filter(f => f.endsWith('.test.mjs')).sort()) {
  if (f.startsWith('browser') && !browser) continue;
  if (filter && !f.includes(filter)) continue;
  const r = spawnSync(process.execPath, [join(DIR, f)], { encoding: 'utf8', timeout: 900000, env: Object.assign({}, process.env, { TMPDIR: join(DIR, '..', '..', '.tmp') }) });
  const out = (r.stdout || '') + (r.stderr || '');
  const m = /RESULT (\d+) (\d+)/.exec(out);
  if (!m) { fail++; console.log('FAIL ' + f + ': crashed\n' + out.split('\n').slice(-25).join('\n')); continue; }
  pass += +m[1]; fail += +m[2];
  for (const l of out.split('\n')) if (l.startsWith('FAIL')) console.log(f.replace('.test.mjs', '') + ': ' + l);
}
console.log(`${pass} passed, ${fail} failed (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(fail ? 1 : 0);
