/* 18-setpieces: kickoff, goal kick, corner, free kick (with the wall), penalty (6 zones, the Panenka, the keeper's
 * guess) and the shootout (5 each, then sudden death; it ends early when one side can't catch up). Each restart: setup
 * (everyone placed), aim (a human taker has up to 6 s), take, play. Also the celebrations' choices. */
const SP_AIM_MAX = 6;
Match.prototype.startSetpiece = function (kind, side, o = {}) {
  const m = this, ball = m.ball, dir = m.dir(side), gx = m.goalX(side), ogx = m.ownGoalX(side);
  m.owner = null; m.shot = null; m.superFlight = null; ball.superPath = null; ball.decoys = null; ball.spin = 0; ball.vx = ball.vy = ball.vz = 0; ball.z = 0; ball.to = null; ball.kind = null; ball.prevPast = null;
  m.mode = kind === 'kickoff' ? 'kickoff' : 'setpiece'; m.modeT = 0;
  const sp = m.sp = { kind, side, t: 0, phase: 'setup', aimT: 0, ring: null, aimY: 0, aimZ: .4, power: 0, charging: false, zone: [1, 1], keeperDive: null, taken: false };
  let bx = P.CX, by = P.CY;
  if (kind === 'goalkick') { bx = ogx + dir * P.GA_D; by = P.CY + (o.y != null && o.y < P.CY ? -30 : 30); }
  if (kind === 'corner') { bx = gx - dir * 2; by = (o.y != null ? o.y : P.CY) < P.CY ? P.Y0 + 2 : P.Y1 - 2; sp.ring = { x: gx - dir * P.SPOT * .9, y: P.CY }; m.stats[side].corners++; }
  if (kind === 'freekick') { [bx, by] = P.clampField(o.x, o.y, 6); if (P.inBox(dir, bx, by)) bx = gx - dir * (P.BOX_D + 6); }
  if (kind === 'penalty') { bx = gx - dir * P.SPOT; by = P.CY; }
  ball.x = bx; ball.y = by;
  const dg = hyp(gx - bx, P.CY - by);
  sp.shootable = kind === 'freekick' && dg < 320;
  // the taker
  const mates = m.side[side].filter(f => !f.sentOff), foes = m.side[1 - side].filter(f => !f.sentOff);
  const outfield = mates.filter(f => !f.gk);
  let taker;
  if (kind === 'goalkick') taker = m.keeper[side];
  else if (kind === 'kickoff') taker = outfield.filter(f => f.role.startsWith('FWD') || f.role === 'MID').sort((a, b) => b.st.pass - a.st.pass)[0] || outfield[0];
  else if (kind === 'penalty' || sp.shootable) taker = outfield.slice().sort((a, b) => (b.data.captain ? 30 : 0) + b.st.shoot - (a.data.captain ? 30 : 0) - a.st.shoot)[0];
  else taker = outfield.slice().sort((a, b) => hyp(a.body.x - bx, a.body.y - by) - hyp(b.body.x - bx, b.body.y - by))[0];
  if (!taker) taker = mates[0];
  sp.taker = taker; sp.keeper = m.keeper[1 - side];
  const human = m.slots.find(sl => sl.side === side && !sl.menu);
  sp.human = human || null; sp.keeperHuman = kind === 'penalty' ? m.slots.find(sl => sl.side === 1 - side && !sl.menu) || null : null;
  if (human && !taker.gk) m.assignSlot(human, taker);
  // everyone placed
  const place = (f, x, y, face) => { const [cx, cy] = P.clampField(x, y, 4); f.body.x = cx; f.body.y = cy; f.body.z = 0; f.body.vx = f.body.vy = 0; f.facing = face != null ? face : (f.dir > 0 ? 0 : PI); f.setState(f.gk ? 'run' : 'run'); f.charging = false; f.meter = 0; f.air = null; f.lift = 0; f.plan = null; f.runTo = null; f.celebrate = null; f.dejected = false; };
  const spotOf = (f, ph) => m.brains[f.side].spot(f, ph, P.toUV(m.dir(f.side), bx, by));
  for (const f of m.players) {
    if (f.sentOff) continue;
    const fd = m.dir(f.side), fog = m.ownGoalX(f.side);
    if (f.gk) { place(f, fog + fd * 8, P.CY, fd > 0 ? 0 : PI); f.setState('run'); continue; }
    let [x, y] = spotOf(f, f.side === side ? 'attack' : 'defend');
    if (kind === 'kickoff') { const [u, v] = P.toUV(fd, x, y); [x, y] = P.toWorld(fd, Math.min(u, .46), v); if (f.side !== side && hyp(x - P.CX, y - P.CY) < P.CIRCLE + 6) { const a = Math.atan2(y - P.CY, x - P.CX); x = P.CX + Math.cos(a) * (P.CIRCLE + 8); y = P.CY + Math.sin(a) * (P.CIRCLE + 8); } }
    if (kind === 'goalkick' && f.side !== side && P.inBox(-dir, x, y)) x = ogx + dir * (P.BOX_D + 14);
    if (kind === 'corner') {
      const spots = f.side === side ? [[P.SPOT * .55, -30], [P.SPOT * .5, 34], [P.SPOT, 0], [P.BOX_D + 20, 10]] : [[P.GA_D * .6, -22], [P.GA_D * .6, 22], [P.SPOT * .8, 0], [P.BOX_D - 10, 30]];
      const k = f.side === side ? outfield.filter(q => q !== taker).indexOf(f) : foes.filter(q => !q.gk).indexOf(f);
      const s2 = spots[k] || spots[0]; x = gx - dir * s2[0]; y = P.CY + s2[1] * (by < P.CY ? 1 : -1);
    }
    if (kind === 'penalty') { const k = (f.idx * 37 + f.side * 11) % 7; x = gx - dir * (P.BOX_D + 14 + k * 3); y = P.CY + (k - 3) * 22 + (f.side ? 9 : 0); }
    place(f, x, y);
  }
  // the free kick's wall: two defenders 40 from the ball on the line to goal
  sp.wall = [];
  if (sp.shootable) {
    const a = Math.atan2(P.CY - by, gx - bx), wx = bx + Math.cos(a) * 40, wy = by + Math.sin(a) * 40;
    foes.filter(f => !f.gk).sort((p, q) => q.st.weight - p.st.weight).slice(0, 2).forEach((f, i) => { place(f, wx + Math.cos(a + PI / 2) * (i ? 6 : -6), wy + Math.sin(a + PI / 2) * (i ? 6 : -6), a + PI); sp.wall.push(f); });
    sp.aimY = by < P.CY ? .6 : -.6; sp.aimZ = .55;
  }
  if (kind === 'penalty') { const k = sp.keeper; place(k, m.goalX(side) - dir * 2, P.CY, dir > 0 ? PI : 0); }
  const back = Math.atan2(P.CY - by, gx - bx);
  place(taker, bx - Math.cos(back) * (kind === 'penalty' ? 14 : 7), by - Math.sin(back) * (kind === 'penalty' ? 14 : 7), back);
  if (kind === 'kickoff') { taker.facing = dir > 0 ? 0 : PI; taker.body.x = P.CX - dir * 6; taker.body.y = P.CY; }
  if (kind === 'goalkick') { taker.body.x = bx - dir * 8; taker.body.y = by; }
  if (m.official) { m.official.body.x = P.CX - 30; m.official.body.y = P.CY + 70; }
  m.emit('setpiece', { kind, side, taker: taker.id, shootable: sp.shootable });
};
Match.prototype.setpieceStep = function (dt) {
  const m = this, sp = m.sp; if (!sp) { m.mode = 'play'; return; }
  sp.t += dt;
  for (const f of m.players) { if (sp.wall.includes(f) && sp.jump) { f.body.z = Math.max(0, Math.sin(Math.min(1, (m.t - sp.jump) / .35) * PI) * 10); } f.step(dt, NO_INTENT, false); }
  refStep(m, dt);
  if (sp.phase === 'setup') { if (sp.t >= (sp.kind === 'kickoff' ? 1.0 : .7)) { sp.phase = 'aim'; sp.t = 0; m.emit('whistle', { kind: 'restart', sp: sp.kind }); } return; }
  if (sp.phase === 'aim') {
    const ctl = sp.human && sp.human.ctl, it = ctl && ctl.peek ? ctl.peek(m, sp.human) : null, taker = sp.taker;
    const t = m.dir(sp.side), gx = m.goalX(sp.side);
    if (sp.kind === 'penalty') return penaltyAim(m, sp, it, dt);
    if (it) {
      const mv = it.move || [0, 0];
      if (sp.kind === 'corner' && sp.ring) { sp.ring.x = clamp(sp.ring.x + mv[0] * 110 * dt, Math.min(gx, gx - t * P.BOX_D), Math.max(gx, gx - t * P.BOX_D)); sp.ring.y = clamp(sp.ring.y + mv[1] * 110 * dt, P.CY - P.BOX_W + 20, P.CY + P.BOX_W - 20); }
      if (sp.shootable) { sp.aimY = clamp(sp.aimY + mv[1] * 1.6 * dt, -1, 1); sp.aimZ = clamp(sp.aimZ - (it.sprint ? 0 : 0), 0, 1); if (Math.abs(mv[0]) > .3) sp.aimZ = clamp(sp.aimZ + mv[0] * -t * 1.2 * dt, 0, 1); }
      taker.facing = sp.kind === 'goalkick' || sp.kind === 'kickoff' ? (hyp(mv[0], mv[1]) > .3 ? Math.atan2(mv[1], mv[0]) : taker.facing) : taker.facing;
      if (sp.shootable && it.shoot && it.shoot.down) { sp.charging = true; sp.power = Math.min(1, sp.power + dt / EF.T.shotChargeTime); return; }
      if (sp.shootable && sp.charging) return takeSetpiece(m, 'shot', it);
      if (it.pass && it.pass.pressed) return takeSetpiece(m, 'pass', it);
      if (it.lob && it.lob.pressed) return takeSetpiece(m, sp.kind === 'corner' ? 'cross' : 'lob', it);
      if (it.shoot && it.shoot.pressed && sp.kind === 'corner') return takeSetpiece(m, 'short', it);
      if (it.shoot && it.shoot.pressed && sp.kind !== 'corner') return takeSetpiece(m, sp.kind === 'goalkick' ? 'lob' : 'shot', it);
      if (it.through && it.through.pressed) return takeSetpiece(m, sp.kind === 'corner' ? 'cross' : 'pass', it);
      if (sp.t > SP_AIM_MAX) return takeSetpiece(m, sp.kind === 'corner' ? 'cross' : sp.shootable ? 'shot' : 'pass', null);
      return;
    }
    // the CPU's taker
    if (sp.t > (m.o.attract ? .5 : .8 + (sp.kind === 'kickoff' ? 0 : .4))) {
      if (sp.kind === 'corner') { const tgt = m.side[sp.side].filter(f => f !== taker && !f.gk && !f.sentOff).sort((a, b) => b.st.shoot - a.st.shoot)[0]; if (tgt) sp.ring = { x: tgt.body.x, y: tgt.body.y }; return takeSetpiece(m, m.rng() < .85 ? 'cross' : 'short', null); }
      if (sp.shootable) { sp.power = .75 + m.rng() * .15; sp.aimY = (m.rng() < .5 ? -1 : 1) * (.5 + m.rng() * .4); sp.aimZ = .5 + m.rng() * .3; return takeSetpiece(m, m.rng() < .75 ? 'shot' : 'lob', null); }
      if (sp.kind === 'goalkick') return takeSetpiece(m, keeperChoice(taker) === 'long' ? 'lob' : 'pass', null);
      return takeSetpiece(m, 'pass', null);
    }
  }
};
function takeSetpiece(m, how, it) {
  const sp = m.sp, f = sp.taker, ball = m.ball, side = sp.side, dir = m.dir(side), gx = m.goalX(side);
  it = it || {};
  m.mode = 'play'; m.modeT = 0; sp.phase = 'taken'; m.lastSp = sp; m.sp = sp.kind === 'kickoff' ? sp : null;
  f.setState('run'); f.cool = 0;
  if (sp.kind === 'kickoff') { m.kickHold = 2.5; m.emit('kickoffTaken', { side }); }
  const mates = m.side[side].filter(p => p !== f && !p.sentOff && !p.gk);
  if (how === 'pass') {
    const mv = it.move || [0, 0], a = hyp(mv[0], mv[1]) > .3 ? Math.atan2(mv[1], mv[0]) : null;
    const r = (a != null ? f.pickReceiver(a, {}) : null) || mates.sort((p, q) => dist(p.body, f.body) - dist(q.body, f.body))[0];
    if (r) f.passTo(r, 'pass'); else f.kickDir(dir > 0 ? 0 : PI, 200, 0, 'pass', null);
  } else if (how === 'lob') {
    const mv = it.move || [0, 0];
    const r = mates.sort((p, q) => (q.body.x - p.body.x) * dir)[0];
    let tx = r ? r.body.x : f.body.x + dir * 300, ty = r ? r.body.y : P.CY;
    if (hyp(mv[0], mv[1]) > .3) { const a = Math.atan2(mv[1], mv[0]); tx = f.body.x + Math.cos(a) * 360; ty = f.body.y + Math.sin(a) * 360; }
    [tx, ty] = P.clampField(tx, ty, 10);
    const v = E.arc({ x: ball.x, y: ball.y, z: 0 }, { x: tx, y: ty, z: 0 }, EF.T.ballGravity, { apex: 60 });
    m.kickBall(f, v.vx, v.vy, v.vz, 'lob', r || null); f.doAct('shotHard', .4);
    m.emit('pass', { side, who: f.id, to: r ? r.id : null, kind: 'lob' });
  } else if (how === 'cross') {
    const r = sp.ring || { x: gx - dir * P.SPOT, y: P.CY };
    const v = E.arc({ x: ball.x, y: ball.y, z: 0 }, { x: r.x, y: r.y, z: 4 }, EF.T.ballGravity, { apex: 55 });
    const to = mates.sort((p, q) => dist(p.body, r) - dist(q.body, r))[0];
    m.kickBall(f, v.vx, v.vy, v.vz, 'cross', to || null); f.doAct('shotHard', .4);
    const mv = it.move || [0, 0]; m.ball.spin = clamp(mv[0] * dir * .4, -.5, .5);
    if (to) to.runTo = { x: r.x, y: r.y, t: 1.4 };
    m.emit('pass', { side, who: f.id, to: to ? to.id : null, kind: 'cross' }); m.emit('cornerTaken', { side });
  } else if (how === 'short') {
    const r = mates.sort((p, q) => dist(p.body, f.body) - dist(q.body, f.body))[0];
    if (r) f.passTo(r, 'pass');
  } else if (how === 'shot') {
    if (sp.shootable) {
      // over the wall: the reticle's height lifts it; the stick curls it (aftertouch)
      const p = Math.max(.35, sp.power || .7), ty = P.CY + sp.aimY * (P.GH - 6), sp2 = 200 + p * 200;
      const d = hyp(gx - ball.x, ty - ball.y), tt = d / sp2, tz = 6 + sp.aimZ * (P.BAR - 10);
      const vz = (tz + .5 * EF.T.ballGravity * tt * tt) / tt;
      const a = Math.atan2(ty - ball.y, gx - ball.x) + gauss(m.rng) * (100 - f.st.shoot) / 100 * .05;
      m.kickBall(f, Math.cos(a) * sp2, Math.sin(a) * sp2, Math.min(vz, 220), 'shot', null);
      m.ball.spin = -sgn(sp.aimY || 1) * dir * .5;
      f.doAct('shotHard', .4); f.curlT = .5; f.curled = false;
      sp.jump = m.t;
      registerShot(m, f, sp2, p >= .78 && p <= .9, 'freekick', p);
      m.flags.fkShot = { t: m.t, side };
      const s = m.lastSp; s.jump = m.t; s.wall = sp.wall; m.wallJump = { t: m.t, wall: sp.wall };
    } else { f.shoot(.7, { aimY: (m.rng() - .5) * 1.4 }); }
  }
  sp.taken = true;
  m.emit('setpieceTaken', { kind: sp.kind, side, how });
}

