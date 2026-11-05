// Loads the patched engine and the built game into one VM context, the way a headless test runs them.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
export function load() {
  const ctx = { console, Math, Date, JSON, Object, Array, Set, Map, Number, String, Boolean, Symbol, Promise, setTimeout, clearTimeout, Uint8Array, Float32Array, Int32Array, performance: { now: () => Date.now() } };
  vm.createContext(ctx);
  vm.runInContext(readFileSync(new URL('../engine/my-3d2dge.js', import.meta.url), 'utf8'), ctx, { filename: 'engine.js' });
  vm.runInContext(readFileSync(new URL('../build/game.js', import.meta.url), 'utf8'), ctx, { filename: 'game.js' });
  const game = ctx.My3D2dge.current, MT = ctx.MT;
  return { ctx, game, MT, E: ctx.My3D2dge };
}
