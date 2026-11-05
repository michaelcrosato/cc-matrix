// npm test: rebuilds, runs every suite, prints only failing checks and one summary line. --only a,b  --no-browser
import { execFileSync, spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const DEV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), only = (args.find(a => a === '--only') ? args[args.indexOf('--only') + 1] : (args.find(a => a.startsWith('--only=')) || '').slice(7)).split(',').filter(Boolean), noBrowser = args.includes('--no-browser');
const t0 = Date.now();
try { execFileSync(process.execPath, [path.join(DEV, 'tools/build.mjs')], { stdio: 'pipe' }); } catch (e) { console.log('BUILD FAILED\n' + String(e.stderr || e)); process.exit(1); }
const { Checker } = await import(pathToFileURL(path.join(DEV, 'tests/lib.mjs')));
const files = readdirSync(path.join(DEV, 'tests')).filter(f => f.endsWith('.test.mjs')).sort();
let n = 0, failures = [];
for (const f of files) {
  const mod = await import(pathToFileURL(path.join(DEV, 'tests', f)));
  for (const [name, fn] of Object.entries(mod.suites)) {
    if (only.length && !only.includes(name)) continue;
    const C = new Checker(name);
    try { await fn(C); } catch (e) { C.ok('suite crashed', false, (e && e.stack || String(e)).split('\n').slice(0, 3).join(' | ')); }
    n += C.n; failures.push(...C.fail);
  }
}
if (!noBrowser && (!only.length || only.includes('hub') || only.includes('browser'))) {
  for (const [name, script] of [['hub', 'tools/hub-check.mjs'], ['browser', 'tools/browser-check.mjs']]) {
    if (only.length && !only.includes(name)) continue;
    const r = spawnSync(process.execPath, [path.join(DEV, script)], { encoding: 'utf8', timeout: 1500000 });
    n++; if (r.status !== 0) failures.push(`${name} › ${(r.stdout + r.stderr).trim().split('\n').slice(-6).join(' | ')}`);
  }
}
for (const f of failures) console.log(f);
const s = Math.round((Date.now() - t0) / 1000);
console.log(`MASH TV tests: ${n - failures.length} passed, ${failures.length} failed (${Math.floor(s / 60)}m ${s % 60}s)`);
process.exit(failures.length ? 1 : 0);
