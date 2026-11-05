// The headless harness (as engine/game/test.mjs does it): a vm context with window stand-ins, the engine, then every
// src file in manifest order. Returns { E, game, OB, I, snap }.
import vm from 'node:vm';
import { readFileSync, existsSync } from 'node:fs';
const root = new URL('../../', import.meta.url);
export function boot(o = {}) {
  const store = {};
  const ctx = { console: o.console || { log() {}, info() {}, warn() {}, error: console.error }, addEventListener() {}, removeEventListener() {}, location: { hash: o.hash || '', search: o.search || '', pathname: '/outbloom' }, setTimeout, clearTimeout, setInterval, clearInterval, performance: { now: () => Date.now() } };
  ctx.window = ctx; ctx.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  if (o.hub) ctx.AIHub = o.hub;
  if (o.setup) o.setup(ctx);
  vm.createContext(ctx);
  vm.runInContext(readFileSync(new URL('engine/my-3d2dge.js', root), 'utf8'), ctx, { filename: 'my-3d2dge.js' });
  const files = JSON.parse(readFileSync(new URL('src/manifest.json', root), 'utf8'));
  for (const f of files) { const u = new URL('src/' + f, root); if (!existsSync(u) && o.partial) continue; vm.runInContext(readFileSync(u, 'utf8'), ctx, { filename: f }); }
  const OB = ctx.OB, game = OB.game, E = ctx.My3D2dge;
  return { ctx, E, OB, game, I: game && game.input, snap: () => game.debug.snapshot(), store };
}
