// THE test command: node tests/run.mjs [filter...] [--fast]
// Builds build/game.js, then runs every tests/*.test.mjs (name contains a filter) each in a FRESH node:vm context with the
// engine and the game loaded and Math.random seeded, then (unless --fast) tests/browser/*.mjs with Playwright.
// Prints only "FAIL <suite> > <check>: <detail>" lines and one summary line. Exit code 1 on any failure. Every check's
// name and result also go to tests/last-run.json (quietly), which tools/audit.mjs reads to audit TASK.md item by item.
import vm from 'node:vm';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from '../tools/build.mjs';

const DEV = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), fast = args.includes('--fast'), browserOnly = args.includes('--browser');
const filters = args.filter(a => !a.startsWith('--'));
const t0 = Date.now();
let passed = 0, failed = 0; const REC = [];
const pass = (suite, name) => { passed++; REC.push({ suite, name, pass: true }); };
const fail = (suite, name, detail) => { failed++; REC.push({ suite, name, pass: false }); console.log('FAIL ' + suite + ' > ' + name + (detail !== undefined && detail !== '' ? ': ' + String(detail).slice(0, 600) : '')); };

try { build({ jsOnly: fast }); }
catch (e) { fail('build', 'the game builds', e.message); console.log(`0/1 checks passed, 1 failed (${((Date.now() - t0) / 1000).toFixed(1)}s)`); process.exit(1); }
import { makeContext } from './context.mjs';

async function runSuite(file) {
  const suite = file.replace(/\.test\.mjs$/, '');
  const mod = await import(pathToFileURL(join(DEV, 'tests', file)).href);
  const P = makeContext(mod.context || {});
  const { game, E, B, I } = P;
  const t = {
    ...P, makeContext,
    snap: () => game.debug.snapshot(),
    step: s => game.advance(s),
    tap: a => I.tap(a), hold: (a, on = true) => I.hold(a, on),
    intent: (obj, s) => { B.testIntent = obj; game.advance(s); B.testIntent = null; },
    load: (id, opts) => { game.debug.load(id, opts); game.advance(1 / 30); },
    check: (name, cond, detail) => { if (cond) pass(suite, name); else fail(suite, name, typeof detail === 'function' ? detail() : detail); return !!cond; }
  };
  try { await mod.default(t); }
  catch (e) { fail(suite, 'runs without throwing', (e && e.stack || e).toString().split('\n').slice(0, 4).join(' | ')); }
  if (game.errors.length) fail(suite, 'no game errors', game.errors.map(e => e.where + ': ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')).join(' || '));
  else pass(suite, "no game errors");
  try { game.dispose(); } catch (e) { /* disposed */ }
}

const pick = list => filters.length ? list.filter(f => filters.some(x => f.includes(x))) : list;
if (!browserOnly) for (const f of pick(readdirSync(join(DEV, 'tests')).filter(f => f.endsWith('.test.mjs')).sort())) await runSuite(f);
if (!fast) {
  const bdir = join(DEV, 'tests', 'browser');
  for (const f of pick(readdirSync(bdir).filter(f => f.endsWith('.mjs')).sort())) {
    const suite = 'browser/' + f.replace(/\.mjs$/, '');
    try {
      const mod = await import(pathToFileURL(join(bdir, f)).href);
      await mod.default({ dev: DEV, check: (name, cond, detail) => { if (cond) pass(suite, name); else fail(suite, name, detail); return !!cond; } });
    } catch (e) { fail(suite, 'runs without throwing', (e && e.stack || e).toString().split('\n').slice(0, 4).join(' | ')); }
  }
}
writeFileSync(join(DEV, 'tests', 'last-run.json'), JSON.stringify({ at: new Date().toISOString(), full: !filters.length && !fast && !browserOnly, passed, failed, checks: REC }, null, 1));
console.log(`${passed}/${passed + failed} checks passed, ${failed} failed (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
process.exit(failed ? 1 : 0);
