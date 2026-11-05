import vm from 'node:vm'; import fs from 'node:fs';
export function boot() {
  const ctx = { console, Math, JSON, Object, Array, Map, Set, Date, performance: { now: () => Date.now() }, setInterval: () => 0, clearInterval() {}, setTimeout, clearTimeout };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(new URL('../engine/my-3d2dge.js', import.meta.url), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(new URL('../dist/game.js', import.meta.url), 'utf8'), ctx, { filename: 'game.js' });
  const E = ctx.My3D2dge; return { E, game: E.current, G: E.__brig, ctx };
}
