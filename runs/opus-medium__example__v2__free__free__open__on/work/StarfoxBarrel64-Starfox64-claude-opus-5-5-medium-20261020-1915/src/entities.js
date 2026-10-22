// Enemies, items, wingmen, bosses and projectiles.
import { THREE, glow, gfx } from './gfx.js';
import * as M from './models.js';
import { physics, G } from './physics.js';
import { fx, makeBoltMesh, Trail } from './fx.js';
import { audio } from './audio.js';
import { rand, clamp, damp, pick } from './config.js';
import { CAST } from './levels.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const tv = V(), tv2 = V(), tq = new THREE.Quaternion(), tm = new THREE.Matrix4();
const UP = new THREE.Vector3(0, 1, 0);
const WHITE = glow(0xffffff, 2.2);

// =====================================================================
// Enemy base
// =====================================================================
export class Enemy {
  constructor(g, kind, obj, o = {}) {
    this.g = g; this.kind = kind; this.obj = obj;
    this.hp = o.hp ?? 1; this.maxHp = this.hp; this.radius = o.radius ?? 3; this.hits = o.hits ?? 1;
    this.item = o.item || null; this.debrisColor = o.debrisColor ?? 0x884444; this.boomSize = o.boom ?? 1;
    this.alive = true; this.t = 0; this.flashT = 0; this.fireT = rand(0.5, 2); this.lockable = o.lockable ?? true;
    this.pos = obj.position; this.prev = V(); this.vel = V();
    this.isEnemy = true; this.countsForTotal = o.counts ?? true;
    if (this.countsForTotal) g.stats.spawned += this.hits;
    if (!o.noSensor) this.sensor = physics.addSensor(this, this.radius, G.ENEMY);
    g.root.add(obj);
    this.meshes = [];
    obj.traverse((m) => { if (m.isMesh) this.meshes.push([m, m.material]); });
  }
  flash() { this.flashT = 0.07; for (const [m] of this.meshes) m.material = WHITE; }
  base(dt) {
    this.t += dt;
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) for (const [m, mat] of this.meshes) m.material = mat; }
    if (dt > 0) this.vel.subVectors(this.pos, this.prev).divideScalar(dt);
    this.prev.copy(this.pos);
    if (this.sensor) physics.moveSensor(this.sensor, this.pos);
  }
  faceVelocity(dt, k = 6) {
    if (this.vel.lengthSq() < 1) return;
    tm.lookAt(tv.copy(this.pos).add(this.vel), this.pos, UP);
    tq.setFromRotationMatrix(tm);
    this.obj.quaternion.slerp(tq, 1 - Math.exp(-k * dt));
  }
  faceTarget(target, dt, k = 6) {
    tm.lookAt(target, this.pos, UP);
    tq.setFromRotationMatrix(tm);
    this.obj.quaternion.slerp(tq, 1 - Math.exp(-k * dt));
  }
  hit(dmg, point, src = 'player') {
    if (!this.alive) return false;
    this.hp -= dmg;
    if (this.hp <= 0) { this.kill(src); return true; }
    this.flash();
    audio.enemyHit(this.g.panOf(this.pos));
    if (point) fx.hitSpark(point);
    return false;
  }
  kill(src = 'player') {
    if (!this.alive) return;
    this.alive = false;
    fx.explode(this.pos, this.boomSize, this.debrisColor, Math.round(4 + this.boomSize * 3), this.g.root);
    audio.explosion(this.boomSize, this.g.panOf(this.pos));
    if (src === 'player') this.g.addHits(this.hits, this.pos, this);
    if (this.item) this.g.spawnItem(this.item, this.pos.clone());
    this.onKill && this.onKill(src);
    this.remove();
  }
  remove() {
    this.alive = false; this.dead = true;
    if (this.sensor) { physics.removeSensor(this.sensor); this.sensor = null; }
    this.obj.parent && this.obj.parent.remove(this.obj);
    this.trail && this.trail.dispose();
  }
  update(dt) { this.base(dt); }
  shootAt(target, speed = 110, kind = 'e0', dmg = 9, lead = true) {
    this.g.enemyShoot(this.pos, target, speed, kind, dmg, lead);
  }
}

// =====================================================================
// Rail patterns (operate in rail space: rs distance, ox right, oy up)
// =====================================================================
const PATTERNS = {
  swoop(e, dt, g) {
    const P = g.player;
    e.rs += -22 * dt;
    const k = clamp((e.spawnAhead - (e.rs - P.s)) / e.spawnAhead, 0, 1);
    e.ox = e.bx * (1 - k * 0.6) + Math.sin(e.t * 1.6 + e.phase) * 7;
    e.oy = e.by + Math.cos(e.t * 1.3 + e.phase) * 4 + k * 6;
    if (e.rs < P.s - 30) e.remove();
  },
  cross(e, dt, g) {
    const P = g.player;
    e.rs += (P.baseSpeed - 8) * dt;
    e.ox += -e.side * 42 * dt;
    e.oy = e.by + Math.sin(e.t * 2 + e.phase) * 3;
    if (Math.abs(e.ox) > 120 && Math.sign(e.ox) === -e.side) e.remove();
    if (e.rs < P.s - 30) e.remove();
  },
  behind(e, dt, g) {
    const P = g.player;
    if (!e.turned) {
      e.rs += (P.baseSpeed + 55) * dt;
      e.oy = e.by + 10 - Math.min(10, e.t * 3);
      if (e.rs > P.s + 140) { e.turned = true; e.spawnAhead = 140; }
    } else {
      e.rs += -18 * dt;
      e.ox = e.bx + Math.sin(e.t * 2 + e.phase) * 9;
      e.oy = e.by + Math.cos(e.t * 1.7) * 5;
      if (e.rs < P.s - 30) e.remove();
    }
    e.noFire = !e.turned;
  },
  hover(e, dt, g) {
    const P = g.player;
    const life = 11;
    if (e.t < life) {
      const target = P.s + e.spawnAhead * 0.7 + Math.sin(e.t * 0.7) * 10;
      e.rs = damp(e.rs, target, 1.6, dt) + P.speed * dt * 0.0;
      e.rs += (P.speed) * dt * 0.0;
      e.rs = Math.max(e.rs, P.s + 40);
      e.ox = e.bx + Math.sin(e.t * 0.9 + e.phase) * 18;
      e.oy = e.by + Math.sin(e.t * 1.4 + e.phase) * 5;
    } else {
      e.oy += 40 * dt; e.rs += (P.speed + 40) * dt;
      if (e.t > life + 3) e.remove();
    }
  },
  ring(e, dt, g) {
    const P = g.player;
    e.rs += -14 * dt;
    const a = e.phase + e.t * 1.5;
    e.ox = e.bx + Math.cos(a) * 15;
    e.oy = e.by + Math.sin(a) * 10;
    if (e.rs < P.s - 30) e.remove();
  },
  tail(e, dt, g) {
    const P = g.player;
    if (e.t < 12) {
      e.rs += 70 * dt; // fixed speed: braking or looping lets the player get behind it
      e.ox = damp(e.ox, P.ox + e.bx, 1.5, dt);
      e.oy = damp(e.oy, P.oy + e.by * 0.3, 1.5, dt);
    } else {
      e.rs += 150 * dt; e.oy += 10 * dt;
      if (e.rs > P.s + 400) e.remove();
    }
  },
  chase(e, dt, g) { // rescue chaser follows its victim
    const v = e.victim;
    if (!v || v.state !== 'rescue') { e.rs += 160 * dt; e.oy += 15 * dt; if (e.t > 30 || e.rs > g.player.s + 500) e.remove(); return; }
    e.rs = damp(e.rs, v.rs - 14, 3, dt);
    e.ox = damp(e.ox, v.ox + Math.sin(e.t * 2) * 3, 3, dt);
    e.oy = damp(e.oy, v.oy + Math.cos(e.t * 2.3) * 2, 3, dt);
  },
};

