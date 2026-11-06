/**
 * @file The cast's bodies (PLAN.md section 10), as data on the humanoid's bones. Each Guest look comes in every tracksuit
 * colour, and each seat colour; Plumb also comes with open eyes, for the one time they open them; Tare is a round dial
 * on two short legs with no arms.
 *
 * Game code, a page's: the sim names bodies by id.
 *
 * @example
 * // 'body:guest1.teal', 'body:plumb', 'body:tare'
 */
import { defineBody } from '../../../engine';
import { COLORS, SEAT_COLORS } from '../cast/roster';

/** The tracksuit palettes, by colour name. */
export const SUITS: Readonly<Record<string, readonly [string, string]>> = {
  coral: ['#ff8a70', '#fff4ec'],
  teal: ['#3fb7a6', '#eafff8'],
  plum: ['#9a7bc0', '#f3ecff'],
  sun: ['#f2c14e', '#fff8e0'],
  sky: ['#6fb9e8', '#eef8ff'],
  forest: ['#5d9f6a', '#eef8ec'],
  red: ['#e8443a', '#ffe6e3'],
  blue: ['#3b82f6', '#e6efff'],
  green: ['#22c55e', '#e3fff0'],
  gold: ['#f5b700', '#fff6d6'],
};

/** Skin and hair per look. */
const LOOKS: readonly { skin: string; hair: string }[] = [
  { skin: '#f0c4a0', hair: '#5a4034' },
  { skin: '#b57e58', hair: '#231c1a' },
  { skin: '#e6b48a', hair: '#c48a44' },
];

/** The torso and limbs everyone but Tare shares. */
const FRAME = [
  ['limb', 'thighL', 'thighR', [1.25, 'limb'], [1.25, 'limb'], 'suit', { on: 'pelvis' }],
  ['limb', ['off', 'spine0', 0, 0, 0.05], 'chest', [0.58, 'torso'], [0.62, 'torso'], 'suit', { on: 'spine1' }],
  ['limb', 'chest', 'neck', [0.62, 'torso'], [0.5, 'torso'], 'trim'],
  ['limb', 'neck', 'head', [0.7, 'limb'], [0.7, 'limb'], 'skin'],
  ['limb', 'upperArmL', 'upperArmR', [1.1, 'limb'], [1.1, 'limb'], 'suit', { on: 'chest' }],
];

/** The limbs, written for the left. */
const LIMBS = [
  ['limb', 'thighL', 'shinL', [1.3, 'limb'], [1.05, 'limb'], 'suit'],
  ['limb', 'shinL', 'footL', [1.05, 'limb'], [0.85, 'limb'], 'suit'],
  ['limb', 'footL', 'toeL', [1, 'limb'], [0.85, 'limb'], 'shoe'],
  ['limb', 'upperArmL', 'forearmL', [1.05, 'limb'], [0.9, 'limb'], 'suit'],
  ['limb', 'forearmL', 'handL', [0.9, 'limb'], [0.8, 'limb'], 'skin'],
];

/** Defines one Guest's body, with a headband when asked. */
function guest(look: number, colorName: string, band = false): void {
  const [suit, trim] = SUITS[colorName];
  const { skin, hair } = LOOKS[look];
  const hairParts = [
    [['ball', ['off', 'head', -0.02, 0, [1.1, 'head']], [0.95, 'head'], 'hair']],
    [
      ['ball', ['off', 'head', -0.03, 0, [1.05, 'head']], [0.93, 'head'], 'hair'],
      ['ball', ['off', 'head', -0.03, 0, [2.05, 'head']], [0.42, 'head'], 'hair'],
    ],
    [
      ['ball', ['off', 'head', 0, 0, [1.25, 'head']], [0.92, 'head'], 'hair'],
      [
        'limb',
        ['off', 'head', [0.8, 'head'], -0.07, [1.5, 'head']],
        ['off', 'head', [0.8, 'head'], 0.07, [1.5, 'head']],
        0.025,
        0.025,
        'trim',
      ],
    ],
  ][look];
  const headband = band
    ? [
        [
          'ball',
          ['off', 'head', 0, 0, [1.28, 'head']],
          [0.98, 0.2, 0.98].map((k) => k * 0.18) as unknown as number[],
          'trim',
          { on: 'head' },
        ],
      ]
    : [];
  defineBody(`body:guest${look}.${colorName}${band ? '.band' : ''}`, {
    description: `A guest of Little Fulcrum: look ${look}, in a ${colorName} tracksuit${band ? ', with a headband' : ''}.`,
    slots: { skin, suit, trim, hair, shoe: '#f7fafc', eye: '#2a3036' },
    parts: [
      ...FRAME,
      ['ball', ['off', 'head', 0, 0, [0.95, 'head']], [0.9, 'head'], 'skin'],
      ...hairParts,
      ...headband,
    ],
    mirror: [...LIMBS, ['eye', 'eyeL', [0.1, 'head'], 'eye']],
    build: `build:guest${look}`,
  } as never);
}

