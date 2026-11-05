import { load } from '../tests/lib.mjs';
const { game, G } = load('');
game.advance(.1);
game.go('match', { home: 'muskrats', away: 'drillers', arena: 'icebox', periods: 1, len: 30, ot: false, shootout: true, humans: [], intros: false, replays: false }, { fade: 0 });
game.advance(1); G.M.clock = 0.1; game.advance(5.5);
for (let i = 0; i < 20; i++) { game.advance(.15); const s = G.M.so.shooter; console.log(G.M.phase, s.state, s.ai.role, s.ai.holdShoot.toFixed(2), s.cool.shot.toFixed(2), s.shootHold.toFixed(2), Math.round(s.x), JSON.stringify(s.lastIntent && s.lastIntent.press), s.lastIntent && s.lastIntent.shoot); }
