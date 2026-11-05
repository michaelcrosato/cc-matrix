// 05-sim-enemies.js: the Sim's enemy state machine (plan 4.6), the ThreatDirector (plan 4.7: the crisis flash), enemy
// and player projectiles, barrels and breakables, and the floating bonus targets. These are methods on Sim.prototype.
//
// An enemy's states: 'hide' (behind its wall, not targetable) -> 'aim' (stands and takes aim) -> 'fire' (a burst)
// -> 'hide'. A quartermaster runs its route ('flee') and drops ammo when shot. A civilian walks its route.
// Enemy shots become threats: each has a telegraph (the crisis flash) and an impact. At impact, a player who is still
// exposed takes the hit; one in cover blocks it, and the cover saves stat goes up.

TC.Sim.prototype.spawn = function (type, nestId, extra = {}) {
  const def = TC.get('enemy', type);
  const nest = nestId ? this.scene.nests.find(n => n.id === nestId) : null;
  let x, y;
  if (nest) { x = nest.x; y = nest.y; }
  else if (extra.route) { x = extra.route[0][0]; y = extra.route[0][1]; }
  else if (extra.at) { x = extra.at[0]; y = extra.at[1]; }
  else throw new Error('spawn ' + type + ': no place');
  const size = def.rig.size || 1;
  const e = {
    id: this.id(), type, role: def.role, nest: nest ? nest.id : null, x, y, z: 0, size, facing: nest ? Math.PI : 0,
    state: 'hide', timer: this.rng('enemy.hide').range(0.5, 1.4), shotT: 0, burstLeft: 0, hp: TC.enemyHp(def),
    alive: true, dead: false, gone: false, exposed: false, exposedAt: undefined, wave: this.waveIdx, route: extra.route || null,
    routeI: 1, hurtT: 0, deathT: 0, hitHead: false, rig: null, def, wallId: nest ? nest.wall : null,
  };
  if (extra.from) { e.x = extra.from[0]; e.y = extra.from[1]; e.state = 'enter'; e.enterTo = nest ? [nest.x, nest.y] : null; }
  if (extra.entry && nest) {
    // A scripted entry (plan 4.6): a jump or a rappel down onto the nest, a vault over its wall, or a door opening behind it.
    e.entry = extra.entry; e.enterT = 0; e.state = 'enter'; e.enterTo = [nest.x, nest.y];
    if (extra.entry === 'jump') { e.z0 = 70; e.z = 70; }
    if (extra.entry === 'rappel') { e.z0 = 90; e.z = 90; }
    if (extra.entry === 'vault') { e.x = nest.x - 34; e.y = nest.y; }
  }
  if (def.role === 'quartermaster') { e.state = 'flee'; e.exposed = true; e.exposedAt = this.t; }
  if (def.role === 'civilian') { e.state = 'walk'; e.exposed = true; e.exposedAt = this.t; }
  if (def.fly) e.z = def.fly;
  if (def.role === 'mover') { e.state = 'move'; e.exposed = true; e.exposedAt = this.t; e.shotT = def.every * 0.5; e.routeI = 1; e.route = extra.route || [[e.x, e.y]]; }
  if (def.role === 'rusher') { e.state = 'advance'; e.exposed = true; e.exposedAt = this.t; e.timer = 0; }
  e.rig = new E.Humanoid(Object.assign({}, def.rig));
  e.rig.facing = e.facing;
  this.enemies.push(e);
  this.emit('spawn', { id: e.id, etype: type, x, y });
  return e;
};

