// THE RULES, THE CONTACT AND THE BALL: each player's movement and actions, tackles and big hits, the ball's flight and
// catches, the set pieces' steps, the venue's hazards, the CPU brain and the main step (SM.step).

const enemiesOf = (p) => SM.M.players.filter(q => q.side !== p.side && q.bin <= 0);
const mateOf = (p) => SM.M.players.filter(q => q.side === p.side && q !== p && q.bin <= 0);
const nearest = (p, list) => { let best = null, bd = 1e9; for (const q of list) { const d = dist(p.x, p.y, q.x, q.y); if (d < bd) { bd = d; best = q; } } return best ? [best, bd] : [null, Infinity]; };
const isDown = q => q.st === 'tackled' || q.st === 'stun' || q.st === 'getUp' || q.st === 'bin';
SM.isDown = isDown;

// the set-piece stoppage: a player walks to his shape (the forwards keep the mark they were given)
function stoppagePlayer(p, dt) {
  const M = SM.M;
  if (p.bin > 0) return;
  if (M.phase === 'scrum' && p.pos <= 2) return;
  if (M.phase === 'lineout' && p.pos <= 2 && M.lineout) {
    const lo = M.lineout, d = DIRS(p.side), pods = [-18, 0, 18];
    const tgt = [lo.x - d * 14, lo.y + pods[p.pos] * 0 + (p.pos - 1) * 14];
    p.x = SM.lerp(p.x, tgt[0], .18); p.y = SM.lerp(p.y, tgt[1], .18); return;
  }
  if (M.phase === 'kickoff' || M.phase === 'penalty' || M.phase === 'conv' || M.phase === 'try' || M.phase === 'half' || M.phase === 'full') {
    if (M.phase === 'conv' || M.phase === 'penalty') return;
  }
  const [tx, ty] = SM.shapeFor(p);
  const sp = Math.min(1, dt * 4);
  p.x = SM.lerp(p.x, tx, sp); p.y = SM.lerp(p.y, ty, sp);
  p.vx = p.vy = 0;
}

// a player's step: movement, the actions from his intent, the body's clamps and his facing
SM.playerStep = function (p, dt, I) {
  const M = SM.M, d = DIRS(p.side);
  p.cool = Math.max(0, p.cool - dt); p.stunT = Math.max(0, p.stunT - dt); p.evadeT = Math.max(0, p.evadeT - dt);
  p.fendT = Math.max(0, p.fendT - dt); p.fendCD = Math.max(0, p.fendCD - dt); p.diveT = Math.max(0, p.diveT - dt);
  p.cheer = Math.max(0, p.cheer - dt); p.homeT = Math.max(0, p.homeT - dt); p.switchCD = Math.max(0, p.switchCD - dt);
  p.pieT = Math.max(0, (p.pieT || 0) - dt);
  if (p.evadeT <= 0) p.evade = 0;
  if (p.bin > 0) { if (M.phase === 'play') p.bin = Math.max(0, p.bin - dt); if (p.bin <= 0) { p.bin = 0; p.st = 'run'; SM.event('binOut', { side: p.side, name: p.nick }); } return; }
  // the body on the ground: timed, then up
  if (p.st === 'tackled' || p.st === 'stun' || p.st === 'getUp') {
    if (p.st !== 'getUp') { p.stT = Math.max(0, p.stT - dt); if (p.stT <= 0) { p.st = 'getUp'; p.stT = .5; } }
    else { p.stT -= dt; if (p.stT <= 0) p.st = 'run'; }
    p.vx = approach(p.vx, 0, 500 * dt); p.vy = approach(p.vy, 0, 500 * dt);
    if (p.z > 0 || p.vz) { p.vz -= G * dt; p.z += p.vz * dt; if (p.z <= 0) { p.z = 0; p.vz = 0; } }
    p.x += p.vx * dt; p.y += p.vy * dt;
    return;
  }
  if (M.phase !== 'play') { stoppagePlayer(p, dt); p.z = 0; return; }
  // the actions first: they set velocities and states the movement then honours
  SM.actions(p, I, dt);
  // the movement from the stick (or the brain's intent): accelerate toward the velocity the stick asks
  let mx = I.mx || 0, my = I.my || 0;
  const L = Math.hypot(mx, my); if (L > 1) { mx /= L; my /= L; }
  let top = TUNE('runSpeed') * (.8 + .04 * p.stats.SPD);
  if (p.ballCarry || (M.ball.owner === p)) top *= .96;
  if (M.venue.mud && M.mud.some(m => dist(p.x, p.y, m.x, m.y) < m.r)) { top *= .8; p.mudT = .3; }
  if (p.onFire) top *= 1.1;
  if (p.evade > 0) top *= 1.1;
  if (M.superRun && M.ball.owner === p) top *= 1.35;
  if (p.pieT > 0) top *= 1;
  const turboOn = (I.turbo && p.turbo > 0) || (p.pieT > 0) || (p.onFire && p.turbo > 0);
  if (turboOn && L > .15) { top *= TUNE('turboMult'); if (p.pieT <= 0 && !SM.CHEATS.infiniteTurbo) p.turbo = Math.max(0, p.turbo - dt); }
  else p.turbo = Math.min(TUNE('turboTank'), p.turbo + TUNE('turboRegen') * dt * TUNE('turboTank') * .4);
  if (SM.CHEATS.infiniteTurbo) p.turbo = TUNE('turboTank');
  const ax = mx * top, ay = my * top, acc = 850 * dt;
  p.vx = approach(p.vx, ax, acc); p.vy = approach(p.vy, ay, acc);
  if (p.evade > 0 && I.evadeDir) { p.vx += I.evadeDir[0] * 2; p.vy += I.evadeDir[1] * 2; }
  p.x += p.vx * dt; p.y += p.vy * dt;
  p.x = SM.clamp(p.x, SM.DL0 + 6, SM.DL1 - 6); p.y = SM.clamp(p.y, SM.Y0 - 14, SM.Y1 + 14);
  if (Math.hypot(p.vx, p.vy) > 6) p.facing = Math.atan2(p.vy, p.vx);
  if (p.homeT > 0 && M.ball.owner) { const c = M.ball.owner; const a = Math.atan2(c.y - p.y, c.x - p.x); p.vx = Math.cos(a) * 240; p.vy = Math.sin(a) * 240; p.facing = a; }
  // a carrier's metres
  if (M.ball.owner === p && M.phase === 'play') {
    const gain = (p.x - (p.lastX0 == null ? p.x : p.lastX0)) * d;
    M.stats[p.side].metres += Math.max(0, gain) / 10.24;
    p.lastX0 = p.x;
  } else p.lastX0 = null;
};

