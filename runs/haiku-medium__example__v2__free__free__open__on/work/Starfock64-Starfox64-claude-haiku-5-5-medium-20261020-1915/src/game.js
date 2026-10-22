// One mission. Owns the scene, the ship, the enemies, and the timeline for a stage.
// Coordinates: the ship sits at z = 0 and flies over a world that scrolls toward +Z.
// Enemies and rings are scrolled along with the world. Player shots travel toward -Z.
import * as THREE from 'three/webgpu';
import { input } from './input.js';
import { settings } from './settings.js';
import { sfx, playMusic, stopMusic } from './audio.js';
import { Fx, Pool } from './fx.js';
import * as A from './assets.js';
import { STAGES, SPEAKERS } from './stages.js';
import { createPilot, pilotCommands } from './ai.js';

const SHIP_R = 1.1;
const BOUNDS = { x: 9.5, yMin: -2.6, yMax: 5.5 };
const GROUND_Y = -3.6;
const MAX_LOCKS = 6;
const LOCK_TIME = 0.22;
const SHOT_SPEED = 150;
const MISSILE_SPEED = 58;

const DEFS = {
  fighter: { hp: 2, r: 1.5, score: 100, build: () => A.buildFighter(0x6d2a8c), color: 0xff8a3b, size: 1 },
  turret: { hp: 3, r: 1.5, score: 150, build: A.buildTurret, color: 0xffb020, size: 1 },
  drone: { hp: 1, r: 1.1, score: 40, build: A.buildDrone, color: 0x3b8bd6, size: 0.6 },
  bomber: { hp: 6, r: 2.6, score: 300, build: A.buildBomber, color: 0xff7a3b, size: 1.6 },
  gunship: { hp: 45, r: 3.2, score: 1500, build: A.buildGunship, color: 0x93a85b, size: 2.2, boss: true },
  carrier: { hp: 0, r: 0, score: 5000, build: A.buildCarrier, color: 0xff3b6b, size: 3, boss: true },
};

const shardGeo = new THREE.TetrahedronGeometry(0.5, 0);
const shotGeo = new THREE.BoxGeometry(0.22, 0.22, 3.2);
const bulletGeo = new THREE.SphereGeometry(0.42, 10, 8);
const missileGeo = new THREE.ConeGeometry(0.25, 1.6, 8);
missileGeo.rotateX(-Math.PI / 2);

