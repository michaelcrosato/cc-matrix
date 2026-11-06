// Surfaces. A floor is a PlaneGeometry whose UVs are scaled by metres / tile size, never a stretched map.
import { DEFAULT_TEXEL, PALETTE, TEXTURE_LIBRARY, textureDef, textureMap, THREE, toonMaterial } from '../../pixel-engine.js';

const { Mesh, PlaneGeometry } = THREE;

export const clinicTile = textureDef({
  id: 'clinic-tile', size: [16, 16], tile: true, palette: { grout: 'mist', a: 'white', b: 'white' },
  layers: [{ pattern: 'tiles', colors: ['grout', 'a', 'b'], w: 16, h: 16, mortar: 1, seed: 3 }],
  about: 'Spotless white clinic tile with thin grey grout', tags: ['floor'],
});

export const gymFloor = textureDef({
  id: 'gym-floor', size: [32, 32], tile: true, palette: { gap: 'orange', a: 'sand', b: 'sand' },
  layers: [{ pattern: 'planks', colors: ['gap', 'a', 'b'], w: 8, gap: 1, length: 32, seed: 4 }],
  about: 'Warm sprung-wood gym floor', tags: ['floor', 'wood'],
});

export const GAME_TEXTURES = [clinicTile, gymFloor];
let added = false;
export function ensureTextures() {
  if (added) return;
  added = true;
  for (const t of GAME_TEXTURES) if (!TEXTURE_LIBRARY.has(t.id)) TEXTURE_LIBRARY.add(t);
}

/** A flat floor with the map at its proper density. */
export function floorPlane(id, w, d, { at = [0, 0, 0], receive = true } = {}) {
  ensureTextures();
  const tile = TEXTURE_LIBRARY.get(id).size[0] / DEFAULT_TEXEL;
  const g = new PlaneGeometry(w, d).rotateX(-Math.PI / 2);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / tile, (uv.getY(i) * d) / tile);
  const m = new Mesh(g, toonMaterial(PALETTE.white, { map: textureMap(id) }));
  m.position.set(...at);
  m.receiveShadow = receive;
  return m;
}
