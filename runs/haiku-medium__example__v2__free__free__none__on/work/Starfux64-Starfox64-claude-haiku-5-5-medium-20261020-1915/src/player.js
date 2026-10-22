// The Arwing: flight, boost and brake, barrel roll, quick shots and lock-on missiles, bombs, shield and lives.
import { Vector3, Mesh, SphereGeometry } from 'three/webgpu';
import { arwing, engineGlows } from './models.js';
import { makeBasic } from './render.js';

const BOUNDS_X = 17;
const BOUNDS_Y = 9.5;
const CRUISE = 62;
const BARREL_TIME = 0.7;
const BARREL_COOLDOWN = 0.25;
const LOCK_HOLD = 0.24;
const MAX_LOCKS = 8;
const RETICLE_NDC = 0.2;
const MISSILE_SPEED = 95;

const _v = new Vector3();
const _p = new Vector3();

export class Player {
  constructor(game) {
    this.game = game;
    this.group = arwing();
    this.glows = engineGlows(this.group);
    game.scene.add(this.group);
    this.pos = new Vector3(0, 0, 0);
    this.vel = new Vector3();
    this.speed = CRUISE;
    this.alive = true;
    this.shield = 100;
    this.bombs = 3;
    this.lives = 2;
    this.outOfShips = false;
    this.invuln = 0;
    this.barrel = 0;
    this.barrelDir = 1;
    this.barrelCd = 0;
    this.fireCd = 0;
    this.fireHeld = 0;
    this.locks = [];
    this.missiles = [];
    this.respawnT = 0;
    this.rollAngle = 0;
    this.body = game.phys.body(0, 0, 0);
    this.col = game.phys.collider(this.body, 1.1, this, { sensor: true });
    this.zMin = -Infinity; // the boss hold keeps the ship from flying into the hull
    this.missileGeo = new SphereGeometry(0.35, 8, 6);
    this.missileMat = makeBasic(0xffd23f, { additive: true });
  }

  reset(z = 0) {
    this.pos.set(0, 0, z);
    this.vel.set(0, 0, 0);
    this.alive = true;
    this.shield = 100;
    this.bombs = 3;
    this.lives = 2;
    this.outOfShips = false;
    this.invuln = 0;
    this.zMin = -Infinity;
    this.group.visible = true;
    this.locks.length = 0;
    this.clearMissiles();
  }

  get barrelActive() {
    return this.barrel > 0;
  }

  // Shot from an enemy or boss. Barrel roll deflects it.
  hurt(dmg, from) {
    if (!this.alive || this.invuln > 0 || this.game.invincible) return;
    if (this.barrelActive) {
      this.game.fx.burst(from, 0x7fe3ff, 10, 10, 0.5, 0.35);
      this.game.audio.sfx('shieldHit');
      return;
    }
    this.shield -= dmg;
    this.game.flashDamage();
    this.game.shake(0.35);
    this.game.input.rumble(0.7, 180);
    this.game.audio.sfx(dmg >= 20 ? 'hurt' : 'shieldHit');
    if (this.shield <= 0) this.destroyShip();
  }

  destroyShip() {
    this.shield = 0;
    this.alive = false;
    this.outOfShips = this.lives === 0;
    if (!this.outOfShips) this.lives -= 1;
    this.respawnT = 2.8;
    this.group.visible = false;
    this.game.fx.explode(this.pos, true);
    this.game.audio.sfx('bigExplode');
    this.game.shake(1.0);
    this.game.input.rumble(1, 600);
    this.game.onPlayerDown();
  }

  update(dt, ctl) {
    this.invuln -= dt;
    this.barrelCd -= dt;
    this.fireCd -= dt;
    if (!this.alive) {
      this.respawnT -= dt;
      if (this.respawnT <= 0) {
        if (this.outOfShips) this.game.gameOver();
        else this.respawn();
      }
      return;
    }
    const st = ctl.flight();
    const boost = ctl.held('boost');
    const brake = ctl.held('brake');
    this.speed = CRUISE * (boost ? 1.7 : brake ? 0.45 : 1);
    this.game.setSpeedFx(this.speed);

    const targetVX = st.x * 24;
    const targetVY = st.y * 17;
    const k = 1 - Math.exp(-9 * dt);
    this.vel.x += (targetVX - this.vel.x) * k;
    this.vel.y += (targetVY - this.vel.y) * k;
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    if (this.barrelActive) this.pos.x += this.barrelDir * 5 * dt;
    this.pos.x = Math.max(-BOUNDS_X, Math.min(BOUNDS_X, this.pos.x));
    this.pos.y = Math.max(-BOUNDS_Y, Math.min(BOUNDS_Y, this.pos.y));
    this.pos.z = Math.max(this.pos.z - this.speed * dt, this.zMin);

    this.updateBarrel(dt, ctl);
    this.updateWeapons(dt, ctl);
    this.updateVisual(st);
    this.updateMissiles(dt);
    this.group.position.copy(this.pos);
    this.game.phys.moveBody(this.body, this.pos.x, this.pos.y, this.pos.z);
  }

  respawn() {
    this.alive = true;
    this.shield = 70;
    this.invuln = 2.5;
    this.group.visible = true;
    this.vel.set(0, 0, 0);
    this.game.announce('SHIP RESTORED', 'Back in the fight', 1.8);
  }

  updateBarrel(dt, ctl) {
    if (this.barrel > 0) this.barrel -= dt;
    if (this.barrelCd > 0 || this.barrel > 0) return;
    if (ctl.pressed('rollLeft')) this.startBarrel(-1);
    else if (ctl.pressed('rollRight')) this.startBarrel(1);
  }

  startBarrel(dir) {
    this.barrel = BARREL_TIME;
    this.barrelDir = dir;
    this.barrelCd = BARREL_COOLDOWN;
    this.game.audio.sfx('roll');
  }

