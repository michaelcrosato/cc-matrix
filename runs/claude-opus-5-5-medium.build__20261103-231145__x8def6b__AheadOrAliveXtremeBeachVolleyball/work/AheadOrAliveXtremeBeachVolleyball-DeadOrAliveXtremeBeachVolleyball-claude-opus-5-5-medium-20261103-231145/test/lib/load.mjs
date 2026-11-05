// The headless loader: builds build/game.js when a source is newer, then loads the engine and the game in a fresh vm
// context with small stand-ins for the browser, Math.random seeded. Returns { E, game, G, ctx }.
import vm from 'node:vm';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { build, newest } from '../../tools/build.mjs';
const root = new URL('../../', import.meta.url);
let built = false;
export function ensureBuilt() {
  if (built) return; const out = new URL('build/game.js', root);
  if (!existsSync(out) || statSync(out).mtimeMs < newest() || statSync(out).mtimeMs < statSync(new URL('engine/my-3d2dge.js', root)).mtimeMs) build();
  built = true;
}
const engineSrc = () => readFileSync(new URL('engine/my-3d2dge.js', root), 'utf8');
export function load(o = {}) {
  ensureBuilt();
  const store = new Map();
  const ctx = { console: o.quiet === false ? console : { log() {}, warn() {}, error: console.error, info() {} }, Date, JSON, Math: Object.create(Math), Intl,
    localStorage: { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear(), key: i => [...store.keys()][i], get length() { return store.size; } },
    location: { search: '', hash: '', href: 'file:///game.html', pathname: '/game.html' } };
  ctx.window = ctx; ctx.globalThis = ctx;
  if (o.hub) ctx.AIHub = o.hub;
  vm.createContext(ctx);
  vm.runInContext(engineSrc(), ctx, { filename: 'my-3d2dge.js' });
  for (const f of ['readable.js', 'mocap.js', 'aoa-clips.js']) vm.runInContext(readFileSync(new URL('vendor/mocap/' + f, root), 'utf8'), ctx, { filename: f });
  const E = ctx.My3D2dge; ctx.Math.random = E.rng(o.seed || 7);
  vm.runInContext(readFileSync(new URL('build/game.js', root), 'utf8'), ctx, { filename: 'game.js' });
  const game = E.current, G = ctx.AOA;
  return { E, game, G, ctx, store };
}
