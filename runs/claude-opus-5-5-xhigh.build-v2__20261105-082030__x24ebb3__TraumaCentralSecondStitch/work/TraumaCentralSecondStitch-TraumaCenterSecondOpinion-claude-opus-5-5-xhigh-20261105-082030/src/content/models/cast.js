// Busts (the anime talking heads) and masked full-body figures. All silhouettes from slab outlines.
import { model } from '../../../pixel-engine.js';

const FACE = [[-0.46, 0.5], [0.46, 0.5], [0.5, 0.05], [0.42, -0.28], [0.2, -0.56], [0, -0.68], [-0.2, -0.56], [-0.42, -0.28], [-0.5, 0.05]];
const FRINGE = {
  messy: [[-0.56, 0.42], [-0.6, 0], [-0.44, 0.16], [-0.4, -0.08], [-0.22, 0.24], [-0.06, 0.02], [0.06, 0.26], [0.24, 0.04], [0.34, 0.26], [0.46, -0.1], [0.6, 0.02], [0.56, 0.42], [0.34, 0.66], [0, 0.74], [-0.34, 0.66]],
  bun: [[-0.54, 0.34], [-0.5, 0.1], [-0.2, 0.3], [0.02, 0.36], [0.26, 0.3], [0.5, 0.1], [0.54, 0.34], [0.3, 0.64], [0, 0.7], [-0.3, 0.64]],
  bob: [[-0.62, 0.36], [-0.66, -0.5], [-0.46, -0.44], [-0.44, 0.1], [-0.1, 0.16], [0.44, 0.04], [0.46, -0.44], [0.66, -0.5], [0.62, 0.36], [0.34, 0.66], [0, 0.72], [-0.34, 0.66]],
  bald: [[-0.5, 0.2], [-0.5, 0.1], [0.5, 0.1], [0.5, 0.2], [0.3, 0.3], [0, 0.34], [-0.3, 0.3]],
  capped: [[-0.56, 0.22], [-0.6, -0.05], [-0.44, 0.1], [-0.4, -0.14], [-0.22, 0.14], [-0.06, -0.04], [0.06, 0.16], [0.24, -0.02], [0.34, 0.16], [0.46, -0.14], [0.6, -0.04], [0.56, 0.22]],
  swept: [[-0.56, 0.36], [-0.56, 0], [-0.3, 0.26], [0.1, 0.36], [0.5, 0.22], [0.56, -0.1], [0.62, 0.3], [0.34, 0.66], [0, 0.72], [-0.34, 0.66]],
  silver: [[-0.6, 0.34], [-0.62, -0.3], [-0.46, -0.24], [-0.42, 0.18], [0, 0.34], [0.42, 0.18], [0.46, -0.24], [0.62, -0.3], [0.6, 0.34], [0.34, 0.68], [0, 0.76], [-0.34, 0.68]],
};

