// One command: node tests/run.mjs [--all] [--only suite]. Prints only failures and a one-line count.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const ALL = args.includes('--all');
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const STAMPS = join(ROOT, 'tests/.stamps.json');
const stamps = existsSync(STAMPS) ? JSON.parse(readFileSync(STAMPS, 'utf8')) : {};
const walk = (p) => { if (!existsSync(p)) return []; const st = statSync(p); if (st.isFile()) return [p]; return readdirSync(p).flatMap((n) => (n.startsWith('.') ? [] : walk(join(p, n)))); };
const hashOf = (covers) => { const h = createHash('sha1'); for (const c of covers) for (const f of walk(join(ROOT, c)).sort()) { h.update(f); h.update(readFileSync(f)); } return h.digest('hex'); };
const order = ['static', 'systems', 'playthrough', 'replay', 'browser', 'hub', 'link'];
const names = readdirSync(join(ROOT, 'tests/suites')).filter((n) => n.endsWith('.mjs')).map((n) => n.slice(0, -4)).sort((a, b) => order.indexOf(a) - order.indexOf(b));
let passed = 0, failed = 0, unchanged = 0;
const fails = [];
for (const name of names) {
  if (only && only !== name) continue;
  const mod = await import(join(ROOT, 'tests/suites', name + '.mjs'));
  const covers = [...(mod.covers || ['src']), 'tests/suites/' + name + '.mjs', 'tests/lib'];
  const h = hashOf(covers);
  if (!ALL && !only && stamps[name] && stamps[name].hash === h && stamps[name].failed === 0) { unchanged++; continue; }
  const t = { name, ok(c, m) { if (c) passed++; else { failed++; fails.push(`[${name}] ${m}`); } }, eq(a, b, m) { const ok = JSON.stringify(a) === JSON.stringify(b); if (ok) passed++; else { failed++; fails.push(`[${name}] ${m}: got ${JSON.stringify(a)} want ${JSON.stringify(b)}`); } }, fail(m) { failed++; fails.push(`[${name}] ${m}`); } };
  const before = failed;
  try { await mod.run(t); } catch (err) { failed++; fails.push(`[${name}] threw: ${err && err.stack ? err.stack.split('\n').slice(0, 4).join(' | ') : err}`); }
  stamps[name] = { hash: h, failed: failed - before };
}
writeFileSync(STAMPS, JSON.stringify(stamps, null, 1));
for (const f of fails) console.log('FAIL', f);
console.log(`${passed} passed, ${failed} failed, ${unchanged} suites unchanged`);
process.exit(failed ? 1 : 0);
