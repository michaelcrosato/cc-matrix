// The Commodore's Bathysphere: a walking brass ball. Phase 1 valves, phase 2 hatch locks, phase 3 the
// Mother on the altar, with the Commodore fused on top, still broadcasting.
import { THREE, buildModel, setLookLayer, compileClips } from '../../../pixel-engine.js';
import { MOTHER_CLIP_DEFS, MOTHER_RIG } from '../../data/clips.js';
import { TUNING } from '../../data/tuning.js';
import { Enemy, angleDiff } from '../enemy.js';
import { ENEMIES } from '../../data/enemies.js';
import { MODELS } from '../../models/index.js';
import { S } from '../../data/dialogue.js';
import { app } from '../../core/app.js';
import { explode } from '../combat.js';

const { Vector3 } = THREE;
const v = new Vector3();
const flow = [0, 0];

ENEMIES.bathysphere = { name: 'THE BATHYSPHERE', hp: 560, speed: [1.4, 1.4], damage: 30, reach: 6, windup: 1, loco: 'BathyWalk', models: [['bathysphere']], prop: [], mute: true, big: 2.4, ragdoll: false, boss: true };
const VALVES = [
  { name: 'valveRS', joint: 'Torso', at: [-0.5, 0.6, 0.06], model: 'bathy-valve', place: [-0.48, 0.6, 0.06] },
  { name: 'valveLS', joint: 'Torso', at: [0.5, 0.6, 0.06], model: 'bathy-valve', place: [0.48, 0.6, 0.06] },
  { name: 'valveRH', joint: 'Pelvis', at: [-0.36, -0.02, 0.1], model: 'bathy-valve', place: [-0.34, -0.02, 0.1] },
  { name: 'valveLH', joint: 'Pelvis', at: [0.36, -0.02, 0.1], model: 'bathy-valve', place: [0.34, -0.02, 0.1] },
];
const LOCKS = [
  { name: 'lockA', joint: 'Torso', at: [-0.26, 0.56, 0.46], model: 'bathy-lock', place: [-0.26, 0.56, 0.42] },
  { name: 'lockB', joint: 'Torso', at: [0.26, 0.56, 0.46], model: 'bathy-lock', place: [0.26, 0.56, 0.42] },
  { name: 'lockC', joint: 'Torso', at: [0, 0.14, 0.48], model: 'bathy-lock', place: [0, 0.14, 0.45] },
];

export class Bathysphere extends Enemy {
  constructor(area, o) {
    super(area, 'bathysphere', { ...o, state: 'SCRIPT' });
    this.isBoss = true;
    this.noLoot = true;
    this.phase = 1;
    this.parts = VALVES.map((p) => this.makePart(p, 140 * TUNING.enemyHp, 0.62, (s) => this.burstValve(s)));
    this.locks = LOCKS.map((p) => this.makePart(p, 60 * TUNING.enemyHp, 0.42, (s) => this.breakLock(s), false));
    this.attackCool = 3;
    this.steamT = 0;
    this.chargeDir = null;
    this.stunT = 0;
    this.water = area.world.waterY ?? 0;
    this.area.waterBase = this.water;
  }

  makePart(p, hp, radius, onDead, active = true) {
    const s = { ...p, hp, hpMax: hp, alive: true, pos: new Vector3(), obj: this.actor.attach(p.joint, p.model, { at: p.place }) };
    setLookLayer(s.obj, 'actors');
    const torn = s.obj.getObjectByName('torn');
    if (torn) torn.visible = false;
    s.sh = { active, pos: s.pos, radius, solid: true, label: p.name, onHit: (h) => {
      if (!s.alive) return;
      s.hp -= h.damage;
      this.actor.flash(1);
      this.area.ctx.audio.play('metalClang', this.area.spatial(this.x, this.z, 40));
      this.area.ctx.particles.burst('spark', s.pos);
      this.updateBar();
      if (s.hp <= 0) { s.alive = false; s.sh.active = false; onDead(s); }
    } };
    this.area.shootables.push(s.sh);
    return s;
  }

