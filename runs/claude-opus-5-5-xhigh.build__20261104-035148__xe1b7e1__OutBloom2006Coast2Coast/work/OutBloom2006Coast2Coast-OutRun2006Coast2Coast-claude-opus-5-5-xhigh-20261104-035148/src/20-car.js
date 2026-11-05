/* OutBloom — the car: speed and gears, steering, the push of a bend, the drift (brake tap, down-up shift or the Drift
 * button), slipstream and the slingshot, off-road, rails and walls, crests and air, gusts, bumps and spin-outs. Pure
 * and deterministic: it reads an intent and the road's info(), and every number is a live tuning value. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, { clamp } = E;
const GEAR_FR = [.18, .34, .5, .66, .82, 1];
const sgn = v => v < 0 ? -1 : v > 0 ? 1 : 0;
const A0CACHE = new Map();
/** the thrust at rest that gives a car its 0-100 km/h time (dv = A0 (1 - (v / top)^5)) */
function accelFor(top, t100) {
  const key = top + ':' + t100; if (A0CACHE.has(key)) return A0CACHE.get(key);
  const time = A => { let v = 0, t = 0; const dt = 1 / 120; while (v < 100 && t < 30) { v += A * (1 - Math.pow(v / top, 5)) * dt; t += dt; } return t; };
  let lo = 5, hi = 120; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (time(m) > t100) lo = m; else hi = m; }
  const A = (lo + hi) / 2; A0CACHE.set(key, A); return A;
}
OB.accelFor = accelFor;

