// BASHKETBALL tests: node tests/run.mjs [suite ...] [--quick]. Runs the named suites (or all), prints only failures and
// then one line: "BASHKETBALL tests: N passed, M failed (T s)". --quick skips the browser and hub suites. Exit code 1 on
// any failure. Suites live in tests/*.test.mjs, each exporting { suiteName: async t => { t.check(...) } }.
import { makeChecker } from './helpers.mjs';
import { readdirSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), quick = args.includes('--quick'), want = args.filter(a => !a.startsWith('--'));
const SLOW = ['browser', 'hub'];
const t0 = Date.now(), suites = {};
// browsers write their profiles to TMPDIR: keep it inside this folder (a shared machine's /tmp can be full), removed at the end
const TMP = join(here, '..', '.test-tmp'); mkdirSync(TMP, { recursive: true }); process.env.TMPDIR = TMP;
for (const f of readdirSync(here).filter(f => f.endsWith('.test.mjs')).sort()) Object.assign(suites, await import(join(here, f)).then(m => m.default || m.suites));
const order = ['content', 'physics', 'rules', 'mechanics', 'determinism', 'audio', 'ui', 'ai', 'flow', 'tour', 'camp', 'attract', 'dev', 'net', 'bundle', 'browser', 'hub'];
const names = (want.length ? want : order).filter(n => suites[n] && !(quick && SLOW.includes(n)));
for (const w of want) if (!suites[w]) console.log('FAIL runner: no suite named ' + w);
let passed = 0, failed = want.filter(w => !suites[w]).length;
for (const n of names) {
  const t = makeChecker(n);
  try { await suites[n](t); } catch (e) { t.check('ran', false, (e && e.stack || String(e)).split('\n').slice(0, 4).join(' / ')); }
  for (const f of t.fails) console.log(f);
  passed += t.passed; failed += t.failed;
}
try { rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* still in use: left for the next run */ }
console.log(`BASHKETBALL tests: ${passed} passed, ${failed} failed (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(failed ? 1 : 0);
