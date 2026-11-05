/* ---- THE ARCADE LAYER (plan §6.8, §6.10, §6.13, §10.3): layups, the twelve-dunk catalog and its choice, dunks that score
 * unless blocked, alley-oops, putbacks, steals, shoves that knock down and fumble, spin moves that break ankles, blocks,
 * goaltending and the backboard that shatters. The shot's outcome is decided where the shot starts; these rules pick
 * the play and decide the blocks. ---- */
const DUNKS = [
  { id: 'hammer', banner: 'TWO-HAND HAMMER', slam: 0, dist: [0, 70], bonus: 0, lines: 'power' },
  { id: 'tomahawk', banner: 'TOMAHAWK!', slam: 5, dist: [30, 130], bonus: 50, lines: 'power' },
  { id: 'doublepump', banner: 'DOUBLE PUMP!', slam: 6, dist: [30, 120], bonus: 80, lines: 'power' },
  { id: 'reverse', banner: 'REVERSE ROCKET!', slam: 6, dist: [20, 100], bonus: 100, lines: 'spin', needs: { behind: true } },
  { id: 'windmill', banner: 'WINDMILL!', slam: 7, dist: [50, 150], bonus: 100, lines: 'spin' },
  { id: 'threesixty', banner: 'THREE-SIXTY!', slam: 7, dist: [40, 140], bonus: 120, lines: 'spin' },
  { id: 'ftflyer', banner: 'FREE-THROW FLYER!', slam: 8, dist: [110, 300], bonus: 150, lines: 'hang' },
  { id: 'flip', banner: 'FRONT-FLIP FREAK!', slam: 8, dist: [60, 150], bonus: 180, lines: 'flip' },
  { id: 'rattler', banner: 'RIM RATTLER!', slam: 4, dist: [0, 60], bonus: 60, lines: 'hang' },
  { id: 'nova720', banner: 'SEVEN-TWENTY SUPERNOVA!', slam: 0, dist: [60, 190], bonus: 250, lines: 'nova', needs: { nova: true } },
  { id: 'volcano', banner: 'VOLCANO LAUNCH!', slam: 0, dist: [0, 300], bonus: 300, lines: 'volcano', needs: { vent: true } },
  { id: 'quake', banner: 'BLAM-QUAKE!!!', slam: 0, dist: [80, 300], bonus: 400, lines: 'quake', needs: { overclock: true } }
];
for (const d of DUNKS) def('dunk', d.id, d);

/** the dunk's range from the rim (§6.8): dunkRange × the SLAM factor, plus the power-ups and Supernova */
const dunkRangeOf = p => {
  if (S.cheats && S.cheats.skyDunks) return 400;   // SKY DUNKS: a dunk from half court
  let r = tune('dunkRange') * (.75 + .05 * rate(p, 'slam'));
  if (p.nova) r += 40;
  if (p.moon > 0) r += 20;
  return r;
};
/** a dunk of the catalog chosen by what the situation needs (§10.3): needs pass, weighted by its bonus and by
 * (SLAM − its minimum + 1), drawn with the match's seeded stream */
const pickDunk = (p, d, ctx = {}) => {
  const ok = DUNKS.filter(k => {
    if (rate(p, 'slam') < k.slam) return false;
    if (d < k.dist[0] || d > k.dist[1]) return false;
    if (k.needs && k.needs.nova && !p.nova) return false;
    if (k.needs && k.needs.overclock && !ctx.overclock) return false;
    if (k.needs && k.needs.vent && !ctx.vent) return false;
    if (k.needs && k.needs.behind && !ctx.behind) return false;
    return true;
  });
  if (!ok.length) return DUNKS[0];
  const w = ok.map(k => (k.bonus + 40) * (rate(p, 'slam') - k.slam + 1));
  let r = S.rng() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < ok.length; i++) { r -= w[i]; if (r <= 0) return ok[i]; }
  return ok[ok.length - 1];
};

