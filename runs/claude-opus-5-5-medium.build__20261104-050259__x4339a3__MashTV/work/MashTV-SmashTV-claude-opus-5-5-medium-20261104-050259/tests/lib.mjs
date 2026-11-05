// a fresh headless game in a vm context: the engine and build/game.js, driven by game.advance and game.debug
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const DEV = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = readFileSync(join(DEV, 'engine/my-3d2dge.js'), 'utf8'), GAME = () => readFileSync(join(DEV, 'build/game.js'), 'utf8');
export function boot(o = {}) {
  const ctx = { console: o.quiet === false ? console : { log() {}, warn() {}, error: (...a) => (ctx.__errs = ctx.__errs || []).push(a.join(' ')), info() {} }, setTimeout, clearTimeout, performance, Date };
  if (o.window) { ctx.window = ctx; Object.assign(ctx, o.window); }
  vm.createContext(ctx);
  vm.runInContext(ENGINE, ctx, { filename: 'engine.js' });
  if (o.before) o.before(ctx);
  vm.runInContext(GAME(), ctx, { filename: 'game.js' });
  const E = ctx.My3D2dge, game = E.current, MT = ctx.MT;
  MT.cfg.skipRigs = o.rigs ? false : true;
  game.advance(.05);
  return { ctx, E, game, MT, I: game.input, snap: () => game.debug.snapshot(), adv: s => game.advance(s) };
}
export function suite(name) {
  const res = { name, pass: 0, fail: 0, msgs: [] };
  res.check = (what, ok, detail = '') => { if (ok) res.pass++; else { res.fail++; res.msgs.push(`${name} › ${what}${detail ? ': ' + detail : ''}`); } return ok; };
  return res;
}
// run until fn() is true or the game-time limit passes; returns whether it happened
export function until(g, fn, limit = 60, step = .25) { for (let t = 0; t < limit; t += step) { if (fn()) return true; g.game.advance(step); } return !!fn(); }
export const errs = g => g.game.errors.map(e => e.where + ': ' + e.message + (e.stack ? ' @ ' + String(e.stack).split('\n')[1] : ''));
