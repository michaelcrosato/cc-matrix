import { load } from '../tests/lib/load.mjs';
const { BZ, game } = load(); BZ.cosmetic = false; game.advance(.6);
const aimEV = (th, ph, dist) => { const Pk = BZ.park('kernel'); let best = 300, bd = 1e9; for (let ev = 200; ev <= 1100; ev += 10) { const t = th * Math.PI / 180, p = ph * Math.PI / 180, b = Object.assign(BZ.newBall(), { x: Pk.H.x, y: Pk.H.y - 6, z: 18, vx: ev * Math.cos(p) * Math.sin(t), vy: -ev * Math.cos(p) * Math.cos(t), vz: ev * Math.sin(p), mode: 'batted' }), r = BZ.predict(b, Pk, 8); if (!r.land) continue; const d = Math.abs(Math.hypot(r.land.x - Pk.H.x, r.land.y - Pk.H.y) - dist); if (d < bd) { bd = d; best = ev; } } return best; };
const M = BZ.newMatch({ away: 'krakens', home: 'comets', seed: 13, innings: 9, fast: true }); BZ.match.newAtBat(M); M.bases = [null, null, null];
const ev = 760, t = 25 * Math.PI / 180, p = 12 * Math.PI / 180;
BZ.match.contact(M, { v: [ev * Math.cos(p) * Math.sin(t), -ev * Math.cos(p) * Math.cos(t), ev * Math.sin(p)], Q: .5, EV: ev, theta: 0, phi: 45, spin: 0 }, { x: 0, z: 18 });
let last = '';
for (let i = 0; i < 120 * 10 && M.phase === 'inPlay'; i++) { BZ.match.step(M, 1 / 120); const r = M.runners.find(q => q.isBatter), h = BZ.play.holder(M), s = r ? `${r.p.toFixed(2)}>${r.goal} ${r.state} tagged:${!!r.tagged} must:${r.mustTag}` : '-'; const line = `${M.play.t.toFixed(2)} ball ${M.ball.mode} holder ${h ? h.pos : '-'} R3 ${s} eta4 ${BZ.ai.ballETA(M, 4).toFixed(2)}`; if (i % 10 === 0) console.log(line); }
console.log('runs', M.teams[0].runs, 'outs', M.outs);
