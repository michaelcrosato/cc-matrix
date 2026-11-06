// A soldier is data plus an optional view. In a Cash Run client he is a puppet with no brain and no collider.
import { THREE, CharacterController, Ragdoll, HERO_RAGDOLL, BehaviorTree, bt, buildModel, setLookLayer } from '../../pixel-engine.js';
import { TUNING } from '../core/tuning.js';
import { LIMP_SPEED } from '../art/clips.js';
import { MODELS } from '../art/models.js';
import { makePerson } from './rig.js';
import { clamp, lerp, wrapAngle, hash2 } from '../core/rng.js';
import { F } from '../world/fire.js';
const { Vector3 } = THREE;
const _a = new Vector3(), _b = new Vector3(), _d = new Vector3();
const SKINS = ['plum', 'red', 'orange', 'sand'];
const FACTIONS = {
  concord: [{ cloth: 'slate', dark: 'night', hat: 'navy', strap: 'white' }, { cloth: 'slate', dark: 'navy', hat: 'navy', strap: 'white' }, { cloth: 'night', dark: 'slate', hat: 'navy', strap: 'mist' }],
  harvest: [{ cloth: 'sand', dark: 'red', hat: 'red', strap: 'orange' }, { cloth: 'orange', dark: 'plum', hat: 'red', strap: 'sand' }, { cloth: 'red', dark: 'sand', hat: 'red', strap: 'plum' }],
  deserter: [{ cloth: 'mist', dark: 'plum', hat: 'night', strap: 'red' }, { cloth: 'slate', dark: 'red', hat: 'orange', strap: 'plum' }],
};
const MODELS_BY_HAT = ['soldier-a', 'soldier-b', 'soldier-c', 'soldier-d'];
const HP = { rifle: 70, mg: 110, sniper: 60, rocket: 70, driver: 60 };
const SPEED = { rifle: 4.2, mg: 3.4, sniper: 3.8, rocket: 3.6, driver: 4.2 };

