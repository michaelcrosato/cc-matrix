// The headless harness: the page's scripts in a vm context with the stand-ins a page gives (window, location, matchMedia,
// navigator), the engine headless. load({ hash, search }) -> { E, game, EF, I, snap, ctx }
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const DEV = new URL('../../', import.meta.url);
const SRC = ['vendor/session.js', 'engine/my-3d2dge.js', 'vendor/mocap/readable.js', 'vendor/mocap/mocap.js', 'mocap/ef-clips.js', 'build/game.js'];
const cache = {};
const code = f => cache[f] || (cache[f] = new vm.Script(readFileSync(new URL(f, DEV), 'utf8'), { filename: f }));
export function load(o = {}) {
  const store = {}, listeners = {};
  const ctx = {
    console: o.quiet === false ? console : { log() {}, info() {}, warn() {}, error: (...a) => (o.errors || (() => {}))(a.join(' ')) },
    location: { hash: o.hash || '', search: o.search || '', href: 'file:///game.html' + (o.search || '') + (o.hash || '') },
    navigator: { maxTouchPoints: 0, getGamepads: () => [], userAgent: 'node' },
    matchMedia: q => ({ matches: !!(o.media && o.media[q]), addEventListener() {}, removeEventListener() {} }),
    addEventListener(t, f) { (listeners[t] = listeners[t] || []).push(f); }, removeEventListener() {},
    performance: { now: o.now || (() => Date.now()) }, setTimeout, clearTimeout, setInterval, clearInterval,
    localStorage: { getItem: k => k in store ? store[k] : null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; }, clear() { for (const k in store) delete store[k]; } }
  };
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
  if (o.hub) ctx.AIHub = o.hub;
  vm.createContext(ctx);
  for (const f of SRC) { if (f === 'vendor/session.js' && o.hub) continue; code(f).runInContext(ctx); }
  const E = ctx.My3D2dge, game = E.current, EF = ctx.EF;
  return { E, game, EF, I: game.input, snap: () => game.debug.snapshot(), ctx, store, listeners };
}
