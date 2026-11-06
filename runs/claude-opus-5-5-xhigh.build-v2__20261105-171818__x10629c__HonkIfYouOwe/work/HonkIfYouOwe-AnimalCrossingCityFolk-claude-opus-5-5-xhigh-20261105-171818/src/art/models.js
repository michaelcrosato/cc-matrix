// The game's own models, as data. `node check.mjs --sheets src/art/models.js` draws all of them.
import { model, ModelCatalog, MODEL_LIBRARY } from '../engine.js';
import { GLYPHS, textWidth } from '../ui/font.js';
import { CRITTER_DEFS, CROWD_DEFS, avatarDef } from './critter.js';
import { ALL_TEXTURES } from './textures.js';
import { ITEM_MODELS } from './itemModels.js';

const B = (w, h, d, x, y, z, c, o = {}) => ({ box: [w, h, d], at: [x, y, z], c, ...o });
const BALL = (w, h, d, x, y, z, c, o = {}) => ({ ball: [w, h, d], at: [x, y, z], c, ...o });
const CONE = (w, h, d, x, y, z, c, o = {}) => ({ cone: [w, h, d], at: [x, y, z], c, ...o });
const CYL = (w, h, d, x, y, z, c, o = {}) => ({ cyl: [w, h, d], at: [x, y, z], c, ...o });
const WEDGE = (w, h, d, x, y, z, c, o = {}) => ({ wedge: [w, h, d], at: [x, y, z], c, ...o });
const piv = (name, at, parts) => ({ group: parts, at, pivot: true, name });
const gable = (w, h, d, y, c) => [WEDGE(w, h, d / 2, 0, y + h / 2, d / 4, c), WEDGE(w, h, d / 2, 0, y + h / 2, -d / 4, c, { rot: [0, 180, 0] })];

/** Neon or painted letters from the bitmap font: each pixel a small box. */
export function letters(text, { at = [0, 0, 0], px = 0.08, c = 'neon', glow = true, depth = 0.04 } = {}) {
  const parts = [];
  const width = textWidth(text) * px;
  let cx = -width / 2;
  for (const ch of text) {
    const g = GLYPHS[ch];
    if (!g) { cx += 4 * px; continue; }
    g.rows.forEach((row, ry) => {
      let run = -1;
      for (let i = 0; i <= row.length; i++) {
        if (i < row.length && row[i] === '#') { if (run < 0) run = i; continue; }
        if (run >= 0) {
          const len = i - run;
          parts.push({ box: [len * px, px, depth], at: [cx + (run + len / 2) * px, (6 - ry) * px + px / 2, 0], c, glow, collide: false });
          run = -1;
        }
      }
    });
    cx += (g.w + 1) * px;
  }
  return { group: parts, at };
}

/** Window with a lit twin (pivot `lit`) the game shows at night. */
const win = (w, h, x, y, z, side = 'front') => {
  const depth = 0.08;
  const size = side === 'front' ? [w, h, depth] : [depth, h, w];
  const frame = side === 'front' ? [w + 0.14, h + 0.14, depth / 2] : [depth / 2, h + 0.14, w + 0.14];
  return [
    { box: frame, at: [x, y, z], c: 'trim' },
    { box: size, at: side === 'front' ? [x, y, z + 0.03] : [x + 0.03, y, z], c: 'glass' },
  ];
};
const litWin = (w, h, x, y, z, side = 'front') => ({ box: side === 'front' ? [w, h, 0.09] : [0.09, h, w], at: side === 'front' ? [x, y, z + 0.04] : [x + 0.04, y, z], c: 'lit', glow: true });

