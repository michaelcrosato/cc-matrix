// Loads the engine and the built game into a fresh vm context (headless: no screen, sound or DOM) and returns its handles.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const here = new URL('../', import.meta.url), rd = f => readFileSync(new URL(f, here), 'utf8');
const ENGINE = rd('engine/my-3d2dge.js'), GAME = rd('build/game.js');
export function load(hash = '', extra = {}) {
  const store = {};
  const ctx = { console: { log() {}, info() {}, warn() {}, error: (...a) => ctx.__errors.push(a.join(' ')) }, __errors: [], addEventListener() {}, removeEventListener() {}, location: { hash, search: '' }, setTimeout, clearTimeout, ...extra };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(ENGINE, ctx, { filename: 'engine.js' });
  vm.runInContext(GAME, ctx, { filename: 'game.js' });
  const E = ctx.My3D2dge, game = E.current, G = ctx.__game;
  return { ctx, E, game, G, snap: () => game.debug.snapshot(), I: game.input, step: s => game.advance(s), store };
}
