// THE test command: node test/run.mjs [--only=ball,rules] [--skip-browser] [--skip-hub] [--seed=n]
// Runs every suite, prints only failures (FAIL suite > case: detail) and one count line; exits 1 on any failure.
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v === undefined ? true : v]; }));
const only = args.only ? String(args.only).split(',') : null;
const ORDER = ['core', 'data', 'ball', 'rules', 'judge', 'ai', 'match', 'vacation', 'shop', 'story', 'poolhop', 'casino', 'ui', 'attract', 'dev', 'saves', 'revisit', 'netcode', 'playthrough', 'browser', 'pads', 'hub'];
const files = readdirSync(join(here, 'suites')).filter(f => f.endsWith('.test.mjs'));
const names = ORDER.filter(n => files.includes(n + '.test.mjs')).concat(files.map(f => f.replace('.test.mjs', '')).filter(n => !ORDER.includes(n)));
let passed = 0, failed = 0; const ran = [], t0 = Date.now();
for (const name of names) {
  if (only && !only.includes(name)) continue;
  if (args['skip-browser'] && (name === 'browser' || name === 'pads')) continue;
  if (args['skip-hub'] && name === 'hub') continue;
  ran.push(name);
  const ctx = { seed: +(args.seed || 1), args,
    ok(caseName, cond, detail = '') { if (cond) passed++; else { failed++; console.log(`FAIL ${name} › ${caseName}${detail ? ': ' + detail : ''}`); } return !!cond; } };
  try { const mod = await import(pathToFileURL(join(here, 'suites', name + '.test.mjs')).href); await mod.default(ctx); }
  catch (e) { failed++; console.log(`FAIL ${name} › crashed: ${(e && e.stack || e).toString().split('\n').slice(0, 4).join(' / ')}`); }
}
console.log(`${passed} passed, ${failed} failed (${ran.join(', ')}) in ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(failed ? 1 : 0);
