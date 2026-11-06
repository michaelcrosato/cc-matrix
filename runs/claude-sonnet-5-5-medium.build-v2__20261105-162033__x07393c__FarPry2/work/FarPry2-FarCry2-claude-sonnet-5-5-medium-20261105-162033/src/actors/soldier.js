// Soldiers: data plus an optional view. Perception, a behaviour tree at 10 Hz, bursts of fire, panic when burning.
import { THREE, CharacterController, BehaviorTree, bt } from '../../pixel-engine.js';
import { PersonView } from './rig.js';
import { TUNING } from '../core/tuning.js';
import { jamChance } from '../combat/gunmath.js';

const V3 = THREE.Vector3;
const ROLE = { rifle: { hp: 60, speed: 4.2, burst: [3, 5], rate: 6 }, mg: { hp: 85, speed: 3.2, burst: [6, 10], rate: 10 }, sniper: { hp: 45, speed: 3.6, burst: [1, 1], rate: 0.6 }, rocket: { hp: 60, speed: 3.8, burst: [1, 1], rate: 0.4 }, driver: { hp: 60, speed: 4, burst: [2, 3], rate: 5 } };
const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

export class Soldier {
  constructor(sys, spec) {
    this.sys = sys; const g = sys.g; this.g = g;
    this.id = sys.nextId = (sys.nextId || 0) + 1; this.kind = 'soldier'; this.alive = true;
    this.faction = spec.faction || 'concord'; this.role = spec.role || 'rifle';
    const R = ROLE[this.role]; this.R = R;
    this.hp = this.maxHp = spec.hp || R.hp; this.modelId = spec.model || null; this.skin = spec.skin ?? (this.id % 4); this.hat = spec.hat || (this.id % 3 === 0 ? 'cap' : this.id % 3 === 1 ? (this.faction === 'concord' ? 'beret' : 'headcloth') : 'wide');
    this.site = spec.site || null; this.slot = spec.slot ?? null; this.duty = spec.duty || 'guard';
    this.home = new V3(spec.at[0], 0, spec.at[1]); this.patrol = spec.patrol || null; this.patrolI = 0;
    this.yaw = spec.yaw ?? 0; this.targetYaw = this.yaw;
    this.state = 'idle'; this.suspicion = 0; this.lastKnown = null; this.searchT = 0; this.reactT = 0; this.burstLeft = 0; this.burstGap = 0; this.coverT = 0; this.cover = null;
    this.burning = false; this.burnT = 0; this.sitting = false; this.speed = 0; this.vel = new V3();
    this.move = new V3(); this.gunCond = g.ctx.random.fork('gun' + this.id).range(20, 70); this.jammedT = 0; this.pausedT = 0;
    this.flanker = false; this.path = null; this.pathI = 0; this.pathWait = 0; this.visible = false; this.mark = ''; this.markT = 0;
    this.alertAt = -99; this.barkT = 0; this.vehicle = null; this.puppet = !!spec.puppet; this.role2 = spec.tag || null; this.tag = spec.tag || null;
    const y = g.world.heightAt(spec.at[0], spec.at[1]);
    this.pos = new V3(spec.at[0], y, spec.at[1]);
    if (!this.puppet) {
      this.ctrl = new CharacterController(g.ctx.physics, { position: [spec.at[0], y + 0.4, spec.at[1]], radius: 0.35, halfHeight: 0.55, speed: R.speed, gravity: -24 });
      g.ctx.physics.tag(this.ctrl.collider, 'npc');
      this.collider = this.ctrl.collider; this.pos = this.ctrl.feet;
      this.tree = this.makeTree();
    }
    this.view = null;
    if (!g.headlessNoView) this.makeView();
    g.register(this);
  }
  get pos() { return this.ctrl ? this.ctrl.feet : this._pos; }
  set pos(v) { this._pos = v; }
  makeView() {
    this.view = new PersonView(this.modelId || `soldier-${this.faction}-${this.skin}-${this.hat}`, this.g.ctx);
    this.g.ctx.scene.add(this.view.object);
    this.view.layered('Idle', 'AimIdle');
    this.view.object.position.copy(this.pos);
  }
  // ---------------- tree ----------------
  makeTree() {
    const S = this;
    return new BehaviorTree(bt.selector('soldier',
      bt.sequence('burning', bt.condition('on fire?', () => S.burning), bt.action('panic', (_b, dt) => S.doPanic(dt))),
      bt.sequence('fire', bt.condition('fire near?', () => S.fireNear()), bt.action('flee fire', (_b, dt) => S.doFleeFire(dt))),
      bt.sequence('dodge', bt.condition('blast near?', () => S.blastNear()), bt.action('dodge', (_b, dt) => S.doDodge(dt))),
      bt.sequence('combat', bt.condition('fighting?', () => S.state === 'alert'), bt.action('fight', (_b, dt) => S.doCombat(dt))),
      bt.sequence('search', bt.condition('searching?', () => S.state === 'searching' || S.state === 'suspicious'), bt.action('search', (_b, dt) => S.doSearch(dt))),
      bt.action('duty', (_b, dt) => S.doDuty(dt)),
    ), this);
  }
  fireNear() {
    const g = this.g, w = g.world.wind; if (!g.fire || !g.fire.grid.burning.length) return false;
    // sample upwind
    for (let t = 6; t <= 24; t += 6) { if (g.fire.burningAt(this.pos.x - w.dir[0] * t, this.pos.z - w.dir[1] * t)) return true; }
    return g.fire.burningAt(this.pos.x, this.pos.z);
  }
  blastNear() { for (const p of this.g.projectiles.list) if (!p.done && p.kind !== 'flare' && p.pos.distanceTo(this.pos) < 9) { this.dodgeFrom = p.pos; return true; } return false; }
  // ---------------- helpers ----------------
  moveTo(x, z, speed) {
    const dx = x - this.pos.x, dz = z - this.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.5) { this.move.set(0, 0, 0); this.speed = 0; return true; }
    this.move.set(dx / d, 0, dz / d); this.speed = speed; this.targetYaw = Math.atan2(-dx, -dz);
    return false;
  }
  stop() { this.move.set(0, 0, 0); this.speed = 0; }
  face(x, z) { this.targetYaw = Math.atan2(-(x - this.pos.x), -(z - this.pos.z)); }
  eye(out) { return out.set(this.pos.x, this.pos.y + 1.55, this.pos.z); }
  say(key) { if (this.g.ctx.time - this.barkT > 3) { this.barkT = this.g.ctx.time; this.g.bark?.(this, key); } }
  // ---------------- perception ----------------
  hostiles() { const g = this.g; const l = []; if (g.canBeTargeted?.()) l.push(g.playerTarget); for (const b of g.buddies?.list || []) if (b.alive && b.fighting) l.push(b); return l; }
  perceive(dt) {
    const g = this.g, p = g.playerTarget; let seen = false;
    this.visible = false;
    const fireNote = g.passFor?.(this.faction, this);
    if (g.invisibleToAI || fireNote) { this.suspicion = Math.max(0, this.suspicion - dt / 3); }
    else {
      let best = null, bd = 1e9;
      for (const t of this.hostiles()) { const d = Math.hypot(t.pos.x - this.pos.x, t.pos.z - this.pos.z); if (d < bd) { bd = d; best = t; } }
      if (best) {
        const t = best, d = bd;
        const range = TUNING.enemyVision * g.stanceMult(t) * g.lightMult(t);
        if (d < range) {
          const ang = Math.abs(wrap(Math.atan2(-(t.pos.x - this.pos.x), -(t.pos.z - this.pos.z)) - this.yaw));
          if (ang < Math.PI / 3 || d < 6) {
            const from = this.eye(this.tmpA ||= new V3()); const to = this.tmpB ||= new V3();
            for (const h of [1.5, 1.0]) {
              to.set(t.pos.x, t.pos.y + h * (t.crouched ? 0.65 : 1), t.pos.z);
              const dir = to.clone().sub(from); const L = dir.length(); dir.normalize();
              const hit = g.ctx.physics.castRay(from, dir, L + 0.3, [], this.ctrl.body);
              if (!hit || (hit.collider === t.collider) || hit.distance >= L - 0.2) { seen = true; this.target = t; break; }
            }
            if (seen) this.suspicion = Math.min(1.3, this.suspicion + dt / 1.5 * (1.3 - d / range));
          }
        }
      }
    }
    if (!seen && !this.burning) this.suspicion = Math.max(0, this.suspicion - dt * 0.25);
    this.visible = seen;
    if (seen) {
      this.lastKnown = (this.lastKnown || new V3()).copy(this.target.pos);
      if (this.suspicion >= 1 && this.state !== 'alert') this.becomeAlert('saw');
      else if (this.suspicion > 0.35 && this.state === 'idle') { this.state = 'suspicious'; this.searchT = 0; }
    } else if (this.state === 'suspicious' && this.suspicion < 0.1) this.state = 'idle';
    // marker over the head
    this.mark = this.state === 'alert' ? '!' : this.state === 'suspicious' || this.state === 'searching' ? '?' : '';
  }
  becomeAlert(why) {
    if (this.state === 'alert') return;
    const first = this.g.ctx.time - this.alertAt > 30;
    this.state = 'alert'; this.alertAt = this.g.ctx.time; this.reactT = TUNING.enemyReaction; this.sitting = false; this.suspicion = 1;
    if (first) this.say('spotted');
    this.sys.alertSquad(this, this.lastKnown || this.pos);
  }
  hear(pos, dist, by) {
    if (!this.alive || this.puppet) return;
    if (by === 'player' && this.g.passFor?.(this.faction, this) && dist > 12) return;
    if (by === 'player' || by === 'buddy') this.g.hostileNote?.(this, dist);
    this.lastKnown = (this.lastKnown || new V3()).copy(pos);
    if (this.state === 'idle' || this.state === 'suspicious') { this.state = dist < 25 ? 'alert' : 'searching'; if (this.state === 'alert') { this.reactT = TUNING.enemyReaction; this.say('spotted'); this.alertAt = this.g.ctx.time; } this.searchT = 0; this.sitting = false; }
  }
  // ---------------- actions ----------------
  doPanic(dt) {
    this.panicT = (this.panicT || 0) - dt;
    if (this.panicT <= 0) { this.panicDir = this.g.ctx.random.range(0, Math.PI * 2); this.panicT = this.g.ctx.random.range(0.5, 1.2); }
    this.move.set(Math.cos(this.panicDir), 0, Math.sin(this.panicDir)); this.speed = 6.2; this.targetYaw = Math.atan2(-this.move.x, -this.move.z);
    this.say('onfire');
    return 'running';
  }
  doFleeFire() {
    const w = this.g.world.wind; // run crosswind
    const sx = -w.dir[1], sz = w.dir[0]; const side = (this.pos.x * sx + this.pos.z * sz) > 0 ? 1 : -1;
    this.move.set(sx * side, 0, sz * side); this.speed = 5.4; this.targetYaw = Math.atan2(-this.move.x, -this.move.z);
    this.say('fire'); return 'running';
  }
  doDodge() {
    const p = this.dodgeFrom; const dx = this.pos.x - p.x, dz = this.pos.z - p.z, d = Math.hypot(dx, dz) || 1;
    this.move.set(dx / d, 0, dz / d); this.speed = 6; this.say('grenade'); return 'running';
  }
  doCombat(dt) {
    const g = this.g; const t = this.target || g.playerTarget; this.reactT -= dt;
    if (!this.lastKnown) this.lastKnown = new V3().copy(t.pos);
    const lk = this.lastKnown, dx = lk.x - this.pos.x, dz = lk.z - this.pos.z, d = Math.hypot(dx, dz);
    this.face(lk.x, lk.z);
    if (this.role === 'sniper' || this.role === 'mg' && d < 30) this.stop();
    else if (this.flanker && this.visible === false) this.followPath(dt, 5);
    else if (d > 38) this.moveTo(lk.x, lk.z, this.R.speed + 1);
    else if (d < 9) { this.move.set(-dx / d, 0, -dz / d); this.speed = 3; }
    else {
      this.coverT -= dt;
      if (this.coverT <= 0) { this.coverT = g.ctx.random.range(4, 8); this.pickCover(t); }
      if (this.cover && Math.hypot(this.cover.x - this.pos.x, this.cover.z - this.pos.z) > 1) this.moveTo(this.cover.x, this.cover.z, 4.6);
      else { // strafe
        const s = (this.id % 2 ? 1 : -1) * (Math.sin(g.ctx.time * 0.8 + this.id) > 0 ? 1 : -1);
        this.move.set(-dz / d * s * 0.6, 0, dx / d * s * 0.6); this.speed = 2.2;
      }
    }
    this.pausedT -= dt; this.burstGap -= dt;
    if (this.visible && this.reactT <= 0 && this.pausedT <= 0) {
      if (this.burstLeft <= 0 && this.burstGap <= 0) { this.burstLeft = g.ctx.random.int(this.R.burst[0], this.R.burst[1]); }
      if (this.burstLeft > 0) {
        this.shotT = (this.shotT || 0) - dt;
        if (this.shotT <= 0) { this.shotT = 1 / this.R.rate; this.burstLeft--; this.fire(t); if (this.burstLeft <= 0) this.burstGap = g.ctx.random.range(0.8, 1.6) * (this.role === 'sniper' ? 3 : 1); }
      }
    }
    // lost sight
    if (!this.visible) { this.lostT = (this.lostT || 0) + dt; if (this.lostT > 4 && this.suspicion < 0.5) { this.state = 'searching'; this.searchT = 0; this.lostT = 0; this.say('lost'); } } else this.lostT = 0;
    return 'running';
  }
  pickCover(t) {
    const covers = this.site ? this.site.cover : null; let best = null, bd = 14;
    if (covers) for (const c of covers) { const d = Math.hypot(c.x - this.pos.x, c.z - this.pos.z); if (d < bd) { bd = d; best = c; } }
    this.cover = best ? { x: best.x, z: best.z } : null;
    if (!best && this.sys.g.ctx.random.chance(0.5)) this.flanker = this.sys.wantFlank(this);
    if (this.flanker && !this.path && t) this.sys.requestPath(this, t.pos);
  }
  followPath(dt, speed) {
    if (!this.path) { this.move.set(0, 0, 0); this.speed = 0; return; }
    const p = this.path[this.pathI]; if (!p) { this.path = null; this.flanker = false; return; }
    if (this.moveTo(p[0], p[2] ?? p[1], speed)) this.pathI++;
  }
  fire(t) {
    const g = this.g;
    if (this.jammedT > 0) return;
    if (g.ctx.random.chance(jamChance(this.gunCond))) { this.jammedT = 2; this.pausedT = 1.8; this.say('jammed'); this.view?.oneShotUpper('UnjamSwear', 'AimIdle'); g.sfx?.('jam_click', { pos: this.pos }); return; }
    this.gunCond = Math.max(5, this.gunCond - 0.1);
    const from = this.eye(this.tmpF ||= new V3());
    const aim = this.tmpAim ||= new V3(); aim.set(t.pos.x, t.pos.y + (t.crouched ? 0.8 : 1.2), t.pos.z);
    const dist = from.distanceTo(aim);
    const fast = t.speedNow > 4 ? 1.4 : 1;
    const err = (1.2 + (5 - 1.2) * Math.min(1, dist / 80)) * Math.PI / 180 / TUNING.enemyAccuracy * fast;
    const dir = aim.clone().sub(from).normalize();
    const rnd = g.ctx.random;
    const j = new V3((rnd.next() - 0.5) * 2 * err, (rnd.next() - 0.5) * 2 * err, (rnd.next() - 0.5) * 2 * err);
    const shot = dir.clone().add(j).normalize();
    g.sfx?.('shot_tractor', { pos: this.pos, far: dist > 60 });
    this.view?.oneShotUpper('FireRecoil', 'AimIdle');
    const to = from.clone().addScaledVector(shot, dist);
    // closest approach of the shot ray to the target's chest
    const w = aim.clone().sub(from); const proj = w.dot(shot); const closest = from.clone().addScaledVector(shot, proj);
    const miss = closest.distanceTo(aim);
    g.noise(this.pos, 120, 'enemy');
    if (Math.floor(g.ctx.time * 6) % 3 === 0) g.tracer(from, from.clone().addScaledVector(shot, Math.min(dist + 5, 60)));
    if (miss < (t.crouched ? 0.35 : 0.5)) {
      const hit = g.ctx.physics.castRay(from, shot, dist + 0.5, [], this.ctrl.body);
      if (!hit || hit.collider === t.collider || hit.distance >= dist - 0.6) t.takeHit(9, 'bullet', this.pos, this);
    } else if (miss < 3) g.sfx?.('whip', { pos: closest });
  }
  doSearch(dt) {
    this.searchT += dt;
    const lk = this.lastKnown;
    if (lk && this.state === 'searching') {
      if (this.searchT < 12 && Math.hypot(lk.x - this.pos.x, lk.z - this.pos.z) > 3) this.moveTo(lk.x, lk.z, 4);
      else { this.stop(); this.targetYaw += dt * (Math.sin(this.searchT * 1.3) * 1.5); }
    } else this.stop();
    if (this.searchT > 20 || (this.state === 'suspicious' && this.searchT > 6 && this.suspicion < 0.3)) { this.state = 'idle'; this.say('gaveup'); }
    return 'running';
  }
  doDuty(dt) {
    const g = this.g; const night = g.isNight();
    if (this.duty === 'patrol' && this.patrol) {
      const p = this.patrol[this.patrolI % this.patrol.length];
      if (this.moveTo(p[0], p[1], 2.4)) { this.patrolI++; this.idleWait = 2; }
    } else if (this.duty === 'sleep' && night) { this.stop(); this.sitting = true; this.sleeping = true; }
    else if (this.duty === 'sit') { this.stop(); this.sitting = true; }
    else {
      this.sleeping = false;
      const dx = this.home.x - this.pos.x, dz = this.home.z - this.pos.z;
      if (Math.hypot(dx, dz) > 2) this.moveTo(this.home.x, this.home.z, 2.6); else { this.stop(); if (this.faceYaw !== undefined) this.targetYaw = this.faceYaw; }
    }
    if (this.sitting && this.state !== 'idle') this.sitting = false;
    return 'running';
  }
  // ---------------- damage ----------------
  onHit(d, zone, info) {
    this.suspicion = 1;
    if (info.from) { this.lastKnown = (this.lastKnown || new V3()).copy(info.by === 'player' ? this.g.player.feet : info.from); }
    if (this.state !== 'alert') { this.becomeAlert('hit'); }
    this.view?.fade?.('upper', 'AimIdle:upper');
    this.g.ctx.particles.burst('blood', [this.pos.x, this.pos.y + 1.2, this.pos.z], { count: 3 });
    this.hurtT = 0.3;
  }
  ignite() { if (this.burning || !this.alive) return; this.burning = true; this.burnT = 5.5; this.state = 'alert'; this.g.events.emit('soldierburn', this); }
  onDeath(info) {
    const g = this.g;
    this.state = 'dead'; this.corpseT = 90;
    this.burning = false;
    if (this.slot !== null && this.site) this.site.onSoldierDeath?.(this);
    g.sfx?.('death_' + (this.id % 3), { pos: this.pos });
    this.say('down');
    const push = info.dir ? new V3(info.dir.x, 1.5, info.dir.z).multiplyScalar(2.5) : new V3(0, 1.5, 0);
    if (this.view) { this.view.object.position.copy(this.pos); this.view.object.rotation.y = this.yaw + Math.PI; this.view.object.updateMatrixWorld(true); if (this.sys.ragdollCount < 10) { this.view.die(push); this.sys.ragdollCount++; this.hasRagdoll = true; } else this.view.full('Death', false, 0.05); }
    this.ctrl.body.setEnabled(false);
    g.combat.byCollider.delete(this.collider.handle);
    this.dead = true;
    if (!info.noDrop && g.ctx.random.chance(0.6) && g.drops) g.drops.add({ kind: 'gun', id: this.role === 'sniper' ? 'empire' : this.role === 'mg' ? 'mule' : 'tractor', cond: Math.round(g.ctx.random.range(20, 55)), at: [this.pos.x, this.pos.z] });
    g.events.emit('soldierdown', this, info);
  }
  // ---------------- per-step ----------------
  tickBrain(dt) {
    if (!this.alive) return;
    this.perceive(dt);
    if (this.jammedT > 0) this.jammedT -= dt;
    if (this.burning) { this.burnT -= dt; this.hp -= 11 * dt; if (this.hp <= 0) this.g.damageActor(this, 0.001, 'torso', { by: 'fire' }); if (this.burnT <= 0 && this.alive) this.g.damageActor(this, 999, 'torso', { by: 'fire' }); }
    if (this.alive) this.tree.tick(dt);
  }
  stepMove(dt) {
    if (!this.alive) return;
    const dy = wrap(this.targetYaw - this.yaw); this.yaw += Math.max(-8 * dt, Math.min(8 * dt, dy));
    this.ctrl.speed = this.speed || 0.01;
    if (this.sitting) this.move.set(0, 0, 0);
    this.ctrl.setInput(this.move, false, false);
    this.ctrl.fixedUpdate(dt);
    this.vel.copy(this.ctrl.velocity);
  }
  frame(dt) {
    const v = this.view; if (!v) return;
    if (this.puppet) { const spd = this.target ? 3 : 0; v.layered(this.state === 'alert' ? 'Run' : 'Idle', 'AimIdle'); v.update(dt); return; }
    if (this.alive) {
      const f = this.ctrl.interpolatedFeet(this.g.ctx.physics.alpha);
      v.object.position.copy(f); v.object.rotation.y = this.yaw + Math.PI;
      const spd = Math.hypot(this.vel.x, this.vel.z);
      if (this.burning) v.full('BurnPanic', true);
      else if (this.sleeping) v.full('Sleep', true);
      else if (this.sitting) v.full('Sit', true);
      else v.layered(spd > 3.2 ? 'Run' : spd > 0.4 ? 'Walk' : 'Idle', 'AimIdle');
      v.speed = spd > 3.2 ? 1 : spd > 0.4 ? Math.max(0.6, spd / 2.4) : 1;
    }
    v.update(dt);
    if (!this.alive) { this.corpseT -= dt; if (this.corpseT <= 0) this.sys.remove(this); }
  }
}

