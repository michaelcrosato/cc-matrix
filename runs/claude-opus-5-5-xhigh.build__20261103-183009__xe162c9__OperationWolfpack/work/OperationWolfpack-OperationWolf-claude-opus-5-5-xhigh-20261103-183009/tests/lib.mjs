// Loads the engine and the game's src files (manifest order) into a node:vm context, as engine/game/test.mjs does.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const manifest = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));
export function load(o = {}) {
  const store = new Map();
  const ctx = { console, location: { hash: o.hash || '', search: o.search || '', pathname: '/test' }, setTimeout, clearTimeout, performance: { now: () => Date.now() } };
  if (o.window) Object.assign(ctx, o.window);
  vm.createContext(ctx);
  const files = [manifest.engine, ...manifest.src.filter(f => !o.only || o.only(f))];
  for (const f of files) vm.runInContext(readFileSync(join(ROOT, f), 'utf8'), ctx, { filename: f });
  return { ctx, E: ctx.My3D2dge, WP: ctx.WP, game: ctx.My3D2dge.current };
}
