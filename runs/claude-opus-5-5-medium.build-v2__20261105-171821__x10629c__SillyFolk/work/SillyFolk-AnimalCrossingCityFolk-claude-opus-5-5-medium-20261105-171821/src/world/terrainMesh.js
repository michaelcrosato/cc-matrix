// Terrain as 16×16 chunks of merged meshes, one per surface, rebuilt when a tile changes. Cliffs and banks are skirts.
import { THREE } from '../engine.js';
import { surfaceMat } from '../art/textures.js';
import { WATER, UPPER } from './place.js';
const SURF = { '.': 'grass', ',': 'path', P: 'plaza', s: 'sand', u: 'grass', U: 'path', r: 'path', c: 'grass', '#': 'grass', b: 'boards', k: 'kerb', A: 'asphalt', Q: 'cityplaza' };
const SEAS = ['spring', 'summer', 'autumn', 'winter'];
export const surfaceId = (s, season) => ({ grass: `sf-grass-${SEAS[season]}`, path: `sf-path-${SEAS[season]}`, plaza: 'sf-plaza', sand: season === 3 ? 'sf-sand-winter' : 'sf-sand', dirt: 'sf-dirt', cliff: season === 3 ? 'sf-cliff-winter' : 'sf-cliff', kerb: 'sf-kerb', asphalt: 'sf-asphalt', cityplaza: 'sf-plaza-city', boards: 'sf-boards' }[s]);
export class TerrainView {
  constructor(place, group, overlay = () => null) { this.p = place; this.group = group; this.chunks = new Map(); this.season = 0; this.overlay = overlay; }
  key(cx, cz) { return cx + ',' + cz; }
  buildAll() { for (let cz = 0; cz * 16 < this.p.h; cz++) for (let cx = 0; cx * 16 < this.p.w; cx++) this.buildChunk(cx, cz); }
  tileChanged(tx, tz) { this.buildChunk(tx >> 4, tz >> 4); }
  setSeason(s) { this.season = s; for (const c of this.chunks.values()) for (const m of c) m.material = surfaceMat(surfaceId(m.userData.surf, s)); }
  buildChunk(cx, cz) {
    const k = this.key(cx, cz); const old = this.chunks.get(k); if (old) for (const m of old) { this.group.remove(m); m.geometry.dispose(); }
    const P = this.p, by = {};
    const q = (s) => (by[s] ??= { pos: [], uv: [], idx: [], nor: [] });
    const quad = (s, a, b, c, d, n, uvs) => { const g = q(s), i = g.pos.length / 3; g.pos.push(...a, ...b, ...c, ...d); for (let j = 0; j < 4; j++) g.nor.push(...n); g.uv.push(...uvs); g.idx.push(i, i + 1, i + 2, i, i + 2, i + 3); };
    const U = 4;
    for (let tz = cz * 16; tz < Math.min(P.h, cz * 16 + 16); tz++) for (let tx = cx * 16; tx < Math.min(P.w, cx * 16 + 16); tx++) {
      const c = P.ch(tx, tz); const x = tx + P.ox, z = tz + P.oz;
      const ov = this.overlay(tx, tz);
      if (WATER.has(c)) continue;
      const h0 = P.heightAt(x + 0.5, z + 0.001), h1 = P.heightAt(x + 0.5, z + 0.999);
      const yN = h0, yS = h1;
      const s = ov ?? SURF[c] ?? 'grass';
      quad(s, [x, yN, z], [x, yS, z + 1], [x + 1, yS, z + 1], [x + 1, yN, z], [0, 1, 0], [x / U, z / U, x / U, (z + 1) / U, (x + 1) / U, (z + 1) / U, (x + 1) / U, z / U]);
      // skirts toward lower neighbours
      const skirt = (nc, ax, az, bx, bz, nx, nz, top) => {
        const lower = WATER.has(nc) ? -0.9 : nc === 'r' ? null : P.groundOf(nc, 0);
        if (lower === null || top <= lower + 0.01) return;
        const surf = WATER.has(nc) && top < 1 ? 'dirt' : 'cliff'; const v0 = lower / U, v1 = top / U, uA = (ax + az) / U, uB = (bx + bz) / U;
        quad(surf, [ax, top, az], [ax, lower, az], [bx, lower, bz], [bx, top, bz], [nx, 0, nz], [uA, v1, uA, v0, uB, v0, uB, v1]);
      };
      if (c !== 'r') { const top = P.groundOf(c === 'b' ? '.' : c, 0);
        skirt(P.ch(tx, tz + 1), x + 1, z + 1, x, z + 1, 0, 1, top); skirt(P.ch(tx + 1, tz), x + 1, z, x + 1, z + 1, 1, 0, top); skirt(P.ch(tx - 1, tz), x, z + 1, x, z, -1, 0, top); skirt(P.ch(tx, tz - 1), x, z, x + 1, z, 0, -1, top);
      } else { for (const side of [-1, 1]) { const n = P.ch(tx + side, tz); if (n === 'r') continue; const lower = P.groundOf(n, 0); if (lower >= Math.max(h0, h1)) continue; const X = side > 0 ? x + 1 : x; if (side > 0) quad('cliff', [X, h0, z], [X, h1, z + 1], [X, Math.min(0, h1), z + 1], [X, 0, z], [1, 0, 0], [0, 0.5, 0.25, 0.5, 0.25, 0, 0, 0]); else quad('cliff', [X, h1, z + 1], [X, h0, z], [X, 0, z], [X, 0, z + 1], [-1, 0, 0], [0, 0.5, 0.25, 0.5, 0.25, 0, 0, 0]); } }
    }
    const meshes = [];
    for (const [s, g] of Object.entries(by)) {
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(g.pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(g.nor, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(g.uv, 2)); geo.setIndex(g.idx);
      const m = new THREE.Mesh(geo, surfaceMat(surfaceId(s, this.season))); m.userData.surf = s; m.receiveShadow = true; m.castShadow = s === 'cliff'; this.group.add(m); meshes.push(m);
    }
    this.chunks.set(k, meshes);
  }
}
