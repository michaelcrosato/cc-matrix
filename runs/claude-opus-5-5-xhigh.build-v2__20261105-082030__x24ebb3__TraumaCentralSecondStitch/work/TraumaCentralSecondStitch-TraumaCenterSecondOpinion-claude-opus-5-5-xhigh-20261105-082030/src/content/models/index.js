// The game's own models: instruments, hands, things found inside people, things that should not be.
// Plain data in a module of its own, so `node check.mjs --sheets src/content/models/index.js` can draw them.
import { model, MODEL_LIBRARY, ModelCatalog } from '../../../pixel-engine.js';
import { BUSTS, FIGURES } from './cast.js';

const T = (id, about, palette, parts, extra = {}) => model({ id, about, tags: ['tool', 'surgery'], floats: true, palette, parts, ...extra });
const E = (id, about, palette, parts, extra = {}) => model({ id, about, tags: ['surgery', 'prop'], floats: true, palette, parts, ...extra });

// ---------------------------------------------------------------- The hand
export const handDef = model({
  id: 'glove-hand', about: 'Gloved surgeon hand gripping a shaft, wrist toward +Z', tags: ['character', 'hand'], floats: true,
  palette: { glove: 'sky', fold: 'blue', sleeve: 'teal' },
  parts: [
    { name: 'palm', box: [0.72, 0.3, 0.8], at: [0, 0, 0], c: 'glove' }, { name: 'knuck', box: [0.74, 0.16, 0.14], at: [0, 0.12, -0.34], c: 'fold' },
    ...[-0.27, -0.09, 0.09, 0.27].flatMap((x, i) => [{ name: `f${i}a`, box: [0.16, 0.16, 0.34], at: [x, 0.05, -0.56], rot: [18, 0, 0], c: 'glove' }, { name: `f${i}b`, box: [0.15, 0.15, 0.26], at: [x, -0.09, -0.76], rot: [58, 0, 0], c: 'glove' }]),
    { name: 'thumb', box: [0.18, 0.18, 0.5], at: [-0.44, -0.04, -0.26], rot: [10, -28, 0], c: 'glove' },
    { name: 'cuff', cyl: [0.62, 0.62, 0.3], at: [0, 0, 0.54], rot: [90, 0, 0], c: 'fold' }, { name: 'wrist', cyl: [0.56, 1.6, 0.56], at: [0, 0, 1.46], rot: [90, 0, 0], c: 'glove' },
    { name: 'sleeve', cyl: [0.8, 2.6, 0.8], at: [0, 0, 3.4], rot: [90, 0, 0], c: 'sleeve' },
  ],
});

