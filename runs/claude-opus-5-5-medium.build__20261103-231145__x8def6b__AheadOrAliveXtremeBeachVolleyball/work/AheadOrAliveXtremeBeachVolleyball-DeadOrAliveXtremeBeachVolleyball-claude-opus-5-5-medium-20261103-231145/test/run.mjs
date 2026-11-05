// THE test command: node test/run.mjs [--only=a,b] [--skip-browser] [--skip-hub]
// Runs every suite, prints only failures, then one line: N passed, M failed (suites) in S s.
import { readdirSync } from 'node:fs';
import { makeT } from './lib/assert.mjs';
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v === undefined ? true : v]; }));
const only = args.only ? String(args.only).split(',') : null;
const files = readdirSync(new URL('./suites/', import.meta.url)).filter(f => f.endsWith('.test.mjs')).sort();
const out = { n: 0, fail: 0, lines: [] }, ran = [], t0 = Date.now();
for (const f of files) {
  const name = f.replace('.test.mjs', '').replace(/^\d+-/, '');
  if (only && !only.includes(name)) continue;
  if (args['skip-browser'] && name === 'browser') continue;
  if (args['skip-hub'] && name === 'hub') continue;
  ran.push(name);
  const t = makeT(name, out);
  try { const m = await import('./suites/' + f); await m.default(t, args); }
  catch (e) { t('suite crashed', false, e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e); }
}
for (const l of out.lines) console.log(l);
console.log((out.n - out.fail) + ' passed, ' + out.fail + ' failed (' + ran.join(', ') + ') in ' + Math.round((Date.now() - t0) / 1000) + ' s');
process.exit(out.fail ? 1 : 0);