// the actions of a player with and without the ball
SM.actions = function (p, I, dt) {
  const M = SM.M, press = I.press || {}, d = DIRS(p.side), has = M.ball.owner === p;
  if (has) {
    // ✕ with the ball: a sidestep, a spin on a second press within a quarter second
    if (press.x && p.cool <= 0) {
      const spin = p.lastSidestepT !== undefined && M.t - p.lastSidestepT < .25;
      const perp = [-Math.sin(p.facing), Math.cos(p.facing)];
      let side = 1; if (I.mx || I.my) side = (perp[0] * I.mx + perp[1] * I.my) >= 0 ? 1 : -1;
      else { const [e] = nearest(p, enemiesOf(p)); if (e) side = ((p.x - e.x) * perp[0] + (p.y - e.y) * perp[1]) >= 0 ? 1 : -1; }
      p.evade = spin ? .4 : TUNE('sidestepEvade'); p.evadeT = p.evade; p.evadeDir = [perp[0] * side, perp[1] * side];
      p.vx += perp[0] * side * TUNE('runSpeed') * .9; p.vy += perp[1] * side * TUNE('runSpeed') * .9;
      if (spin) { p.facing += Math.PI * 2 * .5; p.spinT = .4; SM.event('spin', { name: p.nick }); }
      const [e2, dd] = nearest(p, enemiesOf(p));
      if (e2 && dd < 22) { M.hype[p.side] = Math.min(100, M.hype[p.side] + 6 * TUNE('hypeMult')); SM.event('sidestep', { name: p.nick, side: p.side }); }
      p.cool = .6; p.lastSidestepT = spin ? undefined : M.t;
    }
    // □ with the ball: the fend, a stiff arm that beats a tackle for a moment
    if (press.sq && p.fendCD <= 0) { p.fendT = TUNE('sidestepEvade') + .05; p.fendCD = .8; const [e] = nearest(p, enemiesOf(p)); if (e && dist(p.x, p.y, e.x, e.y) < 26) { M.hype[p.side] = Math.min(100, M.hype[p.side] + 6 * TUNE('hypeMult')); SM.event('fend', { name: p.nick, side: p.side }); } }
    // the passes: L1 up the screen, R1 down it; no legal receiver on that side is a dummy
    if (press.passUp || press.passDown) {
      const up = !!press.passUp, rec = SM.legalReceivers(p, up);
      if (p.cool > 0) { /* (a pass just went) */ }
      else if (rec.length) {
        const pick = rec.find(q => !enemiesOf(p).some(e => dist(e.x, e.y, q.x, q.y) < 14)) || rec[0];
        SM.passTo(p, pick); SM.event('pass', { name: p.nick, to: pick.nick, side: p.side });
      } else {
        const fooled = enemiesOf(p).filter(e => dist(e.x, e.y, p.x, p.y) < 40 && e.pos >= 0);
        M.hype[p.side] = Math.min(100, M.hype[p.side] + 4 * fooled.length * TUNE('hypeMult'));
        p.cool = .3; SM.event('dummy', { name: p.nick, side: p.side, n: fooled.length });
      }
    }
    // ○ with the ball: a grubber on a tap, a punt on a hold (the meter), a drop goal in their 22
    if (I.kickHeld && !(p.kickHeld)) { p.kickHeld = true; p.holdKick = 0; }
    if (p.kickHeld) p.holdKick += dt;
    if ((I.kickReleased || press.kickNow) && p.kickHeld) { p.kickHeld = false; SM.kickAction(p, Math.min(1, p.holdKick / .9), I, press.kickNow ? 1 : 0); }
    if (press.superPress && M.hype[p.side] >= 100 && M.superT[p.side] <= 0) SM.superRun(p);
  } else {
    // without the ball: ✕ tackles on release (a tap) or with a big hit (the charge on a hold)
    if (I.xHeld) { p.bigCharge = Math.min(2, p.bigCharge + dt); p.bigHeld = true; }
    if (I.xReleased && p.bigHeld) { p.bigHeld = false; SM.tackle(p, p.bigCharge >= TUNE('bigHitCharge'), p.bigCharge); p.bigCharge = 0; }
    else if (press.tackleTap && p.cool <= 0 && !p.bigHeld) SM.tackle(p, false, 0);
    // □ without the ball: a dive, a lunge at a carrier's legs
    if (press.sq && p.diveT <= 0 && p.cool <= 0) { p.diveT = .35; p.cool = .5; p.lungeX = Math.cos(p.facing); p.lungeY = Math.sin(p.facing); }
    if (p.diveT > 0) { p.vx = approach(p.vx, (p.lungeX || 0) * 180, 2000 * dt); p.vy = approach(p.vy, (p.lungeY || 0) * 180, 2000 * dt); }
    // ○ without the ball: switch to the mate nearest the ball; L1 and R1: the mate up or down the line
    if (press.ci && p.switchCD <= 0) { SM.switchTo(p, 'near'); }
    if ((press.passUp || press.passDown) && p.switchCD <= 0) SM.switchTo(p, press.passUp ? 'up' : 'down');
    // △: the super; with the ball it's Thunder Run, without it Hurricane Hit (the nearest mate homes in on the carrier)
    if (press.superPress && M.hype[p.side] >= 100 && M.superT[p.side] <= 0) SM.hurricane(p);
  }
  p.lastPressSeen = M.t;
};

// the controlling seat moves to a mate: 'near' (the ball), or 'up' / 'down' the line
SM.switchTo = function (p, how) {
  const M = SM.M, mates = mateOf(p).filter(q => q.bin <= 0 && !isDown(q) && !q.seat);
  if (!mates.length || !p.seat) return;
  let pick = null;
  if (how === 'near') pick = mates.sort((a, c) => dist(a.x, a.y, M.ball.x, M.ball.y) - dist(c.x, c.y, M.ball.x, M.ball.y))[0];
  else {
    const cand = mates.filter(q => how === 'up' ? q.y < p.y : q.y > p.y);
    pick = cand.sort((a, c) => Math.abs(a.y - p.y) - Math.abs(c.y - p.y))[0];
  }
  if (!pick) return;
  const seat = p.seat; SM.takeControl(seat, pick); p.switchCD = .25; pick.switchCD = .25;
};

// the kick: a tap is a grubber; a hold puts the meter (power 0..1) into a punt, or a drop goal in their 22
SM.kickAction = function (p, power, I, forceGrubber) {
  const M = SM.M, d = DIRS(p.side), b = M.ball;
  const oppLine = p.side === 0 ? SM.X1 : SM.X0;
  const inTwentyTwo = Math.abs(oppLine - p.x) < 225 && (p.side === 0 ? p.x > oppLine - 225 : p.x < oppLine + 225);
  if (!forceGrubber && power > .75 && inTwentyTwo) {
    // a drop goal: the ball is kicked at the posts; the outcome comes from the meter
    M.conv = { side: p.side, x: p.x, y: p.y, kind: 'drop', kicker: p };
    SM.startConversion('drop'); M.conv.kicker = p; M.conv.decided = false;
    return;
  }
  const ax = I.mx || 0, ay = I.my || 0;
  if (forceGrubber || power < .2) {
    const tx = p.x + d * (140 + SM.R() * 60), ty = p.y + ay * 60;
    SM.kickFlight(p.x, p.y, tx, SM.clamp(ty, SM.Y0 - 30, SM.Y1 + 30), 14, 'grubber', p);
  } else {
    const dd = lerp120(power) * (.75 + .03 * p.stats.KCK);
    const tx = p.x + d * dd, ty = p.y + ay * dd * .4;
    const apex = 60 + power * 50;
    SM.kickFlight(p.x, p.y, tx, ty, apex, 'punt', p);
  }
  SM.event('kick', { side: p.side, name: p.nick });
  b.lastTouch = p.side;
  p.cool = .3;
};
const lerp120 = t => 120 + (TUNE('kickMax') - 120) * t;

