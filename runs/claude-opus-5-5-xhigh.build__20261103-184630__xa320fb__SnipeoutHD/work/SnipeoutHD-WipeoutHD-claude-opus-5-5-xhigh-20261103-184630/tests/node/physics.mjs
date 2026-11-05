// physics: the feel targets, jumps, walls never crossed, no NaN in long random runs, overpasses, pads, the pit,
// side-shift, barrel rolls (ok and botched), the rescue after an open-edge fall, and the launch boost window.
import { load } from '../lib/vm.mjs';
export async function run(T) {
  const { SN, game } = load({ quiet: true }); await game.booted;
  const U = 16, V = SN.v, dt = 1 / 120;
  const solo = (track, o = {}) => new SN.Race({ track: typeof track === 'string' ? SN.getTrack(track) : track, mode: 'race', cls: o.cls || 'SPARK', laps: 9, seed: o.seed || 1, entrants: [{ pilot: o.pilot || 'vale', team: o.team || 'kestrel', control: 'human', pi: 0 }], intro: false, flyingStart: true, rules: Object.assign({ weapons: false, rubberBand: false }, o.rules || {}), record: false });
  const C = o => Object.assign(SN.Controls.blank(), o);
  // a long straight oval for the feel numbers
  const oval = SN.Track.build({ id: 'oval', width: 30, origin: [2048, 2048, 0], start: 10, points: [[0, 0, 0], [1200, 0, 0], [2400, 0, 0], [3000, 400, 0], [2400, 800, 0], [1200, 800, 0], [0, 800, 0], [-600, 400, 0]] }, { validate: false });
  { const R = solo(oval), s = R.player; s.putOn(oval, 0, 0, 0); let t = 0, t90 = null; const top = s.st.top;
    while (t < 20) { R.setControls(0, C({ thrust: 1 })); R.step(dt); t += dt; if (t90 === null && s.speed >= top * .9) t90 = t; if (R.track.dS(0, s.s) > 2300 * U) break; }
    T.check('0 to 90% of top in 2.0-3.2 s', t90 !== null && t90 >= 2 && t90 <= 3.2, t90); T.check('thrust alone settles within 2% of top', Math.abs(s.speed / top - 1) < .02, s.speed / top); }
  // side-shift: about 4 m sideways
  { const R = solo(oval), s = R.player; s.putOn(oval, 200 * U, 0, 1000); for (let k = 0; k < 10; k++) { R.setControls(0, C({ thrust: 1 })); R.step(dt); } const u0 = s.u; R.setControls(0, C({ thrust: 1, shiftR: true })); R.step(dt); for (let k = 0; k < 60; k++) { R.setControls(0, C({ thrust: 1 })); R.step(dt); } const d = (s.u - u0) / U; T.check('side-shift moves 3-5 m', d > 3 && d < 5.5, d); }
  // cornering: full lock with the inside airbrake turns tighter than without
  { const rad = brake => { const R = solo(oval), s = R.player; s.putOn(oval, 100 * U, -100, 1300); const P0 = s.P.slice(), F0 = s.F.slice(); let ang = 0, last = Math.atan2(s.F[1], s.F[0]); for (let k = 0; k < 60; k++) { R.setControls(0, C({ thrust: 1, steer: 1, brakeR: brake })); R.step(dt); const a = Math.atan2(s.V[1], s.V[0]); ang += SN.wrapAngle(a - last); last = a; } return ang; };
    T.check('the inside airbrake turns tighter', rad(1) > rad(0) * 1.15, [rad(0), rad(1)]); }
  // jumps: Karakum's gorge clears fast and falls short slow; drops land at every speed
  { const K = SN.getTrack('karakum'), J = K.jumps[0];
    const tryGap = (ms, cls = 'SPARK') => { const R = solo(K, { cls }), s = R.player; s.putOn(K, J.s0 - 12 * U, K.line(J.s0 - 12 * U), ms * U); let resc = false, landed = false, t = 0; while (t < 5) { R.setControls(0, C({ thrust: 1 })); R.step(dt); t += dt; for (const e of R.events) { if (e.t === 'rescue') resc = true; if (e.t === 'land' && K.dS(J.s0, s.s) > 40 * U) landed = true; } if (resc || (landed && K.dS(J.s1, s.s) > 60 * U)) break; } return { resc, landed }; };
    const slow = tryGap(50), fast = tryGap(85), faster = tryGap(140, 'STORM');
    T.check('the gorge: 50 m/s falls short (rescue)', slow.resc, slow); T.check('the gorge: 85 m/s clears (SPARK)', fast.landed && !fast.resc, fast); T.check('the gorge: 140 m/s clears', faster.landed && !faster.resc, faster); }
  for (const id of ['solenne', 'meridian', 'borealis']) {
    const Tr = SN.getTrack(id), J = Tr.jumps[0];
    for (const ms of [45, 140]) { const R = solo(Tr, { cls: 'STORM' }), s = R.player; s.putOn(Tr, J.s0 - 60 * U, Tr.line(J.s0 - 60 * U) * .5, ms * U); let land = null, resc = false; for (let k = 0; k < 600; k++) { R.setControls(0, C({ thrust: 1 })); R.step(dt); for (const e of R.events) { if (e.t === 'land' && !land) land = e; if (e.t === 'rescue') resc = true; } if (land) break; } T.check(id + ' drop lands at ' + ms + ' m/s', land && !resc, { land: land && land.angle, resc }); }
  }
  // long random runs: no NaN, never through a wall, never under the deck (4 tracks, 150 s each, weapons on)
  for (const id of SN.TRACK_ORDER) {
    const Tr = SN.getTrack(id), R = new SN.Race({ track: Tr, mode: 'race', cls: 'STORM', laps: 99, seed: 3, entrants: SN.field({ humans: [{ pilot: 'vale', team: 'kestrel' }] }), intro: false, record: false, rules: { rubberBand: false } }), rnd = SN.rng('soak' + id);
    let nan = 0, through = 0, under = 0, c = C({}), n = 0;
    for (let k = 0; k < 120 * 150; k++) {
      if (k % 30 === 0) c = rnd() < .5 ? Object.assign(SN.AI.controls(R.player, R, { skill: 1, brain: 'soak' })) : C({ steer: rnd() * 2 - 1, pitch: rnd() * 2 - 1, thrust: rnd() < .8 ? 1 : 0, brakeL: rnd() < .2 ? 1 : 0, brakeR: rnd() < .2 ? 1 : 0, firePressed: rnd() < .1, fire: rnd() < .2, shiftL: rnd() < .03, shiftR: rnd() < .03 });
      R.setControls(0, c); R.step(dt); if (R.state === 'countdown') continue; n++;
      for (const s of R.ships) {
        if (!isFinite(s.P[0] + s.P[1] + s.P[2] + s.speed)) nan++;
        if (s.rescue || s.elim || s.belowDeck) continue;
        const srf = Tr.surface(s.s, s.u); if (srf.kind === 'gap') continue;
        const wall = s.u > 0 ? srf.wallR : srf.wallL; if (wall && Math.abs(s.u) > srf.hw + 1) through++;
        if (s.grounded && s.h < -2) under++;
      }
    }
    T.check(id + ' soak: no NaN', nan === 0, nan); T.check(id + ' soak: never through a wall', through === 0, through); T.check(id + ' soak: never under the deck', under === 0, under);
  }
  // overpass: a craft on the upper deck stays on it
  { const K = SN.getTrack('karakum'), o = K.overpasses[0], R = solo(K, { cls: 'FLARE' }), s = R.player; s.putOn(K, o.sHigh - 300 * U, K.line(o.sHigh - 300 * U), 1500); let jump = 0, last = s.s;
    for (let k = 0; k < 120 * 6; k++) { R.setControls(0, SN.AI.controls(s, R, { skill: 1, brain: 'op' })); R.step(dt); if (Math.abs(K.dS(last, s.s)) > 200) jump++; last = s.s; }
    T.check('the upper deck stays the upper deck', jump === 0 && K.dS(o.sHigh, s.s) > 0, { jump, past: K.dS(o.sHigh, s.s) }); }
  // pads, the pit
  { const Tr = SN.getTrack('solenne'), p = Tr.pads.find(q => q.kind === 'speed'), R = solo(Tr), s = R.player; s.putOn(Tr, p.s - 80 * U, p.u, 800); let hit = false; for (let k = 0; k < 240; k++) { R.setControls(0, C({ thrust: 1 })); R.step(dt); if (R.events.some(e => e.t === 'pad')) hit = true; } T.check('a speed pad boosts', hit, s.boostT); }
  { const Tr = SN.getTrack('solenne'), pit = Tr.pit, R = solo(Tr), s = R.player, u = pit.side * (Tr.hw[Tr.idx(pit.s0)] - pit.w / 2 - 24); s.putOn(Tr, pit.s0 + 10 * U, u, 600); s.energy = 40; for (let k = 0; k < 240; k++) { R.setControls(0, C({ thrust: 1, steer: 0 })); R.step(dt); } T.check('the pit strip recharges', s.energy > 55, s.energy); }
  // barrel rolls: a roll off the Harbour Step lands as a boost; one started late is botched
  { const Tr = SN.getTrack('solenne'), J = Tr.jumps[0];
    const roll = delay => { const R = solo(Tr, { cls: 'STORM' }), s = R.player; s.putOn(Tr, J.s0 - 30 * U, 0, 2200); let res = null, rolled = false; for (let k = 0; k < 400; k++) { const go = !s.grounded && s.airT > delay && !rolled; R.setControls(0, C({ thrust: 1, shiftR: go })); if (go) rolled = true; R.step(dt); const e = R.events.find(q => q.t === 'roll'); if (e) { res = e.ok; break; } } return res; };
    T.check('a barrel roll lands as a boost', roll(.09) === true, roll(.09)); T.check('a roll started late is botched', roll(.5) === false, roll(.5)); }
  // the rescue after leaving an open edge (Karakum's plateau rim)
  { const K = SN.getTrack('karakum'), e = K.open[0], R = solo(K), s = R.player, at = (e.s0 + K.dS(e.s0, e.s1) / 2) % K.L; s.putOn(K, at, -K.hw[K.idx(at)] + 30, 1200); let resc = false; for (let k = 0; k < 120 * 4; k++) { R.setControls(0, C({ thrust: 1, steer: -1 })); R.step(dt); if (R.events.some(q => q.t === 'rescue')) resc = true; } T.check('falling off an open edge calls the rescue drone', resc, { u: s.u, h: s.h }); }
  // the launch window
  { const launch = at => { const Tr = SN.getTrack('solenne'), R = new SN.Race({ track: Tr, mode: 'race', cls: 'SPARK', laps: 3, seed: 1, entrants: [{ pilot: 'vale', team: 'kestrel', control: 'human', pi: 0 }], intro: false, record: false, rules: { weapons: false } }); let got = null; for (let k = 0; k < 120 * 4; k++) { R.setControls(0, C({ thrust: R.state === 'countdown' && R.stateT >= at ? 1 : 0 })); R.step(dt); for (const e of R.events) if (e.t === 'perfectstart' || e.t === 'stall') got = got || e.t; } return got; };
    T.check('revs held from 1.7 s give a perfect start', launch(1.7) === 'perfectstart', launch(1.7)); T.check('revs held from the first light stall', launch(0) === 'stall', launch(0)); }
}
