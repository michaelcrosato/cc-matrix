// Loads the game into a vm context with the stand-ins the page's scripts read (window, addEventListener, location), as
// engine/kits/test.mjs does. Draw runs on the engine's stand-in screen when asked, so draw errors land in game.errors.
import vm from 'node:vm';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
export const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cache = new Map();
const src = f => { if (!cache.has(f)) cache.set(f, new vm.Script(readFileSync(join(root, f), 'utf8'), { filename: f })); return cache.get(f); };
export const files = () => JSON.parse(readFileSync(join(root, 'game/files.json'), 'utf8')).filter(f => existsSync(join(root, f)));
export function load(o = {}) {
  const logs = [];
  const ctx = { console: { log() {}, info() {}, warn(...a) { logs.push(a.join(' ')); }, error(...a) { logs.push(a.join(' ')); } }, addEventListener() {}, removeEventListener() {}, location: { hash: o.hash || '' }, setTimeout, clearTimeout, performance };
  ctx.window = ctx; ctx.globalThis = ctx; if (o.hub) ctx.AIHub = o.hub;
  ctx.WEE_ABOUT = o.about || {};
  vm.createContext(ctx);
  const list = files();
  list.forEach((f, i) => {
    src(f).runInContext(ctx);
    if (o.after && o.after[f]) vm.runInContext(o.after[f], ctx, { filename: 'after:' + f });
    if (o.draw && i === 0) vm.runInContext('{ const G0 = My3D2dge.Game; My3D2dge.Game = class extends G0 { constructor(o) { super(Object.assign({}, o, { draw: true })); } }; }', ctx);
  });
  return { ctx, G: ctx.G, E: ctx.My3D2dge, game: ctx.G && ctx.G.game, logs };
}
