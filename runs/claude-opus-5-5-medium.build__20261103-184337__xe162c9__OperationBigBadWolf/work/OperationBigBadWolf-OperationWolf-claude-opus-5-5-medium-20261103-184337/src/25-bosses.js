// The six bosses (8.7): phases of weak points, attacks, defeats. A boss is an entity of kind 'boss' with parts
// { id, name, off: [forward, right, up], r, hp, max, phase, dead, opt (not needed to end the phase), respawn }.
(() => {
const E = My3D2dge, WP = globalThis.WP, T = WP.T, TY = WP.TYPES, BEH = WP.BEHAV;
const part = (id, name, off, r, hp, phase, o = {}) => Object.assign({ id, name, off, r, hp, max: hp, phase, dead: false }, o);
WP.bossHp = e => e.parts.filter(p => p.phase === e.phase && !p.dead && !p.opt).reduce((a, p) => a + Math.max(0, p.hp), 0);
WP.bossMax = e => e.parts.filter(p => p.phase === e.phase && !p.opt).reduce((a, p) => a + p.max, 0);
const partPos = (sim, e, p) => sim.wpWorld(e, p.off);
function bossShapes(sim, e, out) {
  const v = sim.view, d = v.depth(e.x, e.y);
  for (const p of e.parts) {
    if (p.dead || p.hidden) continue; const w = partPos(sim, e, p), pr = v.project(w[0], w[1], w[2]); if (!pr) continue;
    const live = p.phase === e.phase;
    out.push({ e, part: (live ? 'p:' : 'arm:') + p.id, d: Math.min(v.depth(w[0], w[1]), d) - (live ? 3 : 2), c: [pr[0], pr[1], Math.max(4, p.r * pr[2])] });
  }
  if (e.T.box && !e.noHull) { const r = sim.boxRect(e.x, e.y, e.z, e.T.box, e.facing); if (r) out.push({ e, part: 'hull', d: d + 1, r }); }
  if (e.T.extraShapes) e.T.extraShapes(sim, e, out);
}
WP.bossHit = (sim, e, partId, dmg, pl, shot) => {
  if (e.dead) return;
  if (!partId || partId === 'hull' || partId.startsWith('arm:') || partId === 'shield') { if (!e.armT || sim.t - e.armT > 1.2) { e.armT = sim.t; sim.ev('armored', { id: e.id, x: shot && shot.x, y: shot && shot.y }); } if (shot) shot.mat = 'metal'; return; }
  const p = e.parts.find(q => 'p:' + q.id === partId); if (!p || p.dead) return;
  if (WP.CHEATS.oneHit && pl && pl.seat === 0) dmg = 999;
  if (p.mult) dmg *= p.mult;
  p.hp -= dmg; p.hitT = sim.t; sim.ev('bosshit', { id: e.id, part: p.id });
  if (e.tele && (e.tele.kind === 'ring' || e.tele.kind === 'glow')) e.tele.t = Math.min(e.tele.max, e.tele.t + .05);   // shooting it holds its fire back
  if (p.onHit) p.onHit(sim, e, p, pl);
  if (p.hp <= 0) partDown(sim, e, p, pl);
};
WP.bossBlast = (sim, e, dmg, pl) => {
  let best = null, bd = 1e9; for (const p of e.parts) { if (p.dead || p.phase !== e.phase) continue; const w = partPos(sim, e, p); const d = Math.hypot(w[0] - e.x, w[1] - e.y); if (d < bd) { bd = d; best = p; } }
  if (best) { best.hp -= dmg * .6; sim.ev('bosshit', { id: e.id, part: best.id }); if (best.onBlast) best.onBlast(sim, e, best, pl); if (best.hp <= 0) partDown(sim, e, best, pl); }
};
// a blast at a world point hurts the boss part nearest it (ammo wagons beside the train)
WP.bossBlastAt = (sim, e, x, y, R, dmg, pl) => {
  for (const p of e.parts) { if (p.dead) continue; const w = partPos(sim, e, p); if (Math.hypot(w[0] - x, w[1] - y) < R && (p.phase === e.phase || p.opt)) { p.hp -= dmg; sim.ev('bosshit', { id: e.id, part: p.id }); if (p.hp <= 0) partDown(sim, e, p, pl); } }
};
function partDown(sim, e, p, pl) {
  p.dead = true; p.hp = 0; const w = partPos(sim, e, p);
  sim.ev('explode', { x: w[0], y: w[1], z: w[2], r: 26 + p.r, debris: true }); sim.ev('partdown', { id: e.id, part: p.id });
  if (pl) sim.addScore(pl, 500, { x: w[0], y: w[1], z: w[2], T: {} });
  if (p.respawn > 0) { p.respawn--; sim.later.push({ t: 6, fn: () => { if (!e.dead && e.phase === p.phase) { p.dead = false; p.hp = p.max; } } }); }
  if (p.onDie) p.onDie(sim, e, p, pl);
  if (!e.parts.some(q => q.phase === e.phase && !q.dead && !q.opt)) {
    const nx = e.phase + 1;
    if (e.parts.some(q => q.phase === nx)) { e.phase = nx; e.phaseT = 0; sim.ev('phase', { id: e.id, phase: nx }); if (e.T.onPhase) e.T.onPhase(sim, e, nx); }
    else defeat(sim, e, pl);
  }
}
function defeat(sim, e, pl) {
  e.dead = true; e.deadT = 0; e.tele = null;
  for (const x of sim.ents) if (!x.dead && (x.kind === 'infantry' || x.kind === 'vehicle' || x.kind === 'projectile')) { if (x.kind === 'projectile') x.gone = true; else sim.kill(x, null, 'blast', 'blast'); }
  if (pl) { sim.addScore(pl, e.T.score, e); pl.stats.kills++; }
  for (let i = 0; i < 6; i++) sim.later.push({ t: i * .25, fn: () => sim.ev('explode', { x: e.x + (i % 3 - 1) * 20, y: e.y, z: e.z + 10 + i * 5, r: 40 + i * 6, debris: true, big: i === 5 }) });
  sim.cleared = true; sim.clearT = 0; sim.ev('bossdown', { id: e.id, type: e.type });
  if (e.T.onDefeat) e.T.onDefeat(sim, e);
}
const boss = o => Object.assign({ kind: 'boss', hp: 1, fadeT: 1e9, shapes: bossShapes, fall: false }, o);
const live = (e, id) => { const p = e.parts.find(q => q.id === id); return p && !p.dead && p.phase === e.phase ? p : null; };
const alive = (e, id) => { const p = e.parts.find(q => q.id === id); return p && !p.dead ? p : null; };
WP.bossLive = live;
const ringFire = (sim, e, secs, n, acc, dmg) => sim.telegraph(e, 'ring', secs, (s, en, tl) => { en.firing = .4; s.burst(en, tl.pid, n, acc * .8, dmg); });

WP.BOSSES = {
  // ------------------------------------------------------------------------------------------ BIG EAR
  bigEar: { name: 'BIG EAR', spawn(sim) { return sim.spawn('bigEar', { side: 'R', dz: 260, off: 60 }); } },
  crocodile: { name: 'CROCODILE', spawn(sim) { return sim.spawn('crocodile', { lx: 0, dz: 520, anchor: 'cam' }); } },
  warthog: { name: 'WARTHOG', spawn(sim) { return sim.spawn('warthog', { side: 'L', dz: 200, off: 50 }); } },
  ironHog: { name: 'IRON HOG', spawn(sim) { return sim.spawn('ironHog', { side: 'L', dz: 260, off: 120 }); } },
  tusk: { name: 'MAJOR TUSK', spawn(sim) { return sim.spawn('tuskTower', { lx: 40, dz: 300 }); } },
  hyenaOne: { name: 'HYENA ONE', spawn(sim) { return sim.spawn('hyenaOne', { lx: -260, dz: 420, z: 0, anchor: 'cam' }); } }
};
TY.bigEar = boss({ name: 'BIG EAR', shape: 'bigEar', box: [84, 30, 40], score: 10000, beh: 'bigEar', h: 40,
  init: (s, e) => { e.phase = 0; e.parts = [part('dish', 'RADAR DISH', [-14, 0, 58], 12, 30, 0), part('gunL', 'GUNNER', [6, -10, 40], 6, 1, 0, { opt: true, respawn: 2 }), part('gunR', 'GUNNER', [-30, 10, 40], 6, 1, 0, { opt: true, respawn: 2 }),
    part('pod', 'ROCKET POD', [-34, 0, 40], 9, 15, 0), part('cab', 'CAB AND ENGINE', [30, 0, 18], 14, 60, 1)]; } });
BEH.bigEar = (sim, e, dt) => {
  if (e.st === 'enter') { e.st = 'drive'; e.dir = -1; e.pT = 6; e.rT = 3; e.gT = 1.5; e.home = 0; }
  const b = WP.basis(sim.cam), [lx, dz] = sim.w2c(e.x, e.y);
  if (e.st === 'drive') { const tx = e.home + (e.shuffle || 0); const dx = tx - lx; const sp = Math.sign(dx) * Math.min(60, Math.abs(dx) * 2); e.x += b.rx * sp * dt; e.y += b.ry * sp * dt; e.facing = Math.atan2(b.ry * (sp || -1), b.rx * (sp || -1)); if (Math.abs(dx) < 2) { e.st = 'park'; e.t = 0; } }
  else if (e.st === 'park') { if (e.t > 8) { e.shuffle = (sim.R.ai() - .5) * 240; e.st = 'drive'; } }
  if (live(e, 'dish') && (e.pT -= dt) <= 0) { e.pT = 12; for (let i = 0; i < 2; i++) sim.spawn('para', { lx: (i ? 1 : -1) * 90, dz: 220, z: 150 }); }
  if (live(e, 'pod') && (e.rT -= dt) <= 0) { e.rT = 6; const w = sim.wpWorld(e, [-34, 0, 40]); for (let i = 0; i < 2; i++) sim.later.push({ t: i * .5, fn: () => !e.dead && sim.launch('rocket', e, { x: w[0], y: w[1], z: w[2] }) }); }
  if ((e.gT -= dt) <= 0 && !e.tele) { e.gT = 2.4; if (alive(e, 'gunL') || alive(e, 'gunR')) ringFire(sim, e, 1.3, 3, .4, 4); else if (e.phase === 1) ringFire(sim, e, 1.4, 4, .35, 4); }
};
// ------------------------------------------------------------------------------------------ CROCODILE
TY.crocodile = boss({ name: 'CROCODILE', shape: 'crocodile', box: [110, 36, 34], score: 14000, beh: 'crocodile', h: 34,
  init: (s, e) => { e.phase = 0; e.cam = true; e.parts = [part('fturret', 'FRONT TURRET', [34, 0, 30], 10, 20, 0), part('rturret', 'REAR TURRET', [-38, 0, 30], 10, 20, 0), part('mortar', 'DECK MORTAR', [-6, 10, 26], 8, 15, 0), part('bridge', 'BRIDGE', [4, 0, 46], 14, 45, 1)]; } });
BEH.crocodile = (sim, e, dt) => {
  if (e.st === 'enter') { e.st = 'in'; e.t = 0; e.gT = 2; e.mT = 3; e.skiffs = 0; }
  if (e.st === 'in') { e.dz = Math.max(200, 520 - e.t * 90); if (e.dz <= 200) e.st = 'fight'; }
  else { e.dz = 200 + Math.sin(e.t * .4) * 40; e.lx = Math.sin(e.t * .27) * 80; }
  e.facing = sim.cam.angle + Math.PI / 2; e.z = Math.sin(sim.t * 2) * 1;
  if ((e.gT -= dt) <= 0 && !e.tele) { e.gT = 2.2; if (live(e, 'fturret') || live(e, 'rturret')) ringFire(sim, e, 1.4, 4, .35, 4); else if (e.phase === 1) ringFire(sim, e, 1.3, 3, .4, 5); }
  if ((e.mT -= dt) <= 0) { e.mT = 5; if (live(e, 'mortar') || e.phase === 1) sim.launch('shell', e, { z: 30 }); }
  if (!e.skiffs && WP.bossHp(e) < WP.bossMax(e) * .5 && e.phase === 0) { e.skiffs = 1; sim.spawn('skiff', { lx: -70, dz: 380, path: 'boat' }); sim.spawn('skiff', { lx: 70, dz: 420, path: 'boat' }); }
};
// ------------------------------------------------------------------------------------------ WARTHOG
TY.warthog = boss({ name: 'WARTHOG', shape: 'halftrack', box: [80, 32, 34], score: 18000, beh: 'warthog', h: 34,
  init: (s, e) => { e.phase = 0; e.parts = [part('cannon', 'CANNON', [30, 0, 34], 9, 25, 0), part('tankL', 'FUEL TANK', [-30, -16, 18], 8, 12, 0, { onHit: (s2, en) => { if (en.flame && en.flame.side === -1) en.flame = null; } }),
    part('tankR', 'FUEL TANK', [-30, 16, 18], 8, 12, 0, { onHit: (s2, en) => { if (en.flame && en.flame.side === 1) en.flame = null; } }),
    part('snarl', 'SGT. SNARL', [2, 0, 46], 5, 2, 0, { opt: true, respawn: 99, onHit: (s2, en) => { en.stun = 2; } }), part('hull', 'HULL', [6, 0, 20], 18, 50, 1)]; } });
BEH.warthog = (sim, e, dt) => {
  if (e.st === 'enter') { e.st = 'drive'; e.cT = 3; e.fT = 4; e.civ = 0; e.civT = 5; e.target = 0; }
  const b = WP.basis(sim.cam), [lx] = sim.w2c(e.x, e.y);
  if (e.stun > 0) return;
  const dx = e.target - lx; if (Math.abs(dx) < 4) e.target = (sim.R.ai() - .5) * 200; const sp = Math.sign(dx) * 30;
  e.x += b.rx * sp * dt; e.y += b.ry * sp * dt; e.facing = Math.atan2(-b.fy, -b.fx) + Math.sign(sp) * .9;
  if (live(e, 'cannon') && (e.cT -= dt) <= 0 && !e.tele) { e.cT = 4.5; sim.telegraph(e, 'glow', 2, (s, en) => { en.firing = .5; s.launch('tshell', en, { z: en.z + 34 }); }); }
  if (e.phase === 1 && (e.cT -= dt) <= 0 && !e.tele) { e.cT = 3; ringFire(sim, e, 1.3, 4, .35, 4); }
  const tanks = [alive(e, 'tankL') && -1, alive(e, 'tankR') && 1].filter(Boolean);
  if (e.flame) { e.flame.t -= dt; if (e.flame.t <= 0) { const side = e.flame.side; e.flame = null; if (alive(e, side < 0 ? 'tankL' : 'tankR')) sim.launch('flame', e, { z: 2, tx: side * 30 }); } }
  else if (tanks.length && (e.fT -= dt) <= 0) { e.fT = 6; e.flame = { side: tanks[Math.floor(sim.R.ai() * tanks.length)], t: 1.5 * T.telegraph * sim.diff.tele }; sim.ev('nozzle', { id: e.id }); }
  if (e.civ < 3 && (e.civT -= dt) <= 0) { e.civT = 9; e.civ++; sim.spawn(e.civ % 2 ? 'villager' : 'villager2', { side: e.civ % 2 ? 'L' : 'R', dz: 330 }); }
};
// ------------------------------------------------------------------------------------------ IRON HOG
TY.ironHog = boss({ name: 'IRON HOG', shape: 'locomotive', box: [64, 26, 40], score: 22000, beh: 'ironHog', h: 40,
  init: (s, e) => { e.phase = 0; e.parts = [part('mg', 'MG CAR', [-62, 0, 34], 10, 20, 0), part('rk', 'ROCKET CAR', [-120, 0, 34], 11, 25, 0), part('mo', 'MORTAR CAR', [-178, 0, 32], 10, 20, 0), part('boiler', 'BOILER', [10, 0, 26], 16, 50, 1, { onHit: (s2, en, p) => { if (en.vent) en.vent.taken += 1; } })]; } });
BEH.ironHog = (sim, e, dt) => {
  if (e.st === 'enter') { e.st = 'run'; e.dir = 1; e.x0 = e.x; e.gT = 2; e.rT = 4; e.mT = 5; e.vT = 6; e.trackY = e.y; }
  e.y = e.trackY; e.x += e.dir * 45 * dt; e.facing = e.dir > 0 ? 0 : Math.PI;
  const [lx] = sim.w2c(e.x, e.y); if (lx > 330 && e.dir > 0) e.dir = -1; if (lx < -150 && e.dir < 0) e.dir = 1;
  if ((e.gT -= dt) <= 0 && !e.tele) { e.gT = 2.6; if (live(e, 'mg')) ringFire(sim, e, 1.3, 4, .35, 4); }
  if (live(e, 'rk') && (e.rT -= dt) <= 0) { e.rT = 6; const w = sim.wpWorld(e, [-120, 0, 40]); for (let i = 0; i < 3; i++) sim.later.push({ t: i * .35, fn: () => !e.dead && sim.launch('rocket', e, { x: w[0], y: w[1], z: w[2] }) }); }
  if (live(e, 'mo') && (e.mT -= dt) <= 0) { e.mT = 6; sim.launch('shell', e, { z: 40 }); }
  if (e.phase === 1) {
    if (e.vent) { e.vent.t -= dt; if (e.vent.t <= 0) { if (e.vent.taken < 10) { const p = sim.living()[0]; if (p) sim.hurtPlayer(p, 10, e, 'steam'); sim.ev('steam', { id: e.id }); } e.vent = null; } }
    else if ((e.vT -= dt) <= 0) { e.vT = 7; e.vent = { t: 1.5 * T.telegraph * sim.diff.tele, max: 1.5, taken: 0 }; sim.ev('vent', { id: e.id }); }
    if ((e.gT -= dt) <= 0 && !e.tele) { e.gT = 3; ringFire(sim, e, 1.4, 3, .35, 4); }
  }
};
// ------------------------------------------------------------------------------------------ MAJOR TUSK (the tower, then on foot)
TY.tuskTower = boss({ name: 'MAJOR TUSK', shape: null, box: null, score: 26000, beh: 'tusk', h: 100,
  init: (s, e) => { e.phase = 0; e.noHull = true; e.parts = [part('mg', 'TOWER MG', [0, 0, 86], 9, 15, 0), part('sl1', 'SEARCHLIGHT', [0, -14, 100], 5, 2, 0), part('sl2', 'SEARCHLIGHT', [0, 14, 100], 5, 2, 0),
    part('leg1', 'SUPPORT LEG', [0, -22, 30], 8, 15, 0), part('leg2', 'SUPPORT LEG', [0, 22, 30], 8, 15, 0), part('leg3', 'SUPPORT LEG', [8, 0, 26], 8, 15, 0),
    part('tusk', 'MAJOR TUSK', [0, 0, 41], 7, 40, 1, { hidden: true, mult: 3 })]; e.tusk = null; },
  extraShapes: (sim, e, out) => {
    if (e.phase !== 1 || !e.tusk) return; const v = sim.view, t = e.tusk, h = 46, pr = v.project(t.x, t.y, 0), ph = v.project(t.x, t.y, h * .87); if (!pr || !ph) return; const k = pr[2], d = v.depth(t.x, t.y);
    out.push({ e, part: 'p:tusk', d: d - 1, c: [ph[0], ph[1], Math.max(3, .1 * h * k)] });
    const body = [pr[0] - .2 * h * k, ph[1] + .08 * h * k, pr[0] + .2 * h * k, pr[1]];
    if (t.shieldDown > 0 || t.knocked > 0) out.push({ e, part: 'p:tuskBody', d: d - .5, r: body });
    else out.push({ e, part: 'shield', d: d - 3, r: [pr[0] - .26 * h * k, ph[1] + .12 * h * k, pr[0] + .26 * h * k, pr[1] - .05 * h * k] });
  },
  onPhase: (sim, e) => { e.tusk = { x: e.x, y: e.y - 10, dz: 250, shieldDown: 0, knocked: 0, st: 'walk', t: 0 }; const tp = e.parts.find(p => p.id === 'tusk'); tp.hidden = true; sim.radio('tusk.1'); sim.ev('towerfall', { id: e.id }); e.towerDown = true; },
  onDefeat: (sim) => sim.radio('tusk.2') });
// the body of TUSK shares the pool with his head (head x3)
const prevHit = WP.bossHit;
WP.bossHit = (sim, e, partId, dmg, pl, shot) => {
  if (partId === 'p:tuskBody') { const tp = e.parts.find(p => p.id === 'tusk'); if (tp && !tp.dead) { tp.hp -= dmg; sim.ev('bosshit', { id: e.id, part: 'tusk' }); if (tp.hp <= 0) partDown(sim, e, tp, pl); } return; }
  return prevHit(sim, e, partId, dmg, pl, shot);
};
const prevBlast = WP.bossBlast;
WP.bossBlast = (sim, e, dmg, pl) => { if (e.type === 'tuskTower' && e.phase === 1 && e.tusk) { e.tusk.knocked = 3; } return prevBlast(sim, e, dmg, pl); };
BEH.tusk = (sim, e, dt) => {
  if (e.st === 'enter') { e.st = 'tower'; e.gT = 2; e.facing = sim.cam.angle + Math.PI; e.spT = 0; }
  if (e.phase === 0) {
    if ((e.gT -= dt) <= 0 && !e.tele && live(e, 'mg')) { e.gT = 2.3; ringFire(sim, e, 1.3, 4, .4, 4); }
    if ((live(e, 'sl1') || live(e, 'sl2')) && (e.spT -= dt) <= 0) { e.spT = 7; sim.spotted = 3; sim.ev('spotted', {}); }
    return;
  }
  const t = e.tusk; if (!t) return; t.t += dt;
  if (t.knocked > 0) t.knocked -= dt; if (t.shieldDown > 0) t.shieldDown -= dt;
  const [, dz] = sim.w2c(t.x, t.y), b = WP.basis(sim.cam);
  if (t.st === 'walk') { const sp = dz > 90 ? 22 : 70; t.x -= b.fx * sp * dt; t.y -= b.fy * sp * dt; if (dz < 60) { const p = sim.living()[0]; if (p) sim.hurtPlayer(p, 20, e, 'charge'); sim.ev('charge', {}); t.x += b.fx * 90; t.y += b.fy * 90; }
    if (t.t > 3.2 && dz > 90 && !e.tele) { t.t = 0; t.st = 'aim'; t.shieldDown = 1.0 + .3; sim.telegraph(e, 'ring', 1, (s, en, tl) => { en.firing = .4; s.burst(en, tl.pid, 3, .45, 6, .03); }); } }
  else if (t.st === 'aim') { if (t.t > 1.4) { t.st = 'walk'; t.t = 0; } }
  e.tx = t.x; e.ty = t.y;
};
// ------------------------------------------------------------------------------------------ HYENA ONE
TY.hyenaOne = boss({ name: 'HYENA ONE', shape: 'hyenaOne', box: [96, 26, 34], score: 30000, beh: 'hyenaOne', h: 34,
  init: (s, e) => { e.phase = 0; e.cam = true; e.zr = true; e.lz = -40; e.parts = [part('podL', 'ROCKET POD', [0, -26, 6], 9, 25, 0), part('podR', 'ROCKET POD', [0, 26, 6], 9, 25, 0), part('door', 'DOOR GUNNER', [-6, 12, 14], 6, 3, 0, { opt: true, respawn: 99 }),
    part('nose', 'NOSE CANNON', [42, 0, 4], 9, 30, 1), part('kragg', 'GEN. KRAGG', [-4, 14, 22], 6, 3, 2, { opt: true, respawn: 99, onHit: (s2, en) => { en.stun = 2; } }), part('rotor', 'ROTOR HUB', [0, 0, 36], 12, 60, 2)]; },
  onPhase: (sim, e, n) => { sim.radio(n === 1 ? 'kragg.2' : 'kragg.3'); },
  onDefeat: (sim, e) => { sim.radio('kragg.4'); e.spiral = true; } });
BEH.hyenaOne = (sim, e, dt) => {
  if (e.st === 'enter') { e.st = 'climb'; e.t = 0; e.rT = 4; e.gT = 2; e.cT = 3; e.mT = 4; sim.radio('kragg.1'); }
  const sight = dz => -dz * Math.tan(sim.cam.pitch * Math.PI / 180) - 14;   // on the camera's line of sight, a little below it
  if (e.st === 'climb') { const u = Math.min(1, e.t / 4); e.dz = WP.lerp(420, 190, u); e.lx = WP.lerp(-260, 0, u); e.lz = sight(e.dz) + WP.lerp(-80, 0, u); if (u >= 1) e.st = 'fight'; }
  else { e.dz = 180 + Math.sin(e.t * .5) * 40; e.lx = Math.sin(e.t * .37) * 110; e.lz = sight(e.dz) + Math.sin(e.t * .8) * 12; }
  e.facing = sim.cam.angle + Math.PI + Math.sin(e.t * .37) * .5;
  if (e.stun > 0) return;
  if (e.phase === 0) {
    if ((e.rT -= dt) <= 0) { e.rT = 5; for (let i = 0; i < 3; i++) sim.later.push({ t: i * .3, fn: () => !e.dead && sim.launch('rocket', e) }); }
    if ((e.gT -= dt) <= 0 && !e.tele && alive(e, 'door')) { e.gT = 2.5; ringFire(sim, e, 1.3, 3, .4, 4); }
  } else if (e.phase === 1) {
    if ((e.cT -= dt) <= 0 && !e.tele) { e.cT = 4; sim.telegraph(e, 'glow', 2, (s, en) => { en.firing = .5; s.launch('tshell', en); }); }
  } else {
    if ((e.mT -= dt) <= 0) { e.mT = 4; sim.launch('missile', e); }
    if ((e.gT -= dt) <= 0) { e.gT = 9; sim.radio(sim.R.ai() < .5 ? 'kragg.2' : 'kragg.3'); }
  }
};
})();
