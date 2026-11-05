// The player bot: drives a human's craft through the virtual pad (analog values) with the AI's own controls, and its
// edge actions (fire, absorb, side-shift) through input.tap, so the human path (the mapping, double taps) is used.
export function bot(SN, game, i = 0, o = {}) {
  const B = {
    on: true, o,
    step() {
      const race = game.debug.race(); if (!race || !B.on) { SN.vpad[i].on = false; return; }
      const s = race.humans[i]; if (!s) return;
      const c = SN.AI.controls(s, race, Object.assign({ skill: 1, brain: 'bot' }, o));
      const vp = SN.vpad[i]; vp.on = true;
      vp.steer = c.steer; vp.pitch = c.pitch; vp.thrust = race.state === 'countdown' ? (race.stateT > 1.75 ? 1 : 0) : c.thrust; vp.brakeL = c.brakeL; vp.brakeR = c.brakeR;
      vp.fire = !!c.fire && o.weapons !== false; if (c.absorb) vp.absorb = true; if (c.shiftL) vp.shiftL = true; if (c.shiftR) vp.shiftR = true;
    },
    stop() { B.on = false; SN.vpad[i].on = false; }
  };
  return B;
}
/** advance the game s seconds, stepping the bots every 1/120 s */
export function drive(game, bots, s) { const n = Math.round(s * 120); for (let k = 0; k < n; k++) { for (const b of bots) b.step(); game.advance(1 / 120); } }
/** steering toward a lateral offset u a little way ahead (PD on the heading error) */
export function steerTo(SN, ship, R, u, look = 360) {
  const fr = R.track.frameAt(ship.s + look), V = SN.v, d = V.sub([0, 0, 0], V.addS([0, 0, 0], fr.C, fr.R, u), ship.P);
  const e = Math.atan2(V.dot(d, ship.R), Math.max(1e-6, V.dot(d, ship.F)));
  return Math.max(-1, Math.min(1, 2.4 * e));
}
/** the academy's drill bot: the AI's driving, plus what each drill asks for */
export function drillBot(SN, game, i = 0) {
  const base = bot(SN, game, i);
  base.step = () => {
    const R = game.debug.race(); if (!R || !R.academy) { SN.vpad[i].on = false; return; }
    const s = R.player, A = R.academy, d = SN.DRILLS[Math.min(A.i, 10)], T = R.track, vp = SN.vpad[i];
    const c = SN.AI.controls(s, R, { skill: 1, brain: 'bot', weapons: false });
    vp.on = true; Object.assign(vp, { steer: c.steer, pitch: c.pitch, thrust: c.thrust, brakeL: c.brakeL, brakeR: c.brakeR, fire: false });
    if (A.state !== 'go') return;
    if (d.id === 'steer' && A.gates) { const g = A.gates[A.data.gates]; if (g) { const ds = T.dS(s.s, g.s); vp.steer = steerTo(SN, s, R, g.u + (g.u - s.u) * .6, Math.max(80, ds)); vp.thrust = s.kmh < 190 ? 1 : 0; vp.brakeL = vp.brakeR = 0; if (Math.abs(g.u - s.u) > 40 && ds < 900 && s.shiftCD <= 0 && base._gs !== A.data.gates) { base._gs = A.data.gates; if (g.u > s.u) vp.shiftR = true; else vp.shiftL = true; } } }
    if (d.id === 'pitch') vp.pitch = 1;
    if (d.id === 'brakes') { const k = T.lineK[T.idx(s.s + 160)]; vp.brakeL = vp.brakeR = 0; if (Math.abs(k) > 1 / (160 * 16)) { if (k > 0) vp.brakeR = .8; else vp.brakeL = .8; } vp.thrust = s.kmh < 175 ? 1 : 0; }
    if (d.id === 'pads') { const p = T.pads.filter(q => q.kind === 'speed').map(q => ({ q, ds: T.dS(s.s, q.s) })).filter(o => o.ds > -40 && o.ds < 1600).sort((a, b) => a.ds - b.ds)[0]; if (p && p.ds < 3000) { const c2 = SN.AI.controls(s, R, { skill: 1, brain: 'bot2', weapons: false, uAt: p.q.u }); Object.assign(vp, { steer: c2.steer, brakeL: c2.brakeL, brakeR: c2.brakeR }); } }
    if (d.id === 'weapons') { if (!s.weapon) { const p = T.pads.filter(q => q.kind === 'weapon').map(q => ({ q, ds: T.dS(s.s, q.s) })).filter(o => o.ds > -20 && o.ds < 2000).sort((a, b) => a.ds - b.ds || Math.abs(a.q.u) - Math.abs(b.q.u))[0]; if (p) vp.steer = steerTo(SN, s, R, p.q.u, 300); } else { vp.steer = steerTo(SN, s, R, 0, 300); vp.fire = Math.floor(R.clock * 4) % 2 === 0; } }
    if (d.id === 'absorb') { if (s.weapon) vp.absorb = true; else { const p = T.pads.filter(q => q.kind === 'weapon').map(q => ({ q, ds: T.dS(s.s, q.s) })).filter(o => o.ds > -20 && o.ds < 2000).sort((a, b) => a.ds - b.ds || Math.abs(a.q.u) - Math.abs(b.q.u))[0]; if (p) vp.steer = steerTo(SN, s, R, p.q.u, 300); } }
    if (d.id === 'shift') { const ms = A.data.mineS, ds = T.dS(s.s, ms), mines = R.weapons.mines.filter(m => m.drill); if (mines.length) { const us = mines.map(m => m.u), hw = T.hw[T.idx(ms)], gapU = A.data.gapSide * hw * .74; if (ds > 0 && ds < 700) { vp.steer = steerTo(SN, s, R, gapU, 300); if (ds < 520 && !base._sh) { base._sh = true; if (gapU < 0) vp.shiftL = true; else vp.shiftR = true; } } } }
    if (d.id !== 'shift') base._sh = false;
    if (d.id === 'roll') { vp.thrust = 1; vp.steer = steerTo(SN, s, R, 0, 300); if (!s.grounded && s.airT > .1 && s.rollT <= 0 && !base._rolled) { vp.shiftR = true; base._rolled = true; } if (s.grounded && s.airT === 0 && A.t < .2) base._rolled = false; }
    if (d.id === 'pit' && T.pit) { const hw = T.hw[T.idx(s.s)], c2 = SN.AI.controls(s, R, { skill: 1, brain: 'bot2', weapons: false, uAt: T.pit.side * (hw - T.pit.w / 2 - 20) }); Object.assign(vp, { steer: c2.steer, brakeL: c2.brakeL, brakeR: c2.brakeR }); }
  };
  return base;
}
