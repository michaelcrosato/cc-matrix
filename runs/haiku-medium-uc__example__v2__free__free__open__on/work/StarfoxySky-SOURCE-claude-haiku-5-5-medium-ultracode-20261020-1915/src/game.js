// Mission runtime: owns the scene objects for one run, advances the script,
// resolves weapons, damage, pickups and mission end, and drives the camera.

import * as THREE from 'three/webgpu';
import { Physics } from './physics.js';
import { World } from './world.js';
import { FX } from './fx.js';
import { Ship, Wingman } from './ship.js';
import { Rock, Pickup, EnemyShot, Missile } from './actors.js';
import { Boss, canFire } from './enemies.js';
import { settings } from './settings.js';

const LOCK_TIME = 0.32;
const MAX_LOCKS = 8;
const CONVERGE = 70;
const DIFF_MULT = { rookie: 0.6, normal: 1, ace: 1.5 };
const EXPLOSION_SIZE = { drone: 0.8, interceptor: 1, turret: 1.2, gunship: 2.1, boss: 1.6, shield: 1.6, core: 3, rock: 1 };
const NEUTRAL = { x: 0, y: 0, fire: false, lock: false, lockReleased: false, bomb: false, boost: false, brake: false, rollL: false, rollR: false, pause: false };

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

export class Game {
  // `cheats` makes the ship invulnerable with infinite bombs (attract demo only).
  constructor({ render, sound, input, mission, cheats = false }) {
    this.render = render;
    this.sound = sound;
    this.input = input;
    this.mission = mission;
    this.cheats = cheats;
    this.diff = cheats ? 0 : DIFF_MULT[settings.difficulty] ?? 1;
    this.root = new THREE.Group();
    render.scene.add(this.root);
    render.applyEnv(mission.env);

    this.phys = new Physics();
    this.world = new World(this.root, this.phys, mission.env);
    this.fx = new FX(this.root);
    this.ship = new Ship(this.root);
    this.ship.xMax = mission.env === 'canyon' ? 9 : 15;
    this.ship.pos.set(0, -6, 0);
    this.wingmen = [new Wingman(this.root, 0), new Wingman(this.root, 1)];
    this.wingmen.forEach((w) => w.pos.set(0, -6, 0));

    this.dist = 0;
    this.time = 0;
    this.introT = 1.6;
    this.script = mission.script.map((e) => ({ ...e, done: false }));
    this.enemies = [];
    this.shots = [];
    this.missiles = [];
    this.pickups = [];
    this.rocks = [];
    this.timers = [];
    this.boss = null;
    this.bossDefeated = false;
    this.kills = 0;
    this.spawned = 0;
    this.score = 0;
    this.rings = 0;
    this.hitsTaken = 0;
    this.locks = new Set();
    this.lockProgress = new Map();
    this.laserCooldown = 0;
    this.missileCooldown = 0;
    this.shake = 0;
    this.hudHit = 0;
    this.hudBomb = 0;
    this.state = 'play';
    this.endTimer = 0;
    this.subtitle = null;
    this.hintMsg = null;
    this.warning = null;
    this.muzzles = [new THREE.Vector3(), new THREE.Vector3()];
    this.camPos = new THREE.Vector3(0, 3, 14);
    this.camLook = new THREE.Vector3(0, 0, -40);
    this.camFov = 60;
    this.render.camera.position.copy(this.camPos);
  }

  // ----- Spawning API used by mission scripts -----

  addEnemy(e) {
    e.counted = true;
    this.enemies.push(e);
    this.spawned++;
  }

  addRock(model, x, y, z, size, vel) {
    this.rocks.push(new Rock(this, model, new THREE.Vector3(x, y, z), size, new THREE.Vector3(vel.x, vel.y, vel.z)));
  }

  addPickup(type, x, y, z) {
    this.pickups.push(new Pickup(this, type, new THREE.Vector3(x, y, z)));
  }

  spawnBoss() {
    this.boss = new Boss(this, this.ship.pos.z);
    for (const e of this.boss.enemies) this.enemies.push(e);
    this.warn('WARNING  VENOM CORE');
    this.say('Command', 'Shields up on the core. Take out the generators, then the turrets.', 5);
  }

  say(speaker, text, dur = 4) {
    this.subtitle = { speaker, text, t: dur };
    this.sound.chatter();
  }

  hint(text, dur = 5) {
    this.hintMsg = { text, t: dur };
  }

  warn(text, dur = 2.2) {
    this.warning = { text, t: dur };
    this.sound.warning();
  }

