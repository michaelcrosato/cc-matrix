import { load } from '../tests/lib.mjs';
const { game, G } = load(''); game.advance(.1);
G.Drills.start(4); game.advance(.6); const M = G.M, s = M.humans[0].s;
for (let k = 0; k < 450; k++) { if (M.puck.passTo === s) { G.T.set('goalieRead', 4); game.input.tap('shoot'); } game.advance(.1); }
console.log(M.events.filter(e=>['shot','save','goal','post','glass_hit'].includes(e.type)).map(e=>e.type+':'+(e.kind||'')+(e.dist?':'+e.dist:'')+(e.onGoal!==undefined?':'+e.onGoal:'')).join(' '));
