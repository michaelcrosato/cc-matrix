// One enemy: a plain state machine over a puppet. Kinematic capsule, flow-field movement, separation,
// attack tokens from the Director. WORK > ALERT > APPROACH > CIRCLE > WINDUP > ATTACK > RECOVER, plus
// STUN KNEEL FLINCH KNOCKDOWN GETUP GRAB VAULT CLIMB BASH PIN BLIND THROWUP SEA DEAD.
import { RAPIER, THREE } from '../../pixel-engine.js';
import { ENEMIES, ISLE_BARKS, MONK_BARKS, DROWNED_BARKS } from '../data/enemies.js';
import { TUNING } from '../data/tuning.js';
import { app } from '../core/app.js';
import { Humanoid } from './actor.js';
import { carrier } from './enemies/carrier.js';
import { harpooner } from './enemies/harpooner.js';
import { limpet } from './enemies/limpet.js';

const { Vector3 } = THREE;
const HALF = 0.5; const RADIUS = 0.28;
const flow = [0, 0];
const v = new Vector3();
const TAU = Math.PI * 2;
export const angleDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

let UID = 1;

export function makeZones(scale) {
  const seg = (r, side) => ({ a: new Vector3(), b: new Vector3(), r: r * scale, side });
  return {
    center: new Vector3(), radius: 1.4 * scale, head: { c: new Vector3(), r: 0.2 * scale },
    torso: { a: new Vector3(), b: new Vector3(), r: 0.22 * scale },
    arms: [seg(0.09, 'armR'), seg(0.09, 'armL'), seg(0.09, 'armR'), seg(0.09, 'armL')],
    legs: [seg(0.11, 'leg'), seg(0.11, 'leg'), seg(0.11, 'leg'), seg(0.11, 'leg')],
    part: 'torso',
  };
}

export class Enemy {
  constructor(area, type, o = {}) {
    this.area = area;
    this.type = type;
    this.d = ENEMIES[type];
    this.uid = UID++;
    this.id = area.nextEnemyId++;
    const { ctx } = area;
    const rng = ctx.random;
    this.hpMax = this.d.hp * TUNING.enemyHp * (o.hpMul ?? 1);
    this.hp = this.hpMax;
    this.helmet = this.d.helmet ?? 0;
    const [s0, s1] = this.d.speed;
    this.speedBase = rng.range(s0, s1 + 0.001);
    this.x = o.x ?? 0; this.z = o.z ?? 0;
    this.y = o.y ?? 0;
    this.floor = o.floor ?? 0;
    this.px = this.x; this.pz = this.z;
    this.yaw = o.yaw ?? 0;
    this.state = 'NONE';
    this.stateT = 0;
    this.dead = false;
    this.token = false;
    this.legDamage = 0;
    this.cool = rng.range(0.5, 2);
    this.circleDir = rng.chance(0.5) ? 1 : -1;
    this.stuckT = 0;
    this.shieldUp = !!this.d.shield;
    this.holding = this.d.prop?.length > 0;
    this.scale = this.d.big ?? 1;
    this.moved = 0;
    this.setpiece = o.setpiece ?? null;
    this.noLoot = !!o.noLoot;
    this.burn = 0;
    this.attract = !!o.attract;
    this.hitFlashCooldown = 0;
    if (this.d.crawler) this.buildCrawler();
    else this.buildPuppet(o);
    this.buildBody();
    this.zonesReady = false;
    this.zones = this.d.crawler ? null : makeZones(this.scale);
    this.enter(o.state ?? 'APPROACH');
    this.syncModel(1);
  }

  buildPuppet(o) {
    const { area, d } = this;
    const rng = area.ctx.random;
    const [id, palette] = rng.pick(d.models);
    this.actor = new Humanoid(id, { palette: o.palette ?? palette, scale: this.scale });
    area.ctx.scene.add(this.actor.root);
    if (d.prop?.length) {
      const prop = rng.pick(d.prop);
      this.propId = prop;
      this.prop = this.actor.attach('HandR', prop, { at: [0, -0.1, 0], rot: [Math.PI / 2, 0, 0] });
    }
    if (d.shield) this.shieldObj = this.actor.attach('ForearmL', 'w-shield', { at: [0.18, -0.12, 0.1], rot: [0, Math.PI / 2, 0] });
    if (d.saw) {
      this.sawDisc = this.prop?.getObjectByName('Disc');
      this.sawLoop = area.ctx.audio.loop('sawLoop', { volume: 0 });
    }
    this.actor.root.position.set(this.x, this.y, this.z);
    this.actor.root.rotation.y = this.yaw;
    if (this.type === 'gaffer') this.workClip = rng.pick(['WorkChop', 'WorkMend', 'Idle']);
  }

  buildBody() {
    const { physics } = this.area.ctx;
    const desc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(this.x, this.y + HALF + RADIUS, this.z);
    this.body = physics.world.createRigidBody(desc);
    const r = this.d.crawler ? 0.18 : RADIUS * this.scale;
    this.collider = physics.world.createCollider(RAPIER.ColliderDesc.capsule(this.d.crawler ? 0.02 : HALF * this.scale, r), this.body);
    physics.tag(this.collider, 'noCamera', 'enemy');
    this.area.softBodies.add(this.collider.handle);
  }

