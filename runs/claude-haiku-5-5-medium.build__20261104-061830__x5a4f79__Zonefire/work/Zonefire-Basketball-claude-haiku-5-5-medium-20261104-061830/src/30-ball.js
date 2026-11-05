/* ---- THE BALL (plan §6.6): one custom point body in world units. States: 'held' and 'dribble' (its owner's hands), 'pass'
 * and 'shot' (flying), 'loose' (free physics), 'dead' (scripted), 'inbound'. Gravity, a floor bounce, the arena's walls, the
 * two glass planes, the rim (a torus) and the basket test are here; a shot's outcome is decided at release (match.js
 * and actions.js) and only then flown, so the made rate is the decided rate. Near a rim the ball takes 4 substeps. ---- */
const RIMW = [{ x: OX + RIM[0].x, y: OY + RIM[0].y, z: RIM[0].z, side: 0 }, { x: OX + RIM[1].x, y: OY + RIM[1].y, z: RIM[1].z, side: 1 }];
const BOARD_PLANE = [OX + BOARD_X[0], OX + BOARD_X[1]];
const BOARD_YR = [OY + BOARD_Y[0], OY + BOARD_Y[1]], BOARD_ZR = BOARD_Z;
const newBall = () => ({
  x: OX + MIDX, y: OY + MIDY, z: BALL_R, vx: 0, vy: 0, vz: 0, state: 'dead', owner: null, spin: 0, roll: 0,
  scored: [false, false], shot: null, trail: [], bounces: 0, rimHit: 0, boardHit: 0, lastTouch: null, onFloor: true, inNet: 0
});
const ballWind = () => (S.twist.wind || 0) * tune('windStrength');   // S.twist.wind is -1..1; the ball's push is that times windStrength

/** the ball at rest at (x, y), dead: a centre jump, a scripted moment */
const ballPlace = (b, x, y, z = BALL_R) => Object.assign(b, { x, y, z, vx: 0, vy: 0, vz: 0, state: 'dead', owner: null, spin: 0, shot: null, onFloor: z <= BALL_R + .01 });

/** one physics substep of h seconds: gravity, the floor, the walls, the glass, the rim, the basket */
const ballSubstep = (b, h, rimBounce, boardBounce, ballBounce) => {
  const g = tune('ballGravity') * (S.cheats && S.cheats.moonGravity ? .55 : 1), R = BALL_R;
  const pz = b.z, px = b.x;
  b.vz -= g * h;
  b.x += b.vx * h; b.y += b.vy * h; b.z += b.vz * h;
  // the floor
  if (b.z < R) {
    b.z = R;
    if (b.vz < 0) {
      const impact = -b.vz;
      b.vz = -b.vz * ballBounce; b.bounces++;
      b.vx *= .985; b.vy *= .985;
      if (impact > 40) emit('bounce', { x: b.x, y: b.y, z: b.z, speed: impact, ball: true });
      if (b.vz < 16) { b.vz = 0; b.onFloor = true; }
    }
    if (b.vz === 0) { const f = Math.exp(-h * 1.6); b.vx *= f; b.vy *= f; }
  }
  // the invisible walls, 24 outside the lines
  if (b.x < PLAY_X[0] + R) { b.x = PLAY_X[0] + R; b.vx = Math.abs(b.vx) * .5; emit('wall', { x: b.x, y: b.y, z: b.z }); }
  if (b.x > PLAY_X[1] - R) { b.x = PLAY_X[1] - R; b.vx = -Math.abs(b.vx) * .5; emit('wall', { x: b.x, y: b.y, z: b.z }); }
  if (b.y < PLAY_Y[0] + R) { b.y = PLAY_Y[0] + R; b.vy = Math.abs(b.vy) * .5; emit('wall', { x: b.x, y: b.y, z: b.z }); }
  if (b.y > PLAY_Y[1] - R) { b.y = PLAY_Y[1] - R; b.vy = -Math.abs(b.vy) * .5; emit('wall', { x: b.x, y: b.y, z: b.z }); }
  // the glass: the plane seen from the court side; a board is hit from its court side only
  for (const s of [0, 1]) {
    const pl = BOARD_PLANE[s], inY = b.y > BOARD_YR[0] - R && b.y < BOARD_YR[1] + R, inZ = b.z > BOARD_ZR[0] - R && b.z < BOARD_ZR[1] + R;
    if (!inY || !inZ) continue;
    if (s === 0 && px >= pl + R && b.x < pl + R) { b.x = pl + R; b.vx = Math.abs(b.vx) * boardBounce; b.boardHit = S.seq; emit('backboard', { x: pl, y: b.y, z: b.z, side: s, speed: Math.abs(b.vx) }); }
    if (s === 1 && px <= pl - R && b.x > pl - R) { b.x = pl - R; b.vx = -Math.abs(b.vx) * boardBounce; b.boardHit = S.seq; emit('backboard', { x: pl, y: b.y, z: b.z, side: s, speed: Math.abs(b.vx) }); }
  }
  // the rims: a torus, ring radius 9, tube 1.2, at z 80
  for (const rm of RIMW) {
    let dx = b.x - rm.x, dy = b.y - rm.y, L = Math.hypot(dx, dy);
    if (L < 1e-4) { dx = 1; dy = 0; L = 1; }   // dead over the centre: any point of the ring is as near (and the ball falls through)
    const qx = rm.x + dx / L * RIM_R, qy = rm.y + dy / L * RIM_R, qz = rm.z;
    let ux = b.x - qx, uy = b.y - qy, uz = b.z - qz; const D = Math.hypot(ux, uy, uz);
    if (D < R + RIM_TUBE && D > 1e-6) {
      ux /= D; uy /= D; uz /= D;
      const reach = R + RIM_TUBE;
      // a made shot (aimed through the hoop) is rattled in, not thrown out: its horizontal pull toward the centre wins
      const d2 = Math.hypot(b.x - rm.x, b.y - rm.y);
      const pull = b.shot && b.shot.made && d2 < RIM_R + 3 && b.vz < 0;
      b.x = qx + ux * reach; b.y = qy + uy * reach; b.z = qz + uz * reach;
      const vn = b.vx * ux + b.vy * uy + b.vz * uz;
      if (vn < 0) {
        const k = 1 + (pull ? .12 : tune('rimBounce'));
        b.vx -= k * vn * ux; b.vy -= k * vn * uy; b.vz -= k * vn * uz;
        if (pull) { b.vx += -(b.x - rm.x) * 1.2; b.vy += -(b.y - rm.y) * 1.2; }   // the rattle: the hoop's middle reaches for it
        b.rimHit = S.seq; emit('rim', { x: b.x, y: b.y, z: b.z, speed: -vn, rim: rm.side });
      }
    }
    // the basket: the centre crosses z 80 downward within 6.75 of the rim; once per pass (the flag holds until it is below 60)
    const dd = Math.hypot(b.x - rm.x, b.y - rm.y);
    if (!b.scored[rm.side] && pz > rm.z && b.z <= rm.z && b.vz < 0 && dd < 6.75) { b.scored[rm.side] = true; emit('goal', { rim: rm.side, x: b.x, y: b.y, z: b.z, ball: b }); }
    if (b.scored[rm.side] && b.z < 60) b.scored[rm.side] = false;
    // the net: a slower fall through it
    if (b.z < rm.z && b.z > 66 && dd < 6) { b.vz *= Math.exp(-h * 3.2); b.inNet = 1; } else if (b.z > 66 && dd > 6) { b.inNet = 0; }
  }
};

