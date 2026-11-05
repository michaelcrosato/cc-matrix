// AI pilots (§3.5): the racing line and speed profile, PD steering, airbrakes for the grip a corner needs, pitch, avoidance,
// pads, the pit, weapons, barrel rolls, mistakes. The same controller flies AUTOPILOT, the attract mode and the test bots
(() => {
const SN = globalThis.SN, V = SN.V;
const tmpQ = [0, 0, 0], tmpD = [0, 0, 0], tmpR = [0, 0, 0];

function state(sh, race, key = 'aiState') {
  return sh[key] || (sh[key] = { rnd: race.rng((key === 'aiState' ? 'ai:' : key + ':') + sh.i), eprev: 0, avoid: 0, avoidT: 0, noise: 0, noiseT: 0, late: 0, lastK: 0, fireHold: 0, decideT: 0, dodgeT: 0, rollWant: 0, flickT: 0 });
}
/** ShipControls for a craft from the line and the race (o: { skill, weapons, rolls, cheat }) */
function controls(sh, race, o = {}, out = {}) {
  const T = race.track, A = state(sh, race, o.stateKey), K = SN.Tune.T, st = sh.st;
  const skill = Math.min(1.08, (o.skill ?? sh.skill) * (o.skill === undefined && sh.control === 'ai' ? K.aiSkill : 1)), skillK = .86 + .14 * Math.min(1, skill);
  const v = Math.max(0, SN.Ship.fwdSpeed(sh)), dt = SN.DT;
  for (const k of ['steer', 'pitch', 'thrust', 'brakeL', 'brakeR', 'fire', 'firePressed', 'fireReleased', 'absorb', 'shiftL', 'shiftR', 'flick']) out[k] = 0;
  out.analog = true;
  if (sh.elim || sh.rescueT > 0) return out;
  // look-ahead target on the line (+ avoidance, pads, pit)
  const sL = sh.s + .55 * v + 300;
  let uT = T.line(sL);
  A.avoidT -= dt; if (A.avoidT <= 0) A.avoid *= Math.exp(-dt / .6);
  for (const other of race.ships) {
    if (other === sh || other.elim || other.ghost) continue;
    const ds = SN.wrapDiff(sh.s, other.s, T.L), du = other.u - sh.u;
    if (ds > 40 && ds < 900 && Math.abs(du) < 70 && SN.Ship.fwdSpeed(other) < v) { const fr = T.frameAt(other.s), room = fr.hw - Math.abs(other.u); A.avoid = (other.u > 0 ? -1 : 1) * 110 * (room > 120 || other.u === 0 ? 1 : .6); A.avoidT = .6; }
  }
  for (const m of race.weapons.mines) { const ds = SN.wrapDiff(sh.s, m.s, T.L); if (m.armed && ds > 0 && ds < 1200 && Math.abs(m.u - (uT + A.avoid)) < 60) A.avoid += (m.u > uT ? -1 : 1) * 80 * dt * 6; }
  uT += A.avoid;
  const padBiasOn = skill > .8;
  if (padBiasOn) for (const pd of (sh.weapon ? T.speedPads : T.pads)) { const ds = SN.wrapDiff(sh.s, pd.s, T.L); if (ds > 0 && ds < 1500 && Math.abs(pd.u - T.line(pd.s)) < 120) { const w = (1 - ds / 1500) * (pd.kind === 'speed' ? .8 : .6); uT += (pd.u - uT) * w; break; } }
  if (T.pit && sh.energy < 45 && race.mode !== 'overclock') { const ds = SN.wrapDiff(sh.s, T.pit.a, T.L); if ((ds > 0 && ds < 2500) || T.inRange(sh.s, T.pit.a, T.pit.b)) { const fr = T.frameAt(sL); uT = T.pit.side * (fr.hw - T.pit.w / 2 - 10); } }
  if (T.jumpAt(sL) || T.jumpAt(sh.s + 400)) uT *= .3;
  if (o.uAt) { const w = o.uAt(sL); if (w !== null && w !== undefined) uT = w; }
  const fr = T.frameAt(sL), lim = fr.hw - 40; uT = Math.max(-lim, Math.min(lim, uT));
  T.point(sL, uT, 0, tmpQ);
  V.sub(tmpQ, sh.P, tmpD);
  V.cross(sh.U, sh.F, tmpR); V.norm(tmpR);
  const e = Math.atan2(V.dot(tmpD, tmpR), V.dot(tmpD, sh.F));
  A.noiseT -= dt; if (A.noiseT <= 0) { A.noise = (A.rnd() * 2 - 1) * .05 * (1 - Math.min(1, skill)); A.noiseT = .4 + A.rnd() * .5; }
  const de = (e - A.eprev) / dt; A.eprev = e;
  out.steer = Math.max(-1, Math.min(1, 2.2 * e + .25 * de * .1 + A.noise));
  // speed: the line's target speed, scaled to this craft and skill
  const cls = race.cls, prof = T.vline(sh.s + .4 * v, cls), scale = st.top * K.topSpeedMul * sh.topMul / (SN.CLASS[cls].top * 1.012);
  let vT = prof * skillK * Math.min(1.08, scale);
  // mistakes: now and then brake late into a corner
  const kNow = Math.abs(T.curvL(sh.s + .3 * v));
  if (kNow > 1 / (120 * 16) && A.lastK <= 1 / (120 * 16) && A.rnd() < (1 - Math.min(1, skill)) * .15) A.late = .25;
  A.lastK = kNow; if (A.late > 0) { A.late -= dt; vT *= 1.12; }
  out.thrust = v < vT * 1.01 ? 1 : 0;
  if (v > vT * 1.05) { out.brakeL = out.brakeR = Math.min(1, (v / vT - 1.05) * 8); }
  // the inside airbrake: exactly the extra grip the corner needs, plus a little when far off line
  const kL = T.curvL(sh.s + .25 * v), gm = st.gripMax * K.gripMaxMul, need = Math.max(0, Math.min(1, (v * v * Math.abs(kL) - gm) / (.6 * gm))) + Math.max(0, Math.min(1, (Math.abs(e) - .12) / .28));
  if (need > 0) { const side = Math.sign(kL || e); if (side > 0) out.brakeR = Math.max(out.brakeR, Math.min(1, need)); else out.brakeL = Math.max(out.brakeL, Math.min(1, need)); }
  // pitch: nose down on descents, up over gaps and crests when short
  const slope = sh.F[2];
  if (sh.grounded) out.pitch = slope < -.04 ? .8 : 0;
  else { const j = T.jumpAt(sh.s); out.pitch = j && j.kind === 'gap' ? -.6 : .3; }
  // jumps: barrel rolls when there's air to spare
  if (!sh.grounded && sh.airT > .1 && sh.rollT <= 0 && !sh.rollDone && (o.rolls ?? true)) {
    const j = T.jumpAt(sh.s) || T.jumpAt(sh.s - 200);
    const want = o.cheat || race.attract || (sh.energy > 50 && skill > .6 && A.rnd() < .5 * sh.aggr * dt * 8);
    if (j && want && sh.P[2] - j.z1 > 5 * 16) out.flick = A.rnd() < .5 ? -1 : 1;
  }
  // dodge incoming fire
  if (skill > .7 && sh.grounded) {
    A.dodgeT -= dt;
    if (A.dodgeT <= 0) for (const p of race.weapons.proj) { if (p.owner === sh || p.target && p.target !== sh) continue; const ds = SN.wrapDiff(p.s, sh.s, T.L); if (ds > 0 && ds < 500 && Math.abs(p.u - sh.u) < 50) { out[p.u > sh.u ? 'shiftL' : 'shiftR'] = 1; A.dodgeT = 1.2; break; } }
  }
  if (o.weapons !== false && !(race.cheats.aiWeaponsOff && sh.control === 'ai')) weaponUse(sh, race, A, out, skill);
  return out;
}
/** whether and how to use the held weapon (§3.5.5) */
function weaponUse(sh, race, A, out, skill) {
  const w = sh.weapon; if (!w || race.state !== 'racing' || sh.finished && race.mode !== 'snipeout') { A.fireHold = 0; return; }
  const W = race.weapons, ag = Math.max(.2, sh.aggr * SN.Tune.T.aiAggression) * (race.attract ? 1.5 : 1);
  A.decideT -= SN.DT; const think = A.decideT <= 0; if (think) A.decideT = .15 / ag;
  const ahead = W.targetAhead(sh, 1800, 60), defensive = ['bulwark', 'auto', 'nitro'].includes(w);
  if (sh.energy < 40 && !race.attract && w !== 'bulwark' && (w !== 'rail' || !W.railTarget(sh, 40))) { if (think) out.absorb = 1; return; }
  switch (w) {
    case 'swarm': if (ahead && think) out.firePressed = out.fire = 1; break;
    case 'cannon': if (ahead) out.fire = 1, out.firePressed = sh.ammo === 24 ? 1 : 0; break;
    case 'seeker': { if (sh.lockOn && sh.lockT >= .6 && think) out.firePressed = out.fire = 1; else if (!W.targetAhead(sh, 3000, 400) && (A.fireHold += SN.DT) > 6) { out.firePressed = out.fire = 1; A.fireHold = 0; } break; }
    case 'rail': {
      const t = W.railTarget(sh, 40);
      if (sh.charge > 0) { if (sh.charge >= .8 || !t && sh.charge > .5) out.fireReleased = 1; else out.fire = 1; }
      else if (t && think) { out.fire = out.firePressed = 1; }
      else if ((A.fireHold += SN.DT) > 8 && think) { out.fire = out.firePressed = 1; A.fireHold = 0; }
      break;
    }
    case 'mine': { const behind = race.ships.some(o => o !== sh && !o.elim && SN.wrapDiff(o.s, sh.s, race.track.L) > 0 && SN.wrapDiff(o.s, sh.s, race.track.L) < 1200); const lead = sh.place === 1 && ((sh.s / race.track.L) > .7); if ((behind || lead || (A.fireHold += SN.DT) > 10) && think) out.firePressed = out.fire = 1; break; }
    case 'tremor': { const n = race.ships.filter(o => o !== sh && !o.elim && SN.wrapDiff(sh.s, o.s, race.track.L) > 0 && SN.wrapDiff(sh.s, o.s, race.track.L) < 2500).length; if ((n >= 2 || n >= 1 && (A.fireHold += SN.DT) > 3) && think) out.firePressed = out.fire = 1; break; }
    case 'bulwark': if (think && (W.lockedOn(sh) || sh.energy < 35 || (A.fireHold += SN.DT) > 6)) out.firePressed = out.fire = 1; break;
    case 'auto': if (think && (Math.abs(race.track.curvL(sh.s + 600)) > 1 / (90 * 16) || sh.energy < 40 || (A.fireHold += SN.DT) > 5)) out.firePressed = out.fire = 1; break;
    case 'nitro': { let straight = true; for (let d = 0; d < 400 * 16; d += 800) if (Math.abs(race.track.curvL(sh.s + d)) > 1 / (600 * 16)) straight = false; if (think && (straight || (A.fireHold += SN.DT) > 6)) out.firePressed = out.fire = 1; break; }
    case 'siphon': if (think && W.targetAhead(sh, 1400, 400) && (sh.energy < 85 || race.attract || (A.fireHold += SN.DT) > 4)) out.firePressed = out.fire = 1; break;
  }
  if (out.firePressed) A.fireHold = 0;
  if (defensive && race.attract && think) out.firePressed = out.fire = 1;
}
SN.AI = { controls, state };
})();
