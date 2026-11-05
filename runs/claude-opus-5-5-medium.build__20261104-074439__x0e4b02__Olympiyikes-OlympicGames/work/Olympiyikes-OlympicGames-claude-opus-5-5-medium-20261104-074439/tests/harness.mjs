// Headless harness: a vm context with browser stand-ins, the engine, then the game's files in index.html's order.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const ROOT = new URL('../', import.meta.url);
export function scriptList() {
  const html = readFileSync(new URL('index.html', ROOT), 'utf8');
  return [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]).filter(s => !s.includes('session.js'));
}
export function boot(o = {}) {
  const store = {};
  const ctx = { console: o.quiet === false ? console : { log() {}, warn() {}, error: console.error, info() {} }, setTimeout, clearTimeout, performance: { now: () => 0 },
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    navigator: { maxTouchPoints: o.touch ? 5 : 0, userAgent: 'node' }, location: { hash: o.hash || '', search: '', pathname: '/olympiyikes', href: 'file:///x' },
    matchMedia: q => ({ matches: o.touch ? /coarse/.test(q) : /fine/.test(q), addEventListener() {}, removeEventListener() {} }),
    addEventListener() {}, removeEventListener() {}, requestAnimationFrame: () => 0, Date };
  ctx.window = ctx; ctx.globalThis = ctx;
  if (o.hub) ctx.AIHub = o.hub;
  vm.createContext(ctx);
  const files = ['engine/my-3d2dge.js', ...scriptList().filter(s => s.startsWith('src/'))];
  for (const f of files) vm.runInContext(readFileSync(new URL(f, ROOT), 'utf8'), ctx, { filename: f });
  ctx.__store = store; ctx.__vm = code => vm.runInContext(code, ctx);
  return ctx;
}
