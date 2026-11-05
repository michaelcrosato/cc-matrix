// loads the engine and the game into a vm context with the stand-ins a page gives: window, location, matchMedia, navigator
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const DEV = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const cache = {};
const src = f => cache[f] || (cache[f] = readFileSync(join(DEV, f), 'utf8'));
export function load(o = {}) {
  const store = {};
  const ctx = { console: o.console || { log() {}, info() {}, warn() {}, error: (...a) => (o.errors || []).push(a.join(' ')) },
    addEventListener() {}, removeEventListener() {}, location: { hash: o.hash || '', search: o.search || '', pathname: '/game' },
    matchMedia: q => ({ matches: !!(o.touch && /coarse/.test(q)), addEventListener() {} }), navigator: { maxTouchPoints: 0, getGamepads: () => [] },
    performance: { now: () => Date.now() }, setTimeout, clearTimeout, localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } } };
  ctx.window = ctx; vm.createContext(ctx);
  if (o.seed != null) vm.runInContext(`Math.random = (() => { let s = ${o.seed >>> 0} || 1; return () => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return s / 4294967296; }; })();`, ctx);
  if (o.hub) o.hub(ctx);
  for (const f of ['vendor/session.js', 'engine/my-3d2dge.js', 'build/game.js']) vm.runInContext(src(f), ctx, { filename: f });
  const E = ctx.My3D2dge, game = E.current;
  return { ctx, E, game, EF: ctx.__EF, I: game.input, snap: () => game.debug.snapshot() };
}