// ---------------------------------------------------------------- Instruments: tip at the origin, pointing -Z
export const scalpelDef = T('tool-scalpel', 'Scalpel: bright blade on a steel handle', { steel: 'mist', edge: 'white', dark: 'slate' }, [
  { name: 'tip', cone: [0.06, 0.26, 0.14], at: [0, 0.06, 0.1], rot: [-90, 0, 0], c: 'edge' },
  { name: 'blade', box: [0.06, 0.2, 0.44], at: [0, 0.08, 0.42], c: 'edge' },
  { name: 'handle', box: [0.15, 0.13, 1.4], at: [0, 0.08, 1.32], c: 'steel' },
  { name: 'grip', box: [0.17, 0.15, 0.42], at: [0, 0.08, 1.36], c: 'dark' },
]);
export const forcepsDef = T('tool-forceps', 'Forceps: two long steel arms that pinch at the tip', { steel: 'mist', edge: 'white', dark: 'slate' }, [
  { group: [{ name: 'armLo', box: [0.08, 0.09, 1.45], at: [0, 0, -0.72], c: 'steel' }, { name: 'jawL', box: [0.11, 0.11, 0.2], at: [0.01, 0, -1.42], c: 'edge' }], at: [-0.1, 0.06, 1.45], rot: [0, -4, 0], name: 'armL', pivot: true },
  { group: [{ name: 'armRo', box: [0.08, 0.09, 1.45], at: [0, 0, -0.72], c: 'steel' }, { name: 'jawR', box: [0.11, 0.11, 0.2], at: [-0.01, 0, -1.42], c: 'edge' }], at: [0.1, 0.06, 1.45], rot: [0, 4, 0], name: 'armR', pivot: true },
  { name: 'hinge', box: [0.3, 0.14, 0.3], at: [0, 0.06, 1.5], c: 'dark' },
  { name: 'grip', cyl: [0.18, 0.5, 0.18], at: [0, 0.06, 1.85], rot: [90, 0, 0], c: 'steel' },
]);
export const sutureDef = T('tool-suture', 'Needle holder with a curved needle and blue thread', { steel: 'mist', edge: 'white', thread: 'sky', dark: 'slate' }, [
  { name: 'needle', tube: [[0, 0, 0], [0.1, 0.03, 0.05], [0.2, 0.1, 0.16], [0.22, 0.2, 0.3], [0.14, 0.28, 0.42]], r: 0.04, c: 'edge' },
  { name: 'thread', tube: [[0.14, 0.28, 0.42], [-0.08, 0.34, 0.5], [-0.3, 0.2, 0.7], [-0.46, 0.34, 1.0]], r: 0.035, c: 'thread' },
  { name: 'jaw', box: [0.14, 0.12, 0.3], at: [0.1, 0.32, 0.56], c: 'dark' },
  { name: 'handle', box: [0.14, 0.11, 1.2], at: [0.1, 0.32, 1.26], c: 'steel' },
]);
export const drainDef = T('tool-drain', 'Suction wand with a wide nozzle and a hose', { body: 'sky', stripe: 'white', dark: 'navy' }, [
  { name: 'nozzle', cyl: [0.28, 0.3, 0.28], at: [0, 0.03, 0.14], rot: [90, 0, 0], top: 0.7, c: 'dark' },
  { name: 'wand', cyl: [0.2, 1.5, 0.2], at: [0, 0.03, 1.02], rot: [90, 0, 0], c: 'body' },
  { name: 'stripe', cyl: [0.22, 0.14, 0.22], at: [0, 0.03, 0.64], rot: [90, 0, 0], c: 'stripe' },
  { name: 'hose', tube: [[0, 0.03, 1.76], [0.12, 0.2, 2.2], [0.4, 0.2, 2.8], [0.5, 0.4, 3.4]], r: 0.09, c: 'dark' },
]);
export const syringeDef = T('tool-syringe', 'Syringe with a moving plunger and a bright dose inside', { glass: 'mist', dose: 'cyan', steel: 'white', cap: 'slate' }, [
  { name: 'needle', cyl: [0.06, 0.5, 0.06], at: [0, 0.03, 0.25], rot: [90, 0, 0], c: 'steel' },
  { name: 'hub', cyl: [0.14, 0.12, 0.14], at: [0, 0.03, 0.54], rot: [90, 0, 0], c: 'cap' },
  { name: 'barrel', cyl: [0.32, 0.9, 0.32], at: [0, 0.03, 1.04], rot: [90, 0, 0], c: 'glass' },
  { name: 'dose', box: [0.2, 0.34, 0.76], at: [0, 0.03, 1.0], c: 'dose' },
  { name: 'flange', box: [0.6, 0.08, 0.08], at: [0, 0.03, 1.5], c: 'cap' },
  { group: [{ name: 'rod', box: [0.1, 0.1, 0.8], at: [0, 0, 0.4], c: 'steel' }, { name: 'thumbrest', box: [0.34, 0.08, 0.08], at: [0, 0, 0.82], c: 'cap' }], at: [0, 0.03, 1.5], name: 'plunger', pivot: true },
]);
export const gelDef = T('tool-gel', 'Squeeze bottle of wound gel', { body: 'lime', cap: 'teal', label: 'white' }, [
  { name: 'nozzle', cone: [0.14, 0.3, 0.14], at: [0, 0.03, 0.14], rot: [-90, 0, 0], c: 'cap' },
  { name: 'collar', cyl: [0.3, 0.14, 0.3], at: [0, 0.03, 0.36], rot: [90, 0, 0], c: 'cap' },
  { group: [{ name: 'bottle', cyl: [0.54, 1.0, 0.54], at: [0, 0, 0], rot: [90, 0, 0], c: 'body' }, { name: 'label', box: [0.56, 0.3, 0.46], at: [0, 0.02, 0.05], c: 'label' }], at: [0, 0.03, 0.92], name: 'bottle', pivot: true },
]);
export const laserDef = T('tool-laser', 'Laser pen with a hot red tip', { body: 'night', trim: 'orange', hot: 'red', steel: 'mist' }, [
  { name: 'hot', ball: [0.14, 0.14, 0.14], at: [0, 0.03, 0.04], c: 'hot', glow: true },
  { name: 'nose', cyl: [0.18, 0.3, 0.18], at: [0, 0.03, 0.26], rot: [90, 0, 0], top: 0.65, c: 'steel' },
  { name: 'pen', cyl: [0.24, 1.3, 0.24], at: [0, 0.03, 1.06], rot: [90, 0, 0], c: 'body' },
  { name: 'trim', cyl: [0.27, 0.12, 0.27], at: [0, 0.03, 0.62], rot: [90, 0, 0], c: 'trim' },
  { name: 'button', box: [0.1, 0.06, 0.22], at: [0, 0.17, 0.98], c: 'trim' },
]);
export const scannerDef = T('tool-scanner', 'Handheld scanner: a ring and a handle', { ring: 'cyan', body: 'slate', handle: 'night' }, [
  { name: 'ring', torus: [1.5, 0.1, 1.5], at: [0, 0.2, 0], c: 'ring', glow: true },
  { name: 'neck', box: [0.16, 0.14, 0.7], at: [0, 0.22, 0.98], c: 'body' },
  { name: 'handle', box: [0.2, 0.18, 0.96], at: [0, 0.22, 1.76], c: 'handle' },
]);
export const dressingDef = T('tool-dressing', 'Roll of white dressing strip', { cloth: 'white', core: 'mist', tab: 'sand' }, [
  { name: 'roll', cyl: [0.6, 0.48, 0.6], at: [0, 0.16, 0.3], rot: [0, 0, 90], c: 'cloth' },
  { name: 'core', cyl: [0.24, 0.5, 0.24], at: [0, 0.16, 0.3], rot: [0, 0, 90], c: 'core' },
  { name: 'tab', box: [0.42, 0.06, 0.5], at: [0, 0.03, -0.05], c: 'tab' },
  { name: 'handle', box: [0.14, 0.12, 1.4], at: [0, 0.3, 1.2], c: 'core' },
]);
export const paddleDef = T('tool-paddle', 'Defibrillator paddle: steel plate and insulated handle', { plate: 'white', body: 'night', trim: 'red' }, [
  { name: 'plate', box: [1, 0.08, 0.76], at: [0, 0.04, 0], c: 'plate' },
  { name: 'body', box: [0.86, 0.24, 0.6], at: [0, 0.2, 0.02], c: 'body' },
  { name: 'trim', box: [0.3, 0.08, 0.14], at: [0, 0.34, -0.1], c: 'trim' },
  { name: 'handle', box: [0.26, 0.26, 1.1], at: [0, 0.34, 0.76], c: 'body' },
]);
export const TOOL_DEFS = { scalpel: scalpelDef, forceps: forcepsDef, suture: sutureDef, drain: drainDef, syringe: syringeDef, gel: gelDef, laser: laserDef, scanner: scannerDef, dressing: dressingDef, paddle: paddleDef };

