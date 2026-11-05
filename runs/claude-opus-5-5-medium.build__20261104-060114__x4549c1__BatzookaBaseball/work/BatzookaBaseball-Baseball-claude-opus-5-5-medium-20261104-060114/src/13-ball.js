/* BALL PHYSICS at 120 Hz: gravity, drag, sidespin, wind above 60 U; bounces and rolling by surface; the fence (home run,
 * ground-rule double, a bounce off it), the poles, the foul walls and backstop; fair or foul; and prediction (the same
 * integrator forward, no randomness) for the fielders, the landing marker and the cameras. */
function newBall(o) {
  const b = Object.assign({ x: HX, y: PLATE_Y, z: 10, vx: 0, vy: 0, vz: 0, spin: 0, mode: 'batted', bounced: false, touched: false, fair: null, rolling: false, dead: false, holder: null, kind: 'contact', Q: 0, boost: 0, apex: 0, trail: [], t: 0, overFence: false, inStands: false, hidden: false }, o);
  M.ball = b; M.play = { batter: batterNow(), runs: [], outs: [], contact: true, kind: b.kind, Q: b.Q, firstFielder: null, caughtFly: false, hit: null, t: 0, id: ++M.playId, maxR: 0 };
  b.pred = predict(b, 8);
  return b;
}
const surfaceAt = (x, y) => { const r = rOf(x, y), th = thetaOf(x, y), R0 = fenceR(M.park, clamp(th, -D45, D45)); if (Math.abs(th) <= D45 && r > R0 - 48) return 'track'; if (r < 470 && Math.abs(th) < .87 && !(Math.abs(x - HX) + Math.abs(y - HY + 212) < 190)) return 'dirt'; return 'grass'; };
const REST = { grass: .42, dirt: .5, track: .45 }, SLIDE = { grass: .82, dirt: .9, track: .86 }, ROLL = { grass: 260, dirt: 180, track: 220 };
/** one physics step of a free ball b (dt seconds). sim: a prediction (no events). Returns an event name or null */
function ballStep(b, dt, sim) {
  const g = 520 * M.park.gravityMul * TUNE.gravity, sp = Math.hypot(b.vx, b.vy, b.vz);
  if (!b.rolling) {
    let ax = -TUNE.drag * b.vx, ay = -TUNE.drag * b.vy, az = -g - TUNE.drag * b.vz;
    if (b.spin && sp > 50) { const h = Math.hypot(b.vx, b.vy) || 1; ax += -b.vy / h * b.spin * sp * .004 * 60; ay += b.vx / h * b.spin * sp * .004 * 60; }
    const we = clamp((b.z - 60) / 100, 0, 1) * TUNE.wind; ax += M.wind.x * we * 2; ay += M.wind.y * we * 2;
    if (b.boost > 0) { const k = 900 * dt / (sp || 1); b.vx += b.vx * k; b.vy += b.vy * k; b.vz += b.vz * k * .3; b.boost -= dt; }
    b.vx += ax * dt; b.vy += ay * dt; b.vz += az * dt;
  }
  b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.t += dt;
  if (b.z > b.apex) b.apex = b.z;
  const r = rOf(b.x, b.y), th = thetaOf(b.x, b.y), fairNow = Math.abs(th) <= D45 + .002;
  // the fence: home run, ground-rule double, or a bounce off it
  if (fairNow && b.fair !== false) {
    const R0 = fenceR(M.park, clamp(th, -D45, D45)), Hf = fenceH(M.park, th);
    if (r > R0 - 1.6) {
      if (b.z >= Hf) { if (!b.bounced && !b.touched) return 'homer'; return 'grd'; }
      const ux = (b.x - HX) / r, uy = (b.y - HY) / r, vr = b.vx * ux + b.vy * uy;
      if (vr > 0) { const tx = b.vx - vr * ux, ty = b.vy - vr * uy; b.vx = tx * .8 - vr * .35 * ux; b.vy = ty * .8 - vr * .35 * uy; b.x = HX + ux * (R0 - 2); b.y = HY + uy * (R0 - 2); b.fair = true; if (!sim) return 'fence'; }
    }
  }
  // the poles: within 3 U of a pole below 150 U is a home run
  for (const s of [-1, 1]) { const R0 = fenceR(M.park, s * D45), px0 = HX + Math.sin(s * D45) * R0, py0 = HY - Math.cos(s * D45) * R0; if (!b.bounced && b.z < 150 && Math.hypot(b.x - px0, b.y - py0) < 3) return 'pole'; }
  // out of play in foul territory: past the foul walls (70 U outside the lines), the backstop, or the stands
  if (!fairNow) {
    const pOut = b.x < HX ? Math.abs((b.x - HX) - (b.y - HY)) / Math.SQRT2 : Math.abs((b.x - HX) + (b.y - HY)) / Math.SQRT2, along = b.x < HX ? (-(b.x - HX) - (b.y - HY)) / Math.SQRT2 : ((b.x - HX) - (b.y - HY)) / Math.SQRT2;
    if ((along >= 80 && pOut > 70) || (along < 80 && r > 110) || (r > fenceR(M.park, Math.sign(th) * D45) + 10)) { if (b.z < 120 || !b.bounced) return b.fair === true && b.bounced ? 'grd' : 'outFoul'; }
  }
  // the ground
  if (b.z <= 0) {
    b.z = 0;
    if (!b.bounced) { b.bounced = true; b.firstLand = { x: b.x, y: b.y, t: b.t }; if (b.fair === null && r > 300) b.fair = fairNow; }
    const surf = surfaceAt(b.x, b.y);
    if (!b.rolling) {
      if (Math.abs(b.vz) < 25) { b.rolling = true; b.vz = 0; }
      else { b.vz = -b.vz * REST[surf] * TUNE.bounce * (M.park.id === 'megadome' ? 1.1 : 1); b.vx *= SLIDE[surf]; b.vy *= SLIDE[surf]; if (!sim) { emit('bounce', { x: b.x, y: b.y, v: Math.abs(b.vz) }); } }
    }
    if (b.rolling) { const h = Math.hypot(b.vx, b.vy); if (h > 0) { const nh = Math.max(0, h - ROLL[surf] * TUNE.rollFriction * dt); b.vx *= nh / h; b.vy *= nh / h; } if (h < 1) { b.vx = b.vy = 0; b.stopped = true; } }
  }
  // fair or foul past the bags (r 300) on the ground, or where it stops
  if (b.fair === null && b.bounced && (r > 300 || b.stopped)) b.fair = fairNow;
  return null;
}
/** forward simulation: samples every 1/30 s with { t, x, y, z, vz }, the first landing point and time */
function predict(b, secs) {
  const c = { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, spin: b.spin, boost: b.boost, bounced: b.bounced, rolling: b.rolling, fair: b.fair, touched: b.touched, apex: b.z, t: 0, stopped: false };
  const out = { samples: [], land: null, end: null, homer: false }, dt = 1 / 120;
  for (let i = 0; i < secs * 120; i++) {
    const ev = ballStep(c, dt, true);
    if (i % 4 === 0) out.samples.push({ t: c.t, x: c.x, y: c.y, z: c.z, vz: c.vz });
    if (!out.land && c.bounced) out.land = { x: c.x, y: c.y, t: c.t };
    if (ev === 'homer' || ev === 'pole') { out.homer = true; out.end = { x: c.x, y: c.y, t: c.t }; break; }
    if (ev === 'grd' || ev === 'outFoul') { out.end = { x: c.x, y: c.y, t: c.t, ev }; break; }
    if (c.stopped) { out.end = { x: c.x, y: c.y, t: c.t }; break; }
  }
  if (!out.land) out.land = out.end || { x: c.x, y: c.y, t: c.t };
  out.apex = c.apex;
  return out;
}
/** a home run's carry: the same flight with no fence in the way, to the ground (feet from home plate) */
function carryFeet(b) {
  let x = b.x, y = b.y, z = b.z, vx = b.vx, vy = b.vy, vz = b.vz; const g = 520 * M.park.gravityMul * TUNE.gravity, dt = 1 / 60;
  for (let i = 0; i < 1200 && z > 0; i++) { vx -= TUNE.drag * vx * dt; vy -= TUNE.drag * vy * dt; vz -= (g + TUNE.drag * vz) * dt; x += vx * dt; y += vy * dt; z += vz * dt; }
  return feet(rOf(x, y));
}
/** the drawn height in the Broadcast Cam: true below 40 U, squashed above (so high flies stay near their shadows) */
const drawZ = z => z < 40 ? z : 40 + (z - 40) * TUNE.heightSquash;
