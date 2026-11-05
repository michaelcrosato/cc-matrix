// THUGBY TURBO's one test command: node test/run.mjs [--only suite] [--browser] [--hub]
// Rebuilds, runs every headless suite (test/*.test.mjs: scripts that play the game through game.advance and game.debug,
// each case in a fresh game), prints only failures ("FAIL suite > case: message") and one line: "N passed, M failed".
import { readdirSync } from 'node:fs';
import { build } from '../build.mjs';

const args = process.argv.slice(2), only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
const t0 = Date.now();
build({ quiet: true });
const dir = new URL('./', import.meta.url);
let files = readdirSync(dir).filter(f => f.endsWith('.test.mjs')).sort();
if (only) files = files.filter(f => only.includes(f.replace('.test.mjs', '')));
if (args.includes('--browser')) files.push('browser.mjs');
if (args.includes('--hub')) files.push('hub.mjs');
let passed = 0, failed = 0, suites = 0;
for (const f of files) {
  const name = f.replace(/\.test\.mjs$|\.mjs$/, '');
  let mod;
  try { mod = await import(new URL(f, dir)); } catch (e) { console.log(`FAIL ${name} > (load): ${e.stack.split('\n').slice(0, 4).join(' / ')}`); failed++; continue; }
  suites++;
  for (const [cname, fn] of Object.entries(mod.cases || {})) {
    try {
      const r = await fn();
      if (r === false) throw new Error('returned false');
      passed++;
    } catch (e) {
      failed++;
      console.log(`FAIL ${name} > ${cname}: ${(e && e.message || String(e)).split('\n')[0].slice(0, 400)}`);
    }
  }
}
console.log(`${passed} passed, ${failed} failed (${suites} suites, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(failed ? 1 : 0);
