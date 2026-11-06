// The game's own props: quay, cannery, abbey, launch. Library models are used wherever they fit.
import { model } from '../../pixel-engine.js';

// ---- Quay ----
export const tannoy = model({ id: 'tannoy', about: 'A loudspeaker on a tall pole, with a cable, the Commodore lives in it', tags: ['prop'], collider: 'none',
  palette: { pole: 'night', horn: 'slate', mouth: 'ink', cable: 'ink', bracket: 'mist' },
  parts: [
    { cyl: [0.12, 3.8, 0.12], at: [0, 1.9, 0], c: 'pole', seg: 6 },
    { box: [0.2, 0.3, 0.2], at: [0, 0.15, 0], c: 'bracket' },
    { group: [
      { cyl: [0.28, 0.5, 0.28], at: [0, 0, 0], rot: [100, 0, 0], top: 0.45, c: 'horn', seg: 8 },
      { cyl: [0.5, 0.05, 0.5], at: [0, -0.05, 0.28], rot: [100, 0, 0], c: 'mouth', seg: 8 },
      { box: [0.18, 0.2, 0.18], at: [0, 0.03, -0.28], c: 'bracket' },
    ], name: 'Horn', pivot: true, at: [0, 3.6, 0.2] },
  ] });

export const foghornTower = model({ id: 'foghorn-tower', about: 'The Foghorn: a tall rock tower with two great horns, 20 m', tags: ['backdrop'], collider: 'none',
  palette: { rock: 'night', stone: 'slate', band: 'white', band2: 'red', horn: 'ink', lamp: 'orange', iron: 'mist' },
  parts: [
    { lump: [11, 4, 11], at: [0, 2, 0], c: 'rock', seed: 5 },
    { cyl: [5, 13, 5], at: [0, 9, 0], top: 0.68, c: 'stone', seg: 8 },
    { cyl: [4.3, 2, 4.3], at: [0, 9.5, 0], top: 0.92, c: 'band', seg: 8 },
    { cyl: [3.9, 2, 3.9], at: [0, 13.2, 0], top: 0.9, c: 'band2', seg: 8 },
    { cyl: [4.2, 0.4, 4.2], at: [0, 16, 0], c: 'iron', seg: 8 },
    { cyl: [2.4, 2.4, 2.4], at: [0, 17.4, 0], c: 'lamp', glow: true, seg: 8 },
    { cone: [3.2, 1.6, 3.2], at: [0, 19.4, 0], c: 'stone', seg: 8 },
    { cyl: [1.2, 5, 1.2], at: [-2.8, 15, 1.6], rot: [90, 20, 0], top: 2.2, c: 'horn', seg: 8 },
    { cyl: [1.2, 5, 1.2], at: [2.8, 15, 1.6], rot: [90, -20, 0], top: 2.2, c: 'horn', seg: 8 },
  ] });

export const mailBoat = model({ id: 'mail-boat', about: 'A burned out little mail boat with a wheelhouse', tags: ['prop', 'boat'],
  palette: { hull: 'navy', trim: 'white', deck: 'orange', house: 'mist', roof: 'red', glass: 'ink', mast: 'plum', keel: 'ink' },
  parts: [
    { box: [2.1, 1.1, 6.4], at: [0, 0.55, 0], c: 'hull' },
    { box: [1.5, 1.0, 1.4], at: [0, 0.6, 3.8], c: 'hull' },
    { box: [0.9, 0.9, 0.9], at: [0, 0.65, 4.7], c: 'keel' },
    { box: [2.2, 0.12, 6.5], at: [0, 1.12, 0], c: 'trim' },
    { box: [1.9, 0.06, 6.2], at: [0, 1.19, 0], c: 'deck' },
    { box: [1.4, 1.2, 1.8], at: [0, 1.8, 0.7], c: 'house' },
    { box: [1.5, 0.12, 2.0], at: [0, 2.46, 0.7], c: 'roof' },
    { box: [1.1, 0.4, 0.05], at: [0, 2.0, 1.62], c: 'glass' },
    { cyl: [0.14, 3.6, 0.14], at: [0, 3.0, -1.2], c: 'mast', seg: 6 },
    { box: [1.2, 0.08, 0.08], at: [0, 3.8, -1.2], c: 'mast' },
  ] });

export const rowboat = model({ id: 'rowboat', about: 'A plain clinker rowboat, one bench', tags: ['prop', 'boat'],
  palette: { hull: 'orange', trim: 'plum', inside: 'night', bench: 'sand' },
  parts: [
    { box: [1.2, 0.5, 2.8], at: [0, 0.3, 0], c: 'hull' },
    { box: [0.8, 0.46, 0.7], at: [0, 0.32, 1.6], c: 'hull' },
    { box: [1.0, 0.04, 2.6], at: [0, 0.56, 0], c: 'inside' },
    { box: [1.26, 0.08, 2.86], at: [0, 0.58, 0], c: 'trim' },
    { box: [1.1, 0.06, 0.26], at: [0, 0.62, -0.3], c: 'bench' },
  ] });

