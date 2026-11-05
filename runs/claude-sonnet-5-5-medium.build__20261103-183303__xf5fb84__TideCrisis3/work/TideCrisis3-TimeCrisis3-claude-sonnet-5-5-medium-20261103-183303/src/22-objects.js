// 22-objects.js — projectiles (grenades, rockets, torpedoes, flares, the player's GL rounds), breakables,
// explosive barrels, pickups (life rings, intel bottles), gate locks and civilians. Owns: sim.proj, sim.objs.
const OBJ = {
  crate: { rx: 8, ry: 8, h: 14, hp: 3, solid: 1, mat: 'crate', pts: 50 }, barrel: { rx: 5, ry: 5, h: 14, hp: 2, solid: 1, mat: 'barrel', pts: 50, boom: 56, dmg: 8 },
  tank: { rx: 9, ry: 9, h: 22, hp: 3, solid: 1, mat: 'rust', pts: 50, boom: 64, dmg: 8 }, lantern: { rx: 3, ry: 3, h: 7, hp: 1, mat: 'lantern', pts: 50 }, bottle: { rx: 2.5, ry: 2.5, h: 9, hp: 1, mat: 'neon_g', pts: 50 },
  window: { rx: 1, ry: 9, h: 14, hp: 1, mat: 'glass', pts: 50 }, sign: { rx: 2, ry: 12, h: 8, hp: 2, mat: 'white', pts: 50 }, lifering: { rx: 5, ry: 5, h: 10, hp: 1, mat: 'white', pts: 2000, ring: 1 },
  intel: { rx: 3, ry: 3, h: 10, hp: 1, mat: 'neon_g', pts: 2000, intel: 1 }, lock: { rx: 7, ry: 7, h: 14, hp: 6, mat: 'neon_y', pts: 2000, lock: 1 }, lever: { rx: 4, ry: 4, h: 14, hp: 1, mat: 'hazard', pts: 0 },
  section: { rx: 12, ry: 16, h: 20, hp: 3, solid: 1, mat: 'wood_d', pts: 50 }
};
Object.assign(Sim.prototype, {
  addObj(spec) {
    const kind = spec[0], t = OBJ[kind]; if (!t) throw new Error('no object ' + kind); const o = spec[4] || {};
    const ob = Object.assign({ id: this.nextId++, kind, x: spec[1], y: spec[2], z: spec[3] || 0, hpMax: t.hp, dead: false, flash: 0 }, t, o); ob.hp = o.hp || t.hp; this.objs.push(ob); return ob;
  },
  addCiv(c) { (this.civQ = this.civQ && this.sceneId === this.civScene ? this.civQ : []).push({ at: c.at || 0, spec: c, done: false }); this.civScene = this.sceneId; },
  hitObj(p, ob, dmg, pos, fromBlast) {
    if (ob.dead) return false;
    ob.hp -= dmg; ob.flash = .1; this.emit('objhit', { id: ob.id, pos, kind: ob.kind });
    if (ob.hp > 0) return true;
    ob.dead = true; this.addScore(p, ob.pts || 0, true); p.chain++; p.st.hits++;
    this.emit('break', { id: ob.id, idx: this.objs.indexOf(ob), kind: ob.kind, pos: [ob.x, ob.y, ob.z + ob.h / 2], mat: ob.mat });
    if (ob.ring) { p.lives++; this.emit('oneup', { p: p.id }); }
    if (ob.intel) { this.emit('intel', { id: ob.intelId || ob.id, p: p.id }); p.st.bonus++; }
    if (ob.lock) { this.flags['lock' + ob.lockN] = 1; this.flags.locks = (this.flags.locks || 0) + 1; this.emit('lockjam', { n: this.flags.locks }); }
    if (ob.lever) { this.flags.lever = 1; }
    if (ob.boom) { this.boomAt = this.boomAt || []; this.boomAt.push({ t: this.t + .15, ob, p }); }
    if (ob.fall) { for (const e of this.enemies) if (!e.dead && e.entryKind !== 'run' && e.bz > 10 && Math.hypot(e.x - ob.x, e.y - ob.y) < (ob.fallR || 60)) this.killEnemy(e, p, 3, null, 'torso'); this.emit('collapse', { pos: [ob.x, ob.y, ob.z] }); }
    if (ob.onBreak) ob.onBreak(this, ob, p);
    return true;
  },
  stepObjs(dt) {
    for (const o of this.objs) o.flash = Math.max(0, o.flash - dt);
    if (this.boomAt && this.boomAt.length) {
      for (let i = this.boomAt.length - 1; i >= 0; i--) { const b = this.boomAt[i]; if (this.t >= b.t) { this.boomAt.splice(i, 1); this.explode(b.ob.x, b.ob.y, b.ob.z + b.ob.h / 2, b.ob.boom, 'p', b.p.id, b.ob.dmg, false); } }
    }
    if (this.civQ) for (const c of this.civQ) { if (!c.done && (this.phase === 'action' || this.phase === 'boss') && this.actionT >= c.at) { c.done = true; const s = c.spec; const e = this.spawnEnemy(s.kind || 'civilian', null, { route: s.route, dur: s.dur, speed: s.speed || 45 }); e.panic = 1; e.civ = true; } }
  },
  spawnProj(o) { const pr = Object.assign({ id: this.nextId++, team: 'e', hp: 1, r: 5, g: 0 }, o); this.proj.push(pr); return pr; },
  stepProjectiles(dt) {
    for (const pr of this.proj) {
      if (pr.dead) continue;
      if (pr.team === 'p') { this.stepPlayerRound(pr, dt); continue; }
      pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.z += pr.vz * dt; pr.vz -= (pr.g || 0) * dt; pr.age = (pr.age || 0) + dt;
      if (pr.th && !this.threats.includes(pr.th)) { pr.dead = true; this.emit('explode', { pos: [pr.x, pr.y, Math.max(2, pr.z)], r: pr.kind === 'rocket' ? 30 : 36, big: false }); this.emit('landed_proj', { kind: pr.kind }); }
      if (pr.kind === 'flare' || pr.kind === 'torpedo' || pr.kind === 'missile' || pr.kind === 'harpoon') { if (pr.th && !this.threats.includes(pr.th)) pr.dead = true; }
    }
    this.proj = this.proj.filter(p => !p.dead || (p.team === 'p' ? false : p.deadT = (p.deadT || 0) + dt < .02 ? true : false));
  },
  stepPlayerRound(pr, dt) {
    pr.life -= dt; const steps = 3, sdt = dt / steps;
    for (let s = 0; s < steps && !pr.dead; s++) {
      pr.x += pr.vx * sdt; pr.y += pr.vy * sdt; pr.z += pr.vz * sdt; pr.vz -= pr.g * sdt;
      let boom = pr.life <= 0 || pr.z <= 0;
      if (!boom) for (const e of this.enemies) { if (e.dead || e.gone) continue; for (const v of this.volumes(e)) { if (v.k === 's' && Math.hypot(pr.x - v.c[0], pr.y - v.c[1], pr.z - v.c[2]) < v.r + 3) boom = true; else if (v.k === 'c' && R3.raySphere([pr.x, pr.y, pr.z], [1, 0, 0], [(v.a[0]), v.a[1], (v.a[2] + v.b[2]) / 2], v.r + 3) < 1) boom = true; else if (v.k === 'box' && pr.x > v.box.x0 - 2 && pr.x < v.box.x1 + 2 && pr.y > v.box.y0 - 2 && pr.y < v.box.y1 + 2 && pr.z > v.box.z0 - 2 && pr.z < v.box.z1 + 2) boom = true; } }
      if (!boom) for (const b of this.colliders(pr.owner)) if (pr.x > b.x0 && pr.x < b.x1 && pr.y > b.y0 && pr.y < b.y1 && pr.z > b.z0 && pr.z < b.z1 && !(b.cover)) boom = true;
      if (!boom && this.boss) for (const v of this.bossVolumes()) { if (v.dead) continue; if (v.k === 's' ? Math.hypot(pr.x - v.c[0], pr.y - v.c[1], pr.z - v.c[2]) < v.r + 3 : (pr.x > v.box.x0 && pr.x < v.box.x1 && pr.y > v.box.y0 && pr.y < v.box.y1 && pr.z > v.box.z0 && pr.z < v.box.z1)) boom = true; }
      if (!boom) for (const q of this.proj) if (q.team !== 'p' && !q.dead && Math.hypot(pr.x - q.x, pr.y - q.y, pr.z - q.z) < (q.r || 5) + 3) { boom = true; this.shootDown(this.players[pr.owner], q, 99); }
      if (!boom) for (const ob of this.objs) if (!ob.dead && !ob.passive && pr.x > ob.x - ob.rx && pr.x < ob.x + ob.rx && pr.y > ob.y - ob.ry && pr.y < ob.y + ob.ry && pr.z > ob.z && pr.z < ob.z + ob.h) boom = true;
      if (boom) { pr.dead = true; this.explode(pr.x, pr.y, Math.max(1, pr.z), tune.weapon.glRadius, 'p', pr.owner, tune.weapon.glDmg, false); this.players[pr.owner].st.hits += 0; }
    }
  }
});