  // ---- State ----
  enter(state) {
    if (this.d.glint) this.glint(state === 'THROWUP');
    this.prevState = this.state;
    this.state = state;
    this.stateT = 0;
    const a = this.actor;
    if (!a) return;
    switch (state) {
      case 'WORK': a.play(this.workClip ?? 'Idle'); break;
      case 'IDLE': a.play('Idle'); break;
      case 'ALERT': a.play('Shout', { once: true }); this.bark(); this.area.alertNear(this, 15); break;
      case 'APPROACH': break;
      case 'CIRCLE': break;
      case 'WINDUP': a.play(this.d.windupClip ?? 'RaiseTool', { once: true, fade: 0.1, rate: (this.d.windupClip === 'HalberdSweep' ? 0.8 : 1) }); if (this.d.saw) this.area.ctx.audio.play('sawRev'); break;
      case 'ATTACK': a.play(this.d.attackClip ?? 'Swing', { once: true, fade: 0.05 }); break;
      case 'RECOVER': a.play('Idle', { fade: 0.3 }); break;
      case 'STUN': a.play('StunHands', { fade: 0.08 }); break;
      case 'KNEEL': a.play('KneelHit', { once: true, fade: 0.08 }); break;
      case 'FLINCH': a.play('HitReact', { once: true, fade: 0.05 }); break;
      case 'KNOCKDOWN': a.play('KnockedDown', { once: true, fade: 0.05 }); break;
      case 'GETUP': a.play('GetUp', { once: true, fade: 0.15 }); break;
      case 'GRAB': a.play('Push', { fade: 0.1 }); break;
      case 'VAULT': a.play('ClimbIn', { once: true, fade: 0.1 }); break;
      case 'CLIMB': a.play('LadderUp', { fade: 0.1 }); break;
      case 'BASH': a.play('BashDoor', { fade: 0.1 }); break;
      case 'PIN': a.play('StunHands', { fade: 0.05 }); break;
      case 'BLIND': a.play('StunHands', { fade: 0.08 }); break;
      case 'THROWUP': a.play('ThrowOverhand', { once: true, fade: 0.1 }); break;
      case 'SEA': a.play('WalkToSea', { fade: 0.5, rate: 1 }); break;
      case 'RISE': a.play('DrownedRise', { once: true }); break;
      case 'CARRY': a.play('CarrierShoulder', { once: true }); break;
      default: break;
    }
  }

  bark() {
    const { d, area } = this;
    if (d.mute || area.quietBarks) return;
    this.barkCool = 3;
    const set = d.barks === 'monk' ? MONK_BARKS : d.barks === 'drowned' ? DROWNED_BARKS : ISLE_BARKS;
    const text = area.ctx.random.pick(set);
    area.spatialBark(this, d.barks === 'monk' ? 'monk' : 'islander', text);
  }

  isDown() { return this.state === 'KNOCKDOWN' || this.state === 'KNEEL' || this.state === 'GETUP'; }
  canKick() { return !this.dead && (this.state === 'STUN' || this.state === 'BLIND' || (this.d.crawler && this.area.kickLimpets)); }
  canTakedown() { return !this.dead && this.state === 'KNEEL'; }
  pos3() { return v.set(this.x, this.y + 1, this.z); }

