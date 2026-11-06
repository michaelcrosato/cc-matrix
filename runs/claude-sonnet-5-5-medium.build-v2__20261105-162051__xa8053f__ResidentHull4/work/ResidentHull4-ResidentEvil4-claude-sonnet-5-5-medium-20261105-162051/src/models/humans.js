// Humanoid puppets on the hero rig (HERO_RIG joint names and rest offsets). No engine start here.
import { model } from '../../pixel-engine.js';

const J = (name, at, parts) => ({ group: parts, name, pivot: true, at });

/**
 * def: { id, about, palette:{coat,band,pants,skin,hat,boot,hair,extra}, head:[parts], torso:[parts], pelvis:[parts], handR:[parts], handL:[parts], bulk }
 * Returns a model def. Parts of accessories use slot names that must exist in the palette.
 */
export function human(def) {
  const bulk = def.bulk ?? 1;
  const pal = { coat: 'teal', band: 'orange', pants: 'night', skin: 'mist', hat: 'navy', boot: 'ink', hair: 'ink', extra: 'sand', ...def.palette };
  const arm = (side) => {
    const sx = side === 'R' ? -1 : 1;
    return J('Arm' + side, [sx * 0.27 * bulk, 0.52, 0], [
      { box: [0.13 * bulk, 0.3, 0.13 * bulk], at: [0, -0.12, 0], c: 'coat' },
      J('Forearm' + side, [0, -0.25, 0], [
        { box: [0.11 * bulk, 0.26, 0.11 * bulk], at: [0, -0.09, 0], c: def.sleeve ?? 'coat' },
        J('Hand' + side, [0, -0.16, 0], [{ box: [0.11, 0.11, 0.11], at: [0, -0.04, 0], c: 'skin' }, ...(def['hand' + side] ?? [])]),
      ]),
    ]);
  };
  const leg = (side) => {
    const sx = side === 'R' ? -1 : 1;
    return J('Leg' + side, [sx * 0.14 * bulk, 0, 0], [
      { box: [0.17 * bulk, 0.34, 0.17 * bulk], at: [0, -0.14, 0], c: 'pants' },
      J('Shin' + side, [0, -0.3, 0], [
        { box: [0.14 * bulk, 0.26, 0.14 * bulk], at: [0, -0.1, 0], c: def.shin ?? 'pants' },
        J('Foot' + side, [0, -0.22, 0], [{ box: [0.15 * bulk, 0.09, 0.27], at: [0, -0.055, 0.05], c: 'boot' }]),
      ]),
    ]);
  };
  return model({
    id: def.id,
    about: def.about ?? 'A puppet on the hero rig',
    tags: ['character', ...(def.tags ?? [])],
    palette: pal,
    parts: [
      J('Pelvis', [0, 0.62, 0], [
        { box: [0.44 * bulk, 0.2, 0.28 * bulk], at: [0, 0.02, 0], c: 'pants' },
        ...(def.pelvis ?? []),
        J('Torso', [0, 0, 0], [
          { box: [0.42 * bulk, 0.48, 0.26 * bulk], at: [0, 0.32, 0], c: 'coat' },
          ...(def.torso ?? []),
          J('Head', [0, 0.6, 0], [
            { box: [0.31, 0.3, 0.3], at: [0, 0.13, 0], c: 'skin' },
            ...(def.noBand ? [] : [{ box: [0.27, 0.07, 0.04], at: [0, 0.16, 0.16], c: 'band', glow: true }]),
            ...(def.head ?? []),
          ]),
          arm('R'), arm('L'),
        ]),
        leg('R'), leg('L'),
      ]),
    ],
  });
}

// ---- the cast ----
const hairBack = (c = 'hair') => ({ box: [0.33, 0.2, 0.1], at: [0, 0.2, -0.13], c });
const hairTop = (c = 'hair') => ({ box: [0.33, 0.08, 0.32], at: [0, 0.3, 0], c });
const swHat = (c = 'hat') => [{ box: [0.38, 0.06, 0.38], at: [0, 0.29, 0], c }, { box: [0.3, 0.1, 0.3], at: [0, 0.33, 0], c }, { box: [0.34, 0.12, 0.1], at: [0, 0.22, -0.2], c }];
const cap = (c = 'hat') => [{ box: [0.33, 0.1, 0.33], at: [0, 0.31, 0], c }, { box: [0.3, 0.03, 0.12], at: [0, 0.26, 0.2], c }];
const belt = () => ({ box: [0.44, 0.06, 0.28], at: [0, 0.06, 0], c: 'boot' });

