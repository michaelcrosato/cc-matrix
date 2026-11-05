/* ---- BALL PHYSICS: one step function, shared by the simulation and the predictor, so a prediction is the future.
 * Fixed steps of 1/120 s. No random numbers inside the step: the seam deviation is drawn at release and kept on the
 * ball. Swing acts in the air before the pitch; spin turns the ball on the pitch; the outfield rolls and decays. ---- */
G.DT = 1 / 120;
G.speedUnits = kmh => kmh * 2.757 * (G.T('ballSpeed') / 0.62);   // units a second for a nominal km/h

G.newBall = (x, y, z) => ({ x, y, z, vx: 0, vy: 0, vz: 0, spin: 0, swingA: 0, spinDrift: 0, spinGrip: 0, turn: 0,
  seamDev: 0, bounceMul: 1, age: 0, phase: 'held', pitched: false, bounces: 0, touchedGround: false,
  carried: false, hitBy: -1, rolling: false, trail: [] });

// the environment a ball flies in: the ground's bounce and swing, and the outfield's friction (k)
G.envOf = ground => ({ bounce: ground.bounce, swing: ground.swing, k: ground.outfieldK, overcast: !!ground.overcast });

G.onPitch = b => Math.abs(b.x - G.W.PX) <= 24 && b.y >= G.W.SY && b.y <= G.W.BY;

/* one step of 1/120 s. ev(type, data) is called for events (pitch, bounce, roll) when given (not in predictions). */
G.stepBall = (b, env, ev) => {
  const dt = G.DT;
  b.age += dt;
  b.vz -= G.T('gravity') * dt;
  if (b.phase === 'delivery' && !b.pitched) {
    // the late swing: a lateral push, away from a right-hander (negative x) for a positive swingA, growing over 0.35 s
    b.vx += -b.swingA * 60 * G.T('swing') * env.swing * Math.min(1, b.age / 0.35) * dt;
    b.vx += b.spinDrift * dt;
    // Dibbly-Dobbly Doom: the ball wobbles in the air
    if (b.wobble) b.vx += Math.sin(b.age * 11) * 70 * dt;
  }
  const drag = 1 - 0.02 * dt;
  b.vx *= drag; b.vy *= drag;
  b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
  if (b.z <= 0) {
    b.z = 0;
    b.touchedGround = true;
    if (b.phase === 'delivery' && !b.pitched && G.onPitch(b)) {
      // the pitch: a bounce, a little grip, and the turn (spin and seam; positive turn is away from a right-hander)
      b.pitched = true; b.bounces++;
      b.vz = -b.vz * G.T('pitchBounce') * env.bounce * b.bounceMul;
      if (b.vz < 4) b.vz = 0;
      const sg = 0.86 - b.spinGrip;
      b.vx *= sg; b.vy *= sg;
      const ang = (-b.turn * G.T('spin') + b.seamDev) * PI / 180;
      const c = Math.cos(ang), s = Math.sin(ang);
      const vx = b.vx * c - b.vy * s, vy = b.vx * s + b.vy * c;
      b.vx = vx; b.vy = vy;
      if (ev) ev('pitch', { x: b.x, y: b.y });
    } else if (b.vz < -25) {
      b.vz = -b.vz * 0.42; b.vx *= 0.85; b.vy *= 0.85; b.bounces++;
      if (ev && b.phase === 'hit') ev('bounce', { x: b.x, y: b.y });
    } else {
      b.vz = 0;
      if (b.phase === 'hit') { b.phase = 'rolling'; if (ev) ev('roll', {}); }
    }
  }
  if (b.phase === 'rolling') {
    const f = Math.exp(-env.k * dt);
    b.vx *= f; b.vy *= f;
    if (Math.hypot(b.vx, b.vy) < 3) { b.vx = 0; b.vy = 0; }
  }
  b.speed = Math.hypot(b.vx, b.vy, b.vz);
};

/* predictor: the same step on a copy. Returns the time a point is crossed, or samples. */
G.clone = b => Object.assign({}, b, { trail: null });
G.predictUntil = (b, env, pred, maxT) => {
  const c = G.clone(b); let t = 0;
  while (t < maxT) {
    G.stepBall(c, env, null); t += G.DT;
    if (pred(c, t)) return { t, b: c };
  }
  return null;
};
// when the ball reaches y = plane (moving toward the batter, y decreasing), in seconds from now
G.timeToPlane = (b, env, plane, maxT = 2.5) => {
  const r = G.predictUntil(b, env, c => c.y <= plane, maxT);
  return r ? r.t : null;
};
// where and when the ball next lands (z reaches 0 and it is not still rising)
G.landingOf = (b, env, maxT = 4) => {
  const c = G.clone(b); let t = 0;
  if (c.z <= 0.01 && Math.abs(c.vz) < 1) return { t: 0, x: c.x, y: c.y };
  while (t < maxT) {
    c.phase = c.phase === 'held' ? 'hit' : c.phase;
    const lastZ = c.z;
    G.stepBall(c, env, null); t += G.DT;
    if (c.z <= 0.01 && lastZ > 0.01 && c.vz <= 0) return { t, x: c.x, y: c.y };
  }
  return { t, x: c.x, y: c.y };
};

/* solve a delivery: the release point, the pitch target (a point on the pitch) and nominal km/h give the start velocity
 * that lands the ball on the target with no swing (swing and spin then move the real pitching point). */
G.solveDelivery = (rel, tgt, kmh) => {
  const sp = G.speedUnits(kmh);
  const dx = tgt.x - rel.x, dy = tgt.y - rel.y, D = Math.hypot(dx, dy);
  const T1 = D / (sp * 0.97);
  const vz = (0.5 * G.T('gravity') * T1 * T1 - rel.z) / T1;
  const vh = D / T1;
  return { vx: dx / D * vh, vy: dy / D * vh, vz };
};
