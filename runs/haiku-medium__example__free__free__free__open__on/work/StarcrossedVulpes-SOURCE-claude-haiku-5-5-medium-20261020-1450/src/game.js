// Stage runtime: flight, weapons, enemies, bosses, rings, wingmen, scoring and mission flow.
import * as THREE from 'three';
import { STAGES, SPEAKERS } from './stages.js';
import { R, setEnvironment } from './render.js';
import * as fx from './fx.js';
import * as M from './models.js';
import { buildWorld, groundHeight } from './world.js';
import { sfx } from './audio.js';
import { hud } from './hud.js';
import { settings } from './settings.js';

const AIR_X = 44;
const AIR_YMAX = 40;
const GROUND_X = 52;
const CRUISE = 60;
const BOOST = 100;
const BRAKE = 32;
const BULLET_SPEED = 260;
const LOCK_TIME = 0.35;
const LOCK_MAX = 6;
const ROLL_TIME = 0.6;
const ROLL_INVULN = 0.42;
const RESPAWN_INVULN = 2.5;
const START_SPARES = 2;
const BOSS_SCALE = 1.5;

// Enemy archetypes. `fire` is seconds between shots; `range` is how far ahead they shoot.
const ENEMY = {
  drone:  { make: M.makeDrone, r: 3.4, hp: 1, score: 100, fire: 2.4, range: 240, speed: 28, counts: true },
  bomber: { make: M.makeDrone, r: 5.4, hp: 6, score: 250, fire: 2.6, range: 240, speed: 9, counts: true, scale: 1.8 },
  turret: { make: M.makeTurret, r: 3.2, hp: 3, score: 150, fire: 1.8, range: 200, ground: true, counts: true },
  walker: { make: M.makeWalker, r: 4.2, hp: 4, score: 200, fire: 2.2, range: 200, ground: true, counts: true, speed: 7 },
  tank:   { make: M.makeTank, r: 4.6, hp: 6, score: 300, fire: 1.8, range: 210, ground: true, counts: true, speed: 6 },
  pillar: { make: M.makePillar, r: 3.8, hp: 6, score: 200, fire: 1.6, range: 230, fixed: true, counts: false },
  gatekeeper: { make: M.makeGatekeeper, r: 9, hp: 40, score: 2000, fire: 2.2, range: 260, fixed: true, counts: true },
};

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (dt, rate) => 1 - Math.exp(-dt * rate);

export class Stage {
  constructor(id, { attract = false, onFinish } = {}) {
    this.id = id;
    this.def = STAGES[id];
    this.env = this.def.env;
    this.attract = attract;
    this.onFinish = onFinish;
    this.cheat = attract;
    this.time = 0;
    this.phase = 'play';         // play | transform | dead | done
    this.phaseT = 0;
    this.ending = null;          // null | 'cleared' | 'failed'
    this.endT = 0;
    this.shake = 0;
    this.finished = false;
    this.root = new THREE.Group();
    R.scene.add(this.root);
    setEnvironment(this.env);

    const finite = Number.isFinite(this.def.duration);
    this.length = finite ? this.def.duration * 75 : 2400;
    buildWorld(this.env, this.root, this.length, Math.random);

    this.yMin = this.env.floorY === null ? -AIR_YMAX : this.env.floorY + 6;
    this.yMax = AIR_YMAX;
    this.player = {
      x: 0, y: 6, z: 0, vx: 0, vy: 0, speed: CRUISE, mode: 'air',
      shield: 100, spares: START_SPARES, bombs: 3, laser: 1,
      invuln: 0, rollInv: 0, rollT: 0, rollDir: 0, rollAng: 0, rollCd: 0,
      bombCd: 0, fireCd: 0, holdT: 0, locks: [], fireWasDown: false,
      damageTaken: 0, livesLost: 0,
    };
    this.playerMesh = M.makeArwing();
    this.landmasterMesh = M.makeLandmaster();
    this.landmasterMesh.visible = false;
    this.root.add(this.playerMesh, this.landmasterMesh);
    this.playerMesh.rotation.order = 'YXZ';
    this.landmasterMesh.rotation.order = 'YXZ';

    this.wings = [];
    for (const [livery, off] of [['rook', [-13, -2, -8]], ['tig', [13, -2, -8]]]) {
      const mesh = M.makeArwing(livery);
      mesh.scale.setScalar(0.85);
      this.root.add(mesh);
      this.wings.push({ mesh, off, fireCd: rand(0.2, 0.9), pos: new THREE.Vector3(), name: livery });
    }

    this.enemies = [];
    this.eBullets = [];
    this.pBullets = [];
    this.pickups = [];
    this.rings = [];
    this.gates = [];
    this.bossParts = [];
    this.boss = null;
    this.field = null;
    this.pillarZ = -140;
    this.talkQueue = [];
    this.talkCur = null;
    this.talkT = 0;
    this.kills = 0;
    this.total = 0;
    this.score = 0;
    this.ringsPassed = 0;
    this.ringsTotal = this.def.events.filter((e) => e.ring).length;
    this.events = this.def.events.slice().sort((a, b) => a.t - b.t);
    this.evIdx = 0;
    this.pending = null;   // requested vehicle transform

    this.player.z = 0;
    this.player.x = 0;
    this.camFocus = { mode: 'chase', boost: 0, roll: 0, shake: 0 };
    hud.show(this.def, this.env.kind);
    hud.setStage(this.def.name, this.def.code);
    this.syncMeshes();
    this.lastShotSfx = 0;
  }

  // ---- Flow -------------------------------------------------------------

  update(dt, ctl) {
    if (this.finished) return;
    this.time += dt;
    this.processEvents();
    this.talkTick(dt);

    if (this.phase === 'play') this.updatePlayer(dt, ctl);
    else if (this.phase === 'transform') this.updateTransform(dt);
    else if (this.phase === 'dead') this.updateDead(dt);

    if (this.env.kind === 'fortress') this.spawnPillarsAhead();
    this.updateWings(dt);
    this.updateField(dt);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.updatePickups(dt);
    this.updateGates(dt);
    this.checkRings();
    this.checkEnd(dt);
    this.shake = Math.max(0, this.shake - dt * 2.5);
    this.syncMeshes();
    this.updateHud();
  }

