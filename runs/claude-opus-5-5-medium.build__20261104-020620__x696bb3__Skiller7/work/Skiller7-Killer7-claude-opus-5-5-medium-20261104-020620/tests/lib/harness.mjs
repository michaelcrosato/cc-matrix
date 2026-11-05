// Loads the engine and the bundle into a vm (as game/test.mjs does), with the stand-ins the bundle guards for.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export function load(o = {}) {
  const ctx = { console: o.verbose ? console : { log() {}, warn() {}, error: console.error, info() {} }, location: { hash: '', search: '' }, addEventListener() {}, removeEventListener() {}, setTimeout, clearTimeout, performance };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(readFileSync(join(ROOT, 'engine/my-3d2dge.js'), 'utf8'), ctx, { filename: 'my-3d2dge.js' });
  vm.runInContext(readFileSync(join(ROOT, 'out/bundle.js'), 'utf8'), ctx, { filename: 'bundle.js' });
  return ctx;
}
