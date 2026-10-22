// Gameplay targets: fighters, turrets, asteroids, pickups, and the carrier boss.
// Every target has pos, radius, alive, hit(dmg, source) and update(dt). Bodies live in Rapier.
import { Vector3, Mesh } from 'three/webgpu';
import { venom, turret, asteroid, carrier, ringPickup, shotGeometry } from './models.js';
import { makeBasic } from './render.js';

const _v = new Vector3();

class Target {
  constructor(game) {
    this.game = game;
    this.alive = true;
    this.pos = new Vector3();
    this.radius = 1;
    this.group = null;
    this.body = null;
    this.col = null;
    this.kind = 'target';
  }

  attach(group, radius, sensor = false) {
    this.group = group;
    this.radius = radius;
    this.game.scene.add(group);
    this.body = this.game.phys.body(0, 0, 0);
    this.col = this.game.phys.collider(this.body, radius, this, { sensor });
  }

  place(x, y, z) {
    this.pos.set(x, y, z);
    if (this.group) this.group.position.copy(this.pos);
    if (this.body) this.game.phys.moveBody(this.body, x, y, z);
  }

  destroy() {
    this.alive = false;
    if (this.group) this.game.scene.remove(this.group);
    if (this.body) this.game.phys.removeBody(this.body);
    this.body = null;
    this.col = null;
  }

  // Passed behind the player: no longer relevant.
  behind() {
    return this.pos.z > this.game.player.pos.z + 40;
  }
}

export class Venom extends Target {
  constructor(game, x, y, z, { vz = 16, phase = 0, hp = 2, color = 0xb43fd6 } = {}) {
    super(game);
    this.kind = 'venom';
    this.baseX = x;
    this.baseY = y;
    this.vz = vz;
    this.phase = phase;
    this.hp = hp;
    this.t = 0;
    this.fireCd = 1.2 + Math.random() * 1.2;
    this.attach(venom(color), 2.0);
    this.place(x, y, z);
    this.score = 150;
    this.flash = 0;
  }

  update(dt) {
    const p = this.game.player.pos;
    this.t += dt;
    const sx = this.baseX + Math.sin(this.t * 1.3 + this.phase) * 5;
    const sy = this.baseY + Math.cos(this.t * 0.9 + this.phase) * 2.4;
    const prevX = this.pos.x;
    this.place(sx, sy, this.pos.z + this.vz * dt);
    this.group.rotation.z = -(this.pos.x - prevX) / Math.max(dt, 0.001) * 0.02;
    this.flash = Math.max(0, this.flash - dt * 4);
    this.fireCd -= dt;
    const ahead = p.z - this.pos.z;
    if (this.fireCd <= 0 && ahead > 40 && ahead < 230) {
      this.fireCd = 1.8 + Math.random() * 1.2;
      _v.copy(p).sub(this.pos).normalize().multiplyScalar(58);
      this.game.shots.fire(this.pos, _v, 0xff4a6e);
      this.game.audio.sfx('laserEnemy');
    }
    if (this.behind()) this.destroy();
  }

  hit(dmg) {
    if (!this.alive) return null;
    this.hp -= dmg;
    this.game.fx.burst(this.pos, 0xffd9a0, 6, 6, 0.5, 0.35);
    if (this.hp > 0) return { killed: false, points: 0 };
    this.game.fx.explode(this.pos);
    this.game.audio.sfx('explode');
    this.destroy();
    return { killed: true, points: this.score };
  }
}

export class Turret extends Target {
  constructor(game, x, y, z) {
    super(game);
    this.kind = 'turret';
    this.hp = 3;
    this.fireCd = 1.4 + Math.random();
    this.model = turret();
    this.attach(this.model, 2.6);
    this.place(x, y, z);
    this.score = 300;
  }

