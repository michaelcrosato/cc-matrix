// THE test command: node test/run.mjs [suite ...]. Runs every suite in test/suites (or the ones named), prints only
// failures (FAIL <suite> > <case>: <detail>) and one line: N passed, M failed (S suites, T s). Exit code 1 on a failure.
import { readdirSync } from 'node:fs';
const t0 = Date.now(), dir = new URL('./suites/', import.meta.url);
const want = process.argv.slice(2).filter(a => !a.startsWith('-'));
const all = readdirSync(dir).filter(f => f.endsWith('.mjs')).map(f => f.slice(0, -4)).sort();
const suites = want.length ? all.filter(s => want.includes(s)) : all.filter(s => !s.startsWith('browser') || !process.argv.includes('--fast'));
for (const w of want) if (!all.includes(w)) console.log('FAIL runner > unknown suite: ' + w);
const { warnings } = await import('./lib.mjs');
let pass = 0, fail = 0;
for (const s of suites) {
  const check = (name, ok, detail = '') => { if (ok) pass++; else { fail++; console.log(`FAIL ${s} > ${name}${detail === '' ? '' : ': ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 600)}`); } return !!ok; };
  warnings.length = 0;
  try { const m = await import(new URL(s + '.mjs', dir)); await m.run(check); }
  catch (e) { fail++; console.log(`FAIL ${s} > crashed: ${(e && e.stack || e).toString().split('\n').slice(0, 4).join(' / ')}`); }
  check('no engine warnings or console errors', warnings.length === 0, warnings.join(' | '));
}
console.log(`${pass} passed, ${fail} failed (${suites.length} suites, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(fail ? 1 : 0);