export const lobsterPot = model({ id: 'lobster-pot', about: 'A barrel-topped lobster pot made of slats, big enough for a small rude woman', tags: ['prop'],
  palette: { slat: 'sand', frame: 'orange', rope: 'mist', dark: 'night' },
  parts: [
    { box: [0.9, 0.08, 0.72], at: [0, 0.04, 0], c: 'frame' },
    { box: [0.8, 0.5, 0.62], at: [0, 0.32, 0], c: 'dark' },
    ...[-0.36, -0.18, 0, 0.18, 0.36].map((x) => ({ cyl: [0.05, 0.7, 0.05], at: [x, 0.42, 0], rot: [90, 0, 0], c: 'slat', seg: 5 })),
    { box: [0.84, 0.06, 0.08], at: [0, 0.62, 0], c: 'frame' },
    { box: [0.06, 0.1, 0.5], at: [0.4, 0.5, 0], c: 'rope' },
  ] });

export const dryingRack = model({ id: 'drying-rack', about: 'A wooden rack hung with split fish', tags: ['prop', 'quay'],
  palette: { wood: 'orange', fish: 'mist', fish2: 'sand', rope: 'night' },
  parts: [
    { box: [0.14, 2.2, 0.14], at: [-1.3, 1.1, 0], c: 'wood' },
    { box: [0.14, 2.2, 0.14], at: [1.3, 1.1, 0], c: 'wood' },
    { box: [2.8, 0.1, 0.1], at: [0, 2.1, 0], c: 'wood' },
    { box: [2.8, 0.08, 0.08], at: [0, 1.5, 0], c: 'wood' },
    ...[-1, -0.6, -0.2, 0.2, 0.6, 1].flatMap((x, i) => [
      { box: [0.2, 0.46, 0.05], at: [x, 1.72, 0.06], c: i % 2 ? 'fish' : 'fish2' },
      { box: [0.18, 0.4, 0.05], at: [x + 0.14, 1.16, -0.05], c: i % 2 ? 'fish2' : 'fish' },
    ]),
  ] });

export const drapedNet = model({ id: 'draped-net', about: 'A fishing net draped over a low rail, with cork floats', tags: ['prop', 'quay'], collider: 'none',
  palette: { rail: 'orange', net: 'night', net2: 'slate', cork: 'sand' },
  parts: [
    { box: [0.1, 1.1, 0.1], at: [-1.1, 0.55, 0], c: 'rail' },
    { box: [0.1, 1.1, 0.1], at: [1.1, 0.55, 0], c: 'rail' },
    { box: [2.3, 0.08, 0.08], at: [0, 1.1, 0], c: 'rail' },
    { box: [2.1, 0.9, 0.04], at: [0, 0.62, 0.08], c: 'net' },
    { box: [1.6, 0.7, 0.04], at: [0.1, 0.6, -0.08], c: 'net2' },
    ...[-0.9, -0.3, 0.3, 0.9].map((x) => ({ box: [0.12, 0.12, 0.08], at: [x, 1.0, 0.12], c: 'cork' })),
  ] });

export const bollard = model({ id: 'bollard', about: 'An iron mooring bollard', tags: ['prop', 'quay'],
  palette: { iron: 'night', cap: 'slate', rope: 'sand' },
  parts: [{ cyl: [0.42, 0.6, 0.42], at: [0, 0.3, 0], top: 0.8, c: 'iron', seg: 8 }, { cyl: [0.52, 0.1, 0.52], at: [0, 0.65, 0], c: 'cap', seg: 8 }, { torus: [0.5, 0.08, 0.5], at: [0, 0.3, 0], c: 'rope' }] });

export const buoy = model({ id: 'buoy', about: 'A red and white mooring buoy, stood on the quay', tags: ['prop', 'quay'],
  palette: { top: 'red', mid: 'white', iron: 'night' },
  parts: [{ ball: [0.8, 0.9, 0.8], at: [0, 0.45, 0], c: 'top' }, { cyl: [0.86, 0.2, 0.86], at: [0, 0.45, 0], c: 'mid', seg: 8 }, { box: [0.08, 0.5, 0.08], at: [0, 1.1, 0], c: 'iron' }] });

export const anchorProp = model({ id: 'anchor-prop', about: 'A big rusted anchor leaning on nothing', tags: ['prop', 'quay'],
  palette: { iron: 'night', rust: 'orange', iron2: 'slate' },
  parts: [
    { box: [0.14, 2.0, 0.14], at: [0, 1.0, 0], rot: [12, 0, 0], c: 'iron' },
    { box: [1.0, 0.1, 0.1], at: [0, 1.8, -0.2], c: 'iron2' },
    { box: [1.4, 0.18, 0.2], at: [0, 0.14, 0.2], c: 'iron' },
    { box: [0.2, 0.36, 0.14], at: [-0.66, 0.3, 0.2], c: 'rust' },
    { box: [0.2, 0.36, 0.14], at: [0.66, 0.3, 0.2], c: 'rust' },
  ] });

export const chainLinks = model({ id: 'chain-links', about: 'A heap of heavy chain', tags: ['prop', 'quay'], collider: 'none',
  palette: { iron: 'slate', iron2: 'night' },
  parts: [0, 1, 2, 3, 4, 5, 6].map((i) => ({ torus: [0.3, 0.07, 0.2], at: [Math.cos(i * 1.3) * 0.32, 0.05 + (i % 3) * 0.06, Math.sin(i * 1.3) * 0.32], rot: [0, i * 40, 0], c: i % 2 ? 'iron' : 'iron2' })) });

export const fishCrate = model({ id: 'fish-crate', about: 'A shallow crate of silver fish', tags: ['prop', 'quay'],
  palette: { wood: 'orange', fish: 'mist', fish2: 'white', ice: 'cyan' },
  parts: [
    { box: [0.9, 0.3, 0.6], at: [0, 0.15, 0], c: 'wood' },
    { box: [0.8, 0.04, 0.5], at: [0, 0.31, 0], c: 'ice' },
    ...[-0.28, -0.1, 0.08, 0.26].map((x, i) => ({ box: [0.13, 0.05, 0.42], at: [x, 0.34, 0], rot: [0, i * 8 - 12, 0], c: i % 2 ? 'fish' : 'fish2' })),
  ] });

