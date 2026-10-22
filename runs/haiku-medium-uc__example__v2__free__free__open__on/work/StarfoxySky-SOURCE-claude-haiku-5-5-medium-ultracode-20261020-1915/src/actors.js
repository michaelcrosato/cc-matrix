// Gameplay actors. Entities carry data (pos, hp, radius, body) and a behaviour
// function; game.js owns damage rules, scoring and spawning.

import * as THREE from 'three/webgpu';
import { makeModel } from './models.js';

const _v = new THREE.Vector3();

// Common base for anything that can be hit by lasers, missiles or bombs.
export class Entity {
  constructor(game, { kind, group, pos, radius, hp = 1, score = 0, lockable = true, ownsGroup = true }) {
    this.g = game;
    this.kind = kind;
    this.group = group;
    this.pos = pos.clone();
    this.radius = radius;
    this.hp = hp;
    this.maxHp = hp;
    this.score = score;
    this.lockable = lockable;
    this.ownsGroup = ownsGroup;
    this.alive = true;
    this.flash = 0;
    this.t = 0;
    this.body = null;
    this.baseScale = group.scale.x;
    if (ownsGroup) {
      game.root.add(group);
      group.position.copy(this.pos);
    }
  }

  // Keeps the visual aligned with the simulated position and plays the hit pop.
  syncVisual(dt) {
    if (this.ownsGroup) this.group.position.copy(this.pos);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 6);
    this.group.scale.setScalar(this.baseScale * (1 + this.flash * 0.18));
  }

}

// Drone (Vrix), interceptor, turret, gunship and boss parts all use Enemy.
// `behave(e, dt, g)` moves the entity. `fire` = { every, shot(e, g) }.
export class Enemy extends Entity {
  constructor(game, cfg) {
    const group = cfg.group || makeModel(cfg.model);
    super(game, { ...cfg, group, ownsGroup: cfg.group === undefined });
    this.base = this.pos.clone();
    this.behave = cfg.behave;
    this.fire = cfg.fire || null;
    this.fireTimer = this.fire ? this.fire.first ?? 1 + Math.random() * 1.5 : 0;
    this.isBossPart = !!cfg.part;
    this.part = cfg.part || null;
    this.phase = Math.random() * Math.PI * 2;
    this.vars = cfg.vars || {};
    this.body = game.phys.addKinematic(this, this.radius);
  }

  update(dt) {
    this.t += dt;
    if (this.behave) this.behave(this, dt, this.g);
    if (!this.ownsGroup) this.group.getWorldPosition(this.pos);
    if (this.fire && this.alive) {
      this.fireTimer -= dt;
      if (this.fireTimer <= 0 && this.g.canFireAt(this)) {
        this.fireTimer = this.fire.every * (0.85 + Math.random() * 0.3);
        this.fire.shot(this, this.g);
      }
    }
    this.syncVisual(dt);
  }
}

// Asteroid: a dynamic Rapier body. Its pose comes from the physics world.
export class Rock extends Entity {
  constructor(game, model, pos, size, vel) {
    const group = makeModel(model);
    group.scale.setScalar(size);
    super(game, { kind: 'rock', group, pos, radius: size * 0.95, hp: size > 2.2 ? 3 : 1, score: size > 2.2 ? 150 : 60, lockable: true });
    this.size = size;
    this.body = game.phys.addDynamic(this, this.radius);
    this.body.setLinvel({ x: vel.x, y: vel.y, z: vel.z }, true);
    this.body.setAngvel({ x: Math.random() - 0.5, y: Math.random() - 0.5, z: Math.random() - 0.5 }, true);
  }

  update(dt) {
    this.t += dt;
    const t = this.body.translation();
    const r = this.body.rotation();
    this.pos.set(t.x, t.y, t.z);
    this.group.position.set(t.x, t.y, t.z);
    this.group.quaternion.set(r.x, r.y, r.z, r.w);
    this.syncVisual(dt);
    // Rocks never fly forever: pull them back toward their lane gently.
    if (this.pos.y > 30 || this.pos.y < -30) {
      const lv = this.body.linvel();
      this.body.setLinvel({ x: lv.x, y: lv.y * 0.8, z: lv.z }, true);
    }
  }
}

// Pickups float in place and are collected by proximity to the ship.
export class Pickup extends Entity {
  constructor(game, type, pos) {
    const model = type === 'ring' ? 'ring' : type === 'heal' ? 'heal' : 'bomb';
    super(game, { kind: 'pickup', group: makeModel(model), pos, radius: type === 'ring' ? 3.2 : 2.6, lockable: false });
    this.type = type;
    this.base = pos.clone();
  }

  update(dt) {
    this.t += dt;
    this.group.rotation.y += dt * 2.4;
    this.pos.set(this.base.x, this.base.y + Math.sin(this.t * 2.2) * 0.6, this.base.z);
    this.group.position.copy(this.pos);
    this.group.scale.setScalar(1 + Math.sin(this.t * 4) * 0.05);
  }
}

// Enemy plasma shot. Hits are resolved by the game against the ship.
export class EnemyShot {
  constructor(game, pos, vel, dmg) {
    this.pos = pos.clone();
    this.vel = vel.clone();
    this.dmg = dmg;
    this.life = 7;
    this.group = makeModel('shot');
    this.group.position.copy(this.pos);
    game.root.add(this.group);
    this.root = game.root;
  }

  update(dt) {
    this.life -= dt;
    this.pos.addScaledVector(this.vel, dt);
    this.group.position.copy(this.pos);
  }

  remove() {
    this.root.remove(this.group);
  }
}

// Homing missile fired at a locked target. Hit tests are distance-based.
export class Missile {
  constructor(game, pos, target) {
    this.pos = pos.clone();
    this.target = target;
    this.vel = new THREE.Vector3(0, 0, -60);
    this.life = 3.5;
    this.group = makeModel('missile');
    this.group.position.copy(this.pos);
    game.root.add(this.group);
    this.root = game.root;
  }

  update(dt) {
    this.life -= dt;
    if (this.target && !this.target.alive) this.target = null;
    const speed = 96;
    if (this.target) {
      _v.subVectors(this.target.pos, this.pos).normalize().multiplyScalar(speed);
      this.vel.lerp(_v, Math.min(1, dt * 5));
    } else {
      this.vel.lerp(_v.set(0, 0, -speed), Math.min(1, dt * 3));
    }
    this.pos.addScaledVector(this.vel, dt);
    this.group.position.copy(this.pos);
    // Object3D.lookAt aims +Z, and the missile's nose is -Z, so aim the tail at the target.
    this.group.lookAt(this.pos.clone().sub(this.vel));
  }

  remove() {
    this.root.remove(this.group);
  }
}
