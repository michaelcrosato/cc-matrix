// One command: node tools/test.mjs [--only name] [--fast]. Prints only failures and a final count.
import { readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const fast = args.includes('--fast');
const R = { pass: 0, fail: 0 };
const T = {
  check(name, cond, detail) { if (cond) R.pass++; else { R.fail++; console.log('FAIL ' + T.suite + ': ' + name + (detail !== undefined ? ' :: ' + String(detail).slice(0, 300) : '')); } },
  eq(name, a, b) { T.check(name, a === b, `${a} !== ${b}`); },
  near(name, a, b, eps = 1e-3) { T.check(name, Math.abs(a - b) <= eps, `${a} vs ${b}`); },
  suite: '',
};
const dir = path.join(root, 'tests/node');
const files = readdirSync(dir).filter((f) => f.endsWith('.mjs') && !f.startsWith('_')).sort();
const quietErr = console.error;
for (const f of files) {
  const name = f.replace('.mjs', '');
  if (only && !name.includes(only)) continue;
  T.suite = name;
  try {
    const mod = await import(pathToFileURL(path.join(dir, f)).href);
    if (fast && mod.slow) continue;
    await mod.run(T);
  } catch (e) { R.fail++; console.log(`FAIL ${name}: threw ${String(e && e.stack || e).split('\n').slice(0, 4).join(' | ')}`); }
}
if (!fast && !only) {
  const { spawnSync } = await import('node:child_process');
  for (const f of ['boot.py', 'party.py', 'rtc.py']) {
    const r = spawnSync('python3', [f], { cwd: path.join(root, 'tests/browser'), encoding: 'utf8', timeout: 400000 });
    for (const line of (r.stdout || '').split('\n')) { const m = /^(\d+) passed, (\d+) failed/.exec(line); if (m) { R.pass += +m[1]; R.fail += +m[2]; } else if (line.startsWith('FAIL')) console.log('browser ' + line); }
    if (r.status !== 0 && !/passed/.test(r.stdout || '')) { R.fail++; console.log('FAIL browser ' + f + ': ' + String(r.stderr).slice(-200)); }
  }
}
console.log(`${R.pass} passed, ${R.fail} failed`);
process.exit(R.fail ? 1 : 0);