export const brineBarrel = model({ id: 'brine-barrel', about: 'Brine Barrel: red band, rotten seawater under pressure, shoot it', tags: ['prop', 'explosive'],
  palette: { wood: 'plum', band: 'red', hoop: 'slate', lid: 'night', mark: 'white' },
  parts: [
    { cyl: [0.72, 0.84, 0.72], at: [0, 0.42, 0], c: 'wood', seg: 10 },
    { cyl: [0.76, 0.2, 0.76], at: [0, 0.42, 0], c: 'band', seg: 10 },
    { cyl: [0.76, 0.05, 0.76], at: [0, 0.14, 0], c: 'hoop', seg: 10 },
    { cyl: [0.76, 0.05, 0.76], at: [0, 0.7, 0], c: 'hoop', seg: 10 },
    { cyl: [0.62, 0.03, 0.62], at: [0, 0.85, 0], c: 'lid', seg: 10 },
    { box: [0.18, 0.03, 0.05], at: [0, 0.87, 0], c: 'mark' },
  ] });

export const hayCart = model({ id: 'hay-cart', about: 'A hay cart: a re-coloured cart with a heap of hay', tags: ['prop'], palette: { hay: 'sand', hay2: 'orange', rope: 'red', bed: 'plum', side: 'plum', rail: 'orange', frame: 'night', tyre: 'ink', spoke: 'orange', hub: 'slate', axle: 'ink' },
  parts: [{ use: 'cart', rot: [0, 90, 0], at: [0, 0, 0] }, { use: 'haystack', at: [0, 0.62, 0], scale: 0.8, params: { h: 1 } }] });

export const effigy = model({ id: 'effigy', about: 'A straw effigy in an insurance suit and a paper hat, tied to a pole above a bonfire', tags: ['prop'], collider: 'none',
  palette: { pole: 'ink', suit: 'slate', straw: 'sand', tie: 'red', head: 'sand', hat: 'white', shades: 'ink' },
  parts: [
    { cyl: [0.14, 4, 0.14], at: [0, 2, 0], c: 'pole', seg: 6 },
    { box: [1.6, 0.1, 0.1], at: [0, 3.1, 0], c: 'pole' },
    { box: [0.62, 0.9, 0.3], at: [0, 2.8, 0.1], c: 'suit' },
    { box: [0.08, 0.5, 0.03], at: [0, 2.9, 0.26], c: 'tie' },
    { box: [0.6, 0.18, 0.2], at: [-0.5, 3.1, 0.1], c: 'suit' },
    { box: [0.6, 0.18, 0.2], at: [0.5, 3.1, 0.1], c: 'suit' },
    { box: [0.2, 0.2, 0.15], at: [-0.86, 3.1, 0.1], c: 'straw' },
    { box: [0.2, 0.2, 0.15], at: [0.86, 3.1, 0.1], c: 'straw' },
    { box: [0.46, 0.46, 0.4], at: [0, 3.5, 0.1], c: 'head' },
    { box: [0.4, 0.08, 0.03], at: [0, 3.56, 0.31], c: 'shades' },
    { cone: [0.5, 0.42, 0.5], at: [0, 3.92, 0.1], c: 'hat', seg: 6 },
    { box: [0.24, 0.5, 0.2], at: [-0.14, 2.14, 0.1], c: 'suit' },
    { box: [0.24, 0.5, 0.2], at: [0.14, 2.14, 0.1], c: 'suit' },
  ] });

export const telegraphDesk = model({ id: 'telegraph-desk', about: 'A small desk with a brass telegraph key and a green lamp: the save point', tags: ['prop', 'save'],
  palette: { wood: 'orange', wood2: 'plum', brass: 'sand', key: 'white', lamp: 'lime', paper: 'white', base: 'night' },
  light: { at: [0.34, 1.26, 0], c: 'lamp', intensity: 5, radius: 5 },
  parts: [
    { box: [1.1, 0.08, 0.6], at: [0, 0.8, 0], c: 'wood' },
    { box: [0.1, 0.76, 0.5], at: [-0.48, 0.38, 0], c: 'wood2' },
    { box: [0.1, 0.76, 0.5], at: [0.48, 0.38, 0], c: 'wood2' },
    { box: [0.3, 0.05, 0.2], at: [-0.1, 0.86, 0.04], c: 'base' },
    { box: [0.05, 0.09, 0.2], at: [-0.1, 0.93, 0.04], c: 'brass' },
    { box: [0.09, 0.04, 0.09], at: [-0.1, 0.99, 0.13], c: 'key' },
    { box: [0.3, 0.02, 0.22], at: [0.14, 0.85, -0.1], c: 'paper' },
    { box: [0.05, 0.3, 0.05], at: [0.34, 1.0, 0], c: 'brass' },
    { box: [0.18, 0.12, 0.18], at: [0.34, 1.18, 0], c: 'lamp', glow: true },
  ] });

