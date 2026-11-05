// THE test command: node test/run.mjs  (prints only failures and a one-line count)
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeCheck } from './lib/load.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const { check, done } = makeCheck();
const only = process.argv[2];
// static: gameplay must not call Math.random
for (const f of readdirSync(resolve(here, '../src'))) { const s = readFileSync(resolve(here, '../src', f), 'utf8'); check('no Math.random in ' + f, !/Math\.random\(/.test(s)); check('no TODO/stub markers in ' + f, !/\b(TODO|FIXME|STUB|placeholder)\b/i.test(s.replace(/placeholder/g, ''))); }
for (const f of readdirSync(resolve(here, 'suites')).filter(f => f.endsWith('.test.mjs')).sort()) {
  if (only && !f.startsWith(only)) continue;
  try { const m = await import('./suites/' + f); await m.default((n, ok, d) => check(f.replace('.test.mjs', '') + ': ' + n, ok, d)); }
  catch (e) { check(f + ' crashed', false, String(e && e.stack || e).split('\n').slice(0, 4).join(' | ')); }
}
process.exit(done() ? 1 : 0);