function makeTree(s) {
  const b = bt;
  return new BehaviorTree(b.selector('brain',
    b.sequence('burn', b.condition('on fire?', (o) => o.burning > 0), b.action('panic', (o, dt) => o.brainBurn(dt))),
    b.sequence('flee fire', b.condition('fire near?', (o) => o.fireNear()), b.action('crosswind', (o, dt) => o.brainFleeFire(dt))),
    b.sequence('dodge', b.condition('grenade?', (o) => o.dodgeT > 0), b.action('dodge', (o, dt) => o.brainDodge(dt))),
    b.sequence('surrender', b.condition('hands up?', (o) => o.surrenderT > 0), b.action('wait', (o, dt) => o.brainSurrender(dt))),
    b.sequence('combat', b.condition('alert?', (o) => o.state === 'alert'), b.action('fight', (o, dt) => o.brainCombat(dt))),
    b.sequence('search', b.condition('searching?', (o) => o.state === 'searching' || o.state === 'suspicious'), b.action('look', (o, dt) => o.brainSearch(dt))),
    b.action('duty', (o, dt) => o.brainDuty(dt))), s);
}
export class Soldier {
  kind = 'soldier'; active = false; dead = false; x = 0; y = 0; z = 0; yaw = 0; hp = 70; maxHp = 70; state = 'idle'; suspicion = 0; burning = 0; dodgeT = 0; target = null; lastKnown = null; searchT = 0; fireCool = 0; burstLeft = 0; burstPause = 0; reactT = 0; repositionT = 0; goal = null; path = null; pathI = 0; pathWait = false; moveWanted = 0; aimYaw = 0; jamT = 0; barkCool = 0; sees = false; panicDir = 0; dutyT = 0; sleeping = false; hasRagdoll = false; goalSeat = null;
  puppet = false;
  constructor(game, id) { this.game = game; game.nextSoldierId = (game.nextSoldierId ?? 0) + 1; this.id = id ?? game.nextSoldierId; }
  /** Body and view, once, then reused from the pool. */
  makeBody(ctx) {
    if (!this.cc) {
      this.cc = new CharacterController(ctx.physics, { position: [this.x, this.y + 0.1, this.z], radius: 0.32, halfHeight: 0.56, speed: 4, jumpSpeed: 0, gravity: -24 });
      ctx.physics.tag(this.cc.collider, 'npc');
      this.game.hitMap.set(this.cc.collider.handle, { kind: 'soldier', ref: this });
    }
  }
  makeView(ctx) {
    const g = this.game;
    if (this.view || !g.views) return;
    const r = g.rng.look;
    const pal = r.pick(FACTIONS[this.faction]);
    const p = makePerson(r.pick(MODELS_BY_HAT), { ...pal, skin: r.pick(SKINS) });
    const gun = buildModel('npc-rifle', { catalog: MODELS });
    setLookLayer(gun.object, 'actors');
    gun.object.rotation.x = Math.PI / 2;
    gun.object.position.set(0, -0.08, 0.04);
    p.object.getObjectByName('HandR').add(gun.object);
    this.view = p; this.gunObj = gun.object;
    ctx.scene.add(p.object);
    this.doll = null;
  }
  spawn(ctx, { faction, role = 'rifle', x, z, yaw = 0, squad, duty = 'guard', fixed = false, y }) {
    const g = this.game;
    this.vehicle = null; this.shoveT = 0;
    this.faction = faction; this.role = role; this.squad = squad ?? null; this.duty = duty; this.fixed = fixed;
    this.x = x; this.z = z; this.y = y ?? g.world.heightAt(x, z); this.yaw = yaw; this.home = { x, z, y: this.y };
    this.hp = this.maxHp = HP[role] * TUNING.enemyHealth;
    this.dead = false; this.state = 'idle'; this.suspicion = 0; this.burning = 0; this.dodgeT = 0; this.target = null; this.lastKnown = null; this.goal = null; this.path = null; this.active = true; this.sees = false; this.fireCool = 0; this.jamT = 0; this.dutyT = g.rng.ai.range(0, 3); this.sleeping = false; this.sitting = false; this.reactT = 0; this.surrenderT = 0; this.triedSurrender = false; this.fireCheckT = 0; this.cachedTarget = null; this.targetInfo = null;
    if (!this.puppet) {
      this.makeBody(ctx);
      this.cc.teleport([x, this.y + 0.08, z]);
      this.cc.speed = SPEED[role];
      this.cc.collider.setEnabled(true);
      this.tree = this.tree ?? makeTree(this);
      this.tree.halt();
    }
    this.makeView(ctx);
    if (this.view) {
      if (this.doll) { this.doll.disable(); this.doll = null; }
      this.view.object.visible = true;
      this.view.object.position.set(x, this.y, z); this.view.object.rotation.set(0, yaw, 0);
      this.view.anim.stop();
      this.view.anim.set('Idle', 'Idle');
      if (this.gunObj) this.gunObj.visible = true;
    }
    return this;
  }
  despawn() {
    this.active = false;
    if (this.cc) { this.cc.teleport([this.home?.x ?? 0, -40, this.home?.z ?? 0]); this.cc.collider.setEnabled(false); }
    if (this.doll) { this.doll.disable(); this.doll = null; }
    if (this.view) this.view.object.visible = false;
  }
  fromBehind(px, pz) {
    if (this.state === 'alert' && this.sees) return false;
    const dx = px - this.x, dz = pz - this.z;
    const d = wrapAngle(Math.atan2(dx, dz) - this.yaw);
    return Math.abs(d) > 1.8;
  }
  hurt(a, who, dir, zone, opts = {}) {
    const g = this.game;
    if (this.dead) return;
    const fromPlayer = who === 'player';
    if (g.dev.oneHit && fromPlayer) a = 9999;
    this.hp -= a;
    if (fromPlayer || who?.kind === 'buddy') { this.alertTo(g.player.feet.x, g.player.feet.z, who === 'player' ? 'player' : who); if (this.squad) this.squad.angry = true; }
    else if (who?.kind === 'soldier' && who.faction !== this.faction) { this.target = who; this.state = 'alert'; }
    else if (opts.seat != null && who?.x != null) this.alertTo(who.x, who.z, who);
    if (g.round) { g.round.onSoldierHurt(this, a, who, opts); }
    if (this.hp <= 0) { this.die(who, dir, zone, opts); return; }
    this.view?.anim.shot(a >= 30 ? 'Hurt' : 'HitReact', 1.2);
    g.voice.bark(this, 'hit');
    if (this.state !== 'alert') this.state = 'alert';
    // The last man, nearly gone, sometimes tries it. He gets to keep trying for a few seconds.
    if (!g.round && this.squad && this.squad.alive === 1 && this.hp < this.maxHp * 0.35 && !this.triedSurrender && g.rng.ai.chance(0.4)) { this.triedSurrender = true; this.surrenderT = 7; this.burstLeft = 0; this.view?.anim.set('Surrender', 'Surrender', 0.15); g.events.emit('surrender', this); g.say(this.faction, 'ENOUGH! ENOUGH, I AM ONLY PAID BY THE MONTH!', 2.5); g.voice.say(this.faction, 'ENOUGH I AM ONLY PAID BY THE MONTH', { gain: 0.8 }); }
  }
  die(who, dir, zone, opts = {}) {
    const g = this.game;
    this.dead = true;
    this.burningAtDeath = this.burning > 0;
    this.burning = 0;
    if (this.cc) { this.cc.collider.setEnabled(false); }
    if (this.squad) this.squad.onDeath(this);
    g.events.emit('kill', this, who, zone);
    if (who === 'player' || opts.seat != null) { g.ledger.add('paid', 1); }
    g.voice.bark(this, 'ally-down-near');
    // Keep a gun on the ground, worn.
    if (!g.round && this.gunObj && !opts.noDrop) g.actors.dropGun(this);
    if (this.view) {
      if (this.gunObj) this.gunObj.visible = false;
      this.view.anim.stop();
      const vel = dir ? [dir.x * (zone === 'blast' ? 9 : 3.2), (zone === 'blast' ? 5 : 1.2), dir.z * (zone === 'blast' ? 9 : 3.2)] : [0, 1, 0];
      try {
        this.doll = new Ragdoll(g.ctx.physics, this.view.object, HERO_RAGDOLL);
        this.doll.enable({ velocity: vel });
        this.corpseT = 25;
      } catch { this.doll = null; this.view.object.rotation.x = -Math.PI / 2; }
    }
  }
  ignite() {
    if (this.dead || this.burning > 0 || this.game.round?.isClient) return;
    this.burning = 5; this.state = 'burn';
    this.panicDir = this.game.rng.ai.range(0, 6.28);
    this.game.events.emit('soldier-burning', this);
    this.game.voice.bark(this, 'burning');
    this.view?.anim.set('BurnPanic', 'BurnPanic', 0.1);
  }
  alertTo(x, z, tgt) {
    if (this.dead) return;
    const was = this.state;
    this.lastKnown = { x, z };
    this.state = 'alert';
    this.suspicion = 1;
    if (tgt) this.target = tgt;
    if (was !== 'alert') {
      this.reactT = TUNING.enemyReaction;
      this.game.voice.bark(this, 'spotted');
      this.view?.anim.shot('Shout');
      if (this.squad) this.squad.share(x, z, this);
      this.sleeping = false;
    }
  }
  // ---- senses, at 10 Hz ----
  perceive(dt) {
    const g = this.game;
    const tgt = g.actors.pickTarget(this);
    this.sees = false;
    if (!tgt) { if (this.state === 'alert' && !this.lastKnown) this.state = 'searching'; this.target = null; return; }
    const tx = tgt.x, tz = tgt.z, ty = tgt.eyeY;
    const dx = tx - this.x, dz = tz - this.z, dist = Math.hypot(dx, dz);
    const vis = g.actors.visionFor(this, tgt, dist);
    let seen = false;
    if (dist < vis && !this.sleeping) {
      const ang = Math.abs(wrapAngle(Math.atan2(dx, dz) - this.yaw));
      if (ang < (60 * Math.PI) / 180 || dist < 3 || this.state === 'alert') seen = this.hasLOS(tgt, tx, ty, tz, dist);
    }
    this.sees = seen;
    if (seen) {
      this.target = tgt.ref ?? tgt;
      this.targetInfo = tgt;
      this.lastKnown = { x: tx, z: tz };
      const rate = lerp(1.6, 0.45, clamp(dist / vis, 0, 1));
      this.suspicion = clamp(this.suspicion + dt * rate, 0, 1);
      if (this.suspicion >= 0.34 && this.state === 'idle') { this.state = 'suspicious'; this.searchT = 6; g.voice.bark(this, 'suspicious'); }
      if (this.suspicion >= 1 && this.state !== 'alert') this.alertTo(tx, tz, tgt.ref ?? tgt);
      if (this.state === 'alert') this.lastSeenT = 0;
    } else {
      if (this.state !== 'alert') this.suspicion = clamp(this.suspicion - dt * 0.12, 0, 1);
      this.lastSeenT = (this.lastSeenT ?? 0) + dt;
      if (this.state === 'alert' && this.lastSeenT > 6) { this.state = 'searching'; this.searchT = 20; g.voice.bark(this, 'lost'); }
    }
  }
  hasLOS(tgt, tx, ty, tz, dist) {
    const g = this.game;
    _a.set(this.x, this.y + (this.crouchAim ? 1.1 : 1.5), this.z);
    _d.set(tx - _a.x, ty - _a.y, tz - _a.z); const l = _d.length() || 1; _d.multiplyScalar(1 / l);
    const hit = g.ctx.physics.castRay(_a, _d, l + 0.3, [], this.cc?.body);
    if (!hit) return true;
    const ent = g.hitMap.get(hit.collider.handle);
    if (ent && (ent.kind === tgt.kind || ent.ref === tgt.ref || ent.kind === 'vehicle' && tgt.inVehicle)) return true;
    return hit.distance >= l - 0.5;
  }
  fireNear() {
    const g = this.game;
    if (this.fixed) return false;
    if (this.fireCheckT > 0) return this.fireIsNear;
    this.fireCheckT = 0.5;
    this.fireIsNear = false;
    const wx = g.wind.x, wz = g.wind.z;
    for (let i = 1; i <= 2; i++) {
      if (g.fire.isBurning(this.x, this.z) || g.fire.isBurning(this.x - wx * 5 * i, this.z - wz * 5 * i) || g.fire.isBurning(this.x + 5 * i, this.z) || g.fire.isBurning(this.x - 5 * i, this.z) || g.fire.isBurning(this.x, this.z + 5 * i) || g.fire.isBurning(this.x, this.z - 5 * i)) { this.fireIsNear = true; break; }
    }
    if (g.fire.isBurning(this.x, this.z)) this.ignite();
    return this.fireIsNear;
  }
  // ---- brain actions, at 10 Hz ----
  brainBurn(dt) {
    const g = this.game;
    this.burning -= dt;
    this.panicDir += g.rng.ai.range(-1.1, 1.1) * dt * 4;
    this.goal = null; this.steerDir = this.panicDir; this.moveWanted = 6.5;
    this.yaw = this.panicDir;
    if (this.burnLight == null) this.burnLight = 1;
    // Spread fire to the cells crossed.
    const id = g.fire.idOf(this.x, this.z);
    if (id >= 0 && g.fire.state[id] === 0 && g.fire.fuel[id] > 0) g.fire.lightCell(id, 'spread');
    if (this.burnBark === undefined || (this.burnBark -= dt) <= 0) { this.burnBark = 1.2; g.voice.bark(this, 'burning'); }
    this.hp -= (this.maxHp / 5) * dt;
    if (this.burning <= 0 || this.hp <= 0) { this.hp = 0; this.die(this.lastFireBy ?? 'fire', null, 'fire'); }
    return 'running';
  }
  brainFleeFire(dt) {
    const g = this.game;
    this.state = this.state === 'idle' ? 'suspicious' : this.state;
    // Crosswind, away from the flames.
    const a = g.wind.dir + Math.PI / 2 * (this.id % 2 ? 1 : -1);
    this.steerDir = Math.atan2(Math.cos(a), Math.sin(a));
    this.goal = null; this.moveWanted = 6.2;
    this.yaw = this.steerDir;
    if (g.rng.ai.chance(dt * 0.5)) g.voice.bark(this, 'fire');
    return 'running';
  }
  brainSurrender(dt) {
    this.surrenderT -= dt; this.goal = null; this.moveWanted = 0;
    if (this.view) this.view.anim.set('Surrender', 'Surrender');
    return 'running';
  }
  brainDodge(dt) {
    this.dodgeT -= dt; this.goal = null; this.moveWanted = 6; this.steerDir = this.dodgeDir ?? 0; return 'running';
  }
  brainCombat(dt) {
    const g = this.game;
    const tgt = this.targetInfo;
    const lk = this.lastKnown ?? (tgt ? { x: tgt.x, z: tgt.z } : null);
    if (!lk) { this.state = 'searching'; this.searchT = 12; return 'running'; }
    const dx = lk.x - this.x, dz = lk.z - this.z, dist = Math.hypot(dx, dz);
    this.aimYaw = Math.atan2(dx, dz);
    this.reactT -= dt;
    this.repositionT -= dt;
    if (this.jamT > 0) { this.jamT -= dt; this.moveWanted = 0; this.goal = null; return 'running'; }
    // Move: cover first, re-position every 4 to 8 s; one flanks.
    if (!this.fixed && this.repositionT <= 0) {
      this.repositionT = g.rng.ai.range(4, 8);
      const flank = this.squad && this.squad.flanker === this;
      if (flank) {
        const side = this.id % 2 ? 1 : -1, nx = dz / (dist || 1), nz = -dx / (dist || 1);
        this.setGoal(lk.x + nx * side * 18 - (dx / (dist || 1)) * 14, lk.z + nz * side * 18 - (dz / (dist || 1)) * 14);
      } else {
        const c = g.actors.nearestCover(this, lk);
        if (c) this.setGoal(c.x, c.z);
        else if (dist > 28) this.setGoal(this.x + (dx / dist) * 12 + g.rng.ai.range(-6, 6), this.z + (dz / dist) * 12 + g.rng.ai.range(-6, 6));
        else this.setGoal(this.x + g.rng.ai.range(-6, 6), this.z + g.rng.ai.range(-6, 6));
      }
    }
    // The driver fights from beside his truck.
    if (this.role === 'driver' && this.vehicle?.alive && Math.hypot(this.vehicle.x - this.x, this.vehicle.z - this.z) > 9) this.setGoal(this.vehicle.x + 2, this.vehicle.z + 2);
    this.moveWanted = this.goal ? (this.role === 'mg' ? 3 : 4.6) : 0;
    // Shoot: bursts of 3 to 5.
    this.yaw = this.aimYaw;
    if (this.sees && this.reactT <= 0 && !g.noShooting) {
      if (this.burstLeft > 0) { /* fixedUpdate fires */ }
      else if ((this.burstPause -= dt) <= 0) {
        this.burstLeft = this.role === 'mg' ? g.rng.ai.int(6, 10) : this.role === 'sniper' ? 1 : g.rng.ai.int(3, 5);
        this.burstPause = this.role === 'sniper' ? g.rng.ai.range(2.4, 4) : g.rng.ai.range(0.9, 2);
        if (this.role === 'rocket' && g.rng.ai.chance(0.5)) { this.fireRocket(); this.burstLeft = 0; this.burstPause = 6; }
        else if (this.faction === 'harvest' && dist < 24 && dist > 7 && g.rng.ai.chance(0.1)) { this.throwBottle(lk); this.burstLeft = 0; this.burstPause = 3; }
        else if (g.rng.ai.chance(0.14)) { this.view?.anim.shot('Reload'); this.burstLeft = 0; this.burstPause = 1.5; g.sfx.at('gun-mag', this.x, this.z, { max: 30, volume: 0.6 }); }
      }
    }
    if (dist < 25 && !this.sees && this.goal == null) this.setGoal(lk.x, lk.z);
    // Within arm's reach he shoves you off with the rifle.
    this.shoveT -= dt;
    if (!g.round && tgt?.kind === 'player' && dist < 2.2 && this.sees && this.reactT <= 0 && this.shoveT <= 0) {
      this.shoveT = 2.5; this.burstLeft = 0; this.burstPause = 0.8;
      this.view?.anim.shot('Push');
      g.sfx.at('grunt', this.x, this.z, { max: 30, volume: 0.8 });
      g.body.hurt(6, 'melee', [this.x, this.z]);
      g.ctx.engine.shake.add(0.25);
    }
    // Every other man drops to a knee when he has stopped to shoot.
    if (this.wasSeated) { this.wasSeated = false; this.view?.anim.once('StandUp', 1.6); }
    this.crouchAim = !this.goal && this.id % 2 === 0;
    this.view?.anim.set(this.moveWanted > 0 ? 'Run' : this.crouchAim ? 'Crouch' : 'Idle', this.moveWanted > 0 ? 'AimWalk' : 'AimIdle');
    return 'running';
  }
  brainSearch(dt) {
    const g = this.game;
    this.searchT -= dt;
    if (this.lastKnown && !this.goal && !this.fixed) {
      const d = Math.hypot(this.lastKnown.x - this.x, this.lastKnown.z - this.z);
      if (d > 3) this.setGoal(this.lastKnown.x, this.lastKnown.z);
      else this.lastKnown = null;
    }
    this.moveWanted = this.goal ? 2.6 : 0;
    if (!this.goal) this.yaw += Math.sin(g.time * 0.6 + this.id) * dt * 1.2;
    if (this.searchT <= 0) { this.state = 'idle'; this.suspicion = 0; this.lastKnown = null; this.goal = null; g.voice.bark(this, 'giveup'); }
    // Looking for you, some of them come in low.
    const limping = this.hp < this.maxHp * 0.35;
    if (limping) this.moveWanted = Math.min(this.moveWanted, LIMP_SPEED);
    this.view?.anim.set(this.moveWanted > 0 ? (limping ? 'Limp' : this.id % 2 === 0 ? 'CrouchWalk' : 'Walk') : 'Idle', 'AimIdle');
    return 'running';
  }
  brainDuty(dt) {
    const g = this.game;
    this.dutyT -= dt;
    const night = g.clock.isNight();
    if (this.duty === 'march') {
      if (this.marchTo && !this.goal) { if (Math.hypot(this.marchTo.x - this.x, this.marchTo.z - this.z) > 5) this.setGoal(this.marchTo.x, this.marchTo.z); else { this.marchTo = null; this.duty = 'guard'; } }
      this.moveWanted = 4.2;
      this.view?.anim.set('Run', 'AimWalk');
      return 'running';
    }
    if (this.dutyT <= 0) {
      this.dutyT = g.rng.ai.range(4, 10);
      this.sleeping = false;
      if (this.duty === 'patrol' && !this.fixed) {
        const a = g.rng.ai.range(0, 6.28), r = g.rng.ai.range(6, 26);
        this.setGoal(this.home.x + Math.cos(a) * r, this.home.z + Math.sin(a) * r);
      } else if (!this.fixed && night && g.rng.ai.chance(0.25)) { this.sleeping = true; this.dutyT = 30; }
      else { this.yawGoal = g.rng.ai.range(-3.14, 3.14); this.sitting = !this.fixed && this.duty === 'guard' && g.rng.ai.chance(0.2); if (this.sitting) this.dutyT = g.rng.ai.range(12, 26); }
    }
    if (this.yawGoal != null) this.yaw += wrapAngle(this.yawGoal - this.yaw) * Math.min(1, dt * 1.5);
    this.moveWanted = this.goal ? (this.hp < this.maxHp * 0.35 ? LIMP_SPEED : 1.6) : 0;
    if (this.view) {
      const seated = !this.sleeping && this.sitting && !this.goal;
      if (seated !== !!this.wasSeated) { this.wasSeated = seated; this.view.anim.once(seated ? 'SitDown' : 'StandUp'); }
      if (this.sleeping) this.view.anim.set('Sleep', 'Sleep');
      else if (seated) this.view.anim.set('Sit', 'Sit');
      else if (this.moveWanted > 0) { const gait = this.hp < this.maxHp * 0.35 ? 'Limp' : 'Walk'; this.view.anim.set(gait, gait); }
      else this.view.anim.set('Idle', this.dutyT % 7 < 1.6 ? 'IdleLook' : 'Idle');
    }
    return 'running';
  }
  setGoal(x, z) {
    const g = this.game;
    this.goal = { x, z };
    this.path = null; this.pathI = 0;
    if (Math.hypot(x - this.x, z - this.z) > 14 && !g.world.nav.lineOfSight(this.x, this.z, x, z)) g.actors.requestPath(this);
  }
  // ---- per fixed step: legs and trigger ----
  fixedUpdate(ctx, dt) {
    const g = this.game;
    if (this.dead || !this.active || this.puppet) return;
    this.fireCheckT = (this.fireCheckT ?? 0) - dt;
    // Steering.
    const mv = _d.set(0, 0, 0);
    if (this.moveWanted > 0) {
      let dirx = 0, dirz = 0;
      if (this.goal) {
        let tx = this.goal.x, tz = this.goal.z;
        if (this.path && this.pathI < this.path.length) { const p = this.path[this.pathI]; tx = p[0]; tz = p[2]; if (Math.hypot(tx - this.x, tz - this.z) < 1.6) this.pathI++; }
        const dx = tx - this.x, dz = tz - this.z, l = Math.hypot(dx, dz);
        if (Math.hypot(this.goal.x - this.x, this.goal.z - this.z) < 1.5) { this.goal = null; this.path = null; }
        else if (l > 0.01) { dirx = dx / l; dirz = dz / l; }
        if (this.state !== 'alert') this.yaw = Math.atan2(dirx, dirz);
      } else if (this.steerDir != null) { dirx = Math.sin(this.steerDir); dirz = Math.cos(this.steerDir); }
      mv.set(dirx, 0, dirz);
      this.cc.speed = this.moveWanted;
    }
    // Stuck in water? He goes round.
    if (g.ground.isWater(this.x + mv.x * 2, this.z + mv.z * 2) && !g.ground.isFord(this.x, this.z) && !g.world.nav.walkable(this.x + mv.x * 2, this.z + mv.z * 2)) mv.set(0, 0, 0);
    this.cc.setInput(mv, false, false);
    this.cc.fixedUpdate(dt);
    const f = this.cc.feet;
    this.x = f.x; this.y = f.y; this.z = f.z;
    // Trigger.
    this.fireCool -= dt;
    if (this.burstLeft > 0 && this.fireCool <= 0) this.shootOnce();
    // Burning in burning grass.
    if (this.burning > 0 && g.tick % 12 === 0) ctx.particles.burst('vehicle-flame', [this.x, this.y + 1, this.z], { count: 3 });
  }
  shootOnce() {
    const g = this.game, tgt = this.targetInfo;
    if (!tgt || this.jamT > 0) { this.burstLeft = 0; return; }
    this.burstLeft--;
    this.fireCool = this.role === 'mg' ? 0.09 : this.role === 'sniper' ? 0.6 : 0.13;
    const ox = this.x, oy = this.y + 1.42, oz = this.z;
    const dx = tgt.x - ox, dy = tgt.y + 1 - oy, dz = tgt.z - oz, dist = Math.hypot(dx, dz);
    const moving = tgt.fast ? 1.4 : 1;
    const errDeg = (lerp(1.9, 5, clamp(dist / 80, 0, 1.4)) / TUNING.enemyAccuracy) * moving * (this.role === 'sniper' ? 0.45 : 1);
    const e = (errDeg * Math.PI) / 180, r = g.rng.ai;
    const yaw = Math.atan2(dx, dz) + r.range(-e, e), pitch = Math.atan2(dy, dist) + r.range(-e, e);
    const cx = Math.sin(yaw) * Math.cos(pitch), cy = Math.sin(pitch), cz = Math.cos(yaw) * Math.cos(pitch);
    const hit = g.damage.bullet(ox + cx * 0.5, oy, oz + cz * 0.5, cx, cy, cz, this.role === 'sniper' ? 300 : 180, this.role === 'mg' ? 11 : this.role === 'sniper' ? 26 : 9, this);
    g.fx.tracer(ox + cx * 0.6, oy, oz + cz * 0.6, ox + cx * (hit?.distance ?? 100), oy + cy * (hit?.distance ?? 100), oz + cz * (hit?.distance ?? 100));
    if (dist < 240) g.sfx.at(this.role === 'mg' ? 'gun-mg-far' : 'gun-tractor-far', ox, oz, { max: 280, volume: 0.9 });
    this.view?.anim.shot('FireRecoil', 1);
    // Whip past the ear.
    if (hit && g.hasPlayer) { const pd = Math.hypot(hit.x - g.player.feet.x, hit.z - g.player.feet.z); if (pd < 5 && r.chance(0.5)) g.sfx.play('bullet-whip', { volume: 0.5, pitch: r.range(-3, 3) }); }
    // His gun jams too: an opening for you.
    if (r.chance(0.012)) { this.burstLeft = 0; this.jamT = r.range(2.2, 3.6); this.view?.anim.shot('UnjamSwear'); g.voice.bark(this, 'jammed'); g.sfx.at('gun-jam', ox, oz, { max: 40 }); g.events.emit('soldier-jam', this); }
    if (r.chance(0.02) && this.goal == null) g.voice.bark(this, 'fighting');
  }
  /** The Harvest throw bottles: everyone can start a fire. */
  throwBottle(lk) {
    const g = this.game, ox = this.x, oy = this.y + 1.6, oz = this.z;
    const dx = lk.x - ox, dz = lk.z - oz, d = Math.hypot(dx, dz) || 1;
    this.view?.anim.shot('ThrowBottle');
    g.after(0.3, () => { if (!this.dead) g.projectiles.spawn('bottle', ox + (dx / d), oy, oz + (dz / d), dx / d, 0.32, dz / d, this, { speed: Math.min(20, 8 + d * 0.55) }); });
    g.events.emit('soldier-throw', this);
  }
  fireRocket() {
    const g = this.game, tgt = this.targetInfo;
    if (!tgt) return;
    const ox = this.x, oy = this.y + 1.5, oz = this.z;
    g.projectiles.spawn('soldier_rocket', ox, oy, oz, tgt.x - ox, tgt.y + 1 - oy, tgt.z - oz, this);
    g.sfx.at('gun-tube', ox, oz, { max: 300 });
    this.view?.anim.shot('FireRecoil', 0.6);
  }
  /** Per frame: pose. Puppets take theirs from snapshots. */
  update(ctx, dt) {
    if (!this.active) return;
    const view = this.view;
    if (!view) return;
    if (this.dead) {
      if (this.doll) {
        this.doll.sync();
        this.corpseT -= dt;
        if (this.corpseT <= 0 && this.doll.active) this.doll.disable();
      }
      return;
    }
    const alpha = ctx.physics.alpha;
    if (this.cc && !this.puppet) { const f = this.cc.interpolatedFeet(alpha); view.object.position.set(f.x, f.y, f.z); }
    else view.object.position.set(this.x, this.y, this.z);
    view.object.rotation.y = this.yaw;
    const moving = this.moveWanted;
    if (moving > 0) view.anim.speed(moving > 4 ? moving / 6.5 : moving / 2.2); else view.anim.speed(1);
    if (Math.hypot(this.x - this.game.camPos.x, this.z - this.game.camPos.z) < 160) view.anim.update(dt);
  }
}
