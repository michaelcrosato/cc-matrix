import { load } from '../tests/lib.mjs';
const { game, G } = load(''); game.advance(.1);
G.Drills.start(4); game.advance(.6); const M = G.M, s = M.humans[0].s;
for (let k = 0; k < 100; k++) { if (M.puck.passTo === s) { G.T.set('goalieRead', 4); game.input.tap('shoot'); } game.advance(.1); }
console.log(M.events.filter(e=>['shot','save','goal','post','glass_hit','boards','pass','possession'].includes(e.type)).map(e=>e.type+':'+(e.kind||'')+':'+(e.by||e.from||'')+(e.dist?':'+e.dist:'')+(e.onGoal!==undefined?':'+e.onGoal:'')).join(' '));
const D = G.Drills.D; console.log(M.phase, D.feedT, M.puck.owner && M.puck.owner.id, M.puck.held, M.skaters[0].state, M.skaters[0].ctrl, s.id, D.done, M.phaseT);
