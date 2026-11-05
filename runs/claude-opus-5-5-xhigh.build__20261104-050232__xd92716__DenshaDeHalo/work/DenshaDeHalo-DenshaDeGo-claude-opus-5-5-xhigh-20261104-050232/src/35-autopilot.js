/* 35-autopilot: the AI driver (attract mode, Dev auto-drive, tests and timetable calibration). It writes the same
 * commands a player does. Planner: the constraints over the next 1.5 km (line speed, limit boards over the whole
 * train, signal aspects, a red signal's stop 25 m short, the next stop, an obstruction) each give an allowed speed on a
 * braking curve at 80% of B4; the lowest, less 2 km/h, is the target. The final stop is model-predictive: it simulates
 * the train model ahead for each brake notch and holds the one whose stop lands on the mark, easing to B1 at the end
 * (a smooth stop). Timetable mode picks a cruise cap by bisection so it arrives half a second early; min-time mode
 * ("par") drives as fast as the rules allow. skill 0..1 (1 perfect, .6 human-like); cheat: no Halo Time loss. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, { clamp } = E;
class Autopilot {
  constructor(run, o = {}) {
    this.run = run; this.skill = o.skill === undefined ? 1 : o.skill; this.mode = o.mode || (run.stage.tutorial ? 'mintime' : 'timetable'); this.cheat = !!o.cheat;
    this.r = DH.rng('auto:' + run.id + ':' + (o.seed || 0)); this.tgtN = 0; this.decT = 0; this.cap = null; this.capT = 99; this.horn = 0; this.atsT = 0; this.stopOff = 0; this.lastStopIdx = -1; this.delayQ = [];
    if (this.cheat) run.o.god = true;
  }
  get ty() { return this.run.train.ty; }
  env(s) { const run = this.run, sg = run.seg(s); return { T: DH.TUNING, ty: this.ty, grade: sg.grade || 0, wet: run.weather === 'rain', doors: true }; }
  maxB() { const run = this.run, ty = this.ty; let n = ty.notchB; if (run.weather === 'rain') n = Math.min(n, Math.floor(DH.TUNING.adhesionRain / (ty.bStep * DH.TUNING.brakeScale))); return Math.max(2, n); }
  maxP() { const run = this.run, ty = this.ty; let n = ty.notchP; if (run.weather === 'rain') while (n > 1 && ty.a0[n - 1] * DH.TUNING.accelScale > DH.TUNING.adhesionRain) n--; return n; }
  bDecel(n) { return this.ty.bStep * n * DH.TUNING.brakeScale; }   // km/h/s
  /** route-only limit at a front position (line, boards over the train, slow orders) */
  routeLim(s) { const run = this.run, save = run.lastAspectV; run.lastAspectV = 999; const v = run.limitAt(s); run.lastAspectV = save; return v; }
  /** the stop the planner must make next: { d, kind } (a stop, a red signal, an obstruction, a tutorial mark) */
  stopTarget() {
    const run = this.run; let best = null;
    const add = (d, kind) => { if (d > -2 && (!best || d < best.d)) best = { d, kind }; };
    const p = run.stops[run.stopIdx]; if (p && run.phase !== 'finished') add(p.target - run.s + this.stopOff, 'stop');
    const na = run.signalsAhead(1500, 1)[0]; if (na && na.g.aspect === 'R') add(na.d - 25, 'red');
    const ev = run.events; if (ev && ev.obst && ev.obst.active && !ev.obst.stopped) add(ev.obst.s - run.s - 30, 'obst');
    if (run.tut && run.tut.cur && run.tut.cur.stopAt !== undefined) add(run.tut.cur.stopAt - run.s, 'mark');
    return best;
  }
  /** the speed limit profile ahead: [ [d, vKmh] ... ] (now, the next signals' aspects, boards and their ends) */
  constraints() {
    const run = this.run, s = run.s, out = [[0, run.limitAt(s)]];
    for (const { g, d } of run.signalsAhead(1500, 2)) out.push([d, Math.min(DH.ASPECT_V[g.aspect] || 999, this.routeLim(s + d + 1))]);
    for (let d = 25; d <= 1500; d += 25) out.push([d, this.routeLim(s + d)]);
    return out;
  }
  vAllow(d, vc, v) { const a = .8 * this.bDecel(4) / 3.6, tau = DH.TUNING.brakeLag * this.ty.lagK + .6; return Math.sqrt((vc / 3.6) ** 2 + 2 * a * Math.max(0, d - v / 3.6 * tau)) * 3.6; }
  /** this step's commands for the run */
  cmd(dt) {
    const run = this.run, tr = run.train, c = {}; let want = tr.notch;
    this.decT -= dt;
    if (run.phase === 'over') return c;
    // procedures: ATS, calls, the horn, the flash
    if (run.ats.ringing && !run.ats.confirmed) { this.atsT += dt; if (this.atsT > (this.skill >= 1 ? .3 : .6)) c.ats = true; } else this.atsT = 0;
    const oc = run.openCall; if (oc && !run.o.autoCalls) { if (oc.kind === 'start') { if (run.t - oc.dep.opened > .7) c.call = true; } else if (oc.s - run.s <= (DH.TUNING.callGreat + 60) / 2 + 4) c.call = true; }
    for (const z of run.hornZones) if (!z.done && run.s >= z.s + 2 && run.s - z.s < z.h.len - 5) this.horn = Math.max(this.horn, .8);
    const fl = run.events && run.events.flash; if (fl && !fl.done && fl.t > .5) this.horn = Math.max(this.horn, .7);
    if (this.horn > 0) { c.horn = true; this.horn -= dt; }
    // the lever
    if (this.decT <= 0) { want = this.decide(); this.tgtN = want; }
    want = this.tgtN;
    if (run.backup) return c;
    if (tr.isEB && Math.abs(tr.v) < .05 && want > tr.ebN) c.power = true;
    else if (want > tr.notch) c.power = true; else if (want < tr.notch) c.brake = true;
    if (want <= tr.ebN && !tr.isEB) { c.eb = true; c.power = c.brake = false; }
    return c;
  }
  decide() {
    const run = this.run, tr = run.train, v = tr.v, s = run.s, ty = this.ty, maxB = this.maxB(), maxP = this.maxP();
    this.decT = .25;
    // standing at a station: wait for the pilot lamp and the signal, then go (the call first)
    if (run.phase === 'dwell' || run.phase === 'finished') { this.decT = .1; if (run.phase === 'finished') return -Math.min(4, maxB); const d = run.dwell; if (!d || !d.sigClear || !run.pilot) return -Math.min(4, maxB); if (run.dep && !run.dep.called && run.t - run.dep.opened < 1.2 && !run.o.autoCalls) return -2; this.newLeg(); return maxP; }
    if (run.tut) { const st = run.tut.cur; if (st && st.eb) { if (!run.tut.ebDone) return v < 20 ? 3 : tr.ebN; return Math.abs(v) < .05 ? (tr.isEB ? tr.ebN + 1 : -1) : tr.notch; } if (st && st.id === 'coast') return 0; if (st && st.id === 'brake') return -3; if (st && st.id === 'p1') return 1; }
    if (this.stopIdx !== run.stopIdx) this.newLeg();
    const tg = this.stopTarget();
    // the final stop: predict, hold the notch that lands on the mark
    if (tg && tg.kind !== 'red' || tg && tg.d < 60) {
      const need = DH.predictStop(tr.st, -Math.min(4, maxB), this.env(s), .1).d;
      if (tg.d < need + 40 || tg.d < 25) return this.finalStop(tg, maxB);
    }
    if (tg && tg.kind === 'red' && tg.d < 400) { const need = DH.predictStop(tr.st, -Math.min(4, maxB), this.env(s), .1).d; if (tg.d < need + 40) return this.finalStop(tg, maxB); }
    // cruise: the allowed speed now from every constraint ahead, the timetable's cap
    let vt = 999, bind = null;
    for (const [d, vc] of this.constraints()) { const va = this.vAllow(d, vc, v); if (va < vt) { vt = va; bind = [d, vc]; } }
    if (tg) { const va = this.vAllow(tg.d, 0, v); if (va < vt) { vt = va; bind = [tg.d, 0]; } }
    if (this.mode === 'timetable') { this.capT += .25; if (this.capT >= 2 || this.cap === null) { this.capT = 0; this.cap = this.pickCap(); } vt = Math.min(vt, this.cap); }
    vt -= 2; if (this.skill < 1) vt += (this.r() - .5) * 6 * (1 - this.skill);
    return this.law(v, vt, bind, maxB, maxP);
  }
  law(v, vt, bind, maxB, maxP) {
    if (v > vt + 1) {
      let req = 1;
      if (bind) { const d = Math.max(1, bind[0] - v / 3.6 * 1.2); req = Math.max(0, ((v / 3.6) ** 2 - (bind[1] / 3.6) ** 2) / (2 * d)) * 3.6; }
      return -clamp(Math.ceil(Math.max(req, (v - vt) * .25) / (this.ty.bStep * DH.TUNING.brakeScale)), 1, maxB);
    }
    if (v < vt - 1.5) return clamp(Math.ceil((vt - v) / 6), 1, maxP);
    return 0;
  }
  delayAhead() {
    const run = this.run, p = run.stops[run.stopIdx], ev = run.events; if (!p || !ev) return false;
    for (const e of ev.list) if (!e.done && (e.type === 'obstruction' || e.type === 'freight') && e.at && e.at.s !== undefined && run.U(e.at.s) < p.target) return true;
    if (ev.obst && ev.obst.active) return true;
    for (const a of run.actors) {
      if (!a.blocks || run.N(a.s) < run.s - 5) continue;
      const onUs = a.path ? a.path.find(q => q.track === run.track) : (a.track === run.track ? { s: -1e9 } : null);
      if (onUs && a.track !== 'LP' && Math.max(run.N(a.s) - DH.trainLength(a.cars), onUs.s) < p.target) return true;
    }
    return false;
  }
  newLeg() { const run = this.run; this.stopIdx = run.stopIdx; this.cap = null; this.capT = 99; this.stopOff = this.skill < 1 ? (this.r() - .5) * .8 * (1 - this.skill) / .4 : 0; }
  /** the stop: try each brake notch (and N) held now, B1 below 5 km/h, and keep the one landing closest (short is better) */
  finalStop(tg, maxB) {
    const run = this.run, tr = run.train, env = this.env(run.s), v = tr.v;
    if (tg.d < -1.5 && v < 1) return -maxB;
    this.decT = v < 12 ? .05 : .1;
    const ease = 4.5, cands = v < 9 ? [0, -1, -2, -3] : [];
    if (!cands.length) for (let n = 0; n >= -maxB; n--) cands.push(n);
    let best = null;
    for (const n of cands) {
      const st = Object.assign({}, tr.st); let d = 0, t = 0; const h = v < 10 ? .02 : .05, hold = v < 9 ? .25 : 999;
      while (st.v > .02 && t < 120) { const use = hold < 900 ? (t < hold ? n : -1) : (st.v >= ease ? n : -1); DH.trainStep(st, use, h, env); d += st.v / 3.6 * h; t += h; if (use === 0 && t > 8) { d = 1e9; break; } }
      const e = d - tg.d, cost = e > 0 ? e * 3 : -e;
      if (!best || cost < best.cost) best = { n, cost, e };
    }
    if (tg.d > 2 && v < 1.5 && best.e < -1) return 1;   // stopped short: creep up
    return best.n;
  }
  /** the cruise cap that arrives on time (half a second early), by bisection over a quick simulation */
  pickCap() {
    const run = this.run, p = run.stops[run.stopIdx]; if (!p || p.arrT === null || p.arrT === undefined) return 999;
    // a scripted delay still ahead in this leg (an obstruction, a freight in the way): run at par until it is behind us
    if (this.delayAhead()) return 999;
    const lineMax = this.ty.vmax, want = p.arrT - .5 - run.clock, prof = this.profile(p.target);
    const tFast = this.simArrival(lineMax, prof); if (tFast >= want) return 999;
    let lo = 20, hi = lineMax;
    for (let i = 0; i < 8; i++) { const mid = (lo + hi) / 2; if (this.simArrival(mid, prof) > want) lo = mid; else hi = mid; }
    return hi;
  }
  /** the limit profile from here to the next stop, every 25 m (route limits and the forced aspects of signals) */
  profile(to) {
    const run = this.run, s0 = run.s, n = Math.ceil((to - s0) / 25) + 62, prof = new Float32Array(n);
    for (let i = 0; i < n; i++) prof[i] = this.routeLim(s0 + i * 25);
    // a signal's aspect speed holds from it to the next signal (forced aspects are known; the next one's too)
    const ahead = run.signalsAhead(to - s0 + 1500, 99);
    ahead.forEach(({ g, d }, k) => { const a = g.force || (k === 0 ? g.aspect : null); if (!a || a === 'R') return; const v = DH.ASPECT_V[a] || 999, e = k + 1 < ahead.length ? ahead[k + 1].d : d + 2000; for (let i = Math.max(0, Math.ceil(d / 25)); i < n && i * 25 < e; i++) prof[i] = Math.min(prof[i], v); });
    return prof;
  }
  simArrival(cap, prof) {
    const run = this.run, st = Object.assign({}, run.train.st), p = run.stops[run.stopIdx], target = p.target, maxB = this.maxB(), maxP = this.maxP();
    prof = prof || this.profile(target); const base = run.s;
    let s = run.s, t = 0, n = run.train.notch; const h = .1;
    while (t < 900) {
      const d = target - s; if (d < .5 && st.v < .5) break;
      if (d < 15 && st.v < 6 && st.v > .3) {   // the final creep, as the real stop takes it: coast, then B1 to the mark
        const v = st.v / 3.6, b1 = this.ty.bStep * DH.TUNING.brakeScale / 3.6, dB1 = v * v / (2 * b1);
        t += dB1 < d ? (d - dB1) / v + v / b1 + .6 : 2 * d / v + .6; break;
      }
      let vt = 999, bind = null; const i0 = Math.max(0, Math.floor((s - base) / 25));
      for (let i = i0; i < Math.min(prof.length, i0 + 60); i++) { const dd = Math.max(0, base + i * 25 - s), va = this.vAllow(dd, Math.min(prof[i], cap), st.v); if (va < vt) { vt = va; bind = [dd, Math.min(prof[i], cap)]; } }
      const vs = this.vAllow(d, 0, st.v); if (vs < vt) { vt = vs; bind = [d, 0]; }
      vt -= 2;
      if (d < 40 && st.v < 12 && d < DH.predictStop(st, -3, this.env(s), .25).d + 8) n = st.v < 4.5 ? -1 : -3; else n = this.law(st.v, vt, bind, maxB, maxP);
      if (st.v < .5 && d >= .5 && n <= 0) n = 1;
      DH.trainStep(st, n, h, this.env(s)); s += st.v / 3.6 * h; t += h;
    }
    return t;
  }
}
DH.Autopilot = Autopilot;
/** drive a whole stage headless with the autopilot: returns the run (tests, calibration, Dev) */
DH.autoRun = (stageId, o = {}) => {
  const run = new DH.Run(stageId, o.run || {}); const ap = new Autopilot(run, o);
  const dt = 1 / 120, maxT = o.maxT || 1500; let t = 0;
  while (run.phase !== 'finished' && run.phase !== 'over' && t < maxT) { run.step(dt, ap.cmd(dt)); t += dt; }
  if (o.settle) for (let i = 0; i < 120 * o.settle; i++) run.step(dt, {});
  run.autopilot = ap; return run;
};
/** a determinism proof: a scripted autopilot drive's state samples hashed (FNV) */
DH.proof = (stageId, seconds = 60) => {
  const run = new DH.Run(stageId, {}); const ap = new Autopilot(run, { skill: 1 }); const dt = 1 / 120, samples = [];
  for (let i = 0; i < seconds * 120; i++) { run.step(dt, ap.cmd(dt)); if (i % 60 === 0) samples.push([+run.s.toFixed(3), +run.train.v.toFixed(3), +run.grace.toFixed(2), run.score]); }
  return DH.fnv(samples);
};
})();
