// The one test command: node tests/run.mjs [--quick] [--only <suite>]. Builds, then runs every suite (headless first,
// then the browser and hub suites) and prints only failures plus one line of counts.
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const args = process.argv.slice(2), quick = args.includes('--quick'), only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const root = new URL('../', import.meta.url).pathname, tmp = root + '.tmp'; mkdirSync(tmp, { recursive: true });
const env = Object.assign({}, process.env, { TMPDIR: tmp, RUNNER: '1' });
const t0 = Date.now(), b = spawnSync('node', ['tools/build.mjs'], { cwd: root, encoding: 'utf8', env });
if (b.status !== 0) { console.log('FAIL build: ' + b.stderr); process.exit(1); }
const HEADLESS = ['systems', 'features', 'extras', 'text', 'dev', 'attract', 'story', 'balance'], BROWSER = ['pages', 'menus', 'hub'];
const list = (only ? [only] : HEADLESS.concat(quick ? [] : BROWSER));
let passed = 0, failed = 0, nh = 0, nb = 0; const record = { at: new Date().toISOString(), suites: {} };
for (const s of list) {
  const file = HEADLESS.includes(s) ? 'tests/suites/' + s + '.mjs' : 'tests/browser/' + s + '.mjs';
  const r = spawnSync('node', [file], { cwd: root, encoding: 'utf8', env, timeout: 1800000, maxBuffer: 64 << 20 });
  const out = (r.stdout || '') + (r.stderr || ''), res = out.match(/@@RESULT (.*)/);
  for (const l of out.split('\n')) if (/^FAIL /.test(l)) console.log('[' + s + '] ' + l);
  if (!res) { failed++; console.log('[' + s + '] FAIL the suite did not finish: ' + out.split('\n').slice(-5).join(' / ')); continue; }
  const j = JSON.parse(res[1]); passed += j.passed; failed += j.failed; if (HEADLESS.includes(s)) nh++; else nb++;
  const ok = out.match(/@@PASSED (.*)/); record.suites[s] = { passed: j.passed, failed: j.failed, checks: ok ? JSON.parse(ok[1]) : [] };
}
if (!only) { record.passed = passed; record.failed = failed; (await import('node:fs')).writeFileSync(root + 'tests/last-run.json', JSON.stringify(record, null, 1)); }
console.log(`ICE HOC-KABOOM TESTS: ${passed} passed, ${failed} failed (headless ${nh} suites, browser ${nb}) in ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(failed ? 1 : 0);
