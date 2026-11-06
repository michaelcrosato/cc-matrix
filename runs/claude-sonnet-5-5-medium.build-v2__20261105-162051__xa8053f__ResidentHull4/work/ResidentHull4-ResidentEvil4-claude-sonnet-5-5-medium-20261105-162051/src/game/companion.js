// Dame Ottoline Vane: a humanoid with her own AI. Follows, waits, hides, boosts, operates machines.
import { THREE } from '../../pixel-engine.js';
import { Humanoid } from './actor.js';
import { TUNING } from '../data/tuning.js';
import { S } from './enemy.js';
import { turnToward, clamp } from './geom.js';

export class Dame {
  constructor(area, x, z) {
    this.area = area; this.x = x; this.z = z; this.px = x; this.pz = z; this.yaw = 0;
    this.h = new Humanoid('dame', { scale: 0.88 }); this.h.attachTo(area.ctx.scene);
    this.hp = TUNING.dameHp; this.maxHp = this.hp; this.alive = true;
    this.mode = 'follow'; this.hidden = false; this.hideSpot = null; this.grabbedBy = null; this.grabT = 0; this.busy = null; this.speed = 0; this.ducking = false;
    this.sayCd = 4; this.idleT = 0; this.cutscene = false;
  }
  hurt(dmg, fx, fz, silent) {
    if (!this.alive || this.hidden || this.busy === 'hoist') return;
    this.hp -= dmg; this.area.run.stats.deductions += Math.round(dmg * 5);
    this.h.flash(2);
    if (!silent) this.area.bark('DAME', this.area.rng.pick(['I FELT THAT IN MY PORTFOLIO.', 'DEDUCTED.']), 2.5);
    if (this.hp <= 0) { this.alive = false; this.h.play('Death', { once: true, hold: true }); this.area.onDameDead?.(); }
  }
  grabbedByCarrier(e) {
    if (this.grabbedBy || !this.alive) return;
    this.grabbedBy = e; this.grabT = TUNING.dameGrabTime; e.setState(S.CARRY);
    this.area.bark('DAME', 'UNHAND ME, YOU SARDINE!', 3);
    this.h.play('CarrierShoulder', { once: true, hold: true });
  }
  freed() { const e = this.grabbedBy; this.grabbedBy = null; if (e && !e.dead) { e.setState(S.APPROACH); } this.mode = 'follow'; this.h.play('Idle'); }
  lost() { this.alive = false; this.area.damelost = true; this.area.onDameDead?.('lost'); }
  command() {
    if (this.busy) return;
    const a = this.area;
    if (this.mode === 'follow') { this.mode = 'wait'; a.bark('DAME', 'I SHALL WAIT. I CHARGE FOR IT.', 3); }
    else { this.mode = 'follow'; a.bark('DAME', 'LEAD ON.', 2); }
  }
  hide(spot) { this.hidden = true; this.hideSpot = spot; this.mode = 'hide'; this.x = spot.x; this.z = spot.z; this.h.root.visible = false; this.area.bark('DAME', 'IN A BARREL. AT MY AGE.', 3); }
  unhide() { this.hidden = false; this.mode = 'follow'; this.h.root.visible = true; this.hideSpot = null; }
  fixedUpdate(dt) {
    const a = this.area, p = a.player; if (!this.alive) return;
    this.px = this.x; this.pz = this.z;
    if (this.grabbedBy) {
      this.grabT -= dt * (a.frozen ? 0 : 1);
      if (this.grabbedBy.dead) { this.freed(); return; }
      if (this.grabT <= 0) this.lost();
      return;
    }
    if (this.hidden || this.busy || this.cutscene) return;
    const dx = p.x - this.x, dz = p.z - this.z, d = Math.hypot(dx, dz);
    let sp = 0;
    if (this.mode === 'follow') {
      // stay 2-4 m behind Max; side-step out of the laser line; duck near enemies
      let tx = this.x, tz = this.z;
      if (d > 4) { sp = d > 7 ? 3.8 : 2.6; tx = p.x; tz = p.z; }
      else if (d < 1.8) { tx = this.x - dx; tz = this.z - dz; sp = 1.6; }
      if (p.aiming && d < 6) { const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw); const side = (dx * fz - dz * fx); if (Math.abs(side) < 0.8) { tx = this.x + fz * (side >= 0 ? -1 : 1) * 2; tz = this.z - fx * (side >= 0 ? -1 : 1) * 2; sp = 2.2; } }
      if (sp > 0) {
        let dirx, dirz;
        const nav = a.level.nav;
        if (tx === p.x) { nav.flowTo(p.x, p.z); const out = [0, 0]; if (nav.flowDirection(this.x, this.z, out)) { dirx = out[0]; dirz = out[1]; } else { dirx = dx / d; dirz = dz / d; } }
        else { const l = Math.hypot(tx - this.x, tz - this.z) || 1; dirx = (tx - this.x) / l; dirz = (tz - this.z) / l; }
        const nx = this.x + dirx * sp * dt, nz = this.z + dirz * sp * dt;
        if (nav.walkable(nx, nz) && !a.player.blocksAt(nx, nz, 0.5)) { this.x = nx; this.z = nz; }
        else if (nav.walkable(nx, this.z)) this.x = nx; else if (nav.walkable(this.x, nz)) this.z = nz;
        this.yaw = turnToward(this.yaw, Math.atan2(dirx, dirz), 9 * dt);
      }
    }
    this.speed = sp;
    this.ducking = a.enemies.some((e) => e.awake && !e.dead && Math.hypot(e.x - this.x, e.z - this.z) < 3);
    this.sayCd -= dt; this.idleT += dt;
    if (sp === 0 && this.mode === 'follow' && d < 4) { if (this.idleT > 18 && this.sayCd <= 0 && !a.enemies.some((e) => e.awake)) { a.bark('DAME', a.rng.pick(['I HAVE SACKED MEN FOR LESS.', 'DO YOU ALWAYS LURK?']), 3); this.idleT = 0; this.sayCd = 10; } } else this.idleT = 0;
  }
  updateVisual(dt, alpha) {
    if (!this.alive && !this.h.root.visible) return;
    const ix = this.px + (this.x - this.px) * alpha, iz = this.pz + (this.z - this.pz) * alpha;
    this.h.root.position.set(ix, this.grabbedBy ? 0.5 : 0, iz); this.h.root.rotation.y = this.yaw;
    if (this.alive && !this.grabbedBy && !this.hidden) {
      if (this.busy === 'hoist') this.h.play('DameHoist');
      else if (this.ducking && this.speed < 0.2) this.h.play('Crouch');
      else if (this.speed > 0.2) this.h.play('DameWalk', { speed: this.speed / 2.4 });
      else this.h.play('Idle');
    }
    this.h.update(dt); this.h.placeShadow(0);
  }
  dispose() { this.h.dispose(); }
}
