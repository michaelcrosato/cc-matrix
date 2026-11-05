// CarSim: a kinematic surface-following arcade car (not a physics body). Each fixed step it probes the track with four
// wheel rays, follows the surface with velocity-level constraints, and flies ballistically when the surface can't hold
// it: fast enough holds a loop, too slow drops off the top. Deterministic. Metres, seconds, x east, y south, z up.
import { cross, add, sub, dot, len, norm, scale, rotate, clamp, quatFromFrame } from './v3.js';
import { CFG, carSI, surfGrip, SURF } from './config.js';
import { BLOCKS } from './blocks.js';

export const KMH = 3.6;
export function makeCar(carId, frame) {
  const T = carSI(carId);
  const c = {
    id: carId, p: add(frame.p, frame.u, T.ride), v: [0, 0, 0], f: frame.t.slice(), u: frame.u.slice(), n: frame.u.slice(), r: frame.r.slice(),
    grounded: false, kappa: 0, load: 0, slip: 0, air: 0, flop: 0, boostT: 0, drift: false, surface: 'road', blockId: 0,
    wd: [T.ride, T.ride, T.ride, T.ride], steerVis: 0, steerIn: 0, slide: 0, impact: 0, wall: 0, wallT: 0, padArm: true, onPad: false,
    events: [], spin: 0, landT: 0, held: false, gasVis: 0, brakeVis: 0, lean: [0, 0]
  };
  return c;
}
export function placeCar(c, frame, ride) {
  c.p = add(frame.p, frame.u, ride ?? carSI(c.id).ride); c.v = [0, 0, 0]; c.f = frame.t.slice(); c.u = frame.u.slice(); c.n = frame.u.slice(); c.r = frame.r.slice();
  c.grounded = false; c.kappa = 0; c.slip = 0; c.air = 0; c.flop = 0; c.boostT = 0; c.steerIn = 0; c.slide = 0; c.wall = 0; c.padArm = true;
}
export const kmh = c => len(c.v) * KMH;
export const speedAlong = c => dot(c.v, c.f);

