import { load } from '../tests/lib.mjs';
const { game, G, snap } = load('');
game.advance(.2);
game.go('match', { home: 'muskrats', away: 'drillers', arena: 'icebox', periods: 1, len: 60, ot: true, shootout: true, humans: [], intros: false }, { fade: 0 });
for (let i = 0; i < 40; i++) { const t0 = Date.now(); game.advance(.5); const s = snap(); console.log(i, Date.now() - t0, 'ms', s.scene, s.phase, s.clock, s.score, s.puck && s.puck.owner, game.errors.length ? game.errors[0].message : ''); }
