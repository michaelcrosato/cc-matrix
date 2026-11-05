// A vm context that loads the game's scripts in index.html's order, headless (no DOM): the engine runs on fixed steps.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const ROOT = new URL('../../', import.meta.url);
export function scripts() {
  const html = readFileSync(new URL('index.html', ROOT), 'utf8');
  return [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]).filter(s => !s.includes('session.js'));
}
export function load(opts = {}) {
  const warnings = [], errors = [];
  const con = { log: console.log, info() {}, debug() {}, error: (...a) => errors.push(a.join(' ')), warn: (...a) => warnings.push(a.join(' ')) };
  const listeners = {};
  const ctx = { console: con, setTimeout, clearTimeout, performance: { now: () => 0 }, location: { hash: opts.hash || '', search: '' },
    navigator: { getGamepads: () => [], maxTouchPoints: opts.touch ? 5 : 0, userAgent: 'node' },
    matchMedia: q => ({ matches: opts.touch ? /coarse/.test(q) && !/any-pointer: fine/.test(q) : /fine/.test(q), addEventListener() {} }),
    addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); }, removeEventListener() {} };
  ctx.window = ctx; ctx.globalThis = ctx;
  if (opts.hub) ctx.AIHub = opts.hub;
  vm.createContext(ctx);
  for (const f of scripts()) vm.runInContext(readFileSync(new URL(f, ROOT), 'utf8'), ctx, { filename: f });
  const FF = ctx.FF, game = FF.game, E = ctx.My3D2dge;
  return { ctx, FF, game, E, warnings, errors, listeners, step: s => game.advance(s), I: game.input };
}
