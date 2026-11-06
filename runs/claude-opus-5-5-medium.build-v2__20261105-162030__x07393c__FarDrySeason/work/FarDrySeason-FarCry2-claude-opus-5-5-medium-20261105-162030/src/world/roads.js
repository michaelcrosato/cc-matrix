// The railway on the land.
import { PALETTE, THREE, toonMaterial, mergeStaticMeshes } from '../../pixel-engine.js';
import { RAIL_SPUR, RAILWAY } from '../content/roads.js';
import { polyLength, polyPoint } from './geom.js';
import { WATER_Y } from './terrain.js';
const { BoxGeometry, InstancedMesh, Matrix4, Mesh, Quaternion, Vector3, Group, AnimationMixer } = THREE;
export class RoadsPart {
  buildRail(ctx) {
    const land = this.land, parts = [];
    const railY = (x, z) => Math.max(land.heightAt(x, z), WATER_Y + 2.5);
    this.railY = railY;
    const ironM = toonMaterial(PALETTE.ink), tieM = toonMaterial(PALETTE.plum);
    for (const pts of [RAILWAY, RAIL_SPUR]) {
      const L = polyLength(pts);
      for (let s = 0; s < L; s += 6) {
        const a = polyPoint(pts, s), b = polyPoint(pts, Math.min(L, s + 6));
        const ya = railY(a.x, a.z) + 0.16, yb = railY(b.x, b.z) + 0.16, len = Math.hypot(b.x - a.x, yb - ya, b.z - a.z);
        for (const side of [-0.72, 0.72]) {
          const rail = new Mesh(new BoxGeometry(0.12, 0.14, len), ironM);
          rail.position.set((a.x + b.x) / 2 + Math.cos(a.yaw) * side, (ya + yb) / 2, (a.z + b.z) / 2 - Math.sin(a.yaw) * side);
          rail.lookAt(b.x + Math.cos(a.yaw) * side, yb, b.z - Math.sin(a.yaw) * side); rail.updateMatrixWorld(); parts.push(rail);
        }
        const tie = new Mesh(new BoxGeometry(2.1, 0.14, 0.34), tieM); tie.position.set(a.x, ya - 0.1, a.z); tie.rotation.y = a.yaw; tie.updateMatrixWorld(); parts.push(tie);
        const tie2 = tie.clone(); tie2.position.set((a.x + b.x) / 2, (ya + yb) / 2 - 0.1, (a.z + b.z) / 2); tie2.updateMatrixWorld(); parts.push(tie2);
      }
    }
    ctx.scene.add(...mergeStaticMeshes(parts, { castShadow: false, receiveShadow: true }));
  }
}
