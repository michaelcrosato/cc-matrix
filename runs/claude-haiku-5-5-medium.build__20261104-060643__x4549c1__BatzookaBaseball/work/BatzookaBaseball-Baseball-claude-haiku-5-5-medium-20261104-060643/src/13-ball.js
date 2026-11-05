// The batted ball: a point with a height, under gravity, that bounces, rolls, hits the wall or clears it. Pure: step it
// with a fixed dt. The scene reads its flags; fielders and the rules decide what they mean.
// Phases: 'air' (flying or bouncing), 'roll' (on the ground, slowing), 'dead' (stopped, or gone: foul, out of play).
BZ.launchBall = ({ exit, launch, spray, from = { x: BZ.HX, y: BZ.HY - 10 }, batzooka = false }) => {
  const L = launch * Math.PI / 180, S = spray * Math.PI / 180;
  const vh = exit * Math.cos(L);
  return {
    x: from.x, y: from.y, z: 4,
    vx: vh * Math.sin(S), vy: -vh * Math.cos(S), vz: exit * Math.sin(L),
    t: 0, phase: 'air',
    landed: false, landX: null, landY: null, landDist: 0, fair: null,   // the first touch of the ground
    homer: false, crossDist: 0, wall: false,                             // over or off the fence
    stopDist: 0, stopped: false, caught: false, batzooka, exit, launch, spray
  };
};

// Where a ball in the air will be when it comes down to a height (0: the ground): the point a fielder should reach.
BZ.predictLanding = (b, height = 0) => {
  const g = BZ.TUNE.gravity;
  const disc = b.vz * b.vz + 2 * g * Math.max(0, b.z - height);
  const t = Math.max(0, (b.vz + Math.sqrt(disc)) / g);
  return { x: b.x + b.vx * t, y: b.y + b.vy * t, t };
};

// How fast a rolling ball slows (U/s per second): the grass and the dirt take the speed off it.
BZ.ROLL_DECEL = 320;

// One step of dt seconds.
BZ.stepBall = (b, dt) => {
  if (b.phase === 'dead' || b.caught) return;
  b.t += dt;
  const g = BZ.TUNE.gravity;
  if (b.z > 0 || b.vz !== 0) b.vz -= g * dt;
  b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
  const r = Math.hypot(b.x - BZ.HX, b.y - BZ.HY), th = BZ.thetaOf(b.x, b.y);

  // The fence, in fair territory: over it is a home run, into it is a bounce back toward the field.
  if (Math.abs(th) <= 45 && r >= BZ.fenceAt(th)) {
    if (b.z > BZ.FENCE_H) {
      if (!b.homer) { b.homer = true; b.crossDist = r / BZ.FT; }
    } else if (b.vx || b.vy) {
      const nx = (b.x - BZ.HX) / r, ny = (b.y - BZ.HY) / r, vn = b.vx * nx + b.vy * ny;
      if (vn > 0) { b.vx -= 1.4 * vn * nx; b.vy -= 1.4 * vn * ny; b.wall = true; }
      const F = BZ.fenceAt(th);
      b.x = BZ.HX + nx * (F - 3); b.y = BZ.HY + ny * (F - 3);
      b.vx *= .4; b.vy *= .4;
    }
  }

  if (b.z <= 0) {
    b.z = 0;
    if (b.vz < 0) {
      if (!b.landed) {
        b.landed = true; b.landX = b.x; b.landY = b.y;
        b.landDist = r / BZ.FT; b.fair = Math.abs(th) <= 45;
      }
      if (-b.vz > 40) { b.vz = -b.vz * BZ.TUNE.bounce; b.vx *= .82; b.vy *= .82; }
      else { b.vz = 0; if (b.phase === 'air') b.phase = 'roll'; }
    }
    if (b.phase === 'roll') {
      const sp = Math.hypot(b.vx, b.vy), ns = Math.max(0, sp - BZ.ROLL_DECEL * dt);
      const k = sp > 0 ? ns / sp : 0;
      b.vx *= k; b.vy *= k;
      if (ns < 8) { b.phase = 'dead'; b.stopped = true; b.stopDist = r / BZ.FT; }
    }
  }
  if (b.phase === 'air' && b.z === 0 && b.vz === 0) b.phase = 'roll';
  if (!b.stopped && (r > 2400 || b.t > 16)) { b.phase = 'dead'; b.stopped = true; b.stopDist = r / BZ.FT; }
};

// What the ball is, once it is over: 'foul' (it landed foul), 'hr' (over the wall in fair ground), or the hit by how far
// it rolled: a wall-bounce is a double; otherwise single, double or triple by its stopping distance.
BZ.ballResult = b => {
  if (!b.landed) return 'air';
  if (!b.fair) return 'foul';
  if (b.homer) return 'hr';
  if (b.wall) return 'double';
  const d = b.stopDist || b.landDist;
  return d <= 200 ? 'single' : d <= 290 ? 'double' : 'triple';
};