  updateBar() {
    const { area } = this;
    if (this.phase === 1) area.bossBar = { name: 'THE BATHYSPHERE OF SAINT ORRIN', frac: this.parts.reduce((n, s) => n + Math.max(0, s.hp), 0) / this.parts.reduce((n, s) => n + s.hpMax, 0) };
    else if (this.phase === 2) area.bossBar = { name: 'THE HATCH', frac: this.locks.reduce((n, s) => n + Math.max(0, s.hp), 0) / this.locks.reduce((n, s) => n + s.hpMax, 0) };
  }

  knockdown() {}
  blind() {}
  blast(d) { const s = (this.phase === 1 ? this.parts : this.locks).find((k) => k.alive); if (s) s.sh.onHit({ damage: d * 0.5 }); }
  kicked() {}
  canKick() { return false; }
  canTakedown() { return false; }
  isDown() { return false; }
  walkToSea() {}
  dieQuiet() {}

  hit(h) {
    this.area.fx.sparks(h.point);
    this.area.ctx.audio.play('armorSpark', this.area.spatial(this.x, this.z, 40));
    return { killed: false };
  }

  devKill() {
    for (const s of this.parts) if (s.alive) s.sh.onHit({ damage: 9999 });
    for (const s of this.locks) if (s.alive) s.sh.onHit({ damage: 9999 });
    this.area.mother?.devKill();
  }

  burstValve(s) {
    const { area } = this;
    const { ctx } = area;
    s.obj.getObjectByName('lit').visible = false;
    s.obj.getObjectByName('torn').visible = true;
    ctx.audio.play('steamJet', area.spatial(this.x, this.z, 60));
    ctx.particles.burst('steam', s.pos, { count: 40, speed: 1.6 });
    ctx.engine.shake.add(0.4);
    area.raiseWater(0.15);
    area.director.queueSpawn('monk', 4, area.level.spawnDoors['1'] ? '1' : [area.level.info.x(3), area.level.info.z(30)], { every: 0.7 });
    area.hud.flashText('THE WATER IS RISING', 1.6);
    // Each one blows a locker off him: the company's own supplies, rolling down the aisle.
    const n = this.parts.filter((k) => !k.alive).length;
    const [id, qty] = [['ammoPistol', 18], ['ammoShells', 8], ['samphire', 1], ['ammoPistol', 18]][Math.min(3, n - 1)];
    const { nav } = area.level;
    for (let k = 3; k < 7; k++) {
      const x = this.x + Math.sin(this.yaw) * k; const z = this.z + Math.cos(this.yaw) * k;
      if (nav.walkable(x, z) || k === 6) { area.addDrop('item', id, qty, nav.walkable(x, z) ? x : this.x, nav.walkable(x, z) ? z : this.z); break; }
    }
    if (this.parts.every((k) => !k.alive)) this.startHatch();
  }

  startHatch() {
    const { area } = this;
    this.phase = 2;
    this.state = 'SAG'; this.stateT = 0;
    this.actor.play('BathySag');
    area.ctx.audio.play('gateShut');
    for (const l of this.locks) l.sh.active = true;
    this.updateBar();
    area.setObjective('THREE LOCKS ON THE HATCH. SHOOT THEM');
    area.showHint('SHOOT THE HATCH LOCKS', 'aim', 6);
  }

  breakLock(s) {
    const { area } = this;
    s.obj.visible = false;
    area.ctx.audio.play('reloadRack', { pitch: -6 });
    this.updateBar();
    if (this.locks.every((k) => !k.alive)) {
      this.state = 'OPEN'; this.stateT = 0;
      area.bossBar = null;
      area.setObjective('THE HATCH');
      area.showHint('GET CLOSE. KICK THE HATCH IN', 'action', 8);
      this.hatchItem = area.interact.add({
        kind: 'hatch', x: this.x, z: this.z, label: 'KICK THE HATCH', prio: 0.5, radius: 3.4, facing: false,
        enabled: () => this.state === 'OPEN',
        use: () => area.def.startHatchCut(area, this),
      });
    }
  }