  // Runs after the camera has moved, so on-screen target boxes line up with the frame.
  lateUpdate() {
    if (this.finished) return;
    const p = this.player;
    const aim = new THREE.Vector3(p.x, this.playerY(), p.z - 170);
    hud.setReticle(this.projectToScreen(aim));
    const boxes = [];
    for (const t of this.targets()) {
      if (!this.inLockCone(t) && !p.locks.includes(t)) continue;
      const s = this.projectToScreen(t.pos);
      if (s) boxes.push({ ...s, state: p.locks.includes(t) ? 'lock' : 'acquire' });
    }
    hud.setTargets(boxes.slice(0, 18));
  }

  stageFocus() {
    const p = this.player;
    const yPos = p.mode === 'ground' ? this.playerY() : p.y;
    const chase = this.cameraMode === 'close' ? 'close' : p.mode === 'ground' ? 'tank' : 'chase';
    this.camFocus.mode = chase;
    this.camFocus.boost = clamp((p.speed - CRUISE) / (BOOST - CRUISE), 0, 1);
    this.camFocus.roll = 0;
    this.camFocus.shake = settings.shake ? this.shake * 0.9 : 0;
    this.camFocus.x = p.x;
    this.camFocus.y = yPos;
    this.camFocus.z = p.z;
    return this.camFocus;
  }

  playerY() {
    const p = this.player;
    if (p.mode === 'ground') return groundHeight(this.env, p.x, p.z) + 2.4;
    return p.y;
  }

  finish(status) {
    if (this.finished) return;
    this.finished = true;
    const medal = status === 'cleared' ? this.medal() : null;
    const result = {
      status,
      stageId: this.id,
      time: this.time,
      kills: this.kills,
      total: this.total,
      rings: this.ringsPassed,
      ringsTotal: this.ringsTotal,
      livesLost: this.player.livesLost,
      damage: this.player.damageTaken,
      score: this.score + (medal === 'gold' ? 1500 : medal === 'silver' ? 750 : medal === 'bronze' ? 250 : 0),
      medal,
    };
    if (this.onFinish) this.onFinish(result);
  }

  medal() {
    const p = this.player;
    if (this.id === 'dreadnought') {
      return p.livesLost === 0 ? 'gold' : p.livesLost === 1 ? 'silver' : 'bronze';
    }
    const ratio = this.total ? this.kills / this.total : 1;
    if (this.ringsPassed === this.ringsTotal && ratio >= 0.8) return 'gold';
    if (this.ringsPassed >= this.ringsTotal - 1 || ratio >= 0.6) return 'silver';
    return 'bronze';
  }

  dispose() {
    R.scene.remove(this.root);
    fx.clearFX();
    hud.hide();
  }

  // ---- Events and dialogue ----------------------------------------------

  processEvents() {
    while (this.evIdx < this.events.length && this.events[this.evIdx].t <= this.time) {
      this.runEvent(this.events[this.evIdx++]);
    }
  }

  runEvent(ev) {
    if (ev.say) this.say(ev.say.who, ev.say.text);
    if (ev.wave) this.spawnWave(ev.wave);
    if (ev.ground) this.spawnGround(ev.ground);
    if (ev.ring) this.addRing(ev.ring);
    if (ev.mode) this.requestMode(ev.mode);
    if (ev.gate) this.addGate(ev.gate);
    if (ev.field) this.field = { until: ev.field.until, rate: ev.field.rate, acc: 0 };
    if (ev.boss) this.spawnBoss(ev.boss);
  }

  say(who, text) {
    this.talkQueue.push({ who, text });
  }

  talkTick(dt) {
    if (this.talkCur) {
      this.talkT -= dt;
      if (this.talkT <= 0) { this.talkCur = null; hud.hideDialog(); }
    }
    if (!this.talkCur && this.talkQueue.length) {
      const line = this.talkQueue.shift();
      this.talkCur = line;
      this.talkT = 2.2 + line.text.length * 0.05;
      hud.showDialog(SPEAKERS[line.who], line.text);
      sfx('say');
    }
  }

  // ---- Player -----------------------------------------------------------

  updatePlayer(dt, ctl) {
    const p = this.player;
    const air = p.mode === 'air';
    const mv = ctl.move;
    const maxX = air ? AIR_X : GROUND_X;
    p.vx += (mv.x * (air ? 40 : 34) - p.vx) * damp(dt, 9);
    if (air) p.vy += (mv.y * 26 - p.vy) * damp(dt, 9);
    p.x = clamp(p.x + p.vx * dt, -maxX, maxX);
    if (air) p.y = clamp(p.y + p.vy * dt, this.yMin, this.yMax);

    const want = ctl.down('boost') ? BOOST : ctl.down('brake') ? BRAKE : CRUISE;
    p.speed += (want - p.speed) * damp(dt, 3);
    p.z -= p.speed * dt;
    if (ctl.down('boost') && !this.boostSfx) { sfx('boost'); this.boostSfx = true; }
    if (!ctl.down('boost')) this.boostSfx = false;

    p.invuln = Math.max(0, p.invuln - dt);
    p.rollInv = Math.max(0, p.rollInv - dt);
    p.rollCd -= dt;
    p.bombCd -= dt;
    p.fireCd -= dt;

    if (p.rollT > 0) {
      p.rollT -= dt;
      p.rollAng += p.rollDir * (Math.PI * 2 * dt) / ROLL_TIME;
      if (p.rollT <= 0) p.rollAng = 0;
    } else if (air && p.rollCd <= 0) {
      if (ctl.hit('rollL')) this.startRoll(1);
      else if (ctl.hit('rollR')) this.startRoll(-1);
    }

    if (ctl.hit('bomb') && p.bombs > 0 && p.bombCd <= 0) this.detonateBomb();

    const fireDown = ctl.down('fire');
    if (fireDown) {
      p.holdT += dt;
      if (air) {
        if (p.holdT < LOCK_TIME) {
          if (p.fireCd <= 0) { this.shootLaser(); p.fireCd = 0.16; }
        } else {
          this.lockTick(dt);
        }
      } else if (p.fireCd <= 0) {
        this.shootCannon();
        p.fireCd = 0.55;
      }
    } else if (p.fireWasDown) {
      if (p.holdT >= LOCK_TIME && p.locks.length) this.fireHoming();
      p.holdT = 0;
      p.locks.length = 0;
    }
    p.fireWasDown = fireDown;

    if (ctl.hit('camera')) {
      this.cameraMode = this.cameraMode === 'close' ? 'chase' : 'close';
      hud.toast(this.cameraMode === 'close' ? 'CAMERA: CLOSE' : 'CAMERA: CHASE');
    }
  }