/** one fixed step. ctl: { steer -1..1, gas 0..1, brake 0..1, keyboard: steer ramps }. phys: TrackPhysics */
export function stepCar(c, ctl, dt, phys) {
  const T = carSI(c.id), Gm = CFG.gravity * 9.81, g = [0, 0, -Gm];
  c.events.length = 0;
  // steering input: keyboard ramps to full over .12 s and back over .08 s; sticks go straight through
  const want = clamp(ctl.steer * CFG.steerSens, -1, 1);
  if (ctl.keyboard) { const rate = Math.abs(want) > Math.abs(c.steerIn) && Math.sign(want) === Math.sign(c.steerIn || want) ? 1 / .12 : 1 / .08; c.steerIn += clamp(want - c.steerIn, -rate * dt, rate * dt); }
  else c.steerIn = want;
  if (c.flop > 0) return flopStep(c, dt, phys, T);
  const gas = c.held ? 0 : ctl.gas, brake = c.held ? 1 : ctl.brake;
  c.gasVis = ctl.gas; c.brakeVis = brake;
  // 1 PROBE
  const r = cross(c.u, c.f), hits = [], wb = T.wheelbase / 2, tr = T.track / 2, reach = .9;
  const W = [[wb, -tr], [wb, tr], [-wb, -tr], [-wb, tr]];
  for (let i = 0; i < 4; i++) {
    const [lx, ly] = W[i], o = add(add(add(c.p, c.f, lx), r, ly), c.u, .5);
    const h = phys.ray(o, [-c.u[0], -c.u[1], -c.u[2]], .5 + T.ride + reach);
    if (h && !h.wall) { const d = h.toi - .5; hits.push({ point: add(o, c.u, -h.toi), n: h.n, d, surface: h.surface, blockId: h.blockId }); c.wd[i] = d; }
    else c.wd[i] = Math.min(T.ride + reach, c.wd[i] + 6 * dt);
  }
  // 2 SURFACE: the plane through the four contacts (smooth on a faceted mesh)
  let n = null, d = 0;
  if (hits.length === 4) { n = norm(cross(sub(hits[1].point, hits[2].point), sub(hits[0].point, hits[3].point))); if (dot(n, c.u) < 0) n = scale(n, -1); }
  else if (hits.length >= 2) { n = norm(hits.reduce((s, h) => add(s, dot(h.n, c.u) < 0 ? scale(h.n, -1) : h.n), [0, 0, 0])); }
  if (n) d = hits.reduce((s, h) => s + h.d, 0) / hits.length;
  // 3 CONTACT
  const wasGrounded = c.grounded;
  if (n) {
    const vn = dot(c.v, n), pull = dot(g, n);
    const vl = len(c.v);
    const k0 = c.grounded && vl > .1 ? -dot(sub(n, c.n), scale(c.v, 1 / vl)) / Math.max(1e-6, vl * dt) : 0;
    c.kappa = c.grounded ? c.kappa + (k0 - c.kappa) * Math.min(1, dt / .04) : 0;
    const vt2 = Math.max(0, vl * vl - vn * vn), aEff = T.adhesion * Math.min(1, Math.sqrt(vt2) / 15);
    c.load = vt2 * c.kappa - pull + aEff;
    c.slip = c.load >= 0 ? 0 : c.slip + dt;
    c.grounded = c.grounded ? (c.slip < .06 && d < T.ride + reach) : (vn < .5 && d < T.ride + reach * .6);
  } else c.grounded = false;
  if (c.grounded) {
    if (!wasGrounded) {   // landing
      const vn = dot(c.v, n); c.impact = -vn;
      if (dot(c.u, n) < .3) { startFlop(c); return; }
      c.v = sub(c.v, scale(n, vn));
      c.v = scale(c.v, 1 - clamp((c.impact - 6) * CFG.landLoss, 0, .25));
      if (c.air > .25) c.events.push(['land', c.impact, c.air]);
      c.air = 0; c.landT = .25;
    }
    // align to the surface
    c.u = norm(add(c.u, sub(n, c.u), Math.min(1, 30 * dt)));
    c.f = norm(sub(c.f, scale(c.u, dot(c.f, c.u))));
    c.v = sub(c.v, scale(n, dot(c.v, n)));
    const surfCount = {}; for (const h of hits) surfCount[h.surface] = (surfCount[h.surface] || 0) + 1;
    let surface = 'road', best = 0; for (const s in surfCount) if (surfCount[s] > best) { best = surfCount[s]; surface = s; }
    c.surface = surface; c.blockId = (hits.find(h => h.blockId) || hits[0]).blockId;
    const sg = surfGrip(surface, c.id), S = SURF[surface] || SURF.road;
    const sp = dot(c.v, c.f), vl = len(c.v), vh = vl > 1e-4 ? scale(c.v, 1 / vl) : c.f;
    let a = sub(g, scale(n, dot(g, n)));
    const traction = sg * Math.max(0, c.load);
    if (gas > 0 && sp < T.vtop) a = add(a, c.f, Math.min(traction, gas * T.A0 * Math.max(0, 1 - (Math.max(0, sp) / T.vtop) ** 1.6)));
    if (brake > 0) {
      if (sp > .5) { const dec = Math.min(traction, brake * T.B); a = add(a, vh, -Math.min(dec, vl / dt)); }
      else if (!c.held && sp > -T.vrev) a = add(a, c.f, -Math.min(traction, brake * T.Arev));
    }
    if (gas === 0 && vl > .05) a = add(a, vh, -Math.min(1.2, vl / dt));
    if (vl > .05) a = add(a, vh, -Math.min((S.roll ?? .15), vl / dt));
    a = add(a, c.v, -T.cd * vl);
    if (c.boostT > 0) { a = add(a, c.f, CFG.boostAccel); c.boostT -= dt; }
    // steering (a bicycle model); brake + steer at speed = a drift
    const dmax = T.dlo + (T.dhi - T.dlo) * Math.pow(clamp(Math.abs(sp) / T.vtop, 0, 1), .7);
    c.drift = brake > .5 && Math.abs(c.steerIn) > .5 && sp > 60 / KMH;
    const yawRate = sp * Math.tan(c.steerIn * dmax) / T.wheelbase * (c.drift ? 1.3 : 1);
    c.f = norm(rotate(c.f, c.u, yawRate * dt));   // (+ about up turns east toward south: right)
    // grip: lateral velocity taken away, up to what the tyres hold
    const rr = cross(c.u, c.f), vlat = dot(c.v, rr);
    const maxDv = T.grip * sg * clamp(c.load / Gm, 0, 3) * (c.drift ? T.driftGrip : 1) * dt;
    const dv = clamp(-vlat, -maxDv, maxDv); c.v = add(c.v, rr, dv); c.slide = Math.abs(vlat) - Math.abs(dv);
    c.v = add(c.v, a, dt);
    c.p = add(c.p, c.v, dt);
    c.p = add(c.p, n, (T.ride - d) * Math.min(1, 25 * dt));
    c.n = n;
    // boost pads: entering one while grounded
    const onPad = surface === 'boost';
    if (onPad && c.padArm) { const dirv = c.f; c.v = add(c.v, dirv, CFG.boostDv); const L2 = len(c.v); if (L2 > T.vtop * 1.3) c.v = scale(c.v, T.vtop * 1.3 / L2); c.boostT = CFG.boostTime; c.padArm = false; c.events.push(['boost']); }
    if (!onPad) c.padArm = true;
    c.steerVis = c.steerIn * dmax;
    // lane assist on loops
    const B = phys.track.get(c.blockId);
    if (B && BLOCKS[B.type].assist && CFG.loopAssist > 0) laneAssist(c, phys.lines.get(B.id), dt);
  } else {
    // AIRBORNE
    c.v = add(c.v, g, dt); c.v = sub(c.v, scale(c.v, T.cd * .3 * len(c.v) * dt)); c.p = add(c.p, c.v, dt); c.air += dt;
    c.f = norm(rotate(c.f, c.u, c.steerIn * T.airYaw * dt));
    const vl = len(c.v);
    if (vl > 1) { const vh = scale(c.v, 1 / vl); c.f = norm(add(c.f, sub(vh, c.f), Math.min(1, 1.5 * dt))); }
    let rr = norm(cross(c.u, c.f)); c.u = norm(cross(c.f, rr));
    c.u = norm(add(c.u, sub([0, 0, 1], c.u), Math.min(1, .8 * dt)));
    c.f = norm(sub(c.f, scale(c.u, dot(c.f, c.u))));
    c.n = c.u; c.slide = 0; c.drift = false; c.surface = 'air';
    if (c.boostT > 0) c.boostT -= dt;
    // stuck on the roof or the side in a pit: flop over
  }
  c.r = cross(c.u, c.f);
  walls(c, dt, phys, T);
  if (c.landT > 0) c.landT -= dt;
  // stopped upside down or on the side: flop
  if (c.grounded && dot(c.u, [0, 0, 1]) < -.2 && len(c.v) < 3) startFlop(c);
}

