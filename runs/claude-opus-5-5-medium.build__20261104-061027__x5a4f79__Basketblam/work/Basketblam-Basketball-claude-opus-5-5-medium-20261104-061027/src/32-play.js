/* PLAY: the ball (held, dribbled, passed, shot, loose; rim torus and backboard collisions with substeps; scoring), the
 * players' step (movement, turbo, juice, the state machine) and every action: jump shots with a release meter, layups,
 * dunks from a catalog, alley-oops, putbacks, passes, steals, shoves, spin moves, blocks, goaltending, rebounds. Outcomes
 * are decided at release from S.rng and then flown physically. */
const BALL = () => S.ball;
function newBall() { return { x: XM, y: YM, z: 40, vx: 0, vy: 0, vz: 0, state: 'dead', owner: null, shot: null, pass: null, scored: false, last: null, spin: 0, trail: [], touched: false, deadT: 0 }; }
const owner = () => S.ball && S.ball.owner;
const hasBall = p => S.ball.owner === p;
const teamHas = team => S.ball.owner && S.ball.owner.team === team;
const cheat = k => !!S.cheats[k];

/* ---- the ball ---- */
function giveBall(p, how = 'catch') {
  const b = S.ball, prev = b.owner, prevTeam = b.lastTeam;
  b.owner = p; b.state = isAir(p) ? 'held' : 'dribble'; b.shot = null; b.pass = null; b.vx = b.vy = b.vz = 0; b.touched = false;
  p.cool.catch = .15; p.hold = 0;
  if (prevTeam !== undefined && prevTeam !== p.team) { S.match && (S.match.shotClock = tune('shotClock')); emit('possession', { team: p.team, slot: p.slot }); }
  b.lastTeam = p.team; b.last = p;
  if (how === 'catch') { sfxAt('catch', p.x); emit('catch', { slot: p.slot }); }
  return prev;
}
function looseBall(vx, vy, vz) { const b = S.ball; b.owner = null; b.state = 'loose'; b.vx = vx; b.vy = vy; b.vz = vz; b.pass = null; }
function ballStep(dt) {
  const b = S.ball, m = S.match; if (!b) return;
  b.spin += Math.hypot(b.vx, b.vy) * dt * .15;
  if (b.owner) return;   // attached to its owner's hands (playerStep, after the rig)
  if (b.state === 'pass') passFlight(dt);
  const nearRim = HOOPS.some(h => Math.hypot(b.x - h.x, b.y - h.y) < 44 && Math.abs(b.z - RIM_Z) < 44);
  const n = nearRim ? 4 : 1;
  for (let k = 0; k < n && !b.owner; k++) integrate(dt / n);
  if (b.state === 'shot' || b.state === 'pass' || Math.hypot(b.vx, b.vy) > 260) { b.trail.push([b.x, b.y, b.z]); if (b.trail.length > 8) b.trail.shift(); } else if (b.trail.length) b.trail.shift();
  if (b.state === 'loose' && b.z <= BALL_R + .5 && Math.hypot(b.vx, b.vy) < 6 && m && m.phase === 'live') { b.vx *= .9; b.vy *= .9; }
}
function integrate(h) {
  const b = S.ball, m = S.match, g = tune('ballGravity') * (cheat('moongrav') ? .55 : 1), pz = b.z, px0 = b.x;
  b.vz -= g * h;
  const wind = b.state === 'shot' && b.shot ? b.shot.wind : m && m.wind;   // a shot keeps the gust it was released into (its decided outcome holds)
  if (b.z > BALL_R + 1 && wind && b.state !== 'dead') { b.vx += wind.x * h; b.vy += wind.y * h; }
  b.x += b.vx * h; b.y += b.vy * h; b.z += b.vz * h;
  if (b.state !== 'dead') for (let i = 0; i < 2; i++) {
    const hp = HOOPS[i];
    const ghost = b.state === 'shot' && b.shot && b.shot.made;   // a decided make drops clean (a swish)
    if (!ghost) rimCollide(i);
    if (!HOOP_FX[i].shattered) boardCollide(i, px0);
    // a basket: the centre crosses the rim's plane going down inside the ring
    if (pz >= RIM_Z && b.z < RIM_Z && Math.hypot(b.x - hp.x, b.y - hp.y) < RIM_R - BALL_R * .5 && !b.scored) { b.scored = true; scoreBasket(i); }
    if (b.scored && b.z < RIM_Z - 18) b.scored = false;
    if (Math.hypot(b.x - hp.x, b.y - hp.y) < RIM_R && b.z < RIM_Z && b.z > RIM_Z - 14 && b.vz < 0) { const k = Math.exp(-h * 9); b.vx *= k; b.vy *= k; b.vz *= Math.exp(-h * 4); HOOP_FX[i].nv += h * 60; }
  } else if (pz >= RIM_Z && b.z < RIM_Z) for (const hp of HOOPS) if (Math.hypot(b.x - hp.x, b.y - hp.y) < RIM_R) { const i = HOOPS.indexOf(hp); HOOP_FX[i].nv += 30; }
  // the floor
  if (b.z < BALL_R) {
    b.z = BALL_R;
    if (b.vz < -45) { b.vz = -b.vz * tune('ballBounce'); sfxAt(b.state === 'dead' ? 'bounce' : 'bounce', b.x, { vol: clamp(-b.vz / 300, .2, 1) }); if (b.state === 'shot' || b.state === 'pass') toLoose(); }
    else b.vz = 0;
    const f = Math.exp(-h * 1.6); b.vx *= f; b.vy *= f;
  }
  // the arena walls (the crowd throws it back)
  if (b.x < X0 - WALL) { b.x = X0 - WALL; b.vx = Math.abs(b.vx) * .5; } if (b.x > X1 + WALL) { b.x = X1 + WALL; b.vx = -Math.abs(b.vx) * .5; }
  if (b.y < Y0 - WALL) { b.y = Y0 - WALL; b.vy = Math.abs(b.vy) * .5; } if (b.y > Y1 + WALL) { b.y = Y1 + WALL; b.vy = -Math.abs(b.vy) * .5; }
}
/** a hand's world point, or near the body when the rig has not caught up with a teleport */
function handAt(p, side = 'R') { const h = handWorld(p.rig, side); return Math.hypot(h[0] - p.x, h[1] - p.y) > 30 ? [p.x + Math.cos(p.facing) * 4, p.y + Math.sin(p.facing) * 4, p.z + reach(p) * .8] : h; }
/** a point kept inside the arena's walls (a release at the wall must not start outside it) */
const inArena = o => (o.x = clamp(o.x, X0 - WALL + BALL_R, X1 + WALL - BALL_R), o.y = clamp(o.y, Y0 - WALL + BALL_R, Y1 + WALL - BALL_R), o);
function toLoose() { const b = S.ball; if (b.state === 'shot' || b.state === 'pass') { if (b.state === 'pass' && b.pass) emit('missedPass', {}); b.state = 'loose'; b.pass = null; } }
function rimCollide(i) {
  const b = S.ball, hp = HOOPS[i], dx = b.x - hp.x, dy = b.y - hp.y, d = Math.hypot(dx, dy) || 1e-6;
  const qx = hp.x + dx / d * RIM_R, qy = hp.y + dy / d * RIM_R, nx = b.x - qx, ny = b.y - qy, nz = b.z - RIM_Z, dist = Math.hypot(nx, ny, nz), min = BALL_R + TUBE;
  if (dist >= min || dist < 1e-6) return;
  const ux = nx / dist, uy = ny / dist, uz = nz / dist, push = min - dist;
  b.x += ux * push; b.y += uy * push; b.z += uz * push;
  const vn = b.vx * ux + b.vy * uy + b.vz * uz;
  if (vn < 0) {
    const e = tune('rimBounce'); b.vx -= (1 + e) * vn * ux; b.vy -= (1 + e) * vn * uy; b.vz -= (1 + e) * vn * uz;
    b.vx *= .92; b.vy *= .92;
    if (-vn > 30) { sfxAt('rim', hp.x, { vol: clamp(-vn / 300, .3, 1) }); HOOP_FX[i].bv -= Math.min(60, -vn * .2); P.sparks(qx, qy, RIM_Z, 3, null, { color: '#ffa040' }); emit('rim', { hoop: i }); }
  }
  touchRim();
}
function touchRim() {
  const b = S.ball;
  if (!b.touched) { b.touched = true; if (S.match) S.match.shotClock = tune('shotClock'); }
  if (b.state === 'shot') { b.state = 'loose'; if (b.shot) b.shot.rim = true; }
}
function boardCollide(i, px0) {
  const b = S.ball, hp = HOOPS[i], bx = hp.board + hp.dir * BALL_R;
  if (b.y < BOARD.y0 - 2 || b.y > BOARD.y1 + 2 || b.z < BOARD.z0 - 2 || b.z > BOARD.z1 + 2) return;
  if ((hp.dir > 0 && b.x < bx && px0 >= bx - 3) || (hp.dir < 0 && b.x > bx && px0 <= bx + 3)) {
    b.x = bx; if (b.vx * hp.dir < 0) { b.vx = -b.vx * tune('boardBounce'); sfxAt('backboard', hp.x, { vol: .7 }); emit('backboard', { hoop: i }); }
    touchRim();
  }
}

