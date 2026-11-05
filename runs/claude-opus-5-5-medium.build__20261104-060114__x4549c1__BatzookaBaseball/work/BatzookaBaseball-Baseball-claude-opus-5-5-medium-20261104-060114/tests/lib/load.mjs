// The headless loader: the engine and build/game.js in a vm context (no DOM: the engine is headless, draw is skipped).
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const DEV = new URL('../../', import.meta.url);
export function load(o = {}) {
  const ctx = { console: o.quiet ? { log() {}, warn() {}, error: console.error, info() {} } : console, setTimeout, clearTimeout, performance };
  if (o.hub) ctx.AIHub = o.hub;
  vm.createContext(ctx);
  for (const f of ['engine/my-3d2dge.js', 'build/game.js']) vm.runInContext(readFileSync(new URL(f, DEV), 'utf8'), ctx, { filename: f });
  const E = ctx.My3D2dge, game = E.current;
  return { ctx, E, game, BZ: ctx.window ? ctx.window.BZ : game.debug && ctx.BZ_ || null };
}
