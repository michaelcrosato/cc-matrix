// Enemies: a plain state machine per puppet. Attack tokens limit how many attack at once.
import { THREE, RAPIER, Ragdoll, HERO_RAGDOLL } from '../../pixel-engine.js';
import { Humanoid } from './actor.js';
import { ENEMIES, BARKS } from '../data/enemies.js';
import { TUNING } from '../data/tuning.js';
import { rayCapsule, raySphere, angleDiff, turnToward, clamp } from './geom.js';

const { Vector3 } = THREE;
export const S = {
  WAIT: 'WAIT', WORK: 'WORK', ALERT: 'ALERT', APPROACH: 'APPROACH', CIRCLE: 'CIRCLE', WINDUP: 'WINDUP', ATTACK: 'ATTACK', RECOVER: 'RECOVER',
  STUN: 'STUN', KNEEL: 'KNEEL', FLINCH: 'FLINCH', KNOCKDOWN: 'KNOCKDOWN', GETUP: 'GETUP', GRAB: 'GRAB', VAULT: 'VAULT', CLIMB: 'CLIMB', BASH: 'BASH',
  LATCH: 'LATCH', DEAD: 'DEAD', SEA: 'SEA', CARRY: 'CARRY', RISE: 'RISE', LUNGE: 'LUNGE', SEEK: 'SEEK',
};
const MODEL_VARIANTS = { gaffer: ['islander', 'islander-cap', 'islander-bare'] };
let NEXT_ID = 1;
export const resetEnemyIds = () => { NEXT_ID = 1; };

