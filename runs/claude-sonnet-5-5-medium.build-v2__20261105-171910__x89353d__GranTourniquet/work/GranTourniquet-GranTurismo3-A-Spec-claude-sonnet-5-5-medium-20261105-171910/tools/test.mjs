// node tools/test.mjs [suite...]  Suites are cached by the hash of their inputs: an unchanged suite is skipped. Prints only failures and one count line.
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
const SUITES = ['sim', 'data', 'career', 'headless', 'play', 'browser', 'audio', 'hub'];
const want = process.argv.slice(2).filter((a) => !a.startsWith('--')), force = process.argv.includes('--force'), run = want.length ? want : SUITES;
const walk = (d) => readdirSync(d).flatMap((f) => { const p = d + '/' + f; return statSync(p).isDirectory() ? (f === 'node_modules' || f === '.hubtest' ? [] : walk(p)) : [p]; });
const hashOf = (suite) => { const h = createHash('sha1'); for (const f of [...walk('src/game'), 'src/main.js', ...walk('tools/tests').filter((x) => x.includes(suite + '.') || x.includes('lib.')), 'tools/test.mjs']) h.update(f + readFileSync(f)); if (suite === 'hub' || suite === 'browser' || suite === 'audio') h.update(readFileSync('tools/hub-metas.html')); return h.digest('hex'); };
mkdirSync('tools/.cache', { recursive: true }); const cacheFile = 'tools/.cache/results.json', cache = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, 'utf8')) : {};
let passed = 0, failed = 0; const failures = [];
for (const s of run) {
  const hash = hashOf(s); if (!force && cache[s]?.hash === hash && cache[s].failed === 0) { passed += cache[s].passed; continue; }
  const ctx = { n: 0, fails: [], check(c, m) { this.n++; if (!c) this.fails.push(m); } };
  try { const mod = await import(pathToFileURL(process.cwd() + '/tools/tests/' + s + '.mjs').href + '?' + Date.now()); await mod.default(ctx); } catch (e) { ctx.fails.push('suite crashed: ' + (e?.stack ?? e).toString().split('\n').slice(0, 3).join(' | ')); ctx.n++; }
  passed += ctx.n - ctx.fails.length; failed += ctx.fails.length; for (const f of ctx.fails) failures.push(`[${s}] ${f}`); cache[s] = { hash, passed: ctx.n - ctx.fails.length, failed: ctx.fails.length };
}
writeFileSync(cacheFile, JSON.stringify(cache)); for (const f of failures) console.log('FAIL ' + f);
console.log(`tests: ${passed} passed, ${failed} failed`); process.exit(failed ? 1 : 0);