// Each step: the state machine, the rigs, the death timers.
TC.Sim.prototype.enemiesStep = function (dt) {
  const tu = TC.tune.enemy;
  for (const e of this.enemies) {
    if (e.gone) continue;
    if (!e.alive) {
      e.deathT += dt;
      e.exposed = true;
      if (e.deathT > 2.5 + 0.5) e.gone = true;
      this.enemyRig(e, dt, { down: Math.min(1, e.deathT * 2.2), pose: e.deathT < 0.2 ? 'die' : undefined });
      continue;
    }
    e.hurtT = Math.max(0, e.hurtT - dt);
    if (e.role === 'civilian') { this.civStep(e, dt); this.enemyRig(e, dt, {}); continue; }
    if (e.role === 'quartermaster') { this.quartermasterStep(e, dt); this.enemyRig(e, dt, { run: 1 }); continue; }
    if (e.role === 'mover') { this.moverStep(e, dt); this.enemyRig(e, dt, { facing: e.facing, point: true }); continue; }
    if (e.role === 'rusher') { this.rusherStep(e, dt); this.enemyRig(e, dt, { run: e.state === 'advance' ? 1 : 0, facing: e.facing }); continue; }
    if (e.state === 'enter' && e.entry) {
      this.entryStep(e, dt);
      this.enemyRig(e, dt, { air: e.z > 0.5, facing: e.facing, run: e.entry === 'vault' ? 1 : 0 });
      continue;
    }
    if (e.state === 'enter') {
      const [tx, ty] = e.enterTo || [e.x, e.y];
      const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
      const step = 90 * dt;
      if (d <= step) { e.x = tx; e.y = ty; e.state = 'hide'; e.timer = this.rng('enemy.hide').range(0.4, 1.0); }
      else { e.x += dx / d * step; e.y += dy / d * step; }
      this.enemyRig(e, dt, { run: 1, facing: Math.atan2(dy, dx) });
      continue;
    }
    if (e.state === 'hide') {
      e.exposed = false;
      e.timer -= dt;
      if (e.timer <= 0) {
        e.state = 'aim';
        e.exposed = true;
        e.exposedAt = this.t;
        e.timer = e.def.aim * tu.reactMul * TC.tune.enemy.telegraphMul;
        this.emit('aim', { id: e.id });
      }
      this.enemyRig(e, dt, { pose: 'crouch', facing: e.facing });
      continue;
    }
    if (e.state === 'aim') {
      e.exposed = true;
      e.timer -= dt;
      if (e.timer <= 0) {
        e.state = 'fire';
        const [lo, hi] = e.def.burst;
        e.burstLeft = this.rng('enemy.burst').int(lo, hi);
        e.shotT = 0;
      }
      this.enemyRig(e, dt, { point: true, facing: e.facing });
      continue;
    }
    if (e.state === 'fire') {
      e.exposed = true;
      e.shotT -= dt;
      if (e.shotT <= 0 && e.burstLeft > 0) {
        e.burstLeft--;
        e.shotT = e.def.gap * tu.fireMul;
        if (e.role === 'grenadier') this.lobGrenade(e);
        else this.enemyShot(e);
      }
      if (e.burstLeft <= 0 && e.shotT <= 0) {
        e.state = 'hide';
        e.timer = this.rng('enemy.hide').range(e.def.hide[0], e.def.hide[1]);
        e.exposed = false;
      }
      this.enemyRig(e, dt, { point: true, facing: e.facing });
      continue;
    }
  }
  this.enemies = this.enemies.filter(e => !e.gone);
};

// One scripted entry, in its own time: the drop and the rappel fall to the ground, the vault arcs over the wall, and
// the door keeps the enemy out of sight until it steps out.
TC.Sim.prototype.entryStep = function (e, dt) {
  e.enterT += dt;
  const span = e.entry === 'door' ? 0.8 : 0.7;
  const u = Math.min(1, e.enterT / span);
  if (e.entry === 'jump' || e.entry === 'rappel') e.z = e.z0 * (1 - u) * (1 - u);
  else if (e.entry === 'vault') { e.x = TC.lerp(e.enterTo[0] - 34, e.enterTo[0], u); e.z = 18 * Math.sin(Math.PI * u); }
  else e.z = 0;
  e.facing = Math.PI;
  if (u >= 1) {
    e.z = 0; e.x = e.enterTo[0]; e.y = e.enterTo[1];
    e.state = 'hide'; e.timer = this.rng('enemy.hide').range(0.4, 1.0); e.exposed = false;
  }
};

TC.Sim.prototype.enemyRig = function (e, dt, s) {
  const r = e.rig;
  if (!r) return;
  r.update(dt, Object.assign({ x: e.x, y: e.y, z: e.z, facing: e.facing, hurt: e.hurtT > 0 ? 1 : undefined }, s));
};

// A quartermaster runs its route, out of the fight, and is gone at the end of it.
TC.Sim.prototype.quartermasterStep = function (e, dt) {
  const r = e.route;
  if (!r || e.routeI >= r.length) { e.gone = true; this.emit('escaped', { id: e.id }); return; }
  const [tx, ty] = r[e.routeI];
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
  const step = 55 * dt;
  if (d <= step) { e.x = tx; e.y = ty; e.routeI++; }
  else { e.x += dx / d * step; e.y += dy / d * step; e.facing = Math.atan2(dy, dx); }
};

// Civilians walk their route back and forth.
TC.Sim.prototype.civStep = function (e, dt) {
  const r = e.route;
  if (!r || r.length < 2) return;
  const [tx, ty] = r[e.routeI % r.length];
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
  const step = 22 * dt;
  if (d <= step) { e.x = tx; e.y = ty; e.routeI = (e.routeI + 1) % r.length; }
  else { e.x += dx / d * step; e.y += dy / d * step; e.facing = Math.atan2(dy, dx); }
};

