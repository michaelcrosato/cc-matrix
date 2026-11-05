// Test helpers: load the game headless in a fresh node:vm context (the page's three scripts in order: the AI Hub client,
// the engine, the game) with the stand-ins kits/test.mjs uses plus a few more, seeded Math.random, and drive it with
// game.advance. Every suite gets check(name, ok, detail) and records failures only.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
export const DEV = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = {};
const read = f => SRC[f] || (SRC[f] = readFileSync(join(DEV, f), 'utf8'));
export function makeCtx(o = {}) {
  const store = new Map();
  const ctx = {
    console: { log() {}, info() {}, warn: (...a) => { ctx.__warns.push(a.join(' ')); }, error: (...a) => { ctx.__errs.push(a.join(' ')); } },
    __warns: [], __errs: [], addEventListener() {}, removeEventListener() {}, setTimeout, clearTimeout,
    location: { hash: o.hash || '', search: o.search || '' },
    navigator: { maxTouchPoints: o.touch ? 5 : 0, getGamepads: () => [] },
    matchMedia: q => ({ matches: o.touch ? false : true, media: q }),
    localStorage: o.storage || { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() }
  };
  ctx.window = ctx; ctx.parent = ctx; ctx.self = ctx;
  if (o.extra) Object.assign(ctx, o.extra);
  vm.createContext(ctx);
  return ctx;
}
/** load the game: returns { ctx, game, bb, S }. o: { hash, touch, storage, seed, extra } */
export async function load(o = {}) {
  const ctx = makeCtx(o);
  const rnd = mulberry(o.seed === undefined ? 12345 : o.seed);
  vm.runInContext('Math.random = __rnd;', Object.assign(ctx, { __rnd: rnd }));
  for (const f of ['vendor/aihub-session.js', 'engine/my-3d2dge.js', 'build/game.js']) vm.runInContext(read(f), ctx, { filename: f });
  const bb = ctx.__bb, game = bb.game;
  if (game.booted && game.booted.then) await game.booted;
  await new Promise(r => setTimeout(r, 0));
  game.advance(1 / 60);
  return { ctx, game, bb, S: bb.S };
}
export function mulberry(a) { return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/** step the game n seconds in fixed steps, calling fn each step if given; stops early when stop() is true */
export function run(game, seconds, fn, stop) { const n = Math.round(seconds * 120); for (let i = 0; i < n; i++) { if (fn) fn(i); game.advance(1 / 120); if (stop && stop()) return i + 1; } return n; }
export function errors(game, ctx) { return game.errors.map(e => (e.where || '') + ': ' + e.message).concat((ctx ? ctx.__errs : []).filter(e => !/AudioContext/.test(e))); }
export function makeChecker(suite) {
  const st = { suite, passed: 0, failed: 0, fails: [] };
  st.check = (name, ok, detail = '') => { if (ok) st.passed++; else { st.failed++; st.fails.push(`FAIL ${suite}.${name}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`.slice(0, 600)); } return !!ok; };
  return st;
}
/** a quick match in a loaded game (no screens): newMatch with defaults */
export function quickMatch(h, o = {}, flow = {}) {
  const { bb, game } = h;
  bb.startMatchScene(Object.assign({ court: 'skybox', home: 'hightops', away: 'breakers', quarterLen: 30, seed: 7, tipoff: false }, o), Object.assign({ fade: 0, onEnd: () => {} }, flow));
  game.advance(1 / 120);
  return bb.S.match;
}
