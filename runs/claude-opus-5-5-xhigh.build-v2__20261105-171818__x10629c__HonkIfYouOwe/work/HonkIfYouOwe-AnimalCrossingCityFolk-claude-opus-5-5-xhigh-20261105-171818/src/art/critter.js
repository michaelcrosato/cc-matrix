// The critter generator: one function makes every neighbour, host, passer-by and the player.
// All of them share the seven-joint rig, so every clip plays on every creature.
import { model } from '../engine.js';

const B = (w, h, d, x, y, z, c, o = {}) => ({ box: [w, h, d], at: [x, y, z], c, ...o });
const BALL = (w, h, d, x, y, z, c, o = {}) => ({ ball: [w, h, d], at: [x, y, z], c, ...o });
const CONE = (w, h, d, x, y, z, c, o = {}) => ({ cone: [w, h, d], at: [x, y, z], c, ...o });
const CYL = (w, h, d, x, y, z, c, o = {}) => ({ cyl: [w, h, d], at: [x, y, z], c, ...o });
const joint = (name, at, parts) => ({ group: parts, at, pivot: true, name });
const mirrorX = (parts) => ({ mirror: parts, axis: 'x' });

/** Default slots; a spec overrides any of them with palette names. */
const SLOTS = { fur: 'mist', belly: 'white', dark: 'ink', shirt: 'blue', trim: 'white', eye: 'ink', accent: 'red', extra: 'sand', white: 'white', orange: 'orange', sand: 'sand', red: 'red', plum: 'plum' };

const ears = {
  none: () => [],
  round: (hw, hh) => [mirrorX([BALL(0.3, 0.3, 0.14, hw * 0.42, hh * 0.92, 0, 'fur')]), mirrorX([BALL(0.16, 0.16, 0.06, hw * 0.42, hh * 0.92, 0.07, 'belly')])],
  small: (hw, hh) => [mirrorX([BALL(0.2, 0.2, 0.12, hw * 0.42, hh * 0.9, 0, 'fur')])],
  long: (hw, hh) => [mirrorX([BALL(0.2, 0.56, 0.14, hw * 0.24, hh * 1.16, -0.02, 'fur', { rot: [0, 0, -8] })]), mirrorX([BALL(0.1, 0.36, 0.05, hw * 0.24, hh * 1.14, 0.05, 'belly', { rot: [0, 0, -8] })])],
  pointy: (hw, hh) => [mirrorX([CONE(0.26, 0.32, 0.14, hw * 0.34, hh * 1.04, 0, 'fur', { rot: [0, 0, -14] })])],
  side: (hw, hh) => [mirrorX([BALL(0.34, 0.16, 0.1, hw * 0.6, hh * 0.68, 0, 'fur', { rot: [0, 0, 18] })])],
  big: (hw, hh) => [mirrorX([BALL(0.44, 0.44, 0.1, hw * 0.52, hh * 0.92, -0.02, 'fur')]), mirrorX([BALL(0.26, 0.26, 0.05, hw * 0.52, hh * 0.92, 0.04, 'belly')])],
};

const shapes = {
  /** Round furred head. */
  round: ({ headW: w, headH: h, headD: d }) => [BALL(w, h, d, 0, h / 2, 0, 'fur', { name: 'skull', seg: 10 })],
  wide: ({ headW: w, headH: h, headD: d }) => [BALL(w * 1.08, h * 0.92, d, 0, h * 0.46, 0, 'fur', { name: 'skull', seg: 10 })],
  long: ({ headW: w, headH: h, headD: d }) => [BALL(w * 0.84, h * 1.06, d * 0.92, 0, h * 0.53, 0, 'fur', { name: 'skull', seg: 10 })],
  box: ({ headW: w, headH: h, headD: d }) => [B(w * 0.92, h * 0.92, d * 0.9, 0, h * 0.46, 0, 'fur', { name: 'skull' })],
};