export class RailEnemy extends Enemy {
  constructor(g, kind, obj, o) {
    super(g, kind, obj, o);
    this.rail = g.rail; this.rs = o.rs; this.ox = o.ox; this.oy = o.oy; this.bx = o.ox; this.by = o.oy;
    this.pattern = o.pattern; this.phase = o.phase || 0; this.side = o.side || 1;
    this.spawnAhead = o.ahead || 300; this.fireRate = o.fire || (kind === 'bat' ? 3.2 : 4.0);
    this.rail.pos(this.rs, this.ox, this.oy, this.pos); this.prev.copy(this.pos);
    if (this.sensor) physics.teleportSensor(this.sensor, this.pos);
  }
  update(dt) {
    const g = this.g;
    PATTERNS[this.pattern](this, dt, g);
    if (!this.alive) return;
    this.rail.pos(this.rs, this.ox, this.oy, this.pos);
    this.base(dt);
    const P = g.player;
    const ahead = this.rs - P.s;
    if (this.kind === 'bat') {
      // evasive: jink when in the player's sights
      if (P.aimDot(this.pos) > 0.995 && ahead > 30) { this.bx += (Math.random() < 0.5 ? -1 : 1) * 30 * dt * 10 * dt; this.by += rand(-1, 1) * 20 * dt; }
    }
    if (this.obj.userData.spinner) this.obj.rotation.z += dt * 4;
    if (ahead > 25 || this.pattern === 'tail') this.faceTarget(P.pos, dt, 4); else this.faceVelocity(dt);
    if (this.kind === 'bat') this.obj.rotateZ(Math.sin(this.t * 3) * 0.4);
    // fire
    this.fireT -= dt * g.diff.enemyFire;
    if (this.fireT <= 0 && !this.noFire && P.alive) {
      this.fireT = this.fireRate * rand(0.7, 1.3);
      const okRange = this.pattern === 'tail' ? (ahead < -8 && ahead > -90) : (ahead > 60 && ahead < 300);
      if (okRange) this.shootAt(P.pos, this.pattern === 'tail' ? 130 : 105, this.kind === 'bat' ? 'e1' : 'e0');
    }
  }
}

// Static ground / sea / rooftop turret (world-space)
export class Turret extends Enemy {
  constructor(g, obj, pos, o = {}) {
    super(g, 'turret', obj, { hp: Math.round(4 * g.diff.enemyHp), radius: 3.6, hits: 1, debrisColor: 0x6b6f7a, boom: 1.3, ...o });
    this.pos.copy(pos); this.prev.copy(pos); physics.teleportSensor(this.sensor, pos);
    this.range = o.range || 320; this.fireRate = o.fireRate || 2.4;
  }
  update(dt) {
    this.base(dt);
    const P = this.g.player;
    const head = this.obj.userData.head;
    const d = this.pos.distanceTo(P.pos);
    if (d < this.range + 80 && head) {
      tv.copy(P.pos); this.obj.worldToLocal(tv);
      const yaw = Math.atan2(tv.x, tv.z);
      head.rotation.y = damp(head.rotation.y, yaw, 5, dt);
      const pitch = Math.atan2(tv.y - 2, Math.hypot(tv.x, tv.z));
      this.obj.userData.barrel.rotation.x = damp(this.obj.userData.barrel.rotation.x, -pitch, 5, dt);
    }
    this.fireT -= dt * this.g.diff.enemyFire;
    if (this.fireT <= 0 && d < this.range && d > 30 && P.alive) {
      // only shoot things in front of the player in rail mode
      if (this.g.mode !== 'rail' || P.aimDot(this.pos) > 0.3) {
        this.fireT = this.fireRate * rand(0.8, 1.2);
        tv2.copy(this.pos).y += 3;
        this.g.enemyShoot(tv2, P.pos, 120, 'e0', 9, true);
      } else this.fireT = 0.4;
    }
    if (this.g.mode === 'rail' && this.g.player.s - this.s > 200) this.remove();
  }
}

export class Mine extends Enemy {
  constructor(g, pos, o = {}) {
    super(g, 'mine', M.buildMine(), { hp: 2, radius: 3, hits: 1, debrisColor: 0x444455, boom: 1.6, ...o });
    this.pos.copy(pos); this.prev.copy(pos); physics.teleportSensor(this.sensor, pos);
  }
  update(dt) {
    this.base(dt);
    this.obj.rotation.y += dt; this.obj.rotation.x += dt * 0.6;
    const c = this.obj.userData.core; c.scale.setScalar(1.1 + Math.sin(this.t * 8) * 0.25);
    const P = this.g.player;
    if (P.alive && this.pos.distanceTo(P.pos) < 6) { P.damage(16, 'mine'); this.kill('none'); }
    if (this.g.mode === 'rail' && P.s - this.s > 120) this.remove();
  }
  onKill() { // blast damages nearby enemies
    this.g.areaDamage(this.pos, 14, 3, 'player', this);
  }
}

export class Supply extends Enemy {
  constructor(g, pos, item) {
    super(g, 'supply', M.buildSupply(), { hp: 3, radius: 3, hits: 0, item, debrisColor: 0xffb020, boom: 1, counts: false, lockable: false });
    this.pos.copy(pos); this.prev.copy(pos); physics.teleportSensor(this.sensor, pos);
  }
  update(dt) { this.base(dt); this.obj.rotation.y += dt * 1.2; this.obj.position.y += Math.sin(this.t * 2) * 0.02; }
}

