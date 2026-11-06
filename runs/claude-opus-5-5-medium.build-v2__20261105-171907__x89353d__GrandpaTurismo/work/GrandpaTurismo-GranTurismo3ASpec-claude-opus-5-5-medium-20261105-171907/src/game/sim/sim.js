// src/game/sim/sim.js: the race simulation. Pure JS, no engine, no DOM. Metres, seconds, kg, newtons, radians. Y up.
// Heading yaw: 0 faces +Z; forward = (sin yaw, cos yaw); the driver's right = (-cos yaw, sin yaw). Steer > 0 turns right.
export const G = 9.81, RHO = 1.2;
export const SURFACES = { // mu multiplies the tyre; drag is rolling drag in g at speed; tyre tables below may override mu
  asphalt: { mu: 1, drag: 0 }, kerb: { mu: 0.94, drag: 0.004 }, grass: { mu: 0.5, drag: 0.09 }, gravel: { mu: 0.55, drag: 0.16 },
  dirt: { mu: 0.62, drag: 0.02 }, apron: { mu: 0.9, drag: 0.004 },
};

// ---------- Track: a closed polygon with rounded corners, [x, z, radius, y, width, bankDeg] per corner ----------
export function buildTrack(def, step = 4) {
  const C = def.corners, n = C.length, px = [], pz = [], key = [];
  const T0 = C.map((c, i) => {
    const a = C[(i - 1 + n) % n], b = C[(i + 1) % n];
    let ux = a[0] - c[0], uz = a[1] - c[1], vx = b[0] - c[0], vz = b[1] - c[1]; const ul = Math.hypot(ux, uz), vl = Math.hypot(vx, vz); ux /= ul; uz /= ul; vx /= vl; vz /= vl;
    const ang = Math.acos(Math.max(-1, Math.min(1, ux * vx + uz * vz))), t = c[2] / Math.tan(ang / 2), bx = ux + vx, bz = uz + vz, bl = Math.hypot(bx, bz), d = c[2] / Math.sin(ang / 2);
    return { inX: c[0] + ux * t, inZ: c[1] + uz * t, outX: c[0] + vx * t, outZ: c[1] + vz * t, cx: c[0] + (bx / bl) * d, cz: c[1] + (bz / bl) * d, r: c[2] };
  });
  const push = (x, z, k) => { px.push(x); pz.push(z); key.push(k); };
  const line = (x0, z0, x1, z1, ci, f0, f1) => { const m = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0))); for (let i = 0; i < m; i++) { const f = i / m; push(x0 + (x1 - x0) * f, z0 + (z1 - z0) * f, ci + f0 + (f1 - f0) * f); } };
  const midX = (C[n - 1][0] + C[0][0]) / 2, midZ = (C[n - 1][1] + C[0][1]) / 2; let cx = midX, cz = midZ; // s = 0 is the middle of the last edge
  for (let i = 0; i < n; i++) {
    const t = T0[i]; line(cx, cz, t.inX, t.inZ, i - 1, i === 0 ? 0.5 : 0, 0.85);
    const a0 = Math.atan2(t.inZ - t.cz, t.inX - t.cx); let da = Math.atan2(t.outZ - t.cz, t.outX - t.cx) - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    const m = Math.max(1, Math.round(Math.abs(da) * t.r)); for (let k = 0; k < m; k++) { const f = k / m, a = a0 + da * f; push(t.cx + t.r * Math.cos(a), t.cz + t.r * Math.sin(a), i - 1 + 0.85 + 0.15 * f); }
    cx = t.outX; cz = t.outZ;
  }
  line(cx, cz, midX, midZ, n - 1, 0, 0.5);
  const m = px.length, smooth = (a, r) => { const o = new Float64Array(m); let s = 0; for (let i = -r; i <= r; i++) s += a[(i + m) % m]; for (let i = 0; i < m; i++) { o[i] = s / (2 * r + 1); s += a[(i + r + 1) % m] - a[(i - r + m) % m]; } return o; };
  const sx = smooth(smooth(px, 7), 7), sz = smooth(smooth(pz, 7), 7), cum = new Float64Array(m + 1);
  for (let i = 0; i < m; i++) cum[i + 1] = cum[i] + Math.hypot(sx[(i + 1) % m] - sx[i], sz[(i + 1) % m] - sz[i]);
  const length = cum[m], N = Math.round(length / step), ds = length / N, A = () => new Float64Array(N);
  const tr = { def, N, ds, length, x: A(), z: A(), y: A(), width: A(), bank: A(), tx: A(), tz: A(), kappa: A(), slope: A(), wallL: A().fill(def.runoff ?? 9), wallR: A().fill(def.runoff ?? 9), cornerS: new Array(n).fill(0), surface: def.surface ?? 'asphalt', edge: def.edge ?? 'grass', muScale: 1 };
  const ease = (f) => f * f * (3 - 2 * f), attr = (k, q) => { const ci = Math.floor(k), f = ease(k - ci), a = C[(ci + n) % n], b = C[(ci + 1 + n) % n]; return a[q] + (b[q] - a[q]) * f; };
  for (let i = 0, j = 0; i < N; i++) {
    const s = i * ds; while (cum[j + 1] < s) j++;
    const f = (s - cum[j]) / (cum[j + 1] - cum[j]), q = (j + 1) % m, k = key[j];
    tr.x[i] = sx[j] + (sx[q] - sx[j]) * f; tr.z[i] = sz[j] + (sz[q] - sz[j]) * f; tr.y[i] = attr(k, 3); tr.width[i] = attr(k, 4); tr.bank[i] = (attr(k, 5) * Math.PI) / 180;
  }
  for (let j = 0, ci = 0; j < m && ci < n; j++) if (key[j] >= ci - 1 + 0.925) tr.cornerS[ci++] = cum[j]; // s at each corner's apex
  for (const [cs, cl, ch] of def.crests ?? []) for (let i = 0; i < N; i++) { const d = (i * ds - cs) / cl; if (Math.abs(d) < 1) tr.y[i] += ch * (0.5 + 0.5 * Math.cos(Math.PI * d)); }
  for (let i = 0; i < N; i++) { const p = (i - 1 + N) % N, q = (i + 1) % N, dx = tr.x[q] - tr.x[p], dz = tr.z[q] - tr.z[p], l = Math.hypot(dx, dz); tr.tx[i] = dx / l; tr.tz[i] = dz / l; tr.slope[i] = (tr.y[q] - tr.y[p]) / l; }
  for (let i = 0; i < N; i++) { const p = (i - 1 + N) % N, q = (i + 1) % N; tr.kappa[i] = (tr.tx[p] * tr.tz[q] - tr.tz[p] * tr.tx[q]) / (2 * ds); } // kappa > 0 turns right; bank > 0 pushes right
  { // the bank leans into the corner. On a straight kappa is only rounding noise, so hold the sign of the last real corner, then smooth the changeovers.
    const N = tr.N; let sign = 1; for (let i = N - 1; i >= 0; i--) if (Math.abs(tr.kappa[i]) > 1e-4) { sign = Math.sign(tr.kappa[i]); break; }
    const b = new Float64Array(N); for (let i = 0; i < N; i++) { if (Math.abs(tr.kappa[i]) > 1e-4) sign = Math.sign(tr.kappa[i]); b[i] = tr.bank[i] * sign; }
    for (let i = 0, r = 6; i < N; i++) { let t = 0; for (let k = -r; k <= r; k++) t += b[(i + k + N) % N]; tr.bank[i] = t / (2 * r + 1); }
  }
  return tr;
}
// t > 0 is the driver's right of the centreline: right = (-tz, tx). Search near the last index, so crossings can't confuse it.
export function locate(tr, px, pz, hint, out) {
  let best = hint, bd = Infinity;
  for (let k = -12; k <= 12; k++) { const i = (hint + k + tr.N) % tr.N, d = (px - tr.x[i]) ** 2 + (pz - tr.z[i]) ** 2; if (d < bd) { bd = d; best = i; } }
  const dx = px - tr.x[best], dz = pz - tr.z[best];
  out.i = best; out.s = (best * tr.ds + dx * tr.tx[best] + dz * tr.tz[best] + tr.length) % tr.length; out.t = -dx * tr.tz[best] + dz * tr.tx[best];
}
export function racingLine(tr, margin = 1.6, iters = 1500) { // elastic band: each point relaxes to its neighbours' midpoint, inside the track
  const off = new Float64Array(tr.N), px = Float64Array.from(tr.x), pz = Float64Array.from(tr.z), kappa = new Float64Array(tr.N), N = tr.N;
  for (let it = 0; it < iters; it++) for (let i = 0; i < N; i++) {
    const p = (i - 1 + N) % N, q = (i + 1) % N, dx = (px[p] + px[q]) / 2 - tr.x[i], dz = (pz[p] + pz[q]) / 2 - tr.z[i], lim = tr.width[i] / 2 - margin;
    off[i] = Math.max(-lim, Math.min(lim, -dx * tr.tz[i] + dz * tr.tx[i])); px[i] = tr.x[i] - off[i] * tr.tz[i]; pz[i] = tr.z[i] + off[i] * tr.tx[i];
  }
  for (let i = 0; i < N; i++) { const a = (i - 3 + N) % N, c = (i + 3) % N, ax = px[i] - px[a], az = pz[i] - pz[a], bx = px[c] - px[i], bz = pz[c] - pz[i], la = Math.hypot(ax, az), lb = Math.hypot(bx, bz); kappa[i] = (2 * (ax * bz - az * bx)) / (la * lb * (la + lb)); }
  return { off, px, pz, kappa };
}
export function speedProfile(tr, line, c, surfMu = 1) { // the fastest the car can follow the line, friction circle included
  const N = tr.N, v = new Float64Array(N), ds = tr.ds, m = c.mass, muEff = c.tyreMu * (c.clA > 0.5 ? 0.76 : 0.86) * surfMu, down = (RHO * c.clA) / (2 * m), dragK = (0.5 * RHO * c.cdA) / m;
  const grip = (sp) => muEff * (G + down * sp * sp);
  for (let i = 0; i < N; i++) {
    const k = Math.max(Math.abs(line.kappa[i]), 1e-5), tb = Math.tan(Math.abs(tr.bank[i])) * (Math.sign(tr.bank[i]) === Math.sign(line.kappa[i]) ? 1 : -1), muB = (muEff + tb) / Math.max(0.2, 1 - muEff * tb), den = k - muB * down;
    v[i] = Math.min(den > 1e-5 ? Math.sqrt((muB * G) / den) : 110, c.vMax ?? 110);
  }
  const left = (sp, i) => { const A = grip(sp), lat = sp * sp * Math.abs(line.kappa[i]); return Math.sqrt(Math.max(0.0025 * A * A, A * A - lat * lat)); };
  for (let pass = 0; pass < 2; pass++) {
    for (let i = N - 1; i >= 0; i--) { const j = (i + 1) % N, a = left(v[j], j) * 0.82 + dragK * v[j] * v[j]; v[i] = Math.min(v[i], Math.sqrt(v[j] * v[j] + 2 * a * ds)); }
    for (let i = 0; i < N; i++) { const j = (i + 1) % N, a = Math.min(left(v[i], i), (c.powerW * 0.85) / (m * Math.max(v[i], 8))) - dragK * v[i] * v[i]; v[j] = Math.min(v[j], Math.sqrt(Math.max(v[i] * v[i] + 2 * a * ds, 1))); }
  }
  return v;
}

