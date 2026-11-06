// node tools/test.mjs [suite...]: prints failures and a one-line count. Suites cache by file hash, so an unchanged suite is skipped.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const walk = (d, out = []) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p, out); else out.push(p); } return out; };
const hashOf = (paths) => { const h = createHash('sha1'); for (const root of paths) for (const f of existsSync(root) && statSync(root).isDirectory() ? walk(root).sort() : [root]) if (existsSync(f)) h.update(readFileSync(f)); return h.digest('hex'); };
const HTML = '../GrandpaTurismo-GranTurismo3ASpec-claude-opus-5-5-medium-20261105-171907.html';
const SUITES = {
  sim: { cmd: ['node', 'tools/tests/sim.mjs'], deps: ['src/game/sim', 'src/game/data', 'tools/tests/sim.mjs'] },
  data: { cmd: ['node', 'tools/tests/data.mjs'], deps: ['src/game/data', 'src/game/sim', 'tools/tests/data.mjs'] },
  career: { cmd: ['node', 'tools/tests/career.mjs'], deps: ['src/game/sim', 'src/game/data', 'tools/tests/career.mjs'] },
  headless: { cmd: ['node', 'tools/tests/headless.mjs'], deps: ['src/game', 'src/main.js', 'tools/tests/headless.mjs', 'tools/tests/lib.mjs'] },
  play: { cmd: ['node', 'tools/tests/play.mjs'], deps: ['src/game', 'tools/tests/play.mjs', 'tools/tests/lib.mjs'] },
  browser: { cmd: ['python3', 'tools/tests/browser.py'], deps: [HTML, 'tools/tests/browser.py', 'tools/tests/blib.py'] },
  audio: { cmd: ['python3', 'tools/tests/audio.py'], deps: [HTML, 'tools/tests/audio.py', 'tools/tests/blib.py'] },
  hub: { cmd: ['python3', 'tools/tests/hub.py'], deps: [HTML, 'tools/hub', 'tools/tests/hub.py', 'tools/tests/blib.py'] },
};
const cachePath = 'tools/.testcache.json', cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {};
const names = process.argv.slice(2).filter((a) => !a.startsWith('-')), force = process.argv.includes('--force'), list = names.length ? names : Object.keys(SUITES);
let pass = 0, fail = 0, skipped = 0;
for (const n of list) {
  const s = SUITES[n]; if (!s) { console.log(`no suite ${n}`); fail++; continue; }
  const h = hashOf(s.deps);
  if (!force && cache[n]?.hash === h && cache[n].fail === 0) { pass += cache[n].pass; skipped++; continue; }
  const r = spawnSync(s.cmd[0], s.cmd.slice(1), { encoding: 'utf8', maxBuffer: 1 << 28, timeout: 3600000 });
  const out = (r.stdout ?? '') + (r.stderr ?? ''), m = /__COUNT (\d+) (\d+)/.exec(out); const lines = out.split('\n').filter((l) => l.startsWith('FAIL')).map((l) => `${n}: ${l.slice(0, 600)}`); lines.forEach((l) => console.log(l));
  if (m) { pass += +m[1]; fail += +m[2]; cache[n] = { hash: h, pass: +m[1], fail: +m[2] }; }
  else { fail++; console.log(`${n}: FAIL crashed: ${out.split('\n').filter((l) => l.length < 400).slice(-8).join(' | ').slice(0, 900)}`); delete cache[n]; }
  writeFileSync(cachePath, JSON.stringify(cache));
}
console.log(`tests: ${pass} passed, ${fail} failed${skipped ? ` (${skipped} suites unchanged)` : ''}`);
process.exit(fail ? 1 : 0);
