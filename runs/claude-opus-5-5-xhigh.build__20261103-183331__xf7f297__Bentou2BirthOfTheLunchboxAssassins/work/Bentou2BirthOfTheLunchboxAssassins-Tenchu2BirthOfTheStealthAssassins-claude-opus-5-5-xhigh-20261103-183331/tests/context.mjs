// a fresh headless page for the tests and tools/evidence.mjs: the engine and the game in a node:vm context with small stubs
// for the browser's globals and Math.random seeded. o.scripts ([[name, code], ...]) runs those instead (the bundle's own)
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const DEV = join(dirname(fileURLToPath(import.meta.url)), '..');
const code = () => [['my-3d2dge.js', readFileSync(join(DEV, 'engine', 'my-3d2dge.js'), 'utf8')], ['game.js', readFileSync(join(DEV, 'build', 'game.js'), 'utf8')]];

/** a fresh headless page: the engine and the game in a vm context with small stubs for the browser's globals */
export function makeContext(o = {}) {
  const mem = {};
  const storage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; }, clear: () => { for (const k in mem) delete mem[k]; }, key: i => Object.keys(mem)[i] ?? null, get length() { return Object.keys(mem).length; } };
  const logs = [];
  const ctx = { console: { log: (...a) => logs.push(a.join(' ')), warn: (...a) => logs.push('warn ' + a.join(' ')), error: (...a) => logs.push('error ' + a.join(' ')), info() {}, debug() {} },
    setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask, Promise,
    location: { hash: o.hash || '', search: o.search || '', href: 'file:///game.html' + (o.hash || ''), pathname: '/game.html' },
    localStorage: storage, sessionStorage: storage,
    matchMedia: q => ({ matches: !!(o.media && o.media[q]), addEventListener() {}, removeEventListener() {} }),
    navigator: { maxTouchPoints: o.touch ? 5 : 0, getGamepads: () => [], userAgent: 'node' },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {} };
  ctx.window = ctx; ctx.globalThis = ctx;
  if (o.hub) ctx.AIHub = o.hub;
  vm.createContext(ctx);
  vm.runInContext('(() => { let s = 7 >>> 0; Math.random = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();', ctx);
  if (o.before) o.before(ctx);
  for (const [filename, src] of o.scripts || code()) vm.runInContext(src, ctx, { filename });
  const E = ctx.My3D2dge, game = E.current, B = ctx.__BENTOU;
  return { ctx, E, game, B, I: game.input, logs };
}
