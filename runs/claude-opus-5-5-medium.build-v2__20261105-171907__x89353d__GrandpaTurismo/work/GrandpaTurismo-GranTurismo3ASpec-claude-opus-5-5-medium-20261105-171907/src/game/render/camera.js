// The chase camera, the bonnet view and the television director. Recipes from the kit's fixed rig: set position, look-at and FOV yourself.
import { THREE } from '../../pixel-engine.js';
import { groundHeight } from './trackmesh.js';
const { Vector3 } = THREE;
export const CAM_MODES = ['near', 'far', 'bonnet'];
export class ChaseCam {
  constructor(cam, app) { this.cam = cam; this.app = app; this.mode = 0; this.pos = new Vector3(); this.look = new Vector3(); this.yaw = 0; this.init = false; this.orbit = 0; this.orbitP = 0; this.want = new Vector3(); this.tmp = new Vector3(); }
  cycle() { this.mode = (this.mode + 1) % CAM_MODES.length; this.init = false; }
  snap() { this.init = false; }
  update(c, dt, o = {}) {
    const tune = this.app.dev?.tune ?? {}, mode = CAM_MODES[this.mode], cam = this.cam, speed = Math.abs(c.u ?? 0);
    let e = c.yaw - this.yaw; while (e > Math.PI) e -= 2 * Math.PI; while (e < -Math.PI) e += 2 * Math.PI;
    if (!this.init) this.yaw = c.yaw; else this.yaw += e * (1 - Math.exp(-dt * 7));
    // right stick or right drag orbits and springs back
    if (o.orbitX || o.orbitY) { this.orbit += (o.orbitX ?? 0) * dt * 3; this.orbitP = Math.max(-0.4, Math.min(0.8, this.orbitP + (o.orbitY ?? 0) * dt * 1.5)); } else { this.orbit *= Math.exp(-dt * 3); this.orbitP *= Math.exp(-dt * 3); }
    const yaw = (mode === 'bonnet' ? c.yaw : this.yaw) + this.orbit + (o.lookBack ? Math.PI : 0), sn = Math.sin(yaw), cs = Math.cos(yaw);
    let fov = (tune.fov ?? 58) + 8 * Math.min(1, speed / 80);
    if (mode === 'bonnet') {
      const fsn = Math.sin(c.yaw), fcs = Math.cos(c.yaw), z = o.lookBack ? -1 : 1;
      cam.position.set(c.x + fsn * 0.2 * z, c.y + 1.05, c.z + fcs * 0.2 * z); this.look.set(c.x + sn * 20, c.y + 1.0, c.z + cs * 20); this.pos.copy(cam.position); fov += 6;
    } else {
      const far = mode === 'far', back = far ? tune.chase ?? 8.5 : (tune.chase ?? 8.5) * 0.8, height = (far ? 3.1 : 2.4) + this.orbitP * back;
      this.want.set(c.x - sn * back, c.y + height, c.z - cs * back);
      if (this.init && this.pos.distanceTo(this.want) > 25) this.init = false; // a teleport or a long frame: don't crawl back from far away
      if (!this.init) this.pos.copy(this.want); else { if (this.last) this.pos.add(this.tmp.set(c.x - this.last.x, c.y - this.last.y, c.z - this.last.z).multiplyScalar(0.85)); this.pos.lerp(this.want, 1 - Math.exp(-dt * 8)); } // the camera travels with the car, so speed doesn't stretch the spring
      this.last ??= new Vector3(); this.last.set(c.x, c.y, c.z);
      cam.position.copy(this.pos);
      this.look.set(c.x + sn * 8, c.y + 1.1, c.z + cs * 8);
    }
    this.init = true;
    cam.lookAt(this.look);
    if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = fov; cam.updateProjectionMatrix(); }
  }
}
/** Trackside posts every ~280 m, tele lenses, and a few authored shots. Picks the next post ahead of the focus car. */
export class TVDirector {
  constructor(T) {
    this.T = T; const tr = T.tr; this.posts = [];
    let side = 1;
    for (let s = 40; s < tr.length; s += 280) { const i = Math.round(s / tr.ds) % tr.N, hw = tr.width[i] / 2, nearLine = T.pit && Math.min(s, tr.length - s) < 380, sd = T.id === 'harbour' || nearLine ? -1 : side, wall = (sd > 0 ? tr.wallR : tr.wallL)[i], d = T.id === 'harbour' || nearLine ? wall + 2.5 : 15 + ((i * 7) % 11), t = hw + d, h = nearLine && T.id !== 'harbour' ? 15 : 3 + ((i * 13) % 6); this.posts.push({ s, x: tr.x[i] - tr.tz[i] * sd * t, z: tr.z[i] + tr.tx[i] * sd * t, y: Math.max(tr.y[i], groundHeight(T, T.id, i, sd, d)) + h, fov: 18 + ((i * 3) % 13) }); side = -side; }
    this.cur = null; this.timer = 0; this.count = 0; this.focusChanged = false; this.shot = 'post'; this.heliA = 0; this.lookS = new Vector3(); this.init = false;
  }
  cut(c) {
    const tr = this.T.tr, L = tr.length; this.timer = 4 + ((this.count * 37) % 5); this.count++;
    const nearLine = Math.min(c.s, L - c.s) < 240; this.shot = nearLine && this.count % 3 === 0 ? 'gantry' : this.count % 7 === 3 ? 'heli' : this.count % 7 === 5 ? 'low' : 'post';
    if (this.shot === 'post') { let best = this.posts[0], bd = Infinity; for (const p of this.posts) { const d = (p.s - c.s + L) % L; if (d > 12 && d < bd) { bd = d; best = p; } } this.cur = best; }
    if (this.shot === 'low') { this.lowS = (c.s + 60 + Math.abs(c.u) * 2) % L; }
    this.init = false;
  }
  update(cam, c, dt, force = false) {
    this.timer -= dt;
    if (this.timer <= 0 || !this.cur || force) { this.cut(c); }
    const tr = this.T.tr; let fov = 24;
    if (this.shot === 'post' && this.cur) {
      const p = this.cur; cam.position.set(p.x, p.y, p.z); const d = Math.hypot(p.x - c.x, p.z - c.z); fov = Math.max(10, Math.min(46, p.fov * (160 / Math.max(50, d)))); if (d > 320) this.timer = 0;
    } else if (this.shot === 'gantry') {
      cam.position.set(tr.x[0], tr.y[0] + 8.4, tr.z[0]); fov = 44; if (Math.hypot(cam.position.x - c.x, cam.position.z - c.z) > 240) this.timer = 0;
    } else if (this.shot === 'heli') {
      this.heliA += dt * 0.2; cam.position.set(c.x + Math.sin(this.heliA) * 34, c.y + 30, c.z + Math.cos(this.heliA) * 34); fov = 40;
    } else {
      const i = Math.round(this.lowS / tr.ds) % tr.N, hw = tr.width[i] / 2; cam.position.set(tr.x[i] - tr.tz[i] * (hw + 1.6), tr.y[i] + 0.5, tr.z[i] + tr.tx[i] * (hw + 1.6)); fov = 34; const d = Math.hypot(cam.position.x - c.x, cam.position.z - c.z); if (d > 130) this.timer = 0;
    }
    cam.lookAt(c.x, c.y + 0.7, c.z);
    if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = fov; cam.updateProjectionMatrix(); }
  }
}