/* ---- scoring ---- */
function scoreBasket(i) {
  const b = S.ball, m = S.match; if (!m || m.phase === 'over') return;
  const team = i === 1 ? 0 : 1, shot = b.shot && b.shot.team === team ? b.shot : null, shooter = shot ? S.players[shot.slot] : null;
  if (m.phase !== 'live' && !(m.phase === 'clockout' && shot)) { b.shot = null; return; }
  if (shot && shot.late) { b.shot = null; return; }   // released after the buzzer: no good
  let pts = shot ? shot.points : 2, jack = false;
  if (shot && shot.jackpot) { pts += tune('jackpotBonus'); jack = true; }
  const gold = m.gold === team; if (gold) { pts *= 2; m.gold = null; }
  m.score[team] += pts; b.shot = null; b.state = 'loose';
  const hf = HOOP_FX[i]; hf.nv += 40; hf.glow = shooter && shooter.nova ? 2 : 0;
  if (!shot || !shot.dunk) sfxAt('swish', HOOPS[i].x);
  P.glints(HOOPS[i].x, HOOPS[i].y, RIM_Z - 6, 6, '#ffffff');
  const ev = emit('basket', { team, points: pts, slot: shooter ? shooter.slot : -1, dunk: !!(shot && shot.dunk), dunkId: shot && shot.dunk ? shot.dunk : null, three: !!(shot && shot.points === 3), dist: shot ? shot.dist : 0, perfect: !!(shot && shot.perfect), layup: !!(shot && shot.layup), jackpot: jack, gold, alleyoop: !!(shot && shot.oop), putback: !!(shot && shot.putback), goaltend: !!(shot && shot.goaltend), buzzer: m.clock <= 0 });
  if (shooter) {
    shooter.stats.PTS += pts; shooter.stats.FGM++; if (shot.points === 3) shooter.stats.TPM++;
    if (shot.assist !== undefined && S.players[shot.assist]) { S.players[shot.assist].stats.AST++; }
    const mt = mate(shooter); if (!shot.dunk && !shooter.human && mt) { /* a CPU scorer celebrates on its way back */ }
    shooter.celebrate = shot.dunk ? 0 : 1.1; shooter.celebKind = pick(['pointSky', 'chestPound', 'raiseRoof', 'flex']);
  }
  onBasket(team, shooter, ev);
}

/* ---- the release meter and the shot model ---- */
function baseChance(d) {
  if (d <= 40) return .85; if (d <= 80) return lerp(.85, .70, (d - 40) / 40); if (d <= 136) return lerp(.70, .45, (d - 80) / 56);
  if (d <= 200) return lerp(.38, .30, (d - 136) / 64); if (d <= 320) return lerp(.30, .08, (d - 200) / 120); return .03;
}
/** the make chance for p shooting now (with a release quality: 'perfect' | 'good' | 'bad'); returns { p, parts } */
function shotChance(p, rel, o = {}) {
  const h = attackHoop(p.team), d = Math.hypot(p.x - h.x, p.y - h.y), three = isThree(o.tx !== undefined ? o.tx : p.x, o.ty !== undefined ? o.ty : p.y, h), m = S.match;
  let c = baseChance(d) * (three ? fac.deep(p) * tune('threeSkill') : fac.splash(p)) * tune('shotSkill');
  const pu = p.powerup && p.powerup.id;
  c *= rel === 'perfect' ? 1 + tune('perfectBonus') : rel === 'bad' ? 1 - tune('badReleasePenalty') : 1;
  // contest: the nearest defender between shooter and rim
  let contest = 1;
  for (const f of foes(p)) {
    const df = dist2(f, p), between = (f.x - p.x) * (h.x - p.x) + (f.y - p.y) * (h.y - p.y) > 0;
    if (f.state === 'knocked' || f.state === 'reboot') continue;
    if (df < 30 && between) contest = Math.min(contest, isAir(f) ? 1 - tune('contestPenalty') : .8); else if (df < 50) contest = Math.min(contest, .92);
  }
  c *= contest;
  if (p.cmd.tD) c *= 1.05;
  if (Math.hypot(p.vx, p.vy) > 120) c *= .9;
  if (m && m.wind) c *= 1 - .35 * Math.min(1, Math.hypot(m.wind.x, m.wind.y) / Math.max(1, tune('windStrength'))) * d / 320;
  if (p.nova) c += tune('novaShotBonus');
  if (pu === 'laser') c += .3;
  c += comebackBonus(p.team) * .12;
  if (o.layup) c = Math.max(c, .6 * fac.splash(p));
  return { p: clamp(c, .02, .97), d, three, contest };
}
function comebackBonus(team) {
  const m = S.match; if (!m || m.quarter < 2 || cheat('tournament') || S.mode === 'hub') return 0;
  const lvl = { off: 0, low: .2, normal: tune('comeback') }[setting('comeback')] ?? tune('comeback'), d = m.score[1 - team] - m.score[team];
  return d >= 4 ? lvl * Math.min(d, 15) / 15 : 0;
}
const perfectWin = p => tune('perfectWindow') * (p.powerup && p.powerup.id === 'laser' ? 2 : 1);

