import { load } from '../lib/vm.mjs';
import { test, check, done } from '../lib/t.mjs';
const ctx = load(), SN = ctx.SN, V = SN.V, DT = 1 / 120;
const solo = (track, cls = 'spark', o = {}) => { const R = new SN.Race(Object.assign({ track, mode: 'timetrial', cls, laps: 3, seed: 1, entrants: [{ pilot: 'ingrid', team: 'kestrel', control: 'human', player: 0 }], intro: false }, o)); R.state = 'racing'; R.t = 0; return R; };
const run = (R, n, ctl) => { const sh = R.humans[0]; R.getHuman = () => ctl(sh, R); for (let i = 0; i < n; i++) R.step(DT); };
await test('acceleration and top speed', () => {
  const R = solo('solenne'), sh = R.humans[0]; SN.Ship.place(sh, R, SN.wrap(-200 * 16, R.track.L), 0, 0);
  let t90 = null; R.getHuman = () => ({ thrust: 1, steer: 0, analog: true }); const top = sh.st.top;
  for (let i = 0; i < 120 * 6; i++) { R.step(DT); if (t90 === null && SN.Ship.fwdSpeed(sh) >= top * .9) t90 = i * DT; }
  check(t90 > 1.8 && t90 < 3.4, '0 to 90% top in 1.8-3.4 s', t90);
});
await test('top speed held', () => { const R = solo('solenne'), sh = R.humans[0]; SN.Ship.place(sh, R, 10, 0, sh.st.top); let vmax = 0; run(R, 120 * 3, (s) => SN.AI.controls(s, R, { skill: 1, weapons: false })); for (let i = 0; i < 120; i++) { R.step(DT); vmax = Math.max(vmax, SN.Ship.fwdSpeed(sh)); } check(vmax < sh.st.top * 1.45 && vmax > sh.st.top * .8, 'speed near top', [vmax, sh.st.top]); });
await test('side-shift', () => { const R = solo('solenne'), sh = R.humans[0]; SN.Ship.place(sh, R, 100 * 16, -60, 1000); run(R, 30, () => ({ thrust: 1 })); const u0 = sh.u; let first = true; run(R, 60, () => { const c = { thrust: 1, shiftR: first ? 1 : 0 }; first = false; return c; }); const d = (sh.u - u0) / 16; check(d > 2.5 && d < 6, 'side-shift moves 3-5 m', d); });
await test('the gorge', () => {
  const T = SN.getTrack('karakum'), j = T.jumps[0];
  const jump = mps => { const R = solo('karakum', 'storm'), sh = R.humans[0]; SN.Ship.place(sh, R, SN.wrap(j.a - 30 * 16, T.L), 0, mps * 16); let resc = false; R.getHuman = () => ({ thrust: 0, steer: 0, analog: true }); for (let i = 0; i < 120 * 4; i++) { R.step(DT); if (sh.rescueT > 0) resc = true; } return { resc, s: sh.s }; };
  const slow = jump(52), fast = jump(88);
  check(slow.resc, 'too slow falls into the gorge', slow); check(!fast.resc && SN.wrapDiff(j.b, fast.s, T.L) > 0, 'fast clears the gorge', fast);
});
await test('drops land', () => {
  for (const [id, mps] of [['solenne', 45], ['meridian', 140], ['borealis', 100]]) {
    const T = SN.getTrack(id), j = T.jumps[0], R = solo(id, 'storm'), sh = R.humans[0]; SN.Ship.place(sh, R, SN.wrap(j.a - 40 * 16, T.L), 0, mps * 16); sh.st.top = 2600;
    let air = 0, land = null; R.getHuman = () => ({ thrust: 1, analog: true });
    for (let i = 0; i < 120 * 4; i++) { R.step(DT); if (!sh.grounded) air += DT; for (const e of R.events) if (e.t === 'land' && e.ship === sh) land = e; }
    check(land && air > .3 && sh.rescueT <= 0 && sh.rescues === 0, id + ' drop: airborne then lands', { air, land: land && land.angle, resc: sh.rescues });
  }
});
await test('walls hold at 3000 u/s', () => {
  for (const id of SN.TRACK_IDS) { const T = SN.getTrack(id), R = solo(id, 'singularity'), sh = R.humans[0]; let breach = 0, nan = 0; SN.Ship.place(sh, R, 50 * 16, 0, 2900); sh.st.top = 3000; R.getHuman = (s) => ({ thrust: 1, steer: Math.sin(R.t * 1.3) > 0 ? 1 : -1, analog: true });
    for (let i = 0; i < 120 * 20; i++) { R.step(DT); const f = T.frameAt(sh.s); if (f.kind !== 1 && T.wall(sh.s, Math.sign(sh.u)) && Math.abs(sh.u) > f.hw + 2 && sh.rescueT <= 0) breach++; if (!isFinite(sh.P[0])) nan++; }
    check(!breach && !nan, id + ' no wall breach or NaN', { breach, nan }); }
});
await test('random input soak', () => {
  for (const id of SN.TRACK_IDS) { const R = solo(id, 'flare'), sh = R.humans[0], rnd = SN.rng(5); let nan = 0, under = 0; R.getHuman = () => ({ thrust: rnd() < .8 ? 1 : 0, steer: rnd() * 2 - 1, pitch: rnd() * 2 - 1, brakeL: rnd() < .2 ? 1 : 0, brakeR: rnd() < .2 ? 1 : 0, shiftL: rnd() < .01 ? 1 : 0, shiftR: rnd() < .01 ? 1 : 0, analog: true });
    for (let i = 0; i < 120 * 60; i++) { R.step(DT); if (!isFinite(sh.P[0] + sh.V[0] + sh.p)) nan++; if (sh.grounded && sh.h < 0) under++; }
    check(!nan && !under, id + ' soak: no NaN, never under the deck', { nan, under }); }
});
await test('pit recharge', () => { const R = solo('solenne'), T = R.track, sh = R.humans[0], s = SN.wrap(T.pit.a + 30 * 16, T.L); SN.Ship.place(sh, R, s, T.pit.side * (T.frameAt(s).hw - 4 * 16), 600); sh.energy = 50; run(R, 120 * 1.5, () => ({ thrust: 0, steer: 0, analog: true })); check(sh.energy > 70, 'pit lane recharges', sh.energy); });
await test('barrel roll', () => {
  const T = SN.getTrack('borealis'), j = T.jumps[0];
  const attempt = (late) => { const R = solo('borealis', 'storm'), sh = R.humans[0]; SN.Ship.place(sh, R, SN.wrap(j.a - 30 * 16, T.L), 0, 120 * 16); sh.st.top = 2400; let res = null, k = 0; R.getHuman = () => { k++; const air = !sh.grounded && sh.airT > (late ? .9 : .15) && !sh.rollT && !sh.rollDone; return { thrust: 1, flick: air && res === null && k > 2 ? 1 : 0, analog: true }; }; for (let i = 0; i < 120 * 3; i++) { R.step(DT); for (const e of R.events) if (e.t === 'roll' && e.ship === sh) res = e.ok; } return res; };
  check(attempt(false) === true, 'an early roll lands for a boost'); check(attempt(true) === false, 'a late roll is botched');
});
await test('rescue after an open edge', () => { const T = SN.getTrack('karakum'), o = T.openEdges[0], R = solo('karakum'), sh = R.humans[0], s = SN.wrap(o.a + 20 * 16, T.L); SN.Ship.place(sh, R, s, o.side * (T.frameAt(s).hw - 30), 900); let resc = 0; R.getHuman = () => ({ thrust: 1, steer: o.side, analog: true }); for (let i = 0; i < 120 * 6; i++) { R.step(DT); for (const e of R.events) if (e.t === 'rescue') resc++; } check(resc >= 1, 'the drone rescues a fall off the plateau', { resc, u: sh.u }); });
await test('launch boost', () => {
  const go = holdSecs => { const R = new SN.Race({ track: 'solenne', mode: 'timetrial', cls: 'spark', seed: 1, entrants: [{ pilot: 'ingrid', team: 'kestrel', control: 'human', player: 0 }], intro: false }), sh = R.humans[0]; let ev = null; R.getHuman = () => ({ thrust: R.t > -holdSecs ? 1 : 0 }); for (let i = 0; i < 120 * 4; i++) { R.step(DT); for (const e of R.events) if (e.t === 'perfect' || e.t === 'stall') ev = e.t; } return ev; };
  check(go(1.33) === 'perfect', 'revs in the window: PERFECT START'); check(go(3) === 'stall', 'revs too high: STALL');
});
done();
