// The driver's cameras: chase near, chase far, bonnet. A little yaw lag so slides read; right stick or right drag looks around.
import { THREE } from '../../pixel-engine.js';
const { Vector3 } = THREE;
export const CAM_MODES = [{ id: 'near', back: 6.8, up: 2.4 }, { id: 'far', back: 8.5, up: 3.1 }, { id: 'bonnet', back: 0, up: 1.05 }];
export class ChaseCam {
  constructor(cam) { this.cam = cam; this.mode = 0; this.pos = new Vector3(); this.want = new Vector3(); this.look = new Vector3(); this.yaw = 0; this.orbit = 0; this.pitch = 0; this.ready = false; this.distance = null; this.fovBase = 58; }
  cycle() { this.mode = (this.mode + 1) % CAM_MODES.length; this.ready = false; }
  snap() { this.ready = false; }
  update(dt, c, { lookBack = false, lookX = 0, lookY = 0, slope = 0 } = {}) {
    const m = CAM_MODES[this.mode], cam = this.cam, speed = Math.abs(c.u ?? 0);
    let dy = c.yaw - this.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
    if (!this.ready) { this.yaw = c.yaw; dy = 0; }
    this.yaw += dy * Math.min(1, dt * 7);
    this.orbit += (lookX * 2.6 - this.orbit) * Math.min(1, dt * 6); this.pitch += (lookY * 0.8 - this.pitch) * Math.min(1, dt * 6);
    let baseYaw = this.yaw + this.orbit; if (lookBack) baseYaw += Math.PI;
    const sn = Math.sin(baseYaw), cs = Math.cos(baseYaw);
    if (m.id === 'bonnet') {
      const fsn = Math.sin(c.yaw + (lookBack ? Math.PI : this.orbit)), fcs = Math.cos(c.yaw + (lookBack ? Math.PI : this.orbit));
      this.want.set(c.x + Math.sin(c.yaw) * 0.2, c.y + m.up, c.z + Math.cos(c.yaw) * 0.2);
      this.pos.copy(this.want);
      this.look.set(c.x + fsn * 12, c.y + 1.0 + slope * 12 + this.pitch * 6, c.z + fcs * 12);
    } else {
      const back = this.distance ?? m.back;
      this.want.set(c.x - sn * back, c.y + m.up + this.pitch * 2 + slope * -back, c.z - cs * back);
      if (!this.ready) this.pos.copy(this.want); else this.pos.lerp(this.want, 1 - Math.exp(-dt * 8));
      this.look.set(c.x + sn * 8, c.y + 1.1 + slope * 8, c.z + cs * 8);
    }
    this.ready = true;
    cam.position.copy(this.pos); cam.lookAt(this.look);
    cam.fov = this.fovBase + 8 * Math.min(1, speed / 80); cam.updateProjectionMatrix();
  }
}