/** release the ball toward the hoop; decided now, flown physically */
function releaseShot(p, o = {}) {
  const b = S.ball, h = attackHoop(p.team), hi = HOOPS.indexOf(h), m = S.match;
  const apexT = p.jump ? p.jump.apexT : 0, dtRel = p.jump ? p.jump.t - apexT : 0, pw = perfectWin(p);
  const rel = o.layup || o.tip ? 'good' : Math.abs(dtRel) <= pw / 2 ? 'perfect' : Math.abs(dtRel) <= pw ? 'good' : 'bad';
  const takeoff = p.jump && p.jump.from ? p.jump.from : [p.x, p.y];
  const ch = shotChance(p, rel, { layup: o.layup, tx: takeoff[0], ty: takeoff[1] });
  let made = S.rng() < ch.p;
  if (S.cheats.shots === 'in') made = true; else if (S.cheats.shots === 'out') made = false;
  if (o.forceMade !== undefined) made = o.forceMade;
  if (S.cheats.missTeam === p.team) made = false;
  const points = ch.three && !o.layup ? 3 : 2, d = ch.d;
  const jackpot = !!(m && m.jackpot && Math.hypot(takeoff[0] - m.jackpot.x, takeoff[1] - m.jackpot.y) < 16 && !o.layup);
  const hand = handAt(p), from = inArena({ x: hand[0], y: hand[1], z: hand[2] + 3 });
  let tx = h.x, ty = h.y, tz = RIM_Z - 3, airball = false;
  if (!made) {
    const r = S.rng(), toward = Math.atan2(p.y - h.y, p.x - h.x);
    if (d > 150 && r < .22) { airball = true; const short = S.rng() < .6 ? 1 : -1; tx = h.x + Math.cos(toward) * (34 * short); ty = h.y + Math.sin(toward) * 34 * short + (S.rng() - .5) * 30; tz = RIM_Z - 20; }
    else { const a = toward + (r < .45 ? 0 : r < .8 ? Math.PI : (S.rng() < .5 ? 1 : -1) * Math.PI / 2) + (S.rng() - .5) * .5; tx = h.x + Math.cos(a) * (RIM_R + 1.5); ty = h.y + Math.sin(a) * (RIM_R + 1.5); tz = RIM_Z + 2; }
  }
  const apex = Math.max(0, clamp(18 + d * .1, 18, 60) * tune('shotArc') * (o.layup ? .4 : 1));
  const g = tune('ballGravity') * (cheat('moongrav') ? .55 : 1), v = E.arc(from, { x: tx, y: ty, z: tz }, g, { apex: Math.max(4, apex) });
  if (m && m.wind) { v.vx -= .5 * m.wind.x * v.t; v.vy -= .5 * m.wind.y * v.t; }
  b.owner = null; b.state = 'shot'; b.x = from.x; b.y = from.y; b.z = from.z; b.vx = v.vx; b.vy = v.vy; b.vz = v.vz; b.touched = false; b.scored = false;
  b.shot = { slot: p.slot, team: p.team, made, points, dist: d, perfect: rel === 'perfect', rel, chance: ch.p, layup: !!o.layup, dunk: false, jackpot, airball, t: 0, late: !!(m && m.phase === 'clockout'), assist: p.assistFrom, putback: !!o.putback, hoop: hi, wind: m && m.wind ? { x: m.wind.x, y: m.wind.y } : null };
  p.assistFrom = undefined;
  p.stats.FGA++; if (points === 3) p.stats.TPA++;
  if (p.powerup && p.powerup.id === 'laser' && --p.powerup.shots <= 0) endPowerup(p);
  sfxAt('release', p.x); emit('release', { slot: p.slot, made, chance: +ch.p.toFixed(3), perfect: rel === 'perfect', rel, three: points === 3, dist: Math.round(d), layup: !!o.layup });
  S.lastShot = { name: p.name, chance: ch.p, rel, three: ch.three, contest: ch.contest, made };
  p.cool.catch = .4;
}

