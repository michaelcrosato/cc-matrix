// Grass in 48 m chunks around the camera. Burnt cells lose their blades; regrown cells come back thinner.
import { THREE, GrassField, PALETTE } from '../../pixel-engine.js';
import { FN, FCELL, ST, FUEL } from './fire.js';
import { HALF, K } from './terrain.js';

const CH = 48, NCH = Math.ceil(1280 / CH);
const hash = (x, z) => { let h = (Math.floor(x * 7.3) * 374761393 + Math.floor(z * 7.3) * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export class GrassSystem {
  name = 'grass';
  chunks = new Map(); dirty = new Set(); t = 0; built = 0;
  setup(g) { this.g = g; this.enabled = true; g.grassSys = this; g.events.on('cellburn', (i) => this.cellChanged(i)); }
  keyOf(cx, cz) { return cx + cz * NCH; }
  density(x, z) {
    const g = this.g, f = g.fireSys.grid;
    const i = f.at(x, z); if (i < 0) return 0;
    if (!f.baseFuel[i]) return g.world.kindAt(x, z) === K.GRASS ? 0 : 0;
    const s = f.state[i];
    if (s === ST.BURNING || s === ST.BURNT) return 0;
    if (s === ST.REGROWING) return 0.25;
    return f.sparse[i] ? 0.5 : 1;
  }
  build(cx, cz) {
    const g = this.g, x0 = -HALF + cx * CH, z0 = -HALF + cz * CH, mx = x0 + CH / 2, mz = z0 + CH / 2;
    const rows = this;
    let field;
    try {
      field = new GrassField({ area: [CH, CH], at: [mx, g.world.heightAt(mx, mz), mz], count: 7000, height: [0.55, 1.2], width: 0.13, base: PALETTE.orange, tip: PALETTE.sand, seed: cx * 131 + cz * 7 + 1,
        mask: (x, z) => { const d = rows.density(x, z); return d > 0 && (d >= 1 || hash(x, z) < d); }, ground: (x, z) => g.world.heightAt(x, z) });
    } catch { return null; }
    field.castShadow = false; field.receiveShadow = false;
    g.ctx.scene.add(field);
    const c = { field, cx, cz, x: mx, z: mz, visible: true };
    this.chunks.set(this.keyOf(cx, cz), c); this.built++;
    return c;
  }
  cellChanged(i) {
    const fx = i % FN, fz = (i / FN) | 0; const x = -HALF + (fx + 0.5) * FCELL, z = -HALF + (fz + 0.5) * FCELL;
    const key = this.keyOf(Math.floor((x + HALF) / CH), Math.floor((z + HALF) / CH));
    if (this.chunks.has(key)) this.dirty.add(key);
  }
  zero(c) {
    const f = this.g.fireSys.grid, attr = c.field.geometry.getAttribute('aRoot'), Z = this.zeroM ||= new THREE.Matrix4().makeScale(0, 0, 0);
    if (!attr) return;
    for (let b = 0; b < attr.count; b++) { const x = attr.getX(b), z = attr.getY(b); const s = f.stateAt(x, z); if (s === ST.BURNING || s === ST.BURNT) c.field.setMatrixAt(b, Z); }
    c.field.instanceMatrix.needsUpdate = true;
  }
  frame(g, dt) {
    if (!this.enabled) return;
    this.t -= dt; const cam = g.ctx.camera.camera.position;
    const w = g.world.wind;
    for (const c of this.chunks.values()) { c.field.wind.set(w.dir[0] * w.speed * 0.6, w.dir[1] * w.speed * 0.6); c.field.update(g.ctx.time); }
    if (this.dirty.size) { let n = 0; for (const k of this.dirty) { this.zero(this.chunks.get(k)); this.dirty.delete(k); if (++n >= 3) break; } }
    if (this.t > 0) return; this.t = 0.5;
    const ccx = Math.floor((cam.x + HALF) / CH), ccz = Math.floor((cam.z + HALF) / CH); let made = 0;
    for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) {
      const cx = ccx + dx, cz = ccz + dz; if (cx < 0 || cz < 0 || cx >= NCH || cz >= NCH) continue;
      const mx = -HALF + cx * CH + CH / 2, mz = -HALF + cz * CH + CH / 2, d = Math.hypot(mx - cam.x, mz - cam.z);
      const key = this.keyOf(cx, cz); let c = this.chunks.get(key);
      if (!c && d < 170 + CH * 0.7 && made < 2) { c = this.build(cx, cz); made++; }
      if (c) c.field.visible = d < 200 + CH * 0.7;
    }
    for (const [k, c] of this.chunks) if (Math.hypot(c.x - cam.x, c.z - cam.z) > 320) { c.field.removeFromParent(); c.field.dispose(); this.chunks.delete(k); this.dirty.delete(k); }
  }
  /** drop every chunk (a world reset); they come back around the camera */
  reset() { for (const c of this.chunks.values()) { c.field.removeFromParent(); c.field.dispose(); } this.chunks.clear(); this.dirty.clear(); }
  state() { return { grass: this.chunks.size }; }
}