  // ---- Fixed step ----
  step(dt) {
    if (this.dead) { this.deadT = (this.deadT ?? 0) + dt; return; }
    this.stateT += dt;
    if (this.burn > 0) {
      this.burn -= dt;
      this.hp -= 15 * dt;
      if (this.hp <= 0) { this.die({ weapon: { id: 'fire' }, dir: v.set(0, 0, 1) }); return; }
    }
    const { area } = this;
    this.px = this.x; this.pz = this.z;
    if (app.dev.freezeAi && !area.scriptedAll) { this.commit(); return; }
    this.target = area.targetFor(this);
    const T = this.target;
    const dist = T ? Math.hypot(T.x - this.x, T.z - this.z) : 99;
    // Max has reached a dry room: nobody finishes a swing or a throw at her.
    if (T?.safeRoom && (this.state === 'WINDUP' || this.state === 'THROWUP')) {
      this.releaseToken(); this.releaseThrow();
      this.enter(this.state === 'THROWUP' ? this.prevAfterThrow ?? 'APPROACH' : 'APPROACH');
    }
    if (this.barkCool > 0) this.barkCool -= dt;
    this.cool -= dt;
    this.dist = dist;

    if (this.d.crawler) { this.stepCrawler(dt, T, dist); this.commit(); return; }

    const sameFloor = T && T.floor === this.floor;
    switch (this.state) {
      case 'WORK':
      case 'IDLE':
        if (this.alerted || (T && dist < 9 && sameFloor && area.lineOfSight(this, T))) this.enter('ALERT');
        break;
      case 'ALERT':
        this.faceTo(T, dt, 4);
        if (this.stateT > 0.5) this.enter('APPROACH');
        break;
      case 'APPROACH': this.stepApproach(dt, T, dist); break;
      case 'CIRCLE': this.stepCircle(dt, T, dist); break;
      case 'WINDUP': {
        this.faceTo(T, dt, 6);
        if (this.d.saw && this.stateT > 0.2 && dist > 2) this.moveDir(Math.sin(this.yaw), Math.cos(this.yaw), this.d.lungeSpeed * 0.6, dt);
        const w = this.d.windup * TUNING.windup + (area.run?.windupBonus ?? 0);
        if (this.stateT >= w) this.startAttack(T, dist);
        break;
      }
      case 'ATTACK': if (this.stateT > 0.4) this.enter('RECOVER'); break;
      case 'RECOVER':
        if (this.stateT > 0.45) { this.releaseToken(); this.enter('APPROACH'); }
        break;
      case 'STUN': if (this.stateT > 1.5) this.enter('APPROACH'); break;
      case 'BLIND': if (this.stateT > (this.blindFor ?? 4)) this.enter('APPROACH'); break;
      case 'KNEEL': if (this.stateT > 1.7) this.enter('GETUP'); break;
      case 'FLINCH': if (this.stateT > 0.25) this.enter(this.resume ?? 'APPROACH'); break;
      case 'KNOCKDOWN':
        if (this.pushV) { this.moveDir(this.pushV.x, this.pushV.z, this.pushV.s, dt); this.pushV.s = Math.max(0, this.pushV.s - 12 * dt); }
        if (this.stateT > 2.2) this.enter('GETUP');
        break;
      case 'GETUP': if (this.stateT > 0.8) this.enter('APPROACH'); break;
      case 'GRAB': {
        this.faceTo(T, dt, 8);
        if (!T?.grabbedBy || T.grabbedBy !== this) { this.releaseToken(); this.knockdown(v.set(Math.sin(this.yaw) * -1, 0, Math.cos(this.yaw) * -1)); }
        break;
      }
      case 'VAULT': this.stepVault(dt); break;
      case 'CLIMB': this.stepClimb(dt); break;
      case 'BASH': this.stepBash(dt, T); break;
      case 'PIN': if (this.stateT > (this.pinFor ?? 4)) this.enter('APPROACH'); break;
      case 'THROWUP': {
        this.faceTo(T, dt, 6);
        const release = 0.62 * TUNING.windup;
        if (!this.thrownDone && this.stateT >= release) { this.thrownDone = true; this.area.throwFrom(this, T); if (this.d.glint) this.glint(false); }
        if (this.stateT > 0.95) { this.releaseThrow(); this.enter(this.prevAfterThrow ?? 'APPROACH'); }
        break;
      }
      case 'SEA': this.stepSea(dt); break;
      case 'RISE': if (this.stateT > 1.2) this.enter('APPROACH'); break;
      case 'CARRY': this.stepCarry(dt); break;
      case 'SCRIPT': break;
      case 'LEDGE':
        this.faceTo(T, dt, 3);
        if (this.cool <= 0 && T && !T.safeRoom && dist < (this.d.throwRange ?? 12) + 3 && area.director.takeThrow(this)) {
          this.cool = area.ctx.random.range(5, 8);
          this.thrownDone = false;
          this.prevAfterThrow = 'LEDGE';
          this.enter('THROWUP');
        }
        if (this.actor?.playing !== 'Idle' && this.actor?.playing !== 'ThrowOverhand') this.actor.play('Idle', { fade: 0.2 });
        break;
      default: break;
    }
    if (this.d.fixed && this.state === 'APPROACH') this.stepFixedThrower(dt, T, dist);
    this.commit();
  }

  stepApproach(dt, T, dist) {
    const { d, area } = this;
    if (!T) { this.playLoco(0); return; }
    if (d.fixed) return;
    if (!T.alive && T.safeRoom) {
      // Max is in a dry room: they lose interest and drift back to a door, out of sight.
      const home = area.nearestSpawnDoor(this.x, this.z);
      if (Math.hypot(home[0] - this.x, home[1] - this.z) > 2) {
        const nav = area.navByKey('home');
        nav.flowTo(home[0], home[1]);
        if (nav.flowDirection(this.x, this.z, flow)) { this.moveDir(flow[0], flow[1], this.moveSpeed() * 0.7, dt, true); this.turnToward(Math.atan2(flow[0], flow[1]), dt, 5); this.playLoco(this.moveSpeed() * 0.7); return; }
      }
      this.playLoco(0);
      return;
    }
    if (!T.alive) { this.playLoco(0); return; }
    if (d.wantsDame && area.dame?.grabbable()) {
      const D = area.dame;
      const dd = Math.hypot(D.x - this.x, D.z - this.z);
      if (dd < 1.3) { this.enter('CARRY'); D.onGrabbed(this); return; }
      this.followFlow('dame', dt, this.moveSpeed(), D);
      return;
    }
    // Thrown attacks: one token shared by every thrower.
    if (d.thrown && this.cool <= 0 && dist < d.throwRange && dist > 3 && T.floor === this.floor && area.lineOfSight(this, T) && area.director.takeThrow(this)) {
      this.cool = area.ctx.random.range(3, 5.5);
      this.thrownDone = false;
      this.prevAfterThrow = 'APPROACH';
      this.enter('THROWUP');
      return;
    }
    if (dist < d.reach + 0.25 && T.floor === this.floor) {
      // A Net-Wife has nothing to hit you with: she keeps her distance and throws, and leaves the token for someone who has.
      if (!d.damage) { this.enter('CIRCLE'); return; }
      if (area.director.takeToken(this)) { this.enter('WINDUP'); return; }
      this.enter('CIRCLE');
      return;
    }
    if (d.saw && dist < 6 && dist > 2.6 && this.cool <= 0 && T.floor === this.floor) {
      this.cool = 5;
      this.lungeT = 0.9;
    }
    let speed = this.moveSpeed();
    if (this.lungeT > 0) { this.lungeT -= dt; speed = d.lungeSpeed * TUNING.enemySpeed; if (this.actor?.playing !== 'SawLunge') this.actor?.play('SawLunge', { fade: 0.1 }); this.followFlow('player', dt, speed, T); return; }
    // No token and close: hold off rather than pile in.
    if (dist < 3.2 && T.floor === this.floor && !area.director.tokenFree()) { this.enter('CIRCLE'); return; }
    this.followFlow('player', dt, speed, T);
  }