// ---------------------------------------------------------------- Things found in people
export const hookDef = E('e-hook', 'A rusty barbed fishhook', { steel: 'mist', rust: 'orange', tip: 'white' }, [
  { name: 'shank', tube: [[0, 0.1, 0], [0.02, 0.18, 0.18], [0.02, 0.34, 0.36]], r: 0.05, c: 'steel' },
  { name: 'bend', tube: [[0, 0.1, 0], [-0.14, 0.08, -0.1], [-0.28, 0.14, -0.04], [-0.32, 0.22, 0.1]], r: 0.05, c: 'rust' },
  { name: 'barb', cone: [0.1, 0.14, 0.1], at: [-0.33, 0.26, 0.14], rot: [20, 0, 0], c: 'tip' },
  { name: 'eye', torus: [0.16, 0.05, 0.16], at: [0.02, 0.38, 0.4], rot: [90, 0, 0], c: 'steel' },
]);
export const keyDef = E('e-key', 'A brass key', { brass: 'sand', dark: 'orange' }, [
  { name: 'bow', torus: [0.34, 0.08, 0.34], at: [0, 0.08, -0.26], c: 'brass' },
  { name: 'stem', box: [0.09, 0.08, 0.56], at: [0, 0.08, 0.12], c: 'brass' },
  { name: 'tooth1', box: [0.18, 0.08, 0.08], at: [0.1, 0.08, 0.36], c: 'dark' }, { name: 'tooth2', box: [0.14, 0.08, 0.08], at: [0.09, 0.08, 0.22], c: 'dark' },
]);
export const coinDef = E('e-coin', "A magician's silver half-dollar", { silver: 'white', edge: 'mist', mark: 'slate' }, [
  { name: 'coin', cyl: [0.5, 0.08, 0.5], at: [0, 0.08, 0], c: 'silver', seg: 12 },
  { name: 'rim', torus: [0.5, 0.06, 0.5], at: [0, 0.09, 0], c: 'edge' },
  { name: 'mark', box: [0.16, 0.03, 0.2], at: [0, 0.13, 0], c: 'mark' },
]);
export const cardDef = E('e-card', 'A swallowed seven of clubs', { card: 'white', ink: 'ink', back: 'red' }, [
  { name: 'back', box: [0.42, 0.04, 0.6], at: [0, 0.06, 0], c: 'back' },
  { name: 'face', box: [0.38, 0.03, 0.56], at: [0, 0.09, 0], c: 'card' },
  ...[[-0.09, -0.16], [0.09, -0.16], [0, -0.05], [-0.09, 0.06], [0.09, 0.06], [0, 0.17], [0, 0.0]].map(([x, z], i) => ({ name: `pip${i}`, box: [0.05, 0.02, 0.05], at: [x, 0.11, z], c: 'ink' })),
]);
export const magnetDef = E('e-magnet', 'Two horseshoe magnets stuck together', { red: 'red', tip: 'white', red2: 'plum' }, [
  { mirror: [{ name: 'horse', torus: [0.42, 0.14, 0.42], at: [0.2, 0.12, 0], c: 'red' }, { name: 'tipA', box: [0.12, 0.14, 0.12], at: [0.03, 0.12, 0.14], c: 'tip' }, { name: 'tipB', box: [0.12, 0.14, 0.12], at: [0.03, 0.12, -0.14], c: 'tip' }], axis: 'x' },
]);
export const shardDef = E('e-shard', 'A jagged shard of ferry hull', { steel: 'slate', paint: 'white', rust: 'orange' }, [
  { name: 'shard', slab: [[-0.28, -0.2], [0.04, -0.34], [0.32, -0.08], [0.1, 0.34], [-0.14, 0.14]], depth: 0.12, at: [0, 0.14, 0], rot: [90, 0, 0], c: 'steel' },
  { name: 'paint', box: [0.16, 0.04, 0.26], at: [0.02, 0.22, -0.02], c: 'paint' },
]);
export const boltDef = E('e-bolt', 'A bolt from a ferry railing', { steel: 'mist', dark: 'slate' }, [
  { name: 'head', cyl: [0.34, 0.14, 0.34], at: [0, 0.22, -0.26], rot: [90, 0, 0], c: 'dark', seg: 6 },
  { name: 'shaft', cyl: [0.14, 0.54, 0.14], at: [0, 0.18, 0.08], rot: [90, 0, 0], c: 'steel' },
]);
export const strandDef = E('e-strand', 'A pale strand of symbiont', { pale: 'white', gold: 'sand' }, [
  { name: 'strand', tube: [[-0.3, 0.1, 0.1], [-0.1, 0.2, -0.06], [0.1, 0.14, 0.08], [0.3, 0.2, -0.08]], r: 0.09, c: 'pale' },
  { name: 'knot', ball: [0.22, 0.2, 0.22], at: [0, 0.2, 0], c: 'gold' },
]);
export const tumorDef = E('e-tumor', 'A lumpy, wrong-coloured tumour', { flesh: 'plum', hot: 'red', pale: 'orange' }, [
  { name: 'mass', lump: [1.2, 0.7, 1.1], at: [0, 0.3, 0], c: 'flesh', seed: 4 },
  { name: 'knob1', lump: [0.5, 0.36, 0.46], at: [0.32, 0.56, 0.2], c: 'hot', seed: 2 },
  { name: 'knob2', lump: [0.4, 0.3, 0.42], at: [-0.34, 0.5, -0.24], c: 'pale', seed: 7 },
]);
export const polypDef = E('e-polyp', 'A wet red polyp on a short stalk', { flesh: 'red', tip: 'orange', base: 'plum' }, [
  { name: 'stalk', cyl: [0.24, 0.2, 0.24], at: [0, 0.1, 0], c: 'base' },
  { name: 'head', ball: [0.5, 0.42, 0.5], at: [0, 0.32, 0], c: 'flesh' },
  { name: 'tip', ball: [0.2, 0.14, 0.2], at: [0.04, 0.52, 0.04], c: 'tip' },
]);
export const eggDef = E('e-egg', 'A glistening strain egg', { shell: 'lime', vein: 'green', dark: 'teal' }, [
  { name: 'egg', ball: [0.56, 0.7, 0.56], at: [0, 0.36, 0], c: 'shell' },
  { name: 'vein', box: [0.1, 0.54, 0.58], at: [0.06, 0.36, 0], c: 'vein' },
  { name: 'base', ball: [0.52, 0.2, 0.52], at: [0, 0.08, 0], c: 'dark' },
]);
export const cystDef = E('e-cyst', 'A smooth little cyst, healthy looking', { skin: 'sand', high: 'white', base: 'orange' }, [
  { name: 'dome', ball: [0.7, 0.46, 0.7], at: [0, 0.2, 0], c: 'skin', half: true },
  { name: 'shine', ball: [0.18, 0.1, 0.18], at: [-0.1, 0.42, -0.1], c: 'high' },
  { name: 'ring', torus: [0.8, 0.06, 0.8], at: [0, 0.03, 0], c: 'base' },
]);
export const clotDef = E('e-clot', 'A dark hidden blood clot', { clot: 'plum', dark: 'ink', hot: 'red' }, [
  { name: 'clot', lump: [0.7, 0.42, 0.7], at: [0, 0.2, 0], c: 'clot', seed: 5 },
  { name: 'core', lump: [0.3, 0.2, 0.3], at: [0.1, 0.36, -0.06], c: 'dark', seed: 3 },
  { name: 'rim', box: [0.1, 0.06, 0.2], at: [-0.22, 0.4, 0.1], c: 'hot' },
]);
export const clampDef = E('e-clamp', 'A steel vessel clamp', { steel: 'white', dark: 'mist', grip: 'blue' }, [
  { name: 'jawA', box: [0.1, 0.1, 0.62], at: [-0.1, 0.12, -0.14], rot: [0, 6, 0], c: 'steel' }, { name: 'jawB', box: [0.1, 0.1, 0.62], at: [0.1, 0.12, -0.14], rot: [0, -6, 0], c: 'steel' },
  { name: 'hinge', ball: [0.24, 0.18, 0.24], at: [0, 0.14, 0.18], c: 'dark' },
  { name: 'ringA', torus: [0.26, 0.07, 0.26], at: [-0.18, 0.14, 0.42], c: 'grip' }, { name: 'ringB', torus: [0.26, 0.07, 0.26], at: [0.18, 0.14, 0.42], c: 'grip' },
]);
export const kidneyDef = E('e-kidney', 'A kidney-bean organ', { flesh: 'plum', high: 'red', vessel: 'sand' }, [
  { name: 'bean', slab: [[-0.8, 0.3], [-0.5, 0.75], [0.1, 0.85], [0.7, 0.55], [0.9, 0], [0.7, -0.55], [0.1, -0.85], [-0.5, -0.75], [-0.8, -0.3], [-0.4, -0.2], [-0.3, 0], [-0.4, 0.2]], depth: 0.6, at: [0, 0.36, 0], rot: [90, 0, 0], c: 'flesh' },
  { name: 'shine', ball: [0.7, 0.2, 0.5], at: [0.3, 0.68, -0.2], c: 'high' },
  { name: 'hilum', cyl: [0.2, 0.4, 0.2], at: [-0.76, 0.3, 0], rot: [0, 0, 90], c: 'vessel' },
]);
export const FRAGMENT_SHAPES = [
  [[-0.46, -0.2], [0.34, -0.26], [0.5, -0.04], [0.32, 0.26], [-0.4, 0.2], [-0.5, 0]],
  [[-0.5, -0.24], [0.3, -0.2], [0.46, 0.06], [0.2, 0.26], [-0.34, 0.24]],
  [[-0.42, -0.26], [0.42, -0.22], [0.5, 0.1], [0.28, 0.26], [-0.46, 0.2]],
  [[-0.5, -0.2], [0.44, -0.26], [0.34, 0.26], [-0.28, 0.26], [-0.48, 0.06]],
  [[-0.38, -0.26], [0.5, -0.2], [0.44, 0.2], [-0.2, 0.28], [-0.5, 0.04]],
  [[-0.46, -0.2], [0.36, -0.24], [0.5, 0.12], [-0.3, 0.26]],
];
export const fragmentDefs = FRAGMENT_SHAPES.map((outline, i) => E(`e-fragment${i + 1}`, 'A jagged fragment of forearm bone', { bone: 'white', shade: 'sand' }, [
  { name: 'bone', slab: outline, depth: 0.3, at: [0, 0.2, 0], rot: [90, 0, 0], c: 'bone' },
  { name: 'marrow', box: [0.24, 0.04, 0.16], at: [0.04, 0.36, 0], c: 'shade' },
]));
export const dishDef = E('e-dish', 'A steel kidney dish', { steel: 'mist', inner: 'slate', rim: 'white' }, [
  { name: 'bowl', lathe: [[0.02, 0], [0.7, 0.02], [0.82, 0.22], [0.76, 0.24], [0.62, 0.08], [0.02, 0.06]], at: [0, 0, 0], c: 'steel' },
  { name: 'inner', cyl: [1.2, 0.03, 1.2], at: [0, 0.08, 0], c: 'inner' },
]);
export const iceTrayDef = E('e-icetray', 'A tray of crushed ice for the donor organ', { steel: 'mist', ice: 'white', ice2: 'cyan' }, [
  { name: 'tray', box: [2.3, 0.2, 1.6], at: [0, 0.1, 0], c: 'steel' },
  { name: 'ice', lump: [2, 0.2, 1.3], at: [0, 0.26, 0], c: 'ice', seed: 9 },
  ...[[-0.6, -0.3], [0.5, 0.3], [0.1, -0.4], [-0.3, 0.4]].map(([x, z], i) => ({ name: `shard${i}`, lump: [0.3, 0.22, 0.3], at: [x, 0.38, z], c: 'ice2', seed: i + 2 })),
]);
export const retractorDef = E('e-retractor', 'A steel retractor holding the field open', { steel: 'mist', dark: 'slate' }, [
  { name: 'blade', box: [1.7, 0.1, 0.4], at: [0, 0.12, 0], c: 'steel' },
  { name: 'lip', box: [1.7, 0.3, 0.1], at: [0, 0.2, 0.2], c: 'dark' },
  { name: 'arm', box: [0.2, 0.14, 1.1], at: [0, 0.2, 0.74], c: 'steel' },
]);

