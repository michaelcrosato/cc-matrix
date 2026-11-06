#!/usr/bin/env node
// One command: node tests/run.mjs [--only sim|play|browser|hub|visit|sheets]. Prints only failures and a one-line count.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const onlyIdx = process.argv.indexOf('--only');
const only = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : null;
let total = 0;
const failures = [];
// The suites that open a page need the current build.
if (!only || ['browser', 'hub', 'visit'].includes(only)) spawnSync('node', ['tools/build.mjs'], { cwd: root, encoding: 'utf8' });
const run = (name, fn) => { if (only && only !== name) return; try { const r = fn(); total += r.n; for (const f of r.fails) failures.push(`${name}: ${f}`); } catch (e) { failures.push(`${name}: threw ${e.message}`); total += 1; } };
const parseCount = (out, tag) => { const m = out.match(new RegExp(`${tag}: (\\d+) \\w+, (\\d+) failures`)); return m ? Number(m[1]) : 1; };
const sub = (name, cmd, args, tag, opts = {}) => run(name, () => {
  const r = spawnSync(cmd, args, { cwd: opts.cwd ?? root, encoding: 'utf8', timeout: opts.timeout ?? 900000, maxBuffer: 1 << 26 });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  const lines = out.split('\n').filter((l) => l.trim() && !l.startsWith(`${tag}:`));
  return { n: parseCount(out, tag), fails: r.status === 0 ? [] : (lines.length ? lines.slice(0, 40) : [`exit ${r.status}`]) };
});
sub('sim', 'node', ['tests/sim/cli.mjs'], 'sim');
sub('play', 'node', ['tests/play/cli.mjs'], 'play');
sub('browser', 'python3', ['tests/browser/browser_test.py'], 'browser');
sub('hub', 'python3', ['tests/hub/run_hub.py'], 'hub');
sub('visit', 'python3', ['tests/visit/visit_test.py'], 'visit');
run('sheets', () => {
  const r = spawnSync('node', ['check.mjs', '--sheets', '../src/art/sheets.js', '--out', '../shots/sheets'], { cwd: join(root, 'kit'), encoding: 'utf8', timeout: 600000, maxBuffer: 1 << 26 });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  return { n: 1, fails: r.status === 0 ? [] : out.split('\n').filter((l) => /problem|PROBLEM|error/i.test(l)).slice(0, 20).concat(r.status === 0 ? [] : [`check.mjs exit ${r.status}`]) };
});
for (const f of failures) console.log(`FAIL ${f}`);
console.log(`${total} checks, ${failures.length} failures`);
process.exit(failures.length ? 1 : 0);