// Destructible obstacle (towers etc.) - also has a static collider for crashes
export class Obstacle extends Enemy {
  constructor(g, kind, obj, pos, o) {
    super(g, kind, obj, { hp: o.hp ?? 10, radius: o.radius ?? 4, hits: o.hits ?? 1, debrisColor: o.debrisColor ?? 0x999999, boom: o.boom ?? 2.2, noSensor: true, lockable: false, counts: o.counts ?? true });
    obj.position.copy(pos);
    this.colliders = (o.boxes || []).map((b) => physics.addStaticBox(b[0], b[1], b[2], b[3], b[4], b[5], this, b[6]));
  }
  update(dt) { this.base(dt); }
  hit(d, p, src) {
    if (this.indestructible) { if (p) fx.hitSpark(p, 0xffeeaa); audio.armorPing(this.g.panOf(this.pos)); return false; }
    return super.hit(d, p, src);
  }
  remove() { super.remove(); this.colliders.forEach((c) => physics.removeCollider(c)); }
  kill(src) {
    if (!this.alive) return;
    // topple: spawn several explosions along height
    const h = this.height || 30;
    for (let i = 0; i < 4; i++) fx.explode(tv.copy(this.obj.position).setY(this.obj.position.y + h * (i / 4 + 0.15)), 1.6, this.debrisColor, 5, this.g.root);
    super.kill(src);
  }
}

// =====================================================================
// All-range dogfighter AI (enemies + aces)
// =====================================================================
export class Dogfighter extends Enemy {
  constructor(g, kind, obj, pos, o = {}) {
    super(g, kind, obj, o);
    this.pos.copy(pos); this.prev.copy(pos);
    if (this.sensor) physics.teleportSensor(this.sensor, pos);
    this.speed = o.speed || 62; this.turn = o.turn || 1.3; this.fireRate = o.fireRate || 2.8;
    this.fwd = V().set(rand(-1, 1), rand(-0.2, 0.2), rand(-1, 1)).normalize();
    this.state = 'attack'; this.stateT = 0; this.target = null; this.jink = V();
    this.ace = o.ace || null; this.wave = o.wave || 0;
    this.trail = new Trail(g.root, o.trailColor || 0xff6644, 16, 0.5);
  }
  pickTarget() {
    const g = this.g;
    const opts = [g.player];
    for (const w of g.wingmen) if (w.state === 'formation' && w.alive) opts.push(w);
    // mostly target the player
    this.target = Math.random() < (this.ace ? 0.55 : 0.75) ? g.player : pick(opts);
  }
  update(dt) {
    const g = this.g, P = g.player;
    if (!this.target || (this.target !== P && (this.target.state !== 'formation'))) this.pickTarget();
    this.stateT -= dt;
    const tgt = this.target === P ? P.pos : this.target.pos;
    const toT = (this._toT || (this._toT = V())).subVectors(tgt, this.pos);
    const dist = toT.length();
    // being chased by the player? evade
    tv2.subVectors(this.pos, P.pos);
    const behindMe = tv2.length() < 160 && P.forward.dot(tv2.clone().normalize()) > 0.93;
    if (this.state === 'attack' && behindMe && this.stateT <= 0 && Math.random() < dt * (this.ace ? 1.5 : 0.8)) {
      this.state = 'evade'; this.stateT = rand(1.5, 2.8); this.jink.set(rand(-1, 1), rand(-0.6, 0.6), rand(-1, 1)).normalize();
    }
    if (this.state === 'evade' && this.stateT <= 0) { this.state = 'attack'; this.stateT = 2; }
    if (this.state === 'attack' && dist < 55) {
      // break off: veer sideways/up instead of flying through the target
      this.state = 'pass'; this.stateT = 1.6;
      const side = (this._side || (this._side = V())).crossVectors(this.fwd, UP).normalize().multiplyScalar(Math.random() < 0.5 ? -1 : 1);
      this.fwd.addScaledVector(side, 1.2).add(V(0, rand(-0.3, 0.6), 0)).normalize();
    }
    if (this.state === 'pass' && this.stateT <= 0) { this.state = 'attack'; this.stateT = 1; }
    // keep inside the arena
    let desired;
    if (this.pos.length() > g.arena * 0.95) desired = tv2.copy(this.pos).multiplyScalar(-1).normalize();
    else if (this.state === 'evade') desired = tv2.copy(this.jink).add(this.fwd).normalize();
    else if (this.state === 'pass') desired = tv2.copy(this.fwd);
    else {
      const lead = dist / 150;
      const tvel = this.target === P ? P.vel : this.target.vel || V();
      desired = tv2.copy(tgt).addScaledVector(tvel, lead).sub(this.pos).normalize();
    }
    // avoid big rocks crudely
    const turn = this.turn * (this.state === 'evade' ? 1.6 : 1);
    this.fwd.lerp(desired, 1 - Math.exp(-turn * dt)).normalize();
    const spd = this.speed * (this.state === 'evade' ? 1.3 : 1);
    this.pos.addScaledVector(this.fwd, spd * dt);
    // orientation with bank
    const before = this.obj.quaternion.clone();
    tm.lookAt(tv.copy(this.pos).add(this.fwd), this.pos, UP); tq.setFromRotationMatrix(tm);
    this.obj.quaternion.slerp(tq, 1 - Math.exp(-8 * dt));
    const bank = clamp(desired.clone().cross(this.fwd).y * 6, -1.2, 1.2);
    const body = this.obj.userData.body || this.obj.children[0];
    if (body) body.rotation.z = damp(body.rotation.z, bank, 4, dt);
    this.base(dt);
    this.trail.update(this.pos, tv.set(0, 1, 0).applyQuaternion(this.obj.quaternion).cross(this.fwd).normalize(), 0.6);
    // fire
    this.fireT -= dt * g.diff.enemyFire;
    if (this.fireT <= 0 && this.state === 'attack' && dist < 300 && dist > 25) {
      const ang = this.fwd.dot(toT.clone().normalize());
      if (ang > 0.95) {
        this.fireT = this.fireRate * rand(0.7, 1.2);
        if (this.target === P) this.shootAt(P.pos, 150, this.ace ? 'e1' : 'e0', this.ace ? 10 : 8);
        else { this.g.enemyShoot(this.pos, this.target.pos, 150, 'e0', 0, true); if (Math.random() < 0.35) this.target.damage && this.target.damage(this.ace ? 3 : 1.5, this); }
      }
    }
  }
  hit(d, p, src) {
    const r = super.hit(d, p, src);
    if (this.ace && this.alive) this.ace.onHit(this);
    return r;
  }
  onKill(src) { if (this.ace) this.ace.onDown(this); }
}