/** Species features: head extras (in the Head joint), body extras (in the Torso), pelvis extras (tails). */
const FEATURES = {
  snout: ({ headH: h, headD: d }, o = {}) => [BALL(o.w ?? 0.38, o.h ?? 0.26, 0.24, 0, h * (o.y ?? 0.36), d * 0.46, o.c ?? 'belly'), B(o.nw ?? 0.14, 0.1, 0.06, 0, h * ((o.y ?? 0.36) + 0.06), d * 0.46 + 0.12, 'dark')],
  bigNose: ({ headH: h, headD: d }) => [BALL(0.46, 0.3, 0.2, 0, h * 0.34, d * 0.48, 'dark')],
  bill: ({ headH: h, headD: d }) => [B(0.56, 0.1, 0.42, 0, h * 0.36, d * 0.54, 'accent'), B(0.48, 0.08, 0.36, 0, h * 0.28, d * 0.52, 'dark')],
  beak: ({ headH: h, headD: d }, o = {}) => [CONE(o.w ?? 0.24, o.l ?? 0.42, o.w ?? 0.2, 0, h * 0.4, d * 0.56, 'accent', { rot: [90, 0, 0] })],
  antlers: ({ headH: h }) => [mirrorX([
    CYL(0.1, 0.34, 0.1, 0.26, h + 0.1, 0, 'dark'),
    B(0.56, 0.1, 0.2, 0.48, h + 0.28, 0, 'extra'),
    B(0.1, 0.26, 0.12, 0.34, h + 0.42, 0, 'extra'),
    B(0.1, 0.3, 0.12, 0.54, h + 0.44, 0, 'extra'),
    B(0.1, 0.34, 0.12, 0.72, h + 0.42, 0, 'extra'),
  ])],
  laundry: ({ headH: h }) => [B(0.42, 0.36, 0.05, -0.56, h + 0.02, 0.04, 'accent', { rot: [0, 0, -6] }), B(0.28, 0.24, 0.05, 0.56, h + 0.08, 0.04, 'white', { rot: [0, 0, 8] })],
  tiara: ({ headH: h }) => [B(0.42, 0.08, 0.3, 0, h * 0.98, 0, 'extra'), CONE(0.12, 0.18, 0.08, 0, h * 1.08, 0.04, 'extra'), mirrorX([CONE(0.1, 0.13, 0.08, 0.15, h * 1.05, 0.04, 'extra')])],
  bandsHead: ({ headH: h, headW: w }) => [B(w * 0.7, 0.08, 0.72, 0, h * 0.86, 0, 'dark'), B(w * 0.82, 0.08, 0.76, 0, h * 0.74, -0.02, 'dark')],
  eyeRings: ({ headW: w, headH: h, headD: d }) => [mirrorX([BALL(0.26, 0.28, 0.06, w * 0.24, h * 0.58, d * 0.46, 'dark')])],
  mask: ({ headW: w, headH: h, headD: d }) => [B(w * 0.72, 0.14, 0.04, 0, h * 0.6, d * 0.47, 'dark')],
  stripe: ({ headH: h, headD: d }) => [B(0.12, 0.42, d * 0.92, 0, h * 0.86, -0.02, 'dark')],
  fluffyTop: ({ headH: h }) => [BALL(0.6, 0.32, 0.5, 0, h * 0.98, -0.02, 'extra')],
  hairCurtain: ({ headW: w, headH: h, headD: d }) => [
    BALL(w * 1.1, h * 0.7, d * 1.02, 0, h * 0.78, -0.02, 'extra'),
    mirrorX([B(0.3, h * 0.92, d * 0.84, w * 0.42, h * 0.34, -0.03, 'extra')]),
    B(w * 0.5, h * 0.3, 0.06, 0, h * 0.88, d * 0.47, 'extra'),
  ],
  horns: ({ headH: h, headW: w }) => [mirrorX([CONE(0.14, 0.42, 0.14, w * 0.48, h * 0.96, 0, 'dark', { rot: [0, 0, -38] })])],
  spectacles: ({ headW: w, headH: h, headD: d }) => [mirrorX([{ torus: [0.24, 0.05, 0.24], at: [w * 0.2, h * 0.58, d * 0.5], rot: [90, 0, 0], c: 'trim' }]), B(0.1, 0.04, 0.04, 0, h * 0.58, d * 0.5, 'trim')],
  bigGlasses: ({ headW: w, headH: h, headD: d }) => [mirrorX([{ torus: [0.32, 0.06, 0.32], at: [w * 0.22, h * 0.58, d * 0.5], rot: [90, 0, 0], c: 'trim' }]), B(0.1, 0.05, 0.05, 0, h * 0.58, d * 0.5, 'trim')],
  sleepyLids: ({ headW: w, headH: h, headD: d }) => [mirrorX([B(0.2, 0.08, 0.05, w * 0.2, h * 0.68, d * 0.48, 'fur')])],
  antennae: ({ headH: h }) => [mirrorX([{ tube: [[0, 0, 0], [0.08, 0.22, 0.02], [0.24, 0.36, 0.02]], r: 0.03, at: [0.12, h * 0.92, 0.1], c: 'dark' }, BALL(0.14, 0.14, 0.14, 0.36, h * 0.92 + 0.36, 0.12, 'extra')])],
  beeHat: ({ headH: h }) => [{ group: [BALL(0.2, 0.16, 0.16, 0, 0, 0, 'extra'), B(0.06, 0.16, 0.17, 0.03, 0, 0, 'dark'), mirrorX([BALL(0.1, 0.06, 0.12, 0.04, 0.09, -0.04, 'white', { rot: [0, 0, 18] })])], at: [0.04, h + 0.08, 0.02], pivot: true, name: 'Bee' }],
  lashes: ({ headW: w, headH: h, headD: d }) => [mirrorX([B(0.2, 0.05, 0.05, w * 0.22, h * 0.72, d * 0.48, 'dark', { rot: [0, 0, 12] })])],
  whiskers: ({ headH: h, headD: d }) => [mirrorX([B(0.32, 0.03, 0.03, 0.34, h * 0.34, d * 0.4, 'dark')])],
  topHat: ({ headH: h }) => [CYL(0.7, 0.06, 0.7, 0, h * 0.98, 0, 'dark'), CYL(0.46, 0.42, 0.46, 0, h * 1.2, 0, 'dark'), B(0.48, 0.08, 0.48, 0, h * 1.06, 0, 'accent')],
  fez: ({ headH: h }) => [CYL(0.34, 0.26, 0.34, 0, h * 1.08, 0, 'accent', { top: 0.8 })],
  captainHat: ({ headH: h }) => [CYL(0.72, 0.16, 0.72, 0, h * 0.98, 0, 'shirt', { top: 1.15 }), B(0.5, 0.05, 0.2, 0, h * 0.94, 0.3, 'dark')],
  hood: ({ headH: h }) => [BALL(0.96, 0.7, 0.86, 0, h * 0.72, -0.04, 'accent')],
  neck: () => [],
};
const BODY = {
  bands: ({ bodyH: h, bodyW: w }) => [0.28, 0.5, 0.72].map((t) => B(w * 1.03, 0.06, 0.48, 0, h * t, 0, 'dark')),
  bellyPatch: ({ bodyH: h, bodyW: w, bodyD: d }) => [BALL(w * 0.72, h * 0.72, 0.16, 0, h * 0.46, d * 0.42, 'belly')],
  waistcoat: ({ bodyH: h, bodyW: w, bodyD: d }) => [B(w * 0.8, h * 0.7, 0.05, 0, h * 0.5, d * 0.5, 'trim'), B(0.08, h * 0.6, 0.06, 0, h * 0.5, d * 0.51, 'dark')],
  sash: ({ bodyH: h, bodyW: w, bodyD: d }) => [B(0.14, h * 1.1, 0.05, 0, h * 0.5, d * 0.5, 'accent', { rot: [0, 0, 32] })],
  wings: ({ bodyH: h, bodyW: w }) => [mirrorX([BALL(0.2, h * 0.86, 0.4, w * 0.56, h * 0.5, 0, 'fur')])],
  mothWings: ({ bodyH: h, bodyW: w }) => [mirrorX([BALL(0.86, 0.86, 0.06, w * 0.76, h * 0.82, -0.26, 'accent', { rot: [0, 22, 14] }), BALL(0.4, 0.4, 0.05, w * 0.82, h * 0.86, -0.22, 'extra', { rot: [0, 22, 14] })])],
  batWings: ({ bodyH: h, bodyW: w }) => [mirrorX([{ slab: [[0, 0.5], [0.72, 0.42], [0.82, -0.16], [0.46, 0], [0.22, -0.18], [0, 0]], depth: 0.05, at: [w * 0.42, h * 0.34, -0.14], c: 'dark' }])],
  scales: ({ bodyH: h, bodyW: w, bodyD: d }) => [0.2, 0.46, 0.72].flatMap((t) => [-0.16, 0.16].map((x) => B(0.22, 0.12, 0.12, x, h * t, -d * 0.44, 'dark', { rot: [20, 0, 0] }))),
  cardigan: ({ bodyH: h, bodyW: w, bodyD: d }) => [B(w * 1.06, h * 0.86, d * 1.06, 0, h * 0.46, 0, 'shirt'), B(0.08, h * 0.8, 0.04, 0, h * 0.46, d * 0.55, 'trim')],
  shell: ({ bodyH: h, bodyD: d }) => [
    BALL(0.86, 0.86, 0.5, 0, h * 0.5, -d * 0.62, 'accent', { rot: [0, 0, 0] }),
    { torus: [0.52, 0.1, 0.52], at: [0, h * 0.5, -d * 0.62 + 0.24], rot: [90, 0, 0], c: 'extra' },
    BALL(0.2, 0.2, 0.14, 0, h * 0.5, -d * 0.62 + 0.26, 'dark'),
  ],
  cabinet: ({ bodyH: h, bodyD: d }) => [
    B(0.96, 0.96, 0.54, 0, h * 0.72, -d * 0.62, 'extra'),
    B(0.84, 0.44, 0.05, 0, h * 1.08, -d * 0.62 + 0.28, 'shirt'),
    B(0.84, 0.44, 0.05, 0, h * 0.58, -d * 0.62 + 0.28, 'shirt'),
    B(0.2, 0.06, 0.06, 0, h * 1.08, -d * 0.62 + 0.32, 'dark'),
    B(0.2, 0.06, 0.06, 0, h * 0.58, -d * 0.62 + 0.32, 'dark'),
  ],
  apron: ({ bodyH: h, bodyW: w, bodyD: d }) => [B(w * 0.74, h * 0.8, 0.05, 0, h * 0.42, d * 0.5, 'trim')],
  bowtie: ({ bodyH: h, bodyD: d }) => [mirrorX([CONE(0.16, 0.16, 0.08, 0.09, h * 0.92, d * 0.46, 'accent', { rot: [0, 0, 90] })])],
  scarf: ({ bodyH: h, bodyW: w, bodyD: d }) => [B(w * 0.88, 0.14, d * 0.9, 0, h * 0.96, 0, 'accent'), B(0.14, 0.34, 0.05, 0.16, h * 0.72, d * 0.48, 'accent')],
  pearls: ({ bodyH: h, bodyW: w, bodyD: d }) => [-0.2, -0.1, 0, 0.1, 0.2].map((x) => BALL(0.08, 0.08, 0.08, x, h * 0.86 - Math.abs(x) * -0.2 - 0.04, d * 0.5, 'white')),
  neck: ({ bodyH: h }, o) => [],
};
const TAIL = {
  none: () => [],
  nub: () => [BALL(0.18, 0.18, 0.18, 0, 0.08, -0.26, 'fur')],
  flat: () => [B(0.34, 0.08, 0.5, 0, 0, -0.38, 'dark')],
  fluffy: () => [BALL(0.4, 0.44, 0.5, 0, 0.14, -0.36, 'fur')],
  long: () => [B(0.1, 0.1, 0.5, 0, 0.1, -0.42, 'dark', { rot: [12, 0, 0] })],
  fan: () => [mirrorX([CONE(0.18, 0.34, 0.08, 0.12, 0.18, -0.26, 'fur', { rot: [-40, 0, -18] })]), CONE(0.2, 0.42, 0.1, 0, 0.22, -0.28, 'fur', { rot: [-40, 0, 0] })],
  bands: () => [BALL(0.2, 0.2, 0.46, 0, 0.04, -0.4, 'dark')],
  shelltail: () => [],
};

