// Shared test helpers: load the engine and the built game (dist/game.js) into a fresh Node vm context, headless, with
// the page globals the game reads stood in; drive it with game.advance and input; read it through game.debug.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const ENGINE = readFileSync(new URL('engine/my-3d2dge.js', root), 'utf8');
let GAME = null;
export const gameSource = () => GAME || (GAME = readFileSync(new URL('dist/game.js', root), 'utf8'));
/** every console.warn / console.error raised in any loaded game (the engine's warnings start "my-3D2dge:"), one entry per
 *  distinct message; the runner fails a suite that adds any (a suite expecting one takes it back with takeWarnings) */
export const warnings = [];
const noteWarning = (...a) => { const msg = a.map(x => x && x.stack ? x.stack.split('\n')[0] : String(x)).join(' '); if (!warnings.includes(msg)) warnings.push(msg); };
export function takeWarnings(re) { const got = warnings.filter(w => re.test(w)); for (const w of got) warnings.splice(warnings.indexOf(w), 1); return got; }
/** a fresh game: { E, game, I, D (game.debug), K (the game's namespace), ctx }. o.hash: a deep link; o.touch: a touch-only
 *  device; o.hub: a fake AIHub object put in place before the game loads; o.seed: Math.random's seed */
export function load(o = {}) {
  const store = {};
  const ctx = {
    console: { log() {}, info() {}, warn: noteWarning, error: noteWarning }, addEventListener() {}, removeEventListener() {},
    location: { hash: o.hash || '', search: '', pathname: '/test' }, setTimeout, clearTimeout,
    navigator: { maxTouchPoints: o.touch ? 5 : 0, userAgent: 'node' },
    matchMedia: q => ({ matches: o.touch ? !/any-pointer: fine|pointer: fine/.test(q) && /coarse/.test(q) : /fine/.test(q), addEventListener() {}, removeEventListener() {} })
  };
  if (o.hub) ctx.AIHub = o.hub;
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(ENGINE, ctx, { filename: 'my-3d2dge.js' });
  const E = ctx.My3D2dge;
  if (o.seed !== undefined) { ctx.__rng = E.rng(o.seed); vm.runInContext("Math.random = __rng", ctx); }

  vm.runInContext(gameSource(), ctx, { filename: 'game.js' });
  const game = E.current;
  return { E, game, I: game.input, D: game.debug, K: ctx.__kerfuffle, ctx };
}
/** advance until fn() is true (or max seconds): returns the seconds it took, or -1 */
export function until(game, fn, max = 30, step = 1 / 60) { let t = 0; while (t < max) { if (fn()) return t; game.advance(step); t += step; } return fn() ? t : -1; }
/** a quick match with player 1 batting (side 0) or bowling, toss off, a fixed seed */
export function quickMatch(env, o = {}) {
  const { game, D, I } = env;
  game.advance(.3);
  D.startMatch(Object.assign({ toss: false, seed: 5, humans: { 0: [I] } }, o));
  game.advance(.1);
  return game.debug.match();
}