  stepCircle(dt, T, dist) {
    const { area } = this;
    if (!T) return;
    this.faceTo(T, dt, 3);
    if (area.director.tokenFree() && this.stateT > 0.4) { this.enter('APPROACH'); return; }
    if (dist > 5.4 || T.floor !== this.floor) { this.enter('APPROACH'); return; }
    const dx = (T.x - this.x) / Math.max(dist, 0.01); const dz = (T.z - this.z) / Math.max(dist, 0.01);
    // Strafe round at 3-5 m; a little in or out to hold the ring.
    const radial = dist > 4 ? 0.4 : dist < 3 ? -0.7 : 0;
    const mx = -dz * this.circleDir + dx * radial;
    const mz = dx * this.circleDir + dz * radial;
    const speed = this.moveSpeed() * 0.55;
    this.moveDir(mx, mz, speed, dt, true);
    this.playLoco(speed);
    if (this.stateT > 1.2 && this.stuckT > 0.3) this.circleDir *= -1;
  }

  moveSpeed() {
    return this.speedBase * TUNING.enemySpeed * (this.area.run?.rank >= 4 ? 1.1 : 1);
  }

  playLoco(speed) {
    const a = this.actor;
    if (!a) return;
    if (this.blockT > 0) { this.blockT -= 1 / 60; return; }
    if (speed <= 0.05) { if (a.playing !== 'Idle') a.play('Idle', { fade: 0.2 }); return; }
    a.loco(this.d.loco, speed, { fade: 0.2 });
  }

  /** Walk the flow field to the target, across floors if needed. */
  followFlow(key, dt, speed, T) {
    const { area } = this;
    const { nav, tx, tz, link } = area.navigate(this, key, T);
    if (link && Math.hypot(link.x - this.x, link.z - this.z) < 0.7) { this.startClimb(link); return; }
    let ok = false;
    const dToTarget = Math.hypot(tx - this.x, tz - this.z);
    if (dToTarget < 1.2 && nav.lineOfSight(this.x, this.z, tx, tz)) {
      flow[0] = (tx - this.x) / Math.max(dToTarget, 0.01); flow[1] = (tz - this.z) / Math.max(dToTarget, 0.01);
      ok = true;
    } else {
      ok = nav.flowDirection(this.x, this.z, flow);
    }
    if (ok) {
      this.moveDir(flow[0], flow[1], speed, dt);
      this.turnToward(Math.atan2(flow[0], flow[1]), dt, 5);
      this.playLoco(speed);
    } else {
      this.playLoco(0);
      this.faceTo(T, dt, 3);
    }
  }

  /** Move in a direction: separation, nav collision, doors and windows. */
  moveDir(dx, dz, speed, dt, noPortals = false) {
    const { area } = this;
    const sep = area.separation(this);
    const mx = dx * speed + sep[0]; const mz = dz * speed + sep[1];
    const nx = this.x + mx * dt; const nz = this.z + mz * dt;
    const nav = this.floor === 1 ? area.level.upper.nav : area.level.nav;
    // Portals on this floor's map: a closed door means bash, a window means vault.
    if (!noPortals && this.floor === 0 && this.state !== 'KNOCKDOWN') {
      const ahead = 0.42;
      const px = this.x + dx * ahead; const pz = this.z + dz * ahead;
      const ch = area.level.info.at(px, pz);
      if (ch === 'D') {
        const door = area.level.doorAt(area.level.info.col(px), area.level.info.row(pz));
        if (door && !door.open) {
          this.door = door;
          this.enter('BASH');
          return;
        }
      } else if (ch === 'W') {
        const w = area.level.windowAt(area.level.info.col(px), area.level.info.row(pz), 0);
        if (w) { this.startVault(w); return; }
      } else if (ch === 'p') { /* wardrobe stays passable until pushed; handled by its own nav closure */ }
    }
    let mvx = nx; let mvz = nz;
    if (!this.navFree(nav, nx, this.z)) mvx = this.x;
    if (!this.navFree(nav, mvx, nz)) mvz = this.z;
    // Bodies are solid both ways: nobody walks into Max. See Player.blockByBodies.
    const reach = (this.d.crawler ? 0.18 : RADIUS * this.scale) + 0.3;
    for (const p of area.players) {
      if (!p.alive || p.floor !== this.floor) continue;
      const after = Math.hypot(mvx - p.x, mvz - p.z);
      if (after < reach && after < Math.hypot(this.x - p.x, this.z - p.z)) { mvx = this.x; mvz = this.z; }
    }
    const moved = Math.hypot(mvx - this.x, mvz - this.z);
    if (moved < speed * dt * 0.2) this.stuckT += dt; else this.stuckT = 0;
    this.x = mvx; this.z = mvz;
    this.moved += moved;
  }