  // ---- Fixed step ----
  step(dt) {
    if (this.dead) return;
    const { area } = this;
    this.stateT += dt;
    this.px = this.x; this.pz = this.z;
    const T = area.player;
    if (!T) return;
    const dist = Math.hypot(T.x - this.x, T.z - this.z);
    this.dist = dist;
    this.target = T;
    this.attackCool -= dt;
    if (app.dev.freezeAi) { this.commit(); return; }
    // Nobody ends up underneath him: he shuffles off whoever he's standing on.
    if (dist < 2.4 && this.state !== 'CHARGE' && this.state !== 'SCRIPT' && this.state !== 'OPEN' && this.state !== 'SAG') {
      const k = dist || 1; const step = 2 * dt;
      const nx = this.x - ((T.x - this.x) / k) * step; const nz = this.z - ((T.z - this.z) / k) * step;
      const { nav } = area.level;
      if (nav.walkable(nx, this.z)) this.x = nx;
      if (nav.walkable(this.x, nz)) this.z = nz;
    }
    switch (this.state) {
      case 'SCRIPT': break;
      case 'WALK': this.stepWalk(dt, T, dist); break;
      case 'JET': this.stepJet(dt, T, dist); break;
      case 'STOMP': this.stepStomp(dt, T, dist); break;
      case 'RIVET': this.stepRivet(dt, T); break;
      case 'WHISTLE': this.stepWhistle(dt, T); break;
      case 'CHARGE': this.stepCharge(dt, T, dist); break;
      case 'STUNNED': if (this.stateT > 3) { this.state = 'WALK'; this.stateT = 0; this.attackCool = 1.5; } break;
      case 'SAG': this.stepSag(dt, T, dist); break;
      case 'OPEN': this.turnToward(Math.atan2(T.x - this.x, T.z - this.z), dt, 1); break;
      default: break;
    }
    if (this.hatchItem) { this.hatchItem.x = this.x; this.hatchItem.z = this.z; }
    if (this.body) this.commit();
  }

  stepWalk(dt, T, dist) {
    const { area } = this;
    const nav = area.navByKey('player');
    nav.flowTo(T.x, T.z);
    const speed = 1.4 * TUNING.enemySpeed;
    if (dist > 3 && nav.flowDirection(this.x, this.z, flow)) {
      this.x += flow[0] * speed * dt; this.z += flow[1] * speed * dt;
      this.turnToward(Math.atan2(flow[0], flow[1]), dt, 2);
      this.actor.loco('BathyWalk', speed, { fade: 0.25 });
      this.stepT = (this.stepT ?? 0) - dt;
      if (this.stepT <= 0) { this.stepT = 0.8; area.ctx.audio.play('stomp', { ...area.spatial(this.x, this.z, 40), pitch: 4 }); area.ctx.engine.shake.add(0.06); }
    } else this.turnToward(Math.atan2(T.x - this.x, T.z - this.z), dt, 2);
    if (this.attackCool <= 0) {
      const r = area.ctx.random.next();
      if (dist < 3.6) this.toState('STOMP', 'BosunStomp');
      else if (dist < 6.5 && r < 0.6) this.toState('JET', 'SteamBlast');
      else if (dist > 7 && r < 0.45) { this.toState('WHISTLE', 'Idle'); area.ctx.audio.play('whistle'); this.chargeDir = null; }
      else this.toState('RIVET', 'Slam');
    }
  }

  toState(s, clip) { this.state = s; this.stateT = 0; this.acted = 0; this.jetHit = false; if (clip) this.actor.play(clip, { once: clip !== 'Idle', fade: 0.12 }); }

