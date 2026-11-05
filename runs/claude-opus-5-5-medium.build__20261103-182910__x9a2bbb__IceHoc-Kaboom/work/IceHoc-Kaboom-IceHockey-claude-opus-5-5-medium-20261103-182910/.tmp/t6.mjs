import { load } from '../tests/lib.mjs';
const { game, G } = load(''); game.advance(.1);
game.go('match', { home: 'muskrats', away: 'drillers', arena: 'icebox', periods: 3, len: 120, humans: [{ input: game.input, team: 0 }], intros: false, replays: false, seed: 3 }, { fade: 0 }); game.advance(1.5);
const M = G.M, s = M.skaters[0], g = G.Skater.attackGoal(0), dir = -G.Rink.outDir(g.side);
M.goalies[1].disabled = true; M.goalies[1].x = -999;
Object.assign(s, { x: g.x + dir * 60, y: 400, vx: 0, vy: 0, facing: dir > 0 ? Math.PI : 0, state: 'skate' }); for (const o of M.skaters) if (o !== s) { o.x = 560; o.y = 220 + o.slot * 10; }
G.Puck.take(s, M.puck); console.log('phase', M.phase, 'human', M.humans[0].s.id, 'owner', M.puck.owner && M.puck.owner.id, g, s.x, s.facing);
game.input.tap('shoot'); for (let i=0;i<10;i++){ game.advance(1/120); console.log(i, s.shootHold.toFixed(3), M.puck.owner && M.puck.owner.id, Math.round(M.puck.x), Math.round(M.puck.vx)); }
game.advance(1); console.log(M.score, M.events.slice(-8).map(e=>e.type+(e.kind?':'+e.kind:'')));