  navFree(nav, x, z) {
    return nav.walkable(x, z);
  }

  turnToward(a, dt, rate) {
    const d = angleDiff(a, this.yaw);
    const m = rate * dt;
    this.yaw += Math.max(-m, Math.min(m, d));
  }
  faceTo(T, dt, rate) { if (T) this.turnToward(Math.atan2(T.x - this.x, T.z - this.z), dt, rate); }

  startAttack(T, dist) {
    const { d, area } = this;
    const reach = d.reach + 0.45;
    if (d.saw) {
      this.enter('ATTACK');
      if (T && dist < reach && T.floor === this.floor) area.sawAttack(this, T);
      return;
    }
    if (d.grabChance && T && T.canBeGrabbed?.() && dist < reach && area.ctx.random.chance(d.grabChance)) {
      this.enter('GRAB');
      T.startGrab(this, d.grabDps, d.grabSlow);
      return;
    }
    this.enter('ATTACK');
    if (T && dist < reach && T.floor === this.floor && Math.abs(angleDiff(Math.atan2(T.x - this.x, T.z - this.z), this.yaw)) < 1.3) {
      T.hurt(d.damage, this, { melee: true });
    }
  }

  releaseToken() { if (this.token) this.area.director.releaseToken(this); }
  releaseThrow() { if (this.throwToken) this.area.director.releaseThrow(this); }

  // ---- Doors, windows, ladders ----
  stepBash(dt, T) {
    const door = this.door;
    if (!door || door.open) { this.enter('APPROACH'); return; }
    this.faceTo({ x: door.x, z: door.z }, dt, 6);
    door.hp -= dt * (door.barricade > 0 ? 0.4 : 1);
    door.bashT = (door.bashT ?? 0) - dt;
    if (door.bashT <= 0) { door.bashT = 0.85; this.area.ctx.audio.play('bash', this.area.spatial(this.x, this.z, 30)); this.area.ctx.particles.burst('dust', [door.x, 1, door.z], { count: 3 }); }
    if (door.hp <= 0) {
      this.area.breakDoor(door, this.x, this.z);
      this.enter('APPROACH');
    }
    if (this.stateT > 12) this.enter('APPROACH');
  }

  startVault(w) {
    this.vault = { w, fromX: this.x, fromZ: this.z, toX: w.alongX ? w.x : w.x + Math.sign(w.x - this.x) * 1.1, toZ: w.alongX ? w.z + Math.sign(w.z - this.z) * 1.1 : w.z };
    this.enter('VAULT');
    if (!w.broken) this.area.breakWindow(w);
  }
  stepVault(dt) {
    const dur = 0.8;
    const t = Math.min(1, this.stateT / dur);
    const V = this.vault;
    this.x = V.fromX + (V.toX - V.fromX) * t;
    this.z = V.fromZ + (V.toZ - V.fromZ) * t;
    if (t >= 1) this.enter('APPROACH');
  }

  startClimb(link) {
    this.climb = { link, fromY: this.y, toY: link.toFloor === 1 ? link.y1 : 0, x0: this.x, z0: this.z };
    link.climbers = (link.climbers ?? []);
    link.climbers.push(this);
    this.enter('CLIMB');
    this.area.ctx.audio.play('ladder', this.area.spatial(this.x, this.z, 20));
  }
  stepClimb(dt) {
    const C = this.climb;
    const t = Math.min(1, this.stateT / 1.2);
    this.y = C.fromY + (C.toY - C.fromY) * t;
    if (t >= 1) {
      this.floor = C.link.toFloor;
      this.x = C.link.toX; this.z = C.link.toZ;
      C.link.climbers = C.link.climbers.filter((e) => e !== this);
      this.enter('APPROACH');
    }
  }
  fallOffLadder() {
    this.floor = 0; this.y = 0;
    this.climb = null;
    this.knockdown(v.set(0, 0, 1));
    this.damageRaw(15);
  }

  // ---- Script: the Foghorn ----
  walkToSea(delay = 0) {
    if (this.dead) return;
    this.releaseToken();
    this.releaseThrow();
    this.seaDelay = delay;
    this.dropProp();
    this.enter('SEA');
    this.seaPhase = 0;
    this.floor === 1 && this.dieQuiet();
  }
  stepSea(dt) {
    const { area } = this;
    if (this.seaDelay > 0) { this.seaDelay -= dt; if (this.actor?.playing !== 'Idle') this.actor?.play('Idle', { fade: 0.2 }); return; }
    if (this.seaPhase === 0) {
      const g = area.seaField;
      const dir = g ? g.dirAt(this.x, this.z) : null;
      if (!dir) { this.seaPhase = 1; this.seaDir = [Math.sin(this.yaw), Math.cos(this.yaw)]; return; }
      const speed = 1.5;
      this.moveDir(dir[0], dir[1], speed, dt, true);
      this.turnToward(Math.atan2(dir[0], dir[1]), dt, 4);
      if (this.actor?.playing !== 'WalkToSea') this.actor?.play('WalkToSea', { fade: 0.4 });
      if (g.distAt(this.x, this.z) <= 0.5) { this.seaPhase = 1; this.seaDir = dir.slice(); this.actor?.play('Wade', { fade: 0.5 }); area.ctx.audio.play('splash', area.spatial(this.x, this.z, 40)); }
    } else {
      this.x += this.seaDir[0] * 0.9 * dt;
      this.z += this.seaDir[1] * 0.9 * dt;
      this.y -= 0.6 * dt;
      if (this.y < -2.4) this.dieQuiet();
    }
  }

