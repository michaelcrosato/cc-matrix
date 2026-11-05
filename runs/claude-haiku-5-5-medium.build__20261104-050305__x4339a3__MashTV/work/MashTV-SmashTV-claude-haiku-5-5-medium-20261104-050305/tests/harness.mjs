// The test harness: fresh game per suite, checks that report failures as `suite > check: detail`, and a shared bot setup.
import { load } from './load.mjs';
export const results = { pass: 0, fail: 0, failures: [] };
let current = '';
export function suite(name) { current = name; }
export function check(name, fn) {
  try { const r = fn(); if (r === false) throw new Error('returned false'); results.pass++; }
  catch (e) { results.fail++; results.failures.push(`${current} > ${name}: ${(e && e.message) || e}`); }
}
export function eq(a, b, msg = '') { if (a !== b) throw new Error(`${msg} expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`); }
export function ok(v, msg = '') { if (!v) throw new Error(msg || 'expected truthy'); }
export function near(a, b, tol, msg = '') { if (Math.abs(a - b) > tol) throw new Error(`${msg} expected ${b} ±${tol} got ${a}`); }
export function fresh() { const L = load(); return L; }
// starts a room with a bot P1 (optionally god mode / a difficulty) and waits until its World exists
export function roomWithBot(L, room, o = {}) {
  const { game, MT } = L;
  MT.seedAll(o.seed || 7);
  MT.PLAY.W = null; MT.run = null;   // a fresh room: never a World left over from an earlier check
  game.debug.quickRoom(room, o.seed || 7);
  for (let i = 0; i < 300 && !MT.PLAY.W; i++) game.advance(.1);
  const c = MT.PLAY.W.players[0];
  if (o.bot !== false) c.bot = true;
  MT.run.cheats = Object.assign({}, o.cheats || {}, o.god ? { god: true } : {});
  return { W: MT.PLAY.W, c };
}
export function runFor(L, seconds, fn) { for (let t = 0; t < seconds; t++) { L.game.advance(1); if (fn && fn(t)) break; } }
