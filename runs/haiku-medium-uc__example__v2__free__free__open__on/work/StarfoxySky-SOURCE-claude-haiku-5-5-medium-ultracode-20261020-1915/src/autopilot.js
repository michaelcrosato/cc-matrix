// Attract-mode pilot. It produces the same flight frame as the Input class,
// so it drives the real ship code. It is allowed to cheat (see Game `cheats`):
// it only exists to show as much of the demo as possible.

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export class Autopilot {
  constructor() {
    this.t = 0;
    this.rollCooldown = 0;
    this.bombCooldown = 0;
    this.lockHeld = false;
  }

  frame(game, dt) {
    this.t += dt;
    this.rollCooldown -= dt;
    this.bombCooldown -= dt;
    const s = game.ship.pos;
    const f = { x: 0, y: 0, fire: false, lock: false, lockReleased: false, bomb: false, boost: false, brake: false, rollL: false, rollR: false, pause: false };

    // Target: the closest live escort ahead, else the boss.
    let target = null;
    let best = Infinity;
    for (const e of game.enemies) {
      if (!e.alive || !e.counted) continue;
      const ahead = s.z - e.pos.z;
      if (ahead < 5 || ahead > 220) continue;
      const cost = Math.abs(e.pos.x - s.x) + Math.abs(e.pos.y - s.y) * 0.7 + ahead * 0.1;
      if (cost < best) {
        best = cost;
        target = e;
      }
    }
    if (!target && game.boss && game.boss.alive) {
      const part = game.boss.shields.find((x) => x.alive) || game.boss.turrets.find((x) => x.alive) || game.boss.core;
      if (part.alive) target = part;
    }

    if (target) {
      f.x = clamp((target.pos.x - s.x) * 0.4, -1, 1);
      f.y = clamp((target.pos.y - s.y) * 0.35, -1, 1);
    } else {
      f.x = Math.sin(this.t * 0.5) * 0.6;
      f.y = Math.sin(this.t * 0.37) * 0.3;
    }

    // Dodge incoming shots and rocks ahead of the ship.
    let danger = null;
    for (const sh of game.shots) {
      const ahead = s.z - sh.pos.z;
      if (ahead > 0 && ahead < 26 && Math.abs(sh.pos.x - s.x) < 3.2) danger = sh.pos;
    }
    for (const r of game.rocks) {
      const ahead = s.z - r.pos.z;
      if (ahead > 0 && ahead < 40 && Math.abs(r.pos.x - s.x) < r.radius + 2) danger = r.pos;
    }
    if (danger) {
      f.x = clamp(f.x + (s.x - danger.x > 0 ? 1 : -1) * 0.9, -1, 1);
      if (this.rollCooldown <= 0 && !game.ship.rolling) {
        if (Math.random() < 0.5) f.rollL = true;
        else f.rollR = true;
        this.rollCooldown = 1.2;
      }
    }

    f.fire = !!target && Math.abs(target.pos.x - s.x) < 9;

    // Boost when the lane is clear, brake when a target is close.
    f.boost = !target || (target && s.z - target.pos.z > 120);
    f.brake = !!target && s.z - target.pos.z < 22;

    // Lock every few seconds and release to launch homing missiles.
    const lockPhase = this.t % 5;
    const wantLock = !!target && lockPhase < 1.6;
    f.lock = wantLock;
    if (this.lockHeld && !wantLock) f.lockReleased = true;
    this.lockHeld = wantLock;

    const crowd = game.enemies.filter((e) => e.alive && e.counted && s.z - e.pos.z > 0 && s.z - e.pos.z < 200).length;
    if (crowd >= 5 && this.bombCooldown <= 0 && (game.ship.bombs > 0 || game.cheats)) {
      f.bomb = true;
      this.bombCooldown = 4;
    }
    return f;
  }
}
