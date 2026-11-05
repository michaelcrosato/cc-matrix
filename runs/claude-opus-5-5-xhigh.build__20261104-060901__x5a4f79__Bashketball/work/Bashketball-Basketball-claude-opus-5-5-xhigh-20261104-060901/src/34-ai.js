/* 34-ai: the CPU brains (PLAN 8). Each CPU player decides at 10 Hz (staggered) and steers every step, writing the same
 * command a human's controls would. Roles: the HANDLER weighs dunk, shoot, drive, pass, oop and spin and commits to the
 * best for a moment; OFF THE BALL it spaces to the far wing, cuts when the handler drives, calls when open and grabs
 * power-ups; on DEFENSE it plays man-to-man between its mark and the rim, swipes, shoves and jumps to block with a
 * reaction delay and timing error by difficulty; on a LOOSE ball or a shot in the air the nearest of each team crash
 * the boards. Orders from a human teammate (pass, shoot, oop) and from the attract director come first. */
const DIFF_TABLE = [
  { q: .35, react: .35, rel: .12, blk: .18, steal: .6, shove: .20, turbo: .50 },
  { q: .60, react: .22, rel: .08, blk: .12, steal: 1.0, shove: .45, turbo: .75 },
  { q: .80, react: .14, rel: .05, blk: .07, steal: 1.4, shove: .65, turbo: .90 },
  { q: .95, react: .08, rel: .03, blk: .04, steal: 1.8, shove: .80, turbo: 1.0 }
];
function diffOf(p) {
  const M = S.match, lv = clamp(M && M.diff ? M.diff[p.team] : 1, 0, 3), i = Math.floor(Math.min(lv, 2.999)), k = lv - i, a = DIFF_TABLE[i], b = DIFF_TABLE[Math.min(3, i + 1)], o = {};
  for (const key in a) o[key] = lerp(a[key], b[key], k);
  o.q = clamp(o.q + tune('cpuSkill') + comebackK(p.team) * .1, .05, 1); o.react *= tune('cpuReaction'); o.steal *= tune('cpuAggression'); o.shove *= tune('cpuAggression');
  if (get('team', p.teamId).boss) o.shove = Math.max(o.shove, .8);
  if (S.cheats.cpuPassive && !isLocal(p)) { o.steal = 0; o.shove = 0; o.passive = true; }
  return o;
}
function brainOf(p) { return p.brain || (p.brain = { t: 0, next: (p.slot % 4) * .025, intent: null, commit: 0, releaseAt: null, blockAt: null, stealT: 0, label: '' }); }
/** a direction toward a point, side-stepping defenders ahead and oil slicks on turbo */
function steer(p, tx, ty, avoid = true) {
  let dx = tx - p.x, dy = ty - p.y; const d = Math.hypot(dx, dy); if (d < 3) return [0, 0];
  dx /= d; dy /= d;
  if (avoid) for (const q of p.foes) {
    const rx = q.x - p.x, ry = q.y - p.y, rd = Math.hypot(rx, ry); if (rd > 34 || rd < .5) continue;
    const ahead = (rx * dx + ry * dy) / rd; if (ahead < .45) continue;
    const side = (rx * -dy + ry * dx) > 0 ? -1 : 1, w = (1 - rd / 34) * 1.1; dx += -dy * side * w; dy += dx * side * w;
  }
  if (TWIST.oil && p.turboOn) for (const s of TWIST.slicks) { const rx = s.x - p.x, ry = s.y - p.y, rd = Math.hypot(rx, ry); if (rd < s.r + 24 && rd > .5) { dx -= rx / rd * .6; dy -= ry / rd * .6; } }
  for (const L2 of TWIST.bombs || []) { const rx = L2.x - p.x, ry = L2.y - p.y, rd = Math.hypot(rx, ry); if (rd < 40 && rd > .5) { dx -= rx / rd; dy -= ry / rd; } }
  const l = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 18); return [dx / l * k, dy / l * k];
}
const goTo = (p, c, x, y, avoid) => { const m = steer(p, x, y, avoid); c.mx = m[0]; c.my = m[1]; return c; };
/** the shot clock and score decide how urgent a shot is */
function laneBlocked(p, tx, ty) { return p.foes.some(q => q.state !== 'knock' && segDist(q, p, { x: tx, y: ty }) < 12 && dist2(q.x, q.y, p.x, p.y) < dist2(tx, ty, p.x, p.y)); }