// Choose which player an enemy shoots at: the alive player whose cover is weakest, else the nearest alive one.
TC.Sim.prototype.pickTarget = function (e) {
  const alive = this.players.filter(p => !p.out);
  if (!alive.length) return null;
  const rs = this.rng('enemy.target');
  let best = alive[0];
  for (const p of alive) {
    if (p.c > best.c + 0.001) best = p;
  }
  if (alive.length > 1 && rs() < 0.35) best = alive[Math.floor(rs() * alive.length)];
  return best;
};

// The muzzle of an enemy: its hand, at about the chest height.
TC.Sim.prototype.muzzleOf = function (e) {
  const s = e.size || 1;
  return [e.x + Math.cos(e.facing) * 6 * s, e.y + Math.sin(e.facing) * 6 * s, (e.z || 0) + 19 * s];
};

// The rail ride (a carrier, plan 4.2): once an area's waves are all spawned and the field is clear, the rail carries the
// camera forward to the ride's end. The player's cover walls for this area travel with it, and the area ends at the end.
TC.Sim.prototype.placeSlots = function () {
  for (const b of this.world.boxes) {
    if (b.slot === undefined || b.scene !== this.sceneIdx) continue;
    b.b = [this.base + 12, b.yc - 12, 0, this.base + 16, b.yc + 12, 16];
  }
};

TC.Sim.prototype.rideStep = function (dt) {
  const r = this.ride;
  if (!r || r.done) return;
  const alive = this.enemies.filter(e => e.alive && e.role !== 'civilian').length;
  if (!r.started) {
    if (alive > 0 || !this.waveQueue.every(w => w.spawned)) return;
    r.started = true;
    this.emit('ride', { to: r.to });
  }
  const step = r.speed * dt;
  this.base = Math.min(r.to, this.base + step);
  for (const p of this.players) p.x = this.base;
  this.placeSlots();
  if (this.base >= r.to) { r.done = true; this.emit('rideEnd', {}); }
};

// A mover runs its route (a drone over the harbour, a jet-ski on the water) and fires every `every` seconds.
TC.Sim.prototype.moverStep = function (e, dt) {
  const r = e.route;
  const [tx, ty] = r[e.routeI % r.length];
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
  const step = e.def.speed * dt;
  if (d <= step) { e.x = tx; e.y = ty; e.routeI = (e.routeI + 1) % r.length; }
  else { e.x += dx / d * step; e.y += dy / d * step; e.facing = Math.atan2(dy, dx); }
  e.shotT -= dt;
  if (e.shotT <= 0) { e.shotT = e.def.every * TC.tune.enemy.fireMul; this.enemyShot(e); }
};

// A rusher sprints at the nearest player, slashes at close range, and staggers back to run in again.
TC.Sim.prototype.rusherStep = function (e, dt) {
  const alive = this.players.filter(p => !p.out);
  if (!alive.length) return;
  const p = alive.reduce((a, b) => (Math.abs(b.x - e.x) < Math.abs(a.x - e.x) ? b : a));
  const tx = p.x + 40, ty = p.slotY;
  e.timer -= dt;
  if (e.state === 'advance') {
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
    if (d < 36) {
      e.state = 'slash'; e.timer = e.def.tele * TC.tune.enemy.telegraphMul;
      e.exposed = true;
      this.addThreat({ src: e.id, target: p.id, muzzle: this.muzzleOf(e), tele: e.timer, kind: 'slash', pr: null });
    } else { e.x += dx / d * 110 * dt; e.y += dy / d * 110 * dt; e.facing = Math.atan2(dy, dx); }
  } else if (e.state === 'slash' && e.timer <= 0) {
    e.state = 'back'; e.timer = 1.2;
  } else if (e.state === 'back') {
    e.x -= 80 * dt;
    if (e.timer <= 0) { e.state = 'advance'; }
  }
};

// A rifle shot: a threat, or a miss (a tracer that passes near the player and never through the reticle).
TC.Sim.prototype.enemyShot = function (e) {
  const p = this.pickTarget(e);
  if (!p) return;
  const def = e.def;
  const muzzle = this.muzzleOf(e);
  const tele = def.tele * TC.tune.enemy.telegraphMul;
  const threat = def.threat === 'always' || this.rollThreat(p, tele);
  if (threat) {
    this.addThreat({ src: e.id, target: p.id, muzzle, tele, kind: def.kind || (def.elite ? 'sniper' : 'shot'), pr: null });
  } else {
    const c = this.camFor(p);
    const rs = this.rng('miss');
    const a = rs() * Math.PI * 2, r = 8 + rs() * 22;
    const to = [c.x + 2, c.y + Math.cos(a) * r, c.z + Math.sin(a) * r * 0.6];
    this.emit('miss-shot', { src: e.id, target: p.id, from: muzzle, to, t0: this.t });
  }
};

