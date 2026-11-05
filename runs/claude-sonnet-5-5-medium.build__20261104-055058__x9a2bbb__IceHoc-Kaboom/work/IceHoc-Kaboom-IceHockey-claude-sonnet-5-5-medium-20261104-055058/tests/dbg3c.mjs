import { load } from './lib.mjs'; const { game, G } = load(); const { Drills, Match, Puck, Rink, Bus } = G; game.advance(.2);
Drills.start(3); game.advance(.6); const m = Match.cur(), me = m.humans[0].sk; let log = [];
Bus.on('goal', e => log.push('G'+e.shot)); Bus.on('post', e => log.push('P')); Bus.on('block', e => log.push('B')); Bus.on('puck_out', e => log.push('O'));
const cs = [[1, -1], [1, 1], [0, -1], [0, 1]];
for (let k = 0; k < 16 && !Drills.st.done; k++) { const [hi, sd] = cs[k % 4]; me.x = Rink.CX + 250; me.y = Rink.CY; if (!me.hasPuck) { m.puck.owner = null; m.puck.x = me.x + 10; m.puck.y = me.y; Puck.take(m, me); } log.push('|' + (hi ? 'S' : 'W') + sd + ':'); Puck.shoot(m, me, hi ? 'slap' : 'wrist', hi ? .8 : 0, { far: sd }); game.advance(1.2); Drills.respawn(m); game.advance(.4); }
console.log(log.join(' '), JSON.stringify(Drills.st.corners), Drills.st.n);