  startRoll(dir) {
    const p = this.player;
    p.rollT = ROLL_TIME;
    p.rollDir = dir;
    p.rollAng = 0;
    p.rollCd = 0.7;
    p.rollInv = ROLL_INVULN;
    sfx('roll');
  }

  shootLaser() {
    const p = this.player;
    const n = p.laser;
    const cfg = n === 1 ? [[0, 0]] : n === 2 ? [[-1.6, 0], [1.6, 0]] : [[-2.6, -6], [0, 0], [2.6, 6]];
    const yBase = this.playerY();
    for (const [dx, vx] of cfg) {
      this.spawnBolt('player', new THREE.Vector3(p.x + dx, yBase, p.z - 3), new THREE.Vector3(vx, 0, -BULLET_SPEED), 1);
    }
    if (performance.now() - this.lastShotSfx > 60) { sfx('laser'); this.lastShotSfx = performance.now(); }
  }

  shootCannon() {
    const p = this.player;
    this.spawnBolt('shell', new THREE.Vector3(p.x, this.playerY(), p.z - 4), new THREE.Vector3(0, 0, -200), 3);
    sfx('cannon');
  }

  spawnBolt(kind, pos, vel, dmg, target = null) {
    const mesh = M.makeBolt(kind);
    mesh.position.copy(pos);
    this.root.add(mesh);
    const b = { kind, pos, vel, dmg, life: 2.8, mesh, target };
    this.pBullets.push(b);
    return b;
  }

  // Targets for locking and collisions: enemies plus boss parts.
  targets() {
    const list = [];
    for (const e of this.enemies) if (e.alive) list.push(e);
    for (const part of this.bossParts) if (part.alive && part.vulnerable()) list.push(part);
    return list;
  }

  lockTick(dt) {
    const p = this.player;
    p.lockT = (p.lockT || 0) + dt;
    if (p.lockT < 0.12) return;
    p.lockT = 0;
    let added = false;
    for (const t of this.targets()) {
      if (p.locks.length >= LOCK_MAX) break;
      if (p.locks.includes(t) || !this.inLockCone(t)) continue;
      p.locks.push(t);
      added = true;
    }
    if (added) {
      if (p.locks.length >= LOCK_MAX) sfx('lockAll'); else sfx('lock');
    }
  }

  inLockCone(t) {
    const p = this.player;
    const dz = p.z - t.pos.z;
    if (dz < 14 || dz > 280) return false;
    const lim = 9 + dz * 0.2;
    const y = this.playerY();
    return Math.abs(t.pos.x - p.x) < lim && Math.abs(t.pos.y - y) < lim * 0.85;
  }

  fireHoming() {
    const p = this.player;
    const y = this.playerY();
    for (const target of p.locks) {
      if (!target.alive) continue;
      const pos = new THREE.Vector3(p.x, y, p.z - 3);
      this.spawnBolt('homing', pos, new THREE.Vector3(0, 0, -150), 2, target);
    }
    sfx('homing');
  }

  detonateBomb() {
    const p = this.player;
    p.bombs--;
    p.bombCd = 0.8;
    sfx('bomb');
    fx.flash(new THREE.Vector3(p.x, this.playerY(), p.z - 20), { color: 0xffffff, intensity: 14, dist: 300, life: 0.9 });
    fx.shock(new THREE.Vector3(p.x, this.playerY(), p.z - 10), { color: 0xfff1a0, maxR: 260, life: 0.9, opacity: 1 });
    this.shake = Math.max(this.shake, 1.2);
    for (const b of this.eBullets) this.root.remove(b.mesh);
    this.eBullets.length = 0;
    for (const t of this.targets()) {
      if (p.z - t.pos.z < -40 || p.z - t.pos.z > 380) continue;
      if (t.kind === 'part') this.hitTarget(t, 15);
      else if (t.isBoss) this.hitTarget(t, 20);
      else if (t.asteroid) this.hitTarget(t, 6);
      else this.hitTarget(t, 999);
    }
  }

  startTransform(mode) {
    this.phase = 'transform';
    this.phaseT = 1.3;
    this.pendingMode = mode;
    this.player.invuln = Math.max(this.player.invuln, 1.6);
    sfx('transform');
    const center = new THREE.Vector3(this.player.x, this.playerY(), this.player.z);
    fx.flash(center, { color: 0x9fe8ff, intensity: 9, dist: 120, life: 0.9 });
    fx.shock(center, { color: 0x9fe8ff, maxR: 40, life: 0.8, opacity: 0.8 });
    fx.burst(center, { count: 40, color: 0xbff4ff, speed: 40, life: 0.8 });
  }

  requestMode(mode) {
    if (this.player.mode === mode) return;
    if (this.phase !== 'play') { this.pending = mode; return; }
    this.startTransform(mode);
  }

  updateTransform(dt) {
    this.phaseT -= dt;
    if (this.phaseT > 0) return;
    const p = this.player;
    p.mode = this.pendingMode;
    p.vy = 0;
    if (p.mode === 'ground') {
      p.y = groundHeight(this.env, p.x, p.z) + 2.4;
      p.rollT = 0;
    } else {
      p.y = Math.max(this.yMin + 4, 8);
    }
    this.phase = 'play';
    if (this.pending && this.pending !== p.mode) { this.startTransform(this.pending); }
    this.pending = null;
    hud.setMode(p.mode);
  }

  updateDead(dt) {
    this.phaseT -= dt;
    if (this.phaseT > 0) return;
    const p = this.player;
    if (p.spares > 0) {
      p.spares--;
      p.shield = 100;
      p.invuln = RESPAWN_INVULN;
      p.vx = 0;
      p.vy = 0;
      p.x = 0;
      p.y = p.mode === 'air' ? 8 : p.y;
      this.phase = 'play';
      this.say('Rook', 'Ace is back in the sky! Keep it up.');
    } else {
      this.failMission();
    }
  }

