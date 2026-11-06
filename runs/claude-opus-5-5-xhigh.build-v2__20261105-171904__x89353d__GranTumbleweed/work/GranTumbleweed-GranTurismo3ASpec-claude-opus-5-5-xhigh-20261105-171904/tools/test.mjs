// node tools/test.mjs [suite...]: runs the suites, skipping any whose files haven't changed since it last passed.
// Prints failures, then one line: "tests: N passed, M failed". Pass --force to ignore the cache.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const HTML = resolve(root, '..', `${basename(root)}.html`);
const ALL = ['sim', 'data', 'career', 'audit', 'headless', 'behave', 'layout', 'play', 'browser', 'hands', 'audio', 'hub'];
// What each suite reads: when none of it changes, the suite is skipped.
const COVERS = {
  sim: ['src/game/sim', 'src/game/data'],
  data: ['src/game/data', 'src/game/sim'],
  career: ['src/game/sim', 'src/game/data'],
  headless: ['src/game', 'src/main.js'],
  play: ['src/game', 'src/main.js'],
  behave: ['src/game', 'src/main.js', 'tools/tests/_drive.mjs'],
  layout: ['src/game', 'src/main.js', 'tools/tests/_drive.mjs'],
  hands: [HTML, 'tools/hub', 'tools/tests/_browser.mjs'],
  browser: [HTML],
  audio: [HTML],
  hub: [HTML, 'tools/hub'],
  audit: ['src/game', 'tools/audit.mjs', 'tools/tests', '../PLAN.md'],
};
const args = process.argv.slice(2), force = args.includes('--force'), want = args.filter((a) => !a.startsWith('--'));
const suites = want.length ? want : ALL;
const cacheFile = 'tools/.testcache.json';
const cache = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, 'utf8')) : {};
const files = (p) => { if (!existsSync(p)) return []; if (statSync(p).isFile()) return [p]; return readdirSync(p).sort().flatMap((n) => files(join(p, n))); };
const hashOf = (s) => { const h = createHash('sha1'); for (const f of [`tools/tests/${s}.mjs`, 'tools/tests/_lib.mjs', ...(COVERS[s] ?? []).flatMap(files)]) if (existsSync(f)) h.update(f).update(readFileSync(f)); return h.digest('hex'); };
let passed = 0, failed = 0;
for (const s of suites) {
  const hash = hashOf(s);
  if (!force && cache[s]?.hash === hash) { passed += cache[s].passed; continue; }
  const r = spawnSync(process.execPath, [`tools/tests/${s}.mjs`], { encoding: 'utf8', maxBuffer: 1 << 28, env: { ...process.env, GAME_HTML: HTML } });
  const line = (r.stdout ?? '').trim().split('\n').filter((l) => l.startsWith('@@RESULT ')).pop();
  const res = line ? JSON.parse(line.slice(9)) : { passed: 0, failed: 1, failures: [`suite ${s} crashed (exit ${r.status}): ${(r.stderr ?? '').trim().split('\n').filter((l) => l.length < 300).slice(0, 8).join(' | ')}`] };
  passed += res.passed; failed += res.failed;
  for (const f of res.failures) console.log(`FAIL ${s}: ${f}`);
  if (res.failed === 0) { cache[s] = { hash, passed: res.passed }; } else delete cache[s];
  writeFileSync(cacheFile, JSON.stringify(cache));
}
console.log(`tests: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
