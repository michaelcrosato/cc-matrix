// Tools, entity props, busts and figures as data, drawn by `node check.mjs --sheets src/content/models/index.js`.
import { model, MODEL_LIBRARY, ModelCatalog } from '../../../pixel-engine.js';
import { CAST } from '../cast.js';

/* ------------------------------- hands and tools: tip at origin, pointing -Z ------------------------------- */
export const handDef = (id = 'glove-hand', glove = 'sky', fold = 'blue', sleeve = 'teal') => model({ id, about: 'Gloved surgeon hand gripping a shaft, wrist toward +Z', tags: ['character', 'hand'], floats: true,
  palette: { glove, fold, sleeve }, parts: [
    { name: 'palm', box: [0.72, 0.3, 0.8], at: [0, 0, 0], c: 'glove' }, { name: 'knuck', box: [0.74, 0.16, 0.14], at: [0, 0.12, -0.34], c: 'fold' },
    ...[-0.27, -0.09, 0.09, 0.27].flatMap((x, i) => [{ name: `f${i}a`, box: [0.16, 0.16, 0.34], at: [x, 0.05, -0.56], rot: [18, 0, 0], c: 'glove' }, { name: `f${i}b`, box: [0.15, 0.15, 0.26], at: [x, -0.09, -0.76], rot: [58, 0, 0], c: 'glove' }]),
    { name: 'thumb', box: [0.18, 0.18, 0.5], at: [-0.44, -0.04, -0.26], rot: [10, -28, 0], c: 'glove' },
    { name: 'cuff', cyl: [0.62, 0.3, 0.62], at: [0, 0, 0.54], rot: [90, 0, 0], c: 'fold' }, { name: 'wrist', cyl: [0.56, 0.9, 0.56], at: [0, 0, 1.1], rot: [90, 0, 0], c: 'glove' },
    { name: 'sleeve', cyl: [0.8, 1.3, 0.8], at: [0, 0, 2.2], rot: [90, 0, 0], c: 'sleeve' }] });

