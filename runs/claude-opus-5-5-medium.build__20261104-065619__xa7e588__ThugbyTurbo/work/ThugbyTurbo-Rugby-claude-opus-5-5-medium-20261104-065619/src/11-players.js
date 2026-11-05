/* ---- PLAYERS: movement, turbo, the buttons (pass, kick, step, fend, tackle, big hit, dive, super) and contact ---- */
const NO_INTENT = { mx: 0, my: 0, turbo: false, p: {}, h: {}, r: {}, aim: null, click: -1 };

/** every player's step: states and timers, then (if free and play is live) the intent's actions and movement.
 *  hold: play isn't live (set pieces, stoppages): no actions, players walk to their spots (the AI's targets) */
function playersStep(dt, hold) {
  for (const p of M.players) {
    if (!onField(p)) continue;
    const it = (M.intents && M.intents[p.id]) || NO_INTENT;
    p.stT += dt; p.cool = Math.max(0, p.cool - dt); p.evade = Math.max(0, p.evade - dt); p.fendT = Math.max(0, p.fendT - dt);
    p.sideCd = Math.max(0, p.sideCd - dt); p.fendCd = Math.max(0, p.fendCd - dt); p.xTapT += dt; p.flash = Math.max(0, p.flash - dt);
    p.toasted = Math.max(0, p.toasted - dt); p.zapped = Math.max(0, p.zapped - dt);
    if (p.fire > 0) { p.fire -= dt; if (p.fire <= 0) { p.fire = 0; emit('fireOut', { pid: p.id }); } }
    if (p.power) { p.power.t -= dt; if (p.power.t <= 0) { emit('powerupEnd', { pid: p.id, kind: p.power.kind }); p.power = null; } }
    if (p.superT > 0) { p.superT -= dt; if (p.superT <= 0) { p.superK = ''; p.homing = -1; emit('superEnd', { pid: p.id }); } }
    if (onMud(p.x, p.y) && (p.st === 'tackled' || p.st === 'ground' || Math.hypot(p.vx, p.vy) > 40)) p.mud = Math.min(.6, p.mud + dt * (p.st === 'run' ? .01 : .05));
    stateStep(p, dt);
    if (p.st === 'tackled' && M.ball.holder === p.id && p.stT < .15 && M.phase === 'play' && !p.offloaded) {   // the offload window
      const side = it.p.l1 || it.r.l1 ? -1 : it.p.r1 || it.r.r1 ? 1 : 0;
      if (side) { const r = receivers(p, side).concat(receivers(p, -side)).find(q => Math.hypot(q.x - p.x, q.y - p.y) < 50); p.offloaded = true; if (r) { passTo(p, r, false); M.stats[p.team].offloads++; addHype(p.team, 6); emit('offload', { pid: p.id, to: r.id }); } }
    }
    if (p.st !== 'tackled') { p.offloaded = false; p.offTry = false; }
    if (isFree(p) && !hold && M.phase === 'play') { actions(p, it, dt); }
    if (isFree(p) && !hold) move(p, it, dt, hold);
    else if (p.st !== 'launched') { p.vx *= Math.exp(-6 * dt); p.vy *= Math.exp(-6 * dt); }
    if (p.st === 'launched') launchedStep(p, dt);
    else { p.x += p.vx * dt; p.y += p.vy * dt; }
    if (p.st !== 'launched' && p.st !== 'diving') p.z = Math.max(0, p.z + p.vz * dt), p.vz = p.z > 0 ? p.vz - 700 * dt : 0;
    // the stadium's bounds
    p.x = clamp(p.x, G.DEAD[0] - 40, G.DEAD[1] + 40); p.y = clamp(p.y, G.Y0 - 40, G.Y1 + 44);
  }
  separate();
  if (M.phase === 'play' && !hold) contactStep(dt);
}
TT.sim.playersStep = (dt, hold) => playersStep(dt, hold);