// The ThreatDirector's decision (plan 4.7): a chance per shot scaled by the dev slider and difficulty, a cap on the
// threats a player may have at once, and the minimum gap between one player's impacts.
TC.Sim.prototype.rollThreat = function (p, tele) {
  const cap = Math.max(1, TC.tune.enemy.maxThreats + (this.stageId >= 2 ? 1 : 0) + this.diff.threats);
  const active = this.threats.filter(t => !t.resolved && t.target === p.id).length;
  if (active >= cap) return false;
  const impactAt = this.t + tele;
  const last = this.lastImpact ? this.lastImpact[p.id] : -Infinity;
  if (impactAt - last < TC.tune.enemy.minGap) return false;
  const chance = 0.45 * TC.tune.enemy.threatMul * this.diff.threat;
  return this.rng('threat.roll').chance(chance);
};

// Add a threat: it telegraphs now (the crisis flash) and lands at impactAt.
TC.Sim.prototype.addThreat = function (spec) {
  const tele = spec.tele;
  const th = {
    id: this.id(), src: spec.src, target: spec.target, muzzle: spec.muzzle, t0: this.t, tele,
    impactAt: this.t + tele, kind: spec.kind, resolved: false, pr: spec.pr || null,
  };
  if (!this.lastImpact) this.lastImpact = {};
  this.lastImpact[spec.target] = th.impactAt;
  this.threats.push(th);
  this.emit('threat', { id: th.id, src: th.src, target: th.target, muzzle: th.muzzle, t0: th.t0, dur: tele, kind: th.kind });
  return th;
};

// Impacts resolve (plan 4.7): exposed and not invulnerable is a hit; otherwise the cover blocks it.
TC.Sim.prototype.threatsStep = function (dt) {
  for (const th of this.threats) {
    if (th.resolved || this.t < th.impactAt) continue;
    th.resolved = true;
    const p = this.players[th.target];
    if (!p || p.out) { this.emit('impactVoid', { id: th.id }); continue; }
    const exposed = p.c < 0.5;
    if (exposed && p.invul <= 0 && !this.cheats.god && !TC.tune.player.godMode) {
      this.emit('threatHit', { id: th.id, player: p.id, kind: th.kind });
      this.loseLife(p, th.kind, false);
    } else {
      p.stats.saves++;
      this.emit('blocked', { id: th.id, player: p.id, kind: th.kind });
    }
  }
  this.threats = this.threats.filter(t => !t.resolved || t.blown);
};

// Grenadiers lob a grenade to land in front of the target's cover (1.1 to 1.4 s).
TC.Sim.prototype.lobGrenade = function (e) {
  const p = this.pickTarget(e);
  if (!p) return;
  const rs = this.rng('grenade');
  const from = this.muzzleOf(e);
  const flight = 1.1 + rs() * 0.3;
  const to = [this.base - 4 + rs() * 6, p.slotY + (rs() - 0.5) * 20, 0];
  const pr = { id: this.id(), kind: 'grenade', from, to, flight, t0: this.t, x: from[0], y: from[1], z: from[2], r: 6, gone: false };
  this.projectiles.push(pr);
  this.addThreat({ src: e.id, target: p.id, muzzle: from, tele: flight, kind: 'grenade', pr });
  this.emit('lob', { id: pr.id, from, to, flight });
};