/** a layup: a shot with turbo off inside 40 of the rim: a short rise and scoop, the make chance high (§6.8) */
const layupChance = p => clamp(.85 * (.78 + .045 * rate(p, 'splash')) * juiceFactor(p) * tune('shotSkill'), .02, .97);

/** a dunk begins: the dunker leaves the floor and flies to the slam point (§6.8). The outcome is decided here: a dunk
 * scores unless a defender in the air blocks it before the slam (§6.10); a slam of SLAM 3 or less misses 4% off the back rim */
const startDunk = (p, opts = {}) => {
  const rim = attackRim(p.side), R = RIMW[rim], d = rimDist(p.body.x, p.body.y, rim);
  const pos = { x: p.body.x, y: p.body.y };
  const ctx = { overclock: !!(p.team && p.team.boss && S.twist.overclock), vent: !!opts.vent, behind: opts.behind };
  const kind = opts.kind || pickDunk(p, d, ctx);
  const blocker = S.cheats.unblockable ? null : contestOf(p, rim).who;
  let blocked = false;
  if (blocker && blocker.body.z > 12 && Math.hypot(blocker.body.x - p.body.x, blocker.body.y - p.body.y) < 30) {
    const chance = clamp(.25 + .06 * (rate(blocker, 'swat') - rate(p, 'slam')), .05, .75) * tune('blockChance');
    blocked = S.rng() < chance;
  }
  const fail = rate(p, 'slam') <= 3 && S.rng() < .04;
  const made = !blocked && !fail;
  const T = .9 * tune('dunkHang') * (opts.long ? 1.2 : 1);
  p.dunk = { kind, t: 0, T, made, blocked, fail, rim, start: pos, behind: !!opts.behind, slamped: false, from: d, lobbed: !!opts.lobbed };
  p.state = 'dunk'; p.stateT = 0; p.jumping = true; p.air = true;
  p.body.vz = 0;
  emit('dunkStart', { slot: p.slot, side: p.side, dunk: kind.id, banner: kind.banner, blocked, made, lines: kind.lines, dist: d });
  if (blocked) emit('block', { slot: blocker.slot, side: blocker.side, x: p.body.x, y: p.body.y, z: p.body.z + 40, posterized: true });
  return p.dunk;
};
/** a dunk's flight, each step (§6.8): the path from takeoff to the slam point, with a parabola; the slam at u ≈ .9 */
const dunkStep = (p, dt) => {
  const k = p.dunk, R = RIMW[k.rim]; k.t += dt;
  const u = clamp(k.t / k.T, 0, 1);
  k.u = u;
  const ax = R.x - (k.behind ? -4 : 4), ay = R.y;
  p.body.x = lerp(k.start.x, ax, u); p.body.y = lerp(k.start.y, ay, u);
  p.body.z = 42 * Math.sin(Math.PI * Math.min(1, u));
  const base = Math.atan2(R.y - k.start.y, R.x - k.start.x), id = k.kind.id;
  // the spins of the catalog (§10.3): THREE-SIXTY a full turn over the flight's middle, SEVEN-TWENTY two turns
  const turns = id === 'threesixty' ? 1 : id === 'nova720' ? 2 : 0;
  p.face = base + turns * TAU * clamp((u - .2) / .65, 0, 1);
  k.flip = id === 'flip' ? clamp((u - .25) / .5, 0, 1) : 0;   // FRONT-FLIP FREAK: a somersault over u .25–.75 (rig.flip)
  p.air = true;
  if (!k.slamped && u >= .9) {
    k.slamped = true;
    p.rig.kick(1);   // the body kicks at the slam (§7.3: rig.kick on the slam)
    if (k.made) {
      const rec = { shooter: p.slot, made: true, points: 2, dunk: k.kind.id, rim: k.rim, t: S.match.clock, age: 0, perfect: true, three: false, release: 0, kind: 'dunk', p: 1, dist: k.from };
      p.stats.dunks++; p.stats.fga++; p.stats.fgm++;
      const b = S.ball; b.owner = null; p.hasBall = false; b.shot = rec; b.state = 'shot'; b.x = R.x; b.y = R.y; b.z = R.z + 6; b.vx = b.vy = 0; b.vz = -180;
      S.match.shotsInFlight = (S.match.shotsInFlight || 0) + 1;
      emit('dunk', { slot: p.slot, side: p.side, dunk: k.kind.id, banner: k.kind.banner, bonus: k.kind.bonus, x: R.x, y: R.y, z: R.z, slam: true, lines: k.kind.lines });
      if (maybeShatter(p, k.kind)) { S.match.sponsorT = 0; S.match.sponsorPending = true; }
      // POSTERIZED (§6.8): a defender in front of the rim, within 24 of the slam, goes down with the dizzy stars
      for (const q of S.players) { if (q.side === p.side || !q.onCourt || q.knocked > 0) continue; if (Math.hypot(q.body.x - R.x, q.body.y - R.y) < 24) { knockDown(q, 1.2); emit('posterized', { slot: p.slot, victim: q.slot, by: p.slot, x: q.body.x, y: q.body.y }); } }
      if (k.kind.id === 'rattler') p.dunkHang = 1.2;
    } else if (k.blocked) {
      // a blocked dunk: the ball is knocked away from the rim
      const b = S.ball; b.owner = null; b.state = 'loose'; b.x = R.x - 8; b.y = R.y; b.z = R.z; b.vx = -120; b.vy = 40; b.vz = 120;
    } else {
      // a missed dunk off the back rim
      const b = S.ball; b.owner = null; b.state = 'loose'; b.x = R.x; b.y = R.y - 6; b.z = R.z + 2; b.vx = 60; b.vy = -40; b.vz = 150;
      emit('rim', { x: R.x, y: R.y, z: R.z, speed: 150, rim: k.rim });
    }
  }
  if (u >= 1) {
    p.rig.kick(-1); p.rig.land(1);   // a three-point landing (§7.3)
    p.dunk = null; p.state = 'run'; p.jumping = false;
    if (p.dunkHang) { p.hang = p.dunkHang; p.dunkHang = 0; }
    p.body.z = 0; p.air = false; emit('land', { slot: p.slot, x: p.body.x, y: p.body.y });
  }
};