// =====================================================================
// Wingmen
// =====================================================================
const SLOTS = { hopper: [-24, 9, 78], brock: [26, 4, 64], nova: [4, 18, 98] };
export class Wingman {
  constructor(g, id) {
    this.g = g; this.id = id; this.c = CAST[id];
    this.obj = M.buildFighter(this.c.ship); this.obj.scale.setScalar(0.95);
    g.root.add(this.obj);
    this.pos = this.obj.position; this.vel = V(); this.prev = V();
    this.hp = g.team[id].hp; this.alive = this.hp > 0; this.state = this.alive ? 'formation' : 'gone';
    this.rs = 0; this.ox = SLOTS[id][0]; this.oy = SLOTS[id][1];
    this.fireT = rand(1, 3); this.complainT = 0; this.t = rand(0, 10);
    this.fwd = V(0, 0, 1);
    this.sensor = physics.addSensor(this, 3.2, G.FRIEND);
    this.trailL = new Trail(g.root, 0xffffff, 14, 0.25); this.trailR = new Trail(g.root, 0xffffff, 14, 0.25);
    this.obj.visible = this.alive;
    this.isFriend = true;
  }
  damage(n, src) {
    if (!this.alive || this.state === 'gone') return;
    this.hp = Math.max(0, this.hp - n);
    this.g.team[this.id].hp = this.hp;
    fx.hitSpark(this.pos, 0xffcc66);
    if (this.hp <= 0) {
      this.state = 'leaving'; this.leaveT = 3;
      this.g.radio(this.id, pick(['I\'m hit bad! Heading back for repairs!', 'Systems failing... I have to pull out!']), { priority: true });
      fx.explode(this.pos, 0.6, 0x999999, 3, this.g.root);
    }
  }
  hitByPlayer(n) {
    this.damage(n, 'player');
    if (this.complainT <= 0 && this.hp > 0) {
      this.complainT = 6;
      this.g.radio(this.id, pick(['Hey! Watch your fire, Kit!', 'Friendly fire! I\'m on your side!', 'Ow! Aim at THEM!']));
    }
  }
  update(dt) {
    const g = this.g, P = g.player;
    this.t += dt; this.complainT -= dt;
    if (this.state === 'gone') { this.obj.visible = false; return; }
    this.prev.copy(this.pos);
    if (g.mode === 'rail') {
      const sl = SLOTS[this.id];
      if (this.state === 'formation') {
        this.rs = damp(this.rs || P.s + sl[2], P.s + sl[2] + Math.sin(this.t * 0.4) * 8, 2, dt);
        this.ox = damp(this.ox, sl[0] + Math.sin(this.t * 0.7) * 5, 1.5, dt);
        this.oy = damp(this.oy, sl[1] + Math.sin(this.t * 0.9) * 3, 1.5, dt);
      } else if (this.state === 'rescue') {
        this.rescueT -= dt;
        this.rs = damp(this.rs, P.s + 75 + Math.sin(this.t * 0.8) * 12, 2, dt);
        this.ox = damp(this.ox, Math.sin(this.t * 1.1) * 18, 2, dt);
        this.oy = damp(this.oy, 8 + Math.sin(this.t * 1.7) * 5, 2, dt);
      } else if (this.state === 'leaving') {
        this.leaveT -= dt; this.rs += (P.speed + 60) * dt; this.oy += 30 * dt;
        if (this.leaveT <= 0) { this.state = 'gone'; this.alive = false; this.obj.visible = false; physics.removeSensor(this.sensor); }
      }
      g.rail.pos(this.rs, this.ox, this.oy, this.pos);
      const f = g.rail.frame(this.rs, {});
      this.fwd.copy(f.t);
      tm.makeBasis(tv.copy(f.r).negate(), f.u, f.t); this.obj.quaternion.setFromRotationMatrix(tm);
      const vx = (this.ox - (this._pox ?? this.ox)) / Math.max(dt, 1e-4); this._pox = this.ox;
      this.obj.userData.body.rotation.z = damp(this.obj.userData.body.rotation.z, clamp(vx * 0.05, -0.8, 0.8), 4, dt);
    } else {
      // all-range: fly around, chase nearest enemy, stay near the player
      if (this.state === 'leaving') {
        this.leaveT -= dt; this.pos.addScaledVector(this.fwd, 120 * dt); this.pos.y += 20 * dt;
        if (this.leaveT <= 0) { this.state = 'gone'; this.alive = false; this.obj.visible = false; physics.removeSensor(this.sensor); }
      } else {
        let target = null, best = 1e9;
        for (const e of g.enemies) { if (!e.alive || !e.isEnemy || e.kind === 'missile') continue; const d = e.pos.distanceToSquared(this.pos); if (d < best) { best = d; target = e; } }
        const toP = tv.subVectors(P.pos, this.pos);
        let desired;
        if (this.state === 'rescue') desired = tv2.set(Math.sin(this.t * 0.6), Math.sin(this.t * 0.9) * 0.3, Math.cos(this.t * 0.6)).normalize();
        else if (toP.length() > 350 || !target) desired = tv2.copy(toP).addScaledVector(P.forward, 60).normalize();
        else desired = tv2.subVectors(target.pos, this.pos).normalize();
        if (this.pos.length() > g.arena * 0.9) desired.copy(this.pos).multiplyScalar(-1).normalize();
        this.fwd.lerp(desired, 1 - Math.exp(-1.6 * dt)).normalize();
        this.pos.addScaledVector(this.fwd, 70 * dt);
        if (this.state === 'rescue') this.rescueT -= dt;
        tm.lookAt(tv.copy(this.pos).add(this.fwd), this.pos, UP); tq.setFromRotationMatrix(tm);
        this.obj.quaternion.slerp(tq, 1 - Math.exp(-6 * dt));
        if (target && this.state === 'formation') this.tryFire(dt, target);
      }
    }
    this.vel.subVectors(this.pos, this.prev).divideScalar(Math.max(dt, 1e-4));
    if (this.sensor && this.state !== 'gone') physics.moveSensor(this.sensor, this.pos);
    const ud = this.obj.userData;
    const up = tv.set(0, 1, 0).applyQuaternion(this.obj.quaternion);
    this.trailL.update(ud.tipL.getWorldPosition(tv2), up, 0.35);
    this.trailR.update(ud.tipR.getWorldPosition(tv2), up, 0.35);
    if (g.mode === 'rail' && this.state === 'formation') {
      // shoot enemies straight ahead occasionally
      let tgt = null;
      for (const e of g.enemies) if (e.alive && e.isEnemy && e.rs !== undefined && e.rs - this.rs > 30 && e.rs - this.rs < 220 && Math.abs(e.ox - this.ox) < 25) { tgt = e; break; }
      if (tgt) this.tryFire(dt, tgt);
    }
  }
  tryFire(dt, target) {
    this.fireT -= dt;
    if (this.fireT > 0) return;
    this.fireT = rand(1.2, 2.6);
    this.g.friendShoot(this.pos, target);
  }
}

