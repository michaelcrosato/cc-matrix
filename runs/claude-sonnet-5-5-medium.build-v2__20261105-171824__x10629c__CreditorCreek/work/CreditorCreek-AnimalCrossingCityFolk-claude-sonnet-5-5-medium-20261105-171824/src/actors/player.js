// The player's avatar: camera-relative movement, tile collision, tool poses.
import { THREE, toonMaterial, PALETTE } from '../engine.js';
import { PALETTE_NAMES } from '../ui/pattern.js';
import { buildToolModel } from '../art/items3d.js';
import { Actor } from './actor.js';
import { tuning } from '../data/tuning.js';
import { SPAWNS } from '../world/townMap.js';
const { Vector3 } = THREE;
export const avatarSpec = (look) => ({ species: 'person', c: look.skin ?? 'sand', a: 'orange', hair: look.hair, hairStyle: look.hairStyle, outfit: outfitColor(look.outfit), hat: hatColor(look.hat), glasses: look.glasses ? (byId[look.glasses] ?? 'ink') : null, pants: 'navy', shoes: 'ink', skin: look.skin ?? 'sand' });
let CL = null;
const lazy = async () => (CL ??= (await import('../data/items.js')).CLOTHES);
import { CLOTHES } from '../data/items.js';
const byId = Object.fromEntries(CLOTHES.map(c => [c.id, c.color]));
export const outfitColor = (id) => byId[id] ?? 'red'; export const hatColor = (id) => (id ? byId[id] ?? null : null);
export class Player {
  constructor(g) {
    this.g = g; this.pos = { x: 4, z: 23 }; this.yaw = 0; this.speed = 0; this.mode = 'idle'; this.moveTarget = null; this.vx = 0; this.vz = 0; this.actor = new Actor(avatarSpec({ hair: 'plum', hairStyle: 0, skin: 'sand', outfit: 'tee_red' }));
    this.actor.name = 'You'; this.input = { x: 0, y: 0 }; this.run = false; this.lockedUntil = 0; this.anim = null; this.animT = 0; this.dust = 0; this.stepT = 0; this.basis = { right: new Vector3(1, 0, 0), forward: new Vector3(0, 0, -1) };
  }
  reset(spawn = SPAWNS.bus) { this.pos.x = spawn[0]; this.pos.z = spawn[1]; this.rebuild(); this.vx = this.vz = 0; this.moveTarget = null; }
  rebuild() { const g = this.g; const was = this.actor.root.parent; const vis = this.actor.root.visible; if (was) was.remove(this.actor.root); this.actor = new Actor(avatarSpec(g.world.look)); this.actor.name = g.world.name; this.applyPattern(); this.actor.root.visible = vis; (was ?? g.ctx.scene).add(this.actor.root); this.actor.setPos(this.pos.x, this.pos.z); }
  applyUmbrella() {
    const L = this.g.world.look; if (!L.umbrella) return; const it = byId[L.umbrella] ?? 'red'; const pat = L.umbrella === 'umb_pattern' ? this.g.world.patterns.find(Boolean) : null;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.8, 0.45, 10), toonMaterial(PALETTE[it])); cone.position.set(0.55, 1.75, 0); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 5), toonMaterial(PALETTE.ink)); pole.position.set(0.55, 1.2, 0);
    if (pat) { const data = new Uint8Array(1024); pat.px.forEach((c, i) => { const hex = PALETTE[PALETTE_NAMES[c]]; data[i * 4] = (hex >> 16) & 255; data[i * 4 + 1] = (hex >> 8) & 255; data[i * 4 + 2] = hex & 255; data[i * 4 + 3] = 255; }); const tex = new THREE.DataTexture(data, 16, 16); tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.needsUpdate = true; cone.material = toonMaterial(PALETTE.white, { map: tex }); }
    this.actor.obj.add(cone, pole);
  }
  applyPattern() { this.applyUmbrella();
    const g = this.g, L = g.world.look, pat = L.pattern != null ? g.world.patterns[L.pattern] : null; if (!pat) return; const torso = this.actor.parts.shirt?.children.find(c => c.isMesh); if (!torso) return;
    const data = new Uint8Array(16 * 16 * 4); pat.px.forEach((c, i) => { const hex = PALETTE[PALETTE_NAMES[c]]; data[i * 4] = (hex >> 16) & 255; data[i * 4 + 1] = (hex >> 8) & 255; data[i * 4 + 2] = hex & 255; data[i * 4 + 3] = 255; });
    const tex = new THREE.DataTexture(data, 16, 16); tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.needsUpdate = true; torso.material = toonMaterial(PALETTE.white, { map: tex });
  }
  /** Compute camera-relative movement basis from the camera yaw (degrees). */
  updateBasis() { const a = (this.g.camYaw * Math.PI) / 180; this.basis.forward.set(-Math.sin(a), 0, -Math.cos(a)); this.basis.right.set(Math.cos(a), 0, -Math.sin(a)); }
  read(dt) {
    const g = this.g, i = g.ctx.input, c = g.ui.c; this.updateBasis();
    const ax = i.moveAxis(); let mx = ax.x, my = ax.y; let mag = Math.hypot(mx, my);
    // mouse: click-to-walk on the ground
    if (c.device === 'kb' && i.isDown('MouseLeft') && c.ptr.over && !g.ui.busy) {
      const p = g.groundPoint(i.pointer.x, i.pointer.y); if (p) { const dx = p.x - this.pos.x, dz = p.z - this.pos.z; if (Math.hypot(dx, dz) > 0.35) this.moveTarget = { x: p.x, z: p.z }; }
    }
    if (mag > 0.15) this.moveTarget = null;
    if (this.moveTarget) { const dx = this.moveTarget.x - this.pos.x, dz = this.moveTarget.z - this.pos.z; const d = Math.hypot(dx, dz); if (d < 0.25) this.moveTarget = null; else { const f = this.basis.forward, r = this.basis.right; my = (dx * f.x + dz * f.z) / d; mx = (dx * r.x + dz * r.z) / d; mag = 1; } }
    this.input.x = mx; this.input.y = my; this.mag = Math.min(1, mag);
    this.run = i.isDown('ShiftLeft', 'ShiftRight', 'PadCircle');
    this.sneak = i.isDown('ControlLeft', 'ControlRight');
  }
  fixed(dt) {
    const g = this.g; if (g.mode === 'attract' && g.sys.attract.drive) { g.sys.attract.drive(g, dt); }
    const locked = this.lock > 0 || g.frozen; if (this.lock > 0) { this.lock -= dt; if (this.lock < 0) this.lock = 0; }
    let sp = 0, mode = 'idle';
    if (!locked && this.mag > 0.12) {
      const m = this.mag; if (this.sneak || m < 0.35) { sp = 1.2; mode = 'tiptoe'; } else if (m < 0.7) { sp = tuning.walk; mode = 'walk'; } else { sp = tuning.jog; mode = 'jog'; }
      if (this.run && !this.sneak && m > 0.35) { sp = tuning.run; mode = 'run'; }
      if (this.slow) sp *= this.slow; if (g.world?.coffeeUntil && g.world.coffeeDay === g.world.day && g.world.min < g.world.coffeeUntil) sp *= 1.15;
      const f = this.basis.forward, r = this.basis.right; let dx = this.input.x * r.x + this.input.y * f.x, dz = this.input.x * r.z + this.input.y * f.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const tx = dx * sp * dt, tz = dz * sp * dt; const px = this.pos.x, pz = this.pos.z;
      g.placeMove(this.pos, tx, tz, 0.28);
      const moved = Math.hypot(this.pos.x - px, this.pos.z - pz); this.speed = moved / dt;
      if (moved > 0.001) { const ty = Math.atan2(dx, dz); let d = ty - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.yaw += d * Math.min(1, dt * 16); this.facing = { x: Math.sin(this.yaw), z: Math.cos(this.yaw) }; }
      g.world && (g.world.stats.steps += moved);
      this.stepT -= dt * (sp / 2.4); if (this.stepT <= 0 && moved > 0.001) { this.stepT = 0.36; g.footstep?.(this.pos, mode); }
    } else { this.speed = 0; }
    if ((this.prevSpeed ?? 0) > 2.5 && this.speed < 0.2) this.actor.squash = 0.22; this.prevSpeed = this.speed;
    this.mode = mode;
    this.facing ??= { x: 0, z: 1 };
  }
  setFacing(dx, dz) { this.yaw = Math.atan2(dx, dz); this.facing = { x: Math.sin(this.yaw), z: Math.cos(this.yaw) }; }
  faceToward(x, z) { const dx = x - this.pos.x, dz = z - this.pos.z; if (Math.hypot(dx, dz) > 0.01) this.setFacing(dx, dz); }
  /** Play an action animation, locking movement for its duration. Returns a promise. */
  async act(name, dur, o = {}) {
    this.lock = dur; this.anim = name; if (name === 'PickUp') this.actor.squash = 0.18; const a = this.actor; a.play(name, { once: !o.loop, restart: true, fade: 0.08 }); this.animT = dur;
    await new Promise(r => { this.g.after(dur, r); }); if (this.anim === name) this.anim = null;
  }
  syncActor() {
    const a = this.actor; a.puffy = !!this.g.world?.flags?.puffy; const tool = this.g.world?.tools?.[this.g.world.toolSel] ?? null; if (a.toolShown !== tool) { if (a.toolMesh) a.joints.ArmL.remove(a.toolMesh); a.toolMesh = null; a.toolShown = tool; if (tool) { a.toolMesh = buildToolModel(tool); a.toolMesh.position.set(0, -0.4, 0.1); a.toolMesh.rotation.x = -1.2; a.joints.ArmL.add(a.toolMesh); } } a.setPos(this.pos.x, this.pos.z, this.g.floorY ?? 0); a.yaw = this.yaw;
    if (this.anim) return; if (this.hold) { a.play(this.hold); return; }
    a.locomote(this.speed, this.mode);
  }
}
