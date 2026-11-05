import { load } from '../tests/lib/load.mjs';
const { BZ, game } = load();
BZ.cosmetic = false;
const rows = [];
let M;
BZ.bus.on('fielded', d => { if (!M || !M.play || M.play.kind !== 'batted' || M.play.fieldedT !== undefined) return; const P = M.park, b = M.ball; M.play.fieldedT = M.play.t; M.play.fieldedD = Math.round(Math.hypot(b.x - P.H.x, b.y - P.H.y)); M.play.fieldedHow = d.how; M.play.fieldedPos = d.pos; });
BZ.bus.on('playEnd', d => { if (M.play && M.play.kind === 'batted' && M.play.fieldedT !== undefined) { const br = M.runners.find(r => r.isBatter); rows.push([M.play.fieldedPos, M.play.fieldedHow, M.play.fieldedT.toFixed(1), M.play.fieldedD, d.hit, br ? br.p.toFixed(1) : '-']); } });
for (let g = 0; g < 3; g++) { M = BZ.newMatch({ away: 'krakens', home: 'comets', seed: 500 + g, innings: 9, fast: true }); let s = 0; while (M.phase !== 'final' && s++ < 360000) BZ.match.step(M, 1 / 120); BZ.endMatch(M); }
const of = rows.filter(r => ['LF', 'CF', 'RF'].includes(r[0]) && r[1] === 'ground');
console.log('outfield ground-fielded (pos how t dist hit batterP):'); console.log(of.map(r => r.join(' ')).join('\n'));
