// Enemies, obstacles, and the Vorrack Titan boss.
// Every target implements: worldPos(game), radius, alive, lockable, hit(dmg, game), and score.
import * as THREE from 'three/webgpu';
import { asteroid, dragoon, hulk, mine, sentinel, serpent, titan } from './models.js';
import { clamp } from './util.js';

const TYPES = {
  drone: { hp: 1, r: 2.4, score: 150, fireEvery: 2.6, make: dragoon },
  serpent: { hp: 2, r: 2.2, score: 300, fireEvery: 99, make: serpent },
  sentinel: { hp: 4, r: 2.4, score: 250, fireEvery: 1.5, make: sentinel },
  hulk: { hp: 9, r: 3.8, score: 600, fireEvery: 2.4, make: hulk },
  mine: { hp: 1, r: 2.6, score: 80, fireEvery: 99, make: mine },
  asteroid: { hp: 3, r: 2, score: 40, make: null },
};

// Only these count toward the stage kill ratio used for medals.
const TALLY = new Set(['drone', 'serpent', 'sentinel', 'hulk']);

const _dir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 0, -1);

// Aim a unit direction from p toward the player, with a little jitter so shots are readable, not perfect.
function aimAt(from, to, jitter = 0.08) {
  _dir.set(to.x - from.x, to.y - from.y, to.z - from.z).normalize();
  _dir.x += (Math.random() - 0.5) * jitter;
  _dir.y += (Math.random() - 0.5) * jitter;
  return _dir.normalize().clone();
}

export class Enemy {
  constructor(rec) {
    this.type = rec.type;
    this.cfg = TYPES[rec.type];
    this.s = rec.s;
    this.vs = rec.vs || 0;
    this.baseX = rec.lx;
    this.baseY = rec.ly;
    this.lx = rec.lx;
    this.ly = rec.ly;
    this.phase = rec.phase || 0;
    this.t = 0;
    this.fireCd = 1.2 + Math.random() * 1.2;
    this.hp = this.cfg.hp;
    this.radius = rec.r || this.cfg.r;
    this.score = this.cfg.score;
    this.tally = TALLY.has(rec.type);
    this.alive = true;
    this.lockable = this.type !== 'asteroid';
    this.collider = null;
    this.mesh = this.type === 'asteroid'
      ? asteroid(this.radius, Math.floor(rec.phase * 1000) + 7)
      : this.cfg.make();
    this.mesh.userData.enemy = this;
  }

  worldPos(g) {
    const c = g.curve(this.s);
    return { x: c.x + this.lx, y: c.y + this.ly, z: -this.s };
  }

  // Called once when the game activates this enemy (asteroids get a Rapier collider here).
  activate(g) {
    const p = this.worldPos(g);
    this.mesh.position.set(p.x, p.y, p.z);
    g.scene.add(this.mesh);
    if (this.type === 'asteroid') {
      this.collider = g.physics.addBall(this.radius, p.x, p.y, p.z, 'asteroid', this);
    }
  }