// ---------------------------------------------------------------- Strains
export const introitCoreDef = E('s-introit-core', 'The Knock: a dark bristling core on a wet tether', { core: 'night', hot: 'lime', spine: 'plum' }, [
  { name: 'core', lump: [0.8, 0.7, 0.8], at: [0, 0.4, 0], c: 'core', seed: 3 },
  { name: 'hot', ball: [0.32, 0.26, 0.32], at: [0, 0.7, 0.12], c: 'hot', glow: true },
  ...[0, 60, 120, 180, 240, 300].map((a, i) => ({ name: `spine${i}`, cone: [0.14, 0.4, 0.14], at: [Math.cos((a * Math.PI) / 180) * 0.46, 0.4, Math.sin((a * Math.PI) / 180) * 0.46], rot: [Math.sin((a * Math.PI) / 180) * 70, 0, -Math.cos((a * Math.PI) / 180) * 70], c: 'spine' })),
]);
export const weeperEyeDef = E('s-weeper-eye', 'The Weeper: an eye that opens in the lung', { lid: 'plum', white: 'white', iris: 'sky', pupil: 'ink', vein: 'red' }, [
  { name: 'white', ball: [0.92, 0.5, 0.82], at: [0, 0.2, 0], c: 'white', half: true },
  { group: [{ name: 'iris', ball: [0.5, 0.2, 0.5], at: [0, 0, 0], c: 'iris', glow: true }, { name: 'pupil', ball: [0.24, 0.12, 0.24], at: [0, 0.08, 0], c: 'pupil' }], at: [0, 0.46, 0.04], name: 'iris', pivot: true },
  { name: 'vein', box: [0.34, 0.04, 0.05], at: [-0.26, 0.4, -0.1], rot: [0, 30, 0], c: 'vein' },
  { group: [{ name: 'lidTop', ball: [1.04, 0.56, 0.56], at: [0, 0, 0.02], c: 'lid', half: true }], at: [0, 0.14, -0.2], name: 'lidA', pivot: true },
  { group: [{ name: 'lidBot', ball: [1.04, 0.56, 0.56], at: [0, 0, -0.02], c: 'lid', half: true }], at: [0, 0.14, 0.2], name: 'lidB', pivot: true },
  { group: [{ name: 'capShut', ball: [1.1, 0.72, 1], at: [0, 0.24, 0], c: 'lid' }, { name: 'slit', box: [0.74, 0.06, 0.07], at: [0, 0.6, 0], c: 'pupil' }, { name: 'lashes', box: [0.5, 0.06, 0.2], at: [0, 0.58, 0.06], c: 'vein' }], at: [0, 0, 0], name: 'shut', pivot: true },
]);
export const wrathPlateDef = E('s-wrath-plate', 'The Wrath: a red bone plate of its crown', { plate: 'red', edge: 'orange', dark: 'plum' }, [
  { name: 'plate', slab: [[-0.46, -0.3], [0.46, -0.3], [0.56, 0.1], [0, 0.46], [-0.56, 0.1]], depth: 0.2, at: [0, 0.18, 0], rot: [90, 0, 0], c: 'plate' },
  { name: 'ridge', box: [0.16, 0.1, 0.64], at: [0, 0.32, 0], c: 'edge' },
  { name: 'under', box: [0.76, 0.05, 0.4], at: [0, 0.05, 0], c: 'dark' },
]);
export const wrathEyeDef = E('s-wrath-eye', 'The Wrath: its eye, burning at the centre of the crown', { socket: 'plum', eye: 'orange', pupil: 'ink', hot: 'sand' }, [
  { name: 'socket', ball: [1.3, 0.5, 1.3], at: [0, 0.2, 0], c: 'socket', half: true },
  { name: 'eye', ball: [0.9, 0.46, 0.9], at: [0, 0.38, 0], c: 'eye', glow: true },
  { name: 'hot', ball: [0.5, 0.24, 0.5], at: [0, 0.54, 0], c: 'hot', glow: true },
  { name: 'pupil', box: [0.14, 0.1, 0.52], at: [0, 0.64, 0], c: 'pupil' },
]);
export const miserereDef = E('s-miserere', 'Miserere: a pale, beautiful, gold-haloed core', { pale: 'white', gold: 'sand', shade: 'mist', eye: 'ink' }, [
  { name: 'body', ball: [1.5, 1.1, 1.3], at: [0, 0.6, 0], c: 'pale' },
  { name: 'shade', ball: [1.2, 0.5, 1.04], at: [0, 0.3, 0.04], c: 'shade' },
  { name: 'halo', torus: [2.1, 0.12, 2.1], at: [0, 1.0, 0], c: 'gold', glow: true },
  { mirror: [{ name: 'eye', box: [0.2, 0.05, 0.08], at: [0.24, 0.86, 0.6], c: 'eye' }], axis: 'x' },
  { name: 'mouth', box: [0.3, 0.04, 0.05], at: [0, 0.6, 0.65], c: 'gold' },
]);
export const haloDef = E('s-halo', 'A gold mote of the halo', { gold: 'sand', hot: 'white', edge: 'orange' }, [
  { name: 'mote', ball: [0.56, 0.56, 0.56], at: [0, 0.4, 0], c: 'gold', glow: true },
  { name: 'hot', ball: [0.26, 0.26, 0.26], at: [0, 0.44, 0], c: 'hot', glow: true },
  { name: 'ring', torus: [0.8, 0.05, 0.8], at: [0, 0.4, 0], c: 'edge' },
]);
export const paleCoreDef = E('s-pale-core', 'The last of the pale strain: a soft curled knot', { pale: 'white', shade: 'mist', gold: 'sand' }, [
  { name: 'knot', ball: [0.9, 0.6, 0.8], at: [0, 0.32, 0], c: 'pale' },
  { name: 'shade', ball: [0.7, 0.3, 0.6], at: [0, 0.16, 0.04], c: 'shade' },
  { name: 'heart', ball: [0.26, 0.2, 0.26], at: [0, 0.62, 0], c: 'gold', glow: true },
]);

export const ENT_DEFS = [hookDef, keyDef, coinDef, cardDef, magnetDef, shardDef, boltDef, strandDef, tumorDef, polypDef, eggDef, cystDef, clotDef, clampDef, kidneyDef, ...fragmentDefs, dishDef, iceTrayDef, retractorDef];
export const STRAIN_DEFS = [introitCoreDef, weeperEyeDef, wrathPlateDef, wrathEyeDef, miserereDef, haloDef, paleCoreDef];

export const GAME_MODELS = [handDef, ...Object.values(TOOL_DEFS), ...ENT_DEFS, ...STRAIN_DEFS, ...Object.values(BUSTS), ...Object.values(FIGURES)];
export const MODELS = new ModelCatalog([...MODEL_LIBRARY.all(), ...GAME_MODELS]);
export { BUSTS, FIGURES };
