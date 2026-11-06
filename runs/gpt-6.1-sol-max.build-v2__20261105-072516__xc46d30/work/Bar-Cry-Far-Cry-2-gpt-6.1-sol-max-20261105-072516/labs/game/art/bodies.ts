/** @file Mercenaries and basin residents in the engine's native articulated body grammar. */
import { defineBody, type BodySpec } from '../../../engine';
export const MERCS = [
  {
    key: 'ilse',
    name: 'Ilse Brandt',
    origin: 'Bremen · field medic',
    line: 'I keep accounts. People mistake that for kindness.',
    skin: '#dbad84',
    jacket: '#89774e',
    hair: '#795739',
  },
  {
    key: 'tomas',
    name: 'Tomás Arriaga',
    origin: 'Medellín · demolitions',
    line: 'The wind never asks for a raise.',
    skin: '#ba8961',
    jacket: '#758049',
    hair: '#302c23',
  },
  {
    key: 'yaw',
    name: 'Yaw Mensah',
    origin: 'Accra · former peacekeeper',
    line: 'Somebody should tell the peace I am still here.',
    skin: '#734e35',
    jacket: '#7c8b85',
    hair: '#27241f',
  },
  {
    key: 'mirela',
    name: 'Mirela Dragan',
    origin: 'Constanța · marksman',
    line: 'Stay down. We can discuss it when you are old.',
    skin: '#d2b18f',
    jacket: '#62694c',
    hair: '#372c22',
  },
] as const;
const base: BodySpec = {
  description: 'Weathered mercenary, rolled sleeves, cargo pockets, boots and field pack.',
  build: 'build:adult',
  limbRadius: 0.055,
  torsoRadius: 0.2,
  slots: {
    skin: '#bd936c',
    jacket: '#8c815a',
    pants: '#5b6146',
    boot: '#363a2e',
    hair: '#372d25',
    accent: '#9d5441',
    eye: '#201d16',
  },
  parts: [
    [
      'ball',
      'pelvis',
      [
        [0.8, 'torso'],
        [0.5, 'torso'],
        [0.7, 'torso'],
      ],
      'pants',
    ],
    ['limb', 'spine0', 'chest', [0.72, 'torso'], [0.85, 'torso'], 'jacket'],
    ['limb', 'chest', 'neck', [0.85, 'torso'], [0.33, 'torso'], 'jacket'],
    ['limb', 'neck', 'head', 0.055, 0.05, 'skin'],
    ['ball', ['off', 'head', [0.03, 'head'], 0, [0.9, 'head']], [0.88, 'head'], 'skin'],
    ['ball', ['off', 'head', [-0.18, 'head'], 0, [1.2, 'head']], [0.88, 'head'], 'hair'],
    ['box', ['off', 'back', -0.08, 0, -0.12], ['off', 'back', -0.08, 0, 0.15], 0.28, 0.14, 'pants', { on: 'chest' }],
  ],
  mirror: [
    ['limb', 'thighL', 'shinL', [1.45, 'limb'], [1.2, 'limb'], 'pants'],
    ['limb', 'shinL', 'footL', [1.15, 'limb'], [0.95, 'limb'], 'pants'],
    ['limb', 'footL', 'toeL', [1.1, 'limb'], [0.95, 'limb'], 'boot'],
    ['limb', 'upperArmL', 'forearmL', [1.25, 'limb'], [1.05, 'limb'], 'jacket'],
    ['limb', 'forearmL', 'handL', [0.99, 'limb'], [0.82, 'limb'], 'skin'],
    ['ball', 'weaponL', [0.87, 'limb'], 'skin'],
    [
      'ball',
      'upperArmL',
      [
        [1.55, 'limb'],
        [1.22, 'limb'],
        [1.4, 'limb'],
      ],
      'accent',
      { on: 'chest' },
    ],
    ['eye', 'eyeL', [0.09, 'head'], 'eye'],
  ],
};
for (const m of MERCS)
  defineBody(`body:${m.key}`, { ...base, slots: { ...base.slots, skin: m.skin, jacket: m.jacket, hair: m.hair } });
for (const [id, jacket, accent] of [
  ['front', '#747852', '#96b0b7'],
  ['authority', '#a29568', '#9c4939'],
  ['civilian', '#a99776', '#b6b49a'],
  ['sister', '#d8ceb0', '#657a74'],
  ['mirage', '#8e9288', '#93968e'],
])
  defineBody(`body:${id}`, {
    ...base,
    slots: { ...base.slots, skin: id === 'mirage' ? '#92958b' : '#78543a', jacket, accent },
  });

for (const [n, accent] of ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'].entries())
  defineBody(`body:coop-${n}`, {
    ...base,
    description: 'A contract mercenary in the hub seat colour.',
    slots: { ...base.slots, skin: MERCS[n].skin, jacket: MERCS[n].jacket, hair: MERCS[n].hair, accent },
  });