  enemyShot(pos, vel, dmg = 1) {
    this.shots.push(new EnemyShot(this, pos, vel, dmg));
    if (pos.distanceTo(this.ship.pos) < 160) this.sound.enemyFire();
  }

  canFireAt(e) {
    return canFire(e, this);
  }

  // ----- Frame update -----

  update(dt, frame) {
    this.time += dt;
    this.hudHit = Math.max(0, this.hudHit - dt);
    this.hudBomb = Math.max(0, this.hudBomb - dt);
    this.shake = Math.max(0, this.shake - dt * 2.2);
    this.tickMessages(dt);
    this.runTimers(dt);

    if (this.state !== 'play') {
      this.endTimer -= dt;
      this.fx.update(dt);
      this.world.updateTerrain(this.ship.pos.z);
      this.world.updateDecor(this.ship.pos.z, dt);
      this.updateCamera(dt);
      return;
    }

    for (const ev of this.script) {
      if (!ev.done && this.dist >= ev.d) {
        ev.done = true;
        ev.run(this);
      }
    }

    // Lane limits follow the terrain under the ship.
    const groundTop = this.mission.env === 'belt' ? -11 : this.world.groundY(this.ship.pos.x, this.ship.pos.z) + 2.2;
    this.ship.yMin = Math.max(-12, groundTop);
    this.ship.yMax = 12;

    // Intro: the ship rises into the lane and ignores input until it settles.
    const introing = this.introT > 0;
    if (introing) this.introT -= dt;
    this.ship.update(introing ? NEUTRAL : frame, dt, settings.sensitivity / 100);
    if (introing) this.ship.pos.y = -6 + 6 * (1 - Math.max(0, this.introT) / 1.6);

    // During the boss fight the lane is held in front of the core: the ship can close in,
    // but it cannot fly past the boss, so the fight always stays winnable.
    let speed = this.mission.speed;
    if (this.boss && this.boss.t > 0) speed = 5;
    this.dist += speed * this.ship.speedScale * dt;
    if (this.boss && this.boss.t > 0) this.dist = Math.min(this.dist, -this.boss.group.position.z - 70);
    this.ship.pos.z = -this.dist;
    this.ship.syncVisual();

    if (this.boss) this.boss.update(dt, this);
    for (const e of this.enemies) {
      e.update(dt);
      if (e.escaped) e.alive = false;
      if (e.body) this.phys.setKinematic(e.body, e.pos);
    }
    for (const w of this.wingmen) w.update(this.ship, dt);
    for (const p of this.pickups) p.update(dt);

    this.phys.step();
    for (const r of this.rocks) r.update(dt);

    this.updateWingmen(dt);
    this.updateWeapons(dt, frame);
    this.updateShipCollisions();
    this.updateShots(dt);
    this.updateMissiles(dt);
    this.updatePickups();
    this.fx.update(dt);
    this.world.updateTerrain(this.ship.pos.z);
    this.world.updateDecor(this.ship.pos.z, dt);
    this.cull();
    this.checkEnd();
    this.updateCamera(dt);
  }

  tickMessages(dt) {
    for (const k of ['subtitle', 'hintMsg', 'warning']) {
      if (this[k]) {
        this[k].t -= dt;
        if (this[k].t <= 0) this[k] = null;
      }
    }
  }

  runTimers(dt) {
    for (let i = this.timers.length - 1; i >= 0; i--) {
      this.timers[i].t -= dt;
      if (this.timers[i].t <= 0) {
        this.timers[i].fn();
        this.timers.splice(i, 1);
      }
    }
  }

  // ----- Weapons -----

  updateWeapons(dt, f) {
    this.laserCooldown -= dt;
    this.missileCooldown -= dt;
    if (f.fire && this.laserCooldown <= 0) {
      this.laserCooldown = 0.11;
      this.fireLasers();
    }
    this.updateLocks(dt, f);
    if (f.lockReleased) this.fireMissiles();
    if (f.bomb) this.bomb();
  }

  // Twin lasers converge on a point CONVERGE units ahead of the ship.
  fireLasers() {
    const s = this.ship.pos;
    this.ship.muzzles(this.muzzles);
    _a.set(s.x, s.y, s.z - CONVERGE);
    for (const m of this.muzzles) {
      const dir = _b.subVectors(_a, m).normalize();
      const hit = this.phys.raycast(m, dir, 320);
      const end = m.clone().addScaledVector(dir, hit ? hit.t : 320);
      this.fx.beam(m, end, 0xbff8ff, 0.08);
      if (hit) this.hitEntity(hit.entity, 1, end, 'laser');
    }
    this.sound.laser();
  }