export const fathomLantern = model({ id: 'fathom-post', about: 'A post with Mr. Fathom\'s stock tied to it, crates and a green lantern', tags: ['prop'],
  palette: { wood: 'orange', band: 'plum', lantern: 'lime', iron: 'ink', rope: 'sand' },
  light: { at: [0, 2.0, 0], c: 'lantern', intensity: 7, radius: 7 },
  parts: [
    { box: [0.14, 2.2, 0.14], at: [0, 1.1, 0], c: 'wood' },
    { box: [0.5, 0.08, 0.08], at: [0.2, 2.15, 0], c: 'wood' },
    { box: [0.2, 0.26, 0.2], at: [0.4, 1.9, 0], c: 'lantern', glow: true },
    { box: [0.26, 0.03, 0.26], at: [0.4, 2.05, 0], c: 'iron' },
    { use: 'crate', at: [-0.55, 0, 0.25] },
    { use: 'sack', at: [-0.5, 0, -0.5] },
  ] });

export const treasureChest = model({ id: 'claim-chest', about: 'A small tarred sea chest with a brass hasp', tags: ['prop', 'loot'],
  palette: { wood: 'plum', band: 'night', lid: 'orange', brass: 'sand' },
  parts: [
    { box: [0.8, 0.42, 0.5], at: [0, 0.21, 0], c: 'wood' },
    { group: [{ box: [0.82, 0.14, 0.52], at: [0, 0.07, 0.26], c: 'lid' }, { box: [0.84, 0.03, 0.08], at: [0, 0.14, 0.26], c: 'band' }], name: 'Lid', pivot: true, at: [0, 0.42, -0.26] },
    { box: [0.12, 0.14, 0.03], at: [0, 0.38, 0.26], c: 'brass' },
  ] });

export const house = model({ id: 'house-block', about: 'A cottage block, shutters closed, with a roof and chimney', tags: ['building'], collider: 'none',
  params: { w: [6, 3, 14], d: [4, 3, 14] },
  palette: { wall: 'mist', trim: 'slate', roof: 'night', roof2: 'plum', shutter: 'teal', chimney: 'slate', pot: 'orange', door: 'plum' },
  parts: (p) => [
    { box: [p.w, 3, p.d], at: [0, 1.5, 0], c: 'wall' },
    { box: [p.w + 0.1, 0.25, p.d + 0.1], at: [0, 0.12, 0], c: 'trim' },
    { wedge: [p.w + 0.6, 1.5, (p.d + 0.6) / 2], at: [0, 3.75, (p.d + 0.6) / 4], c: 'roof' },
    { wedge: [p.w + 0.6, 1.5, (p.d + 0.6) / 2], at: [0, 3.75, -(p.d + 0.6) / 4], rot: [0, 180, 0], c: 'roof2' },
    { box: [0.8, 2.6, 0.8], at: [p.w * 0.3, 4.2, 0], c: 'chimney' },
    { box: [0.3, 0.3, 0.3], at: [p.w * 0.3, 5.6, 0], c: 'pot' },
    ...[-0.25, 0.25].flatMap((f) => [
      { box: [0.8, 1, 0.05], at: [p.w * f, 1.7, p.d / 2 + 0.03], c: 'shutter' },
      { box: [0.8, 1, 0.05], at: [p.w * f, 1.7, -p.d / 2 - 0.03], c: 'shutter' },
    ]),
  ] });

// ---- Cannery ----
export const guttingTable = model({ id: 'gutting-table', about: 'A long steel gutting table with fish on it', tags: ['prop', 'cannery'],
  palette: { steel: 'mist', leg: 'night', fish: 'white', stain: 'plum', knife: 'slate' },
  parts: [
    { box: [2.2, 0.1, 0.9], at: [0, 0.9, 0], c: 'steel' },
    { box: [0.1, 0.88, 0.1], at: [-1, 0.44, -0.35], c: 'leg' },
    { box: [0.1, 0.88, 0.1], at: [1, 0.44, -0.35], c: 'leg' },
    { box: [0.1, 0.88, 0.1], at: [-1, 0.44, 0.35], c: 'leg' },
    { box: [0.1, 0.88, 0.1], at: [1, 0.44, 0.35], c: 'leg' },
    { box: [0.7, 0.02, 0.5], at: [0.4, 0.96, 0], c: 'stain' },
    { box: [0.2, 0.06, 0.46], at: [-0.5, 0.98, 0.05], rot: [0, 18, 0], c: 'fish' },
    { box: [0.2, 0.06, 0.46], at: [0.1, 0.98, -0.1], rot: [0, -24, 0], c: 'fish' },
    { box: [0.06, 0.03, 0.34], at: [0.7, 0.98, 0.1], c: 'knife' },
  ] });
export const canPress = model({ id: 'can-press', about: 'The can press: a huge iron stamp at the end of the belt', tags: ['prop', 'cannery'],
  palette: { iron: 'night', iron2: 'slate', stripe: 'orange', stripe2: 'ink', piston: 'mist', hole: 'ink' },
  parts: [
    { box: [0.5, 3.5, 3], at: [-1.5, 1.75, 0], c: 'iron' },
    { box: [0.5, 3.5, 3], at: [1.5, 1.75, 0], c: 'iron' },
    { box: [3.5, 0.8, 3], at: [0, 3.5, 0], c: 'iron2' },
    { box: [2.5, 0.1, 0.05], at: [0, 3.1, 1.52], c: 'stripe' },
    { box: [2.5, 0.1, 0.05], at: [0, 2.96, 1.52], c: 'stripe2' },
    { group: [{ box: [0.5, 1.8, 0.5], at: [0, 0.4, 0], c: 'piston' }, { box: [2.5, 0.3, 2.5], at: [0, -0.5, 0], c: 'iron2' }], name: 'Stamp', pivot: true, at: [0, 2.4, 0] },
  ] });
