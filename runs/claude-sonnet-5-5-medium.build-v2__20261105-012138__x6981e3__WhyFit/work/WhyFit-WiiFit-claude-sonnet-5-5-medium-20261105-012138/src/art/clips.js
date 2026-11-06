// Clips written as ClipDef data on the hero rig. Verified poses from the plan plus the new ones.
import { HERO_RIG, mirror, placeFeet } from '../../pixel-engine.js';

const hold = (name, pose, extra = {}) => ({ name, frames: 60, loop: true, keys: [[0, pose], [60, pose]], ...extra });
const feet = (pose, R, L) => placeFeet(pose, HERO_RIG, { R, L });
const squatTop = { Pelvis: { p: [0, -0.02, 0] }, Torso: [2, 0, 0], ArmR: [6, 0, -9], ArmL: [6, 0, 9] };
const squatLow = { Pelvis: { p: [0, -0.3, -0.05] }, Torso: [26, 0, 0], Head: [-20, 0, 0], ArmR: [-85, 0, -8], ArmL: [-85, 0, 8] };
const lungeTop = { Pelvis: { p: [0, -0.02, 0] }, Torso: [2, 0, 0], ArmR: [6, 0, -9], ArmL: [6, 0, 9] };
const lungeLow = { Pelvis: { p: [0, -0.24, 0] }, Torso: [6, 0, 0], ArmR: [6, 0, -12], ArmL: [6, 0, 12] };
const pressTop = { Pelvis: { p: [0, -0.02, 0] }, ArmR: [-172, 0, -6], ArmL: [-172, 0, 6], ForearmR: [-8, 0, 0], ForearmL: [-8, 0, 0] };
const pressLow = { Pelvis: { p: [0, -0.04, 0] }, Torso: [4, 0, 0], ArmR: [-25, 0, -20], ArmL: [-25, 0, 20], ForearmR: [-125, 0, 0], ForearmL: [-125, 0, 0] };
const flat = { R: { z: 0 }, L: { z: 0 } };
const f0 = (pose) => feet(pose, { z: 0 }, { z: 0 });
const feetKey = (R, L) => ({ R, L });

