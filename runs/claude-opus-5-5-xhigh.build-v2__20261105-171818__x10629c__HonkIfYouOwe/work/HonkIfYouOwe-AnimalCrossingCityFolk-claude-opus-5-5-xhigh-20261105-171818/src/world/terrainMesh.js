// Terrain: 16×16 chunks of merged meshes, one per surface, rebuilt when a tile changes.
import { THREE, toonMaterial, PALETTE, textureMap } from '../engine.js';
import { COLS, ROWS, tileChar, tileInfo, groundHeight } from './tiles.js';

const { BufferGeometry, Float32BufferAttribute, Group, Mesh } = THREE;
const CHUNK = 16;
const SEASON_IDS = ['spring', 'summer', 'autumn', 'winter'];
const SEASONAL = { lawn: true, path: true, sand: true };
const matCache = new Map();
export function surfaceMaterial(surface, season) {
  const s = SEASON_IDS[season];
  const id = SEASONAL[surface] ? `${surface}-${s}`
    : surface === 'plaza' ? (season === 3 ? 'plaza-winter' : 'plaza-warm')
      : surface === 'cliff' ? 'cliff-warm' : surface === 'bank' ? 'bank-warm' : surface === 'dock' ? 'dock-boards' : surface === 'worn' ? `path-${s}` : surface;
  let m = matCache.get(id);
  if (!m) matCache.set(id, (m = toonMaterial(PALETTE.white, { map: textureMap(id) })));
  return m;
}
const TILE_M = 4; // a 32-texel tile at 8 texels a metre covers 4 m

class Builder {
  constructor() { this.s = new Map(); }
  get(surface) {
    let b = this.s.get(surface);
    if (!b) this.s.set(surface, (b = { pos: [], nor: [], uv: [], idx: [] }));
    return b;
  }
  quad(surface, a, b, c, d, n, uvA, uvB, uvC, uvD) {
    const q = this.get(surface);
    const i = q.pos.length / 3;
    q.pos.push(...a, ...b, ...c, ...d);
    for (let k = 0; k < 4; k++) q.nor.push(...n);
    q.uv.push(...uvA, ...uvB, ...uvC, ...uvD);
    q.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }
}
const topUV = (x, z) => [x / TILE_M, z / TILE_M];

function addTile(b, x, z, surfaceOf) {
  const c = tileChar(x, z);
  const info = tileInfo(c);
  const heightAt = (px, pz) => groundHeight(px, pz);
  const hT = info.h;
  if (!info.water) {
    const surface = surfaceOf(x, z, info);
    if (info.ramp) {
      const hN = heightAt(x + 0.5, z + 0.001);
      const hS = heightAt(x + 0.5, z + 0.999);
      const n = [0, 4, 2 * (hN - hS)];
      b.quad(surface, [x, hN, z], [x, hS, z + 1], [x + 1, hS, z + 1], [x + 1, hN, z], n, topUV(x, z), topUV(x, z + 1), topUV(x + 1, z + 1), topUV(x + 1, z));
    } else {
      b.quad(surface, [x, hT, z], [x, hT, z + 1], [x + 1, hT, z + 1], [x + 1, hT, z], [0, 1, 0], topUV(x, z), topUV(x, z + 1), topUV(x + 1, z + 1), topUV(x + 1, z));
    }
  }
  // Side faces down to the neighbour on each side.
  const myTop = info.water ? null : hT;
  if (myTop === null) return;
  const side = (nx, nz, ax, az, bx, bz, n) => {
    const nc = tileChar(nx, nz);
    const ni = tileInfo(nc);
    const nh = ni.water ? -1.2 : ni.ramp ? Math.min(groundHeight(nx + 0.5, nz + 0.05), groundHeight(nx + 0.5, nz + 0.95)) : ni.h;
    if (info.ramp) return;
    if (nh >= myTop - 0.01) return;
    const surface = ni.water && myTop < 1 ? 'bank' : myTop >= 1 ? 'cliff' : 'bank';
    const h = myTop - nh;
    const len = Math.hypot(ax - bx, az - bz);
    const u0 = (ax + az) / TILE_M, u1 = u0 + len / TILE_M;
    b.quad(surface, [ax, myTop, az], [ax, nh, az], [bx, nh, bz], [bx, myTop, bz], n, [u0, myTop / TILE_M], [u0, (myTop - h) / TILE_M], [u1, (myTop - h) / TILE_M], [u1, myTop / TILE_M]);
  };
  side(x, z + 1, x, z + 1, x + 1, z + 1, [0, 0, 1]);
  side(x + 1, z, x + 1, z + 1, x + 1, z, [1, 0, 0]);
  side(x, z - 1, x + 1, z, x, z, [0, 0, -1]);
  side(x - 1, z, x, z, x, z + 1, [-1, 0, 0]);
}
function geometryOf(q) {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(q.pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(q.nor, 3));
  g.setAttribute('uv', new Float32BufferAttribute(q.uv, 2));
  g.setIndex(q.idx);
  g.computeBoundingSphere();
  return g;
}

export class TownTerrain {
  /** @param surfaceOf (x, z, info) → surface name: gives worn paths their say. */
  constructor(surfaceOf) {
    this.group = new Group();
    this.surfaceOf = surfaceOf;
    this.season = 1;
    this.chunks = new Map();
    this.groundHeight = groundHeight;
    for (let cz = 0; cz < Math.ceil(ROWS / CHUNK); cz++) for (let cx = 0; cx < Math.ceil(COLS / CHUNK); cx++) this.buildChunk(cx, cz);
  }
  buildChunk(cx, cz) {
    const k = `${cx},${cz}`;
    const old = this.chunks.get(k);
    if (old) for (const m of old) { this.group.remove(m); m.geometry.dispose(); }
    const b = new Builder();
    for (let z = cz * CHUNK; z < Math.min(ROWS, (cz + 1) * CHUNK); z++) for (let x = cx * CHUNK; x < Math.min(COLS, (cx + 1) * CHUNK); x++) addTile(b, x, z, this.surfaceOf);
    const meshes = [];
    for (const [surface, q] of b.s) {
      const mesh = new Mesh(geometryOf(q), surfaceMaterial(surface, this.season));
      mesh.userData.surface = surface;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      meshes.push(mesh);
    }
    this.chunks.set(k, meshes);
  }
  rebuildTile(x, z) { this.buildChunk(Math.floor(x / CHUNK), Math.floor(z / CHUNK)); }
  setSeason(season) {
    this.season = season;
    for (const list of this.chunks.values()) for (const m of list) m.material = surfaceMaterial(m.userData.surface, season);
  }
}