  // Lock-on candidate: ahead of the ship and near the convergence point.
  lockCandidate(e) {
    if (!e.alive || !e.lockable) return false;
    const s = this.ship.pos;
    const ahead = s.z - e.pos.z;
    if (ahead < 8 || ahead > 260) return false;
    const r = 4 + ahead * 0.12;
    return Math.abs(e.pos.x - s.x) < r && Math.abs(e.pos.y - s.y) < r;
  }

  updateLocks(dt, f) {
    if (f.lock) {
      for (const e of this.enemies) {
        if (this.locks.has(e)) continue;
        if (!this.lockCandidate(e)) {
          this.lockProgress.delete(e);
          continue;
        }
        const p = (this.lockProgress.get(e) || 0) + dt;
        if (p >= LOCK_TIME) {
          this.lockProgress.delete(e);
          if (this.locks.size < MAX_LOCKS) {
            this.locks.add(e);
            this.sound.lockOn();
          }
        } else {
          this.lockProgress.set(e, p);
        }
      }
    } else {
      this.lockProgress.clear();
    }
    for (const e of this.locks) if (!e.alive) this.locks.delete(e);
  }

  fireMissiles() {
    if (this.locks.size === 0 || this.missileCooldown > 0) return;
    this.missileCooldown = 0.7;
    let i = 0;
    for (const target of this.locks) {
      const side = i % 2 ? 1.4 : -1.4;
      const origin = this.ship.pos.clone().add(new THREE.Vector3(side, -0.4, -1.5));
      this.missiles.push(new Missile(this, origin, target));
      i++;
    }
    this.sound.missile();
    this.locks.clear();
  }

  bomb() {
    if (this.ship.bombs <= 0 && !this.cheats) return;
    if (!this.cheats) this.ship.bombs--;
    this.hudBomb = 0.4;
    this.sound.bomb();
    this.fx.shock(this.ship.pos, 110, 0xc8f0ff, 0.9);
    this.fx.flash(this.ship.pos, 40, 0xffffff, 0.45);
    this.shake = Math.max(this.shake, 1.2);
    for (const sh of this.shots) sh.remove();
    this.shots.length = 0;
    for (const e of [...this.enemies]) {
      if (!e.alive || e.pos.z > this.ship.pos.z + 40) continue;
      this.hitEntity(e, 12, e.pos, 'bomb');
    }
    for (const r of this.rocks) if (r.alive) this.hitEntity(r, 2, r.pos, 'bomb');
  }

  updateWingmen(dt) {
    for (const w of this.wingmen) {
      w.fireTimer -= dt;
      if (w.fireTimer > 0) continue;
      w.fireTimer = 0.9 + Math.random() * 0.4;
      let best = null;
      let bestD = 200;
      for (const e of this.enemies) {
        if (!e.alive || !e.counted) continue;
        const d = e.pos.distanceTo(w.pos);
        if (e.pos.z < w.pos.z && d < bestD) {
          bestD = d;
          best = e;
        }
      }
      if (!best) continue;
      this.fx.beam(w.pos, best.pos, 0xa8ffb0, 0.1);
      this.hitEntity(best, 1, best.pos, 'wing');
    }
  }

  // ----- Damage and scoring -----

  // Applies damage to any hittable entity. Rules for shielded core and pillars live here.
  hitEntity(e, dmg, point, source) {
    if (!e.alive) return;
    if (e.kind === 'pillar') {
      this.fx.sparks(point, 0xffd9a0, 6);
      return;
    }
    if (e.kind === 'boss' && e.part === 'core' && !e.owner.coreExposed()) {
      this.fx.sparks(point, 0x63f2ff, 6);
      this.sound.deflect();
      return;
    }
    e.hp -= dmg;
    e.flash = 1;
    if (e.hp > 0) {
      const color = source === 'missile' ? 0xffb36b : e.kind === 'rock' ? 0xd7c6a8 : 0xfff27a;
      this.fx.sparks(point, color, 8);
      return;
    }
    this.destroy(e, point);
  }

