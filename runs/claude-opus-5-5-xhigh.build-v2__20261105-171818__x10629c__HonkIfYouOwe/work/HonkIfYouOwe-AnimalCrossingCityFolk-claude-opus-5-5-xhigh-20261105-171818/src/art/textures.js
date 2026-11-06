// Quiet ground and the game's own pixel textures, as data. Paintings live in art/paintings.js.
import { textureDef, TEXTURE_LIBRARY, TextureCatalog } from '../engine.js';

const full = (c) => ({ path: 'M0 0H32V32H0Z', fill: c });
const quiet = (id, about, a, b, c, count = 9, seed = 4) => textureDef({
  id, about, tags: ['surface'], size: [32, 32], tile: true,
  palette: c ? { a, b, c } : { a, b },
  layers: [full('a'), { pattern: 'scatter', colors: c ? ['b', 'c'] : ['b'], count, size: 1, seed }],
});

export const SURFACES = [
  quiet('lawn-spring', 'Spring lawn: lime with green and white specks', 'lime', 'green', 'white', 10, 4),
  quiet('lawn-summer', 'Summer lawn: green with lime specks', 'green', 'lime', null, 9, 4),
  quiet('lawn-autumn', 'Autumn lawn: sand with orange specks', 'sand', 'orange', null, 9, 7),
  quiet('lawn-winter', 'Winter lawn: snow with mist specks', 'white', 'mist', null, 7, 2),
  quiet('path-spring', 'Spring path: sand with orange specks', 'sand', 'orange', null, 7, 11),
  quiet('path-summer', 'Summer path: sand with orange specks', 'sand', 'orange', null, 7, 11),
  quiet('path-autumn', 'Autumn path: orange with red specks', 'orange', 'red', null, 7, 12),
  quiet('path-winter', 'Winter path: mist with slate specks', 'mist', 'slate', null, 6, 13),
  quiet('sand-spring', 'Beach sand', 'sand', 'white', null, 8, 5),
  quiet('sand-summer', 'Beach sand', 'sand', 'white', null, 8, 5),
  quiet('sand-autumn', 'Pale autumn beach', 'white', 'sand', null, 8, 5),
  quiet('sand-winter', 'Frosted beach', 'white', 'mist', 'sky', 6, 5),
  textureDef({ id: 'plaza-warm', about: 'Plaza paving, big quiet slabs', tags: ['surface'], size: [32, 32], tile: true, palette: { a: 'mist', b: 'slate' },
    layers: [full('a'), { pattern: 'tiles', colors: ['b', 'a', 'a'], w: 16, h: 16, mortar: 1, seed: 3 }] }),
  textureDef({ id: 'plaza-winter', about: 'Plaza paving under snow', tags: ['surface'], size: [32, 32], tile: true, palette: { a: 'white', b: 'mist' },
    layers: [full('a'), { pattern: 'tiles', colors: ['b', 'a', 'a'], w: 16, h: 16, mortar: 1, seed: 3 }] }),
  textureDef({ id: 'cliff-warm', about: 'Cliff face, layered rock', tags: ['surface'], size: [32, 32], tile: true, palette: { a: 'slate', b: 'night', c: 'mist' },
    layers: [full('a'), { pattern: 'bricks', colors: ['b', 'a', 'a'], w: 16, h: 8, mortar: 1, offset: 0.5, seed: 8 }, { pattern: 'scatter', colors: ['c'], count: 6, size: 1, seed: 2 }] }),
  textureDef({ id: 'bank-warm', about: 'River bank earth', tags: ['surface'], size: [32, 32], tile: true, palette: { a: 'plum', b: 'night' },
    layers: [full('a'), { pattern: 'scatter', colors: ['b'], count: 10, size: 1, seed: 9 }] }),
  textureDef({ id: 'dock-boards', about: 'Dock and bridge boards', tags: ['surface'], size: [32, 32], tile: true, palette: { a: 'orange', b: 'orange', c: 'plum' },
    layers: [{ pattern: 'planks', colors: ['c', 'b', 'a'], w: 8, gap: 1, length: 32, grain: 1, seed: 6 }] }),
  textureDef({ id: 'city-pavement', about: 'City pavement', tags: ['surface'], size: [32, 32], tile: true, palette: { a: 'slate', b: 'night' },
    layers: [full('a'), { pattern: 'tiles', colors: ['b', 'a', 'a'], w: 8, h: 8, mortar: 1, seed: 4 }] }),
  textureDef({ id: 'city-road', about: 'City road, dark', tags: ['surface'], size: [32, 32], tile: true, palette: { a: 'night', b: 'ink' },
    layers: [full('a'), { pattern: 'scatter', colors: ['b'], count: 8, size: 1, seed: 8 }] }),
];

