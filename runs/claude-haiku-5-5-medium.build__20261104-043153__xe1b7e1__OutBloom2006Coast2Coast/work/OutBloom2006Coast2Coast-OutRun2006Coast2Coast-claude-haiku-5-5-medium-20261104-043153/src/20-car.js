// The car's physics (plan §7.3): the engine's pull and drag, the steering with the curve's push, the drift (its entry by
// the brake tap, the down-up shift or the drift button; its angle, counter-steer and score), the slipstream and its
// slingshot, the off-road slowdown, the crests that throw the car into the air, and the gusts. Pure: it reads the road
// through an env the race fills in each step, and reports what happened on the bus.
(() => {
'use strict';
const E = My3D2dge, OB = window.OB || (window.OB = {});
const { clamp } = E;
const T = k => OB.tune(k);

class CarSim {
  /** new OB.CarSim(carDef, { z, x }): a car at a point on its road, at rest */
  constructor(def, o = {}) {
    this.def = def;
    this.S = OB.carStats(def);
    this.z = o.z || 0; this.x = o.x || 0;
    this.vx = 0; this.v = 0; this.rpm = 1500; this.gear = 1;
    this.drift = { on: false, dir: 0, a: 0, t: 0, score: 0, len: 0, calm: 0 };
    this.slip = 0; this.slingT = 0; this.slingBoost = 0; this.wasSlip = false;
    this.air = false; this.airT = 0; this.airStart = 0; this.crash = null; this.invul = 0;
    this.offroad = false; this.scrape = 0; this.bumpT = 0; this.gustT = 0; this.gustV = 0; this.prevTag = null;
    this.brakeWas = false; this.brakeT = 0; this.tapArm = false; this.shiftDownT = -9; this.t = 0;
    this.rng = OB.rand.stream('car', o.seed || 0);
    this.manual = false; this.mgear = 1; this.assist = 'Low'; this.tapOk = true; this.btnOk = true;
    this.steerCur = 0; this.stats = { bestDrift: 0, nearMisses: 0, slipTime: 0, maxV: 0 };
  }
  /** the car's top speed right now (km/h): its own, the Tuning scale, the slipstream bonus, the off-road cap */
  vtop() {
    let top = this.S.vtop * T('topSpeedScale') * (1 + T('slipTopBonus') * this.slip);
    if (this.offroad) top *= T('offroadTop');
    return top + (this.slingT > 0 ? this.slingBoost : 0);
  }
  /** one fixed step. intent: { steer (−1..1), gas (0..1), brake (0..1), drift (held), shiftDown, shiftUp (pressed) };
   *  env: { info (OB.World.info of the road under the car), inDraft (a car ahead within the slipstream), dt } */
  step(dt, intent, env) {
    this.t += dt;
    const info = env.info, v = this.v, vt = this.vtop(), lowSpeed = v < 6;
    const curve = info.curve, crest = info.crest || 0;
    // the crest: a sharp fall over the top of a hill at speed throws the car into the air
    if (!this.air && crest < -.02 && v > 200 && this.airT <= 0) { this.air = true; this.airT = .3 + .3 * ((this.t * 7) % 1); this.airStart = this.t; OB.bus.emit('air:start', {}); }
    if (this.air) { this.airT -= dt; if (this.airT <= 0) { this.air = false; const hard = crest < -.04; OB.bus.emit('air:land', { hard }); this.scrape = 0; } }
    // the steering: a target lateral speed from the stick, eased toward by the car's response
    let steer = clamp(intent.steer || 0, -1, 1);
    this.steerCur += (steer - this.steerCur) * Math.min(1, dt * 14);   // (the stick eases in and out: keyboard reads as a ramp)
    const drifting = this.drift.on;
    if (this.air) steer *= .3;
    const lat = Math.min(1, v / 70), sr = T('steerRate') * (this.S.steer / 2.2) * (drifting ? T('driftSteerBoost') : 1);
    // the curve pushes the car outward: the square of its speed, and less when it drifts. The push is part of the
    // target lateral speed, so the stick must hold against it (a bend is held at the steer it takes to counter it)
    const sv = v / Math.max(1, vt);
    let pushRate = 0;
    if (!this.air && !lowSpeed) {
      pushRate = -curve * sv * sv * T('curvePush');
      if (drifting) pushRate *= 1 - T('driftGrip') * (this.S.grip / .85) * Math.min(1, Math.abs(this.drift.a) / .5);
    }
    const targetVx = steer * sr * lat * (1 - .12 * v / Math.max(1, vt)) + pushRate;
    this.vx += (targetVx - this.vx) * Math.min(1, dt * T('steerResponse'));
    // the gusts: a crosswind on entering a gust segment, fading over 1.2 s
    if (info.tag === 'gust' && this.prevTag !== 'gust') { this.gustT = 1.2; this.gustV = (this.rng() < .5 ? -1 : 1) * .9; OB.bus.emit('gust', {}); }
    this.prevTag = info.tag;
    if (this.gustT > 0) { this.gustT -= dt; this.vx += this.gustV * dt * (this.gustT / 1.2 + .3); }
    // the drift
    this.updateDrift(dt, intent, steer, v, curve);
    // the pedals: gas pulls by the car's acceleration, falling off toward its top speed; brake takes speed; drag
    if (this.manual) {
      if (intent.shiftUp && !this._shUp) this.mgear = Math.min(5, this.mgear + 1);
      if (intent.shiftDown && !this._shDn) this.mgear = Math.max(1, this.mgear - 1);
      this._shUp = !!intent.shiftUp; this._shDn = !!intent.shiftDown;
    }
    const gas = clamp(intent.gas || 0, 0, 1), brake = clamp(intent.brake || 0, 0, 1);
    const A0 = this.S.A0 * T('accelScale') * (1 - .1 * (this.S.weight - 1));
    let dv = 0;
    if (gas > 0) dv += A0 * (1 - Math.pow(Math.max(0, v) / vt, 1.6)) * gas;
    const drag = OB.DRAG_QUAD * v * v * (1 - .5 * this.slip);
    dv -= drag;
    if (brake > 0) dv -= T('brakeDecel') * brake;
    if (this.offroad && v > vt) dv -= T('offroadDrag');
    if (this.drift.on) dv -= T('driftSpeedLoss') * Math.abs(this.drift.a) / .75;
    if (this.air) dv *= .4;
    // manual: a gear's band is its rev limit; the car can't climb past it until the next shift
    if (this.manual && this.mgear < 5) { const band = vt * (this.mgear / 5) * 1.12 + 12; if (v > band) dv -= 90 * dt; }
    this.v = clamp(v + dv * dt, 0, vt * 1.25);
    if (v > 0 && this.v > vt && gas <= 0) this.v = Math.max(vt, this.v - 60 * dt);
    // the road and the z: travel is the speed in units, the lateral speed moves across
    const dz = this.v * OB.KMH_UNITS * dt;   // (manual: the gear's band caps the speed, see above)
    this.z += dz; this.x += this.vx * dt * (this.air ? .6 : 1);
    this.offroad = Math.abs(this.x) > 1;
    // steering assist: off the road, the car is nudged back toward the lane (Low: gently, High: firmly)
    if (this.assist && Math.abs(this.x) > 1 && !this.air) this.x -= Math.sign(this.x) * (this.assist === 'High' ? .6 : .3) * dt;
    if (this.offroad && !this._offPrev) OB.bus.emit('car:offroad', { on: true });
    if (!this.offroad && this._offPrev) OB.bus.emit('car:offroad', { on: false });
    this._offPrev = this.offroad;
    // the slipstream: a car ahead in the lane builds it; the slingshot is the reward for pulling out of it
    if (env.inDraft && !this.air) { this.slip = Math.min(1, this.slip + 1.25 * dt); this.stats.slipTime += dt; if (!this.wasSlip) OB.bus.emit('slip:start', {}); }
    else { if (this.wasSlip && this.slip >= .8) { this.slingT = .8; this.slingBoost = T('slingshotBoost'); OB.bus.emit('slingshot', { v: this.v }); } if (this.wasSlip) OB.bus.emit('slip:end', {}); this.slip = Math.max(0, this.slip - 2.5 * dt); }
    this.wasSlip = !!env.inDraft && !this.air;
    if (this.slingT > 0) { this.slingT -= dt; this.slingBoost = T('slingshotBoost') * Math.min(1, this.slingT / .8); }
    // the edge: scenery at the road's edge, the rails and the walls stop the car; the sea pulls it in
    this.scrape = Math.max(0, this.scrape - dt);
    if (info.hits && info.hits.length && Math.abs(this.x) > 1.05 && this.invul <= 0) {
      if (this.v > 110) this.spin('scenery'); else { this.v *= .5; this.vx = -Math.sign(this.x) * .5; this.x = clamp(this.x, -1.02, 1.02); this.bumpT = .3; }
    }
    if (Math.abs(this.x) > 1.22) { this.x = 1.22 * Math.sign(this.x); this.vx = 0; if (this.v > 0) { this.v = Math.max(0, this.v - 40 * dt); this.scrape = .1; OB.bus.emit('car:scrape', {}); } }
    // the spin: a full turn, then the car is put back on the road
    if (this.crash) {
      this.crash.t -= dt; this.v = Math.max(0, this.v - 60 * dt);
      if (this.crash.t <= 0) { this.crash = null; this.v = Math.max(40, this.v * .3); this.x = clamp(this.x, -.75, .75); this.vx = 0; this.invul = 1; }
    }
    this.invul = Math.max(0, this.invul - dt);
    this.bumpT = Math.max(0, this.bumpT - dt);
    // the revs and gear, for the dial: the gear by the share of the top speed
    const f = this.v / Math.max(1, vt);
    this.gear = this.manual ? this.mgear : Math.min(5, 1 + Math.floor(f * 5));
    this.rpm = 1500 + 6500 * ((f * 5) % 1);
    this.stats.maxV = Math.max(this.stats.maxV, this.v);
    return this;
  }
  /** the drift: its entry (the brake tap, the down-up shift, the drift button), its angle, its exit and score */
  updateDrift(dt, intent, steer, v, curve = 0) {
    const D = this.drift, minV = T('driftMinSpeed'), brake = intent.brake || 0, pressed = !!intent.drift;
    if (intent.shiftDown) this.shiftDownT = this.t;
    if (intent.shiftUp && this.t - this.shiftDownT < .3 && v > 120 && Math.abs(steer) > .4 && !D.on) this.startDrift(steer, 'shift');
    // the brake tap: brake pressed and let go again inside the window, while steering
    if (brake > .3 && !this.brakeWas && this.tapOk !== false) { this.brakeT = 0; this.tapArm = true; }
    if (brake > .3) this.brakeT += dt;
    if (this.brakeWas && brake <= .3 && this.tapArm && this.brakeT <= T('driftTapWindow') && Math.abs(steer) > .4 && v > minV && !D.on) this.startDrift(steer, 'tap');
    if (brake <= .3) this.tapArm = this.tapArm && brake > .3;
    this.brakeWas = brake > .3;
    if (pressed && !this._drPrev && this.btnOk !== false && Math.abs(steer) > .4 && v > minV && !D.on) this.startDrift(steer, 'button');
    this._drPrev = pressed;
    if (!D.on) return;
    // the angle: toward the drift's target at 3.5 rad/s, capped
    const amax = T('driftAngleMax'), into = Math.sign(steer) === D.dir;
    let target = into ? D.dir * (.35 + .40 * Math.abs(steer)) : (Math.abs(steer) > .5 && !into ? D.dir * .12 : D.dir * .30);
    if (Math.abs(steer) < .05 && pressed) target = D.dir * .45;   // (the drift button holds it deeper)
    target = clamp(target, -amax, amax);
    D.a += clamp(target - D.a, -3.5 * dt, 3.5 * dt);
    D.t += dt; D.len += dt;
    D.score += v * Math.abs(D.a) * dt * 10;
    this.stats.bestDrift = Math.max(this.stats.bestDrift, D.score);
    // the exit: the angle straightens, the speed drops, a crash, or the curve eases and the stick is centred
    if (Math.abs(D.a) < .08) D.calm += dt; else D.calm = 0;
    const endCalm = D.calm > .2, lowV = v < 90;
    if (endCalm || lowV || this.crash) this.endDrift();
    else if (Math.abs(steer) < .05 && Math.abs(this.steerCur) < .05 && Math.abs(curve) < .5) { D.centred = (D.centred || 0) + dt; if (D.centred > .4) this.endDrift(); }
    else D.centred = 0;
  }
  startDrift(steer, how) {
    const D = this.drift; D.on = true; D.dir = Math.sign(steer) || 1; D.a = 0; D.t = 0; D.score = 0; D.len = 0; D.calm = 0; D.centred = 0; D.how = how;
    OB.bus.emit('drift:start', { dir: D.dir, how });
  }
  endDrift() {
    const D = this.drift; if (!D.on) return;
    D.on = false; this.stats.driftTotal = (this.stats.driftTotal || 0) + D.score; OB.bus.emit('drift:end', { score: Math.round(D.score), length: +D.len.toFixed(2) });
    D.a = 0; D.calm = 0; D.centred = 0;
  }
  /** a spin-out (scenery, a bump at speed, a collision): a full turn for 1.3 s, speed to 30%, then back on the road */
  spin(kind) {
    if (this.crash) return;
    this.endDrift();
    this.crash = { t: 1.3, kind };
    OB.bus.emit('car:crash', { kind });
  }
  /** a bump with another car: the closing speed decides the bump or the spin-out */
  collideWith(other) {
    const closing = this.v - other.v;
    if (closing < T('spinThreshold') && closing > -T('spinThreshold') * 4) {
      this.v = Math.max(20, other.v * .92 - 8); this.bumpT = .6; OB.bus.emit('car:bump', { with: other.id || 'car' });
      this.x += (this.x < other.x ? -.1 : .1);
      return 'bump';
    }
    this.v = Math.max(40, this.v * .3); this.spin('collision');
    return 'crash';
  }
}
OB.CarSim = CarSim;
})();
