import { load } from '../test/lib/load.mjs';
import { runMatch } from '../test/lib/bots.mjs';
const { G, game } = load(); game.advance(.5);
const teams = () => [[{ id: 'rin', suit: 'seigaiha', acc: [] }, { id: 'lola', suit: 'estrella', acc: [] }], [{ id: 'tess', suit: 'reefbreak', acc: [] }, { id: 'mei', suit: 'peony', acc: [] }]];
let lens = [];
G.bus.on('point', () => { lens.push(G.M.rallyTouches); });
for (let s = 1; s <= 10; s++) { G.seed('match', s); runMatch(game, G, { mode: 'exhibition', cpuAll: true, pointsToWin: 7, replays: false, teams: teams() }); }
lens.sort((a, b) => a - b); const avg = lens.reduce((a, b) => a + b, 0) / lens.length;
console.log('rallies', lens.length, 'avg touches', avg.toFixed(2), 'median', lens[lens.length >> 1], 'p90', lens[Math.floor(lens.length * .9)], 'max', lens[lens.length - 1]);