class CarSim {
  constructor(spec, o = {}) {
    this.spec = spec; this.o = Object.assign({ transmission: 'auto', driftInput: 'all', assist: 'low', skill: 1, id: 'p1', isPlayer: true }, o);
    this.reset(0, 0);
  }
  reset(z, x) {
    Object.assign(this, { z, x, vx: 0, v: 0, gear: 0, rpm: 1500, branch: 0, slip: 0, slipping: false, slingT: 0, slingLeft: 0, slipSrc: null, slipTime: 0,
      air: false, airT: 0, airDur: 0, crash: null, invuln: 0, bumpT: 0, scrape: 0, offroad: false, offT: 0, yaw: 0, spinA: 0, lift: 0, bounce: 0, bounceV: 0,
      brakeT: 0, brakeHeld: false, shiftDownT: -9, wheelspin: 0, gust: null, started: false, drift: { on: false, dir: 0, a: 0, t: 0, score: 0, len: 0, lowT: 0, calmT: 0 },
      steerSm: 0, backfire: 0, lastGear: 0, contactT: 9, hard: false, skid: 0, splash: 0, lights: 0 });
  }
  get vtop() { return this.spec.top * OB.tune('topSpeedScale') * this.o.skill * (this.topMul || 1); }
  /** the safe speed (km/h) for a bend without drifting, for the brain and the assist */
  safeSpeed(curve) {
    const T = OB.tuning, sr = T.steerRate * this.spec.steer / 2.2 * .78 * .92, c = Math.abs(curve);
    if (c < .3) return 1e9; return this.vtop * Math.sqrt(sr / (c * T.curvePush));
  }
  /** one fixed step: intent { steer, gas, brake, driftBtn, driftPressed, shiftUp, shiftDown }, info (World.info),
   *  emit(name, data) (the race's bus with the car's id), extra { ahead: [{ dz, dx, v }] } */
  step(dt, it, info, emit, extra = {}) {
    const T = OB.tuning, sp = this.spec, vt0 = this.vtop, ev = (n, d) => emit && emit(n, Object.assign({ car: this.o.id }, d || {}));
    if (this.invuln > 0) this.invuln -= dt; if (this.bumpT > 0) this.bumpT -= dt; this.contactT += dt;
    // the spin-out: no control for 1.3 s, a full turn, then back on the road facing ahead
    if (this.crash) {
      const c = this.crash; c.t += dt; this.v = Math.max(0, this.v - 55 * dt); this.spinA = c.dir * Math.min(1, c.t / 1.3) * Math.PI * 2;
      this.x += (c.toX - this.x) * Math.min(1, dt * 2.2); this.z += this.v * OB.UNITS_PER_KMH * dt;
      if (c.t >= 1.3) { this.crash = null; this.spinA = 0; this.x = c.toX; this.vx = 0; this.invuln = 1; this.drift.on = false; this.drift.a = 0; }
      this.rpm = 1500 + this.v / vt0 * 3000; return;
    }
    // the slipstream: the nearest vehicle ahead in our wake
    let src = null;
    for (const a of extra.ahead || []) if (a.dz > 300 && a.dz < T.slipRange && Math.abs(a.dx) < T.slipWidth && (!src || a.dz < src.dz)) src = a;
    if (src && this.v > 100) { this.slip = Math.min(1, this.slip + 1.25 * dt); if (!this.slipping && this.slip > .5) { this.slipping = true; ev('slip:start'); } }
    else {
      if (this.slip >= .8 && this.slipSrc && this.v > 120) {   // pulled out of a full draft: the slingshot
        const s0 = (extra.ahead || []).find(a => a.id === this.slipSrc.id);
        if (s0 && s0.dz > 0 && s0.dz < T.slipRange * 1.3) { this.slingT = .8; this.slingLeft = T.slingshotBoost; ev('slingshot', { boost: T.slingshotBoost }); }
      }
      this.slip = Math.max(0, this.slip - 2.5 * dt); if (this.slipping && this.slip < .3) { this.slipping = false; ev('slip:end'); }
    }
    this.slipSrc = src; if (this.slip > .5) this.slipTime += dt;
    this.slingBonus = Math.max(0, (this.slingBonus || 0) - dt * 6);
    if (this.slingT > 0) this.slingBonus = this.slingLeft;
    const top = vt0 * (1 + T.slipTopBonus * this.slip) * (this.offroad ? T.offroadTop : 1) + this.slingBonus;
    // the engine and the gears
    const A0 = accelFor(vt0, sp.zeroTo100) * T.accelScale;
    const manual = this.o.transmission === 'manual';
    if (!manual) { let g = 0; while (g < 5 && this.v > GEAR_FR[g] * vt0 * .985) g++; if (g < this.gear && this.v > GEAR_FR[g] * vt0 * .93) g = this.gear; this.gear = g; }
    else { if (it.shiftUp && this.gear < 5) { this.gear++; ev('car:shift', { gear: this.gear, up: true }); this.lift = .15; if (this.shiftDownT > -.31 && OB.now() - this.shiftDownT < .3) this._tryDrift(it, 'shift', ev); } if (it.shiftDown && this.gear > 0) { this.gear--; this.shiftDownT = OB.now(); ev('car:shift', { gear: this.gear, up: false }); } }
    if (this.gear !== this.lastGear) { this.lastGear = this.gear; if (!manual) ev('car:shift', { gear: this.gear, auto: true }); }
    const hi = GEAR_FR[this.gear] * vt0, lo = this.gear ? GEAR_FR[this.gear - 1] * vt0 * .62 : 0;
    this.rpm = clamp(1500 + 6500 * (this.v - lo) / Math.max(1, hi - lo), 900, 8200);
    const gasIn = clamp(it.gas || 0, 0, 1), vcap = top * (.5 + .5 * gasIn);   // (part throttle holds a lower speed: the triggers are analog)
    let thrust = A0 * (1 - Math.pow(Math.min(1.2, this.v / Math.max(1, vcap)), 5));
    if (manual) { if (this.rpm < 2500) thrust *= .45; if (this.v >= hi * 1.01) thrust = Math.min(thrust, -4); }
    if (this.wheelspin > 0) { this.wheelspin -= dt; thrust *= .3; }
    if (this.lift > 0) { this.lift -= dt; thrust *= .4; }
    const gas = clamp(it.gas || 0, 0, 1), brake = clamp(it.brake || 0, 0, 1);
    let dv = 0;
    if (this.v > top) dv -= (this.v - top) * 1.6 + (this.offroad ? T.offroadDrag : 0);
    else if (this.v > vcap && gas >= .05) dv -= Math.min(20, (this.v - vcap) * .5);
    else dv += thrust * gas;
    if (gas < .05) { dv -= 8 + .00022 * this.v * this.v; if (this.rpm > 6000 && this.v > 150 && this.backfire <= 0) { this.backfire = .5; ev('car:backfire'); } }
    if (this.backfire > 0) this.backfire -= dt;
    dv -= brake * T.brakeDecel;
    if (this.slingT > 0) { dv += this.slingLeft / .8; this.slingT -= dt; }
    // the drift: entry, angle, effects, exit
    const D = this.drift, steer = clamp(it.steer || 0, -1, 1), di = this.o.driftInput;
    if (brake > .3) { if (!this.brakeHeld) { this.brakeHeld = true; this.brakeT = 0; } this.brakeT += dt; }
    else { if (this.brakeHeld && this.brakeT <= T.driftTapWindow && (di === 'all' || di === 'tap')) this._tryDrift(it, 'tap', ev); this.brakeHeld = false; }
    if (it.driftPressed && (di === 'all' || di === 'button')) this._tryDrift(it, 'button', ev);
    if (OB.cheats.autoDrift && !D.on && Math.abs(info.curve) >= 2.6 && this.v > 150 && extra.autoDrift !== false) this._tryDrift({ steer: sgn(info.curve) }, 'auto', ev);
    if (D.on) {
      const into = sgn(steer) === D.dir, mag = Math.abs(steer);
      let target = mag < .2 ? D.dir * .3 : into ? D.dir * (.35 + .4 * mag) : mag > .5 ? D.dir * .12 : D.dir * .22;
      if (it.driftBtn && (di === 'all' || di === 'button')) target *= 1.18;
      target = clamp(target, -T.driftAngleMax, T.driftAngleMax);
      D.a += clamp(target - D.a, -3.5 * dt, 3.5 * dt);
      D.t += dt; D.len += this.v * OB.UNITS_PER_KMH * dt; D.score += this.v * Math.abs(D.a) * dt * 10;
      dv -= T.driftSpeedLoss * Math.abs(D.a) / .75;
      D.lowT = Math.abs(D.a) < .08 ? D.lowT + dt : 0;
      D.calmT = Math.abs(info.curve) < .5 && mag < .2 ? D.calmT + dt : 0;
      if (D.lowT > .2 || this.v < 90 || D.calmT > .4) this._endDrift(ev);
    } else if (Math.abs(D.a) > 0) { D.a += clamp(-D.a, -4 * dt, 4 * dt); }
    this.skid = D.on ? Math.abs(D.a) : (brake > .7 && this.v > 80 ? .4 : 0);
    // off-road drag
    if (this.offroad && this.v > vt0 * T.offroadTop) dv -= T.offroadDrag;
    this.v = Math.max(0, this.v + dv * dt);
    if (it.reverse && this.v < 1 && brake > .5) this.v = 0;
    // steering and the bend's push
    const f = this.v / Math.max(1, vt0);
    let rate = T.steerRate * sp.steer / 2.2 * (D.on ? T.driftSteerBoost : 1);
    let vxT = steer * rate * Math.min(1, this.v / 70) * (1 - .22 * Math.min(1, f));
    if (this.air) vxT *= .3;
    this.vx += (vxT - this.vx) * Math.min(1, T.steerResponse * dt);
    if (this.gust) { const g = this.gust; g.t += dt; this.vx += g.dir * 1.1 * Math.sin(Math.min(1, g.t / 1.2) * Math.PI) * dt * 2.2; if (g.t >= 1.2) this.gust = null; }
    let push = 0;
    if (!this.air) {
      const grip = T.driftGrip * sp.grip / .85, inBend = D.on && sgn(D.a) === sgn(info.curve);
      push = info.curve * f * f * T.curvePush * (D.on ? (inBend ? 1 - clamp(grip, 0, 1) * Math.min(1, Math.abs(D.a) / .5) : 1.15) : 1);
    }
    // the assist: back toward the road when off it; on High, a touch of brake before a bend the car can't make
    const as = this.o.assist, ak = as === 'high' ? .6 : as === 'low' ? .3 : 0;
    if (ak && Math.abs(this.x) > 1 && !info.junction) this.vx -= sgn(this.x) * ak * dt * 2;
    if (as === 'high' && extra.curveAhead !== undefined && !D.on && this.v > this.safeSpeed(extra.curveAhead) * 1.02) this.v = Math.max(0, this.v - 60 * dt);
    this.x += (this.vx - push) * dt;
    this.z += this.v * OB.UNITS_PER_KMH * dt;
    // edges: rails, walls, cliffs and facades hold the car; water without a rail splashes
    const edge = info.edge, limit = edge ? (edge.off || 1.18) - OB.PLAYER_HW * 1.05 : 9;
    this.scrape = Math.max(0, this.scrape - dt);
    const rel = this.x;
    if (edge && Math.abs(this.x) > limit && !info.junction) {
      this.x = sgn(this.x) * limit; this.vx = -sgn(rel) * Math.abs(this.vx) * .2; this.v = Math.max(0, this.v - 40 * dt);
      if (this.scrape <= 0) ev('car:scrape', { side: sgn(rel) }); this.scrape = .25; this.contactT = 0; if (D.on) this._endDrift(ev);
    }
    const off = !info.onRoad;
    if (off !== this.offroad) { this.offroad = off; ev('car:offroad', { on: off }); }
    this.offT = off ? this.offT + dt : 0;
    if (off && info.ground === 'water' && !edge && !info.junction && Math.abs(info.absX) > 1.45 && this.v > 20) { this.splash = 1; this.spin('water', ev, this.x > 0 ? .75 : -.75); }
    // crests and air
    if (!this.air && info.curv < -1e-4 && this.v > 200) { this.air = true; this.airT = 0; this.airDur = clamp(.25 + (-info.curv - 1e-4) * 2500 * (this.v / 300), .3, .6); ev('air:start'); }
    if (this.air) { this.airT += dt; if (this.airT >= this.airDur) { this.air = false; this.hard = this.airDur > .45; this.bounceV = this.hard ? -60 : -35; ev('air:land', { hard: this.hard, t: this.airDur }); } }
    // the suspension: a spring on bumps, rumble strips and landings
    const rumble = Math.abs(rel) > .98 && Math.abs(rel) < 1.1 && this.v > 40;
    this.bounceV += (-this.bounce * 260 - this.bounceV * 14) * dt + (rumble ? Math.sin(OB.now() * 60) * 40 * dt : 0) + (off && this.v > 30 ? Math.sin(OB.now() * 37) * 70 * dt : 0);
    this.bounce += this.bounceV * dt;
    // the visual yaw: the lateral speed plus the drift's angle
    this.yaw = clamp(this.vx * .16, -.4, .4) + D.a;
    this.steerSm += (steer - this.steerSm) * Math.min(1, dt * 10);
  }
  _tryDrift(it, how, ev) {
    const T = OB.tuning, D = this.drift, steer = it.steer || 0;
    if (D.on || this.crash || this.air || this.v <= T.driftMinSpeed || Math.abs(steer) <= .4) return false;
    Object.assign(D, { on: true, dir: sgn(steer), t: 0, score: 0, len: 0, lowT: 0, calmT: 0, how });
    if (Math.abs(D.a) < .1) D.a = D.dir * .12;
    ev('drift:start', { dir: D.dir, how }); return true;
  }
  _endDrift(ev) { const D = this.drift; if (!D.on) return; D.on = false; ev('drift:end', { score: Math.round(D.score), length: Math.round(D.len), t: +D.t.toFixed(2) }); }
  /** a spin-out (a crash): 1.3 s of a full turn, speed to 30 % (at least 40 km/h) */
  spin(kind, ev, toX) {
    if (this.crash || this.invuln > 0) return false;
    if (this.drift.on) this._endDrift(ev || (() => {}));
    this.crash = { t: 0, kind, dir: this.vx >= 0 ? 1 : -1, toX: toX !== undefined ? toX : (this.x >= 0 ? .75 : -.75) };
    this.v = Math.max(Math.min(this.v, 40), this.v * .3); this.slip = 0; this.slingT = 0; this.contactT = 0;
    if (ev) ev('car:crash', { with: kind }); return true;
  }
  /** a bump from behind or the side: speed matched below the other's */
  bump(otherV, side, ev, kind) {
    const T = OB.tuning;
    if (side) { this.x += side * .08; this.vx = side * .6; this.v *= .92; }
    else this.v = Math.max(0, Math.min(this.v, otherV * (1 - T.bumpSpeedLoss) - 8));
    this.contactT = 0; this.bumpT = .3; if (this.drift.on && ev) this._endDrift(ev);
    if (ev) ev('car:bump', { with: kind || 'car', side });
  }
}
OB.CarSim = CarSim;
OB.GEAR_FR = GEAR_FR;

/* the player's intent from an input: the stick as read, the keyboard's steering ramped (0 to 1 in .12 s, back in .08 s) */
OB.readIntent = (I, st, dt) => {
  const mv = I.move()[0], kb = I.lastDevice === 'keyboard' || I.lastDevice === 'mouse';
  let steer = mv;
  if (kb) { const target = Math.abs(mv) > .5 ? sgn(mv) : 0; const rate = target === 0 || sgn(target) !== sgn(st.kSteer || 0) ? dt / .08 : dt / .12; st.kSteer = (st.kSteer || 0) + clamp(target - (st.kSteer || 0), -rate, rate); steer = st.kSteer; }
  else st.kSteer = steer;
  return { steer, gas: I.analog('gas'), brake: I.analog('brake'), driftBtn: I.down('drift'), driftPressed: I.pressed('drift'), shiftUp: I.pressed('shiftUp'), shiftDown: I.pressed('shiftDown'),
    horn: I.pressed('horn'), camera: I.pressed('camera'), radio: I.pressed('radio') };
};
})();