/** the timed states: falls, get-ups, the end of each move */
function stateStep(p, dt) {
  switch (p.st) {
    case 'pass': if (p.stT > .22) p.st = 'run'; break;
    case 'kick': if (p.stT > .35) p.st = 'run'; break;
    case 'sidestep': if (p.stT > .3) p.st = 'run'; break;
    case 'spin': if (p.stT > .45) { p.st = 'run'; p.vx *= .85; p.vy *= .85; } break;
    case 'fend': if (p.stT > .45) p.st = 'run'; break;
    case 'tackling': if (p.stT > .35) { p.st = 'ground'; p.stT = 0; p.stun = Math.max(p.stun, .45); } break;
    case 'diving': {
      const u = p.stT / .35; p.z = Math.max(0, Math.sin(clamp(u, 0, 1) * PI) * 5);
      if (p.stT > .35) { p.z = 0; p.st = 'ground'; p.stT = 0; p.stun = Math.max(p.stun, p.diveMiss ? 1.2 : .4); }
      break;
    }
    case 'ground': case 'stunned': if (p.stT > Math.max(.3, p.stun)) { p.st = 'getup'; p.stT = 0; } break;
    case 'getup': if (p.stT > .45) { p.st = 'run'; p.stT = 0; p.stun = 0; } break;
    case 'tackled':
      if (M.phase === 'play' && p.stT > .5 && M.ball.holder === p.id) TT.sp.startRuck(p);
      else if (M.phase === 'play' && p.stT > 1 && M.ball.holder !== p.id) { p.st = 'getup'; p.stT = 0; }
      break;
    case 'held': {   // the boss, held by one tackler: slowed, dragging him; a second tackle brings him down, else he shrugs it off
      p.held -= dt; const by = pl(p.heldBy);
      if (by && by.st === 'tackling') { by.x = p.x - Math.cos(p.facing) * 8; by.y = p.y - Math.sin(p.facing) * 8; by.stT = 0; }
      if (p.held <= 0) { p.st = 'run'; p.stT = 0; if (by) { knockDown(by, .9, p); by.vx = -Math.cos(p.facing) * 120; by.vy = -Math.sin(p.facing) * 120; } emit('shrug', { pid: p.id }); }
      break;
    }
    case 'celebrate': p.vx *= .9; p.vy *= .9; if (M.phase !== 'try' && M.phase !== 'full' && p.stT > 3) p.st = 'run'; break;
  }
}
function launchedStep(p, dt) {
  const L = p.launch; L.t += dt;
  p.x += p.vx * dt; p.y += p.vy * dt; p.vz -= 500 * dt; p.z += p.vz * dt;
  if (L.t > .1) for (const q of M.players) {   // a body in flight flattens whoever it lands on
    if (q === p || !standing(q) || L.hit[q.id]) continue;
    if (Math.hypot(q.x - p.x, q.y - p.y) < 10 && p.z < 30) { L.hit[q.id] = 1; knockDown(q, 1, p); emit('skittle', { pid: q.id }); if (M.ball.holder === q.id) spillBall(q, .5); }
  }
  if (Math.hypot(M.ref.x - p.x, M.ref.y - p.y) < 10 && p.z < 30 && M.ref.down <= 0 && !L.ref) { L.ref = 1; refDown(); }
  if (p.z <= 0) { p.z = 0; p.vz = 0; p.vx *= .5; p.vy *= .5; p.st = 'ground'; p.stT = 0; p.stun = 1.1; emit('land', { pid: p.id, x: p.x, y: p.y, dist: Math.hypot(p.x - L.x0, p.y - L.y0) }); M.bestHit = Math.max(M.bestHit, Math.hypot(p.x - L.x0, p.y - L.y0)); }
}
function refDown() { M.ref.down = 8; emit('refDown', {}); }
TT.sim.refDown = () => refDown();

/** movement: the stick toward a speed, turbo, mud, power-ups; the AI and humans alike */
function move(p, it, dt, hold) {
  const carrying = M.ball.holder === p.id;
  let mx = it.mx || 0, my = it.my || 0;
  if (p.superK === 'hurricane') { const h = holder(); if (h && h.team !== p.team) { const dx = h.x - p.x, dy = h.y - p.y, dd = Math.hypot(dx, dy) || 1; mx = dx / dd; my = dy / dd; } }
  const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
  if (p.st === 'kick' && p.kickHold > 0) { /* running straight while the meter fills */ }
  let top = TUNE.v.runSpeed * (.8 + .04 * statOf(p, 'SPD')) * (carrying ? .96 : 1);
  let acc = TUNE.v.accel * (1.15 - .03 * Math.min(10, statOf(p, 'POW')));
  // turbo: held (or toggled by the seat), drains a tank, refills after a pause
  const unlimited = p.fire > 0 || (p.power && p.power.kind === 'pie') || cheat('infTurbo') && p.team === 0 || M.drill;
  const wantTurbo = it.turbo && m > .2 && !hold;
  if (wantTurbo && (p.turbo > 0 || unlimited)) { top *= TUNE.v.turboMult; if (!unlimited) p.turbo = Math.max(0, p.turbo - dt / TUNE.v.turboTank); p.turboIdle = 0; p.turboOn = true; }
  else { p.turboOn = false; if (wantTurbo && p.turbo <= 0 && !p.sputter) { p.sputter = 1; emit('sputter', { pid: p.id }); } if (!wantTurbo) p.sputter = 0; p.turboIdle += dt; if (p.turboIdle > .6) p.turbo = Math.min(1, p.turbo + TUNE.v.turboRegen * dt); }
  if (p.st === 'charge') top *= 1.15;
  if (p.superK === 'thunder') top *= p.data.boss ? 1.2 : 1.35;
  if (p.superK === 'hurricane' && p.homing >= 0) top *= 2;
  if (onMud(p.x, p.y)) { top *= .8; acc *= .6; }
  if (p.st === 'spin') top *= .9;
  if (hold) top *= .8;
  if (p.data.boss && p.st === 'held') top *= .4;
  const tvx = mx * top, tvy = my * top;
  p.vx = TT.approach(p.vx, tvx, acc * dt); p.vy = TT.approach(p.vy, tvy, acc * dt);
  if (m > .15 && p.st !== 'sidestep') p.facing = E.approachAng(p.facing, Math.atan2(my, mx), (carrying ? 8 : 10) * dt);
}

