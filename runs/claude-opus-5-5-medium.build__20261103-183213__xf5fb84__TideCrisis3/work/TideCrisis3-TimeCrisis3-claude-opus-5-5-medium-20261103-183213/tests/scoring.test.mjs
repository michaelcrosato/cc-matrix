import { simAt, run, clearEnemies } from './lib.mjs';
export default async t => {
  const { TC, step } = t.load(); step(1.2);
  const sim = simAt(TC, 1, '1-1'); clearEnemies(sim); const p = sim.players[0];
  p.chain = 0; t.check('chain x1.0 under 5', sim.addScore(p, 1000) === 1000);
  p.chain = 12; t.check('chain 12 gives x1.2', sim.addScore(p, 1000) === 1200);
  p.chain = 200; t.check('the multiplier caps at x2.0', sim.addScore(p, 1000) === 2000);
  p.score = 149000; const l = p.lives; sim.addScore(p, 2000, null, 'bonus'); t.check('an extra life at 150,000', p.lives === l + 1);
  // a miss resets the chain
  p.chain = 7; p.cool = 0; sim.step(1 / 120, [{ fireP: true, fireDown: true, aim: [0, .9] }]); t.check('a miss resets the chain', p.chain === 0);
  // ranks
  const R = (acc, lost, cont) => { p.stats.shots = 100; p.stats.hits = acc; p.stageStats = { shots: 0, hits: 0, livesLost: 0, kills: 0, heads: 0, saves: 0 }; p.stats.livesLost = lost; p.stageCont = cont; return new TC.Results(sim, p).rank; };
  t.check('rank S: 75% and no lives lost', R(80, 0, false) === 'S'); t.check('rank A', R(65, 1, false) === 'A'); t.check('rank B', R(50, 3, false) === 'B'); t.check('rank C', R(20, 3, false) === 'C'); t.check('rank D after a continue', R(90, 0, true) === 'D');
};
