/* OutBloom — the brain: one AI driver for rivals, the attract demo, test bots and the Versus CPU. It gives the same
 * intent a player gives (steer, gas, brake, drift) and drives through CarSim, with no special physics: it reads the
 * bends ahead for a safe speed, drifts the hard ones, picks the lane with the most room, seeks drafts, aims at request
 * objects, and follows a route plan (or the passenger's wish) at forks. Personas are parameter sets. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, { clamp } = E;
const sgn = v => v < 0 ? -1 : v > 0 ? 1 : 0;
OB.PERSONAS = {
  kiki: { name: 'Kiki Rapido', car: 'gardenia', paint: '#a8e040', drift: true, driftAt: 3, skill: 1.0, line: .3, draft: false, rig: 'kiki' },
  brambles: { name: 'The Bramble Brothers', car: 'magnolia', paint: '#8a5a3a', drift: false, driftAt: 9, skill: .99, draft: true, rig: 'bram' },
  lustres: { name: 'Lance & Lacey Lustre', car: 'magnolia', paint: '#e8c050', drift: true, driftAt: 4, skill: 1.0, weave: true, rig: 'lance' },
  ottavio: { name: 'Old Ottavio', car: 'primavera', paint: '#7a1a2a', drift: true, driftAt: 4.5, skill: 1.04, lateBrake: .25, rig: 'ottavio' },
  cpu: { name: 'CPU', car: 'orchidea', paint: '#3a8ae8', drift: true, driftAt: 4, skill: 1 }
};
class Brain {
  constructor(p = {}) { this.p = Object.assign({ skill: 1, drift: true, driftAt: 4, draft: false, weave: false, lateBrake: 0, targets: false, route: null, line: .25, margin: .7 }, p); this.m = { lane: null, laneT: 0, pull: 0 }; }
  /** which way at the fork ahead: -1 left, 1 right */
  forkSide(d, race) {
    const p = this.p, i = d.routeStr.length;
    if (race.fixedNext(d)) return race.fixedNext(d).side;
    if (typeof p.route === 'string' && p.route[i]) return p.route[i] === 'L' ? -1 : 1;
    if (typeof p.route === 'function') return p.route(d, race);
    if (race.forkPref && race.forkPref.side) return race.forkPref.side;
    return (OB.hashStr(d.id + d.stage + race.seed) & 1) ? 1 : -1;
  }
  intent(d, race, dt) {
    const p = this.p, car = d.car, road = d.road, z = car.z, T = OB.tuning, v = car.v, vt = car.vtop;
    const x = d.relX(), absX = d.absX(), seg = road.seg(z), lanes = seg.lanes || 3;
    // the bends ahead: the safe speed, braking in time (v^2 = vs^2 + 2 a d, d in km/h-seconds)
    let vDes = vt * 1.2, cMax = 0, cNear = road.curveAt(z + 500), dHard = 1e9;
    const canDrift = p.drift && !OB.cheats.noDriftBot;
    for (let dz = 400; dz <= 4400; dz += 300) {
      const c = road.curveAt(z + dz); if (Math.abs(c) > Math.abs(cMax)) cMax = c;
      let vs = car.safeSpeed(c) * (1 + (p.lateBrake || 0) * .15);
      if (canDrift && Math.abs(c) >= p.driftAt) { vs = Math.max(vs, vt * (.84 + .04 * (p.skill - 1))); if (dz < dHard) dHard = dz; }
      const allow = Math.sqrt(vs * vs + 2 * T.brakeDecel * p.margin * (dz * (1 - (p.lateBrake || 0))) / OB.UNITS_PER_KMH);
      if (allow < vDes) vDes = allow;
    }
    // the lateral target: inside of the bend, a lane with room, a draft, a block, the request's objects, the fork
    let tx = clamp(cNear * .08, -p.line, p.line) * (Math.abs(cNear) > 1 ? 1 : .3) + (this.m.lane !== null ? 0 : 0);
    const veh = race.traffic.of(d.stage).filter(o => o.z - z > -350 && o.z - z < 3800);
    const others = race.drivers.filter(o => o !== d && o.stage === d.stage && !o.finished && o.car.z - z > -350 && o.car.z - z < 3000).map(o => ({ z: o.car.z, x: o.relX(), hw: OB.PLAYER_HW, v: o.car.v, driver: o }));
    const block = veh.map(o => ({ z: o.z, x: o.branch && d.branch && o.branch !== d.branch ? 99 : o.branch && !d.branch ? o.x + o.branch * road.splitAt(o.z) : o.x, hw: o.hw, v: o.v })).concat(others);
    const pathClear = (cx, near = true) => { let m = 1e9; for (const b of block) { if (Math.abs(b.x - cx) < b.hw + OB.PLAYER_HW + .03) { const dz = b.z - z; if (dz > (near ? -520 : 150)) m = Math.min(m, Math.max(0, dz)); } } return m; };
    const inJ = road.junctionAt && z > road.junctionAt - 2600;
    if (!inJ) {
      const cands = []; for (let i = 0; i < lanes; i++) cands.push(OB.laneX(i, lanes)); cands.push(tx);
      const here = pathClear(x), speedOf = cx => { let m = null; for (const b of block) if (Math.abs(b.x - cx) < b.hw + OB.PLAYER_HW + .03 && b.z - z > -520 && (!m || b.z < m.z)) m = b; return m ? m.v : vt; };
      // a lane is only as good as the way across to it: every lane between must be clear for the crossing
      const reach = c => { let m = pathClear(c); const lo = Math.min(c, x), hi = Math.max(c, x); for (let q = lo; q < hi; q += .2) m = Math.min(m, pathClear(q) + 500 + Math.abs(q - x) * 300); return m; };
      if (here < 4200) {
        let best = tx, bs = -1e9;
        for (const c of cands) { const r = Math.min(reach(c), 5000), s = r - Math.abs(c - x) * 500 + Math.min(1500, speedOf(c) * 8); if (s > bs) { bs = s; best = c; } }
        tx = best; this.m.lane = best; this.m.laneT = .8;
        // walled off: slow down early to the blocker's speed in the best lane
        const dist = reach(best), vb = speedOf(best);
        if (dist < 7000 && !OB.cheats.noCollide) vDes = Math.min(vDes, Math.sqrt(vb * vb + 2 * T.brakeDecel * .8 * Math.max(0, dist - 350 - Math.abs(best - x) * 600) / OB.UNITS_PER_KMH) + 6);
      } else if (this.m.laneT > 0) { this.m.laneT -= dt; tx = this.m.lane; }
      // drafting: tuck in behind a vehicle on a straight, pull out late for the slingshot
      if (p.draft && Math.abs(cMax) < 1.5) {
        const tgt = block.filter(b => b.z - z > 500 && b.z - z < 2600 && b.v < v).sort((a, b) => a.z - b.z)[0];
        if (tgt && tgt.z - z > 750) tx = tgt.x;
        else if (tgt) { const side = [tgt.x - .55, tgt.x + .55].filter(c => Math.abs(c) < .9).sort((a, b) => pathClear(b) - pathClear(a))[0]; if (side !== undefined) tx = side; }
      }
      // close calls: brush past the next vehicle with inches to spare
      if (p.nearMiss) { const tgt = block.filter(b => b.z - z > 300 && b.z - z < 2400 && b.v < v - 60).sort((a, b) => a.z - b.z)[0]; if (tgt) { const gap = tgt.hw + OB.PLAYER_HW + .055, sides = [tgt.x - gap, tgt.x + gap].filter(c => Math.abs(c) < .95); if (sides.length) tx = sides.sort((a, b) => Math.abs(a - x) - Math.abs(b - x))[0]; } }
      // block-and-weave: sit in front of the player behind
      if (p.weave) { const pl = race.drivers.find(o => o.kind === 'player' && o.stage === d.stage && z - o.car.z > 200 && z - o.car.z < 2200); if (pl && Math.abs(cMax) < 3) tx = clamp(pl.relX(), -.7, .7); }
      // the request's objects: go for those to hit, away from those to avoid, stop in the photo box
      if (p.targets && race.requestTargets) {
        let bestHit = null;
        for (const o of race.requestTargets(d)) {
          if (o.kind === 'hit' && o.dz > 120 && o.dz < 2600 && (!bestHit || o.dz < bestHit.dz)) bestHit = o;
          if (o.kind === 'avoid' && o.dz > -100 && o.dz < 1600 && Math.abs(o.x - tx) < .42) tx = clamp(o.x + (o.x > 0 ? -.5 : .5), -.85, .85);
          if (o.kind === 'stop' && o.dz > -400 && o.dz < 2600) vDes = Math.min(vDes, o.dz < 900 ? 30 : 60);
          if (o.kind === 'slow' && o.dz > -400 && o.dz < 2400) vDes = Math.min(vDes, o.v || 85);
        }
        if (bestHit) tx = clamp(bestHit.x, -.9, .9);
      }
    }
    // the fork: aim for the branch it wants, then its middle
    if (road.junctionAt && z > road.junctionAt - 2600) {
      const side = d.decided ? d.branch : this.forkSide(d, race);
      if (!d.decided) { const s = road.splitAt(z + 1400); tx = side * Math.max(.5, s) + (side > 0 ? -.05 : .05); }
      else { tx = clamp(tx, -.6, .6); if (Math.abs(x) > .8) tx = 0; }
      if (OB.cheats.noCollide) {} else { const here = pathClear(x); if (here < 1400) { const alt = d.decided ? [-.6, 0, .6] : [side * (road.splitAt(z + 1000) - .5), side * (road.splitAt(z + 1000) + .5)]; let b = tx, bs = -1e9; for (const c of alt) { const s = Math.min(pathClear(c), 3000) - Math.abs(c - x) * 600; if (s > bs) { bs = s; b = c; } } tx = b; } }
    }
    // beside a vehicle: keep clear of it; a slower one right in front with nowhere to go: brake
    const me = d.decided || !inJ ? x : absX;
    for (const b of block) { const dz = b.z - z, gap = b.hw + OB.PLAYER_HW + .05; if (dz > -560 && dz < 560 && Math.abs(b.x - me) < gap && Math.abs(tx - b.x) < gap) tx = b.x + (me >= b.x ? 1 : -1) * (gap + .04); }
    const front = pathClear(me, false);
    if (front < 1000 && !OB.cheats.noCollide) { const b = block.filter(q => q.z - z > 150 && Math.abs(q.x - me) < q.hw + OB.PLAYER_HW + .1).sort((a, c) => a.z - c.z)[0]; if (b) vDes = Math.min(vDes, b.v + 14 + front / 30); }
    // near the edge with the bend pushing out: ease off
    const cx0 = (!d.decided && inJ) ? absX : x;
    if (Math.abs(cx0) > .82 && Math.sign(cx0) === -Math.sign(road.curveAt(z)) && Math.abs(road.curveAt(z)) > 1.5 && !car.drift.on) vDes = Math.min(vDes, v - 20);
    // speed
    let gas = 1, brake = 0;
    if (v > vDes * 1.02) { gas = 0; brake = clamp((v - vDes) / 25, .3, 1); }
    else if (v > vDes * .99) gas = .5;
    // the drift: a tap of the button as a hard bend arrives, steering into it
    let driftPressed = false, driftBtn = false;
    if (canDrift && !car.drift.on && dHard < 900 && v > T.driftMinSpeed + 15 && Math.abs(road.curveAt(z + 300)) >= p.driftAt * .8 && v > car.safeSpeed(road.curveAt(z + 600)) * .95) { driftPressed = true; brake = 0; gas = 1; }
    if (car.drift.on) { brake = 0; gas = 1; driftBtn = Math.abs(cNear) >= p.driftAt + 1; }
    // steering: the lateral speed wanted, plus what the bend pushes
    const cx = (!d.decided && inJ) ? absX : x;
    const f = v / Math.max(1, vt), D = car.drift;
    const grip = T.driftGrip * car.spec.grip / .85, inBend = D.on && sgn(D.a) === sgn(road.curveAt(z));
    const push = car.air ? 0 : road.curveAt(z) * f * f * T.curvePush * (D.on ? (inBend ? 1 - clamp(grip, 0, 1) * Math.min(1, Math.abs(D.a) / .5) : 1.15) : 1);
    const rate = T.steerRate * car.spec.steer / 2.2 * (D.on ? T.driftSteerBoost : 1) * Math.min(1, v / 70 + .05) * (1 - .22 * Math.min(1, f)) * (car.air ? .3 : 1);
    const vxD = clamp((tx - cx) * 2.4, -2.2, 2.2);
    let steer = clamp((vxD + push) / Math.max(.2, rate), -1, 1);
    if (driftPressed && Math.abs(steer) < .5) steer = sgn(road.curveAt(z + 300)) || 1;
    return { steer, gas, brake, driftPressed, driftBtn, shiftUp: false, shiftDown: false };
  }
}
OB.Brain = Brain;
})();