export class SoldierSystem {
  name = 'soldiers';
  list = []; ragdollCount = 0; pathQueue = []; pathBudget = 2;
  setup(g) { this.g = g; g.soldiers = this; g.spawnSoldier = (s) => this.spawn(s); }
  spawn(spec) { const s = new Soldier(this, spec); this.list.push(s); return s; }
  remove(s) {
    const i = this.list.indexOf(s); if (i >= 0) this.list.splice(i, 1);
    if (s.view) { s.view.dispose(); if (s.hasRagdoll) this.ragdollCount = Math.max(0, this.ragdollCount - 1); }
    this.g.unregister(s);
    if (s.ctrl) s.ctrl.body.setEnabled(false);
    s.alive = false;
  }
  clear() { for (const s of this.list.slice()) this.remove(s); }
  alertSquad(s, pos) {
    for (const o of this.list) if (o !== s && o.alive && o.faction === s.faction && o.state !== 'alert' && Math.hypot(o.pos.x - s.pos.x, o.pos.z - s.pos.z) < 45) {
      o.lastKnown = (o.lastKnown || new V3()).copy(pos); o.state = o.state === 'dead' ? o.state : 'alert'; o.reactT = TUNING.enemyReaction + 0.2; o.alertAt = this.g.ctx.time; o.sitting = false; o.sleeping = false;
    }
  }
  wantFlank(s) { return this.list.filter((o) => o.alive && o.flanker && o.faction === s.faction).length < 1 && this.list.filter((o) => o.alive && o.state === 'alert').length >= 3; }
  requestPath(s, to) { if (!this.pathQueue.find((q) => q.s === s)) this.pathQueue.push({ s, to: to.clone() }); }
  fixed(g, dt) {
    const every = 6;
    for (let i = 0; i < this.list.length; i++) {
      const s = this.list[i]; if (!s.alive || s.puppet) continue;
      if ((g.step + i) % every === 0) s.tickBrain(every / 60);
      s.stepMove(dt);
    }
    // path budget
    for (let n = 0; n < this.pathBudget && this.pathQueue.length; n++) {
      const q = this.pathQueue.shift(); if (!q.s.alive || !g.nav) continue;
      const side = q.s.id % 2 ? 1 : -1; const dx = q.to.x - q.s.pos.x, dz = q.to.z - q.s.pos.z, d = Math.hypot(dx, dz) || 1;
      const tx = q.to.x + (-dz / d) * 18 * side, tz = q.to.z + (dx / d) * 18 * side;
      try { const p = g.nav.path([q.s.pos.x, 0, q.s.pos.z], [tx, 0, tz]); q.s.path = p && p.length ? p.map((v) => [v[0] ?? v.x, v[2] ?? v.z]) : null; q.s.pathI = 0; } catch { q.s.path = null; }
    }
  }
  frame(g, dt) { for (const s of this.list.slice()) s.frame(dt); }
  state() { return { soldiers: { live: this.list.filter((s) => s.alive).length, alert: this.list.filter((s) => s.alive && s.state === 'alert').length } }; }
}
