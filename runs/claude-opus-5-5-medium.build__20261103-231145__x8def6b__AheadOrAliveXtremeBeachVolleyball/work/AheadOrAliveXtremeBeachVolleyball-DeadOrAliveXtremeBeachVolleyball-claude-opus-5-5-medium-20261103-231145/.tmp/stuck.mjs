import { load } from '../test/lib/load.mjs';
const { G, game } = load(); game.advance(.5);
const teams = [[{ id: 'rin', suit: 'seigaiha', acc: [] }, { id: 'lola', suit: 'estrella', acc: [] }], [{ id: 'tess', suit: 'reefbreak', acc: [] }, { id: 'mei', suit: 'peony', acc: [] }]];
G.seed('match', 6); let res = null; G.startMatch({ mode: 'exhibition', cpuAll: true, pointsToWin: 7, teams, after: r => res = r }, { fade: 0 }); game.advance(.05);
let ph = null, t = 0, worst = [0, ''];
for (let s = 0; s < 900 * 120 && !res; s++) { game.advance(1 / 120); const M = G.M; if (M.phase !== ph) { if (t > 8) console.log('phase', ph, t.toFixed(1), 'touches', M.rallyTouches, 'score', M.score); ph = M.phase; t = 0; } else t += 1 / 120; }
console.log(res && res.finalScore, res && res.longest);