function bust(c) {
  const brow = (s) => ({ group: [{ name: `brow${s}Bar`, box: [c.browW ?? 0.3, c.browH ?? 0.06, 0.05], at: [0, 0, 0], c: c.browC ?? 'hair' }], at: [s === 'L' ? 0.22 : -0.22, 0.24, 0.34], rot: [0, 0, s === 'L' ? -14 : 14], name: `brow${s}`, pivot: true });
  const lid = (s) => ({ group: [{ name: `lid${s}Bar`, box: [0.3, 0.12, 0.04], at: [0, 0.06, 0], c: 'skin' }], at: [s === 'L' ? 0.22 : -0.22, 0.12, 0.335], name: `lid${s}`, pivot: true });
  const parts = [
    // Shoulders and torso.
    { name: 'torso', box: [1.65, 1.2, 0.8], at: [0, 0.44, -0.16], c: 'top' },
    { name: 'shoulderL', ball: [0.6, 0.5, 0.74], at: [0.82, 0.9, -0.16], c: 'top' }, { name: 'shoulderR', ball: [0.6, 0.5, 0.74], at: [-0.82, 0.9, -0.16], c: 'top' },
    { name: 'neck', cyl: [0.36, 0.36, 0.36], at: [0, 1.16, -0.1], c: 'skin2' },
    { name: 'collarL', box: [0.34, 0.22, 0.1], at: [0.17, 0.98, 0.26], rot: [0, 0, -26], c: 'top2' }, { name: 'collarR', box: [0.34, 0.22, 0.1], at: [-0.17, 0.98, 0.26], rot: [0, 0, 26], c: 'top2' },
    { name: 'vneck', box: [0.2, 0.2, 0.05], at: [0, 0.98, 0.25], c: 'skin2' },
    ...(c.body ?? []),
    // The head, in a pivot.
    { group: [
      { name: 'skull', box: [0.9, 0.92, 0.72], at: [0, 0.1, -0.12], c: 'skin' },
      { name: 'face', slab: FACE, depth: 0.26, at: [0, 0, 0.14], c: 'skin' },
      { name: 'hairback', box: [c.backW ?? 0.98, c.backH ?? 0.86, 0.5], at: [0, c.backY ?? 0.2, -0.34], c: 'hair' },
      { name: 'hairfront', slab: FRINGE[c.fringe], depth: 0.16, at: [0, 0.22, 0.26], c: 'hair' },
      { name: 'ear', box: [1.02, 0.22, 0.16], at: [0, 0, -0.04], c: 'skin2' },
      { name: 'eyeL', box: [0.27, 0.2, 0.05], at: [0.22, 0.04, 0.28], c: 'white' }, { name: 'eyeR', box: [0.27, 0.2, 0.05], at: [-0.22, 0.04, 0.28], c: 'white' },
      { group: [{ name: 'pupilLo', box: [0.14, 0.2, 0.03], at: [0, 0, 0], c: c.eye ?? 'ink' }], at: [0.21, 0.04, 0.31], name: 'pupilL', pivot: true },
      { group: [{ name: 'pupilRo', box: [0.14, 0.2, 0.03], at: [0, 0, 0], c: c.eye ?? 'ink' }], at: [-0.23, 0.04, 0.31], name: 'pupilR', pivot: true },
      lid('L'), lid('R'), brow('L'), brow('R'),
      { name: 'nose', box: [0.07, 0.1, 0.06], at: [0, -0.15, 0.32], c: 'skin2' },
      { group: [{ name: 'mouthO', box: [0.26, 0.09, 0.04], at: [0, 0, 0], c: 'mouth' }, { name: 'teeth', box: [0.2, 0.025, 0.045], at: [0, 0.025, 0], c: 'white' }], at: [0, -0.37, 0.28], name: 'mouth', pivot: true },
      ...(c.head ?? []),
      // Toggled extras, kept out of sight until an emotion wants them.
      { group: [{ name: 'sweatO', ball: [0.11, 0.17, 0.05], at: [0, 0, 0], c: 'cyan' }], at: [0.5, 0.26, 0.26], name: 'sweat', pivot: true },
      { group: [{ name: 'blushL', box: [0.2, 0.05, 0.03], at: [0.27, -0.13, 0.3], c: 'red' }, { name: 'blushR', box: [0.2, 0.05, 0.03], at: [-0.27, -0.13, 0.3], c: 'red' }], at: [0, 0, 0], name: 'blush', pivot: true },
      { group: [{ name: 'tearO', ball: [0.07, 0.16, 0.05], at: [0, 0, 0], c: 'cyan' }], at: [0.26, -0.13, 0.33], name: 'tear', pivot: true },
    ], at: [0, 1.62, 0], name: 'head', pivot: true },
  ];
  return model({ id: `bust-${c.id}`, about: c.about, tags: ['character', 'bust'], floats: true, palette: { skin: c.skin, skin2: c.skin2, hair: c.hair, top: c.top, top2: c.top2, white: 'white', ink: 'ink', mouth: c.mouth ?? 'plum', cyan: 'cyan', red: 'red', accent: c.accent ?? 'red', accent2: c.accent2 ?? 'sand' }, parts });
}

