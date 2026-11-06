/** @file Savanna silhouettes, industrial landmarks, useful objects and vehicles, built from lit low-poly parts. */
import { box, cone, prop } from './kit';

prop('road', [box('gravel', [6, 0.035, 13], [0, 0, 0], '#957951')]);
prop('water', [box('water', [1436, 0.025, 36], [0, 0, 0], '#768b76')]);
prop('projectile', [{ ...cone('flare', 0.07, 0.2, [0, 0, 0], '#ffb341'), lit: true }]);

for (let k = 0; k < 3; k++)
  prop(`thorn-${k}`, [
    cone('trunk', 0.28, 5.8, [0, 0, 0], '#6d5640', 0.13, [0, 0, 0.08 * (k - 1)]),
    cone('fork-left', 0.14, 3, [-0.1, 3.8, 0], '#6d5640', 0.04, [0, 0, 0.75]),
    cone('fork-right', 0.13, 3, [0.1, 3.5, 0], '#6d5640', 0.04, [0, 0, -0.7]),
    cone('canopy', 4.5 + k * 0.4, 1.4, [0, 5.9, 0], ['#747f3d', '#7d8443', '#657345'][k], 1.2),
    cone('side-canopy', 2.4, 1.1, [-2.7, 5.3, 0.5], '#7b8242', 0.6),
  ]);
