// Craft physics (§3.2): track-space hover, yaw and airbrakes, grip and slide, side-shift, pitch, jumps and barrel rolls,
// walls, pads, the pit, energy, rescue; ship-ship collisions. Deterministic: only the controls, the seed and the tuning feed it
(() => {
const SN = globalThis.SN, V = SN.V, E = My3D2dge;
const H0 = 14, CAPTURE = 64, HALFW = 24, ZUP = [0, 0, 1];
const tmp = { f: { C: [0, 0, 0], F: [0, 0, 0], R: [0, 0, 0], U: [0, 0, 0] }, a: [0, 0, 0], b: [0, 0, 0], c: [0, 0, 0], loc: { s: 0, u: 0, h: 0 } };

function make(race, o) {
  const st = SN.craftStats(o.team, race.cls);
  const sh = {
    i: o.i, pilot: o.pilot, team: o.team, control: o.control || 'ai', player: o.player ?? -1, name: SN.PILOT[o.pilot] ? SN.PILOT[o.pilot].name : o.name || 'GHOST',
    st, P: [0, 0, 0], V: [0, 0, 0], F: [1, 0, 0], U: [0, 0, 1], s: 0, u: 0, h: H0, p: 0, lap: 0, nextSector: 1, lapStart: 0, lapTimes: [], bestLap: Infinity,
    grounded: true, airT: 0, energy: 100, boostT: 0, boostMul: 1, nitroT: 0, weapon: null, ammo: 0, charge: 0, lockT: 0, lockOn: null, shieldT: 0, autoT: 0,
    rollT: 0, rollDir: 0, rollAng: 0, rollFail: false, shiftCD: 0, shiftV: 0, stagger: 0, rescueT: 0, rescueFrom: null, rescueTo: null, elim: false, respawnT: 0, invT: 0,
    finished: false, finishTime: 0, place: o.i + 1, yawRate: 0, steerS: 0, pitchS: 0, brakeLS: 0, brakeRS: 0, padT: {}, lastGood: 0, stuckT: 0, revs: 0, stallT: 0,
    topMul: 1, wrongT: 0, wrongWay: false, points: 0, kills: 0, hits: 0, rolls: 0, walls: 0, pads: 0, lowT: 0, thrustOn: 0, aiState: null, ghost: !!o.ghost,
    stats: { hits: 0, kills: 0, wallHits: 0, pads: 0, rolls: 0, absorbs: 0 }, ctl: null, prevP: [0, 0, 0], prevF: [1, 0, 0], prevU: [0, 0, 1], prevRoll: 0, visRoll: 0, siphonT: 0, siphonTo: null, mineCD: 0, cannonN: 0, cannonT: 0, swarmT: 0,
    hitFlash: 0, lastHitBy: null, dnf: false, rescues: 0, skill: o.skill ?? 1, aggr: o.aggr ?? 1, launchBoost: 0
  };
  return sh;
}
/** place a craft on the track at (s, u), at rest (or at speed v), level with the surface */
function place(sh, race, s, u = 0, v = 0) {
  const T = race.track, f = T.frameAt(s, tmp.f);
  for (let c = 0; c < 3; c++) { sh.P[c] = f.C[c] + f.R[c] * u + f.U[c] * H0; sh.F[c] = f.F[c]; sh.U[c] = f.U[c]; sh.V[c] = f.F[c] * v; }
  sh.s = s; sh.u = u; sh.h = H0; sh.grounded = true; sh.airT = 0; sh.yawRate = 0; sh.shiftV = 0; sh.lastGood = s;
  V.copy(sh.P, sh.prevP); V.copy(sh.F, sh.prevF); V.copy(sh.U, sh.prevU);
}
const speed = sh => Math.hypot(sh.V[0], sh.V[1], sh.V[2]);
const fwdSpeed = sh => V.dot(sh.V, sh.F);

/** every damage goes through here (§3.2 step 10) */
function damage(sh, amount, cause, by, race) {
  if (sh.elim || sh.finished && race.mode !== 'snipeout' || amount <= 0) return 0;
  if (sh.shieldT > 0 || sh.invT > 0 || sh.rescueT > 0) return 0;
  if (sh.control === 'human' && race.cheats.god) return 0;
  if (race.attract) return 0;
  const k = amount * sh.st.dmgMul * (cause === 'wall' && race.mode === 'overclock' ? 1.5 : 1);
  sh.energy = Math.max(0, sh.energy - k); sh.hitFlash = .25;
  if (by && by !== sh) sh.lastHitBy = by;
  if (sh.energy <= 0) eliminate(sh, race, by && by !== sh ? by : sh.lastHitBy, cause);
  return k;
}
function eliminate(sh, race, by, cause) {
  if (sh.elim) return;
  sh.elim = true; sh.energy = 0; sh.weapon = null; sh.autoT = 0; sh.shieldT = 0; V.set(sh.V, 0, 0, 0);
  race.emit({ t: 'elim', ship: sh, by: by || null, weapon: cause });
  race.onElim(sh, by, cause);
}
function startRescue(sh, race, why) {
  if (sh.rescueT > 0 || sh.elim) return;
  const T = race.track; let s = SN.wrap(sh.lastGood + 20 * 16, T.L);
  for (let k = 0; k < 60 && (T.jumpAt(s) || T.kind[T.idx(s)]); k++) s = SN.wrap(s + 16 * 8, T.L);   // never on a jump
  sh.rescueFrom = V.copy(sh.P); sh.rescueTo = { s }; sh.rescueT = 2.5; sh.rescues++;
  V.set(sh.V, 0, 0, 0); sh.weapon = sh.weapon; sh.autoT = 0;
  const cost = race.mode === 'overclock' ? 20 : 10;
  if (!race.attract) { sh.energy = Math.max(1, sh.energy - cost); }
  race.emit({ t: 'rescue', ship: sh, why });
}

/** the physics step for one craft */
function step(sh, c, dt, race) {
  const T = race.track, K = SN.Tune.T, st = sh.st, f = tmp.f;
  V.copy(sh.P, sh.prevP); V.copy(sh.F, sh.prevF); V.copy(sh.U, sh.prevU); sh.prevRoll = sh.visRoll;
  if (sh.elim) { if (sh.respawnT > 0 && (sh.respawnT -= dt) <= 0) race.respawn(sh); return; }
  if (sh.rescueT > 0) {
    sh.rescueT -= dt; const k = Math.min(1, 1 - sh.rescueT / 2.5), to = T.point(sh.rescueTo.s, 0, H0 + 40 * (1 - k) * (1 - k) * 16);
    V.lerp(sh.rescueFrom, to, Math.min(1, k * 1.6), sh.P);
    if (sh.rescueT <= 0) { place(sh, race, sh.rescueTo.s, 0, 0); sh.p = race.progressOf(sh); sh.invT = 1; race.emit({ t: 'rescued', ship: sh }); }
    return;
  }
  const racing = race.state === 'racing' || race.state === 'finished';
  // timers
  sh.boostT = Math.max(0, sh.boostT - dt); if (sh.boostT <= 0) sh.boostMul = 1;
  sh.nitroT = Math.max(0, sh.nitroT - dt); sh.shieldT = Math.max(0, sh.shieldT - dt); sh.invT = Math.max(0, sh.invT - dt);
  sh.stagger = Math.max(0, sh.stagger - dt); sh.shiftCD = Math.max(0, sh.shiftCD - dt); sh.hitFlash = Math.max(0, sh.hitFlash - dt); sh.stallT = Math.max(0, sh.stallT - dt);
  // controls (keyboard steering ramps so it feels analog; the stick passes through)
  const steerIn = c.steer || 0;
  sh.steerS = c.analog ? steerIn : E.approach(sh.steerS, steerIn, (Math.sign(steerIn) !== Math.sign(sh.steerS) && sh.steerS !== 0 ? 10 : 6) * dt);
  sh.pitchS = E.approach(sh.pitchS, c.pitch || 0, 6 * dt);
  sh.brakeLS = c.brakeL || 0; sh.brakeRS = c.brakeR || 0;
  let thrust = racing && !sh.finished || race.state === 'finished' && sh.finished && sh.control !== 'human' ? (c.thrust ? 1 : 0) : 0;
  if (sh.finished && race.mode !== 'snipeout') thrust = sh.control === 'human' ? .5 : thrust;   // (a cool-down lap)
  if (sh.stallT > 0) thrust = 0;
  sh.thrustOn = thrust;
  const bL = sh.brakeLS, bR = sh.brakeRS, pitch = sh.pitchS * K.pitchEffect;
  const topBase = st.top * K.topSpeedMul * sh.topMul, boosting = sh.boostT > 0 || sh.nitroT > 0, bmul = Math.max(sh.boostMul, sh.nitroT > 0 ? 1.35 : 1);
  const top = boosting ? topBase * bmul : topBase, athr = st.athr * K.thrustMul * (boosting ? (sh.nitroT > 0 ? 2 : 1.8) : 1);
  let v = fwdSpeed(sh);
  // yaw (steering is ignored while staggered: it wobbles)
  const steer = sh.stagger > 0 ? Math.sin(race.t * 18 + sh.i) * .4 : sh.steerS;
  const kTop = Math.sqrt(st.top / 1440);
  const yawT = steer * K.steerRate * st.hk * (1 - .35 * Math.min(1, Math.abs(v) / topBase)) * (sh.grounded ? 1 : .7) + (bR - bL) * K.airbrakeYaw * kTop * (sh.grounded ? 1 : .5);
  sh.yawRate += (yawT - sh.yawRate) * Math.min(1, K.steerResponse * dt);
  V.rot(sh.F, sh.U, sh.yawRate * dt);
  // thrust and drag along F
  const cd = athr / (top * top) * K.dragMul * (1 - .03 * Math.max(0, pitch)), cdBase = st.athr * K.thrustMul / (topBase * topBase) * K.dragMul;
  let a = thrust * athr - (thrust ? cd : cdBase) * v * Math.abs(v) - (thrust ? 0 : 40 * Math.sign(v)) - (bL + bR) / 2 * K.airbrakeDrag * .35 * st.top * Math.sign(v);
  if (sh.grounded) a -= 300 * sh.F[2];
  if (!racing && race.state !== 'finished' && !race.rules.flying) a = -v * 4;   // (held on the grid)
  V.addS(sh.V, sh.F, a * dt);
  // grip and slide: the hover field's lateral grip, capped; the airbrake flap is a rudder that adds grip
  const R = V.norm(V.cross(sh.U, sh.F, tmp.a));
  if (sh.grounded) {
    const vl = V.dot(sh.V, R), gmax = st.gripMax * K.gripMaxMul * (1 + .6 * Math.max(bL, bR)), grip = st.grip * K.gripMul;
    const dv = Math.min(Math.abs(vl) * (1 - Math.exp(-grip * dt)), gmax * dt);
    V.addS(sh.V, R, -Math.sign(vl) * dv);
    // slip cap: the craft slides, never spins
    const vf = V.dot(sh.V, sh.F), vr = V.dot(sh.V, R), sp = Math.hypot(vf, vr);
    if (sp > 100) {
      const ang = Math.atan2(vr, vf), cap = K.slipMax * Math.PI / 180;
      if (Math.abs(ang) > cap && Math.abs(ang) < Math.PI / 2) V.rot(sh.F, sh.U, ang - Math.sign(ang) * cap);
      const scrub = K.scrubK * Math.abs(vr) * dt; if (sp > scrub) { V.addS(sh.V, sh.F, -scrub * vf / sp); V.addS(sh.V, R, -scrub * vr / sp); }
    }
  }
  // side-shift (ground) / barrel roll (air)
  const shiftDir = c.shiftL ? -1 : c.shiftR ? 1 : 0;
  if (shiftDir && sh.grounded && sh.shiftCD <= 0 && racing) { sh.shiftV = shiftDir * K.sideShiftSpeed; sh.shiftCD = .6; race.emit({ t: 'shift', ship: sh, dir: shiftDir }); }
  const rollReq = (shiftDir || c.flick) && !sh.grounded && sh.airT > .08 && sh.rollT <= 0 && racing;
  if (rollReq) {
    sh.rollT = .45; sh.rollDir = shiftDir || c.flick; sh.rollFail = false; sh.rolls++;
    if (!race.attract && !(sh.control === 'human' && race.cheats.god)) sh.energy = Math.max(1, sh.energy - K.rollCost);
    race.emit({ t: 'rollstart', ship: sh });
  }
  if (sh.rollT > 0) { sh.rollT -= dt; sh.rollAng = sh.rollDir * Math.PI * 2 * (1 - Math.max(0, sh.rollT) / .45); if (sh.rollT <= 0) { sh.rollT = 0; sh.rollAng = 0; sh.rollDone = (sh.rollDone || 0) + 1; } }
  // hover or air
  const loc = T.locate(sh.P, sh.s, tmp.loc), fr = T.frameAt(loc.s, f);
  const openSide = Math.abs(loc.u) > fr.hw + 32 && !T.wall(loc.s, Math.sign(loc.u));
  const surface = fr.kind !== 1 && !openSide;
  const N = fr.U, vN = V.dot(sh.V, N), h = loc.h;
  if (sh.grounded && (!surface || h > CAPTURE)) { sh.grounded = false; sh.airT = 0; race.emit({ t: 'launch', ship: sh }); }
  if (!sh.grounded && surface && h < H0 + 4 && vN <= 0 && sh.airT > .05) land(sh, race, vN);
  if (sh.grounded) {
    const Ht = K.hoverHeight - 4 * pitch + 1.2 * Math.sin(race.t * 2.2 + sh.i);
    const aN = Math.max(-K.magnetPull, Math.min(900, K.hoverStiffness * (Ht - h) - K.hoverDamping * V.dot(sh.V, N)));
    V.addS(sh.V, N, aN * dt);
    V.toward(sh.U, N, Math.min(1, 12 * dt));
    sh.airT = 0;
  } else {
    sh.V[2] -= K.airGravity * (1 + .45 * pitch) * dt;
    V.toward(sh.U, surface && h < 200 ? N : ZUP, Math.min(1, 2 * dt));
    sh.airT += dt;
  }
  // keep F in the plane of U
  const fu = V.dot(sh.F, sh.U); V.addS(sh.F, sh.U, -fu); V.norm(sh.F);
  // integrate
  V.addS(sh.P, sh.V, dt);
  if (sh.shiftV) { V.addS(sh.P, R, sh.shiftV * dt); sh.shiftV *= Math.exp(-K.shiftDecay * dt); if (Math.abs(sh.shiftV) < 5) sh.shiftV = 0; }
  T.locate(sh.P, loc.s, loc); T.frameAt(loc.s, f);
  // tunnel ceiling
  if ((fr.flags & 1) && loc.h > 12 * 16 - 24) { const dh = loc.h - (12 * 16 - 24); V.addS(sh.P, fr.U, -dh); const up = V.dot(sh.V, fr.U); if (up > 0) V.addS(sh.V, fr.U, -up); loc.h -= dh; }
  // the far face of a gap: arriving below a deck's edge is a crash into it
  if (!sh.grounded && fr.kind !== 1 && loc.h < -24 && sh.airT > .2 && T.kind[T.idx(SN.wrap(loc.s - T.ds * 3, T.L))] === 1) { damage(sh, 15, 'wall', null, race); race.emit({ t: 'wall', ship: sh, impact: 900, side: 0 }); startRescue(sh, race, 'face'); return; }
  // bottoming out
  if (surface && loc.h < 5 && fr.kind !== 1) { V.addS(sh.P, fr.U, 5 - loc.h); loc.h = 5; const vn = V.dot(sh.V, fr.U); if (vn < 0) V.addS(sh.V, fr.U, -vn); if (speed(sh) > 300) { V.scale(sh.V, .996, sh.V); race.emit({ t: 'scrape', ship: sh, k: .5 }); } }
  // walls
  const lim = fr.hw - HALFW, au = Math.abs(loc.u), side = Math.sign(loc.u);
  if (fr.kind !== 1 && au > lim && T.wall(loc.s, side)) {
    V.addS(sh.P, fr.R, -side * (au - lim)); loc.u = side * lim;
    const vn = V.dot(sh.V, fr.R) * side, sp = speed(sh);
    if (vn > 0) {
      V.addS(sh.V, fr.R, -side * vn * (1 + K.wallBounce * (sh.shieldT > 0 ? 1.5 : 1)));
      const vf = V.dot(sh.V, sh.F); if (vf > 0) V.addS(sh.V, sh.F, -Math.min(vf, K.wallFriction * vn));
      const nudge = Math.min(.5, .6 * vn / Math.max(1, sp)), tf = V.dot(sh.F, fr.R) * side; if (tf > 0) V.rot(sh.F, sh.U, -side * Math.min(nudge, Math.asin(Math.min(1, tf))));
      const dmg = K.wallDamage * Math.max(0, Math.min(12, (vn - 150) / 120));
      if (vn > 150) { sh.stats.wallHits++; race.emit({ t: 'wall', ship: sh, impact: vn, side }); damage(sh, dmg, 'wall', null, race); }
      else if (sp > 500) { race.emit({ t: 'scrape', ship: sh, k: 1, side }); damage(sh, 4 * dt, 'wall', null, race); }
    }
  }
  sh.s = loc.s; sh.u = loc.u; sh.h = loc.h;
  if (sh.grounded && Math.abs(loc.u) < fr.hw && fr.kind === 0) sh.lastGood = loc.s;
  // pads and the pit (grounded only)
  if (sh.grounded && racing && !sh.elim) {
    for (const pd of T.pads) {
      if (Math.abs(SN.wrapDiff(pd.s, sh.s, T.L)) > pd.hl || Math.abs(sh.u - pd.u) > pd.hwid + 8) continue;
      if (race.t - (sh.padT[pd.id] ?? -9) < .5) continue; sh.padT[pd.id] = race.t;
      if (pd.kind === 'speed' && race.rules.speedPads !== false) { sh.boostT = Math.min(2, Math.max(sh.boostT, K.padBoostTime)); sh.boostMul = Math.max(sh.boostMul, K.padBoost); sh.stats.pads++; race.emit({ t: 'pad', ship: sh, kind: 'speed' }); }
      if (pd.kind === 'weapon' && race.rules.weapons !== false) race.weapons.pickup(sh, pd);
    }
    if ((fr.flags & 2) && T.pit && loc.u * T.pit.side > fr.hw - T.pit.w - 8 && sh.energy < 100) { sh.energy = Math.min(100, sh.energy + K.pitRecharge * dt); sh.inPit = true; } else sh.inPit = false;
  } else sh.inPit = false;
  // falls, open edges, stuck: rescue
  const jmp = fr.kind === 1 ? T.jumpAt(sh.s) : null;
  if (jmp && sh.P[2] < jmp.zLip - 40 * 16) startRescue(sh, race, 'fall');
  else if (!surface && (loc.h < -96 || sh.airT > 1.6) && !jmp) startRescue(sh, race, 'edge');
  else if (loc.h < -60 * 16) startRescue(sh, race, 'fall');
  const sp = speed(sh);
  if (race.state === 'racing' && thrust && sp < 50 && !sh.finished) { sh.stuckT += dt; if (sh.stuckT > 3) { sh.stuckT = 0; startRescue(sh, race, 'stuck'); } } else sh.stuckT = 0;
  if (sh.energy < 25 && !sh.elim) sh.lowT += dt; else sh.lowT = 0;
  // the look (never fed back): roll for drawing
  sh.visRoll = Math.max(-.5, Math.min(.5, sh.yawRate * .28)) + sh.rollAng;
  if (!isFinite(sh.P[0]) || !isFinite(sh.V[0])) { place(sh, race, sh.lastGood, 0, 0); race.emit({ t: 'nan', ship: sh }); }
}
function land(sh, race, vN) {
  const K = SN.Tune.T, v = Math.max(1, speed(sh)), th = Math.atan(-vN / v) * 180 / Math.PI;
  sh.grounded = true;
  if (th > 25) {
    if (!race.attract) damage(sh, (th - 25) * .4, 'land', null, race);
    V.scale(sh.V, 1 - Math.min(.35, (th - 15) / 60), sh.V); race.emit({ t: 'land', ship: sh, angle: th, hard: true });
  } else race.emit({ t: 'land', ship: sh, angle: th, hard: false });
  if (sh.rollT > 0) {   // a roll still turning: botched
    sh.rollT = 0; sh.rollAng = 0; V.scale(sh.V, .75, sh.V); sh.stagger = .5; if (!race.attract) damage(sh, 5, 'roll', null, race);
    race.emit({ t: 'roll', ship: sh, ok: false });
  } else if (sh.rollDone) {
    sh.boostT = Math.max(sh.boostT, 1.2 * sh.rollDone); sh.boostMul = Math.max(sh.boostMul, K.rollBoost); sh.stats.rolls += sh.rollDone;
    race.emit({ t: 'roll', ship: sh, ok: true, n: sh.rollDone });
  }
  sh.rollDone = 0;
}

/** ship-ship collisions (after every craft moved; pairs in index order) */
function collide(race) {
  const S = race.ships, n = S.length, a = tmp.a, b = tmp.b, nrm = tmp.c;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const A = S[i], B = S[j];
    if (A.elim || B.elim || A.ghost || B.ghost || A.rescueT > 0 || B.rescueT > 0 || race.cheats.ghostAI && (A.control === 'ai' || B.control === 'ai')) continue;
    if (Math.abs(A.P[0] - B.P[0]) > 120 || Math.abs(A.P[1] - B.P[1]) > 120 || Math.abs(A.P[2] - B.P[2]) > 80) continue;
    let best = null;
    for (const sa of [-26, 26]) for (const sb of [-26, 26]) {
      V.addS(V.copy(A.P, a), A.F, sa); V.addS(V.copy(B.P, b), B.F, sb); V.sub(b, a, nrm); const d = V.len(nrm);
      if (d < 44 && (!best || d < best.d)) best = { d, n: V.scale(nrm, 1 / (d || 1), [0, 0, 0]) };
    }
    if (!best) continue;
    const mA = A.st.mass, mB = B.st.mass, pen = 44 - best.d, k = pen / (1 / mA + 1 / mB);
    V.addS(A.P, best.n, -k / mA); V.addS(B.P, best.n, k / mB);
    const vn = V.dot(V.sub(B.V, A.V, a), best.n);
    if (vn < 0) {
      const jmp = -(1 + .3) * vn / (1 / mA + 1 / mB);
      V.addS(A.V, best.n, -jmp / mA); V.addS(B.V, best.n, jmp / mB);
      if (-vn > 120) { race.emit({ t: 'bump', ship: A, other: B, k: -vn }); damage(A, .004 * -vn, 'bump', B, race); damage(B, .004 * -vn, 'bump', A, race); }
    }
  }
}
SN.Ship = { make, place, step, damage, eliminate, startRescue, collide, speed, fwdSpeed, H0 };
})();
