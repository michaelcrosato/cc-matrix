/* Densha de Halo! · 30-train: the train's dynamics and the master controller (section 4.3). Pure: no engine, no drawing.
 * Each step (1/120 s): the lever's commands become traction P and brake B (lagged by first-order filters), resistance
 * and gradient act, adhesion limits slip and slide, and the train moves. Speeds in km/h, accelerations in km/h/s. */
(() => {
'use strict';
const DH = window.DH;

class Train {
  /** spec: a DH.TRAINS entry; opts: { s, v } */
  constructor(spec, opts = {}) {
    this.spec = spec; this.s = opts.s || 0; this.v = (opts.v || 0); this.dir = 1;
    this.notch = 0; this.eb = false; this.P = 0; this.B = 0; this.a = 0; this.aPrev = 0; this.jerk = 0;
    this.slipT = 0; this.slide = false; this.slipCount = 0; this.slideCount = 0; this.rolled = 0; this.ebUsed = false;
    this.ebTimer = 0; this.dist = 0; this.maxA = 0; this.minA = 0;
    this.hist = [];   // (distance, speed, notch) samples for the stop-gauge and the autopilot
  }
  get length() { return this.spec.cars * this.spec.carLen; }
  get front() { return this.s; }
  get rear() { return this.s - this.length; }
  get vms() { return this.v / 3.6; }
  get brakeNotchMax() { return this.spec.notchesB; }
  get powerNotchMax() { return this.spec.notchesP; }
  /** the lever's name for display: P3, N, B5, EB */
  get notchName() { return this.eb ? 'EB' : this.notch > 0 ? 'P' + this.notch : this.notch < 0 ? 'B' + -this.notch : 'N'; }

  // the lever: one notch per press, through the brake first; EB only comes off at standstill
  power(doorsClosed = true) {
    if (this.eb) { if (Math.abs(this.v) < 0.5) { this.eb = false; this.notch = 0; return true; } return false; }
    if (this.notch < this.spec.notchesP) { this.notch++; return true; }
    return false;
  }
  brake() { if (this.eb) return false; if (this.notch > -this.spec.notchesB) { this.notch--; return true; } return false; }
  neutral() { if (!this.eb) this.notch = 0; }
  emergency() { if (!this.eb) { this.eb = true; this.ebUsed = true; this.ebCount = (this.ebCount || 0) + 1; } }

  /** one fixed step. env: { grade: permille at this point, dry: boolean, traction: boolean (doors closed, pilot lit) } */
  step(dt, env) {
    const T = DH.TUNING, sp = this.spec, grade = (env.grade || 0) * T.gradeScale;
    const vk = this.v;   // km/h
    const av = Math.abs(vk);
    // traction and brake targets (km/h/s)
    let tgtP = 0, tgtB = 0;
    if (this.notch > 0 && env.traction !== false && !this.eb) {
      const a0 = sp.a[Math.min(this.notch, sp.a.length) - 1] * T.accelScale, vkn = sp.vk[Math.min(this.notch, sp.vk.length) - 1];
      tgtP = a0 * Math.min(1, vkn / Math.max(av, 1)) * DH.clamp((sp.vmax - av) / 5, 0, 1);
    }
    if (this.eb) tgtB = T.ebDecel;
    else if (this.notch < 0) tgtB = sp.brakeUnit * -this.notch * T.brakeScale;
    // the lags: traction is quick, brakes apply slowly and release at their own pace
    const aP = 1 - Math.exp(-dt / (this.eb ? 0.3 : sp.tauP));
    this.P += (tgtP - this.P) * aP;
    const tauApply = this.eb ? 0.3 : (sp.tauApply * (T.brakeLag / 0.7));
    const tau = tgtB > this.B ? Math.max(0.01, tauApply) : sp.tauRelease;
    this.B += (tgtB - this.B) * (1 - Math.exp(-dt / Math.max(0.01, tau)));
    // adhesion: wet rail lets the wheels slip under power and slide under the brakes
    const adh = env.dry === false ? T.adhesionRain : 6.0;
    if (this.P > adh) { this.P *= .4; this.slipT = .8; this.slipCount++; }
    if (this.slipT > 0) this.slipT -= dt;
    if (this.B > adh) { this.B = adh * .85; this.slide = true; this.slideCount++; } else this.slide = false;
    // resistance and gradient, as decelerations
    const res = (sp.r0 + sp.r1 * av + sp.r2 * av * av) * T.resistScale;
    const grd = -0.0353 * grade;
    const sv = Math.sign(vk);
    let a;
    if (vk === 0) {
      const force = this.P + grd;
      if (Math.abs(force) <= this.B) a = 0; else a = force - Math.sign(force) * this.B;
    } else {
      a = this.P - this.B * sv - res * sv + grd;
    }
    let vn = vk + a * dt;
    if (vk !== 0 && Math.sign(vn) !== sv && (this.B > 0 || this.eb)) vn = 0;   // brakes don't reverse the train
    if (vk !== 0 && Math.abs(vn) < 1e-6) vn = 0;
    this.aPrev = this.a; this.a = a;
    const jerkRaw = (a - this.aPrev) / dt;
    this.jerk += (jerkRaw - this.jerk) * 0.05;
    this.v = vn;
    const ds = this.v / 3.6 * dt;
    this.s += ds; this.dist += Math.abs(ds);
    if (this.eb && Math.abs(this.v) < 0.01) this.ebTimer += dt;
    if (this.v < 0) this.rolled += Math.abs(ds);
    this.maxA = Math.max(this.maxA, a); this.minA = Math.min(this.minA, a);
    return { a, jerk: this.jerk };
  }

  /** a snapshot of the lever and the dynamics for a display or a checkpoint */
  state() { return { s: this.s, v: this.v, notch: this.notch, eb: this.eb, P: this.P, B: this.B, a: this.a, jerk: this.jerk, slip: this.slipT > 0, slide: this.slide }; }
}

/* the dynamics in isolation: how far and how long a braking run takes from speed v0 (km/h) with notch n, on level track
 * (used by tests, the autopilot's look-ahead and the stop gauge's braking guide) */
DH.simBrake = (spec, v0, notch, opts = {}) => {
  const t = new Train(spec, { v: v0 });
  t.notch = -notch;
  const dt = DH.FIXED; let time = 0;
  for (let i = 0; i < 120 * 120 && t.v > 0.01; i++) { t.step(dt, { grade: opts.grade || 0, dry: true }); time += dt; }
  return { dist: t.dist, time };
};
DH.simAccel = (spec, notch, v1, opts = {}) => {
  const t = new Train(spec, { v: 0 }); t.notch = notch;
  let time = 0; const dt = DH.FIXED;
  for (let i = 0; i < 120 * 300 && t.v < v1; i++) { t.step(dt, { dry: true, grade: opts.grade || 0 }); time += dt; }
  return { time, dist: t.dist };
};

DH.Train = Train;
})();
