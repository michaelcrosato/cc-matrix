import { simAt, run, clearEnemies } from './lib.mjs';
export default async t => {
  const { TC, step } = t.load(); step(1.2);
  const sim = simAt(TC, 1, '1-1'); clearEnemies(sim); const p = sim.players[0], at = [200, 0, 24];
  const a = TC.requestThreat(sim, { src: 'x', target: 0, dur: 1, kind: 'shot', at });
  const b = TC.requestThreat(sim, { src: 'y', target: 0, dur: 1, kind: 'shot', at });
  t.check('Stage 1 allows one threat at a time', a && !b);
  const c = TC.requestThreat(sim, { src: 'z', target: 0, dur: 1.1, kind: 'elite', at, always: true });
  t.check('always-threats wait their turn: impacts at least minGap apart', c && c.dur >= 1 + TC.tune().enemy.minGap - 1e-9, c && c.dur);
  const lives = p.lives; run(sim, 1.05); t.check('an exposed player is hit', p.lives === lives - 1 && a.result === true);
  run(sim, .2, { cover: true }); run(sim, .5, { cover: true }); t.check('a player in cover blocks it', c.result === false && p.lives === lives - 1 && p.stats.saves === 1);
  // pop-out protection: leaving cover with under 0.15 s left slides the impact
  run(sim, 2, { cover: true }); p.iframes = 0;
  const d = TC.requestThreat(sim, { src: 'w', target: 0, dur: .6, kind: 'shot', at, always: true });
  run(sim, .5, { cover: true }); run(sim, .1, {}); t.check('pop-out protection slides the impact', d.left > .08 && !d.done, d.left);
  // killing the shooter cancels its threat
  run(sim, 2, { cover: true }); p.iframes = 0;
  const e = TC.makeEnemy(sim, 'redtide', null, { at: [200, 0, 0], entry: 'stand' }); e.state = 'peek'; e.t = 0; run(sim, .4, {});
  const th = sim.threats.find(x => x.src === e.id && !x.done); TC.killEnemy(sim, e, { p });
  t.check('killing the shooter cancels the crisis', th && th.done && th.result === false);
  // the torpedo is not blocked by cover
  run(sim, 2, { cover: true }); p.iframes = 0; const l2 = p.lives;
  const tor = TC.fireRocket(sim, { id: 'boss', target: 0 }, [300, 0, 0], 'torpedo', { speed: 400 }); run(sim, 1.2, { cover: true });
  t.check('a torpedo hits through cover', p.lives === l2 - 1, p.lives + ' vs ' + l2);
  // god mode: no damage
  sim.cheats.god = true; p.iframes = 0; const l3 = p.lives; TC.requestThreat(sim, { src: 'q', target: 0, dur: .2, kind: 'shot', at, always: true }); run(sim, .5); t.check('god mode takes no damage', p.lives === l3);
};
