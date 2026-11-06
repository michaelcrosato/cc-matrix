import RAPIER from "@dimforge/rapier3d-compat";
export const DEFAULTS = {
  skateSpeed: 8.4,
  shotPower: 25,
  iceGrip: 6.5,
  aiSkill: 0.64,
  checkStrength: 1.0,
  matchLength: 180,
  assist: 0.55,
};
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const len = (x, z) => Math.hypot(x, z);
export class Hockey {
  constructor(onEvent = () => {}) {
    this.onEvent = onEvent;
    this.params = { ...DEFAULTS };
    this.stats = { shots: [0, 0], checks: [0, 0], passes: [0, 0], banks: [0, 0], saves: [0, 0] };
    this.setup();
    this.reset();
  }
  setup() {
    this.world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    this.world.timestep = 1 / 60;
    this.queue = new RAPIER.EventQueue(true);
    const wall = (x, z, hx, hz) =>
      this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(hx, 2, hz)
          .setTranslation(x, 0, z)
          .setRestitution(0.94)
          .setFriction(0),
      );
    wall(0, -10.4, 18.6, 0.4);
    wall(0, 10.4, 18.6, 0.4);
    for (const side of [-1, 1]) {
      wall(side * 18.4, -6.4, 0.4, 3.6);
      wall(side * 18.4, 6.4, 0.4, 3.6);
      wall(side * 20.5, 0, 0.35, 2.8);
      wall(side * 19.2, 2.85, 1.3, 0.15);
      wall(side * 19.2, -2.85, 1.3, 0.15);
    }
    this.players = [];
    for (let i = 0; i < 4; i++) {
      const team = i < 2 ? 0 : 1;
      const body = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(0, 0.6, 0)
          .enabledTranslations(true, false, true)
          .lockRotations()
          .setLinearDamping(0.5)
          .setCcdEnabled(true),
      );
      const collider = this.world.createCollider(
        RAPIER.ColliderDesc.ball(0.58).setDensity(6).setRestitution(0.12).setFriction(0.1),
        body,
      );
      this.players.push({
        id: i,
        team,
        role: i % 2 === 0 ? "forward" : "keeper",
        body,
        collider,
        x: 0,
        z: 0,
        vx: 0,
        vz: 0,
        angle: team === 0 ? Math.PI / 2 : -Math.PI / 2,
        stun: 0,
        check: 0,
        boost: 0,
        charge: 0,
        aiTime: 0,
        aimX: team === 0 ? 1 : -1,
        aimZ: 0,
        stick: 0,
        anim: "idle",
      });
    }
    this.puck = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(0, 0.22, 0)
        .enabledTranslations(true, false, true)
        .lockRotations()
        .setLinearDamping(0.23)
        .setCcdEnabled(true),
    );
    this.puckCollider = this.world.createCollider(
      RAPIER.ColliderDesc.cylinder(0.17, 0.25)
        .setDensity(0.6)
        .setRestitution(0.96)
        .setFriction(0)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      this.puck,
    );
  }
  reset(options = {}) {
    this.mode = options.mode || "exhibition";
    this.attract = !!options.attract;
    this.difficulty = options.difficulty ?? 0.64;
    this.params.aiSkill = this.difficulty;
    this.score = [0, 0];
    this.stats = { shots: [0, 0], checks: [0, 0], passes: [0, 0], banks: [0, 0], saves: [0, 0] };
    this.duration = options.duration ?? this.params.matchLength;
    this.remaining = this.duration;
    this.elapsed = 0;
    this.phase = "faceoff";
    this.phaseTime = 2.4;
    this.overtime = false;
    this.active = [0, 2];
    this.possession = -1;
    this.lastTouch = -1;
    this.pickupDelay = 0.45;
    this.shotBank = false;
    this.lastShotTeam = -1;
    this.finished = false;
    this.faceoff();
  }
  faceoff() {
    const positions = [
      [-2, 1.2],
      [-13, 0],
      [2, -1.2],
      [13, 0],
    ];
    for (const p of this.players) {
      const [x, z] = positions[p.id];
      this.place(p, x, z);
      p.stun = 0;
      p.charge = 0;
      p.check = 0;
    }
    this.puck.setTranslation({ x: 0, y: 0.22, z: 0 }, true);
    this.puck.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.possession = -1;
    this.lastTouch = -1;
    this.pickupDelay = 0.45;
    this.shotBank = false;
    this.lastShotTeam = -1;
  }
  place(p, x, z) {
    p.body.setTranslation({ x, y: 0.6, z }, true);
    p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    p.x = x;
    p.z = z;
    p.vx = 0;
    p.vz = 0;
  }
  emit(type, data = {}) {
    this.onEvent({ type, ...data });
  }
  givePuck(id) {
    this.possession = id;
    this.lastTouch = id;
    this.pickupDelay = 0;
    this.players[id].stick = 0;
    this.active[this.players[id].team] = id;
    this.puck.setLinvel({ x: 0, y: 0, z: 0 }, true);
  }
  chooseActive(team, force = false) {
    if (this.possession >= 0 && this.players[this.possession].team === team) {
      this.active[team] = this.possession;
      return;
    }
    const b = this.puck.translation();
    const ps = this.players.filter((p) => p.team === team);
    const a = ps[0],
      c = ps[1];
    const da = len(a.x - b.x, a.z - b.z),
      dc = len(c.x - b.x, c.z - b.z);
    const best = da < dc ? a : c;
    const current = this.players[this.active[team]];
    if (force || len(current.x - b.x, current.z - b.z) > Math.min(da, dc) + 1.6)
      this.active[team] = best.id;
  }
  release(p, dx, dz, power, isPass = false) {
    const d = len(dx, dz) || 1;
    dx /= d;
    dz /= d;
    this.possession = -1;
    this.pickupDelay = 0.2;
    this.lastTouch = p.id;
    this.lastShotTeam = p.team;
    this.shotBank = false;
    this.puck.setTranslation({ x: p.x + dx * 1.06, y: 0.22, z: p.z + dz * 1.06 }, true);
    this.puck.setLinvel({ x: dx * power + p.vx * 0.18, y: 0, z: dz * power + p.vz * 0.18 }, true);
    p.charge = 0;
    p.anim = "shoot";
    this.stats[isPass ? "passes" : "shots"][p.team]++;
    this.emit(isPass ? "pass" : "shot", { id: p.id, power, x: p.x, z: p.z });
  }
  shoot(p, aim = {}) {
    if (this.possession !== p.id) return false;
    const dir = p.team === 0 ? 1 : -1;
    let angle;
    if (aim.manual && aim.ax * dir > -0.1) {
      angle = Math.atan2(aim.az, Math.abs(aim.ax) || 0.1);
    } else {
      const goalAngle = Math.atan2(-p.z, Math.max(2, 18 - p.x * dir));
      angle =
        goalAngle * this.params.assist +
        Math.sin(p.stick * 5.5) * (0.72 * (1 - this.params.assist) + 0.12);
    }
    angle = clamp(angle, -1.24, 1.24);
    angle = (Math.round(((angle + 1.24) / 2.48) * 31) / 31) * 2.48 - 1.24;
    const power = this.params.shotPower * (0.78 + 0.48 * clamp(p.charge / 0.8, 0, 1));
    this.release(p, Math.cos(angle) * dir, Math.sin(angle), power);
    return true;
  }
  pass(p) {
    if (this.possession !== p.id) return false;
    const other = this.players.find((x) => x.team === p.team && x.id !== p.id);
    this.release(p, other.x - p.x, other.z - p.z, 17, true);
    this.active[p.team] = other.id;
    return true;
  }
  check(p) {
    if (p.check > 0 || p.stun > 0) return false;
    p.check = 1.35;
    p.boost = 0.22;
    p.anim = "check";
    this.emit("checkSwing", { id: p.id });
    for (const other of this.players) {
      if (other.team !== p.team && len(p.x - other.x, p.z - other.z) < 2.4) {
        const protectedGoalie =
          other.role === "keeper" && Math.abs(other.x) > 14 && Math.abs(other.z) < 3;
        other.stun = protectedGoalie ? 0 : 0.9 * this.params.checkStrength;
        const dx = other.x - p.x,
          dz = other.z - p.z,
          d = len(dx, dz) || 1;
        other.body.setLinvel(
          {
            x: (dx / d) * 11 * this.params.checkStrength,
            y: 0,
            z: (dz / d) * 11 * this.params.checkStrength,
          },
          true,
        );
        if (this.possession === other.id) {
          this.possession = -1;
          this.pickupDelay = 0.15;
          this.puck.setLinvel({ x: (dx / d) * 12, y: 0, z: (dz / d) * 12 }, true);
        }
        this.stats.checks[p.team]++;
        this.emit("hit", { id: other.id, x: other.x, z: other.z });
      }
    }
    return true;
  }
  aiInput(p) {
    const dir = p.team === 0 ? 1 : -1,
      b = this.puck.translation(),
      has = this.possession === p.id,
      owner = this.players[this.possession];
    let tx = b.x,
      tz = b.z;
    let shoot = false,
      pass = false,
      check = false;
    if (has) {
      if (p.role === "keeper" && p.x * dir < -4) {
        tx = dir * -2;
        tz = Math.sin(this.elapsed * 0.9) * 4;
        const f = this.players.find((x) => x.team === p.team && x.role === "forward");
        if (p.aiTime > 0.75 && len(f.x - p.x, f.z - p.z) > 5) pass = true;
      } else {
        tx = dir * 14.8;
        tz = Math.sin(this.elapsed * 1.1 + p.id) * 3.2;
        if (p.x * dir > 7 && p.aiTime > 0.65) {
          shoot = true;
        }
        if (p.x * dir > 14) shoot = true;
      }
    } else if (p.role === "keeper") {
      tx = -dir * 14;
      tz = clamp(b.z * 0.7, -3.8, 3.8);
      if (b.x * dir < -5 && (!owner || owner.team !== p.team)) {
        tx = clamp(b.x + dir * 2, -15, 15);
        tz = clamp(b.z, -7, 7);
      }
    } else if (owner?.team === p.team) {
      tx = clamp(owner.x + dir * 7, -8, 13);
      tz = -owner.z * 0.65 + (p.id === 0 ? 1 : -1) * 2;
    } else {
      const v = this.puck.linvel();
      tx += v.x * 0.11;
      tz += v.z * 0.11;
      if (
        owner &&
        owner.team !== p.team &&
        len(p.x - owner.x, p.z - owner.z) < 2.1 &&
        p.aiTime > 0.8
      )
        check = true;
    }
    const dx = tx - p.x,
      dz = tz - p.z,
      d = len(dx, dz),
      move = d > 0.3 ? Math.min(1, d / 1.8) : 0;
    const goalZ =
      this.attract && Math.floor(this.elapsed / 12) % 3 === 1 ? (p.z > 0 ? -19 : 19) : -p.z;
    return {
      x: (dx / (d || 1)) * move,
      z: (dz / (d || 1)) * move,
      ax: dir,
      az: goalZ / Math.max(3, 18 - p.x * dir),
      manual: true,
      shoot,
      pass,
      check,
      ai: true,
    };
  }
  step(dt, controllers = {}) {
    if (this.phase === "over") return;
    this.elapsed += dt;
    if (this.phase === "faceoff" || this.phase === "goal") {
      this.phaseTime -= dt;
      if (this.phaseTime <= 0) {
        this.phase = "play";
        this.pickupDelay = 0.1;
        this.emit("drop");
      }
      return;
    }
    this.remaining -= dt;
    if (this.remaining <= 0 && this.mode !== "training" && !this.attract) {
      if (this.mode === "cup" && this.score[0] === this.score[1]) {
        this.overtime = true;
        this.remaining = 99999;
        this.emit("overtime");
      } else {
        this.end();
        return;
      }
    }
    if (this.mode === "training" || this.attract) this.remaining = Math.max(this.remaining, 60);
    this.pickupDelay = Math.max(0, this.pickupDelay - dt);
    this.chooseActive(0);
    this.chooseActive(1);
    for (const p of this.players) {
      p.check = Math.max(0, p.check - dt);
      p.boost = Math.max(0, p.boost - dt);
      p.stun = Math.max(0, p.stun - dt);
      p.stick += dt;
      p.aiTime += dt;
      const override = controllers[p.id];
      const input = override || this.aiInput(p);
      p.input = input;
      if (p.stun > 0) {
        p.anim = "fall";
        continue;
      }
      p.anim = len(input.x || 0, input.z || 0) > 0.1 ? "skate" : "idle";
      let mx = input.x || 0,
        mz = input.z || 0;
      const ml = len(mx, mz);
      if (ml > 1) {
        mx /= ml;
        mz /= ml;
      }
      const skill = input.ai ? 0.7 + this.params.aiSkill * 0.35 : 1;
      const speed =
        this.params.skateSpeed *
        skill *
        (p.boost > 0 ? 1.8 : 1) *
        (this.mode === "training" && p.team === 1 ? 0.55 : 1);
      let tx = p.vx + (mx * speed - p.vx) * Math.min(1, this.params.iceGrip * dt),
        tz = p.vz + (mz * speed - p.vz) * Math.min(1, this.params.iceGrip * dt);
      const minX =
        p.team === 0 ? (p.role === "keeper" ? -17 : -11) : p.role === "keeper" ? -4 : -17;
      const maxX = p.team === 0 ? (p.role === "keeper" ? 4 : 17) : p.role === "keeper" ? 17 : 11;
      if (p.x < minX + 0.2 && tx < 0) tx = 0;
      if (p.x > maxX - 0.2 && tx > 0) tx = 0;
      if (Math.abs(p.z) > 9.1 && Math.sign(tz) === Math.sign(p.z)) tz = 0;
      p.body.setLinvel({ x: tx, y: 0, z: tz }, true);
      if (ml > 0.08) p.angle = Math.atan2(mx, mz);
      if (this.possession === p.id) {
        if (input.charging) p.charge += dt;
        if (input.shoot) {
          this.shoot(p, input);
          p.aiTime = 0;
        } else if (input.pass) {
          this.pass(p);
          p.aiTime = 0;
        }
      }
      if (input.check) {
        this.check(p);
        if (p.check > 1.3) p.aiTime = 0;
      }
    }
    this.world.timestep = dt;
    this.world.step(this.queue);
    this.queue.drainCollisionEvents((a, b, started) => {
      if (!started) return;
      if (a !== this.puckCollider.handle && b !== this.puckCollider.handle) return;
      const other = a === this.puckCollider.handle ? b : a;
      const player = this.players.find((p) => p.collider.handle === other);
      if (player) {
        if (this.lastShotTeam >= 0 && player.team !== this.lastShotTeam) {
          this.stats.saves[player.team]++;
          this.emit("save", { id: player.id });
        }
      } else {
        const v = this.puck.linvel();
        if (len(v.x, v.z) > 5) {
          if (this.lastShotTeam >= 0) {
            this.shotBank = true;
            this.stats.banks[this.lastShotTeam]++;
          }
          this.emit("bank", { x: this.puck.translation().x, z: this.puck.translation().z });
        }
      }
    });
    for (const p of this.players) {
      const a = p.body.translation(),
        v = p.body.linvel();
      p.x = a.x;
      p.z = a.z;
      p.vx = v.x;
      p.vz = v.z;
      if (Math.abs(p.x) > 18 || Math.abs(p.z) > 10)
        this.place(p, clamp(p.x, -17.1, 17.1), clamp(p.z, -9.1, 9.1));
    }
    if (this.possession >= 0) {
      const p = this.players[this.possession],
        dir = p.team === 0 ? 1 : -1;
      const side = Math.sin(p.stick * 5.5) * 0.5;
      this.puck.setTranslation({ x: p.x + dir * 0.92, y: 0.22, z: p.z + side }, true);
      this.puck.setLinvel({ x: p.vx, y: 0, z: p.vz }, true);
    } else {
      const b = this.puck.translation();
      if (Math.abs(b.x) > 18.25 && Math.abs(b.z) < 2.65) {
        this.goal(b.x > 0 ? 0 : 1);
        return;
      }
      if (Math.abs(b.x) > 21 || Math.abs(b.z) > 11) {
        this.puck.setTranslation({ x: clamp(b.x, -17, 17), y: 0.22, z: clamp(b.z, -9, 9) }, true);
        this.puck.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
      if (this.pickupDelay <= 0) {
        const candidates = this.players
          .filter((p) => p.stun <= 0 && len(p.x - b.x, p.z - b.z) < 1.2)
          .sort((a, c) => len(a.x - b.x, a.z - b.z) - len(c.x - b.x, c.z - b.z));
        if (candidates.length) {
          this.givePuck(candidates[0].id);
          this.emit("pickup", { id: candidates[0].id });
        }
      }
    }
  }
  goal(team) {
    if (this.phase !== "play") return;
    this.score[team]++;
    this.possession = -1;
    this.puck.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.emit("goal", { team, bank: this.shotBank, score: [...this.score] });
    if (this.overtime) {
      this.end();
      return;
    }
    this.phase = "goal";
    this.phaseTime = 2.6;
    this.faceoff();
  }
  end() {
    if (this.finished) return;
    this.finished = true;
    this.phase = "over";
    this.remaining = Math.max(0, this.remaining);
    this.emit("end", { score: [...this.score] });
  }
  snapshot() {
    const b = this.puck.translation();
    return {
      t: "world",
      phase: this.phase,
      phaseTime: this.phaseTime,
      remaining: this.remaining,
      elapsed: this.elapsed,
      score: this.score,
      stats: this.stats,
      possession: this.possession,
      active: this.active,
      mode: this.mode,
      overtime: this.overtime,
      players: this.players.map((p) => [p.x, p.z, p.angle, p.stun, p.charge, p.check]),
      puck: [b.x, b.z],
    };
  }
  apply(s) {
    this.phase = s.phase;
    this.phaseTime = s.phaseTime;
    this.remaining = s.remaining;
    this.elapsed = s.elapsed;
    this.score = s.score;
    this.stats = s.stats;
    this.possession = s.possession;
    this.active = s.active;
    this.mode = s.mode;
    this.overtime = s.overtime;
    for (let i = 0; i < 4; i++) {
      const p = this.players[i],
        a = s.players[i];
      p.x = a[0];
      p.z = a[1];
      p.angle = a[2];
      p.stun = a[3];
      p.charge = a[4];
      p.check = a[5];
      p.body.setTranslation({ x: p.x, y: 0.6, z: p.z }, true);
    }
    this.puck.setTranslation({ x: s.puck[0], y: 0.22, z: s.puck[1] }, true);
  }
}
export async function initPhysics() {
  await RAPIER.init();
  return RAPIER;
}
