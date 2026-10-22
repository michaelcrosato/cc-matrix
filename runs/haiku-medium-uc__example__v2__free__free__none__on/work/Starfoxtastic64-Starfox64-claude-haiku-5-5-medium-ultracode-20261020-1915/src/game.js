// Stage runtime: spawns the scripted timeline, runs the player, enemies, weapons and collisions,
// tracks score and medal progress, and resolves the stage into a result.
import * as THREE from 'three/webgpu';
import { glowMat } from './gfx.js';
import { arwing, BOLT_GEO, BULLET_GEO, dunes, MISSILE_GEO, pickupOrb, planet, ringGate, rock } from './models.js';
import { Boss, Enemy } from './enemies.js';
import { Player } from './player.js';
import { input } from './input.js';
import { settings } from './settings.js';
import { clamp, damp, rng } from './util.js';

const Z_AXIS = new THREE.Vector3(0, 0, 1);
const NEG_Z = new THREE.Vector3(0, 0, -1);
const _v = new THREE.Vector3();

const LASER_MAT = { player: glowMat(0x9dffb8, 3), wing: glowMat(0x7ad7ff, 3), enemy: glowMat(0xff5c7a, 3) };
const BULLET_MAT = glowMat(0xff8a3b, 3);
const MISSILE_MAT = glowMat(0xffd27a, 3);
const PICKUP_COLORS = { repair: 0x7dffa0, bomb: 0x66b8ff, laser: 0xffe066 };
const PICKUP_KINDS = ['repair', 'bomb', 'laser'];

// Closest-point test: does segment a→b pass within r of c?
function segHitsSphere(a, b, c, r) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abz = b.z - a.z;
  const len2 = abx * abx + aby * aby + abz * abz || 1e-6;
  const t = clamp(((c.x - a.x) * abx + (c.y - a.y) * aby + (c.z - a.z) * abz) / len2, 0, 1);
  const dx = a.x + abx * t - c.x;
  const dy = a.y + aby * t - c.y;
  const dz = a.z + abz * t - c.z;
  return dx * dx + dy * dy + dz * dz <= r * r;
}

export class Game {
  constructor({ stage, gfx, physics, fx, audio, hud, ai = null, rand = Math.random }) {
    this.stage = stage;
    this.gfx = gfx;
    this.scene = gfx.scene;
    this.camera = gfx.camera;
    this.physics = physics;
    this.fx = fx;
    this.audio = audio;
    this.hud = hud;
    this.ai = ai;
    this.rand = rand;
    this.player = new Player();
    this.player.god = !!ai;
    this.curve = stage.curve;
    this.enemies = [];
    this.boss = null;
    this.lasers = [];
    this.missiles = [];
    this.bullets = [];
    this.pickups = [];
    this.statics = [];
    this.staticRefs = [];
    this.spawnIdx = 0;
    this.radioIdx = 0;
    this.pickupIdx = 0;
    this.time = 0;
    this.phase = 'play';
    this.phaseT = 0;
    this.kills = 0;
    this.score = 0;
    this.hitsTaken = 0;
    this.route = null;
    this.wallCd = 0;
    this.camPos = null;
    this.result = null;
    this.endS = stage.fork ? stage.fork.s : stage.length;
    this.tallyTotal = stage.spawns.filter((r) => ['drone', 'serpent', 'sentinel', 'hulk'].includes(r.type)).length;
    this.ctl = null;
    this.ship = null;
    this.wings = [];
    this.wingFire = 0;
  }

  // Build the static world (ship, wingmen, environment, walls, gates) and set the sky.
  start() {
    const { stage } = this;
    this.gfx.setAtmosphere(stage.atmosphere);
    this.ship = arwing(0xc7d1e3, 0xd6402f);
    this.scene.add(this.ship);
    this.wings = [
      { mesh: arwing(0x3a7bd5, 0x1d3d7a), side: -1, lx: -4.2, ly: -0.8, wfire: 0.3 },
      { mesh: arwing(0x3fbf6a, 0x1d6a3a), side: 1, lx: 4.2, ly: -0.8, wfire: 0.7 },
    ];
    for (const w of this.wings) {
      w.mesh.scale.setScalar(0.85);
      this.scene.add(w.mesh);
    }
    this.buildEnvironment();
    this.hud.beginStage(stage);
    this.audio.setMusic(stage.music);
    this.radio('marlow', stage.briefing);
    this.audio.sfx('launch');
  }

