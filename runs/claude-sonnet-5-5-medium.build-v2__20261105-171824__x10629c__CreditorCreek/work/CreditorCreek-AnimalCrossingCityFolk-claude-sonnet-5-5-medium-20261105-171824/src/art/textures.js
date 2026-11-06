// Quiet ground textures: a flat base plus sparse specks (the library's are too noisy at this zoom).
import { textureDef, TEXTURE_LIBRARY, textureMap, toonMaterial, PALETTE } from '../engine.js';
const full = (c) => ({ path: 'M0 0H32V32H0Z', fill: c });
const mk = (id, a, b, count, extra = {}) => textureDef({ id, about: 'Quiet ' + id, tags: ['surface'], size: [32, 32], tile: true, palette: { a, b, c: extra.c ?? b }, layers: [full('a'), { pattern: 'scatter', colors: ['b'], count, size: 1, seed: extra.seed ?? 4 }, ...(extra.c ? [{ pattern: 'scatter', colors: ['c'], count: 4, size: 1, seed: 9 }] : [])] });
export const GROUND = {
  lawn0: mk('lawn0', 'lime', 'green', 9, { c: 'white', seed: 3 }), lawn1: mk('lawn1', 'green', 'lime', 9), lawn2: mk('lawn2', 'sand', 'orange', 9), lawn3: mk('lawn3', 'white', 'mist', 8),
  path0: mk('path0', 'sand', 'mist', 6, { seed: 5 }), path1: mk('path1', 'sand', 'mist', 6, { seed: 5 }), path2: mk('path2', 'orange', 'sand', 7, { seed: 6 }), path3: mk('path3', 'mist', 'white', 8, { seed: 7 }),
  beach: mk('beach', 'sand', 'white', 12, { seed: 8 }), plaza: mk('plaza', 'mist', 'white', 6, { seed: 10 }), wood: mk('wood', 'orange', 'sand', 7, { seed: 11 }), floorTile: mk('floorTile', 'white', 'mist', 8, { seed: 12 }),
};
let added = false;
export function registerTextures() { if (added) return; added = true; for (const d of Object.values(GROUND)) TEXTURE_LIBRARY.add(d); }
export const groundMat = (id) => toonMaterial(PALETTE.white, { map: textureMap(id) });