  /** Gone without a corpse. */
  dieQuiet() {
    this.dead = true;
    this.quiet = true;
    this.releaseToken();
    this.releaseThrow();
    this.removeBody();
    this.area.onEnemyGone(this);
    if (this.actor) this.actor.root.visible = false;
    if (this.crawlObj) this.crawlObj.visible = false;
    this.stopLoops();
  }

  // ---- Carrier ----
  // ---- Limpets ----
  // ---- Damage ----
  /** A bullet, or a melee strike. Returns { killed }. */
  hit(h) {
    const { d, area } = this;
    if (this.dead) return { killed: false };
    area.onEnemyHit?.(this, h);
    if (this.state === 'SEA') { this.damageRaw(h.damage); this.effectHit(h); return { killed: this.dead }; }
    // Knights: armour sparks, helmet comes off, then the head.
    if (d.armored && !h.melee) {
      if (h.zone === 'head' && this.helmet > 0) {
        this.helmet -= h.damage * 0.5;
        area.fx.sparks(h.point);
        area.ctx.audio.play('armorSpark', area.spatial(this.x, this.z, 30));
        if (this.helmet <= 0) this.loseHelmet();
        return { killed: false };
      }
      if (h.zone !== 'head') {
        area.fx.sparks(h.point);
        area.ctx.audio.play('armorSpark', area.spatial(this.x, this.z, 30));
        this.damageRaw(h.damage * 0.08);
        if (this.dead) { this.die(h); return { killed: true }; }
        return { killed: false };
      }
    }
    // Monks: the shield blocks the front. Shoot the arm, or kick, to drop it.
    if (this.shieldUp && !h.melee && (h.zone === 'torso' || h.zone === 'leg')) {
      const front = Math.abs(angleDiff(Math.atan2(-h.dir.x, -h.dir.z), this.yaw)) < 1.2;
      if (front) {
        area.fx.sparks(h.point);
        area.ctx.audio.play('metalClang', area.spatial(this.x, this.z, 30));
        if (this.state === 'APPROACH') { this.actor?.play('ShieldBlock', { once: true, fade: 0.05 }); this.blockT = 0.4; }
        return { killed: false };
      }
    }
    if (this.shieldUp && h.zone === 'arm') this.dropShield();
    this.effectHit(h);
    // The pistol's head pop: a small chance of ending the claim outright.
    if (h.zone === 'head' && h.weapon?.headPop && !d.armored && !d.headOnlyStagger && area.ctx.random.chance(h.weapon.headPop)) { h.headPopped = true; this.hp = 0; }
    this.hp -= h.damage;
    if (h.by?.isLocal) h.by.onEnemyDamaged?.(this, h);
    if (this.hp <= 0) { this.die(h); return { killed: true }; }
    if (h.weapon?.id === 'harpoon' || h.weapon?.pin) { this.pin(h); return { killed: false }; }
    if (this.setpiece === 'bolted') return { killed: false };
    this.react(h);
    return { killed: false };
  }

  react(h) {
    const { d, area } = this;
    if (this.state === 'LEDGE' || this.prevAfterThrow === 'LEDGE') return;
    const rng = area.ctx.random;
    if (['VAULT', 'CLIMB', 'CARRY', 'RISE', 'GRAB'].includes(this.state) && !(this.state === 'CARRY' || this.state === 'GRAB')) return;
    if (this.state === 'CARRY' || this.state === 'GRAB') {
      if (h.zone !== 'arm') { this.interruptHold(); return; }
    }
    const big = (h.weapon?.pellets ?? 1) > 1;
    if (d.headOnlyStagger) {
      const staggered = h.zone === 'head' || big;
      if (staggered) {
        this.staggerPool = (this.staggerPool ?? 0) + (h.zone === 'head' ? 1 : 0.28);
        if (this.staggerPool >= 1) { this.staggerPool = 0; this.releaseToken(); this.enter('STUN'); }
      }
      return;
    }
    switch (h.zone) {
      case 'head':
        if (this.state !== 'STUN' && rng.chance(TUNING.staggerChance)) { this.releaseToken(); this.enter('STUN'); }
        else if (this.state === 'WINDUP') { this.releaseToken(); this.flinch(); }
        break;
      case 'leg':
        this.legDamage += h.damage;
        if (this.legDamage >= 18) { this.legDamage = 0; this.releaseToken(); this.enter('KNEEL'); }
        else this.flinchIfFree();
        break;
      case 'arm':
        if (this.holding && d.thrown === 'bottle') { this.holding = false; this.dropProp(); area.fx.fireAt(this.x, 0.1, this.z, 1.8); area.addFirePool(this.x, this.z, 1.8, 3, 15); this.hitFire(); }
        else this.flinchIfFree();
        break;
      default:
        if (this.state === 'WINDUP' && h.damage >= 10) { this.releaseToken(); this.flinch(); } else this.flinchIfFree();
        break;
    }
    if (big && h.t < 6 && !this.isDown() && this.state !== 'STUN' && h.weapon?.knock) {
      this.pelletHits = (this.pelletHits ?? 0) + 1;
      if (this.pelletHits >= 3 || h.weapon?.pushAll) { this.pelletHits = 0; this.knockdown(h.dir); }
    }
  }

