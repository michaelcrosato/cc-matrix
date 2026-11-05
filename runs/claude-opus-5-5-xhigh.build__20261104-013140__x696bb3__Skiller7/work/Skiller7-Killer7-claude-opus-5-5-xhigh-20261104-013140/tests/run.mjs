// The one test command: node tests/run.mjs [--node | --browser] [--only a,b]
// Runs every Node suite (tests/node/*.test.mjs, in-process with the vm harness) and every browser suite
// (tests/browser/*.test.mjs, headless Chromium on the built file). Prints only failures, then one line:
// "N passed, M failed (T s)". Exit code 1 on any failure.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2), only = (args.find(a => a.startsWith('--only')) ? (args[args.indexOf('--only') + 1] || args.find(a => a.startsWith('--only=')).split('=')[1]) : '').split(',').filter(Boolean);
const doNode = !args.includes('--browser'), doBrowser = !args.includes('--node');
let passed = 0, failed = 0; const t0 = Date.now();
const T = {
  suite: '',
  check(name, ok, detail = '') { if (ok) passed++; else { failed++; console.log(`FAIL ${this.suite} › ${name}${detail ? ': ' + String(detail).slice(0, 400) : ''}`); } },
  eq(name, a, b) { this.check(name, a === b, `got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`); }
};
const run = async (dir) => {
  const files = fs.readdirSync(path.join(ROOT, 'tests', dir)).filter(f => f.endsWith('.test.mjs')).sort();
  for (const f of files) {
    const name = f.replace('.test.mjs', '');
    if (only.length && !only.includes(name)) continue;
    T.suite = name;
    try { const m = await import(pathToFileURL(path.join(ROOT, 'tests', dir, f)).href); await m.default(T); }
    catch (e) { T.check('suite ran', false, e && (e.stack || e.message)); }
  }
};
if (doNode) await run('node');
if (doBrowser && fs.existsSync(path.join(ROOT, 'tests/browser'))) await run('browser');
console.log(`${passed} passed, ${failed} failed (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(failed ? 1 : 0);
