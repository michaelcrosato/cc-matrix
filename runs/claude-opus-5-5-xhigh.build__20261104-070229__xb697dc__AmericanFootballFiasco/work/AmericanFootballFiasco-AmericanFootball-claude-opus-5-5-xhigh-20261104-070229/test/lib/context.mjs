// A vm context with the page's stand-ins (window, addEventListener, location, matchMedia, navigator, performance), the
// scripts loaded in index.html's order; returns { ctx, game, FF, E, I, step(s), tap(a), hold(a, on), warnings }.
import vm from 'node:vm';
import { readFileSync, existsSync } from 'node:fs';
const root = new URL('../../', import.meta.url);
export function load(o = {}) {
  const warnings = [], errors = [];
  const listeners = {};
  const ctx = {
    console: { log: (...a) => o.verbose && console.log(...a), info() {}, warn: (...a) => warnings.push(a.join(' ')), error: (...a) => errors.push(a.join(' ')) },
    addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); }, removeEventListener() {},
    location: { hash: o.hash || '', search: o.search || '', pathname: '/fiasco' },
    matchMedia: q => ({ matches: !!(o.media && o.media[q]), addEventListener() {}, removeEventListener() {} }),
    navigator: { getGamepads: () => [], maxTouchPoints: o.touch ? 5 : 0, userAgent: 'node' },
    performance: { now: () => Date.now() }, setTimeout, clearTimeout, Date, Math, JSON,
    localStorage: (() => { const M = new Map(o.storage || []); return { getItem: k => M.has(k) ? M.get(k) : null, setItem: (k, v) => M.set(k, String(v)), removeItem: k => M.delete(k), key: i => [...M.keys()][i] || null, get length() { return M.size; }, clear: () => M.clear() }; })()
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.__listeners = listeners;
  if (o.hub) ctx.AIHub = o.hub;
  vm.createContext(ctx);
  const html = readFileSync(new URL('index.html', root), 'utf8');
  const srcs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]).filter(s => !s.endsWith('session.js'));
  for (const s of srcs) {
    if (o.only && !o.only(s)) continue;
    const f = new URL(s, root); if (!existsSync(f)) { if (o.strict) throw new Error('missing ' + s); continue; }
    vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: s });
  }
  const FF = ctx.FF, game = FF && FF.game, E = ctx.My3D2dge, I = game && game.input;
  const step = (s = 1 / 120) => game.advance(s);
  return { ctx, game, FF, E, I, step, tap: a => I.tap(a), hold: (a, on = true) => I.hold(a, on), warnings, errors, listeners };
}
