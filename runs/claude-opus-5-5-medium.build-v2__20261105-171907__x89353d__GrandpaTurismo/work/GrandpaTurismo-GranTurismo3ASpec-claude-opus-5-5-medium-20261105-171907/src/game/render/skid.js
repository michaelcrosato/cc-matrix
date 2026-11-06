// Skid marks: a ring buffer of dark quads laid where the car slides or locks.
import { THREE, toonMaterial, PALETTE } from '../../pixel-engine.js';
const { BufferGeometry, BufferAttribute, Mesh, DynamicDrawUsage } = THREE;
export class SkidMarks {
  constructor(max = 1200, color = PALETTE.ink) {
    this.max = max; this.n = 0; this.pos = new Float32Array(max * 18);
    this.g = new BufferGeometry(); this.attr = new BufferAttribute(this.pos, 3); this.attr.setUsage(DynamicDrawUsage); this.g.setAttribute('position', this.attr);
    const nrm = new Float32Array(max * 18); for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1; this.g.setAttribute('normal', new BufferAttribute(nrm, 3));
    this.mesh = new Mesh(this.g, toonMaterial(color)); this.mesh.frustumCulled = false; this.mesh.receiveShadow = false; this.g.setDrawRange(0, 0); this.last = new Map();
  }
  lay(id, x, y, z, rx, rz, w = 0.14) {
    const l = this.last.get(id);
    this.last.set(id, { x, y, z, t: 0 });
    if (!l || Math.hypot(l.x - x, l.z - z) > 5) return;
    if (Math.hypot(l.x - x, l.z - z) < 0.4) { this.last.set(id, l); return; }
    const o = (this.n % this.max) * 18, p = this.pos, a = [l.x - rx * w, l.y + 0.05, l.z - rz * w], b = [l.x + rx * w, l.y + 0.05, l.z + rz * w], c = [x - rx * w, y + 0.05, z - rz * w], d = [x + rx * w, y + 0.05, z + rz * w];
    [a, b, c, b, d, c].forEach((v, i) => { p[o + i * 3] = v[0]; p[o + i * 3 + 1] = v[1]; p[o + i * 3 + 2] = v[2]; });
    this.n++; this.g.setDrawRange(0, Math.min(this.n, this.max) * 6); this.attr.needsUpdate = true;
  }
  lift(id) { this.last.delete(id); }
}
