// One command: node tests/run.mjs [--all] [--only suite]. Prints only failures and a one-line count.
// A suite is rerun only when a file it covers changed (hashes in tests/.stamps.json), unless --all.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/paths.mjs';

const args = process.argv.slice(2);
const all = args.includes('--all');
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const ORDER = ['static', 'kit', 'systems', 'playthrough', 'soak', 'replay', 'browser', 'hub', 'link'];
const STAMPS = join(ROOT, 'tests', '.stamps.json');
const stamps = existsSync(STAMPS) ? JSON.parse(readFileSync(STAMPS, 'utf8')) : {};

function hashPaths(paths) {
  const h = createHash('sha1');
  const visit = (p) => {
    const abs = join(ROOT, p);
    if (!existsSync(abs)) return;
    const st = statSync(abs);
    if (st.isDirectory()) { for (const f of readdirSync(abs).sort()) visit(join(p, f)); return; }
    h.update(p); h.update(readFileSync(abs));
  };
  for (const p of paths) visit(p);
  return h.digest('hex');
}

let passed = 0, failed = 0, unchanged = 0, built = false;
for (const name of ORDER) {
  if (only && name !== only) continue;
  const file = join(ROOT, 'tests', 'suites', `${name}.mjs`);
  if (!existsSync(file)) continue;
  const suite = await import(file);
  const covers = [...suite.covers, `tests/suites/${name}.mjs`, 'tests/lib'];
  const hash = hashPaths(covers);
  if (!all && !only && stamps[name] === hash) { unchanged++; continue; }
  if (suite.needsBuild && !built) { execFileSync('node', ['tools/build.mjs'], { cwd: ROOT, stdio: 'inherit' }); built = true; }
  let suiteFailed = 0;
  const names = new Set();
  const t = {
    ok(label, cond, detail) {
      if (cond) { passed++; names.add(label); return true; }
      failed++; suiteFailed++;
      console.log(`FAIL [${name}] ${label}${detail ? `: ${detail}` : ''}`);
      return false;
    },
    near(label, v, lo, hi) { return this.ok(label, v >= lo && v <= hi, `${v} not in ${lo}..${hi}`); },
    eq(label, a, b) { return this.ok(label, a === b, `${JSON.stringify(a)} !== ${JSON.stringify(b)}`); },
  };
  try {
    await suite.run(t);
  } catch (err) {
    t.ok(`suite threw`, false, err && err.stack || String(err));
  }
  if (suiteFailed === 0) stamps[name] = hash; else delete stamps[name];
  // What really ran and passed, for tools/plan-coverage.mjs.
  const ranFile = join(ROOT, 'tests', '.passed.json');
  const ran = existsSync(ranFile) ? JSON.parse(readFileSync(ranFile, 'utf8')) : {};
  if (suiteFailed === 0) ran[name] = [...names]; else delete ran[name];
  writeFileSync(ranFile, JSON.stringify(ran));
  writeFileSync(STAMPS, JSON.stringify(stamps, null, 1));
}
console.log(`${passed} passed, ${failed} failed, ${unchanged} suites unchanged`);
process.exit(failed ? 1 : 0);
