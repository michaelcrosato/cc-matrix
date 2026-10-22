// Core gameplay: player flight (rail + all-range), weapons, damage, level scripting, camera, respawn, scoring.
import * as THREE from 'three/webgpu';
import { Physics, G } from './physics.js';
import { RailWorld, SpaceWorld } from './world.js';
import { Fx } from './fx.js';
import { makeFighter, makePickup, glow, toon } from './models.js';
import { STAGES, SPEAKERS } from './levels.js';
import { settings, DIFF } from './settings.js';
import * as A from './actors.js';

const V = () => new THREE.Vector3();
const _a = V(), _b = V(), _c = V(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

export const RAIL = { base: 58, boost: 108, brake: 26, xMax: 52, yMin: 4, yMax: 74 };
const AR = { base: 62, boost: 118, brake: 28, yaw: 1.55, pitch: 1.25, arena: 1150 };

export class Game {
  constructor(app, stageIndex, opts = {}) {
    this.app = app; this.scene = app.scene; this.camera = app.camera; this.audio = app.audio; this.ui = app.ui;
    this.stageIndex = stageIndex; this.stage = STAGES[stageIndex];
    this.mode = this.stage.mode;
    this.attract = !!opts.attract;
    this.diff = DIFF[settings.difficulty] || DIFF.normal;
    this.carry = opts.carry || null;
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.physics = new Physics(this.mode === 'rail' ? -30 : 0);
    this.fx = new Fx(this.scene);
    this.route = 'A'; this.routeLocked = false;
    this.world = this.mode === 'rail'
      ? new RailWorld(this.scene, this.physics, () => this.route)
      : new SpaceWorld(this.scene, this.physics);
    this.t = 0; this.d = opts.startD || 0; this.speed = this.mode === 'rail' ? RAIL.base : AR.base;
    this.enemies = []; this.shots = []; this.lasers = []; this.pickups = []; this.bombs = []; this.pending = []; this.gates = [];
    this.wingmates = [];
    this.evIdx = 0; this.stepIdx = 0; this.stepWait = null;
    this.hits = 0; this.score = this.carry ? this.carry.score : 0;
    this.lives = this.carry ? this.carry.lives : 3;
    this.phase = 'intro'; this.phaseT = 0;
    this.boss = null; this.result = null;
    this.checkpointD = 0; this.shake = 0; this.slowmo = 1;
    this.comms = []; this.commCur = null;
    this.hintCooldown = 0;
    this.camOverride = null;
    this.stats = { killsWing: 0, rings: 0 };
    this.buildPlayer();
    A.initWingmates(this);
    this.setupLights();
    this.applyStartD(this.d);
    if (opts.skipIntro) { this.phase = 'play'; } else this.beginIntro();
    this.audio.playSong(this.stage.music);
  }

  // ---------------- setup ----------------
  buildPlayer() {
    const f = makeFighter('tod');
    this.root.add(f.root);
    const c = this.carry;
    this.player = {
      model: f, obj: f.root, pos: f.root.position, x: 0, y: 24, vx: 0, vy: 0,
      yaw: 0, pitch: 0, roll: 0, aimYaw: 0, aimPitch: 0, bank: 0,
      shield: c ? c.maxShield : 100, maxShield: c ? c.maxShield : 100, gold: c ? c.gold : 0,
      laser: c ? c.laser : 0, bombs: c ? c.bombs : 3,
      wings: { L: 3, R: 3 }, boostMeter: 1, boostLock: false, inv: 0,
      rollT: 0, rollDir: 1, rollSpin: 0, loop: null, charge: 0, charging: false, lock: null,
      fireCd: 0, dead: false, deadT: 0, scrapeCd: 0, alarmT: 0, fwd: new THREE.Vector3(0, 0, -1), vel: new THREE.Vector3(),
      arYaw: 0, arPitch: 0, arRoll: 0,
    };
    if (c && c.wings) { this.player.wings.L = c.wings.L; this.player.wings.R = c.wings.R; this.applyWingVisual(); }
    // charge orb
    this.chargeOrb = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), glow(0x66ff88, 3));
    this.chargeOrb.visible = false; this.root.add(this.chargeOrb);
  }
  setupLights() {
    const { sun, hemi } = this.app;
    if (this.mode === 'rail') {
      sun.color.setHex(0xfff1dc); sun.intensity = 3.0; hemi.color.setHex(0xcfe8ff); hemi.groundColor.setHex(0x6a7a4a); hemi.intensity = 1.4;
      this.sunDir = new THREE.Vector3(-0.45, 0.8, -0.4).normalize();
    } else {
      sun.color.setHex(0xffe6c8); sun.intensity = 3.2; hemi.color.setHex(0x8a7ad8); hemi.groundColor.setHex(0x20183a); hemi.intensity = 1.1;
      this.sunDir = new THREE.Vector3(0.55, 0.45, -0.7).normalize();
    }
  }
  applyStartD(d) {
    if (this.mode !== 'rail') { this.player.pos.set(0, 0, 400); return; }
    this.d = d;
    while (this.evIdx < this.stage.events.length && this.stage.events[this.evIdx].d < d) this.evIdx++;
    this.player.pos.set(0, 24, -d);
  }
  beginIntro() {
    this.phase = 'intro'; this.phaseT = 0;
    this.ui.banner(`STAGE ${this.stage.id}`, this.stage.name, this.stage.subtitle, 3.2);
    if (this.attract) return;
    if (this.mode === 'allrange') { for (const [who, text] of this.stage.briefing.slice(0, 1)) this.say(who, text); }
  }

  // ---------------- comms & hints ----------------
  say(who, text, opts = {}) {
    if (this.attract && !opts.force) { if (this.comms.length > 1) return; }
    this.comms.push({ who, name: SPEAKERS[who] || who, text: this.ui.glyphs(text), t: opts.dur || Math.max(2.6, text.length * 0.055) });
  }
  hint(text) { if (!settings.hints || this.attract) return; this.ui.hint(this.ui.glyphs(text), 5); }
  updateComms(dt) {
    if (this.commCur) {
      this.commCur.t -= dt;
      if (this.commCur.t <= 0) { this.commCur = null; this.ui.comm(null); }
    }
    if (!this.commCur && this.comms.length) {
      this.commCur = this.comms.shift();
      this.ui.comm(this.commCur);
      this.audio.voice(this.commCur.who, this.commCur.text);
    }
  }

  // ---------------- main update ----------------
  update(dt, ctl) {
    this.ctl = ctl;
    dt *= this.slowmo;
    this.t += dt; this.phaseT += dt;
    if (this.phase === 'intro') this.updateIntro(dt);
    const p = this.player;
    if (!p.dead && this.phase !== 'clear') {
      if (this.mode === 'rail') this.updateRailPlayer(dt, this.phase === 'intro' ? null : ctl);
      else this.updateARPlayer(dt, this.phase === 'intro' ? null : ctl);
      if (this.phase !== 'intro') this.updateWeapons(dt, ctl);
    } else if (p.dead) {
      p.deadT += dt;
      if (this.mode === 'rail') this.d += this.speed * 0.4 * dt;
      if (p.deadT > 2.8) this.afterDeath();
    }
    if (this.phase === 'clear') this.updateClear(dt);
    if (this.mode === 'rail') this.runRailEvents(); else this.runSteps(dt);
    this.updatePending(dt);
    A.updateEnemies(this, dt);
    A.updateWingmates(this, dt);
    if (this.boss) A.updateBoss(this, dt);
    this.updateLasers(dt); this.updateShots(dt); this.updateBombs(dt); this.updatePickups(dt);
    this.physics.step(dt);
    this.world.update(this.d, this.camera.position);
    this.fx.update(dt);
    this.updateComms(dt);
    this.updateCamera(dt);
    this.updateShadow();
    this.hintCooldown -= dt;
  }

  updateIntro(dt) {
    if (this.phaseT > 4.2) { this.phase = 'play'; this.phaseT = 0; if (this.mode === 'rail' && !this.attract) this.say('tod', this.stage.id === 1 ? 'Stuffox team, let\'s unravel \'em!' : 'Okay team, let\'s go!'); }
  }

  // ---------------- player: rail ----------------
  updateRailPlayer(dt, ctl) {
    const p = this.player;
    let lx = 0, ly = 0;
    if (ctl) { lx = ctl.lx; ly = settings.flightY === 'pilot' ? -ctl.ly : ctl.ly; }
    // boost / brake
    let target = RAIL.base;
    const bossHold = this.boss && this.boss.holdRail;
    if (ctl && !p.loop) {
      const wantBoost = ctl.boost > 0.4, wantBrake = ctl.brake > 0.4;
      if ((wantBoost || wantBrake) && !p.boostLock && p.boostMeter > 0) {
        if (!this.boosting && !this.braking) { if (wantBoost) this.audio.boost(); else this.audio.brake(); }
        this.boosting = wantBoost; this.braking = wantBrake && !wantBoost;
        p.boostMeter -= dt / 1.4;
        if (p.boostMeter <= 0) { p.boostMeter = 0; p.boostLock = true; }
      } else { this.boosting = this.braking = false; }
      if (this.boosting) target = RAIL.boost; else if (this.braking) target = RAIL.brake;
      if (ctl.loopPressed && !p.loop && p.rollT <= 0 && p.boostMeter > 0.25 && !p.boostLock) { p.loop = { t: 0, dur: 1.5 }; p.boostMeter -= 0.4; this.audio.boost(); }
    } else if (!ctl) { this.boosting = this.braking = false; }
    if (!this.boosting && !this.braking && !p.loop) {
      p.boostMeter = Math.min(1, p.boostMeter + dt / 2.6);
      if (p.boostLock && p.boostMeter >= 1) p.boostLock = false;
    }
    if (p.loop) target = RAIL.base * 0.35;
    if (bossHold) target = clamp(target, RAIL.base * 0.7, RAIL.base * 1.3);
    this.speed = damp(this.speed, target, 3, dt);
    this.d += this.speed * dt;
    // banking & barrel roll
    const bankL = ctl && ctl.bankL, bankR = ctl && ctl.bankR;
    if (ctl && ctl.rollEvent && p.rollT <= 0 && !p.loop) { p.rollT = 0.62; p.rollDir = ctl.rollEvent; this.audio.roll(); }
    let bankMul = 1, bankTarget = 0;
    if (bankL) { bankTarget = 1.35; if (lx < 0) bankMul = 1.55; }
    if (bankR) { bankTarget = -1.35; if (lx > 0) bankMul = 1.55; }
    p.bank = damp(p.bank, bankTarget, 9, dt);
    // lateral movement
    const tvx = lx * 46 * bankMul, tvy = ly * 38;
    p.vx = damp(p.vx, tvx, 5, dt); p.vy = damp(p.vy, tvy, 5, dt);
    p.x += p.vx * dt; p.y += p.vy * dt;
    const canyon = this.world.zoneAt && this.world.zoneAt(this.d) === 'canyon';
    const xm = canyon ? 48 : RAIL.xMax;
    if (Math.abs(p.x) > xm) { p.x = Math.sign(p.x) * xm; p.vx *= 0.3; }
    const floor = Math.max(this.world.heightAt(p.x, -this.d), -0.5) + 2.6;
    if (p.y < floor) {
      p.y = floor; p.vy = Math.max(p.vy, 8);
      if (p.scrapeCd <= 0) { this.hurt(4, null, 'scrape'); p.scrapeCd = 0.35; this.fx.sparkBurst(_a.set(p.x, floor - 2, -this.d), 12, 'y', 20); }
    }
    p.scrapeCd -= dt;
    if (p.y > RAIL.yMax && !p.loop) { p.y = RAIL.yMax; p.vy = Math.min(p.vy, 0); }
    // somersault loop offsets
    let loopZ = 0, loopY = 0, loopPitch = 0;
    if (p.loop) {
      p.loop.t += dt;
      const th = Math.min(1, p.loop.t / p.loop.dur) * Math.PI * 2, R = 20;
      loopZ = -R * Math.sin(th) * 0.9 + p.loop.t * 0; loopY = R * (1 - Math.cos(th)); loopPitch = th;
      if (p.loop.t >= p.loop.dur) p.loop = null;
    }
    // orientation
    p.aimYaw = damp(p.aimYaw, -lx * 0.42, 7, dt);
    p.aimPitch = damp(p.aimPitch, ly * 0.32, 7, dt);
    if (p.rollT > 0) { p.rollT -= dt; p.rollSpin = (1 - Math.max(0, p.rollT) / 0.62) * Math.PI * 4 * -p.rollDir; } else p.rollSpin = 0;
    p.roll = damp(p.roll, -lx * 0.7, 6, dt);
    p.pos.set(p.x, p.y + loopY, -this.d + loopZ);
    _e.set(p.aimPitch + loopPitch, p.aimYaw, p.roll + p.bank + p.rollSpin, 'YXZ');
    p.obj.quaternion.setFromEuler(_e);
    p.fwd.set(0, 0, -1).applyEuler(_e.set(p.aimPitch + loopPitch, p.aimYaw, 0, 'YXZ'));
    p.vel.set(p.vx, p.vy, -this.speed);
    this.updateShipFx(dt);
    this.playerCollisions(dt);
  }

  // ---------------- player: all-range ----------------
  updateARPlayer(dt, ctl) {
    const p = this.player;
    let lx = 0, ly = 0;
    if (ctl) { lx = ctl.lx; ly = settings.flightY === 'pilot' ? -ctl.ly : ctl.ly; }
    let target = AR.base;
    if (ctl && !p.loop) {
      const wantBoost = ctl.boost > 0.4, wantBrake = ctl.brake > 0.4;
      if (ctl.loopPressed && p.rollT <= 0 && p.boostMeter > 0.25 && !p.boostLock) {
        p.loop = { t: 0, dur: wantBrake ? 1.3 : 1.6, uturn: wantBrake, pitch0: p.arPitch };
        p.boostMeter -= 0.4; this.audio.boost();
      } else if ((wantBoost || wantBrake) && !p.boostLock && p.boostMeter > 0) {
        if (!this.boosting && !this.braking) { if (wantBoost) this.audio.boost(); else this.audio.brake(); }
        this.boosting = wantBoost; this.braking = wantBrake && !wantBoost;
        p.boostMeter -= dt / 1.4; if (p.boostMeter <= 0) { p.boostMeter = 0; p.boostLock = true; }
      } else this.boosting = this.braking = false;
      if (this.boosting) target = AR.boost; else if (this.braking) target = AR.brake;
    }
    if (!this.boosting && !this.braking && !p.loop) { p.boostMeter = Math.min(1, p.boostMeter + dt / 2.6); if (p.boostLock && p.boostMeter >= 1) p.boostLock = false; }
    // auto turn-back at arena edge
    const distC = Math.hypot(p.pos.x, p.pos.y * 1.6, p.pos.z);
    if (distC > AR.arena && !p.loop) {
      _a.copy(p.pos).multiplyScalar(-1).normalize();
      if (_a.dot(p.fwd) < 0.2) {
        p.loop = { t: 0, dur: 1.3, uturn: true, pitch0: p.arPitch };
        if (!this.attract) this.ui.hint('Out of range: turning back to the battle', 2.5);
      }
    }
    this.speed = damp(this.speed, p.loop ? AR.base * 0.8 : target, 3, dt);
    if (ctl && ctl.rollEvent && p.rollT <= 0 && !p.loop) { p.rollT = 0.62; p.rollDir = ctl.rollEvent; this.audio.roll(); }
    const bankL = ctl && ctl.bankL, bankR = ctl && ctl.bankR;
    let turnMul = 1, bankTarget = 0;
    if (bankL) { bankTarget = 1.2; if (lx < 0) turnMul = 1.6; }
    if (bankR) { bankTarget = -1.2; if (lx > 0) turnMul = 1.6; }
    p.bank = damp(p.bank, bankTarget, 8, dt);
    let pitchExtra = 0;
    if (p.loop) {
      p.loop.t += dt;
      const k = Math.min(1, p.loop.t / p.loop.dur);
      pitchExtra = (p.loop.uturn ? Math.PI : Math.PI * 2) * (k * k * (3 - 2 * k));
      if (p.loop.t >= p.loop.dur) {
        if (p.loop.uturn) { p.arYaw += Math.PI; p.arPitch = -p.loop.pitch0; p.arRoll += Math.PI; }
        pitchExtra = 0; p.loop = null;
      }
    } else {
      p.arYaw -= lx * AR.yaw * turnMul * dt;
      p.arPitch = clamp(p.arPitch + ly * AR.pitch * dt, -1.2, 1.2);
      if (Math.abs(ly) < 0.1) p.arPitch = damp(p.arPitch, 0, 0.6, dt);
    }
    p.arRoll = damp(p.arRoll, -lx * 0.9, 5, dt);
    if (p.rollT > 0) { p.rollT -= dt; p.rollSpin = (1 - Math.max(0, p.rollT) / 0.62) * Math.PI * 4 * -p.rollDir; } else p.rollSpin = 0;
    _e.set(p.arPitch + pitchExtra, p.arYaw, p.arRoll + p.bank + p.rollSpin, 'YXZ');
    p.obj.quaternion.setFromEuler(_e);
    p.fwd.set(0, 0, -1).applyEuler(_e.set(p.arPitch + pitchExtra, p.arYaw, 0, 'YXZ'));
    p.vel.copy(p.fwd).multiplyScalar(this.speed);
    p.pos.addScaledVector(p.vel, dt);
    this.d += this.speed * dt;
    this.updateShipFx(dt);
    this.playerCollisions(dt);
  }

  updateShipFx(dt) {
    const p = this.player, m = p.model;
    const fl = this.boosting ? 2.2 : this.braking ? 0.45 : 1;
    m.flame.scale.set(1, damp(m.flame.scale.y, fl * (0.9 + Math.random() * 0.2), 12, dt), 1);
    m.head.rotation.y = Math.sin(this.t * 1.3) * 0.25 + (this.ctl ? -this.ctl.lx * 0.3 : 0);
    p.inv -= dt;
    p.obj.visible = !(p.inv > 0 && Math.floor(this.t * 20) % 2 === 0);
    if (p.shield < 30 && !p.dead) {
      if (Math.random() < dt * 8) this.fx.smoke(p.pos, 1.2);
      p.alarmT -= dt; if (p.alarmT <= 0 && !this.attract) { this.audio.alarm(); p.alarmT = 1.2; }
    }
  }

  playerCollisions() {
    const p = this.player;
    let hit = null;
    this.physics.overlapSphere(p.pos, 2.4, G.STATIC | G.HAZARD, (d, c) => { hit = { d, c }; return false; });
    if (hit) {
      // always push out of scenery; only deal damage when not invulnerable
      const ct = hit.c.translation();
      if (this.mode === 'rail') {
        const sx = Math.sign(p.x - ct.x) || 1;
        p.vx = sx * 40; p.x += sx * 3; p.vy += 10;
      } else {
        _a.set(p.pos.x - ct.x, p.pos.y - ct.y, p.pos.z - ct.z).normalize();
        p.pos.addScaledVector(_a, 3).addScaledVector(p.fwd, -6);
        if (hit.d && hit.d.rec) hit.d.rec.body.applyImpulse({ x: -_a.x * 2000, y: -_a.y * 2000, z: -_a.z * 2000 }, true);
        if (!p.loop) p.loop = { t: 0, dur: 1.3, uturn: true, pitch0: p.arPitch };
      }
      if (p.inv <= 0) { this.hurt(12, null, 'crash'); this.damageWing(Math.random() < 0.5 ? 'L' : 'R'); }
    }
    if (p.inv > 0) return;
    // ram into the walking boss body
    const b = this.boss;
    if (b && !b.gone && b.bodyPos && b.bodyPos.distanceTo(p.pos) < b.bodyR + 2) {
      this.hurt(14, b.bodyPos, 'ram');
      if (this.mode === 'rail') { p.vy = 30; p.vx = (Math.sign(p.x - b.bodyPos.x) || 1) * 40; }
      return;
    }
    // collide with enemy bodies
    for (const e of this.enemies) {
      if (e.dead || e.noCollide) continue;
      const r = e.r + 2;
      if ((e.aimPos || e.obj.position).distanceToSquared(p.pos) < r * r) {
        this.hurt(e.boss ? 14 : 10, e.obj.position, 'ram');
        if (!e.boss && e.type !== 'pillar') A.damageEnemy(this, e, 99, 'ram');
        break;
      }
    }
  }

  damageWing(side) {
    if (this.attract) return;
    const p = this.player;
    if (p.wings[side] <= 0) return;
    p.wings[side]--;
    if (p.wings[side] <= 0) {
      const w = p.model.wings[side];
      w.getWorldPosition(_a); w.getWorldQuaternion(_q);
      const debris = new THREE.Group(); debris.position.copy(_a); debris.quaternion.copy(_q);
      for (const ch of [...w.children]) debris.add(ch.clone());
      this.root.add(debris); w.visible = false;
      this.physics.addDynamic(debris, { type: 'box', x: 1.6, y: 0.2, z: 0.8, ox: 1.6 * (side === 'L' ? -1 : 1) }, {
        vel: { x: (side === 'L' ? -15 : 15), y: 10, z: this.mode === 'rail' ? -this.speed * 0.6 : 0 }, ang: { x: 3, y: 2, z: 6 }, life: 4,
        onExpire: () => this.root.remove(debris),
      });
      this.fx.explosion(_a, 0.6, { fluff: true });
      this.say(side === 'L' ? 'bramble' : 'pippa', side === 'L' ? 'Your left wing\'s torn off! Twin lasers are down!' : 'Your right wing is gone! Find a wing repair!');
      if (p.laser > 0) p.laser = 0;
    }
  }
  applyWingVisual() {
    const p = this.player;
    p.model.wings.L.visible = p.wings.L > 0; p.model.wings.R.visible = p.wings.R > 0;
  }

  hurt(amount, src, kind) {
    const p = this.player;
    if (p.dead || p.inv > 0 || this.phase === 'clear' || this.phase === 'intro') return;
    if (this.attract) { this.fx.sparkBurst(p.pos, 6, 'w', 14); return; }
    p.shield -= amount * this.diff.dmgTaken;
    p.inv = kind === 'scrape' ? 0.25 : 0.9;
    this.shake = Math.min(1.2, this.shake + amount / 14);
    this.audio.damage();
    this.app.input.rumble(0.9, 0.6, 180);
    this.fx.fluff(p.pos, 6);
    this.fx.sparkBurst(p.pos, 10, 'w', 18);
    this.ui.damageFlash();
    if (kind !== 'scrape' && Math.random() < 0.25) this.damageWing(Math.random() < 0.5 ? 'L' : 'R');
    if (p.shield <= 0) this.killPlayer();
  }
  heal(amount) { const p = this.player; p.shield = Math.min(p.maxShield, p.shield + amount); }

  killPlayer() {
    const p = this.player;
    p.shield = 0; p.dead = true; p.deadT = 0;
    this.fx.explosion(p.pos, 2.2, { fluff: true });
    this.fx.fluff(p.pos, 30);
    this.audio.explode(2); this.audio.chargeStop();
    p.obj.visible = false;
    this.app.input.rumble(1, 1, 500);
    this.say('bramble', 'TOD! No...!', { dur: 2.4 });
  }
  afterDeath() {
    const p = this.player;
    this.lives--;
    if (this.lives < 0) { this.result = { type: 'gameover' }; return; }
    // respawn
    p.dead = false; p.shield = p.maxShield; p.inv = 2.5; p.laser = 0; p.bombs = Math.max(p.bombs, 3);
    p.wings.L = 3; p.wings.R = 3; this.applyWingVisual();
    p.boostMeter = 1; p.boostLock = false; p.loop = null; p.charge = 0; p.lock = null;
    p.obj.visible = true;
    if (this.mode === 'rail') {
      if (!this.boss) {
        for (const e of this.enemies) A.removeEnemy(this, e);
        this.enemies.length = 0; this.pending.length = 0;
        for (const s of this.shots) this.root.remove(s.mesh); this.shots.length = 0;
        for (const pk of this.pickups) this.root.remove(pk.obj); this.pickups.length = 0;
        this.evIdx = 0;
        for (const gt of this.pickups) this.root.remove(gt.obj);
        if (this.checkpointD < 3400 && this.route === 'B') {
          // respawning before the branch: the canyon route has to be earned again
          this.route = 'A';
          for (const [i, c] of [...this.world.chunks]) if (i * 200 >= 3400) this.world.disposeChunk(i, c);
        }
        if (this.checkpointD < 3400) { this.routeLocked = false; this.gatesLit = 0; }
        this.applyStartD(this.checkpointD);
        for (const w of this.wingmates) A.endTrouble(this, w, true);
      }
      p.x = 0; p.y = 26; p.vx = p.vy = 0;
      this.phase = this.boss ? 'play' : 'intro'; this.phaseT = 2.4;
      this.ui.banner('', 'TRY AGAIN', `${Math.max(0, this.lives)} ${this.lives === 1 ? 'life' : 'lives'} left`, 2);
    } else {
      p.pos.set(0, 0, 500); p.arYaw = 0; p.arPitch = 0;
      this.ui.banner('', 'TRY AGAIN', `${Math.max(0, this.lives)} ${this.lives === 1 ? 'life' : 'lives'} left`, 2);
    }
  }

  // ---------------- weapons ----------------
  laserLevel() { const p = this.player; return (p.wings.L <= 0 || p.wings.R <= 0) ? 0 : p.laser; }
  updateWeapons(dt, ctl) {
    const p = this.player;
    p.fireCd -= dt;
    if (ctl.firePressed) { this.fireLaser(); p.holdT = 0; }
    if (ctl.fire) {
      p.holdT = (p.holdT || 0) + dt;
      if (ctl.autoFire && p.fireCd <= 0) this.fireLaser();
      if (p.holdT > 0.32) {
        if (!p.charging) { p.charging = true; this.audio.chargeStart(); }
        p.charge = Math.min(1, p.charge + dt / 0.55);
        if (p.charge >= 1) this.updateLock();
      }
    }
    if (ctl.fireReleased || (!ctl.fire && p.charging)) {
      if (p.charging) {
        this.audio.chargeStop();
        if (p.charge >= 1) this.fireCharged();
      }
      p.charging = false; p.charge = 0; p.lock = null;
    }
    if (p.lock && (p.lock.dead || p.lock.lockable === false)) p.lock = null;
    // charge orb visual
    if (p.charging && p.charge > 0.1) {
      this.chargeOrb.visible = true;
      this.chargeOrb.position.copy(p.pos).addScaledVector(p.fwd, 5);
      const s = 0.4 + p.charge * 1.2 + (p.charge >= 1 ? Math.sin(this.t * 30) * 0.15 : 0);
      this.chargeOrb.scale.setScalar(s);
      this.chargeOrb.material = p.lock ? glow(0xff5566, 3) : glow(0x66ff88, 3);
    } else this.chargeOrb.visible = false;
    if (ctl.bombPressed) {
      const live = this.bombs.find((b) => !b.done);
      if (live) this.detonateBomb(live);
      else if (p.bombs > 0) this.launchBomb();
    }
  }
  updateLock() {
    const p = this.player;
    if (p.lock && !p.lock.dead) return;
    let best = null, bestScore = Infinity;
    for (const e of this.enemies) {
      if (e.dead || e.lockable === false || !e.obj.visible) continue;
      _a.copy(e.aimPos || e.obj.position).sub(p.pos);
      const dist = _a.length(); if (dist > 420 || dist < 8) continue;
      const ang = Math.acos(clamp(_a.dot(p.fwd) / dist, -1, 1));
      if (ang > 0.22) continue;
      const sc = ang * 400 + dist * 0.2;
      if (sc < bestScore) { bestScore = sc; best = e; }
    }
    if (best) { p.lock = best; this.audio.lock(); }
  }
  fireLaser() {
    const p = this.player;
    const lvl = this.laserLevel();
    p.fireCd = 0.11;
    this.audio.laser(lvl);
    const offs = lvl === 0 ? [[0, 0, -3.4]] : [[-2.6, -0.1, -0.6], [2.6, -0.1, -0.6]];
    for (const o of offs) {
      _a.set(o[0], o[1], o[2]).applyQuaternion(p.obj.quaternion).add(p.pos);
      this.spawnLaser(_a, p.fwd, lvl, 'player');
    }
  }
  spawnLaser(pos, dir, lvl, owner) {
    const geo = this._laserGeo ||= new THREE.CapsuleGeometry(0.22, 4.2, 3, 6).rotateX(Math.PI / 2);
    const mat = owner === 'player' ? (lvl >= 2 ? glow(0x66aaff, 5) : glow(0x5cff7a, 4.5)) : glow(0xffe066, 3.5);
    const m = new THREE.Mesh(geo, mat);
    if (lvl >= 2) m.scale.set(1.8, 1.8, 1.3);
    m.position.copy(pos);
    const vel = new THREE.Vector3().copy(dir).multiplyScalar(520);
    if (this.mode === 'rail') vel.z -= this.speed; else vel.addScaledVector(this.player.fwd, this.speed * 0.5);
    m.lookAt(_b.copy(pos).add(vel));
    this.root.add(m);
    this.lasers.push({ mesh: m, pos: m.position, vel, life: 0.85, dmg: lvl >= 2 ? 2 : 1, owner, kind: 'laser' });
  }
  fireCharged() {
    const p = this.player;
    this.audio.chargeShot();
    const m = new THREE.Mesh(new THREE.SphereGeometry(1.6, 14, 10), p.lock ? glow(0xff5566, 4) : glow(0x66ff88, 4));
    m.position.copy(p.pos).addScaledVector(p.fwd, 5);
    this.root.add(m);
    const vel = new THREE.Vector3().copy(p.fwd).multiplyScalar(260);
    if (this.mode === 'rail') vel.z -= this.speed;
    this.lasers.push({ mesh: m, pos: m.position, vel, life: 2.2, dmg: 6, owner: 'player', kind: 'charge', target: p.lock });
  }
  launchBomb() {
    const p = this.player;
    p.bombs--;
    this.audio.bombLaunch();
    const m = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8), toon(0xd63c3c)); m.add(core);
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 6), glow(0xffcc33, 4)); fl.position.z = 1.2; m.add(fl);
    m.position.copy(p.pos).addScaledVector(p.fwd, 4);
    this.root.add(m);
    const vel = new THREE.Vector3().copy(p.fwd).multiplyScalar(200);
    if (this.mode === 'rail') vel.z -= this.speed;
    this.bombs.push({ obj: m, pos: m.position, vel, t: 0, done: false, target: p.lock });
    this.hint('Press {bomb} again to detonate early');
  }
  detonateBomb(b) {
    if (b.done) return;
    b.done = true; this.root.remove(b.obj);
    this.audio.bomb(); this.app.input.rumble(1, 0.8, 400);
    this.ui.bombFlash();
    this.fx.explosion(b.pos, 4, { light: 0xff6644, ringColor: 0xff8844 });
    for (let i = 0; i < 3; i++) this.fx.ring(b.pos, 30 + i * 12);
    this.shake = Math.min(1.5, this.shake + 0.6);
    const R = 48;
    let kills = 0;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const dd = (e.aimPos || e.obj.position).distanceTo(b.pos);
      if (dd < R + e.r) { if (A.damageEnemy(this, e, 18, 'bomb')) kills++; }
    }
    if (this.boss) A.bossSplash(this, b.pos, R, 10);
    for (const s of this.shots) if (s.pos.distanceTo(b.pos) < R) s.life = 0;
    if (this.mode === 'allrange') for (const a of this.world.asteroids) {
      const t = a.body.translation(); _a.set(t.x - b.pos.x, t.y - b.pos.y, t.z - b.pos.z);
      const l = _a.length(); if (l < R * 1.5) { _a.normalize().multiplyScalar(8000 / Math.max(10, l)); a.body.applyImpulse({ x: _a.x * a.size, y: _a.y * a.size, z: _a.z * a.size }, true); }
    }
    if (kills > 1) this.bonus(kills - 1, b.pos);
  }
  bonus(n, pos) {
    this.hits += n; this.score += n * 100;
    this.ui.popup(`+${n} BONUS`, pos, '#ffd34d');
  }
  updateBombs(dt) {
    for (const b of this.bombs) {
      if (b.done) continue;
      b.t += dt;
      if (b.target && !b.target.dead) {
        _a.copy(b.target.aimPos || b.target.obj.position).sub(b.pos).normalize().multiplyScalar(220);
        if (this.mode === 'rail') _a.z -= this.speed;
        b.vel.lerp(_a, 1 - Math.exp(-dt * 4));
      }
      b.pos.addScaledVector(b.vel, dt);
      b.obj.rotation.z += dt * 8;
      if (b.target && !b.target.dead && b.pos.distanceTo(b.target.aimPos || b.target.obj.position) < b.target.r + 3) this.detonateBomb(b);
      if (b.t > 1.1) this.detonateBomb(b);
      if (this.mode === 'rail' && b.pos.y < this.world.heightAt(b.pos.x, b.pos.z) + 1) this.detonateBomb(b);
    }
    this.bombs = this.bombs.filter((b) => !b.done);
  }
  updateLasers(dt) {
    const exclude = (d) => d.kind === 'wing' && d.w && d.w.ignoreFriendly;
    for (const l of this.lasers) {
      if (l.life <= 0) continue;
      l.life -= dt;
      if (l.kind === 'charge' && l.target && !l.target.dead) {
        _a.copy(l.target.aimPos || l.target.obj.position).sub(l.pos).normalize().multiplyScalar(300);
        if (this.mode === 'rail') _a.z -= this.speed;
        l.vel.lerp(_a, 1 - Math.exp(-dt * 6));
      }
      const len = l.vel.length() * dt;
      _a.copy(l.vel).normalize();
      const hit = this.physics.raySegment(l.pos, _a, len + (l.kind === 'charge' ? 1.5 : 0), G.ACTOR | G.STATIC | G.HAZARD,
        l.owner === 'wing' ? (d) => d.kind === 'wing' : exclude);
      if (hit) {
        const hp = _b.copy(l.pos).addScaledVector(_a, hit.toi);
        this.laserHit(l, hit.data, hp);
        l.life = 0;
      } else {
        l.pos.addScaledVector(l.vel, dt);
        if (l.kind === 'charge') {
          l.mesh.rotation.y += dt * 10;
          if (this.mode === 'rail' && l.pos.y < this.world.heightAt(l.pos.x, l.pos.z)) { this.chargeBlast(l, l.pos); l.life = 0; }
          if (l.life <= 0) this.chargeBlast(l, l.pos);
        }
      }
      if (l.life <= 0) this.root.remove(l.mesh);
    }
    this.lasers = this.lasers.filter((l) => l.life > 0);
  }
  laserHit(l, data, pos) {
    if (l.kind === 'charge') { this.chargeBlast(l, pos); return; }
    if (!data) return;
    if (data.kind === 'enemy') {
      const e = data.e;
      if (e.armor && !data.part) { this.fx.sparkBurst(pos, 5, 'w', 16); this.audio.hit(); return; }
      A.damageEnemy(this, e, l.dmg, l.owner === 'player' ? 'laser' : 'wing', data.part, pos);
      this.fx.sparkBurst(pos, 6, 'y', 18);
    } else if (data.kind === 'bossArmor') {
      this.fx.sparkBurst(pos, 5, 'w', 16); this.audio.hit();
    } else if (data.kind === 'wing') {
      if (l.owner === 'player') A.friendlyFire(this, data.w);
      this.fx.sparkBurst(pos, 4, 'g', 10);
    } else if (data.kind === 'asteroid') {
      const rec = data.rec;
      _c.copy(l.vel).normalize().multiplyScalar(140 * rec.size);
      rec.body.applyImpulseAtPoint({ x: _c.x, y: _c.y, z: _c.z }, { x: pos.x, y: pos.y, z: pos.z }, true);
      this.fx.sparkBurst(pos, 5, 'y', 12);
      A.damageAsteroid(this, rec, l.dmg, l.owner === 'player');
    } else {
      this.fx.sparkBurst(pos, 4, 'y', 10);
    }
  }
  chargeBlast(l, pos) {
    this.fx.explosion(pos, 1.6, { light: 0x66ff88, color: 'g', ringColor: 0x66ff88 });
    this.audio.explode(1.2);
    let kills = 0;
    const R = 22;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if ((e.aimPos || e.obj.position).distanceTo(pos) < R + e.r) { if (A.damageEnemy(this, e, l.dmg, 'charge')) kills++; }
    }
    if (this.boss) A.bossSplash(this, pos, R, 4);
    if (kills > 1) this.bonus(kills - 1, pos);
  }

  // ---------------- enemy shots ----------------
  enemyFire(from, targetPos, speed = 120, spread = 0, opts = {}) {
    if (this.player.dead) return;
    _a.copy(targetPos);
    const tof = from.distanceTo(targetPos) / speed;
    if (opts.lead !== false) _a.addScaledVector(this.player.vel, tof * 0.9);
    _a.sub(from).normalize();
    if (spread) { _a.x += (Math.random() - 0.5) * spread; _a.y += (Math.random() - 0.5) * spread; _a.normalize(); }
    this.spawnShot(from, _a.multiplyScalar(speed), opts);
  }
  spawnShot(from, vel, opts = {}) {
    const geo = this._shotGeo ||= new THREE.IcosahedronGeometry(1, 1);
    const m = new THREE.Mesh(geo, glow(opts.color || 0xff7a3a, 3.5));
    m.scale.setScalar(opts.size || 1.1);
    m.position.copy(from);
    this.root.add(m);
    this.shots.push({ mesh: m, pos: m.position, vel: vel.clone(), life: opts.life || 4, dmg: (opts.dmg || 8), deflected: false, r: (opts.size || 1.1) + 1.8 });
    if (Math.random() < 0.5) this.audio.enemyShot();
  }
  updateShots(dt) {
    const p = this.player;
    for (const s of this.shots) {
      if (s.life <= 0) continue;
      s.life -= dt;
      const prev = _c.copy(s.pos);
      s.pos.addScaledVector(s.vel, dt);
      s.mesh.rotation.x += dt * 6;
      if (s.deflected) {
        const len = s.vel.length() * dt;
        _a.copy(s.vel).normalize();
        const hit = this.physics.raySegment(prev, _a, len, G.ACTOR | G.STATIC, (d) => d.kind === 'wing');
        if (hit) {
          if (hit.data && hit.data.kind === 'enemy') A.damageEnemy(this, hit.data.e, 3, 'deflect', hit.data.part, s.pos);
          this.fx.sparkBurst(s.pos, 8, 'y', 18); s.life = 0;
        }
      } else if (!p.dead) {
        // segment-sphere test vs player
        _a.copy(s.pos).sub(prev); const segLen = _a.length();
        _b.copy(p.pos).sub(prev);
        const tt = segLen > 0 ? clamp(_b.dot(_a) / (segLen * segLen), 0, 1) : 0;
        _b.copy(prev).addScaledVector(_a, tt);
        if (_b.distanceToSquared(p.pos) < s.r * s.r) {
          if (p.rollT > 0) {
            // barrel roll deflect
            s.deflected = true; s.life = 2;
            const tgt = A.nearestEnemy(this, s.pos, 400);
            if (tgt) s.vel.copy(tgt.aimPos || tgt.obj.position).sub(s.pos).normalize().multiplyScalar(260);
            else s.vel.multiplyScalar(-1.6);
            s.mesh.material = glow(0x88ffcc, 4);
            this.audio.deflect(); this.fx.sparkBurst(s.pos, 6, 'g', 14);
          } else { this.hurt(s.dmg, s.pos, 'shot'); s.life = 0; this.fx.sparkBurst(s.pos, 6, 'r', 14); }
        }
      }
      // wingmate hits
      if (s.life > 0 && !s.deflected) for (const w of this.wingmates) {
        if (!w.active || w.ignoreFriendly) continue;
        if (w.pos.distanceToSquared(s.pos) < 9) { A.hurtWingmate(this, w, s.dmg * 0.6); s.life = 0; break; }
      }
      if (s.life <= 0) this.root.remove(s.mesh);
    }
    this.shots = this.shots.filter((s) => s.life > 0);
  }

  // ---------------- pickups ----------------
  addPickup(kind, pos, opts = {}) {
    const pk = makePickup(kind);
    pk.root.position.copy(pos);
    if (kind === 'checkpoint') pk.root.scale.setScalar(1);
    this.root.add(pk.root);
    const rec = { kind, obj: pk.root, parts: pk.parts, pos: pk.root.position, r: kind === 'checkpoint' ? 11 : kind === 'gate' ? 9.5 : 5, t: 0, taken: false, drift: opts.drift };
    this.pickups.push(rec);
    return rec;
  }
  updatePickups(dt) {
    const p = this.player;
    for (const pk of this.pickups) {
      if (pk.taken) continue;
      pk.t += dt;
      if (pk.parts.spin) pk.parts.spin.rotation.y += dt * (pk.kind === 'gate' ? 0.6 : 2.4);
      if (pk.kind !== 'gate' && pk.kind !== 'checkpoint' && pk.kind !== 'silver' && pk.kind !== 'gold') pk.obj.position.y += Math.sin(pk.t * 3) * dt * 2;
      if (this.mode === 'allrange') pk.obj.lookAt(p.pos);
      if (p.dead) continue;
      const dz = pk.pos.z - p.pos.z;
      let inside;
      if (this.mode === 'rail' && (pk.kind === 'gate' || pk.kind === 'checkpoint' || pk.kind === 'silver' || pk.kind === 'gold')) {
        inside = Math.abs(dz) < 4 && Math.hypot(pk.pos.x - p.pos.x, pk.pos.y - p.pos.y) < pk.r;
      } else inside = pk.pos.distanceTo(p.pos) < pk.r + 2.5;
      if (inside) this.collect(pk);
      if (this.mode === 'rail' && pk.pos.z > p.pos.z + 60) { pk.taken = true; this.root.remove(pk.obj); if (pk.kind === 'gate' && !pk.lit) this.gateMissed(pk); }
    }
    this.pickups = this.pickups.filter((x) => !x.taken);
  }
  collect(pk) {
    const p = this.player;
    if (pk.kind === 'gate') {
      if (pk.lit) return;
      pk.lit = true; pk.parts.lit.visible = true; this.audio.ring(true);
      this.gatesLit = (this.gatesLit || 0) + 1;
      this.ui.popup(`GATE ${this.gatesLit}/${this.gatesTotal}`, pk.pos, '#ffb04d');
      if (this.gatesLit === this.gatesTotal) this.setRoute('B');
      return;
    }
    pk.taken = true; this.root.remove(pk.obj);
    switch (pk.kind) {
      case 'silver': this.heal(p.maxShield * 0.3); this.audio.ring(false); this.ui.popup('SHIELD +', pk.pos, '#d8e6f0'); this.stats.rings++; break;
      case 'gold':
        this.heal(p.maxShield * 0.5); this.audio.ring(true); p.gold++; this.stats.rings++;
        if (p.gold === 3) { p.maxShield = 150; p.shield = Math.min(p.shield + 50, p.maxShield); this.ui.popup('MAX SHIELD UP!', pk.pos, '#ffd34d'); }
        else if (p.gold >= 6) { p.gold = 0; this.lives++; this.ui.popup('1UP!', pk.pos, '#ffd34d'); this.audio.powerup(); }
        else this.ui.popup(`GOLD ${p.gold}/3`, pk.pos, '#ffd34d');
        break;
      case 'laser':
        if (p.wings.L <= 0 || p.wings.R <= 0) { p.wings.L = p.wings.R = 3; this.applyWingVisual(); }
        p.laser = Math.min(2, p.laser + 1); this.audio.powerup();
        this.ui.popup(p.laser === 1 ? 'TWIN LASERS!' : 'HYPER LASERS!', pk.pos, '#66ff88');
        if (!this.attract) this.say('gizmo', p.laser === 1 ? 'Twin lasers online!' : 'Hyper lasers! Now we\'re cooking!');
        break;
      case 'bomb': p.bombs = Math.min(9, p.bombs + 1); this.audio.powerup(); this.ui.popup('PLUSH BOMB +1', pk.pos, '#ff7a6a'); break;
      case 'wing': p.wings.L = p.wings.R = 3; this.applyWingVisual(); this.heal(20); this.audio.powerup(); this.ui.popup('WINGS REPAIRED', pk.pos, '#66aaff'); break;
      case 'checkpoint':
        this.checkpointD = this.d - 40; this.heal(p.maxShield * 0.5); this.audio.checkpoint();
        this.ui.banner('', 'CHECKPOINT', 'Progress saved', 1.8);
        break;
    }
  }
  gateMissed() {
    if (this.routeLocked) return;
    this.routeLocked = true;
    if (!this.attract) this.say('gizmo', 'Missed a gate. Ah well, straight on to Thimble City!');
  }
  setRoute(r) {
    if (this.routeLocked) return;
    this.routeLocked = true;
    this.route = r;
    if (r === 'B' && this.world.chunks) {
      for (const [i, c] of [...this.world.chunks]) if (i * 200 >= 3400) this.world.disposeChunk(i, c);
      this.ui.banner('', 'ROUTE CHANGE', 'Hem Canyon', 2);
      this.audio.checkpoint();
    }
  }

  // ---------------- level scripting ----------------
  runRailEvents() {
    const ev = this.stage.events;
    if (this.phase === 'intro' && this.phaseT < 2) return;
    while (this.evIdx < ev.length && ev[this.evIdx].d <= this.d) {
      const e = ev[this.evIdx++];
      if (e.route && e.route !== this.route) continue;
      this.exec(e);
    }
  }
  exec(e) {
    switch (e.do) {
      case 'comm': if (!this.attract || e.who === 'pippa') this.say(e.who, e.text); break;
      case 'hint': this.hint(e.text); break;
      case 'spawnGroup': for (const s of e.list) this.pending.push({ t: s.delay || 0, spec: s }); break;
      case 'pickup': this.addPickup(e.kind, new THREE.Vector3(e.x, e.y, -(this.d + 380))); break;
      case 'checkpoint': this.addPickup('checkpoint', new THREE.Vector3(e.x, e.y, -(this.d + 380))); break;
      case 'gates':
        this.gatesTotal = e.list.length; this.gatesLit = 0;
        for (const [x, y, dd] of e.list) this.addPickup('gate', new THREE.Vector3(x, y, -dd));
        break;
      case 'pillar': A.spawnPillar(this, e.x, -(this.d + 470)); break;
      case 'trouble': A.startTrouble(this, e.who, e); break;
      case 'music': this.audio.playSong(e.track); break;
      case 'warning': this.ui.banner('', 'WARNING', 'Massive tin signature approaching', 2.6, 'warn'); this.audio.warning(); break;
      case 'boss': A.spawnBoss(this, e.boss); break;
      default: break;
    }
  }
  updatePending(dt) {
    for (const pd of this.pending) {
      pd.t -= dt;
      if (pd.t <= 0) { A.spawnEnemy(this, pd.spec); pd.done = true; }
    }
    this.pending = this.pending.filter((x) => !x.done);
  }
  runSteps(dt) {
    if (this.phase === 'intro' || this.phase === 'clear') return;
    const steps = this.stage.steps;
    if (this.stepWait) {
      const w = this.stepWait;
      w.t += dt;
      let done = false;
      if (w.type === 'time') done = w.t >= w.dur;
      else if (w.type === 'clear') { const alive = this.enemies.filter((e) => !e.dead && e.countsForClear).length; done = alive <= w.total * (1 - w.frac) || w.t > w.max; }
      else if (w.type === 'aces') done = !this.enemies.some((e) => !e.dead && e.ace);
      if (!done) return;
      this.stepWait = null;
    }
    while (this.stepIdx < steps.length && !this.stepWait) {
      const s = steps[this.stepIdx++];
      switch (s.do) {
        case 'comm': if (!this.attract) this.say(s.who, s.text); break;
        case 'hint': this.hint(s.text); break;
        case 'spawnAR': for (let i = 0; i < s.n; i++) A.spawnAR(this, s.type, s.radius, s); break;
        case 'pickupAR':
          for (let i = 0; i < s.n; i++) {
            const a = Math.random() * Math.PI * 2, r = 150 + Math.random() * 500;
            this.addPickup(s.kind, new THREE.Vector3(Math.cos(a) * r, (Math.random() - 0.5) * 160, Math.sin(a) * r));
          }
          break;
        case 'wait': this.stepWait = { type: 'time', t: 0, dur: s.t }; break;
        case 'waitClear': this.stepWait = { type: 'clear', t: 0, frac: s.frac, max: s.max, total: Math.max(1, this.enemies.filter((e) => !e.dead && e.countsForClear).length) }; break;
        case 'waitAces': this.stepWait = { type: 'aces', t: 0 }; break;
        case 'jackals': A.spawnJackals(this); break;
        case 'trouble': A.startTrouble(this, s.who, s); break;
        case 'boss': A.spawnBoss(this, s.boss); break;
      }
    }
  }

  // ---------------- stage clear ----------------
  stageClear() {
    if (this.phase === 'clear') return;
    this.phase = 'clear'; this.phaseT = 0;
    this.audio.chargeStop();
    this.player.inv = 99;
    for (const s of this.shots) this.root.remove(s.mesh); this.shots.length = 0;
    for (const e of this.enemies) if (!e.dead) A.damageEnemy(this, e, 999, 'clear');
    this.audio.playSong('clear');
    this.ui.banner('', 'MISSION ACCOMPLISHED', this.stage.name, 3.5);
    if (!this.attract) this.say('tod', 'That\'s a wrap, team! Nice flying!', { dur: 3 });
  }
  updateClear(dt) {
    const p = this.player;
    // victory fly-off: climb and accelerate while camera holds
    this.speed = damp(this.speed, 140, 1, dt);
    if (this.mode === 'rail') { this.d += this.speed * dt * 0.3; p.pos.z -= this.speed * dt; p.pos.y += dt * 12 * Math.min(1, this.phaseT); }
    else { p.pos.addScaledVector(p.fwd, this.speed * dt); p.pos.y += dt * 10; }
    _e.set(0.25, p.obj.rotation.y, Math.sin(this.phaseT * 2) * 0.2, 'YXZ');
    p.obj.quaternion.slerp(_q.setFromEuler(_e), 1 - Math.exp(-dt * 2));
    p.model.flame.scale.y = 2.5;
    if (this.phaseT > 6.5 && !this.result) this.result = { type: 'clear' };
  }
  finalStats() {
    const p = this.player;
    const wingAlive = this.wingmates.filter((w) => w.hp > 0).length;
    return { stage: this.stage, hits: this.hits, score: this.score, medal: this.hits >= this.stage.medal, wingmates: this.wingmates.map((w) => ({ key: w.key, hp: w.hp, present: w.present })), route: this.route, wingAlive,
      carry: { score: this.score + wingAlive * 500, lives: this.lives, laser: p.laser, bombs: p.bombs, maxShield: p.maxShield, gold: p.gold, wings: { ...p.wings }, wingHp: Object.fromEntries(this.wingmates.map((w) => [w.key, w.hp])) } };
  }

  // ---------------- camera ----------------
  updateCamera(dt) {
    const cam = this.camera, p = this.player;
    let fovT = 70;
    if (this.boosting) fovT = 84; else if (this.braking) fovT = 62;
    if (this.camOverride) {
      const o = this.camOverride; o.t += dt;
      o.fn(cam, o.t, dt);
      if (o.t >= o.dur) this.camOverride = null;
    } else if (this.phase === 'intro') {
      // cinematic swoop around the team
      const k = Math.min(1, this.phaseT / 4.2), e = k * k * (3 - 2 * k);
      const ang = (1 - e) * 2.6;
      _a.set(Math.sin(ang) * (30 - e * 6), 8 + (1 - e) * 4 + p.pos.y * (this.mode === 'rail' ? 0.8 : 0), Math.cos(ang) * (30 - e * 6));
      if (this.mode === 'rail') { _a.x += p.x; _a.z += p.pos.z; _a.y += 0; } else _a.add(p.pos).sub(_b.set(0, 0, 0));
      cam.position.copy(_a);
      cam.lookAt(p.pos);
    } else if (this.mode === 'rail') {
      const target = _a.set(p.x * 0.78, p.y * 0.82 + 6.5, -this.d + 26);
      if (p.dead) target.z = -this.d + 40;
      if (this.phase === 'clear') { target.copy(cam.position); target.z -= this.speed * 0.3 * dt; cam.position.copy(target); cam.lookAt(p.pos); }
      else {
        cam.position.x = damp(cam.position.x, target.x, 6, dt);
        cam.position.y = damp(cam.position.y, target.y, 6, dt);
        cam.position.z = target.z;
        _b.set(p.x * 0.9, p.y * 0.86 + 2, -this.d - 60);
        cam.lookAt(_b);
        cam.rotateZ(-p.roll * 0.12 - p.bank * 0.05);
      }
    } else {
      if (this.phase === 'clear') { cam.lookAt(p.pos); }
      else {
        const back = this.boosting ? 26 : 20;
        _a.copy(p.pos).addScaledVector(p.fwd, -back);
        _b.set(0, 1, 0);
        if (p.loop) _b.applyQuaternion(p.obj.quaternion);
        _a.addScaledVector(_b, 6.5);
        cam.position.lerp(_a, 1 - Math.exp(-dt * (p.loop ? 4 : 7)));
        cam.up.lerp(_b, 1 - Math.exp(-dt * 4)).normalize();
        _c.copy(p.pos).addScaledVector(p.fwd, 30);
        cam.lookAt(_c);
        cam.rotateZ(-p.arRoll * 0.1);
      }
    }
    if (this.mode === 'rail' || !this.player.loop) { if (!this.camOverride && this.mode === 'rail') cam.up.set(0, 1, 0); }
    if (this.shake > 0 && settings.shake) {
      const s = this.shake * 0.8;
      cam.position.x += (Math.random() - 0.5) * s; cam.position.y += (Math.random() - 0.5) * s;
    }
    this.shake = Math.max(0, this.shake - dt * 2.4);
    cam.fov = damp(cam.fov, fovT, 4, dt); cam.updateProjectionMatrix();
  }
  updateShadow() {
    const { sun } = this.app; const p = this.player;
    sun.target.position.copy(p.pos);
    sun.position.copy(p.pos).addScaledVector(this.sunDir, 300);
    sun.target.updateMatrixWorld();
  }

  // ---------------- HUD data ----------------
  hudState() {
    const p = this.player;
    return {
      mode: this.mode, shield: p.shield, maxShield: p.maxShield, gold: p.gold, bombs: p.bombs, lives: this.lives, hits: this.hits, score: this.score,
      boost: p.boostMeter, boostLock: p.boostLock, laser: this.laserLevel(), wings: p.wings, charge: p.charge, lock: p.lock, dead: p.dead,
      boss: this.boss, wingmates: this.wingmates, attract: this.attract, phase: this.phase, player: p, enemies: this.enemies, pickups: this.pickups,
      route: this.route, medal: this.stage.medal,
    };
  }

  dispose() {
    this.audio.chargeStop();
    this.scene.remove(this.root);
    this.world.dispose();
    this.fx.dispose();
    this.physics.free();
    this.camera.up.set(0, 1, 0);
  }
}