// =====================================================================
// Items
// =====================================================================
export class Item {
  constructor(g, kind, pos, o = {}) {
    this.g = g; this.kind = kind; this.alive = true; this.t = rand(0, 6);
    const B = { ring: () => M.buildRing(false), goldRing: () => M.buildRing(true), bomb: M.buildBombItem, laser: M.buildLaserItem, oneUp: M.buildOneUp };
    this.obj = B[kind](); this.obj.position.copy(pos); this.pos = this.obj.position;
    this.radius = kind === 'ring' || kind === 'goldRing' ? 4.2 : 3.6;
    g.root.add(this.obj);
    this.s = o.s; this.dropped = !!o.dropped;
    if (o.quat) this.obj.quaternion.copy(o.quat);
    this.baseY = pos.y;
  }
  update(dt) {
    const g = this.g, P = g.player;
    this.t += dt;
    if (this.kind === 'ring' || this.kind === 'goldRing') {
      this.obj.children[1].rotation.z += dt * 2;
      if (g.mode !== 'rail') this.obj.rotation.y += dt * 0.8;
    } else {
      this.obj.rotation.y += dt * 2.2;
      this.pos.y = this.baseY + Math.sin(this.t * 2.5) * 0.6;
    }
    if (this.dropped && g.mode === 'rail') {
      // drift toward the player's rail position so drops are collectable
      this.pos.lerp(tv.copy(P.pos).addScaledVector(P.railT || P.forward, 40), 1 - Math.exp(-0.8 * dt));
    }
    if (P.alive && this.pos.distanceTo(P.pos) < this.radius + 2.6) { this.collect(); }
    if (g.mode === 'rail' && this.s !== undefined && P.s - this.s > 80) this.remove();
  }
  collect() {
    const g = this.g, P = g.player;
    switch (this.kind) {
      case 'ring': P.heal(25); audio.ring(false); g.toast('+ SHIELD', 'silver'); break;
      case 'goldRing': P.heal(50); P.goldRings++; audio.ring(true);
        if (P.goldRings >= 3) { P.goldRings = 0; if (P.maxShield < 160) { P.maxShield = 160; P.shield = 160; g.toast('SHIELD EXTENDED!', 'gold'); } else { g.addLife(); } }
        else g.toast(`GOLD RING ${P.goldRings}/3`, 'gold');
        break;
      case 'bomb': P.bombs = Math.min(9, P.bombs + 1); audio.powerUp(); g.toast('+1 SMART BOMB', 'red'); break;
      case 'laser': P.upgradeLaser(); audio.powerUp(); break;
      case 'oneUp': g.addLife(); break;
    }
    fx.ring(this.pos, 8, this.kind === 'goldRing' ? 0xffcc44 : 0xaaddff, 0.4);
    g.stats.items++;
    this.remove();
  }
  remove() { this.alive = false; this.obj.parent && this.obj.parent.remove(this.obj); }
}