/** one step of the ball: attached to its owner (the owner's hands place it), or flying with substeps near the rims */
const ballStep = (b, dt) => {
  if (b.state === 'held' || b.state === 'dribble') { b.roll += Math.hypot(b.vx, b.vy) * dt; return; }
  if (b.state === 'dead' || b.state === 'inbound') { b.vx = b.vy = b.vz = 0; return; }
  const near = RIMW.some(rm => Math.hypot(b.x - rm.x, b.y - rm.y) < 40 && Math.abs(b.z - rm.z) < 40);
  const n = near ? 4 : 1, h = dt / n;
  const sx = b.x, sy = b.y, hit0 = [b.rimHit, b.boardHit, b.bounces];
  const wind = ballWind();
  if (b.shot) b.shot.age += dt;
  for (let i = 0; i < n; i++) {
    if (wind && b.z > BALL_R + 1) b.vx += wind * h;
    if (b.spin && Math.hypot(b.vx, b.vy) > 20) { const sp = Math.hypot(b.vx, b.vy), k = b.spin * h; b.vx += -b.vy / sp * k * sp; b.vy += b.vx / sp * k * sp; b.spin *= Math.exp(-h * 1.4); }
    ballSubstep(b, h, tune('rimBounce'), tune('boardBounce'), tune('ballBounce'));
  }
  b.roll += Math.hypot(b.x - sx, b.y - sy);
  b.trail.push([b.x, b.y, b.z]); if (b.trail.length > 8) b.trail.shift();
  // a missed shot that touches the ring, the glass or the floor is loose now; a made one stays a shot until it goes in
  // a shot is resolved on the floor, or on the ring or glass when it was a miss; a shot still in the air after 5 s is
  // resolved too (a flight that never counts must not hold the quarter open)
  const missHit = !b.shot || !b.shot.made ? (b.rimHit !== hit0[0] || b.boardHit !== hit0[1]) : false;
  if (b.state === 'shot' && b.shot && (missHit || b.bounces !== hit0[2] || b.shot.age > 5)) {
    b.state = 'loose'; b.shot.resolved = true; if (S.match && S.match.shotsInFlight > 0) S.match.shotsInFlight--;
  }
};

/** a shot's flight: solved so the ball reaches the target (x, y, z) with the wind's push, at apex height above the release */
const ballFlight = (from, to, apex) => {
  const g = tune('ballGravity'), wind = ballWind();
  const arc = E.arc(from, to, g, { apex });
  const t = arc.t || .6;
  return { vx: (to.x - from.x - .5 * wind * t * t) / t, vy: (to.y - from.y) / t, vz: arc.vz, t };
};

/** let the ball go: from, with velocity (vx, vy, vz), tagged as a shot record (or null for a pass) */
const ballRelease = (b, from, v, state, rec) => {
  Object.assign(b, { x: from.x, y: from.y, z: from.z, vx: v.vx, vy: v.vy, vz: v.vz, state, owner: null, spin: 0, shot: rec || null, onFloor: false, bounces: 0 });
  b.scored = [false, false]; b.trail.length = 0;
  return b;
};

/** a ball that touches nothing for a while after a loose state is 'dead' again (the match takes it) */
const ballSettled = b => Math.hypot(b.vx, b.vy) < 6 && b.z <= BALL_R + .5 && (b.state === 'loose' || b.state === 'pass');
