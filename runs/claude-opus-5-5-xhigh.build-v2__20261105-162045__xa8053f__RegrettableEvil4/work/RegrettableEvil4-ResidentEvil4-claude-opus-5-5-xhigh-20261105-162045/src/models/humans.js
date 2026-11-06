// Every human is a puppet: nested pivots named as HERO_RIG's joints, so HERO_CLIPS and our clips play on
// it. Rest offsets are the hero's (feet at y = 0, about 1.6 m, big readable head). Character faces +Z.
import { model } from '../../pixel-engine.js';

const J = (name, at, parts) => ({ group: parts, name, pivot: true, at });

/** The shared puppet. Every limb can add parts or replace its base shape. */
export function puppet(o) {
  const {
    id, about, palette, tags = ['character'], skin = 'skin', coat = 'coat', pants = 'pants', boot = 'boot', sleeve = coat, glove = skin,
    torsoBox = [0.42, 0.48, 0.26], pelvisBox = [0.44, 0.2, 0.28], headBox = [0.31, 0.3, 0.3], armW = 0.12, legW = 0.15,
    pelvis = [], torso = [], head = [], armR = [], armL = [], foreR = [], foreL = [], handR = [], handL = [], legR = [], legL = [], shinR = [], shinL = [], footR = [], footL = [], eye = 'band', eyeGlow = true, noFace = false, size,
  } = o;
  const eyes = noFace ? [] : [{ box: [0.27, 0.07, 0.04], at: [0, 0.16, 0.16], c: eye, glow: eyeGlow }];
  const arm = (side, s, fore, hand, extra) => J(`Arm${side}`, [s * 0.27, 0.52, 0], [
    { box: [armW, 0.26, armW + 0.01], at: [0, -0.12, 0], c: sleeve },
    ...extra,
    J(`Forearm${side}`, [0, -0.25, 0], [
      { box: [armW - 0.01, 0.18, armW], at: [0, -0.08, 0], c: sleeve },
      ...fore,
      J(`Hand${side}`, [0, -0.16, 0], [{ box: [0.1, 0.1, 0.11], at: [0, -0.04, 0], c: glove }, ...hand]),
    ]),
  ]);
  const leg = (side, s, shin, foot, extra) => J(`Leg${side}`, [s * 0.14, 0, 0], [
    { box: [legW, 0.3, legW + 0.01], at: [0, -0.14, 0], c: pants },
    ...extra,
    J(`Shin${side}`, [0, -0.3, 0], [
      { box: [legW - 0.02, 0.22, legW - 0.01], at: [0, -0.1, 0], c: pants },
      ...shin,
      J(`Foot${side}`, [0, -0.22, 0], [{ name: `Shoe${side}`, box: [0.14, 0.1, 0.25], at: [0, -0.05, 0.05], c: boot }, ...foot]),
    ]),
  ]);
  return model({
    id, about, tags, palette, size,
    parts: [
      J('Pelvis', [0, 0.62, 0], [
        { box: pelvisBox, at: [0, 0.02, 0], c: pants },
        ...pelvis,
        J('Torso', [0, 0, 0], [
          { box: torsoBox, at: [0, 0.32, 0], c: coat },
          ...torso,
          J('Head', [0, 0.6, 0], [
            { box: headBox, at: [0, 0.13, 0], c: skin },
            ...eyes,
            ...head,
          ]),
          arm('R', -1, foreR, handR, armR),
          arm('L', 1, foreL, handL, armL),
        ]),
        leg('R', -1, shinR, footR, legR),
        leg('L', 1, shinL, footL, legL),
      ]),
    ],
  });
}

// ---- Bits every infected shares ----
const limpetNeck = { name: 'limpetNeck', ball: [0.15, 0.12, 0.09], at: [0, 0.0, -0.16], c: 'limpet', half: false };
const brow = (c = 'skin') => ({ box: [0.31, 0.04, 0.04], at: [0, 0.22, 0.155], c });

const sou = (c = 'hat') => [
  { box: [0.35, 0.1, 0.35], at: [0, 0.32, 0], c },
  { box: [0.5, 0.04, 0.5], at: [0, 0.27, -0.02], c },
  { box: [0.42, 0.05, 0.18], at: [0, 0.24, -0.28], rot: [20, 0, 0], c },
];
const cap = (c = 'hat') => [
  { box: [0.34, 0.1, 0.33], at: [0, 0.32, 0], c },
  { box: [0.3, 0.03, 0.14], at: [0, 0.27, 0.2], c },
];
const hair = (c = 'hat') => [
  { box: [0.33, 0.1, 0.32], at: [0, 0.3, -0.01], c },
  { box: [0.33, 0.2, 0.08], at: [0, 0.17, -0.14], c },
];