const COTTAGE_SLOTS = { wall: 'sand', roof: 'red', roof2: 'plum', trim: 'white', door: 'teal', glass: 'navy', lit: 'sand', stone: 'slate', knob: 'sand', smoke: 'mist' };
export const cottage = model({
  id: 'cottage', about: 'A small cottage: walls, a two-wedge roof, a chimney, door and lit windows', tags: ['building', 'town'], palette: COTTAGE_SLOTS,
  parts: [
    B(4.4, 2.2, 3.6, 0, 1.1, 0, 'wall'),
    B(4.5, 0.26, 3.7, 0, 0.13, 0, 'stone'),
    ...gable(4.9, 1.34, 4.2, 2.2, 'roof'),
    B(4.9, 0.1, 0.3, 0, 3.52, 0, 'roof2'),
    B(0.56, 1.3, 0.56, 1.3, 3.0, -0.7, 'stone'),
    B(0.68, 0.12, 0.68, 1.3, 3.68, -0.7, 'trim'),
    B(1.0, 1.56, 0.12, 0, 0.78, 1.8, 'trim'),
    piv('door', [-0.4, 0, 1.87], [B(0.8, 1.44, 0.08, 0.4, 0.72, 0, 'door'), BALL(0.1, 0.1, 0.1, 0.68, 0.72, 0.05, 'knob')]),
    ...win(0.72, 0.72, -1.4, 1.34, 1.82),
    ...win(0.72, 0.72, 1.4, 1.34, 1.82),
    ...win(0.8, 0.72, 2.22, 1.34, 0, 'side'),
    piv('lit', [0, 0, 0], [litWin(0.72, 0.72, -1.4, 1.34, 1.82), litWin(0.72, 0.72, 1.4, 1.34, 1.82), litWin(0.8, 0.72, 2.22, 1.34, 0, 'side')]),
    B(1.2, 0.1, 0.5, 0, 0.05, 2.1, 'stone'),
  ],
});
export const homeTier1 = model({
  id: 'home-1', about: 'Starter shack: tin roof, crooked door', tags: ['building', 'home'], palette: { ...COTTAGE_SLOTS, wall: 'orange', roof: 'slate', roof2: 'night' },
  parts: [
    B(3.6, 1.9, 3.0, 0, 0.95, 0, 'wall'), B(3.7, 0.2, 3.1, 0, 0.1, 0, 'stone'),
    piv('roofed', [0, 0, 0], [WEDGE(3.9, 0.7, 3.5, 0, 2.25, 0, 'roof', { rot: [0, 180, 0] }), B(3.9, 0.1, 3.5, 0, 1.92, 0, 'roof2')]),
    B(0.9, 1.5, 0.1, -0.4, 0.78, 1.5, 'trim', { rot: [0, 0, 2] }),
    piv('door', [-0.8, 0, 1.56], [B(0.76, 1.38, 0.07, 0.38, 0.7, 0, 'door', { rot: [0, 0, 2] })]),
    ...win(0.6, 0.6, 1.0, 1.2, 1.52),
    piv('lit', [0, 0, 0], [litWin(0.6, 0.6, 1.0, 1.2, 1.52)]),
    B(1, 0.1, 0.4, -0.4, 0.05, 1.8, 'stone'),
  ],
});
const homeCottageParts = [
  B(5.2, 2.3, 4.0, 0, 1.15, 0, 'wall'), B(5.3, 0.26, 4.1, 0, 0.13, 0, 'stone'),
  ...gable(5.7, 1.5, 4.6, 2.3, 'roof'), B(5.7, 0.1, 0.3, 0, 3.78, 0, 'roof2'),
  B(0.6, 1.5, 0.6, 1.7, 3.2, -0.8, 'stone'), B(0.74, 0.12, 0.74, 1.7, 3.98, -0.8, 'trim'),
  B(1.0, 1.6, 0.12, 0, 0.8, 2.0, 'trim'),
  piv('door', [-0.42, 0, 2.07], [B(0.84, 1.5, 0.08, 0.42, 0.75, 0, 'door'), BALL(0.1, 0.1, 0.1, 0.72, 0.75, 0.05, 'knob')]),
  ...win(0.8, 0.8, -1.7, 1.4, 2.02), ...win(0.8, 0.8, 1.7, 1.4, 2.02), ...win(0.9, 0.8, 2.62, 1.4, 0, 'side'),
  B(1.0, 0.16, 0.2, -1.7, 0.84, 2.1, 'roof2'), B(1.0, 0.16, 0.2, 1.7, 0.84, 2.1, 'roof2'),
  B(1.2, 0.1, 0.5, 0, 0.05, 2.3, 'stone'),
];
const homeCottageLit = [litWin(0.8, 0.8, -1.7, 1.4, 2.02), litWin(0.8, 0.8, 1.7, 1.4, 2.02), litWin(0.9, 0.8, 2.62, 1.4, 0, 'side')];
export const homeTier2 = model({ id: 'home-2', about: 'Proper cottage', tags: ['building', 'home'], palette: COTTAGE_SLOTS, parts: [...homeCottageParts, piv('lit', [0, 0, 0], homeCottageLit)] });
export const homeTier3 = model({ id: 'home-3', about: 'Cottage with an annex', tags: ['building', 'home'], palette: COTTAGE_SLOTS, parts: [
  ...homeCottageParts, piv('lit', [0, 0, 0], [...homeCottageLit, litWin(0.7, 0.7, -3.8, 1.2, 1.32)]),
  B(2.2, 1.9, 2.6, -3.5, 0.95, 0, 'wall'), B(2.3, 0.2, 2.7, -3.5, 0.1, 0, 'stone'), ...gable(2.5, 0.8, 3.0, 1.9, 'roof').map((p) => ({ ...p, at: [-3.5, p.at[1], p.at[2]] })),
  ...win(0.7, 0.7, -3.8, 1.2, 1.32),
] });
export const homeTier4 = model({ id: 'home-4', about: 'Two-storey house with a plaque', tags: ['building', 'home'], palette: COTTAGE_SLOTS, parts: [
  B(5.2, 4.4, 4.0, 0, 2.2, 0, 'wall'), B(5.3, 0.26, 4.1, 0, 0.13, 0, 'stone'), B(5.3, 0.14, 4.1, 0, 2.3, 0, 'roof2'),
  ...gable(5.7, 1.5, 4.6, 4.4, 'roof'), B(5.7, 0.1, 0.3, 0, 5.88, 0, 'roof2'),
  B(0.6, 1.5, 0.6, 1.7, 5.3, -0.8, 'stone'), B(0.74, 0.12, 0.74, 1.7, 6.08, -0.8, 'trim'),
  B(1.0, 1.6, 0.12, 0, 0.8, 2.0, 'trim'), piv('door', [-0.42, 0, 2.07], [B(0.84, 1.5, 0.08, 0.42, 0.75, 0, 'door'), BALL(0.1, 0.1, 0.1, 0.72, 0.75, 0.05, 'knob')]),
  ...win(0.8, 0.8, -1.7, 1.4, 2.02), ...win(0.8, 0.8, 1.7, 1.4, 2.02), ...win(0.8, 0.8, -1.2, 3.4, 2.02), ...win(0.8, 0.8, 1.2, 3.4, 2.02), ...win(0.9, 0.8, 2.62, 1.4, 0, 'side'), ...win(0.9, 0.8, 2.62, 3.4, 0, 'side'),
  B(0.8, 0.5, 0.08, 0, 2.0, 2.04, 'knob'),
  piv('lit', [0, 0, 0], [litWin(0.8, 0.8, -1.7, 1.4, 2.02), litWin(0.8, 0.8, 1.7, 1.4, 2.02), litWin(0.8, 0.8, -1.2, 3.4, 2.02), litWin(0.8, 0.8, 1.2, 3.4, 2.02), litWin(0.9, 0.8, 2.62, 1.4, 0, 'side'), litWin(0.9, 0.8, 2.62, 3.4, 0, 'side')]),
  B(2.2, 1.9, 2.6, -3.5, 0.95, 0, 'wall'), B(2.3, 0.2, 2.7, -3.5, 0.1, 0, 'stone'), B(1.2, 0.1, 0.5, 0, 0.05, 2.3, 'stone'),
] });

