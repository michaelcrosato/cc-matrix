// Skid marks: a ring buffer of dark quads laid where a tyre slides or locks.
import { rgb } from './geo.js';
import { PALETTE, THREE, toonMaterial } from '../../pixel-engine.js';
const { BufferAttribute, BufferGeometry, DynamicDrawUsage, Mesh } = THREE;
export class SkidMarks {
  constructor(max = 1400, colour = 'ink') {
    this.max = max; this.n = 0; this.next = 0; this.pos = new Float32Array(max * 18); this.geo = new BufferGeometry();
    this.attr = new BufferAttribute(this.pos, 3); this.attr.setUsage(DynamicDrawUsage); this.geo.setAttribute('position', this.attr);
    const nor = new Float32Array(max * 18); for (let i = 1; i < nor.length; i += 3) nor[i] = 1; this.geo.setAttribute('normal', new BufferAttribute(nor, 3));
    const col = new Float32Array(max * 18), c = rgb(colour); for (let i = 0; i < col.length; i += 3) { col[i] = c.r; col[i + 1] = c.g; col[i + 2] = c.b; } this.geo.setAttribute('color', new BufferAttribute(col, 3));
    this.geo.setDrawRange(0, 0);
    this.mesh = new Mesh(this.geo, toonMaterial(0xffffff, { vertexColors: true })); this.mesh.frustumCulled = false; this.mesh.receiveShadow = false; this.mesh.castShadow = false; this.last = new Map();
    void PALETTE;
  }
  // A mark from this tyre's last point to here, width w. key: which tyre.
  lay(key, x, y, z, w = 0.22) {
    const l = this.last.get(key);
    if (l && Math.hypot(x - l.x, z - l.z) < 8 && Math.hypot(x - l.x, z - l.z) > 0.4) {
      const dx = x - l.x, dz = z - l.z, d = Math.hypot(dx, dz) || 1, rx = (dz / d) * w, rz = (-dx / d) * w, Y = y + 0.05, Y0 = l.y + 0.05, p = this.next * 18, a = this.pos;
      a.set([l.x - rx, Y0, l.z - rz, l.x + rx, Y0, l.z + rz, x + rx, Y, z + rz, l.x - rx, Y0, l.z - rz, x + rx, Y, z + rz, x - rx, Y, z - rz], p);
      this.next = (this.next + 1) % this.max; this.n = Math.min(this.max, this.n + 1); this.geo.setDrawRange(0, this.n * 6); this.attr.needsUpdate = true;
      this.last.set(key, { x, y, z });
    } else if (!l || Math.hypot(x - l.x, z - l.z) >= 8) this.last.set(key, { x, y, z });
  }
  lift(key) { this.last.delete(key); }
}
