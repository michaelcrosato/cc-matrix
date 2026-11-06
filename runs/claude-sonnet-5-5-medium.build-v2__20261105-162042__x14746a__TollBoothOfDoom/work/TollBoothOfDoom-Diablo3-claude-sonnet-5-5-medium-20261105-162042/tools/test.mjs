// node tools/test.mjs [--sim|--headless|--browser|--hub]  prints only failures and one count line.
import { pathToFileURL } from 'node:url';
import { resolve, join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
const root = join(dirname(new URL(import.meta.url).pathname), '..');
const TIERS = {
  sim: ['tests/sim/zones.mjs', 'tests/sim/combat.mjs', 'tests/sim/lint.mjs', 'tests/sim/systems.mjs'],
  headless: ['tests/headless/smoke.mjs', 'tests/headless/shell.mjs', 'tests/headless/layout.mjs', 'tests/headless/lastbell.mjs', 'tests/headless/playthrough.mjs'],
  browser: ['tests/browser/boot.mjs', 'tests/browser/input.mjs', 'tests/browser/rigs.mjs'],
  hub: ['tests/browser/hub.mjs', 'tests/browser/hubgame.mjs'],
};
const want = process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => a.slice(2));
const tiers = want.length ? want : Object.keys(TIERS);
const fails = []; let count = 0;
const t = { fail: (m) => { fails.push(m); }, ok: (c, m) => { count++; if (!c) fails.push(m); } };
const log = console.log; if (!process.env.TEST_VERBOSE) console.log = () => {};
for (const tier of tiers) for (const f of TIERS[tier] || []) {
  const p = resolve(root, f); if (!existsSync(p)) continue;
  try { const m = await import(pathToFileURL(p).href); await m.run(t); } catch (e) { fails.push(`${f}: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`); }
}
console.log = log;
for (const f of fails.slice(0, 60)) console.log('FAIL', f);
console.log(`${fails.length} failures, ${count} checks`);
process.exit(fails.length ? 1 : 0);