const steel = { steel: 'mist', dark: 'slate', hi: 'white', accent: 'red', glass: 'cyan', blue: 'blue', gold: 'sand' };
const tool = (id, about, parts, palette = steel) => model({ id, about, tags: ['tool', 'surgery'], floats: true, palette, parts });
export const TOOL_DEFS = {
  scalpel: tool('tool-scalpel', 'Scalpel: thin handle, bright small blade at the tip', [
    { name: 'blade', box: [0.1, 0.05, 0.42], at: [0, 0.02, 0.2], c: 'hi' }, { name: 'bolster', box: [0.12, 0.09, 0.14], at: [0, 0.05, 0.46], c: 'dark' },
    { name: 'handle', box: [0.13, 0.1, 1.15], at: [0, 0.08, 1.05], c: 'steel' }, { name: 'grip', box: [0.15, 0.12, 0.3], at: [0, 0.08, 0.8], c: 'blue' }]),
  forceps: tool('tool-forceps', 'Forceps: two long moving jaws meeting at the tip', [
    { group: [{ name: 'jawA', box: [0.07, 0.07, 1.3], at: [0, 0, 0.65], c: 'hi' }], at: [-0.06, 0.05, 0], name: 'jawA', pivot: true },
    { group: [{ name: 'jawB', box: [0.07, 0.07, 1.3], at: [0, 0, 0.65], c: 'steel' }], at: [0.06, 0.05, 0], name: 'jawB', pivot: true },
    { name: 'hinge', box: [0.26, 0.12, 0.3], at: [0, 0.05, 1.3], c: 'dark' }, { name: 'stem', box: [0.14, 0.1, 0.6], at: [0, 0.05, 1.7], c: 'steel' }]),
  suture: tool('tool-suture', 'Curved needle on a driver, trailing thread', [
    { name: 'needle', tube: [[0, 0, 0], [0.12, 0.08, -0.04], [0.26, 0.12, 0.03], [0.32, 0.1, 0.2]], r: 0.035, c: 'hi' }, { name: 'driver', box: [0.1, 0.1, 1.2], at: [0.3, 0.14, 0.8], c: 'steel' }, { name: 'lock', box: [0.2, 0.12, 0.14], at: [0.3, 0.14, 1.1], c: 'accent' }]),
  drain: tool('tool-drain', 'Drain wand: wide nozzle, hose behind', [
    { name: 'nozzle', cyl: [0.26, 0.28, 0.26], at: [0, 0.14, 0], top: 1.4, c: 'dark' }, { name: 'wand', cyl: [0.16, 1.5, 0.16], at: [0, 0.3, 0.8], rot: [80, 0, 0], c: 'steel' }, { name: 'band', cyl: [0.22, 0.14, 0.22], at: [0, 0.22, 0.4], rot: [80, 0, 0], c: 'accent' }, { name: 'hose', cyl: [0.14, 0.9, 0.14], at: [0, 0.46, 1.8], rot: [80, 0, 0], c: 'blue' }]),
  syringe: tool('tool-syringe', 'Syringe: needle, glass barrel, moving plunger', [
    { name: 'needle', box: [0.04, 0.04, 0.5], at: [0, 0.03, 0.24], c: 'hi' }, { name: 'barrel', cyl: [0.26, 0.9, 0.26], at: [0, 0.05, 0.92], rot: [90, 0, 0], c: 'glass' }, { name: 'fluid', cyl: [0.18, 0.6, 0.18], at: [0, 0.05, 0.84], rot: [90, 0, 0], c: 'accent' },
    { group: [{ name: 'rod', box: [0.08, 0.08, 0.6], at: [0, 0, 0.3], c: 'steel' }, { name: 'thumb', box: [0.26, 0.26, 0.05], at: [0, 0, 0.62], c: 'dark' }], at: [0, 0.05, 1.36], name: 'plunger', pivot: true }]),
  gel: tool('tool-gel', 'Gel bottle: bright squeeze body, narrow nozzle', [
    { name: 'tip', cone: [0.14, 0.32, 0.14], at: [0, 0.14, 0.02], rot: [180, 0, 0], c: 'hi' }, { name: 'bottle', cyl: [0.4, 0.8, 0.4], at: [0, 0.74, 0.16], rot: [12, 0, 0], c: 'glass' }, { name: 'label', cyl: [0.42, 0.22, 0.42], at: [0, 0.74, 0.16], rot: [12, 0, 0], c: 'blue' }]),
  laser: tool('tool-laser', 'Laser pen: slim black body with a red emitter', [
    { name: 'emitter', cyl: [0.14, 0.2, 0.14], at: [0, 0.1, 0.05], rot: [75, 0, 0], c: 'accent', glow: true }, { name: 'pen', cyl: [0.18, 1.4, 0.18], at: [0, 0.32, 0.84], rot: [75, 0, 0], c: 'dark' }, { name: 'ring', cyl: [0.22, 0.12, 0.22], at: [0, 0.22, 0.5], rot: [75, 0, 0], c: 'gold' }]),
  scanner: tool('tool-scanner', 'Scanner: handheld disc head on a handle', [
    { name: 'disc', cyl: [0.9, 0.08, 0.9], at: [0, 0.16, 0], c: 'glass', seg: 12 }, { name: 'rim', torus: [1, 0.08, 1], at: [0, 0.16, 0], c: 'dark', seg: 12 }, { name: 'stem', box: [0.16, 0.1, 1.2], at: [0, 0.2, 1.05], c: 'steel' }]),
};

/* ------------------------------- what lies on the field ------------------------------- */
const prop = (id, about, parts, palette) => model({ id, about, tags: ['surgery', 'prop'], floats: true, palette, parts });
const hookParts = [
  { name: 'shank', box: [0.1, 0.1, 0.62], at: [0, 0.3, 0.32], c: 'hi' }, { name: 'eye', torus: [0.2, 0.06, 0.2], at: [0, 0.3, 0.68], c: 'steel' },
  { name: 'bend', tube: [[0, 0.3, 0.02], [0.12, 0.24, -0.1], [0.24, 0.14, 0], [0.24, 0.1, 0.16]], r: 0.05, c: 'hi' }, { name: 'barb', box: [0.05, 0.05, 0.16], at: [0.2, 0.08, 0.13], rot: [0, -40, 0], c: 'rust' }];