  update(dt, g) {
    this.t += dt;
    const sDelta = this.s - g.player.s;
    this.s += this.vs * dt;
    const p = this.worldPos(g);
    const player = g.playerWorld();

    switch (this.type) {
      case 'drone': {
        this.lx = this.baseX + Math.sin(this.t * 1.6 + this.phase) * 3.2;
        this.ly = this.baseY + Math.cos(this.t * 1.1 + this.phase) * 1.6;
        this.fireCd -= dt;
        if (this.fireCd <= 0 && sDelta > 40 && sDelta < 300) {
          this.fireCd = this.cfg.fireEvery;
          g.enemyFire(p, aimAt(p, player, 0.12), 62, 'bullet');
        }
        break;
      }
      case 'serpent': {
        // Interceptors slide toward the player's lateral position, then fire once on approach.
        this.lx += clamp(g.player.px - this.lx, -1, 1) * 9 * dt;
        this.ly += clamp(g.player.py - this.ly, -1, 1) * 6 * dt;
        this.fireCd -= dt;
        if (this.fireCd <= 0 && sDelta > 60 && sDelta < 220) {
          this.fireCd = 999;
          g.enemyFire(p, aimAt(p, player, 0.05), 88, 'bullet');
        }
        break;
      }
      case 'sentinel': {
        const head = this.mesh.userData.head;
        const aim = aimAt(p, player, 0);
        head.quaternion.setFromUnitVectors(_up, aim);
        this.fireCd -= dt;
        if (this.fireCd <= 0 && sDelta > 30 && sDelta < 320) {
          this.fireCd = this.cfg.fireEvery;
          g.enemyFire(p, aimAt(p, player, 0.06), 86, 'bullet');
        }
        break;
      }
      case 'hulk': {
        this.lx = this.baseX + Math.sin(this.t * 0.7 + this.phase) * 4;
        this.fireCd -= dt;
        if (this.fireCd <= 0 && sDelta > 60 && sDelta < 320) {
          this.fireCd = this.cfg.fireEvery;
          const base = aimAt(p, player, 0);
          for (let i = -2; i <= 2; i++) {
            const d = base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), i * 0.14);
            g.enemyFire(p, d, 58, 'bullet');
          }
        }
        break;
      }
      case 'mine': {
        const dx = p.x - player.x;
        const dy = p.y - player.y;
        const dz = p.z - player.z;
        if (Math.hypot(dx, dy, dz) < 6) {
          g.damagePlayer(14, 'mine');
          this.kill(g);
          return;
        }
        this.mesh.scale.setScalar(1 + Math.sin(this.t * 6) * 0.08);
        break;
      }
      case 'asteroid': {
        this.mesh.rotation.x += dt * 0.35;
        this.mesh.rotation.y += dt * 0.22;
        break;
      }
      default:
        break;
    }

    if (this.type !== 'asteroid') {
      const q = this.worldPos(g);
      this.mesh.position.set(q.x, q.y, q.z);
    }
  }

  // Returns true if this hit destroyed the target.
  hit(dmg, g) {
    if (!this.alive) return false;
    this.hp -= dmg;
    const p = this.worldPos(g);
    if (this.hp <= 0) {
      this.kill(g);
      return true;
    }
    g.fx.spark(p, 0xffe9a0, 8);
    g.audio.sfx('hit');
    return false;
  }

  kill(g) {
    if (!this.alive) return;
    this.alive = false;
    const p = this.worldPos(g);
    const size = this.type === 'hulk' ? 2.4 : this.type === 'asteroid' ? this.radius * 0.7 : 1.2;
    g.fx.explode(p, size, this.type === 'asteroid' ? 0xc89a62 : 0xff8a3b, this.type === 'hulk');
    g.onEnemyDown(this, p);
    this.remove(g);
  }

  remove(g) {
    if (this.collider) {
      g.physics.removeStatic(this.collider);
      this.collider = null;
    }
    g.scene.remove(this.mesh);
  }
}

// ----- Boss ---------------------------------------------------------------

class BossPart {
  constructor(owner, key, offset, radius, hp, score) {
    this.owner = owner;
    this.key = key;
    this.offset = offset;
    this.radius = radius;
    this.hp = hp;
    this.maxHp = hp;
    this.score = score;
    this.alive = true;
    this.lockable = true;
  }

  worldPos(g) {
    const o = this.owner.rootPos;
    return { x: o.x + this.offset.x, y: o.y + this.offset.y, z: o.z + this.offset.z };
  }

  hit(dmg, g) {
    return this.owner.partHit(this, dmg, g);
  }
}

export class Boss {
  constructor(s, name) {
    this.s = s;
    this.name = name;
    this.t = 0;
    this.parts = titan();
    this.root = this.parts.root;
    this.rootPos = { x: 0, y: 0, z: -s };
    this.bx = 0;
    this.by = 0;
    this.spin = 0;
    this.alive = true;
    this.dying = 0;
    this.fireTimers = { top: 1.2, pods: 1.6, core: 1.8, homing: 3.5, sweep: 6 };
    this.pods = [
      new BossPart(this, 'podL', new THREE.Vector3(-8.4, 0, 0), 2.6, 12, 800),
      new BossPart(this, 'podR', new THREE.Vector3(8.4, 0, 0), 2.6, 12, 800),
    ];
    this.top = new BossPart(this, 'top', new THREE.Vector3(0, 4.8, 0), 1.6, 8, 500);
    this.core = new BossPart(this, 'core', new THREE.Vector3(0, 0, 0), 3.6, 40, 3000);
    this.targets = [...this.pods, this.top, this.core];
    this.coreExposed = false;
    this.phase = 1;
    this.coreMaxHp = this.core.maxHp;
  }

  get podsAlive() {
    return this.pods.some((p) => p.alive);
  }

  activate(g) {
    g.scene.add(this.root);
  }

  // Core is shielded while pods live. Pod and top hits count normally.
  partHit(part, dmg, g) {
    if (!part.alive || this.dying > 0) return false;
    if (part === this.core && this.podsAlive) {
      g.fx.spark(part.worldPos(g), 0x7fe7ff, 6);
      g.audio.sfx('hit');
      return false;
    }
    part.hp -= dmg;
    const p = part.worldPos(g);
    if (part.hp > 0) {
      g.fx.spark(p, 0xffe9a0, 8);
      g.audio.sfx('hit');
      return false;
    }
    part.alive = false;
    g.fx.explode(p, 1.9, part === this.core ? 0xff3a6a : 0xffb24a, false);
    g.onEnemyDown({ score: part.score, type: 'boss' }, p);
    if (part === this.core) {
      this.beginDeath(g);
    } else if (!this.podsAlive && !this.coreExposed) {
      this.coreExposed = true;
      g.radio('marlow', 'Shields down. Titan core is exposed. Fire!');
      g.audio.sfx('warn');
    }
    return true;
  }

