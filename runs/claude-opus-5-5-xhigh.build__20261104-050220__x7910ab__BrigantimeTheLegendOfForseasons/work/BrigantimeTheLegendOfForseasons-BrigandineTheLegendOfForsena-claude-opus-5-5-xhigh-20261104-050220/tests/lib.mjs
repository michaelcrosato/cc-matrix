// Test helpers shared by tests/run.mjs and the suites (t-*.mjs).
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
export const DEV = join(dirname(fileURLToPath(import.meta.url)), '..');
const scripts = ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js'].map(f => new vm.Script(readFileSync(join(DEV, f), 'utf8'), { filename: f }));
/** a fresh game: { E, G, game, I, snap, step(s), tap(a), hold(a, s) } */
export async function boot(hash = '#title', o = {}) {
  const store = {}, ctx = { console: { log() {}, info() {}, warn() {}, error() {} }, addEventListener() {}, removeEventListener() {}, location: { hash, search: '' } };
  ctx.window = ctx; ctx.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  if (o.ctx) Object.assign(ctx, o.ctx);
  vm.createContext(ctx);
  if (o.before) o.before(ctx);
  for (const s of scripts) s.runInContext(ctx);
  const E = ctx.My3D2dge, game = E.current, G = ctx.BRIG, I = game.input;
  await game.booted;
  const h = { E, G, game, I, ctx, store,
    snap: () => game.debug.snapshot(),
    step: (s = .1) => game.advance(s),
    tap: (a, n = 1) => { for (let i = 0; i < n; i++) { I.tap(a); game.advance(.06); } },
    hold: (a, s) => { I.hold(a, true); game.advance(s); I.hold(a, false); game.advance(.05); },
    errors: () => game.errors.map(e => e.message || String(e))
  };
  return h;
}
export const suites = {};
export const suite = (name, fn) => { suites[name] = fn; };
export const ok = (v, msg) => { if (!v) throw new Error(msg || 'not ok'); };
export const eq = (a, b, msg) => { if (a !== b) throw new Error((msg ? msg + ': ' : '') + JSON.stringify(a) + ' !== ' + JSON.stringify(b)); };
