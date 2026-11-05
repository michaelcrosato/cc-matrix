// The headless loader: the engine and build/game.js in a vm context with the page's stand-ins (window, location,
// navigator, matchMedia) and, when asked, a mock AIHub. Returns { E, game, BZ, ctx }.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const ENGINE = readFileSync(join(root, 'engine', 'my-3d2dge.js'), 'utf8');
export function load(o = {}) {
  const game = readFileSync(join(root, 'build', 'game.js'), 'utf8');
  const logs = [];
  const ctx = {
    console: { log: (...a) => logs.push(a.join(' ')), info() {}, warn: (...a) => logs.push('WARN ' + a.join(' ')), error: (...a) => logs.push('ERROR ' + a.join(' ')) },
    addEventListener() {}, removeEventListener() {}, location: { hash: o.hash || '', search: '', href: 'file:///game.html' },
    navigator: { maxTouchPoints: 0, userAgent: 'node' }, matchMedia: () => ({ matches: false }), setTimeout, clearTimeout, performance: { now: () => Date.now() }
  };
  ctx.window = ctx;
  if (o.hub) ctx.AIHub = o.hub;
  if (o.random) ctx.Math = Object.create(Math, { random: { value: o.random } });
  vm.createContext(ctx);
  vm.runInContext(ENGINE, ctx, { filename: 'engine/my-3d2dge.js' });
  vm.runInContext(game, ctx, { filename: 'build/game.js' });
  return { E: ctx.My3D2dge, game: ctx.BZ.game, BZ: ctx.BZ, ctx, logs };
}
