// Crowd AI: a plain state machine per enemy. Slow enemies, few attackers at a time, always one more behind you.
import { HERO_RAGDOLL, Ragdoll, RAPIER, setLookLayer, THREE } from '../../pixel-engine.js';
import { TUNING } from '../data/tuning.js';
import { ENEMIES, ISLANDER_BARKS } from '../data/enemies.js';
import { diff } from '../core/run.js';
import { Humanoid, buildProp } from './actor.js';
import { ZONE_MULT } from './combat.js';
import { bark } from '../audio/voice.js';
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), dirOut = [0, 0];
const WEAPON_PROP = { gaff: 'w-gaff', boathook: 'w-boathook', saw: 'w-saw', flail: 'w-flail', halberd: 'w-halberd' };
const STATE_CLIP = { WORK: 'WorkChop', ALERT: 'Shout', WINDUP: 'RaiseTool', ATTACK: 'Swing', RECOVER: 'Idle', STUN: 'StunHands', KNEEL: 'KneelHit', FLINCH: 'HitReact', KNOCKDOWN: 'KnockedDown', GETUP: 'GetUp', GRAB: 'Grapple', VAULT: 'ClimbIn', CLIMB: 'LadderUp', BASH: 'BashDoor', RISE: 'DrownedRise', PIN: 'HitReact', BLIND: 'StunHands', THROW: 'ThrowOverhand', CIRCLE: null, APPROACH: null, SEA: 'WalkToSea', CARRY: 'CarrierWalk', SINK: 'Wade' };
let NEXT = 1;
export class Enemy {
  constructor(area, type, x, z, o = {}) {
    this.area = area; this.type = type; this.def = ENEMIES[type]; this.id = NEXT++; const d = this.def, R = area.rng;
    const rankHp = 1;
    this.hp = this.maxHp = d.hp * TUNING.enemyHp * rankHp * (o.hpMul ?? 1); this.state = 'IDLE'; this.t = 0; this.yaw = o.yaw ?? R.range(-3, 3); this.floor = o.floor ?? 0; this.pos = new THREE.Vector3(x, this.floor * area.floorH, z); this.prev = this.pos.clone(); this.speed = R.range(d.speed[0], d.speed[1]); this.crawler = !!d.crawler; this.fixed_ = !!d.fixed;
    this.legDmg = 0; this.token = false; this.cool = R.range(0.5, 2); this.helmet = d.helmet ?? 0; this.hasShield = !!d.shield; this.holding = d.throws === 'bottle'; this.sawing = false; this.dead = false; this.alerted = false; this.path = null; this.pathT = 0; this.circleDir = R.chance(0.5) ? 1 : -1; this.lastHit = -9; this.bleed = 0; this.dropped = false; this.scale = o.scale ?? 1;
    if (this.crawler) {
      const b = buildProp(d.model); this.root = b.object; setLookLayer(this.root, 'actors'); area.ctx.scene.add(this.root); this.h = null;
      this.zones = { head: this.pos.clone(), headR: 0.34 };
    } else {
      const model = o.model ?? (d.variants ? R.pick(d.variants) : d.model); this.h = new Humanoid(area.ctx, model, { scale: this.scale }); this.root = this.h.root;
      if (d.weapon) this.h.attach('HandR', WEAPON_PROP[d.weapon], { as: 'weapon' });
      if (d.shield) this.h.attach('ForearmL', 'w-shield', { as: 'shield', at: [0.12, -0.15, 0.06], rot: [0, 0, 0] });
      if (d.throws === 'bottle') this.h.attach('HandR', 'w-bottle', { as: 'bottle', rot: [0, 0, 0], at: [0, -0.12, 0] });
      if (d.helmet) this.h.attach('Head', 'w-helmet', { as: 'helmet', at: [0, 0, 0], rot: [0, 0, 0] });
      this.zones = { head: new THREE.Vector3(), headR: 0.2 * this.scale, pelvis: new THREE.Vector3(), neck: new THREE.Vector3(), torsoR: 0.22 * this.scale, armRa: new THREE.Vector3(), armRb: new THREE.Vector3(), armLa: new THREE.Vector3(), armLb: new THREE.Vector3(), armR: 0.09 * this.scale, legRa: new THREE.Vector3(), legRb: new THREE.Vector3(), legLa: new THREE.Vector3(), legLb: new THREE.Vector3(), legR: 0.11 * this.scale };
    }
    this.makeBody();
    this.perch = !!o.perch; if (this.perch) { this.pos.y = 1; this.prev.y = 1; }
    this.setState(o.state ?? (o.work ? 'WORK' : 'APPROACH')); if (o.workClip) this.workClip = o.workClip;
    if (o.alerted !== false && !o.work) this.alerted = true;
    if (d.saw) { this.sawVoice = area.ctx.audio.loop('sawloop', { volume: 0 }); }
    this.place(); this.syncZones();
    area.ctx.engine.game === area; // no-op guard: the area owns enemies
  }
  makeBody() {
    const P = this.area.ctx.physics, RB = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(this.pos.x, this.pos.y + 0.85, this.pos.z);
    this.body = P.world.createRigidBody(RB);
    const c = P.world.createCollider(this.crawler ? RAPIER.ColliderDesc.ball(0.2) : RAPIER.ColliderDesc.capsule(0.55 * Math.max(1, this.scale * 0.8), 0.28 * this.scale), this.body); P.tag(c, 'noCamera', 'enemy'); this.collider = c;
  }
  removeBody() { if (this.body) { this.area.ctx.physics.remove(this.body); this.body = null; } }
  setState(s, t = 0) { if (this.token && !['WINDUP', 'ATTACK'].includes(s)) this.area.releaseToken(this); this.state = s; this.t = t; this.anim = null; this.hitDone = false; }
  get target() { return this.area.nearestPlayer(this.pos); }
  alert(shout = true) { if (this.alerted) return; this.alerted = true; if (shout && !this.crawler) { this.setState('ALERT', 0.5); this.say(); } else this.setState('APPROACH'); }
  say() { const A = this.area; if (A.silent || A.quietBarks > 2) return; const txt = A.rng.pick(ISLANDER_BARKS); A.subBark(this, txt); const s = A.spatial(this.pos); if (s.gain > 0.03 && !this.def.heavy) bark(A.ctx.audio, this.type === 'monk' ? 'MONK' : 'ISLANDER', txt, { volume: s.gain, pan: s.pan }, A.app.settings.voice); }
  fixed(dt) {
    if (this.dead && this.state !== 'SINK') return;
    this.prev.copy(this.pos); this.t -= dt; this.cool -= dt; const A = this.area;
    if (A.frozenAI) return;
    if (this.bleed > 0) { this.bleed -= dt; this.damage(15 * dt, 'torso', { dot: true }); if (this.dead) return; }
    const fn = this[`s_${this.state}`]; if (fn) fn.call(this, dt);
    this.place();
  }
  // ----- states
  s_IDLE() { this.setState('APPROACH'); }
  s_WORK() { if (this.area.calm) return; const T = this.target; if (!T) return; const d = this.distTo(T); if (d < 9 && this.area.los(this.pos, T.pos, this.floor) || d < 3) this.area.alertAround(this.pos, 15, this); }
  s_ALERT() { const T = this.target; if (T) this.face(T.pos, 0.2); if (this.t <= 0) this.setState('APPROACH'); }
  s_APPROACH(dt) {
    const A = this.area, T = this.target; if (!T) return;
    if (this.crawler) return this.crawl(dt, T);
    if (this.perch) { this.face(T.pos, 0.1); const dp = this.distTo(T); if (this.def.throws && this.cool <= 0 && dp < 15 && A.requestThrow(this)) this.setState('THROW', this.def.windup * TUNING.windup); return; }
    if (this.def.targetDame && A.dame && !A.dame.hidden && !A.dame.carried && A.dame.active) return this.carrierApproach(dt);
    const d = this.distTo(T), sameFloor = T.floor === this.floor;
    if (sameFloor && d < 16 && this.def.throws && this.cool <= 0 && d < this.def.range && d > 3 && A.los(this.pos, T.pos, this.floor) && A.requestThrow(this)) { this.setState('THROW', this.def.windup * TUNING.windup + this.rankWindup()); return; }
    if (sameFloor && d < this.def.reach + 0.35 && !this.def.throws) { if (this.cool <= 0 && A.requestToken(this)) { this.beginWindup(T); return; } this.setState('CIRCLE', A.rng.range(0.8, 1.8)); return; }
    if (sameFloor && d < 3.6 && !A.hasToken() && !this.def.saw) { this.setState('CIRCLE', A.rng.range(0.8, 1.8)); return; }
    if (this.def.saw && !this.lungeT && d < 8 && d > 3.5 && sameFloor && this.cool <= 0 && A.los(this.pos, T.pos, this.floor)) { this.lungeT = 0.9; this.cool = 4; }
    let sp = this.moveSpeed(); if (this.lungeT > 0) { this.lungeT -= dt; sp = 5 * TUNING.enemySpeed; if (this.lungeT <= 0) this.lungeT = 0; }
    this.flowMove(dt, sp, T);
  }
  s_CIRCLE(dt) {
    const A = this.area, T = this.target; if (!T) return; const d = this.distTo(T);
    if (this.cool <= 0 && d < this.def.reach + 0.35 && A.requestToken(this)) { this.beginWindup(T); return; }
    if (this.t <= 0) { this.setState('APPROACH'); return; }
    this.face(T.pos, 0.2); const dx = T.pos.x - this.pos.x, dz = T.pos.z - this.pos.z, L = Math.hypot(dx, dz) || 1; const hold = d < 2.4 ? -0.6 : d > 4.2 ? 0.6 : 0;
    this.step(dt, (dx / L) * hold + (-dz / L) * this.circleDir * 0.7, (dz / L) * hold + (dx / L) * this.circleDir * 0.7, this.moveSpeed() * 0.6);
  }
  rankWindup() { return (2 - this.area.rank()) * 0.05; }
  beginWindup(T) { this.setState('WINDUP', this.def.windup * TUNING.windup + this.rankWindup()); this.face(T.pos, 1); this.grabTry = this.def.grab && this.area.rng.chance(this.def.grab); if (this.def.saw) this.area.ctx.audio.play('sawswing', this.area.spatialPlay(this.pos)); else this.say(); if (this.def.saw && this.distTo(T) < 3.5 && T.startSawDodge) T.startSawDodge(this); }
  s_WINDUP() { const T = this.target; if (T) this.face(T.pos, 0.14); if (this.t <= 0) this.setState('ATTACK', 0.35); }
  s_ATTACK() {
    if (!this.hitDone && this.t < 0.22) {
      this.hitDone = true; const A = this.area, tgt = A.meleeTarget(this); A.ctx.audio.play('kickwhoosh', A.spatialPlay(this.pos));
      if (tgt) {
        if (this.grabTry && tgt.grabbedBy && tgt.grabbedBy(this)) { this.setState('GRAB', 8); return; }
        if (this.def.dmg) tgt.hurt(this.def.dmg * (this.def.saw ? 1 : 1), this.pos, { by: this, saw: this.def.saw });
      }
    }
    if (this.t <= 0) { this.cool = this.area.rng.range(1, 2.2); this.area.releaseToken(this); this.setState('RECOVER', 0.45); }
  }
  s_RECOVER() { if (this.t <= 0) this.setState('APPROACH'); }
  s_THROW() {
    const T = this.target; if (T) this.face(T.pos, 0.12);
    if (this.t <= 0.0) { if (T && !this.hitDone) { this.hitDone = true; this.area.spawnThrow(this, T); } this.area.releaseThrow(this); this.cool = this.area.rng.range(3, 5.5); this.setState('RECOVER', 0.5); }
  }
  s_STUN() { this.dropCarried(); if (this.t <= 0) this.setState('APPROACH'); }
  s_KNEEL() { this.dropCarried(); if (this.t <= 0) this.setState('GETUP', 0.7); }
  s_FLINCH() { if (this.t <= 0) this.setState('APPROACH'); }
  s_PIN() { if (this.t <= 0) this.setState('APPROACH'); }
  s_BLIND() { this.dropCarried(); if (this.t <= 0) this.setState('APPROACH'); }
  s_KNOCKDOWN() { this.dropCarried(); if (this.t <= 0) this.setState('GETUP', 0.7); }
  s_GETUP() { if (this.t <= 0) this.setState('APPROACH'); }
  s_GRAB() { const T = this.area.grabTargetOf(this); if (!T) { this.setState('RECOVER', 0.4); return; } this.face(T.pos, 0.3); }
  s_BASH(dt) {
    const door = this.door; if (!door || door.open) { this.setState('APPROACH'); return; }
    door.hp -= dt; this.bashSfx = (this.bashSfx ?? 0) - dt; if (this.bashSfx <= 0) { this.bashSfx = 0.8; this.area.ctx.audio.play('doorkick', this.area.spatialPlay(this.pos, 0.5)); door.shake?.(); }
    if (door.hp <= 0) { this.area.level.breakDoor(door, this); this.setState('APPROACH'); }
  }
  s_VAULT(dt) {
    const v = this.vault, k = 1 - Math.max(0, this.t) / 0.9; if (!v) { this.setState('APPROACH'); return; }
    this.pos.x = v.fx + (v.tx - v.fx) * k; this.pos.z = v.fz + (v.tz - v.fz) * k; this.pos.y = this.floor * this.area.floorH + Math.sin(k * Math.PI) * 0.5;
    if (this.t <= 0) { this.pos.y = this.floor * this.area.floorH; this.setState('APPROACH'); }
  }
  s_CLIMB() {
    const c = this.climb; if (!c) { this.setState('APPROACH'); return; } const k = 1 - Math.max(0, this.t) / 1.2;
    this.pos.x = c.fx + (c.tx - c.fx) * Math.min(1, k * 1.2); this.pos.z = c.fz + (c.tz - c.fz) * Math.min(1, k * 1.2); this.pos.y = c.fy + (c.ty - c.fy) * k;
    if (c.ladder?.down) { this.setState('KNOCKDOWN', 2.2); this.floor = 0; this.pos.y = 0; this.damage(20, 'torso', {}); return; }
    if (this.t <= 0) { this.floor = c.toFloor; this.pos.set(c.tx, c.ty, c.tz); this.setState('APPROACH'); }
  }
  s_RISE() { if (this.t <= 0) this.setState('APPROACH'); }
  s_SEA(dt) {
    const a = this.area; if (!this.path) { this.path = a.pathToWater(this); this.pathI = 0; }
    if (this.hesitate > 0) { this.hesitate -= dt; return; }
    const reached = this.followPath(dt, 1.5 * Math.max(0.7, this.seaSpeed ?? 1));
    if (reached) { this.setState('SINK', 2.6); this.dead = true; this.removeBody(); this.sinking = true; a.ctx.particles.burst('splash', this.pos); a.ctx.audio.play('splash', a.spatialPlay(this.pos, 0.5)); }
  }
  s_SINK(dt) {
    this.pos.y -= dt * 0.8; const n = this.seaDir; if (n) { this.pos.x += n[0] * dt * 0.5; this.pos.z += n[1] * dt * 0.5; }
    if (this.t <= 0) this.area.removeEnemy(this);
  }
  s_CARRY(dt) {
    const a = this.area, d = a.dame; if (!d?.carried || d.carriedBy !== this) { this.setState('APPROACH'); return; }
    if (!this.path) { this.path = a.pathToDoor(this); this.pathI = 0; }
    this.followPath(dt, this.moveSpeed() * 0.8);
  }
  carrierApproach(dt) {
    const a = this.area, D = a.dame; const d = Math.hypot(D.pos.x - this.pos.x, D.pos.z - this.pos.z);
    if (d < 1.3 && !D.carried && D.canBeTaken()) { D.takenBy(this); this.path = null; this.setState('CARRY'); return; }
    this.pathT -= dt; if (!this.path || this.pathT <= 0) { this.path = a.navOf(this.floor, 0).path([this.pos.x, 0, this.pos.z], [D.pos.x, 0, D.pos.z]); this.pathI = 0; this.pathT = 0.6; }
    this.followPath(dt, this.moveSpeed());
  }
  dropCarried() { const D = this.area.dame; if (D?.carriedBy === this) D.dropped(); }
  moveSpeed() { const r = this.area.rank(); return this.speed * TUNING.enemySpeed * (1 + (r - 2) * 0.03) * (this.slow ?? 1); }
  flowMove(dt, sp, T) {
    const A = this.area, nav = A.flowNav(this.floor, T); let dx = 0, dz = 0;
    const tryDirect = T.floor === this.floor && A.los(this.pos, T.pos, this.floor) && this.distTo(T) < 12;
    if (tryDirect) { dx = T.pos.x - this.pos.x; dz = T.pos.z - this.pos.z; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L; } else if (nav.flowDirection(this.pos.x, this.pos.z, dirOut)) { dx = dirOut[0]; dz = dirOut[1]; } else if (T.floor !== this.floor) { const c = A.linkAt(this); if (c) { this.beginClimb(c); return; } }
    if (T.floor !== this.floor) { const c = A.linkAt(this); if (c) { this.beginClimb(c); return; } }
    this.step(dt, dx, dz, sp);
  }
  beginClimb(c) { this.climb = c; this.setState('CLIMB', 1.2); }
  followPath(dt, sp) {
    const p = this.path; if (!p) return true; if (this.pathI >= p.length) return true;
    const w = p[this.pathI], dx = w[0] - this.pos.x, dz = w[2] - this.pos.z, L = Math.hypot(dx, dz);
    if (L < 0.35) { this.pathI++; return this.pathI >= p.length; }
    this.step(dt, dx / L, dz / L, sp); return false;
  }
  /** One move, with separation and grid collision. A closed door or window on the way starts BASH or VAULT. */
  step(dt, dx, dz, sp) {
    const A = this.area; let sx = 0, sz = 0;
    if (this.state !== 'SEA') for (const o of A.enemies) { if (o === this || o.dead || o.floor !== this.floor) continue; const ox = this.pos.x - o.pos.x, oz = this.pos.z - o.pos.z, d2 = ox * ox + oz * oz; if (d2 < 0.3025 && d2 > 1e-5) { const d = Math.sqrt(d2), f = (0.55 - d) / 0.55; sx += (ox / d) * f; sz += (oz / d) * f; } }
    for (const T of A.players) { if (T.floor !== this.floor || T.dead) continue; const ox = this.pos.x - T.pos.x, oz = this.pos.z - T.pos.z, d2 = ox * ox + oz * oz; if (d2 < 0.5 && d2 > 1e-5) { const d = Math.sqrt(d2); sx += (ox / d) * 0.8; sz += (oz / d) * 0.8; } }
    let vx = dx * sp + sx * 1.6, vz = dz * sp + sz * 1.6;
    const belt = A.level.beltAt(this.pos.x, this.pos.z, this.floor); if (belt) { vx += belt[0]; vz += belt[1]; }
    const nx = this.pos.x + vx * dt, nz = this.pos.z + vz * dt;
    const special = A.level.barrierAt(nx, nz, this.floor);
    if (special && this.state !== 'SEA' && this.state !== 'CARRY') {
      if (special.type === 'door' && !special.open) { this.door = special; if (this.state !== 'BASH') this.setState('BASH', 99); return; }
      if (special.type === 'window') { this.vault = A.level.vaultPath(special, this.pos); this.setState('VAULT', 0.9); A.level.breakWindow(special); return; }
    }
    const shallow = A.level.isShallow(this.pos.x, this.pos.z) ? 0.7 : 1; const ok = (x, z) => A.level.enemyCanStand(x, z, this.floor, this.state === 'SEA');
    const mx = this.pos.x + vx * dt * shallow, mz = this.pos.z + vz * dt * shallow;
    if (ok(mx, this.pos.z)) this.pos.x = mx; if (ok(this.pos.x, mz)) this.pos.z = mz;
    if (Math.abs(dx) + Math.abs(dz) > 0.01) { const want = Math.atan2(vx, vz); this.turnTo(want, 7 * dt); }
    this.moved = sp;
  }
  turnTo(want, k) { let d = want - this.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; this.yaw += d * Math.min(1, k); }
  face(p, k) { this.turnTo(Math.atan2(p.x - this.pos.x, p.z - this.pos.z), k); }
  distTo(T) { return Math.hypot(T.pos.x - this.pos.x, T.pos.z - this.pos.z) + Math.abs(T.pos.y - this.pos.y) * 0.5; }
  place() { if (this.body) { this.body.setNextKinematicTranslation({ x: this.pos.x, y: this.pos.y + 0.85, z: this.pos.z }); } }
  // ----- crawlers
  crawl(dt, T) {
    const A = this.area;
    if (this.latched) { this.pos.set(T.pos.x + 0.2, T.pos.y + 0.8, T.pos.z - 0.1); this.latchT = (this.latchT ?? 0) + dt; T.hurt(this.def.dmg * dt, this.pos, { dot: true }); if (T.dead) this.latched = false; return; }
    const c = A.nearestCorpse(this.pos, 16);
    if (c) { const dx = c.pos.x - this.pos.x, dz = c.pos.z - this.pos.z, L = Math.hypot(dx, dz); if (L < 0.6) { A.raiseCorpse(c, this); return; } this.step(dt, dx / L, dz / L, this.moveSpeed()); return; }
    const d = this.distTo(T); if (d < this.def.reach && !A.noLatch) { this.latched = true; T.limpets = (T.limpets ?? 0) + 1; this.area.ctx.audio.play('skitter'); return; }
    const nav = A.flowNav(this.floor, T); let dx = T.pos.x - this.pos.x, dz = T.pos.z - this.pos.z, L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    if (L > 2 && nav.flowDirection(this.pos.x, this.pos.z, dirOut)) { dx = dirOut[0]; dz = dirOut[1]; } this.step(dt, dx, dz, this.moveSpeed());
    this.skit = (this.skit ?? 0) - dt; if (this.skit <= 0) { this.skit = 0.4; A.ctx.audio.play('skitter', A.spatialPlay(this.pos, 0.4)); }
  }
  // ----- damage
  /** returns true if the hit counted */
  damage(amount, zone, info = {}) {
    if (this.dead) return false;
    const A = this.area, d = this.def, P = A.ctx.particles, hp = info.point ?? this.zones.head;
    if (A.oneHit && !info.dot) amount = 9999;
    if (this.state === 'WORK' || !this.alerted) { A.alertAround(this.pos, 15, this); }
    if (!info.dot && !info.explosive) {
      if (this.hasShield && !info.kick && zone !== 'arm' && info.from) { const fx = info.from.x - this.pos.x, fz = info.from.z - this.pos.z; const front = fx * Math.sin(this.yaw) + fz * Math.cos(this.yaw); if (front > 0) { P.burst('spark', hp); A.ctx.audio.play('armorping', A.spatialPlay(this.pos)); return false; } }
      if (zone === 'arm' && this.hasShield) { this.hasShield = false; this.h.detach('shield'); A.dropProp('w-shield', this.pos); }
      if (d.armoured) {
        if (zone === 'head' && this.helmet > 0) { this.helmet -= amount; P.burst('spark', hp); A.ctx.audio.play('armorping', A.spatialPlay(this.pos)); if (this.helmet <= 0) { this.h.detach('helmet'); A.dropProp('w-helmet', this.pos); A.ctx.audio.play('brass', A.spatialPlay(this.pos)); this.setState('FLINCH', 0.5); } return true; }
        if (zone !== 'head') { P.burst('spark', hp); A.ctx.audio.play('armorping', A.spatialPlay(this.pos)); amount *= 0.08; }
      }
    }
    const mult = info.dot || info.explosive || info.kick ? 1 : ZONE_MULT[zone] ?? 1;
    const dmg = amount * mult; this.hp -= dmg; this.lastHit = A.ctx.time;
    if (!info.dot) { this.h?.flash(); A.fx.blood(hp, this.type === 'resalted'); A.ctx.audio.play('bodyhit', A.spatialPlay(this.pos)); if (A.rng.chance(0.3)) A.ctx.audio.play('grunt', A.spatialPlay(this.pos, 0.7)); A.onEnemyHit?.(this, zone, info); }
    if (!this.alerted) this.alert(false);
    const heavy = d.heavy;
    if (!info.dot && zone === 'head' && !heavy && !this.crawler && info.popChance && A.rng.chance(info.popChance)) { this.popHead(); this.die(info, true); return true; }
    if (this.hp <= 0) { this.die(info, zone === 'head'); return true; }
    if (info.dot || this.crawler) return true;
    if (info.pin) { this.setState('PIN', info.pin); this.dropCarried(); return true; }
    const stagger = !heavy || zone === 'head' || info.scatter || info.explosive;
    if (info.knock && stagger) { this.knock(info.knockDir); return true; }
    if (zone === 'head' && stagger && A.rng.chance(TUNING.staggerChance) && !['KNOCKDOWN', 'GETUP', 'STUN', 'KNEEL'].includes(this.state)) { this.setState('STUN', heavy ? 1.1 : 1.5); this.dropCarried(); return true; }
    if (zone === 'arm' && this.holding) { this.holding = false; this.h.detach('bottle'); A.spawnFire(this.pos.clone(), 1.6); this.damage(18, 'torso', { dot: false, explosive: true }); this.bleed = 3; return true; }
    if (zone === 'leg' && !heavy) { this.legDmg += dmg; if (this.legDmg >= 19 && !['KNEEL', 'KNOCKDOWN', 'GETUP', 'STUN'].includes(this.state)) { this.legDmg = 0; this.setState('KNEEL', 1.7); this.dropCarried(); return true; } }
    if (dmg >= 10 && !['KNEEL', 'KNOCKDOWN', 'GETUP', 'STUN', 'VAULT', 'CLIMB', 'BASH', 'RISE', 'GRAB'].includes(this.state) && !(heavy && this.state !== 'WINDUP')) this.setState('FLINCH', 0.25);
    return true;
  }
  knock(dir) { if (this.crawler) return; if (this.state === 'VAULT' || this.state === 'CLIMB') return; this.dropCarried(); this.setState('KNOCKDOWN', 2.2); this.knockV = dir ? [dir[0] * 3, dir[1] * 3] : null; if (this.grabbing) this.grabbing = false; }
  popHead() { if (!this.h) return; this.h.popped = true; const A = this.area; A.ctx.particles.burst('blast', this.zones.head, { scale: 0.4, colors: ['plum', 'teal', 'orange'] }); A.ctx.audio.play('headpop', A.spatialPlay(this.pos)); this.popped = true; }
  die(info = {}, head = false) {
    const A = this.area; if (this.dead) return; this.dead = true; this.dropCarried(); if (this.token) A.releaseToken(this); A.releaseThrow(this); this.removeBody(); this.state = 'DEAD'; if (this.sawVoice) { this.sawVoice.stop(); this.sawVoice = null; }
    if (this.latched) { const T = this.target; if (T) T.limpets = Math.max(0, (T.limpets ?? 1) - 1); }
    A.ctx.audio.play('dyegrunt', A.spatialPlay(this.pos, 0.6));
    if (this.crawler) { A.ctx.particles.burst('brine', this.pos); A.removeEnemy(this); A.onKill?.(this, info, head); return; }
    const violent = (info.scatter || info.explosive) && this.scale === 1;
    if (violent && A.ragdolls.length < 8 && !A.headless) {
      try { const rd = new Ragdoll(A.ctx.physics, this.root, HERO_RAGDOLL); const n = info.knockDir ?? [0, 0]; rd.enable({ velocity: [n[0] * 4, 2.5, n[1] * 4] }); this.ragdoll = rd; A.ragdolls.push(rd); this.h.mixer.stopAllAction(); } catch { this.h.play('Death', { fade: 0.1 }); }
    } else this.h.play('Death', { fade: 0.1 });
    A.addCorpse(this); A.onKill?.(this, info, head); if (head && !this.popped && A.rng.chance(0.25) && !A.silent && this.type !== 'resalted') A.spawnEnemy('limpet', this.pos.x + 0.3, this.pos.z + 0.3, { floor: this.floor });
  }
  // ----- per-frame
  update(dt) {
    const A = this.area;
    const a = A.ctx.physics.alpha; this.root.position.lerpVectors(this.prev, this.pos, this.dead ? 1 : a); this.root.rotation.y = this.yaw;
    if (this.sawVoice) { const s = A.spatial(this.pos, { max: 30, ref: 3 }); const blocked = !A.los(this.pos, A.ears(), this.floor); this.sawVoice.set({ volume: s.gain * 0.9, pan: s.pan, muffle: blocked ? 0.75 : 0, pitch: this.state === 'WINDUP' || this.lungeT > 0 ? 5 : 0 }); if (this.h.props.weapon) { const bl = this.h.props.weapon.getObjectByName('Blade'); if (bl) bl.rotation.x += dt * 40; } }
    if (this.crawler) { this.root.position.y += Math.sin(A.ctx.time * 18 + this.id) * 0.02; this.zones.head.copy(this.root.position); this.zones.head.y += 0.15; return; }
    if (this.ragdoll) { this.ragdoll.sync(); this.h.update(0); return; }
    if (this.dead && !this.sinking) { this.h.update(dt); return; }
    this.pickAnim(); this.h.update(dt); this.syncZones();
  }
  pickAnim() {
    const h = this.h, s = this.state; let name = STATE_CLIP[s], o = {};
    if (s === 'APPROACH' || s === 'CIRCLE' || this.moved && s === 'CARRY') {
      name = this.def.gait ?? 'Shamble'; if (this.def.saw) name = this.lungeT > 0 ? 'SawLunge' : 'Shamble'; if (this.hasShield) name = 'ShieldWalk';
      const c = { Shamble: 1.1, Lurch: 2.8, KnightWalk: 0.9, ShieldWalk: 1.3 }[name] ?? 1.5; o.timeScale = Math.max(0.5, this.moveSpeed() / c);
    }
    if (s === 'RECOVER' && this.hasShield) name = 'ShieldBlock';
    if (s === 'CARRY' && this.t > -0.6) name = 'CarrierShoulder';
    if (s === 'WORK') name = this.workClip ?? 'WorkChop';
    if (s === 'WINDUP') { if (this.def.saw) name = 'SawRev'; if (this.def.armoured) name = 'RaiseTool'; if (this.def.throws === 'bottle') name = 'ThrowOverhand'; }
    if (s === 'ATTACK') { if (this.def.saw) name = 'SawSwing'; if (this.type === 'knight') name = 'HalberdSweep'; if (this.type === 'monk') name = 'FlailSpin'; if (this.grabTry) name = 'Grapple'; }
    if (s === 'IDLE' || !name) name = 'Idle';
    if (name !== this.anim) { this.anim = name; h.play(name, o); } else if (o.timeScale) h.setTimeScale(o.timeScale);
  }
  syncZones() {
    if (!this.h) return; const J = this.h.joints, z = this.zones; this.root.updateWorldMatrix(true, true);
    J.Head.getWorldPosition(z.head); z.neck.copy(z.head); z.head.y += 0.13 * this.scale; J.Pelvis.getWorldPosition(z.pelvis);
    J.ArmR.getWorldPosition(z.armRa); J.HandR.getWorldPosition(z.armRb); J.ArmL.getWorldPosition(z.armLa); J.HandL.getWorldPosition(z.armLb);
    J.LegR.getWorldPosition(z.legRa); J.FootR.getWorldPosition(z.legRb); J.LegL.getWorldPosition(z.legLa); J.FootL.getWorldPosition(z.legLb);
  }
  kickable() { return ['STUN', 'BLIND'].includes(this.state) || (this.def.heavy && this.state === 'STUN'); }
  takedownable() { return this.state === 'KNEEL'; }
  destroy() { this.removeBody(); if (this.sawVoice) this.sawVoice.stop(); if (this.h) this.h.remove(); else this.area.ctx.scene.remove(this.root); }
}
