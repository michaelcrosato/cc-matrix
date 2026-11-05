// Shared helpers for the Node suites: a fresh game (engine + sources in a vm context, booted headless), sim driving.
import { load } from './load.mjs';
export async function fresh(o = {}) {
  const env = load(Object.assign({ quiet: true }, o));
  const game = env.ctx.__game || env.ctx.My3D2dge.current; await game.booted;
  env.game = game; env.I = game.input; env.D = game.debug;
  return env;
}
/** step the sim directly (no scenes): cmds on the first step, then n seconds */
export function sim(B, secs, cmds = []) { const dt = 1 / 120; B.update(dt, cmds, dt); for (let t = dt; t < secs; t += dt) B.update(dt, [], dt); }
/** a new sim game at a cell */
export function at(B, f, x, y, dir = 0, o = {}) { B.newGame(Object.assign({ seed: 3 }, o)); if (f !== B.S.floor) B.goFloor(f, [x, y, dir]); else { const P = B.S.party; P.cx = x; P.cy = y; P.dir = dir; P.at = [x, y]; B._fovKey = null; B.look(); } B.S.events.length = 0; B.S.talk = null; B.S.transit = null; return B.S; }
export const near = (a, b, e = .001) => Math.abs(a - b) <= e;