// ---- The cast ----
export const max = puppet({
  id: 'max', about: 'Max Ransom: grey trench coat with a long skirt, short sand hair, sunglasses, red scarf',
  palette: { skin: 'mist', coat: 'slate', pants: 'night', boot: 'ink', hair: 'sand', band: 'ink', belt: 'ink', seam: 'night', scarf: 'red', lapel: 'mist', shirt: 'white' },
  eye: 'band', eyeGlow: false,
  torso: [
    { box: [0.44, 0.07, 0.28], at: [0, 0.14, 0], c: 'belt' },
    { box: [0.03, 0.46, 0.02], at: [0, 0.33, -0.135], c: 'seam' },
    { box: [0.12, 0.18, 0.02], at: [0, 0.44, 0.135], c: 'shirt' },
    { box: [0.09, 0.3, 0.03], at: [-0.11, 0.42, 0.135], c: 'lapel' },
    { box: [0.09, 0.3, 0.03], at: [0.11, 0.42, 0.135], c: 'lapel' },
    { box: [0.32, 0.1, 0.3], at: [0, 0.57, 0], c: 'scarf' },
  ],
  pelvis: [
    { box: [0.5, 0.22, 0.32], at: [0, -0.1, 0], c: 'coat' },
    { box: [0.03, 0.22, 0.02], at: [0, -0.1, -0.165], c: 'seam' },
  ],
  legR: [{ box: [0.2, 0.36, 0.26], at: [-0.02, -0.34, -0.02], c: 'coat' }],
  legL: [{ box: [0.2, 0.36, 0.26], at: [0.02, -0.34, -0.02], c: 'coat' }],
  head: [
    // A proper haircut: a rounded crown, tapered down the nape, a side parting. Seen from behind all game.
    { ball: [0.36, 0.2, 0.36], at: [0, 0.27, -0.01], c: 'hair' },
    { box: [0.3, 0.14, 0.09], at: [0, 0.17, -0.125], c: 'hair' },
    { box: [0.22, 0.06, 0.08], at: [0, 0.08, -0.14], c: 'hair' },
    { box: [0.04, 0.09, 0.18], at: [-0.155, 0.2, -0.04], c: 'hair' },
    { box: [0.04, 0.09, 0.18], at: [0.155, 0.2, -0.04], c: 'hair' },
    { box: [0.2, 0.07, 0.2], at: [0.06, 0.345, 0.08], rot: [8, 0, -10], c: 'hair' },
  ],
});

export const dame = puppet({
  id: 'dame', about: 'Dame Ottoline Vane: fur coat, hat with a feather, handbag, ebony cane. Tiny at game scale.',
  palette: { skin: 'white', coat: 'sand', pants: 'plum', boot: 'ink', hat: 'plum', feather: 'red', fur: 'white', band: 'night', bag: 'red', cane: 'ink', brass: 'orange' },
  eye: 'band', eyeGlow: false, sleeve: 'coat',
  torsoBox: [0.46, 0.5, 0.32], pelvisBox: [0.48, 0.2, 0.34],
  torso: [
    { box: [0.5, 0.12, 0.36], at: [0, 0.54, 0], c: 'fur' },
    { box: [0.06, 0.42, 0.02], at: [0, 0.3, 0.165], c: 'fur' },
  ],
  pelvis: [{ box: [0.54, 0.36, 0.38], at: [0, -0.16, 0], c: 'coat' }],
  head: [
    { box: [0.33, 0.08, 0.33], at: [0, 0.31, 0], c: 'hat' },
    { box: [0.46, 0.03, 0.46], at: [0, 0.28, 0], c: 'hat' },
    { box: [0.04, 0.26, 0.09], at: [0.16, 0.42, -0.08], rot: [-22, 0, -14], c: 'feather' },
    { box: [0.09, 0.05, 0.03], at: [0, 0.07, 0.16], c: 'fur' },
  ],
  handR: [
    { name: 'cane', cyl: [0.04, 0.72, 0.04], at: [0, -0.36, 0.08], c: 'cane', seg: 6 },
    { box: [0.13, 0.04, 0.04], at: [0, -0.02, 0.08], c: 'brass' },
  ],
  foreL: [
    { box: [0.2, 0.18, 0.08], at: [0, -0.22, 0.1], c: 'bag' },
    { box: [0.06, 0.03, 0.02], at: [0, -0.12, 0.1], c: 'brass' },
  ],
});

