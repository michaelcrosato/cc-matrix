/* 30-train: the trains you drive and their dynamics. One lever: EB, B8..B1, N, P1..P5 (the train decides how many).
 * Speeds in km/h, accelerations in km/h/s (1 km/h/s = 0.2778 m/s2), position in metres. Traction and brakes lag their
 * targets (the brakes slower), resistance grows with speed, gradients pull, and wet rails slip and slide. The same
 * step function runs the autopilot's predictions, so what it plans is what the train does. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, { clamp } = E;
DH.TRAINS = {
  h8000: { id: 'h8000', name: 'HALO 8000', notchP: 5, notchB: 8, a0: [.8, 1.4, 2.0, 2.6, 3.2], vk: [15, 25, 35, 40, 45], bStep: .5, eb: 1, lagK: 1, tauRel: .5, tauP: .3, vmax: 110, livery: 'h8000', sound: 'vvvf', cab: 'modern' },
  h3000: { id: 'h3000', name: 'HALO 3000', notchP: 4, notchB: 7, a0: [.7, 1.3, 1.9, 2.5], vk: [18, 28, 36, 42], bStep: .55, eb: .92, lagK: 1.57, tauRel: .8, tauP: .5, vmax: 100, livery: 'h3000', sound: 'resistor', cab: 'classic' }
};
const RES = [.03, .0005, .000012];
/** a lever position's name: 'EB', 'B8'..'B1', 'N', 'P1'..'P5' */
DH.notchName = (n, ty) => n === 0 ? 'N' : n > 0 ? 'P' + n : n <= -(ty.notchB + 1) ? 'EB' : 'B' + (-n);
/** the model, one step: st { v (km/h), P, B, slipT, slide, a, jerk }, n the lever, env { grade (permille), wet,
 *  doors (closed: true), T (tuning), ty (train) }. Pure: the autopilot steps copies of it */
DH.trainStep = (st, n, dt, env) => {
  const T = env.T, ty = env.ty, ebN = -(ty.notchB + 1), eb = n <= ebN, v = st.v, av = Math.abs(v);
  let tgtP = 0;
  if (n > 0 && env.doors && !eb && !env.cut) { const i = n - 1; tgtP = ty.a0[i] * T.accelScale * Math.min(1, ty.vk[i] / Math.max(av, 1)) * clamp((ty.vmax - av) / 5, 0, 1); }
  let tgtB = eb ? T.ebDecel * ty.eb : n < 0 ? ty.bStep * (-n) * T.brakeScale : 0;
  if (env.hold) tgtB = Math.max(tgtB, ty.bStep * 3);   // the holding brake while the doors are open
  st.P += (tgtP - st.P) * (1 - Math.exp(-dt / ty.tauP));
  const tau = tgtB > st.B ? Math.max(.02, T.brakeLag * ty.lagK) : ty.tauRel;
  st.B += (tgtB - st.B) * (1 - Math.exp(-dt / (eb ? .3 : tau)));
  const adh = env.wet ? T.adhesionRain : 6;
  // wheel slip under power (the SLIP lamp; traction drops for .8 s), slide under braking (WSP holds the brake at 85%)
  if (st.slipT > 0) st.slipT -= dt;
  if (st.P > adh && av > .5 && st.slipT <= 0) { st.slipT = .8; st.slips = (st.slips || 0) + 1; }
  const P = st.slipT > 0 ? st.P * .4 : st.P;
  st.slide = st.B > adh && av > 1;
  const B = st.slide ? adh * .85 : st.B;
  const res = av > .01 ? (RES[0] + RES[1] * av + RES[2] * av * av) * T.resistScale : 0;
  const grd = -.0353 * (env.grade || 0) * T.gradeScale;
  let a;
  if (v > .01) { a = P - B - res + grd; let vn = v + a * dt; if (vn < 0) vn = B < .2 && grd < 0 ? vn : 0; st.v = vn; }
  else if (v < -.01) { a = P + B + res + grd; let vn = v + a * dt; if (vn > 0) vn = P + grd > 0 ? vn : 0; st.v = vn; }   // rolling back: brakes and drag push forward
  else {
    const drive = P + grd;   // standing: the brakes (and the bearings' stiction, about 4 permille) hold until what pushes beats them
    if (Math.abs(drive) > B + .15) { a = drive - Math.sign(drive) * B; st.v = v + a * dt; } else { a = 0; st.v = 0; }
  }
  const j = (a - st.a) / dt; st.jerk += (j - st.jerk) * (1 - Math.exp(-dt / .25)); st.a = a;
  st.Pe = P; st.Be = B;
  return st;
};
/** the train you drive: the lever, the model, its distance */
class Train {
  constructor(type = 'h8000') { this.ty = DH.TRAINS[type] || DH.TRAINS.h8000; this.reset(); }
  reset(v = 0) { this.notch = 0; this.st = { v, P: 0, B: 0, a: 0, jerk: 0, slipT: 0, slide: false, slips: 0 }; this.ebUsedAt = -1e9; this.leverT = 0; this.lastChange = []; return this; }
  get ebN() { return -(this.ty.notchB + 1); }
  get v() { return this.st.v; }
  get name() { return DH.notchName(this.notch, this.ty); }
  get isEB() { return this.notch <= this.ebN; }
  /** move the lever by d positions (+ toward power); EB can only be left standing still. Returns true if it moved */
  move(d, now = 0) {
    if (this.isEB && d > 0 && Math.abs(this.st.v) > .05) { this.blocked = 'EB'; return false; }
    const n = clamp(this.notch + d, this.ebN, this.ty.notchP); if (n === this.notch) return false;
    this.notch = n; this.lastChange.push(now); if (this.lastChange.length > 6) this.lastChange.shift(); this.leverT = 0; return true;
  }
  set(n, now = 0) { n = clamp(n, this.ebN, this.ty.notchP); if (n === this.notch) return false; if (this.isEB && n > this.ebN && Math.abs(this.st.v) > .05) return false; this.notch = n; this.lastChange.push(now); this.leverT = 0; return true; }
  emergency(now = 0) { if (this.isEB) return false; this.notch = this.ebN; this.ebUsedAt = now; this.lastChange.push(now); return true; }
  step(dt, env) { this.leverT += dt; DH.trainStep(this.st, this.notch, dt, Object.assign({ ty: this.ty }, env)); return this.st; }
}
DH.Train = Train;
/** a quick prediction: where the train stops holding lever n from here (metres), simulated at h s steps */
DH.predictStop = (st0, n, env, h = .1, maxT = 90) => {
  const st = Object.assign({}, st0); let d = 0, t = 0;
  while (st.v > .05 && t < maxT) { DH.trainStep(st, n, h, env); d += st.v / 3.6 * h; t += h; }
  return { d, t };
};
})();
