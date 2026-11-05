import { load } from '../tests/lib.mjs';
const { game, G, snap } = load('');
game.advance(.1);
game.go('match', { home: 'muskrats', away: 'drillers', arena: 'icebox', periods: 1, len: 30, ot: false, shootout: true, humans: [], intros: false, replays: false }, { fade: 0 });
game.advance(1); G.M.score=[0,0]; G.M.clock = 0.1; 
for (let i = 0; i < 160; i++) { game.advance(.25); const M = G.M, so = M.so; if (i % 4 == 0) console.log(i/4, M.phase, so && so.state, so && so.t && so.t.toFixed(1), so && JSON.stringify(so.results), so && so.shooter && so.shooter.id, M.puck.owner && M.puck.owner.id, Math.round(M.puck.x), Math.round(M.puck.y), so && so.shooter && Math.round(so.shooter.x)); }
