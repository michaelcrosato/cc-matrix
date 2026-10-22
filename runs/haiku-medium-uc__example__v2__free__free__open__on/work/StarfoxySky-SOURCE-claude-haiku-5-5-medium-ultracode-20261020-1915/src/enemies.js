// Enemy factories, behaviours and the Venom Core boss.

import * as THREE from 'three/webgpu';
import { Enemy } from './actors.js';
import { makeModel } from './models.js';

const TAU = Math.PI * 2;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// Aims a shot at the ship with a little lead. `spread` fans extra shots out sideways.
function aimedVector(g, from, speed, spreadX = 0) {
  const lead = g.ship.vel.clone().multiplyScalar(0.25);
  const dir = new THREE.Vector3().subVectors(g.ship.pos.clone().add(lead), from).normalize();
  if (spreadX) {
    const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
    dir.addScaledVector(side, spreadX).normalize();
  }
  return dir.multiplyScalar(speed);
}

export function aimedShot(every, speed = 40, dmg = 1) {
  return {
    every,
    shot: (e, g) => g.enemyShot(e.pos, aimedVector(g, e.pos, speed), dmg),
  };
}

function spreadShot(every, speed = 36) {
  return {
    every,
    shot: (e, g) => {
      for (const s of [-0.22, 0, 0.22]) g.enemyShot(e.pos, aimedVector(g, e.pos, speed, s), 1);
    },
  };
}

// Only fire at targets ahead of the ship and in reasonable range.
export function canFire(e, g) {
  const s = g.ship.pos;
  return e.pos.z < s.z - 6 && e.pos.z > s.z - 260 && Math.abs(e.pos.x - s.x) < 80;
}

export function makeDrone(g, x, y, z, { vz = 0, amp = 6, w = 1.3, every = 2.6 } = {}) {
  return new Enemy(g, {
    kind: 'drone',
    model: 'drone',
    pos: new THREE.Vector3(x, y, z),
    radius: 1.7,
    hp: 1,
    score: 100,
    vars: { amp, w, vz },
    behave: (e, dt) => {
      const { amp, w, vz } = e.vars;
      e.base.z += vz * dt;
      e.pos.set(
        e.base.x + Math.sin(e.t * w + e.phase) * amp,
        e.base.y + Math.cos(e.t * w * 0.6 + e.phase) * amp * 0.5,
        e.base.z,
      );
      e.group.rotation.z += dt * 2;
    },
    fire: aimedShot(every, 38),
  });
}

export function makeInterceptor(g, x, y, z) {
  return new Enemy(g, {
    kind: 'interceptor',
    model: 'interceptor',
    pos: new THREE.Vector3(x, y, z),
    radius: 1.6,
    hp: 2,
    score: 250,
    vars: { state: 'wait', vel: new THREE.Vector3() },
    behave: (e, dt, g) => {
      const s = g.ship.pos;
      if (e.vars.state === 'wait') {
        e.pos.set(e.base.x + Math.sin(e.t * 1.7) * 1.2, e.base.y, e.base.z);
        if (e.base.z > s.z - 170 && e.base.z < s.z) {
          e.vars.state = 'dive';
          e.vars.vel.set(0, 0, 40);
        }
        return;
      }
      // Homing dive: steers toward the ship with limited turn rate, then flies past.
      const want = new THREE.Vector3().subVectors(s, e.pos).normalize().multiplyScalar(70);
      e.vars.vel.lerp(want, Math.min(1, dt * 2.2));
      e.pos.addScaledVector(e.vars.vel, dt);
      e.base.copy(e.pos);
      e.group.lookAt(e.pos.clone().sub(e.vars.vel));
      if (e.pos.z > s.z + 30) e.escaped = true;
    },
    fire: {
      every: 1.5,
      first: 0.4,
      shot: (e, g) => {
        if (e.vars.state === 'dive') g.enemyShot(e.pos, aimedVector(g, e.pos, 50), 1);
      },
    },
  });
}

export function makeTurret(g, x, y, z) {
  return new Enemy(g, {
    kind: 'turret',
    model: 'turret',
    pos: new THREE.Vector3(x, y, z),
    radius: 1.8,
    hp: 3,
    score: 150,
    vars: { head: null },
    behave: (e, dt, g) => {
      if (!e.vars.head) e.vars.head = e.group.getObjectByName('head');
      const s = g.ship.pos;
      const want = Math.atan2(-(s.x - e.pos.x), -(s.z - e.pos.z));
      const head = e.vars.head;
      head.rotation.y += wrap(want - head.rotation.y) * Math.min(1, dt * 3);
    },
    fire: aimedShot(1.9, 36),
  });
}

