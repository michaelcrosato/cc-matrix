import vm from 'node:vm'; import { readFileSync } from 'node:fs';
export function load(extra = {}) {
  const ctx = Object.assign({ console: { log() {}, info() {}, warn() {}, error: console.error }, addEventListener() {}, removeEventListener() {}, location: { hash: '' }, setTimeout, clearTimeout, performance: { now: () => Date.now() } }, extra);
  ctx.window = ctx; vm.createContext(ctx);
  const rd = f => readFileSync(new URL(f, import.meta.url), 'utf8');
  vm.runInContext(rd('../engine/my-3d2dge.js'), ctx, { filename: 'engine' });
  vm.runInContext(rd('../build/game.js'), ctx, { filename: 'game' });
  const E = ctx.My3D2dge; return { ctx, E, game: E.current, G: ctx.__game };
}
export const logs = [];