export const PROP_DEFS = {
  hook: prop('p-hook', 'A rusty barbed fishhook', hookParts, { hi: 'mist', steel: 'slate', rust: 'orange' }),
  key: prop('p-key', 'A brass stage key', [{ name: 'bow', torus: [0.4, 0.1, 0.4], at: [0, 0.14, 0.34], c: 'gold' }, { name: 'shaft', box: [0.12, 0.1, 0.7], at: [0, 0.14, -0.1], c: 'gold' }, { name: 'bit', box: [0.22, 0.1, 0.16], at: [0.12, 0.14, -0.36], c: 'gold2' }], { gold: 'sand', gold2: 'orange' }),
  coin: prop('p-coin', 'A big silver coin', [{ name: 'disc', cyl: [0.56, 0.12, 0.56], at: [0, 0.12, 0], c: 'silver', seg: 10 }, { name: 'star', box: [0.2, 0.03, 0.2], at: [0, 0.2, 0], rot: [0, 45, 0], c: 'mark' }], { silver: 'white', mark: 'slate' }),
  card: prop('p-card', 'A playing card, the queen of something', [{ name: 'card', box: [0.56, 0.05, 0.8], at: [0, 0.1, 0], c: 'face' }, { name: 'pip', box: [0.2, 0.03, 0.26], at: [0, 0.14, 0], rot: [0, 45, 0], c: 'pip' }], { face: 'white', pip: 'red' }),
  magnet: prop('p-magnet', 'A horseshoe magnet pair, red and silver', [{ name: 'a', box: [0.3, 0.22, 0.5], at: [-0.22, 0.14, 0.04], c: 'r' }, { name: 'b', box: [0.3, 0.22, 0.5], at: [0.22, 0.14, 0.04], c: 'r' }, { name: 'tipa', box: [0.3, 0.22, 0.16], at: [-0.22, 0.14, -0.28], c: 's' }, { name: 'tipb', box: [0.3, 0.22, 0.16], at: [0.22, 0.14, -0.28], c: 's' }, { name: 'bar', box: [0.74, 0.22, 0.2], at: [0, 0.14, 0.36], c: 'r' }], { r: 'red', s: 'white' }),
  debris: prop('p-debris', 'A jagged shard of ferry hull', [{ name: 'shard', slab: [[-0.4, -0.3], [0.1, -0.5], [0.44, -0.1], [0.2, 0.42], [-0.26, 0.3]], depth: 0.16, at: [0, 0.14, 0], rot: [90, 0, 20], c: 'hull' }, { name: 'paint', box: [0.3, 0.04, 0.16], at: [0, 0.24, 0], rot: [0, 30, 0], c: 'paint' }], { hull: 'slate', paint: 'red' }),
  tumor: prop('p-tumor', 'A lumpy grey-purple mass', [{ name: 'lump', lump: [1.2, 0.8, 1], at: [0, 0.34, 0], c: 'm', seed: 4 }, { name: 'lump2', lump: [0.5, 0.4, 0.5], at: [0.4, 0.46, 0.2], c: 'm2', seed: 7 }], { m: 'plum', m2: 'slate' }),
  polyp: prop('p-polyp', 'A small glistening polyp', [{ name: 'stem', cyl: [0.22, 0.14, 0.22], at: [0, 0.07, 0], c: 'a' }, { name: 'head', ball: [0.42, 0.34, 0.42], at: [0, 0.26, 0], c: 'b' }], { a: 'plum', b: 'orange' }),
  shard: prop('p-shard', 'A glass splinter, deep in the chest', [{ name: 'glass', cone: [0.3, 0.6, 0.3], at: [0, 0.3, 0], rot: [0, 0, 18], c: 'g', seg: 4 }], { g: 'cyan' }),
  nodule: prop('p-nodule', 'A hard dark nodule', [{ name: 'n', lump: [0.5, 0.36, 0.5], at: [0, 0.18, 0], c: 'n', seed: 3 }, { name: 'dot', ball: [0.14, 0.1, 0.14], at: [0.08, 0.36, 0.08], c: 'g' }], { n: 'ink', g: 'lime' }),
  egg: prop('p-egg', 'A pulsing pale egg with a dark seed', [{ name: 'shell', ball: [0.52, 0.42, 0.52], at: [0, 0.22, 0], c: 's' }, { name: 'seed', ball: [0.16, 0.16, 0.16], at: [0, 0.4, 0.06], c: 'd', glow: true }], { s: 'sand', d: 'lime' }),
  cyst: prop('p-cyst', 'A clean-looking cyst', [{ name: 'c', ball: [0.54, 0.4, 0.54], at: [0, 0.2, 0], c: 'c' }], { c: 'mist' }),
  clot: prop('p-clot', 'A dark clot under the artery', [{ name: 'c', lump: [0.62, 0.34, 0.62], at: [0, 0.18, 0], c: 'c', seed: 2 }, { name: 'hi', ball: [0.14, 0.08, 0.14], at: [0.1, 0.36, 0.1], c: 'h' }], { c: 'ink', h: 'red' }),
  clamp: prop('p-clamp', 'A steel vascular clamp', [{ name: 'jaw', box: [0.76, 0.12, 0.2], at: [0, 0.16, -0.2], c: 's' }, { name: 'arm', box: [0.14, 0.12, 0.66], at: [-0.2, 0.2, 0.2], c: 's2' }, { name: 'arm2', box: [0.14, 0.12, 0.66], at: [0.2, 0.2, 0.2], c: 's2' }, { name: 'ring', torus: [0.3, 0.08, 0.3], at: [-0.2, 0.22, 0.6], c: 's' }, { name: 'ring2', torus: [0.3, 0.08, 0.3], at: [0.2, 0.22, 0.6], c: 's' }], { s: 'white', s2: 'mist' }),
  oldKidney: prop('p-oldkid', 'A failing kidney, grey and shrunken', [{ name: 'bean', slab: [[-0.8, 0.5], [0, 0.72], [0.8, 0.5], [0.96, 0], [0.8, -0.5], [0.2, -0.66], [0.1, -0.2], [-0.1, -0.2], [-0.2, -0.66], [-0.8, -0.5], [-0.96, 0]], depth: 0.6, at: [0, 0.36, 0], rot: [90, 0, 0], c: 'k' }, { name: 'spot', box: [0.5, 0.05, 0.3], at: [0.2, 0.68, 0.1], c: 'k2' }], { k: 'slate', k2: 'plum' }),
  newKidney: prop('p-newkid', 'A healthy donor kidney', [{ name: 'bean', slab: [[-0.8, 0.5], [0, 0.72], [0.8, 0.5], [0.96, 0], [0.8, -0.5], [0.2, -0.66], [0.1, -0.2], [-0.1, -0.2], [-0.2, -0.66], [-0.8, -0.5], [-0.96, 0]], depth: 0.6, at: [0, 0.36, 0], rot: [90, 0, 0], c: 'k' }, { name: 'sheen', box: [0.6, 0.05, 0.14], at: [-0.2, 0.68, 0.3], c: 'hi' }], { k: 'plum', hi: 'mist' }),
  pinkKidney: prop('p-pinkkid', 'A kidney, pink with new blood', [{ name: 'bean', slab: [[-0.8, 0.5], [0, 0.72], [0.8, 0.5], [0.96, 0], [0.8, -0.5], [0.2, -0.66], [0.1, -0.2], [-0.1, -0.2], [-0.2, -0.66], [-0.8, -0.5], [-0.96, 0]], depth: 0.6, at: [0, 0.36, 0], rot: [90, 0, 0], c: 'k' }, { name: 'sheen', box: [0.6, 0.05, 0.14], at: [-0.2, 0.68, 0.3], c: 'hi' }], { k: 'red', hi: 'orange' }),
  plate: prop('p-plate', 'A hard red plate from the crown of the Wrath', [{ name: 'plate', slab: [[-0.46, -0.3], [0.46, -0.3], [0.32, 0.5], [0, 0.66], [-0.32, 0.5]], depth: 0.2, at: [0, 0.26, 0], rot: [90, 0, 0], c: 'r' }, { name: 'edge', box: [0.7, 0.08, 0.12], at: [0, 0.38, 0.2], c: 'o' }], { r: 'red', o: 'orange' }),
  frag0: prop('p-frag0', 'A long bone shard', [{ name: 'f', slab: [[-0.5, -0.24], [0.4, -0.3], [0.6, 0.02], [0.38, 0.26], [-0.46, 0.2], [-0.6, 0]], depth: 0.22, at: [0, 0.14, 0], rot: [90, 0, 0], c: 'b' }, { name: 'e', box: [0.3, 0.04, 0.08], at: [0, 0.26, 0.06], c: 'd' }], { b: 'white', d: 'sand' }),
  frag1: prop('p-frag1', 'A chunky bone shard', [{ name: 'f', slab: [[-0.42, -0.3], [0.2, -0.36], [0.52, 0], [0.28, 0.36], [-0.34, 0.32]], depth: 0.24, at: [0, 0.14, 0], rot: [90, 0, 0], c: 'b' }, { name: 'e', box: [0.2, 0.04, 0.2], at: [0.04, 0.28, 0], c: 'd' }], { b: 'white', d: 'sand' }),
  frag2: prop('p-frag2', 'A thin bone shard', [{ name: 'f', slab: [[-0.6, -0.16], [0.54, -0.2], [0.62, 0.16], [-0.5, 0.2]], depth: 0.2, at: [0, 0.12, 0], rot: [90, 0, 0], c: 'b' }, { name: 'e', box: [0.4, 0.04, 0.06], at: [0, 0.24, 0], c: 'd' }], { b: 'white', d: 'sand' }),
  tendril: prop('p-tendril', 'A pale root of the strain on the spine', [{ name: 'root', tube: [[-0.5, 0.12, 0.2], [-0.1, 0.22, -0.1], [0.2, 0.16, 0.1], [0.5, 0.1, -0.2]], r: 0.1, c: 'p' }, { name: 'bud', ball: [0.34, 0.3, 0.34], at: [0, 0.26, 0], c: 'g' }], { p: 'white', g: 'sand' }),
  stalk: prop('p-stalk', 'The optic stalk of the Weeper', [{ name: 's', lump: [0.7, 0.5, 0.7], at: [0, 0.24, 0], c: 'r', seed: 5 }, { name: 'b', ball: [0.3, 0.3, 0.3], at: [0, 0.54, 0], c: 'w', glow: true }], { r: 'plum', w: 'cyan' }),
  coreIntroit: prop('p-core-i', 'The pulsing core of the Knock, ringed with hooked teeth', [{ name: 'b', ball: [0.84, 0.76, 0.84], at: [0, 0.4, 0], c: 'a' }, { name: 'i', ball: [0.36, 0.36, 0.36], at: [0, 0.68, 0.14], c: 'g', glow: true }, ...[0, 60, 120, 180, 240, 300].map((a, i) => ({ name: `t${i}`, cone: [0.14, 0.34, 0.14], at: [Math.sin((a * Math.PI) / 180) * 0.44, 0.26, Math.cos((a * Math.PI) / 180) * 0.44], rot: [90, a, 0], c: 'w' }))], { a: 'plum', g: 'lime', w: 'white' }),
  coreMiserere: prop('p-core-m', 'A pale, beautiful core under a gold halo', [{ name: 'b', ball: [1, 0.9, 1], at: [0, 0.5, 0], c: 'w' }, { name: 'h', torus: [1.5, 0.1, 1.5], at: [0, 1.15, 0], c: 'g', glow: true, seg: 14 }, { name: 'i', ball: [0.3, 0.3, 0.3], at: [0, 0.8, 0.2], c: 'g', glow: true }], { w: 'white', g: 'sand' }),
  corePale: prop('p-core-p', 'A pale curled strain, asleep', [{ name: 'b', ball: [0.8, 0.54, 0.8], at: [0, 0.28, 0], c: 'w' }, { name: 'c', torus: [0.9, 0.14, 0.9], at: [0, 0.28, 0], c: 'm', seg: 12 }], { w: 'white', m: 'mist' }),
};
export const EYE_DEF = (id, iris = 'cyan', lid = 'plum') => model({ id, about: 'A wet staring eye on the organ, lids on pivots', tags: ['strain', 'surgery'], floats: true, palette: { sclera: 'white', iris, pupil: 'ink', lid }, parts: [
  { name: 'sclera', ball: [1.1, 0.8, 1.1], at: [0, 0.34, 0], c: 'sclera' }, { name: 'iris', cyl: [0.58, 0.08, 0.58], at: [0, 0.76, 0.06], c: 'iris', seg: 10 }, { name: 'pupil', cyl: [0.26, 0.06, 0.26], at: [0, 0.82, 0.06], c: 'pupil', seg: 8 },
  { group: [{ name: 'lid', ball: [1.22, 0.42, 1.22], half: true, at: [0, 0, 0], c: 'lid' }], at: [0, 0.4, 0], name: 'lid', pivot: true },
] });
export const CROWN_EYE = EYE_DEF('eye-wrath', 'red', 'red');
export const WEEP_EYE = EYE_DEF('eye-weep', 'cyan', 'plum');
export const HALO_EYE = EYE_DEF('eye-halo', 'sand', 'white');