  // Remove everything this stage added to the scene and physics world.
  dispose() {
    for (const e of this.enemies) e.remove(this);
    this.enemies.length = 0;
    if (this.boss) this.scene.remove(this.boss.root);
    for (const l of this.lasers) this.scene.remove(l.mesh);
    for (const m of this.missiles) this.scene.remove(m.mesh);
    for (const b of this.bullets) this.scene.remove(b.mesh);
    for (const p of this.pickups) this.scene.remove(p.mesh);
    for (const s of this.statics) this.scene.remove(s);
    for (const r of this.staticRefs) this.physics.removeStatic(r);
    this.scene.remove(this.ship);
    for (const w of this.wings) this.scene.remove(w.mesh);
    this.fx.reset();
    this.lasers.length = 0;
    this.missiles.length = 0;
    this.bullets.length = 0;
    this.pickups.length = 0;
    this.statics.length = 0;
    this.staticRefs.length = 0;
  }

  buildEnvironment() {
    const { stage } = this;
    const rand = rng(stage.spawns.length * 13 + 5);
    const pt = (s, lx, ly) => {
      const c = this.curve(s);
      return { x: c.x + lx, y: c.y + ly, z: -s };
    };

    for (const pr of stage.props) {
      const mesh = planet(pr.r, pr.base, pr.halo);
      const p = pt(pr.s, pr.lx, pr.ly);
      mesh.position.set(p.x, p.y, p.z);
      this.addStatic(mesh);
    }

    if (stage.env === 'dunes') {
      const floor = dunes(520, stage.length + 1600, 77);
      floor.position.set(0, -10, -stage.length / 2);
      this.addStatic(floor);
      for (let s = 240; s < stage.length; s += 260) {
        const spire = rock(5, 26 + rand() * 14, 5, Math.floor(s));
        const p = pt(s, (rand() < 0.5 ? -1 : 1) * (26 + rand() * 18), -4);
        spire.position.set(p.x, p.y + 6, p.z);
        this.addStatic(spire);
      }
    }

    if (stage.env === 'canyon') {
      const variants = [rock(6, 22, 60, 11), rock(6, 22, 60, 12), rock(6, 22, 60, 13)];
      const wallLx = stage.cfg.wallLx;
      let k = 0;
      for (let s = 0; s < stage.length; s += 60) {
        for (const side of [-1, 1]) {
          const base = variants[k++ % variants.length];
          const mesh = base.clone();
          const p = pt(s + 30, side * wallLx, 6);
          mesh.position.set(p.x, p.y, p.z);
          this.addStatic(mesh);
          this.staticRefs.push(this.physics.addBox(2, 8, 30, p.x, p.y, p.z, 'wall', null));
        }
      }
    }

    if (stage.fork) {
      const left = ringGate(6.5, 0x4fc3ff);
      const right = ringGate(6.5, 0xff7a3b);
      const pl = pt(stage.fork.s, -8, 0);
      const pr = pt(stage.fork.s, 8, 0);
      left.position.set(pl.x, pl.y, pl.z);
      right.position.set(pr.x, pr.y, pr.z);
      this.addStatic(left);
      this.addStatic(right);
    }

    if (stage.env === 'space' || stage.env === 'belt') {
      // A few distant gates so the far field has rhythm while flying.
      for (let s = 1200; s < stage.length - 1500; s += 1400) {
        const g = ringGate(14, 0x9fd8ff);
        const p = pt(s, (rand() * 2 - 1) * 16, (rand() * 2 - 1) * 6);
        g.position.set(p.x, p.y, p.z);
        g.rotation.y = rand() * 0.6 - 0.3;
        this.addStatic(g);
      }
    }
  }

  addStatic(obj) {
    this.scene.add(obj);
    this.statics.push(obj);
  }

  // World-space position of the ship.
  playerWorld() {
    const c = this.curve(this.player.s);
    return { x: c.x + this.player.px, y: c.y + this.player.py, z: -this.player.s };
  }

