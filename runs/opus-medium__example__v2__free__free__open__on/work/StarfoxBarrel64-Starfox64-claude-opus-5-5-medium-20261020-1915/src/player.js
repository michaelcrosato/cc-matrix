// Player ship: rail flight + all-range flight, weapons, defensive manoeuvres.
import { THREE, gfx } from './gfx.js';
import { buildFighter } from './models.js';
import { physics, G } from './physics.js';
import { fx, Trail } from './fx.js';
import { audio } from './audio.js';
import { clamp, damp, lerp, rand } from './config.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const tv = V(), tv2 = V(), tq = new THREE.Quaternion(), tq2 = new THREE.Quaternion(), tm = new THREE.Matrix4(), te = new THREE.Euler();
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);

export const BASE_SPEED = 70;

export class Player {
  constructor(g) {
    this.g = g;
    this.obj = buildFighter();
    this.pos = this.obj.position;
    this.vel = V(); this.prevPos = V();
    this.forward = V(0, 0, 1); this.up = V(0, 1, 0);
    this.railT = V(0, 0, 1);
    this.trailL = null; this.trailR = null;
    this.frame = {};
    this.lives = 3; this.bombs = 3; this.laser = 0;
    this.resetStats();
  }
  resetStats() {
    this.maxShield = 100; this.shield = 100; this.goldRings = 0;
    this.wingHP = [3, 3];
  }
  attach(root) {
    root.add(this.obj);
    this.trailL = new Trail(root, 0xffffff, 26, 0.3);
    this.trailR = new Trail(root, 0xffffff, 26, 0.3);
    this.engineTrail = new Trail(root, 0x66ccff, 18, 0.7);
  }
  spawn(mode, o = {}) {
    this.mode = mode; this.alive = true; this.visible = true; this.obj.visible = true;
    this.invuln = o.invuln ?? 2; this.speed = BASE_SPEED; this.baseSpeed = BASE_SPEED;
    this.boost = 1; this.boostLock = false; this.boosting = false; this.braking = false;
    this.rollT = 0; this.rollDir = 0; this.rollAngle = 0; this.tilt = 0;
    this.loopT = 0; this.uturnT = 0; this.loopZ = 0; this.loopY = 0;
    this.holdT = 0; this.charge = 0; this.charging = false; this.lockTarget = null;
    this.fireCd = 0; this.lastTap = { rollL: -9, rollR: -9 };
    this.vx = 0; this.vy = 0; this.bank = 0; this.pitchV = 0; this.yawV = 0;
    this.deadT = 0; this.scrapeCd = 0;
    this.control = true;
    if (mode === 'rail') {
      this.s = o.s ?? 0; this.ox = o.ox ?? 0; this.oy = o.oy ?? 0;
    } else {
      this.pos.copy(o.pos || V(0, 0, 600));
      this.quat = new THREE.Quaternion().setFromRotationMatrix(tm.lookAt(V(), tv.copy(o.dir || V(0, 0, -1)).negate(), Y));
      this.quat.setFromRotationMatrix(tm.makeBasis(tv.crossVectors(Y, o.dir || V(0, 0, -1)).normalize(), Y, (o.dir || V(0, 0, -1)).clone().normalize()));
      this.visRoll = 0;
    }
    this.restoreWings();
    this.trailL && this.trailL.reset(); this.trailR && this.trailR.reset(); this.engineTrail && this.engineTrail.reset();
    this.update(0, null);
  }
  restoreWings() {
    this.wingHP = [3, 3];
    const u = this.obj.userData;
    for (const w of [u.wingL, u.wingR]) { if (w.parent !== u.body) { u.body.add(w); } w.visible = true; }
    u.wingL.position.set(-0.8, -0.1, -1.0); u.wingR.position.set(0.8, -0.1, -1.0);
    u.wingL.rotation.set(0, 0, 0); u.wingR.rotation.set(0, 0, 0); u.wingL.scale.setScalar(1); u.wingR.scale.setScalar(1);
  }
  rolling() { return this.rollT > 0; }
  aimDot(p) { return tv2.subVectors(p, this.pos).normalize().dot(this.forward); }
  heal(n) { this.shield = Math.min(this.maxShield, this.shield + n); }
  upgradeLaser() {
    const u = this.obj.userData;
    if (this.wingHP[0] <= 0 || this.wingHP[1] <= 0) { this.restoreWings(); this.g.toast('WINGS REPAIRED', 'green'); return; }
    this.restoreWings();
    if (this.laser < 2) { this.laser++; this.g.toast(this.laser === 1 ? 'TWIN LASERS!' : 'HYPER LASERS!', 'green'); }
    else { this.heal(30); this.g.toast('LASERS MAXED · +SHIELD', 'green'); }
  }
  damage(n, src) {
    if (!this.alive || this.invuln > 0 || this.g.cheat) return;
    const amt = n * this.g.diff.dmgMul;
    this.shield -= amt;
    this.invuln = 0.6;
    this.g.stats.damageTaken += amt;
    audio.playerHit();
    this.g.onPlayerHurt(amt);
    if (this.shield <= 0) { this.shield = 0; this.die(); }
    else if (this.shield < this.maxShield * 0.25) audio.alarm();
  }
  damageWing(side) {
    if (this.g.cheat) return;
    const i = side < 0 ? 0 : 1;
    if (this.wingHP[i] <= 0) return;
    this.wingHP[i]--;
    if (this.wingHP[i] <= 0) {
      const u = this.obj.userData; const w = i === 0 ? u.wingL : u.wingR;
      const wp = V(); w.getWorldPosition(wp); const wq = new THREE.Quaternion(); w.getWorldQuaternion(wq);
      w.parent.remove(w); w.quaternion.copy(wq);
      physics.spawnDebris(w, wp, this.vel.clone().multiplyScalar(0.3).add(V(rand(-10, 10), 10, 0)), this.g.root, { life: 3, size: 1.2 });
      this.laser = 0;
      this.g.toast(i === 0 ? 'LEFT WING LOST' : 'RIGHT WING LOST', 'red');
      this.g.radio('hopper', 'You lost a wing! Grab a laser upgrade to repair it.', { minGap: 6 });
    }
  }
  die() {
    if (!this.alive) return;
    this.alive = false; this.deadT = 0;
    this.charging = false; audio.chargeStop();
    fx.explode(this.pos, 3, 0xdddddd, 14, this.g.root);
    audio.bigExplosion();
    this.obj.visible = false;
    this.g.onPlayerDeath();
  }
  // -----------------------------------------------------------------
  update(dt, inp) {
    if (!this.alive) { this.deadT += dt; return; }
    this.prevPos.copy(this.pos);
    this.invuln = Math.max(0, this.invuln - dt);
    this.fireCd -= dt; this.scrapeCd -= dt;
    const I = inp && this.control ? inp : null;
    // boost / brake meter (shared, must refill fully once empty)
    const wantBoost = I && I.boost && !this.boostLock && this.boost > 0 && !this.loopT && !this.uturnT;
    const wantBrake = I && I.brake && !wantBoost && !this.boostLock && this.boost > 0 && !this.loopT && !this.uturnT;
    if (wantBoost && !this.boosting) audio.boost();
    if (wantBrake && !this.braking) audio.brake();
    this.boosting = !!wantBoost; this.braking = !!wantBrake;
    if (this.boosting || this.braking) { this.boost -= dt / 1.7; if (this.boost <= 0) { this.boost = 0; this.boostLock = true; } }
    else if (!this.loopT && !this.uturnT) { this.boost = Math.min(1, this.boost + dt / (this.boostLock ? 2.6 : 2.0)); if (this.boost >= 1) this.boostLock = false; }
    // barrel roll: double-tap
    if (I) {
      for (const [key, dir] of [['rollL', -1], ['rollR', 1]]) {
        if (I.pressedRoll && I.pressedRoll[key]) {
          const now = this.g.time;
          if (now - this.lastTap[key] < 0.32 && this.rollT <= 0) { this.rollT = 0.6; this.rollDir = dir; audio.barrelRoll(dir * 0.5); this.g.stats.rolls++; this.lastTap[key] = -9; }
          else this.lastTap[key] = now;
        }
      }
    }
    if (this.rollT > 0) { this.rollT -= dt; this.rollAngle += this.rollDir * (Math.PI * 2 / 0.6) * dt; if (this.rollT <= 0) this.rollAngle = 0; }
    const tiltTarget = I ? (I.rollL ? -Math.PI / 2 : 0) + (I.rollR ? Math.PI / 2 : 0) : 0;
    this.tilt = damp(this.tilt, tiltTarget, 8, dt);
    // somersault
    if (I && I.loop && !this.loopT && !this.uturnT && this.boost >= 0.5 && !this.boostLock) {
      this.loopT = 1e-4; this.boost = 0; this.boostLock = true; audio.loopWhoosh(); this.g.stats.loops++;
    }
    if (this.mode === 'rail') this.updateRail(dt, I); else this.updateFree(dt, I);
    if (dt > 0) this.vel.subVectors(this.pos, this.prevPos).divideScalar(dt);
    // weapons
    if (I) this.updateWeapons(dt, I);
    // visuals
    const u = this.obj.userData;
    const flick = 1 + Math.sin(this.g.time * 60) * 0.12;
    const eng = (this.boosting ? 2.2 : this.braking ? 0.5 : 1.0) * flick;
    u.glows.forEach((g) => g.scale.set(1, 1, 1.6 * eng));
    this.obj.visible = this.invuln > 0 && this.invuln < 1.8 ? Math.floor(this.g.time * 20) % 2 === 0 : true;
    const upv = tv.set(0, 1, 0).applyQuaternion(this.obj.quaternion);
    const turnAmt = Math.min(1, Math.abs(this.vx) / 40 + Math.abs(this.vy) / 50 + (this.boosting ? 0.8 : 0) + (this.loopT || this.uturnT ? 1 : 0) + Math.abs(this.yawV || 0));
    this.trailL.update(u.tipL.getWorldPosition(tv2), upv, turnAmt * 0.9);
    this.trailR.update(u.tipR.getWorldPosition(tv2), upv, turnAmt * 0.9);
    this.engineTrail.update(tv2.copy(this.pos).addScaledVector(this.forward, -3.6), upv, this.boosting ? 0.9 : 0.25);
    audio.engineSet(clamp((this.speed - 30) / 110, 0, 1), this.boosting);
  }
  updateRail(dt, I) {
    const rail = this.g.rail;
    let target = BASE_SPEED;
    if (this.boosting) target = 135; else if (this.braking) target = 32;
    if (this.loopT) target = 28;
    if (this.g.forcedSpeed) target = this.g.forcedSpeed;
    this.speed = damp(this.speed, target, 3, dt);
    this.s += this.speed * dt;
    const f = rail.frame(this.s, this.frame);
    this.railT.copy(f.t);
    // steering
    const lx = I ? I.lx : 0, ly = I ? I.ly : 0;
    let mulX = 1;
    if (I && I.rollL && lx < 0) mulX = 1.55;
    if (I && I.rollR && lx > 0) mulX = 1.55;
    this.vx = damp(this.vx, lx * 44 * mulX + (this.rollT > 0 ? this.rollDir * 22 : 0), 6, dt);
    this.vy = damp(this.vy, ly * 36, 6, dt);
    this.ox += this.vx * dt; this.oy += this.vy * dt;
    const minY = 3.5 - f.p.y;
    const maxX = 34, maxY = 26;
    if (this.ox > maxX) { this.ox = maxX; this.vx = Math.min(this.vx, 0); }
    if (this.ox < -maxX) { this.ox = -maxX; this.vx = Math.max(this.vx, 0); }
    if (this.oy > maxY) { this.oy = maxY; this.vy = Math.min(this.vy, 0); }
    if (this.oy < minY) {
      this.oy = minY; this.vy = Math.max(0, this.vy);
      // ground scrape
      if (this.scrapeCd <= 0 && !this.g.noGround) { this.scrapeCd = 0.6; this.damage(4, 'ground'); fx.hitSpark(this.pos, 0xffcc88); this.vy = 18; }
    }
    // somersault offsets (circle in the forward/up plane)
    let loopPitch = 0;
    if (this.loopT) {
      this.loopT += dt;
      const k = Math.min(1, this.loopT / 1.5);
      const th = k * Math.PI * 2;
      const R = 17;
      this.loopZ = Math.sin(th) * R; this.loopY = (1 - Math.cos(th)) * R;
      loopPitch = -th;
      if (k >= 1) { this.loopT = 0; this.loopZ = 0; this.loopY = 0; }
    }
    this.pos.copy(f.p).addScaledVector(f.r, this.ox).addScaledVector(f.u, this.oy + this.loopY).addScaledVector(f.t, this.loopZ);
    // orientation: rail basis * (pitch, yaw, roll)
    tm.makeBasis(tv.copy(f.r).negate(), f.u, f.t);
    tq.setFromRotationMatrix(tm);
    this.bank = damp(this.bank, clamp(this.vx * 0.016, -0.9, 0.9), 6, dt);
    te.set(-this.vy * 0.011 + loopPitch, -this.vx * 0.009, 0, 'YXZ');
    tq2.setFromEuler(te);
    this.obj.quaternion.copy(tq).multiply(tq2);
    this.obj.userData.body.rotation.z = this.bank + this.tilt + this.rollAngle;
    this.forward.set(0, 0, 1).applyQuaternion(this.obj.quaternion);
    this.up.set(0, 1, 0).applyQuaternion(this.obj.quaternion);
    this.checkCollisions();
  }
  updateFree(dt, I) {
    let target = 78;
    if (this.boosting) target = 150; else if (this.braking) target = 36;
    if (this.loopT || this.uturnT) target = 55;
    this.speed = damp(this.speed, target, 3, dt);
    const lx = I ? I.lx : 0, ly = I ? I.ly : 0;
    // auto-turn back into the arena
    const out = this.pos.length() > this.g.arena;
    if (out && !this.uturnT && !this.loopT && this.forward.dot(tv.copy(this.pos).normalize()) > 0) {
      this.startUturn(); this.g.toast('TURNING BACK TO THE COMBAT ZONE', 'blue');
    }
    if (I && I.uturn && !this.uturnT && !this.loopT && !this.boostLock && this.boost >= 0.5) { this.startUturn(); this.boost = 0; this.boostLock = true; }
    if (this.uturnT) {
      this.uturnT += dt;
      const k = Math.min(1, this.uturnT / 1.5);
      const pitchA = -Math.PI * Math.min(1, k / 0.75);
      const rollA = Math.PI * clamp((k - 0.5) / 0.5, 0, 1);
      tq.setFromAxisAngle(X, pitchA); tq2.setFromAxisAngle(Z, rollA);
      this.quat.copy(this.uq0).multiply(tq).multiply(tq2);
      if (k >= 1) { this.uturnT = 0; }
      this.yawV = 0; this.pitchV = 0;
    } else if (this.loopT) {
      this.loopT += dt;
      const k = Math.min(1, this.loopT / 1.5);
      if (!this.lq0) this.lq0 = this.quat.clone();
      tq.setFromAxisAngle(X, -Math.PI * 2 * k);
      this.quat.copy(this.lq0).multiply(tq);
      if (k >= 1) { this.loopT = 0; this.quat.copy(this.lq0); this.lq0 = null; }
    } else {
      let yawMul = 1;
      if (I && I.rollL && lx < 0) yawMul = 1.7;
      if (I && I.rollR && lx > 0) yawMul = 1.7;
      this.yawV = damp(this.yawV, -lx * 1.5 * yawMul, 5, dt);
      this.pitchV = damp(this.pitchV, ly * 1.2, 5, dt);
      tq.setFromAxisAngle(Y, this.yawV * dt); this.quat.multiply(tq);
      tq.setFromAxisAngle(X, -this.pitchV * dt); this.quat.multiply(tq);
      // auto-level roll toward world up (keeps the horizon readable)
      const fwd = tv.set(0, 0, 1).applyQuaternion(this.quat);
      const right = tv2.crossVectors(fwd, Y);
      if (right.lengthSq() > 0.01) {
        right.normalize();
        const upNow = V().set(0, 1, 0).applyQuaternion(this.quat);
        const desiredUp = V().crossVectors(right, fwd).normalize();
        const ang = Math.atan2(V().crossVectors(upNow, desiredUp).dot(fwd), upNow.dot(desiredUp));
        tq.setFromAxisAngle(Z, ang * (1 - Math.exp(-2.5 * dt))); this.quat.multiply(tq);
      }
      // soft ceiling / floor
      if (Math.abs(this.pos.y) > 320) { const sgn = Math.sign(this.pos.y); tq.setFromAxisAngle(X, sgn * 0.8 * dt); this.quat.multiply(tq); }
    }
    this.quat.normalize();
    this.forward.set(0, 0, 1).applyQuaternion(this.quat);
    this.up.set(0, 1, 0).applyQuaternion(this.quat);
    this.pos.addScaledVector(this.forward, this.speed * dt);
    if (this.rollT > 0) this.pos.addScaledVector(tv.crossVectors(this.forward, this.up).normalize(), -this.rollDir * 26 * dt);
    this.obj.quaternion.copy(this.quat);
    this.bank = damp(this.bank, clamp(this.yawV * 0.6, -1, 1) * -1 * -1, 5, dt);
    this.obj.userData.body.rotation.z = -this.bank * 0.9 + this.tilt + this.rollAngle;
    this.vx = this.yawV * 30; this.vy = this.pitchV * 30;
    this.railT.copy(this.forward);
    this.checkCollisions();
  }
  startUturn() { this.uturnT = 1e-4; this.uq0 = this.quat.clone(); audio.loopWhoosh(); this.g.stats.uturns++; }
  checkCollisions() {
    if (this.invuln > 0 && this.invuln > 1.5) return;
    let hitStatic = null;
    physics.overlapBall(this.pos, 2.2, G.PLAYER, G.STATIC | G.ROCK | G.ENEMY, (owner, col) => {
      if (owner && owner.isEnemy && owner.alive) {
        if (owner.kind === 'supply') { owner.kill('player'); return; }
        if (this.invuln <= 0) { owner.hit(3, this.pos, 'player'); this.damage(12, 'ram'); }
      } else if (owner && owner.isBossPart) {
        if (this.invuln <= 0) this.damage(14, 'ram');
      } else if (!hitStatic) hitStatic = { owner, col };
    });
    if (hitStatic && this.invuln <= 0) {
      const o = hitStatic.owner;
      if (o && o.kind === 'rock') {
        this.damage(10, 'rock');
        physics.impulse(o.rk.body, this.forward.clone().multiplyScalar(4000));
        this.g.hitRock(o, 1, this.pos, this.forward);
      } else this.damage(o && o.isBossHull ? 16 : 14, 'crash');
      this.damageWing(Math.random() < 0.5 ? -1 : 1);
      fx.hitSpark(this.pos, 0xffcc66);
      this.g.shake(0.8);
      // bounce away from the obstacle
      if (this.mode === 'rail') {
        const c = hitStatic.col.translation();
        const f = this.frame;
        const dx = (this.pos.x - c.x) * f.r.x + (this.pos.z - c.z) * f.r.z;
        this.vx = (dx >= 0 ? 1 : -1) * 55; this.vy = 20; this.speed *= 0.6;
      } else {
        this.quat.multiply(tq.setFromAxisAngle(Y, Math.PI * 0.6));
        this.speed *= 0.4;
      }
    }
  }
  // -----------------------------------------------------------------
  muzzles() {
    const u = this.obj.userData;
    const out = [];
    const base = tv.copy(this.pos).addScaledVector(this.forward, 4);
    if (this.laser === 0) out.push(base.clone().addScaledVector(this.up, -0.2));
    else {
      const right = tv2.crossVectors(this.forward, this.up).normalize();
      out.push(base.clone().addScaledVector(right, 2.2), base.clone().addScaledVector(right, -2.2));
    }
    return out;
  }
  updateWeapons(dt, I) {
    const g = this.g;
    if (I.firePressed && this.fireCd <= 0) { this.fireBolts(); this.fireCd = 0.09; this.holdT = 0; }
    if (I.fire) {
      this.holdT += dt;
      if (this.holdT > 0.32) {
        if (!this.charging) { this.charging = true; audio.chargeStart(); }
        const before = this.charge;
        this.charge = Math.min(1, (this.holdT - 0.32) / 0.55);
        if (this.charge >= 1) {
          const t = g.findLockTarget(this.pos, this.forward, this.mode === 'rail' ? 0.985 : 0.972, 520);
          if (t && t !== this.lockTarget) audio.lockOn();
          this.lockTarget = t;
        }
      }
    } else if (this.charging) {
      if (this.charge >= 1) this.fireCharge();
      this.charging = false; this.charge = 0; this.lockTarget = null; audio.chargeStop();
    }
    if (I.bombPressed) {
      if (g.proj.hasBomb()) g.proj.detonateBombs();
      else if (this.bombs > 0) {
        this.bombs--; audio.bombLaunch(); g.stats.bombs++;
        const t = g.findLockTarget(this.pos, this.forward, 0.97, 400);
        g.proj.add({ kind: 'bomb', pos: tv.copy(this.pos).addScaledVector(this.forward, 4), vel: V().copy(this.forward).multiplyScalar(170).addScaledVector(this.vel, 0.9), life: 1.1, owner: 'player', dmg: 0, target: t, aoe: 1 });
      }
    }
  }
  fireBolts() {
    const g = this.g;
    const kind = ['p0', 'p1', 'p2'][this.laser];
    const dmg = (this.laser === 2 ? 2 : 1) * (g.cheat ? 4 : 1);
    const assist = g.findLockTarget(this.pos, this.forward, this.mode === 'rail' ? 0.9975 : 0.993, 450);
    for (const m of this.muzzles()) {
      const b = g.proj.add({ kind, pos: m, vel: V().copy(this.forward).multiplyScalar(420).add(this.vel), life: 1.1, owner: 'player', dmg });
      b.assist = assist;
      g.stats.shots++;
    }
    audio.laser(this.laser, 0);
    fx.flash(tv.copy(this.pos).addScaledVector(this.forward, 5), 0.9, this.laser === 2 ? 0x77bbff : 0x88ff99);
  }
  fireCharge() {
    const g = this.g;
    audio.chargeShot();
    g.proj.add({ kind: 'charge', pos: tv.copy(this.pos).addScaledVector(this.forward, 5), vel: V().copy(this.forward).multiplyScalar(this.lockTarget ? 230 : 300).add(this.vel), life: this.lockTarget ? 2.5 : 1.0, owner: 'player', dmg: 7, target: this.lockTarget, aoe: 16 });
    g.stats.charges++;
  }
}
