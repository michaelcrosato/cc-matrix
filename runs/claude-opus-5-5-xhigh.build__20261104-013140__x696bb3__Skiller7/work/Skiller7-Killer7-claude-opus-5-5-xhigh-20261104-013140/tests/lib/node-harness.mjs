// The Node harness: the patched engine and out/bundle.js in a vm with the browser stand-ins the kits use; S7.start
// headless. Returns { game, S7, sim, I, snap, step }.
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const ENGINE = fs.readFileSync(path.join(ROOT, 'engine/my-3d2dge.js'), 'utf8');
const BUNDLE = fs.readFileSync(path.join(ROOT, 'out/bundle.js'), 'utf8');
export function boot(o = {}) {
  const quiet = { log() {}, warn() {}, error: o.verbose ? console.error : () => {}, info() {} };
  const ctx = { console: o.verbose ? console : quiet, setTimeout, clearTimeout, Math: Object.create(Math) };
  ctx.globalThis = ctx;
  if (o.globals) Object.assign(ctx, o.globals);
  vm.createContext(ctx);
  vm.runInContext(ENGINE, ctx, { filename: 'my-3d2dge.js' });
  vm.runInContext(BUNDLE, ctx, { filename: 'bundle.js' });
  const S7 = ctx.S7;
  const game = S7.start({ headless: true, seed: o.seed || 7, noPersist: true });
  const sim = S7.sim, I = game.input;
  const snap = () => game.debug.snapshot();
  const step = (s) => game.advance(s);
  return { game, S7, sim, I, snap, step, ctx };
}
