import { load } from '../tests/lib/load.mjs';
const { BZ, game } = load();
BZ.cosmetic = false;
const orig = BZ.ai.ballETA.bind(BZ.ai); let samples = [];
BZ.ai.ballETA = (M, base) => { const v = orig(M, base); if (base === 2 && M.runners.find(r => r.isBatter && r.p > .78 && r.p < 1)) { const b = M.ball, P = M.park, c = M.play.chaser; samples.push(`eta2=${v.toFixed(2)} ball=${b.mode} ${Math.round(b.x - P.H.x)},${Math.round(b.y - P.H.y)} z${b.z.toFixed(0)} chaser=${c && c.pos} catchAt=${c && c.catchAt ? Math.round(c.catchAt.x - P.H.x) + ',' + Math.round(c.catchAt.y - P.H.y) : '-'} predLand=${M.play.pred && M.play.pred.land ? M.play.pred.land.t.toFixed(2) : '-'} playT=${M.play.t.toFixed(2)}`); } return v; };
const M = BZ.newMatch({ away: 'krakens', home: 'comets', seed: 300, innings: 9, fast: true }); let s = 0;
while (M.phase !== 'final' && s++ < 360000 && samples.length < 400) BZ.match.step(M, 1 / 120);
console.log(samples.filter((x, i) => i % 9 === 0).slice(0, 40).join('\n'));
