// THE ONE TEST COMMAND. node test/run.mjs [suite ...]  (no argument: every suite). Prints only failures, then one line:
// "N passed, M failed (S suites, T s)". Exit code 1 on any failure. Builds dist/ first, then runs the suites headless
// (the engine and the game in Node, through game.advance and game.debug), the bundle checks, and the browser checks.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readdirSync } from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
execFileSync(process.execPath, [path.join(root, 'tools', 'build.mjs')], { stdio: 'ignore' });
const want = process.argv.slice(2);
const files = readdirSync(path.join(here, 'suites')).filter(f => f.endsWith('.mjs')).sort();
const t0 = Date.now();
let passed = 0, failed = 0, suites = 0;
for (const f of files) {
  const name = f.replace(/\.mjs$/, '');
  if (want.length && !want.includes(name)) continue;
  suites++;
  const mod = await import(path.join(here, 'suites', f));
  const ctx = { root, check(label, ok, detail) { if (ok) passed++; else { failed++; console.log(`FAIL ${name} › ${label}: ${detail || 'no detail'}`); } } };
  try { await mod.run(ctx); } catch (e) { failed++; console.log(`FAIL ${name} › crashed: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' / ') : e}`); }
}
console.log(`${passed} passed, ${failed} failed (${suites} suites, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(failed ? 1 : 0);
