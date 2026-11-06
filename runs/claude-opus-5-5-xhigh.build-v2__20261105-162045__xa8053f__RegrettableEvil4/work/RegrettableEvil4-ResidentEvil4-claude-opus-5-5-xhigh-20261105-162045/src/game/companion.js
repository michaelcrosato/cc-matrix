// Dame Ottoline. Follows, waits, hides in barrels, operates machinery, is carried off by Carriers, and
// keeps a ledger. Hurting her costs you: hurt also adds to the Deductions.
import { THREE } from '../../pixel-engine.js';
import { TUNING } from '../data/tuning.js';
import { DAME_BARKS } from '../data/dialogue.js';
import { Humanoid } from './actor.js';
import { angleDiff } from './enemy.js';
import { app } from '../core/app.js';

const { Vector3 } = THREE;
const v = new Vector3();
const flow = [0, 0];

export class Dame {
  constructor(area, x, z, yaw = 0) {
    this.area = area;
    this.ctx = area.ctx;
    this.x = x; this.z = z; this.y = 0;
    this.px = x; this.pz = z;
    this.yaw = yaw;
    this.floor = 0;
    this.actor = new Humanoid('dame', { scale: 0.86 });
    this.actor.root.position.set(x, 0, z);
    area.ctx.scene.add(this.actor.root);
    this.actor.play('Idle');
    this.mode = 'follow'; // follow | wait | hide | machine | carried | script | run
    this.withYou = true;
    this.alive = true;
    this.taken = false;
    this.hurtCool = 0;
    this.barkT = 4;
    this.idleT = 12;
    this.maxHp = TUNING.dameHp;
    const run = area.run;
    this.hp = run.dameHealth ?? this.maxHp;
    this.machine = null;
    this.shootable = true;
    this.zonesReady = false;
    this.zones = {
      center: new Vector3(), radius: 1.2, head: { c: new Vector3(), r: 0.2 }, torso: { a: new Vector3(), b: new Vector3(), r: 0.22 },
      arms: [], legs: [], part: 'torso',
    };
    // No physics body: she never blocks Max, and shots test her zones.
    area.friendlies.push(this);
  }

  get scale() { return 0.86; }
  get dead() { return !this.alive; }

  targetable() { return this.alive && (this.mode === 'follow' || this.mode === 'wait' || this.mode === 'machine') && this.floor === 0; }
  grabbable() { return this.alive && this.withYou && !this.carrier && (this.mode === 'follow' || this.mode === 'wait'); }

  bark(text) {
    if (this.barkT > 0) return;
    this.barkT = 5;
    this.area.talk.bark('dame', text, { prio: 1 });
  }
  barkOf(kind) { this.bark(this.area.ctx.random.pick(DAME_BARKS[kind])); }

  // ---- Orders ----
  /** D-pad right. Context first: machines and hiding places near her. */
  command() {
    const { area } = this;
    if (!this.withYou || !this.alive || this.carrier) return;
    if (this.staysHidden) return;
    if (this.mode === 'hide') { this.unhide(); return; }
    const ctxAct = area.def.dameContext?.(area, this);
    if (ctxAct) { ctxAct(); return; }
    const spot = (area.hidingSpots ?? []).find((s) => Math.hypot(s.x - this.x, s.z - this.z) < 3.2 && Math.hypot(s.x - area.player.x, s.z - area.player.z) < 5);
    if (spot) { this.hide(spot); return; }
    if (this.mode === 'follow') { this.mode = 'wait'; this.barkT = 0; this.barkOf('wait'); this.ctx.audio.play('uiMove'); }
    else { this.mode = 'follow'; this.barkT = 0; this.barkOf('follow'); this.ctx.audio.play('uiMove'); }
  }

  commandLabel() {
    const { area } = this;
    if (!this.withYou || !this.alive || this.carrier) return null;
    if (this.staysHidden) return null;
    if (this.mode === 'hide') return 'CALL OUT';
    const c = area.def.dameContextLabel?.(area, this);
    if (c) return c;
    const spot = (area.hidingSpots ?? []).find((s) => Math.hypot(s.x - this.x, s.z - this.z) < 3.2 && Math.hypot(s.x - area.player.x, s.z - area.player.z) < 5);
    if (spot) return 'HIDE';
    return this.mode === 'follow' ? 'WAIT' : 'FOLLOW';
  }