/** keep bodies apart (except where they bind: rucks, scrums, lineouts, the held boss) */
function separate() {
  const P = M.players;
  for (let i = 0; i < P.length; i++) {
    const a = P[i]; if (!onField(a) || a.st === 'scrum' || a.st === 'ruck' || a.st === 'lift' || a.st === 'launched') continue;
    for (let j = i + 1; j < P.length; j++) {
      const b = P[j]; if (!onField(b) || b.st === 'scrum' || b.st === 'ruck' || b.st === 'lift' || b.st === 'launched') continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = 8 * (a.data.boss || b.data.boss ? 1.4 : 1);
      if (d < min && d > .01) { const k = (min - d) / 2 / d; a.x -= dx * k; a.y -= dy * k; b.x += dx * k; b.y += dy * k; }
    }
  }
}

/* ---- the buttons ---- */
function actions(p, it, dt) {
  const carrying = M.ball.holder === p.id;
  const P = it.p || {}, H = it.h || {}, R = it.r || {};
  if (P.tri && M.hype[p.team] >= 100 && !p.superK) return startSuper(p, carrying ? 'thunder' : 'hurricane');
  if (carrying) {
    // passes: L1 up the screen, R1 down; a hold of 0.25 s is a long pass; a click on a teammate passes to him
    for (const k of ['l1', 'r1']) {
      if (H[k]) p.passHold[k] += dt;
      if (R[k] || (H[k] && p.passHold[k] > .5)) { const long = p.passHold[k] > .25; p.passHold[k] = 0; return pass(p, k === 'l1' ? -1 : 1, long); }
      if (!H[k]) p.passHold[k] = 0;
    }
    if (it.click >= 0 && pl(it.click) && pl(it.click).team === p.team && it.click !== p.id) return passTo(p, pl(it.click), false, true);
    // kicks: tap ○ grubber; hold ○ the punt meter (a drop goal in their 22 facing the posts); the mouse's right button aims
    if (H.ci) { p.kickHold += dt; if (p.st !== 'kick' || p.stT > .3) { /* meter filling */ } if (p.kickHold > 1.6) { p.kickHold = 0; return kick(p, 1, it); } }
    else if (R.ci) { const h = p.kickHold; p.kickHold = 0; return kick(p, h < .2 ? -1 : clamp(h / .9, 0, 1), it); }
    else p.kickHold = 0;
    // ✕: a sidestep (twice quickly: a spin), or a dive over the line in the in-goal
    if (P.x) {
      const tl = tryLineOf(p.team);
      if ((p.x - tl) * dirOf(p.team) > 0) return tryDive(p);
      if (p.xTapT < .25 && p.st === 'sidestep') return spin(p);
      p.xTapT = 0;
      if (p.sideCd <= 0) return sidestep(p, it);
    }
    if (P.sq && p.fendCd <= 0) return fend(p);
    return;
  }
  // without the ball: ✕ tackles (tap) or charges a big hit (held, let go in range); □ dives; switching is the seat's
  if (H.x || P.x) {
    if (p.st !== 'charge') { p.st = 'charge'; p.stT = 0; p.charge = 0; }
    p.charge += dt;
  }
  if (p.st === 'charge' && !H.x && !P.x) {
    const c = p.charge; p.st = 'run'; p.charge = 0;
    if (c < .2) tackleTry(p, 'tackle'); else tackleTry(p, 'big', clamp(c / TUNE.v.bigHitCharge, 0, 1), c > 1.2);
    return;
  }
  if (P.sq && p.st !== 'charge') return diveTackle(p);
}
TT.sim.actions = (p, it, dt) => actions(p, it, dt);