/* ---- movement and the state machine ---- */
function moveSpeed(p) {
  let s = tune('runSpeed') * fac.zoom(p);
  if (p.cmd.tD && (p.turbo > 0 || infTurbo(p))) s *= tune('turboMult');
  if (p.powerup && p.powerup.id === 'rocket') s *= 1.4;
  if (S.match && S.match.overclock > 0 && p.def.team === 'blambots') s *= 1.08;
  return s;
}
const infTurbo = p => p.nova || cheat('turbo' + p.team) || cheat('turboAll') || (S.mode === 'attract');
function playerStep(p, dt) {
  const c = p.cmd, b = S.ball, m = S.match, live = m && (m.phase === 'live' || m.phase === 'clockout');
  for (const k in p.cool) p.cool[k] = Math.max(0, p.cool[k] - dt);
  p.st += dt; p.celebrate = Math.max(0, p.celebrate - dt); p.taunt = Math.max(0, p.taunt - dt); p.dizzy = Math.max(0, p.dizzy - dt); p.land = Math.max(0, p.land - dt);
  if (p.reboot > 0) { p.reboot -= dt; p.vx = p.vy = 0; if (p.reboot <= 0) p.state = 'run'; poseAndBall(p, dt); return; }
  // turbo: drains while held and moving, refills after a pause
  const moving = Math.hypot(c.mx, c.my) > .2;
  if (c.tD && moving && !infTurbo(p)) { p.turbo = Math.max(0, p.turbo - tune('turboDrain') * dt); p.turboIdle = 0; p.juice = Math.max(0, p.juice - .01 * dt * tune('fatigue')); }
  else { p.turboIdle += dt; if (p.turboIdle > tune('turboRefillDelay')) p.turbo = Math.min(1, p.turbo + tune('turboRefill') * dt * (p.powerup && p.powerup.id === 'rocket' ? 2 : 1) * (1 + comebackBonus(p.team) * .5)); }
  if (infTurbo(p)) p.turbo = 1;
  if (live) p.juice = Math.max(0, p.juice - .004 * dt * tune('fatigue'));
  // the states
  switch (p.state) {
    case 'knocked': {
      p.knock -= dt; const f = Math.exp(-dt * 5); p.vx *= f; p.vy *= f;
      if (p.knock <= 0) { p.state = 'run'; p.st = 0; }
      break;
    }
    case 'dunk': dunkStep(p, dt); break;
    case 'hang': {
      const h = attackHoop(p.team); p.x = h.x - h.dir * 6; p.y = h.y; p.z = RIM_Z - reach(p) + 2 + Math.sin(p.st * 5) * 1.2; p.vx = p.vy = 0; p.vz = 0;
      if (p.st > p.hangT) { p.state = 'air'; p.vz = 0; p.vx = h.dir * 40; }
      break;
    }
    case 'spin': {
      p.vx = Math.cos(p.facing) * 90; p.vy = Math.sin(p.facing) * 90;
      if (p.st > .35) { p.state = 'run'; p.rig.spin = 0; }
      break;
    }
    default: {
      // on the ground or in the air under control
      const air = isAir(p);
      if (!air && p.state !== 'shove' && p.state !== 'steal' && p.state !== 'inbound' && !(m && m.freeze)) {
        let sp = moveSpeed(p), acc = tune('accel');
        if (m && m.phase === 'tipoff') sp = 0;
        const slick = onSlick(p); if (slick) acc *= .15;
        const tx = c.mx * sp, ty = c.my * sp;
        if (slick && c.tD && moving && Math.hypot(p.vx, p.vy) > 100 && (p.vx * tx + p.vy * ty) < 0 && p.slipT <= 0) { p.slipT = 1; if (S.rng() < .3) { slip(p); break; } }
        p.slipT = Math.max(0, p.slipT - dt);
        const sharp = (p.vx * tx + p.vy * ty) < -2000 && Math.hypot(p.vx, p.vy) > 80;
        p.vx = approach(p.vx, tx, acc * dt); p.vy = approach(p.vy, ty, acc * dt);
        if (sharp && p.cool.squeak === undefined) { sfxAt('squeak', p.x, { vol: .6 }); P.dust(p.x, p.y, 0, 3); }
        // facing: toward the move; a defender shuffles facing the ball handler
        const o = owner(), guarding = o && o.team !== p.team && dist2(o, p) < 70;
        const want = guarding ? Math.atan2(o.y - p.y, o.x - p.x) : moving ? Math.atan2(c.my, c.mx) : p.facing;
        p.facing = E.approachAng(p.facing, want, dt * (guarding ? 10 : 14));
      } else if (!air) { p.vx = approach(p.vx, 0, 1200 * dt); p.vy = approach(p.vy, 0, 1200 * dt); }
      if (p.state === 'shove' || p.state === 'steal') { actStep(p, dt); }
      if (live && !(m && m.freeze)) actions(p, dt);
      else if (m && m.phase === 'tipoff' && c.sP && !isAir(p) && m.jumpers.includes(p)) jump(p, 'tip');
      else if (m && m.phase === 'inbound' && p === m.inb.who && c.pP) m.inb.t = 0;
    }
  }
  // the body: gravity and the floor; the walls
  if (p.state !== 'dunk' && p.state !== 'hang') {
    if (isAir(p)) { p.vz -= tune('playerGravity') * (cheat('moongrav') ? .55 : 1) * (p.jump && p.jump.float ? .7 : 1) * dt; p.z += p.vz * dt; }
    if (p.z <= 0 && p.vz <= 0) { if (p.z < 0 || p.vz < -1) landed(p); p.z = 0; p.vz = 0; }
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
  p.x = clamp(p.x, X0 - WALL + 4, X1 + WALL - 4); p.y = clamp(p.y, Y0 - WALL + 4, Y1 + WALL - 4);
  poseAndBall(p, dt);
}
function separate() {   // bodies push apart (no damage)
  const L = S.players;
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const a = L[i], c = L[j]; if (a.state === 'dunk' || c.state === 'dunk' || a.state === 'hang' || c.state === 'hang') continue;
    const dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy), min = 11;
    if (d < min && d > 1e-3 && Math.abs(a.z - c.z) < 30) { const push = (min - d) / 2, ux = dx / d, uy = dy / d; const wa = a.r.bump >= c.r.bump ? .35 : .65; a.x -= ux * push * 2 * wa; a.y -= uy * push * 2 * wa; c.x += ux * push * 2 * (1 - wa); c.y += uy * push * 2 * (1 - wa); }
  }
}
function landed(p) {
  const was = p.state, j = p.jump;
  if (was === 'jumpshot' && hasBall(p)) {   // came down still holding it: a late release
    releaseShot(p);
  }
  if (j && j.kind === 'dunkfall') { p.land = .3; p.rig.kick(-1); P.dust(p.x, p.y, 0, 12); sfxAt('land_heavy', p.x); }
  else if (p.z < -1 || p.vz < -150) { P.dust(p.x, p.y, 0, 4); }
  if (['jumpshot', 'layup', 'air', 'jump'].includes(p.state)) { p.state = 'run'; p.st = 0; }
  p.jump = null; p.rig.spin = 0;
  if (hasBall(p)) S.ball.state = 'dribble';
}
function slip(p) { knockDown(p, .6, null); emit('slip', { slot: p.slot, name: p.name }); sfxAt('oil_slip', p.x); Caption.call('oil', { name: p.name }); }

/** the buttons, by context */
function actions(p, dt) {
  const c = p.cmd, b = S.ball, air = isAir(p), m = S.match;
  if (p.state === 'shove' || p.state === 'steal') return;
  if (hasBall(p)) {
    p.hold += dt;
    if (p.state === 'jumpshot') {   // in the air with the ball: let go of shoot to release; past the top + .25 it goes by itself
      p.jump.t += dt;
      if (c.sR || !c.sD || p.jump.t > p.jump.apexT + .25) releaseShot(p);
      return;
    }
    if (p.state === 'layup') { p.jump.t += dt; if (p.jump.t >= p.jump.relT) releaseShot(p, { layup: true }); return; }
    if (air) { if (c.sP) releaseShot(p, { putback: true }); return; }   // a catch in the air: shoot it on the way down
    if (c.sP) return startShot(p);
    if (c.pP && p.cool.pass <= 0) return passTo(p, mate(p), 'chest');
    if (c.oP && p.cool.pass <= 0) return alleyOop(p);
    if (c.vP && p.cool.spin <= 0 && (p.turbo >= tune('spinCost') || infTurbo(p))) return spinMove(p);
    if (c.aP && S.mode !== 'hub') { p.taunt = .8; emit('taunt', { slot: p.slot }); }
    return;
  }
  // without the ball
  const o = owner(), mateHas = o && o.team === p.team;
  if (mateHas && !o.human && p.human) {   // commands to a CPU teammate holding the ball
    if (c.pP) o.order = { kind: 'pass', t: .6 }; if (c.sP) o.order = { kind: 'shoot', t: .6 }; if (c.oP) o.order = { kind: 'oop', t: .8 };
    if (c.pP || c.sP || c.oP) emit('call', { slot: p.slot, kind: c.pP ? 'pass' : c.sP ? 'shoot' : 'oop' });
    if (c.sP && !air) return;
  }
  if (!air && c.sP && !mateHas) {
    const ventBoost = onVent(p) && m && m.twist && m.twist.kind === 'eruption';
    return jump(p, b.state === 'loose' || b.state === 'shot' ? 'rebound' : 'block', ventBoost ? 1.6 : 1);
  }
  if (!air && c.sP && mateHas) return;   // shoot without the ball beside a teammate who has it: the order above
  if (!mateHas && c.pP && p.cool.steal <= 0) return startSteal(p);
  if ((c.vP || (c.tD && c.pP)) && p.cool.shove <= 0 && (p.turbo >= .1 || infTurbo(p))) return startShove(p);
  if (c.aP && S.mode !== 'hub' && !o) { p.taunt = .8; emit('taunt', { slot: p.slot }); }
}