  update(dt) {
    const p = this.game.player.pos;
    const head = this.model.userData.head;
    const dx = p.x - this.pos.x;
    const dz = p.z - this.pos.z;
    head.rotation.y = Math.atan2(dx, -dz) - this.group.rotation.y;
    const ahead = p.z - this.pos.z;
    this.fireCd -= dt;
    if (this.fireCd <= 0 && ahead > 40 && ahead < 300) {
      this.fireCd = 1.9 + Math.random() * 0.8;
      const muzzle = _v.set(this.pos.x, this.pos.y + 2.6, this.pos.z);
      const to = new Vector3(p.x, p.y, p.z).sub(muzzle).normalize().multiplyScalar(52);
      this.game.shots.fire(muzzle, to, 0xffb35a);
      this.game.audio.sfx('laserEnemy');
    }
    if (this.behind()) this.destroy();
  }

  hit(dmg) {
    if (!this.alive) return null;
    this.hp -= dmg;
    this.game.fx.burst(this.pos, 0xffd9a0, 6, 6, 0.5, 0.35);
    if (this.hp > 0) return { killed: false, points: 0 };
    this.game.fx.explode(this.pos, true);
    this.game.audio.sfx('explode');
    this.destroy();
    return { killed: true, points: this.score };
  }
}

export class Rock extends Target {
  constructor(game, x, y, z, radius, seed) {
    super(game);
    this.kind = 'rock';
    this.hp = Math.max(2, Math.round(radius * 1.2));
    this.spin = new Vector3((Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.2);
    this.drift = (Math.random() - 0.5) * 6;
    this.attach(asteroid(radius, seed), radius * 0.92);
    this.place(x, y, z);
    this.score = 40;
  }

  update(dt) {
    this.group.rotation.x += this.spin.x * dt;
    this.group.rotation.y += this.spin.y * dt;
    this.group.rotation.z += this.spin.z * dt;
    this.place(this.pos.x + this.drift * dt, this.pos.y, this.pos.z);
    if (this.behind()) this.destroy();
  }

  hit(dmg) {
    if (!this.alive) return null;
    this.hp -= dmg;
    this.game.fx.burst(this.pos, 0xc8b8a0, 8, 8, 0.6, 0.45);
    if (this.hp > 0) return { killed: false, points: 0 };
    this.game.fx.explode(this.pos);
    this.game.audio.sfx('explode');
    this.destroy();
    return { killed: true, points: this.score };
  }
}

// Power-up ring: flying through gives shield, and every other ring gives a bomb.
export class Ring extends Target {
  constructor(game, x, y, z, bomb) {
    super(game);
    this.kind = 'ring';
    this.bomb = bomb;
    this.attach(ringPickup(bomb ? 0xffd23f : 0x7dffb0), 2.8);
    this.place(x, y, z);
    this.t = Math.random() * 6;
  }

  update(dt) {
    this.t += dt;
    this.group.rotation.y += dt * 1.5;
    if (this.behind()) this.destroy();
  }

  hit() {
    return null;
  }
}

// Boss: the Morrow carrier. Two side batteries guard a reactor core under a shield.
// The shield collider only exists while a battery stands; the core only takes damage once the shield is down.
export class Carrier extends Target {
  constructor(game, x, y, z) {
    super(game);
    this.kind = 'carrier';
    this.model = carrier();
    this.parts = this.model.userData.parts;
    this.group = this.model;
    this.game.scene.add(this.group);
    this.body = this.game.phys.body(x, y, z);
    this.anchor = new Vector3(x, y, z);
    this.t = 0;
    this.phase = 1;
    this.fireCd = 2.2;
    this.spawnCd = 8;
    this.radius = 26;
    this.placeOrigin(x, y, z);

    const mk = (owner, r, off, sensor = false) => this.game.phys.collider(this.body, r, owner, { offset: off, sensor });
    this.batteries = [
      { target: new Part(this, 'batteryL', -26, 0, -6, 4.6, 10, 800), node: this.parts.batteryL },
      { target: new Part(this, 'batteryR', 26, 0, -6, 4.6, 10, 800), node: this.parts.batteryR },
    ];
    for (const b of this.batteries) b.col = mk(b.target, b.target.radius, [b.target.lx, b.target.ly, b.target.lz]);
    this.core = new Part(this, 'core', 0, -6.5, -18, 6, 22, 5000);
    this.coreCol = mk(this.core, 6, [0, -6.5, -18]);
    this.coreCol.setEnabled(false);
    this.shield = new Part(this, 'shield', 0, -6.5, -18, 10.5, Infinity, 0);
    this.shield.deflect = true;
    this.shieldCol = mk(this.shield, 10.5, [0, -6.5, -18]);
    this.parts.shield.visible = true;
  }