/** the receivers a pass can reach: not in front, near, standing; side -1 up the screen (smaller y), +1 down */
function receivers(p, side) {
  const d = dirOf(p.team);
  return M.players.filter(q => q.team === p.team && q !== p && standing(q) && isFree(q) && (q.x - p.x) * d <= 4 && Math.hypot(q.x - p.x, q.y - p.y) < 220 && (side == null || Math.sign(q.y - p.y) === side))
    .sort((a, b) => Math.abs(a.y - p.y) - Math.abs(b.y - p.y));
}
TT.sim.receivers = (p, side) => receivers(p, side);
function pass(p, side, long) {
  let list = receivers(p, side);
  if (!list.length && TT.settings.passAssist !== 'Off' && p.ctl >= 0) list = receivers(p, -side);
  if (!list.length && p.ctl < 0) list = receivers(p, null);
  if (!list.length) return dummy(p, side);
  const near = list.filter(q => Math.abs(q.y - p.y) < 110);
  const r = long ? (list[1] || list[0]) : (near[0] || list[0]);
  passTo(p, r, long && list.length > 1);
}
function passTo(p, r, long, clicked) {
  const b = M.ball, d = dirOf(p.team);
  const speed = long ? 300 : TUNE.v.passSpeed, dist = Math.hypot(r.x - p.x, r.y - p.y), t = dist / speed;
  let tx = r.x + r.vx * t * .9, ty = r.y + r.vy * t * .9;
  if (!clicked && (tx - p.x) * d > 0) tx = p.x - d * 2;   // (assisted passes never go forward: led flat at worst)
  const fl = Math.hypot(tx - p.x, ty - p.y) / speed;
  const v = { vx: (tx - b.x) / fl, vy: (ty - b.y) / fl, vz: BALL_G * fl / 2 };
  launchBall(p, v.vx, v.vy, v.vz, 'pass', { target: r.id, long: !!long, offload: p.st === 'tackled' });
  b.forward = (v.vx - p.vx) * d > 4 + Math.abs(p.vx) * .25 && !M.drill || ((v.vx - p.vx) * d > 4 && clicked);
  if (b.forward) emit('forwardThrown', { pid: p.id });
  if (p.st !== 'tackled') { p.st = 'pass'; p.stT = 0; }
  p.cool = .25; p.passSide = Math.sign(r.y - p.y);
  if (M.useIt && M.useIt.pid === p.id) M.useIt = null;
  if (p.superK === 'thunder') { p.superK = ''; p.superT = 0; emit('superEnd', { pid: p.id }); }
  emit('pass', { pid: p.id, to: r.id, long: !!long, offload: p.st === 'tackled' });
}
function dummy(p, side) {
  p.st = 'pass'; p.stT = 0; p.cool = .3; p.passSide = side; let sold = 0;
  for (const q of M.players) if (q.team !== p.team && standing(q) && Math.hypot(q.x - p.x, q.y - p.y) < 40 && rnd() < .4) { q.st = 'stunned'; q.stT = 0; q.stun = .3; q.vx = 0; q.vy = side * 60; sold++; }
  if (sold) addHype(p.team, 4 * sold);
  emit('dummy', { pid: p.id, sold });
}
function sidestep(p, it) {
  const f = p.facing; let side = 0;
  if (Math.hypot(it.mx, it.my) > .3) { const cross = Math.cos(f) * it.my - Math.sin(f) * it.mx; side = cross >= 0 ? 1 : -1; }
  else { const o = nearestFoe(p); side = o ? ((Math.cos(f) * (o.y - p.y) - Math.sin(f) * (o.x - p.x)) > 0 ? -1 : 1) : 1; }
  const nx = -Math.sin(f) * side, ny = Math.cos(f) * side, pw = TUNE.v.sidestepPower;
  p.vx += nx * pw; p.vy += ny * pw; p.st = 'sidestep'; p.stT = 0; p.evade = TUNE.v.sidestepEvade; p.evadeKind = 'step'; p.sideCd = .6; p.stepSide = side;
  emit('stepMove', { pid: p.id });
}
function spin(p) { p.st = 'spin'; p.stT = 0; p.evade = .4; p.evadeKind = 'spin'; p.sideCd = .8; emit('spinMove', { pid: p.id }); }
function fend(p) { p.st = 'fend'; p.stT = 0; p.fendT = TUNE.v.fendWindow; p.fendCd = .8; emit('fendMove', { pid: p.id }); }
function tryDive(p) {
  p.st = 'diving'; p.stT = 0; p.diveMiss = false; p.vx = Math.cos(p.facing) * 120; p.vy = Math.sin(p.facing) * 120;
  addHype(p.team, 3); emit('tryDive', { pid: p.id });
  tryScored(p, 'try');
}
const nearestFoe = p => { let best = null, bd = 1e9; for (const q of M.players) if (q.team !== p.team && standing(q)) { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd) { bd = d; best = q; } } return best; };
TT.sim.nearestFoe = p => nearestFoe(p);