export const nils = puppet({
  id: 'nils', about: 'Nils the boatman in a sou\'wester. Not infected. Not for long, either.',
  palette: { skin: 'sand', coat: 'orange', pants: 'navy', boot: 'ink', hat: 'orange', band: 'ink', beard: 'mist' },
  eye: 'band', eyeGlow: false, head: [...sou('hat'), { box: [0.27, 0.14, 0.05], at: [0, 0.04, 0.16], c: 'beard' }],
});

function islanderDef(id, hat, palette, about) {
  const hatParts = hat === 'sou' ? sou('hat') : hat === 'cap' ? cap('hat') : [...hair('hat'), brow()];
  return puppet({
    id, about, palette,
    head: [...hatParts, limpetNeck],
    torso: [{ box: [0.44, 0.06, 0.28], at: [0, 0.15, 0], c: 'belt' }, { box: [0.44, 0.1, 0.28], at: [0, 0.52, 0], c: 'hat' }],
    pelvis: [{ box: [0.46, 0.12, 0.3], at: [0, -0.04, 0], c: 'coat' }],
  });
}
const baseIsle = { skin: 'mist', pants: 'night', boot: 'ink', band: 'orange', belt: 'ink', limpet: 'plum' };
export const islander = islanderDef('islander', 'sou', { ...baseIsle, coat: 'teal', hat: 'navy' }, 'Oilskin-clad islander in a sou\'wester, eye band alight, limpet on the neck');
export const islander2 = islanderDef('islander2', 'cap', { ...baseIsle, coat: 'navy', hat: 'slate', pants: 'plum' }, 'Islander in a flat cap and navy jersey');
export const islander3 = islanderDef('islander3', 'bare', { ...baseIsle, coat: 'plum', hat: 'ink', pants: 'slate', skin: 'sand', band: 'red' }, 'Bareheaded islander in a plum smock, the band burning low');

export const netwife = puppet({
  id: 'netwife', about: 'Net-Wife: headscarf, long skirt, shawl of net over the shoulders',
  palette: { skin: 'mist', coat: 'plum', pants: 'night', boot: 'ink', band: 'orange', scarf: 'green', skirt: 'night', net: 'sand', limpet: 'teal' },
  torsoBox: [0.38, 0.46, 0.24],
  torso: [{ box: [0.44, 0.14, 0.28], at: [0, 0.5, 0], c: 'net' }],
  pelvis: [{ box: [0.5, 0.44, 0.36], at: [0, -0.2, 0], c: 'skirt' }],
  head: [{ box: [0.35, 0.14, 0.34], at: [0, 0.28, -0.01], c: 'scarf' }, { box: [0.35, 0.24, 0.08], at: [0, 0.13, -0.15], c: 'scarf' }, limpetNeck],
});

export const bottler = puppet({
  id: 'bottler', about: 'Bottler: leather apron, smoked face, a bandolier of oil bottles',
  palette: { skin: 'slate', coat: 'night', pants: 'ink', boot: 'ink', band: 'orange', apron: 'orange', hat: 'plum', glass: 'green', limpet: 'teal' },
  torso: [
    { box: [0.36, 0.42, 0.03], at: [0, 0.28, 0.135], c: 'apron' },
    { box: [0.45, 0.06, 0.28], at: [0, 0.4, 0], rot: [0, 0, 28], c: 'hat' },
    { box: [0.08, 0.14, 0.08], at: [0.12, 0.47, 0.15], c: 'glass' },
    { box: [0.08, 0.14, 0.08], at: [-0.12, 0.22, 0.15], c: 'glass' },
  ],
  pelvis: [{ box: [0.4, 0.26, 0.03], at: [0, -0.14, 0.145], c: 'apron' }],
  head: [...cap('hat'), limpetNeck],
});

export const deckhand = puppet({
  id: 'deckhand', about: 'Deckhand: pea coat, watch cap, moves far too fast',
  palette: { skin: 'mist', coat: 'navy', pants: 'slate', boot: 'ink', band: 'orange', hat: 'red', button: 'sand', limpet: 'plum' },
  torso: [{ box: [0.04, 0.3, 0.02], at: [0.08, 0.3, 0.135], c: 'button' }, { box: [0.04, 0.3, 0.02], at: [-0.08, 0.3, 0.135], c: 'button' }],
  pelvis: [{ box: [0.46, 0.18, 0.3], at: [0, -0.06, 0], c: 'coat' }],
  head: [{ box: [0.33, 0.14, 0.32], at: [0, 0.3, 0], c: 'hat' }, limpetNeck],
});

