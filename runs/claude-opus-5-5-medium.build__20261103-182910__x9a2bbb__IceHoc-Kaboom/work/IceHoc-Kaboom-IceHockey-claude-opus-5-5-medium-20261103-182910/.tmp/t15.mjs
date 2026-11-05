import { load } from '../tests/lib.mjs';
const { game, G } = load(''); game.advance(.2); const I = game.input;
G.Drills.start(3); game.advance(.8); const M = G.M, s = M.humans[0].s;
G.Bus.on('goal', e => console.log('goal y', (M.puck.y - 400).toFixed(1), 'z', M.puck.z.toFixed(1), 'targets', JSON.stringify(G.Drills.D.targets.map(t => [t.y - 400, t.z, t.hit]))));
G.Bus.on('shot', e => console.log('shot', e.kind, 'from', Math.round(s.x), Math.round(s.y), 'stickY?'));
for (let k = 0; k < 8; k++) { while (M.puck.owner !== s) game.advance(.1); I.hold(k % 4 < 2 ? 'up' : 'down'); I.hold('shoot'); game.advance(k % 2 ? 1.1 : .05); I.hold('shoot', false); game.advance(1/60); I.hold('up', false); I.hold('down', false); game.advance(1.5); }