  hide(spot) {
    this.mode = 'hide';
    this.spot = spot;
    this.barkT = 0;
    this.barkOf('hide');
    this.x = spot.x; this.z = spot.z;
    this.actor.play('DameBarrelIn', { once: true });
    this.actor.root.visible = true;
    this.ctx.audio.play('crate', { volume: 0.5 });
    this.ctx.engine.shake.add(0.05);
  }
  unhide() {
    this.mode = 'follow';
    this.spot = null;
    this.barkT = 0;
    this.barkOf('follow');
    this.actor.root.scale.setScalar(this.scale);
  }

  // ---- Carriers ----
  onGrabbed(carrier) {
    this.carrier = carrier;
    this.taken = true;
    this.takenT = TUNING.dameGrabTime;
    this.barkT = 0;
    this.barkOf('grabbed');
    this.mode = 'carried';
    this.actor.play('DameCarried');
    this.ctx.audio.play('dameHurt');
    this.area.hud?.flashText('DAME TAKEN', 2);
  }
  onDropped() {
    this.carrier = null;
    this.taken = false;
    this.mode = 'follow';
    this.y = 0;
    this.runT = 2.5;
    this.actor.play('Idle');
    this.actor.root.rotation.z = 0;
    this.barkT = 0;
    this.barkOf('hurt');
  }

  /** Someone hit her. */
  hurt(raw, from) {
    if (!this.alive || this.mode === 'hide' || this.mode === 'script' || app.dev.god) return false;
    if (this.hurtCool > 0) return false;
    this.hurtCool = 0.5;
    const dmg = raw * 0.5 * this.area.run.diff.enemyDamage * TUNING.damageTaken;
    this.hp -= dmg;
    this.deduct(Math.round(dmg * 12));
    this.actor.flash(2);
    this.ctx.audio.play('dameHurt');
    this.barkOf('hurt');
    this.area.fx.blood(this.x, 1, this.z);
    if (this.hp <= 0) this.die();
    return true;
  }

  deduct(n) {
    const run = this.area.run;
    run.deductions += n;
    run.stats.deductions += n;
  }

  onFriendlyFire(stats, t, dir, by) {
    if (!this.alive) return;
    if (this.mode === 'hide') return;
    if ((stats.pellets ?? 1) > 1 && t > 9) return; // accident forgiven for scatter at range
    this.hurtCool = 0;
    this.hurt((stats.damage ?? 10) * 0.4, null);
    this.deduct(200);
    this.barkT = 0;
    this.barkOf('nearShot');
    this.area.hud?.flashText('DEDUCTED', 1.2);
  }

  onKick() { if (this.withYou && this.area.ctx.random.chance(0.3)) this.barkOf('kick'); }

  die() {
    this.alive = false;
    this.hp = 0;
    this.actor.play('Death', { once: true });
    this.area.deathReason = 'THE INSURED IS LOST';
    this.area.player?.die();
  }

  // ---- Fixed step ----
  step(dt) {
    const { area } = this;
    this.px = this.x; this.pz = this.z;
    this.barkT -= dt; this.hurtCool -= dt;
    this.attackerCool = (this.attackerCool ?? 0) - dt;
    if (this.attacker) { this.attackerT -= dt; if (this.attackerT <= 0 || this.attacker.dead) this.attacker = null; }
    area.run.dameHealth = this.hp;
    if (!this.alive) return;
    switch (this.mode) {
      case 'follow': this.stepFollow(dt); break;
      case 'wait': this.stepWait(dt); break;
      case 'carried': this.stepCarried(dt); break;
      case 'goto': this.stepGoto(dt); break;
      case 'machine': this.machineStep?.(dt); break;
      default: break;
    }
    if (this.taken) {
      this.takenT -= dt;
      if (this.takenT <= 0 && this.carrier) {
        this.area.deathReason = 'THE INSURED WAS TAKEN';
        this.alive = false;
        area.player?.die();
      }
    }
  }