/** kicks: power -1 a grubber; 0..1 a punt (stick back: a bomb; in their 22 facing the posts: a drop goal) */
function kick(p, power, it) {
  const d = dirOf(p.team), tl = tryLineOf(p.team), toPosts = Math.hypot(tl - p.x, G.CY - p.y), mega = M.megaBoot[p.team] > 0;
  const back = (it.mx || 0) * d < -.5, across = Math.abs(it.my || 0) > .6;
  let aimA = d > 0 ? 0 : PI;
  if (it.aim) aimA = Math.atan2(it.aim[1] - p.y, it.aim[0] - p.x);
  else if (Math.hypot(it.mx, it.my) > .3 && !back) aimA = Math.atan2(it.my, it.mx);
  // keep the aim in the forward cone
  const fwd = d > 0 ? 0 : PI; aimA = fwd + clamp(TT.angDiff(fwd, aimA), -1.22, 1.22);
  M.ball.x = p.x + Math.cos(p.facing) * 4; M.ball.y = p.y + Math.sin(p.facing) * 4;
  p.st = 'kick'; p.stT = 0; p.cool = .4; M.stats[p.team].kicks++;
  if (M.useIt && M.useIt.pid === p.id) M.useIt = null;
  if (p.superK === 'thunder') { p.superK = ''; p.superT = 0; emit('superEnd', { pid: p.id }); }
  const kck = statOf(p, 'KCK'), fire = p.fire > 0 ? 1.2 : 1;
  if (power < 0) {   // a grubber along the ground
    const a = fwd + clamp(TT.angDiff(fwd, aimA), -.8, .8), dist = U(140, 200) * fire * (mega ? 1.3 : 1);
    M.ball.z = 3; launchBall(p, Math.cos(a) * dist * .9, Math.sin(a) * dist * .9, 40, 'grubber');
    emit('kick', { pid: p.id, kind: 'grubber' }); return;
  }
  const inZone = ((tl - p.x) * d < 225 + 20 || toPosts < 300) && Math.abs(TT.angDiff(p.facing, Math.atan2(G.CY - p.y, tl - p.x))) < 1.2;
  if (inZone && !back && !(across && !it.aim) && !(it.aim && Math.abs(TT.angDiff(aimA, Math.atan2(G.CY - p.y, tl - p.x))) > .5)) {   // a drop goal
    const a = Math.atan2(G.CY - p.y, tl - p.x) + (it.my || 0) * .14 * d + (power > .9 || mega ? 0 : U(-1, 1) * (11 - kck) * PI / 180);
    const dist = lerp(160, TUNE.v.kickMax, power) * (.75 + .03 * kck) * (mega ? 1.6 : 1) * fire;
    M.ball.z = 4; const sp = Math.sqrt(BALL_G * dist / Math.sin(2 * .62));
    launchBall(p, Math.cos(a) * Math.cos(.62) * sp, Math.sin(a) * Math.cos(.62) * sp, Math.sin(.62) * sp, 'drop', { goalTeam: p.team });
    M.ball.goalCheck = { team: p.team, kind: 'drop', pid: p.id };
    emit('kick', { pid: p.id, kind: 'drop' }); return;
  }
  const sweet = power > .9;
  let dist = lerp(120, TUNE.v.kickMax, power) * (.75 + .03 * kck) * (sweet ? 1.08 : 1) * fire * (mega ? 1.6 : 1);
  let apex = lerp(60, 110, power), kind = 'kick';
  if (back) { apex = 150; dist *= .5; kind = 'bomb'; }
  const a = aimA + (sweet || mega ? 0 : U(-1, 1) * (11 - kck) * PI / 180);
  const tx = p.x + Math.cos(a) * dist, ty = p.y + Math.sin(a) * dist;
  const v = arcTo(p.x, p.y, 4, tx, ty, 0, apex);
  M.ball.z = 4; launchBall(p, v.vx, v.vy, v.vz, kind);
  emit('kick', { pid: p.id, kind, mega });
  if (mega) M.megaBoot[p.team] = 0;
}
TT.sim.kick = (p, power, it) => kick(p, power, it || NO_INTENT);