/* ---- penalties ---- */
function penaltyAim(m, sp, it, dt) {
  const taker = sp.taker, k = sp.keeper;
  sp.aimT += dt;
  // the keeper's guess (a human picks with the stick and ✕; the CPU guesses when the kick comes)
  const kh = sp.keeperHuman && sp.keeperHuman.ctl && sp.keeperHuman.ctl.peek ? sp.keeperHuman.ctl.peek(m, sp.keeperHuman) : null;
  if (kh && !sp.keeperDive) {
    const mv = kh.move || [0, 0];
    sp.kAim = Math.abs(mv[1]) > .4 ? sgn(mv[1]) : 0;
    if (kh.pass && kh.pass.pressed) { sp.keeperDive = { side: sp.kAim, t: sp.aimT, early: !sp.charging || sp.power < .3 }; m.emit('keeperGuess', { side: sp.kAim }); }
  }
  if (it) {
    const mv = it.move || [0, 0];
    sp.zone = [Math.abs(mv[1]) > .35 ? (mv[1] < 0 ? 0 : 2) : 1, Math.abs(mv[0]) > .5 ? (mv[0] * m.dir(sp.side) > 0 ? 1 : 0) : sp.zone[1]];
    if (it.shoot && it.shoot.down) { sp.charging = true; sp.power = Math.min(1, sp.power + dt / EF.T.shotChargeTime); return; }
    if (sp.charging || sp.aimT > SP_AIM_MAX + 2) return kickPenalty(m, sp);
    return;
  }
  // the CPU's taker: a zone, a power, now and then a Panenka; it may change its mind if the keeper went early
  if (sp.aimT > (m.o.attract ? .7 : 1.1)) {
    if (!sp.cpuPick) { const pan = m.rng() < (m.o.attract ? .3 : .08); sp.cpuPick = true; sp.zone = pan ? [1, 0] : [Math.floor(m.rng() * 3), m.rng() < .5 ? 1 : 0]; sp.power = pan ? .12 : .5 + m.rng() * .35; }
    if (sp.keeperDive && sp.keeperDive.early && sp.zone[0] === (sp.keeperDive.side < 0 ? 0 : sp.keeperDive.side > 0 ? 2 : 1)) sp.zone[0] = sp.keeperDive.side < 0 ? 2 : 0;
    kickPenalty(m, sp);
  }
}
function kickPenalty(m, sp) {
  const f = sp.taker, k = sp.keeper, ball = m.ball, side = sp.side, dir = m.dir(side), gx = m.goalX(side);
  const zy = [-1, 0, 1][sp.zone[0]], high = sp.zone[1] === 1, p = sp.power;
  const panenka = p < .2 && zy === 0;
  let ty = P.CY + zy * (P.GH - 10), tz = high ? 26 : 5, speed = panenka ? 110 : 220 + p * 180;
  if (p > .9 && m.rng() < .25) tz = P.BAR + 14;   // blazed over
  ty += gauss(m.rng) * (100 - f.st.shoot) / 100 * 8;
  const d = Math.abs(gx - ball.x), tt = d / speed, vz = (tz + .5 * EF.T.ballGravity * tt * tt) / tt;
  m.mode = sp.so ? 'shootout' : 'play'; m.sp = null; sp.phase = 'taken';
  m.kickBall(f, dir * speed, (ty - ball.y) / tt, vz, 'shot', null); f.doAct('shotHard', .45);
  // the keeper's dive: a human's pick, or the CPU's guess
  let ks = sp.keeperDive ? sp.keeperDive.side : null;
  if (ks == null) { const r = m.rng(); ks = r < .38 ? -1 : r < .76 ? 1 : 0; if (m.cheats['keeper' + k.side]) ks = zy; }
  const right = ks === zy;
  let outcome;
  if (tz > P.BAR) outcome = 'over';
  else if (panenka) outcome = ks === 0 ? 'catch' : 'goal';
  else if (right) outcome = m.rng() < .25 + k.st.keep / 100 * .45 - (p > .85 ? .2 : 0) ? (m.rng() < .5 ? 'catch' : 'parry') : 'goal';
  else outcome = high && zy !== 0 && m.rng() < .08 ? 'post' : 'goal';
  if (m.cheats['keeper' + k.side]) outcome = 'catch';
  if (m.forceGoal && tz <= P.BAR) outcome = 'goal';
  const kind = panenka ? 'panenka' : 'penalty';
  m.shot = { by: f, side, t0: m.t, kind, speed, onTarget: tz < P.BAR, done: false, outcome: outcome === 'catch' || outcome === 'parry' ? outcome : outcome === 'goal' ? 'goal' : 'miss', keeper: k, cross: { y: ty, z: tz, t: tt } };
  f.shots++; m.stats[side].shots++;
  if (ks !== 0) { const need = (P.CY + ks * (P.GH - 10)) - k.body.y; k.dive = { t: 0, dur: .32, vy: need / .32 * 1.2, side: ks, high: high ? 12 : 3, until: tt + .5 }; k.setState('keeper-dive'); k.doAct(high ? 'diveHigh' : 'diveLow', .6); }
  else { k.dive = { t: 0, dur: .2, vy: 0, side: 0, high: 0, until: tt + .4 }; k.setState('keeper-dive'); }
  if (outcome === 'post') { m.shot.outcome = 'miss'; ball.vy *= 1.15; }
  m.emit('penaltyTaken', { side, who: f.id, panenka, zone: sp.zone, outcome });
  m.emit('shot', { side, who: f.id, power: p, kind, onTarget: tz < P.BAR });
  sp.result = outcome;
  if (sp.so) sp.so.pending = { side, outcome, t: 0, who: f.id };
}
function keeperPenaltyStep(k, dt) {
  const m = k.m, b = k.body;
  if (k.state === 'keeper-dive') {
    const d = k.dive; d.t += dt; const u = Math.min(1, d.t / d.dur);
    b.vy = d.vy * (1 - u); b.vx = 0; if (d.high) b.z = Math.sin(Math.min(1, u * 1.3) * PI) * d.high; k.diveU = u; k.tiltSide = d.side;
    b.update(dt, m.map); keeperShotResolve(k);
    if (d.t > d.until) { k.diveU = 0; b.z = 0; k.setState(m.owner === k ? 'keeper-hold' : 'run'); }
    return;
  }
  b.vx = approach(b.vx, 0, 400 * dt); b.vy = approach(b.vy, 0, 400 * dt); b.update(dt, m.map);
  if (m.sp && m.sp.kind === 'penalty') { b.y = P.CY + Math.sin(m.t * 3) * 4 + (m.sp.kAim || 0) * 6; }
  if (k.state === 'keeper-hold' && m.mode === 'play') { k.holdT = (k.holdT || 0) + dt; if (k.holdT > 1) keeperDistribute(k, 'throw'); }
}

