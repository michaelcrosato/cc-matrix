// OutBloom's one test command: node tests/run.mjs [--quick] [--only a,b]. Headless suites first, then the browser ones.
// It prints only failures and a one-line count, and exits 1 on any failure.
import { readdirSync } from 'node:fs';
const args = process.argv.slice(2), quick = args.includes('--quick'), only = args.includes('--only') ? (args[args.indexOf('--only') + 1] || '').split(',').filter(Boolean) : [];
const t0 = Date.now(); let pass = 0, fail = 0, skip = 0;
const suites = readdirSync(new URL('./suites/', import.meta.url)).filter(f => f.endsWith('.mjs')).sort();
const browser = readdirSync(new URL('./browser/', import.meta.url)).filter(f => f.endsWith('.mjs')).sort();
const pick = (dir, list) => list.filter(f => !only.length || only.includes(f.replace('.mjs', ''))).map(f => [dir, f]);
const todo = pick('suites', suites).concat(quick ? [] : pick('browser', browser));
for (const [dir, f] of todo) {
  const name = f.replace('.mjs', '');
  let mod; try { mod = await import(new URL('./' + dir + '/' + f, import.meta.url)); } catch (e) { fail++; console.log('FAIL ' + name + '/load: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); continue; }
  const checks = [];
  const t = (what, ok, detail = '') => checks.push([what, !!ok, detail]);
  try { await mod.default(t); } catch (e) { checks.push(['crashed', false, (e.stack || e).toString().split('\n').slice(0, 4).join(' | ')]); }
  for (const [what, ok, detail] of checks) { if (ok) pass++; else { fail++; console.log('FAIL ' + name + '/' + what + (detail ? ': ' + String(detail).slice(0, 400) : '')); } }
}
console.log(`${pass} passed, ${fail} failed, ${skip} skipped (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(fail ? 1 : 0);
