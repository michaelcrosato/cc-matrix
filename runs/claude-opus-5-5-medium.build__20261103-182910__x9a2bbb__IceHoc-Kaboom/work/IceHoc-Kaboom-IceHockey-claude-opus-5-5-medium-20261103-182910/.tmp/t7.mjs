import { load } from '../tests/lib.mjs';
const { game, G } = load(''); game.advance(.1);
game.go('match', { home: 'muskrats', away: 'drillers', arena: 'icebox', periods: 1, len: 30, ot: true, shootout: true, humans: [{ input: game.input, team: 0 }], intros: false, replays: false, seed: 3 }, { fade: 0 }); game.advance(1.5);
const M = G.M; M.clock=.1; game.advance(4.5); M.clock=.1; game.advance(5);
for (let i = 0; i < 120; i++) { game.advance(.5); const so = M.so; if (i%2==0) console.log(M.phase, so && so.state, so && JSON.stringify(so.results), so && so.shooter && so.shooter.id, so && so.shooter && so.shooter.ctrl, M.puck.owner && M.puck.owner.id, Math.round(M.puck.x), so && so.t && so.t.toFixed(1)); if (M.phase==='final') break; }