// Colour bindings that aren't palette names are passed at build time (see view/bust.js).
export const BUSTS = {
  ilya: bust({ id: 'ilya', about: 'Dr. Ilya Marsh: messy dark hair, sky-blue cap, teal scrubs, coffee stain', skin: 'sand', skin2: 'orange', hair: 'night', top: 'teal', top2: 'green', fringe: 'capped', backH: 0.56, backY: 0.02,
    head: [{ name: 'cap', ball: [1.28, 0.52, 1.24], at: [0, 0.62, -0.12], c: 'accent', half: true }],
    body: [{ name: 'stain', box: [0.3, 0.26, 0.04], at: [0.34, 0.5, 0.25], c: 'accent2' }, { name: 'stain2', box: [0.14, 0.14, 0.04], at: [0.46, 0.34, 0.25], c: 'accent2' }, { name: 'badge', box: [0.22, 0.1, 0.04], at: [-0.4, 0.74, 0.25], c: 'white' }], accent: 'sky', accent2: 'orange' }),
  reyes: bust({ id: 'reyes', about: 'Nurse Odalys Reyes: tiny, tight black bun, red glasses, fierce brows, navy scrubs', skin: 'orange', skin2: 'red', hair: 'ink', top: 'navy', top2: 'blue', fringe: 'bun', browW: 0.34, browH: 0.09, backH: 0.74, backY: 0.24,
    head: [{ name: 'bun', ball: [0.5, 0.48, 0.5], at: [0, 0.94, -0.26], c: 'hair' }, { name: 'glassL', torus: [0.34, 0.04, 0.28], at: [0.22, 0.03, 0.33], rot: [90, 0, 0], c: 'accent' }, { name: 'glassR', torus: [0.34, 0.04, 0.28], at: [-0.22, 0.03, 0.33], rot: [90, 0, 0], c: 'accent' }, { name: 'bridge', box: [0.14, 0.04, 0.04], at: [0, 0.05, 0.34], c: 'accent' }, { group: [{ name: 'glintO', box: [0.1, 0.05, 0.02], at: [0, 0, 0], c: 'white' }], at: [0.22, 0.1, 0.37], name: 'glint', pivot: true }],
    body: [{ name: 'clipboard', box: [0.5, 0.6, 0.06], at: [0.5, 0.36, 0.3], rot: [0, 0, -10], c: 'accent2' }, { name: 'watch', box: [0.1, 0.14, 0.03], at: [-0.42, 0.66, 0.25], c: 'white' }], accent: 'red', accent2: 'sand' }),
  sabine: bust({ id: 'sabine', about: 'Dr. Sabine Achterberg: ash-white bob, scar through left brow, plum scrubs', skin: 'sand', skin2: 'orange', hair: 'mist', top: 'plum', top2: 'red', fringe: 'bob', backW: 1.2, backH: 1.14, backY: 0.02, browH: 0.05, browC: 'hair',
    head: [{ name: 'scar', box: [0.05, 0.34, 0.03], at: [0.27, 0.13, 0.33], rot: [0, 0, 10], c: 'accent' }],
    body: [{ name: 'scope', tube: [[-0.34, 0.92, 0.26], [-0.28, 0.5, 0.28], [0, 0.34, 0.3], [0.28, 0.5, 0.28], [0.34, 0.92, 0.26]], r: 0.03, c: 'white' }], accent: 'red', accent2: 'mist' }),
  bram: bust({ id: 'bram', about: 'Chief Cornelius Bram: walrus moustache, white coat, half-moon glasses', skin: 'sand', skin2: 'orange', hair: 'white', top: 'white', top2: 'mist', fringe: 'swept', browW: 0.36, browH: 0.09,
    head: [{ name: 'moustache', slab: [[-0.42, -0.3], [-0.12, -0.2], [0, -0.26], [0.12, -0.2], [0.42, -0.3], [0.34, -0.42], [0.1, -0.36], [0, -0.38], [-0.1, -0.36], [-0.34, -0.42]], depth: 0.08, at: [0, -0.02, 0.28], c: 'hair' }, { name: 'glassL', box: [0.28, 0.04, 0.03], at: [0.22, -0.03, 0.33], c: 'accent' }, { name: 'glassR', box: [0.28, 0.04, 0.03], at: [-0.22, -0.03, 0.33], c: 'accent' }, { name: 'bridge', box: [0.14, 0.03, 0.03], at: [0, 0.03, 0.34], c: 'accent' }],
    body: [{ name: 'tie', box: [0.16, 0.56, 0.04], at: [0, 0.58, 0.25], c: 'accent' }, { name: 'lapelL', box: [0.2, 0.7, 0.05], at: [0.26, 0.54, 0.26], rot: [0, 0, -8], c: 'top2' }, { name: 'lapelR', box: [0.2, 0.7, 0.05], at: [-0.26, 0.54, 0.26], rot: [0, 0, 8], c: 'top2' }, { name: 'pen', box: [0.04, 0.2, 0.03], at: [0.54, 0.66, 0.26], c: 'accent2' }], accent: 'navy', accent2: 'sky' }),
  pem: bust({ id: 'pem', about: 'Dr. Pemberton Okoye: round, bald, orange cap with fish on it', skin: 'plum', skin2: 'plum', hair: 'ink', top: 'teal', top2: 'sky', fringe: 'bald', backH: 0.5, backY: 0.42, browH: 0.05, mouth: 'ink',
    head: [{ name: 'cap', ball: [1.3, 0.54, 1.26], at: [0, 0.62, -0.12], c: 'accent', half: true }, { name: 'fish1', box: [0.18, 0.07, 0.05], at: [-0.24, 0.52, 0.44], c: 'white' }, { name: 'fish1t', box: [0.06, 0.12, 0.05], at: [-0.12, 0.52, 0.44], c: 'white' }, { name: 'fish2', box: [0.18, 0.07, 0.05], at: [0.2, 0.68, 0.36], c: 'accent2' }, { name: 'fish2t', box: [0.06, 0.12, 0.05], at: [0.32, 0.68, 0.36], c: 'accent2' }, { name: 'jowlL', box: [0.2, 0.3, 0.2], at: [0.48, -0.22, 0.12], c: 'skin' }, { name: 'jowlR', box: [0.2, 0.3, 0.2], at: [-0.48, -0.22, 0.12], c: 'skin' }],
    body: [{ name: 'belly', ball: [1.9, 1.2, 1.04], at: [0, 0.34, -0.1], c: 'top' }], accent: 'orange', accent2: 'sand' }),
  hesper: bust({ id: 'hesper', about: 'Dr. Hesper Lindqvist: immaculate white suit, silver hair, small gold pin', skin: 'sand', skin2: 'orange', hair: 'mist', top: 'white', top2: 'mist', fringe: 'silver', backW: 1.16, backH: 1.04, backY: 0.04, browH: 0.04, browC: 'top2', mouth: 'red',
    body: [{ name: 'pin', ball: [0.11, 0.11, 0.05], at: [0.42, 0.78, 0.26], c: 'accent' }, { name: 'lapelL', box: [0.22, 0.74, 0.05], at: [0.24, 0.5, 0.26], rot: [0, 0, -10], c: 'top2' }, { name: 'lapelR', box: [0.22, 0.74, 0.05], at: [-0.24, 0.5, 0.26], rot: [0, 0, 10], c: 'top2' }, { name: 'blouse', box: [0.24, 0.6, 0.04], at: [0, 0.6, 0.25], c: 'accent2' }], accent: 'sand', accent2: 'mist' }),
  tomasz: bust({ id: 'tomasz', about: 'A trawlerman patient: weathered, bandanna, oilskin', skin: 'orange', skin2: 'red', hair: 'slate', top: 'sand', top2: 'orange', fringe: 'swept', browH: 0.08, accent: 'red', accent2: 'white', head: [{ name: 'beard', slab: [[-0.46, -0.2], [0.46, -0.2], [0.34, -0.6], [0, -0.74], [-0.34, -0.6]], depth: 0.1, at: [0, 0, 0.27], c: 'hair' }] }),
  ottilie: bust({ id: 'ottilie', about: 'Ottilie Marr: hospice nurse, soft curls, faint smile', skin: 'sand', skin2: 'orange', hair: 'orange', top: 'sky', top2: 'white', fringe: 'silver', backW: 1.12, backH: 1, backY: 0.06, browH: 0.05, mouth: 'red' }),
  ollie: bust({ id: 'ollie', about: 'Ollie Brandt: a ferry survivor, sixteen', skin: 'sand', skin2: 'orange', hair: 'orange', top: 'blue', top2: 'white', fringe: 'messy', browH: 0.05 }),
  zamboni: bust({ id: 'zamboni', about: 'The Great Zamboni: stage magician, waxed moustache, top hat', skin: 'sand', skin2: 'orange', hair: 'ink', top: 'night', top2: 'white', fringe: 'swept', browW: 0.34, accent: 'red',
    head: [{ name: 'hat', cyl: [0.9, 0.72, 0.84], at: [0, 0.96, -0.1], c: 'hair' }, { name: 'brim', cyl: [1.3, 0.08, 1.2], at: [0, 0.58, -0.1], c: 'hair' }, { name: 'band', cyl: [0.92, 0.14, 0.86], at: [0, 0.68, -0.1], c: 'accent' }, { name: 'stache', slab: [[-0.4, -0.2], [-0.1, -0.26], [0, -0.22], [0.1, -0.26], [0.4, -0.2], [0.14, -0.34], [-0.14, -0.34]], depth: 0.06, at: [0, -0.02, 0.28], c: 'hair' }],
    body: [{ name: 'bow', box: [0.4, 0.14, 0.06], at: [0, 0.94, 0.27], c: 'accent' }] }),
  anselm: bust({ id: 'anselm', about: 'Mr. Anselm: a harbour pilot, smiling far too much', skin: 'sand', skin2: 'orange', hair: 'white', top: 'navy', top2: 'sand', fringe: 'swept', browH: 0.05, mouth: 'red' }),
};
export const BUST_CASTING = { ilya: 'ilya', reyes: 'reyes', sabine: 'sabine', bram: 'bram', pem: 'pem', hesper: 'hesper', tomasz: 'tomasz', ottilie: 'ottilie', ollie: 'ollie', zamboni: 'zamboni', anselm: 'anselm' };

