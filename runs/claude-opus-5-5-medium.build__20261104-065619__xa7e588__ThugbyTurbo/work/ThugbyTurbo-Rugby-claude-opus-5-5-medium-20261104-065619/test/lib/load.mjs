// a vm context with the engine and the game, headless (no DOM): returns { game, TT, E, ctx }
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const engine = readFileSync(join(root, 'engine', 'my-3d2dge.js'), 'utf8');
export function load(o = {}) {
  const logs = [];
  const store = {};
  const ctx = {
    console: { log: (...a) => logs.push(a.join(' ')), warn: (...a) => logs.push('WARN ' + a.join(' ')), error: (...a) => logs.push('ERROR ' + a.join(' ')), info() {}, debug() {} },
    setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask, performance, Date, Math, JSON, Promise,
    location: { hash: o.hash || '', search: o.search || '', pathname: '/thugby.html', href: 'file:///thugby.html' + (o.hash || '') },
    navigator: { getGamepads: () => [], userAgent: 'node', maxTouchPoints: 0 },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    addEventListener() {}, removeEventListener() {},
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } }
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  if (o.aihub) ctx.AIHub = o.aihub;
  vm.createContext(ctx);
  vm.runInContext(engine, ctx, { filename: 'my-3d2dge.js' });
  const js = readFileSync(join(root, 'build', 'game.js'), 'utf8');
  vm.runInContext(js, ctx, { filename: 'game.js' });
  const { game, TT } = ctx.__thugby;
  return { game, TT, E: ctx.My3D2dge, ctx, logs, store };
}
