import RAPIER from "@dimforge/rapier3d-compat";
import { THREE, C, mat, part, helicopter, jet, turret, boss, truck, crew } from "./graphics.js";
export const DEFAULTS = {
  speed: 17,
  fireRate: 9,
  weaponDamage: 1,
  incoming: 1,
  spawnRate: 1,
  rocketCooldown: 1.2,
};
export const SECTORS = [
  { name: "DUST PATROL", sub: "Keep the wheels turning.", count: 10 },
  { name: "THE LOW ROAD", sub: "Watch the ground. Watch the sky.", count: 14 },
  { name: "BIG TROUBLE", sub: "Bring down the Dustmaker.", count: 8 },
];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const length = (x, y) => Math.hypot(x, y);
const groups = {
  player: (1 << 16) | (2 | 8),
  enemy: (2 << 16) | (1 | 4),
  friendly: (4 << 16) | 2,
  hostile: (8 << 16) | (1 | 16),
  truck: (16 << 16) | 8,
};
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export class Game {
  constructor(gfx, audio, settings) {
    this.gfx = gfx;
    this.audio = audio;
    this.settings = settings;
    this.config = { ...DEFAULTS };
    this.running = false;
    this.players = [];
    this.enemies = [];
    this.bullets = [];
    this.trucks = [];
    this.crew = [];
    this.ghosts = new Map();
    this.events = [];
    this.onEvent = () => {};
    this.god = false;
    this.auto = false;
    this.seed = 1982;
    this.time = 0;
    this.tick = 0;
    this.score = 0;
    this.sector = 0;
    this.metrics = {};
  }
  async init() {
    await RAPIER.init();
    this.physicsVersion = RAPIER.version();
  }
  emit(type, data = {}) {
    const e = { type, time: this.time, ...data };
    this.events.push(e);
    if (this.events.length > 250) this.events.shift();
    this.onEvent(e);
  }
  start({ coop = false, training = false, demo = false, seed = 1982 } = {}) {
    if (this.world) this.world.free();
    if (this.queue) this.queue.free();
    this.gfx.clear();
    this.world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    this.world.timestep = 1 / 60;
    this.queue = new RAPIER.EventQueue(true);
    this.handles = new Map();
    this.random = rng(seed);
    this.seed = seed;
    this.players = [];
    this.enemies = [];
    this.bullets = [];
    this.trucks = [];
    this.crew = [];
    this.ghosts.clear();
    this.running = true;
    this.completed = false;
    this.won = false;
    this.demo = demo;
    this.training = training;
    this.coop = coop;
    this.time = 0;
    this.tick = 0;
    this.score = 0;
    this.kills = 0;
    this.rescued = 0;
    this.reserves = coop ? 3 : 2;
    this.sector = 0;
    this.intermission = 0;
    this.demoClock = 0;
    this.lastRadio = -99;
    this.boss = null;
    this.radioUntil = 0;
    this.metrics = {
      shots: 0,
      hits: 0,
      rockets: 0,
      flares: 0,
      rescued: 0,
      padsUsed: 0,
      kills: 0,
      damageTaken: 0,
      physicsContacts: 0,
      sectors: 0,
      respawns: 0,
    };
    this.events = [];
    const base = training ? -20 : -100;
    for (let i = 0; i < 3; i++) this.makeTruck(base - i * 9, i);
    this.makePlayer(base - 2, 10, 0);
    if (coop) this.makePlayer(base - 9, 15, 1);
    this.gfx.cameraX = base;
    this.gfx.cameraY = 12;
    this.gfx.pad.position.x = base - 19;
    if (training) {
      this.trainingStep = 0;
      this.trainingOrigin = base - 2;
      this.spawnLeft = 0;
      this.stageTime = 0;
      this.trainingBaseKills = 0;
      this.emit("trainingStep", { step: 0 });
    } else this.beginSector(0);
    this.emit("start", { demo, coop, training });
  }
  body(entity, shape, group, kinematic = false) {
    let desc = kinematic
      ? RAPIER.RigidBodyDesc.kinematicPositionBased()
      : RAPIER.RigidBodyDesc.dynamic();
    desc = desc
      .setTranslation(entity.x, entity.y, 0)
      .setGravityScale(0)
      .lockRotations()
      .enabledTranslations(true, true, false)
      .setCcdEnabled(!kinematic);
    entity.body = this.world.createRigidBody(desc);
    const col = shape
      .setSensor(true)
      .setCollisionGroups(groups[group])
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    entity.collider = this.world.createCollider(col, entity.body);
    this.handles.set(entity.collider.handle, entity);
    return entity;
  }
  makePlayer(x, y, id) {
    const mesh = this.gfx.add(helicopter(id ? C.teal : C.yellow));
    const e = {
      kind: "player",
      id,
      x,
      y,
      vx: 0,
      vy: 0,
      hp: 100,
      maxHp: 100,
      mesh,
      face: 1,
      angle: 0,
      gun: 0,
      rocket: 0,
      flare: 0,
      rockets: 5,
      flares: 3,
      invuln: 2,
      deadTime: 0,
      rescue: 0,
      boost: 1,
      padTime: 0,
      regen: 0,
      boosting: false,
    };
    this.body(e, RAPIER.ColliderDesc.cuboid(1.35, 0.65, 0.6), "player");
    mesh.position.set(x, y, 0);
    e.shadow = this.gfx.shadow(mesh, 2.4);
    this.gfx.actors.add(e.shadow);
    this.players.push(e);
    return e;
  }
  makeTruck(x, id) {
    const mesh = this.gfx.add(truck(id === 1 ? 0xb2945f : C.teal));
    const e = { kind: "truck", id, x, y: 0.62, hp: 100, mesh, dead: false };
    this.body(e, RAPIER.ColliderDesc.cuboid(2.3, 1.3, 0.9), "truck", true);
    mesh.position.set(x, 0.62, 0);
    this.trucks.push(e);
    return e;
  }
  makeCrew(x) {
    const mesh = this.gfx.add(crew());
    mesh.position.set(x, 0.4, 0.2);
    const e = { x, y: 0.4, mesh, saved: false, progress: 0 };
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2, 0.055, 5, 32), mat(C.teal, true));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, 0.1, 0);
    this.gfx.actors.add(ring);
    e.ring = ring;
    const beacon = part(
      this.gfx.actors,
      "cylinder",
      C.teal,
      [x, 1.6, -0.4],
      [0.055, 3, 0.055],
      false,
      true,
    );
    e.beacon = beacon;
    this.crew.push(e);
    return e;
  }
  beginSector(n) {
    this.sector = n;
    this.stageTime = 0;
    this.spawnTimer = 1.5;
    this.spawnLeft = Math.max(3, Math.round(SECTORS[n].count * this.config.spawnRate));
    this.intermission = 0;
    this.metrics.sectors++;
    for (const e of this.crew) {
      this.gfx.actors.remove(e.mesh, e.ring, e.beacon);
    }
    this.crew = [];
    const front = this.trucks.find((t) => t.hp > 0)?.x || this.players[0].x;
    this.gfx.pad.position.x = clamp(front - 19, -220, 210);
    this.makeCrew(clamp(front + 15, -220, 212));
    if (n > 0) this.makeCrew(clamp(front + 43, -220, 216));
    if (n === 2) this.spawnEnemy("boss", clamp(front + 35, -185, 185), 20);
    this.spawnOne();
    this.spawnOne();
    for (const p of this.players) {
      if (p.hp > 0) {
        p.hp = Math.min(100, p.hp + 35);
        p.rockets = 5;
        p.flares = 3;
        p.invuln = 3;
      }
    }
    this.emit("sector", { sector: n, name: SECTORS[n].name });
    this.radio(
      n === 0
        ? "CONVOY ROLLING. KEEP OUR SKY CLEAN."
        : n === 1
          ? "RAIDERS ON THE LOW ROAD. STAY SHARP."
          : "THAT IS ONE BIG CHOPPER. CLIP ITS WINGS.",
    );
  }
  spawnOne() {
    if (this.spawnLeft <= 0) return;
    const index = this.spawnLeft--,
      p = this.players.find((p) => p.hp > 0) || this.players[0];
    let kind = index % 4 === 0 && this.sector > 0 ? "turret" : index % 3 === 0 ? "jet" : "heli";
    let x = clamp(p.x + (this.random() < 0.5 ? -1 : 1) * (33 + this.random() * 18), -218, 218),
      y = 10 + this.random() * 15;
    if (kind === "turret") {
      x = clamp((this.trucks.find((t) => t.hp > 0)?.x || p.x) + 18 + this.random() * 25, -218, 218);
      y = 1.3;
    }
    this.spawnEnemy(kind, x, y);
  }
  spawnEnemy(kind = "heli", x = this.players[0].x + 28, y = 15) {
    const mesh =
      kind === "boss"
        ? boss()
        : kind === "turret"
          ? turret()
          : kind === "jet"
            ? jet()
            : helicopter(C.red);
    this.gfx.add(mesh);
    const hp = kind === "boss" ? 85 : kind === "turret" ? 9 : kind === "jet" ? 3 : 4;
    const e = {
      kind: "enemy",
      type: kind,
      x,
      y,
      mesh,
      hp,
      maxHp: hp,
      age: 0,
      fire: 1.5 + this.random() * 2,
      phase: this.random() * 6.28,
      face: -1,
      vx: 0,
      vy: 0,
      invuln: 0,
      ram: 0,
      phase2: false,
    };
    this.body(
      e,
      kind === "boss"
        ? RAPIER.ColliderDesc.cuboid(4.9, 1.6, 1)
        : kind === "turret"
          ? RAPIER.ColliderDesc.cuboid(1.7, 1, 0.8)
          : RAPIER.ColliderDesc.cuboid(1.6, 0.75, 0.6),
      "enemy",
    );
    mesh.position.set(x, y, 0);
    e.shadow = this.gfx.shadow(mesh, kind === "boss" ? 6 : 2);
    this.gfx.actors.add(e.shadow);
    this.enemies.push(e);
    if (kind === "boss") {
      this.boss = e;
      this.audio.play("alert");
      this.emit("boss");
    }
    return e;
  }
  remove(e) {
    if (e.removed) return;
    e.removed = true;
    if (e.collider) this.handles.delete(e.collider.handle);
    if (e.body && e.body.isValid()) this.world.removeRigidBody(e.body);
    if (e.mesh) this.gfx.actors.remove(e.mesh);
    if (e.shadow) this.gfx.actors.remove(e.shadow);
  }
  projectile(x, y, dx, dy, team, rocket = false, owner = 0) {
    const norm = length(dx, dy) || 1;
    dx /= norm;
    dy /= norm;
    const speed = team === "friendly" ? (rocket ? 30 : 74) : rocket ? 13 : 19;
    const mesh = new THREE.Group();
    part(
      mesh,
      "ball",
      team === "friendly" ? (rocket ? C.cream : C.yellow) : rocket ? C.red : 0xff6647,
      [0, 0, 0],
      [rocket ? 0.62 : 0.48, rocket ? 0.2 : 0.11, 0.12],
      false,
      true,
    );
    if (rocket) part(mesh, "ball", C.yellow, [-0.65, 0, 0], [0.45, 0.13, 0.12], false, true);
    mesh.rotation.z = Math.atan2(dy, dx);
    this.gfx.add(mesh);
    const e = {
      kind: "bullet",
      team,
      rocket,
      owner,
      x,
      y,
      vx: dx * speed,
      vy: dy * speed,
      speed,
      mesh,
      life: team === "friendly" ? 3 : 5.5,
      trail: 0,
    };
    this.body(e, RAPIER.ColliderDesc.ball(rocket ? 0.36 : 0.25), team);
    e.body.setLinvel({ x: e.vx, y: e.vy, z: 0 }, true);
    mesh.position.set(x, y, 0);
    this.bullets.push(e);
    return e;
  }
  radio(text) {
    this.radioText = text;
    this.radioUntil = this.time + 5;
    this.emit("radio", { text });
    if (this.time - this.lastRadio > 2) {
      this.audio.voice();
      this.lastRadio = this.time;
    }
  }
  fire(p, input) {
    let ax = Math.cos(p.angle),
      ay = Math.sin(p.angle);
    if (this.settings.aimAssist && (!input.precise || this.demo || this.auto)) {
      let best = null,
        dist = 70;
      for (const e of this.enemies)
        if (!e.removed) {
          const d = length(e.x - p.x, e.y - p.y),
            dot = ((e.x - p.x) * ax + (e.y - p.y) * ay) / (d || 1);
          if (d < dist && dot > 0.5) {
            dist = d;
            best = e;
          }
        }
      if (best) {
        const t = dist / 74;
        ax = best.x + best.vx * t - p.x;
        ay = best.y + best.vy * t - p.y;
        const n = length(ax, ay);
        ax /= n;
        ay /= n;
      }
    }
    this.projectile(p.x + ax * 2.15, p.y + ay * 0.9 - 0.25, ax, ay, "friendly", false, p.id);
    p.gun = 1 / this.config.fireRate;
    this.metrics.shots++;
    this.gfx.streak(p.x + ax * 2.5, p.y + ay * 0.9 - 0.25);
    if (p.id === 0 && this.tick % 2 === 0) this.audio.play("gun");
  }
  rocket(p) {
    if (p.rockets < 1 || p.rocket > 0) return false;
    p.rockets--;
    p.rocket = this.config.rocketCooldown;
    let target = this.nearestEnemy(p.x, p.y);
    const dx = target ? target.x - p.x : Math.cos(p.angle),
      dy = target ? target.y - p.y : Math.sin(p.angle);
    const b = this.projectile(
      p.x + Math.sign(dx || 1) * 1.8,
      p.y - 0.65,
      dx,
      dy,
      "friendly",
      true,
      p.id,
    );
    b.target = target;
    this.metrics.rockets++;
    this.audio.play("rocket");
    this.emit("rocket", { player: p.id });
    return true;
  }
  flare(p) {
    if (p.flares < 1 || p.flare > 0) return false;
    p.flares--;
    p.flare = 2.5;
    for (const b of this.bullets)
      if (b.team === "hostile" && length(b.x - p.x, b.y - p.y) < 30) {
        this.gfx.burst(b.x, b.y, C.cream, 4);
        this.remove(b);
      }
    for (let i = 0; i < 5; i++)
      this.gfx.burst(p.x + (i - 2) * 1.5, p.y - 1 - Math.abs(i - 2) * 0.5, C.yellow, 6, 0.5);
    this.metrics.flares++;
    p.invuln = Math.max(p.invuln, 1.1);
    this.audio.play("flare");
    this.emit("flare", { player: p.id });
    return true;
  }
  nearestEnemy(x, y) {
    let result = null,
      d = Infinity;
    for (const e of this.enemies)
      if (!e.removed) {
        const n = length(e.x - x, e.y - y);
        if (n < d) {
          d = n;
          result = e;
        }
      }
    return result;
  }
  damage(e, amount, owner = 0) {
    if (e.removed || e.hp <= 0) return;
    if (e.kind !== "enemy") {
      if (this.god || this.demo || this.training) return;
      if (e.kind === "player" && e.invuln > 0) return;
      const factor =
        this.settings.difficulty === "rookie"
          ? 0.65
          : this.settings.difficulty === "veteran"
            ? 1.35
            : 1;
      amount *= this.config.incoming * factor;
    }
    if (amount <= 0) return;
    e.hp = Math.max(0, e.hp - amount);
    if (e.kind === "enemy") {
      this.metrics.hits++;
      this.gfx.burst(e.x, e.y, C.yellow, 3, 0.4);
      if (e.type === "boss" && e.hp < e.maxHp * 0.5 && !e.phase2) {
        e.phase2 = true;
        this.radio("DUSTMAKER IS MAD. FLARES READY!");
        this.emit("bossPhase", { phase: 2 });
      }
    } else {
      this.gfx.shake = Math.max(this.gfx.shake, 1);
      this.metrics.damageTaken += amount;
      if (e.kind === "player") {
        e.invuln = 0.7;
        this.audio.play("hit");
      }
    }
    if (e.hp <= 0) {
      this.gfx.burst(e.x, e.y, C.yellow, e.type === "boss" ? 65 : 25, e.type === "boss" ? 2 : 1);
      this.gfx.burst(e.x, e.y, C.red, 12);
      this.gfx.shake = e.type === "boss" ? 2.5 : 1;
      this.audio.play("boom");
      if (e.kind === "enemy") {
        this.kills++;
        this.metrics.kills++;
        this.score +=
          e.type === "boss" ? 2500 : e.type === "turret" ? 250 : e.type === "jet" ? 175 : 125;
        this.emit("kill", { type: e.type, owner });
        if (e.type === "boss") {
          this.boss = null;
          this.emit("bossDefeated");
        }
        this.remove(e);
      } else if (e.kind === "player") {
        e.deadTime = 2.4;
        e.mesh.visible = false;
        e.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        this.emit("down", { player: e.id });
        this.radio(
          this.reserves ? "BIRD DOWN. ANOTHER ONE IS ON THE WAY." : "BIRD DOWN. NO RESERVES LEFT.",
        );
      } else {
        this.remove(e);
        this.emit("truckLost");
        this.radio("WE LOST A TRUCK. COVER THE OTHERS!");
      }
    }
  }
  explosion(b, target) {
    if (b.team === "friendly") {
      for (const e of this.enemies)
        if (!e.removed && length(e.x - b.x, e.y - b.y) < 7.5 + (e.type === "boss" ? 3 : 0))
          this.damage(e, 7 * this.config.weaponDamage, b.owner);
    } else if (target) this.damage(target, 16);
    this.gfx.burst(b.x, b.y, b.team === "friendly" ? C.yellow : C.red, 19);
    this.gfx.shake = 0.7;
    this.audio.play("boom");
    this.remove(b);
  }
  contacts() {
    const pairs = [];
    this.queue.drainCollisionEvents((a, b, started) => {
      if (started) pairs.push([a, b]);
    });
    for (const pair of pairs) {
      const a = this.handles.get(pair[0]),
        b = this.handles.get(pair[1]);
      if (!a || !b || a.removed || b.removed) continue;
      this.metrics.physicsContacts++;
      const bullet = a.kind === "bullet" ? a : b.kind === "bullet" ? b : null,
        target = bullet ? (bullet === a ? b : a) : null;
      if (bullet) {
        if (bullet.rocket) this.explosion(bullet, target);
        else {
          this.damage(
            target,
            bullet.team === "friendly" ? this.config.weaponDamage : 9,
            bullet.owner,
          );
          this.gfx.burst(bullet.x, bullet.y, C.cream, 2, 0.3);
          this.remove(bullet);
        }
      } else {
        const p = a.kind === "player" ? a : b.kind === "player" ? b : null,
          e = a.kind === "enemy" ? a : b.kind === "enemy" ? b : null;
        if (p && e) {
          this.damage(p, 18);
          this.damage(e, 2, p.id);
        }
      }
    }
  }
  updatePlayer(p, dt, input) {
    p.gun -= dt;
    p.rocket -= dt;
    p.flare -= dt;
    p.invuln -= dt;
    p.regen += dt;
    if (p.hp <= 0) {
      p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      p.deadTime -= dt;
      if (p.deadTime <= 0 && this.reserves > 0) {
        this.reserves--;
        p.hp = 100;
        p.invuln = 3;
        p.rockets = 5;
        p.flares = 3;
        p.x = (this.trucks.find((t) => t.hp > 0)?.x || p.x) - 5;
        p.y = 12;
        p.body.setTranslation({ x: p.x, y: p.y, z: 0 }, true);
        p.mesh.visible = true;
        this.metrics.respawns++;
        this.emit("respawn", { player: p.id });
      }
      return;
    }
    if (p.regen > 19) {
      p.regen = 0;
      p.rockets = Math.min(5, p.rockets + 1);
      p.flares = Math.min(3, p.flares + 1);
    }
    const mx = input.x || 0,
      my = input.y || 0,
      len = Math.max(1, length(mx, my));
    p.boosting = !!input.boost && p.boost > 0.06 && len > 0.1;
    p.boost = clamp(p.boost + (p.boosting ? -0.32 : 0.2) * dt, 0, 1);
    const speed = this.config.speed * (p.boosting ? 1.7 : 1);
    p.vx = THREE.MathUtils.damp(p.vx, (mx / len) * speed, 7, dt);
    p.vy = THREE.MathUtils.damp(p.vy, (my / len) * speed, 7, dt);
    if (input.aimX !== undefined && length(input.aimX, input.aimY) > 0.1) {
      p.angle = Math.atan2(input.aimY, input.aimX);
      p.face = Math.cos(p.angle) < 0 ? -1 : 1;
    } else if (Math.abs(mx) > 0.08) {
      p.face = mx < 0 ? -1 : 1;
      p.angle = p.face < 0 ? Math.PI : 0;
    }
    p.body.setLinvel({ x: p.vx, y: p.vy, z: 0 }, true);
    if (input.fire && p.gun <= 0) this.fire(p, input);
    if (input.rocket) this.rocket(p);
    if (input.flare) this.flare(p);
    p.mesh.scale.x = p.face;
    p.mesh.userData.hull.rotation.z = THREE.MathUtils.damp(
      p.mesh.userData.hull.rotation.z,
      -p.vx * 0.014 * p.face + Math.sin(p.angle) * 0.18,
      7,
      dt,
    );
    p.mesh.visible = p.invuln > 0 ? Math.sin(this.time * 22) > -0.5 : true;
    if (p.boosting && this.tick % 4 === 0) this.gfx.smoke(p.x - p.face * 2, p.y, C.cream, 0.25);
    // A deliberate hover lowers the winch; no extra button competes with flight controls.
    let rescuing = false;
    for (const c of this.crew)
      if (!c.saved) {
        const near = Math.abs(c.x - p.x) < 3.1 && p.y > 2.6 && p.y < 7.6 && length(p.vx, p.vy) < 7;
        if (near) {
          c.progress += dt;
          rescuing = true;
          p.rescue = c.progress / 1.65;
          if (!p.cable) {
            p.cable = part(p.mesh, "box", C.cream, [0, -2, 0], [0.035, 3, 0.035], false, true);
          }
          p.cable.visible = true;
          p.cable.scale.y = Math.max(0.1, p.y - 1.6);
          p.cable.position.y = -(p.y - 1.6) / 2;
          if (c.progress >= 1.65) {
            c.saved = true;
            this.gfx.actors.remove(c.mesh, c.ring, c.beacon);
            this.rescued++;
            this.metrics.rescued++;
            this.score += 400;
            p.hp = Math.min(100, p.hp + 15);
            p.rockets = Math.min(5, p.rockets + 1);
            this.gfx.burst(c.x, 3, C.teal, 15);
            this.audio.play("rescue");
            this.radio("PICKUP CONFIRMED. NICE FLYING!");
            this.emit("rescue", { player: p.id });
          }
        } else c.progress = Math.max(0, c.progress - dt * 0.3);
      }
    if (!rescuing) {
      p.rescue = 0;
      if (p.cable) p.cable.visible = false;
    }
    const atPad =
      Math.abs(p.x - this.gfx.pad.position.x) < 4.3 && p.y < 6 && length(p.vx, p.vy) < 6;
    if (atPad) {
      p.hp = Math.min(100, p.hp + dt * 22);
      p.padTime += dt;
      p.boost = Math.min(1, p.boost + dt);
      if (p.padTime > 1.2) {
        const used = p.rockets < 5 || p.flares < 3;
        p.rockets = 5;
        p.flares = 3;
        p.padTime = 0;
        if (used) {
          this.audio.play("rescue");
          this.metrics.padsUsed++;
          this.emit("resupply");
        }
      }
    } else p.padTime = 0;
    p.atPad = atPad;
  }
  updateEnemy(e, dt) {
    e.age += dt;
    e.fire -= dt;
    const trucks = this.trucks.filter((t) => t.hp > 0),
      pilots = this.players.filter((p) => p.hp > 0);
    const front = trucks[0] || pilots[0] || this.players[0];
    let target =
      e.age % 8 < 4 && pilots.length
        ? pilots.reduce((a, b) => (Math.abs(a.x - e.x) < Math.abs(b.x - e.x) ? a : b))
        : front;
    if (e.type === "turret") {
      e.vx = 0;
      e.vy = 0;
    } else if (e.type === "boss") {
      const cx = clamp(front.x + 25, -195, 190);
      e.vx = clamp((cx + Math.sin(e.age * 0.28) * 17 - e.x) * 0.7, -9, 9);
      e.vy = (19 + Math.sin(e.age * 0.65) * 5 - e.y) * 1.3;
    } else if (e.type === "jet") {
      const tx = target.x + Math.sin(e.age * 0.32 + e.phase) * 30;
      e.vx = clamp((tx - e.x) * 0.7, -18, 18);
      e.vy = clamp(target.y + 4 + Math.sin(e.age * 1.4 + e.phase) * 5 - e.y, -9, 9);
    } else {
      const tx = target.x + Math.cos(e.phase + e.age * 0.35) * 18,
        ty = Math.max(8, target.y + 4) + Math.sin(e.age * 1.5 + e.phase) * 3;
      e.vx = clamp((tx - e.x) * 0.7, -9, 9);
      e.vy = clamp((ty - e.y) * 1.3, -7, 7);
    }
    if (e.x < -225) e.vx = Math.abs(e.vx);
    if (e.x > 225) e.vx = -Math.abs(e.vx);
    e.body.setLinvel({ x: e.vx, y: e.vy, z: 0 }, true);
    if (Math.abs(e.vx) > 0.2) e.face = e.vx < 0 ? -1 : 1;
    if (e.type !== "boss" && e.type !== "turret") e.mesh.scale.x = e.face;
    if (e.type === "heli") e.mesh.userData.hull.rotation.z = -e.vx * 0.025 * e.face;
    if (e.fire <= 0 && length(e.x - target.x, e.y - target.y) < 100) {
      e.fire =
        e.type === "boss"
          ? e.phase2
            ? 1.1
            : 2
          : e.type === "turret"
            ? 3
            : 3.4 + this.random() * 1.8;
      const dx = target.x - e.x,
        dy = target.y - e.y;
      const b = this.projectile(
        e.x,
        e.y - 0.7,
        dx,
        dy,
        "hostile",
        e.type === "boss" || e.type === "turret" || e.age > 10,
      );
      b.target = target;
      if (e.type === "boss")
        for (const offset of [-0.4, 0.4]) {
          const a = Math.atan2(dy, dx) + offset;
          this.projectile(e.x, e.y - 0.9, Math.cos(a), Math.sin(a), "hostile", false);
        }
      if (
        e.type === "boss" &&
        e.phase2 &&
        this.enemies.filter((e) => !e.removed).length < 5 &&
        e.age > 8
      )
        this.spawnEnemy("heli", e.x + 8, 24);
    }
    if (e.hp < e.maxHp * 0.4 && this.tick % 12 === 0) this.gfx.smoke(e.x, e.y + 0.5);
  }
  step(dt, inputs = []) {
    if (!this.running) return;
    this.time += dt;
    this.stageTime += dt;
    this.tick++;
    this.gfx.ageEffects(dt);
    if (this.intermission > 0) {
      this.intermission -= dt;
      if (this.intermission <= 0) {
        if (this.sector === 2) this.finish(true);
        else this.beginSector(this.sector + 1);
      }
    }
    if (!this.running) return;
    for (let i = 0; i < this.players.length; i++)
      this.updatePlayer(this.players[i], dt, inputs[i] || {});
    for (const t of this.trucks)
      if (t.hp > 0) {
        t.x = Math.min(200, t.x + (this.training ? 0 : 1.05) * dt);
        t.body.setNextKinematicTranslation({ x: t.x, y: t.y, z: 0 });
      }
    for (const e of this.enemies) if (!e.removed) this.updateEnemy(e, dt);
    for (const b of this.bullets)
      if (!b.removed) {
        b.life -= dt;
        if (b.life <= 0 || b.y < -1 || Math.abs(b.x) > 270) {
          this.remove(b);
          continue;
        }
        if (b.rocket) {
          if (!b.target || b.target.removed || b.target.hp <= 0)
            b.target =
              b.team === "friendly"
                ? this.nearestEnemy(b.x, b.y)
                : this.players.find((p) => p.hp > 0);
          if (b.target) {
            const dx = b.target.x - b.x,
              dy = b.target.y - b.y,
              n = length(dx, dy) || 1;
            b.vx = THREE.MathUtils.damp(b.vx, (dx / n) * b.speed, 5, dt);
            b.vy = THREE.MathUtils.damp(b.vy, (dy / n) * b.speed, 5, dt);
            b.body.setLinvel({ x: b.vx, y: b.vy, z: 0 }, true);
          }
          if (this.tick % 3 === 0)
            this.gfx.smoke(b.x, b.y, b.team === "friendly" ? C.cream : 0xa05643, 0.18);
        }
      }
    this.world.step(this.queue);
    this.contacts();
    for (const arr of [this.players, this.enemies, this.bullets, this.trucks])
      for (const e of arr)
        if (!e.removed) {
          const p = e.body.translation();
          e.x = p.x;
          e.y = p.y;
          if (e.kind === "player" && e.hp > 0) {
            const xx = clamp(e.x, -225, 225),
              yy = clamp(e.y, 2.7, 29);
            if (xx !== e.x || yy !== e.y) {
              e.body.setTranslation({ x: xx, y: yy, z: 0 }, true);
              e.x = xx;
              e.y = yy;
            }
          }
          e.mesh.position.set(e.x, e.y, 0);
          if (e.mesh.userData.mixer) e.mesh.userData.mixer.update(dt);
          if (e.shadow) {
            e.shadow.position.x = e.x;
            e.shadow.scale.x = Math.max(0.6, 1 - e.y * 0.012);
          }
          if (e.kind === "bullet") e.mesh.rotation.z = Math.atan2(e.vy, e.vx);
        }
    for (const c of this.crew)
      if (!c.saved) {
        c.mesh.userData.mixer.update(dt);
        c.ring.rotation.z += dt;
        c.beacon.scale.x = 0.06 + Math.sin(this.time * 4) * 0.015;
      }
    if (this.coop && this.players.every((p) => p.hp > 0)) {
      const center = (this.players[0].x + this.players[1].x) / 2,
        half = Math.min(28, this.gfx.camera.right * 0.72);
      for (const p of this.players) {
        const x = clamp(p.x, center - half, center + half);
        if (x !== p.x) {
          p.x = x;
          p.body.setTranslation({ x, y: p.y, z: 0 }, true);
          p.mesh.position.x = x;
        }
      }
    }
    this.enemies = this.enemies.filter((e) => !e.removed);
    this.bullets = this.bullets.filter((e) => !e.removed);
    if (this.training) this.updateTraining();
    else if (this.intermission <= 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.spawnLeft > 0) {
        this.spawnOne();
        this.spawnTimer = 4.2 / this.config.spawnRate;
      }
      if (this.spawnLeft === 0 && this.enemies.length === 0) {
        this.intermission = 4.5;
        this.score += 750 + this.trucks.filter((t) => t.hp > 0).length * 250;
        this.radio("SECTOR CLEAR. CONVOY KEEPS ON ROLLING.");
        this.emit("sectorClear", { sector: this.sector });
        this.audio.play("rescue");
      }
    }
    if (this.trucks.every((t) => t.hp <= 0)) this.finish(false, "CONVOY LOST");
    if (
      this.players.every((p) => p.hp <= 0) &&
      this.reserves <= 0 &&
      this.players.every((p) => p.deadTime <= 0)
    )
      this.finish(false, "SKY GOES QUIET");
    if (this.demo) {
      this.demoClock += dt;
      if (this.demoClock > 105) this.start({ demo: true, seed: 1982 });
      else if (this.demoClock > 63 && this.sector < 2) {
        for (const e of this.enemies) this.remove(e);
        this.enemies = [];
        this.beginSector(2);
      } else if (this.demoClock > 32 && this.sector < 1) {
        for (const e of this.enemies) this.remove(e);
        this.enemies = [];
        this.beginSector(1);
      }
    }
  }
  updateTraining() {
    const p = this.players[0];
    let advance = false;
    if (this.trainingStep === 0 && Math.abs(p.x - this.trainingOrigin) > 7) advance = true;
    if (this.trainingStep === 1 && this.kills > this.trainingBaseKills) advance = true;
    if (this.trainingStep === 2 && this.metrics.rockets > 0 && this.enemies.length === 0)
      advance = true;
    if (this.trainingStep === 3 && this.metrics.flares > 0) advance = true;
    if (this.trainingStep === 4 && this.rescued > 0) {
      this.finish(true, "WINGS EARNED");
      return;
    }
    if (advance) {
      this.trainingStep++;
      this.emit("trainingStep", { step: this.trainingStep });
      if (this.trainingStep === 1) {
        this.trainingBaseKills = this.kills;
        this.spawnEnemy("heli", p.x + 17, 12);
      }
      if (this.trainingStep === 2) {
        this.spawnEnemy("turret", p.x + 15, 1.3);
        p.rockets = 5;
      }
      if (this.trainingStep === 3) {
        this.projectile(p.x + 22, p.y, -1, 0, "hostile", true).target = p;
        p.flares = 3;
      }
      if (this.trainingStep === 4) this.makeCrew(clamp(p.x + 10, -200, 200));
    }
  }
  finish(won, reason = "ROAD CLEAR") {
    if (!this.running || this.completed) return;
    if (this.demo) {
      this.start({ demo: true, seed: 1982 });
      return;
    }
    this.running = false;
    this.completed = true;
    this.won = won;
    this.reason = reason;
    if (won && !this.training)
      this.score += this.reserves * 300 + this.trucks.reduce((s, t) => s + Math.round(t.hp * 5), 0);
    this.emit("finish", { won, reason, score: this.score });
    this.audio.play(won ? "win" : "boom");
  }
  ai(p) {
    if (!p || p.hp <= 0) return {};
    let tx = p.x,
      ty = 13,
      target = this.nearestEnemy(p.x, p.y),
      rescue = this.crew.find((c) => !c.saved);
    const wantRescue =
      rescue &&
      (this.stageTime < 10 ||
        this.enemies.length === 0 ||
        (this.training && this.trainingStep === 4));
    if (wantRescue) {
      tx = rescue.x;
      ty = 5.2;
      target = null;
    } else if (this.demo && this.sector === 0 && this.demoClock > 12 && this.demoClock < 18) {
      tx = this.gfx.pad.position.x;
      ty = 4;
      target = null;
    } else if (target) {
      tx = target.x - Math.sign(target.x - p.x || 1) * 15;
      ty = clamp(target.y + 1, 5, 25);
    } else {
      tx = this.trucks.find((t) => t.hp > 0)?.x || p.x;
      ty = 13;
    }
    if (this.training && this.trainingStep === 0) tx = this.trainingOrigin + 12;
    const dx = tx - p.x,
      dy = ty - p.y;
    return {
      x: clamp(dx * 0.35, -1, 1),
      y: clamp(dy * 0.4, -1, 1),
      aimX: target ? target.x + (target.vx || 0) * 0.2 - p.x : p.face,
      aimY: target ? target.y + (target.vy || 0) * 0.2 - p.y : 0,
      fire: !!target,
      rocket:
        !!target &&
        p.rocket <= 0 &&
        (target.type === "boss" || target.type === "turret" || this.time % 8 < 0.03),
      flare: this.bullets.some(
        (b) => b.team === "hostile" && b.rocket && length(b.x - p.x, b.y - p.y) < 15,
      ),
      precise: false,
    };
  }
  ghost(id, data, color) {
    if (!Number.isFinite(data.x) || !Number.isFinite(data.y)) return;
    let g = this.ghosts.get(id);
    if (!g) {
      g = helicopter(color, true);
      this.gfx.add(g);
      this.ghosts.set(id, g);
    }
    g.position.set(clamp(data.x, -230, 230), clamp(data.y, 0, 32), -2);
    g.scale.x = data.face < 0 ? -1 : 1;
    g.visible = Math.abs(data.x - (this.players[0]?.x || 0)) < 80 && data.sector === this.sector;
    g.userData.mixer.update(0.1);
    g.userData.last = this.time;
  }
  snapshot() {
    return {
      running: this.running,
      completed: this.completed,
      won: this.won,
      demo: this.demo,
      training: this.training,
      sector: this.sector,
      score: this.score,
      time: this.time,
      spawnLeft: this.spawnLeft,
      enemies: this.enemies.length,
      players: this.players.map((p) => ({
        x: p.x,
        y: p.y,
        hp: p.hp,
        rockets: p.rockets,
        flares: p.flares,
        boost: p.boost,
        face: p.face,
        atPad: p.atPad,
        rescue: p.rescue,
      })),
      trucks: this.trucks.map((t) => ({ x: t.x, hp: t.hp })),
      crew: this.crew.map((c) => ({ x: c.x, saved: c.saved, progress: c.progress })),
      metrics: { ...this.metrics },
      boss:
        this.boss && !this.boss.removed
          ? { hp: this.boss.hp, maxHp: this.boss.maxHp, phase2: this.boss.phase2 }
          : null,
      config: { ...this.config },
    };
  }
}
