import * as THREE from 'three/webgpu';
import { cos } from '../core/rng.js';

const _f = new THREE.Vector3();

/** One camera with damped targets, shake and a free-fly mode for Dev Mode. */
export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.pos = new THREE.Vector3(0, 8, 30); this.look = new THREE.Vector3();
    this.tPos = this.pos.clone(); this.tLook = this.look.clone();
    this.rate = 6; this.shakeAmt = 0; this.reduce = false;
    this.yaw = 0; this.fov = 38; this.tFov = 38;
    this.free = false; this.freeYaw = 0; this.freePitch = -0.2;
  }
  /** Frame a shot. snap skips the easing. */
  shot(px, py, pz, lx, ly, lz, { fov = 38, rate = 3, snap = false } = {}) {
    this.tPos.set(px, py, pz); this.tLook.set(lx, ly, lz); this.tFov = fov; this.rate = rate;
    if (snap) { this.pos.copy(this.tPos); this.look.copy(this.tLook); this.fov = fov; }
  }
  /** Lens distance that fits a lane spread: d = max(base, (spread/2 + 2.5) / tan(hfov/2)). */
  fitDistance(base, spread) {
    const aspect = this.camera.aspect || 16 / 9;
    const hfov = 2 * Math.atan(Math.tan((this.tFov * Math.PI) / 360) * aspect);
    return Math.max(base, (spread / 2 + 2.5) / Math.tan(hfov / 2));
  }
  shake(a) { if (!this.reduce) this.shakeAmt = Math.max(this.shakeAmt, a); }
  frame(dt) {
    const k = 1 - Math.exp(-this.rate * dt);
    this.pos.lerp(this.tPos, k); this.look.lerp(this.tLook, k);
    this.fov += (this.tFov - this.fov) * k;
    const c = this.camera;
    if (Math.abs(c.fov - this.fov) > 0.01) { c.fov = this.fov; c.updateProjectionMatrix(); }
    if (!this.free) {
      c.position.copy(this.pos);
      if (this.shakeAmt > 0.001) {
        c.position.x += cos(-1, 1) * this.shakeAmt; c.position.y += cos(-1, 1) * this.shakeAmt;
        this.shakeAmt *= Math.exp(-7 * dt);
      }
      c.lookAt(this.look);
    } else {
      c.rotation.order = 'YXZ'; c.rotation.set(this.freePitch, this.freeYaw, 0);
    }
    c.updateMatrixWorld();
    c.getWorldDirection(_f);
    this.yaw = Math.atan2(-_f.x, -_f.z);
  }
  freeMove(dt, mx, mz, lx, ly) {
    const c = this.camera, sp = 14 * dt;
    this.freeYaw -= lx * 1.6 * dt; this.freePitch = Math.max(-1.5, Math.min(1.5, this.freePitch - ly * 1.2 * dt));
    const s = Math.sin(this.freeYaw), o = Math.cos(this.freeYaw);
    c.position.x += (mx * o + mz * s) * sp; c.position.z += (-mx * s + mz * o) * sp;
  }
}
/** Stick space to world: right is screen right, up is away from the camera. */
export function rot2(x, z, yaw) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return [x * c + z * s, -x * s + z * c];
}
