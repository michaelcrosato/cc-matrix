// Loads the engine and the built game in Node (headless), as the page would: a shared loader for the tests
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
export function load(o = {}) {
  const dir = new URL('../', import.meta.url);
  const quiet = { log() {}, info() {}, warn() {}, error: (...a) => o.errors !== false && console.error(...a) };
  const ctx = { console: o.verbose ? console : quiet, addEventListener() {}, location: { hash: '', pathname: '/baritones', search: '' }, setTimeout, clearTimeout, Promise };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(readFileSync(new URL('vendor/my-3d2dge.js', dir), 'utf8'), ctx, { filename: 'my-3d2dge.js' });
  vm.runInContext(readFileSync(new URL('dist/game.js', dir), 'utf8'), ctx, { filename: 'game.js' });
  const E = ctx.My3D2dge, game = E.current;
  return { ctx, E, game, I: game.input, D: game.debug, snap: () => game.debug.snapshot() };
}
