// See-through occluders: things between the camera and the player turn to dithered dissolve (shared materials, with hysteresis).
import { THREE, toonMaterial } from '../engine.js';
const { Box3, Vector3 } = THREE;
const cache = new Map();
const dissolveMat = (m) => { const hex = m.color?.getHex?.() ?? 0xffffff; let d = cache.get(hex); if (!d) { d = toonMaterial(hex, { dissolve: true }); d.dissolve = 0.55; cache.set(hex, d); } return d; };
export class Occluders {
  constructor() { this.faded = new Map(); this.box = new Box3(); this.v = new Vector3(); this.corners = Array.from({ length: 8 }, () => new Vector3()); this.t = 0; this.cand = []; }
  setCandidates(list) { this.cand = list; }
  fade(obj, on) {
    const st = this.faded.get(obj); if (on && !st) { const list = []; obj.traverse(o => { if (o.isMesh && o.material && !Array.isArray(o.material) && o.material.color) { list.push([o, o.material]); o.material = dissolveMat(o.material); } }); this.faded.set(obj, { list, since: this.t }); }
    else if (!on && st && this.t - st.since > 0.25) { for (const [o, m] of st.list) o.material = m; this.faded.delete(obj); }
  }
  update(dt, camera, p, enabled = true) {
    this.t += dt; if (!enabled) { for (const o of [...this.faded.keys()]) { const st = this.faded.get(o); for (const [m, mat] of st.list) m.material = mat; this.faded.delete(o); } return; }
    camera.updateMatrixWorld?.(); const dir = this.v; camera.getWorldDirection(dir); const pd = p.x * dir.x + p.y * dir.y + p.z * dir.z; const pn = new Vector3(p.x, p.y + 0.9, p.z).project(camera);
    for (const obj of this.cand) {
      if (!obj.visible) continue; this.box.setFromObject(obj); const b = this.box; let nearer = false, overlap = false;
      let minx = 9, maxx = -9, miny = 9, maxy = -9; let k = 0;
      for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) { const c = this.corners[k++].set(x, y, z); const d = x * dir.x + y * dir.y + z * dir.z; c.project(camera); minx = Math.min(minx, c.x); maxx = Math.max(maxx, c.x); miny = Math.min(miny, c.y); maxy = Math.max(maxy, c.y); }
      const bd = ((b.min.x + b.max.x) / 2) * dir.x + ((b.min.y + b.max.y) / 2) * dir.y + ((b.min.z + b.max.z) / 2) * dir.z; nearer = bd < pd - 0.3; overlap = pn.x > minx - 0.02 && pn.x < maxx + 0.02 && pn.y > miny - 0.05 && pn.y < maxy + 0.02; this.fade(obj, nearer && overlap && b.max.y > 1.4);
    }
    for (const o of [...this.faded.keys()]) if (!this.cand.includes(o)) { const st = this.faded.get(o); for (const [m, mat] of st.list) m.material = mat; this.faded.delete(o); }
  }
}
