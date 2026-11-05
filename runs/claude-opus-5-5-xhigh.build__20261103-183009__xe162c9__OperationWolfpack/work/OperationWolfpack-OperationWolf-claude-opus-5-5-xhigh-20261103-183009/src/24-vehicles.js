// Vehicles, boats and aircraft (7.8): shapes-as-data moving along simple paths, with parts (gunners, turrets) that have
// their own telegraphs; damage states; an explosion chain; a wreck that stays as cover for 6 s.
(() => {
const E = My3D2dge, WP = globalThis.WP, BEH = WP.BEH, { clamp, lerp } = WP, Fire = WP.Fire, Inf = WP.Inf;

/** a part: { name, kind: 'gunner' | 'turret' | 'weak' | 'armor', off: [ax, ay, az], r (units), hp, fire, every } */
const part = (name, kind, off, r, hp, o = {}) => Object.assign({ name, kind, off, r, hp, max: hp, dead: false, cd: 1 }, o);
WP.Part = part;
const placeParts = e => { if (e.parts) for (const p of e.parts) { const w = WP.Hit.local(e, p.off); p.x = w[0]; p.y = w[1]; p.z = w[2]; p.id = e.id + ':' + p.name; } };
WP.placeParts = placeParts;

const initVehicle = (sim, e, o) => {
  const tp = WP.TYPES[e.type];
  e.beh = o.beh || ({ truck: 'truck', apc: 'apc', tank: 'tank', skiff: 'river', gunboat: 'gunboat', heli: 'heli', samtruck: 'sam', cargoPlane: 'flyover', friendTruck: 'friendTruck', forklift: 'cross' }[e.type] || 'cross');
  if (!e.dir) e.dir = sim.view.lateral(e.x, e.y) < 0 ? 1 : -1;
  if (o.side === 'L') e.dir = 1; else if (o.side === 'R') e.dir = -1;
  const P = sim.view.P; e.facing = Math.atan2(P.ry * e.dir, P.rx * e.dir);
  e.parts = e.parts || [];
  for (let i = 0; i < (tp.gunners || []).length; i++) e.parts.push(part('gunner' + i, 'gunner', tp.gunners[i], 5, 1, { fire: tp.gfire, cd: .8 + sim.R.ai() * .8 }));
  if (tp.tfire) e.parts.push(part('turret', 'turret', [0, e.type === 'heli' ? 14 : 0, tp.box[2] * .8], 6, 9999, { fire: tp.tfire, cd: 1.5 + sim.R.ai(), nohit: true }));
  if (e.type === 'heli') { e.z = o.z || 80; e.missT = (tp.missiles || 7) * .6; }
  e.stopX = WP.W * (.3 + sim.R.ai() * .4); e.wrecked = false; e.offOK = e.beh === 'flyover';
  placeParts(e);
};
for (const k of ['vehicle', 'boat', 'air']) BEH['init:' + k] = initVehicle;

/** gunners and turrets: each fires on its own cooldown while the vehicle lives */
function partsFire(sim, e, dt, can = true) {
  for (const p of e.parts) {
    if (p.dead || !p.fire) continue;
    if (p.atk) { Fire.update(sim, p, dt, () => [p.x, p.y, p.z]); continue; }
    if (!can) continue;
    p.cd -= dt;
    const pr = sim.view.project(p.x, p.y, p.z);
    if (p.cd <= 0 && pr && pr[0] > 10 && pr[0] < WP.W - 10) {
      Fire.start(sim, p, p.fire, { part: p.name }); p.cd = (p.fire.every || 2.2) + sim.R.ai() * 1.2;
      if (p.atk) p.atk.owner = e.id;
    }
  }
}
WP.partsFire = partsFire;
const drive = (sim, e, dt, sp) => { const P = sim.view.P; e.vx = P.rx * e.dir * sp; e.vy = P.ry * e.dir * sp; e.x += e.vx * dt; e.y += e.vy * dt; e.facing = Math.atan2(e.vy, e.vx); e.odo = (e.odo || 0) + sp * dt; };
const sx = (sim, e) => { const p = sim.view.project(e.x, e.y, e.z); return p ? p[0] : null; };

BEH.cross = ((inf) => (sim, e, dt) => {
  const k = WP.TYPES[e.type].kind;
  if (k === 'infantry') return inf(sim, e, dt);
  const tp = WP.TYPES[e.type];
  if (e.st === 'enter') { e.st = 'drive'; e.stt = 0; e.mayStop = e.type === 'jeep' ? sim.R.ai() < .6 : false; }
  if (e.st === 'drive') {
    drive(sim, e, dt, e.speed || tp.speed);
    const x = sx(sim, e);
    if (e.mayStop && x !== null && ((e.dir > 0 && x > e.stopX) || (e.dir < 0 && x < WP.W - e.stopX))) { e.mayStop = false; e.st = 'stop'; e.stt = 0; e.vx = e.vy = 0; }
  } else if (e.st === 'stop') { e.vx = e.vy = 0; if (e.stt > 3.5 || e.leave) { e.st = 'drive'; e.stt = 0; } }
  placeParts(e); partsFire(sim, e, dt);
  if (e.type === 'forklift' && e.carry && !e.dropped && e.hp < e.maxHp) { e.dropped = true; WP.Supply.drop(sim, e.x, e.y, 20, e.carry, null); }
})(BEH.cross);

// drives in, stops, unloads its men, drives off
BEH.truck = (sim, e, dt) => {
  const tp = WP.TYPES[e.type];
  if (e.st === 'enter') { e.st = 'drive'; e.stt = 0; }
  if (e.st === 'drive') {
    drive(sim, e, dt, tp.speed);
    const x = sx(sim, e);
    if (!e.unloaded && x !== null && ((e.dir > 0 && x > e.stopX) || (e.dir < 0 && x < WP.W - e.stopX))) { e.st = 'stop'; e.stt = 0; e.vx = e.vy = 0; }
  } else if (e.st === 'stop') {
    e.vx = e.vy = 0;
    const n = e.unload === undefined ? tp.unload : e.unload;
    if (!e.unloaded && e.stt > .8) {
      e.unloaded = true; sim.ev('unload', { id: e.id });
      const cnt = sim.count(n);
      for (let i = 0; i < cnt; i++) sim.after(.35 * i, () => {
        if (e.dead) return; const w = WP.Hit.local(e, [0, -tp.box[1] * .45, 0]);
        sim.spawn(e.men || 'rifleman', { x: w[0] + (sim.R.ai() - .5) * 10, y: w[1] + (sim.R.ai() - .5) * 6, beh: 'dismount', dir: i % 2 ? 1 : -1, beat: e.beat ? sim.beatById[e.beat] : null });
      });
    }
    if (e.stt > 4 + cnt0(e) || e.leave) { e.st = 'drive'; e.stt = 0; }
  }
  placeParts(e); partsFire(sim, e, dt);
};
const cnt0 = e => (e.unload || 4) * .35;

// crosses slowly, stops mid-screen, fires rockets from its turret, unloads 3, stays until it dies or must leave
BEH.apc = (sim, e, dt) => {
  const tp = WP.TYPES[e.type];
  if (e.st === 'enter') { e.st = 'drive'; e.stt = 0; }
  if (e.st === 'drive') {
    drive(sim, e, dt, tp.speed);
    const x = sx(sim, e);
    if (!e.parked && x !== null && ((e.dir > 0 && x > e.stopX) || (e.dir < 0 && x < WP.W - e.stopX))) { e.st = 'park'; e.stt = 0; e.parked = true; e.vx = e.vy = 0; }
  } else if (e.st === 'park') {
    e.vx = e.vy = 0;
    if (!e.unloaded && e.stt > 1.5) {
      e.unloaded = true; sim.ev('unload', { id: e.id });
      for (let i = 0; i < sim.count(tp.unload); i++) sim.after(.4 * i, () => { if (e.dead) return; const w = WP.Hit.local(e, [0, -tp.box[1] * .45, 0]); sim.spawn('rifleman', { x: w[0], y: w[1], beh: 'dismount', dir: i % 2 ? 1 : -1, beat: e.beat ? sim.beatById[e.beat] : null }); });
    }
    if (e.leave || (e.stayT && e.stt > e.stayT)) { e.st = 'drive'; e.stt = 0; }
  }
  e.turret = Math.atan2(sim.view.P.y - e.y, sim.view.P.x - e.x);
  placeParts(e); partsFire(sim, e, dt, e.st === 'park' || e.st === 'drive');
};
// rolls out (of a hangar), the turret tracks the camera, shells
BEH.tank = (sim, e, dt) => {
  const P = sim.view.P;
  if (e.st === 'enter') { e.st = 'roll'; e.stt = 0; e.rollD = e.rollD || 60; }
  if (e.st === 'roll') {
    const sp = 30; e.vx = -P.fx * sp; e.vy = -P.fy * sp; e.x += e.vx * dt; e.y += e.vy * dt; e.facing = Math.atan2(e.vy, e.vx); e.odo = (e.odo || 0) + sp * dt;
    if (e.stt * sp >= e.rollD) { e.st = 'park'; e.stt = 0; e.vx = e.vy = 0; }
  } else if (e.st === 'park') { e.vx = e.vy = 0; if (e.leave) { e.st = 'leave'; e.stt = 0; } }
  else if (e.st === 'leave') { drive(sim, e, dt, 30); }
  e.turret = Math.atan2(P.y - e.y, P.x - e.x);
  placeParts(e); partsFire(sim, e, dt, e.st !== 'roll');
};
// river boats: from ahead toward the camera, passing on one side (or out of a side channel, crossing)
BEH.river = (sim, e, dt) => {
  const P = sim.view.P, tp = WP.TYPES[e.type];
  if (e.st === 'enter') {
    e.st = 'run'; e.stt = 0; e.passLx = e.passLx === undefined ? (sim.view.lateral(e.x, e.y) < 0 ? -55 : 55) : e.passLx;
    e.cross = e.cross || false;
  }
  const D = sim.view.depth(e.x, e.y), L = sim.view.lateral(e.x, e.y);
  if (e.cross) {   // out of a side channel: across the river
    const sp = tp.speed * .7; e.vx = P.rx * e.dir * sp + P.fx * 0; e.vy = P.ry * e.dir * sp; e.x += e.vx * dt; e.y += e.vy * dt; e.facing = Math.atan2(e.vy, e.vx);
  } else {
    const slow = D < 220 && D > 120 && !e.passed ? .35 : 1, sp = tp.speed * slow;
    const tl = e.passLx, steer = clamp((tl - L) * .8, -40, 40);
    e.vx = -P.fx * sp + P.rx * steer; e.vy = -P.fy * sp + P.ry * steer; e.x += e.vx * dt; e.y += e.vy * dt; e.facing = Math.atan2(e.vy, e.vx);
    if (D < 120) e.passed = true;
  }
  e.bob = Math.sin(e.t * 3 + e.id) * 1.2;
  placeParts(e); partsFire(sim, e, dt, D > 60);
};
// a patrol boat: comes in, keeps its distance a while, turret bursts, then passes
BEH.gunboat = (sim, e, dt) => {
  const P = sim.view.P, tp = WP.TYPES[e.type], D = sim.view.depth(e.x, e.y), L = sim.view.lateral(e.x, e.y);
  if (e.st === 'enter') { e.st = 'come'; e.stt = 0; e.keepD = 260; e.keepT = 14; e.passLx = L < 0 ? -60 : 60; }
  let sp = tp.speed;
  if (e.st === 'come' && D <= e.keepD) { e.st = 'keep'; e.stt = 0; }
  if (e.st === 'keep') { sp = -(sim.speed || 0) + (D - e.keepD) * .5; if (e.stt > e.keepT || e.leave) { e.st = 'pass'; e.stt = 0; } }
  const steer = clamp((e.passLx + Math.sin(e.t * .7) * 40 - L) * .6, -30, 30);
  e.vx = -P.fx * sp + P.rx * steer; e.vy = -P.fy * sp + P.ry * steer; e.x += e.vx * dt; e.y += e.vy * dt;
  e.facing = Math.atan2(-P.fy, -P.fx) + steer * .004;
  e.bob = Math.sin(e.t * 2.4 + e.id) * 1.5;
  e.turret = Math.atan2(P.y - e.y, P.x - e.x);
  placeParts(e); partsFire(sim, e, dt, e.st !== 'pass' || D > 90);
};
// the VULTURE: in from far, hovers and strafes, MG bursts (rings), missiles every 7 s; leaves when hurt, comes back
BEH.heli = (sim, e, dt) => {
  const P = sim.view.P, tp = WP.TYPES[e.type];
  if (e.st === 'enter') { e.st = 'in'; e.stt = 0; e.hoverD = e.hoverD || 250 + sim.R.ai() * 60; e.hoverLx = e.hoverLx === undefined ? (sim.R.ai() - .5) * 160 : e.hoverLx; e.hz = e.z; e.retreated = false; }
  const D = sim.view.depth(e.x, e.y), L = sim.view.lateral(e.x, e.y);
  let tD = e.hoverD, tL = e.hoverLx + Math.sin(e.t * .45) * 120, tz = e.hz + Math.sin(e.t * 1.1) * 6;
  if (e.st === 'in' && Math.abs(D - tD) < 30) { e.st = 'hover'; e.stt = 0; }
  if (e.st === 'hover' && !e.retreated && e.hp < e.maxHp * .4) { e.st = 'retreat'; e.stt = 0; e.retreated = true; sim.ev('retreat', { id: e.id }); }
  if (e.st === 'retreat') { tD = 900; tL = L + (L < 0 ? -400 : 400); if (e.stt > 3.5) { e.st = 'in'; e.stt = 0; } }
  if (e.leave && e.st !== 'leaving') { e.st = 'leaving'; e.stt = 0; }
  if (e.st === 'leaving') { tD = 1100; tz = 160; }
  // move in the camera's frame toward (tL, tD)
  const kD = clamp((tD - D) * 1.2, -tp.speed * 1.4, tp.speed * 1.4), kL = clamp((tL - L) * 1.2, -tp.speed, tp.speed);
  const wvx = P.fx * kD + P.rx * kL + (sim.speed || 0) * (e.anchorFollow ? P.rx : 0), wvy = P.fy * kD + P.ry * kL;
  e.vx = wvx + P.rx * 0; e.vy = wvy;
  // keep pace with a sideways rail
  const camV = sim.lastCam ? [(P.x - sim.lastCam[0]) / Math.max(dt, 1e-6), (P.y - sim.lastCam[1]) / Math.max(dt, 1e-6)] : [0, 0];
  e.x += (e.vx + camV[0]) * dt; e.y += (e.vy + camV[1]) * dt; e.z += clamp(tz - e.z, -40, 40) * dt;
  e.facing = Math.atan2(P.y - e.y, P.x - e.x) + clamp(kL * .004, -.5, .5);
  e.bank = clamp(-kL / tp.speed, -1, 1) * .3;
  placeParts(e);
  const firing = e.st === 'hover';
  partsFire(sim, e, dt, firing);
  if (firing) { e.missT -= dt; if (e.missT <= 0 && !sim.cheats.holdFire) { e.missT = (tp.missiles || 7) * sim.teleK; const pl = sim.livePlayers(); if (pl.length) { for (const s of [-1, 1]) { const w = WP.Hit.local(e, [s * 10, 6, 4]); WP.Proj.launch(sim, e, 'missile', WP.pick(sim.R.ai, pl).pid, w); } } } }
  if (e.st === 'leaving' && D > 1000) { e.gone = true; e.escaped = true; }
};
// the cargo plane: scenery overhead; drops paratroopers and a crate where the stage says
BEH.flyover = (sim, e, dt) => {
  const P = sim.view.P, tp = WP.TYPES[e.type];
  e.vx = P.rx * e.dir * tp.speed; e.vy = P.ry * e.dir * tp.speed; e.x += e.vx * dt; e.y += e.vy * dt; e.facing = Math.atan2(e.vy, e.vx);
  if (e.drops && e.drops.length) {
    const x = sx(sim, e);
    while (e.drops.length && x !== null && ((e.dir > 0 && x > e.drops[0][0]) || (e.dir < 0 && x < WP.W - e.drops[0][0]))) {
      const [, what, n] = e.drops.shift();
      for (let i = 0; i < (what === 'para' ? sim.count(n) : n); i++) {
        const w = [e.x - e.vx * .08 * i, e.y - e.vy * .08 * i];
        if (what === 'para') sim.spawn('para', { x: w[0], y: w[1], z: e.z - 6, beat: e.beat ? sim.beatById[e.beat] : null });
        else WP.Supply.chute(sim, w[0], w[1], e.z - 6, what);
      }
    }
  }
  if (e.t > 14) e.gone = true;
};
// a chase in the camera's frame (Op 6 part B: jeeps on the runway behind the plane)
BEH.chaseCam = (sim, e, dt) => {
  if (e.st === 'enter') { e.st = 'chase'; e.stt = 0; e.tLx = e.lx; e.tDz = 60 + sim.R.ai() * 100; }
  e.dz += (e.tDz - e.dz) * Math.min(1, dt * .8); e.lx += (e.tLx + Math.sin(e.t * .8 + e.id) * 40 - e.lx) * Math.min(1, dt * 1.2);
  if (e.stt > 3) { e.stt = 0; e.tDz = 60 + sim.R.ai() * 100; e.tLx = (sim.R.ai() - .5) * 160; }
  if (e.leave) e.tDz = 500;
  e.facing = sim.cam.angle + Math.PI; e.odo = (e.odo || 0) + 60 * dt; e.bob = Math.sin(e.t * 9) * .6;
  placeParts(e); partsFire(sim, e, dt, e.dz < 260);
};
// the SAM truck (Op 6 part B): parked at the runway's end, fires missiles
BEH.sam = (sim, e, dt) => {
  e.vx = e.vy = 0; placeParts(e);
  if (e.st === 'enter') { e.st = 'aim'; e.stt = 0; e.shots = 3; }
  if (e.st === 'aim' && e.stt > 1.2 && e.shots > 0 && !sim.cheats.holdFire) {
    e.stt = 0; e.shots--; const pl = sim.livePlayers();
    if (pl.length) WP.Proj.launch(sim, e, 'missile', WP.pick(sim.R.ai, pl).pid, [e.x, e.y, e.z + 30]);
  }
};
// the friendly truck (Op 6): drives in, drops off the hostages
BEH.friendTruck = (sim, e, dt) => {
  if (e.st === 'enter') { e.st = 'drive'; e.stt = 0; }
  if (e.st === 'drive') { drive(sim, e, dt, 60); const x = sx(sim, e); if (x !== null && x > WP.W * .3 && !e.stopped) { e.st = 'stop'; e.stt = 0; e.stopped = true; e.vx = e.vy = 0; if (e.onStop) e.onStop(sim, e); } }
  else if (e.st === 'stop') { e.vx = e.vy = 0; if (e.stt > 6) { e.st = 'drive2'; e.stt = 0; } }
  else if (e.st === 'drive2') drive(sim, e, dt, 60);
};

// ---------- damage, death, wrecks ----------
function vehicleDie(sim, e, p) {
  e.wrecked = true; e.fadeAt = 6.6; e.boom = [0, .2, .4];
  for (const q of e.parts || []) { q.dead = true; q.atk = null; }
  const tp = WP.TYPES[e.type];
  for (let i = 0; i < 3; i++) sim.after(.2 * i, () => sim.ev('explode', { x: e.x + (i - 1) * 8, y: e.y, z: e.z + 10, r: 40 + i * 10, big: i === 2 ? 2 : 1, kind: 'vehicle' }));
  // the blast hurts what stands next to it
  sim.after(.4, () => sim.explode(e.x, e.y, e.z + 8, Math.max(40, (tp.box[0] + tp.box[1]) * .5), 8, { by: p ? p.pid : null, kind: 'vehicle', skip: e }));
  if (e.kind === 'boat') e.sink = true;
  if (e.type === 'heli') { e.vz = 0; e.spin = 0; e.floorZ = 0; }
  if (e.carry && !e.dropped) { e.dropped = true; WP.Supply.drop(sim, e.x, e.y, e.z + 20, e.carry, p); }
}
for (const k of ['vehicle', 'boat', 'air']) {
  BEH['die:' + k] = vehicleDie;
  BEH['dead:' + k] = (sim, e, dt) => {
    if (e.type === 'heli' && e.z > 0) { e.vz -= 120 * dt; e.z = Math.max(0, e.z + e.vz * dt); e.spin = (e.spin || 0) + dt * 6; e.facing += dt * 6; if (e.z <= 0 && !e.crashed) { e.crashed = true; sim.ev('explode', { x: e.x, y: e.y, z: 0, r: 70, big: 2, kind: 'vehicle' }); } }
    if (e.sink) e.z -= 6 * dt;
    if (e.stt > e.fadeAt) e.gone = true;
  };
}
BEH['shapes:vehicle'] = BEH['shapes:boat'] = BEH['shapes:air'] = (sim, e, out, V) => {
  const tp = WP.TYPES[e.type]; if (tp.scenery || e.gone) return;
  const D = V.depth(e.x, e.y); if (D < 14) return;
  if (e.dead) {   // the wreck: cover for 6 s
    if (e.type === 'heli' || e.sink || e.stt > 6) return;
    const s = WP.Hit.boxPoly(V, e.x, e.y, e.z, [tp.box[0], tp.box[1], tp.box[2] * .7], e.facing, tp.sc); if (!s) return;
    s.e = e; s.part = 'wreck'; s.D = D; s.cover = true; out.push(s); return;
  }
  if (tp.friendly) { const s = WP.Hit.boxPoly(V, e.x, e.y, e.z, tp.box, e.facing, tp.sc); if (s) { s.e = e; s.part = 'hull'; s.D = D; s.cover = true; out.push(s); } return; }
  const s = WP.Hit.boxPoly(V, e.x, e.y, e.z + (e.bob || 0) + (tp.bz || 0) * (tp.sc || 1), tp.box, e.facing, tp.sc); if (!s) return;
  s.e = e; s.part = 'hull'; s.D = D; out.push(s);
  for (const p of e.parts || []) {
    if (p.dead || p.nohit) continue;
    const pr = V.project(p.x, p.y, p.z + (e.bob || 0)); if (!pr) continue;
    if (p.kind === 'gunner') {   // a rig: its own small humanoid shapes in front of the hull
      const H = WP.RIG_H.chibi * 1.2 * V.q(pr[2]) * .62;
      const gd = Math.min(V.depth(p.x, p.y) - 6, D - 1);   // (in front of its own hull)
      out.push({ e, pp: p, part: 'gunner', D: gd, kind: 'c', cx: pr[0], cy: pr[1] - H * .75, r: Math.max(3, H * .22) });
      out.push({ e, pp: p, part: 'gunner', D: gd + .1, kind: 'r', x0: pr[0] - Math.max(2, H * .2), x1: pr[0] + Math.max(2, H * .2), y0: pr[1] - H * .55, y1: pr[1] });
    } else out.push({ e, pp: p, part: p.kind, D: Math.min(V.depth(p.x, p.y) - 4, D - 1), kind: 'c', cx: pr[0], cy: pr[1], r: Math.max(4, p.r * pr[2]) });
  }
};
/** a bullet on a vehicle: the part it hit, or the hull */
WP.vehicleHit = (sim, e, part, pp, dmg, p) => {
  if (e.dead) return;
  if (pp) {
    if (pp.kind === 'armor') { sim.ev('armored', { id: e.id, x: pp.x, y: pp.y, z: pp.z }); return; }
    pp.hp -= dmg;
    if (pp.hp <= 0 && !pp.dead) {
      pp.dead = true; pp.atk = null; sim.ev('partDown', { id: e.id, part: pp.name, kind: pp.kind, x: pp.x, y: pp.y, z: pp.z });
      if (p) { sim.score(p, pp.kind === 'gunner' ? 100 : 300, { x: pp.x, y: pp.y, z: pp.z }); if (pp.kind === 'gunner') { p.kills++; sim.streakUp(p); } }
    }
    return;
  }
  e.hp -= dmg; e.hitT = .08;
  if (e.hp <= 0) sim.kill(e, p ? p.pid : null, 'hull', 'shot');
};
})();