/* ---- contact ---- */
/** a tackle attempt by p: 'tackle' (a tap), 'big' (a charged hit: charge 0..1, over: held too long, a high shot), 'dive' */
function tackleTry(p, kind, charge = 0, over = false) {
  const h = holder();
  const range = kind === 'big' ? 18 : kind === 'dive' ? TUNE.v.diveRange : TUNE.v.tackleRange;
  const inFront = q => { const a = Math.atan2(q.y - p.y, q.x - p.x); return Math.abs(TT.angDiff(p.facing, a)) < 1.25; };
  if (h && h.team !== p.team && Math.hypot(h.x - p.x, h.y - p.y) < range + (h.data.boss ? 4 : 0) && (inFront(h) || Math.hypot(h.x - p.x, h.y - p.y) < 8)) return resolveTackle(p, h, kind, charge, over);
  // a cheap shot: an opponent without the ball in reach
  if (kind !== 'dive') {
    const v = M.players.find(q => q.team !== p.team && standing(q) && q !== h && Math.hypot(q.x - p.x, q.y - p.y) < 14 && inFront(q));
    if (v) return cheapShot(p, v);
  }
  // a whiff: a lunge at nothing (a missed big hit sprawls)
  if (kind === 'big') { p.st = 'tackling'; p.stT = 0; p.stun = 1; p.vx = Math.cos(p.facing) * 150; p.vy = Math.sin(p.facing) * 150; emit('whiff', { pid: p.id }); }
  else { p.st = 'tackling'; p.stT = .15; p.vx = Math.cos(p.facing) * 110; p.vy = Math.sin(p.facing) * 110; }
}
TT.sim.tackleTry = (p, k, c, o) => tackleTry(p, k, c, o);
function diveTackle(p) {
  p.st = 'diving'; p.stT = 0; p.vx = Math.cos(p.facing) * 170; p.vy = Math.sin(p.facing) * 170; p.diveMiss = true;
  emit('diveStart', { pid: p.id });
  const h = holder();
  if (h && h.team !== p.team && Math.hypot(h.x - p.x, h.y - p.y) < TUNE.v.diveRange && Math.abs(TT.angDiff(p.facing, Math.atan2(h.y - p.y, h.x - p.x))) < 1) { p.diveMiss = false; resolveTackle(p, h, 'dive', 0, false); }
}
function tackleChance(p, c, kind) {
  let ch = TUNE.v.tackleBase * (.9 + .02 * statOf(p, 'TKL') - .02 * Math.min(10, statOf(c, 'POW')));
  const a = Math.atan2(p.y - c.y, p.x - c.x), front = Math.abs(TT.angDiff(c.facing, a)) < 1.1;
  if (!front) ch += .1;
  if (c.turboOn) ch -= .05;
  if (p.ctl < 0 && M.diff[p.team]) ch += M.diff[p.team].tackleBonus;
  if (onMud(c.x, c.y)) ch += .1;
  if (kind === 'big') ch = .7 + .2 * (p.chargeU || 0);
  if (c.fire > 0) ch *= .6;
  if (c.power && c.power.kind === 'grease') ch *= .3;
  if (p.power && p.power.kind === 'iron') ch = 1;
  if (M.drill && M.drill.easyTackles && p.ctl >= 0) ch = Math.max(ch, .95);
  return clamp(ch, 0, 1);
}
TT.sim.tackleChance = (p, c, k) => tackleChance(p, c, k);
function resolveTackle(p, c, kind, charge, over) {
  p.chargeU = charge;
  const d = Math.hypot(c.x - p.x, c.y - p.y);
  // the carrier's moves: a sidestep or spin makes it whiff (a spin beats big hits too); a fend may beat it
  if (c.evade > 0 && (kind !== 'big' || c.evadeKind === 'spin') && !(p.superK === 'hurricane')) {
    p.st = 'tackling'; p.stT = 0; p.stun = .5; p.vx = Math.cos(p.facing) * 100; p.vy = Math.sin(p.facing) * 100;
    addHype(c.team, 6); M.stats[p.team].missed++; emit(c.evadeKind === 'spin' ? 'spin' : 'sidestep', { pid: c.id, beat: p.id }); return;
  }
  if ((cheat('god') && c.team === 0 && c.ctl >= 0) || c.superK === 'thunder') {   // unstoppable: tacklers bounce off and fly
    launch(p, c, .5); addHype(c.team, 3); emit('bounceOff', { pid: p.id, by: c.id }); return;
  }
  if (c.fendT > 0 && kind !== 'dive' && p.superK !== 'hurricane') {
    let beat = TUNE.v.fendBeat + .03 * (Math.min(10, statOf(c, 'POW')) - statOf(p, 'TKL'));
    if (kind === 'big') beat /= 2; if (c.fire > 0) beat *= 1.5; if (c.power && c.power.kind === 'iron') beat = 1; if (p.power && p.power.kind === 'iron') beat = 0;
    if (rnd() < beat) {
      const k = c.data.boss ? 40 : 20, a = Math.atan2(p.y - c.y, p.x - c.x);
      p.x += Math.cos(a) * k * .5; p.y += Math.sin(a) * k * .5; p.vx = Math.cos(a) * k * 4; p.vy = Math.sin(a) * k * 4;
      p.st = 'ground'; p.stT = 0; p.stun = .8; addHype(c.team, 6); M.stats[p.team].missed++;
      emit('fend', { pid: c.id, beat: p.id }); return;
    }
  }
  const monster = c.st !== 'held' && (kind === 'big' && charge >= .99) || p.superK === 'hurricane' || (p.power && p.power.kind === 'iron' && kind !== 'dive') || (p.data.boss && kind !== 'dive');
  const ok = p.superK === 'hurricane' || c.st === 'held' || rnd() < tackleChance(p, c, monster ? 'big' : kind);
  if (!ok) {   // a broken tackle
    p.st = 'tackling'; p.stT = .1; p.stun = .6; M.stats[p.team].missed++;
    c.vx *= .6; c.vy *= .6; addHype(c.team, 5);
    emit('brokenTackle', { pid: c.id, by: p.id }); return;
  }
  // the boss is only held by the first: a second tackle within the hold brings him down
  if (c.data.boss && c.st !== 'held' && kind !== 'big' && p.superK !== 'hurricane') {
    c.st = 'held'; c.held = 1.2; c.heldBy = p.id; p.st = 'tackling'; p.stT = 0; emit('gangHold', { pid: c.id, by: p.id }); return;
  }
  M.stats[p.team].tackles++; p.tackles++; addHype(p.team, monster ? 16 : kind === 'big' ? 10 : 4);
  if (c.st === 'held') { const first = pl(c.heldBy); if (first && first !== p) knockDown(first, .6, null); emit('gangTackle', { pid: c.id, by: p.id }); }
  const high = over && kind === 'big' && Math.abs(TT.angDiff(c.facing + PI, Math.atan2(p.y - c.y, p.x - c.x))) < 1.1;
  if (monster || kind === 'big') {
    M.stats[p.team].bigHits++;
    if (monster) { M.stats[p.team].monsters++; p.monsters++; }
    if (p.superK === 'hurricane') { p.superK = ''; p.superT = 0; p.homing = -1; emit('superEnd', { pid: p.id }); for (const q of M.players) if (q !== c && q !== p && standing(q) && Math.hypot(q.x - c.x, q.y - c.y) < 30) knockDown(q, 1, p); }
    emit(monster ? 'monsterHit' : 'bigHit', { pid: p.id, victim: c.id, x: c.x, y: c.y });
    if (monster) {
      launch(c, p, TUNE.v.bigHitLaunch);
      if (rnd() < TUNE.v.spillChance || p.superK === 'hurricane' || M.drill) spillBall(c, 1);
      else { M.ball.st = 'held'; }
      p.st = 'run'; p.stT = 0; p.vx *= .2; p.vy *= .2; p.flex = 1;
      if (high) foul(p, 'high', true, c);
      if (M.ball.st === 'held' && M.ball.holder === c.id) { /* he holds on in flight: a tackle when he lands */ c.landTackle = true; }
      return;
    }
  }
  // a completed tackle: both go down; a ruck follows (offload window first)
  c.st = 'tackled'; c.stT = 0; c.vx = (c.vx + p.vx) * .25; c.vy = (c.vy + p.vy) * .25; c.lastHitBy = p.id;
  p.st = kind === 'dive' ? 'diving' : 'tackling'; if (kind !== 'dive') p.stT = .12; p.diveMiss = false;
  if (kind === 'dive') emit('diveTackle', { pid: p.id, victim: c.id });
  emit('tackle', { pid: p.id, victim: c.id, kind, x: c.x, y: c.y, d });
  if (high) foul(p, 'high', true, c);
  // tackled over the line: a try all the same (arcade law)
  if ((c.x - tryLineOf(c.team)) * dirOf(c.team) > 0 && M.phase === 'play') tryScored(c, 'try');
}
function launch(c, by, k) {
  const a = Math.atan2(c.y - by.y, c.x - by.x), dist = U(30, 60) * k;
  if (M.ball.holder === c.id && !c.landTackle) { /* decided by the caller */ }
  c.st = 'launched'; c.stT = 0; c.launch = { t: 0, x0: c.x, y0: c.y, hit: { [by.id]: 1 }, flip: rnd() < .5 ? 1 : -1 };
  const vz = Math.sqrt(2 * 500 * U(20, 40) * Math.min(2, k)), tFly = 2 * vz / 500;
  c.vx = Math.cos(a) * dist / tFly; c.vy = Math.sin(a) * dist / tFly; c.vz = vz; c.z = 1;
  c.lastHitBy = by.id;
}
TT.sim.launch = (c, by, k) => launch(c, by, k);
function spillBall(c, k) {
  const b = M.ball, d = dirOf(c.team), fwd = rnd() < .5;
  b.st = 'loose'; b.holder = -1; b.from = c.id; b.team = c.team; b.t = 0; b.tried = { [c.id]: true }; b.kind = 'spill';
  b.vx = (fwd ? d : -d) * U(40, 90) * k + c.vx * .3; b.vy = U(-60, 60); b.vz = U(60, 120); b.z = Math.max(b.z, 12);
  M.lastTouch = c.team;
  emit('spill', { pid: c.id });
  if (fwd && M.phase === 'play') {
    b.knockOnPending = { team: c.team, x: c.x, y: c.y, t: .6 };
  }
}
TT.sim.spillBall = (c, k) => spillBall(c, k);
function knockDown(q, secs, by) {
  if (!onField(q) || q.st === 'launched') return;
  q.st = 'ground'; q.stT = 0; q.stun = secs; q.charge = 0; if (by) q.lastHitBy = by.id;
  if (M.ball.holder === q.id && M.phase === 'play') spillBall(q, .6);
}
TT.sim.knockDown = (q, s, by) => knockDown(q, s, by);
function cheapShot(p, v) {
  knockDown(v, 1.6, p); p.cheap++;
  p.st = 'tackling'; p.stT = .2;
  emit('cheapShot', { pid: p.id, victim: v.id });
  foul(p, 'cheap', p.cheap >= 2);
}
/** each step of open play: the knock-on judgement of a spilled ball, a body landing with the ball, homing supers */
function contactStep(dt) {
  const b = M.ball;
  if (b.knockOnPending) {
    const k = b.knockOnPending; k.t -= dt;
    const gathered = b.st === 'held';
    if (gathered && pl(b.holder).team === k.team) { b.knockOnPending = null; /* regathered: play on */ }
    else if (gathered || k.t <= 0 || b.z <= 0 && b.bounces > 0) {
      b.knockOnPending = null;
      if (!gathered || pl(b.holder).team !== k.team) { const opp = 1 - k.team; if (!gathered) { emit('knockOn', { team: k.team }); return stop('KNOCK-ON', 1.6, () => scrum(opp, k.x, k.y, 'knockOn'), { call: 'KNOCK ON!' }); } }
    }
  }
  // a launched carrier who held the ball is tackled where he lands
  for (const p of M.players) if (p.landTackle && p.st === 'ground') { p.landTackle = false; if (b.holder === p.id) { p.st = 'tackled'; p.stT = .3; } }
  // the Hurricane Hit homes in on the carrier
  for (const p of M.players) if (p.superK === 'hurricane') {
    const h = holder();
    if (!h || h.team === p.team) continue;
    p.homing = h.id;
    if (Math.hypot(h.x - p.x, h.y - p.y) < 12) resolveTackle(p, h, 'big', 1, false);
  }
  // Thunder Run: tacklers in the way fly
  for (const p of M.players) if (p.superK === 'thunder' && b.holder === p.id) {
    for (const q of M.players) if (q.team !== p.team && standing(q) && Math.hypot(q.x - p.x, q.y - p.y) < 11) { launch(q, p, .6); emit('bounceOff', { pid: q.id, by: p.id }); }
  }
}

/* ---- supers ---- */
function startSuper(p, kind) {
  M.hype[p.team] = 0;
  p.superK = kind; p.superT = kind === 'thunder' ? TUNE.v.superTime * (p.data.boss ? 1.5 : 1) : 2;
  if (kind === 'thunder') M.superCarry = p.id;
  emit('superStart', { pid: p.id, kind });
}
TT.sim.startSuper = (p, k) => startSuper(p, k);