// the AI kick, for a CPU carrier: no meter, a punt or a grubber
SM.aiKick = function (p, kind) {
  const d = DIRS(p.side);
  if (kind === 'grubber') SM.kickFlight(p.x, p.y, p.x + d * 170, SM.clamp(p.y + (SM.R() - .5) * 60, SM.Y0, SM.Y1), 14, 'grubber', p);
  else if (SM.R() < .3) {   // a kick for the line: into touch, a lineout for the other side
    const edge = p.y < SM.CY ? SM.Y0 - 6 : SM.Y1 + 6;
    SM.kickFlight(p.x, p.y, p.x + d * (150 + SM.R() * 100), edge, 60, 'punt', p);
  } else SM.kickFlight(p.x, p.y, p.x + d * (300 + SM.R() * 120), SM.clamp(p.y + (SM.R() - .5) * 60, SM.Y0 + 14, SM.Y1 - 14), 80, 'punt', p);
  SM.M.stats[p.side].kicks++; p.cool = .3; SM.event('kick', { side: p.side, name: p.nick });
};

// the super: Thunder Run with the ball for superTime seconds, unstoppable
SM.superRun = function (p) {
  const M = SM.M;
  M.hype[p.side] = 0; M.superT[p.side] = TUNE('superTime'); M.superRun = true;
  p.onFire = p.onFire || false; SM.event('super', { kind: 'thunder', side: p.side, name: p.nick });
};
SM.hurricane = function (p) {
  const M = SM.M, c = M.ball.owner;
  if (!c || c.side === p.side) return;
  M.hype[p.side] = 0; M.superT[p.side] = 2;
  p.homeT = 2; SM.event('super', { kind: 'hurricane', side: p.side, name: p.nick });
};

// a tackle: the nearest enemy in reach, in front; a big hit (charged) launches a carrier, a cheap shot is seen or not
SM.tackle = function (p, big, charge) {
  const M = SM.M, range = big ? TUNE('tackleRange') + 4 : TUNE('tackleRange');
  const d = DIRS(p.side);
  const cands = enemiesOf(p).filter(q => dist(p.x, p.y, q.x, q.y) <= range + 4 && !isDown(q)).sort((a, c) => dist(p.x, p.y, a.x, a.y) - dist(p.x, p.y, c.x, c.y));
  const front = cands.filter(q => Math.abs(ANG(p.facing, Math.atan2(q.y - p.y, q.x - p.x))) < 1.25 || dist(p.x, p.y, q.x, q.y) < 6);
  const target = front.find(q => q === M.ball.owner) || front[0] || null;
  if (!target) { p.cool = .25; return; }
  p.cool = .45;
  const carrier = M.ball.owner === target;
  if (!carrier) {
    // a cheap shot on a player without the ball: he goes down for a while, and the referee may see it
    target.stunT = 1.6; target.st = 'stun'; target.stT = 1.6; target.vx = Math.cos(p.facing) * 60; target.vy = Math.sin(p.facing) * 60; target.z = 0; target.vz = 0;
    M.stats[p.side].tackles++;
    if (SM.foul('cheap', p, target.x, target.y, true) === false) { M.hype[p.side] = Math.min(100, M.hype[p.side] + 8 * TUNE('hypeMult')); SM.event('unseenCheap', { name: p.nick, side: p.side }); }
    return;
  }
  if (target.evadeT > 0) {                                  // a sidestep beats him
    p.stunT = .5; M.hype[target.side] = Math.min(100, M.hype[target.side] + 6 * TUNE('hypeMult'));
    SM.event('beaten', { name: target.nick, side: target.side }); return;
  }
  if (target.fendT > 0 && !M.superRun && SM.R() < TUNE('fendBeat') * (1 + .03 * (target.stats.POW - p.stats.TKL)) && !big) {
    target.vx += d * 40; target.vy += Math.sin(target.facing) * 10; p.stunT = .8;
    M.hype[target.side] = Math.min(100, M.hype[target.side] + 6 * TUNE('hypeMult'));
    SM.event('fended', { name: target.nick, side: target.side }); return;
  }
  // the chance: TKL against POW, a shot from the side or behind helps, a turbo carrier slips, a super is unstoppable
  let chance = TUNE('tackleBase') * (.9 + .02 * p.stats.TKL - .02 * target.stats.POW);
  if (Math.abs(ANG(target.facing, Math.atan2(p.y - target.y, p.x - target.x))) > 1.6) chance += .1;
  if (target.turbo < TUNE('turboTank') && (target.turbo > 0)) chance -= .05;
  if (target.onFire) chance *= .6;
  if (big) chance += .2 * charge;
  if (M.superRun && M.ball.owner === target && target.side !== p.side) chance = 0;
  if (p.homeT > 0) chance = 1;
  if (big && charge >= 1.2 && Math.abs(ANG(p.facing, Math.atan2(target.y - p.y, target.x - p.x))) < .5) {
    SM.foul('high', p, p.x, p.y, true);
  }
  if (SM.R() < chance) {
    M.stats[p.side].tackles++;
    let spilled = false;
    if (big) {
      const launch = Math.atan2(target.y - p.y, target.x - p.x);
      target.vx = Math.cos(launch) * 120 * TUNE('bigHitLaunch'); target.vy = Math.sin(launch) * 120; target.vz = 150 + charge * 60;
      target.z = 0; target.st = 'tackled'; target.stT = .9;
      M.stats[p.side].bigHits++; M.hype[p.side] = Math.min(100, M.hype[p.side] + 10 * TUNE('hypeMult'));
      // the metres the carrier flies: his launch speed times the time in the air, in metres (units / 10.24)
      p.hitM = Math.max(p.hitM || 0, Math.hypot(target.vx, target.vy) * (2 * target.vz / G) / 10.24);
      if (charge >= 1.0) {
        M.stats[p.side].monster++; M.hype[p.side] = Math.min(100, M.hype[p.side] + 6 * TUNE('hypeMult'));
        SM.event('monsterHit', { name: target.nick, side: p.side, x: target.x, y: target.y });
        if (SM.R() < TUNE('spillChance', .5)) { SM.dropBall(target, 1); spilled = true; }
      } else SM.event('bigHit', { name: target.nick, side: p.side, x: target.x, y: target.y });
    } else {
      target.st = 'tackled'; target.stT = .7; target.vx *= .2; target.vy *= .2;
      M.hype[p.side] = Math.min(100, M.hype[p.side] + 4 * TUNE('hypeMult'));
      SM.event('tackle', { name: p.nick, side: p.side });
    }
    // the breakdown: the ball is on the ground at the carrier's spot, and a ruck forms; a monster hit that spilled
    // the ball leaves it loose instead
    if (!spilled) { if (M.ball.owner === target) M.ball.owner = null; SM.startRuck(target.x, target.y, target.side); }
  } else {
    // a broken tackle: the carrier carries on, the tackler sits down for a moment
    p.st = 'stun'; p.stT = .6; p.stunT = .6; p.vx = p.vy = 0;
    M.hype[target.side] = Math.min(100, M.hype[target.side] + 5 * TUNE('hypeMult'));
    M.stats[p.side].missed++;
    SM.event('brokenTackle', { name: target.nick, side: target.side });
  }
};