// Squared distance from point c to segment a-b. Used for swept shots so fast
// projectiles cannot tunnel through targets between frames.
function segDist2(ax, ay, az, bx, by, bz, cx, cy, cz) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len2 = dx * dx + dy * dy + dz * dz;
  let t = len2 > 0 ? ((cx - ax) * dx + (cy - ay) * dy + (cz - az) * dz) / len2 : 0;
  t = Math.min(1, Math.max(0, t));
  const px = ax + dx * t - cx;
  const py = ay + dy * t - cy;
  const pz = az + dz * t - cz;
  return px * px + py * py + pz * pz;
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export class Game {
  // opts: { camera, hud, physics, stageIndex, lives, cheat, ai, onEnd }
  constructor(opts) {
    this.camera = opts.camera;
    this.hud = opts.hud;
    this.physics = opts.physics;
    this.stage = STAGES[opts.stageIndex];
    this.stageIndex = opts.stageIndex;
    this.cheat = !!opts.cheat;
    this.ai = !!opts.ai;
    this.pilot = createPilot();
    this.onEnd = opts.onEnd;
    this.ended = false;

    this.scene = new THREE.Scene();
    this.t = 0;
    this.phase = 'intro';
    this.phaseT = 0;
    this.nextEvent = 0;
    this.scroll = this.stage.scroll;
    this.scrollNow = this.stage.scroll;
    this.score = 0;
    this.kills = 0;
    this.shots = 0;
    this.hits = 0;
    this.lives = opts.lives ?? 3;
    this.bombs = 3;
    this.ringsGot = 0;
    this.ringsTotal = 0;
    this.deaths = 0;
    this.shake = 0;
    this.flashA = 0;
    this.delayed = [];

    this.enemies = [];
    this.rings = [];
    this.pickups = [];
    this.missiles = [];
    this.locks = [];
    this.lockStep = 0;
    this.lockHeld = false;
    this.fireCD = 0;
    this.rollCD = 0;
    this.rollT = 0;
    this.rollDir = 1;
    this.boostWas = false;
    this.bullets = [];
    this.fx = new Fx(this.scene);

    this.ship = {
      obj: A.buildArwing(),
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      shield: 100,
      invuln: 2.5,
      alive: true,
      respawnT: 0,
      bank: 0,
      pitch: 0,
      rollAngle: 0,
    };
    this.scene.add(this.ship.obj);

    this.shotPool = new Pool(this.scene, 90, () => new THREE.Mesh(shotGeo, A.glowMat(0x9dff6a, 1)));
    this.bulletPool = new Pool(this.scene, 160, () => new THREE.Mesh(bulletGeo, A.glowMat(0xff5a5a, 1)));
    this.shotsLive = [];
    this.bulletsLive = [];
    this.bullets = this.bulletsLive;

    this.buildEnvironment();
  }

  buildEnvironment() {
    const env = this.stage.env;
    if (env === 'plains') {
      this.scene.add(A.buildSky(0x2b6fd6, 0xc6e6ff));
      this.scene.fog = new THREE.Fog(0xc6e6ff, 90, 240);
      const hemi = new THREE.HemisphereLight(0xc6e6ff, 0x5f7a3a, 1.6);
      this.scene.add(hemi);
      this.sun = this.addSun(0xfff1d6, 2.6);
      this.tiles = [];
      for (let i = 0; i < 6; i++) {
        const tile = A.buildTerrainTile(i * 1.7, 90, 60);
        tile.position.set(0, GROUND_Y, i * 60 - 300);
        this.scene.add(tile);
        this.tiles.push(tile);
      }
      this.ground = true;
    } else {
      this.scene.add(A.buildSky(0x03040d, 0x1d2347));
      this.scene.fog = new THREE.Fog(0x12163a, 110, 260);
      this.scene.add(new THREE.HemisphereLight(0x8fa6ff, 0x20243a, 1.1));
      this.sun = this.addSun(0xb9ccff, 2.2);
      const n = 1100;
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        pos.set([(Math.random() - 0.5) * 240, (Math.random() - 0.5) * 140, -220 + Math.random() * 260], i * 3);
      }
      this.starGeo = new THREE.BufferGeometry();
      this.starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.stars = new THREE.Points(this.starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.9, fog: false }));
      this.scene.add(this.stars);
      this.ground = false;
    }
  }

  addSun(color, intensity) {
    const sun = new THREE.DirectionalLight(color, intensity);
    sun.position.set(-18, 40, 20);
    sun.target.position.set(0, -4, -20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const c = sun.shadow.camera;
    c.left = -60;
    c.right = 60;
    c.top = 60;
    c.bottom = -60;
    c.near = 1;
    c.far = 140;
    this.scene.add(sun, sun.target);
    return sun;
  }

  start() {
    playMusic(this.stage.music);
    this.hud.show(true);
    this.hud.banner(this.stage.name, this.stage.brief.split('.')[0] + '.', 'stage');
    this.updateHud();
  }

  // ---- Spawning ----------------------------------------------------------

  radio(speaker, text) {
    this.hud.radio(SPEAKERS[speaker], text);
  }

  banner(text, sub, kind) {
    this.hud.banner(text, sub, kind);
    if (kind === 'warn') sfx.warn();
  }

  spawn(kind, x, y, z, opts = {}) {
    const def = DEFS[kind];
    const obj = def.build();
    this.scene.add(obj);
    const e = {
      kind,
      def,
      obj,
      x,
      y: kind === 'turret' ? GROUND_Y : y,
      z,
      hp: def.hp,
      r: def.r,
      t: 0,
      fireT: 1.2 + Math.random() * 1.5,
      phase: opts.phase ?? Math.random() * 6,
      x0: x,
      y0: y,
      dead: false,
      required: !!opts.required,
      boss: !!def.boss,
      parts: null,
      burst: 0,
    };
    if (kind === 'carrier') {
      const pods = obj.userData.pods;
      e.parts = [
        { name: 'podL', ox: -6.5, oy: 0, oz: 0, r: 2.6, hp: 40, maxHp: 40, dead: false, obj: pods[0], core: false },
        { name: 'podR', ox: 6.5, oy: 0, oz: 0, r: 2.6, hp: 40, maxHp: 40, dead: false, obj: pods[1], core: false },
        { name: 'core', ox: 0, oy: 0, oz: 6.4, r: 2.7, hp: 60, maxHp: 60, dead: false, obj: obj.userData.core, core: true },
      ];
      e.hp = 1;
      e.r = 6;
    }
    this.enemies.push(e);
    return e;
  }

  spawnRing(x, y, z) {
    const obj = A.buildRing();
    obj.position.set(x, y, z);
    this.scene.add(obj);
    this.rings.push({ obj, x, y, z, prevZ: z, got: false });
    this.ringsTotal++;
  }

  spawnAsteroid(x, y, z, radius) {
    const mesh = A.buildAsteroidMesh(Math.random() * 6);
    mesh.scale.setScalar(radius);
    this.physics.add({
      mesh,
      parent: this.scene,
      radius,
      pos: [x, y, z],
      vel: [(Math.random() - 0.5) * 4, (Math.random() - 0.5) * 2.5, this.scroll + 2 + Math.random() * 6],
      spin: [Math.random() * 2, Math.random() * 2, Math.random() * 2],
      restitution: 0.45,
      kind: 'asteroid',
      data: { hp: Math.round(radius * 2) },
    });
  }

  spawnPickup(kind, x, y, z) {
    const obj = A.buildPickup(kind);
    obj.position.set(x, y, z);
    this.scene.add(obj);
    this.pickups.push({ obj, kind, x, y, z, life: 12 });
  }

  // Debris shards: the physics world tumbles them away from the blast.
  shatter(pos, color, count, size = 1, impulse = 4) {
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(shardGeo, A.toonMat(color));
      const s = size * (0.5 + Math.random() * 0.8);
      mesh.scale.setScalar(s);
      const dir = [Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5];
      this.physics.add({
        mesh,
        parent: this.scene,
        radius: 0.35 * s,
        pos: pos.slice(),
        vel: dir.map((d) => d * impulse * 2 + this.scroll * 0.2),
        spin: [Math.random() * 8, Math.random() * 8, Math.random() * 8],
        restitution: 0.5,
        life: 2.5,
        kind: 'debris',
      });
    }
  }

  // ---- Enemy fire --------------------------------------------------------

  fireBullet(from, spread = 0, speed = 34) {
    const m = this.bulletPool.get();
    if (!m) return;
    let dx = this.ship.x - from.x;
    let dy = this.ship.y - from.y;
    let dz = 0 - from.z;
    const len = Math.hypot(dx, dy, dz) || 1;
    dx = dx / len + spread;
    dy = dy / len;
    dz = dz / len;
    const b = {
      mesh: m,
      x: from.x,
      y: from.y,
      z: from.z,
      px: from.x,
      py: from.y,
      pz: from.z,
      vx: dx * speed,
      vy: dy * speed,
      vz: dz * speed,
      life: 6,
      active: true,
    };
    m.position.set(b.x, b.y, b.z);
    this.bulletsLive.push(b);
  }

  clearBullets(withFx) {
    for (const b of this.bulletsLive) {
      if (!b.active) continue;
      b.active = false;
      this.bulletPool.release(b.mesh);
      if (withFx) this.fx.burst([b.x, b.y, b.z], 0xff6b6b, 3, 6, 0.4, 0.3);
    }
    this.bulletsLive = this.bulletsLive.filter((b) => b.active);
    this.bullets = this.bulletsLive;
  }

  // ---- Damage ------------------------------------------------------------

  hurtShip(dmg) {
    const s = this.ship;
    if (!s.alive || this.cheat || this.ai) return;
    if (s.invuln > 0) return;
    if (this.rollT > 0) {
      this.fx.burst([s.x, s.y, 0], 0xbfffff, 8, 8, 0.4, 0.3);
      return;
    }
    s.shield = Math.max(0, s.shield - dmg);
    this.shake = Math.min(1.4, this.shake + dmg / 30);
    this.flashA = Math.min(0.6, this.flashA + dmg / 80);
    sfx.hurt();
    if (s.shield <= 0) this.destroyShip();
  }

  destroyShip() {
    const s = this.ship;
    s.alive = false;
    s.obj.visible = false;
    this.deaths++;
    this.lives--;
    this.fx.burst([s.x, s.y, 0], 0xffaa55, 46, 16, 1.1, 0.55);
    this.fx.flash([s.x, s.y, 0], 0xffd080, 4, 0.5);
    sfx.explode(2);
    this.shake = 1.2;
    this.locks = [];
    if (this.lives > 0) {
      s.respawnT = 2.2;
      this.banner('ARWING LOST', `${this.lives} ${this.lives === 1 ? 'reserve' : 'reserves'} remaining`, 'warn');
    } else {
      this.phase = 'over';
      this.phaseT = 0;
      this.banner('MISSION FAILED', 'No reserve ships left', 'warn');
    }
  }

  respawn() {
    const s = this.ship;
    s.alive = true;
    s.obj.visible = true;
    s.shield = 100;
    s.invuln = 3;
    s.x = 0;
    s.y = 0;
    s.vx = 0;
    s.vy = 0;
    this.clearBullets(true);
  }

  // Where shots and missiles should go: the first live side pod, or the core once both pods are down.
  aimPoint(e) {
    if (!e.parts) return { x: e.x, y: e.y, z: e.z };
    const p = e.parts.find((q) => !q.core && !q.dead) || e.parts.find((q) => q.core && !q.dead);
    return p ? { x: e.x + p.ox, y: e.y + p.oy, z: e.z + p.oz } : { x: e.x, y: e.y, z: e.z };
  }

  // Parts to test against for an enemy, with their world-space centres.
  hitParts(e) {
    if (!e.parts) return [{ x: e.x, y: e.y, z: e.z, r: e.r, part: null }];
    return e.parts
      .filter((p) => !p.dead)
      .map((p) => ({
        x: e.x + p.ox,
        y: e.y + p.oy,
        z: e.z + p.oz,
        r: p.r,
        part: p,
        shielded: p.core && e.parts.some((q) => !q.core && !q.dead),
      }));
  }

  damageEnemy(e, hit, dmg, pos) {
    if (hit.shielded) {
      sfx.hit();
      this.fx.burst(pos, 0xbfe9ff, 4, 6, 0.25, 0.2);
      return;
    }
    this.hits++;
    if (hit.part) {
      const p = hit.part;
      p.hp -= dmg;
      this.fx.burst(pos, 0xffd27a, 6, 8, 0.3, 0.25);
      if (p.hp <= 0) {
        p.dead = true;
        p.obj.visible = false;
        this.fx.flash(pos, 0xffb070, 5, 0.6);
        this.fx.ring(pos, 0xffd27a, 14, 0.6);
        this.shatter(pos, 0xc0c4d6, 6, 1.3, 6);
        sfx.explode(2.4);
        this.shake = Math.max(this.shake, 0.8);
        this.score += 800;
        if (p.core) this.killEnemy(e, pos);
      }
      return;
    }
    e.hp -= dmg;
    this.fx.burst(pos, 0xffd27a, 6, 8, 0.3, 0.25);
    sfx.hit();
    if (e.hp <= 0) this.killEnemy(e, pos);
  }

  killEnemy(e, pos) {
    if (e.dead) return;
    e.dead = true;
    this.kills++;
    this.score += e.def.score;
    this.scene.remove(e.obj);
    const size = e.def.size;
    this.fx.flash(pos, 0xffc070, 2.5 * size, 0.5);
    this.fx.burst(pos, e.def.color, Math.round(18 + size * 10), 14, 0.9, 0.5 * size);
    this.fx.ring(pos, 0xfff0c0, 6 * size, 0.5);
    sfx.explode(size);
    this.shake = Math.max(this.shake, 0.5 * size);
    if (e.boss) {
      this.banner('BOSS DOWN', e.kind === 'carrier' ? 'Warden destroyed' : 'Gunship destroyed', 'good');
      sfx.fanfare();
      for (let i = 0; i < 6; i++) {
        this.delayed.push({
          t: 0.2 + i * 0.25,
          fn: () => this.fx.flash([pos[0] + (Math.random() - 0.5) * 10, pos[1] + (Math.random() - 0.5) * 6, pos[2] + (Math.random() - 0.5) * 10], 0xffb070, 4, 0.5),
        });
      }
      this.shatter(pos, e.def.color, 12, 1.8, 10);
    } else {
      this.shatter(pos, e.def.color, 3, size, 4);
      if (!e.boss && Math.random() < 0.22) {
        this.spawnPickup(Math.random() < 0.33 ? 'bomb' : 'shield', pos[0], pos[1], pos[2]);
      }
    }
  }

  // Lasers and missiles use swept segments (prev -> current), so they cannot tunnel.
  testSegment(p0, p1, dmg) {
    for (const e of this.enemies) {
      if (e.dead || e.z > 6) continue;
      for (const h of this.hitParts(e)) {
        const r2 = h.r * h.r;
        if (segDist2(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], h.x, h.y, h.z) < r2) {
          this.damageEnemy(e, h, dmg, [h.x, h.y, h.z]);
          return true;
        }
      }
    }
    for (const a of this.physics.entries) {
      if (a.dead || a.kind !== 'asteroid') continue;
      const c = a.mesh.position;
      if (segDist2(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], c.x, c.y, c.z) < (a.radius + 0.1) ** 2) {
        a.data.hp -= dmg;
        this.hits++;
        this.fx.burst([c.x, c.y, c.z], 0xd9c7b0, 5, 8, 0.35, 0.3);
        sfx.hit();
        if (a.data.hp <= 0) this.breakAsteroid(a);
        return true;
      }
    }
    return false;
  }

  breakAsteroid(a) {
    const c = a.mesh.position;
    this.physics.remove(a);
    this.fx.flash([c.x, c.y, c.z], 0xffd9a8, a.radius * 2.2, 0.45);
    this.fx.burst([c.x, c.y, c.z], 0xb9a58e, 22, 12, 0.8, 0.45 * a.radius);
    sfx.explode(a.radius);
    this.shatter([c.x, c.y, c.z], 0x9a8c7c, 5, a.radius * 0.6, 6);
    this.shake = Math.max(this.shake, 0.4);
    this.score += 60;
    this.kills++;
  }

  bomb() {
    if (this.bombs <= 0 || this.phase !== 'play') return;
    this.bombs--;
    sfx.bomb();
    this.fx.ring([this.ship.x, this.ship.y, 0], 0xffffff, 80, 0.9);
    this.flashA = 0.8;
    this.shake = 1.0;
    this.clearBullets(true);
    for (const e of [...this.enemies]) {
      if (e.dead) continue;
      if (e.boss) {
        // Bosses take bomb damage too, but a shielded core still ignores it.
        if (e.parts) {
          for (const h of this.hitParts(e)) this.damageEnemy(e, h, 12, [h.x, h.y, h.z]);
        } else {
          this.damageEnemy(e, { part: null, shielded: false }, 12, [e.x, e.y, e.z]);
        }
      } else {
        this.killEnemy(e, [e.x, e.y, e.z]);
      }
    }
  }

  // ---- Update ------------------------------------------------------------

  readCommands() {
    if (this.ai) return pilotCommands(this, this.dt, this.pilot);
    return {
      x: input.stick.x,
      y: input.stick.y,
      fire: input.held('fire'),
      missile: input.held('missile'),
      boost: input.held('boost'),
      brake: input.held('brake'),
      rollTap: input.tapped('roll'),
      bombTap: input.tapped('bomb'),
    };
  }

  update(dt) {
    if (this.ended) return;
    this.dt = dt;
    this.phaseT += dt;
    const cmd = this.readCommands();

    // Phase transitions.
    if (this.phase === 'intro' && this.phaseT > 1.6) this.phase = 'play';
    if (this.phase === 'clear') {
      if (this.phaseT > 3.2) this.finish('clear');
      this.world(dt, cmd, false);
      return;
    }
    if (this.phase === 'over') {
      if (this.phaseT > 2.8) this.finish('fail');
      this.world(dt, { x: 0, y: 0 }, false);
      return;
    }

    this.world(dt, cmd, this.phase === 'play');

    if (this.phase === 'play') {
      this.t += dt;
      this.runEvents();
      if (this.t >= this.stage.length && !this.enemies.some((e) => !e.dead && e.required)) {
        this.phase = 'clear';
        this.phaseT = 0;
        this.banner('STAGE CLEAR', `${this.ringsGot} / ${this.ringsTotal} rings`, 'good');
        sfx.fanfare();
        stopMusic();
      }
    }
  }

  runEvents() {
    const events = this.stage.events;
    while (this.nextEvent < events.length && events[this.nextEvent].t <= this.t) {
      events[this.nextEvent++].run(this);
    }
  }

  world(dt, cmd, live) {
    const s = this.ship;

    // Scroll speed (boost / brake), then ship control.
    const boost = live && cmd.boost && s.alive;
    const brake = live && cmd.brake && s.alive;
    if (boost && !this.boostWas) sfx.boost();
    this.boostWas = boost;
    const targetS = this.stage.scroll + (boost ? 18 : 0) - (brake ? 12 : 0);
    this.scrollNow += (targetS - this.scrollNow) * (1 - Math.exp(-dt * 2));
    this.scroll = this.scrollNow;

    if (s.alive) {
      const sens = settings.sensitivity;
      s.vx += (cmd.x * 15 * sens - s.vx) * (1 - Math.exp(-dt * 10));
      s.vy += (cmd.y * 11 * sens - s.vy) * (1 - Math.exp(-dt * 10));
      s.x = clamp(s.x + s.vx * dt, -BOUNDS.x, BOUNDS.x);
      s.y = clamp(s.y + s.vy * dt, BOUNDS.yMin, BOUNDS.yMax);
      if (live && cmd.rollTap && this.rollCD <= 0 && this.rollT <= 0) {
        this.rollT = 0.6;
        this.rollCD = 0.9;
        this.rollDir = cmd.x < -0.3 ? -1 : 1;
        sfx.roll();
      }
      if (this.rollT > 0) this.rollT = Math.max(0, this.rollT - dt);
      if (this.rollCD > 0) this.rollCD -= dt;
      const rollTarget = this.rollT > 0 ? (1 - this.rollT / 0.6) * Math.PI * 2 * this.rollDir : 0;
      s.rollAngle = rollTarget;
      s.bank += (-cmd.x * 0.45 - s.bank) * (1 - Math.exp(-dt * 8));
      s.pitch += (cmd.y * 0.22 - s.pitch) * (1 - Math.exp(-dt * 8));
      s.obj.position.set(s.x, s.y, 0);
      s.obj.rotation.set(s.pitch, 0, s.bank + s.rollAngle);
      if (s.invuln > 0) {
        s.invuln -= dt;
        s.obj.visible = Math.floor(s.invuln * 12) % 2 === 0;
      } else {
        s.obj.visible = true;
      }
      const eng = 0.9 + Math.sin(this.t * 40) * 0.2;
      for (const e of s.obj.userData.engines) e.scale.setScalar(boost ? 1.6 : eng);
    } else if (s.respawnT > 0) {
      s.respawnT -= dt;
      if (s.respawnT <= 0 && this.phase === 'play') this.respawn();
    }

    if (live && s.alive) {
      this.handleWeapons(cmd, dt);
    } else {
      this.lockHeld = false;
    }

    // Scroll everything along the world.
    this.scrollWorld(dt);
    this.updateEnemies(dt, live);
    this.updateShots(dt);
    this.updateMissiles(dt);
    this.updateBullets(dt);
    this.updateRingsPickups(dt);
    this.updatePhysics(dt);
    this.updateDelayed(dt);
    this.fx.update(dt);
    this.updateCamera(dt);
    this.updateHud(dt);
  }

  handleWeapons(cmd, dt) {
    const s = this.ship;
    this.fireCD -= dt;
    if (cmd.fire && this.fireCD <= 0) {
      this.fireCD = 0.13;
      for (const dx of [-0.9, 0.9]) {
        const m = this.shotPool.get();
        if (!m) break;
        const sh = { mesh: m, x: s.x + dx, y: s.y - 0.1, z: -2, pz: -2 };
        m.position.set(sh.x, sh.y, sh.z);
        this.shotsLive.push(sh);
        this.shots++;
      }
      sfx.laser();
    }

    // Lock-on: hold missile to tag targets in the reticle, release to fire.
    if (cmd.missile) {
      this.lockHeld = true;
      this.lockStep -= dt;
      if (this.lockStep <= 0 && this.locks.length < MAX_LOCKS) {
        let best = null;
        let bestD = Infinity;
        for (const e of this.enemies) {
          if (e.dead || this.locks.includes(e)) continue;
          if (e.z > -3 || e.z < -40) continue;
          const dx = e.x - s.x;
          const dy = e.y - s.y;
          if (Math.abs(dx) > 12 || Math.abs(dy) > 7) continue;
          const d = Math.hypot(dx, dy);
          if (d < bestD) {
            bestD = d;
            best = e;
          }
        }
        if (best) {
          this.locks.push(best);
          this.lockStep = LOCK_TIME;
          sfx.lockOn();
        }
      }
    } else if (this.lockHeld) {
      this.lockHeld = false;
      const targets = this.locks.filter((e) => !e.dead);
      if (targets.length) {
        sfx.missile();
        for (const e of targets) this.launchMissile(e);
      } else {
        sfx.blip();
      }
      this.locks = [];
    }

    if (cmd.bombTap) this.bomb();
  }

  launchMissile(target) {
    const s = this.ship;
    const mesh = new THREE.Mesh(missileGeo, A.toonMat(0xffe066, { emissive: 0x553300 }));
    mesh.position.set(s.x, s.y, 0);
    this.scene.add(mesh);
    this.missiles.push({
      mesh,
      target,
      x: s.x,
      y: s.y,
      z: 0,
      v: new THREE.Vector3(0, 0, -MISSILE_SPEED * 0.5),
      life: 3,
      trail: 0,
    });
  }

  scrollWorld(dt) {
    const d = this.scroll * dt;
    if (this.ground) {
      for (const t of this.tiles) {
        t.position.z += d;
        if (t.position.z > 60) t.position.z -= 360;
      }
    } else {
      const pos = this.starGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let z = pos.getZ(i) + d * 1.4;
        if (z > 20) z -= 260;
        pos.setZ(i, z);
      }
      pos.needsUpdate = true;
    }
    for (const e of this.enemies) if (!e.dead) e.z += d;
    for (const r of this.rings) r.z += d;
    for (const p of this.pickups) p.z += d;
  }

  updateEnemies(dt, live) {
    const s = this.ship;
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.t += dt;
      const k = e.kind;
      if (k === 'fighter') {
        e.x = e.x0 + Math.sin(e.t * 1.6 + e.phase) * 3.6;
        e.y = e.y0 + Math.sin(e.t * 2.3 + e.phase) * 0.6;
        e.z += 4 * dt;
        e.obj.rotation.z = Math.cos(e.t * 1.6 + e.phase) * 0.4;
      } else if (k === 'drone') {
        e.x = e.x0 + Math.cos(e.t * 2 + e.phase) * 2.4;
        e.y = e.y0 + Math.sin(e.t * 2.6 + e.phase) * 1.4;
        e.z += 5 * dt;
      } else if (k === 'bomber') {
        e.x = e.x0 + Math.sin(e.t * 0.5 + e.phase) * 2.2;
      } else if (k === 'gunship') {
        e.x = Math.sin(e.t * 0.6) * 7;
        e.y = 2.6 + Math.sin(e.t * 1.1) * 1.1;
        if (e.z < -42) e.z += 4 * dt;
        else e.z += (-42 - e.z) * dt * 0.5;
        e.obj.rotation.z = Math.sin(e.t * 0.6) * 0.25;
      } else if (k === 'carrier') {
        if (e.z < -62) e.z += 5 * dt;
        else e.z += (-62 - e.z) * dt * 0.6;
        e.x = Math.sin(e.t * 0.3) * 4.5;
        e.y = 1 + Math.sin(e.t * 0.5) * 0.8;
        e.obj.rotation.z = Math.sin(e.t * 0.3) * 0.1;
      } else if (k === 'turret') {
        e.y = GROUND_Y;
      }
      e.obj.position.set(e.x, e.y, e.z);
      if (k === 'turret') e.obj.lookAt(s.x, s.y, 0);

      // Firing.
      if (live && s.alive) {
        e.fireT -= dt;
        if (k === 'fighter' && e.fireT <= 0) {
          this.fireBullet({ x: e.x, y: e.y, z: e.z + 2 }, 0, 34);
          e.fireT = 2.4 + Math.random();
        } else if (k === 'turret' && e.fireT <= 0) {
          e.burst = 3;
          e.burstT = 0;
          e.fireT = 2.8;
        } else if (k === 'bomber' && e.fireT <= 0) {
          this.fireBullet({ x: e.x, y: e.y, z: e.z + 2 }, -0.12, 30);
          this.fireBullet({ x: e.x, y: e.y, z: e.z + 2 }, 0, 30);
          this.fireBullet({ x: e.x, y: e.y, z: e.z + 2 }, 0.12, 30);
          e.fireT = 3.0;
        } else if (k === 'gunship' && e.fireT <= 0) {
          for (const sp of [-0.22, -0.11, 0, 0.11, 0.22]) this.fireBullet({ x: e.x, y: e.y, z: e.z + 3 }, sp, 36);
          e.fireT = 1.6;
        } else if (k === 'carrier' && e.fireT <= 0) {
          const podsAlive = e.parts.filter((p) => !p.core && !p.dead);
          for (const p of podsAlive) {
            this.fireBullet({ x: e.x + p.ox, y: e.y, z: e.z + 2 }, -0.1, 34);
            this.fireBullet({ x: e.x + p.ox, y: e.y, z: e.z + 2 }, 0.1, 34);
          }
          if (!podsAlive.length) {
            for (let a = 0; a < 8; a++) {
              const ang = (a / 8) * Math.PI * 2 + e.t;
              this.fireBullet({ x: e.x, y: e.y, z: e.z + 6 }, Math.cos(ang) * 0.35, 30);
            }
          }
          e.fireT = podsAlive.length ? 2.0 : 3.2;
          if (Math.floor(e.t / 7) !== Math.floor((e.t - dt) / 7)) {
            this.spawn('drone', e.x - 3, e.y + 2, e.z + 6, {});
            this.spawn('drone', e.x + 3, e.y + 2, e.z + 6, {});
          }
        }
        if (e.burst > 0) {
          e.burstT -= dt;
          if (e.burstT <= 0) {
            this.fireBullet({ x: e.x, y: e.y + 0.9, z: e.z + 2.6 }, 0, 38);
            e.burst--;
            e.burstT = 0.22;
          }
        }
      }

      // Ram: small craft collide with the ship.
      if (live && s.alive && !e.boss && e.z > -2 && e.z < 3) {
        const dx = e.x - s.x;
        const dy = e.y - s.y;
        const dz = e.z - 0;
        if (dx * dx + dy * dy + dz * dz < (e.r + SHIP_R) ** 2) {
          this.killEnemy(e, [e.x, e.y, e.z]);
          this.hurtShip(k === 'drone' ? 12 : 25);
        }
      }

      if (!e.boss && e.z > 12) {
        this.scene.remove(e.obj);
        e.dead = true;
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
  }

  updateShots(dt) {
    const keep = [];
    for (const sh of this.shotsLive) {
      sh.pz = sh.z;
      sh.z -= SHOT_SPEED * dt;
      sh.mesh.position.set(sh.x, sh.y, sh.z);
      if (sh.z < -170) {
        this.shotPool.release(sh.mesh);
        continue;
      }
      if (this.testSegment([sh.x, sh.y, sh.pz], [sh.x, sh.y, sh.z], 1)) {
        this.shotPool.release(sh.mesh);
        continue;
      }
      keep.push(sh);
    }
    this.shotsLive = keep;
  }

  updateMissiles(dt) {
    const keep = [];
    for (const m of this.missiles) {
      m.life -= dt;
      const tgt = m.target && !m.target.dead ? this.aimPoint(m.target) : null;
      if (tgt) {
        const dx = tgt.x - m.x;
        const dy = tgt.y - m.y;
        const dz = tgt.z - m.z;
        const d = Math.hypot(dx, dy, dz) || 1;
        const want = new THREE.Vector3(dx / d, dy / d, dz / d).multiplyScalar(MISSILE_SPEED);
        m.v.lerp(want, 1 - Math.exp(-dt * 6));
      }
      const px = m.x;
      const py = m.y;
      const pz = m.z;
      m.x += m.v.x * dt;
      m.y += m.v.y * dt;
      m.z += m.v.z * dt;
      m.mesh.position.set(m.x, m.y, m.z);
      m.mesh.lookAt(m.x + m.v.x, m.y + m.v.y, m.z + m.v.z);
      m.trail -= dt;
      if (m.trail <= 0) {
        m.trail = 0.03;
        this.fx.burst([m.x, m.y, m.z], 0xffd27a, 1, 0.5, 0.25, 0.22);
      }
      if (this.testSegment([px, py, pz], [m.x, m.y, m.z], 4)) {
        this.fx.flash([m.x, m.y, m.z], 0xffd27a, 3, 0.4);
        this.scene.remove(m.mesh);
        continue;
      }
      if (m.life <= 0 || m.z > 10) {
        this.scene.remove(m.mesh);
        continue;
      }
      keep.push(m);
    }
    this.missiles = keep;
  }

  updateBullets(dt) {
    const s = this.ship;
    for (const b of this.bulletsLive) {
      if (!b.active) continue;
      b.px = b.x;
      b.py = b.y;
      b.pz = b.z;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;
      b.life -= dt;
      b.mesh.position.set(b.x, b.y, b.z);
      if (s.alive && Math.min(b.pz, b.z) < 1.5 && Math.max(b.pz, b.z) > -1.5) {
        // Swept test against the ship's z plane.
        const d2 = segDist2(b.px, b.py, b.pz, b.x, b.y, b.z, s.x, s.y, 0);
        if (d2 < (SHIP_R + 0.4) ** 2) {
          this.hurtShip(7);
          this.fx.burst([b.x, b.y, b.z], 0xff6b6b, 8, 8, 0.4, 0.3);
          b.active = false;
          this.bulletPool.release(b.mesh);
          continue;
        }
      }
      if (b.life <= 0 || b.z > 14 || b.y < -8 || b.y > 14 || Math.abs(b.x) > 40) {
        b.active = false;
        this.bulletPool.release(b.mesh);
      }
    }
    this.bulletsLive = this.bulletsLive.filter((b) => b.active);
    this.bullets = this.bulletsLive;
  }

  updateRingsPickups(dt) {
    const s = this.ship;
    for (const r of this.rings) {
      if (r.got) continue;
      r.obj.position.set(r.x, r.y, r.z);
      r.obj.rotation.z += dt * 0.6;
      if (r.prevZ < 0 && r.z >= 0 && s.alive) {
        const dx = r.x - s.x;
        const dy = r.y - s.y;
        if (Math.hypot(dx, dy) < 3.4) {
          r.got = true;
          this.ringsGot++;
          this.score += 200;
          sfx.ring();
          this.fx.ring([r.x, r.y, r.z], 0xffd54a, 5, 0.5);
          this.fx.burst([r.x, r.y, r.z], 0xffe27a, 14, 10, 0.5, 0.3);
          this.hud.flash('#ffd54a', 0.25);
          this.shield(4);
          this.scene.remove(r.obj);
          continue;
        }
      }
      r.prevZ = r.z;
    }
    this.rings = this.rings.filter((r) => {
      if (r.got) return false;
      if (r.z > 14) {
        this.scene.remove(r.obj);
        return false;
      }
      return true;
    });

    for (const p of this.pickups) {
      p.life -= dt;
      p.obj.position.set(p.x, p.y + Math.sin(this.t * 4 + p.x) * 0.3, p.z);
      p.obj.rotation.y += dt * 2;
      const dx = p.x - s.x;
      const dy = p.y - s.y;
      if (s.alive && Math.hypot(dx, dy, p.z) < 3.2) {
        p.life = -1;
        sfx.pickup();
        if (p.kind === 'bomb') {
          this.bombs = Math.min(5, this.bombs + 1);
          this.banner('BOMB +1', '', 'good');
        } else {
          this.shield(25);
        }
      }
      if (p.z > 12) p.life = -1;
    }
    this.pickups = this.pickups.filter((p) => {
      if (p.life <= 0) {
        this.scene.remove(p.obj);
        return false;
      }
      return true;
    });
  }

  shield(amount) {
    this.ship.shield = Math.min(100, this.ship.shield + amount);
  }

  updatePhysics(dt) {
    const s = this.ship;
    // Asteroids are physics bodies, so ram checks use their rigid-body positions.
    for (const a of this.physics.entries) {
      if (a.dead || a.kind !== 'asteroid') continue;
      const c = a.mesh.position;
      const dx = c.x - s.x;
      const dy = c.y - s.y;
      if (s.alive && Math.hypot(dx, dy, c.z) < a.radius + SHIP_R && c.z > -1.5 && c.z < 2) {
        this.hurtShip(20);
        this.breakAsteroid(a);
        s.vx += (dx > 0 ? -1 : 1) * 6;
      }
    }
    this.physics.step(dt);
  }

  updateDelayed(dt) {
    for (const d of this.delayed) d.t -= dt;
    const due = this.delayed.filter((d) => d.t <= 0);
    this.delayed = this.delayed.filter((d) => d.t > 0);
    for (const d of due) d.fn();
  }

  updateCamera(dt) {
    const s = this.ship;
    const cam = this.camera;
    const tx = s.x * 0.35;
    const ty = 2.4 + s.y * 0.3;
    const tz = 13;
    const k = 1 - Math.exp(-dt * 6);
    cam.position.x += (tx - cam.position.x) * k;
    cam.position.y += (ty - cam.position.y) * k;
    cam.position.z += (tz - cam.position.z) * k;
    this.shake = Math.max(0, this.shake - dt * 2);
    const sh = settings.shake ? this.shake * this.shake : 0;
    cam.position.x += (Math.random() - 0.5) * sh * 1.2;
    cam.position.y += (Math.random() - 0.5) * sh * 1.2;
    cam.lookAt(s.x * 0.45, s.y * 0.35 + 0.4, -30);
    this.flashA = Math.max(0, this.flashA - dt * 2.5);
    this.hud.setFlash(this.flashA);
    if (this.sun) {
      this.sun.position.set(s.x * 0.3 - 18, 40, 20);
    }
  }

  updateHud() {
    this.hud.update({
      shield: this.ship.shield,
      lives: this.lives,
      bombs: this.bombs,
      score: this.score,
      rings: this.ringsGot,
      ringsTotal: this.ringsTotal,
      locks: this.locks.length,
      stageName: this.stage.name,
      boss: this.bossStatus(),
      time: this.t,
    });
    this.updateTargets();
  }

  bossStatus() {
    const b = this.enemies.find((e) => e.boss && !e.dead);
    if (!b) return null;
    if (!b.parts) return { name: 'Gunship', pct: b.hp / DEFS[b.kind].hp };
    const core = b.parts.find((p) => p.core);
    const pods = b.parts.filter((p) => !p.core);
    const podLeft = pods.filter((p) => !p.dead).length;
    return {
      name: 'Warden',
      pct: core.hp / core.maxHp || 0,
      pods: podLeft,
      podsTotal: pods.length,
    };
  }

  updateTargets() {
    const t = [];
    // Reticle marks where the lasers land, a little way ahead of the ship.
    const aim = new THREE.Vector3(this.ship.x, this.ship.y, -30).project(this.camera);
    this.hud.setReticle(this.ship.alive ? aim : null);
    for (const l of this.locks) {
      if (l.dead) continue;
      const v = new THREE.Vector3(l.x, l.y, l.z).project(this.camera);
      t.push({ x: v.x, y: v.y, locked: true });
    }
    this.hud.setTargets(t);
  }

  // Ends the stage once, handing results back to the caller.
  finish(outcome) {
    if (this.ended) return;
    this.ended = true;
    stopMusic();
    this.onEnd({
      outcome,
      stageIndex: this.stageIndex,
      score: this.score,
      kills: this.kills,
      rings: this.ringsGot,
      ringsTotal: this.ringsTotal,
      shots: this.shots,
      hits: this.hits,
      deaths: this.deaths,
      time: this.t,
      cheat: this.cheat || this.ai,
    });
  }

  dispose() {
    this.ended = true;
    stopMusic();
    this.physics.clear();
    this.fx.clear();
    this.scene.traverse((o) => {
      if (o.isLight && o.shadow) o.shadow.map?.dispose?.();
    });
    this.hud.setTargets([]);
  }
}
