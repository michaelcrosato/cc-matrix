// The one command: node tests/run.mjs [suite ...] [--fast]. Prints only failures and one final line; exit 1 on a failure.
import { readdirSync } from 'node:fs';
const args = process.argv.slice(2), fast = args.includes('--fast'), only = args.filter(a => !a.startsWith('--'));
const dir = new URL('./suites/', import.meta.url).pathname;
const all = readdirSync(dir).filter(f => f.endsWith('.mjs')).sort().map(f => f.replace(/^\d+-/, '').replace('.mjs', ''));
const files = readdirSync(dir).filter(f => /^\d+-.*\.mjs$/.test(f)).sort();
const t0 = Date.now(); let passed = 0, failed = 0, suites = 0;
for (const f of files) {
  const name = f.replace(/^\d+-/, '').replace('.mjs', '');
  if (only.length && !only.includes(name)) continue;
  if (fast && ['browser', 'harness', 'playthrough'].includes(name)) continue;
  suites++;
  const fails = [];
  let n = 0;
  const check = (what, ok, detail = '') => { n++; if (!ok) fails.push(`FAIL ${name}: ${what}${detail ? ': ' + String(detail).slice(0, 300) : ''}`); return !!ok; };
  try { const mod = await import(dir + f); await mod.default(check); }
  catch (e) { fails.push(`FAIL ${name}: threw: ${e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e}`); n++; }
  for (const l of fails) console.log(l);
  failed += fails.length; passed += n - fails.length;
}
console.log(`${passed} passed, ${failed} failed · ${suites} suites · ${((Date.now() - t0) / 1000).toFixed(1)} s`);
process.exit(failed ? 1 : 0);
