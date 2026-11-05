// The Node harness: the 2D engine and the game's src/ (concatenated as the build does) in a vm context with stand-ins
// for the browser: no 3D (NullView), a Map-backed localStorage, matchMedia, an inactive AIHub unless asked.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { gameSource } from '../tools/build.mjs';
const here = new URL('..', import.meta.url).pathname;
const ENGINE = readFileSync(here + 'engine/my-3d2dge.js', 'utf8'), GAME = gameSource();
export async function boot(o = {}) {
  const store = new Map();
  const ctx = { console: o.quiet === false ? console : { log() {}, warn() {}, error: (...a) => (o.errors || []).push(a.join(' ')), info() {} }, setTimeout, clearTimeout, performance, Date, Math, JSON, Promise };
  ctx.window = ctx; ctx.globalThis = ctx;
  ctx.localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
  ctx.matchMedia = q => ({ matches: o.coarse ? q === '(pointer: coarse)' : false, addEventListener() {} });
  ctx.navigator = { getGamepads: () => [], userAgent: 'node' };
  ctx.location = { hash: '', search: '' };
  if (o.hub) ctx.AIHub = o.hub;
  if (o.hubInfo) ctx.__hubInfo = o.hubInfo;
  vm.createContext(ctx);
  vm.runInContext(ENGINE, ctx, { filename: 'engine.js' });
  await vm.runInContext(GAME.replace(/\}\)\(\)\.catch\(/, '})().then(() => { window.__booted = true; }).catch('), ctx, { filename: 'game.js' });
  for (let i = 0; i < 50 && !ctx.__booted; i++) await new Promise(r => setTimeout(r, 1));
  const B = ctx.B, game = B.game;
  game.advance(.2);
  return { ctx, B, game, I: game.input, store };
}
export const check = (fails, suite) => (what, ok, detail = '') => { if (!ok) fails.push(`FAIL ${suite}: ${what}${detail ? ': ' + detail : ''}`); return ok; };