export function critterDef(spec) {
  const s = {
    legH: 0.26, legW: 0.2, bodyW: 0.56, bodyH: 0.42, bodyD: 0.46, headW: 0.86, headH: 0.78, headD: 0.78, head: 'round', ears: 'round', tail: 'none',
    features: [], body: [], eyeGap: 0.2, eyeY: 0.56, eyeW: 0.11, eyeH: 0.17, ...spec,
  };
  const dims = { headW: s.headW, headH: s.headH, headD: s.headD, bodyH: s.bodyH, bodyW: s.bodyW, bodyD: s.bodyD };
  const palette = { ...SLOTS, ...s.colors };
  const head = [
    ...shapes[s.head](dims),
    ...ears[s.ears](s.headW, s.headH),
    ...s.features.flatMap((f) => (Array.isArray(f) ? FEATURES[f[0]](dims, f[1]) : FEATURES[f](dims))),
    joint('EyeR', [-s.headW * s.eyeGap / 0.86, s.headH * s.eyeY, s.headD * 0.47], [B(s.eyeW, s.eyeH, 0.05, 0, 0, 0, 'eye')]),
    joint('EyeL', [s.headW * s.eyeGap / 0.86, s.headH * s.eyeY, s.headD * 0.47], [B(s.eyeW, s.eyeH, 0.05, 0, 0, 0, 'eye')]),
    joint('Mouth', [0, s.headH * (s.mouthY ?? 0.26), s.headD * (s.mouthZ ?? 0.5)], [B(0.18, 0.05, 0.04, 0, 0, 0, 'dark')]),
    ...(s.headParts ?? []),
  ];
  const arm = s.armW ?? 0.15;
  const armL = s.armH ?? 0.34;
  const armPart = (x) => [B(arm, armL, arm, x * 0.1, -armL * 0.5, 0, s.sleeve ? 'shirt' : 'fur'), BALL(arm * 1.3, arm * 1.2, arm * 1.3, x * 0.1, -armL, 0, s.paw ?? 'fur')];
  const legCol = s.legColor ?? 'fur';
  const leg = (x) => [B(s.legW, s.legH, s.legW, 0, -s.legH / 2 + 0.02, 0, legCol), B(s.legW * 1.1, 0.08, s.legW * 1.5, 0, -s.legH + 0.04, 0.05, s.footColor ?? (legCol === 'fur' ? 'dark' : legCol))];
  const torso = [
    (s.bodyShape === 'box' ? B : BALL)(s.bodyW, s.bodyH + 0.1, s.bodyD, 0, s.bodyH * 0.46, 0, s.shirtless ? 'fur' : 'shirt', { seg: 10 }),
    ...s.body.flatMap((f) => (Array.isArray(f) ? BODY[f[0]](dims, f[1]) : BODY[f](dims))),
    ...(s.torsoParts ?? []),
    joint('Head', [0, s.bodyH * (s.headJoint ?? 0.86) + (s.neckH ?? 0), s.headOff ?? 0], [...(s.neckH ? [CYL(0.24, s.neckH + 0.22, 0.24, 0, -s.neckH * 0.5 - 0.02, -(s.headOff ?? 0), 'fur')] : []), ...head]),
    joint('ArmR', [-s.bodyW / 2 - 0.04, s.bodyH * 0.74, 0], armPart(-1)),
    joint('ArmL', [s.bodyW / 2 + 0.04, s.bodyH * 0.74, 0], armPart(1)),
  ];
  return model({
    id: `critter-${s.id}`,
    about: s.about ?? `${s.id}, a character`,
    tags: ['character', 'critter'],
    palette,
    parts: [joint('Pelvis', [0, s.legH, 0], [
      joint('Torso', [0, 0, 0], torso),
      joint('LegR', [-(s.hipGap ?? 0.15), 0, 0], leg(-1)),
      joint('LegL', [(s.hipGap ?? 0.15), 0, 0], leg(1)),
      ...TAIL[s.tail](dims),
      ...(s.tailRings ? Array.from({ length: s.tailRings }, (_, i) => joint(`TailSeg${i}`, [0, 0.1 + i * 0.12, -0.3 - i * 0.12], [B(0.17, 0.17, 0.17, 0, 0, 0, i % 2 ? 'white' : 'dark')])) : []),
      ...(s.pelvisParts ?? []),
    ])],
  });
}

