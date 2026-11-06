// Chase / bonnet / look-back camera with a lagging yaw, and a free orbit camera. Plan section 5 (Cameras), recipe C3.
import { THREE } from '../../pixel-engine.js';
const { Vector3 } = THREE;
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
export const CAM_MODES = ['CHASE NEAR', 'CHASE FAR', 'BONNET'];
export class ChaseCam {
  constructor(camera) { this.cam = camera; this.mode = 0; this.pos = new Vector3(); this.want = new Vector3(); this.look = new Vector3(); this.yaw = 0; this.init = false; this.orbitYaw = 0; this.orbitPitch = 0; this.dist = 8.5; this.fov = 58; this.chase = null; this.shake = 0; this.dev = { dist: null, fov: null }; this.backT = 0; }
  update(dt, c, o = {}) {
    const cam = this.cam, sp = Math.abs(c.u ?? 0);
    if (!this.init) { this.yaw = c.yaw; this.init = true; this.pos.set(c.x, c.y + 3, c.z); }
    this.yaw += angDiff(c.yaw, this.yaw) * (1 - Math.exp(-dt * (o.yawRate ?? 5.5)));
    this.orbitYaw += ((o.orbitX ?? 0) * 1.8 * dt); this.orbitPitch = Math.max(-0.3, Math.min(0.6, this.orbitPitch + (o.orbitY ?? 0) * 1.2 * dt));
    if (!o.orbitX && !o.orbitDrag) this.orbitYaw *= Math.exp(-dt * 2.5); if (!o.orbitY && !o.orbitDrag) this.orbitPitch *= Math.exp(-dt * 2.5);
    const near = this.mode === 0, back = (this.dev.dist ?? (near ? 6.8 : 8.5)), height = near ? 2.4 : 3.1;
    let yaw = this.yaw + this.orbitYaw; const bk = o.lookBack ? Math.PI : 0;
    const fovBase = this.dev.fov ?? 58, fov = fovBase + 8 * Math.min(1, sp / 80);
    if (this.mode === 2 && !o.lookBack) {
      const sn = Math.sin(c.yaw), cs = Math.cos(c.yaw); cam.position.set(c.x + sn * 0.2, c.y + 1.05, c.z + cs * 0.2); cam.lookAt(c.x + sn * 40, c.y + 1.0 + (c.pitchRoad ?? 0) * -20 + (c.vy ?? 0) * 0.02, c.z + cs * 40); this.pos.copy(cam.position);
    } else {
      yaw += bk; const sn = Math.sin(yaw), cs = Math.cos(yaw), h = height * Math.cos(this.orbitPitch) + this.orbitPitch * 6;
      this.want.set(c.x - sn * back, c.y + h, c.z - cs * back); this.pos.lerp(this.want, 1 - Math.exp(-dt * 8)); cam.position.copy(this.pos);
      if (cam.position.y < c.y + 0.6) cam.position.y = c.y + 0.6;
      cam.lookAt(c.x + sn * 8, c.y + 1.1, c.z + cs * 8);
    }
    if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = fov; cam.updateProjectionMatrix(); }
  }
  cycle() { this.mode = (this.mode + 1) % 3; if (this.mode === 2) this.pos.set(0, 0, 0); this.init = this.mode !== 2 ? false : this.init; }
  snap() { this.init = false; }
}
export function setupCamera(cam) { cam.near = 0.5; cam.far = 6000; cam.updateProjectionMatrix(); }
export { angDiff };
