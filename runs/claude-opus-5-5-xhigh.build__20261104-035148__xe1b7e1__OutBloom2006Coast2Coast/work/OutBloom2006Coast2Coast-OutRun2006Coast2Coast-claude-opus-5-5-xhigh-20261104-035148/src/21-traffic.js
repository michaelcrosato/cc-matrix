/* OutBloom — traffic: vehicles spawned ahead per stage from a seeded stream (the hub's in a session), keeping their
 * lanes, changing lane when blocked (blinking first), splitting at a fork, passing into the next stage's road, and
 * ribbon pairs for Love in Bloom. It also tells the race who was overtaken or nearly missed. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, { clamp } = E, SEG = OB.SEG;
const laneX = (i, n) => -1 + (2 * i + 1) / n;
OB.laneX = laneX;

class Traffic {
  constructor(race) { this.race = race; this.lists = new Map(); this.nextId = 1; this.hornCool = {}; this.mul = 1; this.extra = 0; }
  /** the stage's list, made with its own stream on first use */
  list(id) {
    if (!this.lists.has(id)) {
      const S = OB.STAGES[id], mix = Object.entries(S.traffic || {}), sum = mix.reduce((a, [, w]) => a + w, 0);
      const diff = { Easy: .75, Normal: 1, Hard: 1.3 }[this.race.cfg.difficulty || 'Normal'] || 1;
      this.lists.set(id, { id, vehicles: [], cursor: 1500, rnd: OB.rand.stream('traffic:' + id, (this.race.seed + this.race.visit(id)) >>> 0), mix, sum, base: .32 * sum / 4.5 * [.7, .85, 1.15, 1.45, 1.7][S.diff - 1] * diff, lanes: S.lanes });
    }
    return this.lists.get(id);
  }
  density(L) { return this.race.cfg.traffic === false || OB.cheats.noTraffic ? 0 : L.base * OB.tune('trafficDensity') * this.mul * (this.race.cfg.trafficMul || 1); }
  /** spawn ahead until the cursor passes z */
  ensure(id, z) {
    const L = this.list(id), road = OB.World.stage(id), end = road.length - 400;
    const dens = this.density(L); if (dens <= 0) { L.cursor = Math.max(L.cursor, z); return; }
    let guard = 0;
    while (L.cursor < Math.min(z, end) && guard++ < 200) {
      const gap = 10000 / (dens * L.lanes) * (.45 + L.rnd() * 1.1);
      L.cursor += gap;
      if (L.cursor >= end) break;
      this.spawn(L, L.cursor);
    }
  }
  pickType(L) { let r = L.rnd() * L.sum; for (const [t, w] of L.mix) { r -= w; if (r <= 0) return t; } return L.mix[0][0]; }
  laneFree(L, lane, z, range, except) { return !L.vehicles.some(v => v !== except && !v.gone && Math.abs(v.z - z) < range && (v.lane === lane || v.toLane === lane)); }
  spawn(L, z, o = {}) {
    const road = OB.World.stage(L.id), seg = road.seg(z), lanes = seg.lanes || L.lanes;
    const type = o.type || this.pickType(L), spec = OB.TRAFFIC[type];
    // keep two lanes free within 1,500 units (one on a two-lane road)
    const need = lanes >= 3 ? 2 : 1, occupied = new Set(L.vehicles.filter(v => !v.gone && Math.abs(v.z - z) < 1500).map(v => v.lane));
    let lane = o.lane !== undefined ? o.lane : Math.floor(L.rnd() * lanes);
    if (o.lane === undefined) { for (let k = 0; k < lanes && occupied.has(lane); k++) lane = (lane + 1) % lanes; if (occupied.has(lane) || lanes - occupied.size - 1 < need) return null; }
    if (!this.laneFree(L, lane, z, 900)) return null;
    const v = (spec.v[0] + L.rnd() * (spec.v[1] - spec.v[0])) * OB.tune('trafficSpeedScale');
    const veh = { id: this.nextId++, type, spec, stage: L.id, z, lane, toLane: lane, x: laneX(lane, lanes), v: o.v || v, vBase: o.v || v, paint: spec.paints[Math.floor(L.rnd() * spec.paints.length)], hw: spec.hw, len: spec.len,
      branch: 0, blink: 0, changeT: 0, spinT: 0, spinDir: 1, braking: 0, passed: {}, near: {}, pair: null, ribbon: null, honk: 0, alpha: 1, lit: false };
    veh.draw = function (g, sx, sy, scale, t) { if (OB.Art && OB.Art.drawTraffic) OB.Art.drawTraffic(g, this, sx, sy, scale, t); };
    L.vehicles.push(veh); return veh;
  }
  /** a ribbon pair: two vehicles side by side in adjacent lanes at one speed, a ribbon between them */
  spawnRibbon(id, z) {
    const L = this.list(id), lanes = OB.World.stage(id).seg(z).lanes || L.lanes; if (lanes < 2) return null;
    const la = 0, lb = lanes - 1, v = 92 + L.rnd() * 14;   // (the outer lanes: the gap between them fits a car)
    for (const q of L.vehicles) if (Math.abs(q.z - z) < 1600) q.gone = true;
    L.vehicles = L.vehicles.filter(q => !q.gone);
    const a = this.spawn(L, z, { lane: la, v, type: 'hatch' }), b = a && this.spawn(L, z, { lane: lb, v, type: OB.pick(L.rnd, ['sedan', 'hatch', 'van']) });
    if (!a || !b) { if (a) a.gone = true; return null; }
    if (lanes === 2) { a.x = -.8; b.x = .8; a.fixX = -.8; b.fixX = .8; }
    a.pair = b; b.pair = a; a.ribbon = { snapped: false, color: '#ff7ab8' }; a.fixedLane = b.fixedLane = true;
    return a;
  }
  /** a step: move, change lanes, split at the fork, pass into the next road, despawn behind */
  step(dt, drivers) {
    const frozen = OB.cheats.freezeTraffic;
    for (const L of this.lists.values()) {
      const road = OB.World.stage(L.id), on = drivers.filter(d => d.stage === L.id), minZ = on.length ? Math.min(...on.map(d => d.car.z)) : null;
      for (const v of L.vehicles) {
        if (v.gone) continue;
        if (v.spinT > 0) { v.spinT -= dt; v.v = Math.max(0, v.v - 70 * dt); v.x += v.spinDir * .9 * dt; }
        else if (!frozen) {
          // blocked by a slower one ahead in its lane: blink, then change lane if one is free; else slow down
          const ahead = L.vehicles.find(o => o !== v && !o.gone && o.lane === v.lane && o.z > v.z && o.z - v.z < 1200 + o.len / 2 && o.v < v.v - 2);
          if (ahead && !v.fixedLane && v.changeT <= 0 && v.blink <= 0) {
            const lanes = road.seg(v.z).lanes || L.lanes, opts = [v.lane - 1, v.lane + 1].filter(l => l >= 0 && l < lanes && this.laneFree(L, l, v.z, 1500, v));
            if (opts.length) { v.toLane = opts[Math.floor(L.rnd() * opts.length)]; v.blink = .8; }
          }
          if (v.blink > 0) { v.blink -= dt; if (v.blink <= 0) { if (this.laneFree(L, v.toLane, v.z, 1200, v)) v.changeT = 1.2; else v.toLane = v.lane; } }
          const lanes = road.seg(v.z).lanes || L.lanes;
          if (v.changeT > 0) { v.changeT -= dt; const from = laneX(v.lane, lanes), to = laneX(v.toLane, lanes), u = 1 - Math.max(0, v.changeT) / 1.2; v.x = from + (to - from) * (u * u * (3 - 2 * u)); if (v.changeT <= 0) { v.lane = v.toLane; v.x = to; } }
          else v.x += ((v.fixX !== undefined ? v.fixX : laneX(Math.min(v.lane, lanes - 1), lanes)) - v.x) * Math.min(1, dt * 2);
          const want = ahead && v.changeT <= 0 && v.blink <= 0 ? Math.min(v.vBase, ahead.v) : v.vBase;
          v.braking = want < v.v - 1 ? .4 : Math.max(0, v.braking - dt);
          v.v += clamp(want - v.v, -40 * dt, 15 * dt);
        }
        if (v.honk > 0) v.honk -= dt;
        if (!frozen) v.z += v.v * OB.UNITS_PER_KMH * dt;
        // the fork: a branch by lane (the middle one by its stream)
        if (road.junctionAt && v.z >= road.junctionAt && !v.branch) { v.branch = v.x < -.1 ? -1 : v.x > .1 ? 1 : (L.rnd() < .5 ? -1 : 1); }
        if (v.z >= road.length) {   // on into the road after the fork, when it is shown; else it leaves
          const next = road.junctionAt ? OB.FORKS[L.id][v.branch < 0 ? 0 : 1] : null;
          if (next && this.lists.has(next)) { v.gone = true; const n = this.list(next), cp = Object.assign({}, v, { z: v.z - road.length, branch: 0, stage: next, passed: {}, near: {}, id: this.nextId++ }); cp.draw = v.draw; if (this.laneFree(n, cp.lane, cp.z, 700)) n.vehicles.push(cp); }
          else v.gone = true;
        }
        if (minZ !== null && v.z < minZ - 3000) v.gone = true;
      }
      if (L.vehicles.some(v => v.gone)) L.vehicles = L.vehicles.filter(v => !v.gone);
    }
  }
  /** drop the lists no driver is on and the race doesn't show */
  prune(keep) { for (const id of [...this.lists.keys()]) if (!keep.has(id)) this.lists.delete(id); }
  /** the vehicles of a stage */
  of(id) { const L = this.lists.get(id); return L ? L.vehicles : []; }
  /** the horn: the vehicle ahead in the driver's lane moves over if it can */
  horn(d) {
    const now = OB.now(); if ((this.hornCool[d.id] || -9) > now) return null; this.hornCool[d.id] = now + 2;
    const L = this.lists.get(d.stage); if (!L) return null;
    const road = OB.World.stage(d.stage), lanes = road.seg(d.car.z).lanes || L.lanes;
    const v = L.vehicles.filter(o => o.z > d.car.z && o.z - d.car.z < 2500 && Math.abs(o.x - d.relX()) < .35 && !o.fixedLane).sort((a, b) => a.z - b.z)[0];
    if (!v) return null;
    const opts = [v.lane - 1, v.lane + 1].filter(l => l >= 0 && l < lanes && this.laneFree(L, l, v.z, 1300, v));
    if (opts.length) { v.toLane = opts[0]; v.blink = .25; v.honk = 1; }
    return v;
  }
}
OB.Traffic = Traffic;
})();
