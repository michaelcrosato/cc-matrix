import { run } from './lib.mjs';
export default async t => {
  const { TC, step, game } = t.load(); step(1.2);
  game.go('play', { mode: 'arcade', stages: [1, 2, 3], difficulty: 'normal', noBrief: true, skipCuts: true, seed: 2 }); step(.8);
  const s = TC.play.s, p2in = game.addPlayer ? game.addPlayer({ pad: 1 }) : null; s.addPlayer(p2in, 'rook');
  const sim = s.sim; t.check('P2 joins', sim.players.length === 2); t.check('two viewports', s.viewports({ W: 427, H: 240 }).length === 2);
  for (let k = 0; k < 120 * 20 && sim.phase !== 'action'; k++) sim.step(1 / 120, []);
  const c1 = sim.cameraFor(0), c2 = sim.cameraFor(1); t.check('independent cameras', Math.hypot(c1.x - c2.x, c1.y - c2.y) > 20);
  sim.step(1 / 120, [{ cover: true }, {}]); run(sim, .3, () => [{ cover: true }, {}]); t.check('independent cover', sim.players[0].c === 1 && sim.players[1].c === 0);
  const l2 = sim.players[1].lives; TC.requestThreat(sim, { src: 'x', target: 1, dur: .2, kind: 'shot', at: [200, 0, 24], always: true }); run(sim, .3, () => [{ cover: true }, {}]);
  t.check('separate hits', sim.players[1].lives === l2 - 1 && sim.players[0].lives === TC.DIFF.normal.lives);
  sim.players[1].lives = 1; sim.players[1].iframes = 0; sim.hurt(sim.players[1], {}); t.check('P2 out: CONTINUE? while P1 plays', sim.players[1].out && sim.phase === 'action');
  const q = TC.makeEnemy(sim, 'quartermaster', null, { route: [[200, -40, 0], [200, 40, 0]] }); TC.killEnemy(sim, q, { p: sim.players[0] });
  t.check('the pickup goes to the killer', sim.players[0].ammo.mg > 0 && sim.players[1].ammo.mg === 0);
  t.check('no errors', !game.errors.length, game.errors.map(e => e.message).join('|'));
};