export const carrier = puppet({
  id: 'carrier', about: 'Carrier: big man with a sack hood and a coil of rope, here for the Dame',
  palette: { skin: 'sand', coat: 'ink', pants: 'plum', boot: 'ink', band: 'orange', sack: 'sand', rope: 'orange', limpet: 'teal' },
  torsoBox: [0.5, 0.52, 0.32], pelvisBox: [0.5, 0.22, 0.32], armW: 0.15, legW: 0.17,
  torso: [{ box: [0.54, 0.06, 0.36], at: [0, 0.24, 0], rot: [0, 0, -30], c: 'rope' }, { box: [0.3, 0.3, 0.24], at: [0.14, 0.54, -0.2], c: 'sack' }],
  head: [{ box: [0.33, 0.14, 0.32], at: [0, 0.31, 0], c: 'sack' }, { box: [0.34, 0.07, 0.04], at: [0, 0.07, 0.16], c: 'sack' }, limpetNeck],
});

export const flenser = puppet({
  id: 'flenser', about: 'The Flenser: rubber apron, sack hood with two cut holes, no neck to speak of',
  palette: { skin: 'sand', coat: 'slate', pants: 'ink', boot: 'ink', band: 'orange', apron: 'red', sack: 'sand', strap: 'night', stain: 'plum' },
  torsoBox: [0.5, 0.52, 0.32], pelvisBox: [0.5, 0.22, 0.32], armW: 0.15, legW: 0.18,
  skin: 'sack', noFace: true,
  torso: [
    { box: [0.42, 0.46, 0.04], at: [0, 0.3, 0.16], c: 'apron' },
    { box: [0.2, 0.2, 0.01], at: [0.04, 0.26, 0.185], c: 'stain' },
    { box: [0.48, 0.05, 0.34], at: [0, 0.5, 0], c: 'strap' },
  ],
  pelvis: [{ box: [0.46, 0.34, 0.04], at: [0, -0.16, 0.17], c: 'apron' }],
  head: [
    { box: [0.08, 0.06, 0.04], at: [-0.07, 0.17, 0.16], c: 'band', glow: true },
    { box: [0.08, 0.06, 0.04], at: [0.07, 0.17, 0.16], c: 'band', glow: true },
    { box: [0.24, 0.05, 0.04], at: [0, 0.32, 0], c: 'strap' },
  ],
  handR: [{ box: [0.12, 0.12, 0.13], at: [0, -0.04, 0], c: 'strap' }],
  handL: [{ box: [0.12, 0.12, 0.13], at: [0, -0.04, 0], c: 'strap' }],
});

export const resalted = puppet({
  id: 'resalted', about: 'Re-Salted: a corpse with a limpet in charge, salt-white, fast',
  palette: { skin: 'white', coat: 'mist', pants: 'slate', boot: 'night', band: 'lime', salt: 'white', limpet: 'teal', tear: 'plum' },
  eye: 'band',
  torso: [{ box: [0.3, 0.2, 0.03], at: [0.02, 0.26, 0.13], c: 'tear' }, { ball: [0.28, 0.2, 0.2], at: [0, 0.54, -0.1], c: 'limpet' }],
  head: [{ box: [0.2, 0.06, 0.32], at: [0, 0.3, 0], c: 'salt' }, { box: [0.14, 0.08, 0.04], at: [0, 0.03, 0.16], c: 'tear' }, limpetNeck],
});

export const monk = puppet({
  id: 'monk', about: 'Cowled Monk: dark habit, cowl, rope belt, chanting',
  palette: { skin: 'slate', coat: 'plum', pants: 'plum', boot: 'ink', band: 'orange', cowl: 'night', rope: 'sand', trim: 'red', limpet: 'teal' },
  torso: [{ box: [0.46, 0.06, 0.3], at: [0, 0.1, 0], c: 'rope' }, { box: [0.06, 0.48, 0.02], at: [0, 0.3, 0.135], c: 'trim' }, { box: [0.4, 0.14, 0.3], at: [0, 0.54, -0.02], c: 'cowl' }],
  pelvis: [{ box: [0.52, 0.5, 0.36], at: [0, -0.24, 0], c: 'coat' }],
  head: [
    { box: [0.36, 0.14, 0.34], at: [0, 0.3, -0.01], c: 'cowl' },
    { box: [0.05, 0.28, 0.32], at: [-0.17, 0.14, -0.01], c: 'cowl' },
    { box: [0.05, 0.28, 0.32], at: [0.17, 0.14, -0.01], c: 'cowl' },
    { box: [0.36, 0.28, 0.08], at: [0, 0.14, -0.15], c: 'cowl' },
    limpetNeck,
  ],
});