prop('bottle-tree', [cone('trunk', 1.2, 8, [0, 0, 0], '#9d8b71', 0.3), cone('crown', 4, 2, [0, 7, 0], '#64703c', 0.3)]);
prop('char-tree', [
  cone('trunk', 0.25, 5.8, [0, 0, 0], '#302923', 0.08),
  cone('branch', 0.12, 2, [0, 3.8, 0], '#302923', 0.02, [0, 0, 0.8]),
]);
prop('grass', [
  { name: 'blades', geometry: 'geometry:field-grass', material: 'material:grass', tint: '#b8a16a', shadow: false },
]);
prop('stubble', [
  { name: 'stubble', geometry: 'geometry:field-stubble', material: 'material:grass', tint: '#73804c', shadow: false },
]);
prop('scorch', [box('ash', [7.7, 0.035, 7.7], [0, 0.01, 0], '#322d22')]);
prop('flame-patch', [
  {
    ...cone('flame', 1, 2, [0, 0, 0], '#ff8225', 0),
    flame: { tongues: 6, ring: 2.1, height: 2.5, sway: 0.3, core: '#ffd76d' },
    lit: true,
    shadow: false,
  },
  {
    ...cone('core', 0.7, 1.6, [1, 0, 1], '#ffb633', 0),
    flame: { tongues: 4, ring: 1.4, height: 1.7, sway: 0.2, core: '#fff0b0' },
    lit: true,
    shadow: false,
  },
]);
prop('rock', [cone('stone', 1.9, 1.7, [0, 0, 0], '#83725d', 0.9), cone('chip', 1.1, 1, [-1, 0, 0.5], '#776b58', 0.7)]);
prop('termite', [
  cone('mound', 1.1, 3.8, [0, 0, 0], '#a96842', 0.15),
  cone('spur', 0.6, 2, [0.7, 0, 0.1], '#9a5d36', 0.1),
]);
prop(
  'barrel',
  [
    cone('drum', 0.4, 1.1, [0, 0, 0], '#9d4f2d'),
    cone('band-1', 0.415, 0.05, [0, 0.22, 0], '#423c31'),
    cone('band-2', 0.415, 0.05, [0, 0.85, 0], '#423c31'),
  ],
  true,
);
prop(
  'tank',
  [
    cone('fuel', 3, 7, [0, 0, 0], '#bcb495'),
    cone('band', 3.03, 0.2, [0, 4.5, 0], '#5c6259'),
    box('ladder', [0.4, 6, 0.12], [3, 0, 0], '#53584c'),
  ],
  true,
);
prop(
  'sandbags',
  Array.from({ length: 8 }, (_, i) =>
    box(`sack-${i}`, [1.2, 0.35, 0.62], [((i % 4) - 1.5) * 1.1, Math.floor(i / 4) * 0.34, 0], '#aa9870'),
  ),
  true,
);
prop(
  'boom',
  [
    box('post', [0.3, 1.3, 0.3], [0, 0, 0], '#6a5a42'),
    box('arm', [8, 0.15, 0.18], [3.7, 1.25, 0], '#d5c9a0'),
    box('stripe', [0.5, 0.16, 0.2], [2, 1.25, 0], '#8d382d'),
  ],
  true,
);
prop('water-tower', [
  ...[-1, 1].flatMap((x) => [-1, 1].map((z) => box(`leg-${x}-${z}`, [0.3, 9, 0.3], [x * 2, 0, z * 2], '#615f4b'))),
  cone('cistern', 3.2, 3.5, [0, 8, 0], '#9a9b86'),
  cone('cap', 3.5, 1, [0, 11.5, 0], '#737d72', 0.3),
]);
prop('pole', [
  cone('pole', 0.17, 10, [0, 0, 0], '#75644b'),
  box('crossbar', [4, 0.2, 0.2], [0, 8.9, 0], '#6a5b44'),
  box('wire', [0.04, 0.04, 45], [1.5, 9, 22], '#504b3c'),
]);
prop('pipeline', [
  cone('pipe', 0.35, 22, [0, 1, 0], '#8f7a55', undefined, [Math.PI / 2, 0, 0]),
  box('support', [0.7, 1.1, 0.5], [0, 0, 5], '#716b5c'),
]);
prop('cassette', [
  box('case', [0.3, 0.045, 0.19], [0, 0, 0], '#342e24'),
  box('label', [0.24, 0.006, 0.08], [0, 0.045, 0], '#e3d6af'),
  ...[-1, 1].map((x) => cone(`spool-${x}`, 0.025, 0.009, [x * 0.075, 0.051, 0], '#504b3d')),
]);
prop('tinbox', [
  box('tin', [0.65, 0.25, 0.4], [0, 0, 0], '#757c68'),
  box('lid', [0.69, 0.04, 0.44], [0, 0.25, 0], '#9b9e7e'),
  box('latch', [0.08, 0.12, 0.03], [0, 0.16, 0.22], '#493e2c'),
]);
prop('crate', [
  box('aid', [0.9, 0.65, 0.65], [0, 0, 0], '#857351'),
  ...[-1, 1].map((x) => box(`strap-${x}`, [0.05, 0.69, 0.69], [x * 0.28, 0, 0], '#d0bb80')),
]);
prop('bed', [
  box('frame', [1.1, 0.4, 2], [0, 0, 0], '#555846'),
  box('mattress', [1, 0.18, 1.9], [0, 0.4, 0], '#bdad83'),
  box('pillow', [0.8, 0.15, 0.4], [0, 0.57, -0.6], '#d0c6a6'),
]);
prop('armoury', [
  box('locker', [1.4, 1.8, 0.6], [0, 0, 0], '#5c654d'),
  box('seam', [0.025, 1.7, 0.02], [0, 0.05, 0.31], '#242e24'),
  box('handle', [0.12, 0.05, 0.08], [0.18, 0.9, 0.32], '#d0c6a6'),
]);
prop('phone', [
  cone('post', 0.12, 2, [0, 0, 0], '#746044'),
  box('box', [0.4, 0.5, 0.23], [0, 1.2, 0], '#445345'),
  box('receiver', [0.32, 0.08, 0.09], [0, 1.5, 0.15], '#222c25'),
]);
prop(
  'railcar',
  [
    box('frame', [3, 0.4, 10], [0, 0.7, 0], '#524d40'),
    box('body', [2.8, 2.8, 9.5], [0, 1.1, 0], '#796d4a'),
    box('roof', [3.15, 0.2, 10], [0, 3.9, 0], '#424943'),
    box('door', [1.3, 2.2, 0.05], [1.42, 1.1, 0], '#312f25'),
  ],
  true,
);
prop('flag', [cone('mast', 0.05, 5, [0, 0, 0], '#b3a988'), box('cloth', [2, 1.1, 0.04], [0.95, 3.8, 0], '#6e95a2')]);
prop(
  'barn',
  [
    ...[-1, 1].map((x) => box(`wall-${x}`, [0.3, 5, 15], [x * 5, 0, 0], '#775b3c')),
    ...[-1, 1].map((x) => box(`roof-${x}`, [6.2, 0.16, 16], [x * 2.6, 5.2, 0], '#a47b4b', [0, 0, x * 0.25])),
    box('back', [10, 5, 0.3], [0, 0, -7.4], '#876440'),
  ],
  true,
);
prop('salt-pan', [
  box('crust', [30, 0.05, 24], [0, 0.015, 0], '#e4dfc5'),
  cone('heap', 4, 3, [-6, 0, 0], '#f0ead5', 0.4),
]);
prop('barge', [
  box('hull', [9, 1.2, 20], [0, 0, 0], '#494e3c'),
  box('deck', [8.7, 0.2, 19], [0, 1.2, 0], '#807653'),
  box('cabin', [4, 3.5, 4], [0, 1.4, -6], '#a69b78'),
]);
prop('plane', [
  box('fuselage', [2, 1.5, 13], [0, 0, 0], '#b4b39c'),
  box('wings', [17, 0.2, 2.7], [0, 0.6, 0], '#929b91'),
  box('tail', [6, 0.18, 1.5], [0, 0.8, -5.5], '#9ba394'),
  box('fin', [0.2, 2.5, 2], [0, 1, -5.5], '#aa7653'),
]);
prop('wheel', [
  cone('tire', 0.42, 0.28, [0, 0, 0], '#242b25', undefined, [0, 0, Math.PI / 2]),
  cone('hub', 0.19, 0.3, [0.01, 0, 0], '#9ca28c', undefined, [0, 0, Math.PI / 2]),
  box('spoke', [0.025, 0.6, 0.04], [-0.15, -0.3, 0], '#c1c5ac'),
]);
for (const kind of ['pickup', 'jeep'])
  prop(kind, [
    box('chassis', [1.75, 0.4, 3.9], [0, 0.6, 0], '#747955'),
    box('bonnet', [1.7, 0.35, 1.1], [0, 1, 1.2], '#879169'),
    box('seat', [1.5, 0.4, 0.65], [0, 0.95, -0.1], '#464b35'),
    box('windshield-frame', [1.7, 0.08, 0.08], [0, 1.85, 0.45], '#b7b49b'),
    ...[-1, 1].map((x) => box(`pillar-${x}`, [0.07, 0.7, 0.07], [x * 0.8, 1.15, 0.45], '#9da18a')),
    box('bed', [1.65, 0.2, 1.1], [0, 0.95, -1.25], '#6e754c'),
    cone('steering-wheel', 0.2, 0.025, [-0.35, 1.75, 0.43], '#323b2d', undefined, [0.9, 0, 0]),
    ...[-1, 1].map((x) => box(`lamp-${x}`, [0.3, 0.18, 0.04], [x * 0.55, 1, 1.96], '#e3d5a1')),
    cone('mg', 0.045, 1.4, [0, 1.8, -0.9], '#313c32', undefined, [Math.PI / 2, 0, 0]),
  ]);
