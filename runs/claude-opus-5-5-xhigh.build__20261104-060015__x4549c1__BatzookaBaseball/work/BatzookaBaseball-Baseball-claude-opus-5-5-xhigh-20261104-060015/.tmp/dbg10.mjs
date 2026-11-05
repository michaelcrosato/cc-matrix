import { load } from '../tests/lib/load.mjs';
const { BZ, game } = load(); BZ.cosmetic = false; game.advance(.6);
const M = BZ.newMatch({ away: 'krakens', home: 'comets', seed: 7, innings: 9, fast: true }); BZ.match.newAtBat(M);
const th = -14 * Math.PI / 180, ph = -4 * Math.PI / 180, ev = 470;
BZ.match.contact(M, { v: [ev * Math.cos(ph) * Math.sin(th), -ev * Math.cos(ph) * Math.cos(th), ev * Math.sin(ph)], Q: .5, EV: ev, theta: -14, phi: -4, spin: 0 }, { x: 0, z: 18 });
const P = M.park; let lastEv = 0;
for (let i = 0; i < 120 * 6 && M.phase === 'inPlay'; i++) {
  BZ.match.step(M, 1 / 120);
  const h = BZ.play.holder(M), r = M.runners.find(q => q.isBatter), ss = M.fielders.find(f => f.pos === 'SS'), b1 = M.fielders.find(f => f.pos === '1B');
  if (i % 12 === 0 || M.events.length !== lastEv) console.log(M.play ? M.play.t.toFixed(2) : '-', M.ball.mode, Math.round(M.ball.x - P.H.x), Math.round(M.ball.y - P.H.y), Math.round(M.ball.z), 'holder', h && h.pos, h && h.decideT.toFixed(2), h && h.throwT.toFixed(2), 'runner', r && r.p.toFixed(2), 'SS', Math.round(ss.x - P.H.x), Math.round(ss.y - P.H.y), ss.state, ss.role, '1B', Math.round(b1.x - P.H.x), Math.round(b1.y - P.H.y), b1.role, M.events.slice(lastEv).join(','));
  lastEv = M.events.length;
}
// probe: re-run and call holderDecision right after the catch
{
const M2 = BZ.newMatch({ away: 'krakens', home: 'comets', seed: 7, innings: 9, fast: true }); BZ.match.newAtBat(M2);
BZ.match.contact(M2, { v: [ev * Math.cos(ph) * Math.sin(th), -ev * Math.cos(ph) * Math.cos(th), ev * Math.sin(ph)], Q: .5, EV: ev, theta: -14, phi: -4, spin: 0 }, { x: 0, z: 18 });
for (let i = 0; i < 120 * 3 && !BZ.play.holder(M2); i++) BZ.match.step(M2, 1 / 120);
const h = BZ.play.holder(M2), r = M2.runners.find(q => q.isBatter);
console.log('PROBE holder', h.pos, 'runner', r.p, r.goal, r.delay, r.state, 'decision', JSON.stringify(BZ.ai.holderDecision(M2, h)), 'rsp', BZ.runSpeed(M2, r), 'tsp', BZ.throwSpeed(M2, h, .8), 'rec', BZ.play.receiverFor(M2, 1, h).pos);
}
