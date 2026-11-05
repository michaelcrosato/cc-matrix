import { load } from '../tests/lib/load.mjs';
const { BZ, game } = load();
BZ.cosmetic = false;
const ev = {}; let dropModes = {};
BZ.bus.on('*', (d, e) => { const k = e === 'out' ? 'out_' + d.how : e === 'runnerOut' ? 'rout_' + d.how : e === 'hit' ? 'hit_' + d.bases : e === 'playEnd' ? 'end_' + d.reason : e; ev[k] = (ev[k] || 0) + 1; });
const origDrop = BZ.play.tryCatch;
BZ.play.tryCatch = function (M, f) { const mode = M.ball.mode, fly = M.ball.mode === 'batted' && !M.ball.bounced, st = f.state; const r = origDrop.call(this, M, f); if (M.ball.mode === 'loose' && mode !== 'loose' && !r) { const k = mode + (fly ? '-fly' : '') + '-' + st; dropModes[k] = (dropModes[k] || 0) + 1; } return r; };
for (let g = 0; g < 4; g++) { const M = BZ.newMatch({ away: 'krakens', home: 'comets', seed: 300 + g, innings: 9, fast: true }); let s = 0; while (M.phase !== 'final' && s++ < 360000) BZ.match.step(M, 1 / 120); BZ.endMatch(M); }
const keys = Object.keys(ev).filter(k => /^(out_|rout_|hit_|end_|drop|throwError|error|steal|tagUp|doublePlay|wildPitch|slide|bowl|dive|climb|catch|fenceHit|groundRule|homer|walk|hbp|strikeout|run$)/.test(k)).sort();
console.log(keys.map(k => k + ':' + ev[k]).join('  '));
console.log('drops', dropModes);