// ---------------------------------------------------------------- Full bodies, on the hero rig's joint names (HERO_CLIPS play on them)
const arm = (s, x, c) => ({ group: [{ name: `upper${s}`, box: [0.11, 0.25, 0.11], at: [0, -0.12, 0], c: 'scrub' },
  { group: [{ name: `fore${s}`, box: [0.1, 0.23, 0.1], at: [0, -0.11, 0], c: c.foreC ?? 'skin' },
    { group: [{ name: `Glove${s}`, box: [0.12, 0.13, 0.12], at: [0, -0.06, 0], c: 'glove' }], at: [0, -0.23, 0], name: `Hand${s}`, pivot: true }], at: [0, -0.25, 0], name: `Forearm${s}`, pivot: true }],
at: [x, 0.36, 0], name: `Arm${s}`, pivot: true });
const leg = (s, x) => ({ group: [{ name: `thigh${s}`, box: [0.15, 0.3, 0.15], at: [0, -0.15, 0], c: 'pants' },
  { group: [{ name: `shin${s}`, box: [0.13, 0.22, 0.13], at: [0, -0.11, 0], c: 'pants' },
    { group: [{ name: `Shoe${s}`, box: [0.15, 0.1, 0.28], at: [0, -0.05, 0.06], c: 'shoe' }], at: [0, -0.22, 0], name: `Foot${s}`, pivot: true }], at: [0, -0.3, 0], name: `Shin${s}`, pivot: true }],
at: [x, 0, 0], name: `Leg${s}`, pivot: true });

