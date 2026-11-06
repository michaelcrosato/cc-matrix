// Grass by the chunk, and what fire does to it.
import { GrassField, PALETTE, THREE } from '../../pixel-engine.js';
import { BURNING, FRESH, FUEL, fireIndex, cellX, cellZ } from './fire.js';
import { dist2 } from './geom.js';
import { KIND } from './terrain.js';
const { BoxGeometry, InstancedMesh, Matrix4, Mesh, Quaternion, Vector3, Group, AnimationMixer } = THREE;
const ZERO = new Matrix4().makeScale(0, 0, 0), M = new Matrix4(), Q = new Quaternion(), V = new Vector3(), S = new Vector3(), UP = new Vector3(0, 1, 0);
const CHUNK = 48;

export class GrassPart {
  burnGrass(i) {
    const cx = cellX(i), cz = cellZ(i), key = this.chunkKey(cx, cz), ch = this.chunks.get(key);
    if (!ch || !ch.byCell) return; const list = ch.byCell.get(i); if (!list) return;
    for (const b of list) ch.field.setMatrixAt(b, ZERO);
    ch.field.instanceMatrix.needsUpdate = true;
  }
  dirtyChunk(i) { const ch = this.chunks.get(this.chunkKey(cellX(i), cellZ(i))); if (ch) ch.stale = true; }
  chunkKey(x, z) { return `${Math.floor((x + 640) / CHUNK)},${Math.floor((z + 640) / CHUNK)}`; }
  // ----- Grass chunks -----
  updateGrass(camX, camZ) {
    if (!this.game.grassOn) return;
    const fire = this.fire, cx = Math.floor((camX + 640) / CHUNK), cz = Math.floor((camZ + 640) / CHUNK);
    let built = 0;
    for (let dz = -4; dz <= 4 && !built; dz++) for (let dx = -4; dx <= 4 && !built; dx++) {
      const ax = cx + dx, az = cz + dz; if (ax < 0 || az < 0 || ax * CHUNK >= 1280 || az * CHUNK >= 1280) continue;
      const x = -640 + (ax + 0.5) * CHUNK, z = -640 + (az + 0.5) * CHUNK, d = dist2(x, z, camX, camZ), key = `${ax},${az}`;
      let ch = this.chunks.get(key);
      if (ch?.stale) { this.ctx.scene.remove(ch.field); ch.field.dispose(); this.chunks.delete(key); ch = null; }
      if (!ch && d < 170) {
        const field = new GrassField({ area: [CHUNK, CHUNK], at: [x, 0, z], count: 7000, height: [0.55, 1.2], width: 0.13, base: PALETTE.orange, tip: PALETTE.sand, seed: ax * 31 + az, ground: (gx, gz) => this.land.heightAt(gx, gz), mask: (gx, gz) => { const i = fireIndex(gx, gz); return i >= 0 && fire.fuel[i] > 0 && fire.fuel[i] < FUEL.BUILDING && (fire.state[i] === FRESH || fire.state[i] === BURNING) && this.land.kindAt(gx, gz) !== KIND.CROP; } });
        field.castShadow = false; field.receiveShadow = true; field.frustumCulled = true;
        this.ctx.scene.add(field);
        const root = field.geometry.getAttribute('aRoot'), byCell = new Map();
        for (let b = 0; b < field.blades; b++) { const i = fireIndex(root.getX(b), root.getY(b)); (byCell.get(i) ?? byCell.set(i, []).get(i)).push(b); }
        ch = { field, byCell, x, z };
        this.chunks.set(key, ch); built++;
      }
    }
    for (const [key, ch] of this.chunks) {
      const d = dist2(ch.x, ch.z, camX, camZ);
      ch.field.visible = d < 200;
      if (d > 320) { this.ctx.scene.remove(ch.field); ch.field.dispose(); this.chunks.delete(key); }
      else { ch.field.wind.set(this.wind.x * this.wind.speed * 0.5, this.wind.z * this.wind.speed * 0.5); if (ch.field.visible) ch.field.update(this.time); }
    }
  }
  tallGrassAt(x, z) { const k = this.land.kindAt(x, z); if (k === KIND.CROP) return true; if (k !== KIND.GRASS && k !== KIND.WOOD) return false; const i = fireIndex(x, z); return i >= 0 && this.fire.state[i] === FRESH && this.fire.fuel[i] > 0; }
}
