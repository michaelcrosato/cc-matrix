/* BATTING: the sweet-spot reticle on the zone plane, swing types (contact, power, Batzooka, bunt), and the contact
 * model: timing error e (+ late) and the reticle's offset from the ball give quality Q, spray angle, launch angle and
 * exit speed. Early pulls, late goes the other way; swinging over the ball drives a grounder, under it lofts a fly. */
const SWINGS = {
  contact: { delay: .10, r: 4.2, ev: 750, loft: 2 },
  power: { delay: .14, r: 2.8, ev: 900, loft: 9 },
  batzooka: { delay: .16, r: 6.3, ev: 780, loft: 0 },
  bunt: { delay: 0, r: 6, ev: 160, loft: 0 }
};
const swingWindow = () => .09 * TUNE.swingTiming * (M.swing && M.swing.human ? M.diff.assist : 1) * (M.lesson && M.lesson.slow ? 1.3 : 1);
/** a swing starts: kind 'contact' | 'power' | 'bunt'; the Batzooka is armed beforehand (M.armed) */
function startSwing(kind, human) {
  if (M.swing || !M.pitch || M.pitch.crossed && kind !== 'bunt') return false;
  const bz = M.armed && kind !== 'bunt';
  M.swing = { kind: bz ? 'batzooka' : kind, at: M.pitch.t, human: !!human, done: false, armedWas: bz, anim: 0 };
  if (bz) { M.armed = false; offense().meter = M.cheats.infMeter ? 100 : 0; emit('super', { kind: 'bat', team: M.half }); }
  emit('swing', { kind: M.swing.kind });
  if (kind !== 'bunt') sfx('whoosh', { pitch: .6 });
  return true;
}
/** resolve a swing when the bat reaches the zone plane: returns 'miss' | 'foul' | 'contact' (and launches the ball) */
function resolveSwing() {
  const sw = M.swing, pt = M.pitch, S = SWINGS[sw.kind], b = batterNow();
  const cr = pitchPos(pt, 1), e = sw.at + S.delay - pt.T, win = swingWindow();
  const assist = sw.human ? M.diff.assist * (game.settings.batAssist === 'big' ? 1.25 : 1) : 1, r = S.r * statF(b.con) * TUNE.sweetSpot * assist * (M.lesson && M.lesson.bigSpot ? 1.4 : 1);
  let rx = M.reticle.x, rz = M.reticle.z;
  if (pt.def.pull && Math.hypot(rx - (cr.x - HX), rz - cr.z) < 10) { rx += clamp(cr.x - HX - rx, -3, 3); rz += clamp(cr.z - rz, -3, 3); }
  const dx = cr.x - HX - rx, dz = cr.z - rz, d = Math.hypot(dx, dz), dn = d / r;
  let te = e;
  const forced = M.force && M.force.contact; if (forced) { M.force.contact = null; if (forced === 'perfect') { te = 0; } }
  const perfect = M.cheats.perfectContact && (sw.human || M.cheats.perfectAll) || forced === 'perfect';
  const eff = perfect ? { e: 0, d: 0, dn: 0 } : { e: te, d, dn };
  M.lastContact = { timingMs: Math.round(eff.e * 1000), dx: +dx.toFixed(1), dz: +dz.toFixed(1), Q: 0, EV: 0, launch: 0, spray: 0, swing: sw.kind };
  if (Math.abs(eff.e) > win || eff.dn > 1.6 || (pt.def.strict && Math.abs(eff.e) > win * .55 && !perfect)) { emit('miss', { e: eff.e, d: eff.d, kind: sw.kind }); return 'miss'; }
  const grade = Math.abs(eff.e) < .022 * TUNE.swingTiming * assist ? 'PERFECT' : Math.abs(eff.e) < .05 * TUNE.swingTiming * assist ? 'GOOD' : 'OK';
  if (eff.dn > 1) {   // a foul tip: back over the screen, or a weak dribbler
    if (R() < .3) launch(cr, 260 + R() * 120, (R() - .5) * 60 * Math.PI / 180 + (eff.e < 0 ? -.3 : .3), -5 * Math.PI / 180, 0, sw.kind, .1, grade);
    else { M.lastContact.Q = .05; emit('foulTip', {}); sfx('foultip'); return 'foul'; }
    return 'contact';
  }
  const timing = 1 - Math.pow(Math.abs(eff.e) / win, 1.5), Q = (1 - Math.min(eff.dn, 1)) * timing;
  const lefty = b.bats === 'L' ? -1 : 1;
  let th = (eff.e / win) * 48 * lefty + (perfect ? 0 : (dx / r) * 10) + (R() - .5) * 8;
  let phi = 12 - (perfect ? -8 : ((rz - cr.z) / r) * 35 * TUNE.launchSpread) + S.loft;
  if (Q < .35 && !perfect) phi = 12 + (phi - 12) * (1 + (.35 - Q) * 5);   // weak contact: topped into the dirt or popped up
  if (sw.kind === 'batzooka') phi = clamp(phi, 28, 38);
  if (perfect && sw.kind !== 'batzooka') phi = clamp(phi, 18, 30);
  const fungo = M.force && M.force.fungo; if (fungo) { M.force.fungo = false; phi = 42; }
  const upg = offense().upg ? 1 + .05 * (offense().upg.lumber || 0) : 1;
  const evMax = sw.kind === 'batzooka' ? S.ev * TUNE.batzookaPower : S.ev;
  const EV = lerp(220, evMax, Math.pow(Q, 1.3)) * statF(b.pow) * (.9 + .1 * pt.speed / BASE_SPEED) * TUNE.exitVelocity * M.park.evMul * upg * (sw.human ? 1 : .96 + .04 * TUNE.cpuBat) * (M.derby ? 1.2 : 1);
  launch(cr, fungo ? Math.min(EV, 640) : EV, th * Math.PI / 180, phi * Math.PI / 180, 3 * eff.e * Math.sign(eff.e || 1) * lefty, sw.kind, Q, grade);
  return 'contact';
}
/** a bunt: the ball meets a squared bat inside its radius; it dribbles where the reticle points */
function resolveBunt() {
  const pt = M.pitch, cr = pitchPos(pt, 1), b = batterNow(), d = Math.hypot(cr.x - HX - M.reticle.x, cr.z - M.reticle.z);
  if (d > SWINGS.bunt.r * TUNE.sweetSpot * statF(b.con)) return 'miss';
  const th = clamp(M.reticle.x / 6, -1, 1) * 40 * Math.PI / 180 + (R() - .5) * .3, phi = (R() * 10 - 4) * Math.PI / 180;
  M.lastContact = { timingMs: 0, dx: 0, dz: 0, Q: .2, EV: 160, launch: Math.round(phi * 57), spray: Math.round(th * 57), swing: 'bunt' };
  launch(cr, 150 + R() * 40, th, phi, 0, 'bunt', .2, 'BUNT');
  return 'contact';
}
function launch(cr, EV, th, phi, spin, kind, Q, grade) {
  const vx = EV * Math.cos(phi) * Math.sin(th), vy = -EV * Math.cos(phi) * Math.cos(th), vz = EV * Math.sin(phi);
  Object.assign(M.lastContact, { Q: +Q.toFixed(2), EV: Math.round(EV), launch: Math.round(phi * 57.3), spray: Math.round(th * 57.3), grade });
  if (M.force && M.force.homer) { M.force.homer = false; const R0 = fenceR(M.park, clamp(th, -.7, .7)); const v = Math.sqrt(R0 * 1.25 * 520 * M.park.gravityMul * TUNE.gravity / Math.sin(2 * .55)) * 1.12; return launch(cr, v, clamp(th, -.6, .6), .55, 0, kind, 1, 'PERFECT'); }
  newBall({ x: cr.x, y: PLATE_Y, z: Math.max(cr.z, 4), vx, vy, vz, spin, mode: 'batted', kind, Q, boost: kind === 'batzooka' ? .5 : 0 });
  emit('contact', { Q, EV, kind, grade, launch: phi, spray: th });
}