const c = (fur, belly, dark, shirt, trim, accent, extra, eye = 'ink') => ({ fur, belly, dark, shirt, trim, accent, extra, eye });

/** Everyone with a name. Silhouette first: each must read at 45 pixels. */
export const CRITTERS = {
  dorrit: { about: 'Dorrit, a stout wombat in an apron', head: 'wide', ears: 'small', features: [['snout', { w: 0.46, h: 0.3, nw: 0.26, c: 'fur' }]], body: ['apron'], bodyW: 0.68, bodyD: 0.56, legH: 0.22, tail: 'nub', colors: c('orange', 'sand', 'plum', 'red', 'white', 'red', 'sand') },
  tavi: { about: 'Tavi, a beaming quokka in yellow', ears: 'round', features: [['snout', { w: 0.3, h: 0.2, nw: 0.1, y: 0.34, c: 'sand' }]], mouthZ: 0.52, body: ['bellyPatch'], eyeW: 0.13, eyeH: 0.2, colors: c('orange', 'sand', 'plum', 'sand', 'white', 'red', 'lime') },
  bartleby: { about: 'Bartleby, a moose with laundry stuck on his antlers', head: 'long', ears: 'side', features: ['antlers', 'laundry', 'bigNose'], bodyW: 0.62, legH: 0.34, sleeve: true, eyeY: 0.66, mouthY: 0.16, colors: c('plum', 'sand', 'ink', 'night', 'mist', 'sky', 'sand') },
  ottoline: { about: 'Lady Ottoline, a platypus with a tiara and pearls', ears: 'none', features: ['bill', 'tiara', 'lashes'], body: ['pearls'], tail: 'flat', mouthY: 0.22, mouthZ: 0.76, colors: c('plum', 'sand', 'ink', 'plum', 'white', 'orange', 'sand') },
  rocco: { about: 'Rocco, an armadillo in bands and a sweatband', ears: 'pointy', features: ['bandsHead', ['snout', { w: 0.28, h: 0.2, nw: 0.1 }]], body: ['bands'], tail: 'bands', headW: 0.78, bodyW: 0.62, shirtless: true, colors: c('mist', 'white', 'slate', 'red', 'white', 'red', 'sand') },
  nib: { about: 'Nib, a lemur with huge eyes and a ringed tail', ears: 'pointy', features: ['eyeRings', ['snout', { w: 0.2, h: 0.16, nw: 0.1, y: 0.38, c: 'white' }]], body: ['bellyPatch'], eyeW: 0.13, eyeH: 0.16, shirtless: true, legH: 0.3, tailRings: 6, colors: c('mist', 'white', 'ink', 'navy', 'white', 'red', 'sand', 'sand') },
  ozzie: { about: 'Ozzie, a suspicious possum in a trench coat', ears: 'big', features: [['snout', { w: 0.32, h: 0.22, nw: 0.1, c: 'white' }], 'whiskers'], tail: 'long', sleeve: true, colors: c('slate', 'white', 'ink', 'orange', 'sand', 'red', 'sand') },
  yolanda: { about: 'Yolanda, a yak under a curtain of hair and knitting', ears: 'none', head: 'wide', features: ['hairCurtain', 'horns'], body: ['cardigan'], bodyW: 0.72, bodyD: 0.6, eyeY: 0.48, mouthY: 0.2, colors: c('plum', 'sand', 'ink', 'orange', 'sand', 'red', 'plum') },
  fitch: { about: 'Fitch, a long thin ferret in a loud jacket', ears: 'small', head: 'long', features: ['mask', ['snout', { w: 0.24, h: 0.16, nw: 0.1, c: 'white' }]], bodyW: 0.42, bodyH: 0.56, bodyD: 0.34, legH: 0.2, tail: 'long', sleeve: true, colors: c('sand', 'white', 'ink', 'green', 'sand', 'red', 'sand') },
  gander: { about: 'Mrs. Gander, a goose in spectacles and a waistcoat', ears: 'none', headW: 0.56, headH: 0.56, headD: 0.56, neckH: 0.56, headOff: 0.1, bodyW: 0.74, bodyD: 0.72, legH: 0.26, legW: 0.1, legColor: 'orange', features: ['beak', 'spectacles'], body: ['waistcoat', 'wings'], tail: 'fan', shirtless: true, eyeW: 0.08, eyeH: 0.11, mouthZ: 0.72, armH: 0.01, armW: 0.02, colors: c('white', 'white', 'ink', 'navy', 'red', 'orange', 'sand') },
  clementine: { about: 'Clementine, an unflappable capybara with a bee on her head', head: 'box', ears: 'small', features: [['snout', { w: 0.54, h: 0.34, nw: 0.3, c: 'fur' }], 'beeHat', 'sleepyLids'], bodyW: 0.68, bodyD: 0.6, eyeY: 0.62, mouthY: 0.16, mouthZ: 0.62, colors: c('orange', 'sand', 'plum', 'teal', 'white', 'red', 'sand') },
  trundle: { about: 'Mayor Trundle, a very small snail in a sash', ears: 'none', features: ['antennae'], body: ['shell', 'sash'], shirtless: true, legH: 0.22, legW: 0.3, bodyW: 0.56, bodyH: 0.44, headW: 0.62, headH: 0.56, headD: 0.6, armH: 0.01, armW: 0.02, colors: c('lime', 'white', 'ink', 'plum', 'white', 'orange', 'red') },
  quill: { about: 'Dr. Quill, a near-sighted pangolin in huge glasses', ears: 'small', head: 'long', features: ['bigGlasses', ['snout', { w: 0.22, h: 0.18, nw: 0.1, c: 'fur' }]], body: ['scales'], tail: 'nub', eyeW: 0.14, eyeH: 0.2, colors: c('orange', 'sand', 'plum', 'plum', 'sand', 'red', 'sand') },
  mothwick: { about: 'Madame Mothwick, a dramatic moth in a shawl', ears: 'none', features: ['antennae'], body: ['mothWings', 'scarf'], eyeW: 0.2, eyeH: 0.24, eye: 'ink', shirtless: true, headW: 0.7, headH: 0.64, headD: 0.64, colors: c('mist', 'white', 'ink', 'white', 'white', 'plum', 'sand') },
  rind: { about: 'Old Rind, a whispering stoat in a long coat', ears: 'small', head: 'long', features: [['snout', { w: 0.22, h: 0.16, nw: 0.1, c: 'white' }]], bodyW: 0.42, bodyH: 0.52, bodyD: 0.36, sleeve: true, tail: 'long', colors: c('sand', 'white', 'ink', 'night', 'mist', 'red', 'sand') },
  vesper: { about: 'Vesper, a fruit bat with tiny accordion', ears: 'big', features: [['snout', { w: 0.24, h: 0.18, nw: 0.1, c: 'orange' }]], body: ['batWings'], shirtless: true, headW: 0.68, headH: 0.62, headD: 0.62, colors: c('plum', 'orange', 'ink', 'plum', 'white', 'red', 'sand') },
  hester: { about: 'Hester, a llama in a bus driver cap', head: 'long', ears: 'long', neckH: 0.2, headW: 0.62, features: ['captainHat', ['snout', { w: 0.32, h: 0.24, nw: 0.14, c: 'white' }]], sleeve: true, eyeY: 0.62, colors: c('white', 'sand', 'plum', 'navy', 'sand', 'red', 'sand') },
  fleece: { about: 'Monsieur Fleece, an alpaca with magnificent hair', head: 'long', ears: 'pointy', neckH: 0.26, headW: 0.62, features: ['fluffyTop', ['snout', { w: 0.28, h: 0.2, nw: 0.12, c: 'white' }]], body: ['bowtie'], colors: c('sand', 'white', 'plum', 'teal', 'white', 'red', 'orange') },
  flavia: { about: 'Flavia Rosé, a flamingo on stilt legs in couture', ears: 'none', legH: 0.72, legW: 0.07, legColor: 'red', footColor: 'plum', hipGap: 0.08, headW: 0.5, headH: 0.5, headD: 0.5, neckH: 0.4, headOff: 0.08, bodyW: 0.62, bodyD: 0.6, bodyH: 0.36, features: ['beak', 'lashes'], body: ['wings'], shirtless: true, armH: 0.01, armW: 0.02, eyeW: 0.08, eyeH: 0.1, mouthZ: 0.72, colors: c('orange', 'white', 'ink', 'plum', 'white', 'ink', 'sand') },
  magda: { about: 'Magda, a magpie in a dark shawl', ears: 'none', headW: 0.62, headH: 0.6, headD: 0.6, features: [['beak', { w: 0.18, l: 0.34 }]], body: ['bellyPatch', 'wings'], shirtless: true, tail: 'long', armH: 0.01, armW: 0.02, legW: 0.1, mouthZ: 0.66, colors: c('ink', 'white', 'night', 'ink', 'white', 'night', 'sky', 'sand') },
  bellows: { about: 'Sir Reginald Bellows, a hippo thespian in a ruff', head: 'wide', ears: 'small', headW: 1.0, headH: 0.74, features: ['bigNose'], body: ['bowtie'], bodyW: 0.84, bodyD: 0.7, bodyH: 0.46, legH: 0.26, legW: 0.26, sleeve: true, mouthY: 0.14, eyeY: 0.74, colors: c('slate', 'mist', 'ink', 'plum', 'white', 'sand', 'sand') },
  pemberton: { about: 'Pemberton, a tiny dormouse in an auctioneer collar', ears: 'big', headW: 0.72, headH: 0.64, headD: 0.64, bodyW: 0.42, bodyH: 0.3, bodyD: 0.36, legH: 0.14, legW: 0.14, armH: 0.22, armW: 0.1, tail: 'fluffy', features: ['whiskers', ['snout', { w: 0.18, h: 0.12, nw: 0.08 }]], body: ['bowtie'], colors: c('sand', 'white', 'plum', 'night', 'white', 'red', 'sand') },
  brisket: { about: 'Agent Brisket, a badger in a Bureau suit', head: 'long', ears: 'small', features: ['stripe', ['snout', { w: 0.26, h: 0.18, nw: 0.1, c: 'white' }]], body: ['bowtie'], sleeve: true, colors: c('white', 'white', 'ink', 'night', 'white', 'sky', 'sand') },
  lou: { about: 'Languid Lou, a sloth in a cardigan', head: 'round', ears: 'none', features: ['sleepyLids', 'eyeRings'], body: ['cardigan'], armH: 0.44, armW: 0.13, bodyW: 0.54, colors: c('sand', 'white', 'plum', 'teal', 'sand', 'red', 'sand') },
  nibbles: { about: 'Madame Nibbles, a goat with a fortune teller scarf', head: 'long', ears: 'side', features: ['horns', 'hood', ['snout', { w: 0.3, h: 0.2, nw: 0.12, c: 'white' }]], eyeY: 0.6, colors: c('white', 'mist', 'ink', 'plum', 'sand', 'plum', 'sand') },
  pimm: { about: 'Inspector Pimm, a hermit crab living in a filing cabinet', ears: 'none', headW: 0.66, headH: 0.5, headD: 0.56, features: ['antennae'], body: ['cabinet'], shirtless: true, legH: 0.32, bodyH: 0.34, armH: 0.4, armW: 0.16, paw: 'accent', colors: c('red', 'orange', 'ink', 'slate', 'white', 'red', 'mist') },
};
export const CROWD_SPECIES = [
  { id: 'otter', about: 'An otter out shopping', ears: 'small', tail: 'long', features: [['snout', { w: 0.3, h: 0.2, nw: 0.12, c: 'sand' }], 'whiskers'], colors: c('plum', 'sand', 'ink', 'sky', 'white', 'red', 'sand') },
  { id: 'newt', about: 'A newt on a lunch break', ears: 'none', head: 'wide', eyeW: 0.14, tail: 'long', colors: c('green', 'lime', 'ink', 'sand', 'white', 'red', 'sand') },
  { id: 'tapir', about: 'A tapir late for something', ears: 'small', features: [['snout', { w: 0.34, h: 0.34, nw: 0.2, c: 'fur' }]], colors: c('night', 'white', 'ink', 'red', 'white', 'red', 'sand') },
  { id: 'heron', about: 'A heron in a long coat', ears: 'none', legH: 0.5, legW: 0.07, legColor: 'sand', headW: 0.46, headH: 0.46, headD: 0.46, neckH: 0.34, bodyW: 0.48, features: [['beak', { w: 0.14, l: 0.5 }]], armH: 0.01, armW: 0.02, mouthZ: 0.7, colors: c('mist', 'white', 'ink', 'mist', 'white', 'orange', 'sand') },
  { id: 'puffin', about: 'A puffin, briefly', ears: 'none', headW: 0.7, headH: 0.66, headD: 0.66, features: [['beak', { w: 0.24, l: 0.3 }]], body: ['bellyPatch'], shirtless: true, armH: 0.01, armW: 0.02, legColor: 'orange', legW: 0.12, mouthZ: 0.66, colors: c('ink', 'white', 'night', 'ink', 'white', 'orange', 'sand', 'white') },
  { id: 'walrus', about: 'A walrus with a briefcase', ears: 'none', head: 'wide', features: [['snout', { w: 0.5, h: 0.3, nw: 0.16, c: 'sand' }], 'whiskers'], bodyW: 0.78, sleeve: true, colors: c('orange', 'sand', 'plum', 'navy', 'white', 'red', 'sand') },
  { id: 'beaver', about: 'A beaver on a schedule', ears: 'small', tail: 'flat', features: [['snout', { w: 0.32, h: 0.22, nw: 0.12, c: 'sand' }]], colors: c('red', 'sand', 'ink', 'lime', 'white', 'red', 'sand') },
  { id: 'meerkat', about: 'A meerkat looking at everything', ears: 'small', head: 'long', bodyH: 0.56, bodyW: 0.4, features: ['eyeRings'], colors: c('sand', 'white', 'ink', 'orange', 'white', 'red', 'sand', 'white') },
  { id: 'ibis', about: 'An ibis who is a bit much', ears: 'none', legH: 0.56, legW: 0.07, legColor: 'red', headW: 0.46, headH: 0.46, headD: 0.46, neckH: 0.3, bodyW: 0.48, features: [['beak', { w: 0.12, l: 0.5 }]], armH: 0.01, armW: 0.02, mouthZ: 0.7, colors: c('white', 'white', 'ink', 'white', 'white', 'red', 'sand') },
  { id: 'weasel', about: 'A weasel selling watches', ears: 'small', head: 'long', bodyW: 0.4, bodyH: 0.5, tail: 'long', sleeve: true, colors: c('orange', 'white', 'ink', 'plum', 'white', 'red', 'sand') },
  { id: 'toad', about: 'A toad in a good hat', ears: 'none', head: 'wide', features: ['topHat'], eyeW: 0.14, bodyW: 0.72, colors: c('teal', 'lime', 'ink', 'navy', 'white', 'red', 'sand') },
  { id: 'okapi', about: 'An okapi who insists it is not a zebra', head: 'long', ears: 'side', neckH: 0.24, headW: 0.6, features: [['snout', { w: 0.3, h: 0.22, nw: 0.14, c: 'white' }]], colors: c('plum', 'white', 'ink', 'white', 'white', 'red', 'sand') },
];
export const CRITTER_DEFS = Object.fromEntries(Object.entries(CRITTERS).map(([id, spec]) => [id, critterDef({ id, ...spec })]));
export const CROWD_DEFS = CROWD_SPECIES.map((spec) => critterDef(spec));

