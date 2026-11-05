// The headless harness: the engine and the game's files (in index.html's order) in a vm context with stand-ins for the
// page's globals; an optional fake AIHub. Helpers drive it by game.advance and input taps, never by wall-clock time.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
export const DEV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(path.join(DEV, f), 'utf8');
export const scriptList = () => [...read('index.html').matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]).filter(s => !s.includes('vendor/hub'));
const CACHE = {};
export function boot(o = {}) {
  const logs = [];
  const quiet = { log: (...a) => logs.push(a.join(' ')), info() {}, warn: (...a) => logs.push('WARN ' + a.join(' ')), error: (...a) => logs.push('ERR ' + a.join(' ')) };
  const ctx = { console: o.verbose ? console : quiet, addEventListener() {}, removeEventListener() {}, location: { hash: o.hash || '', search: '', pathname: '/oly' }, setTimeout, clearTimeout, performance: { now: () => 0 }, Date, JSON, Math: Object.create(Math) };
  ctx.window = ctx; ctx.globalThis = ctx;
  if (o.hub) ctx.AIHub = o.hub;
  if (o.mathCount) { const base = Math.random; ctx.Math.random = () => { ctx.__mathCalls = (ctx.__mathCalls || 0) + 1; return base(); }; }
  vm.createContext(ctx);
  if (o.before) o.before(ctx);
  for (const s of scriptList()) vm.runInContext(CACHE[s] || (CACHE[s] = s.endsWith('45-about.js') ? read(s).replace('/*ABOUT-JSON*/{}/*END-ABOUT-JSON*/', read('about.json')) : read(s)), ctx, { filename: s });
  const E = ctx.My3D2dge, O = ctx.OLY, game = O.game;
  const h = {
    ctx, E, O, game, logs,
    I: (n = 0) => game.players[n],
    advance: s => game.advance(s),
    tap: (a, n = 0) => game.players[n].tap(a),
    hold: (a, on = true, n = 0) => game.players[n].hold(a, on),
    snap: () => game.debug.snapshot(),
    until(cond, maxS = 30, step = 1 / 30) { for (let t = 0; t < maxS; t += step) { if (cond()) return true; game.advance(step); } return !!cond(); },
    errors: () => game.errors.map(e => (e.where || '') + ': ' + (e.message || e)),
  };
  return h;
}