export function makeGunship(g, x, y, z) {
  return new Enemy(g, {
    kind: 'gunship',
    model: 'gunship',
    pos: new THREE.Vector3(x, y, z),
    radius: 3.2,
    hp: 9,
    score: 600,
    vars: { sway: Math.random() * TAU },
    behave: (e, dt, g) => {
      const s = g.ship.pos;
      e.base.z += 3.5 * dt;
      e.base.x += (s.x * 0.45 - e.base.x) * Math.min(1, dt * 0.6);
      e.base.y += (Math.max(-4, s.y * 0.4) - e.base.y) * Math.min(1, dt * 0.4);
      e.pos.set(e.base.x + Math.sin(e.t * 0.8 + e.vars.sway) * 2, e.base.y, e.base.z);
      e.group.rotation.z = Math.sin(e.t * 0.8 + e.vars.sway) * 0.08;
    },
    fire: spreadShot(3.2, 34),
  });
}

// Venom Core: a stationary fortress that sways in front of the ship.
// Two shield generators protect the core; four turrets fire aimed shots.
// Once the turrets are down the core starts firing rings (phase two).
export class Boss {
  constructor(g, homeZ) {
    this.g = g;
    this.group = makeModelRoot();
    g.root.add(this.group);
    this.homeZ = homeZ;
    this.t = 0;
    this.entryTime = 6;
    this.group.position.set(0, 2, homeZ - 280);
    const ud = this.group.userData;
    this.ring = ud.ring;
    this.enemies = [];

    this.core = this.addPart(ud.core, 'core', { hp: 140, radius: 3.8, score: 3000, every: 0 });
    this.shields = ud.shields.map((mesh) => this.addPart(mesh, 'shield', { hp: 45, radius: 2.3, score: 400, every: 0 }));
    this.turrets = ud.turrets.map((mesh) => this.addPart(mesh, 'turret', { hp: 30, radius: 1.9, score: 300, every: 2.4 }));
    this.phase = 1;
    this.ringTimer = 2;
    this.exposedAt = null;
  }

  addPart(obj, part, { hp, radius, score, every }) {
    const e = new Enemy(this.g, {
      kind: 'boss',
      group: obj,
      pos: new THREE.Vector3(),
      radius,
      hp,
      score,
      part,
      lockable: true,
      behave: (self, dt, g) => {
        if (part !== 'turret') return;
        const head = self.group.getObjectByName('head');
        const s = g.ship.pos;
        const want = Math.atan2(-(s.x - self.pos.x), -(s.z - self.pos.z));
        head.rotation.y += wrap(want - head.rotation.y) * Math.min(1, dt * 3);
      },
      fire: every ? {
        every,
        first: 2 + Math.random() * 2,
        shot: (self, g) => {
          if (this.entering() || !canFire(self, g)) return;
          g.enemyShot(self.pos, aimedVector(g, self.pos, 40), 1);
        },
      } : null,
    });
    e.owner = this;
    this.enemies.push(e);
    return e;
  }

  entering() {
    return this.t < this.entryTime;
  }

  get shieldsUp() {
    return this.shields.filter((s) => s.alive).length;
  }

  get turretsUp() {
    return this.turrets.filter((t) => t.alive).length;
  }

  // Core accepts damage only once both shield generators are destroyed.
  coreExposed() {
    return this.shieldsUp === 0;
  }

  update(dt, g) {
    this.t += dt;
    const sway = Math.sin(this.t * 0.4) * 9;
    const bob = 2 + Math.sin(this.t * 0.7) * 2.5;
    const entry = this.entering() ? 1 - Math.pow(1 - Math.min(1, this.t / this.entryTime), 3) : 1;
    this.group.position.set(sway * entry, bob, this.homeZ - 280 * (1 - entry));
    // Part positions are read from world matrices, so refresh them after moving the root.
    this.group.updateMatrixWorld(true);
    this.ring.rotation.z += dt * (this.turretsUp === 0 ? 2.8 : 1.1);

    if (this.turretsUp === 0 && this.phase === 1 && !this.entering()) {
      this.phase = 2;
      g.sound.warning();
      g.say('Command', 'Core is exposed on all sides. Finish it!', 4);
    }
    if (this.phase === 2 && this.core.alive && !this.entering()) {
      this.ringTimer -= dt;
      if (this.ringTimer <= 0) {
        this.ringTimer = 2.4;
        this.fireRing(g);
      }
    }
  }

  fireRing(g) {
    const n = 10;
    const origin = this.core.pos;
    const spin = this.t * 0.6;
    for (let i = 0; i < n; i++) {
      const a = spin + (i / n) * TAU;
      const dir = new THREE.Vector3(Math.cos(a), Math.sin(a) * 0.6, Math.sin(a) * 0.4).normalize().multiplyScalar(30);
      g.enemyShot(origin, dir, 1);
    }
  }

  get alive() {
    return this.core.alive;
  }
}

function makeModelRoot() {
  return makeModel('venom');
}
