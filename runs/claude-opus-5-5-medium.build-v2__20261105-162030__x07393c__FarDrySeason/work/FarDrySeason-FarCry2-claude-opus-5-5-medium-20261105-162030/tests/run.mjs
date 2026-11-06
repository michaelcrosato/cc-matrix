// One command: prints only failures and a one-line count. `--all` ignores stamps; `--only <suite>` runs one.
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..'); process.chdir(root);
const argv = process.argv.slice(2), all = argv.includes('--all'), only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : null;
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const SRC = () => walk('src').concat(['tools/build.mjs']);
const SUITES = [
  { id: 'static', run: 'tests/suites/static.mjs', covers: () => [...SRC(), 'tests/suites/static.mjs'] },
  { id: 'systems', run: 'tests/suites/systems.mjs', covers: () => [...SRC(), 'tests/suites/systems.mjs', 'tests/lib/boot.mjs'] },
  { id: 'lines', run: 'tests/suites/lines.mjs', covers: () => [...SRC(), 'tests/suites/lines.mjs'] },
  { id: 'playthrough', run: 'tests/suites/playthrough.mjs', covers: () => [...SRC(), 'tests/suites/playthrough.mjs', 'tests/lib/bot.mjs'] },
  { id: 'replay', run: 'tests/suites/replay.mjs', covers: () => [...SRC(), 'tests/suites/replay.mjs'] },
  { id: 'browser', run: 'tests/suites/browser.mjs', covers: () => [...SRC(), 'tests/suites/browser.mjs'] },
  { id: 'hub', run: 'tests/suites/hub.mjs', covers: () => [...SRC(), 'tests/suites/hub.mjs', 'vendor/session.js'] },
  { id: 'link', run: 'tests/suites/link.mjs', covers: () => [...SRC(), 'tests/suites/link.mjs'] },
];
const hash = (files) => { const h = createHash('sha1'); for (const f of files) h.update(readFileSync(f)); return h.digest('hex'); };
const stampsFile = 'tests/.stamps.json', stamps = existsSync(stampsFile) ? JSON.parse(readFileSync(stampsFile, 'utf8')) : {};
let passed = 0, failed = 0, skipped = 0, built = false;
const runOne = (s) => new Promise((res) => { execFile('node', [s.run], { maxBuffer: 1 << 28, timeout: 3000000 }, (err, stdout, stderr) => res({ err, stdout, stderr })); });
for (const s of SUITES) {
  if (only && s.id !== only) continue;
  if (!existsSync(s.run)) continue;
  const h = hash(s.covers().filter(existsSync));
  if (!all && !only && stamps[s.id] === h) { skipped++; continue; }
  if (['browser', 'hub', 'link'].includes(s.id) && !built) { const r = await new Promise((res) => execFile('node', ['tools/build.mjs'], (e, o, er) => res({ e, er }))); if (r.e) { console.log('BUILD FAILED', String(r.er).slice(0, 2000)); process.exit(1); } built = true; }
  const { err, stdout, stderr } = await runOne(s);
  const m = /(\d+) passed, (\d+) failed/.exec(stdout);
  if (m) { passed += +m[1]; failed += +m[2]; }
  const lines = stdout.split('\n').filter((l) => l.startsWith('FAIL'));
  for (const l of lines) console.log(`[${s.id}] ${l}`);
  if (!m || err) { failed++; console.log(`[${s.id}] CRASHED: ${String(err?.message ?? '').slice(0, 300)}\n${stderr.slice(-1500)}`); }
  else if (+m[2] === 0) stamps[s.id] = h; else delete stamps[s.id];
  writeFileSync(stampsFile, JSON.stringify(stamps));
}
console.log(`${passed} passed, ${failed} failed, ${skipped} suites unchanged`);
process.exit(failed ? 1 : 0);