/* ---- the shootout ---- */
Match.prototype.startShootout = function () {
  const m = this; m.half = 5; m.mode = 'shootout'; m.modeT = 0; m.owner = null;
  const first = m.rng() < .5 ? 0 : 1;
  m.so = { first, turn: first, taken: [0, 0], score: [0, 0], kicks: [[], []], sudden: false, wait: 1.5, pending: null, order: [0, 1].map(s => m.side[s].filter(f => !f.sentOff).sort((a, b) => (a.gk ? 1 : 0) - (b.gk ? 1 : 0) || b.st.shoot - a.st.shoot)) };
  m.emit('shootoutStart', { first });
  for (const f of m.players) f.celebrate = null;
};
Match.prototype.shootoutStep = function (dt) {
  const m = this, so = m.so;
  if (m.sp && m.sp.kind === 'penalty') { m.setpieceStep(dt); return; }
  // the kick on its way: the ball's own step, the keeper's
  for (const f of m.players) { if (f.gk) keeperPenaltyStep(f, dt); else { f.decel(dt, 500); f.body.update(dt, m.map); } }
  if (!m.owner && !m.superFlight) m.ballLoose(dt, true);
  const b = m.ball;
  if (so.pending) {
    const pd = so.pending; pd.t += dt;
    const gx = m.goalX(pd.side), past = gx > P.CX ? b.x > gx + b.r : b.x < gx - b.r;
    if (!pd.scored && past && Math.abs(b.y - P.CY) < P.GH - 2 && b.z < P.BAR - 2) pd.scored = true;
    if (pd.t > 1.6) {
      const goal = !!pd.scored && pd.outcome === 'goal';
      so.kicks[pd.side].push(goal); so.taken[pd.side]++; if (goal) so.score[pd.side]++;
      m.emit('shootoutKick', { side: pd.side, goal, who: pd.who, score: so.score.slice() });
      so.pending = null; so.turn = 1 - pd.side; so.wait = 1.2;
      if (m.shootoutDecided()) { m.emit('shootoutEnd', { score: so.score.slice(), winner: so.score[0] > so.score[1] ? 0 : 1 }); m.finish(); return; }
    }
    return;
  }
  so.wait -= dt;
  if (so.wait > 0) return;
  // next kick: the taker in order, everyone else in the centre circle
  const s = so.turn, list = so.order[s], taker = list[so.taken[s] % list.length];
  m.startSetpiece('penalty', s, {}); m.mode = 'shootout';
  const sp = m.sp; sp.taker = taker; sp.so = so;
  const dir = m.dir(s), gx = m.goalX(s);
  for (const f of m.players) if (!f.gk && f !== taker && !f.sentOff) { f.body.x = P.CX + (f.idx - 2) * 14; f.body.y = P.CY + (f.side ? 20 : -20); f.facing = PI / 2; }
  taker.body.x = gx - dir * (P.SPOT + 14); taker.body.y = P.CY; taker.facing = dir > 0 ? 0 : PI;
  const kp = m.keeper[1 - s]; kp.body.x = gx - dir * 2; kp.body.y = P.CY;
  const okp = m.keeper[s]; okp.body.x = P.CX + 50; okp.body.y = P.CY + 40;
  const human = m.slots.find(sl => sl.side === s && !sl.menu); sp.human = human || null;
  sp.keeperHuman = m.slots.find(sl => sl.side === 1 - s && !sl.menu) || null;
  if (human && !taker.gk) m.assignSlot(human, taker);
};
Match.prototype.shootoutDecided = function () {
  const so = this.so, [a, b] = so.taken, [sa, sb] = so.score;
  if (a <= 5 && b <= 5 && !(a === 5 && b === 5)) {
    const leftA = 5 - a, leftB = 5 - b;
    if (sa + leftA < sb || sb + leftB < sa) return true;
    return false;
  }
  return a === b && sa !== sb;
};

/* ---- celebrations ---- */
function celebrationFor(m, f, k) {
  const sig = (f.data.celebration) || m.teams[f.side].celebration || 'kneeslide';
  return EF.get('celebration', sig) ? sig : 'kneeslide';
}
function celebrationChoices(m, f) {
  const sig = celebrationFor(m, f, -1), pool = EF.all('celebration').filter(c => !c.hidden).map(c => c.id).filter(id => id !== sig);
  const r = E.rng(m.goals.length * 31 + f.id * 7 + m.seed), out = [sig];
  while (out.length < 4 && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return out;
}
EF.celebrationChoices = celebrationChoices;
