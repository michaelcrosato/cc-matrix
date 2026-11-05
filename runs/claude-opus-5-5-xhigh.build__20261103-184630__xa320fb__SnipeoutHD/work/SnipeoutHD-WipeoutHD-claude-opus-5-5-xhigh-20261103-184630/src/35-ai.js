// SNIPEOUT HD: AI pilots. Each step they turn the racing line and the speed profile into ShipControls: pure pursuit
// on the line with avoidance and pad biases, speed by the profile (thrust, both airbrakes, the inside airbrake as the
// corner needs it), pitch on slopes and jumps, barrel rolls, weapons by situation, seeded mistakes. The same function
// drives AUTOPILOT, the attract mode, the tests' player bot and the medal calibration.
(() => {
const E = My3D2dge, SN = globalThis.SN, V = SN.v, U = 16;
const fr = { C: [0, 0, 0], F: [0, 0, 0], R: [0, 0, 0], U: [0, 0, 0] }, d = [0, 0, 0];

function brain(ship, race, key = 'ai') {
  const have = ship['_brain_' + key]; if (have && have.race === race) return have;
  const P = SN.PILOTS[ship.pilot], dif = SN.DIFFICULTY[race.difficulty] || SN.DIFFICULTY.Normal;
  return (ship['_brain_' + key] = { race, rng: race.rng(key + ':' + ship.idx), lastE: 0, avoid: 0, avoidT: 0, late: 0, lateFor: -1, fireT: 0, rollPlan: false, holdRail: false,
    skill: E.clamp(dif.skill + (P.skill || 0) + (P.team === 'nullset' ? .02 : 0), .5, 1.1), aggression: (P.aggression || 1) * dif.aggression, wobble: 0 });
}
const AI = SN.AI = {
  /** ShipControls for a craft: o.skill (override), o.weapons (false: none), o.rolls, o.aggression */
  controls(ship, race, o = {}) {
    const A = brain(ship, race, o.brain || 'ai'), Tr = race.track, T = SN.Tune.T, out = ship._aiOut || (ship._aiOut = SN.Controls.blank());
    const skill = E.clamp((o.skill ?? A.skill) * (o.skill !== undefined ? 1 : T.aiSkill), .4, 1.2), aggr = (o.aggression ?? A.aggression) * (o.aggression !== undefined ? 1 : T.aiAggression);
    const v = ship.speed, s = ship.s, cls = race.cls, st = ship.st, top = st.top * ship.topK;
    for (const k in out) out[k] = typeof out[k] === 'boolean' ? false : 0;
    if (SN.cheats.freezeAI && ship.control === 'ai' && race.state === 'racing') { out.brakeL = out.brakeR = 1; return out; }
    // 1. where to aim: a point on the line ahead (shorter in tight sections, so the hairpins are not cut)
    let kmax = 0; for (let x = 0; x < 900; x += 64) kmax = Math.max(kmax, Math.abs(Tr.lineK[Tr.idx(s + x)]));
    const look = E.clamp(.42 * v + 220, 240, 220 + .55 / Math.max(1e-4, kmax));
    const sL = s + look;
    // avoidance: a craft close ahead on our line, closing: move over toward the wider side
    A.avoidT = Math.max(0, A.avoidT - SN.DT);
    if (A.avoidT <= 0) {
      let want = 0;
      for (const b of race.ships) {
        if (b === ship || b.elim || b.ghost || b.rescue || b.hidden) continue;
        const ds = Tr.dS(s, b.s); if (ds <= 0 || ds > 900) continue;
        const du = b.u - (ship.u + A.avoid); if (Math.abs(du) > 70 || b.speed > v + 40) continue;
        const hw = Tr.hw[Tr.idx(b.s)], room = hw - Math.abs(b.u);
        want = b.u > 0 ? -110 : 110; if (room > hw * .9) want = du > 0 ? -110 : 110; break;
      }
      for (const m of race.weapons.mines) { const ds = Tr.dS(s, m.s); if (ds > 0 && ds < 1200 && Math.abs(m.u - (Tr.line(m.s) + A.avoid)) < 60) { want = m.u > Tr.line(m.s) ? -90 : 90; break; } }
      if (want !== A.avoidTarget) { A.avoidTarget = want; A.avoidT = .35; }
    }
    A.avoid += ((A.avoidTarget || 0) - A.avoid) * Math.min(1, SN.DT / .6 * 2);
    // pads: a speed pad near the line ahead (skill-weighted), a weapon pad when unarmed, the pit when low
    let bias = 0;
    if (!race.rules.noSpeedPads || race.rules.weapons) for (const p of Tr.pads) {
      const ds = Tr.dS(s, p.s); if (ds < 0 || ds > 1500) continue;
      if (p.kind === 'speed' && !race.rules.noSpeedPads && Math.abs(p.u - Tr.line(p.s)) < 140) { bias = (p.u - Tr.line(p.s)) * skill * Math.min(1, (1500 - ds) / 600); break; }
      if (p.kind === 'weapon' && race.rules.weapons && !ship.weapon && o.weapons !== false && Math.abs(p.u - Tr.line(p.s)) < 140) { bias = (p.u - Tr.line(p.s)) * .8; break; }
    }
    if (Tr.pit && ship.energy < 45 && !race.rules.noPit) { const ds = Tr.dS(s, Tr.pit.s0); if (ds > -Tr.dS(Tr.pit.s0, Tr.pit.s1) && ds < 2500) bias = Tr.pit.side * (Tr.hw[Tr.idx(s)] - 5 * U) - Tr.line(sL); }
    Tr.frameAt(sL, fr);
    const lim = fr.hw - 34, uT = E.clamp(o.uAt !== undefined ? o.uAt : Tr.line(sL) + A.avoid + bias, -lim, lim);   // (o.uAt: a lateral target of the caller's: a drill, a pad, the pit)
    V.addS(d, fr.C, fr.R, uT); V.sub(d, d, ship.P);
    const e = Math.atan2(V.dot(d, ship.R), Math.max(1e-6, V.dot(d, ship.F)));
    const de = (e - A.lastE) / SN.DT; A.lastE = e;
    A.wobble += SN.DT * (1.3 + A.rng() * .2);
    let steer = 2.2 * e + .25 * E.clamp(de, -4, 4) * .1 + Math.sin(A.wobble) * .05 * (1 - skill) * 3;
    out.steer = E.clamp(steer, -1, 1);
    // 2. speed: the profile ahead, scaled by skill
    // the craft's own profile: its top speed and its own grip (handling); the rubber band scales it
    const skillK = .80 + .2 * skill, prof = Tr.profileFor(ship.team + '/' + cls + (ship.champion ? '/c' : '') + '/' + Math.round(st.top), st.top, st.gripMax);
    const ahead = Tr.idx(s + .4 * v), tgtV = Math.min(top, prof[ahead] * skillK * ship.topK);
    // a late brake now and then (lower skill): the first .25 s of a braking zone ignored
    const braking = prof[Tr.idx(s + .4 * v + 200)] < prof[Tr.idx(s)] * .92;
    if (braking && A.lateFor !== Tr.idx(s) >> 6) { A.lateFor = Tr.idx(s) >> 6; A.late = A.rng() < (1 - skill) * .15 ? .25 : 0; }
    A.late = Math.max(0, A.late - SN.DT);
    out.thrust = v < tgtV * 1.01 || A.late > 0 ? 1 : 0;
    if (v > tgtV * 1.05 && A.late <= 0) out.brakeL = out.brakeR = Math.min(1, (v / tgtV - 1.05) * 8);
    const kL = Tr.lineK[Tr.idx(s + .25 * v)], need = E.clamp((v * v * Math.abs(kL) - st.gripMax) / (.6 * st.gripMax), 0, 1) + E.clamp((Math.abs(e) - .12) / .28, 0, 1);
    if (need > 0) { const inside = Math.min(1, need); if (kL + e * .01 > 0) out.brakeR = Math.max(out.brakeR, inside); else out.brakeL = Math.max(out.brakeL, inside); }
    // pitch: nose down on descents, up over a gap when short of the far edge
    const slope = ship.F[2];
    if (ship.grounded) out.pitch = slope < -.04 ? .7 : slope > .06 ? -.2 : 0;
    else {
      const J = race.jumpAt(s);
      if (J && J.kind === 'gap') { const rest = Tr.dS(s, J.s1), tAir = rest / Math.max(200, v); out.pitch = tAir > .6 ? -.8 : 0; } else out.pitch = .3;
    }
    // 6. barrel rolls on long jumps
    if (!ship.grounded && ship.airT > .1 && ship.rollT <= 0 && o.rolls !== false && race.rules.weapons !== null) {
      const J = race.jumpAt(s), long = J && (J.kind === 'gap' || ship.h > 60);
      if (long && (o.alwaysRoll || (ship.energy > 50 && skill > .6 && (A.rollPlan ?? (A.rollPlan = A.rng() < .5 * aggr))))) { if (A.rng() < .5) out.shiftL = true; else out.shiftR = true; A.rollPlan = null; }
    }
    if (ship.grounded) A.rollPlan = undefined;
    // 5. weapons
    if (ship.weapon && o.weapons !== false && race.state === 'racing' && !(ship.control === 'ai' && SN.cheats.aiWeaponsOff)) AI.weapon(ship, race, A, aggr, out, o);
    // dodge an incoming lock with a side-shift (skilled pilots)
    if (skill > .7 && ship.lockedBy && race.t - ship.lockedBy.t < .1 && ship.lockedBy.full && A.rng() < .02 && ship.grounded) { if (ship.u > 0) out.shiftL = true; else out.shiftR = true; }
    return out;
  },
  weapon(ship, race, A, aggr, out, o = {}) {
    const W = race.weapons, id = ship.weapon, Tr = race.track, react = .35 / Math.max(.3, aggr);
    A.fireT += SN.DT;
    const fire = () => { if (A.fireT > react) { out.fire = true; A.fireT = 0; } };
    const low = ship.energy < 40, defensive = id === 'bulwark' || id === 'autopilot' || id === 'nitro';
    const near = W.targetAhead(ship, 1800, 6);
    switch (id) {
      case 'swarm': if (near && Math.abs(near.du) < 60) fire(); break;
      case 'cannon': if (near && Math.abs(near.du) < 60) out.fire = true; break;
      case 'seeker': if (ship.lockT >= .6) fire(); break;
      case 'rail': { const aim = W.railTrace(ship, true), t = W.targetAhead(ship, 3500, 4); if (ship.charge > 0 && ship.charge < .8) out.fire = true; else if (ship.charge >= .8) out.fire = false; else if (t && aim) out.fire = true; break; }
      case 'mine': { let behind = false; for (const b of race.ships) { if (b === ship || !W.targetable(b, ship)) continue; const ds = Tr.dS(b.s, ship.s); if (ds > 0 && ds < 1200) behind = true; } if (behind || (ship.place === 1 && (ship.s / Tr.L) > .7)) fire(); break; }
      case 'tremor': { let n = 0; for (const b of race.ships) { if (b === ship || !W.targetable(b, ship)) continue; const ds = Tr.dS(ship.s, b.s); if (ds > 0 && ds < 2500) n++; } if (n >= 2 || (n >= 1 && A.fireT > 6)) fire(); break; }
      case 'bulwark': if ((ship.lockedBy && race.t - ship.lockedBy.t < .1) || (ship.energy < 35 && near)) fire(); break;
      case 'autopilot': { let k = 0; for (let x = 0; x < 1200; x += 100) k = Math.max(k, Math.abs(Tr.lineK[Tr.idx(ship.s + x)])); if (k > 1 / (90 * U) || ship.energy < 40) fire(); break; }
      case 'nitro': { let k = 0; for (let x = 0; x < 400 * U; x += 200) k = Math.max(k, Math.abs(Tr.lineK[Tr.idx(ship.s + x)])); if (k < 1 / (600 * U)) fire(); break; }
      case 'siphon': { const t = W.nearestAhead(ship, 1400); if (t && ship.energy < 85) fire(); break; }
    }
    if (low && !o.eager && !out.fire && (defensive ? id !== 'bulwark' && id !== 'autopilot' : !near)) out.absorb = true;
    if (o.eager && A.fireT > 2.2 && !out.fire && !out.absorb) { out.fire = id !== 'rail' || ship.charge < .8; return; }   // (the attract: every weapon gets fired, to show it)
    if (A.fireT > 25 && !out.fire) { if (ship.energy < 90) out.absorb = true; else out.fire = id !== 'rail'; }
  }
};
})();