prop('boat', [
  box('hull', [1.8, 0.45, 5], [0, 0, 0], '#697960'),
  ...[-1, 1].map((x) => box(`gunwale-${x}`, [0.14, 0.5, 4.7], [x * 0.88, 0.4, 0], '#9fa58e')),
  box('bench', [1.55, 0.16, 0.5], [0, 0.5, -0.6], '#7c6544'),
  box('console', [0.55, 0.65, 0.4], [0, 0.5, 0.5], '#5b6856'),
  cone('bow-gun', 0.04, 1.2, [0, 1, 1.5], '#303c35', undefined, [Math.PI / 2, 0, 0]),
]);

prop('syrette', [
  cone('syringe', 0.013, 0.11, [0, 0, 0], '#d6ceb0'),
  cone('plunger', 0.006, 0.04, [0, 0.11, 0], '#a4afa0'),
  cone('needle', 0.0015, 0.055, [0, -0.055, 0], '#ccd4c8'),
  box('flange', [0.045, 0.004, 0.014], [0, 0.105, 0], '#dbd5be'),
]);
prop('pill-bottle', [
  cone('bottle', 0.042, 0.1, [0, 0, 0], '#9b6735'),
  cone('lid', 0.043, 0.027, [0, 0.1, 0], '#d8d0ac'),
  box('label', [0.07, 0.055, 0.003], [0, 0.022, 0.041], '#e1d6b3'),
]);
prop('wrench', [
  box('handle', [0.025, 0.23, 0.012], [0, 0, 0], '#9fa99a'),
  ...[-1, 1].map((x) => box(`jaw-${x}`, [0.02, 0.06, 0.014], [x * 0.024, 0.21, 0], '#bdc4b4')),
]);
prop('surgery-tool', [
  box('forceps', [0.009, 0.17, 0.008], [-0.012, 0, 0], '#bfc8bb', [0, 0, -0.08]),
  box('forceps-2', [0.009, 0.17, 0.008], [0.012, 0, 0], '#bfc8bb', [0, 0, 0.08]),
]);
prop('lighter', [
  box('case', [0.035, 0.065, 0.02], [0, 0, 0], '#9d7b43'),
  {
    ...cone('flame', 0.008, 0.045, [0, 0.065, 0], '#ffaa35', 0),
    lit: true,
    flame: { tongues: 1, ring: 0, height: 0.04, sway: 0.003, core: '#fff0ac' },
  },
]);

prop('frag', [
  cone('body', 0.08, 0.14, [0, 0, 0], '#586348', 0.05),
  box('lever', [0.025, 0.025, 0.1], [0, 0.14, 0.02], '#a4aa94'),
]);

prop('machete', [
  box('grip', [0.034, 0.11, 0.024], [0, 0, 0], '#443b2b'),
  box('guard', [0.085, 0.012, 0.03], [0, 0.105, 0], '#777f70'),
  box('blade', [0.055, 0.43, 0.007], [0, 0.117, 0], '#a9b2a3'),
  cone('tip', 0.03, 0.07, [0, 0.547, 0], '#b8c0b0', 0),
]);
