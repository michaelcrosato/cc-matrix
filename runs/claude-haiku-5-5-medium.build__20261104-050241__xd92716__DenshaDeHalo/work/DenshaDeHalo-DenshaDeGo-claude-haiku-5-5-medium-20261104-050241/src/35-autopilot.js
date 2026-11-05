/* Densha de Halo! · 35-autopilot: the AI driver (section 4.19). It drives a DH.Sim through its commands: the same
 * commands a player's keys make. Used by attract mode, Dev auto-drive, the tests and tools/calibrate.
 *
 * Control. Each decision, it simulates the same train model (30-train) forward for each candidate: brake with notch n
 * after coasting k seconds, or hold a notch. It picks the candidate whose predicted stop is closest to the mark (in a
 * stop) or whose predicted speeds stay under the limits ahead (on the road). Decisions run every 0.25 s; the model is
 * exact, so the prediction is exact, and the stop converges on the mark. Skill (0..1) adds human-like reaction delay and
 * aim noise; skill 1 is perfect. Its runs are deterministic: noise comes from a seeded stream (DH.rng('auto')). */
(() => {
'use strict';
const DH = window.DH;

const PRED_DT = 1 / 20;

/* predict where a train stops, and its speeds at given route distances, under a plan: coast k s then hold notch n */
function predict(sim, n, k, points, horizon = 1600, dtP = PRED_DT) {
  const T0 = sim.train, spec = T0.spec;
  const T = new DH.Train(spec, { s: T0.s, v: T0.v });
  T.cars = T0.cars; T.P = T0.P; T.B = T0.B; T.eb = T0.eb; T.notch = 0; T.slipT = 0;
  const out = { stopS: null, hit: points.map(() => null), maxV: T.v };
  const env = { grade: 0, dry: sim.dryRail, traction: true };
  let t = 0, i = 0;
  const end = Math.min(60, horizon / Math.max(T.v / 3.6, 2) + 30);
  for (let guard = 0; guard < 60 * 30 * 4; guard++) {
    if (t >= k) T.notch = n;
    if (T.notch === 0 && t < k) T.notch = 0;
    env.grade = sim.route.gradeAt(T.s);
    T.step(dtP, env);
    t += dtP;
    for (let j = 0; j < points.length; j++) if (out.hit[j] === null && T.s >= points[j].s) out.hit[j] = T.v;
    if (T.s - T0.s > horizon) break;
    if (n <= 0 && Math.abs(T.v) < 0.02 && t > k + .2) break;   // a plan that holds traction doesn't stop; a brake or a coast does
    if (t > end) break;
  }
  out.stopS = T.s;
  return out;
}

class Auto {
  constructor(sim, o = {}) {
    this.sim = sim; this.skill = o.skill === undefined ? 1 : o.skill; this.minTime = !!o.minTime;
    this.rng = DH.rng('auto:' + (sim.stage.id || 'x'));
    this.next = 0; this.holdHorn = 0; this.hornDone = new Set(); this.plan = null; this.delay = 0;
    this.aim = 0; this.lastDecide = -1;
    this.cmds = [];
  }
  /** the reaction the skill allows: a human-like pause and an aim error */
  humanize(dt) {
    if (this.skill >= 1) return;
    this.delay -= dt;
    if (this.delay <= 0) { this.delay = .25 * this.rng() * (1 - this.skill) * 2 + .05; this.aim = (this.rng() - .5) * 0.8 * (1 - this.skill) * 2; }
  }
  /** called before each sim step: issues this step's commands */
  act(dt) {
    const sim = this.sim, T = sim.train, st = sim.snapshot();
    if (sim.gameOver || sim.finished) return;
    this.humanize(dt);
    if (T.eb && Math.abs(T.v) < 0.5) sim.cmd('power');   // EB comes off at a standstill: the first step after it is released
    // the dwell: doors open, then nothing until the pilot lamp is lit; then depart when the signal allows
    if (sim.dwell) {
      if (sim.dwell.pilotLit && (!sim.stopIdx || true)) {
        if (sim.callOpen && sim.callOpen.kind === 'departure' && !sim.callOpen.made) sim.cmd('call');
        if (this.canDepart()) { sim.cmd('neutral'); sim.cmd('power'); }
      }
      if (T.notch < 0 && !T.eb) sim.cmd('neutral');
      this.doHorn(st); return;
    }
    if (sim.atsRinging) sim.cmd('ats');
    this.doCalls(st);
    this.doHorn(st);
    // obstruction: an emergency stop when a service brake can't stop short of the crossing
    if (sim.obstruction && sim.obstruction.active && !sim.obstruction.passed) {
      const c = sim.route.crossings.find(x => x.id === sim.obstruction.id);
      if (c && T.v > 0) { const p = predict(sim, -8, 0, []); if (p.stopS > c.s - 4 && !T.eb) { sim.cmd('eb'); return; } }
    }
    const target = this.targetFor(st);
    if (!target) { this.cruise(dt); return; }
    this.stopMode(dt, target);
  }
  canDepart() {
    const sim = this.sim, x = sim.dwell ? sim.dwell.x : null;
    if (sim.train.v > 0.5) return false;
    if (!x || !x.startSig) return true;
    return sim.readySignals.has(x.startSig.id);
  }
  doCalls(st) {
    const sim = this.sim;
    for (const c of sim.calls) {
      if (c.called) continue;
      const d = c.s - sim.train.s;
      if (d > 60 && d <= 110 && (c.kind !== 'signal' || sim.sighted.has(c.sig))) { if (this.skill > .5 || this.rng() < this.skill * 2) { sim.cmd('call'); } break; }
    }
  }
  doHorn(st) {
    const sim = this.sim, T = sim.train;
    if (this.holdHorn > 0) { this.holdHorn -= DH.FIXED; sim.cmd('horn', true); if (this.holdHorn <= 0) sim.cmd('horn', false); return; }
    for (const h of sim.route.horns) {
      if (h.s < sim.stageSpan[0] || h.s > sim.stageSpan[1]) continue;
      const key = h.s;
      if (!this.hornDone.has(key) && T.s >= h.s + 3 && T.s < h.s + 60) { this.hornDone.add(key); this.holdHorn = 0.9; sim.cmd('horn', true); }
    }
    // the flash of the oncoming last train (S5): answer with the horn
    if (sim.flashAt !== undefined && sim.t - sim.flashAt < 3 && !this.flashAnswered) { this.flashAnswered = true; this.holdHorn = 0.8; sim.cmd('horn', true); }
  }
  /** the stop the train should make next: the next stop, or a red signal's stop point 25 m before it */
  targetFor(st) {
    const sim = this.sim, T = sim.train;
    const x = sim.stops[sim.stopIdx];
    let tgt = null;
    if (x && !sim.dwell && !x.judged) tgt = x.target + (this.aim || 0) * (this.skill < 1 ? 1 : 0);
    // a red ahead within 400 m with no stop of ours before it: stop 25 m short of it
    for (const g of sim.signals) {
      if (g.s <= T.s || g.s - T.s > 400) continue;
      if (g.aspect === 'R' && g.kind !== 'shunt' && !(tgt !== null && tgt < g.s - 25) && !(g.kind === 'start' && (!sim.stops[sim.stopIdx] || x.target > g.s))) { tgt = tgt === null ? g.s - 25 : Math.min(tgt, g.s - 25); break; }
    }
    if (tgt !== null && tgt - T.s > 260) return null;   // the stop planner takes over inside 260 m; cruise before that
    if (tgt !== null && tgt < T.s - 60) return null;
    return tgt;
  }
  /** a stop: choose the brake plan whose predicted stop is closest to the target */
  stopMode(dt, tgt) {
    const sim = this.sim, T = sim.train, d = tgt - T.s;
    // a train below the mark that stopped: creep up slowly (the short-stop rule), or leave it to the stop judgment
    if (Math.abs(T.v) < 0.05) {
      if (d > 0.3 && d < 5 && !sim.dwell) { if (T.notch !== 1) { sim.cmd('neutral'); sim.cmd('power'); } return; }
      sim.cmd('neutral');
      return;
    }
    // the final approach (inside 60 m): the look-ahead, re-planned every 0.05 s with the model's fine step
    if (d < 60) {
      if (this.nextFine !== undefined && sim.t < this.nextFine) return;
      this.nextFine = sim.t + 0.05;
      let bestF = null;
      for (let n = 0; n >= -8; n--) {
        const p = predict(sim, n, 0, [], 60, 1 / 60), err = p.stopS - tgt;
        const cost = Math.abs(err) + (n < 0 ? -n * 0.002 : 0.01) + (T.v < 4 && n <= -2 ? 0.06 : 0);   // the last metres at B1: a SMOOTH stop
        if (!bestF || cost < bestF.cost) bestF = { n, cost, err };
      }
      if (DH.DEBUG_FINAL) console.log(`   fine d=${d.toFixed(2)} v=${T.v.toFixed(2)} pick n=${bestF.n} err=${bestF.err.toFixed(2)}`);
      this.setNotch(bestF.n);
      return;
    }
    if (this.nextDecide !== undefined && sim.t < this.nextDecide) return;
    this.nextDecide = sim.t + 0.4;
    let best = null;
    const lowSpeed = T.v < 8, points = this.pointsAhead();
    for (let n = -8; n <= 0; n++) {
      if (lowSpeed && n < -2 && d < 3) continue;
      const ks = n === 0 ? [0] : [0, 1, 2, 3, 4, 6, 8, 10];
      for (const k of ks) {
        const p = predict(sim, n, k, points, 1600);
        const err = p.stopS - tgt;
        let bad = 0; for (let j = 0; j < points.length; j++) if (p.hit[j] !== null) bad = Math.max(bad, p.hit[j] - points[j].v);
        const cost = Math.abs(err) + bad * 10 + (n < 0 && lowSpeed ? -n * 0.01 : 0) + (n === 0 ? 40 : 0) + k * 0.001;
        if (!best || cost < best.cost) best = { n, k, cost, err };
      }
    }
    if (!best) return;
    // every brake plan stops short of the mark and the mark is still ahead: close the gap under power (the fine
    // controller takes the last 60 m)
    if (best.err < -5 && d > 60 && best.n >= -2) { this.setNotch(Math.min(3, T.spec.notchesP)); return; }
    // the plan: brake with n now if k is 0, otherwise coast for now
    if (best.k > 0.01 || best.n === 0) { if (T.notch < 0) sim.cmd('neutral'); else if (T.notch > 0) sim.cmd('neutral'); return; }
    // brake to the notch: step the lever one notch at a time toward it
    while (T.notch > best.n && !T.eb) { if (!sim.cmd('brake')) break; }
    while (T.notch < best.n) { if (!sim.cmd('neutral')) break; if (T.notch < best.n) { sim.cmd('brake'); break; } }
  }
  /** the speed limits ahead: the limit boards that will bite, and the signals' aspect caps (Y 45, YG 65, YY 25, R 0) */
  pointsAhead() {
    const sim = this.sim, T = sim.train, points = [];
    for (const L of sim.limits) if (L.s > T.s && L.s - T.s < 1400) points.push({ s: L.s, v: L.v });
    for (const g of sim.signals) if (g.s > T.s && g.s - T.s < 1400 && g.kind !== 'shunt') { const sp = DH.ASPECT_SPEED[g.aspect]; if (sp !== null && sp !== undefined) points.push({ s: g.s, v: sp }); }
    return points;
  }
  /** the lever to a notch (P5..B8), one lever step per press: power up, or brake down through N */
  setNotch(n) {
    const sim = this.sim, T = sim.train;
    if (T.eb) { if (Math.abs(T.v) < 0.5) sim.cmd('power'); return; }   // EB comes off only at a standstill: one power press releases it
    for (let guard = 0; guard < 20 && T.notch > n; guard++) { if (!sim.cmd('brake')) break; }
    for (let guard = 0; guard < 20 && T.notch < n; guard++) { if (!sim.cmd('power')) break; }
  }
  /** the speed limits ahead: the limit boards that will bite, and the signals' aspect caps (Y 45, YG 65, YY 25, R 0) */
  pointsAhead() {
    const sim = this.sim, T = sim.train, points = [];
    for (const L of sim.limits) if (L.s > T.s && L.s - T.s < 1400) points.push({ s: L.s, v: L.v });
    for (const g of sim.signals) if (g.s > T.s && g.s - T.s < 1400 && g.kind !== 'shunt') { const sp = DH.ASPECT_SPEED[g.aspect]; if (sp !== null && sp !== undefined) points.push({ s: g.s, v: sp }); }
    return points;
  }
  /** the lever to a notch: brake or neutral, one notch per call (the controller) */
  /** on the road: the look-ahead plans the notch. Each notch is simulated against the speed caps ahead (limits, the
   * aspects' caps); the strongest power notch that keeps every cap is taken while below the wanted speed, otherwise the
   * coasting or the least braking that keeps every cap. Decisions every 0.2 s. */
  cruise(dt) {
    const sim = this.sim, T = sim.train, tt = this.timetableCap();
    const want = Math.min(sim.limitInForce(), tt === null ? 999 : tt);
    const points = this.pointsAhead();
    if (this.nextRoad !== undefined && sim.t < this.nextRoad) return;
    this.nextRoad = sim.t + 0.2;
    // the caps the planner must meet: those within its look-ahead (a cap beyond it can still be braked for later)
    const near = points.filter(q => q.s - T.s <= 450);
    const nearest = near.length ? near[0] : null;
    let pick = null, least = null;
    for (let n = T.spec.notchesP; n >= -8; n--) {
      if (n > 0 && T.v > want + 2) continue;   // no power over the wanted speed
      const p = predict(sim, n, 0, near, 450, 1 / 20);
      let viol = -50, any = false;
      for (let j = 0; j < near.length; j++) if (p.hit[j] !== null) { viol = Math.max(viol, p.hit[j] - near[j].v); any = true; }
      if (near.length && !any) viol = Math.max(viol, 0.5);   // a cap the train never reaches (it rolled back, or stopped): not safe to rely on
      // a brake that stops the train short of a cap it still has to pass is no good (unless it's meant to stop)
      const stoppedShort = n < 0 && want > 3 && nearest !== null && p.stopS < nearest.s - 0.5;
      const score = viol + (stoppedShort ? 50 : 0);
      if (!least || score < least.score - 1e-9) least = { n, score };
      const feasible = !stoppedShort && viol <= (n > 0 ? -0.8 : 0.2);
      if (feasible) {
        if (n > 0 && T.v < want - 1) { pick = { n, why: 'power' }; break; }   // the strongest power that is still safe
        if (n === 0 && T.v >= want - 1) { if (!pick) pick = { n: 0, why: 'coast' }; }
        if (n < 0 && (!pick || pick.n < n)) pick = { n, why: 'brake' };     // the least braking that keeps the caps
      }
    }
    // nothing keeps every cap: take the notch that breaks them least
    if (!pick) pick = { n: least ? least.n : -8, why: 'least' };
    if (pick.n === T.notch) return;
    this.setNotch(pick.n);
  }
  /** a speed that keeps the timetable: the average speed needed to be on time at the next stop, with a margin */
  timetableCap() {
    const sim = this.sim, x = sim.stops[sim.stopIdx];
    if (!x || x.arrival === null || x.arrival === undefined || this.minTime) return null;
    const left = x.arrival - 4 - sim.clock(), dist = x.target - sim.train.s;
    if (left <= 0 || dist <= 0) return null;
    return dist / left * 3.6 * 1.25 + 3;
  }
}
DH.Auto = Auto;
DH.predictStop = predict;
})();