export const carcass = model({ id: 'carcass', about: 'A big split fish on a hook, swinging from the rail', tags: ['prop', 'cannery'], collider: 'none', floats: true,
  palette: { flesh: 'red', flesh2: 'plum', skin: 'mist', hook: 'night' },
  parts: [
    { box: [0.05, 0.5, 0.05], at: [0, 0.25, 0], c: 'hook' },
    { box: [0.5, 1.2, 0.26], at: [0, -0.5, 0], c: 'skin' },
    { box: [0.32, 1.0, 0.04], at: [0, -0.5, 0.14], c: 'flesh' },
    { box: [0.14, 0.6, 0.03], at: [0, -0.5, 0.165], c: 'flesh2' },
    { wedge: [0.5, 0.3, 0.24], at: [0, -1.25, 0], c: 'skin' },
  ] });
export const iceBlock = model({ id: 'ice-block', about: 'A cut block of cloudy ice', tags: ['prop', 'cannery'],
  palette: { ice: 'cyan', ice2: 'white', dark: 'sky' },
  parts: [{ box: [1, 0.9, 0.8], at: [0, 0.45, 0], c: 'ice' }, { box: [0.7, 0.05, 0.5], at: [0.05, 0.92, 0], c: 'ice2' }, { box: [0.4, 0.5, 0.02], at: [-0.1, 0.5, 0.41], c: 'dark' }] });
export const winchMachine = model({ id: 'winch-machine', about: 'A big hand winch with a spoked wheel, chain to the ceiling', tags: ['prop', 'cannery'],
  palette: { iron: 'night', iron2: 'slate', wheel: 'red', chain: 'mist', drum: 'orange' },
  parts: [
    { box: [1.6, 0.2, 1], at: [0, 0.1, 0], c: 'iron' },
    { box: [0.14, 1.2, 0.5], at: [-0.7, 0.8, 0], c: 'iron2' },
    { box: [0.14, 1.2, 0.5], at: [0.7, 0.8, 0], c: 'iron2' },
    { cyl: [0.6, 1.3, 0.6], at: [0, 1.1, 0], rot: [0, 0, 90], c: 'drum', seg: 8 },
    { group: [
      { torus: [1.2, 0.09, 1.2], at: [0, 0, 0], rot: [0, 0, 90], c: 'wheel' },
      { box: [0.06, 1.2, 0.08], at: [0, 0, 0], c: 'wheel' },
      { box: [0.06, 0.08, 1.2], at: [0, 0, 0], c: 'wheel' },
    ], name: 'Wheel', pivot: true, at: [0.85, 1.1, 0] },
    { box: [0.08, 2, 0.08], at: [0, 2.3, 0], c: 'chain' },
  ] });
export const shutter = model({ id: 'roll-shutter', about: 'A rolled steel shutter in a frame', tags: ['prop', 'cannery'], collider: 'none',
  params: { w: [3, 1, 6] },
  palette: { steel: 'slate', rib: 'night', frame: 'ink', warn: 'orange' },
  parts: (p) => [
    { group: [
      { box: [p.w, 3, 0.1], at: [0, 1.5, 0], c: 'steel' },
      ...[0.4, 0.9, 1.4, 1.9, 2.4].map((y) => ({ box: [p.w, 0.06, 0.13], at: [0, y, 0], c: 'rib' })),
      { box: [p.w, 0.14, 0.14], at: [0, 0.07, 0], c: 'warn' },
    ], name: 'Slats', pivot: true, at: [0, 0, 0] },
    { box: [0.14, 3.2, 0.2], at: [-p.w / 2 - 0.07, 1.6, 0], c: 'frame' },
    { box: [0.14, 3.2, 0.2], at: [p.w / 2 + 0.07, 1.6, 0], c: 'frame' },
    { box: [p.w + 0.3, 0.3, 0.3], at: [0, 3.15, 0], c: 'frame' },
  ] });
export const gantry = model({ id: 'gantry-crane', about: 'A dockyard gantry crane with a cab', tags: ['prop', 'cannery'], collider: 'none',
  palette: { steel: 'orange', steel2: 'plum', cab: 'sand', glass: 'cyan', stripe: 'ink' },
  parts: [
    { box: [0.5, 8, 0.5], at: [-1.2, 4, 0], c: 'steel' },
    { box: [0.5, 8, 0.5], at: [1.2, 4, 0], c: 'steel' },
    { box: [3, 0.6, 0.8], at: [0, 8.1, 0], c: 'steel2' },
    { box: [1.6, 1.8, 1.6], at: [0, 2.2, -0.4], c: 'cab' },
    { box: [1.1, 0.8, 0.05], at: [0, 2.5, 0.42], c: 'glass', glow: true },
    { box: [1.8, 0.1, 1.8], at: [0, 3.15, -0.4], c: 'stripe' },
  ] });
export const cranePallet = model({ id: 'crane-pallet', about: 'A heavy pallet of ballast iron hung from the crane chain', tags: ['prop', 'cannery'], floats: true, collider: 'none',
  palette: { wood: 'orange', iron: 'night', iron2: 'slate', chain: 'mist', lamp: 'red' },
  parts: [
    { box: [2.4, 0.2, 2.4], at: [0, 0.1, 0], c: 'wood' },
    { box: [2, 0.8, 2], at: [0, 0.6, 0], c: 'iron' },
    { box: [1.4, 0.4, 1.4], at: [0, 1.2, 0], c: 'iron2' },
    { box: [0.1, 7, 0.1], at: [0, 4.9, 0], c: 'chain' },
    { box: [0.3, 0.2, 0.3], at: [0, 1.55, 0], c: 'lamp', glow: true },
  ] });