// the ball: its flight (kicks and passes), the catches and interceptions, the bounce, the pick-up, the out-of-play
SM.ballStep = function (dt) {
  const M = SM.M, b = M.ball;
  if (b.state === 'held' || b.owner) {
    const o = b.owner;
    if (o) { b.x = o.x + Math.cos(o.facing) * 7; b.y = o.y + Math.sin(o.facing) * 7; b.z = 8; b.vx = o.vx; b.vy = o.vy; b.vz = 0; b.lastTouch = o.side; b.roll += Math.hypot(o.vx, o.vy) * dt; }
    SM.tryCheck(); return;
  }
  // the wind: airborne balls drift across the field in a gust (the Docks)
  if (b.state === 'air' || b.state === 'pass') {
    if (M.venue.id === 'docks' && b.state === 'air') { b.vx += Math.cos(M.windDir) * 40 * M.wind * TUNE('windMult') * dt; b.vy += Math.sin(M.windDir) * 40 * M.wind * TUNE('windMult') * dt; }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.state === 'pass') {
      // the catch: the receiver's reach at the pass's height; a defender may intercept it
      const recv = b.receiver, passer = b.passer;
      // each player gets one roll per pass: the receiver's catch, or an enemy's interception
      b.rolled = b.rolled || {};
      for (const q of M.players) {
        if (q === passer || q.bin > 0 || isDown(q) || q.stunT > 0 || b.rolled[q.i]) continue;
        if (dist(q.x, q.y, b.x, b.y) > 10) continue;
        b.rolled[q.i] = true;
        if (q.side === passer.side && q === recv) {
          let pc = TUNE('catchBase') * (.9 + .01 * q.stats.HND);
          if (enemiesOf(q).some(e => dist(e.x, e.y, q.x, q.y) < 20)) pc -= TUNE('pressurePenalty');
          if (passer.onFire) pc = 1;
          if (SM.R() < pc) { SM.catchBall(q); return; }
          b.state = 'loose'; b.droppedBy = q; b.lastTouch = passer.side; b.vz = 0; b.z = 8; b.vx *= .4; b.vy *= .4; b.bounces = 0;
          // a pass dropped forward is a knock-on: a scrum to the other side
          if ((b.x - passer.x) * DIRS(passer.side) > 2) { SM.event('knockOn', { side: passer.side, name: q.nick }); return SM.startScrum(b.x, b.y, 1 - passer.side); }
          return;
        }
        if (q.side !== passer.side && b.z < 14 && SM.R() < .15 * TUNE('interceptMult')) { SM.event('intercept', { name: q.nick, side: q.side }); M.hype[q.side] = Math.min(100, M.hype[q.side] + 12 * TUNE('hypeMult')); M.stats[q.side].turnovers++; return SM.catchBall(q); }
      }
      if (dist(b.x, b.y, recv.x, recv.y) > 60 || Math.hypot(b.vx, b.vy) < 1) { b.state = 'loose'; b.z = 6; b.vz = 0; b.bounces = 0; }
      return;
    }
    // a kick in the air: gravity, the landing, a bounce or a roll. A high ball can be caught.
    b.vz -= G * dt; b.z += b.vz * dt;
    if (b.kind === 'punt' || b.kind === 'kick') {
      for (const q of M.players) {
        if (q.bin > 0 || isDown(q) || q.stunT > 0) continue;
        if (b.z > 8 && dist(q.x, q.y, b.x, b.y) < 12 && b.vz < 0 && b.passer !== q) {
          if (q.side !== (b.passer ? b.passer.side : -1) && SM.R() < .15 * TUNE('interceptMult', 1)) { SM.event('intercept', { name: q.nick, side: q.side }); M.hype[q.side] = Math.min(100, M.hype[q.side] + 12 * TUNE('hypeMult')); return SM.catchBall(q); }
          if (q.side === (b.passer ? b.passer.side : -1) && SM.R() < .9 * (.9 + .01 * q.stats.HND)) { SM.event('kickCaught', { name: q.nick, side: q.side }); return SM.catchBall(q); }
        }
      }
    }
    if (b.z <= 0 && b.vz < 0) {
      b.z = 0;
      if (Math.abs(b.vz) > 60 && b.bounces < 3) {
        b.vz = -b.vz * .45; b.bounces++;
        const ang = (SM.R() * 2 - 1) * Math.PI * .4 * TUNE('bounceChaos');
        const c = Math.cos(ang), s = Math.sin(ang), vx = b.vx * c - b.vy * s, vy = b.vx * s + b.vy * c;
        b.vx = vx * .7; b.vy = vy * .7; SM.event('bounce', {});
      } else { b.vz = 0; b.state = 'loose'; }
    }
    if (b.state === 'air' && b.z > 0 && Math.hypot(b.vx, b.vy) > 0) b.roll = (b.roll || 0) + Math.hypot(b.vx, b.vy) * dt;
    return SM.outOfPlay();
  }
  if (b.state === 'loose') {
    b.vz -= G * dt; b.z = Math.max(0, b.z + b.vz * dt);
    if (b.z <= 0) { b.z = 0; if (b.vz < -60 && b.bounces < 3) { b.vz = -b.vz * .4; b.bounces++; SM.event('bounce', {}); } else { b.vz = 0; const f = Math.exp(-dt * 1.4); b.vx *= f; b.vy *= f; } }
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.roll = (b.roll || 0) + Math.hypot(b.vx, b.vy) * dt;
    // the pick-up: the nearest player whose reach covers the ball, on the ground, at a sensible speed
    const sp = Math.hypot(b.vx, b.vy);
    let best = null, bd = 1e9;
    for (const q of M.players) { if (q.bin > 0 || isDown(q) || q.stunT > 0 || q.cool > .2) continue; const dq = dist(q.x, q.y, b.x, b.y); if (dq < bd && dq < (sp > 210 ? 4.5 : 9) && b.z < 9) { bd = dq; best = q; } }
    if (best) {
      // a fast ball fumbled by hands that are not up to it: a knock-on, a scrum
      if (sp > 210 && best.stats.HND < 8 && SM.R() < .15) { SM.event('knockOn', { side: best.side, name: best.nick }); b.state = 'placed'; b.vx = b.vy = b.vz = 0; return SM.startScrum(b.x, b.y, 1 - best.side); }
      SM.catchBall(best); return;
    }
    SM.outOfPlay(); return;
  }
  // a placed ball is still: nothing
  SM.outOfPlay();
};

