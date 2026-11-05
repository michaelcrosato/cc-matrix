// The one test command: node tests/run.mjs [suite ...] [--browser]
// Prints only failures ("suite › test: message") and one final line: "N passed, M failed (S suites, T s)". Exit 1 on failure.
// Node suites load engine/my-3d2dge.js, engine-ext/beasts.js and dist/game.js into a vm context and drive the game with
// game.advance, input.tap / hold / feed and game.debug. --browser adds the Playwright suites (bundle, input, hub).
import { readdirSync } from 'node:fs';
import { suites } from './lib.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DEV = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2), browser = argv.includes('--browser'), only = argv.filter(a => !a.startsWith('--'));
const failures = []; let passed = 0, failed = 0;
const assert = (suiteName) => {
  const t = async (name, fn) => {
    try { const r = await fn(); if (r === false) throw new Error('returned false'); passed++; }
    catch (e) { failed++; failures.push(`${suiteName} › ${name}: ${String(e && e.message || e).slice(0, 400)}`); }
  };
  return t;
};

const t0 = Date.now();
const files = readdirSync(join(DEV, 'tests')).filter(f => /^t-.*\.mjs$/.test(f)).sort();
for (const f of files) await import(pathToFileURL(join(DEV, 'tests', f)).href);
const names = Object.keys(suites).filter(n => (only.length ? only.includes(n) : true) && (browser || !n.startsWith('browser:')));
for (const n of names) {
  try { await suites[n](assert(n)); }
  catch (e) { failed++; failures.push(`${n} › (suite crashed): ${String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')}`); }
}
for (const f of failures) console.log(f);
console.log(`${passed} passed, ${failed} failed (${names.length} suites, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(failed ? 1 : 0);