const STORE_SLOTS = { wall: 'white', roof: 'teal', roof2: 'navy', trim: 'plum', door: 'red', glass: 'sky', lit: 'sand', stone: 'slate', sign: 'sand', ink: 'ink', awn: 'red', awn2: 'white' };
const awning = (w, x, y, z) => ({ group: Array.from({ length: Math.round(w / 0.5) }, (_, i) => B(0.5, 0.12, 1.0, x - w / 2 + 0.25 + i * 0.5, y, z, i % 2 ? 'awn' : 'awn2', { rot: [22, 0, 0] })) });
export const storeTier1 = model({ id: 'store-1', about: "Mrs. Gander's: a modest shop with a ledger for a sign", tags: ['building', 'shop'], palette: STORE_SLOTS, parts: [
  B(6.8, 2.8, 4.6, 0, 1.4, 0, 'wall'), B(6.9, 0.26, 4.7, 0, 0.13, 0, 'stone'), ...gable(7.3, 1.5, 5.2, 2.8, 'roof'), B(7.3, 0.1, 0.3, 0, 4.28, 0, 'roof2'),
  B(1.4, 2.0, 0.12, 0, 1.0, 2.3, 'trim'), piv('door', [-0.6, 0, 2.36], [B(1.2, 1.9, 0.08, 0.6, 0.95, 0, 'door')]),
  ...win(1.5, 1.1, -2.2, 1.4, 2.32), ...win(1.5, 1.1, 2.2, 1.4, 2.32), piv('lit', [0, 0, 0], [litWin(1.5, 1.1, -2.2, 1.4, 2.32), litWin(1.5, 1.1, 2.2, 1.4, 2.32)]),
  B(3.6, 0.7, 0.1, 0, 3.2, 2.42, 'sign'), letters('GANDER', { at: [0, 2.95, 2.5], px: 0.09, c: 'ink', glow: false }), awning(6, 0, 2.4, 2.7),
] });
export const storeTier2 = model({ id: 'store-2', about: "Mrs. Gander's Grocery: wider, with barrels", tags: ['building', 'shop'], palette: { ...STORE_SLOTS, roof: 'green', awn: 'green' }, parts: [
  B(7.4, 3.2, 5, 0, 1.6, 0, 'wall'), B(7.5, 0.26, 5.1, 0, 0.13, 0, 'stone'), ...gable(7.9, 1.6, 5.6, 3.2, 'roof'), B(7.9, 0.1, 0.3, 0, 4.78, 0, 'roof2'),
  B(1.6, 2.2, 0.12, 0, 1.1, 2.5, 'trim'), piv('door', [-0.7, 0, 2.56], [B(1.4, 2.1, 0.08, 0.7, 1.05, 0, 'door')]),
  ...win(1.8, 1.3, -2.5, 1.5, 2.52), ...win(1.8, 1.3, 2.5, 1.5, 2.52), piv('lit', [0, 0, 0], [litWin(1.8, 1.3, -2.5, 1.5, 2.52), litWin(1.8, 1.3, 2.5, 1.5, 2.52)]),
  B(4.6, 0.8, 0.1, 0, 3.0, 2.62, 'sign'), letters('GANDER & CO', { at: [0, 2.74, 2.7], px: 0.08, c: 'ink', glow: false }), awning(6.5, 0, 2.5, 2.9), { use: 'barrel', at: [-3.2, 0, 3.0], palette: {} },
] });
export const storeTier3 = model({ id: 'store-3', about: 'The Gander Emporium: columns and gold letters', tags: ['building', 'shop'], palette: { ...STORE_SLOTS, roof: 'plum', awn: 'plum', sign: 'navy', ink: 'sand' }, parts: [
  B(7.8, 4.0, 5.2, 0, 2.0, 0, 'wall'), B(7.9, 0.3, 5.3, 0, 0.15, 0, 'stone'), B(8.1, 0.5, 5.6, 0, 4.25, 0, 'trim'), B(5.6, 1.1, 3.2, 0, 5.0, 0, 'roof'),
  B(2.0, 2.6, 0.12, 0, 1.3, 2.6, 'trim'), piv('door', [-0.9, 0, 2.66], [B(1.8, 2.4, 0.08, 0.9, 1.2, 0, 'door')]),
  ...win(1.8, 1.6, -2.8, 1.8, 2.62), ...win(1.8, 1.6, 2.8, 1.8, 2.62), piv('lit', [0, 0, 0], [litWin(1.8, 1.6, -2.8, 1.8, 2.62), litWin(1.8, 1.6, 2.8, 1.8, 2.62)]),
  B(5.6, 0.9, 0.12, 0, 3.5, 2.7, 'sign'), letters('EMPORIUM', { at: [0, 3.24, 2.78], px: 0.1, c: 'ink', glow: false }),
  ...[-3.6, -1.3, 1.3, 3.6].map((x) => CYL(0.4, 3.0, 0.4, x, 1.5, 2.9, 'wall')),
] });
export const museum = model({ id: 'b-museum', about: 'The museum: a little temple with columns and a pediment', tags: ['building', 'civic'], palette: { wall: 'mist', trim: 'white', roof: 'slate', door: 'plum', stone: 'slate', glass: 'navy', lit: 'sand', accent: 'sand', ink: 'ink' }, parts: [
  B(10, 3.8, 5.6, 0, 1.9, -0.4, 'wall'), B(10.6, 0.3, 6.6, 0, 0.15, 0, 'stone'), B(10.2, 0.2, 6.2, 0, 0.38, 0, 'stone'),
  B(10.6, 0.5, 6.4, 0, 4.1, 0, 'trim'), ...gable(10.8, 1.5, 6.6, 4.34, 'roof'),
  ...[-4.2, -2.5, -0.9, 0.9, 2.5, 4.2].map((x) => CYL(0.5, 3.4, 0.5, x, 2.1, 2.7, 'trim')),
  B(1.5, 2.4, 0.1, 0, 1.6, 2.42, 'door'), B(5.6, 0.6, 0.1, 0, 4.1, 3.24, 'accent'), letters('MUSEUM', { at: [0, 3.84, 3.32], px: 0.1, c: 'ink', glow: false }),
  piv('lit', [0, 0, 0], [litWin(1.3, 2.2, 0, 1.6, 2.44)]),
] });
export const hall = model({ id: 'b-hall', about: 'Town Hall and Post: a clock, a flag and a post box', tags: ['building', 'civic'], palette: { wall: 'sand', trim: 'white', roof: 'blue', roof2: 'navy', door: 'teal', stone: 'slate', glass: 'navy', lit: 'sand', flag: 'red', clock: 'white', ink: 'ink', post: 'red' }, parts: [
  B(8, 3.2, 4.8, 0, 1.6, 0, 'wall'), B(8.1, 0.26, 4.9, 0, 0.13, 0, 'stone'), ...gable(8.5, 1.6, 5.4, 3.2, 'roof'), B(8.5, 0.1, 0.3, 0, 4.78, 0, 'roof2'),
  B(2.0, 1.4, 2.0, 0, 5.2, 0.6, 'wall'), ...gable(2.3, 0.8, 2.3, 5.9, 'roof').map((p) => ({ ...p, at: [0, p.at[1], p.at[2] + 0.6] })), CYL(0.9, 0.9, 0.1, 0, 5.2, 1.65, 'clock', { rot: [90, 0, 0] }), B(0.06, 0.34, 0.05, 0, 5.34, 1.72, 'ink'), B(0.24, 0.06, 0.05, 0.1, 5.2, 1.72, 'ink'),
  B(1.5, 2.2, 0.12, 0, 1.1, 2.42, 'trim'), piv('door', [-0.65, 0, 2.48], [B(1.3, 2.1, 0.08, 0.65, 1.05, 0, 'door')]),
  ...win(1.1, 1.1, -2.6, 1.6, 2.42), ...win(1.1, 1.1, 2.6, 1.6, 2.42), piv('lit', [0, 0, 0], [litWin(1.1, 1.1, -2.6, 1.6, 2.42), litWin(1.1, 1.1, 2.6, 1.6, 2.42)]),
  B(0.08, 2.4, 0.08, -3.6, 4.6, 2.0, 'ink'), piv('flag', [-3.56, 5.3, 2.0], [B(0.9, 0.54, 0.05, 0.45, 0, 0, 'flag')]),
  B(0.5, 1.0, 0.4, 4.4, 0.5, 2.2, 'post'), BALL(0.5, 0.3, 0.4, 4.4, 1.0, 2.2, 'post'), B(0.34, 0.05, 0.05, 4.4, 0.72, 2.42, 'ink'),
] });
export const mothwickShop = model({ id: 'b-mothwick', about: "Mothwick's: a tailor's with a giant spool on the roof", tags: ['building', 'shop'], palette: { wall: 'plum', trim: 'sand', roof: 'night', door: 'red', stone: 'slate', glass: 'sky', lit: 'sand', spool: 'red', wood: 'sand', ink: 'ink' }, parts: [
  B(6.2, 2.8, 4.2, 0, 1.4, 0, 'wall'), B(6.3, 0.26, 4.3, 0, 0.13, 0, 'stone'), B(6.6, 0.3, 4.6, 0, 2.95, 0, 'trim'), B(5.4, 0.5, 3.4, 0, 3.3, 0, 'roof'),
  CYL(1.8, 0.2, 1.8, 0, 3.66, 0, 'wood'), CYL(1.3, 1.2, 1.3, 0, 4.36, 0, 'spool'), CYL(1.8, 0.2, 1.8, 0, 5.06, 0, 'wood'),
  B(1.3, 2.0, 0.12, 0, 1.0, 2.1, 'trim'), piv('door', [-0.55, 0, 2.16], [B(1.1, 1.9, 0.08, 0.55, 0.95, 0, 'door')]),
  ...win(1.4, 1.2, -2.0, 1.4, 2.12), ...win(1.4, 1.2, 2.0, 1.4, 2.12), piv('lit', [0, 0, 0], [litWin(1.4, 1.2, -2.0, 1.4, 2.12), litWin(1.4, 1.2, 2.0, 1.4, 2.12)]),
  letters("MOTHWICK'S", { at: [0, 2.72, 2.34], px: 0.06, c: 'trim', glow: false }),
] });
export const lighthouse = model({ id: 'b-lighthouse', about: 'A striped lighthouse', tags: ['building', 'scenery'], palette: { a: 'white', b: 'red', roof: 'night', lamp: 'sand', stone: 'slate' }, parts: [
  CYL(3.2, 0.5, 3.2, 0, 0.25, 0, 'stone'),
  CYL(2.4, 2.0, 2.4, 0, 1.5, 0, 'a', { top: 0.9 }), CYL(2.16, 2.0, 2.16, 0, 3.5, 0, 'b', { top: 0.88 }), CYL(1.9, 2.0, 1.9, 0, 5.5, 0, 'a', { top: 0.86 }),
  CYL(2.0, 0.2, 2.0, 0, 6.6, 0, 'roof'), piv('beam', [0, 7.2, 0], [CYL(0.9, 1.0, 0.9, 0, 0, 0, 'lamp', { glow: true })]), CONE(1.6, 0.9, 1.6, 0, 8.1, 0, 'roof'),
] });
export const busStop = model({ id: 'bus-shelter', about: 'A rural bus shelter and sign, leaning', tags: ['town', 'prop'], palette: { wood: 'orange', roof: 'teal', post: 'night', sign: 'sky', ink: 'white' }, parts: [
  B(3.2, 0.14, 1.5, 0, 2.3, 0, 'roof', { rot: [4, 0, 0] }), B(0.14, 2.3, 0.14, -1.5, 1.15, 0.6, 'post'), B(0.14, 2.3, 0.14, 1.5, 1.15, 0.6, 'post'), B(3.2, 2.1, 0.1, 0, 1.15, -0.65, 'wood'),
  B(2.4, 0.1, 0.5, 0, 0.5, -0.3, 'post'), B(0.14, 2.6, 0.14, 2.3, 1.3, 1.0, 'post'), CYL(0.8, 0.1, 0.8, 2.3, 2.7, 1.0, 'sign', { rot: [90, 0, 0] }), letters('BUS', { at: [2.3, 2.52, 1.07], px: 0.05, c: 'ink', glow: false }),
] });
export const bus = model({ id: 'bus', about: 'The bus: round, sky blue, nobody knows how it runs', tags: ['vehicle'], palette: { body: 'sky', roof: 'white', trim: 'navy', glass: 'cyan', tyre: 'ink', hub: 'sand', lit: 'sand' }, parts: [
  B(5.6, 1.7, 2.3, 0, 1.25, 0, 'body'), B(5.7, 0.2, 2.34, 0, 0.5, 0, 'trim'), BALL(5.8, 0.7, 2.3, 0, 2.08, 0, 'roof'),
  ...[-2, -0.8, 0.4, 1.6].map((x) => B(0.9, 0.7, 0.06, x, 1.6, 1.16, 'glass')), ...[-2, -0.8, 0.4, 1.6].map((x) => B(0.9, 0.7, 0.06, x, 1.6, -1.16, 'glass')),
  B(0.06, 0.9, 1.9, 2.82, 1.6, 0, 'glass'), BALL(0.2, 0.2, 0.1, 2.82, 0.9, 0.8, 'lit', { glow: true }), BALL(0.2, 0.2, 0.1, 2.82, 0.9, -0.8, 'lit', { glow: true }),
  ...[-1.7, 1.7].flatMap((x) => [1.1, -1.1].map((z) => CYL(0.86, 0.3, 0.86, x, 0.43, z, 'tyre', { rot: [90, 0, 0] }))),
  B(0.9, 1.5, 0.08, 2.1, 1.0, 1.17, 'trim'),
] });
// ---- Nature: trees with seasonal palettes and fruit. Slots leaf/leaf2 are set per season. -----------
const pearFruit = (r = 1) => piv('fruit', [0, 0, 0], [[-0.5, 2.5, 0.8], [0.7, 2.1, 0.7], [0.1, 2.7, 1.0]].map(([x, y, z]) => BALL(0.26 * r, 0.3 * r, 0.26 * r, x * r, y * r, z * r, 'fruit')));
export const pearTree = model({ id: 'tree-pear', about: 'A pear tree with round chunky canopy and fruit', tags: ['nature', 'tree'], palette: { trunk: 'plum', leaf: 'green', leaf2: 'lime', fruit: 'sand' }, parts: [
  CYL(0.42, 1.5, 0.42, 0, 0.75, 0, 'trunk', { top: 0.7 }), BALL(2.4, 1.9, 2.4, 0, 2.4, 0, 'leaf', { seg: 9 }), BALL(1.5, 1.2, 1.5, 0.3, 3.1, 0.3, 'leaf2', { seg: 8 }), pearFruit(1),
] });
export const pineTree = model({ id: 'tree-pine', about: 'A chunky pine', tags: ['nature', 'tree'], palette: { trunk: 'plum', leaf: 'teal', leaf2: 'green', snow: 'teal' }, parts: [
  CYL(0.36, 0.9, 0.36, 0, 0.45, 0, 'trunk'), CONE(2.3, 1.6, 2.3, 0, 1.5, 0, 'leaf', { seg: 8 }), CONE(1.8, 1.4, 1.8, 0, 2.4, 0, 'leaf2', { seg: 8 }), CONE(1.3, 1.3, 1.3, 0, 3.3, 0, 'leaf', { seg: 8 }),
] });
export const palmTree = model({ id: 'tree-palm', about: 'A palm with a hopeful lean', tags: ['nature', 'tree'], palette: { trunk: 'sand', band: 'orange', leaf: 'green', leaf2: 'lime', fruit: 'plum' }, parts: [
  ...[0, 1, 2, 3, 4].map((i) => CYL(0.34 - i * 0.02, 0.62, 0.34 - i * 0.02, i * 0.07, 0.31 + i * 0.6, 0, i % 2 ? 'band' : 'trunk')),
  ...[0, 60, 120, 180, 240, 300].map((a, i) => ({ group: [B(0.5, 0.08, 1.5, 0, 0, 0.72, i % 2 ? 'leaf' : 'leaf2', { rot: [22, 0, 0] })], at: [0.32, 3.2, 0], rot: [0, a, 0] })),
  piv('fruit', [0, 0, 0], [BALL(0.26, 0.26, 0.26, 0.5, 3.0, 0.1, 'fruit'), BALL(0.26, 0.26, 0.26, 0.2, 3.0, 0.2, 'fruit')]),
] });
export const sapling = model({ id: 'sapling', about: 'A young tree, stage param', tags: ['nature', 'tree'], palette: { trunk: 'plum', leaf: 'lime' }, params: { stage: [0, 0, 2] }, parts: (p) => [
  CYL(0.1 + p.stage * 0.04, 0.5 + p.stage * 0.4, 0.1 + p.stage * 0.04, 0, 0.25 + p.stage * 0.2, 0, 'trunk'), BALL(0.5 + p.stage * 0.4, 0.5 + p.stage * 0.4, 0.5 + p.stage * 0.4, 0, 0.6 + p.stage * 0.5, 0, 'leaf'),
] });
export const oldPear = model({ id: 'old-pear', about: 'The Old Pear: the huge tree at the heart of the plaza, hung with lights at the end', tags: ['nature', 'tree', 'landmark'], palette: { trunk: 'plum', trunk2: 'red', leaf: 'green', leaf2: 'lime', light: 'sand', fruit: 'sand' }, parts: [
  CYL(1.4, 2.4, 1.4, 0, 1.2, 0, 'trunk', { top: 0.7 }), CYL(0.4, 1.6, 0.4, -0.8, 2.2, 0.2, 'trunk2', { rot: [0, 0, 40] }), CYL(0.4, 1.6, 0.4, 0.9, 2.3, -0.1, 'trunk2', { rot: [0, 0, -40] }),
  BALL(5, 3.4, 5, 0, 4.2, 0, 'leaf', { seg: 10 }), BALL(3.3, 2.2, 3.3, 1.0, 5.2, 0.6, 'leaf2', { seg: 9 }), BALL(2.8, 2.0, 2.8, -1.2, 5.0, 0.8, 'leaf2', { seg: 9 }),
  piv('fruit', [0, 0, 0], [[-1.6, 3.1, 1.6], [1.3, 3.0, 1.8], [0.1, 3.2, 2.2], [2.0, 3.6, 0.8]].map(([x, y, z]) => BALL(0.3, 0.36, 0.3, x, y, z, 'fruit'))),
  piv('lights', [0, 0, 0], [...[0, 40, 80, 120, 160, 200, 240, 280, 320].flatMap((a, i) => [BALL(0.26, 0.26, 0.26, Math.sin(a * Math.PI / 180) * 2.5, 3 + (i % 3) * 0.7, Math.cos(a * Math.PI / 180) * 2.5, 'light', { glow: true }), BALL(0.24, 0.24, 0.24, Math.sin((a + 20) * Math.PI / 180) * 1.5, 5.6 + (i % 2) * 0.4, Math.cos((a + 20) * Math.PI / 180) * 1.5, 'light', { glow: true })])]),
] });
export const oldBell = model({ id: 'old-bell', about: 'The Old Bell in its little frame', tags: ['town', 'landmark'], palette: { wood: 'plum', roof: 'teal', bell: 'orange', dark: 'night', stone: 'slate' }, parts: [
  B(1.6, 0.2, 1.1, 0, 0.1, 0, 'stone'), B(0.16, 2.3, 0.16, -0.62, 1.2, 0, 'wood'), B(0.16, 2.3, 0.16, 0.62, 1.2, 0, 'wood'), B(1.5, 0.16, 0.16, 0, 2.3, 0, 'wood'), ...gable(1.8, 0.5, 1.2, 2.34, 'roof'),
  piv('bell', [0, 2.22, 0], [{ lathe: [[0.34, 0], [0.36, 0.04], [0.26, 0.26], [0.2, 0.56], [0.1, 0.72], [0, 0.74]], at: [0, -0.78, 0], c: 'bell', seg: 10 }, BALL(0.14, 0.14, 0.14, 0, -0.84, 0, 'dark')]),
] });
export const flower = model({ id: 'flower', about: 'A flower, species by param', tags: ['nature', 'flower'], palette: { stem: 'green', petal: 'red', heart: 'sand' }, params: { species: [0, 0, 3], wilt: [0, 0, 1], big: [0, 0, 1] }, parts: (p) => {
  const lean = p.wilt ? 40 : 0;
  const s = 1 + p.big * 0.3;
  const head = (() => { switch (Math.round(p.species)) {
    case 0: return [CONE(0.34 * s, 0.34 * s, 0.34 * s, 0, 0, 0, 'petal', { seg: 6 }), B(0.1, 0.1, 0.1, 0, 0.2 * s, 0, 'heart')]; // tulip-ish "cup"
    case 1: return [...[0, 72, 144, 216, 288].map((a) => BALL(0.16 * s, 0.1 * s, 0.16 * s, Math.sin(a * Math.PI / 180) * 0.14 * s, 0, Math.cos(a * Math.PI / 180) * 0.14 * s, 'petal')), BALL(0.14, 0.12, 0.14, 0, 0.04, 0, 'heart')]; // daisy-ish "wheel"
    case 2: return [BALL(0.34 * s, 0.26 * s, 0.34 * s, 0, 0, 0, 'petal'), BALL(0.2 * s, 0.18 * s, 0.2 * s, 0, 0.12 * s, 0, 'heart')]; // rose-ish "bud"
    default: return [B(0.14 * s, 0.34 * s, 0.14 * s, 0, 0.06, 0, 'petal'), B(0.26 * s, 0.1 * s, 0.26 * s, 0, -0.06, 0, 'petal'), B(0.1, 0.1, 0.1, 0, 0.26 * s, 0, 'heart')]; // bell-ish "spire"
  } })();
  return [B(0.06, 0.34, 0.06, 0, 0.17, 0, 'stem'), mirrorLeaf(), { group: head, at: [0, 0.42, 0], rot: [lean, 0, 0] }];
} });
function mirrorLeaf() { return { mirror: [B(0.16, 0.04, 0.1, 0.1, 0.1, 0, 'stem', { rot: [0, 0, 25] })], axis: 'x' }; }
export const weed = model({ id: 'weed', about: 'A cheerful weed', tags: ['nature'], palette: { a: 'teal', b: 'green' }, parts: [
  CONE(0.1, 0.4, 0.1, 0, 0.2, 0, 'a', { rot: [0, 0, 12] }), CONE(0.1, 0.32, 0.1, 0.1, 0.16, 0.04, 'b', { rot: [0, 0, -18] }), CONE(0.1, 0.36, 0.1, -0.1, 0.18, -0.03, 'b', { rot: [10, 0, 22] }), BALL(0.1, 0.1, 0.1, 0, 0.4, 0, 'b'),
] });
export const beanstalk = model({ id: 'beanstalk', about: 'A beanstalk grown from buried beans', tags: ['nature'], palette: { stalk: 'green', leaf: 'lime', bag: 'sand', tie: 'orange' }, params: { stage: [0, 0, 2] }, parts: (p) => {
  const h = 0.4 + p.stage * 0.9;
  const parts = [{ tube: [[0, 0, 0], [0.1, h * 0.5, 0.06], [-0.06, h, 0]], r: 0.08, at: [0, 0.05, 0], c: 'stalk' }, B(0.3, 0.08, 0.18, 0.14, h * 0.5, 0, 'leaf', { rot: [0, 0, 18] }), B(0.3, 0.08, 0.18, -0.16, h * 0.8, 0.04, 'leaf', { rot: [0, 0, -18] })];
  if (p.stage >= 2) parts.push(BALL(0.4, 0.42, 0.4, -0.06, h + 0.16, 0, 'bag'), B(0.24, 0.08, 0.24, -0.06, h + 0.38, 0, 'tie'));
  return parts;
} });
export const crackMark = model({ id: 'crack-mark', about: 'A star-shaped crack in the ground', tags: ['ground'], palette: { c: 'night' }, floats: true, parts: [0, 72, 144, 216, 288].map((a) => B(0.08, 0.02, 0.42, Math.sin(a * Math.PI / 180) * 0.2, 0.012, Math.cos(a * Math.PI / 180) * 0.2, 'c', { rot: [0, a, 0] })) });
export const hole = model({ id: 'hole', about: 'A hole you dug', tags: ['ground'], palette: { dark: 'ink', rim: 'plum' }, floats: true, parts: [CYL(0.86, 0.03, 0.86, 0, 0.015, 0, 'rim', { seg: 8 }), CYL(0.62, 0.04, 0.62, 0, 0.02, 0, 'dark', { seg: 8 })] });
export const shell = model({ id: 'shell-prop', about: 'A shell on the sand', tags: ['nature'], palette: { a: 'white', b: 'orange' }, parts: [BALL(0.34, 0.14, 0.3, 0, 0.07, 0, 'a'), B(0.04, 0.05, 0.28, 0.06, 0.12, 0, 'b'), B(0.04, 0.05, 0.28, -0.06, 0.12, 0, 'b')] });
export const driftwood = model({ id: 'driftwood', about: 'A bleached driftwood log', tags: ['nature'], palette: { a: 'mist', b: 'slate' }, parts: [CYL(0.3, 1.4, 0.3, 0, 0.15, 0, 'a', { rot: [0, 0, 90] }), CYL(0.16, 0.6, 0.16, 0.2, 0.3, 0.12, 'b', { rot: [30, 0, 40] })] });
export const dropBag = model({ id: 'drop-bag', about: 'A bag of beans', tags: ['item'], palette: { bag: 'sand', tie: 'orange', mark: 'plum' }, parts: [BALL(0.46, 0.46, 0.46, 0, 0.23, 0, 'bag'), B(0.2, 0.08, 0.2, 0, 0.46, 0, 'tie'), B(0.14, 0.14, 0.02, 0, 0.26, 0.23, 'mark')] });
export const dropLeaf = model({ id: 'drop-leaf', about: 'A dropped thing on the ground', tags: ['item'], palette: { a: 'lime', b: 'green' }, parts: [BALL(0.42, 0.14, 0.42, 0, 0.07, 0, 'a'), B(0.28, 0.02, 0.05, 0, 0.14, 0, 'b')] });
export const pearDrop = model({ id: 'pear-drop', about: 'A pear on the ground', tags: ['item'], palette: { a: 'sand', b: 'plum' }, parts: [BALL(0.3, 0.3, 0.3, 0, 0.15, 0, 'a'), BALL(0.2, 0.2, 0.2, 0, 0.32, 0, 'a'), B(0.04, 0.1, 0.04, 0, 0.46, 0, 'b')] });
export const mailboxModel = model({ id: 'mailbox', about: 'A mailbox with a flag', tags: ['town'], palette: { post: 'plum', box: 'sky', flag: 'red', trim: 'white' }, parts: [
  B(0.16, 1.0, 0.16, 0, 0.5, 0, 'post'), B(0.62, 0.4, 0.42, 0, 1.15, 0, 'box'), BALL(0.62, 0.3, 0.42, 0, 1.34, 0, 'box'), B(0.06, 0.3, 0.36, 0.32, 1.15, 0, 'trim'),
  piv('flag', [0.34, 1.02, -0.12], [B(0.04, 0.42, 0.04, 0, 0.2, 0, 'flag'), B(0.04, 0.16, 0.2, 0, 0.38, 0.1, 'flag')]),
] });
export const bridgeModel = model({ id: 'bridge-rails', about: 'Bridge rails along X on both sides', tags: ['town'], palette: { post: 'plum', rail: 'orange' }, params: { length: [4, 2, 8], width: [2, 1, 4] }, parts: (p) => {
  const parts = [];
  for (const z of [-p.width / 2, p.width / 2]) {
    parts.push(B(p.length, 0.1, 0.1, 0, 0.72, z, 'rail'));
    for (let i = 0; i <= Math.round(p.length / 2); i++) parts.push(B(0.14, 0.78, 0.14, -p.length / 2 + i * 2, 0.39, z, 'post'));
  }
  return parts;
} });
export const rockProp = model({ id: 'rock-prop', about: 'A chunky rock worth hitting', tags: ['nature'], palette: { a: 'slate', b: 'mist' }, parts: [{ lump: [1.0, 0.72, 0.9], at: [0, 0.36, 0], c: 'a', seed: 3 }, { lump: [0.44, 0.24, 0.4], at: [0.1, 0.72, 0.06], c: 'b', seed: 4 }] });
export const waterfall = model({ id: 'waterfall', about: 'A sheet of falling water', tags: ['nature'], palette: { a: 'cyan', b: 'white', c: 'sky' }, floats: true, params: { width: [4, 1, 8], height: [4, 1, 14] }, parts: (p) => Array.from({ length: Math.round(p.width / 0.5) }, (_, i) => B(0.5, p.height, 0.2, -p.width / 2 + 0.25 + i * 0.5, p.height / 2, 0, i % 3 === 0 ? 'b' : i % 3 === 1 ? 'a' : 'c', { glow: true })) });
export const stageFloor = model({ id: 'stage-floor', about: 'A low stage with curtains', tags: ['venue'], palette: { boards: 'orange', edge: 'plum', curtain: 'red', gold: 'sand' }, parts: [B(10, 0.3, 3, 0, 0.15, 0, 'boards'), B(10, 0.08, 0.1, 0, 0.3, 1.5, 'gold'), B(2, 3.4, 0.2, -4, 1.7, -1.3, 'curtain'), B(2, 3.4, 0.2, 4, 1.7, -1.3, 'curtain'), B(10, 0.6, 0.2, 0, 3.4, -1.3, 'curtain'), B(10, 0.08, 0.22, 0, 3.08, -1.3, 'gold')] });
export const rowboat = model({ id: 'rowboat-prop', about: 'A rowing boat, tied up and sulking', tags: ['scenery'], floats: true, palette: { hull: 'red', inner: 'sand', trim: 'white' }, parts: [B(1.1, 0.34, 2.6, 0, 0.3, 0, 'hull'), WEDGE(1.1, 0.34, 0.7, 0, 0.3, 1.6, 'hull', { rot: [0, 180, 0] }), B(0.86, 0.1, 2.2, 0, 0.44, 0, 'inner'), B(1.14, 0.06, 2.64, 0, 0.48, 0, 'trim'), B(0.9, 0.06, 0.26, 0, 0.5, 0.2, 'hull')] });
export const snowball = model({ id: 'snowball', about: 'A snowball you roll', tags: ['winter'], palette: { a: 'white', b: 'mist' }, parts: [BALL(1, 1, 1, 0, 0.5, 0, 'a', { seg: 10 }), B(0.2, 0.06, 0.06, 0.1, 0.8, 0.42, 'b')] });
export const snowman = model({ id: 'snowman', about: 'A snowman with opinions about proportions', tags: ['winter'], palette: { a: 'white', hat: 'night', nose: 'orange', eye: 'ink', scarf: 'red' }, parts: [
  BALL(1.1, 1.0, 1.1, 0, 0.5, 0, 'a', { seg: 10 }), BALL(0.8, 0.76, 0.8, 0, 1.3, 0, 'a', { seg: 10 }), CONE(0.1, 0.3, 0.1, 0, 1.36, 0.44, 'nose', { rot: [90, 0, 0] }), B(0.09, 0.09, 0.04, -0.15, 1.46, 0.38, 'eye'), B(0.09, 0.09, 0.04, 0.15, 1.46, 0.38, 'eye'),
  B(0.86, 0.14, 0.86, 0, 0.98, 0, 'scarf'), CYL(0.5, 0.06, 0.5, 0, 1.68, 0, 'hat'), CYL(0.34, 0.36, 0.34, 0, 1.86, 0, 'hat'),
] });
export const lantern = model({ id: 'lantern', about: 'A floating paper lantern', tags: ['festival'], palette: { paper: 'red', lit: 'sand', base: 'plum' }, floats: true, parts: [B(0.5, 0.06, 0.5, 0, 0.03, 0, 'base'), B(0.34, 0.34, 0.34, 0, 0.24, 0, 'paper', { glow: true }), B(0.14, 0.14, 0.14, 0, 0.2, 0.12, 'lit', { glow: true })] });
export const balloon = model({ id: 'balloon', about: 'A balloon with a present on a string', tags: ['festival'], palette: { a: 'red', gift: 'sand', ribbon: 'plum', str: 'white' }, floats: true, parts: [BALL(0.7, 0.86, 0.7, 0, 1.3, 0, 'a'), B(0.03, 0.6, 0.03, 0, 0.6, 0, 'str'), B(0.34, 0.3, 0.34, 0, 0.15, 0, 'gift'), B(0.36, 0.06, 0.1, 0, 0.16, 0, 'ribbon'), B(0.1, 0.06, 0.36, 0, 0.16, 0, 'ribbon')] });
export const wasps = model({ id: 'wasp-nest', about: 'A wasp nest, papery and regretful', tags: ['nature'], palette: { a: 'sand', b: 'orange', c: 'ink' }, floats: true, parts: [BALL(0.46, 0.56, 0.46, 0, 0.28, 0, 'a'), B(0.46, 0.05, 0.46, 0, 0.3, 0, 'b'), B(0.46, 0.05, 0.46, 0, 0.16, 0, 'b'), BALL(0.12, 0.12, 0.05, 0, 0.14, 0.22, 'c')] });
export const stall = model({ id: 'rind-stall', about: "Old Rind's cheese barrow", tags: ['town', 'market'], palette: { wood: 'plum', cheese: 'sand', rind: 'orange', cloth: 'night', wheel: 'ink' }, parts: [
  B(1.8, 0.14, 1.0, 0, 0.7, 0, 'wood'), B(1.8, 0.4, 0.08, 0, 0.9, 0.5, 'wood'), B(1.8, 0.4, 0.08, 0, 0.9, -0.5, 'wood'), B(0.08, 0.4, 1.0, 0.9, 0.9, 0, 'wood'), B(0.08, 0.4, 1.0, -0.9, 0.9, 0, 'wood'),
  CYL(0.86, 0.14, 0.86, -0.7, 0.43, 0.6, 'wheel', { rot: [90, 0, 0] }), CYL(0.86, 0.14, 0.86, 0.7, 0.43, 0.6, 'wheel', { rot: [90, 0, 0] }),
  CYL(0.7, 0.3, 0.7, -0.4, 1.05, 0, 'cheese'), CYL(0.6, 0.3, 0.6, 0.42, 1.05, 0, 'cheese'), CYL(0.6, 0.06, 0.6, 0.0, 1.26, 0, 'rind'),
] });
export const stoolPot = model({ id: 'soup-pot', about: "Dorrit's giant soup pot on a fire", tags: ['festival'], palette: { pot: 'night', rim: 'slate', soup: 'orange', fire: 'red', fire2: 'sand', stone: 'slate', wood: 'plum' }, parts: [
  CYL(2.0, 0.2, 2.0, 0, 0.1, 0, 'stone'), B(0.2, 0.2, 1.6, 0, 0.26, 0, 'wood', { rot: [0, 45, 0] }), B(0.2, 0.2, 1.6, 0, 0.26, 0, 'wood', { rot: [0, -45, 0] }), CONE(0.5, 0.7, 0.5, 0, 0.52, 0, 'fire', { glow: true }),
  CYL(1.8, 1.2, 1.8, 0, 1.2, 0, 'pot', { top: 1.05 }), CYL(1.96, 0.14, 1.96, 0, 1.82, 0, 'rim'), piv('soup', [0, 1.9, 0], [CYL(1.64, 0.06, 1.64, 0, 0, 0, 'soup')]),
] });
export const ring = model({ id: 'chalk-ring', about: 'A chalked ring for the Seed Toss', tags: ['festival'], palette: { a: 'white' }, floats: true, parts: [{ torus: [1.6, 0.06, 1.6], at: [0, 0.04, 0], c: 'a', seg: 16 }] });
export const rocket = model({ id: 'jar-of-beans', about: 'The Bean Jar', tags: ['civic'], palette: { glass: 'cyan', bean: 'red', lid: 'sand' }, parts: [CYL(0.6, 0.8, 0.6, 0, 0.4, 0, 'glass', { top: 0.86 }), BALL(0.46, 0.4, 0.46, 0, 0.26, 0, 'bean'), CYL(0.5, 0.1, 0.5, 0, 0.84, 0, 'lid')] });
export const postCounter = model({ id: 'counter', about: 'A shop or post counter', tags: ['furniture'], palette: { top: 'sand', side: 'plum', trim: 'orange' }, params: { w: [3, 1, 8] }, parts: (p) => [B(p.w, 0.9, 0.7, 0, 0.45, 0, 'side'), B(p.w + 0.1, 0.08, 0.8, 0, 0.94, 0, 'top'), B(p.w, 0.1, 0.05, 0, 0.5, 0.36, 'trim')] });
export const shelf = model({ id: 'shelf', about: 'A shop shelf', tags: ['furniture'], palette: { wood: 'plum', top: 'orange' }, params: { w: [1.6, 0.8, 4] }, parts: (p) => [B(p.w, 1.1, 0.5, 0, 0.55, 0, 'wood'), B(p.w + 0.06, 0.06, 0.56, 0, 1.12, 0, 'top')] });
export const tank = model({ id: 'tank', about: 'A big aquarium or bug case', tags: ['furniture', 'museum'], palette: { frame: 'night', water: 'sky', sand: 'sand', top: 'slate' }, params: { w: [1.6, 0.8, 4] }, parts: (p) => [B(p.w, 0.5, 0.8, 0, 0.25, 0, 'frame'), B(p.w - 0.1, 0.9, 0.7, 0, 0.95, 0, 'water'), B(p.w - 0.1, 0.1, 0.7, 0, 0.55, 0, 'sand'), B(p.w, 0.08, 0.8, 0, 1.44, 0, 'top')] });
export const plinth = model({ id: 'plinth', about: 'A museum plinth', tags: ['furniture', 'museum'], palette: { a: 'mist', b: 'white', c: 'slate' }, parts: [B(0.9, 0.5, 0.9, 0, 0.25, 0, 'a'), B(1.0, 0.08, 1.0, 0, 0.54, 0, 'b'), B(1.0, 0.08, 1.0, 0, 0.04, 0, 'c')] });
export const ribbon = model({ id: 'ribbon-posts', about: 'Two posts and a ribbon, waiting', tags: ['festival'], palette: { post: 'night', ribbon: 'red' }, parts: [B(0.12, 1.0, 0.12, 0, 0.5, -0.8, 'post'), B(0.12, 1.0, 0.12, 0, 0.5, 0.8, 'post'), piv('ribbon', [0, 0.84, 0], [B(0.04, 0.16, 1.6, 0, 0, 0, 'ribbon')])] });

