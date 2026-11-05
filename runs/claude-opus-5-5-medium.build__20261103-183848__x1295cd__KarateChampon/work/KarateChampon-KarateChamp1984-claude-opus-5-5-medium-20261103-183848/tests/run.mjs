// THE test command: node tests/run.mjs [--only a,b] [--no-browser]. Builds first, runs every suite, prints only failing
// checks and one final line. Each suite: export default async (t) => { t.check(name, ok, detail) }.
import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const args = process.argv.slice(2), only = (args.find(a => a.startsWith('--only=')) || '').slice(7) || (args.includes('--only') ? args[args.indexOf('--only') + 1] : ''), noBrowser = args.includes('--no-browser');
const t0 = Date.now(), here = new URL('./', import.meta.url);
try { execFileSync(process.execPath, [new URL('../tools/build.mjs', here).pathname], { stdio: 'pipe' }); } catch (e) { console.log('FAIL build: ' + String(e.stderr || e.message).slice(0, 800)); process.exit(1); }
const BROWSER = ['page', 'hub', 'inspect'];
let suites = readdirSync(here).filter(f => f.endsWith('.test.mjs')).map(f => f.slice(0, -9)).sort();
if (only) suites = suites.filter(s => only.split(',').includes(s)); if (noBrowser) suites = suites.filter(s => !BROWSER.includes(s));
let pass = 0, fail = 0;
for (const s of suites) {
  const t = { check(name, ok, detail = '') { if (ok) pass++; else { fail++; console.log('FAIL ' + s + ': ' + name + (detail ? ' — ' + String(typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 400) : '')); } } };
  try { await (await import(new URL(s + '.test.mjs', here))).default(t); } catch (e) { fail++; console.log('FAIL ' + s + ': threw ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join(' / ')); }
}
console.log(`KC TESTS: ${pass} passed, ${fail} failed, 0 skipped (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(fail ? 1 : 0);