  beginDeath(g) {
    this.dying = 0.001;
    g.radio('marlow', 'Titan core destroyed! Get clear, Ace!');
  }

  update(dt, g) {
    if (!this.alive) return;
    this.t += dt;
    this.spin += dt * (this.phase === 3 ? 0.9 : 0.4);
    const c = g.curve(this.s);
    this.bx = Math.sin(this.t * 0.55) * 6;
    this.by = Math.sin(this.t * 0.9) * 2.5 + 2;
    this.rootPos = { x: c.x + this.bx, y: c.y + this.by, z: -this.s };
    this.root.position.set(this.rootPos.x, this.rootPos.y, this.rootPos.z);
    this.parts.core.rotation.y = this.spin;
    this.parts.coreOrbit.rotation.z = this.spin * 1.6;
    this.phase = this.core.hp <= this.coreMaxHp * 0.4 ? 3 : this.coreExposed ? 2 : 1;

    // Pods and the top turret mount outside the core, so their meshes need positional updates.
    this.parts.pods.forEach((pod, i) => {
      pod.rotation.x = Math.sin(this.t * 1.2 + i) * 0.08;
    });

    if (this.dying > 0) {
      this.updateDeath(dt, g);
      return;
    }

    const player = g.playerWorld();
    const sDelta = this.s - g.player.s;
    const inRange = sDelta > 40 && sDelta < 420;
    const timers = this.fireTimers;
    for (const k of Object.keys(timers)) timers[k] -= dt;

    if (inRange && this.podsAlive && timers.pods <= 0) {
      timers.pods = 2.0;
      this.pods.forEach((pod, i) => {
        if (!pod.alive) return;
        const pos = pod.worldPos(g);
        const base = aim(pos, player);
        for (let k = -1; k <= 1; k++) {
          const d = base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), k * 0.18 * (i ? 1 : -1));
          g.enemyFire(pos, d, 70, 'bullet');
        }
      });
    }
    if (inRange && this.top.alive && timers.top <= 0) {
      timers.top = this.phase === 3 ? 0.9 : 1.4;
      const pos = this.top.worldPos(g);
      g.enemyFire(pos, aim(pos, player), 92, 'bullet');
    }
    if (inRange && this.coreExposed && timers.core <= 0) {
      timers.core = this.phase === 3 ? 0.9 : 1.5;
      const pos = this.core.worldPos(g);
      const n = this.phase === 3 ? 10 : 7;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + this.spin;
        const d = new THREE.Vector3(Math.cos(a), Math.sin(a), -1).normalize();
        g.enemyFire(pos, d, 64, 'bullet');
      }
    }
    if (inRange && this.coreExposed && timers.homing <= 0) {
      timers.homing = 3.6;
      g.enemyFire(this.core.worldPos(g), aim(this.core.worldPos(g), player), 46, 'missile');
    }
    if (inRange && this.phase === 3 && timers.sweep <= 0) {
      timers.sweep = 6.5;
      g.radio('marlow', 'Titan charging a sweep! Break left or right!');
      g.audio.sfx('warn');
      const pos = this.core.worldPos(g);
      for (let i = -6; i <= 6; i++) {
        const d = aim(pos, player).applyAxisAngle(new THREE.Vector3(0, 1, 0), i * 0.09);
        g.enemyFire(pos, d, 118, 'bullet');
      }
    }
  }

  updateDeath(dt, g) {
    this.dying += dt;
    if (Math.random() < 0.7) {
      const p = { x: this.rootPos.x + (Math.random() - 0.5) * 14, y: this.rootPos.y + (Math.random() - 0.5) * 10, z: this.rootPos.z + (Math.random() - 0.5) * 14 };
      g.fx.explode(p, 1.6 + Math.random() * 1.2, Math.random() < 0.5 ? 0xff3a6a : 0xffb24a, false);
    }
    if (this.dying > 3) {
      this.alive = false;
      const p = this.rootPos;
      g.fx.explode(p, 6, 0xffffff, true);
      g.fx.shake = 2;
      this.root.visible = false;
      this.dying = -1;
      g.onBossDown();
    }
  }

  // Lockable boss parts currently alive (for lock-on candidates).
  activeTargets() {
    return this.targets.filter((t) => t.alive);
  }
}

// Aim from a world point toward the player (no jitter), returning a fresh vector.
function aim(from, to) {
  return new THREE.Vector3(to.x - from.x, to.y - from.y, to.z - from.z).normalize();
}