  stepJet(dt, T, dist) {
    const { area } = this;
    this.turnToward(Math.atan2(T.x - this.x, T.z - this.z), dt, 1.6);
    if (this.stateT > 0.5 && this.stateT < 1.6) {
      this.steamT -= dt;
      if (this.steamT <= 0) {
        this.steamT = 0.07;
        const f = [Math.sin(this.yaw), 0, Math.cos(this.yaw)];
        area.ctx.particles.burst('steam', [this.x + f[0] * 2, 2.4, this.z + f[2] * 2], { direction: f, speed: 2.5 });
      }
      if (!this.acted) { this.acted = 1; area.ctx.audio.play('steamJet', area.spatial(this.x, this.z, 40)); }
      const a = Math.abs(angleDiff(Math.atan2(T.x - this.x, T.z - this.z), this.yaw));
      // One scald per blast: staying in it slows you, and the next one's his to earn.
      if (dist < 6 && a < 0.5) {
        T.applySlow(0.6, 2);
        if (!this.jetHit) { this.jetHit = T.hurt(30, this, {}) === true; }
      }
    }
    if (this.stateT > 1.9) { this.state = 'WALK'; this.stateT = 0; this.attackCool = 2.4; }
  }

  stepStomp(dt, T, dist) {
    const { area } = this;
    if (!this.acted && this.stateT > 0.6) {
      this.acted = 1;
      area.ctx.audio.play('stomp', area.spatial(this.x, this.z, 40));
      area.ctx.engine.shake.add(0.6);
      area.ctx.particles.burst('splash', [this.x, 0.4, this.z], { count: 26, speed: 2 });
      // A stomp that lands buys you the time to get up and get out: he doesn't stand over you.
      if (dist < 4.2 && T.hurt(30, this, { knock: true })) this.stompLanded = true;
    }
    if (this.stateT > 1.05) { this.state = 'WALK'; this.stateT = 0; this.attackCool = this.stompLanded ? 4 : 2; this.stompLanded = false; }
  }

  stepRivet(dt, T) {
    const { area } = this;
    this.turnToward(Math.atan2(T.x - this.x, T.z - this.z), dt, 2);
    const shots = 3;
    if (this.stateT > 0.5 + this.acted * 0.32 && this.acted < shots) {
      this.acted++;
      area.ctx.audio.play('rivet', area.spatial(this.x, this.z, 40));
      area.addProjectile('rivet', [this.x + Math.sin(this.yaw) * 1.4, 2.4, this.z + Math.cos(this.yaw) * 1.4], [T.x, 1.1, T.z], { owner: this, damage: 12 });
    }
    if (this.stateT > 1.8) { this.state = 'WALK'; this.stateT = 0; this.attackCool = 4; }
  }

  stepWhistle(dt, T) {
    this.turnToward(Math.atan2(T.x - this.x, T.z - this.z), dt, 2.5);
    if (this.stateT > 1.0) {
      this.chargeDir = [Math.sin(this.yaw), Math.cos(this.yaw)];
      this.toState('CHARGE', null);
      this.actor.play('BathyCharge', { fade: 0.1 });
    }
  }