  updateWeapons(dt, ctl) {
    if (ctl.pressed('fire')) this.fireHeld = 0;
    if (ctl.pressed('bomb') && this.bombs > 0) {
      this.bombs -= 1;
      this.game.bomb();
    }
    this.updateLockMarkers();
    if (ctl.held('fire')) {
      // Holding fire acquires locks. A short hold is a quick volley; a long one launches homing missiles on release.
      this.fireHeld += dt;
      if (this.fireHeld >= LOCK_HOLD) this.updateLocks();
      return;
    }
    if (this.fireHeld > 0 && this.fireHeld < LOCK_HOLD) {
      if (this.fireCd <= 0) this.fireLaser();
    } else if (this.fireHeld >= LOCK_HOLD && this.locks.length) {
      this.launchMissiles();
    }
    this.fireHeld = 0;
  }

  // Projects each lockable enemy and keeps the ones inside the reticle.
  updateLocks() {
    const cam = this.game.camera;
    for (const t of this.game.lockables()) {
      if (this.locks.length >= MAX_LOCKS) break;
      if (this.locks.some((l) => l.target === t)) continue;
      _v.copy(t.pos).project(cam);
      if (_v.z > 1 || _v.z < -1) continue;
      if (Math.hypot(_v.x, _v.y) > RETICLE_NDC) continue;
      this.locks.push({ target: t });
      this.game.audio.sfx('lock');
    }
  }

  // Drop locks on targets that died this frame so markers disappear with them.
  updateLockMarkers() {
    this.locks = this.locks.filter((l) => l.target.alive);
  }

  fireLaser() {
    this.fireCd = 0.13;
    const origin = _p.set(this.pos.x, this.pos.y - 0.2, this.pos.z - 1.6);
    // Aim at the nearest target inside the reticle, otherwise straight ahead.
    let aim = null;
    let best = Infinity;
    for (const t of this.game.lockables()) {
      _v.copy(t.pos).project(this.game.camera);
      const d = Math.hypot(_v.x, _v.y);
      if (_v.z < 1 && d < RETICLE_NDC * 1.5 && d < best) {
        best = d;
        aim = t;
      }
    }
    const dir = aim ? _v.copy(aim.pos).sub(origin).normalize() : _v.set(0, 0, -1);
    const hit = this.game.phys.raycast(origin, dir, 320, this.col);
    const end = hit ? origin.clone().addScaledVector(dir, hit.toi) : origin.clone().addScaledVector(dir, 320);
    for (const side of [-1, 1]) {
      const from = new Vector3(this.pos.x + side * 1.8, this.pos.y, this.pos.z - 0.5);
      this.game.fx.beam(from, end, 'player', 0.1, 0.14);
    }
    this.game.audio.sfx('laser');
    if (hit) this.game.damageTarget(hit.owner, 1, 'laser', end);
  }

  launchMissiles() {
    for (const l of this.locks) {
      if (!l.target.alive) continue;
      const m = { target: l.target, pos: this.group.position.clone(), vel: new Vector3(0, 0, -MISSILE_SPEED * 0.5), life: 4, mesh: new Mesh(this.missileGeo, this.missileMat) };
      m.vel.y = 12;
      this.game.scene.add(m.mesh);
      this.missiles.push(m);
    }
    this.game.audio.sfx('missile');
    this.game.audio.sfx('launch');
    this.game.fx.burst(this.pos, 0xffd23f, 10, 8, 0.6, 0.3);
    this.locks.length = 0;
    this.fireCd = 0.2;
  }

  updateMissiles(dt) {
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.life -= dt;
      if (m.target.alive) {
        _v.copy(m.target.pos).sub(m.pos).normalize().multiplyScalar(MISSILE_SPEED);
        m.vel.lerp(_v, 1 - Math.exp(-6 * dt));
      }
      m.pos.addScaledVector(m.vel, dt);
      m.mesh.position.copy(m.pos);
      let done = m.life <= 0;
      if (!done && m.target.alive && m.pos.distanceTo(m.target.pos) < m.target.radius + 1.2) {
        this.game.damageTarget(m.target, 2, 'missile', m.pos);
        done = true;
      }
      if (done) {
        this.game.scene.remove(m.mesh);
        this.missiles.splice(i, 1);
      }
    }
  }

  clearMissiles() {
    for (const m of this.missiles) this.game.scene.remove(m.mesh);
    this.missiles.length = 0;
  }

  updateVisual(st) {
    if (this.barrelActive) {
      const t = 1 - this.barrel / BARREL_TIME;
      this.rollAngle = this.barrelDir * t * Math.PI * 2;
    } else {
      this.rollAngle = 0;
    }
    const bank = -st.x * 0.45;
    this.group.rotation.set(st.y * 0.22, -st.x * 0.12, bank + this.rollAngle);
    if (this.invuln > 0) this.group.visible = Math.floor(this.invuln * 14) % 2 === 0;
    else this.group.visible = this.alive;
    const pulse = 0.85 + 0.15 * Math.sin(performance.now() * 0.03) + (this.speed > CRUISE ? 0.2 : 0);
    for (const g of this.glows) g.scale.setScalar(pulse * (this.speed < CRUISE * 0.6 ? 0.6 : 1));
  }

  // Ring pickup: shield and sometimes a bomb.
  collectRing(bomb) {
    this.shield = Math.min(100, this.shield + 25);
    if (bomb) this.bombs = Math.min(6, this.bombs + 1);
    this.game.audio.sfx('pickup');
    this.game.addScore(100);
    this.game.announce(bomb ? 'BOMB RING' : 'SHIELD RING', bomb ? '+1 smart bomb' : '+25 shield', 1.2);
  }
}
