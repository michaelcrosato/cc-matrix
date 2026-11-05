// The headless harness: the engine and game.js in a node:vm context, with the stand-ins a page would give, seeded randomness.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const root = new URL('..', import.meta.url);
const ENGINE = readFileSync(new URL('my-3d2dge.js', root), 'utf8'), GAME = readFileSync(new URL('game/game.js', root), 'utf8');
export function boot(o = {}) {
  let seed = o.seed || 7;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const store = {};
  const ctx = { console: o.quiet ? { log() {}, warn() {}, error() {}, info() {} } : console, setTimeout: () => 0, clearTimeout() {}, Math: Object.create(Math), Date, JSON, performance: { now: () => 0 } };
  ctx.Math.random = rand;
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
  ctx.addEventListener = () => {}; ctx.removeEventListener = () => {};
  ctx.location = { search: '', hash: '', pathname: '/gauntletdown', href: 'file:///gauntletdown.html' };
  ctx.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  ctx.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  ctx.navigator = { maxTouchPoints: 0, userAgent: 'node', getGamepads: () => [] };
  if (o.hub) ctx.AIHub = o.hub;
  vm.createContext(ctx);
  vm.runInContext(ENGINE, ctx, { filename: 'my-3d2dge.js' });
  vm.runInContext(GAME, ctx, { filename: 'game.js' });
  const E = ctx.My3D2dge, game = E.current;
  const api = {
    ctx, E, game, I: game.input, store,
    step: s => game.advance(s), snap: () => game.debug.snapshot(), D: game.debug,
    tap: (a, p = game.input) => p.tap(a), hold: (a, on = true, p = game.input) => p.hold(a, on),
    errors: () => game.errors.map(e => (e.where || '') + ': ' + e.message)
  };
  return api;
}
