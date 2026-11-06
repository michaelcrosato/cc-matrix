// HUD icons, sized to their Case footprint (a cell is 14 art pixels), as texture data.
import { textureDef, hudSprite, TextureCatalog, TEXTURE_LIBRARY } from '../../pixel-engine.js';

const icon = (id, w, h, palette, layers, about) => textureDef({ id: `icon-${id}`, about: about ?? `HUD icon: ${id}`, tags: ['icon'], size: [w, h], palette, layers });

export const ICONS = [
  icon('pistol', 42, 28, { s: 'slate', d: 'ink', g: 'orange', w: 'mist', r: 'red' }, [
    { path: 'M4 8 L36 8 L36 14 L22 14 L22 16 L18 16 L18 14 L16 14 L14 24 L6 24 L9 14 L4 14 Z', fill: 's', stroke: 'd' },
    { path: 'M7 14 L14 14 L12 23 L7 23 Z', fill: 'g' },
    { path: 'M16 7 L24 7 L24 13 L16 13 Z', fill: 'd' },
    { path: 'M33 6 L35 6 L35 8 L33 8 Z', fill: 'r' },
    { path: 'M6 9 L34 9 L34 10 L6 10 Z', fill: 'w' },
  ]),
  icon('scatter', 98, 28, { s: 'night', d: 'ink', g: 'orange', w: 'slate', b: 'sand' }, [
    { path: 'M36 9 L94 9 L94 13 L36 13 Z', fill: 's', stroke: 'd' },
    { path: 'M36 14 L84 14 L84 17 L36 17 Z', fill: 'd' },
    { path: 'M58 13 L74 13 L74 19 L58 19 Z', fill: 'g', stroke: 'd' },
    { path: 'M4 12 L38 8 L38 17 L18 18 L8 24 L4 22 Z', fill: 'g', stroke: 'd' },
    { path: 'M88 7 L92 7 L92 9 L88 9 Z', fill: 'b' },
    { path: 'M38 10 L92 10 L92 11 L38 11 Z', fill: 'w' },
  ]),
  icon('rifle', 112, 28, { s: 'night', d: 'ink', g: 'plum', c: 'sand', w: 'cyan', m: 'mist' }, [
    { path: 'M44 12 L108 12 L108 15 L44 15 Z', fill: 's', stroke: 'd' },
    { path: 'M4 12 L60 12 L60 18 L24 18 L12 24 L4 22 Z', fill: 'g', stroke: 'd' },
    { path: 'M34 5 L62 5 L62 10 L34 10 Z', fill: 'c', stroke: 'd' },
    { path: 'M60 6 L62 6 L62 9 L60 9 Z', fill: 'w' },
    { path: 'M38 16 L44 16 L44 20 L38 20 Z', fill: 'm' },
  ]),
  icon('harpoon', 84, 28, { s: 'sand', d: 'ink', g: 'orange', w: 'white', m: 'mist' }, [
    { path: 'M24 9 L62 9 L62 17 L24 17 Z', fill: 's', stroke: 'd' },
    { path: 'M4 11 L26 9 L26 17 L16 18 L8 24 L4 22 Z', fill: 'g', stroke: 'd' },
    { path: 'M62 12 L72 12 L72 14 L62 14 Z', fill: 'm' },
    { path: 'M72 8 L80 13 L72 18 Z', fill: 'w', stroke: 'd' },
    { path: 'M28 18 L40 18 L40 22 L28 22 Z', fill: 'w' },
  ]),
  icon('ammoPistol', 28, 14, { b: 'navy', d: 'ink', g: 'sand', t: 'white' }, [{ path: 'M2 2 L26 2 L26 12 L2 12 Z', fill: 'b', stroke: 'd' }, { path: 'M5 4 L9 4 L9 10 L5 10 Z', fill: 'g' }, { path: 'M11 4 L15 4 L15 10 L11 10 Z', fill: 'g' }, { path: 'M17 4 L21 4 L21 10 L17 10 Z', fill: 'g' }]),
  icon('ammoShells', 28, 14, { b: 'red', d: 'ink', g: 'sand', t: 'white' }, [{ path: 'M2 2 L26 2 L26 12 L2 12 Z', fill: 'b', stroke: 'd' }, { path: 'M4 4 L12 4 L12 10 L4 10 Z', fill: 'g', stroke: 'd' }, { path: 'M15 4 L23 4 L23 10 L15 10 Z', fill: 'g', stroke: 'd' }]),
  icon('ammoRifle', 28, 14, { b: 'green', d: 'ink', g: 'sand', t: 'white' }, [{ path: 'M2 2 L26 2 L26 12 L2 12 Z', fill: 'b', stroke: 'd' }, { path: 'M4 4 L22 4 L24 5 L22 6 L4 6 Z', fill: 'g' }, { path: 'M4 8 L22 8 L24 9 L22 10 L4 10 Z', fill: 'g' }]),
  icon('ammoBolts', 42, 14, { b: 'plum', d: 'ink', g: 'mist', t: 'white' }, [{ path: 'M2 2 L40 2 L40 12 L2 12 Z', fill: 'b', stroke: 'd' }, { path: 'M4 4 L33 4 L38 5 L33 6 L4 6 Z', fill: 'g' }, { path: 'M4 8 L33 8 L38 9 L33 10 L4 10 Z', fill: 't' }]),
  ...[['samphire', 'lime', 'green'], ['dulse', 'red', 'plum'], ['holly', 'sand', 'orange']].map(([id, a, b]) => icon(id, 14, 28, { a, b, d: 'ink', p: 'night' }, [
    { path: 'M6 26 L8 26 L8 10 L6 10 Z', fill: 'b' },
    { path: 'M7 6 L12 10 L8 14 L7 12 L6 14 L2 10 Z', fill: a === 'lime' ? 'a' : 'a', stroke: 'd' },
    { path: 'M7 14 L11 17 L7 21 L3 17 Z', fill: 'a', stroke: 'd' },
    { path: 'M4 24 L10 24 L10 27 L4 27 Z', fill: 'p' },
  ])),
  ...[['mixS2', 'lime', 'lime'], ['mixS3', 'lime', 'white'], ['mixSD', 'lime', 'red'], ['mixSDH', 'red', 'sand']].map(([id, a, b]) => icon(id, 14, 28, { a, b, d: 'ink', g: 'mist', c: 'orange' }, [
    { path: 'M5 3 L9 3 L9 8 L12 13 L12 26 L2 26 L2 13 L5 8 Z', fill: 'g', stroke: 'd' },
    { path: 'M3 14 L11 14 L11 25 L3 25 Z', fill: 'a' },
    { path: 'M3 20 L11 20 L11 25 L3 25 Z', fill: 'b' },
    { path: 'M5 2 L9 2 L9 4 L5 4 Z', fill: 'c' },
  ])),
  icon('tin', 14, 28, { w: 'white', r: 'red', d: 'ink' }, [{ path: 'M1 6 L13 6 L13 24 L1 24 Z', fill: 'w', stroke: 'd' }, { path: 'M5 10 L9 10 L9 13 L12 13 L12 17 L9 17 L9 20 L5 20 L5 17 L2 17 L2 13 L5 13 Z', fill: 'r' }]),
  icon('flare', 14, 28, { r: 'red', w: 'white', y: 'sand', d: 'ink' }, [{ path: 'M4 8 L10 8 L10 26 L4 26 Z', fill: 'r', stroke: 'd' }, { path: 'M4 5 L10 5 L10 8 L4 8 Z', fill: 'w', stroke: 'd' }, { path: 'M7 1 L9 5 L5 5 Z', fill: 'y' }]),
  icon('depth', 14, 28, { n: 'night', o: 'orange', d: 'ink', y: 'sand' }, [{ path: 'M1 10 L13 10 L13 26 L1 26 Z', fill: 'n', stroke: 'd' }, { path: 'M1 16 L13 16 L13 19 L1 19 Z', fill: 'o' }, { path: 'M6 4 L8 4 L8 10 L6 10 Z', fill: 'y' }]),
  icon('oil', 14, 28, { g: 'green', r: 'sand', o: 'orange', d: 'ink' }, [{ path: 'M2 13 L5 10 L5 6 L9 6 L9 10 L12 13 L12 26 L2 26 Z', fill: 'g', stroke: 'd' }, { path: 'M6 2 L8 2 L8 6 L6 6 Z', fill: 'r' }, { path: 'M5 0 L9 0 L9 2 L5 2 Z', fill: 'o' }]),
  // Valuables and keys: the big panel shows them at scale 2.
  icon('pearl', 16, 16, { w: 'white', m: 'mist', s: 'sky', d: 'ink' }, [{ path: 'M8 2 L12 3 L14 8 L12 13 L8 14 L4 13 L2 8 L4 3 Z', fill: 'w', stroke: 'd' }, { path: 'M5 5 L7 5 L7 7 L5 7 Z', fill: 's' }]),
  icon('blackPearl', 16, 16, { w: 'night', m: 'plum', s: 'cyan', d: 'ink' }, [{ path: 'M8 2 L12 3 L14 8 L12 13 L8 14 L4 13 L2 8 L4 3 Z', fill: 'w', stroke: 'd' }, { path: 'M5 5 L7 5 L7 7 L5 7 Z', fill: 's' }]),
  icon('seaGlass', 16, 16, { a: 'cyan', b: 'lime', c: 'sky', d: 'ink' }, [{ path: 'M2 5 L7 3 L8 8 L3 9 Z', fill: 'a', stroke: 'd' }, { path: 'M9 3 L14 5 L12 9 L9 8 Z', fill: 'b', stroke: 'd' }, { path: 'M5 10 L11 10 L10 14 L5 14 Z', fill: 'c', stroke: 'd' }]),
  icon('amber', 16, 16, { a: 'orange', b: 'sand', d: 'ink' }, [{ path: 'M8 1 L13 5 L13 11 L8 15 L3 11 L3 5 Z', fill: 'a', stroke: 'd' }, { path: 'M6 5 L8 4 L9 7 L7 8 Z', fill: 'b' }]),
  icon('scrimshaw', 16, 16, { w: 'white', m: 'sand', d: 'ink' }, [{ path: 'M2 14 L5 8 L9 4 L14 2 L13 7 L9 11 L4 15 Z', fill: 'w', stroke: 'd' }, { path: 'M7 8 L10 6 L10 8 L7 10 Z', fill: 'm' }]),
  icon('goldTooth', 16, 16, { y: 'sand', o: 'orange', d: 'ink' }, [{ path: 'M4 3 L12 3 L13 7 L11 14 L9 10 L7 10 L5 14 L3 7 Z', fill: 'y', stroke: 'd' }, { path: 'M5 4 L8 4 L8 6 L5 6 Z', fill: 'o' }]),
  icon('reliquary', 16, 16, { y: 'sand', o: 'orange', p: 'plum', d: 'ink' }, [{ path: 'M2 6 L14 6 L14 14 L2 14 Z', fill: 'y', stroke: 'd' }, { path: 'M2 6 L8 2 L14 6 Z', fill: 'o', stroke: 'd' }, { path: 'M4 9 L6 9 L6 11 L4 11 Z', fill: 'p' }, { path: 'M7 9 L9 9 L9 11 L7 11 Z', fill: 'p' }, { path: 'M10 9 L12 9 L12 11 L10 11 Z', fill: 'p' }]),
  icon('key', 16, 16, { y: 'sand', o: 'orange', d: 'ink' }, [{ path: 'M2 4 L8 4 L8 10 L2 10 Z', fill: 'y', stroke: 'd' }, { path: 'M8 6 L14 6 L14 8 L13 8 L13 11 L11 11 L11 8 L8 8 Z', fill: 'y', stroke: 'd' }, { path: 'M4 6 L6 6 L6 8 L4 8 Z', fill: 'o' }]),
  icon('chart', 16, 16, { p: 'sand', r: 'red', d: 'ink', b: 'sky' }, [{ path: 'M2 2 L14 2 L14 14 L2 14 Z', fill: 'p', stroke: 'd' }, { path: 'M4 10 L7 5 L10 8 L12 4 L12 6 L10 10 L7 7 L4 12 Z', fill: 'b' }, { path: 'M9 9 L12 9 L12 12 L9 12 Z', fill: 'r' }]),
  icon('doubloon', 12, 12, { y: 'sand', o: 'orange', d: 'ink' }, [{ path: 'M6 1 L10 2 L11 6 L10 10 L6 11 L2 10 L1 6 L2 2 Z', fill: 'y', stroke: 'd' }, { path: 'M5 3 L7 3 L7 9 L5 9 Z', fill: 'o' }]),
];

export const ICON_TEXTURES = new TextureCatalog([...ICONS]);
const cache = new Map();
export function iconOf(id) {
  if (cache.has(id)) return cache.get(id);
  const def = ICONS.find((t) => t.id === `icon-${id}`);
  const s = def ? hudSprite(def) : null;
  cache.set(id, s);
  return s;
}

export const SIGN_TEXTURE = textureDef({ id: 'thole-sign', about: 'THOLE & SONS, block letters', tags: ['sign'], size: [64, 8], palette: { bg: 'navy', fg: 'white' },
  layers: [
    { path: 'M0 0 L64 0 L64 8 L0 8 Z', fill: 'bg' },
    { pixels: [
      '.ooo.o.o..o..o...ooo.......o...oo...oo..o...o.o..oo.',
      '..o..o.o.o.o.o...o........o.o.o....o..o.oo..o.o.o...',
      '..o..ooo.o.o.o...oo........o...o...o..o.o.o.o..o....',
      '..o..o.o.o.o.o...o........o.o...o..o..o.o..oo...o...',
      '..o..o.o..o..ooo.ooo.......oo.oo....oo..o...o.oo....',
    ], legend: { o: 'fg' }, at: [6, 1] },
  ],
});