// the ball is caught: the holder, the stats and the try check
SM.catchBall = function (q) {
  const M = SM.M, b = M.ball;
  if (b.passer && b.passer.side === q.side && b.kind === 'pass') { M.stats[q.side].passes += 0; }
  b.owner = q; b.state = 'held'; b.z = 8; b.lastTouch = q.side; b.kind = null; b.passer = null; b.receiver = null; b.spin = 0;
  q.cool = Math.max(q.cool, .15);
  for (const e of enemiesOf(q)) e.plan = null;
  SM.tryCheck();
};

// a try: the carrier across the try line, in the in-goal
SM.tryCheck = function () {
  const M = SM.M, o = M.ball.owner;
  if (!o || M.phase !== 'play') return;
  if ((o.side === 0 && o.x > SM.X1 + 2) || (o.side === 1 && o.x < SM.X0 - 2)) SM.tryScored(o);
};

// the touch and the dead-ball lines: a lineout to the side that did not touch it last, a 22 drop-out for a dead ball
SM.outOfPlay = function () {
  const M = SM.M, b = M.ball;
  if (M.phase !== 'play') return;
  if (b.y < SM.Y0 || b.y > SM.Y1) {
    const lt = b.lastTouch == null ? 0 : b.lastTouch;
    const x = b.x, y = b.y < SM.Y0 ? SM.Y0 + 51 : SM.Y1 - 51;
    SM.event('touch', { x, y, lastTouch: lt });
    b.state = 'placed'; b.owner = null;
    return SM.startLineout(x, y, 1 - lt);
  }
  if (b.x < SM.DL0 || b.x > SM.DL1) {
    const lt = b.lastTouch == null ? 0 : b.lastTouch;
    b.state = 'placed'; b.owner = null;
    SM.event('deadBall', {});
    return SM.dropOut(1 - lt);
  }
};

// the lineout, the scrum, the ruck and the rest of the stoppages: each its own steps
SM.lineoutStep = function (dt) {
  const M = SM.M, lo = M.lineout; lo.t += dt;
  // the pods: the human forward chooses with L1 and R1, the CPU weights its call
  for (const s of [0, 1]) {
    const human = M.seats.find(x => x.p && x.p.side === s && x.p.pos <= 2);
    if (lo.pick[s] === null && !human && lo.t > .9) lo.pick[s] = [1, 0, 2][Math.floor(SM.R() * 3)];
  }
  if (lo.t >= lo.resolveAt) {
    for (const s of [0, 1]) if (lo.pick[s] === null) lo.pick[s] = 1;
    const tw = lo.thrower, df = 1 - tw;
    let winner = tw;
    if (lo.pick[tw] === lo.pick[df]) {
      const att = .6 * SM.R() + .04 * 8 + .15, def = .6 * SM.R() + .04 * 8;
      winner = att >= def ? tw : df;
    }
    if (winner !== tw) { M.stats[df].turnovers++; M.hype[df] = Math.min(100, M.hype[df] + 8 * TUNE('hypeMult')); SM.event('lineoutSteal', { side: df }); }
    else SM.event('lineoutWon', { side: tw });
    const sh = M.players.find(q => q.side === winner && q.pos === 3 && q.bin <= 0) || M.players.find(q => q.side === winner && q.bin <= 0);
    if (sh) { sh.x = lo.x - DIRS(winner) * 8; sh.y = lo.y; M.ball.owner = sh; M.ball.state = 'held'; M.ball.x = sh.x; M.ball.y = sh.y; }
    SM.event('lineoutDone', { winner });
    M.lineout = null;
    SM.resumePlay();
  }
};
SM.scrumStep = function (dt) {
  const M = SM.M, sc = M.scrum; sc.t += dt;
  // a human forward's press: before SET it is early engagement; near SET, a timed push
  for (const seat of M.seats) {
    const q = seat.p;
    if (!q || q.pos > 2 || sc.pressedAt !== null) continue;
    if (seat.press && seat.press.press && seat.press.press.scrumPress) {
      sc.pressedAt = sc.t;
      if (sc.t < sc.setAt - .25) { sc.early = q.side; SM.event('earlyEngagement', { side: q.side }); }
      else {
        const off = Math.abs(sc.t - sc.setAt);
        sc.push[q.side] += off < .12 ? .25 : off < .25 ? .1 : 0;
      }
    }
  }
  if (sc.early !== false) {
    const side = 1 - sc.early;
    M.pen = { side, x: sc.x, y: sc.y, kind: 'free', offender: null, choice: 'tap', t: 0, wait: 0 };
    M.scrum = null; SM.setPhase('penalty'); return;
  }
  if (sc.t >= sc.resolveAt) {
    const pw = [0, 1].map(s => M.players.filter(q => q.side === s && q.pos <= 2 && q.bin <= 0).reduce((a, q) => a + q.stats.POW, 0) * .02 + sc.push[s] + SM.R() * .1);
    if (sc.feed !== undefined) pw[sc.feed] += .05;
    const winner = pw[0] >= pw[1] ? 0 : 1, margin = Math.abs(pw[0] - pw[1]);
    const d = DIRS(winner), nearLine = winner === 0 ? SM.X1 - sc.x : sc.x - SM.X0;
    M.scrum = null;
    if (margin > .85 && nearLine < 90) {
      const fw = M.players.find(q => q.side === winner && q.pos === 0 && q.bin <= 0);
      if (fw) { fw.x = sc.x; fw.y = sc.y; SM.event('pushoverTry', { side: winner }); SM.tryScored(fw); return; }
    }
    M.stats[winner].turnovers += winner === sc.feed ? 0 : 1;
    M.hype[winner] = Math.min(100, M.hype[winner] + 6 * TUNE('hypeMult'));
    const sh = M.players.find(q => q.side === winner && q.pos === 3 && q.bin <= 0) || M.players.find(q => q.side === winner && q.bin <= 0);
    if (sh) { sh.x = sc.x - d * 8; sh.y = sc.y; M.ball.owner = sh; M.ball.state = 'held'; M.ball.x = sh.x; M.ball.y = sh.y; M.ball.z = 0; M.ball.lastTouch = winner; }
    SM.event('scrumWon', { side: winner });
    SM.resumePlay();
  }
};
SM.rucks = function (dt) {
  const M = SM.M, r = M.ruck; r.t += dt;
  const d = DIRS(r.attack), within = q => dist(q.x, q.y, r.x, r.y) < 26 && !isDown(q) && q.bin <= 0;
  const att = M.players.filter(q => q.side === r.attack && within(q)), def = M.players.filter(q => q.side !== r.attack && within(q));
  // the push: each committed player adds his power per second; a human's mash and a CPU's rate count too
  const pushA = att.reduce((a, q) => a + q.stats.POW, 0), pushD = def.reduce((a, q) => a + q.stats.POW, 0);
  r.bar += (pushA - pushD) * .002 * dt;
  for (const seat of M.seats) {
    if (!seat.p || !within(seat.p) || !seat.press) continue;
    const presses = seat.press.press || {};
    if (presses.mash) r.bar += (seat.p.side === r.attack ? 1 : -1) * TUNE('mashWeight');
    if (presses.jackal && seat.p.side !== r.attack && r.t < .35 && !r.jackal) { r.bar = -.5; r.jackal = true; r.jackalAt = r.t; SM.event('jackal', { side: seat.p.side, name: seat.p.nick }); }
  }
  for (const side of [0, 1]) {
    const cpu = M.players.some(q => q.side === side && within(q) && !q.seat);
    if (cpu && !M.seats.some(s => s.p && s.p.side === side)) r.bar += (side === r.attack ? 1 : -1) * TUNE('cpuMash') * .004 * dt * (.8 + .4 * SM.R());
  }
  // the defenders' jackal: decided once, at the start of the ruck, by a CPU defender who arrives first
  if (r.jackalRoll === undefined) { r.jackalRoll = SM.R() < .12; }
  if (!r.jackal && r.jackalRoll && r.t < .35) { r.bar = -.5; r.jackal = true; SM.event('jackal', { side: 1 - r.attack, name: 'CPU' }); }
  r.bar = SM.clamp(r.bar, -1, 1);
  if (r.t >= TUNE('ruckTime')) {
    const winner = r.bar >= 0 ? r.attack : 1 - r.attack;
    if (winner !== r.attack) { M.stats[winner].turnovers++; M.hype[winner] = Math.min(100, M.hype[winner] + 8 * TUNE('hypeMult')); SM.event('turnover', { side: winner }); }
    else { M.ruckWon[r.attack]++; SM.event('ruckWon', { side: winner }); }
    const sh = M.players.find(q => q.side === winner && q.pos === 3 && q.bin <= 0 && !isDown(q)) || M.players.find(q => q.side === winner && q.bin <= 0 && !isDown(q));
    const spot = [r.x, r.y];
    M.ruck = null;
    if (sh) { sh.x = spot[0] - DIRS(winner) * 8; sh.y = spot[1]; sh.facing = winner === 0 ? 0 : Math.PI; M.ball.owner = sh; M.ball.state = 'held'; M.ball.x = sh.x; M.ball.y = sh.y; M.ball.z = 0; M.ball.lastTouch = winner; }
    SM.resumePlay();
  }
};