export class Enemy {
  constructor(area, type, x, z, o = {}) {
    const def = ENEMIES[type]; if (!def) throw new Error('unknown enemy ' + type);
    this.area = area; this.type = type; this.def = def; this.id = NEXT_ID++;
    const rnd = area.rng;
    const variants = MODEL_VARIANTS[type];
    this.modelId = o.model || (variants ? variants[rnd.int(0, variants.length - 1)] : def.model);
    this.scale = (def.scale || 1) * (o.scale || 1);
    this.maxHp = def.hp * TUNING.enemyHp * (o.hpMul || 1); this.hp = this.maxHp;
    this.helmet = def.helmet || 0; this.shieldUp = !!def.shield; this.armour = !!def.armour;
    this.speedBase = (def.speed[0] + rnd.range(0, def.speed[1] - def.speed[0])) * (o.speedMul || 1);
    this.x = x; this.z = z; this.px = x; this.pz = z; this.yaw = o.yaw ?? rnd.range(-3, 3);
    this.state = o.state || (o.work ? S.WORK : S.APPROACH); this.t = 0; this.group = o.group || null;
    this.kx = 0; this.kz = 0; this.legDmg = 0; this.bandBright = rnd.chance(0.5);
    this.cd = rnd.range(0, 1); this.windup = def.windup; this.hasAttacked = false; this.tokenHeld = false; this.dead = false;
    this.blind = 0; this.pinned = 0; this.slow = 0; this.zones = null; this.circleDir = rnd.chance(0.5) ? 1 : -1; this.holding = type === 'bottler';
    this.h = new Humanoid(this.modelId, { scale: this.scale, palette: o.palette });
    this.h.attachTo(area.ctx.scene);
    if (type === 'gaffer' || type === 'runner' || type === 'ansgar') { /* tool is part of the model */ }
    this.h.root.position.set(x, 0, z);
    this.body = null;
    if (!o.noBody) this._makeBody();
    this.locoSpeed = 0; this.anim = '';
    this.setState(this.state);
    this.invuln = 0; this.lastHitZone = null; this.carryTimer = 0; this.dir = [0, 0];
    this.spawned = area.time;
  }
  _makeBody() {
    const { physics } = this.area.ctx;
    const desc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(this.x, 0.5 + 0.3, this.z);
    this.body = physics.world.createRigidBody(desc);
    this.collider = physics.world.createCollider(RAPIER.ColliderDesc.capsule(0.35, 0.28), this.body);
    physics.tag(this.collider, 'enemy'); physics.tag(this.collider, 'noCamera');
  }
  get alive() { return !this.dead; }
  get awake() { return this.state !== S.WAIT && this.state !== S.WORK && !this.dead; }
  setState(s, t = 0) {
    if (s === S.SEA) { this.sea = null; this.seaT = 0; }
    this.state = s; this.t = t; this.stateTimer = 0;
    const d = this.def, h = this.h;
    const loco = this.type === 'runner' || this.type === 'resalted' ? 'Lurch' : this.type === 'knight' ? 'KnightWalk' : this.type === 'carrier' ? 'CarrierWalk' : this.type === 'monk' ? 'ShieldWalk' : 'Shamble';
    this.locoClip = this.type === 'flenser' ? 'Shamble' : loco;
    switch (s) {
      case S.WORK: h.play(this.rnd01 ? 'WorkMend' : 'WorkChop'); break;
      case S.ALERT: h.play('Shout', { once: true }); break;
      case S.APPROACH: case S.CIRCLE: case S.RECOVER: case S.SEA: case S.SEEK: h.play(this.locoClip); break;
      case S.WINDUP: h.play(this.type === 'flenser' ? 'SawSwing' : this.type === 'monk' ? 'FlailSpin' : this.type === 'knight' ? 'HalberdSweep' : this.type === 'ansgar' ? 'AnsgarHook' : 'RaiseTool', { once: true, hold: true, speed: this.type === 'flenser' ? 0.8 : 1 }); break;
      case S.ATTACK: h.play(this.type === 'flenser' ? 'SawSwing' : this.type === 'monk' ? 'FlailSpin' : this.type === 'knight' ? 'HalberdSweep' : this.type === 'ansgar' ? 'AnsgarHook' : (this.def.ranged ? 'ThrowOverhand' : 'Swing'), { once: true, restart: true }); break;
      case S.STUN: h.play('StunHands'); break;
      case S.KNEEL: h.play('KneelHit'); break;
      case S.FLINCH: h.play('HitReact', { once: true, restart: true }); break;
      case S.KNOCKDOWN: h.play('KnockedDown', { once: true, hold: true, restart: true }); break;
      case S.GETUP: h.play('GetUp', { once: true, restart: true }); break;
      case S.BASH: h.play('BashDoor'); break;
      case S.VAULT: h.play('Vault', { once: true, restart: true }); break;
      case S.CLIMB: h.play('ClimbIn'); break;
      case S.LUNGE: h.play('SawLunge'); break;
      case S.LATCH: h.play('Idle'); break;
      case S.DEAD: break;
      case S.RISE: h.play('DrownedRise', { once: true, hold: true, restart: true }); break;
      case S.GRAB: h.play('Grab'); break;
      case S.CARRY: h.play('CarrierWalk'); break;
      default: h.play('Idle');
    }
  }
  /** Is the token system available to this enemy now? */
  _wantToken() { return this.area.tokenFor(this); }
  distTo(x, z) { return Math.hypot(this.x - x, this.z - z); }
  target() {
    const a = this.area, p = a.player;
    if (this.type === 'carrier' && a.dame && !a.dame.grabbedBy && a.dame.alive) return { x: a.dame.x, z: a.dame.z, dame: true };
    const d = a.dame;
    if (d && d.alive && !d.hidden && this.distTo(d.x, d.z) < 2.2 && this.distTo(d.x, d.z) < this.distTo(p.x, p.z) - 0.5) return { x: d.x, z: d.z, dame: true };
    if (a.ghosts && a.ghosts.length) {
      let best = null, bd = 1e9;
      for (const g of a.allPlayers()) { if (g.dead || g.downed) continue; const dd = this.distTo(g.x, g.z); if (dd < bd) { bd = dd; best = g; } }
      if (best && best !== p) return { x: best.x, z: best.z, player: true, ref: best };
    }
    return { x: p.x, z: p.z, player: true, ref: p };
  }
  step(dt, speed, dx, dz) {
    // move along (dx,dz) unit vector; slide against walls and other bodies
    const a = this.area, nav = a.level.nav;
    if (!nav.walkable(this.x, this.z) && a.level.charAt(this.x, this.z) !== '~') { const o = a.nearestOpen(this.x, this.z); if (o) { this.x += (o.x - this.x) * Math.min(1, 4 * dt); this.z += (o.z - this.z) * Math.min(1, 4 * dt); } return; }
    let nx = this.x + dx * speed * dt, nz = this.z + dz * speed * dt;
    const free = (x, z) => nav.walkable(x, z) && a.cellFree(x, z, this);
    if (!free(nx, nz)) { if (free(nx, this.z)) nz = this.z; else if (free(this.x, nz)) nx = this.x; else { nx = this.x; nz = this.z; } }
    this.x = nx; this.z = nz;
  }
  separate(dt) {
    for (const o of this.area.enemies) {
      if (o === this || o.dead || o.state === S.WAIT) continue;
      const dx = this.x - o.x, dz = this.z - o.z, d = Math.hypot(dx, dz);
      if (d < 0.55 && d > 1e-4) { const push = (0.55 - d) * 3 * dt; const nx = this.x + dx / d * push, nz = this.z + dz / d * push; if (this.area.level.nav.walkable(nx, nz)) { this.x = nx; this.z = nz; } }
    }
    const p = this.area.player;
    if (p) { const dx = this.x - p.x, dz = this.z - p.z, d = Math.hypot(dx, dz); if (d < 0.6 && d > 1e-4) { const push = (0.6 - d) * 4 * dt; this.x += dx / d * push; this.z += dz / d * push; } }
  }
  flowDir(tx, tz, out) {
    const nav = this.area.level.nav;
    nav.flowTo(tx, tz);
    if (nav.flowDirection(this.x, this.z, out)) return true;
    out[0] = tx - this.x; out[1] = tz - this.z; const l = Math.hypot(out[0], out[1]) || 1; out[0] /= l; out[1] /= l; return false;
  }
  faceToward(x, z, dt, rate = 8) { this.yaw = turnToward(this.yaw, Math.atan2(x - this.x, z - this.z), rate * dt); }
  alert() {
    if (this.state === S.WORK || this.state === S.WAIT) { this.setState(S.ALERT); this.t = 0.5; this.area.audio('shout', this.x, this.z); this.area.bark(this, BARKS[this.area.rng.int(0, BARKS.length - 1)]); }
  }
  /** Fixed-step update. */
  update(dt) {
    if (this.dead) { this.deadT = (this.deadT || 0) + dt; return; }
    const a = this.area, p = a.player, def = this.def;
    this.px = this.x; this.pz = this.z;
    this.stateTimer += dt;
    if (this.y > 0 && this.state !== S.CLIMB && a.player.y < 1) this.y = Math.max(0, this.y - 6 * dt);
    if (this.invuln > 0) this.invuln -= dt;
    if (this.blind > 0) this.blind -= dt;
    if (this.slow > 0) this.slow -= dt;
    // knockback velocity
    if (Math.abs(this.kx) + Math.abs(this.kz) > 0.05) { const sp = Math.hypot(this.kx, this.kz); this.step(dt, sp, this.kx / sp, this.kz / sp); const f = Math.exp(-5 * dt); this.kx *= f; this.kz *= f; }
    const bv = a.beltVelocityAt?.(this.x, this.z); if (bv && this.state !== S.WAIT) { const nx = this.x + bv[0] * dt; if (a.level.nav.walkable(nx, this.z)) this.x = nx; }
    const ch = a.level.charAt(this.x, this.z);
    if (ch === '~' && this.state !== S.SEA) { this.sink(); return; }
    if (this.pinned > 0) { this.pinned -= dt; return; }
    const tgt = this.target();
    const dist = this.distTo(tgt.x, tgt.z);
    const spdMul = TUNING.enemySpeed * (this.slow > 0 ? 0.5 : 1) * (a.frozen ? 0 : 1);
    const dir = this.dir;
    switch (this.state) {
      case S.WAIT: return;
      case S.WORK: {
        if (a.frozen) return;
        const pd = this.distTo(p.x, p.z);
        if ((pd < 9 && a.level.nav.lineOfSight(this.x, this.z, p.x, p.z)) || (pd < 4)) this.alertGroup();
        return;
      }
      case S.ALERT: this.faceToward(tgt.x, tgt.z, dt); this.t -= dt; if (this.t <= 0) this.setState(S.APPROACH); return;
      case S.RISE: if (this.stateTimer > 1.2) this.setState(S.APPROACH); return;
      case S.SEA: {
        if (!this.sea) { this.sea = a.nearestSea(this.x, this.z); if (!this.sea) return; this.shore = a.shoreFor(this.sea); }
        const inWater = a.level.charAt(this.x, this.z) === '~';
        let tx = this.sea.x, tz = this.sea.z; let direct = inWater;
        if (!inWater && this.shore && this.distTo(this.shore.x, this.shore.z) > 1.0) {
          this.flowDir(this.shore.x, this.shore.z, this.dir); tx = this.x + this.dir[0]; tz = this.z + this.dir[1];
        } else direct = true;
        const dx = tx - this.x, dz = tz - this.z, d = Math.hypot(dx, dz) || 1;
        this.yaw = turnToward(this.yaw, Math.atan2(dx, dz), 6 * dt);
        if (direct) { this.x += dx / d * 1.1 * dt; this.z += dz / d * 1.1 * dt; } else this.step(dt, 1.1, dx / d, dz / d);
        this.locoSpeed = 1.1;
        if (inWater) { this.h.play('Wade'); this.seaT = (this.seaT || 0) + dt; if (this.seaT > 2.4) this.sink(true); }
        return;
      }
      case S.SEEK: {
        const c = this.seekCorpse;
        if (!c || !c.dead || c.sunk) { this.setState(S.APPROACH); return; }
        const dx = c.x - this.x, dz = c.z - this.z, d = Math.hypot(dx, dz) || 1;
        if (d < 0.6) { // the corpse rises as a Re-Salted
          a.audio('skitter', c.x, c.z); const r = a.spawn('resalted', c.x, c.z, { state: S.APPROACH }); r.yaw = c.yaw; c.h.root.visible = false; c.h.shadow && (c.h.shadow.visible = false); c.sunk = true;
          this.dead = true; this.h.root.visible = false; this.h.shadow && (this.h.shadow.visible = false); if (this.body) { a.ctx.physics.world.removeRigidBody(this.body); this.body = null; } this.setState(S.DEAD); return;
        }
        this.yaw = Math.atan2(dx, dz); this.step(dt, 3.0 * spdMul, dx / d, dz / d); this.locoSpeed = 3; return;
      }
      case S.APPROACH: case S.CIRCLE: case S.RECOVER: return this.moveAI(dt, tgt, dist, spdMul);
      case S.LUNGE: {
        this.faceToward(tgt.x, tgt.z, dt, 3); this.step(dt, 5 * spdMul, Math.sin(this.yaw), Math.cos(this.yaw));
        this.locoSpeed = 5;
        if (dist < def.range + 0.4 || this.stateTimer > 0.8) { this.setState(S.WINDUP); this.t = this.windupTime(); a.onWindup?.(this); }
        return;
      }
      case S.WINDUP:
        this.faceToward(tgt.x, tgt.z, dt, this.type === 'flenser' ? 3 : 5); this.t -= dt;
        if (this.t <= 0) { this.setState(S.ATTACK); this.hasAttacked = false; }
        return;
      case S.ATTACK: return this.attackAI(dt, tgt, dist);
      case S.STUN: case S.KNEEL: this.t -= dt; this.releaseToken(); if (this.t <= 0) { this.setState(S.RECOVER); this.t = 0.3; } return;
      case S.FLINCH: this.t -= dt; if (this.t <= 0) { this.setState(S.RECOVER); this.t = 0.2; } return;
      case S.KNOCKDOWN: this.t -= dt; this.releaseToken(); if (this.t <= 0) { this.setState(S.GETUP); this.t = 0.8; } return;
      case S.GETUP: this.t -= dt; if (this.t <= 0) { this.setState(S.APPROACH); } return;
      case S.BASH: return this.bashAI(dt);
      case S.VAULT: {
        const w = this.vaultTo; const k = clamp(this.stateTimer / 0.7, 0, 1);
        this.x = this.vaultFrom.x + (w.x - this.vaultFrom.x) * k; this.z = this.vaultFrom.z + (w.z - this.vaultFrom.z) * k;
        if (k >= 1) this.setState(S.APPROACH);
        return;
      }
      case S.CLIMB: if (this.stateTimer > 1.2) { this.x = this.climbTo.x; this.z = this.climbTo.z; this.setState(S.APPROACH); } return;
      case S.LATCH: {
        this.faceToward(p.x, p.z, dt, 12); this.x = p.x + Math.sin(this.yaw + 3) * 0.2; this.z = p.z + Math.cos(this.yaw + 3) * 0.2;
        this.latchAcc = (this.latchAcc || 0) + dt; while (this.latchAcc >= 1) { this.latchAcc -= 1; a.hurtPlayer(4, this.x, this.z, 'limpet'); }
        return;
      }
      case S.GRAB: {
        // gaffer's grab: hold on and hurt until the player mashes free
        this.faceToward(p.x, p.z, dt, 12); this.latchAcc = (this.latchAcc || 0) + dt; while (this.latchAcc >= 1 / 6) { this.latchAcc -= 1 / 6; a.hurtPlayer(1, this.x, this.z, 'grab'); }
        return;
      }
      case S.CARRY: return this.carryAI(dt);
      default: return;
    }
  }
  windupTime() {
    const r = this.area.rankFactor();
    return Math.max(0.25, (this.def.windup + r.windup) * TUNING.windup);
  }
  alertGroup() {
    const a = this.area;
    this.alert();
    for (const o of a.enemies) if (o !== this && o.state === S.WORK && o.distTo(this.x, this.z) < 15) o.alert();
  }
  releaseToken() { if (this.tokenHeld) { this.tokenHeld = false; this.area.tokensInUse = Math.max(0, this.area.tokensInUse - 1); } }
  moveAI(dt, tgt, dist, spdMul) {
    const a = this.area, def = this.def, dir = this.dir;
    if (this.state === S.RECOVER) { this.t -= dt; if (this.t <= 0) this.setState(S.APPROACH); }
    if (a.frozen || this.blind > 0) { this.locoSpeed = 0; this.h.setLowerSpeed(0); return; }
    if (this.type === 'harpooner') { this.faceToward(tgt.x, tgt.z, dt, 4); this.cd -= dt; if (this.cd <= 0 && dist < def.range && a.tokenFor(this)) { this.setState(S.WINDUP); this.t = this.windupTime(); this.glint = true; } return; }
    this.cd -= dt;
    const ranged = def.ranged && this.type !== 'harpooner';
    const hasLOS = a.level.nav.lineOfSight(this.x, this.z, tgt.x, tgt.z);
    const want = ranged ? (hasLOS && dist < def.range && dist > 4) : dist < def.range;
    // melee reach / ranged range: ask for a token
    if (want && this.cd <= 0 && this.state !== S.RECOVER) {
      if (a.tokenFor(this)) {
        if (this.type === 'flenser' && dist > 3.5) { this.setState(S.LUNGE); return; }
        this.faceToward(tgt.x, tgt.z, dt, 10);
        if (Math.abs(angleDiff(this.yaw, Math.atan2(tgt.x - this.x, tgt.z - this.z))) < 0.5 || dist < 1.2) { this.setState(S.WINDUP); this.t = this.windupTime(); a.onWindup?.(this); return; }
      } else if (this.state !== S.CIRCLE) this.setState(S.CIRCLE);
    }
    if (this.state === S.CIRCLE && !want) this.setState(S.APPROACH);
    if (this.state === S.CIRCLE) {
      const tx = this.x - tgt.x, tz = this.z - tgt.z, d = Math.hypot(tx, tz) || 1;
      const hold = 3.5; const rad = d < hold - 0.5 ? -1 : d > hold + 1 ? 1 : 0;
      const px = -tz / d * this.circleDir, pz = tx / d * this.circleDir;
      const mx = (-tx / d) * -rad * -1 + px * 0.6, mz = (-tz / d) * -rad * -1 + pz * 0.6;
      const l = Math.hypot(mx, mz) || 1; this.faceToward(tgt.x, tgt.z, dt, 6);
      this.step(dt, this.speedBase * 0.7 * spdMul, mx / l, mz / l); this.locoSpeed = this.speedBase * 0.7; this.h.setLowerSpeed(0.7);
      this.separate(dt); if (this.cd <= 0 && !a.tokenFor(this, true)) this.cd = 0.3; return;
    }
    // chase along the flow field; doors and windows have their own handling
    this.flowDir(tgt.x, tgt.z, dir);
    const sp = this.speedBase * spdMul;
    const nx = this.x + dir[0] * 0.7, nz = this.z + dir[1] * 0.7;
    const door = a.doorAt(nx, nz);
    if (door && !door.open) { this.beginBash(door); return; }
    const win = a.windowAt(nx, nz);
    if (win && !win.vaulting) { this.beginVault(win, dir); return; }
    this.yaw = turnToward(this.yaw, Math.atan2(dir[0], dir[1]), 7 * dt);
    this.step(dt, sp, dir[0], dir[1]); this.locoSpeed = sp; this.h.setLowerSpeed(sp / ({ Shamble: 1.1, Lurch: 2.8, KnightWalk: 0.9, CarrierWalk: 1.6, ShieldWalk: 1.3 }[this.locoClip] || 1.1));
    this.separate(dt);
  }
  beginBash(door) { this.door = door; this.setState(S.BASH); }
  bashAI(dt) {
    const d = this.door; if (!d || d.open) { this.setState(S.APPROACH); return; }
    this.faceToward(d.x, d.z, dt, 10);
    d.bash += dt * (d.kind === 'G' ? 0.3 : 1);
    if (!this.bashSfx || this.stateTimer - this.bashSfx > 0.6) { this.bashSfx = this.stateTimer; this.area.audio('doorkick', d.x, d.z, 0.5); }
    if (d.bash >= d.hp) this.area.openDoor(d, true);
  }
  beginVault(win, dir) {
    win.vaulting = true; this.vaultFrom = { x: this.x, z: this.z };
    this.vaultTo = { x: this.x + dir[0] * 2, z: this.z + dir[1] * 2 };
    this.yaw = Math.atan2(dir[0], dir[1]);
    this.area.breakWindow(win); this.setState(S.VAULT);
    setTimeout?.(() => {}, 0);
    this.area.ctx.tweens.call(0.9, () => { win.vaulting = false; });
  }
  attackAI(dt, tgt, dist) {
    const a = this.area, def = this.def;
    const T = this.stateTimer;
    const hitAt = this.type === 'flenser' ? 0.25 : 0.15, endAt = this.type === 'flenser' ? 0.7 : 0.45;
    if (!this.hasAttacked && T >= hitAt) {
      this.hasAttacked = true;
      if (def.ranged) this.fireRanged(tgt);
      else this.meleeHit(tgt);
    }
    if (T >= endAt) {
      this.releaseToken();
      this.cd = 0.5 + a.rng.range(0, 0.8) + (a.rankFactor().cd || 0);
      this.setState(S.RECOVER); this.t = 0.5;
    }
  }
  meleeHit(tgt) {
    const a = this.area, def = this.def;
    const reach = def.range + 0.5;
    const d = this.distTo(tgt.x, tgt.z);
    const inFront = Math.abs(angleDiff(this.yaw, Math.atan2(tgt.x - this.x, tgt.z - this.z))) < 1.1;
    this.h.flash(0); a.audio(this.type === 'flenser' ? 'sawLunge' : 'knife', this.x, this.z, 0.6);
    if (d > reach || !inFront) return;
    if (tgt.player && Math.abs((a.player.y || 0) - (this.y || 0)) > 1.5) return;
    if (tgt.dame) { a.dame.hurt(def.dmg * a.diffMul(), this.x, this.z); return; }
    if (this.type === 'carrier') { if (a.dame) { a.dame.grabbedByCarrier(this); } return; }
    if (this.type === 'gaffer' && a.rng.chance(def.grab) && !a.player.grabbed) { a.player.beginGrab(this); this.setState(S.GRAB); return; }
    if (this.type === 'limpet') { a.player.limpets.push(this); this.setState(S.LATCH); return; }
    if (this.type === 'drowned') { a.player.slowT = 1.5; }
    if (this.type === 'flenser') { a.flenserStrike(this); return; }
    if (tgt.ref && tgt.ref !== a.player) a.hurtGhost(tgt.ref, def.dmg * a.diffMul() * TUNING.damageTaken, this.x, this.z); else a.hurtPlayer(def.dmg, this.x, this.z, this.type);
  }
  fireRanged(tgt) {
    const a = this.area, def = this.def;
    if (def.ranged === 'net') a.spawnProjectile({ kind: 'net', x: this.x, y: 1.2, z: this.z, tx: tgt.x, tz: tgt.z, owner: this, speed: 6 });
    else if (def.ranged === 'bottle') { this.holding = false; a.spawnProjectile({ kind: 'bottle', x: this.x, y: 1.6, z: this.z, tx: tgt.x, tz: tgt.z, owner: this, speed: 7, arc: true }); }
    else if (def.ranged === 'harpoon') a.spawnProjectile({ kind: 'harpoon', x: this.x, y: 1.3, z: this.z, tx: tgt.x, tz: tgt.z, owner: this, speed: 14 });
    this.glint = false; this.cd = 2 + a.rng.range(0, 1.5);
  }
  carryAI(dt) {
    const a = this.area, d = a.dame; if (!d || !d.alive || d.grabbedBy !== this) { this.setState(S.APPROACH); return; }
    const door = a.nearestSpawnDoor(this.x, this.z); if (!door) return;
    const dx = door.x - this.x, dz = door.z - this.z, dd = Math.hypot(dx, dz) || 1;
    this.flowDir(door.x, door.z, this.dir);
    this.step(dt, 1.6 * TUNING.enemySpeed, this.dir[0], this.dir[1]); this.yaw = Math.atan2(this.dir[0], this.dir[1]); this.locoSpeed = 1.6;
    d.x = this.x; d.z = this.z;
    if (dd < 1.2) { d.lost(); }
  }
  /** Damage entry point: returns { killed, zone, blocked }. */
  takeHit(o) {
    if (this.dead) return { killed: false };
    const a = this.area;
    let dmg = o.amount * TUNING.weaponDamage * (o.raw ? 1 / TUNING.weaponDamage : 1);
    const zone = o.zone || 'torso';
    let blocked = false;
    if (this.state === S.WAIT || this.state === S.WORK) this.alertGroup();
    if (this.type === 'monk' && this.shieldUp && zone !== 'arm' && !o.explosive && this.facesFrom(o.fromX, o.fromZ, 1.3)) { blocked = true; dmg *= 0.05; }
    if (this.type === 'knight') {
      if (this.helmet > 0 && zone === 'head') { this.helmet -= dmg; dmg = 0; blocked = true; if (this.helmet <= 0) { this.helmetOff(); } }
      else if (zone !== 'head' && !o.explosive) { blocked = true; dmg *= 0.1; }
    }
    if (zone === 'head') dmg *= 2; else if (zone === 'arm' || zone === 'leg') dmg *= 0.7;
    if (o.mult) dmg *= o.mult;
    if (this.state === S.KNOCKDOWN && o.knife) dmg *= 3;
    this.hp -= dmg;
    this.lastHitZone = zone;
    this.h.flash(2);
    a.fx.bloodAt(this.hitPoint(zone), blocked);
    if (this.hp <= 0) { this.die(o); return { killed: true, zone, blocked, headPop: !!o.headPop }; }
    // reactions
    if (this.state === S.WORK || this.state === S.WAIT) this.alertGroup();
    const r = a.rng;
    const staggerOk = !this.def.headOnlyStagger || zone === 'head' || o.pellets || o.explosive;
    if (zone === 'head' && staggerOk && !blocked && r.chance(TUNING.staggerChance) && this.state !== S.STUN) { this.releaseToken(); this.setState(S.STUN, 1.5); this.stunned = true; }
    else if (zone === 'leg') {
      this.legDmg += dmg;
      if (this.legDmg >= this.maxHp * 0.3 && staggerOk && this.state !== S.KNEEL) { this.legDmg = 0; this.releaseToken(); this.setState(S.KNEEL, 1.7); }
    } else if (zone === 'arm') {
      if (this.type === 'bottler' && this.holding) { this.holding = false; this.bottleBurst(); }
      if (this.type === 'monk' && this.shieldUp) { this.shieldUp = false; this.h.j.HandL.visible = true; a.audio('hit', this.x, this.z); }
    } else if (!blocked && dmg >= 10 && (this.state === S.WINDUP) && staggerOk) { this.releaseToken(); this.setState(S.FLINCH, 0.25); }
    if (o.knock) { const d = Math.hypot(this.x - o.fromX, this.z - o.fromZ) || 1; this.kx += (this.x - o.fromX) / d * o.knock; this.kz += (this.z - o.fromZ) / d * o.knock; }
    if (this.state === S.WORK) this.alertGroup();
    return { killed: false, zone, blocked };
  }
  facesFrom(fx, fz, cone) {
    if (fx === undefined) return false;
    const ang = Math.atan2(fx - this.x, fz - this.z);
    return Math.abs(angleDiff(this.yaw, ang)) < cone;
  }
  helmetOff() { this.area.audio('hit', this.x, this.z); this.area.fx.sparks(this.hitPoint('head')); this.h.j.Head?.children?.forEach?.((c) => { }); this.helmetGone = true; }
  bottleBurst() { this.area.explodeAt(this.x, this.z, { radius: 1.8, dmg: 18, fire: true, owner: this, hurtEnemies: true }); }
  hitPoint(zone) {
    const z = this.zones;
    if (!z) return new Vector3(this.x, 1.2, this.z);
    if (zone === 'head') return new Vector3(z.head.x, z.head.y, z.head.z);
    return new Vector3((z.torso.a.x + z.torso.b.x) / 2, (z.torso.a.y + z.torso.b.y) / 2, (z.torso.a.z + z.torso.b.z) / 2);
  }
  knockdown(t = 2.2, fromX, fromZ) {
    if (this.dead) return;
    this.releaseToken(); if (this.state === S.LATCH) return;
    this.setState(S.KNOCKDOWN, t);
    if (fromX !== undefined) { const d = Math.hypot(this.x - fromX, this.z - fromZ) || 1; this.kx += (this.x - fromX) / d * 3.5; this.kz += (this.z - fromZ) / d * 3.5; }
  }
  die(o = {}) {
    if (this.dead) return;
    const a = this.area;
    this.dead = true; this.releaseToken();
    this.setState(S.DEAD);
    const violent = o.explosive || o.pellets || o.source === 'scatter' || o.source === 'explosion';
    const live = a.enemies.filter((q) => q.doll).length;
    if (violent && live < 8 && !this.def.boss && this.scale < 1.5) {
      try { this.doll = new Ragdoll(a.ctx.physics, this.h.body, HERO_RAGDOLL); const dx = this.x - (o.fromX ?? this.x), dz = this.z - (o.fromZ ?? this.z), l = Math.hypot(dx, dz) || 1; this.doll.enable({ velocity: [dx / l * 5, 3, dz / l * 5] }); } catch { this.doll = null; }
    }
    if (!this.doll) this.h.play('Death', { once: true, hold: true, restart: true });
    if (this.body) { a.ctx.physics.world.removeRigidBody(this.body); this.body = null; }
    if (this.holding && this.type === 'bottler') { /* bottle drops with him */ }
    a.onKill(this, o);
  }
  sink(walked = false) {
    if (this.dead) return;
    this.area.audio('splash', this.x, this.z);
    this.area.fx.splash(this.x, this.z);
    this.dead = true; this.sunk = true; this.releaseToken();
    if (this.body) { this.area.ctx.physics.world.removeRigidBody(this.body); this.body = null; }
    this.setState(S.DEAD);
    this.area.onKill(this, { sink: true, walked });
    this.h.root.visible = false; this.h.shadow && (this.h.shadow.visible = false);
  }
  /** Per rendered frame: interpolate, animate, cache zones. */
  updateVisual(dt, alpha) {
    const h = this.h, root = h.root;
    const ix = this.px + (this.x - this.px) * alpha, iz = this.pz + (this.z - this.pz) * alpha;
    let y = this.y || 0;
    if (this.state === S.SEA && this.area.level.charAt(this.x, this.z) === '~') y = -0.5;
    if (this.state === S.VAULT) y = Math.sin(clamp(this.stateTimer / 0.7, 0, 1) * Math.PI) * 0.5;
    if (this.state === S.CLIMB) y = (this.climbDir || 1) * clamp(this.stateTimer / 1.2, 0, 1) * 3.2;
    root.position.set(ix, y, iz); root.rotation.y = this.yaw;
    if (this.body) this.body.setNextKinematicTranslation({ x: this.x, y: 0.7, z: this.z });
    // locomotion playback follows speed
    if (this.state === S.APPROACH || this.state === S.CIRCLE || this.state === S.RECOVER) {
      const mv = Math.hypot(this.x - this.px, this.z - this.pz) / Math.max(dt, 1e-3);
      if (mv < 0.05 && this.h.current.full === this.locoClip && this.state !== S.APPROACH) this.h.setLowerSpeed(0);
    }
    if (this.doll && (this.deadT || 0) > 2.5) { try { this.doll.release({ ground: 0 }); } catch { try { this.doll.dispose?.(); } catch { /* */ } } this.doll = null; this.h.play('Death', { once: true, hold: true, restart: true }); }
    if (this.doll) { try { this.doll.sync(); } catch { /* */ } } else h.update(dt);
    h.placeShadow(0);
    if (!this.dead || this.deadT < 6) this.cacheZones();
  }
  cacheZones() {
    const h = this.h, s = this.scale;
    h.root.updateMatrixWorld(true);
    const w = (n) => h.worldOf(n, new Vector3());
    const head = w('Head'); head.y += 0.13 * s;
    this.zones = {
      head: head, headR: 0.2 * s * (this.def.small ? 1 : 1),
      torso: { a: w('Pelvis'), b: head.clone().setY(head.y - 0.15 * s), r: 0.22 * s },
      armR: [w('ArmR'), w('ForearmR'), w('HandR')], armL: [w('ArmL'), w('ForearmL'), w('HandL')],
      legR: [w('LegR'), w('ShinR'), w('FootR')], legL: [w('LegL'), w('ShinL'), w('FootL')],
    };
    if (this.def.small) { this.zones.head = new Vector3(this.x, 0.25, this.z); this.zones.headR = 0.3; this.zones.torso = { a: new Vector3(this.x, 0.2, this.z), b: new Vector3(this.x, 0.3, this.z), r: 0.3 }; }
  }
  /** Ray (unit dir) vs zones. Returns { t, zone } or null. Head first, then torso, arms, legs. */
  rayZones(ox, oy, oz, dx, dy, dz, maxT = 100) {
    const z = this.zones; if (!z) return null;
    let best = null;
    const test = (t, zone) => { if (t >= 0 && t <= maxT && (!best || t < best.t)) best = { t, zone }; };
    const aim = this.area.headBonus ?? 0;
    test(raySphere(ox, oy, oz, dx, dy, dz, z.head.x, z.head.y, z.head.z, z.headR + aim), 'head');
    test(rayCapsule(ox, oy, oz, dx, dy, dz, z.torso.a.x, z.torso.a.y, z.torso.a.z, z.torso.b.x, z.torso.b.y, z.torso.b.z, z.torso.r), 'torso');
    for (const arm of [z.armR, z.armL]) for (let i = 0; i < 2; i++) test(rayCapsule(ox, oy, oz, dx, dy, dz, arm[i].x, arm[i].y, arm[i].z, arm[i + 1].x, arm[i + 1].y, arm[i + 1].z, 0.09 * this.scale), 'arm');
    for (const leg of [z.legR, z.legL]) for (let i = 0; i < 2; i++) test(rayCapsule(ox, oy, oz, dx, dy, dz, leg[i].x, leg[i].y, leg[i].z, leg[i + 1].x, leg[i + 1].y, leg[i + 1].z, 0.11 * this.scale), 'leg');
    return best;
  }
  dispose() {
    try { this.doll?.dispose?.(); } catch { /* */ }
    if (this.body) { try { this.area.ctx.physics.world.removeRigidBody(this.body); } catch { /* gone */ } this.body = null; }
    this.h.dispose();
  }
}