/* ---- shooting, layups and dunks ---- */
function dunkRange(p) {
  let r = tune('dunkRange') * fac.slam(p);
  if (p.nova) r += 40;
  if (p.powerup && p.powerup.id === 'moon') r = Math.max(r, THREE_R + 20);
  if (cheat('skydunks')) r = Math.max(r, CW / 2);
  if (S.match && S.match.overclock > 0 && p.def.team === 'blambots') r += 30;
  return r;
}
function canDunkFrom(p) { const h = attackHoop(p.team), d = Math.hypot(p.x - h.x, p.y - h.y); return d <= dunkRange(p) && (p.turbo >= .05 || infTurbo(p)) && (p.x - h.x) * h.dir > -6; }
function startShot(p) {
  const h = attackHoop(p.team), d = Math.hypot(p.x - h.x, p.y - h.y), c = p.cmd;
  if (onVent(p) && S.match.twist && S.match.twist.kind === 'eruption' && S.match.twist.ventOn && c.tD && (p.x - XM) * h.dir < 0) return startDunk(p, { vent: true });
  if (c.tD && canDunkFrom(p)) return startDunk(p);
  if (d <= 40) return startLayup(p);
  jump(p, 'shot');
}
function jump(p, kind, boost = 1) {
  const vz = (tune('jumpShotVz') + 10 * rate(p, 'swat')) * (p.cmd.tD ? 1.15 : 1) * boost * (p.powerup && p.powerup.id === 'moon' ? 1.5 : 1) * (kind === 'shot' ? .92 : 1);
  p.vz = vz; p.z = .6; p.jump = { kind, t: 0, apexT: vz / tune('playerGravity'), from: [p.x, p.y], swatted: false };
  p.state = kind === 'shot' ? 'jumpshot' : 'air'; p.st = 0;
  if (kind === 'shot') { p.vx *= .25; p.vy *= .25; S.ball.state = 'held'; emit('shotStart', { slot: p.slot }); }
  else { p.vx *= .6; p.vy *= .6; }
  p.rig.kick(1); sfxAt('jump', p.x, { vol: .5 });
  if (kind === 'block') emit('blockJump', { slot: p.slot });
}
function startLayup(p) {
  const h = attackHoop(p.team);
  p.state = 'layup'; p.st = 0; p.vz = 270; p.z = .6;
  const a = Math.atan2(h.y - p.y, h.x - p.x); p.vx = Math.cos(a) * 50; p.vy = Math.sin(a) * 50; p.facing = a;
  p.jump = { kind: 'layup', t: 0, apexT: .3, relT: .26, from: [p.x, p.y] }; S.ball.state = 'held';
  sfxAt('jump', p.x, { vol: .5 }); emit('shotStart', { slot: p.slot, layup: true });
}
/** pick a dunk from the catalog: every dunk whose needs pass, weighted by its bonus and by the SLAM margin */
function chooseDunk(p, d, o = {}) {
  if (o.vent) return get('dunk', 'volcano');
  const m = S.match, bot = p.def.team === 'blambots', list = [];
  const quake = (bot && m && m.overclock > 0 && S.rng() < .5) || (p.powerup && p.powerup.id === 'moon' && S.rng() < .5) || (p.nova && S.rng() < .15) || o.quake;
  if (quake && d >= 60) return get('dunk', 'quake');
  for (const k of all('dunk')) {
    const n = k.need; if (n.vent || n.quake) continue;
    if (n.nova && !p.nova) continue; if (n.slam && rate(p, 'slam') < n.slam) continue;
    if (d < k.dist[0] - 10 || d > k.dist[1] + 10) continue;
    list.push([k, (1 + k.bonus / 60) * (rate(p, 'slam') - (n.slam || 6) + 1)]);
  }
  if (!list.length) return get('dunk', 'hammer');
  if (o.force) { const f = get('dunk', o.force); if (f) return f; }
  let tot = list.reduce((a, [, w]) => a + w, 0), r = S.rng() * tot;
  for (const [k, w] of list) { if ((r -= w) <= 0) return k; }
  return list[0][0];
}
function startDunk(p, o = {}) {
  const h = attackHoop(p.team), d = Math.hypot(p.x - h.x, p.y - h.y), dk = o.dunk || chooseDunk(p, d, o);
  const a = Math.atan2(p.y - h.y, p.x - h.x), slamX = h.x + Math.cos(a) * 7, slamY = h.y + Math.sin(a) * 7;
  const slamZ = Math.max(4, RIM_Z + 8 - reach(p)), g = tune('dunkGravity') * (cheat('moongrav') ? .6 : 1), hang = tune('dunkHang');
  const v = E.arc({ x: p.x, y: p.y, z: p.z }, { x: slamX, y: slamY, z: slamZ }, g / (hang * hang), { apex: dk.apexAbove * tune('dunkApex') });
  p.state = 'dunk'; p.st = 0; p.facing = Math.atan2(h.y - p.y, h.x - p.x);
  p.dunk = { def: dk, t: 0, T: v.t, from: [p.x, p.y, p.z], v, g: g / (hang * hang), slammed: false, oop: !!o.oop, d, hoop: HOOPS.indexOf(h), turbo: p.cmd.tD, putback: !!o.putback, slowed: false };
  if (!o.oop) { S.ball.state = 'held'; } p.turbo = infTurbo(p) ? 1 : Math.max(0, p.turbo - .05);
  p.rig.kick(1); sfxAt('jump', p.x); if (rate(p, 'slam') > 0 && p.def.team === 'blambots') sfxAt('servo', p.x);
  emit('dunkStart', { slot: p.slot, dunk: dk.id, oop: !!o.oop, dist: Math.round(d) });
  if (o.vent) { S.match.twist.ventOn = false; P.smoke(p.x, p.y, 0, 12, { size: 1.6, color: '#e0e0e0' }); sfxAt('vent_puff', p.x); }
}
function dunkStep(p, dt) {
  const D = p.dunk, b = S.ball, dk = D.def; D.t += dt; const u = Math.min(1, D.t / D.T);
  p.x = D.from[0] + D.v.vx * D.t; p.y = D.from[1] + D.v.vy * D.t; p.z = Math.max(0, D.from[2] + D.v.vz * D.t - .5 * D.g * D.t * D.t);
  p.vx = D.v.vx; p.vy = D.v.vy; p.vz = D.v.vz - D.g * D.t;
  p.rig.spin = dk.spin * clamp((u - .2) / .65, 0, 1);
  // the alley-oop catch
  if (D.oop && !hasBall(p) && b.state === 'pass' && b.pass && b.pass.to === p) { const hd = handWorld(p.rig, 'R'); if (Math.hypot(b.x - hd[0], b.y - hd[1], b.z - hd[2]) < 18 || u > .72) { giveBall(p, 'catch'); b.state = 'held'; p.assistFrom = b.passer; } }
  if (!D.slammed && u >= .92) {
    if (!hasBall(p)) { p.state = 'air'; p.jump = { kind: 'dunkfall', t: 0 }; p.dunk = null; p.rig.spin = 0; return; }   // the oop never arrived
    slam(p);
  }
  if (D.slammed && u >= 1) {
    p.dunk = null; p.rig.spin = 0;
    if (dk.hang) { p.state = 'hang'; p.st = 0; p.hangT = dk.hang; }
    else { p.state = 'air'; p.jump = { kind: 'dunkfall', t: 0 }; p.vx = -attackHoop(p.team).dir * 30; p.vy = 0; p.vz = 60; }
  }
}
function slam(p) {
  const D = p.dunk, b = S.ball, h = HOOPS[D.hoop], dk = D.def, m = S.match;
  D.slammed = true;
  b.owner = null; b.state = 'shot'; b.x = h.x; b.y = h.y; b.z = RIM_Z + 6; b.vx = 0; b.vy = 0; b.vz = -220; b.scored = false; b.touched = true;
  b.shot = { slot: p.slot, team: p.team, made: true, points: 2, dist: D.d, dunk: dk.id, oop: D.oop, putback: D.putback, assist: p.assistFrom, t: 0, hoop: D.hoop, late: !!(m && m.phase === 'clockout') };
  p.assistFrom = undefined;
  p.stats.FGA++; p.stats.DNK++;
  HOOP_FX[D.hoop].bv -= 120; HOOP_FX[D.hoop].nv += 60;
  // shatter?
  let sh = dk.shatter || 0;
  if (p.nova) sh = Math.max(sh, .35); if (p.powerup && p.powerup.id === 'moon') sh = Math.max(sh, .5); if (rate(p, 'slam') >= 9 && D.turbo) sh = Math.max(sh, .03);
  if (m && m.forceShatter) { sh = 1; m.forceShatter = false; }
  sh *= tune('shatterChance');
  const shatter = m && m.shatters < 2 && S.rng() < sh;
  // posterized: a defender in front of the rim
  let victim = null;
  for (const f of foes(p)) if (Math.hypot(f.x - h.x, f.y - h.y) < 30 && f.state !== 'knocked' && dist2(f, p) < 34) { victim = f; break; }
  emit('slam', { slot: p.slot, dunk: dk.id, shatter, hoop: D.hoop });
  dunkFx(p, h, shatter);
  if (victim) { knockDown(victim, 1.2, p); victim.dizzy = 1.6; emit('posterized', { slot: p.slot, victim: victim.slot, name: p.name, victimName: victim.name }); }
  if (dk.id === 'quake') for (const q of S.players) if (q !== p && q.state !== 'knocked' && Math.hypot(q.x - h.x, q.y - h.y) < 60) knockDown(q, .8, p);
  if (shatter) shatterBoard(D.hoop, p);
}
/** a defender in the air meeting the ball: blocks shots in their first .25 s, layups, and dunks before the slam;
 *  touching a shot on its way down near the rim is goaltending */