  placeOrigin(x, y, z) {
    this.pos.set(x, y, z);
    this.group.position.copy(this.pos);
  }

  update(dt) {
    if (!this.alive) return;
    this.t += dt;
    const p = this.game.player.pos;
    // Gentle sway. The carrier lurches more once its shield is gone.
    const sway = this.phase === 1 ? 10 : 16;
    const nx = Math.sin(this.t * 0.35) * sway;
    const ny = 10 + Math.sin(this.t * 0.5) * 3.5;
    this.placeOrigin(nx, ny, this.anchor.z);
    this.game.phys.moveBody(this.body, nx, ny, this.anchor.z);
    this.group.rotation.z = Math.sin(this.t * 0.35) * 0.04;
    this.parts.shield.rotation.z += dt * 0.8;
    this.parts.shield.rotation.x = Math.sin(this.t * 0.6) * 0.3;
    this.parts.shield.visible = this.shield.alive;

    const bothDown = this.batteries.every((b) => !b.target.alive);
    if (bothDown && this.phase === 1) this.enterPhase2();

    for (const b of this.batteries) b.target.world(this.group);
    this.core.world(this.group);
    this.shield.world(this.group);

    this.fireCd -= dt;
    const fireGap = this.phase === 1 ? 2.4 : 1.2;
    if (this.fireCd <= 0 && p.z < this.anchor.z + 170) {
      this.fireCd = fireGap;
      this.volley(p);
    }

    this.spawnCd -= dt;
    if (this.spawnCd <= 0 && p.z < this.anchor.z + 220) {
      this.spawnCd = 11;
      for (let i = 0; i < 3; i++) {
        this.game.targets.push(new Venom(this.game, -14 + i * 14, 4 + (i % 2) * 4, this.anchor.z + 80, { vz: 14, phase: i, hp: 2 }));
      }
    }
  }

  enterPhase2() {
    this.phase = 2;
    this.coreCol.setEnabled(true);
    this.shieldCol.setEnabled(false);
    this.game.audio.sfx('warn');
    this.game.announce('CORE EXPOSED', 'Reactor shield is down. Hit the core!', 2.6);
  }

  volley(p) {
    const origin = this.group.position;
    const batteriesUp = this.batteries.filter((b) => b.target.alive);
    for (const b of batteriesUp) {
      const m = new Vector3(origin.x + b.target.lx, origin.y + b.target.ly, origin.z + b.target.lz);
      const dir = new Vector3(p.x, p.y, p.z).sub(m).normalize();
      for (let k = -1; k <= 1; k++) {
        const spread = dir.clone().add(new Vector3(k * 0.08, k * 0.04, 0)).normalize().multiplyScalar(60);
        this.game.shots.fire(m, spread, 0xff4a6e);
      }
    }
    if (this.phase === 2 && this.core.alive) {
      const m = new Vector3(origin.x, origin.y - 6.5, origin.z - 18);
      for (let k = -2; k <= 2; k++) {
        const dir = new Vector3(p.x - m.x + k * 6, p.y - m.y, p.z - m.z).normalize().multiplyScalar(66);
        this.game.shots.fire(m, dir, 0xffd23f);
      }
    }
    this.game.audio.sfx('laserEnemy');
  }

