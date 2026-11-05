// Headless harness: loads the engine, the props set and build/game.js into a fresh vm context (no DOM: E.Game is
// headless), and returns { ctx, E, MT, game }. Options: { skipRigs (default true), hub (a fake AIHub), hash }.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = {};
const read = f => SRC[f] || (SRC[f] = readFileSync(join(root, f), 'utf8'));
export function boot(o = {}) {
  const store = {};
  const ctx = { console: o.quiet === false ? console : { log() {}, warn() {}, error: (...a) => (o.errors || []).push(a.join(' ')), info() {} }, setTimeout, clearTimeout, setImmediate, queueMicrotask, Promise, performance: { now: () => (ctx.__clock || 0) * 1000 } };
  ctx.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  if (o.hub) ctx.AIHub = o.hub;
  if (o.globals) Object.assign(ctx, o.globals);
  vm.createContext(ctx);
  vm.runInContext(read('engine/my-3d2dge.js'), ctx, { filename: 'my-3d2dge.js' });
  ctx.window = ctx; vm.runInContext(read('assets/mash-props.js'), ctx, { filename: 'mash-props.js' }); delete ctx.window;
  vm.runInContext('My3D2dge.__preset = true;', ctx);
  vm.runInContext(read('build/game.js'), ctx, { filename: 'game.js' });
  const MT = ctx.MT, game = MT.game;
  MT.cfg.skipRigs = o.skipRigs !== false;
  game.advance(.05);
  return { ctx, E: ctx.My3D2dge, MT, game, store };
}
export const flush = () => new Promise(r => setImmediate(r));
