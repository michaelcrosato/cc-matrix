import { simAt, run, clearEnemies } from './lib.mjs';
export default async t => {
  const { TC, step } = t.load(); step(1.2);
  const sim = simAt(TC, 1, '1-1'); clearEnemies(sim); const p = sim.players[0], F = TC.F(0, 0, 0, 0);
  const b1 = TC.makeObject(sim, 'barrel', F.p(200, 0, 0)), b2 = TC.makeObject(sim, 'barrel', F.p(230, 0, 0)), e = TC.makeEnemy(sim, 'marine', null, { at: F.p(215, 20, 0), entry: 'stand' });
  TC.damageObject(sim, b1, 3, { p }); run(sim, .3); t.check('barrels chain-explode and hurt enemies', b1.dead && b2.dead && e.dead);
  const c = TC.makeObject(sim, 'crate', F.p(120, 0, 0)); t.check('a crate adds a collider', c.col && c.col.on); TC.damageObject(sim, c, 5, { p }); t.check('breaking it removes the collider', !c.col.on);
  const ring = TC.makeObject(sim, 'lifering', F.p(100, 50, 20)), l = p.lives; TC.damageObject(sim, ring, 1, { p }); t.check('the life ring gives 1UP', p.lives === l + 1);
  let got = null; const off = sim.events; const bottle = TC.makeObject(sim, 'intel', F.p(100, -50, 20), { intel: 'i1a' }); sim.events = []; TC.damageObject(sim, bottle, 1, { p }); got = sim.events.find(x => x.type === 'intel');
  t.check('an intel bottle reports its note', got && got.id === 'i1a');
  const ally = { id: 99, agent: 'rook', at: F.p(50, 0, 0), fireT: 0 }; sim.allies.push(ally); const hit = sim.raycast(sim.camSetupFor(0).pos, TC.math.vnorm(TC.math.vsub([ally.at[0], ally.at[1], 20], sim.camSetupFor(0).pos)));
  t.check('shots pass through allies', !hit || hit.kind !== 'ally');
};