export const knight = puppet({
  id: 'knight', about: 'Reliquary Knight: plate and tabard, a helmet that comes off, a halberd',
  palette: { skin: 'mist', coat: 'slate', pants: 'slate', boot: 'night', band: 'orange', plate: 'mist', plate2: 'slate', tabard: 'red', trim: 'sand', helm: 'mist', helm2: 'sand', rivet: 'night' },
  torsoBox: [0.5, 0.52, 0.32], pelvisBox: [0.5, 0.22, 0.32], armW: 0.15, legW: 0.18, sleeve: 'plate', pants: 'plate2', boot: 'plate', glove: 'plate2',
  torso: [
    { box: [0.3, 0.46, 0.03], at: [0, 0.3, 0.165], c: 'tabard' },
    { box: [0.3, 0.04, 0.03], at: [0, 0.48, 0.17], c: 'trim' },
    { box: [0.54, 0.12, 0.36], at: [0, 0.5, 0], c: 'plate' },
  ],
  pelvis: [{ box: [0.3, 0.36, 0.03], at: [0, -0.16, 0.17], c: 'tabard' }],
  armR: [{ box: [0.2, 0.12, 0.2], at: [-0.01, -0.02, 0], c: 'plate' }],
  armL: [{ box: [0.2, 0.12, 0.2], at: [0.01, -0.02, 0], c: 'plate' }],
  head: [{
    group: [
      { box: [0.36, 0.26, 0.36], at: [0, 0.18, 0], c: 'helm' },
      { box: [0.24, 0.05, 0.04], at: [0, 0.17, 0.18], c: 'rivet' },
      { box: [0.05, 0.3, 0.38], at: [0, 0.24, 0], c: 'helm2' },
      { cone: [0.12, 0.14, 0.12], at: [0, 0.38, 0], c: 'helm2', seg: 6 },
    ],
    name: 'Helmet', pivot: true, at: [0, 0, 0],
  }],
});

export const drowned = puppet({
  id: 'drowned', about: 'Drowned: bloated, weed-hung, rising from the causeway',
  palette: { skin: 'teal', coat: 'green', pants: 'navy', boot: 'night', band: 'cyan', weed: 'lime', rag: 'night', limpet: 'plum' },
  torso: [{ box: [0.08, 0.34, 0.03], at: [0.1, 0.24, 0.14], c: 'weed' }, { box: [0.06, 0.26, 0.03], at: [-0.1, 0.3, 0.14], c: 'weed' }, { box: [0.3, 0.16, 0.03], at: [0, 0.14, -0.14], c: 'rag' }],
  head: [{ box: [0.14, 0.26, 0.03], at: [-0.09, 0.2, 0.17], c: 'weed' }, { box: [0.32, 0.06, 0.32], at: [0, 0.3, 0], c: 'weed' }, limpetNeck],
  armR: [{ box: [0.05, 0.3, 0.05], at: [-0.06, -0.16, 0], c: 'weed' }],
});

export const harpooner = puppet({
  id: 'harpooner', about: 'Boat Harpooner: slicker, sou\'wester, a big harpoon always ready',
  palette: { skin: 'mist', coat: 'orange', pants: 'night', boot: 'ink', band: 'orange', hat: 'orange', belt: 'night', limpet: 'plum' },
  head: [...sou('hat'), limpetNeck],
  torso: [{ box: [0.44, 0.06, 0.28], at: [0, 0.15, 0], c: 'belt' }],
});

export const ansgar = puppet({
  id: 'ansgar', about: 'Mate Ansgar: pea coat, broad as a door, one good gaff hook',
  palette: { skin: 'sand', coat: 'navy', pants: 'night', boot: 'ink', band: 'orange', hat: 'night', beard: 'plum', button: 'sand', limpet: 'teal' },
  torsoBox: [0.56, 0.54, 0.34], pelvisBox: [0.54, 0.22, 0.34], armW: 0.17, legW: 0.19,
  torso: [{ box: [0.05, 0.34, 0.02], at: [0.1, 0.3, 0.175], c: 'button' }, { box: [0.05, 0.34, 0.02], at: [-0.1, 0.3, 0.175], c: 'button' }, { box: [0.58, 0.12, 0.36], at: [0, 0.52, 0], c: 'hat' }],
  head: [...cap('hat'), { box: [0.27, 0.16, 0.05], at: [0, 0.03, 0.16], c: 'beard' }, limpetNeck],
});