  // Everything a laser or lock-on can hit (enemies except asteroids, plus live boss parts).
  allTargets() {
    const list = [];
    for (const e of this.enemies) if (e.alive && e.type !== 'asteroid') list.push(e);
    if (this.boss && this.boss.alive && this.boss.dying === 0) list.push(...this.boss.activeTargets());
    return list;
  }

  update(dt, ctl) {
    this.time += dt;
    this.phaseT += dt;
    this.ctl = ctl;
    const p = this.player;

    if (this.phase === 'play') {
      p.update(dt, ctl, this);
      this.enforceBounds();
      this.spawnPending();
      this.fireWingmen(dt);
      this.checkRadio();
      this.checkEnd();
    } else if (this.phase === 'clear') {
      // Keep flying through the clear sequence so the ship doesn't stop dead.
      p.s += p.speed * dt;
      this.fireWingmen(dt);
      if (this.phaseT > 2.6) this.finish('cleared');
    } else if (this.phase === 'dead') {
      if (this.phaseT > 2.4) this.finish('dead');
    }

    if (this.phase !== 'dead') this.updateEnemies(dt);
    if (this.boss) this.boss.update(dt, this);
    this.updateLasers(dt);
    this.updateMissiles(dt);
    this.updateBullets(dt);
    this.updatePickups(dt);
    this.wallCd -= dt;

    if (this.phase !== 'dead') {
      this.physics.step(dt);
      this.collidePlayer();
    }

    this.updateVisuals(dt);
    this.fx.update(dt);
    this.fx.updateRings(dt, this.camera);
    this.hud.frame(this, dt);
  }

  // Keep the ship inside the stage bounds, above the dunes, and short of the boss arena.
  enforceBounds() {
    const p = this.player;
    if (this.boss && this.boss.alive && p.s > this.boss.s - 260) {
      p.s = this.boss.s - 260;
      p.speed = Math.min(p.speed, 0);
    }
    if (this.stage.env === 'dunes') {
      const c = this.curve(p.s);
      if (c.y + p.py < -2.5) p.py = -2.5 - c.y;
    }
  }

  spawnPending() {
    const p = this.player;
    const { stage } = this;
    while (this.spawnIdx < stage.spawns.length && stage.spawns[this.spawnIdx].s <= p.s + 420) {
      const e = new Enemy(stage.spawns[this.spawnIdx++]);
      e.activate(this);
      this.enemies.push(e);
    }
    while (this.pickupIdx < stage.pickups.length && stage.pickups[this.pickupIdx].s <= p.s + 420) {
      const rec = stage.pickups[this.pickupIdx++];
      const c = this.curve(rec.s);
      this.spawnPickup(rec.kind, { x: c.x + rec.lx, y: c.y + rec.ly, z: -rec.s }, 1e9);
    }
    if (stage.boss && !this.boss && stage.boss.s <= p.s + 900) {
      this.boss = new Boss(stage.boss.s, stage.boss.name);
      this.boss.activate(this);
      this.radio('marlow', 'Warning: Vorrack Titan ahead. Shields up, all wings.');
      this.audio.sfx('warn');
      this.hud.toast('BOSS: VORRACK TITAN', 0xff5c7a);
    }
  }

  checkRadio() {
    const { radio } = this.stage;
    while (this.radioIdx < radio.length && radio[this.radioIdx].s <= this.player.s) {
      const line = radio[this.radioIdx++];
      this.radio(line.who, line.text);
    }
  }

  checkEnd() {
    const p = this.player;
    if (this.boss) return;
    if (this.stage.fork && p.s >= this.stage.fork.s) {
      this.route = p.px < 0 ? this.stage.fork.left : this.stage.fork.right;
      this.enterPhase('clear');
      this.radio('marlow', `Route locked: ${this.route === 'kessar' ? 'Kessar Debris Belt' : 'Solace Canyon'}. Good flying.`);
      return;
    }
    if (!this.stage.fork && p.s >= this.endS) {
      this.enterPhase('clear');
      this.radio('marlow', 'Sector clear. Nice flying, Ace.');
    }
  }

  enterPhase(name) {
    this.phase = name;
    this.phaseT = 0;
  }

