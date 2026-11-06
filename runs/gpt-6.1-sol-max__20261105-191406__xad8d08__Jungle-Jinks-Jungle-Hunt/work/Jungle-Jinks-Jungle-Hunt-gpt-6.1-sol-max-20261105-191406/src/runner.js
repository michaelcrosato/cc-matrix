import RAPIER from "@dimforge/rapier3d-compat";
import { groundAt, makeAvatar, rockMesh, STAGES, seeded, THREE, toon } from "./art.js";
import { emptyInput } from "./input.js";

export { RAPIER };
export const DEFAULTS = {
  speed: 6.6,
  jump: 11.2,
  gravity: 22,
  swingPump: 1.3,
  swimSpeed: 5.6,
  air: 18,
  rockInterval: 3.4,
  winchTime: 1,
  timeScale: 1,
};
export class Runner {
  constructor(game, index = 0) {
    this.game = game;
    this.index = index;
    this.avatar = makeAvatar(index ? 0x74b9c3 : 0xdb5743);
    this.stageIndex = 0;
    this.world = null;
    this.score = 0;
    this.elapsed = 0;
    this.health = 5;
    this.relicCount = 0;
    this.collected = new Set();
    this.totalDamage = 0;
    this.swings = 0;
    this.stuns = 0;
    this.face = 1;
    this.finished = false;
    this.down = false;
    this.bot = false;
    this.god = false;
    this.noclip = false;
    this.rng = seeded(1087);
    this.enterStage(0);
  }
  enterStage(i) {
    if (this.world) {
      for (const r of this.rocks) this.game.stages[this.stageIndex].dynamic.remove(r.mesh);
      this.world.free();
    }
    this.stageIndex = i;
    this.finished = false;
    this.down = false;
    const data = STAGES[i];
    this.stage = this.game.stages[i];
    this.stage.scene.add(this.avatar.root);
    this.world = new RAPIER.World({ x: 0, y: -this.game.cfg.gravity, z: 0 });
    this.world.timestep = 1 / 60;
    for (const [a, b, y] of data.grounds) {
      const mid = (a + b) / 2,
        len = b - a,
        sloped = i === 2,
        ang = sloped ? Math.atan(0.125) : 0;
      const fy = sloped ? mid * 0.125 : y;
      const c = RAPIER.ColliderDesc.cuboid(len / (2 * Math.cos(ang)), 3.3, 4.5)
        .setTranslation(mid + Math.sin(ang) * 3.3, fy - Math.cos(ang) * 3.3, 0)
        .setRotation({ x: 0, y: 0, z: Math.sin(ang / 2), w: Math.cos(ang / 2) })
        .setFriction(0.65);
      this.world.createCollider(c);
    }
    this.body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(data.spawn.x, data.spawn.y, 0)
        .enabledTranslations(true, true, false)
        .enabledRotations(false, false, false)
        .setCcdEnabled(true)
        .setLinearDamping(0),
    );
    this.collider = this.world.createCollider(
      RAPIER.ColliderDesc.capsule(0.55, 0.4).setFriction(0).setRestitution(0).setMass(1),
      this.body,
    );
    this.actorBodies = [];
    for (const actor of [...this.stage.crocs, ...this.stage.guardians]) {
      const b = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(actor.x, actor.y ?? 0.5, 0),
      );
      const c = this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(i === 1 ? 1.65 : 1.1, i === 1 ? 0.43 : 0.7, 0.6).setSensor(true),
        b,
      );
      this.actorBodies.push({ actor, body: b, collider: c });
    }
    this.rocks = [];
    this.rockTimer = 1.5;
    this.jumpCooldown = 0;
    this.cutCooldown = 0;
    this.cutTimer = 0;
    this.swing = null;
    this.grabCooldown = 0;
    this.launchBoost = 0;
    this.coyote = 0.12;
    this.checkpoint = 0;
    this.invuln = 1.2;
    this.oxygen = this.game.cfg.air;
    this.swimming = false;
    this.ducking = false;
    this.grounded = false;
    this.winchCharge = [0, 0, 0];
    this.winchDone = [false, false, false];
    this.rescueCharge = 0;
    this.cageHeight = 5;
    this.stunned = new Map();
    this.sinceBubble = 0;
    this.botLast = emptyInput();
    this.botTimer = 0;
    this.camera = new THREE.Vector3(data.spawn.x + this.viewLead(), i === 1 ? -1.2 : 6, 25);
    this.banner = 2.5;
    this.deadTimer = 0;
    this.travelMax = data.spawn.x;
    this.fallCount = 0;
    if (this.index === 0) this.game.onStage(i);
  }
  get position() {
    return this.body.translation();
  }
  step(dt, input) {
    if (this.finished) {
      this.avatar.setAnim("cheer");
      this.avatar.update(dt);
      return;
    }
    if (this.down) {
      this.deadTimer -= dt;
      if (this.game.runners.length > 1 && this.deadTimer <= 0) this.retry();
      this.avatar.update(dt);
      return;
    }
    const cfg = this.game.cfg;
    this.elapsed += dt;
    this.world.gravity.y = -cfg.gravity;
    this.world.timestep = dt;
    this.banner = Math.max(0, this.banner - dt);
    this.jumpCooldown = Math.max(0, this.jumpCooldown - dt);
    this.cutCooldown = Math.max(0, this.cutCooldown - dt);
    this.grabCooldown = Math.max(0, this.grabCooldown - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.launchBoost = Math.max(0, this.launchBoost - dt);
    this.cutTimer = Math.max(0, this.cutTimer - dt);
    for (const [k, v] of this.stunned) this.stunned.set(k, Math.max(0, v - dt));
    let p = this.body.translation(),
      vel = this.body.linvel(),
      floor = groundAt(this.stageIndex, p.x);
    this.grounded =
      floor > -20 && p.y <= floor + (this.ducking ? 0.68 : 1.06) && p.y >= floor + 0.2 && vel.y < 2;
    this.coyote = this.grounded ? 0.12 : Math.max(0, this.coyote - dt);
    this.swimming = this.stageIndex === 1 && p.x > 7.4 && p.x < 83 && p.y < 1.37;
    if (Math.abs(input.x) > 0.05) this.face = input.x > 0 ? 1 : -1;
    const nearWinch = this.nearWinch(),
      nearRescue = this.stageIndex === 3 && p.x > 80 && this.winchDone.every(Boolean);
    if (this.noclip) {
      this.body.setGravityScale(0, true);
      this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      this.body.setTranslation(
        {
          x: p.x + input.x * cfg.speed * 2 * dt,
          y: p.y + input.y * cfg.speed * 2 * dt,
          z: 0,
        },
        true,
      );
    } else if (this.swing) {
      const s = this.swing;
      s.omega += ((-cfg.gravity / s.vine.length) * Math.sin(s.theta) + input.x * cfg.swingPump) * dt;
      s.omega *= Math.exp(-0.045 * dt);
      s.omega = THREE.MathUtils.clamp(s.omega, -1.5, 1.5);
      s.theta += s.omega * dt;
      if (Math.abs(s.theta) > 1.2) {
        s.theta = Math.sign(s.theta) * 1.2;
        s.omega *= -0.35;
      }
      const x = s.vine.x + Math.sin(s.theta) * s.vine.length,
        y = s.vine.y - Math.cos(s.theta) * s.vine.length - 0.6;
      this.body.setNextKinematicTranslation({ x, y, z: 0 });
      if (input.jumpPressed && this.jumpCooldown === 0) this.release(input.x);
    } else if (this.swimming) {
      this.body.setGravityScale(0, true);
      let sx = input.x * cfg.swimSpeed,
        sy = input.y * cfg.swimSpeed - 0.12;
      if (this.game.settings.assist && p.x > 78 && input.x > 0) sy = Math.max(sy, 3.2);
      if (input.jumpPressed && this.jumpCooldown === 0) {
        sy += 5.8;
        sx += this.face * 2;
        this.jumpCooldown = 0.5;
        this.game.sfx("bubble", this);
      }
      this.body.setLinvel(
        {
          x: THREE.MathUtils.lerp(vel.x, sx, Math.min(1, dt * 5)),
          y: THREE.MathUtils.lerp(vel.y, sy, Math.min(1, dt * 5)),
          z: 0,
        },
        true,
      );
    } else {
      this.body.setGravityScale(1, true);
      let dx = THREE.MathUtils.lerp(
          vel.x,
          input.x * cfg.speed * (input.duck ? 0.45 : 1),
          Math.min(1, dt * (this.grounded ? 15 : this.launchBoost > 0 ? 0.6 : 3.8)),
        ),
        dy = vel.y;
      if (
        input.jumpPressed &&
        this.coyote > 0 &&
        this.jumpCooldown === 0 &&
        !(nearWinch >= 0 && input.interact) &&
        !nearRescue
      ) {
        dy = cfg.jump;
        this.coyote = 0;
        this.jumpCooldown = 0.22;
        this.grounded = false;
        this.game.sfx("jump", this);
      }
      this.body.setLinvel({ x: dx, y: dy, z: 0 }, true);
      const duck = input.duck && this.grounded;
      if (duck !== this.ducking) {
        this.ducking = duck;
        this.collider.setShape(new RAPIER.Capsule(duck ? 0.17 : 0.55, 0.4));
        this.body.setTranslation({ x: p.x, y: p.y + (duck ? -0.37 : 0.4), z: 0 }, true);
      }
      if (!this.grounded && this.grabCooldown === 0 && (this.game.settings.assist || input.jump)) {
        let best = null,
          dist = 5.1;
        for (const v of this.stage.vines) {
          const d = Math.hypot(v.end.x - p.x, v.end.y - 0.6 - p.y);
          if (d < dist && p.y > -6 && Math.abs(v.end.y - p.y) < 5) {
            best = v;
            dist = d;
          }
        }
        if (best) this.grab(best);
      }
    }
    if (input.cutPressed && this.cutCooldown === 0) {
      this.cutCooldown = 0.42;
      this.cutTimer = 0.22;
      this.avatar.cut();
      this.game.sfx("cut", this);
      for (const a of this.actorBodies) {
        const q = a.actor.group.position;
        if (Math.abs(q.x - p.x) < 3.5 && Math.abs(q.y - p.y) < 2.8) {
          this.stunned.set(a.actor, 2.8);
          a.actor.stun = 2.8;
          this.stuns++;
          this.score += 40;
          this.game.toast("A little personal space, please.", 1.4, this);
        }
      }
    }
    for (const a of this.actorBodies) {
      const q = a.actor.group.position;
      a.body.setNextKinematicTranslation({
        x: q.x,
        y: q.y + (this.stageIndex === 3 ? 0.6 : 0),
        z: 0,
      });
    }
    if (this.stageIndex === 2 && !this.noclip) {
      this.rockTimer -= dt;
      if (this.rockTimer <= 0) {
        this.spawnRock();
        this.rockTimer = cfg.rockInterval;
      }
    }
    this.world.step();
    p = this.body.translation();
    this.travelMax = Math.max(this.travelMax, p.x);
    if (p.x < -4) this.body.setTranslation({ x: -4, y: p.y, z: 0 }, true);
    for (const a of this.actorBodies)
      if (!(this.stunned.get(a.actor) > 0) && this.world.intersectionPair(this.collider, a.collider))
        this.hurt(this.stageIndex === 1 ? "croc" : "guardian");
    for (let j = this.rocks.length - 1; j >= 0; j--) {
      const r = this.rocks[j],
        q = r.body.translation();
      r.mesh.position.set(q.x, q.y, q.z);
      const rot = r.body.rotation();
      r.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
      let contact = false;
      this.world.contactPair(this.collider, r.collider, () => (contact = true));
      if (contact) this.hurt("rock");
      if (q.x < -12 || q.y < -20) {
        this.world.removeRigidBody(r.body);
        this.stage.dynamic.remove(r.mesh);
        this.rocks.splice(j, 1);
      }
    }
    if (p.y < -15) {
      this.fallCount++;
      this.hurt("fall", true);
    }
    if (this.swimming && p.y < 0.5) {
      const bubbles = [24, 48, 72].some((x) => Math.abs(x - p.x) < 1.8);
      this.oxygen = THREE.MathUtils.clamp(this.oxygen + dt * (bubbles ? 11 : -1), 0, cfg.air);
      if (bubbles && this.sinceBubble > 2) {
        this.game.sfx("bubble", this);
        this.sinceBubble = 0;
      }
      if (this.oxygen <= 0) {
        this.hurt("air", true);
        this.oxygen = cfg.air;
      }
    } else this.oxygen = Math.min(cfg.air, this.oxygen + dt * 10);
    this.sinceBubble += dt;
    for (const item of this.stage.pickups) {
      const key = `${this.stageIndex}:${item.id}`;
      if (this.collected.has(key)) continue;
      if (Math.hypot(item.x - p.x, item.group.position.y - p.y) < (item.relic ? 1.45 : 1.1)) {
        this.collected.add(key);
        this.score += item.relic ? 500 : 25;
        if (item.relic) {
          this.relicCount++;
          this.game.toast("A pocket-sized discovery! +500", 1.8, this);
        }
        this.game.sfx("pickup", this);
        this.game.burst(this.stageIndex, item.x, item.y, item.relic ? 18 : 8, 0xf4d884);
      }
    }
    const points = STAGES[this.stageIndex].checkpoints;
    for (let i = this.checkpoint + 1; i < points.length; i++)
      if (p.x >= points[i]) {
        this.checkpoint = i;
        this.health = Math.min(5, this.health + 1);
        this.game.sfx("checkpoint", this);
        this.game.toast("Camp reached · A little breathing room.", 1.8, this);
      }
    if (this.stageIndex === 3) {
      if (this.winchDone.every(Boolean)) this.cageHeight = Math.max(0.25, this.cageHeight - dt * 3.2);
      if (nearWinch >= 0 && !this.winchDone[nearWinch] && input.interact) {
        this.winchCharge[nearWinch] = Math.min(cfg.winchTime, this.winchCharge[nearWinch] + dt);
        if (this.winchCharge[nearWinch] >= cfg.winchTime) {
          this.winchDone[nearWinch] = true;
          this.score += 250;
          this.game.sfx("gong", this);
          this.game.toast(
            this.winchDone.every(Boolean)
              ? "The basket is down! Go get Pip."
              : `${this.winchDone.filter(Boolean).length} / 3 winches wound. Pip approves.`,
            2,
            this,
          );
        }
      }
      if (nearRescue && this.cageHeight < 0.7 && Math.abs(p.y - 1.1) < 2 && input.interact) {
        this.rescueCharge += dt;
        if (this.rescueCharge > 0.65) this.finish();
      }
    }
    if (this.stageIndex < 3 && p.x > STAGES[this.stageIndex].end) {
      this.score += 500;
      this.game.sfx("gong", this);
      this.enterStage(this.stageIndex + 1);
      return;
    }
    this.syncVisual(dt, input);
  }
  grab(v) {
    if (this.ducking) {
      this.collider.setShape(new RAPIER.Capsule(0.55, 0.4));
      this.ducking = false;
    }
    this.swing = {
      vine: v,
      theta: v.theta,
      omega: Math.cos(this.game.time * 0.98 + v.phase) * 0.86 * 0.98,
    };
    this.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.jumpCooldown = 0.28;
    this.swings++;
    this.game.sfx("grab", this);
  }
  release(x) {
    const s = this.swing;
    if (!s) return;
    const px = s.vine.x + Math.sin(s.theta) * s.vine.length,
      py = s.vine.y - Math.cos(s.theta) * s.vine.length - 0.6;
    this.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
    this.body.setTranslation({ x: px, y: py, z: 0 }, true);
    let vx = Math.cos(s.theta) * s.vine.length * s.omega + x * 2.5,
      vy = Math.sin(s.theta) * s.vine.length * s.omega + 3.2;
    if (x > 0) vx = Math.max(7, vx);
    this.body.setLinvel({ x: THREE.MathUtils.clamp(vx, -16, 16), y: vy, z: 0 }, true);
    this.swing = null;
    this.grabCooldown = 0.65;
    this.jumpCooldown = 0.2;
    this.launchBoost = 1.1;
    this.game.sfx("release", this);
  }
  spawnRock() {
    const p = this.body.translation(),
      radius = this.rng() > 0.5 ? 0.78 : 1.1,
      x = Math.min(98, p.x + 20),
      y = x * 0.125 + 6 + this.rng() * 3;
    const b = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(x, y, 0)
        .setLinvel(-5.5, 0, 0)
        .setAngvel({ x: 0, y: 0, z: 3 })
        .setCcdEnabled(true),
    );
    const c = this.world.createCollider(
      RAPIER.ColliderDesc.ball(radius).setDensity(2).setFriction(0.6).setRestitution(0.24),
      b,
    );
    const m = rockMesh(this.stage.dynamic, radius);
    this.rocks.push({ body: b, collider: c, mesh: m });
    this.game.burst(2, x, y, 6, 0xc9b980);
    this.game.sfx("rock", this);
  }
  nearWinch() {
    if (this.stageIndex !== 3) return -1;
    const p = this.body.translation();
    return this.stage.winches.findIndex((w) => Math.abs(w.x - p.x) < 2.3 && Math.abs(p.y - 1) < 1.8);
  }
  hurt(_reason, respawn = false) {
    if (this.invuln > 0 && !respawn) return;
    if (!this.god && !this.game.attract) {
      this.health--;
      this.totalDamage++;
      this.invuln = 1.7;
      this.game.sfx("hurt", this);
      this.game.damage(this);
      this.score = Math.max(0, this.score - 75);
    }
    if (this.health <= 0) {
      this.down = true;
      this.deadTimer = 3;
      this.game.onDown(this);
      return;
    }
    if (respawn) this.respawn();
  }
  respawn() {
    if (this.swing) {
      this.swing = null;
      this.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
    }
    const x = STAGES[this.stageIndex].checkpoints[this.checkpoint],
      y = this.stageIndex === 1 && this.checkpoint > 0 ? 0.9 : groundAt(this.stageIndex, x) + 1.2;
    this.body.setTranslation({ x, y, z: 0 }, true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.invuln = 2;
    this.grabCooldown = 0.25;
    this.oxygen = this.game.cfg.air;
    this.launchBoost = 0;
    this.camera.x = x + this.viewLead();
    this.game.toast("A minor detour. Back to camp!", 1.8, this);
  }
  retry() {
    this.health = 5;
    this.down = false;
    this.elapsed += 5;
    this.respawn();
  }
  viewLead(base = 5.4) {
    const camera = this.game.cameras[this.index] || this.game.cameras[0];
    return Math.min(base, (camera.right - camera.left) * 0.15);
  }
  finish() {
    if (this.finished) return;
    this.finished = true;
    this.score += 2000 + Math.max(0, Math.floor(3000 - this.elapsed * 10));
    this.finishTime = this.elapsed;
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.avatar.setAnim("cheer");
    this.game.sfx("win", this);
    this.game.onWin(this);
  }
  syncVisual(dt, input = emptyInput()) {
    const p = this.body.translation();
    this.avatar.root.position.set(p.x, p.y, 0);
    this.avatar.root.scale.set(this.face, this.ducking ? 0.72 : 1, 1);
    this.avatar.root.visible =
      this.invuln <= 0 || Math.floor(this.invuln * 10) % 2 === 0 || this.god || this.game.attract;
    this.avatar.slash.visible = this.cutTimer > 0;
    this.avatar.machete.visible = this.cutTimer > 0 || (this.stageIndex === 1 && !this.swing);
    this.avatar.slash.material.opacity = (this.cutTimer / 0.22) * 0.8;
    this.avatar.slash.rotation.z = 0.9 - this.cutTimer * 6;
    const anim = this.finished
      ? "cheer"
      : this.swing
        ? "hang"
        : this.swimming
          ? "swim"
          : this.ducking
            ? "duck"
            : !this.grounded
              ? "jump"
              : Math.abs(input.x) > 0.1
                ? "run"
                : "idle";
    this.avatar.setAnim(anim);
    this.avatar.update(dt);
  }
  applyScene() {
    for (const v of this.stage.vines)
      v.pivot.rotation.z =
        this.swing?.vine === v ? this.swing.theta : Math.sin(this.game.time * 0.98 + v.phase) * 0.86;
    for (let i = 0; i < this.stage.checkFlags.length; i++)
      this.stage.checkFlags[i].material = toon(i <= this.checkpoint ? 0xd9ed91 : 0xe3be72);
    for (const p of this.stage.pickups) p.group.visible = !this.collected.has(`${this.stageIndex}:${p.id}`);
    for (let i = 0; i < this.stage.winches.length; i++) {
      const w = this.stage.winches[i];
      w.wheel.rotation.z = this.winchCharge[i] * Math.PI * 3;
      w.light.material = toon(this.winchDone[i] ? 0xd7ee86 : 0xf4b66c);
    }
    if (this.stage.cage) {
      this.stage.cage.position.y = this.cageHeight;
      this.stage.cage.visible = !this.finished;
      this.stage.pip.root.visible = true;
      this.stage.freePip.root.visible = this.finished;
    }
  }
  progressScore() {
    return this.finished
      ? 1000000 + this.score
      : Math.floor(
          this.stageIndex * 100000 +
            Math.min(89, this.travelMax) * 750 +
            this.winchDone.filter(Boolean).length * 5000 +
            this.score,
        );
  }
  botInput(dt) {
    const s = emptyInput(),
      p = this.body.translation();
    this.botTimer += dt;
    s.x = 1;
    if (this.stageIndex === 1) {
      const target =
        this.oxygen < 5
          ? 1
          : Math.abs(p.x - 24) < 4 || Math.abs(p.x - 47) < 4 || Math.abs(p.x - 70) < 4
            ? -5.9
            : -3.3;
      s.y = THREE.MathUtils.clamp((p.x > 78 ? 2.5 : target) - p.y, -1, 1);
      s.cut = this.cutCooldown === 0;
      s.jump = p.x > 79 && this.jumpCooldown === 0;
    } else if (this.swing) {
      s.jump = this.swing.theta > 0.48 && this.swing.omega > 0.2 && this.jumpCooldown === 0;
    } else {
      let edge = null;
      for (const [a, b] of STAGES[this.stageIndex].grounds)
        if (p.x >= a && p.x <= b) {
          edge = b;
          break;
        }
      s.jump =
        this.grounded &&
        this.jumpCooldown === 0 &&
        ((edge !== null && edge < 88 && p.x > edge - 3.3) ||
          (this.stageIndex === 2 && this.botTimer % 1.35 < 0.12));
    }
    if (this.stageIndex === 3) {
      const target = this.winchDone.findIndex((v) => !v);
      const x = target >= 0 ? this.stage.winches[target].x : 84;
      if (Math.abs(x - p.x) < 1.2) {
        s.x = 0;
        s.interact = true;
        s.jump = false;
      } else s.x = x > p.x ? 1 : -1;
      s.cut = this.cutCooldown === 0;
    }
    if (this.stageIndex === 1 || this.stageIndex === 3) s.cut = this.cutCooldown === 0;
    s.jumpPressed = s.jump && !this.botLast.jump;
    s.cutPressed = s.cut && !this.botLast.cut;
    s.interactPressed = s.interact && !this.botLast.interact;
    this.botLast = { ...s };
    return s;
  }
  dispose() {
    for (const r of this.rocks) this.stage.dynamic.remove(r.mesh);
    this.avatar.root.removeFromParent();
    this.world?.free();
  }
  state() {
    const p = this.body.translation();
    return {
      stage: this.stageIndex,
      x: p.x,
      y: p.y,
      health: this.health,
      score: this.score,
      elapsed: this.elapsed,
      oxygen: this.oxygen,
      relics: this.relicCount,
      checkpoint: this.checkpoint,
      swing: !!this.swing,
      theta: this.swing?.theta ?? null,
      omega: this.swing?.omega ?? null,
      swings: this.swings,
      swimming: this.swimming,
      grounded: this.grounded,
      ducking: this.ducking,
      winches: [...this.winchDone],
      finished: this.finished,
      down: this.down,
      stuns: this.stuns,
      damage: this.totalDamage,
      rocks: this.rocks.length,
    };
  }
}
