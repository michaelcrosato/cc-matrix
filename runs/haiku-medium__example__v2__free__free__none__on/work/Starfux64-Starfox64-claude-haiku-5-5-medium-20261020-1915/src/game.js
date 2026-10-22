// The 3D simulation for one stage: track progress, spawning, collisions, scoring, boss flow and camera.
import { Vector3, Mesh, PlaneGeometry } from 'three/webgpu';
import { positionWorld, step, fract, mix, vec3, float } from 'three/tsl';
import { Physics } from './physics.js';
import { Effects } from './fx.js';
import { Player } from './player.js';
import { Wingman } from './wingmen.js';
import { Venom, Turret, Rock, Ring, Carrier, Shots } from './enemies.js';
import { STAGES, buildScript } from './stages.js';
import { makeToon } from './render.js';
import { pillar } from './models.js';
import { settings } from './settings.js';

const CRUISE = 62;
const SPAWN_AHEAD = 300;
const BOSS_HOLD = 110;

// Attract-mode and demo pilot. Same interface as Input, so the game code does not care who is flying.
export class AutoPilot {
  constructor(game) {
    this.game = game;
    this.t = 0;
    this.edges = new Set();
    this.lastFire = 0;
    this.rollAt = 6;
    this.bombAt = 14;
    this.phase = 0;
  }

  update(dt) {
    this.t += dt;
    this.edges.clear();
    const fireEdge = Math.floor(this.t / 0.32) !== Math.floor((this.t - dt) / 0.32);
    if (fireEdge) this.edges.add('fire');
    if (this.t > this.rollAt) {
      this.rollAt = this.t + 4 + Math.random() * 4;
      this.edges.add(Math.random() < 0.5 ? 'rollLeft' : 'rollRight');
    }
    if (this.t > this.bombAt && this.game.countInView() >= 3) {
      this.bombAt = this.t + 16;
      this.edges.add('bomb');
    }
  }

  flight() {
    const p = this.game.player.pos;
    let best = null;
    let bestD = Infinity;
    for (const t of this.game.lockables()) {
      const d = t.pos.z < p.z ? p.z - t.pos.z : Infinity;
      if (d < bestD && d > 20) {
        bestD = d;
        best = t;
      }
    }
    const tx = best ? best.pos.x : Math.sin(this.t * 0.7) * 8;
    const ty = best ? best.pos.y : Math.cos(this.t * 0.5) * 3;
    const x = Math.max(-1, Math.min(1, (tx - p.x) * 0.22));
    const y = Math.max(-1, Math.min(1, (ty - p.y) * 0.22));
    return { x, y };
  }

  held(action) {
    if (action === 'fire') return this.t % 0.32 < 0.1;
    if (action === 'boost') return Math.sin(this.t * 0.4) > 0.3;
    return false;
  }

  pressed(action) {
    return this.edges.has(action);
  }

  anyInput() {
    return false;
  }

  rumble() {}
}

export class Game {
  constructor({ renderer, audio, input, hud, onEvent }) {
    this.renderer = renderer;
    this.scene = renderer.scene;
    this.camera = renderer.camera;
    this.audio = audio;
    this.input = input;
    this.hud = hud;
    this.emit = onEvent;
    this.fx = new Effects(this.scene);
    this.running = false;
    this.paused = false;
    this.invincible = false;
    this.scrollMul = 1;
    this.time = 0;
    this.shakeT = 0;
    this.shakeAmp = 0;
    this.fovKick = 62;
    this.speedFx = CRUISE;
    this.groundPlane = null;
    this.stage = null;
    this.boss = null;
    this.pillarNext = 0;
    this.pillars = [];
  }

  // Builds a fresh physics world and scene content for one stage.
  startStage(index, { attract = false } = {}) {
    this.teardown();
    this.stageIndex = index;
    this.stage = STAGES[index];
    this.attract = attract;
    this.invincible = attract;
    this.phys = new Physics();
    this.player = new Player(this);
    this.player.reset(0);
    this.controller = attract ? new AutoPilot(this) : this.input;
    this.events = buildScript(this.stage);
    this.eventIdx = 0;
    this.targets = [];
    this.wingmen = [
      new Wingman(this, { name: 'Rook', callsign: 'RK', color: 0xff6a4a, offset: [-4.5, -1.2, 2] }),
      new Wingman(this, { name: 'Mira', callsign: 'MI', color: 0x7dffb0, offset: [4.5, -1.2, 2] }),
    ];
    this.shots = new Shots(this);
    this.comms = this.stage.comms.slice();
    this.score = 0;
    this.kills = 0;
    this.ringsTaken = 0;
    this.lostShips = 0;
    this.boss = null;
    this.finishing = false;
    this.running = true;
    this.time = 0;
    this.distance = 0;
    this.pillarNext = 60;
    this.setupEnvironment();
    this.renderer.setSky(this.stage.sky.top, this.stage.sky.horizon);
    if (this.stage.fog) this.renderer.setFog(this.stage.fog.color, this.stage.fog.near, this.stage.fog.far);
    else this.renderer.setFog(null);
    this.audio.playTrack(this.stage.bgm);
    this.announce(this.stage.name.toUpperCase(), this.stage.blurb, 3.2);
    this.hud.setStage(`Stage ${this.stage.id} · ${this.stage.name}`);
    if (!attract) this.hud.setHint('Hold FIRE to lock on, release to launch missiles');
    else this.hud.setHint('');
  }