/** the alley-oop (§6.8): the passer throws a lob to the receiver's hands near the rim; a receiver who catches it in the
 * air dunks (the alley-oop's own bonus). The lob can be intercepted or blocked (the interception is the defence's). */
const alleyOop = (p, mate) => {
  const rim = attackRim(p.side), R = RIMW[rim];
  const from = { x: p.body.x, y: p.body.y, z: p.body.z + 30 };
  const tgt = { x: mate.body.x + mate.body.vx * .4, y: mate.body.y + mate.body.vy * .4, z: 62 };
  const v = E.arc(from, tgt, tune('ballGravity'), { time: .75 });
  ballRelease(S.ball, from, v, 'pass', null);
  S.ball.to = mate.slot; S.ball.oop = true; S.ball.from = p.slot;
  p.stats.ast++; p.hasBall = false; S.ball.owner = null;
  mate.oopReady = .9;
  emit('alleyoop', { slot: p.slot, to: mate.slot, side: p.side });
};

/** a steal (§6.10): a swipe of .2 s; the chance by SWIPE, the handler's DIME, the angle, turbo and spin */
const stealAttempt = p => {
  if (p.cool.steal > 0 || !p.onCourt) return false;
  const b = S.ball, h = b.owner; if (!h || h.side === p.side) return false;
  const d = Math.hypot(h.body.x - p.body.x, h.body.y - p.body.y);
  if (d > tune('stealReach') + .6 * rate(p, 'swipe')) return false;
  p.cool.steal = tune('stealCooldown');
  p.state = 'steal'; p.stateT = 0;
  if (h.spinT > 0) { emit('stealMiss', { slot: p.slot }); return false; }
  const ang = Math.abs(E.angDiff(Math.atan2(p.body.y - h.body.y, p.body.x - h.body.x), h.face));
  const angleF = ang > 2.2 ? 1.4 : ang < .9 ? .6 : 1;
  let chance = tune('stealChance') * (.55 + .09 * rate(p, 'swipe')) * (1.25 - .05 * rate(h, 'dime')) * angleF * (h.turboOn ? 1.15 : 1) * (p.nova ? 1.2 : 1) * (h.glue ? 0 : 1);
  if (p.brain) chance *= diffOf(p).steal * tune('cpuAggression');
  if (S.rng() < clamp(chance, 0, .95)) {
    releaseLoose(b);
    b.vx = Math.cos(p.face) * 60; b.vy = Math.sin(p.face) * 60; b.vz = 40; b.state = 'loose';
    p.stats.stl++;
    emit('steal', { slot: p.slot, side: p.side, victim: h.slot, x: h.body.x, y: h.body.y });
    h.stats.turnovers = (h.stats.turnovers || 0) + 1;
    takeStolen(p, b);
    return true;
  }
  p.state = 'run';
  emit('stealMiss', { slot: p.slot });
  return false;
};
/** the stealer picks the loose ball straight up if it is near (a clean steal), else it rolls on */
const takeStolen = (p, b) => { if (Math.hypot(b.x - p.body.x, b.y - p.body.y) < 8) takeBall(p, 'loose-steal'); };

