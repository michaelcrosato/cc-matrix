// Load the engine and build/game.js in a Node vm (headless: no screen, sound or DOM), with stand-ins for the page's globals.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const root = new URL('../../', import.meta.url);
export function loadGame(o = {}) {
  const store = {};
  const ctx = { console: { log() {}, info() {}, warn: o.warn || (() => {}), error: o.error || (() => {}) }, addEventListener() {}, removeEventListener() {}, location: { hash: o.hash || '', search: o.search || '' }, setTimeout, clearTimeout, performance: { now: () => (ctx.__now || 0) } };
  ctx.window = ctx;
  if (o.matchMedia) ctx.matchMedia = o.matchMedia;
  if (o.navigator) ctx.navigator = o.navigator;
  if (o.hub) ctx.AIHub = o.hub;
  vm.createContext(ctx);
  vm.runInContext(readFileSync(new URL('engine/my-3d2dge.js', root), 'utf8'), ctx, { filename: 'my-3d2dge.js' });
  vm.runInContext(readFileSync(new URL('build/game.js', root), 'utf8'), ctx, { filename: 'game.js' });
  const E = ctx.My3D2dge, game = E.current, KC = ctx.KC;
  return { ctx, E, game, KC, I: game.input, snap: () => game.debug.snapshot(), adv: s => game.advance(s) };
}
