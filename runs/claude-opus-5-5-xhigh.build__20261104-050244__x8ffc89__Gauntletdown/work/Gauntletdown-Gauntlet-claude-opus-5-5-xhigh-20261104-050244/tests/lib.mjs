// Loads the patched engine and game/game.js into a node:vm context (headless: no DOM), with the page globals the game
// reads, an optional fake AIHub, and seeded randomness. Every suite uses boot() and the helpers below.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const root = new URL('../', import.meta.url), read = f => readFileSync(new URL(f, root), 'utf8');
let ENGINE = null, GAME = null;
/** mulberry32 */
export const seeded = s => () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const memStore = () => { const d = {}; return { getItem: k => k in d ? d[k] : null, setItem: (k, v) => { d[k] = String(v); }, removeItem: k => { delete d[k]; }, clear: () => { for (const k in d) delete d[k]; } }; };
export function boot(o = {}) {
  if (!ENGINE || o.reload) { ENGINE = read('my-3d2dge.js'); GAME = read('game/game.js'); }
  const warnings = [];
  const ctx = { console: { log() {}, info() {}, warn: (...a) => warnings.push(a.join(' ')), error: (...a) => warnings.push('ERROR ' + a.join(' ')) },
    addEventListener() {}, removeEventListener() {}, location: { hash: '', search: '', pathname: '/gauntletdown' }, setTimeout, clearTimeout, setInterval, clearInterval, performance,
    navigator: { maxTouchPoints: 0, getGamepads: () => [] }, matchMedia: () => ({ matches: true, addEventListener() {} }), localStorage: memStore(), structuredClone };
  ctx.window = ctx; ctx.globalThis = ctx;
  if (o.hub) ctx.AIHub = o.hub;
  vm.createContext(ctx);
  const R = seeded(o.seed || 12345);
  ctx.__rand = R; vm.runInContext('Math.random = __rand;', ctx);
  vm.runInContext(ENGINE, ctx, { filename: 'my-3d2dge.js' });
  vm.runInContext(GAME, ctx, { filename: 'game.js' });
  const E = ctx.My3D2dge, game = E.current, D = game.debug, api = D.api;
  const t = {
    ctx, E, game, D, api, warnings, I: game.input,
    step: (s, n = 1) => { for (let i = 0; i < n; i++) game.advance(s); },
    tap: (a, p = game.input) => p.tap(a), hold: (a, on = true, p = game.input) => p.hold(a, on),
    snap: () => D.snapshot(), W: () => D.world(),
    errors: () => game.errors.map(e => (e.where || '') + ': ' + (e.message || e)).concat(warnings.filter(w => /my-3D2dge:/.test(w) && !/audio|sound is off|settings could not be saved/.test(w)))
  };
  game.advance(.1);
  return t;
}
/** a check list that prints only failures */
export function suite(name) {
  const S = { name, n: 0, failed: 0, fails: [] };
  S.check = (what, ok, detail = '') => { S.n++; if (!ok) { S.failed++; S.fails.push(('FAIL ' + name + ' ' + what + (detail ? ': ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')).slice(0, 700)); } return !!ok; };
  S.throws = (what, fn) => { try { fn(); S.check(what, true); } catch (e) { S.check(what, false, (e && e.stack || String(e)).split('\n').slice(0, 4).join(' / ')); } };
  return S;
}
