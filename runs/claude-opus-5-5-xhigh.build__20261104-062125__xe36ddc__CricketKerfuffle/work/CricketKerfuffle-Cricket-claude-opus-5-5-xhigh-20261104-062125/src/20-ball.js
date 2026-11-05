/* ---- BALL PHYSICS AND THE PREDICTOR. One step function (1/120 s) serves the simulation and the predictor, and draws
 * no random numbers (the seam deviation is drawn once at release and kept on the ball), so a prediction equals what
 * then happens exactly. The AI, LBW, catches, fielder interception and the Owl-Eye tube all read it. ----
 * Ball: { x, y, z, vx, vy, vz, phase: 'held' | 'delivery' | 'hit' | 'dead', pitched, pitchAt, bounces, carried (hit and
 * not yet bounced), rolling, age, swingA (u/s², + toward +x), wobble, turn (radians at the pitch, + toward +x),
 * extraTurn (each later bounce), seamDev, bounceK, grip, maxBounces } */
const Ball = {
  make() { return { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, phase: 'held', pitched: false, pitchAt: null, bounces: 0, carried: false, rolling: false, age: 0, swingA: 0, wobble: 0, wobblePh: 0, turn: 0, extraTurn: 0, seamDev: 0, bounceK: 1, grip: .08, fx: null, hitAt: null, groundAt: null }; },
  copy(b) { const c = Object.assign({}, b); c.pitchAt = b.pitchAt && b.pitchAt.slice(); return c; },
  /** env: { g, pitchBounce, gb (the ground's pitch bounce), k (rolling decay), slope } */
  step(b, dt, env) {
    if (b.phase === 'held' || b.phase === 'dead') return;
    b.age += dt;
    b.vz -= env.g * dt;
    if (b.phase === 'delivery' && !b.pitched) {
      b.vx += b.swingA * Math.min(1, b.age / .35) * dt;
      if (b.wobble) b.vx += Math.sin(b.age * 21 + b.wobblePh) * b.wobble * 95 * dt;
    }
    const drag = 1 - .02 * dt; b.vx *= drag; b.vy *= drag;
    const px0 = b.x, py0 = b.y, pz0 = b.z;
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (b.z <= 0) {
      const fz = pz0 > 0 ? pz0 / (pz0 - b.z) : 1;   // where it really met the ground, between the steps
      b.z = 0;
      const onPitch = Math.abs(b.x) <= G.PITCH_HALF + 6 && b.y > -30 && b.y < 345;
      if (b.phase === 'delivery') {
        if (!b.pitched) {
          b.vz = -b.vz * env.pitchBounce * env.gb * b.bounceK;
          const k = .86 - b.grip, a = b.turn + b.seamDev, c = Math.cos(a), s = Math.sin(a), vx = b.vx * k, vy = b.vy * k;
          b.vx = vx * c - vy * s; b.vy = vx * s + vy * c;
          b.pitched = true; b.pitchAt = [px0 + (b.x - px0) * fz, py0 + (b.y - py0) * fz]; b.bounces = 1;
          if (!onPitch) b.offPitch = true;
        } else {
          b.bounces++;
          if (b.extraTurn) { const c = Math.cos(b.extraTurn), s = Math.sin(b.extraTurn), vx = b.vx, vy = b.vy; b.vx = vx * c - vy * s; b.vy = vx * s + vy * c; }
          if (b.vz < -22) { b.vz = -b.vz * (b.multiBounce ? .62 : .45); b.vx *= .9; b.vy *= .9; } else { b.vz = 0; b.rolling = true; }
        }
      } else {
        if (b.vz < -25) { b.vz = -b.vz * .42; b.vx *= .85; b.vy *= .85; if (b.carried) b.groundAt = b.age; b.carried = false; b.bounces++; }
        else { b.vz = 0; if (b.carried) b.groundAt = b.age; b.rolling = true; b.carried = false; }
      }
    }
    if (b.rolling && b.z <= 0) {
      let k = env.k; if (env.slope && b.vx > 0) k *= 1 - env.slope;
      const f = Math.exp(-k * dt); b.vx *= f; b.vy *= f;
      if (hyp(b.vx, b.vy) < 4) { b.vx = 0; b.vy = 0; }
    }
  },
  /** run the same step on a copy for `seconds`; every `every` steps a sample { t, x, y, z, carried, rolling, pitched } */
  predict(b, seconds, env, every = 1, stop) {
    const c = Ball.copy(b), out = [], n = Math.ceil(seconds / G.STEP);
    for (let i = 1; i <= n; i++) {
      Ball.step(c, G.STEP, env);
      if (i % every === 0) out.push({ t: i * G.STEP, x: c.x, y: c.y, z: c.z, carried: c.carried, rolling: c.rolling, pitched: c.pitched, vx: c.vx, vy: c.vy, vz: c.vz });
      if (stop && stop(c, i * G.STEP)) break;
      if (c.rolling && c.vx === 0 && c.vy === 0) break;
    }
    return out;
  },
  /** time until the ball's y first goes at or below yPlane (a delivery reaching the batter), with the ball there, or null */
  arrive(b, yPlane, env, max = 3) {
    if (b.y <= yPlane) return null;
    const c = Ball.copy(b), n = Math.ceil(max / G.STEP);
    for (let i = 1; i <= n; i++) {
      const py = c.y, px0 = c.x, pz = c.z; Ball.step(c, G.STEP, env);
      if (c.y <= yPlane) { const f = (py - yPlane) / Math.max(1e-6, py - c.y); return { t: (i - 1 + f) * G.STEP, x: lerp(px0, c.x, f), z: lerp(pz, c.z, f), pitched: c.pitched, pitchAt: c.pitchAt }; }
    }
    return null;
  },
  /** a delivery's initial velocity from the release point to land on the pitch target (tx, ty) at ground speed v,
   *  without swing; iterated on the real step so it lands within a unit */
  solve(rel, tx, ty, v, env, bounceK = 1) {
    let ax = tx, ay = ty, sol = null;
    for (let it = 0; it < 4; it++) {
      const dx = ax - rel.x, dy = ay - rel.y, D = hyp(dx, dy) || 1, t = D / v, vz = (.5 * env.g * t * t - rel.z) / t;
      sol = { vx: dx / D * v, vy: dy / D * v, vz };
      const b = Object.assign(Ball.make(), rel, sol, { phase: 'delivery', bounceK });
      let land = null;
      for (let i = 0; i < 600 && !land; i++) { Ball.step(b, G.STEP, env); if (b.pitched) land = b.pitchAt; }
      if (!land) break;
      ax += tx - land[0]; ay += ty - land[1];
      if (hyp(tx - land[0], ty - land[1]) < .2) break;
    }
    return sol;
  }
};
K.Ball = Ball;