function figure(c) {
  const k = c.scale ?? 1;
  return model({
    id: `fig-${c.id}`, about: c.about, tags: ['character', 'figure'], floats: true,
    palette: { skin: c.skin ?? 'sand', scrub: c.scrub, pants: c.pants ?? c.scrub, shoe: c.shoe ?? 'white', glove: c.glove ?? 'sky', skin2: c.skin ?? 'sand', cap: c.cap ?? c.scrub, mask: c.mask ?? 'mist', hair: c.hair ?? 'night', white: 'white', ink: 'ink', accent: c.accent ?? 'red' },
    parts: [{ group: [
      { name: 'hips', box: [0.36, 0.18, 0.22], at: [0, 0.02, 0], c: 'pants' },
      { group: [
        { name: 'chest', box: [0.38, 0.42, 0.24], at: [0, 0.22, 0], c: 'scrub' },
        ...(c.torso ?? []),
        { group: [
          { name: 'skull', box: [0.3, 0.3, 0.28], at: [0, 0.14, 0], c: 'skin' },
          ...(c.capOff ? [] : [{ name: 'capTop', box: [0.34, 0.14, 0.32], at: [0, 0.3, -0.01], c: 'cap' }]),
          ...(c.maskOff ? [] : [{ name: 'maskOn', box: [0.31, 0.13, 0.1], at: [0, 0.06, 0.11], c: 'mask' }]),
          { name: 'eyeL', box: [0.05, 0.05, 0.03], at: [0.07, 0.17, 0.14], c: 'ink' }, { name: 'eyeR', box: [0.05, 0.05, 0.03], at: [-0.07, 0.17, 0.14], c: 'ink' },
          ...(c.head ?? []),
        ], at: [0, 0.44, 0], name: 'Head', pivot: true },
        arm('R', -0.25, c), arm('L', 0.25, c),
      ], at: [0, 0.1, 0], name: 'Torso', pivot: true },
      leg('R', -0.14), leg('L', 0.14),
    ], at: [0, 0.62, 0], scale: k, name: 'Pelvis', pivot: true }],
  });
}
export const FIGURES = {
  ilya: figure({ id: 'ilya', about: 'Ilya, masked', scrub: 'teal', cap: 'sky' }),
  reyes: figure({ id: 'reyes', about: 'Reyes, tiny and masked', scrub: 'navy', cap: 'navy', scale: 0.82, skin: 'orange', head: [{ name: 'bun', ball: [0.15, 0.15, 0.15], at: [0, 0.42, -0.09], c: 'ink' }, { name: 'glasses', box: [0.26, 0.04, 0.03], at: [0, 0.17, 0.15], c: 'accent' }] }),
  sabine: figure({ id: 'sabine', about: 'Sabine, ash-white hair', scrub: 'plum', capOff: true, maskOff: false, head: [{ name: 'bobHair', box: [0.36, 0.3, 0.3], at: [0, 0.2, -0.06], c: 'hair' }], hair: 'mist', scale: 1.04 }),
  bram: figure({ id: 'bram', about: 'Chief Bram in his white coat', scrub: 'white', pants: 'slate', shoe: 'ink', capOff: true, maskOff: true, foreC: 'scrub', head: [{ name: 'hairTop', box: [0.32, 0.08, 0.3], at: [0, 0.31, 0], c: 'white' }, { name: 'stache', box: [0.26, 0.05, 0.03], at: [0, 0.07, 0.15], c: 'white' }], scale: 1.05 }),
  pem: figure({ id: 'pem', about: 'Pem, round, orange cap', scrub: 'teal', cap: 'orange', skin: 'plum', torso: [{ name: 'belly', ball: [0.5, 0.4, 0.38], at: [0, 0.16, 0.04], c: 'scrub' }], maskOff: true, hair: 'ink' }),
  hesper: figure({ id: 'hesper', about: 'Hesper in an immaculate white suit', scrub: 'white', pants: 'white', shoe: 'white', capOff: true, maskOff: true, foreC: 'scrub', hair: 'mist', head: [{ name: 'silverHair', box: [0.34, 0.26, 0.3], at: [0, 0.22, -0.06], c: 'hair' }], torso: [{ name: 'pin', ball: [0.05, 0.05, 0.03], at: [0.1, 0.34, 0.13], c: 'accent' }], accent: 'sand' }),
  extra: figure({ id: 'extra', about: 'A masked orderly', scrub: 'sky', cap: 'white' }),
  patient: figure({ id: 'patient', about: 'A patient in a gown', scrub: 'mist', pants: 'mist', shoe: 'mist', capOff: true, maskOff: true, foreC: 'skin', hair: 'night', glove: 'sand', head: [{ name: 'hairTop', box: [0.32, 0.1, 0.3], at: [0, 0.31, -0.01], c: 'hair' }, { name: 'hairBack', box: [0.32, 0.2, 0.08], at: [0, 0.2, -0.12], c: 'hair' }] }),
};