// ---- The player: a small round person of no particular species ----------------------------------
export const HAIR_STYLES = ['Tufted', 'Bowl', 'Bun', 'Swoop', 'Long', 'Spikes', 'Curls', 'None To Speak Of'];
export const HAIR_COLORS = ['plum', 'ink', 'sand', 'orange', 'red', 'white', 'navy', 'teal'];
export const EYE_STYLES = ['Dots', 'Wide', 'Sleepy', 'Keen', 'Square', 'Worried'];
const hairParts = (style, w, h, d) => {
  switch (style) {
    case 0: return [BALL(w * 0.96, h * 0.5, d * 0.96, 0, h * 0.8, -0.03, 'hair'), CONE(0.2, 0.24, 0.14, 0, h * 1.1, 0, 'hair'), CONE(0.16, 0.2, 0.12, 0.14, h * 1.06, 0.02, 'hair', { rot: [0, 0, -20] })];
    case 1: return [BALL(w * 1.06, h * 0.66, d * 1.06, 0, h * 0.72, -0.01, 'hair')];
    case 2: return [BALL(w * 0.98, h * 0.5, d * 0.98, 0, h * 0.78, -0.04, 'hair'), BALL(0.32, 0.32, 0.32, 0, h * 1.12, -0.08, 'hair')];
    case 3: return [BALL(w * 0.98, h * 0.48, d * 0.98, 0, h * 0.8, -0.03, 'hair'), BALL(0.5, 0.2, 0.24, 0.16, h * 0.94, 0.3, 'hair', { rot: [0, 0, -14] })];
    case 4: return [BALL(w * 1.02, h * 0.56, d * 1.02, 0, h * 0.78, -0.03, 'hair'), mirrorX([B(0.18, h * 0.7, 0.36, w * 0.44, h * 0.42, -0.14, 'hair')]), B(w * 0.72, h * 0.72, 0.16, 0, h * 0.4, -d * 0.44, 'hair')];
    case 5: return [BALL(w * 0.94, h * 0.44, d * 0.94, 0, h * 0.82, -0.03, 'hair'), ...[-0.24, -0.08, 0.08, 0.24].map((x, i) => CONE(0.16, 0.3, 0.16, x, h * 1.08 - Math.abs(x) * 0.2, i % 2 ? 0.08 : -0.08, 'hair'))];
    case 6: return [-0.28, -0.1, 0.1, 0.28].flatMap((x) => [BALL(0.3, 0.3, 0.3, x, h * 0.92, 0.06, 'hair'), BALL(0.3, 0.3, 0.3, x, h * 0.9, -0.14, 'hair')]);
    default: return [BALL(0.14, 0.1, 0.14, 0, h * 1.0, 0, 'hair')];
  }
};
export const HATS = {
  cap: (h) => [CYL(0.8, 0.16, 0.8, 0, h * 0.96, 0, 'hat', { top: 0.9 }), B(0.5, 0.05, 0.26, 0, h * 0.92, 0.42, 'hatTrim')],
  straw: (h) => [CYL(1.16, 0.05, 1.16, 0, h * 0.94, 0, 'hat'), CYL(0.58, 0.22, 0.58, 0, h * 1.05, 0, 'hat', { top: 0.86 }), CYL(0.6, 0.06, 0.6, 0, h * 0.99, 0, 'hatTrim')],
  bobble: (h) => [BALL(0.9, 0.52, 0.86, 0, h * 0.88, -0.02, 'hat'), B(0.84, 0.12, 0.84, 0, h * 0.74, 0, 'hatTrim'), BALL(0.24, 0.24, 0.24, 0, h * 1.18, 0, 'hatTrim')],
  top: (h) => [CYL(0.84, 0.05, 0.84, 0, h * 0.96, 0, 'hat'), CYL(0.54, 0.46, 0.54, 0, h * 1.2, 0, 'hat'), B(0.56, 0.08, 0.56, 0, h * 1.04, 0, 'hatTrim')],
  beret: (h) => [BALL(0.92, 0.26, 0.92, 0.06, h * 0.98, 0, 'hat', { rot: [0, 0, -8] }), B(0.06, 0.1, 0.06, 0.06, h * 1.12, 0, 'hatTrim')],
  crown: (h) => [CYL(0.56, 0.2, 0.56, 0, h * 1.04, 0, 'hat', { top: 1.1 }), ...[0, 72, 144, 216, 288].map((a) => CONE(0.1, 0.16, 0.1, Math.sin(a * Math.PI / 180) * 0.26, h * 1.2, Math.cos(a * Math.PI / 180) * 0.26, 'hat'))],
  pot: (h) => [CYL(0.8, 0.36, 0.8, 0, h * 1.06, 0, 'hat', { top: 1.06 }), B(0.34, 0.06, 0.08, 0.5, h * 1.1, 0, 'hatTrim')],
  cheese: (h) => [{ wedge: [0.74, 0.38, 0.74], at: [0, h * 1.12, 0], c: 'hat' }, BALL(0.1, 0.1, 0.05, 0.1, h * 1.08, 0.3, 'hatTrim')],
  bow: (h) => [mirrorX([CONE(0.26, 0.3, 0.14, 0.17, h * 0.98, 0.02, 'hat', { rot: [0, 0, 90] })]), BALL(0.12, 0.12, 0.12, 0, h * 0.98, 0.02, 'hatTrim')],
  sou: (h) => [CYL(1.0, 0.1, 1.1, 0, h * 0.9, -0.06, 'hat'), BALL(0.8, 0.46, 0.8, 0, h * 0.96, -0.02, 'hat')],
  plume: (h) => [BALL(0.84, 0.34, 0.84, 0, h * 0.94, 0, 'hat'), { group: [BALL(0.2, 0.62, 0.1, 0.3, 0.32, -0.1, 'hatTrim', { rot: [0, 0, -18] })], at: [0, h * 0.96, 0] }],
  bucket: (h) => [CYL(0.84, 0.4, 0.84, 0, h * 1.04, 0, 'hat', { top: 1.12 })],
};
export const GLASSES = {
  round: (h, d) => [mirrorX([{ torus: [0.24, 0.05, 0.24], at: [0.18, h * 0.54, d * 0.5], rot: [90, 0, 0], c: 'glasses' }]), B(0.1, 0.04, 0.04, 0, h * 0.54, d * 0.5, 'glasses')],
  square: (h, d) => [mirrorX([B(0.26, 0.2, 0.04, 0.18, h * 0.54, d * 0.5, 'glasses')]), B(0.1, 0.04, 0.04, 0, h * 0.54, d * 0.5, 'glasses')],
  shades: (h, d) => [B(0.64, 0.16, 0.04, 0, h * 0.54, d * 0.5, 'glasses')],
  monocle: (h, d) => [{ torus: [0.26, 0.05, 0.26], at: [-0.18, h * 0.54, d * 0.5], rot: [90, 0, 0], c: 'glasses' }],
  star: (h, d) => [mirrorX([CONE(0.26, 0.24, 0.05, 0.18, h * 0.54, d * 0.5, 'glasses')])],
  moustache: (h, d) => [mirrorX([B(0.24, 0.08, 0.05, 0.13, h * 0.34, d * 0.5, 'glasses', { rot: [0, 0, 10] })])],
};
const eyeParts = (style) => ([
  [0.1, 0.1], [0.14, 0.2], [0.14, 0.06], [0.12, 0.16], [0.16, 0.16], [0.1, 0.18],
])[style] ?? [0.1, 0.1];

