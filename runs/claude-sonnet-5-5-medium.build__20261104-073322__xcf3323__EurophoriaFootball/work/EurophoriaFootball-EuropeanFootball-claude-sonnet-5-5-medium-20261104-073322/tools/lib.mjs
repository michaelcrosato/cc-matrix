import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export function load(extra = {}) {
  const ctx = Object.assign({ console, performance, setTimeout, clearTimeout }, extra);
  vm.createContext(ctx);
  ctx.globalThis = ctx; ctx.window = ctx;
  if (!extra.AIHub) vm.runInContext(readFileSync(join(root, 'vendor/session.js'), 'utf8'), ctx, { filename: 'session.js' });
  vm.runInContext(readFileSync(join(root, 'engine/my-3d2dge.js'), 'utf8'), ctx, { filename: 'engine' });
  vm.runInContext('globalThis.__EF_NOSTART = true;', ctx);
  const g = readFileSync(join(root, 'build/game.js'), 'utf8').replace('const EF = {};', 'const EF = {}; EF.noStart = true;');
  vm.runInContext(g, ctx, { filename: 'game.js' });
  const E = ctx.My3D2dge, game = E.current;
  return { ctx, E, game, EF: game.debug.EF };
}