/* ---- the CPU batter: reads the pitch with an aim error, decides to swing from P(in zone) and its discipline ---- */
function cpuBatPlan() {
  const pt = M.pitch, cr = pitchPos(pt, 1), b = batterNow(), D = M.diff, skill = clamp(TUNE.cpuBat, 0, 2);
  const err = D.aimSd * (1.6 - .6 * skill), px = cr.x - HX + gauss() * err * .75, pz = cr.z + gauss() * err * .75, zone = inZone(cr.x, cr.z, b);
  const disc = D.disc * (.7 + .3 * skill) * (pt.def.kind === 'super' ? .7 : 1);
  let swing = zone ? R() < .82 - .15 * (M.balls - M.strikes < 0 ? 0 : 0) + (M.strikes === 2 ? .12 : 0) : R() > disc + (M.strikes === 2 ? -.15 : 0);
  if (M.cheats.cpuNoSwing) swing = false;
  const hitterCount = (M.balls === 2 && M.strikes === 0) || (M.balls === 3 && M.strikes === 1);
  let kind = hitterCount || (b.pow >= 8 && R() < .35) ? 'power' : 'contact';
  const T = offense(); if (T.meter >= 100 && !M.cheats.noCpuSuper && (M.runners.length || M.inning >= M.innings)) { M.armed = true; kind = 'contact'; }
  if (M.runners.some(r => r.base === 1) && M.outs === 0 && b.pow <= 5 && R() < .2 && zone) kind = 'bunt';
  const sd = D.swingSd * (1.5 - .5 * skill) * (pt.def.wobble ? 1.4 : 1) * (pitchHidden(pt, .6) ? 1.3 : 1);
  return { swing, kind, at: pt.T - SWINGS[kind === 'bunt' ? 'contact' : (M.armed ? 'batzooka' : kind)].delay + gauss() * sd, aim: [clamp(px, -12, 12), clamp(pz, 0, 40)], react: D.react * .6 };
}