  failMission() {
    if (this.ending) return;
    this.ending = 'failed';
    this.endT = 2.4;
    hud.banner('MISSION FAILED', 'bad');
    sfx('fail');
  }

  damage(amount) {
    const p = this.player;
    if (this.cheat || this.phase !== 'play' || p.invuln > 0 || p.rollInv > 0) return;
    p.shield -= amount;
    p.damageTaken += amount;
    this.shake = Math.max(this.shake, 0.8);
    hud.hurt();
    sfx('hurt');
    if (p.shield <= 40 && p.shield + amount > 40) this.say('Tig', 'Shields are low, Ace!');
    if (p.shield <= 0) this.loseLife();
  }

  loseLife() {
    const p = this.player;
    p.shield = 0;
    p.livesLost++;
    this.phase = 'dead';
    this.phaseT = 1.8;
    const pos = new THREE.Vector3(p.x, this.playerY(), p.z);
    fx.burst(pos, { count: 70, color: 0xff9a3a, speed: 60, life: 1.2, size: 2 });
    fx.flash(pos, { color: 0xff8a3a, intensity: 10, dist: 150, life: 0.8 });
    sfx('explodeBig');
    this.shake = 2;
    this.playerMesh.visible = false;
    this.landmasterMesh.visible = false;
    if (p.spares <= 0) this.phaseT = 2.2;
  }

  // ---- Wingmen ----------------------------------------------------------

  updateWings(dt) {
    const p = this.player;
    const y = this.playerY();
    for (const w of this.wings) {
      const tx = p.x + w.off[0];
      const ty = y + w.off[1] + (p.mode === 'ground' ? 9 : 0);
      const tz = p.z + w.off[2];
      w.mesh.position.x += (tx - w.mesh.position.x) * damp(dt, 4);
      w.mesh.position.y += (ty - w.mesh.position.y) * damp(dt, 4);
      w.mesh.position.z += (tz - w.mesh.position.z) * damp(dt, 6);
      w.mesh.rotation.set(0, 0, -(tx - w.mesh.position.x) * 0.05);
      w.fireCd -= dt;
      if (w.fireCd <= 0) {
        let best = null;
        let bd = 260;
        for (const t of this.targets()) {
          const dz = p.z - t.pos.z;
          if (dz < 10 || dz > 260) continue;
          const d = t.pos.distanceTo(w.mesh.position);
          if (d < bd) { bd = d; best = t; }
        }
        if (best) {
          const from = w.mesh.position.clone();
          const dir = best.pos.clone().sub(from).normalize().multiplyScalar(210);
          this.spawnBolt('wing', from, dir, 1);
          w.fireCd = rand(0.8, 1.1);
        } else {
          w.fireCd = 0.2;
        }
      }
    }
  }

  // ---- Enemies ----------------------------------------------------------

  spawnEnemy(type, pos, extra = {}) {
    const def = ENEMY[type];
    const mesh = def.make();
    if (def.scale) mesh.scale.setScalar(def.scale);
    mesh.position.copy(pos);
    this.root.add(mesh);
    const e = {
      kind: 'enemy', type, mesh, pos: pos.clone(), alive: true,
      r: def.r, hp: def.hp, score: def.score, t: 0,
      fireCd: rand(0.4, def.fire), def, counts: !!def.counts, ground: !!def.ground,
      head: mesh.userData.head, baseX: pos.x, baseY: pos.y, phase: rand(0, 6),
      pattern: 'line', speed: def.speed || 0,
      ...extra,
    };
    if (e.counts) this.total++;
    this.enemies.push(e);
    return e;
  }

  spawnWave({ type, count, x, y, spacing = 6, pattern = 'line' }) {
    const p = this.player;
    for (let i = 0; i < count; i++) {
      const mid = (count - 1) / 2;
      const off = (i - mid) * spacing;
      let px = x + off;
      let py = y;
      let pz = p.z - (pattern === 'dive' ? 260 : 290);
      if (pattern === 'v') py = y + Math.abs(i - mid) * 2.2;
      if (pattern === 'random') { px += rand(-8, 8); py += rand(-6, 6); }
      this.spawnEnemy(type, new THREE.Vector3(clamp(px, -AIR_X, AIR_X), py, pz), { pattern, amp: rand(10, 16) });
    }
  }

  spawnGround({ type, count, x, spacing = 0 }) {
    const p = this.player;
    for (let i = 0; i < count; i++) {
      const mid = (count - 1) / 2;
      const px = x + (i - mid) * spacing;
      const pz = p.z - 300 - i * 6;
      const py = groundHeight(this.env, px, pz);
      this.spawnEnemy(type, new THREE.Vector3(px, py, pz), { pattern: 'ground' });
    }
  }

  // Trench pillars are placed as the ship approaches, so the scene never holds all of them at once.
  spawnPillarsAhead() {
    while (this.pillarZ > this.player.z - 420 && this.pillarZ > -this.length) {
      for (const side of [-1, 1]) {
        this.spawnEnemy('pillar', new THREE.Vector3(side * 62, -30, this.pillarZ), { pattern: 'fixed' });
      }
      this.pillarZ -= 110;
    }
  }

  aimedBullet(from, speed, dmg = 1, homing = 0) {
    const p = this.player;
    const to = new THREE.Vector3(p.x, this.playerY(), p.z);
    const dir = to.sub(from).normalize().multiplyScalar(speed);
    const mesh = M.makeBolt('enemy');
    mesh.position.copy(from);
    this.root.add(mesh);
    this.eBullets.push({ pos: from.clone(), vel: dir, life: 5, dmg, mesh, homing });
  }

