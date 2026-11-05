import { simAt, run, clearEnemies } from './lib.mjs';
export default async t => {
  const { TC, step } = t.load(); step(1.2);
  const sim = simAt(TC, 1, '1-1'); clearEnemies(sim); const p = sim.players[0];
  for (let k = 0; k < 12; k++) { sim.step(1 / 120, [{ fireP: true, fireDown: true, aim: [0, .3] }]); run(sim, .2, { aim: [0, .3] }); }
  t.check('the handgun holds 9 rounds', p.mag === 0, p.mag);
  t.check('empty magazine: no more shots', p.stats.shots === 9, p.stats.shots);
  sim.giveAmmo(p, 'mg', 60); t.check('ammo pickup adds to the pool', p.ammo.mg === 60 && p.owned.mg);
  sim.selectWeapon(p, 'mg'); run(sim, .3); const s0 = p.stats.shots; run(sim, 1, { fireDown: true, aim: [0, .3] });
  t.check('the MG fires about 12 a second', p.stats.shots - s0 >= 10 && p.stats.shots - s0 <= 13, p.stats.shots - s0);
  p.ammo.mg = 2; run(sim, .5, { fireDown: true, aim: [0, .3] }); t.check('an empty special switches back to the handgun', p.w === 'hg', p.w);
  sim.giveAmmo(p, 'gl', 2); sim.selectWeapon(p, 'gl'); run(sim, .5); p.mag = 9;
  const e = TC.makeEnemy(sim, 'deckhand', null, { at: TC.F(0, 0, 0, 0).p(150, 0, 0), entry: 'stand' }); e.state = 'peek'; e.up = 1; TC.updateVols(sim, e);
  const cs = sim.camSetupFor(0), v = TC.projectVU(cs, [e.x, e.y, e.z + 14]);
  sim.step(1 / 120, [{ fireP: true, fireDown: true, aim: [v[0], v[1]] }]); run(sim, 1.4, { aim: [v[0], v[1]] });
  t.check('a GL round explodes and kills a deckhand', e.dead, e.hp);
  t.check('weapons carry over between scenes', (() => { sim.giveAmmo(p, 'sg', 8); sim.jump(1, '1-2'); return p.ammo.sg === 8; })());
};