export const commodore = puppet({
  id: 'commodore', about: 'Commodore Anselm Thole: gaunt, peaked cap, far too many medals, dressing gown under the coat, slippers',
  palette: { skin: 'white', coat: 'navy', pants: 'red', boot: 'red', band: 'orange', hat: 'navy', peak: 'ink', braid: 'sand', medal: 'orange', medal2: 'cyan', gown: 'red' },
  torsoBox: [0.34, 0.5, 0.2], pelvisBox: [0.34, 0.2, 0.22], armW: 0.09, legW: 0.1,
  torso: [
    { box: [0.08, 0.5, 0.02], at: [0, 0.3, 0.105], c: 'gown' },
    { box: [0.04, 0.04, 0.02], at: [0.1, 0.46, 0.11], c: 'medal' },
    { box: [0.04, 0.04, 0.02], at: [0.1, 0.38, 0.11], c: 'medal2' },
    { box: [0.04, 0.04, 0.02], at: [0.1, 0.3, 0.11], c: 'medal' },
    { box: [0.04, 0.04, 0.02], at: [0.1, 0.22, 0.11], c: 'medal2' },
    { box: [0.04, 0.04, 0.02], at: [-0.1, 0.46, 0.11], c: 'medal2' },
    { box: [0.04, 0.04, 0.02], at: [-0.1, 0.38, 0.11], c: 'medal' },
    { box: [0.04, 0.04, 0.02], at: [-0.1, 0.3, 0.11], c: 'medal2' },
    { box: [0.5, 0.05, 0.26], at: [0, 0.56, 0], c: 'braid' },
  ],
  pelvis: [{ box: [0.38, 0.42, 0.24], at: [0, -0.2, 0], c: 'gown' }],
  head: [
    { box: [0.36, 0.09, 0.36], at: [0, 0.31, 0], c: 'hat' },
    { box: [0.3, 0.03, 0.14], at: [0, 0.27, 0.2], c: 'peak' },
    { box: [0.34, 0.03, 0.34], at: [0, 0.27, 0], c: 'braid' },
  ],
});

export const fathom = puppet({
  id: 'fathom', about: 'Mr. Fathom: brass diving helmet with a round porthole, oilskin coat, green starboard lantern',
  palette: { skin: 'orange', coat: 'navy', pants: 'night', boot: 'ink', brass: 'sand', brass2: 'orange', glass: 'lime', bolt: 'plum', lantern: 'lime', iron: 'ink', hose: 'slate' },
  noFace: true, skin: 'brass', headBox: [0.42, 0.42, 0.42], glove: 'hose',
  torso: [
    { box: [0.5, 0.1, 0.34], at: [0, 0.54, 0], c: 'brass2' },
    { box: [0.46, 0.16, 0.05], at: [0, 0.14, -0.16], c: 'hose' },
    { box: [0.08, 0.4, 0.08], at: [0.14, 0.34, -0.17], c: 'hose' },
  ],
  pelvis: [{ box: [0.5, 0.46, 0.32], at: [0, -0.2, 0], c: 'coat' }],
  head: [
    { ball: [0.52, 0.5, 0.52], at: [0, 0.16, 0], c: 'brass' },
    { torus: [0.3, 0.05, 0.3], at: [0, 0.17, 0.25], rot: [90, 0, 0], c: 'brass2' },
    { box: [0.2, 0.2, 0.02], at: [0, 0.17, 0.25], c: 'glass', glow: true },
    { box: [0.06, 0.06, 0.04], at: [-0.25, 0.17, 0.08], c: 'bolt' },
    { box: [0.06, 0.06, 0.04], at: [0.25, 0.17, 0.08], c: 'bolt' },
    { box: [0.06, 0.04, 0.06], at: [0, 0.43, 0.02], c: 'bolt' },
    { box: [0.14, 0.14, 0.14], at: [0, 0.16, -0.27], c: 'brass2' },
  ],
  handL: [
    { box: [0.05, 0.1, 0.05], at: [0, -0.1, 0], c: 'iron' },
    { box: [0.16, 0.2, 0.16], at: [0, -0.24, 0], c: 'lantern', glow: true },
    { box: [0.2, 0.03, 0.2], at: [0, -0.13, 0], c: 'iron' },
    { box: [0.2, 0.03, 0.2], at: [0, -0.35, 0], c: 'iron' },
  ],
});