// =====================================================================
// Projectiles
// =====================================================================
export class Projectiles {
  constructor(g) { this.g = g; this.list = []; this.pools = {}; }
  _mesh(kind) { const p = this.pools[kind]; const m = (p && p.pop()) || makeBoltMesh(kind); m.visible = true; this.g.root.add(m); return m; }
  _free(b) { b.mesh.visible = false; this.g.root.remove(b.mesh); (this.pools[b.kind] || (this.pools[b.kind] = [])).push(b.mesh); }
  add(o) {
    const b = { kind: o.kind, pos: o.pos.clone(), vel: o.vel.clone(), life: o.life ?? 2, owner: o.owner, dmg: o.dmg ?? 1, target: o.target || null, t: 0, prev: o.pos.clone(), mesh: this._mesh(o.kind), radius: o.radius ?? 2.2, aoe: o.aoe || 0 };
    b.mesh.position.copy(b.pos);
    b.mesh.lookAt(tv.copy(b.pos).add(b.vel));
    this.list.push(b);
    return b;
  }
  _kill(b) { if (b.gone) return; b.gone = true; this._free(b); }
  clear() { for (const b of this.list) this._kill(b); this.list.length = 0; }
  update(dt) {
    const g = this.g, P = g.player;
    // iterate a snapshot: bombs and deaths may remove other projectiles mid-loop
    for (const b of this.list.slice()) {
      if (b.gone) continue;
      b.t += dt; b.life -= dt;
      b.prev.copy(b.pos);
      // homing
      if (b.target && b.target.alive) {
        const want = tv.subVectors(b.target.pos, b.pos).normalize().multiplyScalar(b.vel.length());
        b.vel.lerp(want, 1 - Math.exp(-(b.kind === 'charge' ? 7 : 3) * dt));
      } else if (b.assist && g.settings.aimAssist) {
        const t = b.assist; if (t.alive) { const want = tv.subVectors(t.pos, b.pos).normalize().multiplyScalar(b.vel.length()); b.vel.lerp(want, 1 - Math.exp(-4 * dt)); }
      }
      b.pos.addScaledVector(b.vel, dt);
      b.mesh.position.copy(b.pos);
      if (b.kind !== 'e0' && b.kind !== 'eBig') b.mesh.lookAt(tv.copy(b.pos).add(b.vel));
      if (b.kind === 'charge' || b.kind === 'bomb') { b.mesh.children[1].rotation.z += dt * 10; b.mesh.rotation.z += dt * 5; }
      let dead = b.life <= 0;
      if (b.owner === 'player' || b.owner === 'friend') {
        const hit = physics.raySegment(b.prev, b.pos, G.PSHOT, G.STATIC | G.ENEMY | G.ROCK | (b.owner === 'player' ? G.FRIEND : 0));
        if (hit) {
          const o = hit.owner;
          if (b.aoe && !(o && o.isFriend)) { b.pos.copy(hit.point); this.detonate(b); dead = true; }
          else if (b.aoe) { /* pass through wingmen */ }
          else {
            if (o && o.isEnemy) { if (b.owner === 'player' && !o.indestructible) g.stats.shotsHit++; o.hit(b.dmg, hit.point, b.owner === 'player' ? 'player' : 'friend'); }
            else if (o && o.isFriend) { if (b.owner === 'player') o.hitByPlayer(2); }
            else if (o && o.kind === 'rock') { g.hitRock(o, b.dmg, hit.point, b.vel); }
            else if (o && o.isBossPart) { if (b.owner === 'player') g.stats.shotsHit++; o.hit(b.dmg, hit.point, b.owner); }
            else { fx.hitSpark(hit.point, 0xffeeaa); audio.armorPing(g.panOf(hit.point)); }
            dead = true;
          }
        }
        if (b.life <= 0 && (b.kind === 'bomb' || b.kind === 'charge') && !b.detonated) { this.detonate(b); dead = true; }
      } else {
        // enemy shot vs player (segment-point distance)
        if (P.alive) {
          const d = segPointDist(b.prev, b.pos, P.pos);
          if (d < b.radius + 1.8) {
            if (P.rolling()) {
              // deflect back at the shooter area: becomes a player shot
              audio.deflect(g.panOf(b.pos));
              fx.hitSpark(b.pos, 0x88ffff);
              b.owner = 'player'; b.vel.negate().multiplyScalar(1.6).add(tv.set(rand(-10, 10), rand(-10, 10), 0)); b.life = 1.2; b.dmg = 2;
              g.stats.deflects++;
              continue;
            } else if (P.invuln <= 0) {
              P.damage(b.dmg, 'shot'); dead = true;
            }
          }
        }
        if (!dead && b.t > 0.05 && g.mode === 'rail') {
          const hit = physics.raySegment(b.prev, b.pos, G.ESHOT, G.STATIC);
          if (hit && !(hit.owner && hit.owner.isBossHull)) { fx.hitSpark(hit.point, 0xff8866); dead = true; }
        }
      }
      if (dead) this._kill(b);
    }
    this.list = this.list.filter((b) => !b.gone);
  }
  detonate(b) {
    const g = this.g;
    if (b.detonated) return;
    b.detonated = true;
    if (b.kind === 'bomb') {
      g.bombBlast(b.pos);
    } else {
      fx.explode(b.pos, 1.6, 0x88ff66, 0, g.root);
      fx.ring(b.pos, 18, 0xccff88, 0.5);
      audio.explosion(1.5, g.panOf(b.pos));
      g.areaDamage(b.pos, b.aoe, b.dmg, 'player', null, true);
    }
  }
  detonateBombs() {
    let any = false;
    for (const b of this.list.slice()) { if (b.kind === 'bomb' && !b.gone) { this.detonate(b); this._kill(b); any = true; } }
    this.list = this.list.filter((b) => !b.gone);
    return any;
  }
  hasBomb() { return this.list.some((b) => b.kind === 'bomb' && !b.gone); }
  clearEnemyShots(pos, r) {
    for (const b of this.list) if (!b.gone && b.owner === 'enemy' && b.pos.distanceTo(pos) < r) { fx.flash(b.pos, 1.5, 0xff8866); this._kill(b); }
  }
}
function segPointDist(a, b, p) {
  const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
  const apx = p.x - a.x, apy = p.y - a.y, apz = p.z - a.z;
  const l2 = abx * abx + aby * aby + abz * abz;
  const t = l2 > 0 ? clamp((apx * abx + apy * aby + apz * abz) / l2, 0, 1) : 0;
  const dx = a.x + abx * t - p.x, dy = a.y + aby * t - p.y, dz = a.z + abz * t - p.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// =====================================================================
// Homing missile (shootable)
// =====================================================================
export class Missile extends Enemy {
  constructor(g, pos, dir) {
    super(g, 'missile', makeBoltMesh('missile'), { hp: 1, radius: 2.2, hits: 1, debrisColor: 0xdddddd, boom: 0.7, counts: false });
    this.pos.copy(pos); this.prev.copy(pos); this.dir = dir.clone().normalize(); this.speed = 70;
    physics.teleportSensor(this.sensor, pos);
    this.trail = new Trail(g.root, 0xffaa66, 20, 0.6);
  }
  update(dt) {
    const P = this.g.player;
    const want = tv.copy(P.pos).addScaledVector(P.vel, 0.3).sub(this.pos).normalize();
    if (this.t > 0.4) this.dir.lerp(want, 1 - Math.exp(-1.5 * dt)).normalize();
    this.speed = Math.min(150, this.speed + 50 * dt);
    this.pos.addScaledVector(this.dir, this.speed * dt);
    // follow rail motion so the player can't just out-run it
    this.obj.lookAt(tv.copy(this.pos).add(this.dir));
    this.base(dt);
    this.trail.update(this.pos, tv2.crossVectors(this.dir, UP).normalize(), 1);
    if (P.alive && this.pos.distanceTo(P.pos) < 3.5) {
      if (P.rolling()) { audio.deflect(); this.kill('player'); return; }
      P.damage(14, 'missile'); this.kill('none'); return;
    }
    if (this.t > 9) this.kill('none');
  }
}

// =====================================================================
// Boss parts + bosses
// =====================================================================
class BossPart {
  constructor(boss, name, obj, hp, radius, offset = null) {
    this.boss = boss; this.name = name; this.obj = obj; this.hp = hp; this.maxHp = hp; this.radius = radius;
    this.alive = true; this.vulnerable = true; this.isBossPart = true; this.lockable = true; this.offset = offset;
    this.pos = V(); this.sensor = physics.addSensor(this, radius, G.ENEMY);
    this.meshes = []; obj.traverse((m) => { if (m.isMesh) this.meshes.push([m, m.material]); });
    this.flashT = 0;
  }
  sync(dt) {
    if (this.offset) this.obj.localToWorld(this.pos.copy(this.offset)); else this.obj.getWorldPosition(this.pos);
    if (this.sensor) physics.moveSensor(this.sensor, this.pos);
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) for (const [m, mat] of this.meshes) m.material = mat; }
  }
  hit(d, point, src) {
    if (!this.alive) return;
    if (!this.vulnerable) { fx.hitSpark(point || this.pos, 0xaaaaff); audio.armorPing(); return; }
    this.hp -= d;
    this.flashT = 0.06; for (const [m] of this.meshes) m.material = WHITE;
    audio.enemyHit(); if (point) fx.hitSpark(point);
    this.boss.onPartHit(this, d);
    if (this.hp <= 0) { this.hp = 0; this.alive = false; physics.removeSensor(this.sensor); this.sensor = null; for (const [m, mat] of this.meshes) m.material = mat; this.boss.onPartDestroyed(this, src); }
  }
  remove() { if (this.sensor) { physics.removeSensor(this.sensor); this.sensor = null; } }
}