export const max = human({
  id: 'max', about: 'Max Ransom: grey trench coat, red scarf, sunglasses', noBand: true,
  palette: { coat: 'slate', skin: 'mist', hair: 'sand', scarf: 'red', pants: 'night', boot: 'ink', glasses: 'ink', belt: 'ink' },
  head: [hairBack(), hairTop(), { box: [0.28, 0.07, 0.04], at: [0, 0.16, 0.16], c: 'glasses' }, { box: [0.06, 0.07, 0.3], at: [0.15, 0.16, 0], c: 'glasses' }],
  torso: [{ box: [0.36, 0.1, 0.3], at: [0, 0.6, 0], c: 'scarf' }, { box: [0.12, 0.34, 0.06], at: [0.12, 0.36, -0.15], c: 'scarf' }, { box: [0.44, 0.05, 0.28], at: [0, 0.1, 0], c: 'belt' }, { box: [0.04, 0.4, 0.04], at: [0, 0.3, -0.14], c: 'belt' }],
  pelvis: [{ box: [0.5, 0.34, 0.32], at: [0, -0.15, 0], c: 'coat' }],
});
export const dame = human({
  id: 'dame', about: 'Dame Ottoline Vane: fur coat, ebony cane, feathered hat', noBand: true, bulk: 0.9,
  palette: { coat: 'plum', skin: 'mist', hair: 'white', hat: 'navy', feather: 'red', pants: 'night', boot: 'ink', cane: 'ink', bag: 'sand', fur: 'mist' },
  head: [hairBack(), { box: [0.36, 0.05, 0.36], at: [0, 0.29, 0], c: 'hat' }, { box: [0.24, 0.1, 0.24], at: [0, 0.35, 0], c: 'hat' }, { box: [0.04, 0.2, 0.04], at: [0.1, 0.45, 0.02], c: 'feather' }],
  torso: [{ box: [0.46, 0.1, 0.32], at: [0, 0.55, 0], c: 'fur' }],
  pelvis: [{ box: [0.5, 0.26, 0.32], at: [0, -0.1, 0], c: 'coat' }],
  handR: [{ box: [0.04, 0.72, 0.04], at: [0, -0.2, 0.06], c: 'cane' }, { box: [0.1, 0.04, 0.04], at: [0, 0.16, 0.06], c: 'cane' }],
  handL: [{ box: [0.16, 0.14, 0.08], at: [0, -0.12, 0], c: 'bag' }],
});
export const islander = human({
  id: 'islander', about: 'Oilskin-clad islander on the hero rig', tags: ['enemy'],
  palette: { coat: 'teal', band: 'orange', pants: 'night', skin: 'mist', hat: 'sand', boot: 'ink' },
  head: swHat(), torso: [belt()],
});
export const islanderCap = human({
  id: 'islander-cap', about: 'Islander in a flat cap', tags: ['enemy'],
  palette: { coat: 'slate', band: 'orange', pants: 'plum', skin: 'mist', hat: 'navy', boot: 'ink' }, head: cap(), torso: [belt()],
});
export const islanderBare = human({
  id: 'islander-bare', about: 'Bareheaded islander in a jumper', tags: ['enemy'],
  palette: { coat: 'sand', band: 'orange', pants: 'navy', skin: 'mist', hair: 'ink', boot: 'ink' }, head: [hairBack(), hairTop()], torso: [belt()],
});
export const netwife = human({
  id: 'netwife', about: 'Net-wife in a headscarf', tags: ['enemy'], palette: { coat: 'plum', band: 'orange', pants: 'night', skin: 'mist', hat: 'red', boot: 'ink', net: 'sand' },
  head: [{ box: [0.35, 0.12, 0.34], at: [0, 0.27, 0], c: 'hat' }, { box: [0.3, 0.3, 0.06], at: [0, 0.12, -0.17], c: 'hat' }], pelvis: [{ box: [0.5, 0.26, 0.3], at: [0, -0.1, 0], c: 'coat' }],
  handR: [{ box: [0.2, 0.2, 0.2], at: [0, -0.1, 0.05], c: 'net' }],
});
export const bottler = human({
  id: 'bottler', about: 'Bottler with a whale-oil bottle', tags: ['enemy'], palette: { coat: 'orange', band: 'red', pants: 'night', skin: 'mist', hat: 'ink', boot: 'ink', glass: 'cyan', oil: 'orange' },
  head: cap('hat'), torso: [belt()], handR: [{ box: [0.1, 0.2, 0.1], at: [0, -0.1, 0.04], c: 'glass' }, { box: [0.06, 0.08, 0.06], at: [0, 0.02, 0.04], c: 'oil' }],
});
export const deckhand = human({
  id: 'deckhand', about: 'Deckhand with a boathook', tags: ['enemy'], palette: { coat: 'navy', band: 'orange', pants: 'slate', skin: 'mist', hat: 'white', boot: 'ink', hook: 'slate', pole: 'orange' },
  head: [{ box: [0.33, 0.1, 0.33], at: [0, 0.31, 0], c: 'hat' }, { box: [0.3, 0.03, 0.12], at: [0, 0.26, 0.2], c: 'hat' }],
  handR: [{ box: [0.04, 1.2, 0.04], at: [0, -0.1, 0.08], c: 'pole' }, { box: [0.04, 0.04, 0.16], at: [0, 0.5, 0.15], c: 'hook' }],
});
export const carrier = human({
  id: 'carrier', about: 'Carrier with a sack over his head', tags: ['enemy'], bulk: 1.15, palette: { coat: 'sand', band: 'orange', pants: 'slate', skin: 'sand', hat: 'sand', boot: 'ink' },
  head: [{ box: [0.36, 0.34, 0.36], at: [0, 0.14, 0], c: 'hat' }],
});
export const flenser = human({
  id: 'flenser', about: 'The Flenser: rubber apron, sack hood, steam saw', tags: ['enemy', 'boss'], bulk: 1.2, palette: { coat: 'ink', band: 'orange', pants: 'night', skin: 'mist', hat: 'sand', boot: 'ink', apron: 'red', saw: 'slate', steam: 'white' },
  head: [{ box: [0.38, 0.38, 0.38], at: [0, 0.14, 0], c: 'hat' }],
  torso: [{ box: [0.46, 0.5, 0.06], at: [0, 0.3, 0.15], c: 'apron' }],
  handR: [{ box: [0.1, 0.1, 0.6], at: [0, -0.05, 0.3], c: 'saw' }, { box: [0.06, 0.36, 0.5], at: [0, -0.05, 0.6], c: 'saw' }, { box: [0.1, 0.12, 0.1], at: [0, 0.07, 0.02], c: 'steam' }],
});
export const monk = human({
  id: 'monk', about: 'Cowled monk with a flail', tags: ['enemy'], palette: { coat: 'night', band: 'cyan', pants: 'night', skin: 'mist', hat: 'night', boot: 'ink', iron: 'slate', shield: 'sand' },
  head: [{ box: [0.38, 0.38, 0.38], at: [0, 0.14, -0.02], c: 'hat' }], pelvis: [{ box: [0.5, 0.42, 0.32], at: [0, -0.2, 0], c: 'coat' }],
  handR: [{ box: [0.04, 0.4, 0.04], at: [0, -0.2, 0.1], c: 'iron' }, { box: [0.14, 0.14, 0.14], at: [0, -0.45, 0.1], c: 'iron' }],
  handL: [{ box: [0.04, 0.5, 0.4], at: [0, -0.1, 0.2], c: 'shield' }],
});
export const knight = human({
  id: 'knight', about: 'Reliquary Knight in sparking armour, halberd', tags: ['enemy', 'boss'], bulk: 1.3, noBand: true, palette: { coat: 'mist', band: 'cyan', pants: 'slate', skin: 'slate', hat: 'slate', boot: 'night', iron: 'sand', visor: 'ink' },
  head: [{ box: [0.38, 0.38, 0.38], at: [0, 0.14, 0], c: 'hat' }, { box: [0.28, 0.05, 0.04], at: [0, 0.14, 0.2], c: 'visor' }, { box: [0.06, 0.16, 0.2], at: [0, 0.38, 0], c: 'iron' }],
  torso: [{ box: [0.62, 0.14, 0.34], at: [0, 0.52, 0], c: 'pants' }],
  handR: [{ box: [0.05, 1.6, 0.05], at: [0, 0.2, 0.1], c: 'pants' }, { box: [0.3, 0.3, 0.05], at: [0, 1.0, 0.1], c: 'iron' }],
});
export const drowned = human({
  id: 'drowned', about: 'Drowned, risen out of the causeway', tags: ['enemy'], palette: { coat: 'teal', band: 'cyan', pants: 'navy', skin: 'cyan', hat: 'green', boot: 'green', weed: 'green' },
  head: [hairBack('weed'), { box: [0.34, 0.12, 0.34], at: [0, 0.28, 0], c: 'weed' }], torso: [{ box: [0.1, 0.4, 0.06], at: [0.1, 0.3, 0.15], c: 'weed' }],
});
export const harpooner = human({
  id: 'harpooner', about: 'Boat harpooner in oilskins', tags: ['enemy'], palette: { coat: 'orange', band: 'red', pants: 'night', skin: 'mist', hat: 'orange', boot: 'ink', iron: 'slate', pole: 'sand' },
  head: swHat('hat'), handR: [{ box: [0.05, 0.05, 1.1], at: [0, -0.05, 0.4], c: 'pole' }, { box: [0.08, 0.08, 0.2], at: [0, -0.05, 1.0], c: 'iron' }],
});
export const ansgar = human({
  id: 'ansgar', about: 'Mate Ansgar, cannery bruiser with a gaff hook', tags: ['enemy', 'boss'], bulk: 1.3, palette: { coat: 'navy', band: 'orange', pants: 'night', skin: 'mist', hat: 'ink', boot: 'ink', iron: 'slate', pole: 'orange' },
  head: cap('hat'), torso: [{ box: [0.5, 0.06, 0.3], at: [0, 0.1, 0], c: 'iron' }],
  handR: [{ box: [0.05, 0.7, 0.05], at: [0, -0.1, 0.1], c: 'pole' }, { box: [0.05, 0.05, 0.18], at: [0, 0.28, 0.17], c: 'iron' }],
});
export const nils = human({
  id: 'nils', about: 'Nils the boatman in a sou-wester', noBand: true, palette: { coat: 'sand', pants: 'navy', skin: 'mist', hat: 'orange', boot: 'ink' }, head: swHat(),
});
export const fathom = human({
  id: 'fathom', about: 'Mr. Fathom: brass diving helmet, oilskin coat, green lantern', noBand: true, bulk: 1.15,
  palette: { coat: 'orange', skin: 'sand', pants: 'night', boot: 'ink', brass: 'sand', glass: 'green', bolt: 'orange', lantern: 'lime', frame: 'slate' },
  head: [{ box: [0.4, 0.4, 0.4], at: [0, 0.13, 0], c: 'brass' }, { ball: [0.3, 0.3, 0.12], at: [0, 0.16, 0.2], c: 'glass', glow: true }, { box: [0.08, 0.08, 0.08], at: [0.19, 0.3, 0.1], c: 'bolt' }, { box: [0.08, 0.08, 0.08], at: [-0.19, 0.3, 0.1], c: 'bolt' }, { box: [0.12, 0.2, 0.12], at: [0, 0.37, 0], c: 'brass' }],
  torso: [{ box: [0.5, 0.1, 0.34], at: [0, 0.55, 0], c: 'brass' }],
  handL: [{ box: [0.04, 0.2, 0.04], at: [0, 0, 0], c: 'frame' }, { box: [0.14, 0.16, 0.14], at: [0, -0.16, 0], c: 'lantern', glow: true }],
});
export const commodore = human({
  id: 'commodore', about: 'Commodore Thole: peaked cap, far too many medals, dressing gown', noBand: true, bulk: 0.85,
  palette: { coat: 'navy', skin: 'mist', hair: 'white', hat: 'white', pants: 'plum', boot: 'ink', medal: 'sand', gown: 'red' },
  head: [{ box: [0.36, 0.1, 0.36], at: [0, 0.3, 0], c: 'hat' }, { box: [0.3, 0.03, 0.14], at: [0, 0.26, 0.2], c: 'hat' }, hairBack()],
  torso: [{ box: [0.1, 0.1, 0.04], at: [0.1, 0.5, 0.14], c: 'medal' }, { box: [0.1, 0.1, 0.04], at: [-0.05, 0.4, 0.14], c: 'medal' }, { box: [0.1, 0.1, 0.04], at: [0.1, 0.3, 0.14], c: 'medal' }],
  pelvis: [{ box: [0.5, 0.4, 0.32], at: [0, -0.2, 0], c: 'gown' }],
});
export const bosun = human({
  id: 'bosun', about: 'The Bosun: 4 m of barnacle and a dragged anchor', tags: ['boss'], bulk: 1.2, palette: { coat: 'slate', band: 'orange', pants: 'night', skin: 'mist', hat: 'mist', boot: 'ink', sac: 'cyan', iron: 'ink', barn: 'mist' },
  head: [{ box: [0.38, 0.1, 0.38], at: [0, 0.3, 0], c: 'barn' }, { box: [0.1, 0.1, 0.1], at: [0.18, 0.2, 0.1], c: 'barn' }],
  torso: [{ ball: [0.24, 0.24, 0.24], at: [-0.12, 0.45, -0.18], c: 'sac', glow: true }, { ball: [0.24, 0.24, 0.24], at: [0.12, 0.45, -0.18], c: 'sac', glow: true }, { ball: [0.24, 0.24, 0.24], at: [0, 0.2, -0.18], c: 'sac', glow: true }, { box: [0.2, 0.2, 0.2], at: [0.1, 0.5, 0.1], c: 'barn' }],
  handR: [{ box: [0.1, 0.1, 1.2], at: [0, -0.3, 0.5], c: 'iron' }, { box: [0.5, 0.1, 0.1], at: [0, -0.3, 1.1], c: 'iron' }],
});
export const bathysphere = human({
  id: 'bathysphere', about: 'The Bathysphere of Saint Orrin: forty tons of divine plumbing', tags: ['boss'], noBand: true, bulk: 1.0,
  palette: { coat: 'sand', skin: 'orange', pants: 'orange', hat: 'orange', boot: 'slate', glass: 'cyan', pipe: 'slate', valve: 'red', bolt: 'ink', head: 'sand' },
  torso: [{ ball: [1.3, 1.2, 1.2], at: [0, 0.4, 0], c: 'coat' }, { ball: [0.5, 0.5, 0.2], at: [0, 0.5, 0.58], c: 'glass', glow: true }, { box: [0.1, 0.7, 0.1], at: [0.5, 0.6, -0.3], c: 'pipe' }, { box: [0.1, 0.7, 0.1], at: [-0.5, 0.6, -0.3], c: 'pipe' }],
  head: [{ ball: [0.3, 0.3, 0.3], at: [0, 0.1, 0], c: 'head' }],
});
export const limpet = model({
  id: 'limpet', about: 'A limpet scuttling on tentacles', tags: ['enemy'], palette: { shell: 'sand', flesh: 'plum', eye: 'orange' },
  parts: [
    { ball: [0.46, 0.34, 0.46], at: [0, 0.2, 0], c: 'shell', half: true },
    { box: [0.3, 0.1, 0.1], at: [0, 0.14, 0.2], c: 'eye', glow: true },
    ...[-1, 1].flatMap((s) => [0, 1, 2].map((i) => ({ box: [0.06, 0.06, 0.2], at: [s * 0.2, 0.05, -0.15 + i * 0.15], rot: [0, s * 30, 0], c: 'flesh' }))),
  ],
});
export const motherLimpet = model({
  id: 'mother-limpet', about: 'The Mother: a 3.5 m limpet with the Commodore fused on top', tags: ['boss'], palette: { shell: 'sand', shell2: 'mist', flesh: 'plum', eye: 'orange', mic: 'sand', gown: 'red', skin: 'mist' },
  parts: [
    { ball: [3.4, 2.4, 3.4], at: [0, 1.2, 0], c: 'shell', half: true },
    { ball: [2.4, 1.2, 2.4], at: [0, 2.0, 0], c: 'shell2', half: true },
    { ball: [0.9, 0.9, 0.5], at: [0, 1.1, 1.6], c: 'eye', glow: true, name: 'eye' },
    { box: [0.5, 0.7, 0.4], at: [0, 2.8, 0.2], c: 'gown' }, { box: [0.4, 0.4, 0.4], at: [0, 3.35, 0.2], c: 'skin' },
    { box: [0.14, 0.14, 0.14], at: [0, 2.9, 0.5], c: 'mic', name: 'mic' },
    ...[-1, 1].flatMap((s) => [0, 1, 2, 3].map((i) => ({ box: [0.3, 0.3, 1.2], at: [s * 1.7, 0.2, -1.2 + i * 0.8], rot: [0, s * 20, 0], c: 'flesh' }))),
  ],
});