/** a shove (§6.10): a two-handed push; a hit knocks the target down; the handler may fumble the ball */
const shoveAttempt = p => {
  if (p.cool.shove > 0 || p.knocked > 0 || !p.onCourt) return false;
  const costs = tune('shoveCost');
  if (p.turbo < .1) return false;
  p.turbo = Math.max(0, p.turbo - costs);
  p.cool.shove = tune('shoveCooldown') * (p.brain ? 1.1 : 1);
  p.state = 'shove'; p.stateT = 0;
  emit('shove', { slot: p.slot, side: p.side, x: p.body.x, y: p.body.y });
  const bumpA = rate(p, 'bump');
  for (const q of S.players) {
    if (q.side === p.side || !q.onCourt || q.knocked > 0) continue;
    const dx = q.body.x - p.body.x, dy = q.body.y - p.body.y, d = Math.hypot(dx, dy);
    if (d > 22) continue;
    const ang = Math.abs(E.angDiff(Math.atan2(dy, dx), p.face));
    if (ang > PI / 3) continue;
    const kdTime = clamp(tune('knockdownTime') + .04 * (bumpA - rate(q, 'bump')), .3, 1.4);
    knockDown(q, kdTime);
    q.body.vx += Math.cos(Math.atan2(dy, dx)) * tune('shoveForce') * .5;
    q.body.vy += Math.sin(Math.atan2(dy, dx)) * tune('shoveForce') * .5;
    emit('knockdown', { slot: q.slot, by: p.slot, victim: q.id, x: q.body.x, y: q.body.y, time: kdTime });
    if (S.ball.owner === q) {
      const fumble = clamp(tune('shoveFumble') + .04 * (bumpA - rate(q, 'bump')), .2, .95);
      if (S.rng() < fumble) { releaseLoose(S.ball); S.ball.vx = dx * 2; S.ball.vy = dy * 2; S.ball.vz = 80; S.ball.state = 'loose'; emit('fumble', { slot: q.slot, by: p.slot }); }
    }
    p.stats.knock++;
  }
  return true;
};

