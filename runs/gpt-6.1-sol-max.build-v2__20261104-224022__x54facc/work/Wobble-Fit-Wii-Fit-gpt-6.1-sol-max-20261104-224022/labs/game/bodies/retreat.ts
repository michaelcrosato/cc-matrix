/** @file Retreat tracksuits on native puppet skeletons: soft faces, white shoes and original colourways. */
import { defineBody, getBody, type BodyPart } from '../../../engine';
const parts: BodyPart[] = [
  ['limb', 'thighL', 'thighR', 0.12, 0.12, 'suit', { on: 'pelvis' }],
  ['limb', 'spine0', 'chest', 0.145, 0.17, 'suit', { on: 'spine1' }],
  ['limb', 'chest', 'neck', 0.17, 0.13, 'suit'],
  ['limb', 'neck', ['off', 'head', 0, 0, 0.08], 0.045, 0.045, 'skin'],
  ['ball', ['off', 'head', 0.02, 0, 0.18], [0.17, 0.16, 0.19], 'skin'],
  ['ball', ['off', 'head', -0.055, 0, 0.28], [0.16, 0.17, 0.13], 'hair'],
  ['ball', ['off', 'head', 0.015, -0.08, 0.32], [0.1, 0.13, 0.07], 'hair'],
  [
    'limb',
    ['off', 'chest', 0.15, -0.015, -0.07],
    ['off', 'spine0', 0.14, -0.015, 0.02],
    0.012,
    0.012,
    'white',
    { on: 'chest' },
  ],
];
const mirror: BodyPart[] = [
  ['limb', 'thighL', 'shinL', 0.088, 0.071, 'suit'],
  ['limb', 'shinL', 'footL', 0.075, 0.052, 'suit'],
  ['limb', 'footL', 'toeL', 0.063, 0.055, 'white'],
  ['limb', 'upperArmL', 'forearmL', 0.065, 0.055, 'suit'],
  ['limb', 'forearmL', 'handL', 0.055, 0.043, 'suit'],
  ['ball', 'weaponL', 0.047, 'skin'],
  ['eye', 'eyeL', 0.019, 'eye'],
  ['limb', ['off', 'thighL', 0.075, 0.075, -0.04], ['off', 'shinL', 0.055, 0.055, 0], 0.009, 0.009, 'white'],
];
export const COLORS = ['#e89172', '#5ba698', '#8996c9', '#d8b462', '#6d9dba'];
for (let i = 0; i < COLORS.length; i++)
  defineBody(`body:guest${i}`, {
    description: 'A guest in a zipped retreat tracksuit.',
    slots: {
      suit: COLORS[i],
      white: '#fffaf0',
      skin: ['#e8b997', '#ac7758', '#f3d3b4'][i % 3],
      hair: i === 3 ? '#bebda9' : ['#49382d', '#272e30', '#c6b398'][i % 3],
      eye: '#2c443d',
    },
    parts,
    mirror,
  });
defineBody('body:plumb', {
  description: 'Instructor Plumb, perfectly vertical, with a long untroubled plait.',
  slots: { suit: '#bddbc6', white: '#f8fcf2', skin: '#d3ae8b', hair: '#3f5143', eye: '#3f5143' },
  parts: [
    ...parts,
    ['limb', ['off', 'head', -0.14, 0, 0.2], ['off', 'head', -0.18, 0, -0.65], 0.04, 0.018, 'hair', { on: 'head' }],
  ],
  mirror: [
    ...mirror.filter((p) => p[0] !== 'eye'),
    ['curve', ['off', 'eyeL', 0, -0.017, 0], ['off', 'eyeL', 0, 0.017, 0], 0.012, 0.008, 0.008, 'eye'] as BodyPart,
  ],
});
for (let colour = 0; colour < COLORS.length; colour++)
  for (let look = 0; look < 3; look++)
    defineBody(`body:guest${colour}look${look}`, {
      description: 'An individually chosen retreat guest.',
      slots: {
        suit: COLORS[colour],
        white: '#fffaf0',
        skin: ['#e8b997', '#ac7758', '#f3d3b4'][look],
        hair: ['#49382d', '#272e30', '#c6b398'][look],
        eye: '#2c443d',
      },
      parts: look === 1 ? [...parts, ['ball', ['off', 'head', -0.08, 0, 0.39], 0.12, 'hair']] : parts,
      mirror,
    });
for (const [i, colour] of ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'].entries())
  defineBody(`body:seat${i}`, {
    description: 'A player in their session seat colour.',
    slots: { suit: colour, white: '#fffaf0', skin: '#e8b997', hair: '#49382d', eye: '#2c443d' },
    parts,
    mirror,
  });

for (let colour = 0; colour < COLORS.length; colour++)
  for (let look = 0; look < 3; look++)
    defineBody(`body:guest${colour}look${look}band`, {
      description: 'An earned headband and a chosen tracksuit.',
      slots: {
        suit: COLORS[colour],
        white: '#fffaf0',
        skin: ['#e8b997', '#ac7758', '#f3d3b4'][look],
        hair: ['#49382d', '#272e30', '#c6b398'][look],
        eye: '#2c443d',
      },
      parts: [
        ...parts,
        [
          'limb',
          ['off', 'head', 0.04, -0.17, 0.3],
          ['off', 'head', 0.04, 0.17, 0.3],
          0.025,
          0.025,
          'white',
          { on: 'head' },
        ],
      ],
      mirror,
    });

const plumb = getBody('body:plumb');
defineBody('body:plumbAwake', {
  description: 'Plumb opens their eyes once at dawn.',
  slots: plumb.slots,
  parts: plumb.parts,
  mirror,
});
