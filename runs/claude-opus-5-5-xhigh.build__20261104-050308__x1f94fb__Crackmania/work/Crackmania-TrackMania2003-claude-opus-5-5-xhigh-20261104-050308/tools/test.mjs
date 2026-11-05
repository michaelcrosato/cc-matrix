// node tools/test.mjs [suite ...] [--browser] [--hub] [--all]: THE one command (PLAN §9.2). Loads the engine once,
// runs the suites in-process, prints only failures ("FAIL suite: check: detail") and one summary line; exit 1 on any
import { E, makeGame } from './node-env.mjs';
import { readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
const args = process.argv.slice(2), want = args.filter(a => !a.startsWith('--')), all = args.includes('--all');
const DIR = fileURLToPath(new URL('./tests/', import.meta.url));
const order = ['features', 'turtle', 'blocks', 'physics', 'race', 'ghost', 'bot', 'campaign', 'editor', 'puzzle', 'survival', 'hotseat', 'split', 'online', 'ui', 'playthrough'];
const files = readdirSync(DIR).filter(f => f.endsWith('.mjs')).map(f => f.slice(0, -4)).sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
const run = want.length ? files.filter(f => want.includes(f)) : files;
let n = 0, failed = 0; const t0 = Date.now();
const fail = (suite, check, detail = '') => { failed++; console.log('FAIL ' + suite + ': ' + check + (detail ? ': ' + detail : '')); };
await E.World3D.init(null, { render: false });
let G = null; const game = async () => G || (G = await makeGame());
for (const f of run) {
  const mod = await import(pathToFileURL(DIR + f + '.mjs').href);
  const T = { check(name, ok, detail) { n++; if (!ok) fail(f, name, typeof detail === 'function' ? detail() : detail); return !!ok; }, eq(name, a, b, tol = 0) { n++; const ok = typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) <= tol : JSON.stringify(a) === JSON.stringify(b); if (!ok) fail(f, name, 'got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + (tol ? ' ±' + tol : '')); return ok; }, game, E };
  try { await mod.default(T); } catch (e) { fail(f, 'threw', (e && e.stack || String(e)).split('\n').slice(0, 4).join(' | ')); }
  if (G && G.game.errors.length) { for (const e of G.game.errors) fail(f, 'engine error', e.where + ': ' + e.message); G.game.errors.length = 0; }
}
if (args.includes('--browser') || all) { const { browser } = await import('./browser.mjs'); const r = await browser(); n += r.n; for (const [c, d] of r.fails) fail('browser', c, d); }
if (args.includes('--hub') || all) { const { hub } = await import('./hub.mjs'); const r = await hub(); n += r.n; for (const [c, d] of r.fails) fail('hub', c, d); }
console.log(n + ' checks, ' + failed + ' failed, ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
process.exit(failed ? 1 : 0);
