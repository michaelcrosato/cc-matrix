// THE test command: node tests/run.mjs [--only a,b] [--no-browser]. Builds first, then runs every suite (tests/*.test.mjs,
// headless ones in a Node vm, browser ones with Playwright). Prints only failing checks and one final line.
import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url)), args = process.argv.slice(2);
const only = args.includes('--only') ? (args[args.indexOf('--only') + 1] || '').split(',').filter(Boolean) : [], noBrowser = args.includes('--no-browser');
const BROWSER = ['page', 'hub', 'feel', 'audit'];
process.env.TMPDIR = process.env.TMPDIR || join(here, '..', '.tmp');
const t0 = Date.now(); let pass = 0, fail = 0, skip = 0;
try { execFileSync(process.execPath, [join(here, '..', 'tools/build.mjs'), '--quiet'], { stdio: 'inherit' }); } catch (e) { console.log('FAIL build: ' + e.message); process.exit(1); }
const files = readdirSync(here).filter(f => f.endsWith('.test.mjs')).sort((a, b) => (BROWSER.includes(a.replace('.test.mjs', '')) ? 1 : 0) - (BROWSER.includes(b.replace('.test.mjs', '')) ? 1 : 0) || a.localeCompare(b));
for (const f of files) {
  const name = f.replace('.test.mjs', '');
  if (only.length && !only.includes(name)) continue;
  if (noBrowser && BROWSER.includes(name)) { skip++; continue; }
  const t = { suite: name, check(what, ok, detail = '') { if (ok) pass++; else { fail++; console.log(`FAIL ${name}: ${what}${detail ? ' — ' + String(detail).slice(0, 400) : ''}`); } return ok; } };
  try { const mod = await import(pathToFileURL(join(here, f)).href); await mod.default(t); }
  catch (e) { fail++; console.log(`FAIL ${name}: the suite threw — ${(e && e.stack || e).toString().split('\n').slice(0, 4).join(' / ')}`); }
}
console.log(`KC TESTS: ${pass} passed, ${fail} failed, ${skip} skipped (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(fail ? 1 : 0);
