// THE test command: node tests/run.mjs [--only a,b] [--no-browser]. Builds first, prints only failing checks and one final line.
import { execFileSync } from 'node:child_process'; import path from 'node:path'; import fs from 'node:fs';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2), only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null, noBrowser = args.includes('--no-browser');
try { execFileSync('node', [path.join(root, 'tools/build.mjs')], { stdio: ['ignore', 'ignore', 'inherit'] }); } catch (e) { console.log('BUILD FAILED'); process.exit(1); }
const suites = ['data', 'input', 'technique', 'bout', 'ai', 'bonus', 'drill', 'story', 'versus', 'online', 'attract', 'dev', 'ui', 'audio', 'smoke', 'lab'], browser = ['page', 'tatami', 'hub'];
let pass = 0, fail = 0, skip = 0; const t0 = Date.now();
const mk = name => ({ check(what, ok, detail = '') { if (ok) pass++; else { fail++; console.log(`FAIL [${name}] ${what}${detail ? ': ' + detail : ''}`); } }, skip(n = 1) { skip += n; } });
for (const s of [...suites, ...(noBrowser ? [] : browser)]) {
  if (only && !only.includes(s)) continue; const f = path.join(root, 'tests', s + '.test.mjs'); if (!fs.existsSync(f)) { skip++; continue; }
  const t = mk(s); try { await (await import(f + '?' + Date.now())).default(t); } catch (e) { fail++; console.log(`FAIL [${s}] threw: ${String(e && e.stack || e).split('\n').slice(0, 4).join(' | ')}`); }
}
console.log(`KC TESTS: ${pass} passed, ${fail} failed, ${skip} skipped (${((Date.now() - t0) / 1000).toFixed(1)} s)`); process.exit(fail ? 1 : 0);
