import { HERO_RIG, placeFeet } from '../../pixel-engine.js';

const feet = (pose, R, L) => placeFeet(pose, HERO_RIG, { R, L });
const hold = (name, pose) => ({ name, frames: 60, loop: true, keys: [[0, pose], [60, pose]] });

const tree = hold('Tree', {
  Pelvis: { p: [0.03, -0.02, 0] },
  ArmR: [-172, 0, -6],
  ForearmR: [-14, 0, 0],
  ArmL: [-172, 0, 6],
  ForearmL: [-14, 0, 0],
  LegR: [-62, 0, -58],
  ShinR: [150, 0, 0],
  FootR: [30, 0, 0],
});
const heron = hold('Heron', {
  Pelvis: { p: [0, -0.02, 0] },
  Torso: [10, 0, 0],
  Head: [-14, 0, 0],
  ArmR: [-20, 0, -80],
  ArmL: [-20, 0, 80],
  ForearmR: [-30, 0, 0],
  ForearmL: [-30, 0, 0],
  LegR: [-85, 0, 0],
  ShinR: [95, 0, 0],
  FootR: [35, 0, 0],
});
const warrior = hold('Warrior', feet({ Pelvis: { p: [0, -0.2, 0] }, Torso: [0, 25, 0], Head: [0, 40, 0], ArmR: [0, 0, -90], ArmL: [0, 0, 90] }, { z: 0.38 }, { z: -0.38 }));
const chair = hold('Chair', feet({ Pelvis: { p: [0, -0.28, -0.06] }, Torso: [24, 0, 0], Head: [-18, 0, 0], ArmR: [-110, 0, -8], ArmL: [-110, 0, 8] }, { z: 0 }, { z: 0 }));
const fold = hold('Fold', feet({ Pelvis: { p: [0, -0.03, -0.03] }, Torso: [88, 0, 0], Head: [10, 0, 0], ArmR: [-70, 0, -6], ArmL: [-70, 0, 6], ForearmR: [-8, 0, 0], ForearmL: [-8, 0, 0] }, { z: 0 }, { z: 0 }));
const plank = hold('Plank', {
  Pelvis: { r: [66, 0, 0], p: [0, -0.2, 0] },
  Head: [-48, 0, 0],
  ArmR: [-63, 0, -5],
  ArmL: [-63, 0, 5],
  HandR: [-40, 0, 0],
  HandL: [-40, 0, 0],
  FootR: [55, 0, 0],
  FootL: [55, 0, 0],
});

const squatTop = { Pelvis: { p: [0, -0.02, 0] }, Torso: [2, 0, 0], ArmR: [6, 0, -9], ArmL: [6, 0, 9] };
const squatLow = { Pelvis: { p: [0, -0.3, -0.05] }, Torso: [26, 0, 0], Head: [-20, 0, 0], ArmR: [-85, 0, -8], ArmL: [-85, 0, 8] };
const squat = {
  name: 'SquatRep',
  frames: 30,
  grounded: true,
  keys: [
    [0, feet(squatTop, { z: 0 }, { z: 0 })],
    [30, feet(squatLow, { z: 0 }, { z: 0 })],
  ],
  feet: [
    [0, { R: { z: 0 }, L: { z: 0 } }],
    [30, { R: { z: 0 }, L: { z: 0 } }],
  ],
};

const lungeTop = { Pelvis: { p: [0, -0.02, 0] }, Torso: [4, 0, 0], ArmR: [8, 0, -12], ArmL: [8, 0, 12] };
const lungeLow = { Pelvis: { p: [0, -0.24, 0] }, Torso: [6, 0, 0], ArmR: [-20, 0, -10], ArmL: [-20, 0, 10] };
const lunge = {
  name: 'LungeRep',
  frames: 30,
  grounded: true,
  keys: [
    [0, feet(lungeTop, { z: 0 }, { z: 0 })],
    [30, feet(lungeLow, { z: 0.34 }, { z: -0.32, pitch: 25, pivot: 'ball' })],
  ],
  feet: [
    [0, { R: { z: 0 }, L: { z: 0 } }],
    [30, { R: { z: 0.34 }, L: { z: -0.32, pitch: 25, pivot: 'ball' } }],
  ],
};

const pressLow = { Pelvis: { p: [0, -0.04, 0] }, Torso: [6, 0, 0], ArmR: [-30, 0, -16], ArmL: [-30, 0, 16] };
const pressHigh = { Pelvis: { p: [0, -0.02, 0] }, Torso: [2, 0, 0], ArmR: [-168, 0, -8], ArmL: [-168, 0, 8], ForearmR: [-12, 0, 0], ForearmL: [-12, 0, 0] };
const press = {
  name: 'Press',
  frames: 30,
  grounded: true,
  keys: [
    [0, feet(pressLow, { z: 0 }, { z: 0 })],
    [30, feet(pressHigh, { z: 0 }, { z: 0 })],
  ],
  feet: [
    [0, { R: { z: 0 }, L: { z: 0 } }],
    [30, { R: { z: 0 }, L: { z: 0 } }],
  ],
};

const stepL = hold('StepL', feet({ Pelvis: { p: [-0.04, -0.02, 0] }, Torso: [4, 0, -4] }, { z: 0.06 }, { z: -0.02 }));
const stepR = hold('StepR', feet({ Pelvis: { p: [0.04, -0.02, 0] }, Torso: [4, 0, 4] }, { z: 0.02 }, { z: -0.06 }));

export const CLIPS = [tree, heron, warrior, chair, fold, plank, squat, lunge, press, stepL, stepR];

export const CLIP_BY_NAME = Object.fromEntries(CLIPS.map((c) => [c.name, c]));