export const NEW_CLIPS = [
  hold('Tree', { Pelvis: { p: [0.03, -0.02, 0] }, ArmR: [-172, 0, -6], ForearmR: [-14, 0, 0], ArmL: [-172, 0, 6], ForearmL: [-14, 0, 0], LegR: [-62, 0, -58], ShinR: [150, 0, 0], FootR: [30, 0, 0] }),
  hold('Heron', { Pelvis: { p: [0, -0.02, 0] }, Torso: [10, 0, 0], Head: [-14, 0, 0], ArmR: [-20, 0, -80], ArmL: [-20, 0, 80], ForearmR: [-30, 0, 0], ForearmL: [-30, 0, 0], LegR: [-85, 0, 0], ShinR: [95, 0, 0], FootR: [35, 0, 0] }),
  hold('Warrior', feet({ Pelvis: { p: [0, -0.2, 0] }, Torso: [0, 25, 0], Head: [0, 40, 0], ArmR: [0, 0, -90], ArmL: [0, 0, 90] }, { z: 0.38 }, { z: -0.38 })),
  hold('Chair', feet({ Pelvis: { p: [0, -0.28, -0.06] }, Torso: [24, 0, 0], Head: [-18, 0, 0], ArmR: [-110, 0, -8], ArmL: [-110, 0, 8] }, { z: 0 }, { z: 0 })),
  hold('Fold', feet({ Pelvis: { p: [0, -0.03, -0.03] }, Torso: [88, 0, 0], Head: [10, 0, 0], ArmR: [-70, 0, -6], ArmL: [-70, 0, 6], ForearmR: [-8, 0, 0], ForearmL: [-8, 0, 0] }, { z: 0 }, { z: 0 })),
  hold('Plank', { Pelvis: { r: [66, 0, 0], p: [0, -0.2, 0] }, Head: [-48, 0, 0], ArmR: [-63, 0, -5], ArmL: [-63, 0, 5], HandR: [-40, 0, 0], HandL: [-40, 0, 0], FootR: [55, 0, 0], FootL: [55, 0, 0] }),
  { name: 'SquatRep', frames: 30, grounded: true, keys: [[0, feet(squatTop, { z: 0 }, { z: 0 })], [30, feet(squatLow, { z: 0 }, { z: 0 })]], feet: [[0, feetKey({ z: 0 }, { z: 0 })], [30, feetKey({ z: 0 }, { z: 0 })]] },
  { name: 'LungeRep', frames: 30, grounded: true, keys: [[0, feet(lungeTop, { z: 0 }, { z: 0 })], [30, feet(lungeLow, { z: 0.34 }, { z: -0.32, pitch: 25, pivot: 'ball' })]], feet: [[0, feetKey({ z: 0 }, { z: 0 })], [30, feetKey({ z: 0.34 }, { z: -0.32, pitch: 25, pivot: 'ball' })]] },
  { name: 'LungeRepL', frames: 30, grounded: true, keys: [[0, feet(lungeTop, { z: 0 }, { z: 0 })], [30, feet(lungeLow, { z: -0.32, pitch: 25, pivot: 'ball' }, { z: 0.34 })]], feet: [[0, feetKey({ z: 0 }, { z: 0 })], [30, feetKey({ z: -0.32, pitch: 25, pivot: 'ball' }, { z: 0.34 })]] },
  { name: 'PressRep', frames: 30, grounded: true, keys: [[0, feet(pressLow, { z: 0 }, { z: 0 })], [30, feet(pressTop, { z: 0 }, { z: 0 })]], feet: [[0, feetKey({ z: 0 }, { z: 0 })], [30, feetKey({ z: 0 }, { z: 0 })]] },
  { name: 'StepL', frames: 12, keys: [[0, {}], [5, { LegL: [-75, 0, 0], ShinL: [85, 0, 0], Pelvis: { p: [0, 0.02, 0] }, Torso: [6, 0, 0] }], [12, {}]] },
  { name: 'StepR', frames: 12, keys: [[0, {}], [5, { LegR: [-75, 0, 0], ShinR: [85, 0, 0], Pelvis: { p: [0, 0.02, 0] }, Torso: [6, 0, 0] }], [12, {}]] },
  { name: 'Nod', frames: 14, grounded: true, keys: [[0, f0({})], [4, f0({ Torso: [-6, 0, 0], Head: [-22, 0, 0], Pelvis: { p: [0, -0.04, 0] } })], [8, f0({ Torso: [14, 0, 0], Head: [28, 0, 0] })], [14, f0({})]], feet: [[0, feetKey({ z: 0 }, { z: 0 })], [14, feetKey({ z: 0 }, { z: 0 })]] },
  { name: 'Flail', frames: 24, loop: true, keys: [[0, { ArmR: [-150, 0, -50], ArmL: [-40, 0, 80], Torso: [0, 0, 8], Pelvis: { r: [0, 0, 4] } }], [12, { ArmR: [-40, 0, -80], ArmL: [-150, 0, 50], Torso: [0, 0, -8], Pelvis: { r: [0, 0, -4] } }], [24, { ArmR: [-150, 0, -50], ArmL: [-40, 0, 80], Torso: [0, 0, 8], Pelvis: { r: [0, 0, 4] } }]] },
  { name: 'Daze', frames: 48, loop: true, keys: [[0, { Head: [8, 0, 18], Torso: [6, 0, 6], ArmR: [8, 0, -12], ArmL: [8, 0, 12] }], [24, { Head: [8, 0, -18], Torso: [6, 0, -6], ArmR: [8, 0, -12], ArmL: [8, 0, 12] }], [48, { Head: [8, 0, 18], Torso: [6, 0, 6], ArmR: [8, 0, -12], ArmL: [8, 0, 12] }]] },
  { name: 'Bow', frames: 60, keys: [[0, {}], [18, { Torso: [42, 0, 0], Head: [10, 0, 0] }], [42, { Torso: [42, 0, 0], Head: [10, 0, 0] }], [60, {}]] },
  { name: 'SlowClap', frames: 36, loop: true, keys: [[0, { ArmR: [-80, 0, -10], ArmL: [-80, 0, 10], ForearmR: [-70, 0, 0], ForearmL: [-70, 0, 0] }], [18, { ArmR: [-80, 0, -30], ArmL: [-80, 0, 30], ForearmR: [-60, 0, 0], ForearmL: [-60, 0, 0] }], [36, { ArmR: [-80, 0, -10], ArmL: [-80, 0, 10], ForearmR: [-70, 0, 0], ForearmL: [-70, 0, 0] }]] },
  { name: 'Sneeze', frames: 24, grounded: true, keys: [[0, f0({})], [10, f0({ Torso: [-14, 0, 0], Head: [-26, 0, 0] })], [14, f0({ Torso: [34, 0, 0], Head: [28, 0, 0], Pelvis: { p: [0, -0.05, 0] } })], [24, f0({})]], feet: [[0, feetKey({ z: 0 }, { z: 0 })], [24, feetKey({ z: 0 }, { z: 0 })]] },
  hold('Point', { ArmR: [-90, 0, -6], ForearmR: [-6, 0, 0], ArmL: [8, 0, 10], Torso: [0, 8, 0], Head: [0, 10, 0] }),
  hold('Tuck', { Pelvis: { p: [0, -0.1, 0] }, Torso: [48, 0, 0], Head: [-10, 0, 0], ArmR: [-70, 0, -12], ArmL: [-70, 0, 12], ForearmR: [-90, 0, 0], ForearmL: [-90, 0, 0], LegR: [-95, 0, 0], LegL: [-95, 0, 0], ShinR: [110, 0, 0], ShinL: [110, 0, 0] }),
  hold('Cannon', { Pelvis: { p: [0, -0.1, 0] }, Torso: [30, 0, 0], ArmR: [-60, 0, -10], ArmL: [-60, 0, 10], ForearmR: [-120, 0, 0], ForearmL: [-120, 0, 0], LegR: [-100, 0, 0], LegL: [-100, 0, 0], ShinR: [120, 0, 0], ShinL: [120, 0, 0] }),
  hold('Paddle', { ArmR: [-172, 0, -12], ForearmR: [-10, 0, 0], ArmL: [10, 0, 12], Head: [0, 0, -4] }),
  hold('Ready', { Torso: [4, 0, 0], ArmR: [-40, 0, -10], ArmL: [-40, 0, 10], ForearmR: [-50, 0, 0], ForearmL: [-50, 0, 0] }),
  hold('Arms', { ArmR: [0, 0, -88], ArmL: [0, 0, 88], Pelvis: { p: [0, -0.01, 0] } }),
  hold('Cheer', { ArmR: [-165, 0, -25], ArmL: [-165, 0, 25], Head: [-8, 0, 0] }),
  hold('Slump', f0({ Torso: [28, 0, 0], Head: [18, 0, 0], ArmR: [6, 0, -6], ArmL: [6, 0, 6], Pelvis: { p: [0, -0.04, 0] } })),
];
export const mirrored = (pose) => mirror(pose, HERO_RIG);
export const NEW_CLIP_NAMES = NEW_CLIPS.map((c) => c.name);

/** The jog gait from the plan. */
export const jogGait = (gaitClip) => gaitClip(HERO_RIG, { name: 'Jog', frames: 16, speed: 3, stance: 0.42, hip: -0.04, bob: 0.03, lift: 0.1, lean: 6, sway: 2, arms: { swing: 30, elbow: 75 } });
