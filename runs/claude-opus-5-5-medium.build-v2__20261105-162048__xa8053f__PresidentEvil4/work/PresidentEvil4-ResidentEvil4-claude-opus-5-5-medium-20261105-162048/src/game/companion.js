// Dame Ottoline. Never impressed, never thanks anyone. Same interface as a target: pos, floor, hurt.
import { THREE } from '../../pixel-engine.js';
import { TUNING } from '../data/tuning.js';
import { BARKS } from '../data/dialogue.js';
import { Humanoid } from './actor.js';
export class Dame {
  constructor(area, x, z) {
    this.area = area; this.h = new Humanoid(area.ctx, 'dame', { scale: 0.82 }); this.root = this.h.root; this.pos = new THREE.Vector3(x, 0, z); this.prev = this.pos.clone(); this.floor = 0; this.yaw = 0; this.mode = 'follow'; this.active = true; this.hidden = false; this.carried = false; this.path = null; this.pathI = 0; this.pathT = 0; this.hp = Math.max(area.run.dameHp ?? TUNING.dameHp, area.o.fromSave ? TUNING.dameHp * 0.5 : TUNING.dameHp * 0.75); this.barkT = 8; this.machine = null; this.anim = null; this.invuln = 0; this.lostT = 0;
    this.h.play('DameIdle');
  }
  get maxHp() { return TUNING.dameHp; }
  canBeTaken() { return this.active && !this.hidden && !this.carried && !this.machine && this.invuln <= 0; }
  setMode(m) { const A = this.area; this.mode = m; this.machine = null; if (this.hidden && m !== 'hide') this.unhide(); A.dameBark(BARKS.dame[m === 'follow' ? 'follow' : m === 'wait' ? 'wait' : 'hide']); }
  hide(spot) { this.hidden = true; this.mode = 'hide'; this.pos.set(spot.x, 0, spot.z); this.prev.copy(this.pos); this.spot = spot; this.area.dameBark(BARKS.dame.hide); this.area.ctx.audio.play('cratebreak', { volume: 0.2 }); }
  unhide() { this.hidden = false; this.root.visible = true; this.spot = null; this.area.ctx.audio.play('cratebreak', { volume: 0.2 }); }
  takenBy(e) { this.carried = true; this.carriedBy = e; this.lostT = TUNING.dameGrabTime; this.machine = null; this.area.dameBark(BARKS.dame.grabbed); this.area.onDameTaken?.(e); }
  dropped() { const e = this.carriedBy; this.carried = false; this.carriedBy = null; this.invuln = 2.5; this.mode = 'follow'; this.path = null; if (e) { this.pos.copy(e.pos); this.pos.y = 0; this.prev.copy(this.pos); e.path = null; } this.area.ctx.audio.play('hurtmax', { volume: 0.5, pitch: 5 }); }
  hurt(amount, from, o = {}) {
    const A = this.area; if (this.invuln > 0 && !o.dot || A.cheatGod || A.player?.god) return false; this.hp -= amount * 0.6; if (!o.dot) { this.invuln = 0.5; this.h.flash(); A.addDeduction(Math.round(amount * 5)); A.dameBark(BARKS.dame.hurt); A.ctx.audio.play('hurtmax', { volume: 0.6, pitch: 6 }); A.run.stats.tookDamage; }
    A.run.dameHp = this.hp; if (this.hp <= 0) { this.hp = 0; A.onDameDead?.(); } return true;
  }
  fixed(dt) {
    const A = this.area; this.prev.copy(this.pos); if (!this.active) return; if (this.invuln > 0) this.invuln -= dt; this.barkT -= dt;
    if (this.carried) { const e = this.carriedBy; if (!e || e.dead) { this.dropped(); return; } this.pos.set(e.pos.x, 1.0 * e.scale, e.pos.z); this.yaw = e.yaw + Math.PI / 2; this.lostT -= dt; if (this.lostT <= 0) A.onDameLost?.(); return; }
    this.pos.y = 0;
    if (this.hidden) { this.moving = 0; return; }
    if (this.machine) { const m = this.machine; this.face(m.x, m.z, dt); this.moving = 0; return; }
    if (this.goal) { if (this.walkTo(this.goal.x, this.goal.z, dt, this.goal.run ? 3.8 : 2.6)) { const g = this.goal; this.goal = null; g.done?.(); } return; }
    const P = A.player; if (this.mode === 'wait' || !P) { this.moving = 0; if (P) this.face(P.pos.x, P.pos.z, dt); this.idleBark(); return; }
    const d = Math.hypot(P.pos.x - this.pos.x, P.pos.z - this.pos.z);
    if (P.floor !== this.floor) { this.moving = 0; return; }
    if (P.aiming && d < 4) { const dot = (this.pos.x - P.pos.x) * Math.sin(P.camYaw) + (this.pos.z - P.pos.z) * Math.cos(P.camYaw), side = (this.pos.x - P.pos.x) * -Math.cos(P.camYaw) + (this.pos.z - P.pos.z) * Math.sin(P.camYaw); if (dot > 0 && Math.abs(side) < 0.9) { const sx = -Math.cos(P.camYaw) * Math.sign(side || 1), sz = Math.sin(P.camYaw) * Math.sign(side || 1); this.move(sx, sz, dt, 2.6); return; } }
    if (d > 4) { this.pathT -= dt; if (this.pathT <= 0 || !this.path) { this.path = A.navOf(0, 0).path([this.pos.x, 0, this.pos.z], [P.pos.x, 0, P.pos.z]); this.pathI = 1; this.pathT = 0.5; } this.followPath(dt, d > 8 ? 3.8 : 2.6); }
    else if (d < 1.6) { const dx = this.pos.x - P.pos.x, dz = this.pos.z - P.pos.z, L = d || 1; this.move(dx / L, dz / L, dt, 2); } else { this.moving = 0; this.face(P.pos.x, P.pos.z, dt); this.idleBark(); }
    if (d > 30) { const b = P.pos; this.pos.set(b.x - Math.sin(P.yaw) * 1.5, 0, b.z - Math.cos(P.yaw) * 1.5); this.path = null; }
  }
  idleBark() { if (this.barkT <= 0) { this.barkT = this.area.rng.range(18, 34); this.area.dameBark(BARKS.dame.idle); } }
  walkTo(x, z, dt, sp) { const dx = x - this.pos.x, dz = z - this.pos.z, L = Math.hypot(dx, dz); if (L < 0.4) return true; if (!this.path || this.pathT <= 0 || this.pathGoal !== x + z) { this.pathGoal = x + z; this.path = this.area.navOf(0, 0).path([this.pos.x, 0, this.pos.z], [x, 0, z]); this.pathI = 1; this.pathT = 1; } this.pathT -= dt; if (this.path) this.followPath(dt, sp); else this.move(dx / L, dz / L, dt, sp); return false; }
  followPath(dt, sp) { const p = this.path; if (!p || this.pathI >= p.length) { this.moving = 0; return; } const w = p[this.pathI], dx = w[0] - this.pos.x, dz = w[2] - this.pos.z, L = Math.hypot(dx, dz); if (L < 0.3) { this.pathI++; return; } this.move(dx / L, dz / L, dt, sp); }
  move(dx, dz, dt, sp) { const A = this.area, nx = this.pos.x + dx * sp * dt, nz = this.pos.z + dz * sp * dt; const ok = (x, z) => A.level.enemyCanStand(x, z, 0) && !this.closedDoorAt(x, z); if (ok(nx, this.pos.z)) this.pos.x = nx; if (ok(this.pos.x, nz)) this.pos.z = nz; this.yaw = Math.atan2(dx, dz); this.moving = sp; }
  closedDoorAt(x, z) { const o = this.area.level.barrierAt(x, z, 0); return !!o; }
  face(x, z, dt) { const want = Math.atan2(x - this.pos.x, z - this.pos.z); let d = want - this.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; this.yaw += d * Math.min(1, 6 * dt); }
  update(dt) {
    const a = this.area.ctx.physics.alpha; this.root.position.lerpVectors(this.prev, this.pos, a); this.root.rotation.y = this.yaw;
    let c = 'DameIdle', o = {}; if (this.hidden) c = 'DameBarrelIn'; else if (this.carried) c = 'LieIdle'; else if (this.machine) c = this.machine.clip ?? 'DameHoist'; else if (this.moving > 0) { c = 'DameWalk'; o.timeScale = this.moving / 2.6 / 0.82; }
    if (this.anim !== c) { this.anim = c; this.h.play(c, o); } this.h.update(dt);
  }
}