export const steamPipe = model({ id: 'steam-pipe', about: 'A run of lagged pipe with a valve wheel', tags: ['prop', 'cannery'], collider: 'none',
  palette: { pipe: 'slate', band: 'night', valve: 'red' },
  parts: [
    { cyl: [0.26, 4, 0.26], at: [0, 2.6, 0], rot: [0, 0, 90], c: 'pipe', seg: 6 },
    { box: [0.32, 0.32, 0.32], at: [-1, 2.6, 0], c: 'band' },
    { box: [0.32, 0.32, 0.32], at: [1, 2.6, 0], c: 'band' },
    { torus: [0.34, 0.05, 0.34], at: [0, 2.9, 0], c: 'valve' },
    { cyl: [0.2, 2.5, 0.2], at: [2, 1.3, 0], c: 'pipe', seg: 6 },
  ] });
export const beltFrame = model({ id: 'belt-frame', about: 'A steel leg and rollers under the conveyor', tags: ['prop', 'cannery'], collider: 'none',
  palette: { steel: 'night', roller: 'mist' },
  parts: [{ box: [0.1, 0.2, 2.3], at: [0, 0.1, 0], c: 'steel' }, { cyl: [0.1, 2.1, 0.1], at: [0, 0.2, 0], rot: [90, 0, 0], c: 'roller', seg: 6 }] });
export const cannedStack = model({ id: 'can-stack', about: 'A pyramid of Thole tins', tags: ['prop', 'cannery'],
  palette: { tin: 'mist', label: 'red', top: 'white' },
  parts: [
    ...[-0.3, 0, 0.3].map((x) => ({ cyl: [0.26, 0.3, 0.26], at: [x, 0.15, 0], c: 'tin', seg: 8 })),
    ...[-0.3, 0, 0.3].map((x) => ({ cyl: [0.27, 0.12, 0.27], at: [x, 0.15, 0], c: 'label', seg: 8 })),
    ...[-0.15, 0.15].map((x) => ({ cyl: [0.26, 0.3, 0.26], at: [x, 0.45, 0], c: 'tin', seg: 8 })),
    { cyl: [0.26, 0.3, 0.26], at: [0, 0.75, 0], c: 'tin', seg: 8 },
    { cyl: [0.27, 0.12, 0.27], at: [0, 0.75, 0], c: 'label', seg: 8 },
  ] });
export const sign = model({ id: 'thole-sign', about: 'THOLE AND SONS painted board, chipped, over the works', tags: ['prop', 'cannery'], floats: true, collider: 'none',
  palette: { board: 'navy', trim: 'sand', paint: 'white' },
  parts: [
    { box: [6.6, 1.2, 0.12], at: [0, 0, 0], c: 'board' },
    { box: [6.8, 0.1, 0.14], at: [0, 0.6, 0], c: 'trim' },
    { box: [6.8, 0.1, 0.14], at: [0, -0.6, 0], c: 'trim' },
    { box: [6, 0.72, 0.02], at: [0, 0, 0.07], c: 'paint', tex: 'thole-sign' },
  ] });

// ---- Abbey ----
export const lampStatue = model({ id: 'lamp-statue', about: 'A robed stone saint holding a great lens lamp, turns on a plinth', tags: ['prop', 'abbey'],
  palette: { stone: 'mist', stone2: 'slate', dark: 'night', brass: 'sand', lamp: 'orange' },
  parts: [
    { box: [1.1, 0.4, 1.1], at: [0, 0.2, 0], c: 'dark' },
    { group: [
      { cyl: [0.74, 1.3, 0.6], at: [0, 1.05, 0], top: 0.7, c: 'stone', seg: 8 },
      { box: [0.4, 0.4, 0.4], at: [0, 1.9, 0], c: 'stone2' },
      { box: [0.46, 0.14, 0.44], at: [0, 2.14, -0.02], c: 'stone' },
      { box: [0.16, 0.14, 0.7], at: [0.3, 1.56, 0.3], c: 'stone2' },
      { box: [0.16, 0.14, 0.7], at: [-0.3, 1.56, 0.3], c: 'stone2' },
      { cyl: [0.42, 0.4, 0.42], at: [0, 1.56, 0.76], rot: [90, 0, 0], c: 'brass', seg: 8 },
      { box: [0.3, 0.3, 0.03], at: [0, 1.56, 0.97], c: 'lamp', glow: true },
    ], name: 'Turn', pivot: true, at: [0, 0, 0] },
  ] });
export const floorMosaic = model({ id: 'floor-mosaic', about: 'A floor mosaic with three small arrows, the lens puzzle clue', tags: ['prop', 'abbey'], collider: 'none',
  palette: { base: 'night', ring: 'sand', fish: 'plum', a: 'orange' },
  parts: [
    { cyl: [3.4, 0.02, 3.4], at: [0, 0.015, 0], c: 'base', seg: 16 },
    { torus: [3.4, 0.03, 3.4], at: [0, 0.03, 0], c: 'ring' },
    { box: [1.4, 0.02, 0.5], at: [0, 0.035, 0], c: 'fish' },
  ] });