// ---- City fronts ---------------------------------------------------------------------------------
const front = (id, name, { wall = 'night', trim = 'plum', door = 'red', glass = 'cyan', neon = 'sky', neon2 = 'red', w = 6, d = 5, h = 5, sign = name, signPx = 0.09, extras = [] } = {}) => model({
  id: `city-${id}`, about: `${name}: a City front with big glass and a neon sign`, tags: ['building', 'city'], palette: { wall, trim, door, glass, neon, neon2, lit: 'sand', roof: 'ink' },
  parts: [
    B(w, h, d, 0, h / 2, 0, 'wall'), B(w + 0.1, 0.3, d + 0.1, 0, h + 0.15, 0, 'trim'),
    B(1.3, 2.1, 0.1, 0, 1.05, d / 2 + 0.02, 'trim'), piv('door', [-0.55, 0, d / 2 + 0.08], [B(1.1, 2.0, 0.07, 0.55, 1.0, 0, 'door')]),
    B(w * 0.3, 1.6, 0.08, -w * 0.32, 1.3, d / 2 + 0.02, 'trim'), B(w * 0.3, 1.6, 0.08, w * 0.32, 1.3, d / 2 + 0.02, 'trim'),
    B(w * 0.3 - 0.14, 1.46, 0.09, -w * 0.32, 1.3, d / 2 + 0.04, 'glass', { glow: true }), B(w * 0.3 - 0.14, 1.46, 0.09, w * 0.32, 1.3, d / 2 + 0.04, 'glass', { glow: true }),
    B(textWidth(sign) * signPx + 0.5, 0.86, 0.08, 0, 3.2, d / 2 + 0.03, 'roof'),
    piv('neon', [0, 0, 0], [letters(sign, { at: [0, 2.96, d / 2 + 0.1], px: signPx, c: 'neon', glow: true }), B(textWidth(sign) * signPx + 0.6, 0.06, 0.06, 0, 3.66, d / 2 + 0.1, 'neon2', { glow: true }), B(textWidth(sign) * signPx + 0.6, 0.06, 0.06, 0, 2.76, d / 2 + 0.1, 'neon2', { glow: true })]),
    ...extras,
  ],
});
export const CITY_FRONTS = [
  front('salon', 'SNIP & GOSSIP', { wall: 'teal', trim: 'white', door: 'plum', glass: 'cyan', neon: 'cyan', neon2: 'lime' }),
  front('couture', 'MAISON PLUME', { wall: 'plum', trim: 'sand', door: 'ink', glass: 'sand', neon: 'orange', neon2: 'sand', extras: [B(2.2, 0.06, 0.06, 0, 0.8, 3.0, 'door'), B(0.1, 0.9, 0.1, -1.1, 0.45, 3.0, 'trim'), B(0.1, 0.9, 0.1, 1.1, 0.45, 3.0, 'trim')] }),
  front('cafe', 'THE DAILY GRIND', { wall: 'night', trim: 'orange', door: 'orange', glass: 'sand', neon: 'lime', neon2: 'orange', signPx: 0.08 }),
  front('bureau', 'BETTER BURROWS', { wall: 'slate', trim: 'mist', door: 'navy', glass: 'sky', neon: 'white', neon2: 'sky', signPx: 0.08 }),
  front('theatre', 'THE PALACE', { wall: 'plum', trim: 'red', door: 'red', glass: 'orange', neon: 'sand', neon2: 'red', d: 7, w: 5 }),
  front('auction', 'PEMBERTON', { wall: 'navy', trim: 'sand', door: 'teal', glass: 'sky', neon: 'cyan', neon2: 'sand', d: 7, w: 5 }),
  front('magda', 'GENUINE', { wall: 'ink', trim: 'night', door: 'plum', glass: 'plum', neon: 'lime', neon2: 'red', w: 5, h: 4, d: 4, signPx: 0.07 }),
  front('tent', 'FORTUNES', { wall: 'plum', trim: 'orange', door: 'red', glass: 'orange', neon: 'sand', neon2: 'orange', w: 4, h: 3.4, d: 4, signPx: 0.07 }),
];
export const skyline = model({ id: 'city-skyline', about: 'A block of city towers with windows', tags: ['city', 'scenery'], palette: { a: 'night', b: 'ink', c: 'slate', w: 'sand', w2: 'cyan' }, parts: (() => {
  const parts = [];
  let x = -24;
  const towers = [[5, 12], [4, 17], [6, 10], [4, 20], [5, 14], [6, 9], [4, 18], [5, 13], [5, 22], [6, 11]];
  towers.forEach(([w, h], i) => {
    parts.push(B(w, h, 4, x + w / 2, h / 2, 0, i % 3 === 0 ? 'a' : i % 3 === 1 ? 'b' : 'c'));
    for (let ry = 2; ry < h - 1; ry += 2) for (let rx = 0.8; rx < w - 0.4; rx += 1.2) if ((i * 7 + ry * 3 + Math.round(rx * 5)) % 4 !== 0) parts.push(B(0.5, 0.8, 0.05, x + rx, ry, 2.02, (ry + i) % 5 === 0 ? 'w2' : 'w', { glow: true, collide: false }));
    x += w;
  });
  return parts;
})() });
export const cityLamp = model({ id: 'city-lamp', about: 'A city street lamp', tags: ['city', 'lighting'], palette: { pole: 'ink', lit: 'sand' }, parts: [B(0.14, 3.0, 0.14, 0, 1.5, 0, 'pole'), B(0.7, 0.1, 0.1, 0.3, 3.0, 0, 'pole'), BALL(0.34, 0.26, 0.34, 0.6, 2.86, 0, 'lit', { glow: true })] });
export const telescope = model({ id: 'telescope', about: 'A brass telescope on a tripod', tags: ['furniture'], palette: { brass: 'sand', leg: 'plum' }, parts: [CYL(0.24, 1.2, 0.24, 0, 1.3, 0, 'brass', { rot: [50, 0, 0] }), B(0.06, 1.0, 0.06, 0.2, 0.5, 0.1, 'leg', { rot: [0, 0, -14] }), B(0.06, 1.0, 0.06, -0.2, 0.5, 0.1, 'leg', { rot: [0, 0, 14] }), B(0.06, 1.0, 0.06, 0, 0.5, -0.2, 'leg', { rot: [14, 0, 0] })] });

// ---- The catalog: everything buildModel resolves by id -------------------------------------------
export const OWN_MODELS = [
  cottage, homeTier1, homeTier2, homeTier3, homeTier4, storeTier1, storeTier2, storeTier3, museum, hall, mothwickShop, lighthouse, busStop, bus,
  pearTree, pineTree, palmTree, sapling, oldPear, oldBell, flower, weed, beanstalk, crackMark, hole, shell, driftwood, dropBag, dropLeaf, pearDrop, mailboxModel, bridgeModel, rockProp, waterfall,
  stageFloor, rowboat, snowball, snowman, lantern, balloon, wasps, stall, stoolPot, ring, rocket, postCounter, shelf, tank, plinth, ribbon, skyline, cityLamp, telescope,
  ...CITY_FRONTS, ...ITEM_MODELS, ...Object.values(CRITTER_DEFS), ...CROWD_DEFS, avatarDef({}),
];
export const MODELS = new ModelCatalog([...MODEL_LIBRARY.all(), ...OWN_MODELS]);
export { ALL_TEXTURES };