function aiThink(p, dt) {
  const B = brainOf(p), c = blankCmd(), M = S.match, b = S.ball; if (!M || !b) return c;
  B.t += dt; const D = diffOf(p);
  if (S.lesson && S.lesson.ai) { const r = S.lesson.ai(p, c, dt, B); if (r) return r; }
  if (p.passiveT > 0) { const own = defendRim(p.team); goTo(p, c, lerp(p.x, own.x, .3), p.y, false); return c; }   // just rebooted: dazed for a second
  // in the air: hold the jumper until the release planned for it (the top of the jump, give or take the CPU's error)
  if (p.state === 'gather') { c.shootD = true; return c; }
  if (p.state === 'air') {
    const J = p.jump || {};
    if (J.kind === 'shot' && !J.released) { if (B.releaseAt === null) B.releaseAt = J.ta + gauss() * D.rel; c.shootD = p.st < B.releaseAt; }
    else B.releaseAt = null;
    if (p.has && (J.kind === 'rebound' || J.kind === 'block') && dist2(p.x, p.y, attackRim(p.team).x, attackRim(p.team).y) < 40 && S.rng() < D.q) c.turboD = true;
    return c;
  }
  B.releaseAt = null;
  if (p.state !== 'run' && p.state !== 'inbound' && p.state !== 'cele' && p.state !== 'taunt') return c;
  if (M.phase === 'tipoff') return tipAI(p, c, D);
  if (M.phase === 'inbound') return inboundAI(p, c, D);
  if (M.phase !== 'live' && M.phase !== 'buzzer') { const s = M.deadSpots && M.deadSpots[p.slot]; if (s) goTo(p, c, s[0], s[1], false); B.label = 'JOG'; return c; }
  if (p.has) return handlerAI(p, c, D, B);
  if (b.state === 'held' || b.state === 'dunk') return b.owner && b.owner.team === p.team ? offBallAI(p, c, D, B) : defenseAI(p, c, D, B);
  if (b.state === 'pass') return b.pass.from.team === p.team ? offBallAI(p, c, D, B) : defenseAI(p, c, D, B);
  if (p.order && p.order.kind === 'putback' && b.state === 'loose' && dist2(b.x, b.y, p.x, p.y) < 26 && p.cd.jump <= 0) { c.shootP = true; c.turboD = true; return c; }
  return looseAI(p, c, D, B);
}
function tipAI(p, c, D) {
  const M = S.match, b = S.ball; if (!M.jumpers.includes(p) || p.tipJumped) return c;
  const want = M.tossT >= .45 + gauss() * .03 + (1 - D.q) * .12 + (b.z > 0 ? 0 : 0);
  if (want && b.vz < 120) c.shootP = true; return c;
}
function inboundAI(p, c, D) {
  const M = S.match;
  if (p.state === 'inbound') { if (M.phaseT > .8 + (1 - D.q) * .3) c.passP = true; return c; }
  const spot = M.inboundSpots && M.inboundSpots[p.slot]; if (spot) goTo(p, c, spot[0], spot[1], false);
  return c;
}
/* ---- the handler ---- */
/** is the way to the rim open? no defender within 30 of the line, nearer the rim than the handler */
function laneOpen(p, rim) { return !p.foes.some(q => q.state !== 'knock' && q.state !== 'frozen' && segDist(q, p, rim) < 26 && dist2(q.x, q.y, rim.x, rim.y) < dist2(p.x, p.y, rim.x, rim.y) + 6); }
function handlerAI(p, c, D, B) {
  const rim = attackRim(p.team), d = dist2(p.x, p.y, rim.x, rim.y), mate = p.mate;
  if (B.t >= B.next) {
    B.next = B.t + .1;
    const ord = p.order;
    if (ord && ord.kind === 'pass' && mate) setIntent(B, 'pass', .2);
    else if (ord && ord.kind === 'shoot') setIntent(B, canDunk(p) && d < dunkRange(p) * .8 ? 'dunk' : 'shoot', .4);
    else if (ord && ord.kind === 'jumper') setIntent(B, 'shoot', .4);
    else if (ord && ord.kind === 'oop' && mate) setIntent(B, oopReady(p, mate) ? 'oop' : 'pass', .2);
    else if (ord && (ord.kind === 'dunk' || ord.kind === 'quake')) { setIntent(B, 'dunk', .6); B.dunkAt = .5 + S.rng() * .3; }
    else if (ord && ord.kind === 'vent') setIntent(B, 'vent', .6);
    else if (ord && ord.kind === 'three') setIntent(B, isThree(p.x, p.y, rim) ? 'shoot' : 'spot3', .6);
    else if (ord && ord.kind === 'spin') setIntent(B, 'spin', .3);
    else if (B.commit <= 0 || !B.intent) chooseHandlerIntent(p, D, B, d);
  }
  B.commit -= 1 / 120;
  if (p.hasBallT !== undefined) p.hasBallT += 1 / 120;
  const hesitate = p.hasBallT < D.react * .8 + .15;
  switch (B.intent) {
    case 'advance': {   // bring it up: to the top of the key, at a jog
      const tx = rim.x - rim.side * 165, ty = CMY + (p.y < CMY ? -34 : 34); goTo(p, c, tx, ty, true);
      if (S.rng() < D.turbo * .15 && (p.turbo > .6 || p.infTurbo())) c.turboD = true; break;
    }
    case 'probe': {   // a defender in the way: dribble sideways to make space
      const a = Math.atan2(rim.y - p.y, rim.x - p.x) + (B.probeSide || 1) * 1.7; c.mx = Math.cos(a) * .8; c.my = Math.sin(a) * .8;
      if (p.y < OY + 30 || p.y > OY + CH - 30) B.probeSide = -(B.probeSide || 1); break;
    }
    case 'dunk': {
      goTo(p, c, rim.x - rim.side * 12, rim.y, true); c.turboD = true;
      if (!hesitate && canDunk(p) && d <= dunkRange(p) * B.dunkAt && (p.turbo > .05 || p.infTurbo())) { c.shootP = true; c.turboD = true; B.intent = null; B.commit = 0; }
      break;
    }
    case 'shoot': if (!hesitate) { c.shootP = true; B.intent = null; B.commit = 0; p.order = null; } break;
    case 'spot3': { const a = Math.atan2(p.y - rim.y, p.x - rim.x), tx = rim.x + Math.cos(a) * (THREE_R + 14), ty = rim.y + Math.sin(a) * (THREE_R + 14); goTo(p, c, clamp(tx, OX + 10, OX + CW - 10), clamp(ty, OY + 30, OY + CH - 30), true); if (isThree(p.x, p.y, rim) && dist2(p.x, p.y, rim.x, rim.y) > THREE_R + 4) { c.shootP = true; B.intent = null; p.order = null; } break; }
    case 'pass': if (!hesitate || p.order) { c.passP = true; B.intent = null; B.commit = 0; p.order = null; } break;
    case 'oop': if (oopReady(p, mate)) { c.oopP = true; B.intent = null; p.order = null; } else goTo(p, c, p.x - rim.side * 10, p.y, true); break;
    case 'spin': { const a = Math.atan2(rim.y - p.y, rim.x - p.x) + (S.rng() < .5 ? .7 : -.7); c.mx = Math.cos(a); c.my = Math.sin(a); c.shoveP = true; B.intent = 'drive'; B.commit = .3; p.order = null; break; }
    case 'wait': goTo(p, c, p.x - rim.side * 6, p.y, true); break;
    case 'vent': {   // ride a steam vent: VOLCANO LAUNCH
      const v = TWIST.vents.filter(q => (rim.side > 0 ? q.x > CMX : q.x < CMX)).sort((a, q) => dist2(a.x, a.y, p.x, p.y) - dist2(q.x, q.y, p.x, p.y))[0];
      if (!v) { B.intent = 'dunk'; break; }
      goTo(p, c, v.x, v.y, false); if (dist2(p.x, p.y, v.x, v.y) < 14 && v.puff > 0) { c.shootP = true; c.turboD = true; B.intent = null; p.order = null; }
      break;
    }
    default: {   // drive at the rim
      goTo(p, c, rim.x - rim.side * 18, rim.y + (p.y - rim.y) * .3, true);
      if (laneOpen(p, rim) && d > 80 && (p.turbo > .3 || p.infTurbo()) && S.rng() < D.turbo * .6) c.turboD = true;
    }
  }
  B.label = (B.intent || 'DRIVE').toUpperCase();
  return c;
}
function setIntent(B, k, commit) { B.intent = k; B.commit = commit; }
function chooseHandlerIntent(p, D, B, d) {
  const M = S.match, rim = attackRim(p.team), mate = p.mate, noise = () => gauss() * (1 - D.q) * .25, sc = {};
  const urgent = M.shot < 3.5 && M.phase === 'live', ch = shotChance(p), three = ch.three, open = !p.foes.some(q => dist2(q.x, q.y, p.x, p.y) < 26 && q.state === 'run');
  const back = (p.x - CMX) * rim.side < 0, fast = p.foes.every(q => dist2(q.x, q.y, rim.x, rim.y) > d + 30), lane = laneOpen(p, rim);
  const slamBias = (p.r.slam - 6) * .07, shooter = (Math.max(p.r.splash, p.r.deep) - 6) * .06, turboOk = p.turbo >= .15 || p.infTurbo(), range = dunkRange(p);
  if (back && !fast && !urgent && !p.order) { setIntent(B, 'advance', .4); return; }
  sc.dunk = turboOk && d <= range ? (lane ? .52 : .1) + slamBias + (p.isNova() ? .35 : 0) + (S.attract ? .5 : 0) - Math.max(0, d / range - .7) * .6 : -1;
  sc.drive = d > 60 ? (lane ? .5 : .22) + slamBias * .5 : -.4;
  sc.shoot = ch.p * (three ? 3 : 2) / 2.2 + (open ? .2 : -.15) + shooter + (urgent ? .9 : 0) - (d > 230 && !urgent ? 1 : 0) - (M.shot > 14 && !open ? .2 : 0);
  if (TWIST.windOn && Math.hypot(TWIST.windX, TWIST.windY) > .6 && M.shot > 6) { sc.shoot -= .3; sc.wait = .45; }
  if (!lane && M.shot > 7) sc.probe = .42;
  if (mate && mate.free()) {
    const mc = shotChance(mate, { x: mate.x, y: mate.y }), md = dist2(mate.x, mate.y, rim.x, rim.y), pressed = p.foes.some(q => dist2(q.x, q.y, p.x, p.y) < 18);
    const risk = p.foes.some(q => segDist(q, p, mate) < 10) ? .3 : 0, mateOpen = !mate.foes.some(q => dist2(q.x, q.y, mate.x, mate.y) < 28);
    sc.pass = mc.p * (mc.three ? 3 : 2) / 2.2 - ch.p * (three ? 3 : 2) / 2.2 + (pressed ? .3 : 0) + (mateOpen ? .15 : -.1) - risk + (mate.call > 0 ? .45 : 0) + (isLocal(mate) ? .12 : 0) + (md < dunkRange(mate) && mateOpen ? .15 : 0) + p.r.dime * .01;
    if (oopReady(p, mate)) sc.oop = .3 + mate.r.slam / 40 + (S.attract ? .4 : 0) - risk;
  }
  const ahead = p.foes.find(q => q.state === 'run' && dist2(q.x, q.y, p.x, p.y) < 20 && Math.abs(E.angDiff(Math.atan2(rim.y - p.y, rim.x - p.x), Math.atan2(q.y - p.y, q.x - p.x))) < .6);
  if (ahead && (p.turbo >= .2 || p.infTurbo()) && p.cd.spin <= 0) sc.spin = .45 + p.r.dime * .02;
  if (urgent && sc.dunk > 0) sc.dunk += .4;
  let best = 'drive', bv = -9; for (const k in sc) { const v = sc[k] + noise(); if (v > bv) { bv = v; best = k; } }
  B.dunkAt = .55 + S.rng() * .35; B.probeSide = S.rng() < .5 ? 1 : -1;
  setIntent(B, best, best === 'drive' ? .35 : best === 'dunk' ? .6 : best === 'probe' ? .45 : .15);
}
/* ---- off the ball, on offense ---- */
function offBallAI(p, c, D, B) {
  const b = S.ball, h = b.owner || (b.pass && b.pass.from), rim = attackRim(p.team);
  if (b.state === 'pass' && b.pass.to === p) { const ps = b.pass; goTo(p, c, ps.bx, ps.by, false); B.label = 'GET OPEN'; return c; }
  if (p.order && p.order.kind === 'putback') { goTo(p, c, rim.x - rim.side * 22, rim.y + 8, false); B.label = 'CRASH'; return c; }
  // a power-up nearby, nobody near it
  const pu = POWERUPS.floor.find(u => dist2(u.x, u.y, p.x, p.y) < 120 && !p.foes.some(q => dist2(q.x, q.y, u.x, u.y) < 40));
  if (pu && !p.pu) { goTo(p, c, pu.x, pu.y, true); c.turboD = S.rng() < D.turbo; B.label = 'POWER-UP'; return c; }
  if (!h) return c;
  const hd = dist2(h.x, h.y, rim.x, rim.y), driving = h.has && Math.hypot(h.vx, h.vy) > 90 && hd < 170;
  let tx, ty;
  if (driving || (h.brain && h.brain.intent === 'oop')) { tx = rim.x - rim.side * 30; ty = rim.y + (h.y < rim.y ? 44 : -44); B.label = 'CUT'; if (dist2(p.x, p.y, tx, ty) > 50) c.turboD = S.rng() < D.turbo; }
  else {
    const ha = Math.atan2(h.y - rim.y, h.x - rim.x), wingA = ha + (Math.sin(ha) > 0 ? -1.1 : 1.1), R2 = p.r.deep >= 7 ? THREE_R + 16 : 110;
    tx = rim.x + Math.cos(wingA) * R2; ty = rim.y + Math.sin(wingA) * R2; B.label = 'SPOT UP';
  }
  tx = clamp(tx, OX + 12, OX + CW - 12); ty = clamp(ty, OY + 14, OY + CH - 14);
  if (dist2(tx, ty, h.x, h.y) < 70) { const a = Math.atan2(ty - h.y, tx - h.x); tx = h.x + Math.cos(a) * 70; ty = h.y + Math.sin(a) * 70; }
  goTo(p, c, tx, ty, true);
  const open = !p.foes.some(q => dist2(q.x, q.y, p.x, p.y) < 30), pressed = h.foes.some(q => dist2(q.x, q.y, h.x, h.y) < 18);
  if (open && pressed && S.rng() < .02) p.call = .6;
  return c;
}
/* ---- defense ---- */
function marksFor(team) {
  const def = S.players.filter(q => q.team === team), off = S.players.filter(q => q.team !== team); if (def.length < 2 || off.length < 2) return new Map(def.map((q, i) => [q, off[i] || off[0]]));
  const a = dist2(def[0].x, def[0].y, off[0].x, off[0].y) + dist2(def[1].x, def[1].y, off[1].x, off[1].y), b = dist2(def[0].x, def[0].y, off[1].x, off[1].y) + dist2(def[1].x, def[1].y, off[0].x, off[0].y);
  return a <= b + 30 ? new Map([[def[0], off[0]], [def[1], off[1]]]) : new Map([[def[0], off[1]], [def[1], off[0]]]);
}
function defenseAI(p, c, D, B) {
  const b = S.ball, own = defendRim(p.team), h = b.owner || (b.pass && b.pass.to);
  // orders first (the attract director's): shove the nearest, swipe at the handler
  if (p.order && p.order.kind === 'shove') { const t = p.foes.slice().sort((a, q) => dist2(a.x, a.y, p.x, p.y) - dist2(q.x, q.y, p.x, p.y))[0]; if (t) { goTo(p, c, t.x, t.y, false); c.turboD = true; if (dist2(t.x, t.y, p.x, p.y) < 22 && (p.turbo > .1 || p.infTurbo())) { c.shoveP = true; p.order = null; } return c; } }
  if (p.order && p.order.kind === 'steal' && b.owner && b.owner.team !== p.team) { const hd = b.owner; goTo(p, c, hd.x, hd.y, false); c.turboD = true; if (dist2(hd.x, hd.y, p.x, p.y) < 18 && p.cd.steal <= 0) { c.passP = true; p.order = null; } return c; }
  const mark = p.order && p.order.kind === 'block' && h ? h : marksFor(p.team).get(p) || h; if (!mark) return c;
  const onBall = mark === b.owner || (b.state === 'pass' && b.pass.to === mark);
  // help: the handler is driving and my mark is far from the ball
  const handler = b.state === 'held' || b.state === 'dunk' ? b.owner : null, hd = handler ? dist2(handler.x, handler.y, own.x, own.y) : 999;
  const help = !onBall && handler && hd < 175 && (handler.x - CMX) * own.side > 0;   // the rim protector sags into the lane
  let tx, ty;
  if (help) { const a = Math.atan2(handler.y - own.y, handler.x - own.x), k = clamp(hd * .28, 22, 46); tx = own.x + Math.cos(a) * k; ty = own.y + Math.sin(a) * k; }
  else { const tgt = mark, gap = onBall ? 15 + (1 - D.q) * 8 : 30, a = Math.atan2(own.y - tgt.y, own.x - tgt.x); tx = tgt.x + Math.cos(a) * gap; ty = tgt.y + Math.sin(a) * gap; }
  goTo(p, c, tx, ty, false); B.label = help ? 'PROTECT RIM' : 'MARK ' + (mark.slot + 1);
  if (dist2(p.x, p.y, tx, ty) > 60 && (p.turbo > .3 || p.infTurbo()) && S.rng() < D.turbo) c.turboD = true;
  if (D.passive) return c;
  // a shooter rising nearby: jump to block (after a reaction delay, with timing error)
  const riser = p.foes.find(q => (q.state === 'gather' || (q.state === 'air' && q.jump && (q.jump.kind === 'shot' || q.jump.kind === 'layup') && !q.jump.released) || (q.state === 'dunk' && q.dunk && !q.dunk.slammed)) && dist2(q.x, q.y, p.x, p.y) < (q.state === 'dunk' ? 140 : 42));
  if (riser && riser.state === 'dunk') {   // time the leap so the hands meet the ball late in the dunk's flight
    const Dk = riser.dunk, left = Dk.T - Dk.t, apexT = jumpSpeed(p, 250) / pGravity(p), sl = Dk.sl;
    if (B.blockErr === undefined || B.blockFor !== riser) { B.blockFor = riser; B.blockErr = gauss() * D.blk + D.react * .35; }
    goTo(p, c, sl.x, sl.y, false); c.turboD = true;
    if (dist2(p.x, p.y, sl.x, sl.y) < 48 && left <= apexT * .9 + B.blockErr && p.cd.jump <= 0) { c.shootP = true; B.label = 'BLOCK'; B.blockErr = undefined; }
    return c;
  }
  if (riser) {
    if (B.blockAt === null) B.blockAt = B.t + Math.max(0, D.react + gauss() * D.blk);
    if (B.t >= B.blockAt && p.cd.jump <= 0) { c.shootP = true; B.blockAt = null; B.label = 'BLOCK'; }
    else if (riser.state === 'gather' && S.rng() < D.shove * .25 * (1 / 120) * 60 && (p.turbo > .3 || p.infTurbo()) && dist2(riser.x, riser.y, p.x, p.y) < 22) { c.shoveP = true; B.label = 'SHOVE'; }
    goTo(p, c, riser.x, riser.y, false);
    return c;
  }
  B.blockAt = null;
  if (handler && onBall && handler.state === 'run') {
    const d = dist2(p.x, p.y, handler.x, handler.y);
    if (d < tune('stealReach') + 4 && p.cd.steal <= 0 && S.rng() < D.steal * p.f('swipe') / 120) { c.passP = true; B.label = 'STEAL'; }
    const inPaint = dist2(handler.x, handler.y, own.x, own.y) < 80;
    if (d < 24 && (inPaint || S.rng() < .3) && (p.turbo > .3 || p.infTurbo()) && p.cd.shove <= 0 && S.rng() < D.shove * (inPaint ? 1.2 : .35) / 120) { c.shoveP = true; B.label = 'SHOVE'; }
  }
  return c;
}
/* ---- loose balls and shots in the air ---- */
function looseAI(p, c, D, B) {
  const b = S.ball, team = S.players.filter(q => q.team === p.team);
  let tx = b.x + b.vx * .25, ty = b.y + b.vy * .25;
  if (b.state === 'shot' && b.shot) { const rim = RIMS[b.shot.rim]; const off = (p.slot % 2 ? 1 : -1) * 18; tx = rim.x - rim.side * 26; ty = rim.y + off; }
  const near = team.slice().sort((a, q) => dist2(a.x, a.y, tx, ty) - dist2(q.x, q.y, tx, ty))[0];
  if (near === p || b.state === 'shot') {
    goTo(p, c, tx, ty, false); B.label = 'BOARDS'; if (dist2(p.x, p.y, tx, ty) > 60 && S.rng() < D.turbo) c.turboD = true;
    const reachTop = p.z + p.reach() + 30, close = dist2(p.x, p.y, b.x, b.y) < 22;
    if (close && b.z > p.reach() * .9 && b.z < reachTop + 20 && b.vz < 60 && p.cd.jump <= 0 && S.rng() < .2 + D.q * .3) c.shootP = true;
  } else { const own = defendRim(p.team); goTo(p, c, lerp(b.x, own.x, .5), lerp(b.y, own.y, .3), false); B.label = 'GET BACK'; }
  return c;
}
