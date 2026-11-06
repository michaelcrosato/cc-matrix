import * as THREE from 'three/webgpu';
import { cosRange } from '../core/rng.js';
export class CameraRig {
  constructor(camera) { this.camera = camera; this.pos = new THREE.Vector3(0, 6, 20); this.look = new THREE.Vector3(0, 1, 0); this.wantPos = this.pos.clone(); this.wantLook = this.look.clone(); this.damp = 4; this.shakeAmt = 0; this.reduceShake = false; this.free = false; this.freeYaw = 0; this.freePitch = -.3; this.fov = 38; this.wantFov = 38; }
  set(px, py, pz, lx, ly, lz, snap = false, fov = null) { this.wantPos.set(px, py, pz); this.wantLook.set(lx, ly, lz); if (fov) this.wantFov = fov; if (snap) { this.pos.copy(this.wantPos); this.look.copy(this.wantLook); if (fov) this.fov = fov; } }
  /** Pull back to fit lanes: d = max(base, (spread/2 + 2.5) / tan(hfov/2)) */
  fitDistance(base, spread) { const hf = 2 * Math.atan(Math.tan(this.fov * Math.PI / 360) * this.camera.aspect); return Math.max(base, (spread / 2 + 2.5) / Math.tan(hf / 2)); }
  get yaw() { const dx = this.wantLook.x - this.wantPos.x, dz = this.wantLook.z - this.wantPos.z; return Math.atan2(dx, -dz); }
  shake(a) { if (!this.reduceShake) this.shakeAmt = Math.max(this.shakeAmt, a); }
  tick(dt) {
    const k = 1 - Math.exp(-this.damp * dt);
    this.pos.lerp(this.wantPos, k); this.look.lerp(this.wantLook, k);
    this.fov += (this.wantFov - this.fov) * k;
    this.camera.position.copy(this.pos);
    if (this.shakeAmt > .001) { this.camera.position.x += cosRange(-1, 1) * this.shakeAmt; this.camera.position.y += cosRange(-1, 1) * this.shakeAmt; this.shakeAmt *= Math.exp(-7 * dt); }
    if (this.camera.fov !== this.fov) { this.camera.fov = this.fov; this.camera.updateProjectionMatrix(); }
    this.camera.lookAt(this.look);
    if (this.free) { this.camera.position.copy(this.pos); this.camera.rotation.set(this.freePitch, this.freeYaw, 0, 'YXZ'); }
  }
}
/** Screen-relative stick to world: up is away from the camera. */
export function screenToWorld(x, z, yaw) { const c = Math.cos(yaw), s = Math.sin(yaw); return [x * c - z * s, x * s + z * c]; }
export function worldToScreen(x, z, yaw) { const c = Math.cos(yaw), s = Math.sin(yaw); return [x * c + z * s, -x * s + z * c]; }
