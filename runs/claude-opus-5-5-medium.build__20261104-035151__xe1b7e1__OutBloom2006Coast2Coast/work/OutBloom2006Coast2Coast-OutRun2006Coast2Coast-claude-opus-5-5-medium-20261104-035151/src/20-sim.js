/* The simulation, pure and deterministic (fixed dt, seeded streams; it never draws):
 * OB.CarSim  a car: speed, gears, steering, curve push, drift, slipstream, off-road, rails, collisions, crests, gusts
 * OB.Traffic lane traffic per stage: spawn, lane changes, junction branches, near misses and overtakes
 * OB.Brain   the AI driver every bot uses (rivals, attract mode, tests, the Versus CPU, Dev Mode's auto drive) */
(() => {
'use strict';
const OB = window.OB, E = OB.E, tu = k => OB.tuning[k], clamp = E.clamp;
const SEG = OB.SEG, KMH = OB.KMH, W = OB.World;
const GEARS = [.24, .4, .56, .72, .87, 1];
const accCache = {}, PULL = 3.2;
/** A0 (km/h a second at rest) so the car reaches 100 km/h in its 0-100 time with pull (1 - (v/top)^PULL) */
function accelFor(top, t100) {
  const key = top + ':' + t100; if (accCache[key]) return accCache[key];
  let lo = 5, hi = 200;
  for (let it = 0; it < 30; it++) { const A = (lo + hi) / 2; let v = 0, t = 0; while (v < 100 && t < 30) { v += A * (1 - Math.pow(v / top, PULL)) * .01; t += .01; } if (t > t100) lo = A; else hi = A; }
  return (accCache[key] = (lo + hi) / 2);
}
OB.accelFor = accelFor;

class CarSim {
  constructor(o = {}) {
    this.id = o.id || 'p1'; this.model = o.model || 'orchidea'; this.stage = o.stage || 'S1'; this.z = o.z || 0; this.x = o.x || 0; this.side = 0;
    this.v = 0; this.vx = 0; this.gear = 1; this.rpm = 1500; this.manual = !!o.manual; this.hw = .17; this.len = 1000;
    this.drift = { on: false, dir: 0, a: 0, t: 0, score: 0, low: 0, center: 0 }; this.slip = 0; this.slipSrc = null; this.slingT = 0; this.sling = 0;
    this.air = 0; this.airT = 0; this.crash = { t: 0, kind: null, spin: 0 }; this.invuln = 0; this.scrape = 0; this.offroadT = 0; this.bumpT = 0;
    this.brakeT = 0; this.wasBrake = false; this.downT = 9; this.yaw = 0; this.steerVis = 0; this.bounce = 0; this.rev = 0; this.boost = 0; this.distance = 0; this.contacts = 0;
    this.cheats = o.cheats || {}; this.lastHit = -9; this.gustT = 0; this.held = false; this.wet = 0;
  }
  get stats() {
    const c = OB.CARS[this.model], top = c.top * tu('topSpeedScale') * (this.topMul || 1) * (this.rival ? tu('rivalSkill') : 1);
    return { top, A: accelFor(top, c.acc * .72) * tu('accelScale'), steer: c.steer, grip: c.grip };
  }
  /** one fixed step. intent: { steer -1..1, gas 0..1, brake 0..1, drift (held), driftPress, shiftUp, shiftDown };
   *  ctx: { traffic: [vehicles in this car's stage], others: [cars], race } */
  step(dt, intent, ctx = {}) {
    const S = W.get(this.stage), st = this.stats, info = W.info(S, this.z, this.x, this.side), ch = this.cheats;
    this.info = info;
    const g = OB.bus, emit = (n, d) => g.emit(n, Object.assign({ car: this.id }, d || {}));
    let gas = clamp(intent.gas || 0, 0, 1), brake = clamp(intent.brake || 0, 0, 1), steer = clamp(intent.steer || 0, -1, 1);
    if (this.held) { gas = 0; brake = 1; steer = 0; }
    this.invuln = Math.max(0, this.invuln - dt); this.bumpT = Math.max(0, this.bumpT - dt); this.downT += dt;
    // ---- a crash: a full spin to a near stop, then back on the road facing ahead ----
    if (this.crash.t > 0) {
      this.crash.t -= dt; this.crash.spin += dt * Math.PI * 2 / 1.3 * (this.crash.dir || 1);
      this.v = Math.max(0, this.v - 80 * dt); this.vx *= .9; this.x += this.vx * dt;
      if (this.crash.t <= 0) { this.crash.t = 0; this.crash.spin = 0; this.invuln = 1; if (!info.onRoad) this.x = (this.side && info.junc ? this.side * info.spread : 0) + Math.sign(info.rel || 1) * .75 * info.w; this.drift.on = false; }
      this._move(dt, S); this.yaw = this.crash.spin; return;
    }
    // ---- engine and gears ----
    let top = st.top * (1 + tu('slipTopBonus') * this.slip);
    if (!info.onRoad && !this.air) {
      const water = OB.GROUND_WATER[info.ground] && !info.edge;
      if (water && Math.abs(info.rel) > info.w * 1.4) { this._crash('splash', ctx); emit('car:splash'); return; }
      top *= tu('offroadTop'); this.offroadT += dt; if (this.offroadT > .05 && this.offroadT - dt <= .05) emit('car:offroad', { on: true });
    } else { if (this.offroadT > .05) emit('car:offroad', { on: false }); this.offroadT = 0; }
    const v = this.v;
    let gearTop = top;
    if (this.manual) {
      if (intent.shiftUp && this.gear < 6) { this.gear++; emit('car:shift', { gear: this.gear }); }
      if (intent.shiftDown && this.gear > 1) { this.gear--; emit('car:shift', { gear: this.gear }); this._downShift = this.downT = 0; }
      if (intent.shiftUp && this.downT < .3) this._driftTry('shift', steer, emit);
      gearTop = st.top * GEARS[this.gear - 1];
    } else { let gi = 0; while (gi < 5 && v > st.top * GEARS[gi] * .92) gi++; if (gi + 1 !== this.gear) { this.gear = gi + 1; emit('car:shift', { gear: this.gear, auto: true }); } }
    const lo = this.gear > 1 ? st.top * GEARS[this.gear - 2] : 0, hi = st.top * GEARS[this.gear - 1];
    this.rpm = clamp(1500 + 6500 * (v - lo * .9) / Math.max(1, hi - lo * .9), 900, 8200);
    let dv = 0;
    if (gas > 0 && v < Math.min(top, gearTop)) { let pull = st.A * (1 - Math.pow(v / st.top, PULL)); if (this.manual && this.rpm < 2500 && this.gear > 1) pull *= .45; dv += Math.max(4, pull) * gas; }
    else if (gas > 0 && v > gearTop) dv -= 20;
    if (v > top) dv -= v > st.top * tu('offroadTop') && !info.onRoad ? tu('offroadDrag') : 60;
    if (!gas) dv -= 18 + .00025 * v * v * (this.slip > .3 ? .5 : 1);
    if (brake > 0 && !this.drift.on) dv -= brake * tu('brakeDecel');
    if (this.drift.on) dv -= tu('driftSpeedLoss') * Math.abs(this.drift.a) / .75;
    if (this.scrape > 0) dv -= 40;
    if (info.slope) dv -= info.slope * 30;
    if (this.slingT > 0) { this.slingT -= dt; dv += this.sling / .8; }
    if (this.boost > 0) { const b = Math.min(this.boost, 60 * dt); this.v += b; this.boost -= b; }
    this.v = clamp(this.v + dv * dt, 0, st.top * 1.15);
    // ---- drift: entry by a brake tap, a down-up shift or the drift button; angle, counter-steer, exit ----
    const mode = OB.game && OB.game.settings && OB.game.settings.driftInput || 'all';
    if (brake > .3) this.brakeT += dt; else { if (this.wasBrake && this.brakeT > 0 && this.brakeT <= tu('driftTapWindow') && mode !== 'button' && !intent.noTap) this._driftTry('tap', steer, emit); this.brakeT = 0; }
    this.wasBrake = brake > .3;
    if (intent.driftPress && mode !== 'tap') this._driftTry('button', steer, emit);
    if (ch.autoDrift && !this.drift.on && Math.abs(info.curve) >= 3.5 && this.v > 150) { this.drift.on = true; this.drift.dir = Math.sign(info.curve); this.drift.t = 0; this.drift.score = 0; emit('drift:start', { dir: this.drift.dir }); }
    const d = this.drift;
    if (d.on) {
      d.t += dt;
      const into = Math.sign(steer) === d.dir, mag = Math.abs(steer);
      let target = d.dir * (into ? .35 + .4 * mag : mag < .2 ? .3 : .12);
      if (!into && mag > .5) target = d.dir * .04;
      if (intent.drift) target = d.dir * Math.min(tu('driftAngleMax'), Math.abs(target) + .15);
      if (ch.autoDrift) target = d.dir * .55;
      target = clamp(target, -tu('driftAngleMax'), tu('driftAngleMax'));
      d.a += clamp(target - d.a, -3.5 * dt, 3.5 * dt);
      d.score += this.v * Math.abs(d.a) * dt * 10;
      if (Math.abs(d.a) < .08) d.low += dt; else d.low = 0;
      if (Math.abs(info.curve) < .5 && mag < .2 && !intent.drift) d.center += dt; else d.center = 0;
      if (d.low > .2 || this.v < 90 || d.center > .4 || (ch.autoDrift && Math.abs(info.curve) < 1 && d.t > .6)) this._driftEnd(emit);
    } else d.a += (0 - d.a) * Math.min(1, dt * 8);
    // ---- steering and the curve's push ----
    const vk = this.v / st.top, dk = d.on ? tu('driftSteerBoost') : 1, airK = this.air > 0 ? .3 : 1;
    let target = steer * tu('steerRate') * st.steer / 2.2 * Math.min(1, this.v / 70) * (1 - .22 * vk) * dk * airK;
    const assist = OB.game && OB.game.settings ? OB.game.settings.assist : 'low';
    if (!info.onRoad && assist !== 'off') target += -Math.sign(info.rel) * (assist === 'high' ? .6 : .3);
    this.vx += (target - this.vx) * Math.min(1, tu('steerResponse') * dt);
    const gripK = d.on ? 1 - tu('driftGrip') * (st.grip / .85) * Math.min(1, Math.abs(d.a) / .5) : 1;
    const push = this.air > 0 ? 0 : info.curve * vk * vk * tu('curvePush') * gripK;
    this.x += (this.vx - push) * dt;
    if (info.gust) { this.x += info.gust * .55 * dt * vk; if (this.gustT <= 0) { emit('gust', { dir: info.gust }); this.gustT = 2; } } this.gustT -= dt;
    // ---- edges: rails and walls hold the car, scraping ----
    this.scrape = 0;
    const edgeLim = e => e === 'rail' ? 1.13 : e === 'stonewall' ? 1.12 : e ? 1.2 : 0;
    for (const side of [-1, 1]) {
      const e = side < 0 ? info.edgeL : info.edgeR; if (!e || info.junc) continue;
      const lim = edgeLim(e) * info.w - this.hw;
      if (side * info.rel > lim) { this.x -= (side * info.rel - lim) * side; this.vx = -side * .2; this.scrape = 1; if (!this._scraping) emit('car:scrape', { side }); if (this.v > 60) this.contacts += 0; }
    }
    if (this.scrape && !this._scraping) this.contacts++;
    this._scraping = !!this.scrape;
    // ---- crests: a hard crest at speed lifts the car ----
    if (this.air > 0) { this.air -= dt; if (this.air <= 0) { this.air = 0; this.bounce = 1; emit('air:land', { hard: this.airT > .45 }); } }
    else if (info.crest < -95 * Math.pow(200 / Math.max(120, this.v), 2) && this.v > 200 && !info.tunnel) { this.air = this.airT = clamp(.25 + (this.v - 200) / 300, .3, .6); emit('air:start', { t: this.air }); }
    // ---- slipstream behind the vehicle ahead, and the slingshot out of it ----
    let src = null;
    for (const o of ctx.traffic || []) { const dz = o.z - this.z, dx = Math.abs(o.x - this.x); if (dz > 300 && dz < tu('slipRange') && dx < tu('slipWidth') && (!src || dz < src.z - this.z)) src = o; }
    for (const o of ctx.others || []) if (o !== this && o.stage === this.stage) { const dz = o.z - this.z, dx = Math.abs(o.x - this.x); if (dz > 300 && dz < tu('slipRange') && dx < tu('slipWidth') && this.v > 100) src = o; }
    const before = this.slip;
    if (src && this.v > 100) { this.slip = Math.min(1, this.slip + 1.25 * dt); if (before < .5 && this.slip >= .5) emit('slip:start'); }
    else { if (before >= .8 && this.v > 140) { this.slingT = .8; this.sling = tu('slingshotBoost'); emit('slingshot'); } if (before >= .5 && this.slip - 2.5 * dt < .5) emit('slip:end'); this.slip = Math.max(0, this.slip - 2.5 * dt); }
    this.slipSrc = src;
    // ---- collisions: traffic, rivals, the other player; scenery off the road ----
    if (!ch.noCollide && this.invuln <= 0) {
      for (const o of (ctx.traffic || []).concat((ctx.others || []).filter(c => c !== this && c.stage === this.stage && !c.ghost))) this._collide(o, ctx, emit);
      if (!info.onRoad || info.junc) for (const th of W.hits(S, this.z + 260, this.x, this.hw)) {
        if (th.a === 'cushion' || th.a === 'forksign') { this.v *= .55; this.x += (this.x >= 0 ? 1 : -1) * .35; this.invuln = .6; this.contacts++; emit('car:bump', { with: 'cushion' }); break; }
        if (this.v > 110) { this._crash('scenery', ctx); emit('car:crash', { with: th.a }); }
        else { this.v *= .5; this.x = (this.side && info.junc ? this.side * info.spread : 0) + Math.sign(info.rel) * (info.w - .1); this.invuln = .6; this.contacts++; emit('car:bump', { with: th.a }); }
        break;
      }
    }
    this._move(dt, S);
    // what the sprite shows: steering, the drift's angle, a bump's bounce
    this.steerVis += (steer - this.steerVis) * Math.min(1, dt * 10);
    this.yaw = this.vx * .12 + d.a;
    this.bounce = Math.max(0, this.bounce - dt * 3);
  }
  _move(dt, S) { const dz = this.v * KMH * dt; this.z += dz; this.distance += dz; }
  _driftTry(how, steer, emit) {
    if (this.drift.on || this.v < tu('driftMinSpeed') || Math.abs(steer) < .4 || this.crash.t > 0) return false;
    const d = this.drift; d.on = true; d.dir = Math.sign(steer); d.t = 0; d.score = 0; d.low = 0; d.center = 0; d.how = how;
    emit('drift:start', { dir: d.dir, how }); return true;
  }
  _driftEnd(emit) { const d = this.drift; if (!d.on) return; d.on = false; emit('drift:end', { score: Math.round(d.score), length: +d.t.toFixed(2) }); }
  _crash(kind, ctx) {
    if (this.crash.t > 0) return;
    this._driftEnd((n, d) => OB.bus.emit(n, Object.assign({ car: this.id }, d)));
    this.crash = { t: 1.3, kind, spin: 0, dir: this.x > 0 ? -1 : 1 }; this.v = Math.max(this.v * .3, Math.min(this.v, 40)); this.slip = 0; this.contacts++;
  }
  _collide(o, ctx, emit) {
    if (o.crash && o.crash.t > 0 && o.kind !== 'traffic') return;
    const dz = o.z - this.z, len = ((o.len || 1000) + this.len) / 2, dx = Math.abs(o.x - this.x), wsum = (o.hw || .17) + this.hw;
    if (Math.abs(dz) > len * .75 || dx > wsum * .9) return;
    if (this.bumpT > 0 && o === this.lastBump) return;
    const closing = (this.v - (o.v || 0)) * (dz > 0 ? 1 : -1);
    if (Math.abs(dz) < len * .35) {   // side by side: pushed apart
      const s = this.x < o.x ? -1 : 1; this.x += s * .06; this.vx = s * .5; this.v *= .92; if (o.x !== undefined && o.kind !== 'traffic') o.x -= s * .06;
      this.bumpT = .4; this.lastBump = o; this.contacts++; emit('car:bump', { with: o.kind || 'car', side: true }); return;
    }
    if (dz > 0 && closing > tu('spinThreshold') * (o.kind === 'traffic' ? 1 : 1.3)) {
      this._crash('traffic', ctx); emit('car:crash', { with: o.kind || 'car' });
      if (o.kind === 'traffic') { o.spin = 1.2; o.v *= .5; } else if (o.hit) o.hit();
    } else if (dz > 0) {
      this.v = Math.max(0, (o.v || 0) * .92 - 8 - this.v * tu('bumpSpeedLoss')); this.x += this.x < o.x ? -.08 : .08;
      this.bumpT = .6; this.lastBump = o; this.contacts++; this.bounce = 1; emit('car:bump', { with: o.kind || 'car' });
    } else { if (o.kind !== 'traffic' && o.v !== undefined) { o.v = Math.max(0, this.v * .92 - 8); } this.bumpT = .5; this.lastBump = o; }
  }
}
OB.CarSim = CarSim;

/* ---- traffic ---- */
class Traffic {
  constructor(o = {}) { this.list = []; this.seed = o.seed || 1; this.rngs = {}; this.active = new Set(); this.n = 0; this.mult = o.mult || 1; this.hub = o.hub; }
  _rng(label) { return this.rngs[label] || (this.rngs[label] = this.hub && window.AIHub && window.AIHub.rng ? window.AIHub.rng('traffic:' + label) : OB.rand.stream('traffic:' + label, this.seed)); }
  /** fill a stage with its traffic (once per run) */
  activate(id, fromZ = 0) {
    if (this.active.has(id)) return; this.active.add(id);
    const st = OB.STAGES[id], S = OB.World.get(id), r = this._rng(id), mix = Object.entries(st.traffic), sum = mix.reduce((a, b) => a + b[1], 0);
    const diff = OB.game && OB.game.settings ? { easy: .75, normal: 1, hard: 1.3 }[OB.game.settings.difficulty] || 1 : 1;
    const dens = (st.density + (st.diff >= 4 ? .05 : 0)) * 1.7 * tu('trafficDensity') * diff * this.mult;
    const n = Math.round(dens * st.lanes * S.len * SEG / 10000);
    for (let i = 0; i < n; i++) {
      let pick = r() * sum, type = mix[0][0]; for (const [t, wgt] of mix) { pick -= wgt; if (pick <= 0) { type = t; break; } }
      const lane = Math.floor(r() * st.lanes), z = Math.max(fromZ + 3000, 40 * SEG) + r() * (S.len * SEG - Math.max(fromZ + 3000, 40 * SEG));
      this.add({ stage: id, z, lane, type, r });
    }
  }
  add({ stage, z, lane, type, r, v, color, ribbon }) {
    const T = OB.TRAFFIC[type], st = OB.STAGES[stage], rr = r || this._rng(stage);
    const near = this.list.filter(o => o.stage === stage && Math.abs(o.z - z) < 1000);
    if (near.some(o => o.lane === lane) && !ribbon) return null;
    if (!ribbon && near.length >= st.lanes - 1) return null;   // always leave a way through
    const veh = { kind: 'traffic', id: ++this.n, stage, z, lane, x: this.laneX(lane, st.lanes), type, hw: T.hw, len: T.len, v: v || (T.v[0] + rr() * (T.v[1] - T.v[0])) * tu('trafficSpeedScale'), color: color || T.colors[Math.floor(rr() * T.colors.length)], laneT: 0, from: lane, blink: 0, side: 0, spin: 0, honk: 0, brake: 0, passed: {}, ribbon: ribbon || null };
    veh.v0 = veh.v; this.list.push(veh); return veh;
  }
  laneX(lane, lanes) { return -1 + (2 * lane + 1) / lanes; }
  /** a step for every vehicle; players: the cars that count for despawning and detection */
  step(dt, players, frozen) {
    const L = this.list;
    for (const o of L) {
      const S = OB.World.get(o.stage), st = OB.STAGES[o.stage], seg = OB.World.seg(S, o.z);
      if (o.spin > 0) { o.spin -= dt; o.v = Math.max(0, o.v - 60 * dt); }
      else if (!frozen) {
        // blocked by a slower vehicle ahead in the lane: blink, then change lane if the next one is free
        const ahead = L.find(p => p !== o && p.stage === o.stage && p.lane === o.lane && p.z > o.z && p.z - o.z < 1200 && p.v < o.v - 3);
        o.brake = 0;
        if (o.ribbon) { const pr = o.ribbon.pair; if (pr) o.v = pr.v; }
        else if (ahead && !o.laneT) {
          const opts = [o.lane - 1, o.lane + 1].filter(l => l >= 0 && l < st.lanes && !L.some(p => p !== o && p.stage === o.stage && (p.lane === l || p.to === l && p.laneT) && Math.abs(p.z - o.z) < (st.lanes < 3 ? 2600 : 1100)));
          if (opts.length) { o.to = opts[(o.id + Math.floor(o.z)) % opts.length]; o.blink = .8; o.laneT = 0.0001; }
          else { o.v = Math.max(ahead.v, o.v - 30 * dt); o.brake = 1; }
        }
        if (o.horned > 0) { o.horned -= dt; }
        if (o.laneT) { if (o.blink > 0) o.blink -= dt; else { o.laneT += dt / 1.2; if (o.laneT >= 1) { o.lane = o.to; o.laneT = 0; } } }
        if (!ahead && o.v < o.v0 && !o.ribbon) o.v = Math.min(o.v0, o.v + 10 * dt);
      }
      if (!frozen) o.z += o.v * KMH * dt;
      // its x: the lane (eased mid-change), plus its branch's spread inside a junction
      const lanes = seg.lanes || st.lanes, lx = this.laneX(Math.min(o.lane, lanes - 1), lanes) * seg.w, tx = o.laneT ? this.laneX(Math.min(o.to, lanes - 1), lanes) * seg.w : lx;
      let x = o.laneT ? lx + (tx - lx) * OB.easeInOut(o.laneT) : lx;
      if (o.ribbon) x += o.ribbon.dx || 0;
      if (seg.junc) { if (!o.side) { const r = this._rng(o.stage + ':j'); o.side = o.ribbon && o.ribbon.pair && o.ribbon.pair.side ? o.ribbon.pair.side : r() < .5 ? -1 : 1; } x += o.side * OB.World.spread(S, o.z); }
      o.x = x; o.yawVis = o.laneT && o.blink <= 0 ? (o.to > o.lane ? .12 : -.12) : 0;
      if (o.honk > 0) o.honk -= dt;
      // the end of a stage: into the branch it took
      if (o.z >= S.segs.length * SEG) {
        const nx = OB.forkOf(o.stage);
        if (!nx) { o.dead = true; continue; }
        o.stage = nx[o.side < 0 ? 0 : 1]; o.z -= S.segs.length * SEG; o.side = 0; o.lane = Math.min(o.lane, OB.STAGES[o.stage].lanes - 1); o.laneT = 0;
      }
    }
    // despawn what every player has left far behind
    for (const o of L) {
      const ps = players.filter(p => p.stage === o.stage);
      if (!ps.length) { if (!players.some(p => this._ahead(o.stage, p.stage))) o.dead = true; }
      else if (o.z < Math.min(...ps.map(p => p.z)) - 3000) o.dead = true;
    }
    if (L.some(o => o.dead)) this.list = L.filter(o => !o.dead);
  }
  // is stage a ahead of (or the same as) stage b on some route? (rows only go forward)
  _ahead(a, b) { return OB.STAGES[a].row >= OB.STAGES[b].row; }
  inStage(id) { return this.list.filter(o => o.stage === id); }
  /** the horn: the vehicle ahead in the car's lane within 2,500 changes lane if it can */
  horn(car) {
    const o = this.list.filter(p => p.stage === car.stage && p.z > car.z && p.z - car.z < 2500 && Math.abs(p.x - car.x) < .3).sort((a, b) => a.z - b.z)[0];
    if (!o || o.laneT || o.ribbon) return null;
    const st = OB.STAGES[o.stage], opts = [o.lane - 1, o.lane + 1].filter(l => l >= 0 && l < st.lanes && !this.list.some(p => p !== o && p.stage === o.stage && p.lane === l && Math.abs(p.z - o.z) < 900));
    if (!opts.length) return null;
    o.to = opts[0]; o.blink = .3; o.laneT = 0.0001; o.honk = 1; return o;
  }
  /** overtakes and near misses for a car this step (call after both moved) */
  detect(car, emit) {
    for (const o of this.list) {
      if (o.stage !== car.stage) { delete o.passed[car.id]; continue; }
      const dz = o.z - car.z, was = o.passed[car.id];
      if (was !== undefined && was > 0 && dz <= 0) {
        const dx = Math.abs(o.x - car.x), gap = dx - (o.hw + car.hw), clean = car.contacts === (o.contactsAt || {})[car.id];
        if (dx < .9 && car.v > o.v) {
          emit('overtake', { id: o.id, kind: o.type, car: car.id, clean: car.lastBump !== o });
          if (gap > 0 && gap < .12 && car.v - o.v > 50 && car.lastBump !== o) emit('nearmiss', { id: o.id, car: car.id, gap: +gap.toFixed(3) });
        }
      }
      if (dz > 0 && dz < 3000) { (o.contactsAt || (o.contactsAt = {}))[car.id] = car.contacts; }
      o.passed[car.id] = dz;
    }
  }
}
OB.Traffic = Traffic;

/* ---- the AI driver: the same intent a player gives ---- */
class Brain {
  constructor(o = {}) { this.o = Object.assign({ skill: 1, drift: true, look: 2600, line: .35, plan: null, aggression: .5, avoid: true, targets: null, brakeLate: 0 }, o); this.forkI = 0; this.prevSide = 0; this.wantSide = 0; }
  intent(car, ctx = {}) {
    const o = this.o, S = OB.World.get(car.stage), st = car.stats, I = { steer: 0, gas: 1, brake: 0, drift: false, driftPress: false, noTap: true };
    // look ahead: the hardest bend coming, where to be across the road
    let maxC = 0, cSign = 0, firstC = 0;
    for (let d = 400; d <= o.look + car.v * 6; d += 200) { const c = OB.World.seg(S, car.z + d).curve; if (Math.abs(c) > Math.abs(maxC)) { maxC = c; } if (!firstC && Math.abs(c) > .5) firstC = c; }
    cSign = Math.sign(firstC || maxC);
    const info = OB.World.info(S, car.z + 600, car.x, car.side);
    // which branch at a fork: a plan ('L'/'R' each fork), the passenger's wish, or the road open
    let centre = 0;
    if (S.juncStart >= 0 && car.z > (S.juncStart - 40) * SEG) {
      if (!this.wantSide) { const p = (typeof o.plan === 'function' ? o.plan(car) : o.plan && o.plan[this.forkI]) || 'L'; this.wantSide = p === 'R' ? 1 : -1; this.forkI++; }
      const side = car.side || this.wantSide; centre = side * OB.World.spread(S, car.z + 1400);
    } else this.wantSide = 0;
    let tx = centre + o.line * cSign * Math.min(1, Math.abs(firstC || maxC) / 3) * info.w * .8;
    // targets (request objects to hit) and things to avoid (bees, the wrong side of a cone)
    this.ignore = null;
    this.hadTarget = false;
    if (o.targets) { const tg = o.targets(car); if (tg) { tx = tg.x; this.ignore = tg.ignore; this.hadTarget = true; } }
    // traffic: pick the free lane with the most room ahead
    if (o.avoid && ctx.traffic) {
      const lanes = info.lanes, w = info.w, laneX = l => centre + (-1 + (2 * l + 1) / lanes) * w;
      let nearV = 0;
      const blocked = (x, track) => { let near = 1e9; for (const v of ctx.traffic) { if (this.ignore && this.ignore.includes(v)) continue; const dz = v.z - car.z; if (dz > -500 && dz < 4200 && Math.abs(v.x - x) < v.hw + car.hw + .12 && dz < near) { near = dz; if (track) nearV = v.v; } } for (const c of ctx.others || []) if (c !== car && c.stage === car.stage && !c.ghost) { const dz = c.z - car.z; if (dz > -400 && dz < 2500 && Math.abs(c.x - x) < .4 && dz < near) { near = dz; if (track) nearV = c.v; } } return near; };
      if (blocked(tx) < (this.ignore !== undefined && o.targets && this.hadTarget ? 1300 : 4200)) {
        let best = tx, room = blocked(tx);
        for (let l = 0; l < lanes; l++) { const x = laneX(l), r = blocked(x) - Math.abs(x - car.x) * 500; if (r > room + 300) { room = r; best = x; } }
        tx = best;
      }
      // still something ahead on the way there: ease off, or brake hard when it's close
      const b1 = blocked(car.x, true), v1 = nearV, b2 = blocked((car.x + tx) / 2, true), pathBlock = Math.min(b1, b2), bv = b1 <= b2 ? v1 : nearV;
      this.ahead = pathBlock;
      const closing = car.v - bv, stop = closing > 0 ? Math.pow(closing * OB.KMH, 2) / (2 * OB.tuning.brakeDecel * OB.KMH) + 450 : 0;
      this.lift = pathBlock < 1e9 && closing > 0 ? (pathBlock < stop * 1.25 + 300 ? 2 : pathBlock < stop * 2 + 700 ? 1 : 0) : 0;
    } else this.lift = 0;
    // the inverse of the car's steering: the lateral speed wanted, plus what the bend's push takes away
    const here = OB.World.info(S, car.z, car.x, car.side), vk = car.v / st.top, d0 = car.drift.on;
    const gripK = d0 ? 1 - OB.tuning.driftGrip * (st.grip / .85) * Math.min(1, Math.abs(car.drift.a) / .5) : 1;
    const push = here.curve * vk * vk * OB.tuning.curvePush * gripK;
    const smax = Math.max(.2, OB.tuning.steerRate * st.steer / 2.2 * Math.min(1, car.v / 70) * (1 - .22 * vk) * (d0 ? OB.tuning.driftSteerBoost : 1));
    const vdes = clamp((tx - car.x) * (o.targets ? 4.5 : 2.2), -1.8, 1.8);
    I.steer = clamp((vdes + push) / smax, -1, 1);
    // speed: the bend's safe speed, a lift or a brake when over it; a drift for the hardest bends
    const cap = (OB.tuning.steerRate * st.steer / 2.2) * (1 - .22) * .92 * o.skill;
    const vsafe = Math.abs(maxC) > .5 ? st.top * Math.sqrt(cap / (Math.abs(maxC) * OB.tuning.curvePush)) : st.top * 2;
    const canDrift = o.drift && Math.abs(maxC) >= 3.8 && car.v > OB.tuning.driftMinSpeed + 10;
    if (canDrift && !car.drift.on && Math.abs(info.curve) > 2.5) { I.driftPress = true; I.steer = Math.sign(info.curve); }
    if (car.drift.on) { I.drift = Math.abs(here.curve) > 2; if (Math.abs(I.steer) < .45 && Math.abs(here.curve) > 1.5) I.steer = Math.sign(I.steer || car.drift.dir) * .45; }
    const limit = car.drift.on ? vsafe * 1.3 : canDrift ? vsafe * 1.18 : vsafe;
    if (car.v > limit * (1 + o.brakeLate)) { I.gas = 0; if (car.v > limit * 1.06 && !car.drift.on) I.brake = Math.min(1, (car.v - limit) / 40); }
    if (this.lift) { I.gas = 0; if (this.lift > 1 && !car.drift.on) I.brake = 1; }
    if (!info.onRoad) I.gas = Math.min(I.gas, .7);
    if (o.slow) { I.gas = Math.min(I.gas, car.v < o.slow ? 1 : 0); if (car.v > o.slow + 15) { I.brake = 1; I.driftPress = false; } }
    return I;
  }
}
OB.Brain = Brain;
})();