  // Called by Part hits. Decides whether the carrier is finished.
  onPartDown(part) {
    if (part === this.core) {
      this.alive = false;
      this.game.onBossDown(this);
    }
  }

  batteryDown(part) {
    const node = this.parts[part.name];
    if (node) node.visible = false;
    this.game.announce('BATTERY DOWN', part.name === 'batteryL' ? 'Port battery destroyed' : 'Starboard battery destroyed', 2);
    if (this.batteries.every((b) => !b.target.alive)) {
      this.shield.alive = false;
      this.shieldCol.setEnabled(false);
    }
  }

  destroy() {
    this.alive = false;
    this.game.scene.remove(this.group);
    if (this.body) this.game.phys.removeBody(this.body);
    this.body = null;
  }
}

// Boss part: an owner of one collider. Shield parts deflect shots and are never destroyed.
class Part {
  constructor(boss, name, lx, ly, lz, radius, hp, score) {
    this.boss = boss;
    this.name = name;
    this.lx = lx;
    this.ly = ly;
    this.lz = lz;
    this.radius = radius;
    this.hp = hp;
    this.score = score;
    this.alive = true;
    this.deflect = false;
    this.pos = new Vector3();
    this.kind = 'carrierPart';
  }

  world(group) {
    this.pos.set(group.position.x + this.lx, group.position.y + this.ly, group.position.z + this.lz);
  }

  hit(dmg) {
    const game = this.boss.game;
    if (!this.alive) return null;
    if (this.deflect) {
      game.fx.burst(this.pos, 0x7fe3ff, 8, 10, 0.5, 0.3);
      game.audio.sfx('shieldHit');
      return { killed: false, points: 0, deflected: true };
    }
    if (this.name === 'core' && !this.boss.coreCol.isEnabled()) return null;
    this.hp -= dmg;
    game.fx.burst(this.pos, 0xffe2a0, 8, 9, 0.6, 0.4);
    if (this.hp > 0) return { killed: false, points: 0 };
    this.alive = false;
    game.fx.explode(this.pos, true);
    game.audio.sfx('bigExplode');
    if (this.name !== 'core') {
      this.boss.batteryDown(this);
    } else {
      this.boss.onPartDown(this);
    }
    return { killed: true, points: this.score };
  }
}

// Enemy bolts: a pool of glowing shots. They hit the player or wingmen, or are deflected by barrel roll.
export class Shots {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.geo = shotGeometry();
    this.mats = {
      0xff4a6e: makeBasic(0xff4a6e, { additive: true }),
      0xffb35a: makeBasic(0xffb35a, { additive: true }),
      0xffd23f: makeBasic(0xffd23f, { additive: true }),
    };
  }

  fire(origin, vel, color) {
    const mat = this.mats[color] || this.mats[0xff4a6e];
    const mesh = new Mesh(this.geo, mat);
    mesh.position.copy(origin);
    mesh.lookAt(_v.copy(origin).add(vel));
    this.game.scene.add(mesh);
    this.list.push({ mesh, pos: origin.clone(), vel: vel.clone(), life: 6 });
  }

  update(dt) {
    const player = this.game.player;
    const wings = this.game.wingmen;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const s = this.list[i];
      s.pos.addScaledVector(s.vel, dt);
      s.mesh.position.copy(s.pos);
      s.life -= dt;
      let gone = s.life <= 0;
      if (!gone && player.alive && s.pos.distanceTo(player.pos) < 1.6) {
        player.hurt(12, s.pos);
        gone = true;
      }
      if (!gone) {
        for (const w of wings) {
          if (w.alive && s.pos.distanceTo(w.pos) < 1.8) {
            w.hurt(16);
            gone = true;
            break;
          }
        }
      }
      if (gone) {
        this.game.scene.remove(s.mesh);
        this.list.splice(i, 1);
      }
    }
  }

  clear() {
    for (const s of this.list) this.game.scene.remove(s.mesh);
    this.list.length = 0;
  }
}
