// node tests/run.mjs [suite ...]: runs the suites (all by default), prints only failures, then one line with the count.
// Exit code 1 on any failure. Suites: floors sim play net ui hub (ui and hub open a browser).
import { buildGame } from '../build.mjs';
const ALL = ['floors', 'sim', 'play', 'net', 'ui', 'hub'];
const want = process.argv.slice(2).filter(a => !a.startsWith('-')), names = want.length ? want : ALL;
if (!process.argv.includes('--no-build')) buildGame();
let n = 0, failed = 0;
for (const name of names) {
  let S;
  try { const mod = await import('./suite-' + name + '.mjs'); S = await mod.default(); }
  catch (e) { S = { n: 1, failed: 1, fails: ['FAIL ' + name + ' (the suite crashed): ' + (e && e.stack || e).toString().split('\n').slice(0, 5).join(' / ')] }; }
  for (const f of S.fails) console.log(f);
  n += S.n; failed += S.failed;
}
console.log(`${n} checks, ${failed} failed (${names.join(', ')})`);
process.exit(failed ? 1 : 0);
