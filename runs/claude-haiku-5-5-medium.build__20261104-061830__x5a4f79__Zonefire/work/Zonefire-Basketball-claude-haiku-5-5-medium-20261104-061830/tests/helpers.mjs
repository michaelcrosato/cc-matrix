// Test helpers: load the built game into a fresh node:vm context with the stand-ins the page would give it (window,
// addEventListener, location, navigator, matchMedia) and a seeded Math.random, then hand back the game's handle.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

export const DEV = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = f => readFileSync(join(DEV, f), 'utf8');

/** a Math whose random() is seeded (the engine's rigs and particles draw from it: a test's runs repeat, as the proof needs) */
function seededMath(seed) { const M = Object.create(Math); let s = (seed * 2654435761) >>> 0 || 1; M.random = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; return M; }

/** a fresh game: opts.touch (touch-only device), opts.hash (a deep link), opts.hub (an AI Hub frame), opts.seed */
export function loadGame(opts = {}) {
  const listeners = {};
  const ctx = {
    console: { log() {}, info() {}, warn() {}, error() {}, debug() {} },
    addEventListener: (t, f) => { (listeners[t] || (listeners[t] = [])).push(f); },
    removeEventListener: () => {},
    location: { hash: opts.hash ? '#' + opts.hash : '', search: opts.hub ? '?aihub=1' : '', href: 'file:///basketblam.html' },
    navigator: { maxTouchPoints: opts.touch ? 5 : 0, getGamepads: () => [], userAgent: 'node-test' },
    matchMedia: q => ({ matches: opts.touch ? /hover: hover|any-pointer: fine/.test(q) ? false : /pointer: coarse|any-pointer: coarse|any-hover: none/.test(q) : false, addEventListener() {}, removeEventListener() {} }),
    setTimeout, clearTimeout, setInterval, clearInterval, performance, Date, JSON, Math: seededMath(opts.seed || 1),
    localStorage: undefined
  };
  if (opts.hub) { ctx.parent = { postMessage() {} }; }
  ctx.window = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  for (const f of ['vendor/aihub-session.js', 'engine/my-3d2dge.js', 'build/game.js']) vm.runInContext(read(f), ctx, { filename: f });
  if (opts.seed) ctx.__bb.S.seed = opts.seed;
  const base = ctx.__bb;
  // the test handle: the debug handle first, then every top-level name of the game (__bb.I)
  const bb = new Proxy(base, { get: (t, k) => (k in t ? t[k] : (t.I ? t.I[k] : undefined)) });
  return { ctx, bb, game: bb.game, S: bb.S, emit: bb.emit, on: bb.on, TUNING: bb.TUNING, listeners };
}

export const fail = (msg) => { throw new Error(msg); };
export const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
export const approx = (a, b, tol, msg) => { if (!(Math.abs(a - b) <= tol)) throw new Error(`${msg || 'approx'}: got ${a}, want ${b} ± ${tol}`); };
