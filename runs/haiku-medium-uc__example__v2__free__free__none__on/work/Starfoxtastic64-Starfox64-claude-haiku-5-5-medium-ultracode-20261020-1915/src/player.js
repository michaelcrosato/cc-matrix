// Player flight model: on-rails forward motion with free lateral movement inside the stage bounds,
// boost and brake, barrel roll (which deflects enemy fire), lasers, lock-on homing volleys, and bombs.
import { clamp, damp } from './util.js';

const ROLL_TIME = 0.6;
const ROLL_COOLDOWN = 0.25;
const LASER_COOLDOWN = 0.14;
const LOCK_HOLD = 0.22; // hold longer than this to start locking targets
const LOCK_MAX = 8;
const LOCK_INTERVAL = 0.08;

export class Player {
  constructor() {
    this.reset();
  }

  reset() {
    this.s = 0;
    this.px = 0;
    this.py = 0;
    this.speed = 0;
    this.shield = 100;
    this.maxShield = 100;
    this.bombs = 2;
    this.maxBombs = 3;
    this.laser = 1; // 1 = single, 2 = twin cannons
    this.rollT = 0;
    this.rollDir = 1;
    this.rollCd = 0;
    this.bank = 0;
    this.fireCd = 0;
    this.holdT = 0;
    this.lockTimer = 0;
    this.locks = []; // { target, t }
    this.fireWasHeld = false;
    this.dead = false;
    this.god = false; // attract mode keeps the pilot alive
    this.hitFlash = 0;
  }

  get rolling() {
    return this.rollT > 0;
  }

  // Roll angle in radians for the mesh (0 when not rolling).
  get rollAngle() {
    if (!this.rolling) return 0;
    return this.rollDir * (1 - this.rollT / ROLL_TIME) * Math.PI * 2;
  }

  // Advance one frame. ctl is the controls object from Input or the attract pilot.
  update(dt, ctl, game) {
    const st = game.stage;
    const rolling = this.rolling;

    const lateral = 26 * (rolling ? 1.35 : 1);
    this.px = clamp(this.px + ctl.ax * lateral * dt, -st.bounds.x, st.bounds.x);
    this.py = clamp(this.py + ctl.ay * lateral * 0.8 * dt, -st.bounds.y, st.bounds.y);
    this.bank = damp(this.bank, ctl.ax * 0.5, 8, dt);

    let target = st.speed;
    if (ctl.boost) target *= 1.5;
    else if (ctl.brake) target *= 0.5;
    this.speed = damp(this.speed, target, 5, dt);
    this.s += this.speed * dt;

    this.rollCd -= dt;
    if (this.rollT > 0) {
      this.rollT -= dt;
      if (this.rollT <= 0) this.rollCd = ROLL_COOLDOWN;
    } else if (this.rollCd <= 0) {
      if (ctl.rollL) this.startRoll(-1, game);
      else if (ctl.rollR) this.startRoll(1, game);
    }
    this.hitFlash = Math.max(0, this.hitFlash - dt * 3);

    this.updateWeapons(dt, ctl, game);

    if (ctl.bomb) this.detonateBomb(game);
  }

  startRoll(dir, game) {
    this.rollDir = dir;
    this.rollT = ROLL_TIME;
    game.audio.sfx('roll');
  }

  updateWeapons(dt, ctl, game) {
    this.fireCd -= dt;
    if (ctl.fire) {
      this.holdT += dt;
      if (this.holdT < LOCK_HOLD) {
        // Quick presses fire lasers; the first shot lands immediately.
        if (this.fireCd <= 0) this.fireLaser(game);
      } else {
        this.lockTimer -= dt;
        if (this.lockTimer <= 0) {
          this.lockTimer = LOCK_INTERVAL;
          this.acquireLocks(game);
        }
      }
    } else if (this.fireWasHeld) {
      if (this.holdT >= LOCK_HOLD && this.locks.length) this.launchVolley(game);
      this.holdT = 0;
      this.locks.length = 0;
    }
    this.fireWasHeld = ctl.fire;
    this.updateLocks();
  }

  fireLaser(game) {
    this.fireCd = LASER_COOLDOWN;
    game.firePlayerLaser(this, this.laser);
  }

  acquireLocks(game) {
    const candidates = game.lockCandidates();
    for (const target of candidates) {
      if (this.locks.length >= LOCK_MAX) break;
      if (this.locks.some((l) => l.target === target)) continue;
      this.locks.push({ target });
      game.audio.sfx('lock');
    }
  }

  // Remove locks whose target has died or left the stage.
  updateLocks() {
    for (let i = this.locks.length - 1; i >= 0; i--) {
      if (!this.locks[i].target.alive) this.locks.splice(i, 1);
    }
  }

  launchVolley(game) {
    game.launchMissiles(this.locks.map((l) => l.target));
    game.audio.sfx('launch');
  }

  detonateBomb(game) {
    if (this.bombs <= 0) return;
    this.bombs -= 1;
    game.detonateNova();
  }

  // Returns true when the hit landed (ignored while rolling).
  damage(amount, game, source) {
    if (this.dead || this.god) return false;
    if (this.rolling) return false;
    this.shield = Math.max(0, this.shield - amount);
    this.hitFlash = 1;
    game.onPlayerHit(amount, source);
    if (this.shield <= 0) this.dead = true;
    return true;
  }

  heal(amount) {
    this.shield = Math.min(this.maxShield, this.shield + amount);
  }
}
