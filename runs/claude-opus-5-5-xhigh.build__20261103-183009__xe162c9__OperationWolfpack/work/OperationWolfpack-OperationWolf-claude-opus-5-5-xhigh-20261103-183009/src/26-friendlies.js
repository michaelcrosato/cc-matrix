// Civilians, hostages and supply animals (7.11). Civilians panic near gunfire; a player's hit wounds them (a penalty).
// Hostages run an escort path, can be grabbed and dragged back, and are lost at 0 HP. Animals are never killed: a hit
// makes one drop what it carries and bolt.
(() => {
const E = My3D2dge, WP = globalThis.WP, BEH = WP.BEH, { clamp } = WP, Inf = WP.Inf;

// ---------- civilians ----------
BEH['init:civ'] = (sim, e, o) => {
  e.beh = 'civ'; const lx = sim.view.lateral(e.x, e.y);
  if (!e.dir) e.dir = lx < 0 ? 1 : -1;
  e.speed = e.speed || (o.flee ? 62 : 38); e.panic = o.flee ? 1 : 0; e.offOK = false; e.variant = e.variant === undefined ? Math.floor(sim.R.ai() * 6) : e.variant;
  Inf.setMove(sim, e, e.dir, e.speed); e.facing = Math.atan2(e.mvy, e.mvx);
  e.enemiesSeen = false;
};
BEH.civ = (sim, e, dt) => {
  if (e.wounded) {   // fallen, crawls off and doesn't come back
    e.pose = 'down'; e.x += e.mvx * 8 * dt; e.y += e.mvy * 8 * dt; e.vx = e.vy = 0; if (e.stt > 6) e.gone = true; return;
  }
  const k = e.panic > 0 ? 1.5 : 1; if (e.panic > 0) e.panic -= dt;
  Inf.move(e, dt, k); e.facing = Math.atan2(e.mvy, e.mvx);
  if (!e.enemiesSeen && sim.ents.some(q => !q.dead && WP.TYPES[q.type].kind === 'infantry')) e.enemiesSeen = true;
  // crossed unharmed: a gift (10%), the press thanks you
  const p = sim.view.project(e.x, e.y, e.z);
  if (!e.crossed && p && ((e.dir > 0 && p[0] > WP.W * .8) || (e.dir < 0 && p[0] < WP.W * .2))) {
    e.crossed = true;
    if (WP.TYPES[e.type].reporter) { sim.ev('press', { id: e.id }); sim.radio('press.thanks'); WP.Supply.drop(sim, e.x, e.y, 20, 'intel', null); }
    else if (e.enemiesSeen && sim.R.loot() < .1) { WP.Supply.drop(sim, e.x, e.y, 22, sim.R.loot() < .5 ? 'ration' : 'mag', null); sim.ev('gift', { id: e.id }); }
  }
};
BEH['shapes:civ'] = (sim, e, out, V) => {
  if (e.wounded || e.gone) return;
  const p = V.project(e.x, e.y, e.z); if (!p) return;
  const D = V.depth(e.x, e.y); if (D < 14) return;
  WP.Hit.humanoid(out, e, D, p[0], p[1], WP.Hit.rigH(WP.TYPES[e.type], e) * V.q(p[2]), {});
};
/** a player's bullet (or blast) on a civilian: wounded, a penalty */
WP.civHit = (sim, e, p, how) => {
  if (e.wounded) return;
  e.wounded = true; e.stt = 0; e.pose = 'down';
  sim.ev('civHit', { id: e.id, pid: p ? p.pid : -1, x: e.x, y: e.y, z: e.z });
  if (p) { p.civHits++; sim.hurtPlayer(p, WP.T.civilianDamage, { kind: 'civilian' }); p.score = Math.max(0, p.score - 1000); sim.streakReset(p); sim.ev('points', { pid: p.pid, v: -1000, x: e.x, y: e.y, z: e.z + 36 }); }
};
/** gunfire near (x, y): civilians within 40 units panic */
WP.noise = (sim, x, y) => {
  for (const e of sim.ents) if (WP.TYPES[e.type].kind === 'civ' && !e.wounded && Math.hypot(e.x - x, e.y - y) < 40) { if (!(e.panic > 0)) sim.ev('bark', { id: e.id, kind: 'eek' }); e.panic = 2; }
};

// ---------- hostages ----------
BEH['init:hostage'] = (sim, e, o) => {
  e.beh = 'hostage'; e.hp = e.maxHp = 3; e.offOK = true; e.from = e.from || [e.x, e.y]; e.goal = e.goal || [e.x - 300, e.y];
  e.speed = 46; e.who = o.who === undefined ? sim.hostages.list.length : o.who; e.st = o.wait ? 'wait' : 'run'; e.waitT = o.wait || 0;
  sim.hostages.list.push(e.id);
};
BEH.hostage = (sim, e, dt) => {
  if (e.saved || e.lost) { if (e.saved) { e.pose = 'cheer'; e.vx = e.vy = 0; } if (e.stt > 3) e.gone = true; return; }
  if (e.st === 'wait') { e.pose = 'kneel'; if (e.stt > e.waitT) { e.st = 'run'; e.stt = 0; sim.ev('freedRun', { id: e.id }); sim.radio('hostage.free' + (e.who % 2)); } return; }
  e.pose = null;
  if (e.grabbedBy) {
    e.grabT = (e.grabT || 0) + dt; e.pose = 'kneel';
    const g = sim.byId(e.grabbedBy); if (!g || g.dead) { e.grabbedBy = null; }
    if (e.grabT > 3) { e.lost = true; e.stt = 0; sim.hostages.lost++; sim.ev('hostageLost', { id: e.id, who: e.who, why: 'taken' }); if (g) { g.beh = 'cross'; g.st = 'exit'; Inf.exitNow(sim, g); } }
    return;
  }
  e.grabT = 0;
  const dx = e.goal[0] - e.x, dy = e.goal[1] - e.y, d = Math.hypot(dx, dy);
  if (d < 6) { e.saved = true; e.stt = 0; sim.hostages.saved++; sim.ev('rescued', { id: e.id, who: e.who }); for (const p of sim.livePlayers()) sim.score(p, 5000, { x: e.x, y: e.y, z: 40 }, { raw: true }); return; }
  e.vx = dx / d * e.speed; e.vy = dy / d * e.speed; e.x += e.vx * dt; e.y += e.vy * dt; e.facing = Math.atan2(dy, dx);
};
BEH['shapes:hostage'] = (sim, e, out, V) => {
  if (e.saved || e.lost || e.gone) return;
  const p = V.project(e.x, e.y, e.z); if (!p) return;
  const D = V.depth(e.x, e.y); if (D < 14) return;
  WP.Hit.humanoid(out, e, D, p[0], p[1], WP.Hit.rigH(WP.TYPES.hostage, e) * V.q(p[2]), {});
};
/** damage to a hostage (a player's bullet: penalties; enemy fire: just the HP) */
WP.hostageHit = (sim, e, p, n = 1) => {
  if (e.saved || e.lost) return;
  e.hp -= n; e.hurtT = .3;
  sim.ev('hostageHit', { id: e.id, pid: p ? p.pid : -1, hp: e.hp, x: e.x, y: e.y, z: e.z });
  if (p) { p.civHits++; sim.hurtPlayer(p, 10, { kind: 'hostage' }); p.score = Math.max(0, p.score - 2000); sim.streakReset(p); sim.ev('points', { pid: p.pid, v: -2000, x: e.x, y: e.y, z: e.z + 36 }); }
  if (e.hp <= 0) { e.lost = true; e.stt = 0; e.pose = 'down'; sim.hostages.lost++; sim.ev('hostageLost', { id: e.id, who: e.who, why: 'hurt' }); }
};

// ---------- supply animals ----------
BEH['init:animal'] = (sim, e, o) => {
  const tp = WP.TYPES[e.type]; e.beh = 'animal'; e.offOK = false;
  if (!e.dir) e.dir = sim.view.lateral(e.x, e.y) < 0 ? 1 : -1;
  e.speed = o.speed || (tp.fly ? 55 : e.type === 'chicken' ? 26 : e.type === 'monkey' ? 0 : 22);
  Inf.setMove(sim, e, e.dir, e.speed); e.facing = Math.atan2(e.mvy, e.mvx);
  if (tp.fly && !o.z) e.z = 50 + sim.R.ai() * 30;
  e.baseZ = e.z;
};
BEH.animal = (sim, e, dt) => {
  const tp = WP.TYPES[e.type];
  if (e.bolt) { if (e.type === 'monkey' && e.z > 0) { e.vz -= 300 * dt; e.z = Math.max(0, e.z + e.vz * dt); } Inf.move(e, dt, 3.5); e.facing = Math.atan2(e.mvy, e.mvx); if (tp.fly) e.z += 40 * dt; return; }
  if (e.speed) { Inf.move(e, dt, 1); e.facing = Math.atan2(e.mvy, e.mvx); }
  else e.facing = Inf.towardCam(sim, e);
  if (tp.fly) e.z = e.baseZ + Math.sin(e.t * 2 + e.id) * 6;
  else if (e.type !== 'monkey') e.hop = Math.abs(Math.sin(e.t * (e.type === 'chicken' ? 12 : 7))) * 2;
};
BEH['shapes:animal'] = (sim, e, out, V) => {
  if (e.bolt || e.gone) return;
  const p = V.project(e.x, e.y, e.z); if (!p) return;
  const D = V.depth(e.x, e.y), R = WP.TYPES[e.type].R;
  out.push({ e, part: 'body', D, kind: 'c', cx: p[0], cy: p[1] - R * p[2], r: Math.max(4, R * 1.2 * p[2]) });
};
/** any hit or nearby blast: a squawk, the item dropped, a bolt */
WP.animalHit = (sim, e, p) => {
  if (e.bolt) return;
  e.bolt = true; e.vz = 120; sim.ev('squawk', { id: e.id, type: e.type });
  const lx = sim.view.lateral(e.x, e.y); Inf.setMove(sim, e, lx < 0 ? -1 : 1, Math.max(30, e.speed || 30));
  if (e.carry) { WP.Supply.drop(sim, e.x, e.y, e.z + 8, e.carry, p); e.carry = null; if (sim.stage.n === 1) sim.tip('tip.items'); }
  else if (sim.R.loot() < .08 * sim.dropK) WP.Supply.drop(sim, e.x, e.y, e.z + 8, 'fang', p);
};
})();
