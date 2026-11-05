// Test helpers: load the engine and build/game.js into a fresh vm context (headless), with small stand-ins.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const DEV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = readFileSync(path.join(DEV, 'engine/my-3d2dge.js'), 'utf8'), GAME = readFileSync(path.join(DEV, 'build/game.js'), 'utf8');
export function load(o = {}) {
  const ctx = { console, Math, Date, setTimeout, clearTimeout, Promise };
  if (o.hash) ctx.location = { hash: o.hash, search: '' };
  if (o.AIHub) ctx.AIHub = o.AIHub;
  vm.createContext(ctx);
  vm.runInContext(ENGINE, ctx, { filename: 'engine.js' });
  if (o.skipRigs !== false) ctx.__skipRigs = true;
  vm.runInContext(GAME, ctx, { filename: 'game.js' });
  const E = ctx.My3D2dge, game = E.current, MT = ctx.MT;
  if (o.skipRigs !== false) MT.cfg.skipRigs = true;
  return { ctx, E, game, MT };
}
export class Checker {
  constructor(suite) { this.suite = suite; this.n = 0; this.fail = []; }
  ok(name, cond, detail = '') { this.n++; if (!cond) this.fail.push(`${this.suite} › ${name}${detail ? ': ' + detail : ''}`); }
  eq(name, a, b) { this.ok(name, a === b, `${JSON.stringify(a)} !== ${JSON.stringify(b)}`); }
  near(name, a, b, tol) { this.ok(name, Math.abs(a - b) <= tol, `${a} vs ${b} ±${tol}`); }
}
export const sleep = ms => new Promise(r => setTimeout(r, ms));
// An isolated arena for unit tests: room 1-1 warped, walk-in done, no waves running (phase 'test').
export function arena(o = {}) {
  const L = load(o); const { game, MT } = L; game.advance(.3);
  MT.warp(o.room || '1-1', { players: o.players || 1, mode: 'test', seed: o.seed || 3, diff: o.diff });
  game.advance(.1); const w = MT.worldNow; w.phase = 'test'; w.waveI = 99; w.wavesDone = true; w.cheats = MT.cheats; game.advance(1.4);
  for (const c of w.cs) { c.invuln = 0; c.state = 'alive'; c.x = c.body.x = 184; c.y = c.body.y = 120; }
  return Object.assign(L, { w, c: w.cs[0], adv: s => game.advance(s), snap: () => game.debug.snapshot() });
}
export const hold = (I, a, on = true) => I.hold(a, on);
export async function tick(n = 5) { for (let i = 0; i < n; i++) await sleep(5); }