  setupEnvironment() {
    this.envNodes = [];
    const g = this.stage.ground;
    if (g) {
      // Stripes run along the track in world space, so they scroll past as the ship flies.
      const stripe = step(float(0.5), fract(positionWorld.z.mul(g.scale)));
      const base = mix(vec3(...rgb(g.colA)), vec3(...rgb(g.colB)), stripe);
      this.groundPlane = new Mesh(new PlaneGeometry(1400, 4000), makeToon(0x000000, { baseNode: base }));
      this.groundPlane.rotation.x = -Math.PI / 2;
      this.groundPlane.position.y = g.y;
      this.scene.add(this.groundPlane);
    } else {
      this.groundPlane = null;
    }
  }

  // Removes everything the last stage left behind. Targets go first, while the physics world still exists.
  teardown() {
    this.running = false;
    for (const t of this.targets || []) t.destroy();
    this.targets = [];
    if (this.shots) this.shots.clear();
    if (this.player) {
      this.scene.remove(this.player.group);
      this.player.clearMissiles();
    }
    for (const w of this.wingmen || []) this.scene.remove(w.group);
    this.wingmen = [];
    for (const p of this.pillars) this.scene.remove(p.group);
    this.pillars = [];
    if (this.groundPlane) {
      this.scene.remove(this.groundPlane);
      this.groundPlane = null;
    }
    this.phys?.clear();
    this.phys = null;
    this.audio?.stopMusic();
  }

  stop() {
    this.running = false;
  }

  // Track progress: distance flown is measured as -z.
  update(dt) {
    if (!this.running) {
      this.fx.update(dt);
      return;
    }
    this.time += dt;
    if (this.attract) this.controller.update(dt);
    this.player.update(dt, this.controller);
    this.distance = -this.player.pos.z;

    this.spawnDue();
    this.updateComms();
    this.updateScenery(dt);

    for (const t of this.targets) if (t.alive) t.update(dt);
    this.targets = this.targets.filter((t) => t.alive);
    for (const w of this.wingmen) w.update(dt);
    this.shots.update(dt);
    this.phys.step();

    this.collisions();
    this.updateStageFlow(dt);
    this.updateCamera(dt);
    this.updateHud();
    this.fx.update(dt);
    this.hud.setLocks(this.player.locks, this.camera);
  }

  // Objects are spawned when their track distance comes within SPAWN_AHEAD.
  spawnDue() {
    while (this.eventIdx < this.events.length && this.events[this.eventIdx].at - this.distance < SPAWN_AHEAD) {
      this.spawnEvent(this.events[this.eventIdx]);
      this.eventIdx++;
    }
    if (this.stage.boss && !this.boss && this.distance > this.stage.length - SPAWN_AHEAD) {
      this.spawnBoss();
    }
  }

  spawnEvent(ev) {
    const z = -ev.at;
    switch (ev.kind) {
      case 'squad': {
        for (let i = 0; i < ev.count; i++) {
          const dx = (i - (ev.count - 1) / 2) * 6;
          const dy = Math.abs(i - (ev.count - 1) / 2) * -1.8;
          this.targets.push(new Venom(this, ev.x + dx, ev.y + dy, z - Math.abs(i - 1) * 6, { vz: ev.vz, phase: i * 1.7, hp: ev.hp }));
        }
        break;
      }
      case 'turrets': {
        for (let i = 0; i < ev.count; i++) {
          const x = (i - (ev.count - 1) / 2) * 11 + (Math.random() - 0.5) * 4;
          this.targets.push(new Turret(this, x, this.stage.ground.y, z - i * 14 - Math.random() * 4));
        }
        break;
      }
      case 'rocks': {
        for (let i = 0; i < ev.count; i++) {
          const r = 2 + Math.random() * 3.2;
          this.targets.push(new Rock(this, (Math.random() - 0.5) * 42, (Math.random() - 0.5) * 22, z - Math.random() * ev.span, r, ev.id * 31 + i));
        }
        break;
      }
      case 'ring': {
        for (let i = 0; i < 6; i++) {
          const t = i / 5;
          const rx = ev.x + Math.sin(t * Math.PI) * 6;
          const ry = ev.y + Math.cos(t * Math.PI * 0.5) * 2;
          this.targets.push(new Ring(this, rx, ry, z - i * 12, ev.bomb && i === 2));
        }
        break;
      }
      default:
        break;
    }
  }