for (let look = 0; look < 3; look++) {
  for (const color of [...COLORS, ...SEAT_COLORS]) guest(look, color);
  for (const color of COLORS) guest(look, color, true);
}

/** Plumb: tall, narrow, utterly vertical; pale mint tracksuit; eyes closed in two calm arcs. */
function plumb(id: string, open: boolean): void {
  defineBody(id, {
    description: open
      ? 'Instructor Plumb, once, with open eyes.'
      : 'Instructor Plumb: mint tracksuit, eyes closed in two calm arcs.',
    slots: { skin: '#eccdb0', suit: '#bfead6', trim: '#f7fafc', hair: '#3a4a55', shoe: '#f7fafc', eye: '#3a4a55' },
    parts: [
      ...FRAME,
      ['ball', ['off', 'head', 0, 0, [0.95, 'head']], [0.95, 'head'], 'skin'],
      ['ball', ['off', 'head', -0.012, 0, [1.28, 'head']], [0.86, 'head'], 'hair'],
    ],
    mirror: [
      ...LIMBS,
      open
        ? ['eye', 'eyeL', [0.16, 'head'], 'eye']
        : [
            'curve',
            ['off', 'eyeL', 0.005, -0.03, 0],
            ['off', 'eyeL', 0.005, 0.03, 0],
            -0.5,
            0.008,
            0.008,
            'eye',
            { on: 'head' },
          ],
    ],
    limbRadius: 0.05,
    torsoRadius: 0.14,
    build: 'build:plumb',
  } as never);
}
plumb('body:plumb', false);
plumb('body:plumbOpen', true);

defineBody('body:gerald', {
  description: 'Gerald: a retired guest with immense calves, always already there.',
  slots: {
    skin: '#e8b48c',
    suit: '#7a8fa6',
    trim: '#e6e6e0',
    hair: '#e8e8e4',
    shoe: '#6c5840',
    eye: '#2a3036',
    shorts: '#5c6e80',
  },
  parts: [
    ['limb', 'thighL', 'thighR', [1.5, 'limb'], [1.5, 'limb'], 'shorts', { on: 'pelvis' }],
    ['limb', ['off', 'spine0', 0, 0, 0.05], 'chest', [0.66, 'torso'], [0.66, 'torso'], 'suit', { on: 'spine1' }],
    ['limb', 'chest', 'neck', [0.62, 'torso'], [0.5, 'torso'], 'suit'],
    ['limb', 'neck', 'head', [0.8, 'limb'], [0.8, 'limb'], 'skin'],
    ['limb', 'upperArmL', 'upperArmR', [1.2, 'limb'], [1.2, 'limb'], 'suit', { on: 'chest' }],
    ['ball', ['off', 'head', 0, 0, [0.95, 'head']], [0.9, 'head'], 'skin'],
    ['ball', ['off', 'head', -0.03, 0, [1.3, 'head']], [0.72, 'head'], 'hair'],
    [
      'limb',
      ['off', 'head', [0.86, 'head'], -0.05, [0.72, 'head']],
      ['off', 'head', [0.86, 'head'], 0.05, [0.72, 'head']],
      0.018,
      0.018,
      'hair',
    ],
  ],
  mirror: [
    ['limb', 'thighL', 'shinL', [1.45, 'limb'], [1.3, 'limb'], 'shorts'],
    ['ball', ['lerp', 'shinL', 'footL', 0.32], [2.5, 'limb'], 'skin', { on: 'shinL' }],
    ['limb', 'shinL', 'footL', [1.5, 'limb'], [0.85, 'limb'], 'skin'],
    ['limb', 'footL', 'toeL', [1, 'limb'], [0.85, 'limb'], 'shoe'],
    ['limb', 'upperArmL', 'forearmL', [1.1, 'limb'], [0.95, 'limb'], 'skin'],
    ['limb', 'forearmL', 'handL', [0.95, 'limb'], [0.85, 'limb'], 'skin'],
    ['eye', 'eyeL', [0.1, 'head'], 'eye'],
  ],
  build: 'build:gerald',
} as never);

defineBody('body:bex', {
  description: 'Bex: a bored teenager in a hoodie, holding a phone-shaped stone, annoyingly excellent.',
  slots: {
    skin: '#c8966c',
    suit: '#54576a',
    trim: '#9a9fb0',
    hair: '#201c26',
    shoe: '#e8444a',
    eye: '#2a3036',
    stone: '#a7a9a4',
  },
  parts: [
    ...FRAME,
    ['ball', ['off', 'head', 0, 0, [0.95, 'head']], [0.9, 'head'], 'skin'],
    ['ball', ['off', 'head', -0.04, 0.02, [1.2, 'head']], [0.94, 'head'], 'hair'],
    ['box', ['off', 'weaponR', 0, 0, -0.02], ['off', 'weaponR', 0, 0, 0.12], 0.07, 0.02, 'stone', { on: 'handR' }],
  ],
  mirror: [...LIMBS, ['eye', 'eyeL', [0.1, 'head'], 'eye']],
  build: 'build:bex',
} as never);

