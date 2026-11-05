import { load } from '../test/lib/load.mjs';
const { G, game } = load(); game.advance(.5); let res = null;
G.seed('match', 2); G.startMatch({ mode: 'exhibition', cpuAll: true, pointsToWin: 3, replays: false, teams: [[{ id: 'rin', suit: 'seigaiha', acc: [] }, { id: 'lola', suit: 'estrella', acc: [] }], [{ id: 'tess', suit: 'reefbreak', acc: [] }, { id: 'mei', suit: 'peony', acc: [] }]], after: r => { res = r; } }, { fade: 0 });
const kinds = new Set(); for (let s = 0; s < 120 * 300 && !res; s++) { game.advance(1 / 120); for (const p of G.M.players) { if (p.rig.vb) kinds.add(p.rig.vb.kind + (p.rig._clipName ? '>' + p.rig._clipName : '')); } }
console.log([...kinds].join(' '));