function laneAssist(c, line, dt) {
  if (!line) return;
  let bi = 0, bd = 1e9;
  for (let i = 0; i < line.length; i++) { const q = line[i].p, dd = (q[0] - c.p[0]) ** 2 + (q[1] - c.p[1]) ** 2 + (q[2] - c.p[2]) ** 2; if (dd < bd) { bd = dd; bi = i; } }
  const L = line[bi], rr = cross(c.u, c.f), e = dot(sub(c.p, L.p), rr), ed = dot(c.v, rr);
  const turn = clamp(-.35 * e - .08 * ed, -1, 1) * 1.2 * CFG.loopAssist * dt;
  c.f = norm(rotate(c.f, c.u, turn));
  // keep the motion along the lane too
  c.v = add(c.v, rr, clamp(-ed, -6 * dt * CFG.loopAssist, 6 * dt * CFG.loopAssist));
}

// walls: eight rays from the chassis centre (front, back, sides, corners) find barrier faces within the body's outline;
// a ray only ever hits a face (no edge normals at block seams), and the front ray reaches ahead by this step's motion
const WALL_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [.7071, .7071], [.7071, -.7071], [-.7071, .7071], [-.7071, -.7071]];
function walls(c, dt, phys, T) {
  c.wallT = Math.max(0, c.wallT - dt);
  const r = cross(c.u, c.f), hl = T.L / 2 - .15, hwid = T.W / 2 - .05;
  let pushed = false;
  for (const h of [.35, .75]) {
    const o = add(c.p, c.u, h - T.ride + .2);
    for (const [a, b] of WALL_DIRS) {
      // the outline's reach along this direction (a box: the nearer of its two faces)
      const reach = Math.min(a ? hl / Math.abs(a) : 1e9, b ? hwid / Math.abs(b) : 1e9);
      const dir = norm(add(scale(c.f, a), r, b)), ahead = Math.max(0, dot(c.v, dir)) * dt;
      const hit = phys.rayWall(o, dir, reach + ahead + .05);
      if (!hit || hit.toi > reach) continue;
      let nw = hit.n; if (dot(nw, dir) > 0) nw = scale(nw, -1);
      nw = sub(nw, scale(c.u, dot(nw, c.u))); if (len(nw) < .3) continue; nw = norm(nw);
      const depth = (reach - hit.toi) * Math.max(.2, -dot(dir, nw));
      c.p = add(c.p, nw, depth + .005); pushed = true;
      const vN = dot(c.v, nw);
      if (vN < 0) {
        const hard = -vN;
        c.v = sub(c.v, scale(nw, vN * (1 + (hard > 2 ? CFG.wallE : 0))));
        c.v = scale(c.v, 1 - .1 * Math.min(1, hard / 10));
        const tang = sub(c.f, scale(nw, dot(c.f, nw)));
        if (len(tang) > .2) { const tn = norm(tang); c.f = norm(add(c.f, sub(tn, c.f), hard > 2 ? .25 : .06)); c.f = norm(sub(c.f, scale(c.u, dot(c.f, c.u)))); }
        if (c.wallT <= 0 && hard > 1.5) c.events.push(['wall', hard, add(o, dir, hit.toi)]);
        c.impact = hard; c.wall = hard; c.wallT = .15;
      }
    }
  }
  if (pushed) c.r = cross(c.u, c.f);
}

