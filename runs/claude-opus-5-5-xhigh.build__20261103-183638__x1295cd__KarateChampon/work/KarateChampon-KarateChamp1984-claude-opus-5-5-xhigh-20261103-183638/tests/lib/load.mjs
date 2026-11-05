// Load the engine, the asset set and build/game.js into a fresh vm context (headless: no screen, sound or DOM), as
// kits/test.mjs does. o: { hash, hub (a fake AIHub), touch (a touch-only device), search }. Returns { ctx, E, KC, game }.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const root = new URL('../../', import.meta.url), cache = {};
const rd = f => cache[f] || (cache[f] = readFileSync(new URL(f, root), 'utf8'));
export function load(o = {}) {
  const store = new Map(), listeners = {};
  const ctx = {
    console: { log() {}, info() {}, warn: o.warn || (() => {}), error: o.error || (() => {}) },
    addEventListener(k, f) { (listeners[k] = listeners[k] || []).push(f); }, removeEventListener() {},
    location: { hash: o.hash ? '#' + o.hash : '', search: o.search || '', pathname: '/kc' },
    setTimeout: (f, ms) => setTimeout(f, ms), clearTimeout, performance: { now: () => (o.clock ? o.clock() : performance.now()) },
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) }
  };
  if (o.touch) { ctx.matchMedia = q => ({ matches: !/fine/.test(q) }); ctx.navigator = { maxTouchPoints: 5 }; }
  if (o.hub) ctx.AIHub = o.hub;
  if (o.pads) { ctx.__pad = { index: 0, id: 'Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), mapping: 'standard' }; ctx.navigator = Object.assign(ctx.navigator || {}, { getGamepads: () => [ctx.__pad] }); }
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(rd('engine/my-3d2dge.js'), ctx, { filename: 'my-3d2dge.js' });
  vm.runInContext(rd('assets/kc-set.js'), ctx, { filename: 'kc-set.js' });
  vm.runInContext(rd('build/game.js'), ctx, { filename: 'game.js' });
  const E = ctx.My3D2dge, KC = ctx.KC, game = KC.game;
  ctx.__fire = (k, e) => (listeners[k] || []).forEach(f => f(e || {}));
  return { ctx, E, KC, game, fire: ctx.__fire };
}
