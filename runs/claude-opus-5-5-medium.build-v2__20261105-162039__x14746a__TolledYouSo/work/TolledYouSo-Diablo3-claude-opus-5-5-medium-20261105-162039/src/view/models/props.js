// Props the library lacks, and weapons drawn for this game.
import { model, ModelCatalog, MODEL_LIBRARY } from '../../../pixel-engine.js';
import * as heroes from './heroes.js';
import * as monsters from './monsters.js';

const P = (id, about, palette, parts, extra = {}) => model({ id, about, tags: ['prop'], palette, parts, ...extra });
export const gibbet = P('gibbet', 'Gibbet: an iron cage on a post', { post: 'night', iron: 'slate', rope: 'orange', bone: 'mist' }, [
  { box: [0.28, 3.4, 0.28], at: [0, 1.7, 0], c: 'post' }, { box: [1.5, 0.2, 0.2], at: [0.65, 3.3, 0], c: 'post' }, { box: [0.08, 0.4, 0.08], at: [1.2, 3, 0], c: 'rope' }, { box: [0.9, 0.08, 0.9], at: [1.2, 2.76, 0], c: 'iron' }, { box: [0.9, 0.08, 0.9], at: [1.2, 1.5, 0], c: 'iron' },
  { mirror: [{ mirror: [{ box: [0.08, 1.2, 0.08], at: [0.4, 2.12, 0.4], c: 'iron' }], axis: 'z' }], axis: 'x', at: [1.2, 0, 0] }, { box: [0.3, 0.5, 0.2], at: [1.2, 1.84, 0], c: 'bone' }, { box: [1, 0.2, 1], at: [0, 0.1, 0], c: 'iron' },
].map((p) => (p.mirror ? { group: [{ mirror: p.mirror, axis: p.axis }], at: p.at } : p)));
export const lychgate = P('lychgate', 'Lychgate: a roofed graveyard gate', { wood: 'orange', roof: 'plum', dark: 'ink', cross: 'sand', stone: 'slate' }, [
  { mirror: [{ box: [0.26, 2.3, 0.26], at: [1.1, 1.15, 0.8], c: 'wood' }, { box: [0.26, 2.3, 0.26], at: [1.1, 1.15, -0.8], c: 'wood' }, { box: [0.5, 0.3, 2], at: [1.1, 0.15, 0], c: 'stone' }], axis: 'x' },
  { wedge: [3.4, 0.9, 1.3], at: [0, 2.75, 0.65], rot: [0, 180, 0], c: 'roof' }, { wedge: [3.4, 0.9, 1.3], at: [0, 2.75, -0.65], c: 'roof' }, { box: [2.5, 0.2, 1.9], at: [0, 2.2, 0], c: 'dark' }, { box: [0.12, 0.8, 0.12], at: [0, 3.5, 0], c: 'cross' }, { box: [0.5, 0.12, 0.12], at: [0, 3.6, 0], c: 'cross' },
]);
export const roadgate = P('roadgate', 'The town gate and the road out', { stone: 'slate', dark: 'ink', wood: 'orange', flag: 'plum' }, [
  { mirror: [{ box: [0.9, 3.6, 0.9], at: [1.7, 1.8, 0], c: 'stone' }, { box: [1, 0.2, 1], at: [1.7, 3.7, 0], c: 'dark' }, { box: [0.5, 1, 0.08], at: [1.7, 2.4, 0.5], c: 'flag' }], axis: 'x' }, { box: [2.6, 0.5, 0.5], at: [0, 3.3, 0], c: 'wood' },
]);
export const exitstair = P('exitstair', 'A stair or doorway leading on', { stone: 'slate', dark: 'ink', step: 'mist', light: 'sand' }, [
  { box: [2.4, 0.2, 2.2], at: [0, 0.1, 0], c: 'dark' }, { box: [2, 0.1, 0.5], at: [0, 0.25, 0.65], c: 'step' }, { box: [2, 0.1, 0.5], at: [0, 0.15, 0.15], c: 'stone' }, { mirror: [{ box: [0.4, 2.2, 0.4], at: [1.15, 1.1, -0.9], c: 'stone' }], axis: 'x' }, { box: [2.7, 0.4, 0.5], at: [0, 2.4, -0.9], c: 'stone' }, { box: [1.3, 0.06, 0.2], at: [0, 2.14, -0.75], c: 'light', glow: true },
]);
export const votive = P('votive', 'Votive Shrine: a rack of candles', { wood: 'plum', dark: 'ink', wax: 'white', flame: 'orange', metal: 'sand' }, [
  { box: [1.2, 0.8, 0.5], at: [0, 0.4, 0], c: 'wood' }, { box: [1.3, 0.1, 0.6], at: [0, 0.85, 0], c: 'metal' }, { box: [1, 0.35, 0.1], at: [0, 1.05, -0.2], c: 'dark' },
  ...[-0.42, -0.14, 0.14, 0.42].flatMap((x, i) => [{ box: [0.1, 0.22 + (i % 2) * 0.1, 0.1], at: [x, 0.98 + (i % 2) * 0.05, 0.08], c: 'wax' }, { box: [0.07, 0.11, 0.07], at: [x, 1.16 + (i % 2) * 0.1, 0.08], c: 'flame', glow: true }]),
]);
export const knell_font = P('knell_font', 'The Knell Font: a dark bowl under a small bronze bell', { stone: 'night', dark: 'ink', bronze: 'orange', water: 'cyan', trim: 'sand' }, [
  { cyl: [1.6, 0.3, 1.6], at: [0, 0.15, 0], c: 'dark', seg: 10 }, { cyl: [0.6, 0.8, 0.6], at: [0, 0.7, 0], c: 'stone', seg: 8 }, { cyl: [1.5, 0.35, 1.5], at: [0, 1.2, 0], top: 1.2, c: 'stone', seg: 10 }, { cyl: [1.25, 0.06, 1.25], at: [0, 1.36, 0], c: 'water', glow: true, seg: 10 },
  { mirror: [{ box: [0.14, 2.4, 0.14], at: [0.82, 1.6, 0], c: 'dark' }], axis: 'x' }, { box: [1.8, 0.14, 0.14], at: [0, 2.75, 0], c: 'dark' }, { lathe: [[0.06, 0.52], [0.2, 0.42], [0.25, 0.2], [0.38, 0], [0.3, 0], [0.1, 0.3]], at: [0, 2.15, 0], c: 'bronze' }, { box: [0.08, 0.2, 0.08], at: [0, 2.05, 0], c: 'trim' },
]);
export const collection_box = P('collection_box', 'The Collection Box: a heavy iron-bound stash', { wood: 'plum', band: 'sand', dark: 'ink', slot: 'white' }, [
  { box: [1.3, 0.8, 0.9], at: [0, 0.5, 0], c: 'wood' }, { box: [1.34, 0.1, 0.94], at: [0, 0.9, 0], c: 'band' }, { box: [1.34, 0.1, 0.94], at: [0, 0.3, 0], c: 'band' }, { box: [0.5, 0.06, 0.1], at: [0, 0.96, 0], c: 'slot', glow: true }, { box: [1.4, 0.1, 1], at: [0, 0.05, 0], c: 'dark' },
]);
export const lectern = P('lectern', 'A lectern with a lore book', { wood: 'orange', dark: 'plum', page: 'white', ribbon: 'red' }, [
  { box: [0.2, 1, 0.2], at: [0, 0.5, 0], c: 'wood' }, { box: [0.7, 0.1, 0.5], at: [0, 0.05, 0], c: 'dark' }, { box: [0.8, 0.08, 0.6], at: [0, 1.05, 0], rot: [24, 0, 0], c: 'dark' }, { box: [0.66, 0.08, 0.46], at: [0, 1.12, 0], rot: [24, 0, 0], c: 'page' }, { box: [0.06, 0.03, 0.42], at: [0, 1.17, 0], rot: [24, 0, 0], c: 'ribbon' },
]);
export const rope = P('rope', 'A great bell rope hanging from the dark', { rope: 'orange', grip: 'white', dark: 'plum' }, [
  { box: [0.16, 7, 0.16], at: [0, 3.5, 0], c: 'rope' }, { box: [0.28, 1, 0.28], at: [0, 1.4, 0], c: 'grip' }, { box: [0.5, 0.1, 0.5], at: [0, 0.05, 0], c: 'dark' },
]);
export const portal = P('portal', 'The Passing Bell: a shimmering door and a little bell', { arc: 'sky', frame: 'ink', core: 'cyan', bronze: 'sand' }, [
  { torus: [2.2, 0.24, 2.2], at: [0, 1.3, 0], rot: [90, 0, 0], c: 'frame' }, { cyl: [1.7, 0.06, 1.7], at: [0, 1.3, 0], rot: [90, 0, 0], c: 'core', glow: true, seg: 12 }, { lathe: [[0.04, 0.3], [0.14, 0.2], [0.2, 0], [0.04, 0]], at: [0, 2.3, 0], c: 'bronze' },
]);
export const wagon = P('wagon', 'The wagon of bells', { wood: 'orange', dark: 'plum', bronze: 'sand', wheel: 'ink', rope: 'mist' }, [
  { box: [1.7, 0.3, 3], at: [0, 0.7, 0], c: 'wood' }, { mirror: [{ box: [0.1, 0.5, 3], at: [0.85, 1.05, 0], c: 'dark' }], axis: 'x' }, { box: [1.7, 0.5, 0.1], at: [0, 1.05, -1.45], c: 'dark' },
  { mirror: [{ cyl: [0.9, 0.16, 0.9], at: [0.95, 0.45, 0.95], rot: [0, 0, 90], c: 'wheel', seg: 8 }, { cyl: [0.9, 0.16, 0.9], at: [0.95, 0.45, -0.95], rot: [0, 0, 90], c: 'wheel', seg: 8 }], axis: 'x' },
  { lathe: [[0.08, 0.76], [0.28, 0.6], [0.34, 0.25], [0.52, 0], [0.04, 0]], at: [0, 0.85, 0.65], c: 'bronze' }, { lathe: [[0.06, 0.56], [0.22, 0.46], [0.26, 0.2], [0.4, 0], [0.04, 0]], at: [-0.3, 0.85, -0.5], c: 'bronze' }, { lathe: [[0.06, 0.5], [0.2, 0.42], [0.24, 0.16], [0.36, 0], [0.04, 0]], at: [0.36, 0.85, -0.6], c: 'bronze' },
  { box: [0.12, 0.12, 1.4], at: [0, 0.6, 2.1], c: 'dark' },
]);
export const i_censer = P('i_censer', 'A censer on a chain, as an off hand', { metal: 'sand', chain: 'mist', smoke: 'lime' }, [
  { ball: [0.28, 0.26, 0.28], at: [0, 0.14, 0], c: 'metal' }, { box: [0.04, 0.42, 0.04], at: [0, 0.45, 0], c: 'chain' }, { box: [0.14, 0.04, 0.14], at: [0, 0.3, 0], c: 'smoke', glow: true },
]);
export const hand_bell = P('hand_bell', 'The Bellwarden\'s great bell, on a handle', { bronze: 'orange', dark: 'plum', band: 'sand', grip: 'night' }, [
  { box: [0.1, 0.6, 0.1], at: [0, 1.0, 0], c: 'grip' }, { lathe: [[0.08, 0.68], [0.28, 0.54], [0.34, 0.25], [0.5, 0], [0.42, 0], [0.2, 0.3]], at: [0, 0, 0], c: 'bronze' }, { cyl: [0.7, 0.06, 0.7], at: [0, 0.22, 0], c: 'band', seg: 8 }, { box: [0.1, 0.2, 0.1], at: [0, 0.02, 0], c: 'dark' },
], { floats: true });
export const pallbearer_coffin = P('pallbearer_coffin', 'A lead-lined coffin that falls from the sky', { wood: 'plum', band: 'mist', dark: 'ink', cross: 'sand' }, [
  { box: [0.86, 0.5, 2], at: [0, 0.25, 0], c: 'wood' }, { box: [0.92, 0.1, 2.06], at: [0, 0.53, 0], c: 'dark' }, { box: [0.5, 0.05, 0.1], at: [0, 0.6, 0.4], c: 'cross' }, { box: [0.1, 0.05, 0.8], at: [0, 0.6, 0.4], c: 'cross' }, { box: [0.92, 0.08, 0.1], at: [0, 0.25, -0.5], c: 'band' }, { box: [0.92, 0.08, 0.1], at: [0, 0.25, 0.5], c: 'band' },
]);
export const iron_bell = P('iron_bell', 'A taunting iron bell on the ground', { iron: 'slate', dark: 'ink', band: 'orange' }, [
  { lathe: [[0.1, 1.2], [0.5, 1], [0.6, 0.4], [0.9, 0], [0.8, 0], [0.4, 0.5]], at: [0, 0, 0], c: 'iron' }, { cyl: [1.25, 0.08, 1.25], at: [0, 0.34, 0], c: 'band', seg: 8 },
]);
export const lamp_turret = P('lamp_turret', 'The Lamplighter\'s planted lamp post', { post: 'night', cap: 'orange', lamp: 'white', band: 'sand' }, [
  { box: [0.14, 2, 0.14], at: [0, 1, 0], c: 'post' }, { box: [0.5, 0.1, 0.5], at: [0, 0.05, 0], c: 'post' }, { box: [0.3, 0.32, 0.3], at: [0, 2.15, 0], c: 'lamp', glow: true }, { cone: [0.44, 0.2, 0.44], at: [0, 2.42, 0], c: 'cap' }, { box: [0.2, 0.05, 0.2], at: [0, 1.98, 0], c: 'band' },
]);
export const decoy = P('decoy', 'An ember decoy', { ember: 'orange', dark: 'ink', hot: 'sand' }, [
  { box: [0.4, 0.8, 0.3], at: [0, 0.45, 0], c: 'dark' }, { box: [0.28, 0.28, 0.28], at: [0, 1.0, 0], c: 'ember', glow: true }, { box: [0.18, 0.4, 0.1], at: [0, 0.5, 0.16], c: 'hot', glow: true },
]);
export const bone_wall = P('bone_wall', 'A jag of bone thrust out of the floor', { bone: 'white', dark: 'mist' }, [
  { cone: [0.5, 1.5, 0.5], at: [0, 0.75, 0], c: 'bone' }, { cone: [0.3, 0.8, 0.3], at: [0.28, 0.4, 0.1], c: 'dark' }, { cone: [0.26, 0.7, 0.26], at: [-0.26, 0.35, -0.12], c: 'dark' },
]);
export const belfry_pillar = P('belfry_pillar', 'A pillar to hide behind', { stone: 'slate', dark: 'night', crack: 'cyan' }, [
  { box: [1.6, 0.4, 1.6], at: [0, 0.2, 0], c: 'dark' }, { box: [1.2, 3.6, 1.2], at: [0, 2.1, 0], c: 'stone' }, { box: [1.6, 0.4, 1.6], at: [0, 4, 0], c: 'dark' }, { box: [0.1, 1.6, 0.04], at: [0.2, 2, 0.61], rot: [0, 0, 16], c: 'crack', glow: true },
]);
export const belfry_scene = P('belfry_scene', 'The Belfry as seen from afar on the title', { stone: 'night', dark: 'ink', lit: 'orange', bronze: 'sand', roof: 'navy' }, [
  { box: [6, 2.5, 6], at: [0, 1.25, 0], c: 'dark' }, { box: [4.6, 9, 4.6], at: [0, 7, 0], c: 'stone' }, { box: [5, 0.5, 5], at: [0, 11.6, 0], c: 'dark' }, { box: [3.8, 3.6, 3.8], at: [0, 13.6, 0], c: 'stone' }, { cone: [5.4, 5.6, 5.4], at: [0, 18.2, 0], c: 'roof' }, { box: [1.2, 2, 0.1], at: [0, 13.6, 1.92], c: 'lit', glow: true }, { box: [0.6, 1.2, 0.1], at: [1.3, 7, 2.32], c: 'lit', glow: true }, { box: [0.6, 1.2, 0.1], at: [-1.3, 5, 2.32], c: 'lit', glow: true }, { lathe: [[0.14, 1.2], [0.48, 1], [0.58, 0.4], [0.86, 0], [0.04, 0]], at: [0, 12.6, 0], c: 'bronze' },
]);
export const plinth = P('plinth', 'A stone plinth for choosing heroes', { stone: 'slate', dark: 'ink', trim: 'sand' }, [
  { cyl: [2.2, 0.3, 2.2], at: [0, 0.15, 0], c: 'dark', seg: 10 }, { cyl: [1.8, 0.2, 1.8], at: [0, 0.4, 0], c: 'stone', seg: 10 }, { cyl: [1.82, 0.04, 1.82], at: [0, 0.5, 0], c: 'trim', seg: 10 },
]);

export const OWN_MODELS = [...Object.values(heroes), ...Object.values(monsters)].filter((m) => m && m.id);
const props = [gibbet, lychgate, roadgate, exitstair, votive, knell_font, collection_box, lectern, rope, portal, wagon, i_censer, hand_bell, pallbearer_coffin, iron_bell, lamp_turret, decoy, bone_wall, belfry_pillar, belfry_scene, plinth];
export const ALL_OWN = [...OWN_MODELS, ...props];
export const MODELS = new ModelCatalog([...MODEL_LIBRARY.all(), ...ALL_OWN]);
export { props };