  destroy(e, point) {
    e.alive = false;
    this.score += e.score;
    if (e.counted) this.kills++;
    const key = e.part || e.kind;
    const size = EXPLOSION_SIZE[key] ?? 1;
    this.fx.explode(point || e.pos, size);
    this.sound.explode(size);
    this.input.rumble(0.25 + 0.15 * size, 0.3, 180);
    this.shake = Math.max(this.shake, 0.25 * size);
    if (e.part === 'shield' || e.part === 'turret') e.group.visible = false;
    if (e.kind === 'gunship' || (e.counted && Math.random() < 0.08)) {
      this.addPickup('heal', e.pos.x, e.pos.y, e.pos.z);
    }
    if (e.part === 'core') this.onBossDefeated(e);
    if (e.kind === 'rock' && e.size > 1.6) {
      for (let i = 0; i < 2; i++) {
        const v = { x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 4, z: 0 };
        this.addRock('rock0', e.pos.x + (i ? 1.2 : -1.2) * e.size, e.pos.y, e.pos.z, e.size * 0.45, v);
      }
    }
  }

  onBossDefeated(core) {
    this.bossDefeated = true;
    this.say('Command', 'Core destroyed. Venom is finished. Outstanding.', 6);
    for (let i = 0; i < 9; i++) {
      this.timers.push({
        t: 0.25 * i,
        fn: () => {
          const off = new THREE.Vector3((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
          this.fx.explode(core.pos.clone().add(off), 2.4);
          this.sound.explode(2.4);
        },
      });
    }
    this.timers.push({ t: 2.4, fn: () => { this.boss.group.visible = false; } });
  }

  damageShip(amount) {
    if (this.cheats || this.ship.invuln > 0 || this.state !== 'play') return;
    this.ship.hull -= amount * this.diff;
    this.ship.invuln = 0.9;
    this.hitsTaken++;
    this.hudHit = 0.35;
    this.shake = Math.max(this.shake, 0.9);
    this.sound.hit();
    this.input.rumble(0.8, 0.5, 260);
    this.fx.sparks(this.ship.pos, 0xff7a5a, 12);
    if (this.ship.hull <= 0) {
      this.ship.hull = 0;
      this.ship.group.visible = false;
      this.fx.explode(this.ship.pos, 2.4);
      this.sound.explode(2.4);
      this.input.rumble(1, 0.8, 600);
      this.state = 'failed';
      this.endTimer = 2.8;
    }
  }

  // Enemy shots are distance-tested against the ship. Barrel roll deflects them.
  updateShots(dt) {
    const s = this.ship;
    const deflectR = s.rolling ? 3.6 : 1.6;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const sh = this.shots[i];
      sh.update(dt);
      const d = sh.pos.distanceTo(s.pos);
      if (d < deflectR) {
        if (s.rolling) {
          this.fx.sparks(sh.pos, 0x7ff7ff, 8);
          this.sound.deflect();
        } else {
          this.damageShip(12 * sh.dmg);
          this.fx.sparks(sh.pos, 0xff6b5a, 6);
        }
        sh.remove();
        this.shots.splice(i, 1);
      } else if (sh.life <= 0 || sh.pos.z > s.pos.z + 40) {
        sh.remove();
        this.shots.splice(i, 1);
      }
    }
  }

  updateMissiles(dt) {
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.update(dt);
      const t = m.target;
      const hit = !!t && t.alive && m.pos.distanceTo(t.pos) < t.radius + 0.6;
      if (hit) {
        this.hitEntity(t, 3, m.pos, 'missile');
        this.fx.explode(m.pos, 0.35, [0xff9a4a, 0xffe2a0]);
      }
      if (hit || m.life <= 0) {
        m.remove();
        this.missiles.splice(i, 1);
      }
    }
  }

  // Ship vs enemies, rocks and pillars, via an overlap query on the ship's ball.
  updateShipCollisions() {
    const s = this.ship;
    for (const e of this.phys.overlapBall(s.pos, 1.3)) {
      if (!e.alive) continue;
      const side = Math.sign(s.pos.x - e.pos.x) || 1;
      if (e.kind === 'pillar') {
        this.damageShip(18);
        s.vel.x += side * 12;
        s.pos.x += side * 0.6;
      } else if (e.kind === 'rock') {
        this.damageShip(14);
        this.hitEntity(e, 2, e.pos, 'ram');
        s.vel.x += side * 8;
        s.vel.y += (Math.sign(s.pos.y - e.pos.y) || 1) * 5;
      } else if (e.counted || e.part) {
        this.damageShip(e.part === 'core' ? 30 : 22);
        if (e.counted) this.destroy(e, e.pos);
        s.vel.x += side * 6;
      }
    }
  }