/* ------------------------------- busts: anime faces from slab outlines ------------------------------- */
const FACE = [[-0.46, 0.5], [0.46, 0.5], [0.5, 0.05], [0.42, -0.28], [0.2, -0.56], [0, -0.68], [-0.2, -0.56], [-0.42, -0.28], [-0.5, 0.05]];
const FRINGE = [[-0.56, 0.42], [-0.6, 0], [-0.44, 0.16], [-0.4, -0.08], [-0.22, 0.24], [-0.06, 0.02], [0.06, 0.26], [0.24, 0.04], [0.34, 0.26], [0.46, -0.1], [0.6, 0.02], [0.56, 0.42], [0.34, 0.66], [0, 0.74], [-0.34, 0.66]];
const BOB = [[-0.62, 0.5], [-0.66, -0.5], [-0.42, -0.42], [-0.44, 0.14], [0.42, 0.14], [0.44, -0.42], [0.66, -0.5], [0.62, 0.5], [0.3, 0.74], [-0.3, 0.74]];
const SWEPT = [[-0.56, 0.3], [-0.5, 0.05], [-0.2, 0.26], [0.2, 0.34], [0.56, 0.06], [0.58, 0.46], [0.3, 0.72], [-0.3, 0.72]];

function hairParts(st, c, capc) {
  const parts = [];
  if (st === 'messy') parts.push({ name: 'hairfront', slab: FRINGE, depth: 0.16, at: [0, 0.22, 0.26], c }, { name: 'hairback', box: [0.98, 0.86, 0.5], at: [0, 0.2, -0.34], c }, { name: 'tuft', cone: [0.2, 0.3, 0.2], at: [0.22, 0.78, 0.02], rot: [0, 0, -30], c }, { name: 'tuft2', cone: [0.2, 0.26, 0.2], at: [-0.2, 0.76, -0.1], rot: [0, 0, 28], c });
  if (st === 'bun') parts.push({ name: 'hairfront', slab: SWEPT, depth: 0.14, at: [0, 0.22, 0.27], c }, { name: 'hairback', box: [0.96, 0.84, 0.5], at: [0, 0.22, -0.34], c }, { name: 'bun', ball: [0.46, 0.46, 0.46], at: [0, 0.82, -0.3], c });
  if (st === 'bob') parts.push({ name: 'hairfront', slab: BOB, depth: 0.14, at: [0, 0.16, 0.26], c }, { name: 'hairback', box: [1.2, 1.1, 0.56], at: [0, 0.06, -0.32], c });
  if (st === 'swept') parts.push({ name: 'hairfront', slab: SWEPT, depth: 0.15, at: [0, 0.24, 0.27], c }, { name: 'hairback', box: [1, 0.96, 0.54], at: [0, 0.14, -0.34], c });
  if (st === 'bald') parts.push({ name: 'dome', ball: [0.96, 0.46, 0.9], half: true, at: [0, 0.76, -0.12], c: 'skin' }, { name: 'sideL', box: [0.1, 0.34, 0.4], at: [-0.5, 0.2, -0.2], c }, { name: 'sideR', box: [0.1, 0.34, 0.4], at: [0.5, 0.2, -0.2], c });
  if (st === 'fishcap') parts.push({ name: 'dome', ball: [0.96, 0.5, 0.9], half: true, at: [0, 0.62, -0.08], c: 'cap' }, { name: 'band', box: [1, 0.14, 0.9], at: [0, 0.46, -0.08], c: 'cap' }, { name: 'fish', box: [0.34, 0.14, 0.04], at: [0, 0.7, 0.36], c: 'fish' }, { name: 'tail', cone: [0.14, 0.14, 0.04], at: [0.22, 0.7, 0.36], rot: [0, 0, 90], c: 'fish' });
  if (capc && st === 'messy') parts.push({ name: 'dome', ball: [1, 0.46, 0.94], half: true, at: [0, 0.66, -0.1], c: 'cap' }, { name: 'capband', box: [1.04, 0.12, 0.94], at: [0, 0.54, -0.1], c: 'cap' });
  return parts;
}