export const font = model({ id: 'the-font', about: 'The Font: a cracked stone basin of brine, faintly lit from below', tags: ['prop', 'abbey'],
  palette: { stone: 'mist', stone2: 'slate', dark: 'night', brine: 'lime', crack: 'ink' },
  light: { at: [0, 1.5, 0], c: 'brine', intensity: 6, radius: 8, flicker: 'pulse' },
  parts: [
    { cyl: [2.4, 0.3, 2.4], at: [0, 0.15, 0], c: 'dark', seg: 8 },
    { cyl: [0.9, 0.8, 0.9], at: [0, 0.7, 0], c: 'stone2', seg: 8 },
    { cyl: [2, 0.5, 2], at: [0, 1.3, 0], top: 1.15, c: 'stone', seg: 8 },
    { cyl: [1.7, 0.03, 1.7], at: [0, 1.55, 0], c: 'brine', glow: true, seg: 8 },
  ] });
export const pew = model({ id: 'pew', about: 'A long dark church pew', tags: ['prop', 'abbey'],
  palette: { wood: 'plum', end: 'night' },
  parts: [
    { box: [2.6, 0.1, 0.5], at: [0, 0.5, 0], c: 'wood' },
    { box: [2.6, 0.7, 0.08], at: [0, 0.8, -0.22], c: 'wood' },
    { box: [0.1, 0.9, 0.56], at: [-1.3, 0.45, 0], c: 'end' },
    { box: [0.1, 0.9, 0.56], at: [1.3, 0.45, 0], c: 'end' },
  ] });
export const stainedGlass = model({ id: 'stained-glass', about: 'A tall stained-glass panel: a ship, a wave, a hand from below', tags: ['prop', 'abbey'], floats: true, collider: 'none',
  palette: { lead: 'ink', a: 'red', b: 'cyan', c: 'lime', d: 'orange', e: 'sky' },
  parts: [
    { box: [1.9, 4.4, 0.06], at: [0, 2.2, 0], c: 'lead' },
    { box: [1.6, 1, 0.04], at: [0, 0.8, 0.03], c: 'b', glow: true },
    { box: [0.8, 0.4, 0.04], at: [0, 1.5, 0.03], c: 'd', glow: true },
    { box: [0.1, 1, 0.04], at: [0, 2.1, 0.03], c: 'a', glow: true },
    { box: [1.6, 0.8, 0.04], at: [0, 3.0, 0.03], c: 'e', glow: true },
    { box: [0.6, 0.6, 0.04], at: [0, 3.9, 0.03], c: 'c', glow: true },
  ] });
export const organPipes = model({ id: 'organ-pipes', about: 'A wall of organ pipes in brass', tags: ['prop', 'abbey'], collider: 'none',
  palette: { brass: 'sand', brass2: 'orange', wood: 'plum', dark: 'ink' },
  parts: [
    { box: [6.4, 1.4, 0.6], at: [0, 0.7, 0], c: 'wood' },
    ...[-2.8, -2.1, -1.4, -0.7, 0, 0.7, 1.4, 2.1, 2.8].map((x, i) => {
      const h = 3 + (4 - Math.abs(i - 4)) * 0.8;
      return { cyl: [0.42, h, 0.42], at: [x, 1.4 + h / 2, 0], c: i % 2 ? 'brass' : 'brass2', seg: 8 };
    }),
  ] });

// ---- Launch ----
export const launchHull = model({ id: 'launch-hull', about: 'A varnished motor launch, stern deck to the camera, the Dame at the wheel', tags: ['prop', 'boat'], collider: 'none', floats: true,
  palette: { hull: 'white', trim: 'red', deck: 'orange', house: 'mist', roof: 'navy', glass: 'teal', rail: 'slate', funnel: 'ink' },
  parts: [
    { box: [3, 1.2, 9], at: [0, 0.3, 0], c: 'hull' },
    { box: [2.2, 1.1, 1.6], at: [0, 0.35, 5.1], c: 'hull' },
    { box: [3.1, 0.14, 9.1], at: [0, 0.96, 0], c: 'trim' },
    { box: [2.8, 0.06, 8.8], at: [0, 1.0, 0], c: 'deck' },
    { box: [2.2, 1.4, 2.6], at: [0, 1.7, 2], c: 'house' },
    { box: [2.4, 0.14, 2.8], at: [0, 2.46, 2], c: 'roof' },
    { box: [1.8, 0.5, 0.05], at: [0, 2.0, 0.68], c: 'glass' },
    { box: [0.06, 0.56, 0.08], at: [-0.46, 2.0, 0.67], c: 'roof' },
    { box: [0.06, 0.56, 0.08], at: [0.46, 2.0, 0.67], c: 'roof' },
    { box: [1.9, 0.06, 0.08], at: [0, 2.26, 0.67], c: 'roof' },
    { cyl: [0.5, 0.9, 0.5], at: [0, 2.9, 2.6], c: 'funnel', seg: 8 },
    { box: [0.08, 0.5, 5.4], at: [-1.4, 1.3, -1.6], c: 'rail' },
    { box: [0.08, 0.5, 5.4], at: [1.4, 1.3, -1.6], c: 'rail' },
    { box: [2.9, 0.5, 0.08], at: [0, 1.3, -4.3], c: 'rail' },
  ] });