  stepFollow(dt) {
    const { area } = this;
    const P = area.player;
    if (!P) return;
    const dist = Math.hypot(P.x - this.x, P.z - this.z);
    const nearEnemy = area.enemies.some((e) => !e.dead && !e.d.crawler && Math.hypot(e.x - this.x, e.z - this.z) < 3);
    let want = 0;
    if (dist > 4) want = dist > 7 ? 3.8 : 2.6;
    else if (dist > 2.4 && (this.moving || dist > 3.5)) want = 2.2;
    if (this.runT > 0) { this.runT -= dt; want = 3.8; }
    // Side-step out of the laser line.
    let sx = 0; let sz = 0;
    if (P.aiming) {
      const fx = Math.sin(area.cam.yaw); const fz = Math.cos(area.cam.yaw);
      const dx = this.x - P.x; const dz = this.z - P.z;
      const along = dx * fx + dz * fz;
      const across = dx * fz - dz * fx;
      if (along > 0 && Math.abs(across) < 0.8) { const s = across >= 0 ? 1 : -1; sx = fz * s; sz = -fx * s; want = Math.max(want, 2.4); }
    }
    this.moving = want > 0;
    if (sx || sz) this.moveBy(sx, sz, want, dt);
    else if (want > 0) {
      const nav = area.navByKey('toMax');
      nav.flowTo(P.x, P.z);
      if (nav.flowDirection(this.x, this.z, flow)) this.moveBy(flow[0], flow[1], want, dt);
    }
    // Face what's going on.
    if (want > 0.1) this.anim(want);
    else {
      const a = Math.atan2(P.x - this.x, P.z - this.z);
      this.yaw += angleDiff(a, this.yaw) * Math.min(1, dt * 4);
      if (nearEnemy) { if (this.actor.playing !== 'DameDuck') this.actor.play('DameDuck', { fade: 0.2 }); }
      else if (this.actor.playing !== 'Idle') this.actor.play('Idle', { fade: 0.25 });
    }
    this.idleT -= dt;
    if (this.idleT <= 0 && want === 0) { this.idleT = 18; this.barkOf('idle'); }
  }

  stepWait(dt) {
    const near = this.area.enemies.some((e) => !e.dead && Math.hypot(e.x - this.x, e.z - this.z) < 3);
    const clip = near ? 'DameDuck' : 'Idle';
    if (this.actor.playing !== clip) this.actor.play(clip, { fade: 0.25 });
  }

  stepCarried() {
    const c = this.carrier;
    if (!c || c.dead) { this.onDropped(); return; }
    const fy = c.yaw;
    this.x = c.x - Math.sin(fy) * 0.1;
    this.z = c.z - Math.cos(fy) * 0.1;
    this.y = 1.35;
    this.yaw = fy + Math.PI;
  }

  /** Walk to a spot, then call back. */
  goTo(x, z, then, run = true) {
    this.mode = 'goto';
    this.gotoX = x; this.gotoZ = z; this.gotoThen = then; this.gotoRun = run;
    this.stuck = 0;
  }
  stepGoto(dt) {
    const { area } = this;
    const dx = this.gotoX - this.x; const dz = this.gotoZ - this.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.4) { const t = this.gotoThen; this.gotoThen = null; this.mode = 'wait'; t?.(); return; }
    const nav = area.navByKey('dameGoto');
    nav.flowTo(this.gotoX, this.gotoZ);
    const s = this.gotoRun ? 3.8 : 2.6;
    if (d < 1.1) this.moveBy(dx / d, dz / d, s, dt);
    else if (nav.flowDirection(this.x, this.z, flow)) this.moveBy(flow[0], flow[1], s, dt);
    this.anim(s);
    this.stuck += dt;
    if (this.stuck > 14) { this.x = this.gotoX; this.z = this.gotoZ; }
  }

  anim(speed) {
    const clip = speed > 3 ? 'DameRun' : 'DameWalk';
    this.actor.loco(clip, speed, { fade: 0.15 });
  }

  moveBy(dx, dz, speed, dt) {
    const nav = this.area.level.nav;
    const nx = this.x + dx * speed * dt; const nz = this.z + dz * speed * dt;
    if (nav.walkable(nx, this.z)) this.x = nx;
    if (nav.walkable(this.x, nz)) this.z = nz;
    const a = Math.atan2(dx, dz);
    this.yaw += angleDiff(a, this.yaw) * Math.min(1, dt * 7);
  }

  frame(dt, alpha) {
    const x = this.px + (this.x - this.px) * alpha;
    const z = this.pz + (this.z - this.pz) * alpha;
    const root = this.actor.root;
    root.position.set(x, this.y, z);
    root.rotation.y = this.yaw;
    if (this.mode === 'carried') root.rotation.x = 1.3;
    else root.rotation.x = 0;
    this.actor.update(dt);
    this.machineFrame?.(dt);
    // Zones for friendly fire.
    root.updateMatrixWorld(true);
    const j = this.actor.joints;
    this.zones.torso.a.setFromMatrixPosition(j.Pelvis.matrixWorld);
    this.zones.head.c.setFromMatrixPosition(j.Head.matrixWorld);
    this.zones.torso.b.copy(this.zones.head.c);
    this.zones.head.c.y += 0.11;
    this.zones.center.copy(this.zones.torso.a);
    this.zonesReady = this.mode !== 'hide' && this.mode !== 'carried' && this.withYou;
    if (this.mode === 'hide') root.visible = false; else root.visible = true;
  }

  /** The escort continues into the next area. */
  dispose() { this.actor.dispose(); }
}
