/* ---------- the ball: physics and a predictor that uses the very same step ---------- */
function newBall() {
  return { x: CX, y: BY - 8, z: 34, vx: 0, vy: 0, vz: 0, phase: 'held', pitched: false, bounces: 0, carried: false,
    swingA: 0, seamDev: 0, turn: 0, age: 0, bounceMul: 1, wet: false, groundBounce: 1, hitBy: null, holder: null, trail: [], fire: false, golden: false };
}
const cloneBall = b => Object.assign({}, b, { trail: [] });

/* one step of 1/120 s (dt); returns 'pitched' | 'bounce' | null. No random numbers: prediction equals reality */
function stepBall(b, dt) {
  if (b.phase === 'held' || b.phase === 'dead') return null;
  b.age += dt;
  if (b.rolling && b.z <= 0) {   // rolling on the grass: friction only
    const k = .55 * (b.wet ? 1.6 : 1), f = Math.exp(-k * dt); b.vx *= f; b.vy *= f;
    if (hyp(b.vx, b.vy) < 4) { b.vx = b.vy = 0; }
    b.x += b.vx * dt; b.y += b.vy * dt; return null;
  }
  b.vz -= T('gravity') * dt;
  if (b.phase === 'delivery' && !b.pitched && b.swingA) {
    const sp = hyp(b.vx, b.vy) || 1, k = Math.min(1, b.age / .35) * T('swing');
    b.vx += (-b.vy / sp) * b.swingA * k * dt;   // lateral push (x), the pace is kept
  }
  b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
  let ev = null;
  if (b.z <= 0 && b.vz < 0) {
    b.z = 0;
    if (b.phase === 'delivery' && !b.pitched) {
      b.pitched = true; b.vz = -b.vz * T('pitchBounce') * b.groundBounce * b.bounceMul;
      const a = b.turn * T('spin') + b.seamDev, c = Math.cos(a), s = Math.sin(a), vx = b.vx * .86, vy = b.vy * .86;
      b.vx = vx * c - vy * s; b.vy = vx * s + vy * c;
      ev = 'pitched';
    } else {
      b.bounces++; b.carried = false;
      b.vz = -b.vz * .42; b.vx *= .86; b.vy *= .86;
      if (b.vz < 25) { b.vz = 0; b.rolling = true; }
      ev = 'bounce';
    }
  }
  return ev;
}

/* the delivery's launch velocity: lands on (tx, ty) with no swing, from the release point (rx, ry, rz) at ground speed sp */
function solveDelivery(rx, ry, rz, tx, ty, sp) {
  const d = hyp(tx - rx, ty - ry), t = Math.max(.12, d / sp), g = T('gravity');
  return { vx: (tx - rx) / t, vy: (ty - ry) / t, vz: (g * t * t / 2 - rz) / t, t };
}

/* run the same step on a copy until fn(copy) says stop (or maxT): returns { t, b } */
function predictUntil(b, fn, maxT = 4) {
  const c = cloneBall(b);
  for (let i = 0, n = Math.round(maxT * 120); i < n; i++) {
    stepBall(c, 1 / 120);
    if (fn(c)) return { t: (i + 1) / 120, b: c, hit: true };
  }
  return { t: maxT, b: c, hit: false };
}
const predictPlane = (b, y = YHIT) => predictUntil(b, c => c.y <= y, 3);
const predictLanding = b => predictUntil(b, c => (c.z <= 1.5 && c.bounces + (c.pitched ? 1 : 0) >= 1) || c.bounces > 0 || rho(c.x, c.y) > 1.3, 5);

/* the shot resolver: maps timing quality, shot type and aim to a launch velocity */
function shotVelocity(b, shot, aim, err, q, fire, edge, rnd) {
  const win = T('window');
  let phi = Math.atan2(aim[1], aim[0]);
  phi -= clamp(err * 5, -.55, .55);                 // early: pulled to the leg side; late: steered to the off side
  let sp, vz;
  const pace = hyp(b.vx, b.vy);
  if (shot === 'defend') { sp = 85 + pace * .08; vz = 6; }
  else if (shot === 'loft') { sp = 215 * (.42 + .7 * q) * T('loftPower') + pace * .12 * q; vz = (95 + 115 * q) * T('loftPower'); }
  else { sp = 258 * (.5 + .7 * q) * T('batPower') + pace * .15 * q; vz = 10 + 35 * (1 - q) * rnd(); }
  if (fire && shot !== 'defend') { sp *= 1.3; if (shot === 'loft') vz *= 1.18; }
  if (edge) {   // a thick edge flies behind the batter: the keeper or the slips
    phi = -Math.PI / 2 + rr(-.7, .7, rnd) + (err > 0 ? .5 : -.5); sp *= .6; vz = rr(35, 105, rnd);
  } else if (shot === 'loft' && q < .3) { sp *= .8; vz *= 1.15; }   // a skier
  return { vx: Math.cos(phi) * sp, vy: Math.sin(phi) * sp, vz, phi };
}
