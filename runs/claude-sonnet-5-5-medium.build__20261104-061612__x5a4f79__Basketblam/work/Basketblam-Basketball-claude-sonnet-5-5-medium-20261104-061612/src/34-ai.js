/* BASKETBLAM - CPU brains. Every slot is driven by a command source; this is the CPU's. */
function goto(c, p, tx, ty, close = 6) {
  const dx = tx - p.x, dy = (ty - p.y) / .82, d = Math.hypot(dx, dy);
  if (d < close) return d;
  c.mx = dx / d; c.my = dy / d; return d;
}
function skillOf(p) {
  const M = S.match, d = DIFF[M.difficulty] || 1; let s = tune('cpuSkill') * d;
  const diff = M.score[p.team] - M.score[1 - p.team];
  if (diff < -6) s *= 1 + tune('comeback') * .2; else if (diff > 14) s *= 1 - tune('comeback') * .15;
  if (S.mode === 'attract') s = 1.4;
  return clamp(s, .35, 1.9);
}
function aiCmd(p, dt) {
  const c = NOCMD(), M = S.match, B = S.ball, ai = p.ai; ai.t += dt;
  const sk = skillOf(p), hoopA = attackHoop(p.team), hoopD = defendHoop(p.team), mate = mateOf(p), foes = opps(p), dir = hoopA.dir;
  const attract = S.mode === 'attract';
  if (M.phase === 'tip' || M.phase === 'pre' || M.phase === 'break' || M.phase === 'end') {
    if (M.phase === 'end' || M.phase === 'break') return c;
    // tip: jumpers handled by the tip step; others hover
    goto(c, p, COURT.cx - dir * (p.slot % 2 ? 130 : 80), COURT.cy + (p.slot % 2 ? 50 : -50)); return c;
  }
  if (M.phase === 'inbound' && M.inbound) {
    if (M.inbound.who === p) { return c; }
    if (M.inbound.who.team === p.team) { // receiver: get open
      const tx = M.inbound.x + (M.inbound.who.team === 0 ? 1 : -1) * 110, ty = COURT.cy + (p.y > COURT.cy ? 45 : -45); goto(c, p, tx, ty);
    } else { const bh = M.inbound.who; goto(c, p, bh.x + (hoopD.dir) * 34 * (bh.x < COURT.cx ? 1 : -1), bh.y + (p.y > bh.y ? 30 : -30)); }
    return c;
  }
  if (p.act && (p.act.type === 'dunk' || p.act.type === 'oopwait')) { c.shoot.down = true; return c; }
  // in the air shooting: hold the button until the top
  if (p.act && p.act.type === 'shot') {
    const apex = p.act.V / playerG(), err = ai.shootErr || 0;
    c.shoot.down = p.act.t < apex * (1 + err) + (p.act.t < .12 ? .05 : 0);
    return c;
  }
  const hasTurboFor = p.turbo > .25 || attract || novaOf(p);
  if (p.hasBall) {
    const d = hoopDist(p, hoopA); ai.holdT = (ai.holdT || 0) + dt;
    // nearest foe in front
    let near = null, nd = 999; for (const f of foes) { const fd = Math.hypot(f.x - p.x, f.y - p.y); if (fd < nd) { nd = fd; near = f; } }
    const open = nd > 34;
    // dunk
    if (d < dunkRangeOf(p) * .9 && p.turbo >= .1 && (!near || nd > 14 || novaOf(p) || rnd() < .02)) {
      c.turbo.down = true; if (p.z <= 0) c.shoot.pressed = true; c.shoot.down = true; goto(c, p, hoopA.x, hoopA.y); ai.holdT = 0; return c;
    }
    // oop to a mate near the hoop
    if (mate.input === null || true) { const md = hoopDist(mate, hoopA); if ((md < 190 && d > 90 && (ai.oopCall > 0 || rnd() < .004 * sk)) && !foes.some(f => Math.hypot(f.x - mate.x, f.y - mate.y) < 20)) { c.oop.pressed = true; ai.oopCall = 0; return c; } }
    ai.oopCall = Math.max(0, (ai.oopCall || 0) - dt);
    // shoot
    const range = 95 + p.r.deep * 8, wantShot = d < range && ((open && ai.holdT > .55 / sk) || ai.holdT > 2.2 || M.shotClock < 4);
    if (wantShot && p.z <= 0 && !p.act) {
      c.shoot.pressed = true; c.shoot.down = true; ai.shootErr = (rnd() - .5) * .8 / sk; return c;
    }
    // spin past a defender
    if (near && nd < 26 && p.cd.spin <= 0 && p.turbo > .3 && rnd() < .05 * sk) { c.shove.pressed = true; c.mx = dir; c.my = (hoopA.y - p.y) / 120; return c; }
    // pass if covered
    if (near && nd < 22 && rnd() < .02 * sk && hoopDist(mate, hoopA) < d + 40) { c.pass.pressed = true; return c; }
    // drive: aim for the hoop, drift to the open side
    let ty = hoopA.y; if (near && nd < 60 && Math.abs(near.y - p.y) < 40) ty += (near.y > p.y ? -1 : 1) * 36;
    let tx = hoopA.x - dir * 30; if (d > 220) tx = hoopA.x - dir * 90;
    goto(c, p, tx, ty, 4); c.turbo.down = hasTurboFor && d > 70 && (open || attract); return c;
  }
  ai.holdT = 0;
  const h = B.owner;
  if (h && h.team === p.team) { // offense off the ball: spread, cut to the hoop for an oop
    const hd = hoopDist(h, hoopA);
    let tx, ty;
    if (hd < 200 && p.y !== h.y) { tx = hoopA.x - dir * 50; ty = hoopA.y + (h.y > hoopA.y ? -55 : 55); }
    else { tx = clamp(h.x + dir * 120, COURT.x0 + 50, COURT.x1 - 50); ty = COURT.cy + (h.y > COURT.cy ? -70 : 70); }
    goto(c, p, tx, ty, 8); c.turbo.down = hasTurboFor && Math.hypot(tx - p.x, ty - p.y) > 100; return c;
  }
  if (h) { // defense
    const ownD = hoopDist(h, hoopD), guard = Math.hypot(h.x - p.x, h.y - p.y) <= Math.hypot(h.x - mate.x, h.y - mate.y);
    const other = foes.find(f => f !== h);
    if (guard) {
      const tx = h.x + (hoopD.x - h.x) * (28 / Math.max(28, ownD)), ty = h.y + (hoopD.y - h.y) * (28 / Math.max(28, ownD)), d = Math.hypot(h.x - p.x, h.y - p.y);
      goto(c, p, tx, ty, 5); c.turbo.down = hasTurboFor && d > 70;
      ai.swipeT = (ai.swipeT || 0) - dt;
      if (d < 26 && ai.swipeT <= 0 && !h.act) { if (p.cd.shove <= 0 && rnd() < .3) { c.shove.pressed = true; ai.swipeT = (.9 + rnd()) / sk; } else if (p.cd.steal <= 0) { c.pass.pressed = true; ai.swipeT = (.5 + rnd()) / sk; } }
      // jump to block a shot
      if (h.act && h.act.type === 'shot' && d < 36 && p.z <= 0 && h.z > 5 && p.cd.jump <= 0 && rnd() < .08 * sk) { c.shoot.pressed = true; }
    } else {
      const tx = other.x + (hoopD.x - other.x) * (30 / Math.max(30, hoopDist(other, hoopD))), ty = other.y + (hoopD.y - other.y) * (30 / Math.max(30, hoopDist(other, hoopD)));
      goto(c, p, tx, ty, 8); c.turbo.down = hasTurboFor && Math.hypot(tx - p.x, ty - p.y) > 90;
      // sag toward the hoop on a drive: jump to reject a dunk
      if (h.act && h.act.type === 'dunk' && p.z <= 0 && Math.hypot(h.x - p.x, h.y - p.y) < 50 && p.cd.jump <= 0 && rnd() < .05 * sk) c.shoot.pressed = true;
    }
    return c;
  }
  // loose ball or a shot in the air
  if (B.state === 'shot' && B.shot) {
    const hp = Math.hypot(B.x - HOOPS[0].x, B.y - HOOPS[0].y) < Math.hypot(B.x - HOOPS[1].x, B.y - HOOPS[1].y) ? HOOPS[0] : HOOPS[1];
    const tx = hp.x - hp.dir * 22 + (p.slot % 2 ? 0 : 0), ty = hp.y + (p.slot % 2 ? 18 : -18);
    // blocking
    if (p.team !== B.shot.shooter.team && p.z <= 0 && Math.hypot(B.x - p.x, B.y - p.y) < 40 && B.z > 40 && p.cd.jump <= 0 && rnd() < .06 * sk) c.shoot.pressed = true;
    goto(c, p, tx, ty, 6); return c;
  }
  // chase: the nearer of the two
  const dm = Math.hypot(B.x - mate.x, B.y - mate.y), dme = Math.hypot(B.x - p.x, B.y - p.y);
  if (dme <= dm || mate.input) { goto(c, p, B.x + B.vx * .15, B.y + B.vy * .15, 3); c.turbo.down = hasTurboFor && dme > 60; if (dme < 40 && B.z > 40 && p.z <= 0 && p.cd.jump <= 0 && !B.vz < 0) c.shoot.pressed = rnd() < .1; }
  else goto(c, p, lerp(B.x, hoopA.x, .4), lerp(B.y, COURT.cy, .5), 8);
  return c;
}

/* ---- command sources ---- */
function cmdFor(p) {
  if (S.dev.autopilot && p.input) return aiCmd(p, 1 / 120);
  if (p.input && S.mode !== 'attract') return humanCmd(p.input);
  if (p.script) return p.script(p);
  return aiCmd(p, 1 / 120);
}