export class StriderBoss {
  constructor(g) {
    this.g = g; this.name = 'GRANITE STRIDER'; this.subtitle = 'Siege Legion assault walker';
    this.obj = M.buildStrider(); g.root.add(this.obj);
    const u = this.obj.userData;
    const hpMul = g.diff.enemyHp;
    this.parts = [
      new BossPart(this, 'Cannon Arm', u.armL, Math.round(30 * hpMul), 6, new THREE.Vector3(0, -2, 8)),
      new BossPart(this, 'Missile Pod', u.armR, Math.round(30 * hpMul), 6, new THREE.Vector3(0, 1, 5)),
      new BossPart(this, 'Core', u.core, Math.round(50 * hpMul), 4.5),
    ];
    this.core = this.parts[2]; this.core.vulnerable = false;
    this.totalMax = this.parts.reduce((a, p) => a + p.maxHp, 0);
    this.alive = true; this.t = 0; this.phase = 1; this.rs = g.player.s + 150; this.isBoss = true;
    this.fireT = 3; this.missileT = 5; this.hatchT = 0; this.hatchOpen = false; this.stompT = 8;
    this.pos = this.obj.position;
    this.hull = physics.addSensorBox({ isBossHull: true, boss: this }, 11, 9, 8, G.STATIC);
    g.stats.spawned += 10;
  }
  get hpFrac() { return this.parts.reduce((a, p) => a + Math.max(0, p.hp), 0) / this.totalMax; }
  update(dt) {
    const g = this.g, P = g.player, u = this.obj.userData;
    this.t += dt;
    // keep ahead of the player on the boss circle, facing back
    this.rs = damp(this.rs, P.s + 130 + Math.sin(this.t * 0.3) * 20, 1.2, dt);
    const f = g.rail.frame(this.rs, {});
    this.pos.copy(f.p).addScaledVector(f.r, Math.sin(this.t * 0.4) * 10); this.pos.y = 1;
    this.obj.lookAt(tv.copy(this.pos).sub(f.t));
    // walk cycle (procedural)
    const w = this.t * 2.6;
    u.legs.forEach((L, i) => {
      const ph = w + i * Math.PI;
      L.thigh.rotation.x = Math.sin(ph) * 0.35;
      L.shin.rotation.x = Math.max(0, -Math.cos(ph)) * 0.6;
      L.foot.rotation.x = -Math.sin(ph) * 0.2;
    });
    u.hips.position.y = 34 + Math.abs(Math.sin(w)) * 1.5;
    u.torso.rotation.y = Math.sin(this.t * 0.8) * 0.12;
    if (this.parts[0].alive) u.armL.rotation.x = -0.15 + Math.sin(this.t * 1.3) * 0.15;
    if (this.parts[1].alive) u.armR.rotation.x = -0.25 + Math.sin(this.t * 1.1) * 0.1;
    u.eye.scale.x = 1 + Math.sin(this.t * 6) * 0.1;
    this.parts.forEach((p) => p.alive && p.sync(dt));
    tv.copy(this.pos); tv.y += 40;
    physics.moveSensor(this.hull, tv);
    // attacks
    const fire = g.diff.enemyFire;
    if (this.parts[0].alive) {
      this.fireT -= dt * fire;
      if (this.fireT <= 0) {
        this.fireT = 2.6;
        for (let i = 0; i < 3; i++) setTimeout(() => { if (this.parts[0].alive && g.player.alive) g.enemyShoot(this.parts[0].pos, g.player.pos, 140, 'e1', 10, true); }, i * 160);
      }
    }
    if (this.parts[1].alive) {
      this.missileT -= dt * fire;
      if (this.missileT <= 0) {
        this.missileT = 6;
        for (let i = 0; i < 4; i++) {
          const m = new Missile(g, this.parts[1].pos.clone().add(tv.set(rand(-3, 3), 3, rand(-2, 2))), tv2.set(rand(-0.6, 0.6), 1, 0).applyQuaternion(this.obj.quaternion).add(tv.set(0, 0.8, 0)));
          g.enemies.push(m);
        }
        g.radio('hopper', 'Missiles! Shoot them down or roll!', { minGap: 10 });
      }
    }
    if (this.phase === 2) {
      this.hatchT -= dt;
      if (this.hatchT <= 0) { this.hatchOpen = !this.hatchOpen; this.hatchT = this.hatchOpen ? 4.5 : 3; if (this.hatchOpen) g.radio('hopper', 'The core is open! Hit it now!', { minGap: 14 }); }
      this.core.vulnerable = this.hatchOpen;
      u.coreHatch.position.y = damp(u.coreHatch.position.y, this.hatchOpen ? 12 : 6, 6, dt);
      u.core.scale.setScalar(this.hatchOpen ? 1 + Math.sin(this.t * 10) * 0.1 : 0.8);
      this.fireT -= dt * fire;
      if (this.fireT <= 0) {
        this.fireT = 1.8;
        // fan of big plasma orbs from the eye
        u.eye.getWorldPosition(tv2);
        const toP = tv.subVectors(P.pos, tv2).normalize();
        const side = tv.clone().cross(UP).normalize();
        for (let i = -2; i <= 2; i++) g.enemyShootDir(tv2, toP.clone().addScaledVector(side, i * 0.12), 95, 'eBig', 12);
      }
      this.stompT -= dt;
      if (this.stompT <= 0) {
        this.stompT = 7;
        g.shockwave(this.pos.clone(), 16);
      }
    }
  }
  onPartHit(p) { this.g.ui.bossBar(this); }
  onPartDestroyed(p) {
    const g = this.g;
    fx.explode(p.pos, 3, 0x8a8f9e, 10, g.root); audio.explosion(3);
    g.addHits(5, p.pos);
    if (p !== this.core) {
      // detach the arm as physical debris
      const arm = p.obj; const wp = V(); arm.getWorldPosition(wp);
      const wq = new THREE.Quaternion(); arm.getWorldQuaternion(wq);
      arm.parent.remove(arm); arm.quaternion.copy(wq); arm.scale.setScalar(1);
      physics.spawnDebris(arm, wp, V().set(rand(-10, 10), 15, rand(-10, 10)), g.root, { life: 8, size: 4, spin: 2 });
      g.radio('hopper', p.name === 'Cannon Arm' ? 'Its cannon arm is gone!' : 'Missile pod destroyed!');
      if (!this.parts[0].alive && !this.parts[1].alive) {
        this.phase = 2; this.hatchT = 1.5; this.fireT = 3;
        g.radio('brock', 'It\'s exposing its core. Stay on it, and watch the stomp!', { priority: true });
      }
    } else {
      this.die();
    }
    g.ui.bossBar(this);
  }
  die() {
    this.alive = false;
    this.parts.forEach((p) => p.remove());
    physics.removeSensor(this.hull);
    this.g.bossDefeated(this);
    const g = this.g;
    let n = 0;
    const iv = setInterval(() => {
      if (!this.obj.parent) { clearInterval(iv); return; }
      fx.explode(tv.copy(this.pos).add(V().set(rand(-12, 12), rand(10, 50), rand(-10, 10))), 2.5, 0x8a8f9e, 6, g.root);
      audio.explosion(2.5);
      if (++n > 14) {
        clearInterval(iv);
        fx.explode(tv.copy(this.pos).setY(30), 6, 0x3a3d4a, 20, g.root);
        audio.bigExplosion();
        this.obj.parent && this.obj.parent.remove(this.obj);
      }
    }, 150);
  }
  remove() { this.parts.forEach((p) => p.remove()); if (this.hull) physics.removeSensor(this.hull); this.obj.parent && this.obj.parent.remove(this.obj); }
  targets() { return this.parts.filter((p) => p.alive && p.vulnerable); }
}

