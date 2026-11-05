// ---- ball physics and the trajectory predictor (5.1). One step function serves the simulation and the predictor; it
// draws no random numbers (the seam deviation is drawn at release and kept on the ball), so a prediction is exact.
function newBall() {
  return { x: 0, y: 300, z: 34, vx: 0, vy: 0, vz: 0, phase: 'held', pitched: false, bounces: 0, swingX: 0, wob: 0, turnRad: 0, seamDev: 0, bounceK: 1,
    age: 0, carried: false, landed: false, trail: [], fx: null, multi: 1, pitchX: 0, pitchY: 0, kmh: 0, lastTouch: null, rollK: .55, groundBounce: .42 };
}
const cloneBall = b => Object.assign({}, b, { trail: [] });
// env: the ground's factors, read once per match: { bounce, turn, seam, outfield, sand }
function stepBall(b, dt, env) {
  if (b.phase === 'held' || b.phase === 'dead' || b.phase === 'carried') return null;
  const g = T('gravity');
  b.age += dt;
  let ev = null;
  if (b.phase === 'rolling') {
    const k = b.rollK * env.outfield * (env.wet ? 1.6 : 1);
    const f = Math.exp(-k * dt); b.vx *= f; b.vy *= f;
    b.x += b.vx * dt; b.y += b.vy * dt; b.z = 0; b.vz = 0;
    if (hyp(b.vx, b.vy) < 6) { b.vx = b.vy = 0; b.stopped = true; }
    return null;
  }
  b.vz -= g * dt;
  if (b.phase === 'delivery' && !b.pitched) {
    const ramp = Math.min(1, b.age / .35);
    b.vx += (b.swingX * ramp + (b.wob ? Math.sin(b.age * 23) * b.wob * 120 : 0)) * dt;
  }
  const dr = 1 - .02 * dt; b.vx *= dr; b.vy *= dr; b.vz *= dr;
  const x0 = b.x, y0 = b.y, z0 = b.z;
  b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
  if (b.z <= 0) {
    // where it met the ground inside this step (so a pitching point is exact, not one step's travel late)
    const f = z0 > 0 ? z0 / (z0 - b.z) : 1; b.x = x0 + (b.x - x0) * f; b.y = y0 + (b.y - y0) * f;
    b.z = 0;
    const onPitch = Math.abs(b.x) <= PITCH.halfW && b.y > -20 && b.y < 340;
    if (b.phase === 'delivery' && onPitch && (!b.pitched || b.multi > b.bounces)) {
      const first = !b.pitched;
      b.vz = -b.vz * T('pitchBounce') * env.bounce * b.bounceK * (first ? 1 : .8);
      const grip = b.spinGrip || 0, hs = .86 - grip;
      b.vx *= hs; b.vy *= hs;
      const rot = first ? b.turnRad + b.seamDev : b.turnRad * .7;
      const c = Math.cos(rot), s = Math.sin(rot), vx = b.vx * c - b.vy * s, vy = b.vx * s + b.vy * c; b.vx = vx; b.vy = vy;
      if (first) { b.pitched = true; b.pitchX = b.x; b.pitchY = b.y; ev = 'pitched'; }
      b.bounces++;
    } else {
      // grass (or the pitch after the bat): a softer bounce, then it rolls
      b.bounces++;
      if (b.phase === 'hit' || b.phase === 'throw') { if (!b.landed) { b.landed = true; ev = 'landed'; } b.carried = false; }
      b.vz = -b.vz * b.groundBounce;
      const f = env.sand ? .7 : .78; b.vx *= f; b.vy *= f;
      if (b.phase === 'delivery' && !b.pitched) { b.pitched = true; b.pitchX = b.x; b.pitchY = b.y; ev = 'pitched'; }
      if (b.vz < 25) { b.vz = 0; if (b.phase === 'delivery') b.wasDelivery = true; b.phase = 'rolling'; }
    }
  }
  return ev;
}
// predict: step a copy for seconds; samples every `every` seconds: [{ t, x, y, z, phase, carried }]
function predict(b, seconds, env, every = 1 / 120, stopAt) {
  const c = cloneBall(b), out = [], dt = 1 / 120; let t = 0, acc = 0;
  out.push({ t: 0, x: c.x, y: c.y, z: c.z, phase: c.phase, carried: c.carried, pitched: c.pitched });
  while (t < seconds) {
    stepBall(c, dt, env); t += dt; acc += dt;
    if (acc >= every - 1e-9) { acc = 0; out.push({ t, x: c.x, y: c.y, z: c.z, phase: c.phase, carried: c.carried, pitched: c.pitched, vx: c.vx, vy: c.vy, vz: c.vz }); }
    if (stopAt && stopAt(c, t)) { out.push({ t, x: c.x, y: c.y, z: c.z, phase: c.phase, carried: c.carried, pitched: c.pitched, vx: c.vx, vy: c.vy, vz: c.vz, stop: true }); break; }
    if (c.phase === 'rolling' && c.stopped) break;
  }
  return out;
}
// when does the delivery reach the plane y = py? -> { t, x, z, pitched, pitchX, pitchY } or null
function arrival(b, py, env) {
  const c = cloneBall(b), dt = 1 / 120; let t = 0, px0 = c.pitched ? c.pitchX : null, py0 = c.pitched ? c.pitchY : null;
  if (c.y <= py) return null;
  while (t < 4) {
    const ev = stepBall(c, dt, env); t += dt;
    if (ev === 'pitched') { px0 = c.pitchX; py0 = c.pitchY; }
    if (c.y <= py) return { t, x: c.x, z: c.z, pitched: c.pitched, pitchX: px0, pitchY: py0, vx: c.vx, vy: c.vy, vz: c.vz };
  }
  return null;
}
// solve a delivery's launch from the release point to land on (tx, ty) at speed (u/s), without swing
function solveDelivery(rx, ry, rz, tx, ty, speed) {
  const g = T('gravity');
  const raw = (ax, ay) => { const dx = ax - rx, dy = ay - ry, D = Math.max(1, hyp(dx, dy)), t = D / speed; return { vx: dx / t, vy: dy / t, vz: (.5 * g * t * t - rz) / t, t }; };
  // the drag moves the real pitching point a little short: aim, fly a plain copy, correct, three times
  let ax = tx, ay = ty, sol = raw(ax, ay);
  for (let it = 0; it < 3; it++) {
    const c = { x: rx, y: ry, z: rz, vx: sol.vx, vy: sol.vy, vz: sol.vz }, dt = 1 / 120; let n = 0;
    while (c.z > 0 && n++ < 1200) { c.vz -= g * dt; const dr = 1 - .02 * dt; c.vx *= dr; c.vy *= dr; c.vz *= dr; const x0 = c.x, y0 = c.y, z0 = c.z; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt; if (c.z <= 0) { const f = z0 / (z0 - c.z); c.x = x0 + (c.x - x0) * f; c.y = y0 + (c.y - y0) * f; } }
    ax += tx - c.x; ay += ty - c.y; sol = raw(ax, ay);
  }
  return sol;
}
const kmhToU = kmh => kmh / 3.6 * 16 * T('ballSpeed');
// a throw from a to b (pitch frame) at speed, with an arc that keeps it under 60 high
function solveThrow(ax, ay, az, bx, by, bz, speed) {
  const D = Math.max(1, hyp(bx - ax, by - ay)), t = Math.max(.25, D / speed), g = T('gravity');
  return { vx: (bx - ax) / t, vy: (by - ay) / t, vz: (bz - az + .5 * g * t * t) / t, t };
}
