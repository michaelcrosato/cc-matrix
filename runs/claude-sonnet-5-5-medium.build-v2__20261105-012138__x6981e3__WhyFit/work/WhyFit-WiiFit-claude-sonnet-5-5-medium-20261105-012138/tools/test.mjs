// One command: node tools/test.mjs [--fast] [name...]. Prints only failures and a one-line count.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const args = process.argv.slice(2);
const fast = args.includes('--fast'), verbose = args.includes('-v');
const only = args.filter((a) => !a.startsWith('-'));
let pass = 0, fail = 0; const failures = [];
const t = { ok(c, msg) { if (c) pass++; else { fail++; failures.push(msg); } }, eq(a, b, msg) { this.ok(JSON.stringify(a) === JSON.stringify(b), `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`); }, info(m) { if (verbose) console.log('  ' + m); } };
const dir = new URL('../tests/headless/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.mjs') && !f.startsWith('probe') && (!only.length || only.some((o) => f.includes(o)))).sort();
for (const f of files) {
  try {
    const m = await import(new URL(f, dir).href);
    if (typeof m.default === 'function') await m.default(t);
  } catch (e) { fail++; failures.push(`${f}: threw ${e?.stack?.split('\n').slice(0, 3).join(' | ') ?? e}`); }
}
if (!fast && !only.length) {
  const r = spawnSync('node', ['tests/browser/run.mjs'], { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8' });
  const lines = (r.stdout ?? '').split('\n').filter(Boolean);
  for (const l of lines) { if (l.startsWith('PASS ')) pass += +l.slice(5); else if (l.startsWith('FAIL ')) { fail++; failures.push(l.slice(5)); } }
  if (r.status !== 0 && !lines.some((l) => l.startsWith('FAIL '))) { fail++; failures.push('browser tests crashed: ' + (r.stderr ?? '').slice(-300)); }
}
for (const f of failures) console.log('FAIL ' + f);
console.log(`${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
