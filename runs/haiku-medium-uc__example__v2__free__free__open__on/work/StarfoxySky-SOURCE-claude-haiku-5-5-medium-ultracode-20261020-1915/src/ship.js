// Player ship flight model, plus the two wingmen who fly in formation.
// Flight is on a forward-scrolling lane: the level moves the ship along -Z,
// the stick moves it across the lane. Boost and brake change scroll speed.

import * as THREE from 'three/webgpu';
import { makeModel } from './models.js';

const ROLL_TIME = 0.62;
const ROLL_COOLDOWN = 0.45;
const BOOST_DRAIN = 0.42;
const BOOST_REGEN = 0.22;

export class Ship {
  constructor(root) {
    this.group = makeModel('arwing');
    root.add(this.group);
    this.wingL = this.group.userData.wingL;
    this.wingR = this.group.userData.wingR;
    this.pos = new THREE.Vector3(0, 0, 0);
    this.vel = new THREE.Vector3();
    this.hull = 100;
    this.maxHull = 100;
    this.bombs = 3;
    this.boost = 1;
    this.invuln = 0;
    this.roll = null; // { dir, t }
    this.rollCooldown = 0;
    this.rollAngle = 0;
    this.speedScale = 1;
    this.time = 0;
    this.yMin = -12;
    this.yMax = 12;
    this.xMax = 15;
  }

  get rolling() {
    return this.roll !== null;
  }

  // Applies one frame of flight input. `f` is a flight frame (from Input or the autopilot).
  update(f, dt, sens) {
    this.time += dt;
    const rollBoost = this.roll ? 1.7 : 1;
    const tvx = f.x * 24 * sens * rollBoost;
    const tvy = f.y * 15 * sens;
    this.vel.x += (tvx - this.vel.x) * Math.min(1, dt * 7);
    this.vel.y += (tvy - this.vel.y) * Math.min(1, dt * 7);
    this.pos.x = clamp(this.pos.x + this.vel.x * dt, -this.xMax, this.xMax);
    this.pos.y = clamp(this.pos.y + this.vel.y * dt, this.yMin, this.yMax);

    const boosting = f.boost && this.boost > 0.02;
    const braking = f.brake;
    this.boost = clamp(this.boost + (boosting ? -BOOST_DRAIN : BOOST_REGEN) * dt, 0, 1);
    this.speedScale = boosting ? 1.55 : braking ? 0.42 : 1;

    this.rollCooldown = Math.max(0, this.rollCooldown - dt);
    if (!this.roll && this.rollCooldown <= 0) {
      if (f.rollL) this.roll = { dir: -1, t: 0 };
      else if (f.rollR) this.roll = { dir: 1, t: 0 };
    }
    if (this.roll) {
      this.roll.t += dt;
      const k = Math.min(1, this.roll.t / ROLL_TIME);
      this.rollAngle = this.roll.dir * easeInOut(k) * Math.PI * 2;
      if (k >= 1) {
        this.roll = null;
        this.rollAngle = 0;
        this.rollCooldown = ROLL_COOLDOWN;
      }
    }

    this.invuln = Math.max(0, this.invuln - dt);
    this.syncVisual();
  }

  syncVisual() {
    this.group.position.copy(this.pos);
    const bank = -this.vel.x * 0.05;
    const pitch = this.vel.y * 0.035;
    this.group.rotation.set(pitch, 0, bank + this.rollAngle);
    const flutter = Math.sin(this.time * 14) * 0.06;
    this.wingL.rotation.z = flutter;
    this.wingR.rotation.z = -flutter;
    this.group.visible = this.invuln <= 0 || Math.floor(this.time * 18) % 2 === 0;
  }

  // Muzzle positions for the twin lasers, in world space.
  muzzles(out) {
    out[0].set(this.pos.x - 1.2, this.pos.y - 0.1, this.pos.z - 2.2);
    out[1].set(this.pos.x + 1.2, this.pos.y - 0.1, this.pos.z - 2.2);
    return out;
  }

  reset(x, y, z) {
    this.pos.set(x, y, z);
    this.vel.set(0, 0, 0);
    this.syncVisual();
  }
}

export class Wingman {
  constructor(root, pad) {
    this.group = makeModel('wingman');
    this.group.scale.setScalar(0.65);
    root.add(this.group);
    this.pad = pad; // formation slot: 0 = left, 1 = right
    this.pos = new THREE.Vector3();
    this.fireTimer = Math.random();
    this.alive = true;
    this.target = null;
    this.wingL = this.group.userData.wingL;
    this.wingR = this.group.userData.wingR;
  }

  update(ship, dt) {
    const slot = this.pad === 0 ? new THREE.Vector3(-8, -3.5, -5) : new THREE.Vector3(8, -3.5, -5);
    slot.x += Math.sin(ship.time * 0.9 + this.pad) * 0.8;
    const want = slot.add(ship.pos);
    this.pos.lerp(want, Math.min(1, dt * 3));
    this.group.position.copy(this.pos);
    this.group.rotation.set(0, 0, -(want.x - this.pos.x) * 0.05 + Math.sin(ship.time * 5 + this.pad) * 0.05);
    const flutter = Math.sin(ship.time * 16 + this.pad) * 0.08;
    this.wingL.rotation.z = flutter;
    this.wingR.rotation.z = -flutter;
  }
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