/** The avatar's model from a look: rebuilt whenever the look changes. */
export function avatarDef(look, id = 'avatar') {
  const w = 0.82, h = 0.8, d = 0.78;
  const [ew, eh] = eyeParts(look.eyes ?? 0);
  const palette = {
    skin: look.skin ?? 'sand', cheek: look.cheek ?? 'orange', hair: look.hairColor ?? 'plum', eye: 'ink', dark: 'ink',
    shirt: look.shirt ?? 'blue', trim: look.trim ?? 'white', legs: look.legs ?? 'navy', shoes: look.shoes ?? 'plum',
    hat: look.hatColor ?? 'red', hatTrim: look.hatTrim ?? 'white', glasses: look.glassesColor ?? 'night',
  };
  const head = [
    BALL(w, h, d, 0, h / 2, 0, 'skin', { name: 'skull', seg: 10 }),
    BALL(0.14, 0.1, 0.1, 0, h * 0.4, d * 0.5, 'cheek'),
    mirrorX([BALL(0.14, 0.09, 0.05, 0.29, h * 0.36, d * 0.42, 'cheek')]),
    joint('Hair', [0, 0, 0], hairParts(look.hair ?? 0, w, h, d)),
    joint('EyeR', [-0.18, h * 0.54, d * 0.47], [B(ew, eh, 0.05, 0, 0, 0, 'eye')]),
    joint('EyeL', [0.18, h * 0.54, d * 0.47], [B(ew, eh, 0.05, 0, 0, 0, 'eye')]),
    joint('Mouth', [0, h * 0.26, d * 0.49], [B(0.16, 0.05, 0.04, 0, 0, 0, 'dark')]),
  ];
  if (look.hat && HATS[look.hat]) head.push(joint('Hat', [0, 0, 0], HATS[look.hat](h)));
  if (look.glasses && GLASSES[look.glasses]) head.push(joint('Glasses', [0, 0, 0], GLASSES[look.glasses](h, d)));
  const arm = (x) => [B(0.14, 0.3, 0.14, x * 0.08, -0.15, 0, 'shirt'), BALL(0.17, 0.17, 0.17, x * 0.08, -0.32, 0, 'skin')];
  const leg = () => [B(0.18, 0.24, 0.18, 0, -0.1, 0, 'legs'), B(0.2, 0.08, 0.28, 0, -0.2, 0.05, 'shoes')];
  return model({
    id,
    about: 'The player: a small round person of no particular species',
    tags: ['character', 'player'],
    palette,
    parts: [joint('Pelvis', [0, 0.24, 0], [
      joint('Torso', [0, 0, 0], [
        BALL(0.54, 0.5, 0.44, 0, 0.2, 0, 'shirt', { name: 'shirtBody', seg: 10 }),
        B(0.54, 0.06, 0.42, 0, 0.0, 0, 'trim'),
        joint('Head', [0, 0.36, 0], head),
        joint('ArmR', [-0.3, 0.32, 0], arm(-1)),
        joint('ArmL', [0.3, 0.32, 0], arm(1)),
      ]),
      joint('LegR', [-0.13, 0, 0], leg()),
      joint('LegL', [0.13, 0, 0], leg()),
    ])],
  });
}
