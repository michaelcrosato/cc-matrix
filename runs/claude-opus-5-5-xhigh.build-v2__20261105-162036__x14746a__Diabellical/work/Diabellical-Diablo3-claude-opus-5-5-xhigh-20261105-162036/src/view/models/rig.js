// The body template: nested pivots named after the hero rig's joints, so every humanoid animates
// with the hero's clips. Keep the pivots; change the shapes between them.
export const j = (name, at, kids = []) => ({ group: kids, name, pivot: true, at });
export const hang = (w, h, d, c, extra = {}) => ({ box: [w, h, d], at: [0, -h / 2, 0], c, ...extra });
export const box = (w, h, d, at, c, extra = {}) => ({ box: [w, h, d], at, c, ...extra });

export const humanoid = ({ hips = [], chest = [], head = [], upperArm = [], foreArm = [], handR = [], handL = [], thigh = [], shin = [], foot = [], armLExtra = [], armRExtra = [] }) => [
  j('Pelvis', [0, 0.62, 0], [...hips,
    j('Torso', [0, 0.05, 0], [...chest,
      j('Head', [0, 0.5, 0], head),
      j('ArmR', [-0.27, 0.42, 0], [...upperArm, ...armRExtra, j('ForearmR', [0, -0.25, 0], [...foreArm, j('HandR', [0, -0.16, 0], handR)])]),
      j('ArmL', [0.27, 0.42, 0], [...upperArm, ...armLExtra, j('ForearmL', [0, -0.25, 0], [...foreArm, j('HandL', [0, -0.16, 0], handL)])]),
    ]),
    j('LegR', [-0.14, 0, 0], [...thigh, j('ShinR', [0, -0.3, 0], [...shin, j('FootR', [0, -0.22, 0], foot)])]),
    j('LegL', [0.14, 0, 0], [...thigh, j('ShinL', [0, -0.3, 0], [...shin, j('FootL', [0, -0.22, 0], foot)])]),
  ]),
];

// Ordinary limbs, in slots named by the body.
export const limbs = ({ arm = 'cloth', hand = 'skin', leg = 'cloth', boot = 'boot', armW = 0.14, legW = 0.17 }) => ({
  upperArm: [hang(armW, 0.26, armW, arm)],
  foreArm: [hang(armW - 0.01, 0.17, armW - 0.01, arm)],
  handR: [hang(0.12, 0.11, 0.12, hand)],
  handL: [hang(0.12, 0.11, 0.12, hand)],
  thigh: [hang(legW, 0.31, legW, leg)],
  shin: [hang(legW - 0.02, 0.23, legW - 0.02, leg)],
  foot: [box(0.17, 0.11, 0.3, [0, -0.045, 0.05], boot)],
});
export const eyes = (y, z, c = 'eye', dx = 0.07, size = 0.06) => ({ mirror: [{ box: [size, size, 0.04], at: [dx, y, z], c, glow: true }], axis: 'x' });