  spawnBoss() {
    const z = -this.stage.length;
    this.boss = new Carrier(this, 0, 10, z);
    this.targets.push(this.boss);
    this.player.zMin = z + BOSS_HOLD;
    this.audio.sfx('warn');
    this.announce('MORROW DREADNOUGHT', 'Destroy both batteries, then the core', 3);
    this.hud.setBoss('MORROW DREADNOUGHT');
  }

  updateComms() {
    while (this.comms.length && this.distance >= this.comms[0].at) {
      const c = this.comms.shift();
      this.comm(c.who, c.text);
    }
  }

  updateScenery(dt) {
    const g = this.stage.pillars;
    if (g) {
      while (this.pillarNext < this.distance + 420) {
        this.pillarNext += 52 + Math.random() * 28;
        const side = Math.random() < 0.5 ? -1 : 1;
        const h = 26 + Math.random() * 40;
        const shade = [0xc98a5c, 0xb6774a, 0xd9a072][Math.floor(Math.random() * 3)];
        const grp = pillar(h, shade);
        grp.position.set(side * (38 + Math.random() * 12), this.stage.ground.y, -this.pillarNext);
        this.scene.add(grp);
        this.pillars.push({ group: grp });
      }
      for (let i = this.pillars.length - 1; i >= 0; i--) {
        const p = this.pillars[i];
        if (p.group.position.z > this.player.pos.z + 60) {
          this.scene.remove(p.group);
          this.pillars.splice(i, 1);
        }
      }
    }
    if (this.groundPlane) this.groundPlane.position.z = this.player.pos.z - 1800;
  }

  collisions() {
    const p = this.player;
    if (!p.alive) return;
    const hits = [];
    this.phys.overlapping(p.col, (owner) => hits.push(owner));
    for (const owner of hits) {
      if (!owner.alive) continue;
      if (owner.kind === 'ring') {
        owner.destroy();
        this.ringsTaken++;
        p.collectRing(owner.bomb);
      } else if (owner.kind === 'rock' || owner.kind === 'venom' || owner.kind === 'turret') {
        if (owner.kind === 'rock') this.audio.sfx('explode');
        const res = owner.hit(99, 'crash');
        if (res) this.addScore(res.points);
        if (res && res.killed) this.kills++;
        p.hurt(owner.kind === 'rock' ? 25 : 30, owner.pos);
      } else if (owner.kind === 'carrierPart' && owner.name !== 'shield') {
        p.hurt(20, owner.pos);
      }
    }
  }

  // Shared damage path for lasers, missiles and wingmen.
  damageTarget(target, dmg, source, point) {
    if (!target || !target.alive) return;
    const res = target.hit(dmg, source);
    if (!res) return;
    if (point && res.deflected) this.fx.burst(point, 0x7fe3ff, 6, 8, 0.4, 0.25);
    if (res.killed) {
      this.addScore(res.points);
      this.kills++;
      if (target.kind === 'rock' || target.kind === 'venom' || target.kind === 'turret') this.input.rumble(0.25, 90);
    }
  }

  // Bombs clear every fighter and rock in view. The carrier takes a little damage.
  bomb() {
    this.audio.sfx('bomb');
    this.shake(0.9);
    const p = this.player.pos;
    this.fx.ring(p.clone().add(new Vector3(0, 0, -30)), 0xffd23f, 90, 0.9);
    this.flashWhite();
    for (const t of this.targets) {
      if (!t.alive || t.kind === 'ring') continue;
      const ahead = p.z - t.pos.z;
      if (ahead < 0 || ahead > 260 || Math.abs(t.pos.x - p.x) > 42 || Math.abs(t.pos.y - p.y) > 26) continue;
      if (t.kind === 'carrier') continue;
      if (t.kind === 'carrierPart') {
        this.damageTarget(t, 3, 'bomb', t.pos);
        continue;
      }
      this.damageTarget(t, 8, 'bomb', t.pos);
    }
  }

  countInView() {
    const p = this.player.pos;
    return this.targets.filter((t) => t.alive && t.kind !== 'ring' && p.z - t.pos.z > 20 && p.z - t.pos.z < 220).length;
  }

