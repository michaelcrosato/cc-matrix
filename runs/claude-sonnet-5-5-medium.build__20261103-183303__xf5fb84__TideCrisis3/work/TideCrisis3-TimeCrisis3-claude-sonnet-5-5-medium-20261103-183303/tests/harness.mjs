// harness.mjs — loads the engine and build/game.js into a fresh vm context (headless), with the helpers the suites use.
import vm from 'node:vm'; import { readFileSync, existsSync } from 'node:fs'; import { fileURLToPath } from 'node:url'; import { dirname, join, resolve } from 'node:path';
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export async function load(extra = {}) {
  const ctx = Object.assign({ console, performance, setTimeout, clearTimeout, setInterval, clearInterval }, extra); vm.createContext(ctx); ctx.window = ctx;
  vm.runInContext(readFileSync(join(root, 'engine/my-3d2dge.js'), 'utf8'), ctx, { filename: 'engine' });
  vm.runInContext(readFileSync(join(root, 'build/game.js'), 'utf8'), ctx, { filename: 'game.js' });
  const E = ctx.My3D2dge, game = E.current; await new Promise(r => setTimeout(r, 60)); game.advance(.1);
  return { ctx, E, game, dbg: game.debug, I: game.input };
}
export class T {
  constructor(name) { this.name = name; this.fails = []; this.n = 0; }
  check(what, ok, detail = '') { this.n++; if (!ok) this.fails.push('FAIL ' + this.name + ' › ' + what + (detail ? ': ' + detail : '')); }
  near(what, a, b, tol = .01) { this.check(what, Math.abs(a - b) <= tol, a + ' vs ' + b); }
}
export const STEP = 1 / 120;
// a scripted Sim in a given scene, already in ACTION with players ready
export function mkSim(dbg, scene = '1-1', o = {}) { const stage = scene[0] === 'T' ? 0 : +scene[0]; const sim = new dbg.Sim(Object.assign({ scene, stage, players: [{}], seed: 7 }, o)); sim.beginAction(); sim.actionT = 0; if (o.quiet !== false) { sim.waves = [{ at: 1e9, spawn: [], started: false, done: false, spawned: [] }]; sim.cues = []; } return sim; }
export function run(sim, secs, cmds = [{}], dt = STEP) { const n = Math.round(secs / dt); for (let i = 0; i < n; i++) sim.step(dt, cmds); }
export function aimAtPoint(dbg, sim, pid, pt) { const a = dbg.R3.aimOf(sim.pose(pid), pt); return a ? [a[0], a[1]] : null; }
export function expose(sim, e) { e.p = 1; e.st = 'aim'; e.aimT = 99; e.expLeft = 99; e.exposedAt = sim.t; e.foot = e.bz; e.x = e.bx; e.y = e.by; e.t = 99; }
