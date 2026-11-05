import { load } from '../lib/vm.mjs';
import { test, check, done } from '../lib/t.mjs';
const ctx = load(), SN = ctx.SN, DT = 1 / 120;
const est = (T, cls) => { let t = 0; for (let i = 0; i < T.n; i++) t += T.ds / T.profiles[cls][i]; return t; };
await test('8-AI races finish on every track and class', () => {
  for (const id of SN.TRACK_IDS) for (const cls of ['spark', 'storm']) {
    const R = new SN.Race({ track: id, mode: 'race', cls, laps: 2, seed: 3, entrants: SN.field([]), intro: false }); let n = 0;
    while (R.state !== 'results' && n < 120 * 300) { R.step(DT); n++; }
    const fin = R.ships.filter(s => s.finished && !s.estimated).length, resc = R.ships.reduce((a, s) => a + s.rescues, 0), best = Math.min(...R.ships.map(s => s.bestLap)), e = est(R.track, cls);
    check(R.state === 'results' && fin >= 6, id + '/' + cls + ' race ends with most craft finishing', { fin, dnf: R.ships.filter(s => s.dnf).length });
    check(resc <= 8, id + '/' + cls + ' rescues <= 1 per craft', resc);
    check(best > e * .75 && best < e * 1.25, id + '/' + cls + ' best lap within 25% of the line estimate', { best, e });
    let sorted = true; for (let k = 1; k < R.order.length; k++) { const a = R.order[k - 1], b = R.order[k]; if (!a.dnf && !b.dnf && a.finishTime > b.finishTime + 1e-6) sorted = false; } check(sorted, id + '/' + cls + ' positions follow finishing times');
  }
});
await test('determinism and replay', () => {
  const mk = () => new SN.Race({ track: 'meridian', mode: 'race', cls: 'flare', laps: 1, seed: 99, entrants: SN.field([{ team: 'volta', pilot: 'luca' }]), intro: false });
  const drive = R => { R.getHuman = sh => SN.AI.controls(sh, R, { skill: 1 }); };
  const a = mk(), b = mk(); drive(a); drive(b);
  for (let i = 0; i < 120 * 40; i++) { a.step(DT); b.step(DT); }
  check(a.hash() === b.hash(), 'two runs from one seed give one hash', [a.hash(), b.hash()]);
  const rec = a.record(), r2 = SN.Replay.verify(rec);
  check(r2.hash() === rec.hash, 'the replay re-simulation reproduces the hash', [r2.hash(), rec.hash]);
});
await test('wrong way and final lap', () => {
  const R = new SN.Race({ track: 'solenne', mode: 'race', cls: 'spark', laps: 2, seed: 1, entrants: SN.field([{ team: 'kestrel', pilot: 'ingrid' }]), intro: false }), me = R.humans[0];
  let wrong = 0; R.getHuman = () => ({ thrust: 1 }); for (let i = 0; i < 120 * 4; i++) R.step(DT);
  SN.V.scale(me.F, -1, me.F); SN.V.scale(me.V, -1, me.V);
  for (let i = 0; i < 120 * 3; i++) { R.step(DT); for (const e of R.events) if (e.t === 'wrongway' && e.ship === me) wrong++; }
  check(wrong >= 1, 'wrong way detected');
  const R2 = new SN.Race({ track: 'solenne', mode: 'race', cls: 'spark', laps: 2, seed: 1, entrants: SN.field([{ team: 'kestrel', pilot: 'ingrid' }]), intro: false }); let fl = 0; R2.getHuman = sh => SN.AI.controls(sh, R2, { skill: 1 });
  for (let i = 0; i < 120 * 80; i++) { R2.step(DT); for (const e of R2.events) if (e.t === 'finalLap' && e.ship.control === 'human') fl++; }
  check(fl === 1, 'final lap announced once', fl);
});
await test('elimination: DNF in a race, respawn in snipeout', () => {
  const R = new SN.Race({ track: 'solenne', mode: 'race', cls: 'spark', laps: 3, seed: 1, entrants: SN.field([]), intro: false }); R.state = 'racing'; R.t = 0; const s = R.ships[3]; SN.Ship.damage(s, 500, 'test', R.ships[0], R); check(s.elim && s.dnf, 'race elimination is DNF');
  const Q = new SN.Race({ track: 'solenne', mode: 'snipeout', cls: 'spark', seed: 1, entrants: SN.field([]), intro: false }); Q.state = 'racing'; Q.t = 0; const q = Q.ships[3]; Q.weapons.hit(q, Q.ships[0], 'rail', 500, {}); for (let i = 0; i < 120 * 4; i++) Q.step(DT);
  check(!q.elim && q.energy === 100 && Q.ships[0].points >= 5, 'snipeout: respawn, and hit + elimination + sniped points', { e: q.elim, pts: Q.ships[0].points });
});
done();
