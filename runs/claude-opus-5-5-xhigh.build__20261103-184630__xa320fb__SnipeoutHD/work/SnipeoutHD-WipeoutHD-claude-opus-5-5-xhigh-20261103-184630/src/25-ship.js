// SNIPEOUT HD: a craft and its physics step (PLAN 3.2). World position and velocity in engine units, the track-space
// coordinates (s, u, h) from the track's local lookup, a hover spring on the deck, gravity in the air, grip-limited
// cornering (the airbrakes are the cornering tool), side-shift, barrel rolls, walls, pads, the pit lane, energy and
// the rescue drone. Deterministic: the same controls give the same craft.
(() => {
const E = My3D2dge, SN = globalThis.SN, V = SN.v, U = 16;
const H0 = () => SN.Tune.T.hoverHeight, CAPTURE = 64, HALF_W = 24;
const tmp = [0, 0, 0], tmp2 = [0, 0, 0];

class Ship {
  constructor(o) {
    Object.assign(this, { id: o.id, idx: o.idx, pilot: o.pilot, team: o.team, control: o.control || 'ai', pi: o.pi ?? -1, name: SN.PILOTS[o.pilot].name, champion: !!o.champion });
    this.P = [0, 0, 0]; this.V = [0, 0, 0]; this.F = [1, 0, 0]; this.U = [0, 0, 1]; this.R = [0, 1, 0];
    this.s = 0; this.u = 0; this.h = 14; this.p = 0; this.lap = 0; this.sector = 0; this.lapT0 = 0; this.lastLap = 0; this.bestLap = Infinity; this.laps = [];
    this.grounded = true; this.airT = 0; this.yawRate = 0; this.energy = 100; this.boostT = 0; this.boostMul = 1; this.thrK = 1;
    this.weapon = null; this.ammo = 0; this.charge = 0; this.lockT = 0; this.lockTarget = null; this.shieldT = 0; this.autoT = 0; this.nitroT = 0; this.siphon = null;
    this.rollT = 0; this.rollDir = 0; this.rollAng = 0; this.rolls = 0; this.shiftCD = 0; this.vShift = 0; this.stagger = 0; this.wobble = 0;
    this.rescue = null; this.elim = false; this.respawnT = 0; this.invT = 0; this.finished = false; this.finishT = 0; this.place = 0; this.points = 0;
    this.sGood = 0; this.stuckT = 0; this.wrongT = 0; this.wrong = false; this.belowDeck = false; this.revs = 0; this.stallT = 0; this.scrapeT = 0;
    this.padCD = {}; this.dnf = false; this.pitting = false; this.flash = 0; this.lowWarn = 0; this.topK = 1; this.ghost = false; this.hidden = false;
    this.stats = { hits: 0, kills: 0, walls: 0, pads: 0, rolls: 0, absorbs: 0, fired: 0, damage: 0, rescues: 0, pickups: 0 };
    this.prev = { P: [0, 0, 0], F: [1, 0, 0], U: [0, 0, 1], roll: 0, yaw: 0 };
    this.vis = { flap: [0, 0], glow: 0, bank: 0, shieldHit: 0 };
    this.lastPitch = 0; this.lastBrake = [0, 0]; this.lastThrust = 0; this.lastSteer = 0; this.ctl = null;
  }
  get speed() { return Math.hypot(this.V[0], this.V[1], this.V[2]); }
  get kmh() { return this.speed * SN.KMH; }
  /** put the craft on the track at (s, u), resting on the deck, facing along the track, at speed v */
  putOn(T, s, u = 0, v = 0) {
    const fr = T.frameAt(s), srf = T.surface(s, u);
    V.addS(this.P, srf.P, srf.N, H0()); V.copy(this.F, fr.F); V.copy(this.U, srf.N); V.norm(this.R, V.cross(this.R, this.U, this.F));
    V.norm(this.F, V.cross(this.F, this.R, this.U));
    V.scale(this.V, this.F, v);
    this.s = ((s % T.L) + T.L) % T.L; this.u = u; this.h = H0(); this.sGood = this.s; this.grounded = true; this.airT = 0; this.yawRate = 0; this.vShift = 0;
    this.rollT = 0; this.rollAng = 0; this.belowDeck = false; this.rescue = null;
    this.savePrev();
    return this;
  }
  savePrev() { V.copy(this.prev.P, this.P); V.copy(this.prev.F, this.F); V.copy(this.prev.U, this.U); this.prev.roll = this.rollAng; }
}
SN.Ship = Ship;

/** every damage goes through here: dmgMul, bulwark, god mode, invulnerability; at 0 the craft is eliminated */
Ship.damage = (ship, amount, cause, by, race) => {
  if (!(amount > 0) || ship.elim || ship.finished && cause !== 'test') return 0;
  if (ship.shieldT > 0 || ship.invT > 0 || ship.rescue) return 0;
  if (SN.cheats.god && ship.control === 'human') return 0;
  if (race && race.rules.infiniteEnergy && race.rules.infiniteEnergy(ship)) return 0;
  // a human pilot takes the difficulty's share (Easy .55, Normal .75, Hard 1)
  const hurt = ship.control === 'human' && race ? ((SN.DIFFICULTY[race.difficulty] || SN.DIFFICULTY.Normal).hurt || 1) : 1;
  const d = amount * ship.st.dmgMul * hurt;
  ship.energy = Math.max(0, ship.energy - d); ship.stats.damage += d; ship.flash = .25; ship.vis.shieldHit = .4;
  if (ship.energy <= 0 && race) race.eliminate(ship, by, cause);
  return d;
};

/** the physics step for one craft (PLAN 3.2, in order). c: ShipControls; race: its race (track, events, rules) */
Ship.step = (ship, c, dt, race) => {
  const T = SN.Tune.T, st = ship.st, Tr = race.track, ev = race.events;
  ship.savePrev();
  ship.flash = Math.max(0, ship.flash - dt); ship.vis.shieldHit = Math.max(0, ship.vis.shieldHit - dt);
  if (ship.rescue) return rescueStep(ship, dt, race);
  if (ship.elim) return;
  ship.ctl = c;
  const Pv = ship.P, Vv = ship.V, F = ship.F, Uv = ship.U, R = ship.R;
  ship.shiftCD = Math.max(0, ship.shiftCD - dt); ship.stagger = Math.max(0, ship.stagger - dt); ship.invT = Math.max(0, ship.invT - dt);
  if (ship.boostT > 0) { ship.boostT -= dt; if (ship.boostT <= 0) { ship.boostT = 0; ship.boostMul = 1; ship.thrK = 1; } }
  ship.stallT = Math.max(0, ship.stallT - dt);
  const top = st.top * ship.topK, v = Math.hypot(Vv[0], Vv[1], Vv[2]);
  let steer = c.steer, thrust = ship.stallT > 0 ? 0 : c.thrust, bL = c.brakeL, bR = c.brakeR, pitch = c.pitch * T.pitchEffect;
  if (race.rules.autoThrust) thrust = 1;
  ship.lastPitch = c.pitch; ship.lastBrake[0] = bL; ship.lastBrake[1] = bR; ship.lastThrust = thrust; ship.lastSteer = steer;
  // 2. yaw
  let yawT = steer * st.steer * (1 - .35 * Math.min(1, v / top)) + (bR - bL) * st.airbrakeYaw;
  if (ship.stagger > 0) { ship.wobble += dt * 14; yawT = Math.sin(ship.wobble) * .4; }
  if (!ship.grounded) yawT *= .6;
  ship.yawRate += (yawT - ship.yawRate) * (1 - Math.exp(-T.steerResponse * dt));
  V.rot(F, F, Uv, ship.yawRate * dt);
  V.norm(R, V.cross(R, Uv, F)); V.norm(F, V.cross(F, R, Uv));
  // 3. thrust and drag along F
  const boosting = ship.boostT > 0, vf = V.dot(Vv, F);
  const topE = boosting ? top * ship.boostMul : top, thrK = boosting ? 1.8 * ship.thrK : 1, thr = boosting ? Math.max(thrust, 1) : thrust;
  const cd = st.athr * thrK / (topE * topE) * T.dragMul * (1 - .03 * Math.max(0, pitch));
  let af = thr * st.athr * thrK - cd * vf * Math.abs(vf);
  const brake = (bL + bR) / 2 * T.airbrakeDrag * .35 * top;
  const slow = (thrust ? 0 : 40) + brake;
  if (ship.grounded) af -= 300 * F[2];
  if (vf > 0) af -= Math.min(slow, vf / dt + af); else if (vf < 0) af += Math.min(slow, -vf / dt);
  V.addS(Vv, Vv, F, af * dt);
  // 4. grip and slide (only on the deck; in the air the craft keeps its momentum)
  if (ship.grounded) {
    const vl = V.dot(Vv, R), gmax = st.gripMax * (1 + .6 * Math.max(bL, bR));
    const dv = Math.min(Math.abs(vl) * (1 - Math.exp(-st.grip * dt)), gmax * dt);
    V.addS(Vv, Vv, R, -Math.sign(vl) * dv);
    // scrub: sliding costs speed
    const vl2 = V.dot(Vv, R), sp = Math.hypot(Vv[0], Vv[1], Vv[2]);
    if (sp > 1) { const k = Math.max(0, sp - T.scrubK * Math.abs(vl2) * dt) / sp; V.scale(Vv, Vv, k); }
    // the slip cap: the nose never more than slipMax from where the craft goes
    const vF = V.dot(Vv, F), vL = V.dot(Vv, R), ang = Math.atan2(vL, Math.max(1e-6, vF)), cap = T.slipMax * Math.PI / 180;
    if (vF > 200 && Math.abs(ang) > cap) { V.rot(F, F, Uv, ang - Math.sign(ang) * cap); V.norm(R, V.cross(R, Uv, F)); V.norm(F, V.cross(F, R, Uv)); ship.yawRate *= .5; }
  }
  // side-shift (a press, on the deck): a lateral kick outside the grip cap
  const shiftDir = c.shiftL ? -1 : c.shiftR ? 1 : 0;
  if (shiftDir && ship.grounded && ship.shiftCD <= 0) { ship.vShift = shiftDir * T.sideShiftSpeed; ship.shiftCD = .6; ev.push({ t: 'sideshift', ship, dir: shiftDir }); ship.lastShiftT = race.t; }
  ship.vShift *= Math.exp(-T.shiftDecay * dt);
  // 5. hover on the deck, or fall
  const srf = Tr.surface(ship.s, ship.u, ship._srf), hw = srf.hw; ship._srf = srf;
  const offEdge = (ship.u > hw + 32 && !srf.wallR) || (ship.u < -hw - 32 && !srf.wallL);
  const hasSurf = srf.kind !== 'gap' && !ship.belowDeck && !offEdge;
  const wasGrounded = ship.grounded;
  const N = srf.N;
  const capture = wasGrounded ? CAPTURE : H0() + 4;   // on the deck it holds on to 4 m; in the air it lands near the hover height
  if (hasSurf && ship.h < capture) {
    if (!wasGrounded) land(ship, N, race);
    ship.grounded = true; ship.airT = 0;
    const vN = V.dot(Vv, N), bob = 1.2 * Math.sin(race.t * 2.2 + ship.idx), Ht = H0() - 4 * c.pitch + bob;
    const aN = E.clamp(T.hoverStiffness * (Ht - ship.h) - T.hoverDamping * vN, -T.magnetPull, 4000);
    V.addS(Vv, Vv, N, aN * dt);
    V.toward(Uv, Uv, N, 1 - Math.exp(-12 * dt));
  } else {
    ship.grounded = false; ship.airT += dt;
    Vv[2] -= T.airGravity * (1 + .45 * pitch) * dt;
    const target = hasSurf && ship.h < 200 ? N : SN.ZUP;
    V.toward(Uv, Uv, target, 1 - Math.exp(-2 * dt));
  }
  V.norm(R, V.cross(R, Uv, F)); V.norm(F, V.cross(F, R, Uv));
  // 6. integrate, then where it is on the track
  V.addS(Pv, Pv, Vv, dt); V.addS(Pv, Pv, R, ship.vShift * dt);
  const sOld = ship.s, loc = Tr.locate(Pv, ship.s, ship._loc || (ship._loc = { s: 0, u: 0, h: 0 }));
  ship.s = loc.s; ship.u = loc.u; ship.h = loc.h; ship.p += Tr.dS(sOld, ship.s);
  // crossing from a gap onto a deck from below: it hits the far wall and falls
  const srf2 = Tr.surface(ship.s, ship.u, ship._srf2); ship._srf2 = srf2;
  if (srf.kind === 'gap' && srf2.kind !== 'gap' && ship.h < -8) ship.belowDeck = true;
  // bottoming out
  if (srf2.kind !== 'gap' && !ship.belowDeck && ship.grounded && ship.h < 5) {
    V.addS(Pv, Pv, srf2.N, 5 - ship.h); ship.h = 5;
    const vN = V.dot(Vv, srf2.N); if (vN < 0) V.addS(Vv, Vv, srf2.N, -vN);
    V.scale(Vv, Vv, .996); ev.push({ t: 'scrape', ship, k: .4, bottom: true });
  }
  // 7. the barrel roll: a side-shift press or a steer flick in the air
  if (!ship.grounded && ship.airT > .08 && ship.rollT <= 0 && (shiftDir || c.flick)) {
    ship.rollT = .45; ship.rollDir = shiftDir || c.flick; ship.rollStart = ship.rollAng; ship.rolls++;
    if (!(SN.cheats.god && ship.control === 'human') && !(race.rules.infiniteEnergy && race.rules.infiniteEnergy(ship))) ship.energy = Math.max(1, ship.energy - T.rollCost);
    ev.push({ t: 'rollstart', ship, dir: ship.rollDir });
  }
  if (ship.rollT > 0) { ship.rollT = Math.max(0, ship.rollT - dt); ship.rollAng = ship.rollStart + ship.rollDir * Math.PI * 2 * (1 - ship.rollT / .45); if (ship.rollT === 0) { ship.rollAng = 0; ship.rollDone = (ship.rollDone || 0) + 1; } }
  // 8. walls
  if (srf2.kind !== 'gap' && !ship.belowDeck) wallStep(ship, srf2, race, dt);
  // 9. pads and the pit (on the deck)
  if (ship.grounded && srf2.kind !== 'gap') {
    if (Math.abs(ship.u) < srf2.hw) ship.sGood = ship.s;
    padStep(ship, Tr, race, dt);
    const pit = Tr.pit; ship.pitting = false;
    if (pit && srf2.pit && (pit.side > 0 ? ship.u > srf2.hw - pit.w - HALF_W : ship.u < -srf2.hw + pit.w + HALF_W)) {
      ship.pitting = true; if (ship.energy < 100) ship.energy = Math.min(100, ship.energy + T.pitRecharge * dt);
    }
  } else ship.pitting = false;
  // 10. energy warnings
  if (ship.energy < 25 && ship.control === 'human') { ship.lowWarn -= dt; if (ship.lowWarn <= 0) { ship.lowWarn = .8; ev.push({ t: 'lowshield', ship }); } }
  // 11. rescue: a fall, an open edge, or stuck
  const killZ = ship.belowDeck || srf.kind === 'gap' ? (race.jumpLipZ(ship.s) - 40 * U) : (srf2.P[2] - 60 * U);
  if (offEdge && ship.h < -6 * U) startRescue(ship, race, 'edge');
  else if (Pv[2] < killZ) startRescue(ship, race, 'fall');
  const sp = Math.hypot(Vv[0], Vv[1], Vv[2]);
  if (race.state === 'racing' && thrust && sp < 50 && !race.rules.noStuck) { ship.stuckT += dt; if (ship.stuckT > 3) startRescue(ship, race, 'stuck'); } else ship.stuckT = 0;
  // the visual roll from the yaw rate (drawing only)
  ship.vis.bank = E.clamp(ship.yawRate * .28, -.5, .5);
  ship.vis.flap[0] += (bL - ship.vis.flap[0]) * Math.min(1, dt * 14); ship.vis.flap[1] += (bR - ship.vis.flap[1]) * Math.min(1, dt * 14);
  ship.vis.glow += ((thrust ? 1 : .25) + (boosting ? .6 : 0) - ship.vis.glow) * Math.min(1, dt * 8);
  if (!isFinite(Pv[0] + Pv[1] + Pv[2] + Vv[0] + Vv[1] + Vv[2])) { ship.putOn(Tr, ship.sGood, 0, 0); ev.push({ t: 'nan', ship }); }
};

function land(ship, N, race) {
  const T = SN.Tune.T, Vv = ship.V, v = Math.hypot(Vv[0], Vv[1], Vv[2]) || 1, vN = -V.dot(Vv, N), th = Math.atan2(Math.max(0, vN), v) * 180 / Math.PI;
  const ev = race.events;
  if (th > 25) {
    Ship.damage(ship, (th - 25) * .4, 'landing', null, race);
    V.scale(Vv, Vv, 1 - Math.min(.35, (th - 15) / 60));
    ev.push({ t: 'land', ship, angle: th, hard: true });
  } else ev.push({ t: 'land', ship, angle: th, hard: false });
  if (ship.rollT > 0) {   // still turning: botched
    ship.rollT = 0; ship.rollAng = 0; V.scale(Vv, Vv, .75); Ship.damage(ship, 5, 'roll', null, race); ship.stagger = .5;
    ev.push({ t: 'roll', ship, ok: false }); ship.rollDone = 0;
  } else if (ship.rollDone > 0) {
    ship.boostT = Math.max(ship.boostT, 1.2); ship.boostMul = Math.max(ship.boostMul, T.rollBoost); ship.stats.rolls += ship.rollDone;
    ev.push({ t: 'roll', ship, ok: true, n: ship.rollDone }); ship.rollDone = 0;
  }
}

function wallStep(ship, srf, race, dt) {
  const T = SN.Tune.T, lim = srf.hw - HALF_W, u = ship.u, side = u > 0 ? 1 : -1;
  const wall = side > 0 ? srf.wallR : srf.wallL;
  if (!wall || Math.abs(u) <= lim) { ship.scrapeT = 0; return; }
  const R = srf.fr.R, Vv = ship.V, F = ship.F, push = Math.abs(u) - lim;
  V.addS(ship.P, ship.P, R, -side * push); ship.u -= side * push;
  const vn = V.dot(Vv, R) * side;   // into the wall
  if (vn > 0) V.addS(Vv, Vv, R, -side * vn * (1 + T.wallBounce));
  const v = Math.hypot(Vv[0], Vv[1], Vv[2]);
  if (vn > 0 && v > 1) { const k = Math.max(0, v - Math.min(v, T.wallFriction * vn)) / v; V.scale(Vv, Vv, k); }
  // the nose turns toward the track's way: no grinding nose-first
  const tf = srf.fr.F, cr = (F[0] * tf[1] - F[1] * tf[0]) * (V.dot(F, tf) >= 0 ? 1 : -1), nudge = Math.min(.5, .6 * Math.max(0, vn) / Math.max(1, v));
  if (nudge > 0) { V.rot(F, F, ship.U, Math.sign(cr) * Math.min(Math.abs(Math.asin(E.clamp(cr, -1, 1))), nudge)); V.norm(ship.R, V.cross(ship.R, ship.U, F)); V.norm(F, V.cross(F, ship.R, ship.U)); ship.yawRate *= .5; }
  const ev = race.events, mul = race.rules.wallMul || 1;
  if (vn > 150) {
    const dmg = T.wallDamage * E.clamp((vn - 150) / 120, 0, 12) * mul;
    if (ship.shieldT <= 0) Ship.damage(ship, dmg, 'wall', null, race);
    ship.stats.walls++; ev.push({ t: 'wall', ship, impact: vn, side, x: ship.P[0] + R[0] * side * 24, y: ship.P[1] + R[1] * side * 24, z: ship.P[2] });
  } else {
    ship.scrapeT += dt;
    if (v > 500 && ship.shieldT <= 0) Ship.damage(ship, 4 * dt * mul, 'scrape', null, race);
    if (v > 300) ev.push({ t: 'scrape', ship, k: Math.min(1, v / 2000), side });
  }
}

function padStep(ship, Tr, race, dt) {
  const T = SN.Tune.T;
  for (const p of Tr.pads) {
    if (p.kind === 'speed' && race.rules.noSpeedPads) continue;
    if (p.kind === 'weapon' && !race.rules.weapons) continue;
    const ds = Tr.dS(p.s, ship.s); if (Math.abs(ds) > p.hl || Math.abs(ship.u - p.u) > p.hw) continue;
    if ((ship.padCD[p.id] || -9) > race.t - .5) continue;
    ship.padCD[p.id] = race.t;
    if (p.kind === 'speed') {
      ship.boostT = Math.min(2, Math.max(ship.boostT, T.padBoostTime)); ship.boostMul = Math.max(ship.boostMul, T.padBoost);
      V.addS(ship.V, ship.V, ship.F, ship.st.top * .04); ship.stats.pads++;
      race.events.push({ t: 'pad', ship, kind: 'speed' });
    } else if (!ship.weapon && ship.shieldT <= 0 && ship.autoT <= 0) {
      race.weapons.give(ship, race.weapons.roll(ship), true);
    }
  }
}

function startRescue(ship, race, why) {
  if (ship.rescue || ship.elim) return;
  const Tr = race.track; let toS = (ship.sGood + 20 * U) % Tr.L;
  // never set down on a gap's approach (no run-up: it would fall again): past the far edge instead
  for (const J of Tr.jumps) if (J.kind === 'gap') { const a = Tr.dS(J.s0, toS); if (a > -350 * U && Tr.dS(toS, J.s1) > -10 * U) toS = (J.s1 + 25 * U) % Tr.L; }
  ship.rescue = { t: 0, dur: race.rules.fastRescue ? 1.2 : 2.5, from: ship.P.slice(), toS, why };
  ship.stats.rescues++; ship.rollT = 0; ship.rollAng = 0; ship.vShift = 0;
  race.events.push({ t: 'rescue', ship, why });
}
Ship.startRescue = startRescue;
function rescueStep(ship, dt, race) {
  const Rs = ship.rescue, Tr = race.track; Rs.t += dt;
  const k = Math.min(1, Rs.t / Rs.dur), e = SN.smooth01(k);
  const to = Tr.point(Rs.toS, 0, H0() + (1 - e) * 120), fr = Tr.frameAt(Rs.toS);
  V.lerp(ship.P, Rs.from, to, e); ship.P[2] += Math.sin(k * Math.PI) * 300;
  V.toward(ship.F, ship.F, fr.F, Math.min(1, dt * 4)); V.scale(ship.V, ship.V, .9);
  if (k >= 1) {
    const sOld = ship.s; ship.putOn(Tr, Rs.toS, 0, 0); ship.p += Tr.dS(sOld, Rs.toS);
    if (!(SN.cheats.god && ship.control === 'human') && !(race.rules.infiniteEnergy && race.rules.infiniteEnergy(ship))) ship.energy = Math.max(1, ship.energy - (race.rules.rescueCost || 10));
    ship.invT = 1; ship.autoT = 0;
    race.events.push({ t: 'rescued', ship });
  }
}
})();
