// The three trades and the townsfolk.
import { model } from '../../../pixel-engine.js';
import { eyes, foot, hand, humanoid, limb } from './rig.js';

const helmTier = {};
export const hero_bellwarden = model({
  id: 'hero_bellwarden', about: 'Bellwarden: cowl, square shoulders, bronze trim', tags: ['hero'],
  palette: { robe: 'plum', trim: 'orange', skin: 'sand', dark: 'ink', metal: 'mist', eye: 'white' },
  parts: humanoid({
    hips: [{ box: [0.4, 0.2, 0.26], at: [0, -0.02, 0], c: 'robe' }, { box: [0.44, 0.05, 0.28], at: [0, 0.07, 0], c: 'trim' }],
    chest: [
      { box: [0.48, 0.44, 0.3], at: [0, 0.2, 0], c: 'robe' }, { box: [0.14, 0.42, 0.03], at: [0, 0.2, 0.15], c: 'trim' },
      { mirror: [{ box: [0.2, 0.14, 0.34], at: [0.27, 0.41, 0], c: 'trim' }], axis: 'x' },
    ],
    head: [
      { box: [0.26, 0.26, 0.26], at: [0, 0.13, 0], c: 'skin' }, { box: [0.34, 0.2, 0.34], at: [0, 0.2, -0.03], c: 'robe' }, { box: [0.3, 0.1, 0.34], at: [0, 0.3, -0.02], c: 'dark' },
      { box: [0.36, 0.08, 0.36], at: [0, 0.02, -0.02], c: 'robe' }, { box: [0.2, 0.05, 0.03], at: [0, 0.14, 0.14], c: 'dark' },
    ],
    upperArm: [limb(0.15, 0.25, 'robe')], foreArm: [limb(0.13, 0.17, 'trim')], handR: hand('metal'), handL: hand('metal'),
    thigh: [limb(0.18, 0.3, 'robe')], shin: [limb(0.15, 0.22, 'dark')], foot: foot('trim'),
  }),
});
export const hero_lamplighter = model({
  id: 'hero_lamplighter', about: 'Lamplighter: wide-brim hat, long coat, lamp pole on the back', tags: ['hero'],
  palette: { coat: 'navy', trim: 'sand', skin: 'sand', dark: 'ink', pole: 'orange', lamp: 'white', hat: 'night' },
  parts: humanoid({
    hips: [{ box: [0.36, 0.24, 0.26], at: [0, -0.04, 0], c: 'coat' }, { box: [0.4, 0.4, 0.3], at: [0, -0.26, -0.03], c: 'coat' }],
    chest: [
      { box: [0.4, 0.44, 0.27], at: [0, 0.2, 0], c: 'coat' }, { box: [0.08, 0.42, 0.03], at: [0, 0.2, 0.14], c: 'trim' },
      { box: [0.07, 1.25, 0.07], at: [0.1, 0.42, -0.18], c: 'pole' }, { box: [0.32, 0.06, 0.06], at: [0.1, 1, -0.18], c: 'pole' }, { box: [0.17, 0.2, 0.17], at: [0.24, 0.88, -0.18], c: 'lamp', glow: true },
    ],
    head: [
      { box: [0.24, 0.24, 0.24], at: [0, 0.12, 0], c: 'skin' }, { cyl: [0.62, 0.05, 0.62], at: [0, 0.24, 0], c: 'hat', seg: 8 }, { cyl: [0.3, 0.2, 0.3], at: [0, 0.34, 0], c: 'hat', seg: 8 }, { box: [0.31, 0.04, 0.31], at: [0, 0.27, 0], c: 'trim' },
    ],
    upperArm: [limb(0.13, 0.25, 'coat')], foreArm: [limb(0.11, 0.17, 'coat'), { box: [0.13, 0.05, 0.13], at: [0, -0.15, 0], c: 'trim' }], handR: hand('skin'), handL: hand('skin'),
    thigh: [limb(0.15, 0.3, 'dark')], shin: [limb(0.13, 0.22, 'dark')], foot: foot('dark'),
  }),
});
export const hero_sexton = model({
  id: 'hero_sexton', about: 'Sexton: stovepipe hat, black frock, grey face, green accent', tags: ['hero'],
  palette: { frock: 'ink', trim: 'lime', skin: 'mist', hat: 'night', dark: 'slate', eye: 'lime' },
  parts: humanoid({
    hips: [{ box: [0.36, 0.22, 0.24], at: [0, -0.04, 0], c: 'frock' }, { box: [0.42, 0.34, 0.28], at: [0, -0.22, 0], c: 'frock' }],
    chest: [
      { box: [0.38, 0.46, 0.24], at: [0, 0.21, 0], c: 'frock' }, { box: [0.1, 0.1, 0.03], at: [0, 0.38, 0.13], c: 'trim' }, { box: [0.05, 0.3, 0.03], at: [0, 0.18, 0.13], c: 'dark' },
    ],
    head: [
      { box: [0.22, 0.26, 0.22], at: [0, 0.13, 0], c: 'skin' }, eyes('eye', 0.15, 0.11), { cyl: [0.38, 0.04, 0.38], at: [0, 0.27, 0], c: 'hat', seg: 8 }, { cyl: [0.24, 0.42, 0.24], at: [0, 0.48, 0], c: 'hat', seg: 8 }, { box: [0.25, 0.05, 0.25], at: [0, 0.32, 0], c: 'trim' },
    ],
    upperArm: [limb(0.12, 0.25, 'frock')], foreArm: [limb(0.1, 0.17, 'frock')], handR: hand('skin'), handL: hand('skin'),
    thigh: [limb(0.14, 0.3, 'frock')], shin: [limb(0.12, 0.22, 'dark')], foot: foot('frock'),
  }),
});
export const npc_brasse = model({
  id: 'npc_brasse', about: 'Dame Brasse: wide bellfounder in a leather apron', tags: ['npc'],
  palette: { apron: 'orange', dress: 'plum', skin: 'sand', hair: 'red', dark: 'ink', metal: 'mist' },
  parts: humanoid({
    hips: [{ box: [0.52, 0.28, 0.34], at: [0, -0.04, 0], c: 'dress' }, { box: [0.56, 0.38, 0.38], at: [0, -0.28, 0], c: 'dress' }, { box: [0.32, 0.5, 0.05], at: [0, -0.2, 0.2], c: 'apron' }],
    chest: [{ box: [0.56, 0.44, 0.34], at: [0, 0.2, 0], c: 'dress' }, { box: [0.32, 0.36, 0.05], at: [0, 0.2, 0.18], c: 'apron' }],
    head: [{ box: [0.3, 0.26, 0.28], at: [0, 0.13, 0], c: 'skin' }, { box: [0.34, 0.14, 0.32], at: [0, 0.27, -0.02], c: 'hair' }, { box: [0.16, 0.16, 0.14], at: [0, 0.36, -0.08], c: 'hair' }],
    upperArm: [limb(0.17, 0.25, 'skin')], foreArm: [limb(0.15, 0.17, 'skin')], handR: [...hand('skin'), { use: 'hammer', at: [0, -0.3, 0.08], rot: [90, 0, 0] }], handL: hand('skin'),
    thigh: [limb(0.2, 0.3, 'dress')], shin: [limb(0.17, 0.22, 'dark')], foot: foot('dark'),
  }),
});
export const npc_ogive = model({
  id: 'npc_ogive', about: 'Mother Ogive: veiled keeper of the Reliquary', tags: ['npc'],
  palette: { robe: 'night', veil: 'mist', trim: 'plum', skin: 'white', dark: 'ink' },
  parts: humanoid({
    hips: [{ box: [0.4, 0.24, 0.28], at: [0, -0.04, 0], c: 'robe' }, { box: [0.46, 0.46, 0.36], at: [0, -0.32, 0], c: 'robe' }],
    chest: [{ box: [0.4, 0.44, 0.26], at: [0, 0.2, 0], c: 'robe' }, { box: [0.3, 0.05, 0.28], at: [0, 0.3, 0], c: 'trim' }],
    head: [{ box: [0.24, 0.24, 0.22], at: [0, 0.12, 0], c: 'skin' }, { box: [0.32, 0.34, 0.3], at: [0, 0.17, -0.03], c: 'veil' }, { box: [0.27, 0.18, 0.05], at: [0, 0.13, 0.13], c: 'dark' }, { box: [0.38, 0.1, 0.34], at: [0, 0.03, -0.03], c: 'veil' }],
    upperArm: [limb(0.13, 0.25, 'robe')], foreArm: [limb(0.11, 0.17, 'robe')], handR: hand('skin'), handL: hand('skin'),
    thigh: [limb(0.14, 0.3, 'robe')], shin: [limb(0.12, 0.22, 'robe')], foot: foot('dark'),
  }),
});
export const npc_pennywhistle = model({
  id: 'npc_pennywhistle', about: 'Pennywhistle: merchant in a plague-doctor beak with a big pack', tags: ['npc'],
  palette: { coat: 'teal', mask: 'white', beak: 'sand', pack: 'orange', strap: 'plum', dark: 'ink', eye: 'lime' },
  parts: humanoid({
    hips: [{ box: [0.38, 0.22, 0.26], at: [0, -0.04, 0], c: 'coat' }, { box: [0.42, 0.36, 0.3], at: [0, -0.24, 0], c: 'coat' }],
    chest: [{ box: [0.4, 0.44, 0.26], at: [0, 0.2, 0], c: 'coat' }, { box: [0.54, 0.76, 0.34], at: [0, 0.4, -0.3], c: 'pack' }, { box: [0.58, 0.07, 0.38], at: [0, 0.5, -0.3], c: 'strap' }, { box: [0.3, 0.24, 0.26], at: [0, 0.9, -0.3], c: 'strap' }],
    head: [{ box: [0.26, 0.26, 0.26], at: [0, 0.13, 0], c: 'mask' }, { cone: [0.14, 0.32, 0.14], at: [0, 0.1, 0.26], rot: [90, 0, 0], c: 'beak' }, { mirror: [{ box: [0.06, 0.06, 0.03], at: [0.08, 0.17, 0.13], c: 'eye', glow: true }], axis: 'x' }, { cyl: [0.42, 0.04, 0.42], at: [0, 0.27, 0], c: 'dark', seg: 8 }, { cyl: [0.24, 0.14, 0.24], at: [0, 0.34, 0], c: 'dark', seg: 8 }],
    upperArm: [limb(0.13, 0.25, 'coat')], foreArm: [limb(0.11, 0.17, 'coat')], handR: hand('dark'), handL: hand('dark'),
    thigh: [limb(0.14, 0.3, 'dark')], shin: [limb(0.12, 0.22, 'dark')], foot: foot('dark'),
  }),
});
export const npc_pyx = model({
  id: 'npc_pyx', about: 'Sister Pyx: armoured nun with a crossbow', tags: ['npc'],
  palette: { plate: 'mist', robe: 'ink', wimple: 'white', skin: 'sand', dark: 'night', trim: 'sky' },
  parts: humanoid({
    hips: [{ box: [0.36, 0.22, 0.26], at: [0, -0.04, 0], c: 'robe' }, { box: [0.4, 0.32, 0.28], at: [0, -0.22, 0], c: 'robe' }],
    chest: [{ box: [0.4, 0.44, 0.27], at: [0, 0.2, 0], c: 'plate' }, { box: [0.1, 0.36, 0.03], at: [0, 0.2, 0.15], c: 'trim' }, { box: [0.28, 0.1, 0.03], at: [0, 0.3, 0.15], c: 'trim' }, { mirror: [{ box: [0.16, 0.12, 0.3], at: [0.24, 0.41, 0], c: 'plate' }], axis: 'x' }],
    head: [{ box: [0.24, 0.24, 0.24], at: [0, 0.12, 0], c: 'skin' }, { box: [0.3, 0.32, 0.3], at: [0, 0.15, -0.04], c: 'robe' }, { box: [0.27, 0.06, 0.05], at: [0, 0.23, 0.12], c: 'wimple' }, { box: [0.27, 0.06, 0.05], at: [0, 0.02, 0.12], c: 'wimple' }],
    upperArm: [limb(0.13, 0.25, 'plate')], foreArm: [limb(0.11, 0.17, 'plate')], handR: [...hand('dark'), { use: 'crossbow', at: [0, -0.12, 0.2], rot: [90, 0, 0], scale: 0.8 }], handL: hand('dark'),
    thigh: [limb(0.15, 0.3, 'plate')], shin: [limb(0.13, 0.22, 'plate')], foot: foot('dark'),
  }),
});
const ambroseBody = (scaleMitre = 1) => humanoid({
  hips: [{ box: [0.38, 0.24, 0.28], at: [0, -0.04, 0], c: 'robe' }, { box: [0.46, 0.42, 0.34], at: [0, -0.3, 0], c: 'robe' }, { box: [0.12, 0.6, 0.04], at: [0, -0.26, 0.17], c: 'trim' }],
  chest: [{ box: [0.42, 0.44, 0.28], at: [0, 0.2, 0], c: 'robe' }, { box: [0.12, 0.42, 0.04], at: [0, 0.2, 0.15], c: 'trim' }, { box: [0.46, 0.09, 0.31], at: [0, 0.38, 0], c: 'trim' }],
  head: [{ box: [0.24, 0.26, 0.24], at: [0, 0.13, 0], c: 'skin' }, { cone: [0.28, 0.42 * scaleMitre, 0.22], at: [0, 0.46, 0], c: 'robe' }, { box: [0.28, 0.08, 0.24], at: [0, 0.27, 0], c: 'trim' }, { box: [0.17, 0.06, 0.04], at: [0, 0.15, 0.12], c: 'dark' }],
  upperArm: [limb(0.13, 0.25, 'robe')], foreArm: [limb(0.13, 0.17, 'trim')], handR: [...hand('skin'), { use: 'shovel', at: [0, -0.2, 0.05], rot: [80, 0, 0] }], handL: hand('skin'),
  thigh: [limb(0.15, 0.3, 'robe')], shin: [limb(0.13, 0.22, 'robe')], foot: foot('dark'),
});
export const npc_ambrose = model({ id: 'npc_ambrose', about: 'Bishop Ambrose: mitre, pale, keeps a spade', tags: ['npc'], palette: { robe: 'white', trim: 'sand', skin: 'mist', dark: 'ink' }, parts: ambroseBody() });
export const ambrose = model({ id: 'ambrose', about: 'Bishop Ambrose in the boss fight, soiled', tags: ['boss'], palette: { robe: 'plum', trim: 'red', skin: 'white', dark: 'ink' }, parts: ambroseBody(1.1) });
export const npc_crier = model({
  id: 'npc_crier', about: "Crier Maudlin: a severed head in a lantern on a post", tags: ['npc'],
  palette: { post: 'orange', frame: 'ink', glass: 'sand', skin: 'mist', hat: 'plum', eye: 'white', bell: 'sand' },
  size: [1.4, 2.8, 1.4],
  parts: [
    { cyl: [0.18, 2, 0.18], at: [0, 1, 0], c: 'post', seg: 6 }, { box: [0.7, 0.1, 0.7], at: [0, 0.05, 0], c: 'frame' },
    { box: [0.9, 0.08, 0.08], at: [0, 1.95, 0], c: 'post' },
    { box: [0.72, 0.06, 0.72], at: [0, 2.04, 0], c: 'frame' }, { box: [0.72, 0.06, 0.72], at: [0, 2.66, 0], c: 'frame' },
    { mirror: [{ mirror: [{ box: [0.06, 0.6, 0.06], at: [0.33, 2.35, 0.33], c: 'frame' }], axis: 'z' }], axis: 'x' },
    { box: [0.4, 0.42, 0.38], at: [0, 2.3, 0], c: 'skin' }, { mirror: [{ box: [0.08, 0.08, 0.03], at: [0.1, 2.36, 0.2], c: 'eye', glow: true }], axis: 'x' }, { box: [0.2, 0.05, 0.03], at: [0, 2.2, 0.2], c: 'frame' },
    { cyl: [0.5, 0.08, 0.5], at: [0, 2.72, 0], c: 'hat', seg: 8 }, { cyl: [0.26, 0.26, 0.26], at: [0, 2.85, 0], c: 'hat', seg: 8 },
    { lathe: [[0.02, 0.2], [0.09, 0.15], [0.13, 0], [0.14, -0.02], [0.02, -0.02]], at: [-0.42, 1.68, 0], c: 'bell' },
  ],
});
export { helmTier };
