// Loads the engine and the built game into a Node VM context, the same way the browser does (no DOM: the engine's
// headless mode). Every test file imports `load()`.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export function load() {
  const ctx = { console, setTimeout, clearTimeout };
  vm.createContext(ctx);
  vm.runInContext(readFileSync(join(root, 'engine', 'my-3d2dge.js'), 'utf8'), ctx, { filename: 'engine' });
  vm.runInContext(readFileSync(join(root, 'build', 'game.js'), 'utf8'), ctx, { filename: 'game' });
  return { E: ctx.My3D2dge, TC: ctx.TC, ctx };
}
