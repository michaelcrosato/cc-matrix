// node tests/run.mjs [filter...] [--fast]   -> builds build/game.js, runs every tests/*.test.mjs in a fresh node:vm context,
// then the browser checks (tests/browser/*.mjs) unless --fast. Prints only failures, then one line: passed/total.
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const dev = new URL('..', import.meta.url), args = process.argv.slice(2), fast = args.includes('--fast'), filters = args.filter(a => !a.startsWith('--'));
const t0 = Date.now();
execFileSync(process.execPath, [new URL('tools/build.mjs', dev).pathname, ...(fast ? ['--js'] : [])], { stdio: ['ignore', 'ignore', 'inherit'] });
const engine = readFileSync(new URL('engine/my-3d2dge.js', dev), 'utf8'), gameJs = readFileSync(new URL('build/game.js', dev), 'utf8');
let passed = 0, failed = 0;
export function makeContext(extra = {}) {
  const store = new Map();
  const localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear(), key: i => [...store.keys()][i], get length() { return store.size; } };
  const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, localStorage, ...extra };
  vm.createContext(ctx);
  vm.runInContext('var window = globalThis; var Math = globalThis.Math;', ctx);
  vm.runInContext(engine, ctx, { filename: 'engine.js' });
  if (extra.__pre) vm.runInContext(extra.__pre, ctx);
  vm.runInContext('Math.random = My3D2dge.rng(7);', ctx);
  vm.runInContext(gameJs, ctx, { filename: 'game.js' });
  const E = ctx.My3D2dge, game = E.current, B = ctx.__BENTOU.B, I = game.input;
  const t = { ctx, E, game, B, I, snap: () => game.debug.snapshot(), step: s => game.advance(s), tap: a => I.tap(a), hold: (a, on = true) => I.hold(a, on),
    load: (id, o) => game.debug.load(id, o), M: () => B.mission, H: () => B.mission.hero };
  // drive the hero with an intent for seconds (the autopilot's interface): replaces the player's input
  t.intent = (o, sec) => { const save = B.intentFromInput; B.intentFromInput = () => Object.assign(B.emptyIntent(), typeof o === 'function' ? o() : o); try { game.advance(sec); } finally { B.intentFromInput = save; } };
  return t;
}
const files = readdirSync(new URL('tests/', dev)).filter(f => f.endsWith('.test.mjs')).sort();
for (const f of files) {
  const suite = f.replace('.test.mjs', '');
  if (filters.length && !filters.some(x => suite.includes(x))) continue;
  const mod = await import(new URL('tests/' + f, dev).href);
  const check = (name, ok, detail = '') => { if (ok) passed++; else { failed++; console.log(`FAIL ${suite} › ${name}: ${String(detail).slice(0, 400)}`); } };
  try { await mod.default({ makeContext, check }); }
  catch (e) { failed++; console.log(`FAIL ${suite} › threw: ${e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e}`); }
}
if (!fast) {
  for (const f of readdirSync(new URL('tests/browser/', dev)).filter(f => f.endsWith('.mjs')).sort()) {
    const suite = 'browser/' + f.replace('.mjs', '');
    if (filters.length && !filters.some(x => suite.includes(x))) continue;
    const mod = await import(new URL('tests/browser/' + f, dev).href);
    const check = (name, ok, detail = '') => { if (ok) passed++; else { failed++; console.log(`FAIL ${suite} › ${name}: ${String(detail).slice(0, 400)}`); } };
    try { await mod.default({ check, dev }); } catch (e) { failed++; console.log(`FAIL ${suite} › threw: ${e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e}`); }
  }
}
console.log(`${passed}/${passed + failed} checks passed, ${failed} failed (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
process.exit(failed ? 1 : 0);