export class CarrierBoss {
  constructor(g) {
    this.g = g; this.name = 'DREAD CARRIER'; this.subtitle = 'Siege Legion flagship';
    this.obj = M.buildCarrier(); g.root.add(this.obj);
    const u = this.obj.userData;
    const hpMul = g.diff.enemyHp;
    this.parts = u.turrets.map((t, i) => new BossPart(this, 'Turret ' + (i + 1), t, Math.round(18 * hpMul), 4.5, new THREE.Vector3(0, 2.2, 0)));
    this.coreP = new BossPart(this, 'Reactor', u.core, Math.round(55 * hpMul), 7);
    this.coreP.vulnerable = false;
    this.parts.push(this.coreP);
    this.totalMax = this.parts.reduce((a, p) => a + p.maxHp, 0);
    this.alive = true; this.t = 0; this.phase = 1; this.isBoss = true;
    this.pos = this.obj.position; this.pos.set(0, 0, -200);
    this.angle = 0; this.launchT = 6; this.burstT = 4;
    this.turretFire = this.parts.map(() => rand(1, 3));
    this.hull = physics.addSensorBox({ isBossHull: true, boss: this }, 17, 8, 60, G.STATIC);
    physics.addSensorBox({ isBossHull: true, boss: this }, 20, 2, 30, G.STATIC, this.hull.body, new THREE.Vector3(0, -4, -20));
    g.stats.spawned += 10;
  }
  get hpFrac() { return this.parts.reduce((a, p) => a + Math.max(0, p.hp), 0) / this.totalMax; }
  update(dt) {
    const g = this.g, P = g.player, u = this.obj.userData;
    this.t += dt;
    this.angle += dt * 0.035;
    const R = 260;
    this.pos.set(Math.cos(this.angle) * R, Math.sin(this.t * 0.2) * 20, Math.sin(this.angle) * R);
    this.obj.lookAt(tv.set(Math.cos(this.angle + 0.1) * R, this.pos.y, Math.sin(this.angle + 0.1) * R));
    this.obj.rotateZ(Math.sin(this.t * 0.3) * 0.05);
    u.engines.forEach((e, i) => e.scale.set(1, 1, 1.6 + Math.sin(this.t * 20 + i) * 0.3));
    this.parts.forEach((p) => p.alive && p.sync(dt));
    physics.moveSensor(this.hull, this.pos, this.obj.quaternion);
    // turrets track + fire
    this.parts.forEach((p, i) => {
      if (p === this.coreP || !p.alive) return;
      const head = p.obj.userData.head;
      tv.copy(P.pos); p.obj.worldToLocal(tv);
      head.rotation.y = Math.atan2(tv.x, tv.z);
      this.turretFire[i] -= dt * g.diff.enemyFire;
      if (this.turretFire[i] <= 0 && p.pos.distanceTo(P.pos) < 420) {
        this.turretFire[i] = rand(1.6, 2.6);
        g.enemyShoot(p.pos, P.pos, 150, 'e0', 9, true);
      }
    });
    // hangar launches fighters
    this.launchT -= dt;
    if (this.launchT <= 0 && g.enemies.filter((e) => e.alive && e.kind !== 'missile').length < 10) {
      this.launchT = this.phase === 1 ? 11 : 8;
      for (let i = 0; i < 2; i++) {
        u.hangar.getWorldPosition(tv2);
        g.spawnDogfighter('dart', tv2.clone().add(V().set(rand(-4, 4), rand(-2, 2), 0)));
      }
    }
    if (this.phase === 2) {
      u.coreShield.position.y = damp(u.coreShield.position.y, 24, 2, dt);
      u.core.scale.setScalar(1 + Math.sin(this.t * 8) * 0.12);
      this.burstT -= dt * g.diff.enemyFire;
      if (this.burstT <= 0) {
        this.burstT = 3.2;
        // radial ring of plasma from the reactor + aimed shot
        for (let i = 0; i < 14; i++) {
          const a = i / 14 * Math.PI * 2 + this.t;
          g.enemyShootDir(this.coreP.pos, V().set(Math.cos(a), rand(-0.3, 0.5), Math.sin(a)), 80, 'eBig', 10);
        }
        g.enemyShoot(this.coreP.pos, P.pos, 140, 'e1', 12, true);
      }
    }
  }
  onPartHit() { this.g.ui.bossBar(this); }
  onPartDestroyed(p) {
    const g = this.g;
    fx.explode(p.pos, 2.5, 0x6b6f7a, 8, g.root); audio.explosion(2.5);
    g.addHits(4, p.pos);
    if (p !== this.coreP) {
      p.obj.visible = false;
      const left = this.parts.filter((q) => q !== this.coreP && q.alive).length;
      if (left > 0) g.radio(pick(['hopper', 'nova', 'brock']), `Turret down! ${left} to go.`);
      else { this.phase = 2; this.coreP.vulnerable = true; g.radio('hopper', 'All turrets down! The reactor shield is opening. Hit the core!', { priority: true }); }
    } else this.die();
    g.ui.bossBar(this);
  }
  die() {
    this.alive = false;
    this.parts.forEach((p) => p.remove());
    physics.removeSensor(this.hull);
    const g = this.g;
    g.bossDefeated(this);
    let n = 0;
    const iv = setInterval(() => {
      if (!this.obj.parent) { clearInterval(iv); return; }
      fx.explode(tv.copy(this.pos).add(V().set(rand(-18, 18), rand(-6, 16), rand(-60, 60))), 3, 0x5c6378, 6, g.root);
      audio.explosion(3);
      if (++n > 20) {
        clearInterval(iv);
        fx.explode(this.pos, 8, 0x2a2d3a, 24, g.root); audio.bigExplosion();
        this.obj.parent && this.obj.parent.remove(this.obj);
      }
    }, 140);
  }
  remove() { this.parts.forEach((p) => p.remove()); if (this.hull) physics.removeSensor(this.hull); this.obj.parent && this.obj.parent.remove(this.obj); }
  targets() { return this.parts.filter((p) => p.alive && p.vulnerable); }
}