  updatePickups() {
    const s = this.ship.pos;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if (p.pos.distanceTo(s) < p.radius) {
        if (p.type === 'ring') {
          this.rings++;
          this.score += 500;
          this.sound.ring();
          this.say('Command', `Gate ring ${this.rings} cleared.`, 1.8);
        } else if (p.type === 'heal') {
          this.ship.hull = Math.min(this.ship.maxHull, this.ship.hull + 30);
          this.sound.pickup();
        } else {
          this.ship.bombs = Math.min(5, this.ship.bombs + 1);
          this.sound.pickup();
        }
        this.fx.sparks(p.pos, 0xffffff, 10);
        this.root.remove(p.group);
        this.pickups.splice(i, 1);
      } else if (p.pos.z > s.z + 40) {
        this.root.remove(p.group);
        this.pickups.splice(i, 1);
      }
    }
  }

  // Removes dead or passed actors from the scene and the physics world.
  cull() {
    const zLimit = this.ship.pos.z + 40;
    this.enemies = this.enemies.filter((e) => {
      const keep = e.alive && e.pos.z < zLimit;
      if (!keep) {
        this.phys.remove(e);
        if (e.ownsGroup) this.root.remove(e.group);
        this.locks.delete(e);
        this.lockProgress.delete(e);
      }
      return keep;
    });
    this.rocks = this.rocks.filter((r) => {
      const keep = r.alive && r.pos.z < zLimit && Math.abs(r.pos.y) < 90;
      if (!keep) {
        this.phys.remove(r);
        this.root.remove(r.group);
        this.locks.delete(r);
      }
      return keep;
    });
  }

  // Mission end: boss core destroyed, or the lane is run and no escorts remain.
  checkEnd() {
    const hostilesLeft = this.enemies.some((e) => e.counted && e.alive);
    const done = this.mission.boss
      ? this.bossDefeated
      : this.dist >= this.mission.length && !hostilesLeft;
    if (done) {
      this.state = 'clear';
      this.endTimer = this.mission.boss ? 4.5 : 2.5;
      this.say('Command', 'Sector clear. Nice work, pilot.', 3);
    }
  }

  // Result summary for the results screen. Medal rules: gold = 90% kills and at most 3 hits taken,
  // silver = 70% kills and at most 8 hits taken, bronze otherwise.
  result() {
    const ratio = this.spawned ? this.kills / this.spawned : 1;
    let medal = 'none';
    if (this.state === 'clear') {
      medal = ratio >= 0.9 && this.hitsTaken <= 3 ? 'gold' : ratio >= 0.7 && this.hitsTaken <= 8 ? 'silver' : 'bronze';
    }
    const clearBonus = this.state === 'clear' ? 5000 : 0;
    return {
      state: this.state,
      medal,
      kills: this.kills,
      spawned: this.spawned,
      hitsTaken: this.hitsTaken,
      rings: this.rings,
      bombsLeft: this.ship.bombs,
      time: this.time,
      score: this.score + this.rings * 500 + clearBonus,
    };
  }

  updateCamera(dt) {
    const s = this.ship.pos;
    const cam = this.render.camera;
    const tgt = _a.set(s.x * 0.35, s.y * 0.35 + 3.4, s.z + 14);
    const look = _b.set(s.x * 0.6, s.y * 0.55 + 0.5, s.z - 40);
    this.camPos.lerp(tgt, 1 - Math.exp(-dt * 6));
    this.camLook.lerp(look, 1 - Math.exp(-dt * 7));
    const sh = settings.shake ? this.shake : 0;
    cam.position.set(
      this.camPos.x + (Math.random() - 0.5) * sh * 0.8,
      this.camPos.y + (Math.random() - 0.5) * sh * 0.8,
      this.camPos.z,
    );
    cam.lookAt(this.camLook);
    const fovTarget = 60 + (this.ship.speedScale - 1) * 9;
    this.camFov += (fovTarget - this.camFov) * Math.min(1, dt * 4);
    if (Math.abs(cam.fov - this.camFov) > 0.01) {
      cam.fov = this.camFov;
      cam.updateProjectionMatrix();
    }
    cam.updateMatrixWorld();
    this.render.followCamera(this.ship.pos);
  }

  // World point to screen pixels. Returns null when the point is behind the camera.
  project(p) {
    const v = _a.copy(p).project(this.render.camera);
    if (v.z > 1) return null;
    return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight };
  }

  dispose() {
    this.render.scene.remove(this.root);
  }
}