function blockCheck(p) {
  if (!p.jump || p.jump.swatted || !isAir(p)) return;
  const b = S.ball, hz = handsZ(p), rch = tune('blockReach') + rate(p, 'swat');
  if (b.state === 'shot' && b.shot && b.shot.team !== p.team && !b.shot.dunk) {
    const d = Math.hypot(b.x - p.x, b.y - p.y), dz = Math.abs(b.z - hz);
    if (d < rch && dz < rch) {
      const h = HOOPS[b.shot.hoop];
      if (b.vz < 0 && Math.hypot(b.x - h.x, b.y - h.y) < 18 && b.z > RIM_Z) {   // coming down over the rim: goaltending
        if (!(p.nova || p.def.team === 'blambots')) { p.jump.swatted = true; b.shot.made = true; b.shot.goaltend = true; emit('goaltend', { slot: p.slot, name: p.name }); const v = E.arc(b, { x: h.x, y: h.y, z: RIM_Z - 4 }, tune('ballGravity'), { time: .25 }); b.vx = v.vx; b.vy = v.vy; b.vz = v.vz; return; }
      } else if (b.shot.t < .3 || b.shot.layup) {
        p.jump.swatted = true;
        const shooter = S.players[b.shot.slot], chance = clamp(.45 + .05 * (rate(p, 'swat') - rate(shooter, 'splash')), .1, .85) * tune('blockChance');
        if (S.rng() < chance || S.forceBlock) { S.forceBlock = false; return swat(p, shooter); }
      }
    }
  }
  const o = owner();
  if (o && o.team !== p.team && (o.state === 'dunk' || o.state === 'layup' || o.state === 'jumpshot')) {
    const hd = handWorld(o.rig, 'R'), d = Math.hypot(hd[0] - p.x, hd[1] - p.y), dz = Math.abs(hd[2] - hz);
    if (d < rch + 4 && dz < rch + 6 && !(o.dunk && o.dunk.slammed)) {
      p.jump.swatted = true;
      const chance = o.state === 'dunk' ? clamp(.36 + .06 * (rate(p, 'swat') - rate(o, 'slam')), .08, .8) * tune('blockChance') * (cheat('unblockable') ? 0 : 1) * (o.def.team === 'blambots' && S.match.overclock > 0 ? .5 : 1)
        : clamp(.4 + .05 * (rate(p, 'swat') - rate(o, 'splash')), .1, .8) * tune('blockChance');
      if (S.rng() < chance) swat(p, o);
    }
  }
}
function swat(p, victim) {
  const b = S.ball, toward = XM - p.x, a = Math.atan2(YM - p.y + (S.rng() - .5) * 60, toward);
  if (victim && victim.state === 'dunk') { victim.state = 'air'; victim.dunk = null; victim.rig.spin = 0; victim.jump = { kind: 'dunkfall', t: 0 }; victim.vx *= -.3; }
  if (victim && (victim.state === 'jumpshot' || victim.state === 'layup')) { victim.state = 'air'; }
  b.owner = null; b.state = 'loose'; b.shot = null; b.vx = Math.cos(a) * 240; b.vy = Math.sin(a) * 160; b.vz = 120; b.touched = true;
  p.stats.BLK++;
  P.impact(b.x, b.y, b.z, 1.2, '#ff5a3a'); P.sparks(b.x, b.y, b.z, 8, a); game.shake(2); sfxAt('block', p.x); rumble(.4, .15);
  emit('block', { slot: p.slot, victim: victim ? victim.slot : -1, name: p.name, victimName: victim ? victim.name : '' });
}

