// Shared: load the engine and the game into a headless Node context (no screen, no sound), as the kit tests do.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
export function load(hash = '#', extra = {}) {
  const here = new URL('../', import.meta.url), read = f => readFileSync(new URL(f, here), 'utf8');
  const ctx = { console: { log() {}, info() {}, warn() {}, error: console.error }, addEventListener() {}, location: { hash }, performance, setTimeout, clearTimeout, ...extra };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(read('vendor/my-3d2dge.js'), ctx, { filename: 'engine' });
  vm.runInContext(read('dist/game.js'), ctx, { filename: 'game.js' });
  const E = ctx.My3D2dge, game = E.current, G = ctx.__game;
  return { ctx, E, game, G, I: game.input };
}
let failed = 0, total = 0;
export const check = (what, ok, detail = '') => { total++; console.log((ok ? 'ok   ' : 'FAIL ') + what + (ok ? '' : ': ' + detail)); if (!ok) failed++; };
export const finish = (game) => { check('no engine errors', !game.errors.length, game.errors.map(e => e.message + ' @ ' + (e.stack || '').split('\n')[1]).join(' | ')); console.log(failed ? `${failed} of ${total} check(s) failed` : `all ${total} checks passed`); process.exit(failed ? 1 : 0); };
