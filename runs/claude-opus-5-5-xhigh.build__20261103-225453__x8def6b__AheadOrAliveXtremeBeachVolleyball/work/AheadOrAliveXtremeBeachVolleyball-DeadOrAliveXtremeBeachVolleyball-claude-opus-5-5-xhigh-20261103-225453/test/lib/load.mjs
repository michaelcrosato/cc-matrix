// The headless loader: builds build/game.js when a source is newer, then runs the engine, the mocap scripts and the
// game in a fresh vm context with stand-ins for the page (window, location, matchMedia, navigator) and an optional
// fake AI Hub. Returns { E, game, G, ctx }. Math.random is seeded, so a run is repeatable.
import vm from 'node:vm';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGame, newestSource, VENDOR_MOCAP } from '../../tools/build.mjs';

export const DEV = join(dirname(fileURLToPath(import.meta.url)), '../..');
let built = 0;
export function ensureBuilt() {
  const out = join(DEV, 'build/game.js');
  if (!existsSync(out) || statSync(out).mtimeMs < newestSource() || !built) { buildGame(); built = Date.now(); }
}
const cache = {};
const src = f => cache[f] || (cache[f] = readFileSync(join(DEV, f), 'utf8'));
export function load(o = {}) {
  ensureBuilt();
  delete cache['build/game.js'];
  const store = {};
  const ctx = {
    console: o.quiet === false ? console : { log() {}, info() {}, warn() {}, error: (...a) => { if (o.errors) o.errors.push(a.join(' ')); } },
    addEventListener() {}, removeEventListener() {}, location: { hash: o.hash || '', search: o.search || '', href: 'file:///game.html' },
    matchMedia: q => ({ matches: o.touchOnly ? /coarse/.test(q) : false, addEventListener() {} }), navigator: { maxTouchPoints: o.touchOnly ? 5 : 0, getGamepads: () => [] },
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, performance: { now: o.perfNow || (() => 0) }
  };
  ctx.window = ctx; ctx.self = ctx;
  if (o.hub) ctx.AIHub = o.hub;
  if (o.noBoot) ctx.AOA_NO_BOOT = true;
  vm.createContext(ctx);
  vm.runInContext(src('engine/my-3d2dge.js'), ctx, { filename: 'engine.js' });
  const E = ctx.My3D2dge;
  vm.runInContext('Math', ctx).random = E.rng(o.seed || 12345);
  for (const f of VENDOR_MOCAP) if (existsSync(join(DEV, f))) vm.runInContext(src(f), ctx, { filename: f });
  vm.runInContext(src('build/game.js'), ctx, { filename: 'game.js' });
  const G = ctx.AOA, game = E.current;
  return { E, game, G, ctx, store };
}
/** run until fn() is true or the time runs out (seconds of game time); returns whether it became true */
export function until(game, fn, max = 60, step = 1 / 120) { for (let t = 0; t < max; t += step) { if (fn()) return true; game.advance(step); } return fn(); }