// the penalty: the penalised side's choice of tap, kick at goal or touch (the CPU chooses; a human presses the menu)
SM.penaltyStep = function (dt) {
  const M = SM.M, pen = M.pen; pen.t += dt;
  const wait = pen.wait || 0;
  const human = M.seats.some(s => s.p && s.p.side === pen.side);
  if (!pen.choice && pen.t >= wait && !human) {
    const postX = pen.side === 0 ? SM.POST1 : SM.POST0, dpost = Math.abs(postX - pen.x);
    const close = Math.abs(M.score[0] - M.score[1]) <= 3 || M.half === 2 && M.run > TUNE('halfLength') * .7;
    pen.choice = dpost < 330 && close ? 'kick' : Math.abs(pen.y - SM.CY) > 200 ? 'tap' : 'touch';
  }
  if (!pen.choice && human && pen.t > 25) pen.choice = 'touch';   // (a human who sits on the menu for 25 seconds is not a human any more)
  if (!pen.choice) return;
  const choice = pen.choice; M.pen = null;
  if (choice === 'kick') {
    M.conv = { side: pen.side, x: pen.x, y: pen.y, kind: 'pen' };
    return SM.startConversion('pen');
  }
  if (choice === 'touch') {
    const d = DIRS(pen.side), y = pen.y < SM.CY ? SM.Y0 : SM.Y1;
    SM.kickFlight(pen.x, pen.y, pen.x + d * 180, y, 60, 'punt', null);
    M.ball.lastTouch = pen.side;
    SM.event('kickToTouch', { side: pen.side });
    return SM.setPhase('play');
  }
  // a tap and go: the ball on the spot, the defenders step back
  const b = M.ball; b.x = pen.x; b.y = pen.y; b.z = 0; b.vx = b.vy = b.vz = 0;
  const p = M.players.filter(q => q.side === pen.side && q.bin <= 0).sort((a, c) => dist(a.x, a.y, pen.x, pen.y) - dist(c.x, c.y, pen.x, pen.y))[0];
  if (p) { b.owner = p; b.state = 'held'; }
  SM.event('tapGo', { side: pen.side });
  SM.resumePlay();
};

// the four hazards of the venues: the Docks' gusts, the Furnace's flame grates, the Megadome's lightning
SM.hazardStep = function (dt) {
  const M = SM.M, v = M.venue;
  if (v.id === 'docks') {
    // Captain Clucky, the giant chicken: he runs across the pitch every minute or so, bowling over whoever is in his way
    if (M.clucky) {
      const c = M.clucky; c.t += dt;
      const f = c.t / c.dur;
      c.x = SM.lerp(c.x0, c.x1, f); c.y = c.y0;
      for (const q of M.players) if (q.bin <= 0 && q.st !== 'stun' && dist(q.x, q.y, c.x, c.y) < 16) {
        q.stunT = 1; q.st = 'stun'; q.stT = 1; q.vx = (q.x > c.x ? 1 : -1) * 90;
        if (M.ball.owner === q) SM.dropBall(q, .3);
      }
      if (c.t >= c.dur) { M.clucky = null; M.cluckyT = 50 + SM.R() * 20; }
    } else {
      M.cluckyT = (M.cluckyT === undefined ? 45 : M.cluckyT) - (M.phase === 'play' ? dt : 0);
      if (M.cluckyT <= 0) {
        const left = SM.R() < .5, y = SM.R() < .5 ? SM.Y0 + 30 : SM.Y1 - 30;
        M.clucky = { x0: left ? SM.X0 - 40 : SM.X1 + 40, x1: left ? SM.X1 + 40 : SM.X0 - 40, y0: y, x: 0, y, t: 0, dur: 6 };
        M.clucky.x = M.clucky.x0;
        SM.event('clucky', {});
      }
    }
  }
  if (v.id === 'docks') {
    M.windT -= dt; if (M.windT <= 0) { M.windT = 15 + SM.R() * 10; M.wind = SM.R(); M.windDir = (SM.R() - .5) * Math.PI; SM.event('wind', { strength: M.wind }); }
  }
  if (v.id === 'furnace') {
    M.grateT -= dt; if (M.grateT <= 0) { M.grateT = 9 + SM.R() * 5; const g = SM.pickR(M.grates); if (g && g.state === 'cold') { g.state = 'warn'; g.t = 0; SM.event('grateWarn', {}); } }
    for (const g of M.grates) {
      if (g.state === 'cold') continue;
      g.t += dt;
      if (g.state === 'warn' && g.t >= 1) { g.state = 'burn'; g.t = 0; SM.event('grateBurn', {}); }
      else if (g.state === 'burn') {
        for (const q of M.players) if (q.bin <= 0 && dist(q.x, q.y, g.x, g.y) < 12) { q.stunT = Math.max(q.stunT, 1.2); if (q.st === 'run') { q.st = 'stun'; q.stT = 1.2; } q.toasted = 1; if (M.ball.owner === q) SM.dropBall(q, .4); }
        if (g.t >= 1.2) { g.state = 'cold'; g.t = 0; }
      }
    }
  }
  if (v.id === 'megadome') {
    M.lightningT -= dt;
    if (M.lightning) {
      M.lightning.t += dt;
      if (M.lightning.t >= 1.4 && !M.lightning.struck) {
        M.lightning.struck = true; SM.event('lightning', { x: M.lightning.x, y: M.lightning.y });
        for (const q of M.players) if (q.bin <= 0 && dist(q.x, q.y, M.lightning.x, M.lightning.y) < 36) { q.stunT = 1.5; q.st = 'stun'; q.stT = 1.5; if (M.ball.owner === q) SM.dropBall(q, .3); }
      }
      if (M.lightning.t >= 2.2) M.lightning = null;
    } else if (M.lightningT <= 0 && M.phase === 'play') {
      M.lightningT = 20 + SM.R() * 10;
      const a = SM.R() * Math.PI * 2, rr = 60 + SM.R() * 140, b = M.ball;
      M.lightning = { x: SM.clamp(b.x + Math.cos(a) * rr, SM.X0, SM.X1), y: SM.clamp(b.y + Math.sin(a) * rr, SM.Y0, SM.Y1), t: 0, struck: false };
    }
  }
};