// Sim projectiles: enemy grenades on their arc (shootable: a shot explodes them in the air) and the player's GL rounds.
TC.Sim.prototype.projectilesStep = function (dt) {
  for (const pr of this.projectiles) {
    if (pr.gone) continue;
    if (pr.kind === 'grenade') {
      const u = TC.clamp((this.t - pr.t0) / pr.flight, 0, 1);
      pr.x = TC.lerp(pr.from[0], pr.to[0], u);
      pr.y = TC.lerp(pr.from[1], pr.to[1], u);
      pr.z = TC.lerp(pr.from[2], pr.to[2], u) + Math.sin(Math.PI * u) * 40;
      if (u >= 1) pr.gone = true;
    } else if (pr.kind === 'gl') {
      pr.vz -= 240 * dt;
      pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.z += pr.vz * dt;
      pr.life -= dt;
      let hit = pr.life <= 0 || pr.z <= 0;
      if (!hit) for (const e of this.enemies) if (e.alive && e.exposed && Math.hypot(e.x - pr.x, e.y - pr.y) < 6 && pr.z < 28 * (e.size || 1)) { hit = true; break; }
      if (!hit) for (const b of this.world.boxes) if (b.solid && pr.x >= b.b[0] && pr.x <= b.b[3] && pr.y >= b.b[1] && pr.y <= b.b[4] && pr.z >= b.b[2] && pr.z <= b.b[5]) { hit = true; break; }
      if (hit) {
        pr.gone = true;
        const owner = this.players[pr.owner];
        this.explode(pr.x, pr.y, Math.max(0, pr.z), TC.tune.weapon.glRadius, TC.tune.weapon.glDmg, owner);
      }
    }
  }
  this.projectiles = this.projectiles.filter(p => !p.gone);
};

// The player's GL round: a ballistic arc from the muzzle along the aim.
TC.Sim.prototype.launchGrenade = function (p, w) {
  const cam = this.camFor(p);
  const d = this.aimDirs(p, 1, 0)[0];
  const sp = w.speed;
  const pr = { id: this.id(), kind: 'gl', owner: p.id, x: cam.x + d[0] * 6, y: cam.y + d[1] * 6, z: cam.z + d[2] * 6,
    vx: d[0] * sp, vy: d[1] * sp, vz: d[2] * sp, life: w.life, r: 3, gone: false, noShoot: true };
  this.projectiles.push(pr);
  this.emit('glFire', { id: pr.id, player: p.id, from: [pr.x, pr.y, pr.z] });
};

// Area damage: enemies in a radius lose hp by distance (falloff from the centre to the edge).
TC.Sim.prototype.explode = function (x, y, z, rad, dmg, owner) {
  this.emit('explode', { at: [x, y, z], rad });
  for (const e of this.enemies) {
    if (!e.alive || e.role === 'civilian') continue;
    const d = Math.hypot(e.x - x, e.y - y, (e.z + 14) - z);
    if (d > rad) continue;
    const f = 1 - 0.75 * (d / rad);
    e.hp -= dmg * f;
    e.hurtT = 0.25;
    if (e.hp <= 0 && owner) this.killEnemy(e, owner, false, [e.x, e.y, 14], null, null);
    else if (e.hp <= 0) { e.alive = false; e.dead = true; e.deathT = 0; }
  }
  for (const b of this.world.barrels || []) {
    if (b.gone || b.fuse) continue;
    const d = Math.hypot(b.x - x, b.y - y, b.z - z);
    if (d <= rad) b.fuse = 0.15;
  }
};

// A barrel: two shots (or one blast) and it goes; neighbours inside its radius go on a short fuse.
TC.Sim.prototype.detonateBarrel = function (b, p) {
  b.hp -= 1;
  if (b.hp > 0) { this.emit('impact', { at: [b.x, b.y, b.z], surface: 'metal', player: p.id }); return; }
  b.gone = true;
  this.explode(b.x, b.y, b.z, 56, 8, p);
  this.emit('barrel', { at: [b.x, b.y, b.z] });
};

// Pickups and fuses (barrel chains) each step.
TC.Sim.prototype.pickupsStep = function (dt) {
  for (const b of this.world.barrels || []) {
    if (b.gone || b.fuse === undefined) continue;
    b.fuse -= dt;
    if (b.fuse <= 0) { b.fuse = undefined; b.gone = true; this.explode(b.x, b.y, b.z, 56, 8, null); this.emit('barrel', { at: [b.x, b.y, b.z] }); }
  }
  for (const q of this.bonus) if (!q.gone) q.bob = (q.bob || 0) + dt;
  this.bonus = this.bonus.filter(q => !q.gone);
};

// The floating bonus targets of an area: life rings and intel bottles, shootable (plan 4.8).
TC.Sim.prototype.placeBonus = function () {
  for (const b of this.scene.bonus || []) {
    this.bonus.push({ id: this.id(), kind: b.kind, x: b.at[0], y: b.at[1], z: b.at[2], r: 6, intel: b.intel || null, gone: false });
  }
};

// Breakable boxes (crates) and barrels: the world's boxes carry hp; a crate that breaks drops out of the world.
TC.Sim.prototype.breakBox = function (box, at, p) {
  box.gone = true;
  box.solid = false;
  this.emit('break', { at, mat: box.mat, player: p.id });
  this.addScore(p, 50, at);
};