  updateEnemies(dt) {
    const p = this.player;
    for (const e of this.enemies) {
      if (e.alive) e.update(dt, this);
    }
    this.enemies = this.enemies.filter((e) => {
      if (e.alive && e.s >= p.s - 160) return true;
      if (e.alive) e.remove(this);
      return false;
    });
  }

  // Player shots from the Arwing; twin cannons fire two parallel bolts.
  firePlayerLaser(player, level) {
    const o = this.playerWorld();
    const offs = level >= 2 ? [-1.0, 1.0] : [0];
    for (const dx of offs) {
      this.spawnLaser({ x: o.x + dx, y: o.y, z: o.z - 1.8 }, { x: 0, y: 0, z: -1 }, 240, 1, LASER_MAT.player, 'player');
    }
    this.audio.sfx('laser');
  }

  spawnLaser(origin, dir, speed, dmg, mat, owner) {
    const mesh = new THREE.Mesh(BOLT_GEO, mat);
    mesh.quaternion.setFromUnitVectors(Z_AXIS, _v.set(dir.x, dir.y, dir.z));
    mesh.position.set(origin.x, origin.y, origin.z);
    this.scene.add(mesh);
    this.lasers.push({ mesh, x: origin.x, y: origin.y, z: origin.z, dx: dir.x, dy: dir.y, dz: dir.z, speed, dmg, dist: 0, owner });
  }

  // Wingmen trail the ship and shoot at whatever is directly ahead of them.
  fireWingmen(dt) {
    if (!this.ship) return;
    const o = this.playerWorld();
    for (const w of this.wings) {
      const dest = { x: o.x + w.lx, y: o.y + w.ly, z: o.z + 2.6 };
      w.mesh.position.x = damp(w.mesh.position.x, dest.x, 4, dt);
      w.mesh.position.y = damp(w.mesh.position.y, dest.y, 4, dt);
      w.mesh.position.z = damp(w.mesh.position.z, dest.z, 4, dt);
      w.wfire -= dt;
      if (w.wfire <= 0) {
        w.wfire = 0.55;
        const p = w.mesh.position;
        this.spawnLaser({ x: p.x, y: p.y, z: p.z - 1.5 }, { x: 0, y: 0, z: -1 }, 230, 1, LASER_MAT.wing, 'wing');
      }
    }
  }

