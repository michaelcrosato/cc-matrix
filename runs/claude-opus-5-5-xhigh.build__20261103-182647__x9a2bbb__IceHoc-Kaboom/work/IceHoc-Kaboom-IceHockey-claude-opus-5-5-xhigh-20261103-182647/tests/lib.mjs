// Loads the engine and the built game into a fresh vm context (headless: no screen, sound or DOM), with the page
// globals a game reads stubbed (window, addEventListener, location). Returns the game, its handle and helpers.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const here = new URL('../', import.meta.url), read = f => readFileSync(new URL(f, here), 'utf8');
const ENGINE = read('engine/my-3d2dge.js');
export function load(o = {}) {
  const GAME = read('build/game.js');
  const store = {};
  const ctx = { console: { log() {}, info() {}, warn() {}, error: o.quiet ? () => {} : (...a) => console.error(...a) }, addEventListener() {}, removeEventListener() {}, location: { hash: o.hash || '', pathname: '/ihk' },
    setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {}, Promise, performance: { now: () => 0 },
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } } };
  ctx.window = ctx; if (o.hub) ctx.AIHub = o.hub;
  vm.createContext(ctx);
  vm.runInContext(ENGINE, ctx, { filename: 'my-3d2dge.js' });
  vm.runInContext(GAME, ctx, { filename: 'game.js' });
  const game = ctx.My3D2dge.current, G = ctx.__game;
  const snap = () => game.debug.snapshot();
  return { ctx, game, G, snap, E: ctx.My3D2dge, store };
}
