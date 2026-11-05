// Loads the engine and the built game into a fresh vm context with the page's globals stood in (no DOM: the engine is
// headless). Returns { ctx, E, TT, game }.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const root = new URL('../../', import.meta.url);
const read = f => readFileSync(new URL(f, root), 'utf8');
let ENGINE = null, GAME = null;
const memStorage = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), clear: () => m.clear(), key: i => [...m.keys()][i] ?? null, get length() { return m.size; } }; };
export function load(o = {}) {
  ENGINE = ENGINE || read('engine/my-3d2dge.js'); GAME = o.fresh || !GAME ? read('build/game.js') : GAME;
  const quiet = { log() {}, info() {}, warn() {}, error: o.errors === false ? () => {} : (...a) => { if (o.onError) o.onError(a); } };
  const ctx = { console: o.console || quiet, addEventListener() {}, removeEventListener() {}, location: { hash: o.hash || '', search: o.search || '', pathname: '/thugby' },
    matchMedia: q => ({ matches: !!(o.media && o.media(q)), addEventListener() {}, removeEventListener() {} }), navigator: { getGamepads: () => [], userAgent: 'node' },
    performance: { now: () => Date.now() }, localStorage: o.storage || memStorage(), setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask, Promise };
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
  if (o.AIHub) ctx.AIHub = o.AIHub;
  vm.createContext(ctx);
  vm.runInContext(ENGINE, ctx, { filename: 'engine/my-3d2dge.js' });
  vm.runInContext(GAME, ctx, { filename: 'build/game.js' });
  const E = ctx.My3D2dge, H = ctx.__thugby || {};
  return { ctx, E, TT: H.TT, game: H.game || E.current };
}