  updateLasers(dt) {
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const l = this.lasers[i];
      const step = l.speed * dt;
      const a = { x: l.x, y: l.y, z: l.z };
      l.x += l.dx * step;
      l.y += l.dy * step;
      l.z += l.dz * step;
      l.dist += step;
      const b = { x: l.x, y: l.y, z: l.z };
      let dead = l.dist > 900;

      if (!dead && l.owner === 'player') {
        const hit = this.physics.raycast(a.x, a.y, a.z, l.dx, l.dy, l.dz, step);
        if (hit) {
          if (hit.tag === 'asteroid') hit.owner.hit(l.dmg, this);
          this.fx.spark({ x: a.x + l.dx * hit.t, y: a.y + l.dy * hit.t, z: a.z + l.dz * hit.t }, 0xbfffd0, 5);
          dead = true;
        }
      }
      if (!dead) {
        if (l.owner === 'player' || l.owner === 'wing') {
          for (const t of this.allTargets()) {
            const c = t.worldPos(this);
            if (segHitsSphere(a, b, c, t.radius + 0.25)) {
              t.hit(l.dmg, this);
              dead = true;
              break;
            }
          }
        }
      }
      if (dead) {
        this.scene.remove(l.mesh);
        this.lasers.splice(i, 1);
        continue;
      }
      l.mesh.position.set(l.x, l.y, l.z);
    }
  }

  // Homing volleys from a lock-on launch.
  launchMissiles(targets) {
    const o = this.playerWorld();
    targets.forEach((target, i) => {
      const mesh = new THREE.Mesh(MISSILE_GEO, MISSILE_MAT);
      mesh.position.set(o.x + (i - (targets.length - 1) / 2) * 0.6, o.y, o.z - 2);
      this.scene.add(mesh);
      this.missiles.push({
        mesh,
        pos: mesh.position.clone(),
        vel: new THREE.Vector3(0, 0, -60),
        target,
        life: 4,
      });
    });
  }

  updateMissiles(dt) {
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.life -= dt;
      const target = m.target;
      if (target.alive) {
        const t = target.worldPos(this);
        _v.set(t.x - m.pos.x, t.y - m.pos.y, t.z - m.pos.z).normalize();
        const desired = _v.multiplyScalar(130);
        m.vel.lerp(desired, 1 - Math.exp(-5 * dt));
        const d = Math.hypot(t.x - m.pos.x, t.y - m.pos.y, t.z - m.pos.z);
        if (d < target.radius + 0.8) {
          target.hit(3, this);
          this.scene.remove(m.mesh);
          this.missiles.splice(i, 1);
          continue;
        }
      }
      m.pos.addScaledVector(m.vel, dt);
      m.mesh.position.copy(m.pos);
      m.mesh.quaternion.setFromUnitVectors(NEG_Z, _v.copy(m.vel).normalize());
      if (m.life <= 0) {
        this.fx.spark(m.pos, 0xffd27a, 8);
        this.scene.remove(m.mesh);
        this.missiles.splice(i, 1);
      }
    }
  }

  // Enemy projectile. kind 'bullet' flies straight; kind 'missile' steers toward the ship slowly.
  enemyFire(pos, dir, speed, kind) {
    const mesh = new THREE.Mesh(kind === 'missile' ? MISSILE_GEO : BULLET_GEO, kind === 'missile' ? MISSILE_MAT : BULLET_MAT);
    mesh.position.set(pos.x, pos.y, pos.z);
    this.scene.add(mesh);
    this.bullets.push({
      mesh,
      x: pos.x, y: pos.y, z: pos.z,
      vx: dir.x * speed, vy: dir.y * speed, vz: dir.z * speed,
      speed,
      kind,
      life: 7,
    });
    if (kind === 'missile') this.audio.sfx('laserEnemy');
  }

  updateBullets(dt) {
    const player = this.playerWorld();
    const p = this.player;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life -= dt;
      if (b.kind === 'missile') {
        const dx = player.x - b.x;
        const dy = player.y - b.y;
        const dz = player.z - b.z;
        const len = Math.hypot(dx, dy, dz) || 1;
        const k = 1 - Math.exp(-1.1 * dt);
        b.vx += ((dx / len) * b.speed - b.vx) * k;
        b.vy += ((dy / len) * b.speed - b.vy) * k;
        b.vz += ((dz / len) * b.speed - b.vz) * k;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;
      b.mesh.position.set(b.x, b.y, b.z);
      if (b.kind === 'missile') {
        _v.set(b.vx, b.vy, b.vz).normalize();
        b.mesh.quaternion.setFromUnitVectors(NEG_Z, _v);
      }

      const d = Math.hypot(player.x - b.x, player.y - b.y, player.z - b.z);
      let remove = b.life <= 0;
      if (!remove && d < 1.5) {
        if (p.rolling) {
          // Barrel roll deflects the shot.
          this.fx.spark({ x: b.x, y: b.y, z: b.z }, 0x9dffb8, 10);
        } else {
          this.damagePlayer(b.kind === 'missile' ? 14 : 8, 'bullet');
          this.fx.spark({ x: b.x, y: b.y, z: b.z }, 0xff8a3b, 10);
        }
        remove = true;
      }
      if (remove) {
        this.scene.remove(b.mesh);
        this.bullets.splice(i, 1);
      }
    }
  }

  spawnPickup(kind, pos, life) {
    const mesh = pickupOrb(PICKUP_COLORS[kind]);
    mesh.position.set(pos.x, pos.y, pos.z);
    this.scene.add(mesh);
    this.pickups.push({ mesh, kind, pos: { ...pos }, life, t: 0 });
  }

  updatePickups(dt) {
    const player = this.playerWorld();
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      pk.t += dt;
      pk.life -= dt;
      pk.mesh.rotation.y += dt * 1.6;
      pk.mesh.position.y = pk.pos.y + Math.sin(pk.t * 2.2) * 0.5;
      const d = Math.hypot(player.x - pk.pos.x, player.y - pk.pos.y, player.z - pk.pos.z);
      if (d < 4.5 && !this.player.dead) {
        this.collectPickup(pk.kind);
        this.scene.remove(pk.mesh);
        this.pickups.splice(i, 1);
      } else if (pk.life <= 0 || pk.pos.z > player.z + 80) {
        this.scene.remove(pk.mesh);
        this.pickups.splice(i, 1);
      }
    }
  }

  collectPickup(kind) {
    const p = this.player;
    if (kind === 'repair') {
      p.heal(30);
      this.hud.toast('SHIELD REPAIR +30', PICKUP_COLORS.repair);
    } else if (kind === 'bomb') {
      p.bombs = Math.min(p.maxBombs, p.bombs + 1);
      this.hud.toast('NOVA BOMB +1', PICKUP_COLORS.bomb);
    } else if (kind === 'laser') {
      p.laser = 2;
      this.hud.toast('TWIN LASERS', PICKUP_COLORS.laser);
    }
    this.audio.sfx('pickup');
  }

  // Ram and wall contacts with the player. Walls bounce the ship; asteroids shatter.
  collidePlayer() {
    const player = this.playerWorld();
    const hits = this.physics.overlapSphere(player.x, player.y, player.z, 1.1);
    for (const info of hits) {
      if (info.tag === 'asteroid' && info.owner.alive) {
        info.owner.kill(this);
        this.damagePlayer(16, 'asteroid');
      } else if (info.tag === 'wall' && this.wallCd <= 0) {
        this.wallCd = 0.45;
        this.player.px -= Math.sign(this.player.px || 1) * 2.4;
        this.damagePlayer(5, 'wall');
        this.fx.spark(player, 0xffb27a, 12);
      }
    }
    for (const e of this.enemies) {
      if (!e.alive || e.type === 'asteroid') continue;
      const c = e.worldPos(this);
      if (Math.hypot(c.x - player.x, c.y - player.y, c.z - player.z) < e.radius + 1.0) {
        if (e.type === 'drone' || e.type === 'serpent') {
          e.kill(this);
          this.damagePlayer(16, 'ram');
        } else if (!e.rammed || this.time - e.rammed > 1) {
          e.rammed = this.time;
          this.damagePlayer(10, 'ram');
        }
      }
    }
  }

  // Player damage: applies the shield hit and, on zero shield, starts the death sequence.
  damagePlayer(amount, source) {
    const hit = this.player.damage(amount, this, source);
    if (hit && this.player.dead && this.phase === 'play') {
      this.fx.explode(this.playerWorld(), 2.2, 0xff8a3b, true);
      this.audio.sfx('explodeBig');
      this.enterPhase('dead');
      this.hud.toast('SHIP LOST', 0xff5c7a);
    }
    return hit;
  }

  onPlayerHit(amount, source) {
    this.hitsTaken += 1;
    this.hud.damageFlash(amount);
    this.audio.sfx('hit');
    this.fx.shake = Math.max(this.fx.shake, Math.min(1, amount / 12));
    if (source === 'wall' || source === 'ram' || source === 'asteroid') this.fx.shake = Math.max(this.fx.shake, 0.8);
    this.hud.setShieldPulse();
    input.rumble(0.6, 150);
  }

  // Lock-on candidates: targets ahead of the ship, inside the reticle cone around the ship's projected spot.
  lockCandidates() {
    const ship = this.playerWorld();
    _v.set(ship.x, ship.y, ship.z).project(this.camera);
    const sx = _v.x;
    const sy = _v.y;
    const out = [];
    for (const t of this.allTargets()) {
      if (!t.lockable) continue;
      const w = t.worldPos(this);
      const ahead = ship.z - w.z;
      if (ahead < 14 || ahead > 320) continue;
      _v.set(w.x, w.y, w.z).project(this.camera);
      if (_v.z > 1) continue;
      const dx = _v.x - sx;
      const dy = _v.y - sy;
      if (Math.abs(dx) < 0.3 && Math.abs(dy) < 0.34) out.push({ t, d: dx * dx + dy * dy });
    }
    out.sort((a, b) => a.d - b.d);
    return out.map((o) => o.t);
  }

  // Nova bomb: clears the screen ahead and hits the boss for heavy damage.
  detonateNova() {
    const o = this.playerWorld();
    this.fx.shockwave(o, 140, 1.2, 0x66e0ff);
    this.fx.explode({ x: o.x, y: o.y, z: o.z - 40 }, 3, 0x66e0ff, true);
    this.audio.sfx('bomb');
    this.hud.flash(0x66e0ff);
    this.fx.shake = Math.max(this.fx.shake, 1.2);
    const p = this.player.s;
    for (const e of this.enemies) {
      if (!e.alive || e.type === 'asteroid') continue;
      if (e.s > p - 40 && e.s < p + 700) e.hit(99, this);
    }
    if (this.boss && this.boss.alive && this.boss.dying === 0) {
      for (const t of this.boss.activeTargets()) {
        t.hit(10, this);
      }
    }
    for (const b of this.bullets) this.fx.spark({ x: b.x, y: b.y, z: b.z }, 0x66e0ff, 4);
    for (const b of this.bullets) this.scene.remove(b.mesh);
    this.bullets.length = 0;
  }

  // Score and kill tally for enemies and boss parts.
  onEnemyDown(target, pos) {
    this.score += target.score || 0;
    if (target.tally) this.kills += 1;
    this.hud.popScore(target.score || 0);
    if (target.tally && this.rand() < 0.2) {
      const kind = PICKUP_KINDS[Math.floor(this.rand() * PICKUP_KINDS.length)];
      this.spawnPickup(kind, { x: pos.x, y: pos.y, z: pos.z }, 12);
    }
  }

  onBossDown() {
    this.score += 5000;
    this.hud.toast('VORRACK TITAN DESTROYED', 0xffe066);
    this.audio.sfx('win');
    this.enterPhase('clear');
  }

  radio(who, text) {
    this.hud.radio(who, text);
    this.audio.sfx('chatter');
  }

  // Visual updates: ship pose, camera, lights, and the boss core spin.
  updateVisuals(dt) {
    const p = this.player;
    const c = this.curve(p.s);
    const w = this.playerWorld();
    if (this.ship) {
      const dead = p.dead;
      this.ship.visible = !dead;
      this.ship.position.set(w.x, w.y, w.z);
      const yaw = -(this.ctl ? this.ctl.ax : 0) * 0.25;
      const pitch = (this.ctl ? this.ctl.ay : 0) * 0.18;
      this.ship.rotation.set(pitch, yaw, p.rollAngle - p.bank * 0.9);
    }
    const tx = c.x + p.px * 0.35;
    const ty = c.y + p.py * 0.35 + 3.2;
    const tz = -p.s + 15;
    if (!this.camPos) this.camPos = new THREE.Vector3(tx, ty, tz);
    this.camPos.x = damp(this.camPos.x, tx, 9, dt);
    this.camPos.y = damp(this.camPos.y, ty, 9, dt);
    this.camPos.z = damp(this.camPos.z, tz, 14, dt);
    const shake = this.fx.shakeOffset(settings.screenShake);
    this.camera.position.set(this.camPos.x + shake.x, this.camPos.y + shake.y, this.camPos.z);
    const la = this.curve(p.s + 80);
    this.camera.lookAt(la.x + p.px * 0.25, la.y + p.py * 0.2 + 0.8, -p.s - 80);
    this.camera.updateMatrixWorld();
    this.gfx.followFocus(new THREE.Vector3(w.x, w.y, w.z));
  }

  // Build the summary used by the results screen and the campaign progress tracker.
  buildResult(status) {
    const time = this.time;
    const total = this.tallyTotal || 1;
    const ratio = this.kills / total;
    let medal = null;
    if (status === 'cleared') {
      if (ratio >= 0.9 && this.hitsTaken <= 3) medal = 'gold';
      else if (ratio >= 0.7 && this.hitsTaken <= 8) medal = 'silver';
      else medal = 'bronze';
    }
    const clearBonus = status === 'cleared' ? 5000 + Math.max(0, 240 - time) * 20 : 0;
    return {
      status,
      stageId: this.stage.id,
      stageName: this.stage.name,
      route: this.route,
      time,
      kills: this.kills,
      total: this.tallyTotal,
      hitsTaken: this.hitsTaken,
      score: this.score + clearBonus,
      bonus: clearBonus,
      medal,
      bombs: this.player.bombs,
      boss: !!this.boss,
    };
  }

  finish(status) {
    this.result = this.buildResult(status);
  }
}

export { PICKUP_KINDS };
