import { textureDef, TEXTURE_LIBRARY } from '../../pixel-engine.js';
export const clinicTile = textureDef({
  id: 'clinic-tile', size: [16, 16], tile: true, palette: { grout: 'mist', a: 'white', b: 'white' },
  layers: [{ pattern: 'tiles', colors: ['grout', 'a', 'b'], w: 16, h: 16, mortar: 1, seed: 3 }],
  about: 'Spotless white clinic tiles with pale grout', tags: ['floor', 'clean'],
});
export const sandSpeck = textureDef({
  id: 'sand-speck', size: [16, 16], tile: true, palette: { a: 'sand', b: 'sand', c: 'orange' },
  layers: [{ pattern: 'noise', colors: ['a', 'b'], scale: 4, seed: 2 }, { pattern: 'scatter', colors: ['c'], count: 4, size: 1, seed: 5 }],
  about: 'Warm beach sand with a few darker specks', tags: ['floor', 'sand'],
});
export const TEXTURES = [clinicTile, sandSpeck];
let added = false;
export function registerTextures() { if (added) return; added = true; for (const t of TEXTURES) { try { TEXTURE_LIBRARY.add(t); } catch { /* already */ } } }