export const bosun = puppet({
  id: 'bosun', about: 'The Bosun: barnacle-crusted enforcer, three brine sacs on his back. Placed at scale 2.6.',
  palette: { skin: 'slate', coat: 'night', pants: 'ink', boot: 'ink', band: 'orange', crust: 'mist', crust2: 'sand', sac: 'lime', strap: 'plum' },
  torsoBox: [0.56, 0.54, 0.36], pelvisBox: [0.52, 0.24, 0.36], armW: 0.18, legW: 0.2,
  torso: [
    { lump: [0.22, 0.16, 0.12], at: [0.16, 0.42, 0.17], c: 'crust', seed: 2 },
    { lump: [0.16, 0.2, 0.1], at: [-0.17, 0.22, 0.17], c: 'crust2', seed: 3 },
    { lump: [0.26, 0.14, 0.26], at: [-0.28, 0.52, 0], c: 'crust', seed: 4 },
    { lump: [0.26, 0.14, 0.26], at: [0.28, 0.52, 0], c: 'crust2', seed: 5 },
    { box: [0.58, 0.05, 0.38], at: [0, 0.32, 0], rot: [0, 0, 20], c: 'strap' },
  ],
  armR: [{ lump: [0.2, 0.14, 0.2], at: [-0.02, -0.08, 0], c: 'crust', seed: 7 }],
  armL: [{ lump: [0.2, 0.14, 0.2], at: [0.02, -0.08, 0], c: 'crust2', seed: 8 }],
  head: [{ lump: [0.22, 0.12, 0.2], at: [0.05, 0.32, 0], c: 'crust', seed: 9 }, { lump: [0.14, 0.12, 0.1], at: [-0.17, 0.09, 0.02], c: 'crust2', seed: 10 }],
});

export const bathysphere = puppet({
  id: 'bathysphere', about: 'The Bathysphere of Saint Orrin: a brass ball on walking legs, porthole, pipes, valves. Placed at scale 2.4.',
  palette: { skin: 'sand', coat: 'sand', pants: 'orange', boot: 'plum', glass: 'cyan', iron: 'night', brass: 'sand', brass2: 'orange', valve: 'red', pipe: 'slate', chair: 'red', man: 'white' },
  noFace: true, headBox: [0.3, 0.2, 0.3], skin: 'pipe', torsoBox: [0.3, 0.3, 0.3], sleeve: 'pipe', glove: 'iron', armW: 0.14, legW: 0.2,
  torso: [
    { name: 'sphere', ball: [0.92, 0.92, 0.92], at: [0, 0.34, 0], c: 'brass' },
    { torus: [0.96, 0.06, 0.96], at: [0, 0.34, 0], c: 'brass2' },
    { torus: [0.5, 0.08, 0.5], at: [0, 0.38, 0.42], rot: [90, 0, 0], c: 'iron' },
    { box: [0.34, 0.34, 0.03], at: [0, 0.38, 0.45], c: 'glass', glow: true },
    { box: [0.14, 0.14, 0.02], at: [0, 0.32, 0.47], c: 'chair' },
    { box: [0.05, 0.08, 0.02], at: [0, 0.42, 0.475], c: 'man' },
    { cyl: [0.08, 0.5, 0.08], at: [-0.3, 0.7, -0.3], c: 'pipe' },
    { cyl: [0.08, 0.4, 0.08], at: [0.26, 0.74, -0.32], c: 'pipe' },
  ],
  head: [{ cyl: [0.14, 0.26, 0.14], at: [0, 0.32, 0], c: 'pipe' }, { box: [0.2, 0.06, 0.2], at: [0, 0.46, 0], c: 'brass2' }],
});

export const bosunSac = model({
  id: 'bosun-sac', about: 'A brine sac on the Bosun: dull on his back, glowing when he is down and it is exposed, a torn flap once burst',
  tags: ['boss', 'part'], floats: true,
  palette: { sac: 'green', lit: 'lime', torn: 'ink' },
  parts: [
    { group: [{ ball: [0.2, 0.2, 0.14], c: 'sac' }], name: 'dull', pivot: true, at: [0, 0, 0] },
    { group: [{ ball: [0.2, 0.2, 0.14], c: 'lit', glow: true }], name: 'lit', pivot: true, at: [0, 0, 0] },
    { group: [{ lump: [0.16, 0.08, 0.05], c: 'torn', seed: 11 }], name: 'torn', pivot: true, at: [0, 0, 0] },
  ],
});

export const bathyValve = model({
  id: 'bathy-valve', about: 'A valve on the Bathysphere, glowing red until it bursts and leaves a stub',
  tags: ['boss', 'part'], floats: true,
  palette: { valve: 'red', stub: 'night' },
  parts: [
    { group: [{ cyl: [0.14, 0.08, 0.14], rot: [0, 0, 90], c: 'valve', glow: true }], name: 'lit', pivot: true, at: [0, 0, 0] },
    { group: [{ cyl: [0.06, 0.1, 0.06], rot: [0, 0, 90], c: 'stub' }], name: 'torn', pivot: true, at: [0, 0, 0] },
  ],
});

