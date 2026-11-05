// The one command: node tests/run.mjs [suite ...] [--fast]. Prints only failures and one line: passed, failed, suites, time.
import { readdirSync } from 'node:fs';
const args = process.argv.slice(2), fast = args.includes('--fast'), verbose = args.includes('--verbose'), only = args.filter(a => !a.startsWith('--'));
const BROWSER = ['browser', 'gamepad', 'harness'], ORDER = ['task', 'lint', 'movement', 'features', 'items', 'combat', 'monsters', 'magic', 'camp', 'progress', 'save', 'determinism', 'babble', 'art', 'ui', 'dev', 'attract', 'hub', 'playthrough', 'browser', 'gamepad', 'harness'];
const have = readdirSync(new URL('./suites/', import.meta.url)).map(f => f.replace(/\.mjs$/, ''));
const list = (only.length ? only : ORDER).filter(s => have.includes(s) && !(fast && BROWSER.includes(s)));
let pass = 0, fail = 0; const t0 = Date.now();
for (const name of list) {
  const t = { check(what, ok, detail = '') { if (verbose) console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${what}`); if (ok) pass++; else { fail++; console.log(`FAIL ${name}: ${what}${detail ? ': ' + String(detail).slice(0, 400) : ''}`); } } };
  try { const mod = await import('./suites/' + name + '.mjs'); await mod.run(t); }
  catch (e) { fail++; console.log(`FAIL ${name}: threw: ${e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e}`); }
}
console.log(`${pass} passed, ${fail} failed · ${list.length} suites · ${((Date.now() - t0) / 1000).toFixed(1)} s`);
process.exit(fail ? 1 : 0);
