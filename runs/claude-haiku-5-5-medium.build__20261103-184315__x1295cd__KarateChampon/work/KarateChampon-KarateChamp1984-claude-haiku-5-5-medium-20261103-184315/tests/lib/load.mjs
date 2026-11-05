// Loads the engine and the built game into a Node vm context with stand-ins for the browser (as engine kits/test.mjs does).
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const dev = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export function loadEngine(extra = {}) {
  const ctx = { console, addEventListener() {}, location: { hash: '' }, navigator: { userAgent: 'node' }, ...extra };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(readFileSync(path.join(dev, 'engine/dist/handoff/my-3d2dge.js'), 'utf8'), ctx, { filename: 'my-3d2dge.js' });
  return ctx;
}
export function loadGame(ctx) {
  vm.runInContext(readFileSync(path.join(dev, 'build/game.js'), 'utf8'), ctx, { filename: 'game.js' });
  return ctx.KC;
}
export { dev };
