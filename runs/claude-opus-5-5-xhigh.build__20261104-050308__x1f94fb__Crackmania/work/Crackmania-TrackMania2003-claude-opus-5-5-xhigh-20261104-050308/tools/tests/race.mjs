// covers: src/race/run.js, src/race/medals.js, src/save/profile.js
import { E } from '../node-env.mjs';
import { compile } from '../../src/track/track.js';
import { Course } from '../../src/race/course.js';
import { Run, fmt } from '../../src/race/run.js';
import { thresholds, medalFor } from '../../src/race/medals.js';
import { add, mul, sub } from '../../src/lib/v3.js';
import { placeCar } from '../../src/car/sim.js';
const course = p => new Course(compile({ id: 'R', env: 'dustbowl', start: [2, 10], program: p }), E.RAPIER);
/** drive straight through by teleporting the car along x (gates are crossed by its segment) */
function push(run, dx, n = 1) { for (let i = 0; i < n; i++) { run.car.p = add(run.car.p, [dx, 0, 0]); run.car.v = [dx * 120, 0, 0]; run.step({ gas: 0 }); } }
export default async T => {
  // two checkpoints in a row, then the finish
  const c = course('ST S CP S CP S FN'), run = new Run(c, 'coyote', { countdown: 0 });
  run.step({}); T.check('racing after GO', run.racing);
  const gate = k => c.gates.filter(g => g.kind === 'cp')[k], fin = c.gates.find(g => g.kind === 'finish');
  // the finish before the checkpoints: refused, MISSING CHECKPOINT once
  const cross = (g, back = false) => { run.car.p = add(g.p, [back ? 1.2 : -1.2, 0, .55]); run.car.v = [back ? -240 : 240, 0, 0]; run.car.f = [back ? -1 : 1, 0, 0]; run.car.grounded = true; run.step({}); run.car.v = [0, 0, 0]; };
  run.ev.length = 0; cross(fin);
  T.check('finish refused without the checkpoints', !run.finished); T.check('MISSING CHECKPOINT said', run.ev.some(e => e.type === 'missingCp'));
  // checkpoints count once each, in any order, either way
  cross(gate(1), true); T.eq('cp counted backwards, out of order', run.cps.size, 1);
  cross(gate(1)); T.eq('a cp counts once', run.cps.size, 1);
  cross(gate(0)); T.eq('both cps', run.cps.size, 2);
  T.eq('splits recorded', run.splits.length, 2);
  // the clock runs through a respawn, which puts the car at the last checkpoint, standing
  const st = run.steps; run.respawn(); T.check('respawn at the last cp', Math.abs(run.car.p[0] - gate(0).p[0]) < 3, run.car.p[0] + ' vs ' + gate(0).p[0]); T.eq('respawn stands still', run.car.v, [0, 0, 0]); run.step({}); T.check('clock runs through respawn', run.steps === st + 1); T.eq('respawns counted', run.respawns, 1);
  cross(fin); T.check('finish with every cp', run.finished); T.eq('finish steps', run.finishSteps, run.steps);
  // a fresh run against the best: deltas
  const r2 = new Run(c, 'coyote', { countdown: 0, best: { steps: run.finishSteps, splits: run.splits } }); r2.step({}); r2.ev.length = 0; r2.car.p = add(gate(0).p, [-1.2, 0, .55]); r2.car.v = [240, 0, 0]; r2.car.grounded = true; r2.step({});
  const ev = r2.ev.find(e => e.type === 'cp'); T.check('cp delta against the best', ev && ev.delta !== null && ev.delta < 0, JSON.stringify(ev && ev.delta));
  // medal thresholds: 1.06 to 0.1 s, 1.2 and 1.5 to whole seconds
  const t = thresholds(2400); T.eq('gold', t.gold, Math.round(Math.ceil(2400 / 120 * 1.06 * 10 - 1e-9) / 10 * 120)); T.eq('silver', t.silver, 24 * 120); T.eq('bronze', t.bronze, 30 * 120);
  T.eq('medal for the author time', medalFor(2400, t), 4); T.eq('medal for gold', medalFor(t.gold, t), 3); T.eq('no medal', medalFor(t.bronze + 1, t), 0);
  T.eq('fmt', fmt(2826), '0:23.55'); T.eq('fmt delta', fmt(-50, true), '-0.41'); T.eq('fmt minutes', fmt(7500), '1:02.50');
  // rewards paid once per tier through the profile
  const { game } = await T.game(); const { ctx } = await import('../../src/ctx.js'); const P = ctx.profile; P.reset(); const c0 = P.coppers;
  const a = P.finish('D1', 'race', 3000, 1, null, [], 'dustbowl'); T.eq('bronze pays', a.coppers, 60);
  const b = P.finish('D1', 'race', 2900, 3, null, [], 'dustbowl'); T.eq('gold pays silver and gold', b.coppers, 90 + 150);
  const d = P.finish('D1', 'race', 2800, 3, null, [], 'dustbowl'); T.eq('gold again pays nothing', d.coppers, 0); T.check('record kept', P.record('D1').bestSteps === 2800);
  const h = P.finish('R1', 'race', 2900, 1, null, [], 'hedgerow'); T.eq('hedgerow pays x1.25', h.coppers, 75);
  P.reset();
};
