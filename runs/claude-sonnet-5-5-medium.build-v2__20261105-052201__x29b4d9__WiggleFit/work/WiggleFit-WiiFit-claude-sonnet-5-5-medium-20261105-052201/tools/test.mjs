// node tools/test.mjs [group ...]  -> prints failures and one count line
import { existsSync } from 'node:fs';
const groups = process.argv.slice(2).length ? process.argv.slice(2) : ['unit', 'events', 'balance', 'flow', 'input', 'audio', 'ui', 'hub'];
let passed = 0, failed = 0; const fails = [];
const t = { ok(c, msg) { if (c) passed++; else { failed++; fails.push(msg); } }, eq(a, b, msg) { this.ok(a === b, `${msg} (got ${a}, want ${b})`); } };
for (const g of groups.flatMap((x) => (x === 'full' ? ['unit', 'events', 'balance', 'flow', 'input', 'audio', 'ui', 'hub'] : [x]))) {
  const f = `../test/${g}.mjs`; if (!existsSync(new URL(f, import.meta.url))) { t.ok(false, 'missing test group ' + g); continue; }
  try { const m = await import(f); await m.default(t); } catch (e) { t.ok(false, `group ${g} crashed: ${String(e && e.stack || e).slice(0, 400)}`); }
}
for (const m of fails) console.log('FAIL', m); console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