  hitFire() { this.burn = Math.max(this.burn, 3); }

  /** Carrier or grabber stops: Max or the Dame is free. */
  interruptHold() {
    if (this.state === 'CARRY' && this.area.dame?.carrier === this) this.area.dame.onDropped();
    this.releaseToken();
    this.enter('FLINCH');
    this.resume = 'APPROACH';
  }

  flinch() { this.resume = 'APPROACH'; this.enter('FLINCH'); }
  flinchIfFree() {
    if (['APPROACH', 'CIRCLE', 'RECOVER', 'WORK', 'IDLE', 'ALERT'].includes(this.state)) {
      this.resume = this.state === 'CIRCLE' ? 'CIRCLE' : 'APPROACH';
      this.enter('FLINCH');
    }
  }

  dropProp() {
    if (this.prop) {
      this.area.fx.dropProp(this.prop, this);
      this.prop.visible = false;
    }
  }
  dropShield() {
    this.shieldUp = false;
    if (this.shieldObj) { this.area.fx.dropProp(this.shieldObj, this); this.shieldObj.visible = false; }
    this.area.ctx.audio.play('metalClang', this.area.spatial(this.x, this.z, 30));
  }
  loseHelmet() {
    this.helmet = 0;
    const h = this.actor?.root.getObjectByName('Helmet');
    if (h) { this.area.fx.dropProp(h, this); h.visible = false; }
    this.area.ctx.audio.play('metalClang', this.area.spatial(this.x, this.z, 30));
    this.helmetOff = true;
    this.releaseToken();
    this.enter('STUN');
  }

  pin(h) {
    this.releaseToken();
    this.pinFor = h.weapon?.pin ?? 4;
    this.enter('PIN');
    this.area.fx.boltAt(this, h.dir);
    this.area.spawnBoltPickup?.(this.x, this.z);
  }

  knockdown(dir) {
    if (this.dead || this.d.crawler) return;
    if (this.state === 'CARRY' || this.state === 'GRAB') this.interruptHold();
    this.releaseToken();
    this.releaseThrow();
    if (this.d.headOnlyStagger) { this.enter('STUN'); return; }
    this.pushV = { x: dir?.x ?? 0, z: dir?.z ?? 0, s: 3 };
    this.enter('KNOCKDOWN');
  }

  kicked(damage, by) {
    if (this.dead) return;
    const dir = v.set(this.x - by.x, 0, this.z - by.z).normalize();
    if (this.shieldUp) this.dropShield();
    this.area.fx.flashBody(this);
    this.damageRaw(damage);
    if (this.dead) { this.die({ weapon: { id: 'kick' }, dir, zone: 'torso' }); return; }
    this.knockdown(dir);
    // Kicked into the sea: gone.
    if (this.area.level.info.at(this.x + dir.x * 1.2, this.z + dir.z * 1.2) === '~') {
      this.walkIntoSeaNow(dir);
    }
  }

  walkIntoSeaNow(dir) {
    this.seaDir = [dir.x, dir.z];
    this.seaPhase = 1;
    this.seaDelay = 0;
    this.enter('SEA');
    this.area.ctx.audio.play('splash', this.area.spatial(this.x, this.z, 40));
  }

  blast(damage, dir, knock) {
    if (this.dead) return;
    this.area.fx.flashBody(this);
    this.hp -= damage;
    if (this.hp <= 0) { this.die({ weapon: { id: 'blast', pellets: 8 }, dir, zone: 'torso', explosive: true }); return; }
    if (knock) this.knockdown(dir);
  }

  blind(seconds) {
    if (this.dead) return;
    if (this.d.crawler) { this.hp = 0; this.die({ weapon: { id: 'flare' }, dir: v.set(0, 1, 0), zone: 'torso' }); return; }
    if (this.state === 'CARRY' || this.state === 'GRAB') this.interruptHold();
    this.releaseToken();
    this.blindFor = seconds;
    this.enter('BLIND');
  }

  damageRaw(d) { this.hp -= d; if (this.hp <= 0 && !this.dead) this.die({ weapon: { id: 'raw' }, dir: v.set(0, 0, 1), zone: 'torso' }); }

  effectHit(h) {
    const { area } = this;
    area.fx.bodyHit(this, h);
    area.ctx.audio.play(h.zone === 'head' ? 'gruntHigh' : 'grunt', { ...area.spatial(this.x, this.z, 24), pitch: area.ctx.random.range(-2, 2) });
  }