// the power-ups the crowd throws on: a meat pie (turbo), an air horn (hype)
SM.powerupStep = function (dt) {
  const M = SM.M;
  if (M.phase !== 'play') return;
  M.powerupT -= dt;
  if (M.powerupT <= 0) {
    M.powerupT = 30 + (SM.R() - .5) * 20;
    const x = SM.lerp(SM.X0 + 60, SM.X1 - 60, SM.R()), y = SM.lerp(SM.Y0 + 40, SM.Y1 - 40, SM.R());
    M.powerups.push({ x, y, type: SM.R() < .6 ? 'pie' : 'horn', life: 15 });
    SM.event('powerupThrown', {});
  }
  for (const u of M.powerups) u.life -= dt;
  M.powerups = M.powerups.filter(u => {
    if (u.life <= 0) return false;
    const q = M.players.find(p => p.bin <= 0 && dist(p.x, p.y, u.x, u.y) < 9);
    if (!q) return true;
    if (u.type === 'pie') { q.pieT = 6; q.turbo = TUNE('turboTank'); SM.event('powerupTaken', { type: 'pie', name: q.nick }); }
    else { M.hype[q.side] = Math.min(100, M.hype[q.side] + 40 * TUNE('hypeMult')); SM.event('powerupTaken', { type: 'horn', name: q.nick }); }
    return false;
  });
};

// the CPU's brain: the stick and the buttons for a player without a seat. Decisions come every reaction time; movement
// comes every step. Presses only on a decision step, so one decision is one press.
SM.brain = function (p, dt) {
  const M = SM.M, I = emptyIntent(), d = DIRS(p.side), b = M.ball;
  p.aiT -= dt;
  const decide = p.aiT <= 0;
  if (decide) p.aiT = .15 + TUNE('aiReaction') * .5 + SM.R() * .1;
  const aggression = M.teams[p.side].aggression || .5;
  if (b.owner === p) {
    // with the ball: the line to the try (or the posts), the steering round the nearest defender, the buttons
    const goalX = p.side === 0 ? SM.X1 + 60 : SM.X0 - 60;
    const enemies = enemiesOf(p), [e, de] = nearest(p, enemies);
    const front = e && (e.x - p.x) * d > 0;
    let ty = SM.CY;
    const left = enemies.filter(q => q.y < p.y && dist(q.x, q.y, p.x, p.y) < 60).length, right = enemies.filter(q => q.y > p.y && dist(q.x, q.y, p.x, p.y) < 60).length;
    ty = p.y + (left > right ? 1 : -1) * 40;
    if (!e || de > 90) ty = SM.lerp(p.y, SM.CY, .15);
    const mx = goalX - p.x, my = ty - p.y, L = Math.hypot(mx, my) || 1;
    I.mx = mx / L; I.my = my / L; I.turbo = !e || de > 60;
    if (e && front && de < 22 && decide && SM.R() < .4 * aggression + .15) { I.press.x = true; I.evadeDir = [-Math.sin(p.facing), Math.cos(p.facing)]; }
    if (e && front && de < 16 && decide && p.stats.POW >= 6 && SM.R() < .3) I.press.sq = true;
    if (decide && e && de < 40 && SM.R() < .35) {
      const up = p.y > SM.CY;
      const rec = SM.legalReceivers(p, up).filter(q => !enemies.some(x => dist(x.x, x.y, q.x, q.y) < 18));
      if (rec.length) { if (up) I.press.passUp = true; else I.press.passDown = true; }
    }
    if (decide && (p.side === 0 ? p.x < SM.X0 + 225 : p.x > SM.X1 - 225) && e && de < 60 && SM.R() < .25) { SM.aiKick(p, 'punt'); return I; }
    if (decide && (SM.R() < .05 * aggression) && (p.x - SM.CX) * d > 200) { SM.aiKick(p, 'grubber'); return I; }
    return I;
  }
  // a CPU tackler: the nearest defender to the carrier goes in; a charge on a head-on carrier when aggressive
  const carrier = b.owner;
  if (carrier && carrier.side !== p.side && carrier.bin <= 0) {
    const dc = dist(p.x, p.y, carrier.x, carrier.y);
    const [nearD] = nearest(carrier, M.players.filter(q => q.side === p.side && q.bin <= 0 && !isDown(q)));
    if (nearD === p && !isDown(p)) {
      const mx = carrier.x - p.x, my = carrier.y - p.y, L = Math.hypot(mx, my) || 1;
      I.mx = mx / L; I.my = my / L; I.turbo = dc > 40;
      if (dc < TUNE('tackleRange') + 2 && decide && p.cool <= 0) {
        if (aggression > .6 && SM.R() < .3 + .2 * aggression) { I.xHeld = true; p.bigCharge = Math.min(2, p.bigCharge + .05); }
        else if (SM.R() < .6 + .3 * aggression) I.press.tackleTap = true;
      }
      if (p.bigHeld && (p.bigCharge >= TUNE('bigHitCharge') || dc > 20)) I.xReleased = true;
      if (p.bigHeld) { I.xHeld = true; }
      if (p.diveT <= 0 && dc < 30 && dc > 16 && decide && SM.R() < .15) I.press.sq = true;
    }
    return I;
  }
  // loose: the nearest from each side goes for it; the rest hold their shape
  if (b.state === 'loose' || b.state === 'air') {
    const near = M.players.filter(q => q.side === p.side && q.bin <= 0).sort((a, c) => dist(a.x, a.y, b.x, b.y) - dist(c.x, c.y, b.x, b.y));
    if (near[0] === p || near[1] === p) {
      const tx = b.x + b.vx * .3, ty = b.y + b.vy * .3, mx = tx - p.x, my = ty - p.y, L = Math.hypot(mx, my) || 1;
      I.mx = mx / L; I.my = my / L; I.turbo = true;
      return I;
    }
  }
  // the shape: the ball's own side runs the attack; the other side keeps its line
  const [tx, ty] = SM.shapeFor(p);
  const mx = tx - p.x, my = ty - p.y, L = Math.hypot(mx, my);
  if (L > 3) { I.mx = mx / L * Math.min(1, L / 30); I.my = my / L * Math.min(1, L / 30); }
  I.turbo = L > 80;
  if (M.ruck && dist(p.x, p.y, M.ruck.x, M.ruck.y) < 26 && decide) { if (p.side !== M.ruck.attack) I.press.jackal = SM.R() < .3; }
  return I;
};

