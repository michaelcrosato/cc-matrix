// CRACKMANIA car (PLAN §4.4, Appendix A): not a physics body. Each 1/120 s step it probes the track with four wheel
// rays, follows the surface with velocity-level constraints, and flies ballistically when the surface can't hold it:
// loops hold when you're fast and drop you when you're slow. World metres, z up; deterministic.
import { CFG, G0, KMH } from '../config.js';
import { add, sub, mul, dot, cross, norm, len, rotate, quatFromFrame, clamp } from '../lib/v3.js';
import { TYPES } from '../track/blocks.js';

const Z = [0, 0, 1], REACH = .9;
export function tuning(id) {
  const c = CFG.cars[id];
  return { id, L: c.L, W: c.W, H: c.H, wheelbase: c.wheelbase, track: c.track, wheelR: c.wheelR, ride: c.ride, vtop: c.vtop * KMH, A0: c.A0, B: c.B, Arev: c.Arev, vrev: c.vrev * KMH,
    dLo: c.steerLo * Math.PI / 180, dHi: c.steerHi * Math.PI / 180, grip: c.grip, driftGrip: c.driftGrip, airYaw: c.airYaw, cd: c.cd, A: c.adhesion * G0 };
}
export function newCar(model = 'coyote') {
  return { model, p: [0, 0, 0], v: [0, 0, 0], f: [1, 0, 0], u: [0, 0, 1], r: [0, 1, 0], n: [0, 0, 1], grounded: false, kappa: 0, load: 0, slip: 0,
    air: 0, airMax: 0, flop: 0, flopFrom: null, boostT: 0, padArmed: null, drift: false, surface: 'road', blockId: null, d: [0, 0, 0, 0], hits: 0,
    steerVis: 0, slide: 0, impact: 0, wall: 0, scrape: 0, stuckT: 0, ev: [], assistI: -1, assistB: null, kmh: 0, brakeOn: false, gasOn: 0, steps: 0, lastE: 0 };
}
/** put the car at a frame { p, t, u } (road centre), at rest */
export function placeCar(car, fr, T) {
  car.f = norm(fr.t); car.u = norm(fr.u); car.r = cross(car.u, car.f); car.n = car.u.slice();
  car.p = add(fr.p, car.u, T.ride + .1); car.v = [0, 0, 0]; car.grounded = true; car.kappa = 0; car.load = G0; car.slip = 0; car.air = 0; car.flop = 0;
  car.boostT = 0; car.padArmed = null; car.drift = false; car.d = [T.ride, T.ride, T.ride, T.ride]; car.stuckT = 0; car.assistI = -1; car.assistB = null; car.slide = 0; car.scrape = 0;
}
const SURF = s => CFG.surf[s] || CFG.surf.road;
/** one step. ctl { steer -1..1 (filtered), gas 0..1, brake 0..1 }; ph: TrackPhysics; o: { assist: (blockId) -> samples, water: (x, y) -> bool } */
export function stepCar(car, ctl, dt, ph, T, o = {}) {
  const G = CFG.gravity * G0, g = [0, 0, -G];
  car.steps++;
  if (car.flop > 0) return flopStep(car, dt, ph, T);
  const p0 = car.p.slice();
  car.r = cross(car.u, car.f);
  // 1 PROBE: four wheel rays along -u
  const hw = T.wheelbase / 2, ht = T.track / 2, mounts = [[hw, -ht], [hw, ht], [-hw, -ht], [-hw, ht]], hits = [];
  const dn = mul(car.u, -1), maxR = .5 + T.ride + REACH;
  const surfCount = {};
  for (let i = 0; i < 4; i++) {
    const [lx, ly] = mounts[i], o0 = add(add(add(car.p, car.f, lx), car.r, ly), car.u, .5);
    const h = ph.ray(o0, dn, maxR, ph.notWall || (ph.notWall = c => !ph.wallOnly(c)));
    if (h) { hits.push({ i, point: h.point, normal: dot(h.normal, car.u) < 0 ? mul(h.normal, -1) : h.normal, d: h.toi - .5, surface: h.surface, blockId: h.blockId }); car.d[i] = h.toi - .5; surfCount[h.surface] = (surfCount[h.surface] || 0) + 1; }
    else car.d[i] = T.ride + REACH;
  }
  car.hits = hits.length;
  // 2 SURFACE: the plane through the four contacts (smooth on a faceted mesh)
  let n = null, dbar = 0;
  if (hits.length === 4) { n = norm(cross(sub(hits[1].point, hits[2].point), sub(hits[0].point, hits[3].point))); if (dot(n, car.u) < 0) n = mul(n, -1); }
  else if (hits.length >= 2) n = norm(hits.reduce((s, h) => add(s, h.normal), [0, 0, 0]));
  if (n) dbar = hits.reduce((s, h) => s + h.d, 0) / hits.length;
  const was = car.grounded;
  // 3 CONTACT: does the surface hold the car this step?
  if (n) {
    const vn = dot(car.v, n), pull = dot(g, n), sp = len(car.v);
    if (was) { const k0 = -dot(sub(n, car.n), sp > 1e-6 ? mul(car.v, 1 / sp) : car.f) / Math.max(1 / 16, sp * dt); car.kappa += (k0 - car.kappa) * Math.min(1, dt / .04); } else car.kappa = 0;
    const vt2 = Math.max(0, sp * sp - vn * vn), aEff = T.A * Math.min(1, Math.sqrt(vt2) / 15);
    car.load = vt2 * car.kappa - pull + aEff;
    car.slip = car.load >= 0 ? 0 : car.slip + dt;
    car.grounded = was ? (car.slip < .06 && dbar < T.ride + REACH) : (vn < 0 && dbar < T.ride + REACH * .6);
    if (car.grounded && !was) {   // landing
      car.impact = -vn;
      if (dot(car.u, n) < .3) { car.grounded = false; startFlop(car, ph); return; }
      car.v = sub(car.v, mul(n, vn));
      car.v = mul(car.v, 1 - clamp((car.impact - 6) * CFG.landLoss, 0, .25));
      car.ev.push({ type: 'land', impact: car.impact, air: car.air });
      car.airMax = Math.max(car.airMax, car.air); car.air = 0;
    }
  } else car.grounded = false;
  const steer = clamp(ctl.steer || 0, -1, 1), gas = clamp(ctl.gas || 0, 0, 1), brake = clamp(ctl.brake || 0, 0, 1);
  car.gasOn = gas; car.brakeOn = brake > .1;
  if (car.grounded) {
    // 4 GROUNDED
    car.u = norm(add(car.u, sub(n, car.u), Math.min(1, 30 * dt)));
    car.f = norm(sub(car.f, mul(car.u, dot(car.f, car.u)))); car.r = cross(car.u, car.f);
    car.v = sub(car.v, mul(n, dot(car.v, n)));
    const best = Object.keys(surfCount).sort((a, b) => surfCount[b] - surfCount[a])[0] || 'road';
    car.surface = best; const SU = SURF(best), mu = SU[T.id] ?? 1;
    car.blockId = (hits.find(h => h.surface === best) || hits[0] || {}).blockId ?? null;
    const s = dot(car.v, car.f), spd = len(car.v), vhat = spd > 1e-6 ? mul(car.v, 1 / spd) : car.f;
    let a = sub(g, mul(n, dot(g, n)));
    const traction = mu * Math.max(0, car.load);
    if (gas > 0 && s < T.vtop) { const q = Math.max(s, 0) / T.vtop; a = add(a, car.f, Math.min(traction, gas * (T.A0 * (1 - Math.pow(q, 1.6)) + (T.cd * T.vtop * T.vtop + SU.roll) * q * q))); }   // (the thrust meets the drag at vtop: the car reaches its top speed)
    if (brake > 0) {
      if (s > .5) { const dec = Math.min(traction, brake * T.B, spd / dt); a = add(a, vhat, -dec); }
      else if (s > -T.vrev) a = add(a, car.f, -Math.min(traction, brake * T.Arev));
    }
    if (gas === 0 && spd > .05) a = add(a, vhat, -Math.min(1.2, spd / dt));
    if (spd > .05) a = add(a, vhat, -Math.min(SU.roll, spd / dt));
    a = add(a, car.v, -T.cd * spd);
    if (car.boostT > 0) { a = add(a, car.f, CFG.boostAccel); car.boostT -= dt; }
    // steering: a bicycle model, the lock narrowing with speed; brake + steer at speed drifts
    const dmax = T.dLo + (T.dHi - T.dLo) * Math.pow(clamp(Math.abs(s) / T.vtop, 0, 1), .7);
    car.drift = brake > .5 && Math.abs(steer) > .5 && s > 60 * KMH;
    const yaw = s * Math.tan(steer * dmax) / T.wheelbase * (car.drift ? 1.3 : 1);
    car.f = rotate(car.f, car.u, yaw * dt); car.r = cross(car.u, car.f);
    car.steerVis = steer * dmax;
    // grip: the lateral speed the tyres take away this step
    const vlat = dot(car.v, car.r), maxDv = T.grip * mu * (Math.max(0, car.load) / G) * (car.drift ? T.driftGrip : 1) * dt;
    const dv = clamp(-vlat, -maxDv, maxDv); car.v = add(car.v, car.r, dv); car.slide = Math.max(0, Math.abs(vlat) - Math.abs(dv)) / dt * dt;
    car.slideAmt = Math.abs(vlat);
    car.v = add(car.v, a, dt); car.p = add(car.p, car.v, dt);
    car.p = add(car.p, n, (T.ride - dbar) * Math.min(1, 25 * dt));
    car.n = n;
    // boost pads: a kick once per pad, re-armed after leaving it
    const onPad = hits.some(h => h.surface === 'boost');
    if (onPad) {
      const pid = (hits.find(h => h.surface === 'boost') || {}).blockId;
      if (car.padArmed !== pid) { car.padArmed = pid; const sp2 = dot(car.v, car.f), add2 = Math.max(0, Math.min(CFG.boostDv, T.vtop * 1.3 - sp2)); car.v = add(car.v, car.f, add2); car.boostT = CFG.boostTime; car.ev.push({ type: 'boost' }); }
    } else car.padArmed = null;
    // 7 LANE ASSIST on loops
    if (o.assist && CFG.loopAssist > 0) laneAssist(car, dt, o.assist);
  } else {
    // 5 AIRBORNE
    car.v = add(car.v, g, dt); const sp = len(car.v); car.v = sub(car.v, mul(car.v, T.cd * .3 * sp * dt)); car.p = add(car.p, car.v, dt); car.air += dt;
    car.f = rotate(car.f, car.u, steer * T.airYaw * dt);
    if (sp > 2) { const vh = mul(car.v, 1 / sp); car.f = norm(add(car.f, sub(vh, car.f), Math.min(1, 1.5 * dt))); }
    car.r = norm(cross(car.u, car.f)); car.u = norm(cross(car.f, car.r));
    car.u = norm(add(car.u, sub(Z, car.u), Math.min(1, .8 * dt))); car.r = norm(cross(car.u, car.f)); car.f = norm(cross(car.r, car.u));
    car.n = car.u.slice(); car.drift = false; car.slide = 0; car.slideAmt = 0; car.steerVis = steer * T.dLo * .5;
    if (car.boostT > 0) car.boostT -= dt;
    // on its roof or side: the wheels can't feel the ground, the body can: touching down, it flops back onto its wheels
    if (dot(car.u, Z) < .3 && car.v[2] <= 0) { const h = ph.ray(add(car.p, Z, .6), [0, 0, -1], 1.5, ph.notWall || (ph.notWall = c => !ph.wallOnly(c))); if (h) { car.p[2] = h.point[2] + .75; car.v = mul(car.v, .5); car.v[2] = 0; startFlop(car, ph); return; } }
  }
  // 6 WALLS: the chassis box swept from where it was to where it is
  walls(car, p0, dt, ph, T);
  // stuck on the roof, or sat still upside down: flop back onto the wheels
  if (!car.grounded && len(car.v) < 2 && dot(car.u, Z) < .3) { car.stuckT += dt; if (car.stuckT > .5) startFlop(car, ph); } else car.stuckT = 0;
  car.kmh = len(car.v) * 3.6;
}
function walls(car, p0, dt, ph, T) {
  const half = [T.L / 2, T.W / 2, .45];
  car.wall = Math.max(0, car.wall - dt); car.scrape = Math.max(0, car.scrape - dt * 4);
  let m = sub(car.p, p0), pos = p0.slice();
  if (len(m) < 1e-6) return;
  const q = quatFromFrame(car.f, car.r, car.u), rot = { x: q[0], y: q[1], z: q[2], w: q[3] };
  for (let pass = 0; pass < 3 && len(m) > 1e-5; pass++) {
    const h = ph.castBox(add(pos, car.u, .35), rot, m, half, 1);
    if (!h || Math.abs(dot(h.normal, car.u)) > .65) { pos = add(pos, m); m = [0, 0, 0]; break; }   // (ground-like: the wheels own it)
    const nw = h.normal, t = Math.max(0, h.toi - .002);
    pos = add(pos, m, t);
    const vN = dot(car.v, nw);
    if (vN < 0) {
      car.v = sub(car.v, mul(nw, vN * (1 + CFG.wallE)));
      car.v = mul(car.v, 1 - .1 * Math.min(1, Math.abs(vN) / 10));
      // the nose turns toward the wall's tangent (a glancing hit slides along it)
      const tang = sub(car.f, mul(nw, dot(car.f, nw)));
      if (len(tang) > .1 && dot(car.f, nw) < 0) {
        const tn = norm(tang), ang = Math.acos(clamp(dot(car.f, tn), -1, 1)), ax = cross(car.f, tn);
        if (ang > 1e-3 && len(ax) > 1e-4) { car.f = rotate(car.f, norm(ax), Math.min(.25, ang)); car.f = norm(sub(car.f, mul(car.u, dot(car.f, car.u)))); car.r = cross(car.u, car.f); }
      }
      if (car.wall <= 0 || Math.abs(vN) > 4) car.ev.push({ type: 'wall', impact: Math.abs(vN), at: h.witness, crash: Math.abs(vN) > 15 });
      car.wall = .15; car.scrape = 1;
    }
    const rest = mul(m, 1 - t); m = sub(rest, mul(nw, Math.min(0, dot(rest, nw)) * 1.02));
  }
  car.p = pos;
  if (ph.overlapsBox(add(car.p, car.u, .35), rot, [half[0] * .95, half[1] * .95, half[2] * .9])) { car.p = p0; car.v = mul(car.v, .6); }
}
function laneAssist(car, dt, assistOf) {
  const B = car.blockId, S = assistOf(B);
  if (!S) { car.assistB = null; return; }
  if (car.assistB !== B) { car.assistB = B; car.assistI = -1; }
  let best = -1, bd = 1e9; const a = car.assistI < 0 ? 0 : Math.max(0, car.assistI - 6), b = car.assistI < 0 ? S.length - 1 : Math.min(S.length - 1, car.assistI + 10);
  for (let i = a; i <= b; i++) { const q = S[i], d = (q.p[0] - car.p[0]) ** 2 + (q.p[1] - car.p[1]) ** 2 + (q.p[2] - car.p[2]) ** 2; if (d < bd) { bd = d; best = i; } }
  if (best < 0) return; car.assistI = best;
  const q = S[best], e = dot(sub(car.p, q.p), car.r), edot = dot(car.v, car.r) - dot(q.t, car.r) * dot(car.v, car.f);
  const k = clamp(-.35 * e - .08 * edot, -1, 1) * 1.2 * CFG.loopAssist;
  car.f = rotate(car.f, car.u, k * dt); car.r = cross(car.u, car.f);
}
function startFlop(car, ph) {
  const gnd = ph.groundBelow(car.p[0], car.p[1], car.p[2] + 3);
  const n = gnd ? gnd.normal : Z, up = dot(n, Z) < 0 ? mul(n, -1) : n;
  let f = sub(car.f, mul(up, dot(car.f, up))); if (len(f) < .1) f = sub(car.v, mul(up, dot(car.v, up))); if (len(f) < .1) f = [1, 0, 0]; f = norm(f);
  car.flopFrom = { f: car.f.slice(), u: car.u.slice(), p: car.p.slice() };
  car.flopTo = { f, u: up, p: gnd ? [car.p[0], car.p[1], gnd.z + .7] : car.p.slice() };
  car.flop = .6; car.v = mul(car.v, .3); car.grounded = false; car.ev.push({ type: 'flop' });
}
function flopStep(car, dt, ph, T) {
  car.flop -= dt; const k = 1 - Math.max(0, car.flop) / .6, e = k * k * (3 - 2 * k), A = car.flopFrom, B = car.flopTo;
  car.u = norm(add(A.u, sub(B.u, A.u), e)); if (len(car.u) < .1) car.u = B.u.slice();
  car.f = norm(sub(add(A.f, sub(B.f, A.f), e), mul(car.u, dot(add(A.f, sub(B.f, A.f), e), car.u)))); car.r = cross(car.u, car.f);
  car.p = add(A.p, sub(add(B.p, B.u, T.ride), A.p), e);
  car.v = [0, 0, 0];
  if (car.flop <= 0) { car.flop = 0; car.grounded = false; car.n = car.u.slice(); car.p = add(car.p, car.u, .2); }
  car.kmh = 0;
}
/** the state's hash (determinism tests) */
export function carHash(car) { let h = 0; for (const v of [...car.p, ...car.v, ...car.f, ...car.u]) h = (h * 31 + Math.round(v * 1e4)) | 0; return h; }
