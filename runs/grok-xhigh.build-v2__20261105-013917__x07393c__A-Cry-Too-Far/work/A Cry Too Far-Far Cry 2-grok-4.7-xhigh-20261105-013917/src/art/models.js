import { model } from '../../pixel-engine.js';

const limb = (name, len, w, c, kids = [], at = [0, 0, 0]) => ({
  group: [{ box: [w, len, w], at: [0, -len / 2, 0], c }, ...kids], at, pivot: true, name,
});
const foot = (name) => ({
  group: [{ box: [0.12, 0.1, 0.26], at: [0, -0.05, 0.05], c: 'boot' }], at: [0, -0.22, 0], pivot: true, name,
});

export const soldier = model({
  id: 'soldier',
  about: 'Soldier on the hero rig',
  tags: ['actor'],
  floats: true,
  collider: 'none',
  palette: { cloth: 'slate', dark: 'night', skin: 'plum', boot: 'ink', beret: 'navy', strap: 'white' },
  parts: [{
    group: [
      { box: [0.34, 0.2, 0.2], at: [0, 0.06, 0], c: 'dark' },
      {
        group: [
          { box: [0.38, 0.5, 0.22], at: [0, 0.25, 0], c: 'cloth' },
          { box: [0.06, 0.56, 0.24], at: [0.1, 0.25, 0], rot: [0, 0, 28], c: 'strap' },
          {
            group: [
              { box: [0.2, 0.22, 0.2], at: [0, 0.11, 0], c: 'skin' },
              { box: [0.24, 0.07, 0.24], at: [0.01, 0.25, 0], rot: [0, 0, -8], c: 'beret' },
            ],
            at: [0, 0.52, 0], pivot: true, name: 'Head',
          },
          limb('ArmR', 0.25, 0.11, 'cloth', [limb('ForearmR', 0.16, 0.09, 'cloth', [limb('HandR', 0.08, 0.08, 'skin', [], [0, -0.16, 0])], [0, -0.25, 0])], [-0.25, 0.47, 0]),
          limb('ArmL', 0.25, 0.11, 'cloth', [limb('ForearmL', 0.16, 0.09, 'cloth', [limb('HandL', 0.08, 0.08, 'skin', [], [0, -0.16, 0])], [0, -0.25, 0])], [0.25, 0.47, 0]),
        ],
        at: [0, 0.04, 0], pivot: true, name: 'Torso',
      },
      limb('LegR', 0.3, 0.13, 'dark', [limb('ShinR', 0.22, 0.11, 'dark', [foot('FootR')], [0, -0.3, 0])], [-0.14, 0, 0]),
      limb('LegL', 0.3, 0.13, 'dark', [limb('ShinL', 0.22, 0.11, 'dark', [foot('FootL')], [0, -0.3, 0])], [0.14, 0, 0]),
    ],
    at: [0, 0.62, 0], pivot: true, name: 'Pelvis',
  }],
});

function prop(id, about, color, box) {
  return model({
    id, about, tags: ['prop'], floats: true, collider: 'none',
    palette: { c: color },
    parts: [{ box, c: 'c' }],
  });
}

export const props = [
  prop('pickup', 'Basin pickup truck', 'sand', [1.8, 0.7, 4.2]),
  prop('shack', 'Tin roof shack', 'orange', [4, 2.4, 3.2]),
  prop('clinic-tent', 'Clinic tent with a green cross', 'white', [5, 2.6, 4]),
  prop('acacia', 'Flat topped acacia', 'plum', [1.4, 3.2, 1.4]),
  prop('hands', 'First person hands', 'plum', [0.2, 0.12, 0.28]),
  prop('rifle-view', 'Tractor rifle in the hands', 'ink', [0.08, 0.1, 0.7]),
  prop('map-sheet', 'Paper map plane', 'sand', [0.5, 0.02, 0.38]),
];

export const MODELS = [soldier, ...props];
