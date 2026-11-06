// The humanoid body template: nested pivots named after HERO_RIG's joints. Change the shapes, keep the pivots.
export const j = (name, at, kids = []) => ({ group: kids, name, pivot: true, at });
export const humanoid = ({ hips = [], chest = [], head = [], upperArm = [], foreArm = [], handR = [], handL = [], thigh = [], shin = [], foot = [], armR = null, armL = null, foreR = null, foreL = null }) => [
  j('Pelvis', [0, 0.62, 0], [...hips,
    j('Torso', [0, 0.05, 0], [...chest,
      j('Head', [0, 0.5, 0], head),
      j('ArmR', [-0.27, 0.42, 0], [...(armR ?? upperArm), j('ForearmR', [0, -0.25, 0], [...(foreR ?? foreArm), j('HandR', [0, -0.16, 0], handR)])]),
      j('ArmL', [0.27, 0.42, 0], [...(armL ?? upperArm), j('ForearmL', [0, -0.25, 0], [...(foreL ?? foreArm), j('HandL', [0, -0.16, 0], handL)])]),
    ]),
    j('LegR', [-0.14, 0, 0], [...thigh, j('ShinR', [0, -0.3, 0], [...shin, j('FootR', [0, -0.22, 0], foot)])]),
    j('LegL', [0.14, 0, 0], [...thigh, j('ShinL', [0, -0.3, 0], [...shin, j('FootL', [0, -0.22, 0], foot)])]),
  ]),
];
export const limb = (w, h, c, y = -h / 2) => ({ box: [w, h, w], at: [0, y, 0], c });
export const foot = (c) => [{ box: [0.15, 0.09, 0.26], at: [0, -0.045, 0.05], c }];
export const hand = (c) => [{ box: [0.11, 0.11, 0.11], at: [0, -0.04, 0], c }];
export const eyes = (c = 'eye', y = 0.17, z = 0.15) => ({ mirror: [{ box: [0.05, 0.05, 0.03], at: [0.07, y, z], c, glow: true }], axis: 'x' });
