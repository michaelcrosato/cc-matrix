// SKILLER7 tests: node tests/run.mjs [--node | --browser] [--only a,b] [--metrics] [--quick]
// Prints only failures (FAIL suite › check: detail) and one line with the count. Exit code 1 on any failure.
import { suites } from './node/suites.mjs';
import { execSync } from 'node:child_process';
const args = process.argv.slice(2), only = (args[args.indexOf('--only') + 1] || '').split(',').filter(x => x && args.includes('--only'));
const wantNode = !args.includes('--browser'), wantBrowser = !args.includes('--node'), t0 = Date.now();
let pass = 0, fail = 0;
const report = (suite, name, ok, detail) => { if (ok) pass++; else { fail++; console.log('FAIL ' + suite + ' › ' + name + (detail !== undefined && detail !== '' ? ': ' + String(detail).slice(0, 300) : '')); } };
if (wantNode) {
  try { execSync('node tools/build.mjs --bundle-only', { stdio: 'pipe' }); } catch (e) { console.log('FAIL build › ' + String(e.stdout || e.message).trim()); process.exit(1); }
  for (const [name, fn] of Object.entries(suites)) {
    if (only.length && !only.includes(name)) continue;
    try { await fn((n, ok, d) => report(name, n, !!ok, d), { metrics: args.includes('--metrics'), quick: args.includes('--quick') }); }
    catch (e) { report(name, 'runs without throwing', false, e.stack.split('\n').slice(0, 3).join(' ')); }
  }
}
if (wantBrowser) {
  const { browserSuites } = await import('./browser/suites.mjs');
  try { execSync('node tools/build.mjs', { stdio: 'pipe' }); } catch (e) { console.log('FAIL build › ' + String(e.stdout || e.message).trim()); process.exit(1); }
  await browserSuites((s, n, ok, d) => report(s, n, !!ok, d), only);
}
console.log(pass + ' passed, ' + fail + ' failed (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
process.exit(fail ? 1 : 0);
