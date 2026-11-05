/* 30-ball: the ball. States: 'held' (its owner's hands or dribble), 'pass' (flying a planned path to a receiver),
 * 'shot' (flying with its shot record: decided outcome, points, shooter), 'loose' (free physics), 'dead' (after a score
 * and in breaks: physics, nobody may take it), 'dunk' (riding a dunker's hands). Physics: gravity, wind, the floor, the
 * rim (a torus: tube 1.2 round a ring of radius 9), the backboards (true planes), the walls (the crowd), the net's drag;
 * substeps near the rims so a fast ball never tunnels. A basket: the ball's centre crossing z 80 downward within 6.75 of
 * a rim's centre, counted once. */
function newBall() {
  return { x: CMX, y: CMY, z: BALL_R, vx: 0, vy: 0, vz: 0, state: 'dead', owner: null, shot: null, pass: null, scored: false, lastTouch: null, touchT: 0,
    spin: 0, roll: 0, trail: [], rimT: 0, gold: false, bounceN: 0, prevZ: BALL_R, noCatch: 0, sinceFloor: 0 };
}
/** take the ball: p holds it now */
function giveBall(p, why = 'catch') {
  const b = S.ball, prevTeam = S.match ? S.match.poss : -1;
  b.state = 'held'; b.owner = p; b.shot = null; b.pass = null; b.vx = b.vy = b.vz = 0; b.lastTouch = p; b.noCatch = 0; b.scored = false;
  p.dribble.ph = .9; p.hasBallT = 0;
  if (S.match) { if (prevTeam !== p.team) { S.match.poss = p.team; resetShotClock(); emit('possession', { team: p.team, slot: p.slot, why }); } }
  return p;
}
/** let go of the ball into free physics */
function looseBall(vx = 0, vy = 0, vz = 0, from = null) {
  const b = S.ball; b.state = 'loose'; b.owner = null; b.pass = null; b.vx = vx; b.vy = vy; b.vz = vz; if (from) { b.lastTouch = from; b.noCatchBy = from; b.noCatch = .3; }
}
const nearRim = b => Math.min(dist2(b.x, b.y, RIMS[0].x, RIMS[0].y), dist2(b.x, b.y, RIMS[1].x, RIMS[1].y)) < 44 && b.z > 50 && b.z < 120;
/** one step of free flight (shot, loose, dead): substepped near the rims */
function ballPhysics(dt) {
  const b = S.ball, n = nearRim(b) || Math.hypot(b.vx, b.vy, b.vz) > 500 ? 6 : 1, h = dt / n;
  for (let i = 0; i < n; i++) ballSub(b, h);
  b.roll += Math.hypot(b.vx, b.vy) * dt; b.rimT = Math.max(0, b.rimT - dt);
  b.trail.push([b.x, b.y, b.z]); if (b.trail.length > 8) b.trail.shift();
}
function ballSub(b, h) {
  const g = tune('ballGravity') * (S.cheats.moonGravity ? .55 : 1), shot = b.shot, ghost = shot && shot.made;   // a decided make flies clean (a rattle only clanks)
  if (b.z > BALL_R + .5 && TWIST.wind && TWIST.windOn && b.state !== 'dead') { b.vx += TWIST.windX * tune('windStrength') * h; b.vy += TWIST.windY * tune('windStrength') * h; }
  b.vz -= g * h; b.prevZ = b.z;
  b.x += b.vx * h; b.y += b.vy * h; b.z += b.vz * h;
  // the rims
  for (let i = 0; i < 2; i++) {
    const R = RIMS[i], dx = b.x - R.x, dy = b.y - R.y, d = Math.hypot(dx, dy);
    if (Math.abs(b.z - RIM_Z) > 8 || d > RIM_R + 7) continue;
    if (!ghost) {
      const qx = R.x + (d > .01 ? dx / d : 1) * RIM_R, qy = R.y + (d > .01 ? dy / d : 0) * RIM_R, ex = b.x - qx, ey = b.y - qy, ez = b.z - RIM_Z, ed = Math.hypot(ex, ey, ez), min = BALL_R + RIM_TUBE;
      if (ed < min && ed > .001) {
        const nx = ex / ed, ny = ey / ed, nz = ez / ed, vn = b.vx * nx + b.vy * ny + b.vz * nz;
        b.x += nx * (min - ed); b.y += ny * (min - ed); b.z += nz * (min - ed);
        if (vn < 0) { const e = 1 + tune('rimBounce'); b.vx -= e * vn * nx; b.vy -= e * vn * ny; b.vz -= e * vn * nz; b.vx *= .92; b.vy *= .92; rimContact(i, Math.abs(vn)); }
      }
    } else if (shot.rattle && !shot.rattled && b.vz < 0 && b.z < RIM_Z + 4 && b.z > RIM_Z) { shot.rattled = true; rimContact(i, 90); }   // a rattle in: the iron clanks and bends as it drops
    // a decided miss that would drop in rolls out instead (in and out)
    if (shot && !shot.made && !shot.blocked && b.vz < 0 && b.z > RIM_Z - 1 && b.z < RIM_Z + 9 && d < RIM_R - .5 && b.state !== 'dead') { const a = d > .3 ? Math.atan2(dy, dx) : Math.atan2(b.y - shot.shooter.y, b.x - shot.shooter.x) + PI; b.vx = Math.cos(a) * 95; b.vy = Math.sin(a) * 95; b.vz = Math.max(b.vz, 30); if (b.rimT <= 0) rimContact(i, 60); }
    // the net: inside the cone under the rim, it drags the ball and ripples
    if (b.z < RIM_Z && b.z > 62 && d < RIM_R - 1.5) { const k = Math.exp(-h * 9); b.vx *= k; b.vy *= k; if (b.vz < -40) b.vz = lerp(b.vz, -40, 1 - Math.exp(-h * 6)); b.x -= dx * 3 * h; b.y -= dy * 3 * h; }
    // a basket: down through the ring's plane near its centre
    if (b.prevZ >= RIM_Z && b.z < RIM_Z && d < 6.75 && !b.scored && b.state !== 'dead') { b.scored = true; onBasket(i); }
  }
  if (b.scored && b.z < 58) b.scored = false;
  // the backboards: true planes facing the court
  for (let i = 0; i < 2; i++) {
    const X = BOARD_X[i], s = RIMS[i].side, face = X - s * BALL_R;   // left board faces +x
    if (ghost || b.y < BOARD_Y[0] - 2 || b.y > BOARD_Y[1] + 2 || b.z < BOARD_Z[0] - 3 || b.z > BOARD_Z[1] + 3 || !ARENA.hoops[i] || !ARENA.hoops[i].glass) continue;
    if (s < 0 ? (b.x < face && b.x > X - 6) : (b.x > face && b.x < X + 6)) { b.x = face; if (s < 0 ? b.vx < 0 : b.vx > 0) { b.vx = -b.vx * tune('boardBounce'); b.vy *= .9; boardContact(i, Math.abs(b.vx)); } }
  }
  // the floor
  if (b.z < BALL_R) {
    b.z = BALL_R;
    if (b.vz < -30) { b.vz = -b.vz * tune('ballBounce'); b.vx *= .9; b.vy *= .9; b.bounceN++; if (b.vz > 40) sfx(ARENA.court ? ARENA.court.dribble : 'dribble_maple', { vol: clamp(b.vz / 300, .15, .7) }); floorContact(); }
    else { b.vz = 0; const k = Math.exp(-h * 2.2); b.vx *= k; b.vy *= k; }
  }
  // the walls (the crowd throws it back)
  if (b.x < WALL.x0) { b.x = WALL.x0; b.vx = Math.abs(b.vx) * .5; } if (b.x > WALL.x1) { b.x = WALL.x1; b.vx = -Math.abs(b.vx) * .5; }
  if (b.y < WALL.y0) { b.y = WALL.y0; b.vy = Math.abs(b.vy) * .5; } if (b.y > WALL.y1) { b.y = WALL.y1; b.vy = -Math.abs(b.vy) * .5; }
  if (b.z > 400) { b.z = 400; b.vz = -Math.abs(b.vz) * .3; }
}
function rimContact(i, v) {
  const b = S.ball; if (b.rimT > 0) return; b.rimT = .08;
  hoopHit(i, clamp(v / 200, .2, 1.2)); sfx('rim', { vol: clamp(v / 260, .2, .8) });
  if (b.shot) { b.shot.rimmed = true; if (!b.shot.made && b.state === 'shot') resetShotClock(); }
  if (b.state === 'shot' && !(b.shot && b.shot.made)) { b.state = 'loose'; b.lastTouch = b.shot ? b.shot.shooter : b.lastTouch; }
  P.sparks(b.x, b.y, b.z, 3, 0, { color: '#ff9a3a' });
  emit('rim', { rim: i, v });
}
function boardContact(i, v) {
  const b = S.ball; sfx('backboard', { vol: clamp(v / 300, .2, .8) }); if (b.shot) b.shot.boarded = true;
  if (b.state === 'shot' && !(b.shot && b.shot.made)) { b.state = 'loose'; resetShotClock(); }
  hoopHit(i, .3); emit('backboard', { rim: i });
}
function floorContact() {
  const b = S.ball;
  if (b.state === 'shot') { const sh = b.shot; b.state = 'loose'; if (sh && !sh.rimmed && !sh.boarded && !sh.made && !sh.blocked) { sh.airball = true; emit('airball', { slot: sh.shooter.slot, name: sh.shooter.def.name }); } }
}
/** the ball's world position while held: the anim system writes the hand anchor (ballAt) each step */
function ballHeldStep(dt) {
  const b = S.ball, p = b.owner; if (!p) return;
  const at = p.ballAt; if (at) { b.vx = (at[0] - b.x) / Math.max(dt, 1e-4); b.vy = (at[1] - b.y) / Math.max(dt, 1e-4); b.vz = (at[2] - b.z) / Math.max(dt, 1e-4); b.x = at[0]; b.y = at[1]; b.z = at[2]; }
  b.roll += Math.hypot(p.vx, p.vy) * dt;
  b.trail.push([b.x, b.y, b.z]); if (b.trail.length > 8) b.trail.shift();
}
/** a planned pass: a path from A to the receiver over T seconds, its height by kind ('chest', 'bounce', 'lob', 'oop') */
function passStep(dt) {
  const b = S.ball, ps = b.pass; ps.t += dt;
  const u = clamp(ps.t / ps.T, 0, 1.6), x = ps.ax + (ps.bx - ps.ax) * u, y = ps.ay + (ps.by - ps.ay) * u;
  let z;
  if (ps.kind === 'bounce') z = u < .55 ? lerp(ps.az, BALL_R, (u / .55) ** 1.3) : lerp(BALL_R, ps.bz, ((u - .55) / .45) ** .8);
  else { const lin = lerp(ps.az, ps.bz, u); z = lin + ps.arc * 4 * u * (1 - u); }
  if (ps.kind === 'bounce' && u >= .55 && !ps.bounced) { ps.bounced = true; sfx(ARENA.court.dribble, { vol: .3 }); }
  b.vx = (x - b.x) / dt; b.vy = (y - b.y) / dt; b.vz = (z - b.z) / dt; b.x = x; b.y = y; b.z = Math.max(BALL_R, z);
  b.trail.push([b.x, b.y, b.z]); if (b.trail.length > 8) b.trail.shift();
  if (u >= 1.6) { b.state = 'loose'; b.pass = null; }   // nobody caught it: it flies on, free
}