  die(h) {
    if (this.dead) return;
    const { area, d } = this;
    this.dead = true;
    if (this.state === 'CARRY' && area.dame?.carrier === this) area.dame.onDropped();
    this.releaseToken();
    this.releaseThrow();
    this.removeBody();
    this.stopLoops();
    this.corpse = true;
    const rng = area.ctx.random;
    if (this.crawlObj) {
      area.fx.limpetBurst(this.x, this.y, this.z);
      this.crawlObj.visible = false;
      this.corpse = false;
    } else {
      const violent = h.explosive || (h.weapon?.pellets ?? 1) > 1;
      const ragdollOk = d.ragdoll !== false && this.scale === 1;
      if (violent && ragdollOk && area.ragdollsLive < 8 && !this.area.noRagdolls) {
        const speed = h.explosive ? 8 : 5;
        const ok = this.actor.goRagdoll(area.ctx.physics, [h.dir.x * speed, 2, h.dir.z * speed]);
        if (ok) { area.ragdollsLive++; this.ragdolled = true; this.actor.onRagdollSettled = () => { area.ragdollsLive = Math.max(0, area.ragdollsLive - 1); }; }
      }
      if (!this.ragdolled) this.actor.play('Death', { once: true, fade: 0.08 });
      this.headPop = h.zone === 'head' && (h.headPopped || (h.weapon?.headPop && rng.chance(h.weapon.headPop)));
      if (this.headPop) this.popHead(h);
      else if (h.zone === 'head' && (h.weapon?.id === 'pistol' || (h.damage >= this.hpMax * 0.7))) this.popHead(h);
    }
    if (this.d.saw) this.prop && (this.prop.visible = true);
    area.onEnemyKilled(this, h);
    return true;
  }

  popHead(h) {
    this.headPop = true;
    const head = this.actor?.joints.Head;
    if (head) head.scale.setScalar(0.001);
    this.area.fx.headPop(this, h);
    this.area.ctx.audio.play('headPop', this.area.spatial(this.x, this.z, 30));
  }

  removeBody() {
    const { physics } = this.area.ctx;
    if (this.body && physics.isAlive(this.body)) physics.remove(this.body);
    this.body = null;
    this.collider = null;
  }

  stopLoops() {
    if (this.sawLoop) { this.sawLoop.stop(); this.sawLoop = null; }
  }

  // ---- Per frame ----
  commit() {
    if (this.body) this.body.setNextKinematicTranslation({ x: this.x, y: this.y + HALF * this.scale + RADIUS, z: this.z });
  }

  syncModel(alpha) {
    const x = this.px + (this.x - this.px) * alpha;
    const z = this.pz + (this.z - this.pz) * alpha;
    if (this.actor) {
      if (!this.ragdolled) {
        this.actor.root.position.set(x, this.y, z);
        this.actor.root.rotation.y = this.yaw;
      }
    } else if (this.crawlObj) {
      this.crawlObj.position.set(x, this.y, z);
      this.crawlObj.rotation.y = this.yaw;
    }
  }

  frame(dt, alpha) {
    this.syncModel(alpha);
    const { actor, area } = this;
    if (this.sawLoop && !this.dead) {
      const near = area.listenerInfo(this.x, this.z, 30);
      this.sawLoop.set({ volume: near.gain * 1.1, pan: near.pan, muffle: near.blocked ? 0.75 : 0, pitch: this.state === 'WINDUP' || this.lungeT > 0 ? 5 : 0 });
      if (this.sawDisc) this.sawDisc.rotateX(dt * 40);
    }
    if (actor) {
      actor.update(dt);
      if (!this.ragdolled) {
        const lookAt = !this.dead && !this.isDown() && this.target && Math.hypot(this.target.x - this.x, this.target.z - this.z) < 8;
        if (lookAt && this.state !== 'SEA') actor.lookToward(this.target.x, this.target.z, 0.7);
      }
      if (!this.dead) this.updateZones();
    }
    if (this.crawlObj && !this.dead) {
      this.crawlObj.position.y = this.y + Math.abs(Math.sin(this.moved * 9)) * 0.03;
    }
  }

  /** Hit zones from the joints' world positions. */
  updateZones() {
    const { actor, zones: z, scale } = this;
    const root = actor.root;
    root.updateMatrixWorld(true);
    const P = (name, out) => out.setFromMatrixPosition(actor.joints[name].matrixWorld);
    P('Pelvis', z.torso.a);
    P('Head', z.head.c);
    z.torso.b.copy(z.head.c);
    z.head.c.y += 0.13 * scale;
    P('ArmR', z.arms[0].a); P('ForearmR', z.arms[0].b);
    P('ForearmR', z.arms[2].a); P('HandR', z.arms[2].b);
    P('ArmL', z.arms[1].a); P('ForearmL', z.arms[1].b);
    P('ForearmL', z.arms[3].a); P('HandL', z.arms[3].b);
    P('LegR', z.legs[0].a); P('ShinR', z.legs[0].b);
    P('ShinR', z.legs[2].a); P('FootR', z.legs[2].b);
    P('LegL', z.legs[1].a); P('ShinL', z.legs[1].b);
    P('ShinL', z.legs[3].a); P('FootL', z.legs[3].b);
    z.center.copy(z.torso.a);
    z.center.y += 0.1;
    this.zonesReady = true;
  }

  /** The point a bot aims at. */
  aimPoint(zone, out) {
    if (this.d.crawler) return out.set(this.x, this.y + 0.1, this.z);
    if (!this.zonesReady) return out.set(this.x, this.y + 1.1, this.z);
    if (zone === 'head') return out.copy(this.zones.head.c);
    if (zone === 'leg') return out.copy(this.zones.legs[0].b);
    if (zone === 'arm') return out.copy(this.zones.arms[3].a);
    return out.copy(this.zones.torso.a).lerp(this.zones.torso.b, 0.5);
  }

  dispose() {
    this.stopLoops();
    this.actor?.dispose();
  }
}

// What belongs to one type lives in src/game/enemies/.
Object.assign(Enemy.prototype, limpet, carrier, harpooner);
