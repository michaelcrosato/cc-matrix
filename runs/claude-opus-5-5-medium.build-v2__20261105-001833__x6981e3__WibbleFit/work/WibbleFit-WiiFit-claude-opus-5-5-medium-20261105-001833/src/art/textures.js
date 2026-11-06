// Surfaces. A plane with UVs in tiles, never a stretched map.
import { DEFAULT_TEXEL, PALETTE, TEXTURE_LIBRARY, textureDef, textureMap, THREE, toonMaterial } from '../../pixel-engine.js';
const { Mesh, PlaneGeometry } = THREE;
export const clinicTile = textureDef({ id: 'clinic-tile', about: 'Clean white clinic tile with pale grout', tags: ['floor', 'surface'], size: [16, 16], tile: true, palette: { grout: 'mist', a: 'white', b: 'white' }, layers: [{ pattern: 'tiles', colors: ['grout', 'a', 'b'], w: 16, h: 16, mortar: 1, seed: 3 }] });
if (!TEXTURE_LIBRARY.has?.('clinic-tile') && !safeGet('clinic-tile')) TEXTURE_LIBRARY.add(clinicTile);
function safeGet(id) { try { return TEXTURE_LIBRARY.get(id); } catch { return null; } }
export const TEXTURE_DEFS = [clinicTile];
export function tiledPlane(w, d, id, color = PALETTE.white) {
  const tile = safeGet(id).size[0] / DEFAULT_TEXEL;
  const g = new PlaneGeometry(w, d).rotateX(-Math.PI / 2);
  const uv = g.attributes.uv.array;
  for (let i = 0; i < uv.length; i += 2) { uv[i] = (uv[i] * w) / tile; uv[i + 1] = (uv[i + 1] * d) / tile; }
  const m = new Mesh(g, toonMaterial(color, { map: textureMap(id) }));
  m.receiveShadow = true; return m;
}
