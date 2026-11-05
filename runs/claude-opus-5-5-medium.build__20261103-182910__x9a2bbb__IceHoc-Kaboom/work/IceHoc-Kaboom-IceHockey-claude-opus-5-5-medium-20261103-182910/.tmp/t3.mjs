import { load } from '../tests/lib.mjs';
const { game, G, snap } = load('');
game.advance(.2);
game.go('match', { home: 'muskrats', away: 'drillers', arena: 'icebox', periods: 1, len: 30, ot: true, shootout: true, humans: [], intros: false }, { fade: 0 });
let last = '';
for (let i = 0; i < 900; i++) { const t0 = Date.now(); game.advance(.25); const s = snap(); const k = s.scene + ' ' + s.phase; if (k !== last || Date.now()-t0 > 200) { console.log(i/4, Date.now() - t0, 'ms', k, s.clock, s.score, game.errors.length ? game.errors[0].message + game.errors[0].stack.split('\n')[1] : ''); last = k; } }
console.log(Object.entries(G.M.events.reduce((a, e) => (a[e.type] = (a[e.type] || 0) + 1, a), {})).map(x => x.join(':')).join(' '));
