// Mechanics probe: the Great Locks. Starts the boss (the arena's step), turns GL1 from its wall, and checks the party can't
// act during the two seconds, the lock's two bolts, the flags. Prints one line: "locks ok" on success.
import { loadSim } from './lib.mjs';
const B = loadSim(); const sim = B.sim; sim.newGame({ seed: 3 }); sim.cheat('god', true);
sim.warp('f4', 6, 4, 2); const r1 = sim.cmd({ c: 'move', d: 'f' }); // steps onto (6,5): the boss intro
for (let i = 0; i < 240; i++) sim.update(1 / 120);
const started = !!(sim.S.boss && sim.S.boss.started);
sim.warp('f4', 3, 3, 3); // beside GL1, facing its wall
const r2 = sim.cmd({ c: 'use' }); // turns it
const busy = sim.cmd({ c: 'move', d: 'f' });
for (let i = 0; i < 60; i++) sim.update(1 / 120);
const early = sim.S.boss.locks.GL1.turned, bolts0 = sim.S.boss.bolts;
for (let i = 0; i < 120 * 2.5; i++) sim.update(1 / 120);
const ok = started && r2.ok && busy.ok === false && !early && sim.S.boss.locks.GL1.turned && sim.S.boss.bolts === 2;
console.log(ok ? 'locks ok' : 'locks FAIL', JSON.stringify({ started, turn: r2, busy, earlyTurned: early, bolts0, turned: sim.S.boss.locks.GL1.turned, bolts: sim.S.boss.bolts, step: r1 }));
