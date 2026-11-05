import { simAt, run, clearEnemies } from './lib.mjs';
export default async t => {
  const { TC, step } = t.load(); step(1.2);
  const sim = simAt(TC, 1, '1-1'); clearEnemies(sim); const p = sim.players[0];
  t.check('the scene starts in ACTION after the rail', sim.phase === 'action', sim.phase);
  run(sim, .06, { cover: true }); t.check('cover blend half-way after 0.06 s (in .12 s)', p.c > .35 && p.c < .65, p.c);
  run(sim, .1, { cover: true }); t.check('in cover after 0.16 s', p.c === 1 && !sim.exposed(p));
  p.mag = 3; run(sim, .35, { cover: true }); t.check('the handgun reloads in cover in 0.30 s', p.mag === 9, p.mag);
  const shots = p.stats.shots; p.ammo.mg = 50; p.owned.mg = true; sim.step(1 / 120, [{ cover: true, fireP: true, fireDown: true }]);
  t.check('fire in cover switches weapons, does not shoot', p.stats.shots === shots && p.w === 'mg', p.w);
  run(sim, .2, { cover: false }); t.check('out of cover after 0.15 s', p.c === 0 && sim.exposed(p));
  sim.step(1 / 120, [{ cover: true }]); sim.step(1 / 120, [{ cover: true }]); sim.step(1 / 120, [{ cover: true }]); sim.step(1 / 120, [{ cover: true }]);
  const before = p.stats.shots; for (let k = 0; k < 20; k++) sim.step(1 / 120, [{ cover: true, fireDown: true, fireP: false }]);
  t.check('no firing while the blend is past 0.2', p.stats.shots === before);
};
