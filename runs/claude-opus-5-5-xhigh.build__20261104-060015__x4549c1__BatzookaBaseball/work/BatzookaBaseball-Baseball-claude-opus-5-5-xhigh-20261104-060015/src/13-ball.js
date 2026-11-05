/* =============================================================================
 * 13-ball: batted and thrown ball physics at 120 Hz: gravity, drag, sidespin,
 * wind, bounces and rolls by surface, the fence (home run, ground-rule double,
 * off the wall), the foul poles, foul walls and backstop, fair and foul, and the
 * forward prediction the fielders, the landing marker and the cameras use.
 * Ball positions are world coordinates; the park turns them into offsets.
 * ========================================================================== */
BZ.newBall = () => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, mode: 'none', holder: null, bounced: 0, touched: false, fair: 'pending', spin: 0, boost: 0, version: 0, rolling: false, t: 0, trail: [], invisible: false, thrown: null, noAir: false, dead: false });
BZ.surfaceAt = (park, x, y) => {
  const dx = x - park.H.x, dy = y - park.H.y, r = Math.hypot(dx, dy), th = BZ.theta(dx, dy);
  if (park.def.beyond === 'regolith' && r > 470) return 'regolith';
  if (r < 46) return 'dirt';
  if (dy < 0 && Math.abs(th) <= park.span && r > park.R(th) - 46) return 'track';
  if (r < 470 && dy < 0 && Math.abs(th) < .873) { const p = (dx - dy) * Math.SQRT1_2, q = (-dy - dx) * Math.SQRT1_2; if (!(p > 24 && p < 276 && q > 24 && q < 276)) return 'dirt'; }
  return 'grass';
};
const BOUNCE = { grass: .42, dirt: .5, track: .45, regolith: .55 }, SLIDE = { grass: .82, dirt: .9, track: .86, regolith: .88 }, ROLL = { grass: 185, dirt: 150, track: 170, regolith: 120 };
BZ.gravity = (park) => 520 * (park ? park.gravityMul : 1) * TUNE.gravity;
BZ.displayZ = (z) => z < 40 ? z : 40 + (z - 40) * TUNE.heightSquash;

/**
 * one physics step for a ball in flight or rolling (modes 'batted', 'thrown', 'loose'). Returns a list of events:
 * 'land' (the first touch of the ground), 'bounce', 'fence', 'hr', 'pole', 'grd', 'dead' (out of play), 'stop'
 */
BZ.ballStep = (b, park, dt, o = {}) => {
  const ev = [], H = park.H;
  const g = BZ.gravity(park);
  if (b.z > 0 || b.vz > 0) {
    b.vz -= g * dt;
    if (!b.noAir) {
      const dr = TUNE.drag * dt; b.vx -= b.vx * dr; b.vy -= b.vy * dr; b.vz -= b.vz * dr;
      const hs = Math.hypot(b.vx, b.vy);
      if (b.spin && hs > 1) { b.vx += -b.vy / hs * b.spin * dt; b.vy += b.vx / hs * b.spin * dt; }
      const wk = clamp((b.z - 60) / 100, 0, 1) * TUNE.wind;
      if (wk > 0 && park.wind) { b.vx += park.wind.x * wk * dt; b.vy += park.wind.y * wk * dt; }
      if (b.boost > 0) { const s = Math.hypot(b.vx, b.vy, b.vz) || 1; b.vx += b.vx / s * 900 * dt; b.vy += b.vy / s * 900 * dt; b.vz += b.vz / s * 900 * dt; b.boost -= dt; }
    }
  }
  const px0 = b.x, py0 = b.y;
  b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
  // the ground
  if (b.z <= 0) {
    b.z = 0;
    const surf = BZ.surfaceAt(park, b.x, b.y);
    if (b.vz < -25) {
      if (!b.bounced) ev.push('land');
      b.bounced++; ev.push('bounce');
      b.vz = -b.vz * (BOUNCE[surf] || .45) * TUNE.bounce * (park.bounceMul || 1);
      b.vx *= SLIDE[surf] || .85; b.vy *= SLIDE[surf] || .85;
      b.rolling = false;
    } else {
      if (!b.bounced) { ev.push('land'); b.bounced++; }
      b.vz = 0; b.rolling = true;
      const s = Math.hypot(b.vx, b.vy), dec = (ROLL[surf] || 220) * TUNE.rollFriction * dt;
      if (s <= dec) { if (s > 0) ev.push('stop'); b.vx = 0; b.vy = 0; }
      else { b.vx -= b.vx / s * dec; b.vy -= b.vy / s * dec; }
    }
  }
  // walls: the fence, foul walls, the backstop, the poles
  const dx = b.x - H.x, dy = b.y - H.y, r = Math.hypot(dx, dy), th = BZ.theta(dx, dy), span = park.span;
  if (dy < 0 && Math.abs(th) <= span) {
    const R = park.R(th), Hf = park.Hf(th);
    if (r > R - BZ.GEO.ballR) {
      const fairAngle = Math.abs(th) <= Math.PI / 4 + .002;
      if (b.z >= Hf) {
        if (b.mode === 'batted' && fairAngle && b.fair !== 'foul' && !b.touched) { ev.push(b.bounced ? 'grd' : 'hr'); }
        else ev.push('dead');
      } else {
        // off the wall: the radial part reverses (x .35), the tangential part (x .8)
        const nx = dx / r, ny = dy / r, vr = b.vx * nx + b.vy * ny;
        if (vr > 0) { const tx = b.vx - vr * nx, ty = b.vy - vr * ny; b.vx = tx * .8 - vr * nx * .35; b.vy = ty * .8 - vr * ny * .35; b.vz *= .6; ev.push('fence'); }
        const k = (R - BZ.GEO.ballR - .5) / r; b.x = H.x + dx * k; b.y = H.y + dy * k;
      }
    }
  }
  // poles at +-45 degrees, 150 tall
  for (const s of [-1, 1]) {
    const R = park.R(s * Math.PI / 4), pxp = H.x + Math.sin(s * Math.PI / 4) * (R + 2), pyp = H.y - Math.cos(s * Math.PI / 4) * (R + 2);
    if (b.mode === 'batted' && !b.bounced && b.z < 150 && Math.hypot(b.x - pxp, b.y - pyp) < 3 + BZ.GEO.ballR) ev.push('pole');
  }
  const oL = BZ.outL(dx, dy), oR = BZ.outR(dx, dy), W = BZ.GEO.foulWall - BZ.GEO.ballR;
  if (oL > W || oR > W) {
    if (b.z >= 16) ev.push('dead');
    else {
      const nx = oL > W ? -Math.SQRT1_2 : Math.SQRT1_2, ny = Math.SQRT1_2, vn = b.vx * nx + b.vy * ny;
      if (vn > 0) { b.vx -= vn * nx * 1.4; b.vy -= vn * ny * 1.4; ev.push('wall'); }
      b.x = px0; b.y = py0;
    }
  }
  if (oL > 0 && oR > 0 && r > BZ.GEO.backstop - BZ.GEO.ballR) {
    if (b.z >= 50) ev.push('dead');
    else { const nx = dx / r, ny = dy / r, vr = b.vx * nx + b.vy * ny; if (vr > 0) { b.vx -= vr * nx * 1.4; b.vy -= vr * ny * 1.4; ev.push('wall'); } b.x = px0; b.y = py0; }
  }
  if (o.trail && BZ.cosmetic) { b.trail.push([b.x, b.y, b.z]); if (b.trail.length > 18) b.trail.shift(); }
  return ev;
};
/** fair or foul, by where the ball is (a ground point) */
BZ.isFairPoint = (park, x, y) => BZ.fair(x - park.H.x, y - park.H.y);
/** past the bags? (first and third are about 300 U from home) */
BZ.pastBags = (park, x, y) => Math.hypot(x - park.H.x, y - park.H.y) > 300 || (y - park.H.y) < -300;