/** a spin move with the ball (§6.10): a .35 s turn that carries the handler on and breaks steals and ankles */
const spinMove = p => {
  if (p.cool.spin > 0 || p.turbo < tune('spinCost')) return false;
  p.turbo -= tune('spinCost'); p.cool.spin = tune('spinCooldown');
  p.spinT = .35; p.state = 'spin'; p.stateT = 0;
  p.body.vx += Math.cos(p.face) * 60; p.body.vy += Math.sin(p.face) * 60;
  for (const q of S.players) {
    if (q.side === p.side || !q.onCourt) continue;
    const dx = q.body.x - p.body.x, dy = q.body.y - p.body.y, d = Math.hypot(dx, dy);
    if (d < 14 && Math.abs(E.angDiff(Math.atan2(dy, dx), p.face)) < .9) {
      knockDown(q, .4); emit('ankles', { slot: q.slot, by: p.slot, victim: q.id, x: q.body.x, y: q.body.y });
      q.stats.ankles = (q.stats.ankles || 0) + 1;
    }
  }
  emit('spin', { slot: p.slot, x: p.body.x, y: p.body.y });
  return true;
};

/** a block (§6.10): a jump at a shot in its first .25 s of flight; its chance by SWAT and the timing; a block sends the ball
 * off, and a block of a made shot is a real block (the outcome changes here, by this roll) */
const blockAttempt = p => {
  const b = S.ball;
  if (b.state !== 'shot' || !b.shot || b.shot.age > .25) return false;
  if (b.shot.shooter && S.players[b.shot.shooter].side === p.side) return false;
  const d = Math.hypot(b.x - p.body.x, b.y - p.body.y), reach = tune('blockReach') + .8 * rate(p, 'swat');
  if (d > reach + 14) return false;
  const dif = p.brain ? diffOf(p) : null;
  const timing = dif ? (S.rng() - .5) * dif.block : 0;
  const chance = clamp(.2 + .05 * (rate(p, 'swat') - 5) - timing * 2, .05, .6) * tune('blockChance');
  p.cool.block = .6;
  if (S.rng() >= chance) return false;
  const shooter = S.players[b.shot.shooter];
  b.shot.resolved = true; b.shot.blocked = true; b.shot.made = false;
  if (S.match.shotsInFlight > 0) S.match.shotsInFlight--;
  p.stats.blk++; shooter.stats.blockedBy = (shooter.stats.blockedBy || 0) + 1;
  const dir = p.side === HOME ? 1 : -1;
  b.vx = dir * 90; b.vy = (S.rng() - .5) * 60; b.vz = 120; b.state = 'loose'; b.owner = null; b.shot = null;
  emit('block', { slot: p.slot, side: p.side, x: b.x, y: b.y, z: b.z, shooter: shooter.slot, posterized: false, rejected: true });
  return true;
};

/** goaltending (§6.3): a defender touches a shot coming down within 18 of the ring and above it: the basket counts */
const goaltendCheck = p => {
  const b = S.ball, sh = b.shot;
  if (b.state !== 'shot' || !sh || sh.made || sh.resolved) return false;
  if (S.players[sh.shooter].side === p.side) return false;
  const R = RIMW[sh.rim], d = Math.hypot(b.x - R.x, b.y - R.y);
  if (b.vz >= 0 || d > 18 || b.z < R.z) return false;
  if (p.nova) return false;
  sh.made = true; sh.goaltend = true;
  b.vz = -120; b.x = R.x; b.y = R.y; b.z = R.z + 4; b.vx = b.vy = 0;
  emit('goaltend', { slot: p.slot, side: p.side, shooter: sh.shooter, x: R.x, y: R.y });
  return true;
};

/** the backboard shatters on a dunk (§6.13): 0 normally, 3% for SLAM 9+, 35% in Supernova, 50% with Moon Shoes, 100% for
 * BLAM-QUAKE, all times shatterChance, at most twice a game; the basket counts; the sponsor break follows */