export function bustDef(id) {
  const L = CAST[id].look;
  const round = L.extra === 'round';
  return model({
    id: `bust-${id}`, about: `Talking-head bust of ${CAST[id].full}`, tags: ['character', 'bust'], floats: true,
    palette: { skin: L.skin, skin2: L.skin === 'plum' ? 'night' : 'orange', hair: L.hair, cloth: L.scrub, cloth2: L.scrub === 'white' ? 'mist' : 'night', cap: L.cap ?? L.scrub, white: 'white', ink: 'ink', mouth: 'plum', glass: L.glasses ?? 'red', fish: 'sky', accent: 'sand', blush: 'red', tear: 'cyan', mask: 'sky' },
    parts: [
      { name: 'torso', box: [round ? 1.5 : 1.25, 1.1, 0.7], at: [0, 0.52, -0.04], c: 'cloth' }, { name: 'shoulders', box: [round ? 1.7 : 1.5, 0.3, 0.7], at: [0, 0.98, -0.04], c: 'cloth' },
      { name: 'neck', box: [0.32, 0.3, 0.3], at: [0, 1.2, 0], c: 'skin' }, { name: 'collar', box: [0.6, 0.1, 0.1], at: [0, 1.06, 0.33], c: 'cloth2' },
      ...(L.scrub === 'white' ? [{ name: 'lapelL', box: [0.2, 0.6, 0.06], at: [-0.22, 0.72, 0.33], rot: [0, 0, 12], c: 'cloth2' }, { name: 'lapelR', box: [0.2, 0.6, 0.06], at: [0.22, 0.72, 0.33], rot: [0, 0, -12], c: 'cloth2' }] : []),
      ...(L.extra === 'stain' ? [{ name: 'stain', box: [0.2, 0.16, 0.03], at: [0.3, 0.7, 0.33], c: 'accent' }] : []),
      ...(L.extra === 'pin' ? [{ name: 'pin', box: [0.09, 0.09, 0.05], at: [-0.34, 0.86, 0.34], c: 'accent', glow: true }] : []),
      { group: [
        { name: 'skull', box: [0.9, 0.92, 0.72], at: [0, 0.1, -0.12], c: 'skin' }, { name: 'face', slab: FACE, depth: 0.26, at: [0, 0, 0.14], c: 'skin' },
        ...hairParts(L.style, 'hair', L.cap),
        ...[-1, 1].flatMap((s) => [
          { name: `eye${s}`, box: [0.24, 0.18, 0.03], at: [s * 0.2, 0.02, 0.28], c: 'white' }, { name: `pupil${s}`, box: [0.12, 0.15, 0.03], at: [s * 0.18, 0.012, 0.305], c: 'ink' }, { name: `spark${s}`, box: [0.05, 0.05, 0.02], at: [s * 0.16, 0.05, 0.325], c: 'white' },
          { group: [{ name: `lidm${s}`, box: [0.25, 0.18, 0.035], at: [0, 0, 0], c: 'skin' }], at: [s * 0.2, 0.17, 0.31], name: s < 0 ? 'lidL' : 'lidR', pivot: true },
          { group: [{ name: `browm${s}`, box: [0.28, 0.05, 0.04], at: [0, 0, 0], c: L.style === 'bald' || L.style === 'fishcap' ? 'ink' : 'hair' }], at: [s * 0.2, 0.2, 0.31], name: s < 0 ? 'browL' : 'browR', pivot: true },
        ]),
        { name: 'nose', box: [0.07, 0.14, 0.07], at: [0, -0.14, 0.31], c: 'skin2' },
        { group: [{ name: 'mouthm', box: [0.24, 0.05, 0.03], at: [0, 0, 0], c: 'mouth' }], at: [0, -0.36, 0.28], name: 'mouth', pivot: true },
        ...(L.extra === 'walrus' ? [{ name: 'moustL', slab: [[-0.42, 0.03], [0, 0.08], [0, -0.06], [-0.3, -0.2]], depth: 0.08, at: [0, -0.24, 0.31], c: 'hair' }, { name: 'moustR', slab: [[0.42, 0.03], [0.3, -0.2], [0, -0.06], [0, 0.08]], depth: 0.08, at: [0, -0.24, 0.31], c: 'hair' }] : []),
        ...(L.glasses ? [-1, 1].flatMap((s) => [{ name: `gt${s}`, box: [0.32, 0.04, 0.03], at: [s * 0.2, 0.13, 0.33], c: 'glass' }, { name: `gb${s}`, box: [0.32, 0.04, 0.03], at: [s * 0.2, -0.09, 0.33], c: 'glass' }, { name: `gs${s}`, box: [0.04, 0.24, 0.03], at: [s * 0.37, 0.02, 0.33], c: 'glass' }]) : []),
        ...(L.extra === 'scar' ? [{ name: 'scar', box: [0.035, 0.3, 0.03], at: [-0.22, 0.14, 0.325], rot: [0, 0, 16], c: 'blush' }] : []),
        { group: [{ name: 'sweatm', ball: [0.1, 0.16, 0.05], at: [0, 0, 0], c: 'tear' }], at: [0.44, 0.34, 0.26], name: 'sweat', pivot: true },
        { group: [{ name: 'tearm', box: [0.06, 0.24, 0.03], at: [0, 0, 0], c: 'tear' }], at: [-0.2, -0.2, 0.3], name: 'tear', pivot: true },
        { group: [{ name: 'blushL', box: [0.16, 0.06, 0.02], at: [-0.28, -0.13, 0.3], c: 'blush' }, { name: 'blushR', box: [0.16, 0.06, 0.02], at: [0.28, -0.13, 0.3], c: 'blush' }], at: [0, 0, 0], name: 'blush', pivot: true },
      ], at: [0, 1.62, 0], name: 'head', pivot: true },
    ],
  });
}

