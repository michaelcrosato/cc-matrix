/**
 * @file The cast's puppet bodies (page-side): Guests in four tracksuit colours (and later a headband), Plumb in pale mint
 * with closed-eye arcs, Gerald, Bex, Nan and Tare (a flat drum torso, a dial, short legs, no arms). Registered by
 * importing this module before the engine starts.
 * @example
 * import './art/bodies'; // body:guest0 .. body:guest3, body:plumb, body:tare ...
 */
import { defineBody } from '../../../engine';

const TRACK = ['#BFEAD6', '#FF8A70', '#BFE9FF', '#8AA0B0'];
const base = (slots: Record<string, string>) => ({
  slots: {
    skin: '#f1c7a0',
    hair: '#3b2a2f',
    cloth: '#BFEAD6',
    pants: '#f7fafc',
    boot: '#ffffff',
    belt: '#f7fafc',
    eye: '#1a1320',
    ...slots,
  },
  parts: [
    ['limb', 'thighL', 'thighR', [1.45, 'limb'], [1.45, 'limb'], 'pants', { on: 'pelvis' }],
    ['limb', ['off', 'spine0', 0, 0, 0.05], 'chest', [0.62, 'torso'], [0.68, 'torso'], 'cloth', { on: 'spine1' }],
    ['limb', 'chest', ['off', 'neck', 0, 0, -0.025], [0.68, 'torso'], [0.72, 'torso'], 'cloth'],
    ['limb', 'upperArmL', 'upperArmR', [1.2, 'limb'], [1.2, 'limb'], 'cloth', { on: 'chest' }],
    ['limb', 'neck', ['off', 'head', 0, 0, [0.4, 'head']], 0.047, 0.047, 'skin'],
    ['ball', ['off', 'head', [0.1, 'head'], 0, [0.95, 'head']], [0.9, 'head'], 'skin'],
    ['ball', ['off', 'head', [-0.32, 'head'], 0, [1.16, 'head']], [0.96, 'head'], 'hair'],
    ['ball', ['off', 'head', [-0.1, 'head'], 0, [1.62, 'head']], [0.72, 'head'], 'hair'],
  ],
  mirror: [
    ['limb', 'thighL', 'shinL', [1.45, 'limb'], [1.2, 'limb'], 'pants'],
    ['limb', 'shinL', 'footL', [1.2, 'limb'], [1.05, 'limb'], 'pants'],
    ['limb', 'footL', 'toeL', [1, 'limb'], [0.85, 'limb'], 'boot'],
    ['limb', 'upperArmL', 'forearmL', [1.15, 'limb'], [1, 'limb'], 'cloth'],
    ['limb', 'forearmL', 'handL', [1, 'limb'], [0.9, 'limb'], 'skin'],
    ['eye', 'eyeL', [0.124, 'head'], 'eye'],
  ],
  builds: {},
});
export const BODY_IDS: string[] = [];
const def = (id: string, description: string, slots: Record<string, string>) => {
  BODY_IDS.push(id);
  defineBody(id, { description, ...base(slots) } as never);
};
TRACK.forEach((c, i) =>
  def(`body:guest${i}`, 'A guest in a tracksuit.', { cloth: c, hair: ['#3b2a2f', '#b5651d', '#1a1a1a', '#e8d9a8'][i] }),
);
// unlocked by pebbles: 20 gives lilac, 30 gives gold with a headband
def('body:guest4', 'A guest in a lilac tracksuit (20 pebbles).', { cloth: '#D8C6F0', hair: '#3b2a2f' });
BODY_IDS.push('body:guest5');
{
  const b = base({ cloth: '#FFD36A', hair: '#3b2a2f', band: '#FF8A70' });
  defineBody('body:guest5', {
    description: 'A guest in a gold tracksuit and a coral headband (30 pebbles).',
    ...b,
    parts: [...b.parts, ['ball', ['off', 'head', [0.1, 'head'], 0, [1.55, 'head']], [0.55, 'head'], 'band']],
  } as never);
}
def('body:plumb', 'Instructor Plumb: pale mint tracksuit, one very long straight plait.', {
  cloth: '#BFEAD6',
  pants: '#BFEAD6',
  hair: '#2a2a30',
  eye: '#f1c7a0',
});
def('body:gerald', 'Gerald: immense calves.', { cloth: '#f4e8c8', pants: '#e0d4b0', skin: '#e0b090', hair: '#cfcfcf' });
def('body:bex', 'Bex: bored, excellent.', { cloth: '#FF8A70', pants: '#3A4A55', hair: '#6a3fa0' });
def('body:nan', 'Old Nan: Wobble Age 19.', { cloth: '#d8c6e8', pants: '#f7fafc', skin: '#e8c8b0', hair: '#f4f4f4' });
BODY_IDS.push('body:tare');
defineBody('body:tare', {
  description: 'Tare: a squat round dial bathroom scale on two short legs.',
  slots: { shell: '#f7fafc', dial: '#BFE9FF', needle: '#FF8A70', foot: '#3A4A55', eye: '#1a1320' },
  parts: [
    ['limb', 'thighL', 'thighR', [1.6, 'limb'], [1.6, 'limb'], 'foot', { on: 'pelvis' }],
    [
      'limb',
      ['off', 'spine0', 0, 0, 0.05],
      ['off', 'chest', 0, 0, 0.02],
      [1.5, 'torso'],
      [1.5, 'torso'],
      'shell',
      { on: 'spine1' },
    ],
    ['ball', ['off', 'chest', [0.55, 'torso'], 0, 0], [0.6, 'torso'], 'dial'],
    ['ball', ['off', 'chest', [0.8, 'torso'], 0, [0.05, 'torso']], [0.2, 'torso'], 'needle'],
  ],
  mirror: [
    ['limb', 'thighL', 'shinL', [1.6, 'limb'], [1.4, 'limb'], 'foot'],
    ['limb', 'shinL', 'footL', [1.4, 'limb'], [1.2, 'limb'], 'foot'],
    ['eye', 'eyeL', [0.1, 'head'], 'eye'],
  ],
  builds: {},
} as never);
def('body:gull', 'The Gull: white, round, certain.', {
  cloth: '#ffffff',
  pants: '#ffd36a',
  skin: '#ffd36a',
  hair: '#ffffff',
});
def('body:frog', 'The Frog: green, still, looking.', {
  cloth: '#6ab45c',
  pants: '#6ab45c',
  skin: '#6ab45c',
  hair: '#6ab45c',
});