/* ---- passing ---- */
function passTo(p, to, kind = 'chest', o = {}) {
  const b = S.ball; if (!to) return;
  const spd = (180 + 12 * rate(p, 'dime')) * 1.6, hand = handAt(p), from = inArena({ x: hand[0], y: hand[1], z: Math.max(12, hand[2]) });
  const d = Math.hypot(to.x - from.x, to.y - from.y);
  let t = o.time || clamp(d / spd, .12, 1.2);
  const tx = to.x + to.vx * t * .8, ty = to.y + to.vy * t * .8, tz = o.tz || (isAir(to) ? to.z + reach(to) * .8 : reach(to) * .6);
  const g = tune('ballGravity'), v = kind === 'lob' ? E.arc(from, { x: tx, y: ty, z: tz }, g, { apex: 28 }) : E.arc(from, { x: tx, y: ty, z: tz }, g, { time: t });
  b.owner = null; b.state = 'pass'; b.x = from.x; b.y = from.y; b.z = from.z; b.vx = v.vx; b.vy = v.vy; b.vz = v.vz; b.passer = p.slot;
  b.pass = { to, t: 0, T: v.t, kind, tried: new Set(), passer: p, oop: !!o.oop, tip: !!o.tip };
  p.cool.pass = .3; p.act = { kind: kind === 'lob' ? 'passLob' : 'passChest', t: 0, T: .2 };
  if (p.state === 'jumpshot') p.state = 'air';
  sfxAt('release', p.x, { vol: .5 }); emit('pass', { slot: p.slot, to: to.slot, kind });
}
function passFlight(dt) {
  const b = S.ball, ps = b.pass; if (!ps) return; ps.t += dt;
  const to = ps.to;
  // the catch: the ball near the receiver's hands
  if (to && to.state !== 'knocked' && to.state !== 'reboot' && to.cool.catch <= 0 && !(ps.oop && to.state === 'dunk')) {
    const hz = to.z + reach(to) * .6;
    if (Math.hypot(b.x - to.x, b.y - to.y) < 14 && b.z < to.z + reach(to) + 8 && b.z > to.z) { giveBall(to); to.assistFrom = ps.passer.slot; if (to.state === 'air' && to.jump && to.jump.kind === 'rebound') to.state = 'air'; return; }
  }
  // interceptions: a defender near the ball's line, once each
  for (const f of ps.tip ? [] : foes(ps.passer)) {
    if (ps.tried.has(f) || f.state === 'knocked' || f.state === 'reboot') continue;
    const d = Math.hypot(b.x - f.x, b.y - f.y);
    if (d < 10 && b.z < handsZ(f) + 4 && b.z > f.z) {
      ps.tried.add(f);
      const ch = clamp(.15 + .04 * (rate(f, 'swipe') - rate(ps.passer, 'dime')) + .2, .15, .55) * (f.powerup && f.powerup.id === 'glue' ? 3 : 1);
      if (S.rng() < ch) { const from = ps.passer; giveBall(f); f.stats.STL++; emit('steal', { slot: f.slot, victim: from.slot, name: f.name, victimName: from.name, intercept: true }); sfxAt('steal', f.x); return; }
    }
  }
  if (ps.t > ps.T + .25) toLoose();
}
/** an alley-oop: the teammate leaps for the rim, the passer lobs to meet its hands; out of range, a lob pass */
function alleyOop(p) {
  const t = mate(p); if (!t) return;
  const h = attackHoop(p.team), d = Math.hypot(t.x - h.x, t.y - h.y), range = dunkRange(t) * 1.15 + rate(p, 'dime') * 4;
  if (d <= range && !isAir(t) && t.state === 'run' && (t.x - h.x) * h.dir > -6) {
    startDunk(t, { oop: true });
    const D = t.dunk, tc = D.T * .7, lead = .08;
    const at = { x: D.from[0] + D.v.vx * tc, y: D.from[1] + D.v.vy * tc, z: D.from[2] + D.v.vz * tc - .5 * D.g * tc * tc + reach(t) * .95 };
    const hand = handAt(p), from = inArena({ x: hand[0], y: hand[1], z: Math.max(14, hand[2]) }), v = E.arc(from, at, tune('ballGravity'), { time: Math.max(.2, tc - lead) });
    const b = S.ball; b.owner = null; b.state = 'pass'; b.x = from.x; b.y = from.y; b.z = from.z; b.vx = v.vx; b.vy = v.vy; b.vz = v.vz; b.passer = p.slot;
    b.pass = { to: t, t: 0, T: v.t, kind: 'lob', tried: new Set(), passer: p, oop: true };
    t.assistFrom = p.slot;
    p.cool.pass = .4; p.act = { kind: 'passLob', t: 0, T: .25 }; sfxAt('release', p.x);
    emit('alleyoopStart', { slot: p.slot, to: t.slot });
  } else passTo(p, t, 'lob');
}