// ---------- Car ----------
export function torqueShape(x, d) { // torque against rpm / rpmPeak; peak power lands at x = 1
  const low = d.turbo ? 0.5 : 0.62, rise = Math.min(1, low + (1 - low) * Math.min(1, x / 0.7)), fall = x <= 1 ? 1 - 0.14 * Math.max(0, (x - 0.7) / 0.3) : 0.86 - 0.9 * (x - 1);
  return Math.max(0.05, rise * fall);
}
export function carParams(d) { // d: a row of the car table after tuning
  const L = d.wheelbase, powerW = d.powerPS * 735.5, omega = (d.rpmPeak * 2 * Math.PI) / 60;
  return { ...d, mass: d.massKg, L, a: L * (1 - d.frontWeight), b: L * d.frontWeight, T: d.track ?? 1.5, h: d.cgH ?? 0.5, R: d.wheelR ?? 0.31, Izz: d.massKg * (0.25 * L * L + 0.35), powerW, Tpeak: powerW / (omega * torqueShape(1, d)), tyreMu: d.tyreMu ?? 1, alphaP: d.alphaP ?? 0.125, clA: d.clA ?? 0.1, cdA: d.cdA ?? 0.7, aeroF: d.aeroF ?? 0.45, rollF: d.rollF ?? 0.56, loadK: d.loadK ?? 0.1, lsd: d.lsd ?? 0, brakeF: d.brakeF ?? 0.62, brakeG: d.brakeG ?? 1.25, rearStiff: d.rearStiff ?? 1.3, lock: d.lock ?? 0.6, shiftTime: d.shiftTime ?? 0.16, idle: d.idle ?? 900, launch: d.launch ?? 3200, awdFront: d.awdFront ?? 0.4, engineBrake: d.engineBrake ?? 0.16 };
}
export function newCar(p, tr, i = 0, t = 0) {
  const rx = -tr.tz[i], rz = tr.tx[i], y = tr.y[i];
  return { p, x: tr.x[i] + rx * t, z: tr.z[i] + rz * t, y, vy: 0, yaw: Math.atan2(tr.tx[i], tr.tz[i]), vx: 0, vz: 0, r: 0, delta: 0, ax: 0, ay: 0, gear: 1, shift: 0, rpm: p.idle, spool: 0, fz: [0, 0, 0, 0], fy: [0, 0, 0, 0], use: [0, 0, 0, 0], loc: { i, s: i * tr.ds, t }, u: 0, w: 0, beta: 0, sliding: false, spinning: false, locked: false, airborne: false, onTrack: true, surface: tr.surface, wear: [1, 1, 1, 1], fuel: 1, wallHits: 0, contact: 0, rev: 0 };
}
const curve = (x) => { const a = Math.abs(x), v = a < 1 ? Math.sin((a * Math.PI) / 2) : Math.max(0.86, 1 - 0.07 * (a - 1)); return x < 0 ? -v : v; };
const XF = (p) => [p.a, p.a, -p.b, -p.b], XR = (p) => [-p.T / 2, p.T / 2, -p.T / 2, p.T / 2];
// One substep (4 per fixedUpdate). inp: { steer -1..1, throttle, brake, handbrake, abs, tcs 0..1, asm 0..1, auto, up, down, steerRate }
export function stepCar(c, inp, dt, tr, env = {}) {
  const p = c.p, sn = Math.sin(c.yaw), cs = Math.cos(c.yaw), u = c.vx * sn + c.vz * cs, w = -c.vx * cs + c.vz * sn;
  c.u = u; c.w = w; locate(tr, c.x, c.z, c.loc.i, c.loc);
  const i0 = c.loc.i, halfW = tr.width[i0] / 2, off = Math.abs(c.loc.t) - halfW, kerbW = env.kerb ?? 1.6;
  const sName = c.inPit ? 'apron' : off < -0.1 ? tr.surface : off < kerbW && tr.surface === 'asphalt' ? 'kerb' : tr.edge, surf = SURFACES[sName];
  c.surface = sName; c.onTrack = off < kerbW;
  const tyreOnSurf = (p.tyreTable?.[sName] ?? surf.mu) * (env.gripScale ?? 1) * (tr.muScale ?? 1);

  // Heave: a sprung mass over the surface, so crests lighten the car and jumps leave the ground.
  const bk = tr.bank[i0], gy = tr.y[i0] + tr.slope[i0] * (c.loc.s - i0 * tr.ds) - c.loc.t * Math.sin(bk);
  const gyRate = tr.slope[i0] * u, pen = gy - c.y, wn = Math.sqrt(G / 0.08), Fs = pen > -0.02 ? Math.max(0, p.mass * G * (1 + pen / 0.08) + 2 * 0.5 * p.mass * wn * (gyRate - c.vy)) : 0;
  c.vy += (Fs / p.mass - G) * dt; c.y += c.vy * dt; if (c.y < gy - 0.25) { c.y = gy - 0.25; c.vy = Math.max(c.vy, gyRate); }
  const heave = Fs / (p.mass * G); c.airborne = Fs <= 0;

  // Steering stops near the front tyres' peak at this speed and opens with body slip, so counter-steer is always there.
  const au = Math.max(Math.abs(u), 5), beta = Math.abs(u) > 3 ? Math.atan2(w, Math.abs(u)) : 0; c.beta = beta;
  const limit = Math.min(p.lock, Math.atan((p.L * p.tyreMu * G * 1.1) / (au * au)) + p.alphaP * 0.9 + Math.abs(beta));
  const rate = (inp.steerRate ?? 3) * dt; c.delta += Math.max(-rate, Math.min(rate, inp.steer * limit - c.delta));
  const sd = Math.sin(c.delta), cd = Math.cos(c.delta);

  // Loads: static, aero, heave, banking, then longitudinal and lateral transfer.
  const aero = 0.5 * RHO * p.clA * (env.aeroScale ?? 1) * u * u, bankLoad = Math.cos(bk) + Math.max(0, (u * u * tr.kappa[i0] * Math.sin(bk)) / G), fw = p.b / p.L;
  const sF = (p.mass * G * bankLoad * heave * fw) / 2 + (aero * p.aeroF) / 2, sR = (p.mass * G * bankLoad * heave * (1 - fw)) / 2 + (aero * (1 - p.aeroF)) / 2;
  const dLong = (p.mass * c.ax * p.h) / p.L / 2, dLatF = (p.mass * c.ay * p.h * p.rollF) / p.T, dLatR = (p.mass * c.ay * p.h * (1 - p.rollF)) / p.T, fz = c.fz; // +ay pushes right: load moves to the left wheels
  fz[0] = Math.max(0, sF - dLong + dLatF); fz[1] = Math.max(0, sF - dLong - dLatF); fz[2] = Math.max(0, sR + dLong + dLatR); fz[3] = Math.max(0, sR + dLong - dLatR);
  const Fz0 = (p.mass * G) / 4, Fmax = [0, 0, 0, 0], sL = [sF, sF, sR, sR];
  for (let i = 0; i < 4; i++) Fmax[i] = fz[i] * p.tyreMu * tyreOnSurf * (0.72 + 0.28 * Math.sqrt(Math.max(0, c.wear[i]))) * Math.max(0.82, Math.min(1.08, 1 - p.loadK * (fz[i] / Fz0 - 1)));

  // Gearbox and engine. rpm follows the road, the clutch slips below launch speed.
  const gears = p.gears, Gk = gears[c.gear - 1] * p.final, wheelRpm = (Math.abs(u) / p.R) * (60 / (2 * Math.PI));
  let rpm = wheelRpm * Gk; const clutchRpm = p.idle + p.launch * inp.throttle; if (rpm < clutchRpm) rpm = clutchRpm;
  if (c.shift > 0) c.shift -= dt;
  if (c.shift <= 0) {
    if (inp.auto !== false) {
      if (rpm > p.upshift && c.gear < gears.length && inp.throttle > 0.1) { c.gear++; c.shift = p.shiftTime; }
      else if (c.gear > 1) { const down = wheelRpm * gears[c.gear - 2] * p.final; if (down < p.upshift * 0.8 && (inp.throttle < 0.2 || down < p.rpmPeak * 0.8)) { c.gear--; c.shift = p.shiftTime * 0.6; } }
    } else {
      if (inp.up && c.gear < gears.length) { c.gear++; c.shift = p.shiftTime; }
      if (inp.down && c.gear > 1 && wheelRpm * gears[c.gear - 2] * p.final < p.redline) { c.gear--; c.shift = p.shiftTime * 0.6; }
    }
  }
  c.rpm = Math.min(rpm, p.redline + 200);
  const x = rpm / p.rpmPeak, throttle = rpm >= p.redline || c.fuel <= 0 ? 0 : inp.throttle;
  if (p.turbo) c.spool += ((throttle > 0.5 && rpm > p.rpmPeak * 0.4 ? 1 : 0.15) - c.spool) * Math.min(1, dt / (p.turboLag ?? 0.6));
  const boost = p.turbo ? 0.55 + 0.45 * c.spool : 1, Te = throttle * p.Tpeak * torqueShape(x, p) * boost * (env.powerScale ?? 1) * (c.oil ?? 1), eb = (1 - throttle) * p.engineBrake * p.Tpeak * Math.min(1, x);
  let drive = c.shift > 0 || inp.handbrake ? 0 : ((Te - eb) * Gk * 0.9) / p.R; if (inp.reverse) drive = -Math.min(3500, Math.abs(drive));
  c.fuel = Math.max(0, c.fuel - throttle * (rpm / p.redline) * dt * (env.fuelRate ?? 0.0018));
  const split = p.layout === '4WD' ? p.awdFront : p.layout === 'FF' ? 1 : 0;

  // Traction control trims drive to what the driven tyres have left after cornering.
  const free = (i) => Math.sqrt(Math.max(0.04 * Fmax[i] * Fmax[i], Fmax[i] * Fmax[i] - c.fy[i] * c.fy[i])), cap = (l, r) => 2 * Math.min(l, r) + p.lsd * Math.abs(l - r);
  if (inp.tcs > 0 && drive > 0) { const fA = cap(free(0), free(1)), rA = cap(free(2), free(3)), allow = (split === 1 ? fA : split === 0 ? rA : Math.min(fA / split, rA / (1 - split))) * (1.05 - 0.35 * inp.tcs); drive = Math.min(drive, allow); }
  const axle = (F, l, r) => { // the differential: open splits evenly and is held back by the lighter wheel; lsd lends it the other wheel's grip
    const mag = Math.abs(F), sign = Math.sign(F), low = Math.min(l, r), top = cap(l, r); let a = mag / 2, b = mag / 2, spin = false;
    if (mag > top) { spin = true; a = l <= r ? low : top - low; b = l <= r ? top - low : low; } else if (mag / 2 > low) { a = l <= r ? low : mag - low; b = l <= r ? mag - low : low; }
    return [a * sign, b * sign, spin];
  };
  const [d0, d1, s0] = axle(drive * split, Fmax[0], Fmax[1]), [d2, d3, s1] = axle(drive * (1 - split), Fmax[2], Fmax[3]), fxD = [d0, d1, d2, d3]; c.spinning = s0 || s1;

  // Tyres: lateral force from slip angle, longitudinal from drive and brake, both inside the friction circle.
  const Bmax = p.brakeG * p.mass * G * (env.brakeScale ?? 1), xf = XF(p), xr = XR(p), tanP = Math.tan(p.alphaP); let Ff = 0, Fr = 0, M = 0; c.sliding = false; c.locked = false;
  for (let i = 0; i < 4; i++) {
    const isF = i < 2, vf = u - c.r * xr[i], vr = w + c.r * xf[i], vLong = isF ? vf * cd + vr * sd : vf, vLat = isF ? -vf * sd + vr * cd : vr, lim = Math.max(1, Fmax[i]), dir = Math.abs(vLong) < 0.3 ? 0 : Math.sign(vLong);
    let Fx = fxD[i], locked = false, bd = inp.brake * Bmax * (isF ? p.brakeF : 1 - p.brakeF) * 0.5; const hb = !isF && inp.handbrake; if (hb) bd = 1e9;
    if (bd > 0) { if (inp.abs !== false && !hb) bd = Math.min(bd, Math.sqrt(Math.max(0.04 * lim * lim, lim * lim - c.fy[i] * c.fy[i])) * 0.9); else if (bd > lim) { bd = lim * 0.82; locked = true; c.locked = true; } Fx -= bd * dir; }
    let rho = Math.abs(Fx) / lim, latCap; if (locked) latCap = 0.28; else if (rho > 1) { Fx = Math.sign(Fx) * lim * 0.95; latCap = 0.3; rho = 1; } else latCap = Math.max(0.3, Math.sqrt(1 - rho * rho));
    const tanA = vLat / Math.max(Math.abs(vLong), 3.5), peak = tanP * Math.max(0.35, Math.pow(fz[i] / Math.max(1, sL[i]), 0.8)) * (isF ? 1 : 1 / p.rearStiff), Fy = -lim * latCap * curve(tanA / peak);
    c.fy[i] = Fy; c.use[i] = Math.abs(tanA / peak); if (Math.abs(tanA) > peak * 1.3 && Math.abs(u) > 4) c.sliding = true;
    c.wear[i] = Math.max(0, c.wear[i] - dt * (env.wearRate ?? 0.0012) * (p.wearX ?? 1) * (0.15 + Math.min(c.use[i], 1.5) ** 2 + rho * rho));
    const bFf = isF ? Fx * cd - Fy * sd : Fx, bFr = isF ? Fx * sd + Fy * cd : Fy; Ff += bFf; Fr += bFr; M += xf[i] * bFr - xr[i] * bFf;
  }
  // Drag, surface, grade, banking; ASM adds a moment against yaw that grip doesn't explain.
  const drag = 0.5 * RHO * p.cdA * (c.dragScale ?? 1) * u * Math.abs(u), sd2 = Math.sign(u); Ff -= drag + 0.012 * p.mass * G * sd2 + surf.drag * Math.min(1, Math.abs(u) / 15) * p.mass * G * sd2 + p.mass * G * tr.slope[i0]; Fr += p.mass * G * Math.sin(bk);
  if (inp.asm > 0 && Math.abs(u) > 6) { const excess = c.r - Fr / p.mass / Math.max(Math.abs(u), 6), lim = inp.asm * p.mass * 6; M += Math.max(-lim, Math.min(lim, -excess * inp.asm * p.Izz * 9)); }
  const f = Math.min(1, dt / 0.05); c.ax += (Ff / p.mass - c.ax) * f; c.ay += (Fr / p.mass - c.ay) * f;
  c.vx += ((Ff * sn - Fr * cs) / p.mass) * dt; c.vz += ((Ff * cs + Fr * sn) / p.mass) * dt;
  if (Math.abs(u) < 0.25 && inp.throttle < 0.02 && inp.brake > 0.1) { c.vx *= 0.8; c.vz *= 0.8; }
  c.r += (M / p.Izz) * dt; c.r *= 1 - Math.min(0.9, dt * (Math.abs(u) < 2 ? 12 : 0.15)); c.yaw -= c.r * dt; c.x += c.vx * dt; c.z += c.vz * dt;

  // Barrier: track-space, slides the car along and takes speed; the wall turns the nose back to the road.
  const nowT = -(c.x - tr.x[i0]) * tr.tz[i0] + (c.z - tr.z[i0]) * tr.tx[i0], wallT = halfW + (nowT > 0 ? tr.wallR[i0] : tr.wallL[i0]);
  if (Math.abs(nowT) > wallT) {
    const side = Math.sign(nowT), rx = -tr.tz[i0] * side, rz = tr.tx[i0] * side, pen2 = Math.abs(nowT) - wallT; c.x -= rx * pen2; c.z -= rz * pen2;
    const vn = c.vx * rx + c.vz * rz;
    if (vn > 0) { c.vx -= rx * vn * 1.3; c.vz -= rz * vn * 1.3; const keep = Math.max(0.6, 1 - vn * 0.012 * (env.wallLoss ?? 1)); c.vx *= keep; c.vz *= keep; c.wallHits++; c.contact = Math.max(c.contact, vn); }
    let e = Math.atan2(tr.tx[i0], tr.tz[i0]) - c.yaw; while (e > Math.PI) e -= 2 * Math.PI; while (e < -Math.PI) e += 2 * Math.PI; if (Math.abs(e) < 2.2) c.yaw += e * Math.min(1, dt * 2.5); c.r *= 0.95;
  }
}
// Car against car: three circles down each car's length, pushed apart with a soft impulse and a little yaw.
export function collideCars(cars) {
  for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) {
    const a = cars[i], b = cars[j]; if ((a.x - b.x) ** 2 + (a.z - b.z) ** 2 > 36 || Math.abs(a.y - b.y) > 3) continue;
    let hit = false;
    for (const oa of [-1.35, 0, 1.35]) for (const ob of [-1.35, 0, 1.35]) {
      const ax = a.x + Math.sin(a.yaw) * oa, az = a.z + Math.cos(a.yaw) * oa, bx = b.x + Math.sin(b.yaw) * ob, bz = b.z + Math.cos(b.yaw) * ob, dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz), r = 1.75;
      if (d >= r || d < 1e-4) continue;
      hit = true; const nx = dx / d, nz = dz / d, push = (r - d) / 2; a.x -= nx * push; a.z -= nz * push; b.x += nx * push; b.z += nz * push;
      const rel = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz; if (rel >= 0) continue;
      const ma = a.p.mass, mb = b.p.mass, J = (-(1 + 0.25) * rel) / (1 / ma + 1 / mb); a.vx -= (J * nx) / ma; a.vz -= (J * nz) / ma; b.vx += (J * nx) / mb; b.vz += (J * nz) / mb;
      a.r += ((J * oa * Math.sign(nx * Math.cos(a.yaw) - nz * Math.sin(a.yaw))) / a.p.Izz) * 0.25; b.r -= ((J * ob * Math.sign(nx * Math.cos(b.yaw) - nz * Math.sin(b.yaw))) / b.p.Izz) * 0.25;
      a.contact = Math.max(a.contact, -rel); b.contact = Math.max(b.contact, -rel);
    }
    if (hit) { a.touching = b; b.touching = a; }
  }
}
// ---------- AI: pure pursuit with understeer feed-forward and a yaw damper, a speed target from the profile, overtaking offset ----------
export function aiDrive(c, tr, line, speeds, o = {}, field = null) {
  const u = Math.hypot(c.vx, c.vz), p = c.p, look = Math.max(7, u * (o.lookT ?? 0.62)), idx = (c.loc.i + Math.round(look / tr.ds)) % tr.N;
  let lane = o.lane ?? 0, slow = 1;
  if (field) for (const b of field) { // a car ahead and close: pick the side with room, lift if it is blocking
    if (b === c) continue; let gap = (b.loc.s - c.loc.s + tr.length) % tr.length; if (gap > tr.length / 2) gap -= tr.length;
    if (gap <= 1 || gap > 6 + u * 0.7) continue; const closing = u - Math.hypot(b.vx, b.vz), lat = b.loc.t - c.loc.t;
    if (closing > -1 && Math.abs(lat) < 2.4) { const lim = tr.width[idx] / 2 - 1.2, side = lat > 0 || b.loc.t > lim - 2.4 ? -1 : 1; lane = Math.max(-lim - line.off[idx], Math.min(lim - line.off[idx], line.off[idx] + side * 3.2 - line.off[idx])); if (gap < 8) slow = Math.min(slow, 0.97); }
  }
  c.laneNow = (c.laneNow ?? 0) + (lane - (c.laneNow ?? 0)) * 0.03;
  const rx = -tr.tz[idx], rz = tr.tx[idx], tx = line.px[idx] + rx * c.laneNow - c.x, tz = line.pz[idx] + rz * c.laneNow - c.z, sn = Math.sin(c.yaw), cs = Math.cos(c.yaw);
  const fwd = tx * sn + tz * cs, rgt = -tx * cs + tz * sn, curv = (2 * rgt) / Math.max(1, fwd * fwd + rgt * rgt), uch = o.uch ?? 26;
  const delta = Math.atan(curv * p.L) * (1 + (u * u) / (uch * uch)) - (o.yawDamp ?? 0.05) * (c.r - u * curv);
  const au = Math.max(Math.abs(c.u), 5), limit = Math.min(p.lock, Math.atan((p.L * p.tyreMu * G * 1.1) / (au * au)) + p.alphaP * 0.9 + Math.abs(c.beta));
  const err = speeds[(c.loc.i + Math.round((u * 0.1) / tr.ds)) % tr.N] * (o.skill ?? 1) * slow - u;
  let throttle = err > 0.3 ? 1 : err > -0.3 ? 0.4 : 0; if (Math.abs(c.beta) > 0.16 && Math.abs(c.u) > 5) throttle *= 0.4;
  return { steer: Math.max(-1, Math.min(1, delta / limit)), throttle, brake: err < -0.4 ? Math.min(1, -err / 4 + 0.15) : 0, abs: true, auto: true, tcs: o.tcs ?? 0.7, asm: o.asm ?? 0.6, steerRate: 6 };
}
