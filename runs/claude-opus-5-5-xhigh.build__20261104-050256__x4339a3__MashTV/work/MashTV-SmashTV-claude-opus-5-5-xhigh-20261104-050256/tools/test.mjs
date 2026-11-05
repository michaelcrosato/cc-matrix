// MASH TV tests: node tools/test.mjs [--only a,b] [--no-browser]
// Rebuilds, runs every suite in tests/, prints only failing checks and one summary line; exit code 1 on any failure.
import { readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { build } from './build.mjs';
import { boot, flush } from './harness.mjs';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2), oi = argv.indexOf('--only'), only = oi >= 0 ? argv[oi + 1].split(',') : null, noBrowser = argv.includes('--no-browser');
const t0 = Date.now();
build({ quiet: true });
let passed = 0, failed = 0;
const files = readdirSync(join(root, 'tests')).filter(f => f.endsWith('.test.mjs')).sort();
for (const f of files) {
  const mod = await import(pathToFileURL(join(root, 'tests', f)).href);
  const suites = mod.suites || { [f.replace('.test.mjs', '')]: mod.default };
  for (const name in suites) {
    if (only && !only.includes(name)) continue;
    if (noBrowser && ['browser', 'hub', 'e2e', 'pad', 'audio-browser'].includes(name)) continue;
    const t = { boot, flush, root,
      check(what, ok, detail = '') { if (ok) passed++; else { failed++; console.log(`${name} › ${what}${detail !== '' ? ': ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`); } return !!ok; } };
    try { await suites[name](t); } catch (e) { failed++; console.log(`${name} › threw: ${e && e.stack ? e.stack.split('\n').slice(0, 5).join(' | ') : e}`); }
  }
}
const s = Math.round((Date.now() - t0) / 1000);
console.log(`MASH TV tests: ${passed} passed, ${failed} failed (${Math.floor(s / 60)}m ${s % 60}s)`);
process.exit(failed ? 1 : 0);