export const seaStack = model({ id: 'sea-stack', about: 'A black sea stack with gulls on it', tags: ['backdrop'], collider: 'none', floats: true, params: { h: [12, 4, 30] },
  palette: { rock: 'night', rock2: 'slate', guano: 'mist', weed: 'teal' },
  parts: (p, rng) => [
    // Widest at the waterline, as a rock that's been standing in the sea for ten thousand years ought to be.
    { lump: [10, p.h * 0.6, 10], at: [0, p.h * 0.05, 0], c: 'rock', seed: rng.int(1, 99) },
    { lump: [6.4, p.h * 0.8, 6.4], at: [0.2, p.h * 0.45, 0.1], c: 'rock', seed: rng.int(1, 99) },
    { lump: [3.6, p.h * 0.5, 3.4], at: [0.5, p.h * 0.8, 0.4], c: 'rock2', seed: rng.int(1, 99) },
    { lump: [2.4, 0.5, 2.4], at: [0.5, p.h * 1.04, 0.4], c: 'guano', seed: rng.int(1, 99) },
    { lump: [10.6, 1, 10.6], at: [0, 0.1, 0], c: 'weed', seed: rng.int(1, 99) },
  ] });
export const seaMine = model({ id: 'sea-mine', about: 'A horned sea mine bobbing in the swell', tags: ['prop'], collider: 'none',
  palette: { iron: 'ink', band: 'red', horn: 'mist', wet: 'slate' },
  parts: [
    { ball: [1.4, 1.4, 1.4], at: [0, 0.7, 0], c: 'iron' },
    { cyl: [1.46, 0.2, 1.46], at: [0, 0.7, 0], c: 'band', seg: 10 },
    { box: [0.14, 0.4, 0.14], at: [0, 1.55, 0], c: 'horn' },
    { box: [0.14, 0.4, 0.14], at: [0.7, 1, 0], rot: [0, 0, -50], c: 'horn' },
    { box: [0.14, 0.4, 0.14], at: [-0.7, 1, 0], rot: [0, 0, 50], c: 'horn' },
    { box: [0.14, 0.4, 0.14], at: [0, 1, 0.7], rot: [50, 0, 0], c: 'horn' },
    { box: [0.14, 0.4, 0.14], at: [0, 1, -0.7], rot: [-50, 0, 0], c: 'horn' },
  ] });
export const seaArch = model({ id: 'sea-arch', about: 'A collapsing rock arch over the only way out', tags: ['backdrop'], collider: 'none',
  palette: { rock: 'night', rock2: 'slate', weed: 'teal' },
  parts: [
    { lump: [8, 18, 8], at: [-12, 9, 0], c: 'rock', seed: 3 },
    { lump: [8, 18, 8], at: [12, 9, 0], c: 'rock', seed: 4 },
    { lump: [32, 7, 9], at: [0, 17, 0], c: 'rock2', seed: 5 },
    { box: [34, 1, 9], at: [0, 0.5, 0], c: 'weed' },
  ] });

// Backdrop silhouettes.
export const cliffSilhouette = model({ id: 'cliff-silhouette', about: 'A far dark cliff line', tags: ['backdrop'], collider: 'none', params: { w: [40, 10, 120], h: [14, 4, 40] },
  palette: { rock: 'night', rock2: 'ink' },
  parts: (p, rng) => {
    const parts = [];
    const n = Math.max(3, Math.round(p.w / 9));
    for (let i = 0; i < n; i++) {
      const x = -p.w / 2 + ((i + 0.5) * p.w) / n;
      const h = p.h * rng.range(0.6, 1.1);
      parts.push({ lump: [p.w / n + 3, h, 10], at: [x, h / 2, rng.range(-2, 2)], c: i % 2 ? 'rock' : 'rock2', seed: rng.int(1, 99) });
    }
    return parts;
  } });
export const abbeyFar = model({ id: 'abbey-far', about: 'The abbey on its rock, seen far across the water, lit windows', tags: ['backdrop'], collider: 'none',
  palette: { rock: 'ink', wall: 'night', roof: 'navy', glow: 'orange', spire: 'slate' },
  parts: [
    { lump: [34, 14, 22], at: [0, 7, 0], c: 'rock', seed: 11 },
    { box: [16, 10, 8], at: [0, 18, 0], c: 'wall' },
    { wedge: [16, 5, 4], at: [0, 25.5, 2], c: 'roof' },
    { wedge: [16, 5, 4], at: [0, 25.5, -2], rot: [0, 180, 0], c: 'roof' },
    { box: [4, 22, 4], at: [10, 23, 0], c: 'wall' },
    { cone: [5, 8, 5], at: [10, 38, 0], c: 'spire', seg: 6 },
    { box: [3, 14, 3], at: [-10, 20, 0], c: 'wall' },
    { cone: [4, 6, 4], at: [-10, 30, 0], c: 'spire', seg: 6 },
    ...[-5, -2, 1, 4].map((x) => ({ box: [1, 3, 0.1], at: [x, 19, 4.05], c: 'glow', glow: true })),
    { box: [1.2, 3, 0.1], at: [10, 28, 2.05], c: 'glow', glow: true },
  ] });

export const PROP_DEFS = [tannoy, foghornTower, mailBoat, rowboat, lobsterPot, dryingRack, drapedNet, bollard, buoy, anchorProp, chainLinks, fishCrate, brineBarrel, hayCart, effigy, telegraphDesk, fathomLantern, treasureChest, house,
  guttingTable, canPress, carcass, iceBlock, winchMachine, shutter, gantry, cranePallet, steamPipe, beltFrame, cannedStack, sign,
  lampStatue, floorMosaic, font, pew, stainedGlass, organPipes,
  launchHull, seaStack, seaMine, seaArch, cliffSilhouette, abbeyFar];