  /** Charge: 8 m/s. A column stops him, shatters, and stuns him for 3 s. */
  stepCharge(dt, T, dist) {
    const { area } = this;
    const [dx, dz] = this.chargeDir;
    const nx = this.x + dx * 8 * dt; const nz = this.z + dz * 8 * dt;
    const { info, nav } = area.level;
    this.chargeT = (this.chargeT ?? 0) - dt;
    if (this.chargeT <= 0) { this.chargeT = 0.25; area.ctx.audio.play('stomp', { ...area.spatial(this.x, this.z, 50), pitch: 2 }); area.ctx.engine.shake.add(0.12); }
    if (dist < 2.2 && !this.acted) {
      this.acted = 1;
      T.hurt(35, this, { knock: true });
      // He goes on past, a brass ball doesn't stop, and he has to turn around.
      this.overrunT = 0.5;
    }
    if (this.overrunT > 0) {
      this.overrunT -= dt;
      if (this.overrunT <= 0) { this.state = 'WALK'; this.stateT = 0; this.attackCool = 3.5; return; }
    }
    const ch = info.at(nx + dx * 1.2, nz + dz * 1.2);
    if (ch === 'H') {
      area.shatterColumn(nx + dx * 1.2, nz + dz * 1.2);
      this.state = 'STUNNED'; this.stateT = 0;
      this.actor.play('BathySag');
      area.ctx.audio.play('stonecrash', area.spatial(this.x, this.z, 60));
      area.ctx.engine.shake.add(0.7);
      area.hud.flashText('HE IS STUNNED', 1.5);
      return;
    }
    if (!nav.walkable(nx, nz) || this.stateT > 3) { this.state = 'WALK'; this.stateT = 0; this.attackCool = 2; return; }
    this.x = nx; this.z = nz;
  }

  stepSag(dt, T, dist) {
    const { area } = this;
    // He comes round to face you, wherever he sagged: the locks are on his front, and he may have stopped facing a wall.
    this.turnToward(Math.atan2(T.x - this.x, T.z - this.z), dt, 1.2);
    this.flailT = (this.flailT ?? 2) - dt;
    if (this.flailT <= 0) {
      this.flailT = 3.2;
      area.ctx.audio.play('stomp', area.spatial(this.x, this.z, 40));
      area.ctx.particles.burst('splash', [this.x, 0.4, this.z], { count: 18 });
      if (dist < 3.6) T.hurt(18, this, { knock: true });
      this.area.ctx.engine.shake.add(0.3);
    }
  }

  frame(dt, alpha) {
    this.syncModel(alpha);
    const { actor } = this;
    actor.update(dt);
    if (this.dead) return;
    this.updateZones();
    this.area.bossBar === null || this.updateBar();
    for (const list of [this.parts, this.locks]) {
      for (const s of list) {
        const j = actor.joints[s.joint];
        j.updateWorldMatrix(true, false);
        s.pos.copy(j.localToWorld(v.set(s.at[0], s.at[1], s.at[2])));
      }
    }
    // Steam from what's burst.
    this.puffT = (this.puffT ?? 0) - dt;
    if (this.puffT <= 0) {
      this.puffT = 0.2;
      for (const s of this.parts) if (!s.alive) this.area.ctx.particles.burst('steam', s.pos, { count: 2 });
    }
  }

  aimPoint(zone, out) {
    const list = this.phase === 1 ? this.parts : this.locks;
    const s = list.find((k) => k.alive);
    return out.copy(s ? s.pos : this.zones.torso.a);
  }

  remove() {
    this.dead = true;
    this.removeBody();
    for (const s of [...this.parts, ...this.locks]) s.sh.active = false;
    if (this.hatchItem) this.area.interact.remove(this.hatchItem);
    this.actor.root.visible = false;
  }
}