/* ------------------------------- full-body figures on the hero rig's joint names ------------------------------- */
const arm = (s, x) => ({ group: [{ name: `upper${s}`, box: [0.11, 0.25, 0.11], at: [0, -0.12, 0], c: 'scrub' },
  { group: [{ name: `fore${s}`, box: [0.1, 0.23, 0.1], at: [0, -0.11, 0], c: 'skin' },
    { group: [{ name: `glove${s}`, box: [0.12, 0.13, 0.12], at: [0, -0.06, 0], c: 'glove' }], at: [0, -0.23, 0], name: `Hand${s}`, pivot: true }], at: [0, -0.25, 0], name: `Forearm${s}`, pivot: true }],
at: [x, 0.36, 0], name: `Arm${s}`, pivot: true });
const leg = (s, x) => ({ group: [{ name: `thigh${s}`, box: [0.15, 0.3, 0.15], at: [0, -0.15, 0], c: 'scrub' },
  { group: [{ name: `shin${s}`, box: [0.13, 0.22, 0.13], at: [0, -0.11, 0], c: 'scrub' },
    { group: [{ name: `shoe${s}`, box: [0.15, 0.1, 0.28], at: [0, -0.05, 0.06], c: 'shoe' }], at: [0, -0.22, 0], name: `Foot${s}`, pivot: true }], at: [0, -0.3, 0], name: `Shin${s}`, pivot: true }],
at: [x, 0, 0], name: `Leg${s}`, pivot: true });
export function figureDef(id, overrides = {}) {
  const L = { ...CAST[id]?.look, ...overrides };
  const hair = L.style === 'bald' ? [] : L.style === 'bun' ? [{ name: 'hair', box: [0.34, 0.12, 0.34], at: [0, 0.3, -0.02], c: 'hair' }, { name: 'bun', ball: [0.16, 0.16, 0.16], at: [0, 0.4, -0.1], c: 'hair' }] : L.style === 'bob' ? [{ name: 'hair', box: [0.38, 0.26, 0.36], at: [0, 0.2, -0.04], c: 'hair' }] : [{ name: 'hair', box: [0.35, 0.13, 0.35], at: [0, 0.3, -0.01], c: 'hair' }];
  return model({
    id: `fig-${overrides.tag ?? id}`, about: `Full-body figure of ${CAST[id]?.full ?? id}`, tags: ['character', 'figure'], floats: true,
    palette: { scrub: L.scrub ?? 'teal', skin: L.skin ?? 'sand', glove: L.scrub === 'white' ? 'sand' : 'sky', shoe: 'night', hair: L.hair ?? 'ink', cap: L.cap ?? 'sky', mask: 'sky', ink: 'ink', white: 'white' },
    parts: [{ group: [{ name: 'hips', box: [0.36, 0.18, 0.22], at: [0, 0.02, 0], c: 'scrub' },
      { group: [{ name: 'chest', box: [0.38, 0.42, 0.24], at: [0, 0.22, 0], c: 'scrub' },
        { group: [{ name: 'skull', box: [0.3, 0.3, 0.3], at: [0, 0.16, 0], c: 'skin' }, ...hair,
          ...(L.cap ? [{ name: 'capb', box: [0.34, 0.12, 0.34], at: [0, 0.33, -0.01], c: 'cap' }] : []),
          ...(overrides.masked ? [{ name: 'mask', box: [0.31, 0.14, 0.05], at: [0, 0.09, 0.15], c: 'mask' }] : []),
          { name: 'eyeL', box: [0.05, 0.06, 0.02], at: [0.07, 0.19, 0.155], c: 'ink' }, { name: 'eyeR', box: [0.05, 0.06, 0.02], at: [-0.07, 0.19, 0.155], c: 'ink' }], at: [0, 0.44, 0], name: 'Head', pivot: true },
        arm('R', -0.25), arm('L', 0.25)], at: [0, 0.1, 0], name: 'Torso', pivot: true },
      leg('R', -0.14), leg('L', 0.14)], at: [0, 0.62, 0], name: 'Pelvis', pivot: true }],
  });
}

export const ALL_DEFS = [handDef(), ...Object.values(TOOL_DEFS), ...Object.values(PROP_DEFS), CROWN_EYE, WEEP_EYE, HALO_EYE, ...Object.keys(CAST).map(bustDef), ...Object.keys(CAST).map((id) => figureDef(id))];
export const CATALOG = new ModelCatalog([...MODEL_LIBRARY.all(), ...ALL_DEFS]);
