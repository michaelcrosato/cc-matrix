// The bestiary and its behaviors: infantry, vehicles, aircraft, boats, civilians, hostages, animals, props,
// projectiles and pickups (WP.TYPES, WP.BEHAV). Pure sim: seeded streams only.
(() => {
const E = My3D2dge, WP = globalThis.WP, T = WP.T, clamp = E.clamp, TY = WP.TYPES, B = WP.BEHAV = {};
const RH = s => 29 * s;   // a Humanoid's standing height in world units (calibrated: 38 px at view scale 1 for size 1.3)
const toCam = (sim, e) => { e.facing = sim.cam.angle + Math.PI; };
const moveDir = (sim, e, dirx, speed) => { const b = WP.basis(sim.cam); e.vx = b.rx * dirx * speed; e.vy = b.ry * dirx * speed; e.facing = Math.atan2(e.vy, e.vx); };
const stepMove = (e, dt) => { e.x += e.vx * dt; e.y += e.vy * dt; };
const stop = e => { e.vx = 0; e.vy = 0; };

// ---------------------------------------------------------------------------------------------- attacks
const ATK = {
  gun: (sim, e) => sim.telegraph(e, 'ring', e.T.tele || 1.3, (s, en, tl) => { en.firing = .35; s.burst(en, tl.pid, e.T.bullets ? e.T.bullets[0] + Math.floor(s.R.ai() * (e.T.bullets[1] - e.T.bullets[0] + 1)) : 1, e.T.acc, e.T.dmg); }),
  grenade: (sim, e) => sim.telegraph(e, 'throw', .6, (s, en) => { en.throwT = .3; s.launch('egrenade', en); s.tipOnce('tip.grenadeIn'); }),
  knife: (sim, e) => sim.telegraph(e, 'throw', .55, (s, en) => { en.throwT = .3; s.launch('blade', en); s.tipOnce('tip.knife'); }),
  rocket: (sim, e) => sim.telegraph(e, 'ring', 1.5, (s, en) => { en.firing = .4; s.launch('rocket', en, { z: en.z + en.T.h * .75 }); }),
  snipe: (sim, e) => sim.telegraph(e, 'glint', 2.4, (s, en, tl) => { en.firing = .3; s.burst(en, tl.pid, 1, .85, 10); }),
  burst: (sim, e) => sim.telegraph(e, 'ring', 1.6, (s, en, tl) => { en.firing = .6; s.burst(en, tl.pid, 5, .3, 4, .09); })
};
WP.Sim.prototype.tipOnce = function (k) { this.tipsSent = this.tipsSent || {}; if (!this.tipsSent[k]) { this.tipsSent[k] = 1; this.tip(k); } };
const attack = (sim, e) => (ATK[e.T.atk] || ATK.gun)(sim, e);

// ---------------------------------------------------------------------------------------------- infantry types (8.4)
const inf = (o) => Object.assign({ kind: 'infantry', quota: 'soldier', hp: 1, fadeT: 2.5, fall: true }, o);
TY.rifleman = inf({ name: 'RIFLEMAN', rig: 'rifleman', h: RH(1.3), score: 100, beh: 'cross', atk: 'gun', tele: 1.3, bullets: [1, 3], acc: .4, dmg: 4 });
TY.grenadier = inf({ name: 'GRENADIER', rig: 'grenadier', h: RH(1.3), hp: 2, score: 150, beh: 'popup', atk: 'grenade' });
TY.knife = inf({ name: 'KNIFE', rig: 'knife', h: RH(1.25), score: 200, beh: 'popup', atk: 'knife' });
TY.brute = inf({ name: 'BRUTE', rig: 'brute', h: RH(1.55), hp: 8, headMult: 4, brute: true, score: 500, beh: 'stand', atk: 'burst' });
TY.rpg = inf({ name: 'RPG', rig: 'rpg', h: RH(1.3), hp: 2, score: 300, beh: 'kneel', atk: 'rocket' });
TY.sniper = inf({ name: 'SNIPER', rig: 'sniper', h: RH(1.3), score: 400, beh: 'snipe', atk: 'snipe', marked: true });
TY.mortar = inf({ name: 'MORTAR', rig: 'mortar', h: RH(1.2), score: 200, beh: 'mortar', marked: true });
TY.officer = inf({ name: 'OFFICER', rig: 'officer', h: RH(1.35), hp: 2, score: 600, beh: 'officer', atk: 'gun', tele: 1.3, bullets: [1, 2], acc: .4, dmg: 4, init: (s, e) => { e.carry = 'intel'; } });
TY.para = inf({ name: 'PARATROOPER', rig: 'para', h: RH(1.3), score: 150, airBonus: 100, beh: 'para', atk: 'gun', tele: 1.3, bullets: [1, 2], acc: .45, dmg: 4 });
TY.chaser = inf({ name: 'RIFLEMAN', rig: 'rifleman', h: RH(1.3), score: 100, beh: 'chase', atk: 'gun', tele: 1.3, bullets: [1, 2], acc: .4, dmg: 4 });
TY.gunner = inf({ name: 'GUNNER', rig: 'rifleman', h: RH(1.3), score: 100, beh: 'stand', atk: 'gun', tele: 1.2, bullets: [3, 3], acc: .35, dmg: 4 });

// cross: run from one edge to the other at a depth; `stops` times it halts to fire
B.cross = (sim, e, dt) => {
  if (e.st === 'enter') {
    e.dir = e.o.dir || (e.side < 0 ? 1 : -1); e.spd = e.o.speed || 70; e.stops = e.o.stops === undefined ? 1 : e.o.stops;
    e.stopAt = []; for (let i = 0; i < e.stops; i++) e.stopAt.push((sim.R.ai() * 1.2 - .6) * .8);
    e.st = 'move'; e.t = 0;
  }
  if (e.st === 'move') {
    if (e.stun > 0) { stop(e); return; }
    moveDir(sim, e, e.dir, e.spd * (e.hurtT > 0 ? .3 : 1)); stepMove(e, dt); e.pose = 'stand';
    const [lx, dz] = sim.w2c(e.x, e.y), rel = lx / Math.max(1, sim.hw(dz));
    if (e.stopAt.length && (e.dir > 0 ? rel > e.stopAt[0] : rel < e.stopAt[0]) && Math.abs(rel) < .85) { e.stopAt.shift(); e.st = 'aim'; e.t = 0; stop(e); toCam(sim, e); if (!e.T.atk || !attack(sim, e)) e.st = 'move'; }
  } else if (e.st === 'aim') { toCam(sim, e); stop(e); if (!e.tele && e.t > .2) { e.st = 'recover'; e.t = 0; } }
  else if (e.st === 'recover') { if (e.t > .45) { e.st = 'move'; e.t = 0; } }
};
B.sprint = (sim, e, dt) => { if (e.st === 'enter') { e.o.stops = 0; e.o.speed = 110; } B.cross(sim, e, dt); };
// popup: behind cover (a prop), crouched; stands to attack `cycles` times, then runs off
B.popup = (sim, e, dt) => {
  if (e.st === 'enter') {
    const c = e.o.cover && sim.prop(e.o.cover);
    if (c) { const [clx, cdz] = sim.w2c(c.x, c.y); const w = sim.c2w(clx + (e.o.dx || 0), cdz + 10); e.x = w[0]; e.y = w[1]; e.coverId = c.id; }
    e.cycles = e.o.cycles || 2 + Math.floor(sim.R.ai() * 2); e.st = 'hide'; e.t = -sim.R.ai() * .8; toCam(sim, e);
  }
  const c = e.coverId && sim.get(e.coverId); e.coverTop = c && !c.dead ? c.z + c.T.box[2] : undefined;
  if (e.o.window) { e.clip = e.o.window; }
  toCam(sim, e);
  if (e.st === 'hide') { e.pose = 'crouch'; e.hidden = !!e.o.window && e.t < 1.2; if (e.t > 1.4 + (e.cycles % 2) * .5 && e.stun <= 0) { e.st = 'up'; e.t = 0; e.hidden = false; } }
  else if (e.st === 'up') { e.pose = 'stand'; if (e.t > .25) { e.st = 'atk'; e.t = 0; if (!attack(sim, e)) { e.st = 'hide'; e.t = 0; } } }
  else if (e.st === 'atk') { e.pose = 'stand'; if (!e.tele && e.t > .3) { e.st = 'post'; e.t = 0; } }
  else if (e.st === 'post') { if (e.t > .5) { e.cycles--; e.t = 0; e.st = e.cycles > 0 ? 'hide' : (e.o.window || e.o.stay ? 'hide' : 'exit'); if (e.cycles <= 0 && (e.o.window || e.o.stay)) e.cycles = 2; } }
  else if (e.st === 'exit') { e.coverTop = undefined; e.pose = 'stand'; moveDir(sim, e, e.side > 0 ? 1 : -1, 70); stepMove(e, dt); }
};
B.window = (sim, e, dt) => { e.o.window = e.o.window || e.o.clip; B.popup(sim, e, dt); };
// stand: in place (behind cover if given), attacking forever
B.stand = (sim, e, dt) => {
  if (e.st === 'enter') { const c = e.o.cover && sim.prop(e.o.cover); if (c) { const [clx, cdz] = sim.w2c(c.x, c.y); const w = sim.c2w(clx + (e.o.dx || 0), cdz + 10); e.x = w[0]; e.y = w[1]; e.coverId = c.id; } e.st = 'wait'; e.t = -.6 - sim.R.ai(); }
  const c = e.coverId && sim.get(e.coverId); e.coverTop = c && !c.dead ? c.z + c.T.box[2] : undefined;
  toCam(sim, e); e.pose = e.T.atk === 'rocket' ? 'kneel' : 'stand';
  if (e.st === 'wait' && e.t > (e.o.rest || 1.1) && e.stun <= 0) { e.st = 'atk'; e.t = 0; if (!attack(sim, e)) e.st = 'wait'; }
  else if (e.st === 'atk' && !e.tele && e.t > .4) { e.st = 'wait'; e.t = 0; }
};
B.kneel = (sim, e, dt) => { e.o.rest = e.o.rest || 2.2; B.stand(sim, e, dt); e.pose = 'kneel'; };
// advance: walk toward the camera to depth 70, then attack from there
B.advance = (sim, e, dt) => {
  if (e.st === 'enter') { e.st = 'walk'; }
  const [lx, dz] = sim.w2c(e.x, e.y);
  if (e.st === 'walk') { const b = WP.basis(sim.cam); e.vx = -b.fx * 32; e.vy = -b.fy * 32; e.facing = Math.atan2(e.vy, e.vx); stepMove(e, dt); e.pose = 'stand'; if (dz < (e.o.stopDz || 70)) { e.st = 'wait'; e.t = 0; stop(e); } }
  else B.stand(sim, e, dt);
};
// para: drifts down under a chute; a shot chute drops him; landing he crosses
B.para = (sim, e, dt) => {
  if (e.st === 'enter') { e.z = e.o.z || 160; e.chute = true; e.st = 'fall'; e.sway = sim.R.ai() * 6; }
  if (e.st === 'fall') {
    e.z += (e.chute ? -22 : e.vz) * dt; if (!e.chute) e.vz -= 300 * dt; toCam(sim, e);
    const b = WP.basis(sim.cam); e.x += b.rx * Math.sin(e.t * 1.5 + e.sway) * 8 * dt; e.y += b.ry * Math.sin(e.t * 1.5 + e.sway) * 8 * dt;
    if (e.z <= 0) { e.z = 0; if (e.chuteShot) { sim.kill(e, sim.players.find(p => p.pid === e.lastHit) || sim.players[0], 'fall', 'fall'); return; } e.chute = false; e.beh = 'cross'; e.st = 'enter'; e.o.stops = 1; e.side = sim.w2c(e.x, e.y)[0] < 0 ? -1 : 1; e.side = -e.side; }
  }
};
// dismount: out of a vehicle, run aside, fight a little, then run off
B.dismount = (sim, e, dt) => {
  if (e.st === 'enter') { e.dir = e.o.dir || (sim.R.ai() < .5 ? -1 : 1); e.runT = .5 + sim.R.ai() * .7; e.st = 'run'; e.t = 0; }
  if (e.st === 'run') { moveDir(sim, e, e.dir, 70); stepMove(e, dt); if (e.t > e.runT) { stop(e); e.beh = 'popup'; e.st = 'enter'; e.o.cycles = 2; } }
};
// chase: run at a hostage; grab it and drag it back
B.chase = (sim, e, dt) => {
  if (e.st === 'enter') { e.st = 'run'; e.home = [e.x, e.y]; e.grabT = 0; }
  const h = e.o.target && sim.get(e.o.target);
  if (!h || h.dead || h.rescued || h.lost) { if (h && h.grabbedBy === e.id) h.grabbedBy = 0; e.beh = 'cross'; e.st = 'enter'; e.o.stops = 1; return; }
  e.pose = 'stand';
  if (e.st === 'run') {
    const dx = h.x - e.x, dy = h.y - e.y, d = Math.hypot(dx, dy) || 1, spd = h.grabbedBy ? 0 : 58;
    if (d > 5) { const sp2 = d < 12 ? Math.min(spd, 50) : spd; e.vx = dx / d * sp2; e.vy = dy / d * sp2; stepMove(e, dt); e.facing = Math.atan2(dy, dx); }
    if (d > 12) e.grabT = 0;
    else if (!h.grabbedBy && (e.grabT += dt) > 1) { e.st = 'drag'; e.t = 0; h.grabbedBy = e.id; sim.radio('hostage.grab'); sim.ev('grab', { id: h.id }); }
  } else if (e.st === 'drag') {
    const dx = e.home[0] - e.x, dy = e.home[1] - e.y, d = Math.hypot(dx, dy) || 1;
    e.vx = dx / d * 20; e.vy = dy / d * 20; stepMove(e, dt); e.facing = Math.atan2(-dy, -dx); h.x = e.x + dx / d * 6; h.y = e.y + dy / d * 6 - 2;
    if (e.t > 3) { WP.hostageLost(sim, h); e.st = 'run'; }
  }
};
// mortar: a crew far away, a shell every 6 s
B.mortar = (sim, e, dt) => {
  if (e.st === 'enter') { e.st = 'wait'; e.t = -1.5 - sim.R.ai() * 3; e.pose = 'kneel'; }
  toCam(sim, e); e.pose = 'kneel';
  const [mlx, mdz] = sim.w2c(e.x, e.y);
  if (e.t > 7 && e.stun <= 0 && Math.abs(mlx) < sim.hw(mdz) * .9) { e.t = 0; e.firing = .5; sim.launch('shell', e, { z: e.z + 20 }); }
};
// snipe: still, a glint, one shot
B.snipe = (sim, e, dt) => {
  if (e.st === 'enter') { e.st = 'wait'; e.t = -.5 - sim.R.ai(); }
  toCam(sim, e); e.pose = e.o.kneel ? 'kneel' : 'stand';
  if (e.st === 'wait' && e.t > 1.6 && e.stun <= 0) { e.st = 'atk'; e.t = 0; if (!attack(sim, e)) e.st = 'wait'; }
  else if (e.st === 'atk' && !e.tele && e.t > .3) { e.st = 'wait'; e.t = 0; }
};
// officer: steps in, whistles for 2 s (kill him to stop it), then fights
B.officer = (sim, e, dt) => {
  if (e.st === 'enter') { e.st = 'walk'; e.t = 0; e.dir = e.side < 0 ? 1 : -1; }
  if (e.st === 'walk') { moveDir(sim, e, e.dir, 40); stepMove(e, dt); const [lx, dz] = sim.w2c(e.x, e.y); if (Math.abs(lx) < sim.hw(dz) * .6 || e.t > 3) { stop(e); toCam(sim, e); e.st = 'whistle'; e.t = 0; sim.tipOnce('tip.whistle');
    e.tele = { kind: 'whistle', t: 2, max: 2, pid: 0, fire: (s, en) => { const n = s.perks.commsDown ? 2 : 3; s.ev('whistled', { id: en.id }); for (let i = 0; i < n; i++) s.later.push({ t: .4 + i * .5, fn: () => s.spawn('rifleman', { side: i % 2 ? 'L' : 'R', dz: 140 + s.R.ai() * 120, path: 'cross', stops: 1 }) }); en.beh = 'stand'; en.st = 'enter'; } }; } }
  else if (e.st === 'whistle') { toCam(sim, e); e.pose = 'stand'; }
};

// ---------------------------------------------------------------------------------------------- vehicles (8.5)
const veh = o => Object.assign({ kind: 'vehicle', quota: 'vehicle', wreck: true, fadeT: 7, shapes: vehShapes, onDie: vehDie }, o);
function vehShapes(sim, e, out) {
  const v = sim.view, d = v.depth(e.x, e.y);
  const r = sim.boxRect(e.x, e.y, e.z, e.T.box, e.facing); if (!r) return;
  if (e.dead) { out.push({ e, part: 'wreck', d, r, cover: true }); return; }
  out.push({ e, part: 'hull', d, r });
  if (e.gunner && !e.gunner.dead && e.T.gunnerAt) { const w = sim.wpWorld(e, e.T.gunnerAt), p = v.project(w[0], w[1], w[2] + 10); if (p) out.push({ e, part: 'gunner', d: d - 1, c: [p[0], p[1], Math.max(4, 7 * p[2])] }); }
  if (e.gunner2 && !e.gunner2.dead && e.T.gunner2At) { const w = sim.wpWorld(e, e.T.gunner2At), p = v.project(w[0], w[1], w[2] + 10); if (p) out.push({ e, part: 'gunner2', d: d - 1, c: [p[0], p[1], Math.max(4, 7 * p[2])] }); }
}
function vehDie(sim, e, p) {
  for (let i = 0; i < 3; i++) sim.later.push({ t: i * .2, fn: () => sim.ev('explode', { x: e.x + (sim.R.fx ? 0 : (i - 1) * 10), y: e.y, z: e.z + 8 + i * 4, r: 30 + i * 8, debris: true }) });
  sim.explode(e.x, e.y, e.z + 8, 26, 6, p, { src: e, enemy: true });
  if (e.T.quota === 'air') { e.vz = -40; }
}
TY.jeep = veh({ name: 'SCAVENGER', shape: 'jeep', hp: 14, score: 1000, box: [44, 22, 22], beh: 'vcross', speed: 80, gunnerAt: [-8, 0, 16], h: 22,
  init: (s, e) => { e.gunner = { hp: 1, dead: false }; } });
TY.truck = veh({ name: 'HAULER', shape: 'truck', hp: 20, score: 1200, box: [64, 26, 34], beh: 'truck', speed: 60, h: 34 });
TY.apc = veh({ name: 'BADGER', shape: 'apc', hp: 32, score: 2000, box: [60, 28, 28], beh: 'apc', speed: 40, h: 30 });
TY.tank = veh({ name: 'MAULER', shape: 'tank', hp: 48, score: 3000, box: [64, 32, 30], beh: 'tank', speed: 26, h: 30 });
TY.samTruck = veh({ name: 'SAM TRUCK', shape: 'truck', hp: 20, score: 1500, quota: null, box: [64, 26, 34], beh: 'sam', speed: 0, h: 34 });
TY.skiff = veh({ name: 'SKIFF', shape: 'skiff', quota: 'boat', hp: 10, score: 800, box: [40, 16, 10], beh: 'boat', speed: 70, gunnerAt: [8, 0, 6], gunner2At: [-10, 0, 6], h: 10,
  init: (s, e) => { e.gunner = { hp: 1, dead: false }; e.gunner2 = { hp: 1, dead: false }; } });
TY.gunboat = veh({ name: 'PATROL BOAT', shape: 'gunboat', quota: 'boat', hp: 26, score: 1500, box: [70, 24, 24], beh: 'boat', speed: 50, h: 24 });
TY.vulture = veh({ name: 'VULTURE', shape: 'heli', quota: 'air', hp: 34, score: 3000, box: [60, 18, 26], beh: 'heli', h: 26, air: true });
TY.cargoPlane = { kind: 'scenery', name: 'CARGO PLANE', shape: 'cargoPlane', hp: Infinity, beh: 'plane' };
// gunners on a vehicle part: a hit on 'gunner2' too
const oldHit = WP.Sim.prototype.hitEntity;
WP.Sim.prototype.hitEntity = function (p, e, part, dmg, shot) {
  if (part === 'gunner2' && e.gunner2) { if (!e.gunner2.dead) { e.gunner2.dead = true; this.addScore(p, 100, e); p.stats.hits++; this.ev('kill', { id: e.id, part: 'gunner2', by: p.pid, type: 'rifleman' }); } return; }
  return oldHit.call(this, p, e, part, dmg, shot);
};
const gunnerFire = (sim, e, n = 3) => {
  if (e.tele || e.dead || e.stun > 0) return;
  const g = (e.gunner && !e.gunner.dead) || (e.gunner2 && !e.gunner2.dead); if (!g) return;
  sim.telegraph(e, 'ring', e.type === 'skiff' ? 1.3 : 1.2, (s, en, tl) => { en.firing = .3; s.burst(en, tl.pid, n, .4, 4); });
};
// vcross: drive across; with stop it halts mid-screen for a while
B.vcross = (sim, e, dt) => {
  if (e.st === 'enter') { e.dir = e.side < 0 ? 1 : -1; e.st = 'drive'; e.stopX = e.o.stop ? (sim.R.ai() - .5) * .6 : null; e.gT = 1 + sim.R.ai(); }
  if (e.st === 'drive') { moveDir(sim, e, e.dir, e.T.speed); stepMove(e, dt); const [lx, dz] = sim.w2c(e.x, e.y); if (e.stopX !== null && (e.dir > 0 ? lx / sim.hw(dz) > e.stopX : lx / sim.hw(dz) < e.stopX)) { e.st = 'park'; e.t = 0; e.stopX = null; } }
  else if (e.st === 'park') { stop(e); if (e.t > 5) e.st = 'drive'; }
  if ((e.gT -= dt) <= 0) { e.gT = 2.2 + sim.R.ai(); gunnerFire(sim, e); }
};
// truck: drives in, stops, unloads its soldiers, drives on
B.truck = (sim, e, dt) => {
  if (e.st === 'enter') { e.dir = e.side < 0 ? 1 : -1; e.st = 'drive'; e.stopX = e.o.stopAt === undefined ? (e.dir > 0 ? -.15 : .15) : e.o.stopAt; e.unload = e.o.unload === undefined ? 4 : e.o.unload; }
  if (e.st === 'drive') { moveDir(sim, e, e.dir, e.T.speed); stepMove(e, dt); const [lx, dz] = sim.w2c(e.x, e.y); if (e.stopX !== null && (e.dir > 0 ? lx / sim.hw(dz) > e.stopX : lx / sim.hw(dz) < e.stopX)) { e.st = 'stop'; e.t = 0; e.stopX = null; } }
  else if (e.st === 'stop') { stop(e); if (e.t > .6 && e.unload > 0 && e.t > .6 + (4 - e.unload) * .45) { e.unload--; const s = sim.spawn(e.o.troop || 'rifleman', { x: e.x - Math.cos(e.facing) * 26, y: e.y + 4, beh: 'dismount', beat: e.beat }); s.o.dir = e.unload % 2 ? 1 : -1; const bt = sim.beats.find(b => b.id === e.beat); if (bt) bt.ids.push(s.id); }
    if (e.unload <= 0 && e.t > 4) { e.st = 'drive'; } }
};
// apc: crosses slowly, stops, unloads 3, fires rockets from its turret
B.apc = (sim, e, dt) => {
  if (e.st === 'enter') { e.o.unload = 3; e.o.stopAt = e.o.stopAt === undefined ? 0 : e.o.stopAt; B.truck(sim, e, dt); e.rT = 2; return; }
  if (e.st === 'drive' || (e.st === 'stop' && e.t < 30)) B.truck(sim, e, dt);
  if (e.st === 'stop') e.t = Math.min(e.t, 20);
  if ((e.rT -= dt) <= 0 && !e.tele && e.stun <= 0) { e.rT = 4.5; sim.telegraph(e, 'glow', 1.8, (s, en) => { en.firing = .4; s.launch('rocket', en, { z: en.z + 26 }); }); }
};
// tank: rolls out and creeps, its turret tracking the camera; a shell every few seconds
B.tank = (sim, e, dt) => {
  if (e.st === 'enter') { e.st = 'roll'; e.t = 0; e.dir = e.o.dir || 1; e.rT = 2.5; }
  if (e.st === 'roll') { const b = WP.basis(sim.cam); const sp = e.t < 2.5 ? 26 : 8; e.vx = -b.fx * (e.t < 2.5 ? sp : 0) + b.rx * e.dir * (e.t < 2.5 ? 0 : sp); e.vy = -b.fy * (e.t < 2.5 ? sp : 0) + b.ry * e.dir * (e.t < 2.5 ? 0 : sp); stepMove(e, dt); if (e.t > 2.5) e.facing = Math.atan2(b.ry * e.dir, b.rx * e.dir); else e.facing = Math.atan2(-b.fy, -b.fx); if (e.t > 9) { e.dir = -e.dir; e.t = 2.5; } }
  if ((e.rT -= dt) <= 0 && !e.tele && e.stun <= 0) { e.rT = 4.2; sim.telegraph(e, 'glow', 2, (s, en) => { en.firing = .5; s.launch('tshell', en, { z: en.z + 24 }); }); }
};
B.sam = (sim, e, dt) => {
  if (e.st === 'enter') { e.st = 'fire'; e.n = 3; e.t = -1; }
  if (e.n > 0 && e.t > 1.4) { e.t = 0; e.n--; sim.launch('missile', e, { z: e.z + 30 }); }
};
// boat: comes down the river (or out of a side channel), its gunners firing
B.boat = (sim, e, dt) => {
  if (e.st === 'enter') { e.st = 'go'; const b = WP.basis(sim.cam); const cross = e.o.cross; e.dvx = cross ? b.rx * cross * e.T.speed : -b.fx * e.T.speed * .6 + b.rx * (e.o.drift || 0); e.dvy = cross ? b.ry * cross * e.T.speed : -b.fy * e.T.speed * .6 + b.ry * (e.o.drift || 0); e.gT = 1.2; }
  e.vx = e.dvx; e.vy = e.dvy; stepMove(e, dt); e.facing = Math.atan2(e.vy, e.vx); e.z = Math.sin(sim.t * 3 + e.id) * .8;
  const [lx, dz] = sim.w2c(e.x, e.y); if (!e.o.cross && dz < 160 && !e.slowed) { e.slowed = 1; e.dvx *= .25; e.dvy *= .25; }
  if (dz < 40) { e.dvx *= 1; }
  if ((e.gT -= dt) <= 0) { e.gT = 2 + sim.R.ai(); if (e.type === 'gunboat') { if (!e.tele) sim.telegraph(e, 'ring', 1.4, (s, en, tl) => { en.firing = .4; s.burst(en, tl.pid, 4, .35, 4); }); } else gunnerFire(sim, e, 2); }
};
// heli: anchored to the camera's frame: flies in from far, strafes, fires bursts and missiles
B.heli = (sim, e, dt) => {
  if (e.st === 'enter') { e.cam = true; e.st = 'in'; e.t = 0; e.dz0 = e.dz; e.lx0 = e.lx; e.z = e.o.z || 70; e.mT = 4; e.gT = 2.5; sim.radio('air'); }
  if (e.st === 'in') { const u = Math.min(1, e.t / 4); e.dz = WP.lerp(e.dz0, e.o.hover || 320, u * (2 - u)); e.lx = e.lx0 * (1 - u); if (u >= 1) { e.st = 'strafe'; e.t = 0; } }
  else if (e.st === 'strafe') {
    e.lx = Math.sin(e.t * .5) * 120; e.dz = (e.o.hover || 320) + Math.sin(e.t * .31) * 40; e.z = (e.o.z || 70) + Math.sin(e.t * .9) * 8;
    if ((e.gT -= dt) <= 0 && !e.tele) { e.gT = 3.4; sim.telegraph(e, 'ring', 1.6, (s, en, tl) => { en.firing = .6; s.burst(en, tl.pid, 6, .22, 3, .07); }); }
    if ((e.mT -= dt) <= 0) { e.mT = 7; sim.launch('missile', e, { z: e.z }); }
    if (e.o.drop && e.t > 2 && !e.dropped) { e.dropped = true; for (let i = 0; i < e.o.drop; i++) sim.later.push({ t: i * .5, fn: () => { if (e.dead) return; const s2 = sim.spawn('para', { lx: e.lx + (i - e.o.drop / 2) * 30, dz: Math.max(160, e.dz - 60), z: e.z - 10, beat: e.beat }); const bt = sim.beats.find(b => b.id === e.beat); if (bt) bt.ids.push(s2.id); } }); }
  }
  e.facing = sim.cam.angle + Math.PI / 2 + Math.cos(e.t * .5) * .5;
};
// plane: scenery crossing overhead; drops troops and supplies on its way
B.plane = (sim, e, dt) => {
  if (e.st === 'enter') { e.cam = true; e.lx = -sim.hw(e.dz) - 200; e.z = e.o.z || 180; e.st = 'fly'; e.drops = e.o.drop || 0; e.crate = e.o.crate; }
  e.lx += 140 * dt; e.facing = sim.cam.angle + Math.PI / 2;
  if (e.drops > 0 && e.lx > -120 + (e.o.drop - e.drops) * 60) { e.drops--; const s2 = sim.spawn('para', { lx: e.lx, dz: Math.min(e.dz, 300), z: 150, beat: e.beat }); const bt = sim.beats.find(b => b.id === e.beat); if (bt) bt.ids.push(s2.id); }
  if (e.crate && e.lx > 0) { e.crate = null; sim.spawn('chute', { lx: e.lx, dz: 180, z: 150, beh: 'chute', carry: 'ammo' }); }
  if (e.lx > sim.hw(e.dz) + 300) e.gone = true;
};

// ---------------------------------------------------------------------------------------------- civilians, hostages, animals
TY.villager = { kind: 'civilian', name: 'VILLAGER', rig: 'villager', h: RH(1.25), hp: 1, beh: 'civ', fadeT: 3 };
TY.villager2 = { kind: 'civilian', name: 'VILLAGER', rig: 'villager2', h: RH(1.2), hp: 1, beh: 'civ', fadeT: 3 };
TY.medic = { kind: 'civilian', name: 'MEDIC', rig: 'medic', h: RH(1.3), hp: 1, beh: 'civ', fadeT: 3 };
TY.reporter = { kind: 'civilian', name: 'REPORTER', rig: 'reporter', h: RH(1.3), hp: 1, beh: 'civ', fadeT: 3, reporter: true };
B.civ = (sim, e, dt) => {
  if (e.st === 'enter') { e.dir = e.o.dir || (e.side < 0 ? 1 : -1); e.st = 'walk'; e.gift = sim.R.loot() < .1; }
  if (e.panic > 0) e.panic -= dt;
  moveDir(sim, e, e.dir, (e.o.speed || 42) * (e.panic > 0 ? 1.5 : 1)); stepMove(e, dt); e.pose = 'stand';
  const [lx, dz] = sim.w2c(e.x, e.y);
  if (!e.gave && Math.abs(lx) < 20) { e.gave = true; const enemies = sim.ents.some(x => !x.dead && x.kind === 'infantry');
    if (e.T.reporter) { sim.radio('press'); sim.drop('intel', e.x, e.y, 30); }
    else if (e.gift && enemies) { sim.drop(sim.R.loot() < .5 ? 'ration' : 'mag', e.x, e.y, 30); sim.radio('thanks'); } }
};
const HOSTAGE = i => ({ kind: 'hostage', name: WP.HOSTAGES[i][0], rig: 'h' + i, h: RH(1.25), hp: 3, beh: 'escort', fadeT: 99, idx: i });
for (let i = 0; i < 5; i++) TY['hostage' + i] = HOSTAGE(i);
B.escort = (sim, e, dt) => {
  if (e.st === 'enter') { e.st = 'run'; e.from = [e.o.lx, e.o.dz]; e.goal = e.o.goal; sim.host.list.push(e); sim.radio('hostage.free'); e.home = [e.x, e.y]; }
  if (e.rescued || e.lost) return;
  if (e.grabbedBy) { const g = sim.get(e.grabbedBy); if (!g || g.dead) { e.grabbedBy = 0; } else return; }
  const [gx, gy] = sim.c2w(e.goal[0], e.goal[1]), dx = gx - e.x, dy = gy - e.y, d = Math.hypot(dx, dy);
  if (d < 6) { e.rescued = true; e.gone = true; sim.host.saved++; sim.ev('rescued', { id: e.id, idx: e.T.idx }); for (const p of sim.living()) { sim.addScore(p, 5000, e); p.stats.hostagesEscorted++; } return; }
  e.vx = dx / d * 46; e.vy = dy / d * 46; stepMove(e, dt); e.facing = Math.atan2(dy, dx); e.pose = 'stand';
};
WP.hostageLost = (sim, e) => { if (e.lost || e.rescued) return; e.lost = true; e.dead = true; e.deadT = 0; e.grabbedBy = 0; sim.host.lost++; sim.ev('lost', { id: e.id, idx: e.T.idx }); sim.radio('hostage.lost'); };
const animal = (o) => Object.assign({ kind: 'animal', hp: 1, beh: 'animal', fadeT: 1, r: 8, cz: 6 }, o);
TY.goat = animal({ name: 'GOAT', blob: 'goat', r: 11, cz: 9, speed: 22 });
TY.chicken = animal({ name: 'CHICKEN', blob: 'chicken', r: 6, cz: 4, speed: 18 });
TY.pig = animal({ name: 'PIG', blob: 'pig', r: 10, cz: 7, speed: 20 });
TY.parrot = animal({ name: 'PARROT', blob: 'parrot', r: 6, cz: 0, speed: 60, fly: true });
TY.monkey = animal({ name: 'MONKEY', blob: 'monkey', r: 8, cz: 5, speed: 30 });
TY.seagull = animal({ name: 'SEAGULL', blob: 'seagull', r: 6, cz: 0, speed: 50, fly: true });
B.animal = (sim, e, dt) => {
  if (e.st === 'enter') { e.dir = e.o.dir || (e.side < 0 ? 1 : -1); e.st = 'walk'; e.z = e.o.z || 0; e.stopT = e.T.fly ? 0 : 1 + sim.R.ai() * 2; }
  if (e.fled) { moveDir(sim, e, e.fdir, e.T.fly ? 140 : 110); stepMove(e, dt); if (e.T.fly) e.z += 30 * dt; return; }
  if (e.o.perch && !e.T.fly) { stop(e); toCam(sim, e); return; }
  if ((e.stopT -= dt) > 0 && e.t > .8) { stop(e); return; }
  if (e.stopT < -2.5) e.stopT = 1 + sim.R.ai() * 1.5;
  moveDir(sim, e, e.dir, e.T.speed); stepMove(e, dt); if (e.T.fly) e.z = (e.o.z || 50) + Math.sin(e.t * 3) * 6;
};
WP.animalHit = (sim, e, p) => {
  if (e.fled) return; e.fled = true; e.fdir = sim.w2c(e.x, e.y)[0] < 0 ? -1 : 1;
  if (e.carry) { sim.drop(e.carry, e.x, e.y, e.z + 14); e.carry = null; }
  sim.ev('squawk', { id: e.id, type: e.type });
};

// ---------------------------------------------------------------------------------------------- props (7.12)
const prop = o => Object.assign({ kind: 'prop', fadeT: 1.2 }, o);
TY.crate = prop({ name: 'CRATE', shape: 'crate', hp: 3, box: [16, 16, 16], mat: 'wood', onBreak: (s, e) => { const k = e.o.drop || s.crateDrop('wood'); if (k) s.drop(k, e.x, e.y, 14); } });
TY.ammoCrate = prop({ name: 'AMMO CRATE', shape: 'ammoCrate', hp: 3, box: [20, 14, 14], mat: 'wood', onBreak: (s, e) => { const k = e.o.drop || s.crateDrop('ammo'); if (k) s.drop(k, e.x, e.y, 12); } });
TY.barrel = prop({ name: 'FUEL BARREL', shape: 'redBarrel', hp: 4, box: [12, 12, 18], mat: 'metal', onBreak: (s, e, p) => s.later.push({ t: .12, fn: () => s.explode(e.x, e.y, 10, 48, 10, p, { src: e }) }) });
TY.sandbags = prop({ name: 'SANDBAGS', shape: 'sandbags', hp: 40, box: [44, 14, 16], cover: true, mat: 'dirt', blastMul: 1.25, init: (s, e) => { if (e.o.len) e.T = Object.assign({}, e.T, { box: [e.o.len, 14, 16] }); } });
TY.mast = prop({ name: 'RADIO MAST', shape: 'radioMast', hp: 25, box: [16, 16, 26], mat: 'metal', keep: true, onBreak: (s, e) => { e.topple = 0; if (s.objective) s.objective.have++; s.ev('mast', { id: e.id, have: s.objective ? s.objective.have : 0 }); } });
TY.fuelTank = prop({ name: 'FUEL TANK', shape: 'fuelTank', hp: 20, box: [44, 24, 30], cover: false, mat: 'metal', onBreak: (s, e, p) => s.later.push({ t: .15, fn: () => s.explode(e.x, e.y, 16, 90, 20, p, { src: e }) }) });
TY.searchlight = prop({ name: 'SEARCHLIGHT', shape: 'searchlight', hp: 2, box: [10, 10, 10], mat: 'metal', keep: true, init: (s, e) => { e.sweep = e.o.phase || 0; }, onBreak: (s, e) => s.ev('lightout', { id: e.id }) });
TY.rope = prop({ name: 'BRIDGE ROPE', shape: null, hp: 6, box: [6, 6, 10], mat: 'wood', keep: true, onBreak: (s, e, p) => WP.bridgeOut(s, p) });
TY.wagon = prop({ name: 'AMMO WAGON', shape: 'ammoWagon', hp: 4, box: [48, 20, 26], mat: 'wood', keep: true, onBreak: (s, e, p) => s.later.push({ t: .15, fn: () => s.explode(e.x, e.y, 14, 70, 30, p, { src: e }) }) });
TY.cell = prop({ name: 'CELL', shape: null, hp: Infinity, box: [1, 1, 1] });
WP.bridgeOut = (sim, p) => {
  if (sim.bridgeDown) return; sim.bridgeDown = true; sim.radio('bridge'); sim.ev('bridge', {});
  for (const e of sim.ents) if (!e.dead && e.kind === 'infantry' && e.o.bridge) { e.vz = 0; e.z = Math.max(e.z, 1); sim.kill(e, p, 'fall', 'fall'); sim.addScore(p, 300, e); }
};

// ---------------------------------------------------------------------------------------------- projectiles (7.7)
const proj = o => Object.assign({ kind: 'projectile', hp: 1, beh: 'proj', fadeT: 0 }, o);
TY.egrenade = proj({ name: 'GRENADE', sprite: 'grenade', r: 4, flight: 1.3, dmg: 12, score: 50, arc: 60 });
TY.blade = proj({ name: 'KNIFE', sprite: 'knife', r: 4, flight: .8, dmg: 8, score: 100, arc: 6, spin: true });
TY.rocket = proj({ name: 'ROCKET', sprite: 'rocket', r: 4, flight: 1.6, dmg: 16, score: 150, arc: 0, wobble: 2, trail: true });
TY.missile = proj({ name: 'MISSILE', sprite: 'missile', r: 4, flight: 1.8, dmg: 18, score: 200, arc: 10, trail: true });
TY.shell = proj({ name: 'MORTAR SHELL', sprite: 'shell', r: 5, flight: 2.6, dmg: 10, score: 100, arc: 110, marker: true });
TY.tshell = proj({ name: 'TANK SHELL', sprite: 'tshell', r: 6, hp: 2, flight: .8, dmg: 22, score: 250, arc: 0, glow: true });
TY.flame = proj({ name: 'FLAME', sprite: null, r: 10, flight: 1.2, dmg: 15, score: 0, arc: 0, shootable: false, ground: true });
TY.pgrenade = { kind: 'pgrenade', name: 'GRENADE', sprite: 'grenade', hp: 1, beh: 'pgren', fadeT: 0 };
B.proj = (sim, e, dt) => {
  e.u += dt / e.fl; const u = Math.min(1, e.u), f = e.from, t = e.to;
  e.lx = WP.lerp(f[0], t[0], u) + (e.T.wobble ? Math.sin(e.t * 20) * e.T.wobble : 0);
  e.dz = WP.lerp(f[1], t[1], u);
  e.lz = e.T.ground ? -sim.cam.h + 2 : WP.lerp(f[2], t[2], u) + (e.T.arc || 0) * 4 * u * (1 - u);
  e.zr = true; sim.place(e); e.z = sim.cam.h + e.lz;
  if (u >= 1) { e.gone = true; const p = sim.players.find(q => q.pid === e.pid) || sim.players[0]; if (p) sim.hurtPlayer(p, e.T.dmg, e, 'proj'); sim.ev('impact', { id: e.id, type: e.type, pid: p ? p.pid : 0 }); }
};
B.pgren = (sim, e, dt) => {
  e.u = (e.u || 0) + dt / e.fl; const u = Math.min(1, e.u), f = e.from, t = e.to;
  e.x = WP.lerp(f[0], t[0], u); e.y = WP.lerp(f[1], t[1], u); e.z = WP.lerp(f[2], t[2], u) + Math.min(80, 30 + e.fl * 40) * 4 * u * (1 - u);
  if (u >= 1) { e.gone = true; const p = sim.players.find(q => q.pid === e.owner); sim.explode(t[0], t[1], t[2], T.grenadeRadius, T.grenadeDmg, p, { src: e }); }
};

// ---------------------------------------------------------------------------------------------- pickups
TY.pickup = { kind: 'pickup', name: 'ITEM', hp: 1, r: 7, cz: 0, beh: 'pickup', fadeT: 0 };
TY.chute = { kind: 'pickup', name: 'SUPPLY DROP', hp: 1, r: 10, cz: 6, beh: 'chute', fadeT: 0 };
B.pickup = (sim, e, dt) => {
  if (e.st === 'enter') { e.st = 'pop'; }
  if (e.st === 'pop') { e.vz -= 400 * dt; e.z += e.vz * dt; if (e.z <= 4) { e.z = 4; if (e.bounces++ < 2) e.vz = 70 / e.bounces; else { e.st = 'hover'; e.vz = 0; } } }
  else e.z = 8 + Math.sin(e.t * 4) * 2;
  if ((e.life -= dt) <= 0) e.gone = true;
};
B.chute = (sim, e, dt) => {
  if (e.st === 'enter') { e.st = 'fall'; e.pk = e.o.carry || 'ammo'; e.life = 99; }
  if (e.st === 'fall') { e.z -= 30 * dt; if (e.z <= 4) { e.z = 4; e.st = 'land';
    if (e.emergency !== undefined) { const p = sim.players.find(q => q.pid === e.emergency); if (p) { p.spares.push(T.magSize, T.magSize); p.score = Math.max(0, p.score - 2000); if (p.mag === 0) p.autoT = .05; sim.ev('emergency', { pid: p.pid }); } e.gone = true; }
    else { e.life = 6; e.beh = 'pickup'; e.st = 'hover'; } } }
};

// ---------------------------------------------------------------------------------------------- dynamite, assist and threats
WP.dynamite = (sim, p) => {
  sim.ev('dynamite', { pid: p.pid });
  for (const e of sim.ents) {
    if (e.dead || e.gone) continue; const pr = sim.view.project(e.x, e.y, e.z); if (!pr || pr[0] < -20 || pr[0] > WP.W + 20 || pr[1] < -40 || pr[1] > WP.PLAY_H + 40) continue;
    if (e.kind === 'infantry') sim.kill(e, p, 'blast', 'blast');
    else if (e.kind === 'vehicle') sim.damage(e, 30, p, 'blast');
    else if (e.kind === 'boss') WP.bossBlast(sim, e, 30, p);
    else if (e.kind === 'projectile' && e.T.shootable !== false) sim.intercept(p, e);
    else if (e.kind === 'civilian' || e.kind === 'hostage') sim.hitFriendly(p, e, e.kind === 'hostage' ? 'hostage' : 'civ');
  }
};
const hostile = e => !e.dead && !e.gone && !e.hidden && (e.kind === 'infantry' || e.kind === 'vehicle' || e.kind === 'boss' || (e.kind === 'projectile' && e.T.shootable !== false && !e.friendly));
WP.hostile = hostile;
// aim assist at a screen point: friction (0..1 speed scale) and a pull toward a hostile's centre
WP.assistAt = (sim, x, y) => {
  const out = []; for (const e of sim.ents) if (hostile(e)) sim.shapesOf(e, out);
  let fric = 1, best = null, bd = 28 * 28;
  for (const s of out) {
    const c = s.c ? [s.c[0], s.c[1]] : [(s.r[0] + s.r[2]) / 2, (s.r[1] + s.r[3]) / 2];
    const inside = s.c ? WP.d2(x, y, c[0], c[1]) <= (s.c[2] + 6) ** 2 : x >= s.r[0] - 6 && x <= s.r[2] + 6 && y >= s.r[1] - 6 && y <= s.r[3] + 6;
    if (inside) fric = .45;
    const d = WP.d2(x, y, c[0], c[1]); if (d < bd && s.part !== 'legs') { bd = d; best = c; }
  }
  return { fric, pull: best };
};
// the most dangerous thing: a projectile about to hit, a telegraph about to close, the nearest hostile
WP.threatPoint = (sim, p, f) => {
  let best = null, bs = -1e9; const v = sim.view;
  for (const e of sim.ents) {
    if (!hostile(e)) continue; const out = []; sim.shapesOf(e, out); if (!out.length) continue;
    const s = out.find(q => q.part === 'head') || out.find(q => q.part && q.part.startsWith('wp:')) || out.find(q => q.part === 'gunner') || out[0];
    const c = s.c ? [s.c[0], s.c[1]] : [(s.r[0] + s.r[2]) / 2, (s.r[1] + s.r[3]) / 2];
    if (c[0] < 0 || c[0] > WP.W || c[1] < 0 || c[1] > WP.PLAY_H) continue;
    let score = -Math.hypot(c[0] - p.x, c[1] - p.y) / 100;
    if (e.kind === 'projectile') score += 20 + (e.u || 0) * 10;
    else if (e.tele) score += 10 + (1 - e.tele.t / e.tele.max) * 5;
    if (f && (f.dx || f.dy)) { const dx = c[0] - p.x, dy = c[1] - p.y, l = Math.hypot(dx, dy) || 1; score += ((dx * f.dx + dy * f.dy) / l) * 1.5; }
    if (score > bs) { bs = score; best = c; }
  }
  return best;
};
})();