/**
 * forward prediction with the same integrator and no randomness: samples every 1/30 s for up to secs, the first
 * landing, home runs and the ball's stop. { samples: [{ t, x, y, z, vz }], land: { t, x, y }, hr, stop: { t, x, y }, outOfPlay }
 */
BZ.predict = (ball, park, secs = 7) => {
  const b = Object.assign({}, ball, { trail: [] }), dt = 1 / 120, out = { samples: [], land: null, hr: false, grd: false, stop: null, dead: false, apex: b.z, clear: 0 };
  let t = 0;
  for (let i = 0; i < secs * 120; i++) {
    const ev = BZ.ballStep(b, park, dt);
    t += dt;
    if (b.z > out.apex) out.apex = b.z;
    if (i % 4 === 3) out.samples.push({ t, x: b.x, y: b.y, z: b.z, vz: b.vz, rolling: b.rolling });
    if (ev.includes('land') && !out.land) out.land = { t, x: b.x, y: b.y };
    if (ev.includes('hr') || ev.includes('pole')) { out.hr = true; out.hrT = t; out.hrAt = { x: b.x, y: b.y, z: b.z }; break; }
    if (ev.includes('grd')) { out.grd = true; break; }
    if (ev.includes('dead')) { out.dead = true; out.deadT = t; break; }
    if (b.rolling && Math.hypot(b.vx, b.vy) < 1) { out.stop = { t, x: b.x, y: b.y }; break; }
  }
  if (!out.stop) out.stop = { t, x: b.x, y: b.y };
  out.end = { x: b.x, y: b.y, z: b.z };
  return out;
};
/** how far past the fence a home run would carry (for the Moonshot Cam): the flight continued to the ground with no walls */
BZ.carry = (ball, park) => {
  const b = Object.assign({}, ball), dt = 1 / 120, g = BZ.gravity(park);
  for (let i = 0; i < 1200; i++) {
    b.vz -= g * dt; const dr = TUNE.drag * dt; b.vx -= b.vx * dr; b.vy -= b.vy * dr; b.vz -= b.vz * dr;
    if (b.boost > 0) { const s = Math.hypot(b.vx, b.vy, b.vz) || 1; b.vx += b.vx / s * 900 * dt; b.vy += b.vy / s * 900 * dt; b.vz += b.vz / s * 900 * dt; b.boost -= dt; }
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; if (b.z <= 0) break;
  }
  return { x: b.x, y: b.y, dist: Math.hypot(b.x - park.H.x, b.y - park.H.y) };
};
/** set a ball on a throw from a point to a point: E.arc with the throw's flight time */
BZ.throwBall = (b, park, from, to, speed) => {
  const d = Math.hypot(to.x - from.x, to.y - from.y), time = Math.max(.12, d / speed);
  const a = E.arc({ x: from.x, y: from.y, z: from.z }, { x: to.x, y: to.y, z: to.z }, BZ.gravity(park), { time });
  Object.assign(b, { x: from.x, y: from.y, z: from.z, vx: a.vx, vy: a.vy, vz: a.vz, mode: 'thrown', holder: null, noAir: true, rolling: false, spin: 0, boost: 0 });
  b.version++; b.thrownT = time;
  return time;
};
