import { load } from './lib.mjs'; const { game, G } = load(); const { Drills, Match, Puck, Rink, Bus, Flow } = G; game.advance(.2);
Drills.start(3); game.advance(.6); const m = Match.cur(), me = m.humans[0].sk;
me.x = Rink.CX + 250; me.y = Rink.CY; m.puck.owner = null; m.puck.x = me.x + 10; m.puck.y = me.y; Puck.take(m, me); Puck.shoot(m, me, 'slap', .8, { far: -1 });
for (let i = 0; i < 80; i++) { game.advance(1 / 120 * 2); if (m.puck.inNet >= 0 || m.goalPending) { console.log('t', m.t.toFixed(2), 'phase', m.phase, 'inNet', m.puck.inNet, 'pending', !!m.goalPending, 'out', m.puck.out, 'frozen', m.puck.frozen, 'z', m.puck.z.toFixed(1), m.puck.x | 0, m.puck.y | 0); } }