defineBody('body:nan', {
  description: 'Old Nan: 91, Wobble Age 19, small, in a cardigan.',
  slots: { skin: '#eccab0', suit: '#c9a0a8', trim: '#f7f2ec', hair: '#f0f0f0', shoe: '#7a6a5a', eye: '#2a3036' },
  parts: [
    ...FRAME,
    ['ball', ['off', 'head', 0, 0, [0.95, 'head']], [0.92, 'head'], 'skin'],
    ['ball', ['off', 'head', -0.02, 0, [1.25, 'head']], [0.86, 'head'], 'hair'],
    ['ball', ['off', 'head', -0.03, 0, [2.05, 'head']], [0.4, 'head'], 'hair'],
  ],
  mirror: [...LIMBS, ['eye', 'eyeL', [0.1, 'head'], 'eye']],
  limbRadius: 0.04,
  torsoRadius: 0.13,
  build: 'build:nan',
} as never);

defineBody('body:tare', {
  description:
    'Tare: a squat round dial bathroom scale on two short legs, its face in the dial. Retired from weighing.',
  slots: { shell: '#e8eef2', dial: '#fdfefe', rim: '#9aa8b2', needle: '#ff8a70', leg: '#c9d3da', eye: '#2a3036' },
  parts: [
    ['ball', ['off', 'chest', 0, 0, -0.02], [0.36, 0.36, 0.16], 'shell', { on: 'spine1' }],
    ['ball', ['off', 'chest', 0.09, 0, -0.02], [0.29, 0.29, 0.1], 'rim', { on: 'spine1' }],
    ['ball', ['off', 'chest', 0.125, 0, -0.02], [0.255, 0.255, 0.075], 'dial', { on: 'spine1' }],
    [
      'limb',
      ['off', 'chest', 0.2, 0, -0.1],
      ['off', 'chest', 0.2, 0.09, 0.04],
      0.012,
      0.006,
      'needle',
      { on: 'spine1' },
    ],
    ['ball', ['off', 'chest', 0.2, 0, -0.1], 0.024, 'needle', { on: 'spine1' }],
  ],
  mirror: [
    ['limb', 'thighL', 'footL', 0.05, 0.05, 'leg'],
    ['ball', ['off', 'footL', 0.03, 0, 0.0], [0.07, 0.04, 0.1], 'leg', { on: 'footL' }],
    ['eye', ['off', 'chest', 0.2, -0.08, 0.1], 0.025, 'eye', { on: 'spine1' }],
  ],
  build: 'build:tare',
} as never);

defineBody('body:gull', {
  description: 'The Gull: white, unbothered, with arms for wings. It lands on you at the worst moment.',
  slots: { white: '#f7fafc', wing: '#b9c4cc', beak: '#ffb46e', eye: '#2a3036' },
  parts: [
    ['ball', ['off', 'spine1', 0, 0, 0], [0.09, 0.09, 0.15], 'white', { on: 'spine1' }],
    ['ball', ['off', 'head', 0, 0, 0.05], 0.06, 'white'],
    ['cone', ['off', 'head', 0.05, 0, 0.05], ['off', 'head', 0.13, 0, 0.04], 0.022, 'beak', { on: 'head' }],
  ],
  mirror: [
    ['box', 'upperArmL', 'handL', 0.13, 0.025, 'wing'],
    ['limb', 'thighL', 'footL', 0.012, 0.012, 'beak'],
    ['eye', ['off', 'head', 0.045, 0.03, 0.07], 0.012, 'eye', { on: 'head' }],
  ],
  limbRadius: 0.02,
  torsoRadius: 0.08,
  build: 'build:gull',
} as never);

defineBody('body:frog', {
  description: 'The Frog: green, round and silent. It just looks.',
  slots: { skin: '#79c267', belly: '#e6f2c2', dark: '#4d9a4a', eye: '#20252a', white: '#fdfdf2' },
  parts: [
    ['ball', ['off', 'spine1', 0, 0, 0], [0.13, 0.09, 0.14], 'skin', { on: 'spine1' }],
    ['ball', ['off', 'spine1', 0.05, 0, -0.015], [0.09, 0.06, 0.09], 'belly', { on: 'spine1' }],
    ['ball', ['off', 'head', 0.01, 0, 0.05], [0.09, 0.055, 0.08], 'skin', { on: 'head' }],
  ],
  mirror: [
    ['limb', 'thighL', 'footL', 0.03, 0.022, 'dark'],
    ['ball', ['off', 'footL', 0.03, 0, 0], [0.035, 0.012, 0.05], 'dark', { on: 'footL' }],
    ['ball', ['off', 'head', 0.035, 0.045, 0.1], 0.028, 'white', { on: 'head' }],
    ['eye', ['off', 'head', 0.058, 0.05, 0.103], 0.014, 'eye', { on: 'head' }],
  ],
  limbRadius: 0.02,
  torsoRadius: 0.09,
  build: 'build:frog',
} as never);
