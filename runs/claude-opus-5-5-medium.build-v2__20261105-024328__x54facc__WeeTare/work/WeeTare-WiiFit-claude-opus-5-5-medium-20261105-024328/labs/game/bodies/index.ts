/**
 * @file The cast as puppet bodies, on the humanoid's bones. No two look alike: Plumb's mint tracksuit and closed-eye arcs, one
 * long plait; Gerald's immense calves; Tare a dial on a drum with stubby legs. Guests come in three looks and six colours.
 */
import { defineBody } from '../../../engine';

type Slots = Record<string, string>;

/** A person's parts: slots skin, suit, trim, hair, eye. */
function person(slots: Slots, extra: unknown[] = [], calf = 1, torso = 0.8, hair = true, eye = 0.12): object {
  return {
    slots,
    parts: [
      ['limb', 'thighL', 'thighR', [1.2, 'limb'], [1.2, 'limb'], 'suit', { on: 'pelvis' }],
      [
        'limb',
        ['off', 'spine0', 0, 0, 0.05],
        'chest',
        [torso * 0.82, 'torso'],
        [torso, 'torso'],
        'suit',
        { on: 'spine1' },
      ],
      ['limb', 'chest', 'neck', [torso, 'torso'], [0.7, 'torso'], 'suit'],
      ['limb', 'upperArmL', 'upperArmR', [1.1, 'limb'], [1.1, 'limb'], 'suit', { on: 'chest' }],
      ['ball', ['off', 'head', 0, 0, [0.95, 'head']], [0.9, 'head'], 'skin'],
      ...(hair ? [['ball', ['off', 'head', 0, -0.03, [1.15, 'head']], [0.82, 'head'], 'hair']] : []),
      ...extra,
    ],
    mirror: [
      ['limb', 'thighL', 'shinL', [1.3, 'limb'], [1.1 * calf, 'limb'], 'suit'],
      ['limb', 'shinL', 'footL', [1.1 * calf, 'limb'], [1, 'limb'], 'skin'],
      ['limb', 'footL', 'toeL', [1, 'limb'], [0.85, 'limb'], 'trim'],
      ['limb', 'upperArmL', 'forearmL', [1.05, 'limb'], [0.95, 'limb'], 'suit'],
      ['limb', 'forearmL', 'handL', [0.95, 'limb'], [0.85, 'limb'], 'skin'],
      ['eye', 'eyeL', [eye, 'head'], 'eye'],
    ],
  };
}

const LOOKS: readonly Slots[] = [
  { skin: '#e8b48c', hair: '#3a2a20', eye: '#14181c', trim: '#f7fafc' },
  { skin: '#8d5a3c', hair: '#14100c', eye: '#101014', trim: '#f7fafc' },
  { skin: '#f3d2b8', hair: '#c2803c', eye: '#14181c', trim: '#f7fafc' },
];

/** The tracksuits: the first two free, the rest earned at the cairn. */
export const TRACKSUITS = ['#ff8a70', '#6aa8e8', '#8fd694', '#f0c04a', '#b48ae0', '#3a4a55'] as const;

LOOKS.forEach((look, l) =>
  TRACKSUITS.forEach((suit, c) => {
    defineBody(`body:guest${l}c${c}`, {
      description: `The guest, look ${l + 1}.`,
      ...person({ ...look, suit }),
    } as never);
    const band = [['ball', ['off', 'head', 0, -0.02, [1.3, 'head']], [0.74, 'head'], 'trim']];
    defineBody(`body:guest${l}c${c}h`, {
      description: `The guest, look ${l + 1}, headband earned.`,
      ...person({ ...look, suit, trim: '#ff5a4a' }, band),
    } as never);
  }),
);
['#e8443a', '#3b82f6', '#22c55e', '#f5b700'].forEach((suit, i) =>
  defineBody(`body:seat${i}`, {
    description: `A session seat in its colour.`,
    ...person({ ...LOOKS[i % 3], suit }),
  } as never),
);

defineBody('body:plumb', {
  description: 'Instructor Plumb: tall, narrow, utterly vertical. Mint tracksuit. Eyes closed in two calm arcs.',
  ...person(
    { skin: '#d8c0a8', suit: '#bfead6', trim: '#f7fafc', hair: '#6a5a4a', eye: '#3a4a55' },
    [],
    0.85,
    0.6,
    true,
    0.035,
  ),
} as never);
defineBody('body:plumbOpen', {
  description: 'Instructor Plumb at dawn, eyes open, once.',
  ...person(
    { skin: '#d8c0a8', suit: '#bfead6', trim: '#f7fafc', hair: '#6a5a4a', eye: '#101014' },
    [],
    0.85,
    0.6,
    true,
    0.2,
  ),
} as never);
defineBody('body:gerald', {
  description: 'Gerald: a retired guest with immense calves. Always already there, always finished.',
  ...person({ skin: '#e0b090', suit: '#7a8ea0', trim: '#f7fafc', hair: '#e8e8e8', eye: '#14181c' }, [], 2.3, 0.9),
} as never);
defineBody('body:bex', {
  description: 'Bex: bored, sent here by a parent, holding a phone-shaped stone.',
  ...person({ skin: '#c89070', suit: '#3a3a4a', trim: '#ff8a70', hair: '#201018', eye: '#101014' }, [
    ['box', 'handR', ['off', 'handR', 0, 0.04, 0.12], 0.1, 0.03, 'trim'],
  ]),
} as never);
defineBody('body:nan', {
  description: 'Old Nan: 91, Wobble Age 19. Nobody has seen her arrive.',
  ...person({ skin: '#ecd0bc', suit: '#d8a8c8', trim: '#f7fafc', hair: '#f4f4f4', eye: '#14181c' }, [], 0.9, 0.75),
} as never);
defineBody('body:tare', {
  description: 'Tare: a squat round dial on two stubby legs, face in the dial. Retired from weighing.',
  slots: { body: '#f7fafc', dial: '#fff8d8', needle: '#ff5a4a', leg: '#a8b4bc', eye: '#14181c' },
  parts: [
    ['ball', ['off', 'spine1', 0, 0, 0.08], 0.33, 'body'],
    ['ball', ['off', 'spine1', 0, 0.2, 0.1], 0.2, 'dial'],
    ['box', ['off', 'spine1', 0, 0.38, 0.1], ['off', 'spine1', 0, 0.38, 0.27], 0.03, 0.03, 'needle'],
  ],
  mirror: [
    ['limb', 'thighL', 'shinL', 0.05, 0.05, 'leg'],
    ['limb', 'shinL', 'footL', 0.05, 0.05, 'leg'],
    ['limb', 'footL', 'toeL', 0.06, 0.05, 'leg'],
  ],
} as never);
['#a0c8d8', '#e0b8a0', '#c8c8a0'].forEach((suit, i) =>
  defineBody(`body:extra${i}`, {
    description: 'Another guest, on the next mat.',
    ...person({ ...LOOKS[(i + 1) % 3], suit }),
  } as never),
);