/** Phase 3: the thing on his neck takes the altar. */
export class Mother {
  constructor(area, x, z) {
    this.area = area;
    this.x = x; this.z = z; this.y = 0;
    this.floor = 0;
    this.dead = false;
    this.type = 'mother';
    this.d = { name: 'THE MOTHER', crawler: false, mute: true };
    this.isBoss = true;
    this.scale = 2;
    this.state = 'SPIT';
    this.zonesReady = false;
    this.zones = null;
    const { ctx } = area;
    const b = buildModel('mother-limpet', { catalog: MODELS });
    setLookLayer(b.object, 'actors');
    b.object.position.set(x, 0, z);
    b.object.rotation.y = 0;
    b.object.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    ctx.scene.add(b.object);
    this.obj = b.object;
    this.mic = b.object.getObjectByName('Mic');
    this.rider = b.object.getObjectByName('Rider');
    this.eye = b.object.getObjectByName('Eye');
    this.micHp = 200 * TUNING.enemyHp;
    this.eyeHp = 400 * TUNING.enemyHp;
    this.micPos = new Vector3(); this.eyePos = new Vector3();
    this.micSh = { active: true, pos: this.micPos, radius: 0.6, solid: true, label: 'mic', onHit: (h) => this.hitMic(h) };
    this.eyeSh = { active: false, pos: this.eyePos, radius: 0.75, solid: true, label: 'eye', onHit: (h) => this.hitEye(h) };
    area.shootables.push(this.micSh, this.eyeSh);
    this.spitT = 2.5; this.birthT = 6;
    this.broadcast = 0;
    this.sayT = 3;
    this.lines = ['THIS ISLAND HAS STOOD FOR A THOUSAND YEARS.', 'WE GIVE THE ONE WHO CAME ASHORE.', 'YOUR COVERAGE HAS LAPSED, MISS RANSOM.', 'THE SEA GIVES BACK WHAT IT CANNOT KEEP.'];
    area.bossBar = { name: 'THE COMMODORE', frac: 1 };
    area.setObjective('THE MICROPHONE ON HIS CHEST');
    this.light = ctx.lights.request({ position: [x, 2.5, z + 1.5], color: 0x90f060, intensity: 10, radius: 12, flicker: 'pulse', priority: 5 });
    this.mixer = new THREE.AnimationMixer(b.object);
    this.spitAction = this.mixer.clipAction(compileClips(MOTHER_CLIP_DEFS, MOTHER_RIG, b.object)[0]);
    this.spitAction.setLoop(THREE.LoopOnce, 1);
    // What the hatch held: he kept a well-stocked locker.
    area.addDrop('item', 'ammoPistol', 48, x - 3, z + 6);
    area.addDrop('item', 'ammoShells', 8, x + 3, z + 6);
    area.addDrop('item', 'samphire', 1, x, z + 8);
  }

  // Interface bits for code that walks area.enemies.
  isDown() { return false; } canKick() { return false; } canTakedown() { return false; } kicked() {} knockdown() {} blind() {} walkToSea() {}
  blast(d) { if (this.micHp > 0) this.hitMic({ damage: d * 0.5 }); else this.hitEye({ damage: d * 0.5 }); }
  hit() { this.area.fx.sparks(this.micPos); return { killed: false }; }
  aimPoint(z, out) { return out.copy(this.micHp > 0 ? this.micPos : this.eyePos); }
  pos3() { return v.set(this.x, 1.5, this.z); }
  dispose() {}
  devKill() { this.hitMic({ damage: 99999 }); this.hitEye({ damage: 99999 }); }

  hitMic(h) {
    if (this.micHp <= 0) return;
    this.micHp -= h.damage;
    this.area.ctx.particles.burst('spark', this.micPos);
    this.area.ctx.audio.play('metalClang', { volume: 0.7 });
    this.area.bossBar = { name: 'THE COMMODORE', frac: Math.max(0, this.micHp) / (200 * TUNING.enemyHp) };
    if (this.micHp <= 0) this.micCut();
  }

  /** It cuts him off mid-sentence, one last time. And the voice carries on without it. */
  micCut() {
    const { area } = this;
    const { ctx } = area;
    if (this.mic) this.mic.visible = false;
    this.micSh.active = false;
    ctx.audio.play('tannoyBreak');
    area.talk.bark('commodore', 'THIS IS AN OUTRAGE, I AM ON THE AIR, I AM', { prio: 5 });
    area.talk.cutBark();
    app.mix.cut();
    this.silenceT = 2.4;
    area.bossBar = null;
    this.area.quietMoment = true;
  }