/* ---- defense: steals, shoves, spins ---- */
function startSteal(p) {
  p.state = 'steal'; p.st = 0; p.act = { kind: 'steal', t: 0, T: .4, hit: p.human ? .1 : .14 }; p.cool.steal = tune('stealCooldown');
  const o = owner(); if (o) p.facing = Math.atan2(o.y - p.y, o.x - p.x);
  p.vx += Math.cos(p.facing) * 40; p.vy += Math.sin(p.facing) * 40; sfxAt('spin', p.x, { vol: .4 });
}
function startShove(p) {
  p.state = 'shove'; p.st = 0; p.act = { kind: 'shove', t: 0, T: .45, hit: p.human ? .06 : .1 }; p.cool.shove = tune('shoveCooldown');
  if (!infTurbo(p)) p.turbo = Math.max(0, p.turbo - tune('shoveCost'));
  const tg = foes(p).filter(f => f.state !== 'knocked').sort((a, c) => dist2(a, p) - dist2(c, p))[0];
  if (tg && dist2(tg, p) < 40) p.facing = Math.atan2(tg.y - p.y, tg.x - p.x);
  p.vx += Math.cos(p.facing) * 70; p.vy += Math.sin(p.facing) * 70;
}
function actStep(p, dt) {
  const a = p.act; if (!a) { p.state = 'run'; return; }
  a.t += dt;
  if (!a.done && a.t >= a.hit) {
    a.done = true;
    if (a.kind === 'steal') stealHit(p); else if (a.kind === 'shove') shoveHit(p);
  }
  if (a.t >= a.T) { p.state = 'run'; p.act = null; p.st = 0; }
}
function stealHit(p) {
  const o = owner(); if (!o || o.team === p.team) return;
  const d = dist2(o, p), rch = tune('stealReach') + rate(p, 'swipe') * .6, facing = Math.abs(E.angDiff(p.facing, Math.atan2(o.y - p.y, o.x - p.x)));
  if (d > rch || facing > 1.3 || o.state === 'spin' || (o.state === 'dunk' && o.z > 20)) { emit('stealMiss', { slot: p.slot }); return; }
  // angle: from behind or the dribble-hand side is easier
  const fromAng = E.angDiff(o.facing, Math.atan2(p.y - o.y, p.x - o.x)), behind = Math.abs(fromAng) > 2, dribbleSide = Math.sign(fromAng) === o.dribSide;
  let ch = tune('stealChance') * fac.swipe(p) * (1.25 - .05 * rate(o, 'dime')) * (behind || dribbleSide ? 1.4 : .6) * (o.cmd.tD ? 1.15 : 1);
  if (p.nova) ch *= 1.2; if (p.def.team === 'blambots' && S.match && S.match.twist && S.match.twist.kind === 'boss') ch *= 1.15;
  if (o.state === 'jumpshot' || o.state === 'layup') ch = 0;
  if (p.powerup && p.powerup.id === 'glue' && !(o.powerup && o.powerup.id === 'glue')) ch = 1;
  if (o.powerup && o.powerup.id === 'glue' && !(p.powerup && p.powerup.id === 'glue')) ch = 0;
  if (S.rng() < ch) {
    if (d < 9) giveBall(p, 'steal'); else { looseBall((p.x - o.x) * 3, (p.y - o.y) * 3, 80); S.ball.x = o.x; S.ball.y = o.y; S.ball.z = 20; S.ball.lastTeam = o.team; }
    p.stats.STL++; P.glints(o.x, o.y, 20, 6, '#5aff8a'); sfxAt('steal', p.x); rumble(.3, .1, p);
    emit('steal', { slot: p.slot, victim: o.slot, name: p.name, victimName: o.name });
  } else emit('stealMiss', { slot: p.slot });
}
function shoveHit(p) {
  const bomb = p.powerup && p.powerup.id === 'bomb';
  if (bomb) {
    endPowerup(p); P.explosion(p.x, p.y, 10, 1.4, { freeze: false }); game.shake(5);
    for (const f of foes(p)) if (dist2(f, p) < 60) { const fum = hasBall(f); knockDown(f, tune('knockdownTime') * 1.3, p); if (fum) fumble(f, p); }
    emit('bomb', { slot: p.slot }); return;
  }
  const tg = foes(p).filter(f => f.state !== 'knocked' && f.state !== 'reboot' && dist2(f, p) < 22 + 6 && Math.abs(E.angDiff(p.facing, Math.atan2(f.y - p.y, f.x - p.x))) < 1.05 && Math.abs(f.z - p.z) < 26)[0];
  if (!tg) { emit('shoveMiss', { slot: p.slot }); return; }
  const k = (tune('knockdownTime') + .04 * (rate(p, 'bump') - rate(tg, 'bump'))) * (cheat('oneShove') ? 1.5 : 1);
  const had = hasBall(tg), inAir = tg.state === 'jumpshot' || tg.state === 'layup';
  knockDown(tg, clamp(k, .3, 1.4), p);
  const force = tune('shoveForce') * (.75 + .05 * rate(p, 'bump')), a = p.facing; tg.vx = Math.cos(a) * force; tg.vy = Math.sin(a) * force;
  P.impact((p.x + tg.x) / 2, (p.y + tg.y) / 2, 24, 1, '#ffd23a'); game.shake(2); sfxAt('shove', p.x); rumble(.5, .15, tg);
  tg.juice = Math.max(0, tg.juice - .06 * tune('fatigue'));
  emit('shove', { slot: p.slot, victim: tg.slot, name: p.name, victimName: tg.name });
  if (had) { const fch = inAir ? .7 : clamp(tune('shoveFumble') + .04 * (rate(p, 'bump') - rate(tg, 'bump')), .2, .95); if (S.rng() < fch || cheat('oneShove')) fumble(tg, p); }
}
function fumble(v, by) { const b = S.ball; if (b.owner !== v) return; looseBall(v.vx * .5 + (S.rng() - .5) * 80, v.vy * .5 + (S.rng() - .5) * 80, 120); b.z = Math.max(b.z, 20); b.lastTeam = v.team; emit('fumble', { slot: v.slot, by: by ? by.slot : -1 }); }
function knockDown(p, t, by) {
  if (p.state === 'dunk') { p.dunk = null; p.rig.spin = 0; }
  if (hasBall(p) && (p.state === 'jumpshot' || p.state === 'layup')) fumble(p, by);
  p.state = 'knocked'; p.knock = t; p.st = 0; p.act = null; p.jump = null; p.stats.KD++;
  sfxAt('fall', p.x); P.dust(p.x, p.y, 0, 8);
  if (by && p.def.team === 'blambots' && S.match && S.match.twist && S.match.twist.kind === 'boss') {   // two knockdowns within 10 s: SYSTEM REBOOT
    const now = S.match.time; p.knocks = p.knocks.filter(k => now - k < 10); p.knocks.push(now);
    if (p.knocks.length >= 2) { p.knocks = []; p.reboot = 3 + t; emit('reboot', { slot: p.slot, name: p.name }); sfxAt('reboot', p.x); P.sparks(p.x, p.y, 30, 16, null, { color: '#5ac8ff' }); }
  }
  emit('knockdown', { slot: p.slot, by: by ? by.slot : -1 });
}
function spinMove(p) {
  p.state = 'spin'; p.st = 0; p.cool.spin = tune('spinCooldown'); if (!infTurbo(p)) p.turbo = Math.max(0, p.turbo - tune('spinCost'));
  sfxAt('spin', p.x); emit('spin', { slot: p.slot });
  for (const f of foes(p)) {
    const d = dist2(f, p), ahead = Math.abs(E.angDiff(p.facing, Math.atan2(f.y - p.y, f.x - p.x))) < .9;
    if (d < 22 && ahead && f.state !== 'knocked' && !isAir(f) && S.rng() < clamp(.35 + .04 * (rate(p, 'dime') - rate(f, 'swipe')), .15, .7)) { knockDown(f, .45, null); f.dizzy = .6; emit('ankles', { slot: p.slot, victim: f.slot, name: p.name, victimName: f.name }); }
  }
}

/* ---- loose balls, rebounds, catches ---- */
function grabCheck(p) {
  const b = S.ball, m = S.match;
  if (b.owner || p.state === 'knocked' || p.state === 'reboot' || p.state === 'dunk' || p.cool.catch > 0) return;
  if (b.state !== 'loose' && !(b.state === 'shot' && b.shot && b.shot.t > .35 && b.touched)) return;
  if (m && m.phase !== 'live' && m.phase !== 'clockout') return;
  const d = Math.hypot(b.x - p.x, b.y - p.y), top = p.z + reach(p) + 4;
  if (d < 11 && b.z <= top && b.z >= p.z - 2) {
    const was = b.lastTeam, off = b.shot ? b.shot.team === p.team : was === p.team, air = isAir(p), touched = b.touched;
    const shotT = b.shot; giveBall(p, 'catch'); if (air) b.state = 'held';
    if (shotT || touched) { p.stats.REB++; emit('rebound', { slot: p.slot, offensive: off, air }); }
    // a putback: an offensive rebound in the air near the rim with turbo slams it home
    const h = attackHoop(p.team);
    if (air && off && p.cmd.tD && Math.hypot(p.x - h.x, p.y - h.y) < 40) { startDunk(p, { putback: true }); }
  }
}

/* ---- power-ups ---- */
function givePowerup(p, id) {
  const def = get('powerup', id); if (p.powerup) endPowerup(p, true);
  p.powerup = { id, t: def.seconds, shots: def.shots || 0 };
  if (id === 'gold') S.match.gold = p.team;
  P.glints(p.x, p.y, 20, 12, def.color); P.text(p.x, p.y, 50, '+' + def.name, def.color, { scale: 1 }); sfxAt('powerup', p.x);
  emit('powerupPick', { slot: p.slot, id, name: p.name });
}
function endPowerup(p, quiet) { if (!p.powerup) return; if (!quiet) { sfxAt('pu_end', p.x); emit('powerupEnd', { slot: p.slot, id: p.powerup.id }); } p.powerup = null; }

/* ---- the twists' geometry ---- */
function onSlick(p) { const m = S.match; return !!(m && m.twist && m.twist.slicks && !isAir(p) && m.twist.slicks.some(s => Math.hypot((p.x - s.x) / s.rx, (p.y - s.y) / s.ry) < 1)); }
const VENTS = [{ x: X0 + 200, y: Y0 + 60 }, { x: X0 + 440, y: Y0 + 228 }];
function onVent(p) { const m = S.match; return !!(m && m.twist && m.twist.kind === 'eruption' && VENTS.some(v => Math.hypot(p.x - v.x, p.y - v.y) < 18)); }

/* ---- rumble on the pads of the players involved ---- */
function rumble(strength, seconds, p) {
  if (S.net && S.net.role === 'server') return;
  const list = p ? [p] : S.players; for (const q of list) if (q.human && q.human.rumble) { try { q.human.rumble(strength, seconds); } catch (e) { /* no vibration */ } }
}
