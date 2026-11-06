// Quiet surfaces: flat base plus sparse specks. Seasons swap the maps under a cover.
import { textureDef, TEXTURE_LIBRARY, textureMap, toonMaterial, PALETTE, THREE, pixelTexture } from '../engine.js';
const full = (c) => ({ path: 'M0 0H32V32H0Z', fill: c });
const surf = (id, a, b, count = 9, seed = 4, c) => textureDef({ id, about: `Quiet surface ${id}`, tags: ['surface'], size: [32, 32], tile: true, palette: c ? { a, b, c } : { a, b }, layers: [full('a'), { pattern: 'scatter', colors: ['b'], count, size: 1, seed }, ...(c ? [{ pattern: 'scatter', colors: ['c'], count: 5, size: 1, seed: seed + 3 }] : [])] });
export const TEX = [
  surf('sf-grass-spring', 'lime', 'green', 9, 4, 'white'), surf('sf-grass-summer', 'green', 'lime', 9, 4), surf('sf-grass-autumn', 'sand', 'orange', 8, 5), surf('sf-grass-winter', 'white', 'mist', 7, 6),
  surf('sf-path-spring', 'sand', 'orange', 6, 8), surf('sf-path-summer', 'sand', 'orange', 6, 8), surf('sf-path-autumn', 'orange', 'red', 6, 8), surf('sf-path-winter', 'mist', 'slate', 5, 8),
  surf('sf-sand', 'sand', 'white', 8, 3), surf('sf-sand-winter', 'mist', 'white', 8, 3), surf('sf-dirt', 'orange', 'red', 9, 2), surf('sf-cliff', 'slate', 'mist', 12, 9), surf('sf-cliff-winter', 'mist', 'white', 12, 9), surf('sf-asphalt', 'night', 'slate', 8, 9), surf('sf-kerb', 'slate', 'mist', 8, 5),
  textureDef({ id: 'sf-plaza', about: 'Plaza stones', tags: ['surface'], size: [32, 32], tile: true, palette: { a: 'mist', b: 'white', c: 'slate' }, layers: [{ pattern: 'tiles', colors: ['c', 'a', 'b'], w: 16, h: 16, seed: 3 }] }),
  textureDef({ id: 'sf-plaza-city', about: 'City paving', tags: ['surface'], size: [32, 32], tile: true, palette: { a: 'slate', b: 'mist', c: 'night' }, layers: [{ pattern: 'tiles', colors: ['c', 'a', 'b'], w: 16, h: 8, seed: 6 }] }),
  textureDef({ id: 'sf-boards', about: 'Boards', tags: ['surface'], size: [32, 32], tile: true, palette: { a: 'plum', b: 'orange', c: 'sand' }, layers: [{ pattern: 'planks', colors: ['a', 'b', 'c'], w: 8, gap: 1, seed: 2 }] }),
];
for (const t of TEX) TEXTURE_LIBRARY.add(t);
const mats = new Map();
export function surfaceMat(id) { let m = mats.get(id); if (!m) { m = toonMaterial(PALETTE.white, { map: textureMap(id) }); mats.set(id, m); } return m; }
/** A two-colour stripe/check wall or floor, as data texture; cached by id. */
const texCache = new Map();
export function dataTexture(key, w, h, pixel) {
  let t = texCache.get(key); if (t) return t;
  const data = new Uint8Array(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = pixel(x, y); const i = (y * w + x) * 4; data[i] = (c >> 16) & 255; data[i + 1] = (c >> 8) & 255; data[i + 2] = c & 255; data[i + 3] = 255; }
  t = pixelTexture(new THREE.DataTexture(data, w, h, THREE.RGBAFormat)); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; texCache.set(key, t); return t;
}
export function patternTexture(key, rows) { return dataTexture(key, 16, 16, (x, y) => PALETTE[PAL16[rows[15 - y]?.[x] ?? 12]] ?? PALETTE.white); }
export const PAL16 = 'ink plum red orange sand lime green teal navy blue sky cyan white mist slate night'.split(' ');
export function twoTone(key, a, b, kind = 'stripe') { return dataTexture(key, 8, 8, (x, y) => (kind === 'stripe' ? (x % 4 < 2 ? PALETTE[a] : PALETTE[b]) : kind === 'check' ? ((x >> 2) + (y >> 2)) % 2 ? PALETTE[a] : PALETTE[b] : kind === 'boards' ? (y % 4 === 0 ? PALETTE[b] : PALETTE[a]) : (x % 4 === 1 && y % 4 === 1 ? PALETTE[b] : PALETTE[a]))); }
export const shirtTexture = (it) => twoTone('shirt-' + it.id, it.color, it.tex === 'stripes' ? 'navy' : it.tex === 'check' ? 'night' : 'white', it.tex === 'stripes' ? 'stripe' : it.tex === 'check' ? 'check' : 'dots');
const PAINT = {
  mona: ['ssssssssssssssss', 'sgggggggggggggss', 'sgggggwwwgggggss', 'sggggwwwwwggggss', 'sgggwwkwkwwgggss', 'sgggwwwwwwwgggss', 'sgggwwrrwwggggss', 'sggggwwwwgggggss', 'sggggowwoggggggs', 'sgggoooooogggggs', 'sggoooooooogggss', 'sggoooooooogggss', 'sssssssssssssss'],
  pearl: ['kkkkkkkkkkkkkkkk', 'kkkkkkkwwwwkkkkk', 'kkkkkkwwwwwwkkkk', 'kkbbbwwwkwwwkkkk', 'kkbbbbwwwwwokkkk', 'kkkbbbbwwwoookkk', 'kkkkkbkwwwkkkkkk', 'kkkkkwkwwwkkkkkk', 'kkkkkkwwwwwkkkkk', 'kkkkkbbbbbbbkkkk', 'kkkkbbbbbbbbbkkk', 'kkkkbbbbbbbbbbkk'],
  wave: ['ssssssssssssssss', 'ssssssswwssssrss', 'ssssswwbbwsssrss', 'ssswbbbbbbwsssss', 'sswbbwwbbbbwssss', 'swbbwsswbbbbwsss', 'sbbbwsssbbbbbwss', 'sbbbbssbbbbbbbbs', 'bbbbbbbbbbbbbbbb', 'bbooobbbbooobbbb', 'bbbbbbbbbbbbbbbb'],
  starry: ['nnnnwnnnnnnwnnnn', 'nnbbbbnnwnnnnwnn', 'nbbsbbbbbnnnnnnn', 'nnbbbbbsbbbnnwnn', 'nnnwnbbbbbbbnnnn', 'nwnnnnnnbbsbbnnn', 'nnnnnnnnnnbbbnwn', 'kkknnnnnkknnnnnn', 'kkkkkkkkkkkkkkkk', 'kkrrrrrkkkkkkkkk', 'kkkkrkkkkkkkkkkk', 'kkkkrkkkkkkkkkkk'],
  venus: ['bbbbbbbbbbbbbbbb', 'bbbbbbgggbbbbbbb', 'bbbbbgrrrgbbbbbb', 'bbbbbgrrrgbbbbbb', 'bbbbbbgggbbbbbbb', 'bbbbbbbgbbbbbbbb', 'bbbbbbbgbbbbbbbb', 'bbbwwwwwwwwwbbbb', 'bbwwswwswwswwbbb', 'bbbwwwwwwwwwbbbb', 'ssssssssssssssss'],
  honk: ['ooorrroooorrrooo', 'oorrrroooorrroooo'.slice(0, 16), 'ooorrrrooorrrrro', 'rrrrbbbbbbbbbbbb', 'bbbbnnnnnnnnnnnn', 'bnnnnwwwwnnnnnnn', 'nnnnwwwwwwnnnnnn', 'nnnnwkwwkwnnnnnn', 'nnnnwwkkwwnnnnnn', 'nnnnnwwwwnnnnnnn', 'kkkkkkwwkkkkkkkk', 'kkkkkkwwkkkkkkkk'],
  whistler: ['mmmmmmmmmmmmmmmm', 'mmmmmmmmmmmmmmmm', 'mmkkkkkkmmmmmmmm', 'mmkwwwwkmmmmoomm', 'mmkwwwwkmmmooomm', 'mmkkkkkkmmmoookm', 'mmmmmmmmmmmkkkkm', 'mmmmmmmmmkkkkkkm', 'mmmmmmmkkkkkkkkm', 'mmmmmkkkkkkkkkkk', 'sssssssssssssssk', 'ssssssssssssssss'],
  cheese: ['bbbbbbbbbbbbbbbb', 'bbbsssbbbbsssbbb', 'bbsssssbbsssssbb', 'bbsksssbbsskssbb', 'bbsssssbbsssssbb', 'ggggggggggggggg', 'ggsgggsssggggsgg', 'ggssgsssssgggssg', 'gsssssksssssssss', 'ssssssssskssssss', 'sksssssssssssskk', 'ssssssssssssssss'],
};
const CP = { s: 'sand', g: 'green', w: 'white', k: 'ink', r: 'red', o: 'orange', b: 'blue', n: 'navy', m: 'mist' };
/** Painting texture. A forged one has one telling difference. */
export function paintingTexture(id, forged) {
  const rows = PAINT[id]; const w = 16, h = 12;
  return dataTexture(`art-${id}-${forged ? 'f' : 'r'}`, w, h, (x, y) => {
    let ch = rows[h - 1 - y]?.[x] ?? rows[0][0];
    if (forged && FORGERY[id]?.[0] === x && FORGERY[id]?.[1] === h - 1 - y) ch = FORGERY[id][2];
    return PALETTE[CP[ch] ?? 'mist'];
  });
}
export const FORGERY = { mona: [8, 6, 'k'], pearl: [6, 7, 'k'], wave: [13, 1, 's'], starry: [11, 0, 'n'], venus: [8, 2, 'b'], honk: [7, 7, 'n'], whistler: [13, 3, 'k'], cheese: [6, 3, 'b'] };
export const PAINT_ROWS = PAINT; export const PAINT_COL = CP;
