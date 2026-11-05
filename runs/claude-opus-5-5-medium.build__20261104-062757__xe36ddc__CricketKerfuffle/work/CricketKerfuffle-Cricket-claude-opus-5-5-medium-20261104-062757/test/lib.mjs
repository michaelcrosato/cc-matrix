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

export function until(game, fn, cap = 60, step = 1 / 60) { for (let t = 0; t < cap; t += step) { if (fn()) return true; game.advance(step); } return !!fn(); }
