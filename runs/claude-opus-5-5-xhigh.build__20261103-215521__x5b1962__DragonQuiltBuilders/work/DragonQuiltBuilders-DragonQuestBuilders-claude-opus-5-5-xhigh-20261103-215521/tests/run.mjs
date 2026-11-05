// THE test command: node tests/run.mjs [--only a,b] [--browser]
// Prints only failures, then one line: "N passed, M failed (12.3 s)". Exit code 1 on any failure.
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DEV, load, helpers, memStorage } from './lib/load.mjs';

const args = process.argv.slice(2);
const only = (args.find(a => a.startsWith('--only=')) || '').slice(7) || (args.includes('--only') ? args[args.indexOf('--only') + 1] : '');
const filt = only ? only.split(',').map(s => s.trim()).filter(Boolean) : null;
const browser = args.includes('--browser');
const dirs = ['unit', 'play', 'net'].concat(browser ? ['browser'] : []);
const files = [];
for (const d of dirs) { const p = join(DEV, 'tests', d); if (existsSync(p)) for (const f of readdirSync(p).sort()) if (f.endsWith('.test.mjs') && (!filt || filt.some(x => f.startsWith(x)))) files.push(join(p, f)); }
let pass = 0, fail = 0; const t0 = Date.now();
const out = [];
for (const f of files) {
  const name = f.slice(f.lastIndexOf('/') + 1).replace('.test.mjs', '');
  const check = (what, ok, detail = '') => { if (ok) pass++; else { fail++; out.push('FAIL ' + name + ': ' + what + (detail ? ' :: ' + String(detail).slice(0, 600) : '')); } return !!ok; };
  try {
    const mod = await import(pathToFileURL(f).href);
    await mod.default({ load, helpers, memStorage, check, DEV });
  } catch (e) { fail++; out.push('FAIL ' + name + ': threw ' + (e && e.stack ? e.stack.split('\n').slice(0, 6).join(' | ') : e)); }
}
for (const l of out) console.log(l);
console.log(`${pass} passed, ${fail} failed (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(fail ? 1 : 0);