export const bathyLock = model({
  id: 'bathy-lock', about: 'A hatch lock on the Bathysphere: an iron block and its hasp',
  tags: ['boss', 'part'], floats: true,
  palette: { iron: 'night', hasp: 'mist' },
  parts: [
    { box: [0.09, 0.09, 0.06], c: 'iron' },
    { box: [0.05, 0.02, 0.07], at: [0, 0.02, 0.01], c: 'hasp' },
  ],
});

export const motherLimpet = model({
  id: 'mother-limpet', about: 'The Mother: a 3.5 m limpet with the Commodore fused on top, still broadcasting',
  tags: ['creature', 'boss'],
  palette: { shell: 'plum', shell2: 'night', flesh: 'red', eye: 'lime', ridge: 'mist', tent: 'teal', man: 'white', coat: 'navy', mic: 'sand', hat: 'navy' },
  parts: [
    { name: 'dome', ball: [3.4, 2.5, 3.4], at: [0, 1.26, 0], half: true, c: 'shell' },
    { torus: [3.5, 0.5, 3.5], at: [0, 0.26, 0], c: 'shell2' },
    { lump: [0.9, 0.5, 0.7], at: [-0.9, 1.6, 0.6], c: 'ridge', seed: 2 },
    { lump: [0.7, 0.4, 0.6], at: [1.0, 1.4, -0.5], c: 'ridge', seed: 3 },
    { lump: [0.6, 0.5, 0.6], at: [0.3, 1.9, -0.9], c: 'ridge', seed: 4 },
    { ball: [1.2, 0.9, 0.5], at: [0, 0.95, 1.45], c: 'flesh' },
    { group: [
      { ball: [0.46, 0.46, 0.2], at: [0, 0, 0], c: 'eye', glow: true },
    ], name: 'Eye', pivot: true, at: [0, 1.0, 1.72] },
    { group: [
      { box: [0.44, 0.55, 0.26], at: [0, 0.28, 0], c: 'coat' },
      { box: [0.3, 0.3, 0.3], at: [0, 0.72, 0], c: 'man' },
      { box: [0.36, 0.09, 0.36], at: [0, 0.9, 0], c: 'hat' },
      { box: [0.27, 0.05, 0.04], at: [0, 0.76, 0.16], c: 'eye', glow: true },
      { group: [{ box: [0.1, 0.14, 0.08], at: [0, 0.02, 0], c: 'mic' }, { cyl: [0.03, 0.2, 0.03], at: [0, -0.14, 0], c: 'mic' }], name: 'Mic', pivot: true, at: [0, 0.38, 0.22] },
    ], name: 'Rider', pivot: true, at: [0, 2.2, 0.35] },
    ...[0, 60, 120, 180, 240, 300].map((a, i) => ({
      tube: [[Math.sin(a * 0.01745) * 1.5, 0.2, Math.cos(a * 0.01745) * 1.5], [Math.sin(a * 0.01745) * 2.1, 0.18, Math.cos(a * 0.01745) * 2.1], [Math.sin((a + 12) * 0.01745) * 2.5, 0.2, Math.cos((a + 12) * 0.01745) * 2.5]],
      r: [0.16, 0.05], c: 'tent', name: `tent${i}`,
    })),
  ],
});

export const limpet = model({
  id: 'limpet', about: 'Limpet: a low shelled crawler on tentacle legs, the size of a dinner plate',
  tags: ['creature'],
  palette: { shell: 'plum', ridge: 'mist', tent: 'teal', eye: 'orange' },
  parts: [
    { ball: [0.42, 0.26, 0.42], at: [0, 0.135, 0], half: true, c: 'shell' },
    { box: [0.05, 0.05, 0.3], at: [0, 0.2, 0], c: 'ridge' },
    { box: [0.14, 0.05, 0.04], at: [0, 0.12, 0.2], c: 'eye', glow: true },
    ...[-60, -20, 20, 60, 120, 160, 200, 240].map((a, i) => ({
      tube: [[Math.sin(a * 0.01745) * 0.16, 0.06, Math.cos(a * 0.01745) * 0.16], [Math.sin(a * 0.01745) * 0.32, 0.03, Math.cos(a * 0.01745) * 0.32]],
      r: [0.04, 0.025], c: 'tent', name: `leg${i}`,
    })),
  ],
});

export const HUMAN_DEFS = [max, dame, nils, islander, islander2, islander3, netwife, bottler, deckhand, carrier, flenser, resalted, monk, knight, drowned, harpooner, ansgar, commodore, fathom, bosunSac, bathyValve, bathyLock, bosun, bathysphere, motherLimpet, limpet];
