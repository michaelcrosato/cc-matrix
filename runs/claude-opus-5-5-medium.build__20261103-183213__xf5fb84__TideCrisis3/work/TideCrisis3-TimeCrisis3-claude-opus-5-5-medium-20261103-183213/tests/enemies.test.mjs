import { simAt, run, clearEnemies, aimAt } from './lib.mjs';
export default async t => {
  const { TC, step } = t.load(); step(1.2);
  const sim = simAt(TC, 1, '1-1'); clearEnemies(sim); sim.cheats.god = true; const p = sim.players[0], F = TC.F(0, 0, 0, 0);
  // every archetype spawns, behaves and dies headless
  for (const id of Object.keys(TC.REG.enemy)) {
    const o = { at: F.p(160, 10, 0), entry: 'stand' };
    if (id === 'jetski') o.path = [F.p(300, -100, 0), F.p(200, 0, 0), F.p(100, 200, 0)];
    if (id === 'quartermaster') o.route = [F.p(200, -80, 0), F.p(200, 80, 0)];
    if (id === 'shield') o.route = [F.p(240, 0, 0), F.p(180, 0, 0)];
    if (id === 'rusher') o.from = F.p(260, 0, 0);
    const e = TC.makeEnemy(sim, id, null, o); run(sim, 1.5);
    t.check(id + ' runs its state machine', !!e.state && !Number.isNaN(e.x), e.state);
    TC.killEnemy(sim, e, { p }); run(sim, .1); t.check(id + ' dies', e.dead);
    clearEnemies(sim);
  }
  // hit volumes: a shot at the head is a headshot, at the chest is a hit
  const e = TC.makeEnemy(sim, 'marine', null, { at: F.p(160, 0, 0), entry: 'stand' }); e.state = 'aim'; e.up = 1; e.t = 9; e.decided = true; e.exposeLeft = 9; TC.updateVols(sim, e);
  const head = e.vols.find(v => v.part === 'head'); sim.step(1 / 120, [{ fireP: true, fireDown: true, aim: aimAt(TC, sim, head.c) }]);
  t.check('a shot at the head is a HEADSHOT and kills a 2-HP marine', e.dead && p.stats.heads === 1, e.hp);
  // the quartermaster's ammo goes to the killer
  clearEnemies(sim); run(sim, .3); const q = TC.makeEnemy(sim, 'quartermaster', null, { route: [F.p(200, -80, 0), F.p(200, 80, 0)], drop: 'mg' }); run(sim, .3); p.cool = 0;
  const body = q.vols.find(v => v.part === 'body'); sim.step(1 / 120, [{ fireP: true, fireDown: true, aim: aimAt(TC, sim, TC.math.vlerp(body.a, body.b, .5)) }]);
  t.check('the quartermaster drops MG ammo on the kill', q.dead && p.ammo.mg >= 60, p.ammo.mg);
  // shields: immune from the front, knocked aside by the shotgun
  clearEnemies(sim); run(sim, .3); const s = TC.makeEnemy(sim, 'shield', null, { route: [F.p(150, 0, 0)] }); s.state = 'hide'; run(sim, .1); p.cool = 0; p.w = 'hg'; p.mag = 9;
  const hp0 = s.hp; sim.step(1 / 120, [{ fireP: true, fireDown: true, aim: aimAt(TC, sim, [s.x, s.y, s.z + 14]) }]);
  t.check('a handgun shot at the shield does nothing', s.hp === hp0);
  TC.shieldHit(sim, s, { w: 'sg', p }); t.check('the shotgun knocks the shield aside', s.shieldDown > 0);
  // the rusher's slash is blocked by cover
  clearEnemies(sim); sim.cheats.god = false; p.iframes = 0; const lives = p.lives; const r = TC.makeEnemy(sim, 'rusher', null, { from: F.p(120, 0, 0), ground: 0 }); run(sim, 3, { cover: true });
  t.check('a rusher slash against cover costs nothing', p.lives === lives && r.state !== 'sprint' || p.lives === lives, r.state);
  t.check('civilians: hitting one costs a life and 5,000', (() => { const c = TC.spawnCivilian(sim, { at: F.p(100, 0, 0) }); run(sim, .02); p.iframes = 0; const l = p.lives, sc = p.score = 9000; TC.hitCivilian(sim, c, p, [0, 0, 0]); return p.lives === l - 1 && p.score === 4000; })());
};
