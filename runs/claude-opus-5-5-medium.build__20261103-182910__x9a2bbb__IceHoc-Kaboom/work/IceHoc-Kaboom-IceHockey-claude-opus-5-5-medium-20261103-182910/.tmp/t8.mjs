import { load } from '../tests/lib.mjs';
const { game, G } = load(''); game.advance(.1);
game.go('match', { home: 'muskrats', away: 'drillers', arena: 'icebox', periods: 1, len: 30, ot: true, shootout: true, humans: [], intros: false, replays: false, seed: 3 }, { fade: 0 }); game.advance(1.5);
const M = G.M; M.clock=.1; game.advance(4.5); M.clock=.1; game.advance(6.5);
for (let i = 0; i < 30; i++) { game.advance(.1); const s = M.so.shooter, att=G.Skater.attackGoal(s.team); console.log(M.so.state, s.id, s.state, s.ai.role, s.ai.holdShoot.toFixed(2), s.cool.shot.toFixed(2), s.shootHold.toFixed(2), Math.round(s.x), Math.round(s.y), att.x, G.AI.laneBlock(s, att.x, att.y, 12), M.puck.owner&&M.puck.owner.id, s.lastIntent && s.lastIntent.shoot); }
