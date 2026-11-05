// helpers for the sim suites: a fresh state on a floor at a cell, commands, seconds of sim
import { boot } from '../harness.mjs';
export async function kit() {
  const env = await boot(), B = env.B;
  const run = (s = .5, cmds = []) => { B.update(1 / 120, cmds); B.drain(); for (let i = 1; i < s * 120; i++) { B.update(1 / 120, []); B.drain(); } };
  const cmd = (c, s = .5) => run(s, [c]);
  const fresh = (floor = 'f1', at, o = {}) => {
    B.newState(o.seed || 3, o.party || B.PREMADE, { floor: floor === 'race' ? 'race' : 'f1', mode: floor === 'race' ? 'race' : 'campaign' }); B.drain();
    if (floor !== 'f1' && floor !== 'race') { B.changeFloor(floor, at || B.FLOORS[floor].start, 'warp'); B.drain(); }
    else if (at) { B.S.party.cx = at[0]; B.S.party.cy = at[1]; B.S.party.dir = at[2] || 0; B.look(); }
    if (o.noMons) for (const f of Object.values(B.S.floors)) f.mons = [];
    return B.S;
  };
  const at = (x, y, d = 0) => { const P = B.S.party; P.cx = x; P.cy = y; P.dir = d; P.tween = null; B.look(); };
  return Object.assign(env, { run, cmd, fresh, at });
}
