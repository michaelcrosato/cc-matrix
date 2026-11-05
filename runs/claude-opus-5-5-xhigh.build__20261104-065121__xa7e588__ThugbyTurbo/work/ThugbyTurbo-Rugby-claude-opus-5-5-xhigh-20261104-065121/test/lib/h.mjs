// Test helpers: a fresh game, a bare match, stepping, assertions.
import { load } from './load.mjs';
export { load };
export const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
export const eq = (a, b, msg) => { if (a !== b) throw new Error(`${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
/** a fresh game (title scene), its errors collected */
export function fresh(o = {}) {
  const errs = [];
  const L = load(Object.assign({ onError: a => errs.push(a.map(String).join(' ')) }, o));
  L.errs = errs;
  L.snap = () => L.game.debug.snapshot();
  L.advance = s => L.game.advance(s);
  L.noErrors = (what = '') => { const e = L.game.errors.map(x => (x.where || '') + ' ' + x.message); assert(!e.length, 'errors' + (what ? ' ' + what : '') + ': ' + e.slice(0, 3).join(' | ')); };
  L.TT.noStore = false;
  return L;
}
/** a bare simulation (no scene) with an event counter */
export function match(TT, o = {}) {
  const m = new TT.Match(Object.assign({ home: 'mud', away: 'bad', venue: 'muddington', seed: 7, skipIntro: true, halfLen: 60 }, o));
  const ev = {}, list = [];
  const off = TT.bus.on('*', (d, n) => { if (d.m === m) { ev[n] = (ev[n] || 0) + 1; list.push([n, d]); } });
  m.ev = ev; m.evList = list; m.off = off;
  m.run = (s, until) => { const n = Math.round(s * 120); for (let i = 0; i < n; i++) { m.step(1 / 120); if (until && until(m)) return true; } return false; };
  return m;
}
/** put the match into open play with player id holding the ball at (x, y) */
export function playWith(m, id, x, y) {
  m.setp = null; m.pending = null; m.phase = 'play'; m.phaseT = 0;
  for (const p of m.players) { if (p.st !== 'bin' && p.st !== 'off') { p.st = 'free'; p.stT = 0; p.pin = false; } p.charge = -1; }
  const p = m.players[id]; p.x = x; p.y = y; p.vx = p.vy = 0; m.give(p, 'test');
  return p;
}
/** move everyone but the given ids far away (so a test sees just its players) */
export function clear(m, keep) {
  for (const p of m.players) if (!keep.includes(p.id)) { p.x = p.team ? G.DX1 + 20 : G.DX0 - 20; p.y = G.Y0 - 30 + p.slot * 3; p.vx = p.vy = 0; }
  m.parked = new Set(m.players.filter(p => !keep.includes(p.id)).map(p => p.id));
}
export const G = { X0: 176, X1: 1200, CX: 688, Y0: 96, Y1: 672, CY: 384, DX0: 80, DX1: 1296 };
