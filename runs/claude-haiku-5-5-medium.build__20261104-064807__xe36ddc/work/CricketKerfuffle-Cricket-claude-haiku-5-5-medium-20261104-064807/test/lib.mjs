// Loads the engine and the game into a Node vm context, the way the page does, with stand-ins for the browser's globals.
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function loadGame(opts = {}) {
  const ctx = { console: { log() {}, info() {}, warn() {}, error() {} }, Math, addEventListener() {}, location: { hash: '' },
    navigator: { maxTouchPoints: opts.touch ? 5 : 0 }, Date, performance: { now: () => 0 } };
  if (opts.touch) ctx.matchMedia = q => ({ matches: q.includes('any-pointer: fine') ? false : false });
  if (opts.aihub) ctx.AIHub = opts.aihub;
  if (opts.storage) { const mem = new Map(); ctx.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: k => { mem.delete(k); } }; }   // a saved-data store for the tests that keep scores
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(readFileSync(path.join(root, 'engine', 'my-3d2dge.js'), 'utf8'), ctx, { filename: 'engine' });
  vm.runInContext(readFileSync(path.join(root, 'dist', 'game.js'), 'utf8'), ctx, { filename: 'game' });
  const E = ctx.My3D2dge, game = E.current;
  // the game's own live values, read through its namespace (the namespace is inside the page's closure: G is reached by the handle)
  const gT = key => game.debug.tuneRead(key);
  return { ctx, E, game, I: game.input, snap: () => game.debug.snapshot(), errs: () => game.errors.map(e => e.where + ': ' + e.message), gT, g_T: gT };
}
// the match-level code without the engine, for the simulation's own suites
export function loadSim() {
  const ctx = { console, Math };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(readFileSync(path.join(root, 'engine', 'my-3d2dge.js'), 'utf8'), ctx, { filename: 'engine' });
  const files = readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort().filter(f => !/^(30|4|5|6|7|9|44)/.test(f));
  vm.runInContext(`(function(){\n${files.map(f => readFileSync(path.join(root, 'src', f), 'utf8')).join('\n')}\nglobalThis.__G = G;})();`, ctx, { filename: 'game' });
  return ctx.__G;
}