  // Targets a player can lock or aim at.
  lockables() {
    const out = [];
    for (const t of this.targets) {
      if (!t.alive) continue;
      if (t.kind === 'venom' || t.kind === 'turret') out.push(t);
      else if (t.kind === 'carrier' && this.boss) {
        for (const part of [this.boss.batteries[0].target, this.boss.batteries[1].target, this.boss.core]) {
          if (part.alive && (part !== this.boss.core || this.boss.coreCol.isEnabled())) out.push(part);
        }
      }
    }
    return out;
  }

  addScore(n) {
    this.score += n;
  }

  onPlayerDown() {
    this.lostShips++;
    const out = this.player.outOfShips;
    this.announce('SHIP DOWN', out ? 'No ships left' : `${this.player.lives} spare ship${this.player.lives === 1 ? '' : 's'} left`, 2.2);
    this.comm('Mira', out ? 'Pilot is down. Mission failed.' : 'We lost you! Get back in the fight!');
  }

  onWingmanDown(w) {
    this.comm(w.name, 'I am hit, going down!');
    this.announce('WINGMAN DOWN', w.name, 2);
  }

  gameOver() {
    this.running = false;
    this.audio.playTrack(null);
    this.audio.sfx('gameover');
    this.emit('gameover', this.stageResult());
  }

  onBossDown(boss) {
    this.boss = boss;
    this.announce('DREADNOUGHT DESTROYED', 'Mission complete', 4);
    this.audio.sfx('fanfare');
    this.fx.explode(boss.pos, true);
    this.finishing = true;
    this.finishT = 4.5;
    this.comm('Ortega', 'Nice flying. The Dreadnought is finished.');
  }

  stageResult() {
    return {
      stage: this.stageIndex,
      name: this.stage.name,
      score: this.score,
      kills: this.kills,
      rings: this.ringsTaken,
      lostShips: this.lostShips,
      wingmenAlive: this.wingmen.filter((w) => w.alive).length,
      time: this.time,
      distance: this.distance,
    };
  }

  updateStageFlow(dt) {
    if (this.finishing) {
      this.finishT -= dt;
      if (this.boss) {
        this.shake(0.1);
        this.fx.explode(this.boss.pos.clone().add(new Vector3((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 10, 0)), false);
      }
      if (this.finishT <= 0) this.finish();
      return;
    }
    if (!this.stage.boss && this.distance >= this.stage.length) {
      this.finishing = true;
      this.finishT = 3.5;
      this.announce('STAGE CLEAR', `${this.stage.name} secured`, 3);
      this.audio.sfx('fanfare');
    }
  }

  finish() {
    this.running = false;
    this.emit('stageClear', this.stageResult());
  }

  comm(who, text) {
    this.hud.comm(who, text);
    this.audio.sfx('comms');
  }

  announce(title, sub, dur) {
    this.hud.banner(title, sub, dur);
  }

  shake(a) {
    if (!settings.shake) return;
    this.shakeAmp = Math.max(this.shakeAmp, a);
    this.shakeT = 0.4;
  }

  flashDamage() {
    this.hud.damageFlash();
  }

  flashWhite() {
    this.hud.flash();
  }

  setSpeedFx(v) {
    this.speedFx = v;
  }

  updateCamera(dt) {
    const p = this.player.pos;
    const k = 1 - Math.exp(-7 * dt);
    const cam = this.camera;
    const dx = p.x * 0.3;
    const dy = p.y * 0.3 + 3.2;
    const dz = p.z + 13;
    cam.position.x += (dx - cam.position.x) * k;
    cam.position.y += (dy - cam.position.y) * k;
    cam.position.z += (dz - cam.position.z) * k;
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const a = this.shakeAmp * Math.max(0, this.shakeT / 0.4);
      cam.position.x += (Math.random() - 0.5) * a;
      cam.position.y += (Math.random() - 0.5) * a;
    } else {
      this.shakeAmp = 0;
    }
    cam.lookAt(p.x * 0.55, p.y * 0.5, p.z - 38);
    const fovWant = this.renderer.baseFov + Math.max(0, this.speedFx - CRUISE) * 0.09;
    this.fovKick += (fovWant - this.fovKick) * (1 - Math.exp(-4 * dt));
    cam.fov = this.fovKick;
    cam.updateProjectionMatrix();
  }

  updateHud() {
    this.hud.update({
      shield: this.player.shield,
      alive: this.player.alive,
      bombs: this.player.bombs,
      lives: this.player.lives,
      score: this.score,
      wingmen: this.wingmen.map((w) => ({ name: w.name, alive: w.alive, hp: w.hp })),
      boss: this.boss && this.boss.alive ? this.boss : null,
      distance: this.distance,
      length: this.stage.length,
      attract: this.attract,
    });
  }

  render(dt) {
    this.renderer.render(this.camera, dt, this.running ? this.speedFx : 0);
  }
}

function rgb(hex) {
  return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
}