// Floors and wallpaper the player can buy: id → texture.
const planks = (id, a, b, c) => textureDef({ id, about: `Floor boards ${id}`, tags: ['surface', 'floor'], size: [32, 32], tile: true, palette: { a, b, c },
  layers: [{ pattern: 'planks', colors: ['c', 'b', 'a'], w: 8, gap: 1, length: 32, grain: 1, seed: 3 }] });
const tiles = (id, a, b) => textureDef({ id, about: `Floor tiles ${id}`, tags: ['surface', 'floor'], size: [32, 32], tile: true, palette: { a, b },
  layers: [{ pattern: 'checker', colors: ['a', 'b'], cell: 8 }] });
const plain = (id, a, b) => quiet(id, `Plain ${id}`, a, b, null, 8, 6);
const stripes = (id, a, b) => textureDef({ id, about: `Wallpaper stripes ${id}`, tags: ['surface', 'wall'], size: [32, 32], tile: true, palette: { a, b },
  layers: [{ pattern: 'stripes', colors: ['a', 'b'], width: 4, dir: 'x' }] });
const dots = (id, a, b, seed = 7) => textureDef({ id, about: `Wallpaper dots ${id}`, tags: ['surface', 'wall'], size: [32, 32], tile: true, palette: { a, b },
  layers: [full('a'), { pattern: 'scatter', colors: ['b'], count: 14, size: 2, seed }] });
const brick = (id, a, b, c) => textureDef({ id, about: `Wall bricks ${id}`, tags: ['surface', 'wall'], size: [32, 32], tile: true, palette: { a, b, c },
  layers: [{ pattern: 'bricks', colors: ['a', 'b', 'c'], w: 8, h: 4, seed: 2 }] });

export const FLOORS = [
  planks('floor-oak', 'orange', 'orange', 'red'), planks('floor-pine', 'sand', 'sand', 'orange'), planks('floor-ash', 'mist', 'mist', 'slate'),
  tiles('floor-chess', 'white', 'night'), tiles('floor-kitchen', 'white', 'sky'), tiles('floor-garish', 'orange', 'plum'),
  plain('floor-moss', 'green', 'teal'), plain('floor-sandy', 'sand', 'white'), plain('floor-carpet-red', 'red', 'plum'), plain('floor-carpet-blue', 'navy', 'blue'), plain('floor-cheese', 'sand', 'orange'), plain('floor-shag', 'plum', 'red'),
  planks('floor-gym', 'sand', 'sand', 'orange'), tiles('floor-marble', 'white', 'mist'), plain('floor-night', 'night', 'ink'),
];
export const WALLS = [
  stripes('wall-cream', 'white', 'sand'), stripes('wall-mint', 'lime', 'white'), stripes('wall-sea', 'sky', 'white'), stripes('wall-plum', 'plum', 'red'),
  dots('wall-rose', 'red', 'orange'), dots('wall-night', 'navy', 'sand'), dots('wall-spores', 'green', 'lime'), dots('wall-cheese', 'sand', 'orange', 3),
  brick('wall-brick', 'plum', 'red', 'orange'), brick('wall-stone', 'night', 'slate', 'mist'), plain('wall-plaster', 'white', 'mist'), plain('wall-mud', 'orange', 'red'),
  plain('wall-teal', 'teal', 'green'), plain('wall-bureau', 'mist', 'slate'), stripes('wall-regal', 'navy', 'plum'), plain('wall-knit', 'orange', 'sand'),
];
export const ALL_TEXTURES = [...SURFACES, ...FLOORS, ...WALLS];
let added = false;
export function installTextures() {
  if (added) return;
  added = true;
  for (const t of ALL_TEXTURES) TEXTURE_LIBRARY.add(t);
}
export const TEXTURES = new TextureCatalog(ALL_TEXTURES);
