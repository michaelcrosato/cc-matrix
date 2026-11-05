// THE one command: node tests/run.mjs [unit] [browser] — prints only failures and one line with the counts.
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const want = process.argv.slice(2);
const started = Date.now();
const counts = {};
const failures = [];
let suite = '';
const t = (name, fn) => {
  counts[suite] = counts[suite] || { pass: 0, fail: 0 };
  try { fn(); counts[suite].pass++; } catch (e) { counts[suite].fail++; failures.push(`${suite} › ${name}: ${e.message}`); }
};
const tb = (name, fn) => t(name, fn);
const tasync = async (name, fn) => {
  counts[suite] = counts[suite] || { pass: 0, fail: 0 };
  try { await fn(); counts[suite].pass++; } catch (e) { counts[suite].fail++; failures.push(`${suite} › ${name}: ${e.message}`); }
};
if (!want.length || want.includes('unit')) {
  suite = 'unit';
  const { run } = await import(join(here, 'unit.mjs'));
  await run(t);
}
if (!want.length || want.includes('browser')) {
  suite = 'browser';
  const { run } = await import(join(here, 'browser.mjs'));
  await run(tasync);
}
for (const f of failures) console.log(f);
const pass = Object.values(counts).reduce((a, c) => a + c.pass, 0), fail = Object.values(counts).reduce((a, c) => a + c.fail, 0);
const parts = Object.entries(counts).map(([k, c]) => `${k} ${c.pass + c.fail}`).join(', ');
console.log(`${pass} passed, ${fail} failed (${parts}) in ${((Date.now() - started) / 1000).toFixed(0)} s`);
process.exitCode = fail ? 1 : 0;
