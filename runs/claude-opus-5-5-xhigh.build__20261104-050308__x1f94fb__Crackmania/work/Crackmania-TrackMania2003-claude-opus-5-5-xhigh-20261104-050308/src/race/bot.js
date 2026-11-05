// CRACKMANIA autopilot (PLAN §4.8): used by tests, medal baking, Survival rivals, attract mode and Dev Mode.
// A racing line over the route's samples, a speed profile, pure-pursuit steering; skill 1 without cheats = the author.
import { CFG, G0, KMH } from '../config.js';
import { dot, sub, add, mul, len, norm, cross, clamp } from '../lib/v3.js';
import { SECTION } from '../track/geometry.js';
import { tuning } from '../car/sim.js';

const E = globalThis.My3D2dge;
export class Plan {
  /** course: a Course; model: the car; skill 0..1 */
  constructor(course, model, skill = 1, seed = 1) {
    const S = course.samples, n = S.length, T = tuning(model), hw0 = SECTION[course.env].hw - 2;
    this.S = S; this.n = n; this.T = T; this.skill = skill; this.model = model;
    const rnd = E && E.rng ? E.rng(seed) : mulberry(seed);
    // curvature in the surface plane (signed: + bends right)
    const k = new Float64Array(n);
    for (let i = 1; i < n - 1; i++) { const a = S[i - 1], b = S[i + 1], ds = Math.max(.5, len(sub(b.p, a.p))); k[i] = dot(sub(b.t, a.t), S[i].r) / ds; }
    // the racing line: lateral offsets smoothed toward the inside of bends
    const e = new Float64Array(n), fixed = i => { const f = S[i].flags; return f === 'loop' || f === 'kicker' || f === 'landing' || f === 'boost' || f === 'air' || f === 'gate'; };
    const lazy = .8 * (.6 + .4 * skill);   // (.8: the scale of the apex line that drives fastest over the fifteen tracks)
    for (let it = 0; it < 80; it++) for (let i = 1; i < n - 1; i++) {
      if (fixed(i)) { e[i] = 0; continue; }
      e[i] = clamp(e[i] + .5 * ((e[i - 1] + e[i + 1]) / 2 - e[i]) + .3 * k[i] * hw0 * 1, -hw0, hw0);
    }
    for (let i = 0; i < n; i++) e[i] *= lazy;
    this.e = e;
    this.q = S.map((s, i) => add(s.p, s.r, e[i]));
    // curvature of the line itself
    const kl = new Float64Array(n);
    for (let i = 2; i < n - 2; i++) { const a = this.q[i - 2], b = this.q[i], c = this.q[i + 2], t1 = norm(sub(b, a)), t2 = norm(sub(c, b)), ds = (len(sub(b, a)) + len(sub(c, b))) / 2; kl[i] = Math.abs(dot(sub(t2, t1), S[i].r)) / Math.max(.5, ds); }
    // speed profile: what the grip allows, then braking backward and acceleration forward
    const vmax = new Float64Array(n), skG = .75 + .25 * skill, G = CFG.gravity * G0;
    for (let i = 0; i < n; i++) {
      const s = S[i], f = s.flags, mu = (CFG.surf[s.surface] || CFG.surf.road)[model] ?? 1, bank = s.u ? Math.max(0, Math.asin(clamp(Math.hypot(s.u[0], s.u[1]), 0, 1))) : 0;
      if (f === 'loop' || f === 'kicker' || f === 'air' || f === 'landing') { vmax[i] = T.vtop * 1.3; continue; }
      const alat = skG * T.grip * mu * 1.15 + G * Math.sin(bank) * .9, kk = Math.max(kl[i], 1e-4);
      vmax[i] = Math.min(T.vtop * 1.3, Math.sqrt(alat / kk));
    }
    const Bk = Math.min(T.B, T.grip * 1.1) / (1.25 - .25 * skill);
    for (let i = n - 2; i >= 0; i--) { const ds = len(sub(S[i + 1].p, S[i].p)), f = S[i].flags; if (f === 'air') continue; vmax[i] = Math.min(vmax[i], Math.sqrt(vmax[i + 1] ** 2 + 2 * Bk * ds)); }
    const fwd = new Float64Array(n); fwd[0] = 0;
    for (let i = 1; i < n; i++) { const ds = len(sub(S[i].p, S[i - 1].p)), v = fwd[i - 1], a = Math.max(0, T.A0 * (1 - Math.pow(Math.min(1, v / T.vtop), 1.6)) - T.cd * v * v); fwd[i] = Math.min(vmax[i], Math.sqrt(v * v + 2 * a * ds) + (S[i].flags === 'boost' ? CFG.boostDv * .5 : 0)); }
    this.v = vmax; this.vf = fwd;
    this.jitter = (1 - skill) * .4; this.rnd = rnd;
    // the jumps: the speed the plan reaches at each kicker's lip, and what the gap needs
    this.jumps = [];
    for (let i = 1; i < n; i++) if (S[i].flags === 'kicker' && S[i + 1] && S[i + 1].flags !== 'kicker') {
      let j = i + 1; while (j < n && S[j].flags === 'air') j++;
      const gapLen = len(sub(S[j] ? S[j].p : S[i].p, S[i].p)), drop = S[i].p[2] - (S[j] ? S[j].p[2] : S[i].p[2]);
      this.jumps.push({ i, gap: gapLen, drop, have: fwd[i], need: Math.sqrt(G * Math.max(8, gapLen - drop * 2) / Math.sin(30 * Math.PI / 180)) * .9 });
    }
  }
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/** a driver: drive(car) -> { steer, gas, brake, respawn } each step */
export class Bot {
  constructor(plan, o = {}) { this.P = plan; this.i = 0; this.cheat = !!o.cheat; this.offT = 0; this.slowT = 0; this.flops = 0; this.lateBrake = o.lateBrake ?? 2.5; this.speedMul = o.speedMul ?? (.88 + .12 * Math.min(1, plan.skill)); this.t = 0; }
  reset(i = 0) { this.i = i; this.offT = 0; this.slowT = 0; }
  /** the nearest route sample after the last one (a window: never jump between a loop's lanes) */
  locate(car) {
    const P = this.P, a = Math.max(0, this.i - 4), b = Math.min(P.n - 1, this.i + 15); let best = this.i, bd = 1e18;
    for (let i = a; i <= b; i++) { const q = P.S[i].p, d = (q[0] - car.p[0]) ** 2 + (q[1] - car.p[1]) ** 2 + (q[2] - car.p[2]) ** 2 * 2; if (d < bd) { bd = d; best = i; } }
    this.i = best; return Math.sqrt(bd);
  }
  /** after a respawn: find the sample nearest the car anywhere (it may be far back) */
  relocate(car) {
    const P = this.P; let best = 0, bd = 1e18;
    for (let i = 0; i < P.n; i++) { const q = P.S[i].p, d = (q[0] - car.p[0]) ** 2 + (q[1] - car.p[1]) ** 2 + (q[2] - car.p[2]) ** 2 * 4; if (d < bd) { bd = d; best = i; } }
    this.i = best;
  }
  drive(car, dt, racing = true) {
    const P = this.P, T = P.T, off = this.locate(car), i = this.i, S = P.S[i];
    this.t += dt;
    if (car.flop > 0) return { steer: 0, gas: 0, brake: 0 };
    if (!car.grounded) return { steer: 0, gas: 1, brake: 0 };
    const sp = len(car.v), s = dot(car.v, car.f);
    // the point ahead on the line
    const look = 6 + .35 * sp + (P.jitter ? (P.rnd() - .5) * 2 * P.jitter : 0);
    let j = i, acc = 0; while (j < P.n - 1 && acc < look) { acc += len(sub(P.q[j + 1], P.q[j])); j++; }
    const d = sub(P.q[j], car.p), fx = dot(d, car.f), rx = dot(d, car.r), alpha = Math.atan2(rx, Math.max(.1, fx));
    const dmax = T.dLo + (T.dHi - T.dLo) * Math.pow(clamp(Math.abs(s) / T.vtop, 0, 1), .7);
    const steer = clamp(1.6 * alpha / dmax, -1, 1);
    // target speed: the profile a little ahead (brakes in time)
    let tgt = P.v[i]; for (let k = 1; k <= 3 && i + k < P.n; k++) tgt = Math.min(tgt, P.v[i + k] + (this.lateBrake * k));
    tgt *= this.speedMul;
    let gas = s < tgt - .5 ? 1 : s < tgt + 1 ? .4 : 0, brake = s > tgt + 1 ? clamp((s - tgt) / 5, 0, 1) : 0;
    if (s < 3) { gas = 1; brake = 0; }
    // recovery: off the route a while, stuck, or flopped twice
    let respawn = false;
    const hw = SECTION.dustbowl.hw;
    if (racing) {
      if (off > hw + 4) this.offT += dt; else this.offT = 0;
      if (sp < 1) this.slowT += dt; else this.slowT = 0;
      if (this.offT > .6 || this.slowT > 1.5) { respawn = true; this.offT = this.slowT = 0; }
    }
    // cheats (attract / demo): pull toward the line, never stuck
    if (this.cheat) { const q = P.q[i], pull = sub(q, car.p), lat = dot(pull, car.r), m = clamp(lat, -4 * dt, 4 * dt); car.p = add(car.p, car.r, m); }
    return { steer, gas, brake, respawn };
  }
}
