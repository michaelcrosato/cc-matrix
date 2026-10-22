// Attract-mode autopilot. Produces the same control frame a human produces; the game makes it invincible.
import * as THREE from 'three/webgpu';
import { G } from './physics.js';

const _a = new THREE.Vector3(), _q = new THREE.Quaternion();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class AIPilot {
  constructor() {
    this.t = 0; this.holdT = 0; this.prevFire = false; this.rollCd = 0; this.bombCd = 6; this.loopCd = 10; this.boostT = 0; this.wander = Math.random() * 10;
  }
  update(dt, g) {
    this.t += dt;
    const p = g.player;
    const c = { lx: 0, ly: 0, fire: false, firePressed: false, fireReleased: false, autoFire: true, bombPressed: false, boost: 0, brake: 0, bankL: false, bankR: false, rollEvent: 0, loopPressed: false };
    if (p.dead || g.phase === 'intro') return c;
    let target = null, best = Infinity;
    for (const e of g.enemies) {
      if (e.dead || e.invulnerable) continue;
      const ep = e.aimPos || e.obj.position;
      if (g.mode === 'rail') {
        const dz = p.pos.z - ep.z;
        if (dz < 25 || dz > 480) continue;
        const s = Math.hypot(ep.x - p.pos.x, ep.y - p.pos.y) + dz * 0.15 + (e.boss ? -60 : 0);
        if (s < best) { best = s; target = e; }
      } else {
        const s = ep.distanceTo(p.pos) + (e.boss ? -100 : 0) + (e.ace ? -80 : 0);
        if (s < best) { best = s; target = e; }
      }
    }
    if (g.mode === 'rail') this.rail(dt, g, p, c, target);
    else this.allRange(dt, g, p, c, target);
    // fire rhythm: hold to charge+lock, release, repeat (autoFire keeps lasers flowing)
    this.holdT += dt;
    const holding = target ? this.holdT % 1.6 < 1.3 : this.holdT % 0.5 < 0.25;
    c.fire = holding; c.firePressed = holding && !this.prevFire; c.fireReleased = !holding && this.prevFire; this.prevFire = holding;
    // barrel roll when shots are incoming
    this.rollCd -= dt;
    if (this.rollCd <= 0) for (const s of g.shots) {
      if (s.deflected) continue;
      if (s.pos.distanceTo(p.pos) < 45) { c.rollEvent = Math.random() < 0.5 ? -1 : 1; this.rollCd = 1.6; break; }
    }
    this.bombCd -= dt;
    if (this.bombCd <= 0 && target && (g.boss || g.enemies.filter((e) => !e.dead).length > 5)) { c.bombPressed = true; this.bombCd = 7; }
    return c;
  }
  rail(dt, g, p, c, target) {
    let tx = Math.sin(this.t * 0.5 + this.wander) * 25, ty = 26 + Math.sin(this.t * 0.37) * 10;
    if (target) { const ep = target.aimPos || target.obj.position; tx = ep.x; ty = ep.y + (target.boss ? 0 : 1); }
    else {
      const pk = g.pickups.find((k) => !k.taken && k.pos.z < p.pos.z - 20 && k.pos.z > p.pos.z - 300 && (k.kind !== 'gate' || !k.lit));
      if (pk) { tx = pk.pos.x; ty = pk.pos.y; }
    }
    // avoid obstacles ahead
    const hit = g.physics.raySegment(p.pos, _a.set(0, 0, -1), 140, G.STATIC | G.HAZARD);
    if (hit) { tx = p.pos.x + (p.pos.x > 0 ? -45 : 45); ty = Math.max(ty, p.pos.y + 15); }
    const floor = Math.max(0, g.world.heightAt(p.x, -g.d));
    ty = clamp(ty, floor + 10, 66);
    c.lx = clamp((tx - p.x) / 10, -1, 1);
    c.ly = clamp((ty - p.y) / 8, -1, 1);
    this.boostT -= dt;
    if (!target && this.boostT <= 0 && Math.random() < dt * 0.3) this.boostT = 1.2;
    if (this.boostT > 0) c.boost = 1;
    this.loopCd -= dt;
    if (this.loopCd <= 0 && g.enemies.some((e) => !e.dead && e.pattern === 'behind' && e.obj.position.z > p.pos.z - 20)) { c.loopPressed = true; this.loopCd = 12; }
  }
  allRange(dt, g, p, c, target) {
    if (target) _a.copy(target.aimPos || target.obj.position).sub(p.pos);
    else _a.set(Math.sin(this.t * 0.2) * 300, 0, Math.cos(this.t * 0.2) * 300).sub(p.pos);
    // into player's yaw/pitch frame
    _q.setFromEuler(new THREE.Euler(p.arPitch, p.arYaw, 0, 'YXZ')).invert();
    _a.applyQuaternion(_q).normalize();
    c.lx = clamp(_a.x * 3, -1, 1);
    c.ly = clamp(_a.y * 3, -1, 1);
    if (Math.abs(_a.x) > 0.6) { if (_a.x < 0) c.bankL = true; else c.bankR = true; }
    this.loopCd -= dt;
    if (_a.z > 0.3 && this.loopCd <= 0) { c.loopPressed = true; c.brake = 1; this.loopCd = 5; }
    if (target && target.boss && (target.aimPos || target.obj.position).distanceTo(p.pos) < 90) { c.brake = 1; c.lx = 1; }
    if (!target) c.boost = 1;
  }
}
