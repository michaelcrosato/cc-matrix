// THE one test command: node test/run.mjs [suite ...]. Prints only failures (FAIL suite > case: detail), then one line:
// "N passed, M failed (S suites, T s)". Exit code 1 on any failure.
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';
const ROOT = new URL('..', import.meta.url);
const ENGINE = readFileSync(new URL('engine/my-3d2dge.js', ROOT), 'utf8');
let GAME = null;
const load = () => GAME || (GAME = readFileSync(new URL('dist/game.js', ROOT), 'utf8'));
// a fresh game in its own context; opts.pre runs first (stubs: matchMedia, AIHub)
export function boot(opts = {}) {
  const ctx = { console: { log() {}, warn() {}, error() {}, info() {} } };
  if (opts.pre) opts.pre(ctx);
  vm.createContext(ctx);
  if (opts.hubSrc) vm.runInContext(opts.hubSrc, ctx);
  vm.runInContext(ENGINE, ctx, { filename: 'my-3d2dge.js' });
  vm.runInContext('Math.random = My3D2dge.rng(7)', ctx);
  vm.runInContext(load(), ctx, { filename: 'game.js' });
  const E = ctx.My3D2dge, game = E.current, D = game.debug;
  game.advance(.5);
  return { ctx, E, game, D, I: game.input, snap: () => D.snapshot() };
}
const results = { pass: 0, fail: 0, suites: 0 };
export function suite(name) {
  return {
    ok(what, cond, detail = '') { if (cond) results.pass++; else { results.fail++; console.log(`FAIL ${name} > ${what}${detail ? ': ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 300) : ''}`); } return !!cond; },
    noErrors(g, what = 'no errors') { return this.ok(what, !g.errors.length, g.errors.slice(0, 2).map(e => String(e && (e.stack || e.message) || e).split('\n').slice(0, 3).join(' | ')).join(' || ')); }
  };
}
// run the game until a condition holds (or a cap): returns true if it held
export function until(game, fn, cap = 60, step = 1 / 60) { for (let t = 0; t < cap; t += step) { if (fn()) return true; game.advance(step); } return !!fn(); }
const t0 = Date.now();
const want = process.argv.slice(2);
const files = readdirSync(new URL('test/suites/', ROOT)).filter(f => f.endsWith('.mjs')).sort();
for (const f of files) {
  const id = f.replace(/^\d+-/, '').replace(/\.mjs$/, '');
  if (want.length && !want.includes(id)) continue;
  results.suites++;
  try { const mod = await import(new URL('test/suites/' + f, ROOT)); await mod.default({ boot, suite: () => suite(id), until }); }
  catch (e) { results.fail++; console.log(`FAIL ${id} > crashed: ${String(e && e.stack || e).split('\n').slice(0, 4).join(' | ')}`); }
}
console.log(`${results.pass} passed, ${results.fail} failed (${results.suites} suites, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(results.fail ? 1 : 0);