  fanBullets(from, count, spread, speed, dmg = 1) {
    const p = this.player;
    const to = new THREE.Vector3(p.x, this.playerY(), p.z);
    const base = to.sub(from).normalize();
    for (let i = 0; i < count; i++) {
      const a = (i - (count - 1) / 2) * spread;
      const dir = base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), a).multiplyScalar(speed);
      const mesh = M.makeBolt('enemy');
      mesh.position.copy(from);
      this.root.add(mesh);
      this.eBullets.push({ pos: from.clone(), vel: dir, life: 5, dmg, mesh, homing: 0 });
    }
  }

  updateEnemies(dt) {
    const p = this.player;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.t += dt;
      if (e.kind === 'enemy' && e.type === 'gatekeeper') { this.updateGatekeeper(e, dt); continue; }
      if (e.type === 'asteroid') {
        e.pos.addScaledVector(e.vel, dt);
        e.mesh.rotation.x += e.spin.x * dt;
        e.mesh.rotation.y += e.spin.y * dt;
        if (e.pos.z > p.z + 80) this.removeEnemy(e);
        continue;
      }
      if (e.type === 'drone' || e.type === 'bomber') {
        const sp = e.speed;
        e.pos.z += sp * dt;
        if (e.pattern === 'sine') {
          e.pos.x = clamp(e.baseX + Math.sin(e.t * 1.6 + e.phase) * e.amp, -AIR_X, AIR_X);
          e.pos.y = e.baseY + Math.cos(e.t * 1.1 + e.phase) * 2.6;
        } else if (e.pattern === 'dive') {
          const dx = p.x - e.pos.x;
          e.pos.x += clamp(dx, -14 * dt, 14 * dt);
          e.pos.y += clamp(this.playerY() - e.pos.y, -10 * dt, 10 * dt);
        } else if (e.pattern === 'v') {
          e.pos.y = e.baseY + Math.sin(e.t * 2) * 0.8;
        }
        e.mesh.position.copy(e.pos);
        e.mesh.rotation.set(0, 0, Math.sin(e.t * 2 + e.phase) * 0.25);
      } else if (e.type === 'walker') {
        const dx = p.x - e.pos.x;
        e.pos.x += clamp(dx, -e.speed * dt, e.speed * dt);
        e.pos.y = groundHeight(this.env, e.pos.x, e.pos.z);
        e.mesh.position.copy(e.pos);
        e.mesh.rotation.z = Math.sin(e.t * 5) * 0.05;
      } else if (e.type === 'tank') {
        e.pos.z += e.speed * dt;
        e.pos.y = groundHeight(this.env, e.pos.x, e.pos.z);
        e.mesh.position.copy(e.pos);
      }
      if (e.head) {
        const dx = p.x - e.pos.x;
        const dz = p.z - e.pos.z;
        e.head.rotation.y = Math.atan2(dx, dz) + Math.PI;
      }

      // Fire when the player is ahead of the emitter and in range.
      const dz = e.pos.z - p.z;
      if (e.def.fire && dz < -8 && dz > -e.def.range) {
        e.fireCd -= dt;
        if (e.fireCd <= 0) {
          e.fireCd = e.def.fire * rand(0.8, 1.2);
          const from = e.pos.clone();
          from.y += e.ground ? 2.6 : 0;
          if (e.type === 'bomber') this.fanBullets(from, 3, 0.18, 70, 1);
          else if (e.type === 'pillar' || e.type === 'turret' || e.type === 'tank') this.aimedBullet(from, 70, 1);
          else this.aimedBullet(from, 66, 1);
          sfx('laserEnemy');
        }
      }

      if (e.pos.z > p.z + 60) this.removeEnemy(e);

      // Ramming: enemy ships and rocks damage the player on contact.
      if (this.phase === 'play' && e.pos.distanceTo(new THREE.Vector3(p.x, this.playerY(), p.z)) < e.r + 2.4) {
        this.destroyEnemy(e);
        this.damage(e.ground ? 16 : 14);
      }
    }
    if (this.boss) this.updateBoss(dt);
  }

  updateGatekeeper(e, dt) {
    const p = this.player;
    e.pos.x = clamp(Math.sin(e.t * 0.9) * 16, -AIR_X, AIR_X);
    e.pos.y = 10 + Math.sin(e.t * 0.6) * 3;
    e.pos.z = p.z - 200;
    e.mesh.position.copy(e.pos);
    e.mesh.rotation.y = Math.sin(e.t * 0.9) * 0.1;
    const enraged = e.hp <= 15;
    if (enraged && !e.enraged) {
      e.enraged = true;
      this.say('Command', 'Gatekeeper is overheating! Finish it!');
      e.mesh.userData.eye.material.emissive.set(0xff1a1a);
    }
    e.fireCd -= dt;
    if (e.fireCd <= 0) {
      if (enraged) {
        e.fireCd = 1.2;
        for (let i = 0; i < 3; i++) setTimeout(() => { if (!this.finished) this.aimedBullet(e.pos.clone(), 80, 1); }, i * 140);
      } else {
        e.fireCd = 2.2;
        this.fanBullets(e.pos.clone(), 5, 0.22, 66, 1);
      }
      sfx('laserEnemy');
    }
    if (this.phase === 'play' && e.pos.distanceTo(new THREE.Vector3(p.x, this.playerY(), p.z)) < e.r + 2.4) {
      this.damage(20);
    }
  }

  removeEnemy(e) {
    e.alive = false;
    this.root.remove(e.mesh);
    if (e.asteroid) e.mesh.geometry.dispose();
    this.enemies = this.enemies.filter((x) => x !== e);
  }

  destroyEnemy(e) {
    if (!e.alive) return;
    const big = e.type === 'tank' || e.type === 'walker' || e.type === 'bomber' || e.type === 'pillar' || e.asteroid;
    const center = e.pos.clone();
    fx.burst(center, { count: big ? 36 : 22, color: e.asteroid ? 0xbba58a : 0xff8a3a, speed: big ? 40 : 28, life: big ? 0.9 : 0.6, size: big ? 2 : 1.4 });
    fx.shock(center, { color: 0xffdc8a, maxR: big ? 34 : 18, life: 0.5, opacity: 0.8 });
    fx.flash(center, { color: 0xffaa55, intensity: big ? 5 : 2.5, dist: 60, life: 0.4 });
    sfx(big ? 'explodeBig' : 'explode');
    if (e.counts) { this.kills++; this.score += e.score; }
    this.removeEnemy(e);
    if (!e.asteroid && Math.random() < 0.14) this.dropPickup(center);
    if (e.type === 'gatekeeper') this.bossDown();
  }

  hitTarget(t, dmg) {
    if (t.kind === 'part') {
      t.hp -= dmg;
      fx.burst(t.pos, { count: 8, color: 0xffd08a, speed: 18, life: 0.35, size: 0.9 });
      if (t.hp <= 0) this.partDown(t);
      return;
    }
    t.hp -= dmg;
    if (t.hp <= 0) {
      this.destroyEnemy(t);
    } else {
      fx.burst(t.pos, { count: 6, color: 0xffd08a, speed: 16, life: 0.3, size: 0.8 });
      sfx('hit');
    }
  }

  // ---- Bullets & collisions ---------------------------------------------

  updateBullets(dt) {
    const p = this.player;
    const yPos = this.playerY();   // enemy bolts test against the ship centre
    // Player and wingman bolts
    this.pBullets = this.pBullets.filter((b) => {
      if (b.target && !b.target.alive) b.target = null;
      if (b.target) {
        const want = b.target.pos.clone().sub(b.pos).normalize().multiplyScalar(BULLET_SPEED * 0.8);
        b.vel.lerp(want, damp(dt, 5));
      }
      b.pos.addScaledVector(b.vel, dt);
      b.mesh.position.copy(b.pos);
      b.mesh.lookAt(b.pos.clone().add(b.vel));
      b.life -= dt;
      let consumed = false;
      for (const t of this.targets()) {
        if (b.pos.distanceTo(t.pos) < t.r + 1.6) {
          this.hitTarget(t, b.dmg);
          consumed = true;
          break;
        }
      }
      if (consumed || b.life <= 0 || b.pos.z < p.z - 900) {
        this.root.remove(b.mesh);
        return false;
      }
      return true;
    });

    // Enemy bolts
    const pp = new THREE.Vector3(p.x, yPos, p.z);
    this.eBullets = this.eBullets.filter((b) => {
      if (b.homing) {
        const want = pp.clone().sub(b.pos).normalize().multiplyScalar(b.vel.length());
        b.vel.lerp(want, damp(dt, 1.4));
      }
      b.pos.addScaledVector(b.vel, dt);
      b.mesh.position.copy(b.pos);
      b.life -= dt;
      if (this.phase === 'play' && b.pos.distanceTo(pp) < 2.8) {
        this.damage(12 * b.dmg);
        fx.burst(b.pos, { count: 10, color: 0xff4d4d, speed: 20, life: 0.4 });
        this.root.remove(b.mesh);
        return false;
      }
      if (b.life <= 0 || b.pos.z > p.z + 60) {
        this.root.remove(b.mesh);
        return false;
      }
      return true;
    });
  }

  dropPickup(pos) {
    const r = Math.random();
    const kind = r < 0.4 ? 'energy' : r < 0.7 ? 'bomb' : 'laser';
    const mesh = M.makePickup(kind);
    mesh.position.copy(pos);
    this.root.add(mesh);
    this.pickups.push({ kind, pos: pos.clone(), mesh, t: 0 });
  }

  updatePickups(dt) {
    const p = this.player;
    const yPos = this.playerY();
    const pp = new THREE.Vector3(p.x, yPos, p.z);
    this.pickups = this.pickups.filter((k) => {
      k.t += dt;
      k.mesh.rotation.y += dt * 2;
      k.mesh.position.y += Math.sin(k.t * 3) * 0.02;
      if (k.pos.distanceTo(pp) < 22) {
        k.pos.lerp(pp, damp(dt, 6));
        k.mesh.position.copy(k.pos);
      }
      if (k.pos.distanceTo(pp) < 5) {
        if (k.kind === 'energy') p.shield = Math.min(100, p.shield + 30);
        if (k.kind === 'bomb') p.bombs = Math.min(6, p.bombs + 1);
        if (k.kind === 'laser') p.laser = Math.min(3, p.laser + 1);
        hud.toast(k.kind === 'energy' ? 'SHIELD RECHARGED' : k.kind === 'bomb' ? 'BOMB +1' : `LASER LEVEL ${p.laser}`);
        sfx('pickup');
        this.root.remove(k.mesh);
        return false;
      }
      if (k.pos.z > p.z + 60) { this.root.remove(k.mesh); return false; }
      return true;
    });
  }

  // ---- Rings and gates --------------------------------------------------

  addRing({ x, y }) {
    const pos = new THREE.Vector3(x, y, this.player.z - 230);
    const mesh = M.makeRing();
    mesh.position.copy(pos);
    this.root.add(mesh);
    this.rings.push({ pos, mesh, state: 'pending' });
  }

  checkRings() {
    const p = this.player;
    const y = this.playerY();
    for (const r of this.rings) {
      if (r.state !== 'pending' || p.z > r.pos.z) continue;
      // The ship has just crossed the ring plane: pass or miss.
      const inside = Math.abs(p.x - r.pos.x) < 8.5 && Math.abs(y - r.pos.y) < 8.5;
      r.state = inside ? 'passed' : 'missed';
      if (inside) {
        this.ringsPassed++;
        this.score += 250;
        sfx('ring');
        fx.shock(r.pos, { color: 0xffd54a, maxR: 22, life: 0.6, opacity: 1 });
        hud.toast(`RING ${this.ringsPassed} / ${this.ringsTotal}`);
        r.mesh.userData.halo.material.color.set(0x7dff8a);
      } else {
        sfx('back');
        r.mesh.userData.halo.material.color.set(0x667788);
        r.mesh.children.forEach((c) => { if (c.isMesh) c.material = M.MAT.dark(); });
      }
    }
    this.rings = this.rings.filter((r) => {
      if (p.z < r.pos.z - 30 || (r.state !== 'pending' && p.z < r.pos.z - 80)) {
        this.root.remove(r.mesh);
        return false;
      }
      return true;
    });
  }

  addGate({ y }) {
    const z = this.player.z - 240;
    const beam = M.makeBeam(96, 1.1);
    beam.position.set(0, y, z);
    const emitters = [-48, 48].map((x) => {
      const e = M.makeEmitter();
      e.position.set(x, y, z);
      e.rotation.x = Math.PI / 2;
      return e;
    });
    this.root.add(beam, ...emitters);
    this.gates.push({ y, z, beam, emitters, t: 0, crossed: false, on: false, warnedAt: null });
  }

  updateGates(dt) {
    const p = this.player;
    const yPos = this.playerY();
    this.gates = this.gates.filter((g) => {
      g.t += dt;
      const cycle = g.t % 3.2;
      const on = cycle >= 1.4 && cycle < 2.8;
      if (cycle >= 1.0 && cycle < 1.4 && !g.warnedAt) { g.warnedAt = true; sfx('warn'); }
      if (cycle < 1.0) g.warnedAt = false;
      g.on = on;
      g.beam.visible = on || (cycle >= 1.0 && cycle < 1.4 && Math.floor(g.t * 12) % 2 === 0);
      if (!g.crossed && p.z <= g.z && p.z > g.z - 6) {
        g.crossed = true;
        if (on && Math.abs(yPos - g.y) < 3.2 && this.phase === 'play' && p.rollInv <= 0) {
          this.damage(22);
          this.shake = 1.6;
          fx.burst(new THREE.Vector3(p.x, yPos, p.z), { count: 26, color: 0xff3b3b, speed: 30 });
        }
      }
      if (p.z < g.z - 40) {
        this.root.remove(g.beam, ...g.emitters);
        return false;
      }
      return true;
    });
  }

  // ---- Asteroid field ---------------------------------------------------

  updateField(dt) {
    const f = this.field;
    if (!f) return;
    if (this.time > f.until) { this.field = null; return; }
    f.acc += f.rate * dt;
    while (f.acc >= 1) {
      f.acc -= 1;
      this.spawnAsteroid();
    }
  }

  spawnAsteroid() {
    const p = this.player;
    const rad = rand(2.2, 6);
    const seed = Math.random;
    const mesh = M.makeAsteroid(rad, seed);
    const pos = new THREE.Vector3(rand(-40, 40), rand(-6, 34), p.z - rand(200, 260));
    mesh.position.copy(pos);
    this.root.add(mesh);
    const e = {
      kind: 'enemy', type: 'asteroid', asteroid: true, mesh, pos, alive: true,
      r: rad * 0.9, hp: rad > 4 ? 4 : 3, score: 0, t: 0, counts: false, ground: false,
      vel: new THREE.Vector3(rand(-2, 2), rand(-1.2, 1.2), rand(0, 2)),
      spin: new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)),
    };
    this.enemies.push(e);
  }

  // ---- Boss: Gatekeeper is an enemy, Dreadnought uses parts ---------------

  spawnBoss(kind) {
    if (kind === 'gatekeeper') {
      this.spawnEnemy('gatekeeper', new THREE.Vector3(0, 10, this.player.z - 200), { pattern: 'boss', isBoss: true });
      return;
    }
    this.spawnDreadnought();
  }

  bossAlive() {
    if (this.boss) return !this.boss.dead;
    return this.enemies.some((e) => e.type === 'gatekeeper' && e.alive);
  }

  spawnDreadnought() {
    const group = new THREE.Group();
    const hull = M.makeDreadnought();
    group.add(hull);
    const core = M.makeCore();
    core.position.set(0, 0, 17.4);
    const plate = M.makeShieldPlate();
    plate.position.set(0, 0, 18.2);
    group.add(core, plate);
    const turretSpots = [[-8, 3.4, -4], [8, 3.4, -4], [-8, 3.4, 9], [8, 3.4, 9]];
    const turrets = turretSpots.map((s) => {
      const t = M.makeBossTurret();
      t.position.set(...s);
      group.add(t);
      return t;
    });
    group.scale.setScalar(BOSS_SCALE);
    this.root.add(group);
    const B = new THREE.Vector3(0, 7, this.player.z - 200);
    const mkPart = (name, local, r, hp, mesh, vulnerable) => ({
      kind: 'part', name, local, r: r * BOSS_SCALE, hp, maxHp: hp, alive: true, mesh, vulnerable, pos: new THREE.Vector3(), isBoss: true,
    });
    const parts = [];
    turretSpots.forEach((s, i) => parts.push(mkPart('turret' + i, new THREE.Vector3(...s), 3.6, 8, turrets[i], () => true)));
    const plateP = mkPart('plate', new THREE.Vector3(0, 0, 18.2), 7.5, 16, plate, () => true);
    const coreP = mkPart('core', new THREE.Vector3(0, 0, 17.4), 5, 50, core, () => this.bossCoreExposed());
    parts.push(plateP, coreP);
    this.bossParts = parts;
    this.boss = {
      kind: 'boss', group, B, t: 0, phase: 1, dead: false, plate: plateP, core: coreP, turrets: parts.slice(0, 4),
      charge: 0, chargeCd: 6, shotCd: 1.2,
    };
    this.say('Command', 'Dreadnought is charging its weapons. Stay sharp!');
  }

  bossCoreExposed() {
    return this.boss && this.boss.plate && !this.boss.plate.alive;
  }

  partDown(part) {
    part.alive = false;
    part.mesh.visible = false;
    const center = part.pos.clone();
    fx.burst(center, { count: 40, color: 0xffb040, speed: 36, life: 0.9, size: 1.8 });
    fx.shock(center, { color: 0xffe0a0, maxR: 40, life: 0.7, opacity: 0.9 });
    fx.flash(center, { color: 0xffb060, intensity: 7, dist: 90, life: 0.6 });
    sfx('explodeBig');
    if (part.name === 'plate') {
      this.say('Rook', 'Shield plate is down! The core is exposed!');
      this.boss.plate.mesh.visible = false;
      this.boss.phaseStart = this.time;
      this.boss.phase = 2;
    }
    if (part.name === 'core') this.bossDown();
    if (part.name.startsWith('turret') && this.boss.turrets.every((t) => !t.alive)) {
      this.say('Tig', 'All turrets down! Hit the plate now!');
    }
  }

  updateBoss(dt) {
    const b = this.boss;
    if (b.dead) return;
    const p = this.player;
    b.t += dt;
    if (b.core.hp <= 20 && b.phase < 3 && b.plate.alive === false) {
      b.phase = 3;
      this.say('Command', 'Core overloading. Brace for the charge!');
      sfx('warn');
    }
    if (b.phase < 3) {
      b.B.x = 22 * Math.sin(b.t * 0.5);
      b.B.y = 7 + 6 * Math.sin(b.t * 0.8);
      b.B.z = p.z - 200 - 16 * Math.sin(b.t * 0.3);
    } else {
      b.charge = Math.max(0, b.charge - dt);
      b.chargeCd -= dt;
      if (b.charge > 0) {
        b.B.z -= 60 * dt;
      } else {
        b.B.z += (p.z - 200 - b.B.z) * damp(dt, 0.8);
      }
      if (b.chargeCd <= 0) { b.charge = 1.6; b.chargeCd = 7; sfx('warn'); }
      b.B.x = 16 * Math.sin(b.t * 0.9);
      b.B.y = 8 + 4 * Math.sin(b.t * 1.1);
    }
    b.group.position.copy(b.B);
    for (const part of this.bossParts) {
      part.pos.copy(b.B).addScaledVector(part.local, BOSS_SCALE);
    }
    // Attacks
    b.shotCd -= dt;
    const alive = b.turrets.filter((t) => t.alive);
    if (b.phase === 1) {
      if (b.shotCd <= 0) {
        b.shotCd = 1.6;
        for (const t of alive) this.aimedBullet(t.pos.clone(), 68, 1);
        sfx('laserEnemy');
      }
    } else if (b.phase === 2) {
      if (b.shotCd <= 0) {
        b.shotCd = 2.4;
        const from = b.core.pos.clone();
        this.fanBullets(from, 7, 0.16, 70, 1);
        for (const t of alive) this.aimedBullet(t.pos.clone(), 70, 1);
        sfx('laserEnemy');
      }
    } else if (b.phase === 3) {
      if (b.shotCd <= 0) {
        b.shotCd = b.charge > 0 ? 0.3 : 1.1;
        this.fanBullets(b.core.pos.clone(), b.charge > 0 ? 5 : 3, 0.2, 80, 1);
        sfx('laserEnemy');
      }
    }
    if (this.phase === 'play' && b.B.distanceTo(new THREE.Vector3(p.x, this.playerY(), p.z)) < 15 + 2.4) {
      this.damage(18);
    }
  }

  bossDown() {
    if (this.boss && !this.boss.dead) {
      const b = this.boss;
      b.dead = true;
      this.bossParts.forEach((part) => { part.alive = false; part.mesh.visible = false; });
      b.group.visible = false;
      this.score += 5000;
      for (let i = 0; i < 6; i++) {
        setTimeout(() => {
          if (this.finished) return;
          const c = b.B.clone().add(new THREE.Vector3(rand(-12, 12), rand(-4, 4), rand(-14, 14)));
          fx.burst(c, { count: 50, color: 0xff9a3a, speed: 50, life: 1.1, size: 2.2 });
          fx.shock(c, { color: 0xffd08a, maxR: 60, life: 0.8, opacity: 1 });
          fx.flash(c, { color: 0xffb060, intensity: 14, dist: 180, life: 0.9 });
          sfx('explodeBig');
        }, i * 320);
      }
    }
    if (!this.ending) {
      this.ending = 'cleared';
      this.endT = 3.6;
      hud.banner('MISSION COMPLETE', 'good');
      sfx('medal');
    }
  }

  // ---- End of stage ------------------------------------------------------

  checkEnd(dt) {
    if (this.ending) {
      this.endT -= dt;
      if (this.endT <= 0) this.finish(this.ending);
      return;
    }
    const done = Number.isFinite(this.def.duration) && this.time >= this.def.duration;
    if (done && !this.bossAlive() && this.evIdx >= this.events.length) {
      this.ending = 'cleared';
      this.endT = 3.2;
      hud.banner('MISSION COMPLETE', 'good');
      sfx('medal');
    }
  }

  // ---- Presentation -----------------------------------------------------

  syncMeshes() {
    const p = this.player;
    const pm = p.mode === 'air' ? this.playerMesh : this.landmasterMesh;
    this.playerMesh.visible = p.mode === 'air' && this.phase !== 'dead';
    this.landmasterMesh.visible = p.mode === 'ground' && this.phase !== 'dead';
    const y = this.playerY();
    pm.position.set(p.x, y, p.z);
    if (p.mode === 'air') {
      const bank = -0.5 * (p.vx / 40);
      pm.rotation.set(0.25 * (p.vy / 26), 0, bank + p.rollAng);
      const flare = clamp(0.9 + (p.speed - CRUISE) / 40, 0, 2);
      for (const f of pm.userData.flares) f.scale.setScalar(2.2 + 1.8 * flare);
    } else {
      pm.rotation.set(0, 0, -0.15 * (p.vx / 34));
    }
    if (p.invuln > 0 && this.phase === 'play') pm.visible = Math.floor(this.time * 18) % 2 === 0;
    for (const e of this.enemies) {
      if (e.type !== 'gatekeeper') e.mesh.position.copy(e.pos);
    }
    for (const r of this.rings) {
      if (r.state === 'pending') r.mesh.scale.setScalar(1 + Math.sin(this.time * 4) * 0.05);
    }
  }

  // Projects world positions to screen pixels for on-screen target boxes.
  projectToScreen(v) {
    const t = v.clone().project(R.camera);
    if (t.z > 1 || t.z < -1) return null;
    return { x: (t.x + 1) / 2 * innerWidth, y: (1 - t.y) / 2 * innerHeight };
  }

  updateHud() {
    const p = this.player;
    hud.update({
      shield: p.shield,
      spares: p.spares,
      bombs: p.bombs,
      laser: p.laser,
      rings: this.ringsPassed,
      ringsTotal: this.ringsTotal,
      kills: this.kills,
      total: this.total,
      time: this.time,
      durationLeft: Number.isFinite(this.def.duration) ? Math.max(0, this.def.duration - this.time) : null,
      mode: p.mode,
      charging: p.holdT >= LOCK_TIME,
      boss: this.boss && !this.boss.dead ? {
        name: this.boss.phase === 3 ? 'DREADNOUGHT  PHASE III' : this.boss.phase === 2 ? 'DREADNOUGHT  PHASE II' : 'DREADNOUGHT  PHASE I',
        frac: this.boss.phase === 1
          ? (this.boss.plate.alive ? this.boss.plate.hp / this.boss.plate.maxHp : 1)
          : Math.max(0, this.boss.core.hp / this.boss.core.maxHp),
      } : this.enemies.some((e) => e.type === 'gatekeeper' && e.alive) ? {
        name: 'GATEKEEPER',
        frac: this.enemies.find((e) => e.type === 'gatekeeper').hp / 40,
      } : null,
      shieldCritical: p.shield > 0 && p.shield <= 35,
    });
  }
}
