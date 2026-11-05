import { simAt, run, clearEnemies } from './lib.mjs';
export default async t => {
  const { TC, step } = t.load(); step(1.2);
  const sim = new TC.Sim({ mode: 'stage', stages: [1], stage: 1, scene: '1-2', skipCuts: true, seed: 1 });
  const t0 = sim.timer; run(sim, 1); t.check('TIME does not count during the rail (WAIT)', sim.phase === 'travel' && sim.timer === t0);
  for (let k = 0; k < 120 * 20 && sim.phase === 'travel'; k++) sim.step(1 / 120, []);
  clearEnemies(sim); sim.waves.forEach(w => { w.fired = false; }); const a = sim.timer; run(sim, 1, { cover: true }); t.check('TIME counts in ACTION', Math.abs(a - sim.timer - 1) < .02, a - sim.timer);
  const e = TC.makeEnemy(sim, 'redtide', 'c3', { entry: 'stand' }); const b = sim.timer; TC.killEnemy(sim, e, { p: sim.players[0] }); t.check('an elite kill gives TIME EXTEND +2', Math.abs(sim.timer - b - 2) < 1e-6);
  const p = sim.players[0], l = p.lives; sim.timer = .01; p.iframes = 1; run(sim, .05, { cover: true }); t.check("TIDE'S IN: -1 life even with invulnerability", p.lives === l - 1);
  t.check('TIME refills to 60%', Math.abs(sim.timer - sim.timeMax * .6) < .2, sim.timer);
  sim.enemies = []; sim.waves.forEach(w => { w.fired = true; }); sim.timer = 12.4; const sc = p.score; run(sim, .6, {}); t.check('the clear bonus is remaining seconds x 100', p.score - sc === 1200 && sim.phase === 'clear', p.score - sc);
};