const shatterChanceOf = (p, kind) => {
  let c = rate(p, 'slam') >= 9 ? .03 : 0;
  if (p.nova || (S.cheats.alwaysNova && p.side === HOME)) c = .35;
  if (p.moon > 0) c = .5;
  if (kind && kind.id === 'quake') c = 1;
  if (kind && kind.id === 'volcano') c = .2;
  return clamp(c * tune('shatterChance'), 0, 1);
};
const maybeShatter = (p, kind) => {
  const m = S.match; if (!m || (m.shatters || 0) >= 2) return false;
  if (S.shatterNext) { S.shatterNext = false; } else if (S.rng() >= shatterChanceOf(p, kind)) return false;   // (the dev panel's SHATTER THE NEXT DUNK)
  m.shatters = (m.shatters || 0) + 1; p.stats.shatter++;
  emit('shatter', { slot: p.slot, side: p.side, rim: attackRim(p.side) });
  return true;
};

/** a player's buttons this step (§6.2): shoot (a shot, a layup, a dunk with turbo, a block or a rebound jump), pass (a pass,
 * a steal), shove (a spin with the ball, a shove without it; turbo + pass without the ball shoves too), oop (the
 * alley-oop, or a plain lob to the teammate). Taunts are in the fx module. */
const actionsFromCmd = p => {
  const c = p.cmd, b = p.body, shooting = p.state === 'gather' || p.state === 'jump' || p.state === 'dunk' || p.state === 'knocked';
  if (shooting || p.knocked > 0) return;
  const ballNear = S.ball.state === 'shot' && Math.hypot(S.ball.x - b.x, S.ball.y - b.y) < 60 + tune('blockReach');
  if (c.taunt.pressed && !p.hasBall && !HUB && !(p.tauntT > 0)) { p.tauntT = .8; p.state = 'taunt'; p.stateT = 0; emit('taunt', { slot: p.slot }); const bark = (p.def.barks || [])[(S.fxRng() * (p.def.barks || []).length) | 0]; if (bark && COMMENTARY_LEVEL() === 2) { caption('steal', {}, 'DEE DEE'); if (S.caption) { S.caption.text = bark; S.caption.who = p.name; } } return; }
  if (c.shoot.pressed && p.hasBall) {
    const d = rimDist(b.x, b.y, attackRim(p.side));
    if (c.turbo.down && p.turbo >= .05 && d <= dunkRangeOf(p)) { startDunk(p); return; }
    if (d <= 40 && !c.turbo.down) { startShot(p); p.shot.kind = 'layup'; p.shot.plan = p.nextShotPlan || 0; return; }
    startShot(p); return;
  }
  if (c.shoot.pressed && !p.hasBall && b.z < 1.5) {
    if (ballNear && blockAttempt(p)) return;
    if (p.cool.block > 0) return;
    p.state = 'jump'; p.jumping = true; p.air = true; p.stateT = 0; p.body.jump(tune('jumpShotVz') + 10 * rate(p, 'swat')); p.reachJump = .6;
    return;
  }
  if (c.pass.pressed && p.hasBall && p.cool.pass <= 0) { passBall(p, teammateOf(p)); return; }
  if (c.pass.pressed && !p.hasBall) {
    if (c.turbo.down && c.pass.pressed && p.cool.shove <= 0) { shoveAttempt(p); return; }
    stealAttempt(p);
    return;
  }
  if (c.shove.pressed) { if (p.hasBall) spinMove(p); else shoveAttempt(p); return; }
  if (c.oop.pressed && p.hasBall) {
    const mate = teammateOf(p); if (!mate) return;
    const R = RIMW[attackRim(p.side)], reach = dunkRangeOf(p) * 1.15 + rate(p, 'dime') * 4;
    if (Math.hypot(mate.body.x - R.x, mate.body.y - R.y) <= reach) alleyOop(p, mate);
    else { const v = passBall(p, mate); return v; }
  }
};