  hitEye(h) {
    if (this.eyeHp <= 0 || !this.eyeSh.active) return;
    this.eyeHp -= h.damage;
    this.area.ctx.particles.burst('brine', this.eyePos, { count: 6 });
    this.area.ctx.audio.play('bodyHit');
    this.area.bossBar = { name: 'THE EYE', frac: Math.max(0, this.eyeHp) / (400 * TUNING.enemyHp) };
    if (this.eyeHp <= 0) this.finish();
  }

  finish() {
    if (this.dead) return;
    this.dead = true;
    this.eyeSh.active = false;
    const { area } = this;
    area.bossBar = null;
    for (const e of area.enemies) if (e !== this && !e.dead) e.dieQuiet?.();
    area.def.finalSettlement(area, this);
  }

  step(dt) {
    const { area } = this;
    if (this.dead) return;
    const T = area.player;
    this.target = T;
    if (this.silenceT > 0) {
      this.silenceT -= dt;
      if (this.silenceT <= 0) {
        // His jaw keeps moving. The voice keeps coming, from the thing on his neck. It always did.
        area.talk.bark('commodore', 'I AM STILL ON THE AIR.', { prio: 5, volume: 1.2 });
        area.ctx.audio.play('bellow', { volume: 0.5, pitch: 6 });
        this.eyeSh.active = true;
        area.setObjective('THE EYE, UNDER THE JAW');
        area.bossBar = { name: 'THE EYE', frac: 1 };
        area.setMusic('boss');
        area.quietMoment = false;
      }
      return;
    }
    this.spitT -= dt;
    if (this.spitT <= 0 && !area.quietMoment) {
      this.spitT = 2.4 + area.ctx.random.next();
      area.ctx.audio.play('spit', area.spatial(this.x, this.z, 40));
      this.spitLunge = 1;
      this.spitAction.reset().play();
      area.addProjectile('glob', [this.x, 2.6, this.z + 1.4], [T.x, 0.1, T.z], { owner: this, damage: 20 });
    }
    this.birthT -= dt;
    if (this.birthT <= 0 && !area.quietMoment) {
      this.birthT = 10;
      const n = area.enemies.filter((e) => !e.dead && e.type === 'limpet').length;
      if (n < 3) {
        // Her brood comes straight for you: they don't stop to raise the dead on the way.
        for (let i = 0; i < 2; i++) area.spawnEnemy('limpet', { x: this.x + (i - 1) * 2, z: this.z + 2.6, state: 'APPROACH', noLoot: true }).huntOnly = true;
        area.ctx.audio.play('limpetSkitter');
        area.ctx.particles.burst('brine', [this.x, 0.4, this.z + 2], { count: 12 });
      }
    }
    this.sayT -= dt;
    if (this.sayT <= 0 && !area.talk.barkLine) { this.sayT = 9; area.talk.bark('commodore', area.ctx.random.pick(this.lines), { prio: 1 }); }
  }

  frame(dt) {
    const t = this.area.ctx.time;
    this.mixer.update(dt);
    this.spitLunge = Math.max(0, (this.spitLunge ?? 0) - dt * 3);
    const lunge = this.spitLunge * 0.08;
    this.obj.scale.set(1 + Math.sin(t * 2) * 0.012 - lunge * 0.5, 1 + Math.cos(t * 2) * 0.012 + lunge, 1 + Math.sin(t * 2) * 0.012 - lunge * 0.5);
    if (this.rider && !this.spitAction.isRunning()) this.rider.rotation.z = Math.sin(t * 2.3) * 0.06;
    this.obj.updateMatrixWorld(true);
    if (this.mic) this.mic.getWorldPosition(this.micPos); else this.micPos.set(this.x, 3, this.z + 0.6);
    if (this.eye) this.eye.getWorldPosition(this.eyePos);
  }

  /** The limpet swarm dies to flares all at once. */
  onFlare() {
    for (const e of this.area.enemies) if (!e.dead && e.type === 'limpet') e.blind(4);
  }
}
export { S, explode };
