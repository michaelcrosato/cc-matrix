// THE test command: node tests/run.mjs [--only a,b] [--browser] [--list: also print every passing check]
// Runs every suite in tests/suites (and tests/browser with --browser); prints only failures and one count line.
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), oi = args.indexOf('--only'), only = oi >= 0 ? args[oi + 1].split(',') : null, browser = args.includes('--browser'), list = args.includes('--list');
const t0 = performance.now();
let pass = 0, fail = 0;
const out = (name, ok, detail) => { if (ok && list) console.log('PASS ' + name); if (ok) pass++; else { fail++; console.log('FAIL ' + name + (detail ? ': ' + String(detail).slice(0, 600) : '')); } };
const suites = readdirSync(path.join(here, 'suites')).filter(f => f.endsWith('.test.mjs')).sort().filter(f => !only || only.some(o => f.startsWith(o)));
for (const f of suites) {
  const name = f.replace('.test.mjs', '');
  try { const m = await import(pathToFileURL(path.join(here, 'suites', f))); await m.default({ check: (what, ok, detail) => out(name + ': ' + what, ok, detail) }); }
  catch (e) { out(name + ': crashed', false, e && e.stack || e); }
}
if (browser) for (const f of readdirSync(path.join(here, 'browser')).filter(f => f.endsWith('.check.mjs')).sort().filter(f => !only || only.some(o => f.startsWith(o)))) {
  const r = spawnSync(process.execPath, [path.join(here, 'browser', f)], { encoding: 'utf8', timeout: 900000 });
  const lines = (r.stdout || '').trim().split('\n').filter(Boolean);
  for (const ln of lines) { const m = /^(PASS|FAIL) (.*)$/.exec(ln); if (m) out(f.replace('.check.mjs', '') + ': ' + m[2], m[1] === 'PASS'); }
  if (r.status !== 0 && !lines.some(l => l.startsWith('FAIL'))) out(f + ': exited ' + r.status, false, (r.stderr || '').slice(-600));
}
console.log(`${pass} passed, ${fail} failed (${((performance.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(fail ? 1 : 0);
