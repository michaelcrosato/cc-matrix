/* DENSHA DE HALO! · the autopilot: drives a Run by the same lever taps and buttons a player uses.
 * Planner: the constraints over the next 1.5 km (line speed, limit boards, signal aspects, red signals, the next stop,
 * the obstruction) give an allowed speed v_allow(d) = sqrt(vc^2 + 2 a d); the final stop is model-predictive (each brake
 * notch simulated ahead, the one stopping nearest the mark kept, easing to B1 at the end for SMOOTH). Timetable mode
 * picks a cruise cap by bisection so the predicted arrival meets the timetable; min-time mode ("par") drives flat out.
 * Skill 1 is perfect; 0.6 is human-like (reaction delay, speed noise, a stop aim error). Used by attract, Dev Mode, tests
 * and tools/calibrate.mjs. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, clamp = E.clamp;

class Autopilot {
  constructor(run, o = {}) {
    this.run = run; this.skill = o.skill === undefined ? 1 : o.skill; this.mode = o.mode || 'timetable';
    this.rr = DH.rng('auto:' + run.id + ':' + (o.seed || 0)); this.cap = 999; this.capT = 99; this.plan = null; this.planT = 0; this.hornT = 0;
    this.want = 0; this.delayQ = []; this.aimErr = 0; this.noise = 0; this.braking = false; this.lastStopIdx = -1;
  }
  /* the train model, as the run steps it, for prediction */
  _sim(v, B, P, notchPlan, maxT, dtp, grade) {
    const R = this.run, TR = R.T, T = DH.T, adh = R.rain ? T.adhesionRain : 6, lagK = T.brakeLag / .7, tA = TR.lagA * lagK, tR = TR.lagR * lagK;
    let s = 0, t = 0;
    while (t < maxT) {
      const n = notchPlan(v, t);
      const tgtB = n < 0 ? TR.bk * -n * T.brakeScale : 0;
      B += (tgtB - B) * (1 - Math.exp(-dtp / (tgtB > B ? tA : tR)));
      P += (0 - P) * (1 - Math.exp(-dtp / TR.lagP));
      const Be = Math.min(B, B > adh ? adh * .85 : B);
      const res = (.03 + .0005 * v + .000012 * v * v) * T.resistScale, grd = -.0353 * grade * T.gradeScale;
      let a = P + grd - res - Be;
      const v1 = v + a * dtp;
      if (v1 <= 0) { const f = v / Math.max(1e-6, v - v1); s += v / 3.6 * dtp * f * .5; return { s, t: t + dtp * f }; }
      s += (v + v1) / 2 / 3.6 * dtp; v = v1; t += dtp;
    }
    return { s: 1e9, t };
  }
  maxBrake() { const R = this.run, TR = R.T, adh = R.rain ? DH.T.adhesionRain : 6; let n = TR.nb; while (n > 1 && TR.bk * n * DH.T.brakeScale > adh) n--; return n; }
  maxPower() { const R = this.run, TR = R.T, adh = R.rain ? DH.T.adhesionRain : 6; let n = TR.np; while (n > 1 && TR.aP[n] * DH.T.accelScale > adh) n--; return n; }
  aPlan() { const R = this.run, g = R.R.gradeAt(R.wrapS(R.s)); return Math.max(.6, .8 * R.T.bk * Math.min(4, this.maxBrake()) * DH.T.brakeScale - .0353 * Math.max(0, -g) * DH.T.gradeScale * 1.2); }
  /* the speed constraints ahead: [{ d, v }] (v = 0 for a stop point) */
  constraints() {
    const R = this.run, out = [], route = R.R;
    const lim = R.limitNow(); out.push({ d: 0, v: lim.v });
    for (const l of R.limits) { if (l.state !== 'idle') continue; const d = R.dTo(l.s); if (d > 0 && d < 2500) out.push({ d, v: l.v, len: l.until !== null ? R.R.ahead(l.s, l.until) + R.len : 0 }); }
    if (lim.why === 'board' || lim.why === 'slow') { const act = R.limits.find(l => l.state === 'active' && l.v === lim.v && l.until !== null); if (act) out[0].len = Math.max(0, R.R.ahead(R.wrapS(R.rear), R.wrapS(act.until))); }
    // line speed changes ahead
    for (let d = 50; d < 1500; d += 50) { const v = route.lineAt(R.wrapS(R.s + d)); if (v < lim.v) { out.push({ d, v }); break; } }
    for (const { sg, d } of R.nextSignals(4)) {
      if (d < 0) continue;
      if (sg.aspect === 'R') { const sp = R.nextStop; if (!(sp && sp.target < R.s + d && sp.target > R.s - 1)) out.push({ d: d - 25, v: 0, red: true }); break; }
      const av = DH.ASPECT_V[sg.aspect]; if (av < 900) out.push({ d, v: av });
    }
    const sp = R.nextStop; if (sp && R.phase === 'run') out.push({ d: sp.target - R.s + this.aimErr, v: 0, stop: true });
    if (R.cart.active && R.cart.crossing) { const d = R.dTo(R.cart.crossing.s); if (d > 0) out.push({ d: d - 25, v: 0, hazard: true }); }
    if (R.workers) { const d = R.dTo(R.workers.s - 150); }
    if (R.stage.tutorial) {
      const st = R.stage.steps[R.tut.i];
      if (st) { if (st.id === 'p1') out.push({ d: 0, v: 14 }); if (st.id === 'coast' || st.id === 'brake') out.push({ d: 0, v: st.id === 'coast' ? 12 : 3 }); if (st.id === 'limit') out.push({ d: 0, v: 38 }); if (st.id === 'eb') out.push({ d: 0, v: 20 }); }
    }
    return out;
  }
  /* the next timed stop's predicted arrival with a cruise cap (a fast kinematic model) */
  predict(cap) {
    const R = this.run, sp = R.nextStop; if (!sp || sp.arr === null) return null;
    const TR = R.T, aP = this.aPlan(), cons = this.constraints().filter(c => !c.stop);
    let v = R.v, s = 0, t = 0; const D = sp.target - R.s; if (D <= 0) return R.clock;
    const np = this.maxPower();
    for (let i = 0; i < 4000 && s < D; i++) {
      const dt = .25, rem = D - s;
      let vlim = Math.min(cap, Math.sqrt(2 * aP * 3.6 * Math.max(0, rem - 2)) + 1);
      for (const c of cons) { const dd = c.d - s; vlim = Math.min(vlim, dd <= 0 ? ((c.d === 0 && !c.len) || -dd < (c.len || 0) ? c.v : 999) : Math.sqrt(c.v * c.v + 2 * aP * 3.6 * dd)); }
      const gr = R.R.gradeAt(R.wrapS(R.s + s)), acc = TR.aP[np] * DH.T.accelScale * Math.min(1, TR.vk[np] / Math.max(v, 1)) - .1 - .0353 * gr * DH.T.gradeScale - (.03 + .0005 * v + .000012 * v * v);
      if (v < vlim - 1) v = Math.min(vlim, v + Math.max(-1, acc) * dt); else if (v > vlim) v = Math.max(vlim, v - aP * dt);
      v = Math.max(v, .8); s += v / 3.6 * dt; t += dt;
    }
    return R.clock + t + 10;
  }
  /* one step: returns the commands a player would give */
  step(dt) {
    const R = this.run, c = {}, TR = R.T, nb = TR.nb;
    if (R.done || R.phase === 'over') return c;
    if (this.lastStopIdx !== R.stopIdx) { this.lastStopIdx = R.stopIdx; this.aimErr = this.skill < 1 ? (this.rr() * 2 - 1) * .4 * (1 - this.skill) / .4 : 0; this.capT = 99; this.braking = false; }
    // procedures
    if (R.ats.ringing && !R.ats.confirmed) { this.atsT = (this.atsT || 0) + dt; if (this.atsT > (this.skill < 1 ? .5 : .2)) { c.ats = true; this.atsT = 0; } } else this.atsT = 0;
    const open = R.openCalls();
    for (const o of open) { if (o.dep || (o.d <= 100 && o.d >= 60) || o.d < 45) { c.call = true; c.callTarget = o.call.sig || o.call; break; } }
    let hornWant = false;
    for (const h of R.horns) { const d = R.R.ahead(R.wrapS(h.s), R.wrapS(R.s)); if (d >= 0 && d <= h.len && !h.done) hornWant = true; }
    if (R.workers && Math.abs(R.dTo(R.workers.lookout)) < 300 && !R.workersWave) hornWant = true;
    if (R.flash && R.flash.state === 'flashing') hornWant = true;
    if (hornWant) this.hornT = .8; if (this.hornT > 0) { this.hornT -= dt; c.horn = true; }
    // the lever: a wanted notch, then one tap a step toward it
    let want = this.decide(dt);
    if (want === 'EB') { if (!R.isEB) c.eb = true; return this.react(c, null); }
    return this.react(c, want);
  }
  react(c, want) {
    const R = this.run, nb = R.T.nb;
    if (this.skill < 1) { this.delayQ.push(want); const lag = Math.round(.25 * 120 * (1 - this.skill) / .4); while (this.delayQ.length > lag + 1) this.delayQ.shift(); want = this.delayQ[0]; }
    if (want === null || want === undefined) return c;
    if (R.isEB) { if (Math.abs(R.v) < .05 && want > -nb - 1) c.power = true; return c; }
    this.tapT = (this.tapT || 0) - 1 / 120;
    if (want < R.li) c.brake = true;
    else if (want > R.li && (this.tapT <= 0 || R.li < 0)) { this.tapT = .15; c.power = true; }
    return c;
  }
  decide(dt) {
    const R = this.run, TR = R.T, v = R.v, nb = TR.nb;
    if (R.backup) return -1;
    if (R.phase === 'dwell') {
      if (!R.pilot) return -2;
      if (R.depCall && R.depCall.open && !R.depCall.done) return -1;   // the call first
      const sp = R.stops[R.stopIdx], sg = sp && sp.startSig; if (sg && sg.aspect === 'R') return -2;
      if (R.dw && R.dw.last) return -2;
      return this.maxPower();
    }
    if (R.phase !== 'run') return -2;
    if (R.stage.tutorial) return this.tutorial();
    const cons = this.constraints(), aP = this.aPlan(), tau = TR.lagA * DH.T.brakeLag / .7 + .3;
    // the obstruction: an emergency stop if the service brake can't make it
    const hz = cons.find(q => q.hazard);
    if (hz && v > 5) { const need = (v / 3.6) * (v / 3.6) / (2 * (hz.d + 20)); if (need * 3.6 > TR.bk * this.maxBrake() * .9) return 'EB'; }
    // the final stop: predict with each brake notch, keep the one nearest the mark
    const stopC = cons.filter(q => q.v === 0).sort((a, b) => a.d - b.d)[0];
    if (stopC && v > .3) {
      const grade = R.R.gradeAt(R.wrapS(R.s));
      const B4 = this._sim(v, R.B, R.Pe || 0, () => -Math.min(4, this.maxBrake()), 60, .05, grade);
      if (this.braking || B4.s >= stopC.d - 8) {
        this.braking = true;
        this.planT -= dt;
        if (this.planT <= 0 || this.plan === null) {
          this.planT = .1; let best = null; const mb = this.maxBrake();
          for (let n = 1; n <= mb; n++) for (const ease of [0, 5]) {
            const p = this._sim(v, R.B, R.Pe || 0, (vv) => (ease && vv < ease ? -1 : -n), 60, .04, grade), e = Math.abs(p.s - stopC.d) + (ease ? 0 : .05) + n * .002;
            if (!best || e < best.e) best = { n, ease, e, s: p.s };
          }
          this.plan = best;
        }
        if (this.plan.s < stopC.d - 1.5 && v < 12) return R.li > 0 ? 0 : 0;   // short: coast a little
        return this.plan.ease && v < this.plan.ease ? -1 : -this.plan.n;
      }
    } else if (stopC && v <= .3 && stopC.d > .25 && !stopC.red && !stopC.hazard) { this.braking = false; this.plan = null; return 1; }   // creep up
    else if (stopC && (stopC.red || stopC.hazard) && v <= .3) return -2;
    this.braking = false; this.plan = null;
    // cruise: the allowed speed now
    let vs = 999;
    for (const q of cons) { if (q.v === 0) { vs = Math.min(vs, Math.sqrt(Math.max(0, 2 * aP * 3.6 * Math.max(0, q.d - v / 3.6 * tau - 6)))); continue; } vs = Math.min(vs, q.d <= 0 ? q.v - 2 : Math.sqrt(q.v * q.v + 2 * aP * 3.6 * Math.max(0, q.d - v / 3.6 * tau)) - 2); }
    // timetable: a cruise cap that meets the next arrival
    if (this.mode === 'timetable') {
      this.capT += dt;
      const sp = R.nextStop;
      if (sp && sp.arr !== null && this.capT > 1 && sp.target - R.s > 900) this.cap = 999;
      else if (sp && sp.arr !== null && this.capT > 1) {
        this.capT = 0; let lo = 20, hi = 120; const want = sp.arr - .5;
        const fast = this.predict(hi);
        if (fast !== null && fast > want) this.cap = hi; else { for (let i = 0; i < 9; i++) { const m = (lo + hi) / 2, p = this.predict(m); if (p === null) break; if (p > want) lo = m; else hi = m; } this.cap = hi; }
      }
      vs = Math.min(vs, this.cap);
    }
    if (this.skill < 1) { this.noiseT = (this.noiseT || 0) - dt; if (this.noiseT <= 0) { this.noiseT = 2; this.noise = (this.rr() * 2 - 1) * 3 * (1 - this.skill) / .4; } vs -= Math.abs(this.noise); }
    const gap = vs - v;
    if (gap > 4) { const np = this.maxPower(); return Math.min(np, gap > 20 ? 5 : gap > 10 ? 4 : gap > 6 ? 3 : 2); }
    if (gap < -1) { const req = Math.min(-gap, 8) / 2; return -clamp(Math.ceil(req), 1, Math.min(4, this.maxBrake())); }
    const grUp = R.R.gradeAt(R.wrapS(R.s));
    if (gap > -1 && grUp > 3 && (R.li > 0 || gap > .5)) return Math.min(this.maxPower(), grUp > 15 ? 3 : 2);
    if (gap < 1.5 && R.li > 0) return 0;
    return R.li > 0 ? R.li : 0;
  }
  tutorial() {
    const R = this.run, st = R.stage.steps[R.tut.i]; if (!st) return -2;
    const v = R.v;
    switch (st.id) {
      case 'p1': return v < 12 ? 1 : 0;
      case 'coast': return 0;
      case 'brake': return v > 4 ? -3 : -1;
      case 'call': if (R.depCall && R.depCall.open) return -1; return -1;
      case 'limit': return v < 37 ? 3 : 0;
      case 'eb': if (!R.tut.flags.pulled) return v < 18 ? 3 : 'EB'; return v > .05 ? 'EB' : 0;
    }
    // the marks: the same predictive stop
    const sp = R.stops[st.id === 'mark1' ? 0 : st.id === 'mark2' ? 1 : 2], d = sp.target - R.s;
    if (v <= .3 && d > .25) return 1;
    const grade = 0, mb = this.maxBrake();
    let best = null;
    for (let n = 1; n <= mb; n++) for (const ease of [0, 6]) { const p = this._sim(v, R.B, R.Pe || 0, vv => (ease && vv < ease ? -1 : -n), 60, .04, grade), e = Math.abs(p.s - d) + (ease ? 0 : .05); if (!best || e < best.e) best = { n, ease, e, s: p.s }; }
    const B4 = this._sim(v, R.B, 0, () => -3, 60, .05, 0);
    if (B4.s < d - 10) return v < 25 ? 2 : 0;
    return best.ease && v < best.ease ? -1 : -best.n;
  }
}
DH.Autopilot = Autopilot;

/** a scripted drive: the autopilot over a stage for some seconds, hashed (FNV) over samples of its state */
DH.proof = (stageId, seconds = 120, o = {}) => {
  const run = new DH.Run(stageId, Object.assign({ difficulty: 'Normal' }, o)), ap = new Autopilot(run, { skill: o.skill === undefined ? 1 : o.skill });
  const dt = 1 / 120; let samples = '';
  for (let i = 0; i < seconds * 120 && !run.done && run.phase !== 'over'; i++) { run.step(dt, ap.step(dt)); run.out.length = 0; if (i % 120 === 0) samples += run.s.toFixed(3) + ',' + run.v.toFixed(3) + ',' + run.grace + ',' + run.score + ';'; }
  return { hash: DH.fnv(samples), run };
};
})();