function startFlop(c) { c.flop = .6; c.events.push(['flop']); c.v = scale(c.v, .3); }
function flopStep(c, dt, phys, T) {
  c.flop -= dt;
  // rotate upright about the forward axis, settle onto whatever is below
  const target = [0, 0, 1];
  c.u = norm(add(c.u, sub(target, c.u), Math.min(1, 6 * dt)));
  if (len(cross(c.u, c.f)) < .1) c.f = norm(cross(c.r, c.u));
  c.f = norm(sub(c.f, scale(c.u, dot(c.f, c.u)))); c.r = cross(c.u, c.f);
  const h = phys.ray(add(c.p, [0, 0, 2]), [0, 0, -1], 6);
  if (h) { const gz = c.p[2] + 2 - h.toi + T.ride; c.p[2] += (gz - c.p[2]) * Math.min(1, 10 * dt); c.v = scale(c.v, Math.max(0, 1 - 3 * dt)); c.p = add(c.p, c.v, dt); }
  else { c.v = add(c.v, [0, 0, -CFG.gravity * 9.81 * dt]); c.p = add(c.p, c.v, dt); }
  if (c.flop <= 0) { c.flop = 0; c.u = [0, 0, 1]; c.f = norm([c.f[0], c.f[1], 0]); if (len(c.f) < .1) c.f = [1, 0, 0]; c.r = cross(c.u, c.f); c.grounded = false; }
}