// the human seat's intent, from the engine's input: the stick, the buttons' presses and holds
SM.readSeat = function (seat, input) {
  const it = emptyIntent(), mv = input.move();
  it.mx = mv[0]; it.my = mv[1];
  it.turbo = input.down('turbo');
  it.xHeld = input.down('x'); it.xReleased = input.released('x');
  if (input.pressed('x')) { it.press.x = true; it.press.tackleTap = true; }
  if (input.pressed('sq')) it.press.sq = true;
  if (input.pressed('ci') && !it.press.x) it.press.ci = true;
  it.kickHeld = input.down('ci'); it.kickReleased = input.released('ci');
  if (input.pressed('l1')) it.press.passUp = true;
  if (input.pressed('r1')) it.press.passDown = true;
  if (input.pressed('tri')) it.press.superPress = true;
  it.press.mash = input.pressed('x');
  it.press.scrumPress = input.pressed('x');
  it.press.jackal = input.pressed('sq');
  return it;
};

// the main step: the phases, the players, the ball, the clock. dt is one fixed step (game speed applied by the caller).
// intents: an optional function (seat) => intent for each seat; seats without one use their input
SM.step = function (dt, seatIntent) {
  const M = SM.M;
  M.t += dt; M.pt += dt;
  SM.tally(dt);
  SM.refUpdate(dt);
  for (const s of M.seats) s.press = seatIntent ? seatIntent(s) : (s.input ? SM.readSeat(s, s.input) : null);
  const I = new Map();
  for (const s of M.seats) if (s.p && s.press) I.set(s.p, Object.assign(Object.assign({}, s.press), { mx: s.press.mx, my: s.press.my }));
  if (M.phase === 'play') {
    if (!SM.CHEATS.noClock) M.run += dt;
    // a golden point with no score in two minutes is a draw (exhibition); the cup plays it out
    if (M.golden && M.run >= 120 && !M.cup) { M.over = true; M.phase = 'full'; M.pt = 0; SM.event('fulltime', { score: M.score.slice() }); return; }
    if (M.run >= M.halfLen && !M.hooter) { M.hooter = true; SM.event('hooter', {}); }
    // the sin bin counts down with the play; the rules' phases
    SM.powerupStep(dt); SM.hazardStep(dt);
    if (M.superT[0] > 0) { M.superT[0] -= dt; if (M.superT[0] <= 0) { M.superRun = false; } }
    if (M.superT[1] > 0) { M.superT[1] -= dt; }
    M.superRun = M.superT[0] > 0 || M.superT[1] > 0;
    for (const p of M.players) {
      let it = I.get(p);
      if (!it) it = SM.brain(p, dt);
      else it = Object.assign({}, it, { press: it.press });
      SM.playerStep(p, dt, it);
    }
    SM.ballStep(dt);
    SM.cheatsStep();
  } else if (M.phase === 'kickoff') {
    M.kickT -= dt;
    for (const p of M.players) if (p.bin <= 0) stoppagePlayer(p, dt);
    if (M.kickT <= 0) {
      const kicker = M.players.find(q => q.side === M.kickSide && q.pos === 4 && q.bin <= 0) || M.players.find(q => q.side === M.kickSide && q.bin <= 0);
      const d = DIRS(M.kickSide);
      M.ball.lastTouch = M.kickSide;
      SM.kickFlight(SM.CX, SM.CY, SM.CX + d * (300 + SM.R() * 80), SM.clamp(SM.CY + (SM.R() - .5) * 200, SM.Y0 + 20, SM.Y1 - 20), 42, 'kick', kicker);
      SM.event('kickoffKick', { side: M.kickSide });
      SM.setPhase('play');
    }
  } else if (M.phase === 'half') {
    M.halfT -= dt;
    for (const p of M.players) { if (p.bin <= 0) stoppagePlayer(p, dt); }
    if (M.halfT <= 0) SM.kickoff(1);
  } else if (M.phase === 'try') {
    M.tryT -= dt;
    for (const p of M.players) { if (p.cheer > 0) { p.cheer = Math.max(0, p.cheer); } if (p.bin <= 0) stoppagePlayer(p, dt); }
    if (M.tryT <= 0) SM.startConversion('conv');
  } else if (M.phase === 'conv') {
    SM.convStep(dt, I);
  } else if (M.phase === 'penalty') {
    for (const p of M.players) if (p.bin <= 0) stoppagePlayer(p, dt);
    SM.penaltyStep(dt);
  } else if (M.phase === 'scrum') {
    for (const p of M.players) { if (p.bin <= 0) stoppagePlayer(p, dt); }
    SM.scrumStep(dt);
  } else if (M.phase === 'lineout') {
    for (const p of M.players) { if (p.bin <= 0) stoppagePlayer(p, dt); }
    SM.lineoutStep(dt);
  } else if (M.phase === 'ruck') {
    for (const p of M.players) { if (p.bin <= 0) { if (p.st === 'tackled' || p.st === 'stun') SM.playerStep(p, dt, emptyIntent()); else stoppagePlayer(p, dt); } }
    SM.rucks(dt);
    SM.ballStep(dt);
  } else if (M.phase === 'full') {
    for (const p of M.players) { if (p.bin <= 0) stoppagePlayer(p, dt); }
  }
  // (the sin bin counts down in playerStep; the events are drained by the scene each step)
};

// the conversion steps: the human kicker's meter, or the CPU's roll after a short time
SM.convStep = function (dt, I) {
  const M = SM.M, c = M.conv;
  if (!c) return SM.resumePlay();
  c.t += dt;
  const k = c.kicker, human = k && k.seat;
  if (human) {
    const it = I.get(k) || {};
    if (it.kickHeld || (k.seat.press && k.seat.press.kickHeld)) {
      c.meter = Math.min(1, c.meter + dt * .9);
      c.aim = SM.clamp(c.aim + (it.mx || 0) * dt * 1.2, -1, 1);
    }
    if (k.seat.press && k.seat.press.kickReleased) return SM.decideKick(c.meter, c.aim);
  }
  if (!human && c.t >= 1.5) return SM.decideKick(null, 0);
  if (c.t >= 14) return SM.decideKick(human ? c.meter : null, c.aim || 0);
};
SM.cheatsStep = function () {
  const M = SM.M;
  if (SM.CHEATS.alwaysHype) M.hype = [100, 100];
  if (SM.CHEATS.alwaysOnFire) for (const q of M.players) if (q.side === 0) q.onFire = true;
};
