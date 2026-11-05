import { load } from '../test/lib/load.mjs';
const { game, G, E } = load({ quiet: false });
game.advance(1);
console.log('scene', game.sceneName, 'errors', game.errors.map(e => e.where + ': ' + e.message));
const teams = [[{ id: 'rin', suit: 'seigaiha', acc: ['ribbon'] }, { id: 'lola', suit: 'estrella', acc: [] }], [{ id: 'tess', suit: 'reefbreak', acc: [] }, { id: 'mei', suit: 'peony', acc: [] }]];
G.startMatch({ mode: 'exhibition', cpuAll: true, pointsToWin: 7, teams, after: (res) => { console.log('END', JSON.stringify(res.finalScore), res.rallies, 'longest', res.longest); G.done = true; } }, { fade: 0 });
let t = 0, lastScore = '';
while (!G.done && t < 600) { game.advance(1); t++; const M = G.M; if (!M) continue; const s = M.score.join('-') + ' ' + M.phase; if (M.score.join('-') !== lastScore) { lastScore = M.score.join('-'); console.log(t, s, M.lastWhy, 'rally', M.rallyTouches); } }
console.log('t', t, 'errors', game.errors.map(e => e.where + ': ' + e.message + ' ' + (e.stack||'').split('\n')[1]));
