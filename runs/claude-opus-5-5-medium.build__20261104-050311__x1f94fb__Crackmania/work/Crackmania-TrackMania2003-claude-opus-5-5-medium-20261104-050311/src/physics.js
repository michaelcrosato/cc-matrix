// TrackPhysics: our own Rapier world (metres) holding only the track's fixed colliders, used for ray and shape casts.
// The car is not a Rapier body (src/car.js).
import { ORIGIN, GRID } from './track.js';
import { CELL } from './blocks.js';
import { BLOCKS } from './blocks.js';
import { sampleBlock, ENV_GEO } from './geometry.js';

// Rapier comes from the 3D engine (E.RAPIER), already initialised by E.World3D.init
let RAPIER = null;
export function initPhysics() { RAPIER = globalThis.My3D2dge.RAPIER; return RAPIER.init({}); }

export class TrackPhysics {
  constructor(track, geo, deco = []) {
    RAPIER = RAPIER || globalThis.My3D2dge.RAPIER;
    this.track = track; this.geo = geo;
    const pw = this.pw = new RAPIER.World({ x: 0, y: 0, z: 0 });
    this.info = new Map();   // collider handle -> { surface, blockId }
    const add = (desc, info) => { const c = pw.createCollider(desc); this.info.set(c.handle, info); return c; };
    for (const id in geo.blocks) for (const sname in geo.blocks[id].collide) {
      const C = geo.blocks[id].collide[sname]; if (!C.idx.length) continue;
      add(RAPIER.ColliderDesc.trimesh(new Float32Array(C.pos), new Uint32Array(C.idx)), { surface: sname, blockId: +id });
    }
    // the base plate: cuboids over runs of plate cells (top at z = 0), chasm cells left open
    const ch = geo.chasms, plateSurf = ENV_GEO[track.env].plate;
    for (let cy = 0; cy < GRID; cy++) {
      let run = -1;
      for (let cx = 0; cx <= GRID; cx++) {
        const open = cx < GRID && !ch[cx + ',' + cy];
        if (open && run < 0) run = cx;
        if (!open && run >= 0) {
          const x0 = ORIGIN + run * CELL, x1 = ORIGIN + cx * CELL, y0 = ORIGIN + cy * CELL;
          add(RAPIER.ColliderDesc.cuboid((x1 - x0) / 2, CELL / 2, 2).setTranslation((x0 + x1) / 2, y0 + CELL / 2, -2.05), { surface: plateSurf, blockId: 0, plate: true });
          run = -1;
        }
      }
    }
    // chasm floors: a canyon's bed 60 m down, a stream's bed under the water
    for (const k in ch) { const [cx, cy] = k.split(',').map(Number); add(RAPIER.ColliderDesc.cuboid(CELL / 2, CELL / 2, 2).setTranslation(ORIGIN + cx * CELL + 16, ORIGIN + cy * CELL + 16, (ch[k] === 'water' ? -3.5 : -62)), { surface: ch[k] === 'water' ? 'water' : 'sand', blockId: 0, plate: true }); }
    // the boundary: a wall all round the grid
    const W = GRID * CELL, c = ORIGIN + W / 2;
    for (const [x, y, hx, hy] of [[c, ORIGIN - 1, W / 2 + 2, 1], [c, ORIGIN + W + 1, W / 2 + 2, 1], [ORIGIN - 1, c, 1, W / 2 + 2], [ORIGIN + W + 1, c, 1, W / 2 + 2]])
      add(RAPIER.ColliderDesc.cuboid(hx, hy, 20).setTranslation(x, y, 0), { surface: 'wall', blockId: 0, boundary: true });
    // scenery that stands: cylinders (walls for the car)
    for (const d of deco) if (d.r > 0) add(RAPIER.ColliderDesc.cylinder(4, d.r).setRotation({ x: Math.SQRT1_2, y: 0, z: 0, w: Math.SQRT1_2 }).setTranslation(d.x, d.y, (d.z || 0) + 3.9), { surface: 'wall', blockId: 0, prop: d.kind });
    pw.step();
    // per-block centrelines for lane assist (loops) and the bot
    this.lines = new Map();
    for (const b of track.blocks) if (BLOCKS[b.type].assist) this.lines.set(b.id, sampleBlock(b));
    this._ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -1 });
    this._box = new RAPIER.Cuboid(1, 1, 1);
  }
  /** the first hit along a ray: { toi, n: [x, y, z], surface, blockId } or null */
  ray(o, d, max) {
    const R = this._ray; R.origin.x = o[0]; R.origin.y = o[1]; R.origin.z = o[2]; R.dir.x = d[0]; R.dir.y = d[1]; R.dir.z = d[2];
    const h = this.pw.castRayAndGetNormal(R, max, true);
    if (!h) return null;
    const inf = this.info.get(h.collider.handle) || { surface: 'road', blockId: 0 };
    return { toi: h.timeOfImpact, n: [h.normal.x, h.normal.y, h.normal.z], surface: inf.surface, blockId: inf.blockId, wall: inf.surface === 'wall' };
  }
  /** the first barrier along a ray (walls only): { toi, n } or null */
  rayWall(o, d, max) {
    const R = this._ray; R.origin.x = o[0]; R.origin.y = o[1]; R.origin.z = o[2]; R.dir.x = d[0]; R.dir.y = d[1]; R.dir.z = d[2];
    const h = this.pw.castRayAndGetNormal(R, max, true, undefined, undefined, undefined, undefined, this._isWall || (this._isWall = col => { const i = this.info.get(col.handle); return !!i && i.surface === 'wall'; }));
    return h ? { toi: h.timeOfImpact, n: [h.normal.x, h.normal.y, h.normal.z] } : null;
  }
  /** sweep a box (half extents) with rotation q from p along v (metres): the first hit { t (0..1), n, point } or null */
  sweep(p, q, half, v, filter) {
    const L = Math.hypot(v[0], v[1], v[2]); if (L < 1e-6) return null;
    const B = this._box; B.halfExtents.x = half[0]; B.halfExtents.y = half[1]; B.halfExtents.z = half[2];
    const h = this.pw.castShape({ x: p[0], y: p[1], z: p[2] }, { x: q[0], y: q[1], z: q[2], w: q[3] }, { x: v[0], y: v[1], z: v[2] }, B, .01, 1, false, undefined, undefined, undefined, undefined, filter ? c => filter(this.info.get(c.handle)) : undefined);
    if (!h) return null;
    const inf = this.info.get(h.collider.handle) || {};
    return { t: h.time_of_impact, n: [-h.normal2.x, -h.normal2.y, -h.normal2.z], point: [h.witness2.x, h.witness2.y, h.witness2.z], info: inf };
  }
  free() { this.pw.free(); }
}
