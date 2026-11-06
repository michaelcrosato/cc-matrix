// Every clip the game authored. ClipDef data on the kit's HERO_RIG.
import { gaitClip, HERO_CLIPS, HERO_RIG, mirror, placeFeet } from '../../pixel-engine.js';

const hold = (name, pose) => ({ name, frames: 60, loop: true, keys: [[0, pose], [60, pose]] });
const feet = (pose, R, L) => placeFeet(pose, HERO_RIG, { R, L });
const flat = { z: 0 };
const standBase = { Pelvis: { p: [0, -0.02, 0] }, ArmR: [6, 0, -9], ArmL: [6, 0, 9] };
const stand = feet(standBase, flat, flat);

// Poses for Holding Still.
const POSES = [
  hold('Tree', { Pelvis: { p: [0.03, -0.02, 0] }, ArmR: [-172, 0, -6], ForearmR: [-14, 0, 0], ArmL: [-172, 0, 6], ForearmL: [-14, 0, 0], LegR: [-62, 0, -58], ShinR: [150, 0, 0], FootR: [30, 0, 0] }),
  hold('Heron', { Pelvis: { p: [0, -0.02, 0] }, Torso: [10, 0, 0], Head: [-14, 0, 0], ArmR: [-20, 0, -80], ArmL: [-20, 0, 80], ForearmR: [-30, 0, 0], ForearmL: [-30, 0, 0], LegR: [-85, 0, 0], ShinR: [95, 0, 0], FootR: [35, 0, 0] }),
  hold('Warrior', feet({ Pelvis: { p: [0, -0.2, 0] }, Torso: [0, 25, 0], Head: [0, 40, 0], ArmR: [0, 0, -90], ArmL: [0, 0, 90] }, { z: 0.38 }, { z: -0.38 })),
  hold('Chair', feet({ Pelvis: { p: [0, -0.28, -0.06] }, Torso: [24, 0, 0], Head: [-18, 0, 0], ArmR: [-110, 0, -8], ArmL: [-110, 0, 8] }, flat, flat)),
  hold('Fold', feet({ Pelvis: { p: [0, -0.03, -0.03] }, Torso: [88, 0, 0], Head: [10, 0, 0], ArmR: [-70, 0, -6], ArmL: [-70, 0, 6], ForearmR: [-8, 0, 0], ForearmL: [-8, 0, 0] }, flat, flat)),
  hold('Plank', { Pelvis: { r: [66, 0, 0], p: [0, -0.2, 0] }, Head: [-48, 0, 0], ArmR: [-63, 0, -5], ArmL: [-63, 0, 5], HandR: [-40, 0, 0], HandL: [-40, 0, 0], FootR: [55, 0, 0], FootL: [55, 0, 0] }),
];

// Scrubbed reps: keys built with placeFeet AND a feet track, or the sole dips through the floor mid-clip.
const squatTop = { Pelvis: { p: [0, -0.02, 0] }, Torso: [2, 0, 0], ArmR: [6, 0, -9], ArmL: [6, 0, 9] };
const squatLow = { Pelvis: { p: [0, -0.3, -0.05] }, Torso: [26, 0, 0], Head: [-20, 0, 0], ArmR: [-85, 0, -8], ArmL: [-85, 0, 8] };
const SquatRep = { name: 'SquatRep', frames: 30, grounded: true, keys: [[0, feet(squatTop, flat, flat)], [30, feet(squatLow, flat, flat)]], feet: [[0, { R: flat, L: flat }], [30, { R: flat, L: flat }]] };
const lungeLow = { Pelvis: { p: [0, -0.24, 0] }, Torso: [6, 0, 0], ArmR: [10, 0, -14], ArmL: [10, 0, 14] };
const LungeR = { R: { z: 0.34 }, L: { z: -0.32, pitch: 25, pivot: 'ball' } };
const LungeRepR = { name: 'LungeRepR', frames: 30, grounded: true, keys: [[0, feet(squatTop, flat, flat)], [30, feet(lungeLow, LungeR.R, LungeR.L)]], feet: [[0, { R: flat, L: flat }], [30, LungeR]] };
const LungeL = { L: { z: 0.34 }, R: { z: -0.32, pitch: 25, pivot: 'ball' } };
const LungeRepL = { name: 'LungeRepL', frames: 30, grounded: true, keys: [[0, feet(mirror(squatTop, HERO_RIG), flat, flat)], [30, feet(mirror(lungeLow, HERO_RIG), LungeL.R, LungeL.L)]], feet: [[0, { R: flat, L: flat }], [30, LungeL]] };
const pressLow = feet({ Pelvis: { p: [0, -0.06, 0] }, ArmR: [-30, 0, -70], ForearmR: [-120, 0, 0], ArmL: [-30, 0, 70], ForearmL: [-120, 0, 0] }, flat, flat);
const pressTop = feet({ Pelvis: { p: [0, -0.01, 0] }, Head: [-10, 0, 0], ArmR: [-176, 0, -10], ForearmR: [-4, 0, 0], ArmL: [-176, 0, 10], ForearmL: [-4, 0, 0] }, flat, flat);
const Press = { name: 'Press', frames: 30, grounded: true, keys: [[0, pressLow], [30, pressTop]], feet: [[0, { R: flat, L: flat }], [30, { R: flat, L: flat }]] };

// Step Class: one foot up on the platform and back.
const stepUp = (side) => {
  const up = { y: 0.2, z: 0.3 }, rest = flat;
  const a = side === 'R' ? feet({ ...standBase, Torso: [4, 0, -3], ArmL: [-40, 0, 12], ArmR: [18, 0, -12] }, up, rest) : feet({ ...standBase, Torso: [4, 0, 3], ArmR: [-40, 0, -12], ArmL: [18, 0, 12] }, rest, up);
  const mid = side === 'R' ? feet({ ...standBase, ArmL: [-20, 0, 12] }, { y: 0.12, z: 0.16, pitch: 10 }, rest) : feet({ ...standBase, ArmR: [-20, 0, -12] }, rest, { y: 0.12, z: 0.16, pitch: 10 });
  return { name: `Step${side}`, frames: 12, keys: [[0, stand], [4, mid], [8, a], [12, a]] };
};

// Comedy and class business.
const once = (name, frames, keys, extra = {}) => ({ name, frames, keys, ...extra });
const Clips = [
  ...POSES, SquatRep, LungeRepR, LungeRepL, Press, stepUp('L'), stepUp('R'),
  once('HeaderNod', 10, [[0, stand], [3, feet({ ...standBase, Pelvis: { p: [0, -0.04, 0] }, Torso: [-12, 0, 0], Head: [-22, 0, 0] }, flat, flat)], [6, feet({ ...standBase, Pelvis: { p: [0, -0.06, 0] }, Torso: [18, 0, 0], Head: [28, 0, 0] }, flat, flat)], [10, stand]], { fast: true }),
  { name: 'Flail', frames: 16, loop: true, keys: [[0, { ...stand, Torso: [0, 0, -14], ArmR: [-150, 0, -70], ArmL: [-20, 0, 90], Head: [0, 0, 8] }], [8, { ...stand, Torso: [0, 0, 14], ArmR: [-20, 0, -90], ArmL: [-150, 0, 70], Head: [0, 0, -8] }], [16, { ...stand, Torso: [0, 0, -14], ArmR: [-150, 0, -70], ArmL: [-20, 0, 90], Head: [0, 0, 8] }]] },
  { name: 'Daze', frames: 40, loop: true, keys: [[0, { ...stand, Torso: [4, 0, -5], Head: [10, 0, -14], ArmR: [10, 0, -18], ArmL: [10, 0, 18] }], [20, { ...stand, Torso: [4, 0, 5], Head: [10, 0, 14], ArmR: [10, 0, -18], ArmL: [10, 0, 18] }], [40, { ...stand, Torso: [4, 0, -5], Head: [10, 0, -14], ArmR: [10, 0, -18], ArmL: [10, 0, 18] }]] },
  once('Bow', 36, [[0, stand], [12, feet({ ...standBase, Torso: [48, 0, 0], Head: [16, 0, 0], ArmR: [-12, 0, -6], ArmL: [-12, 0, 6] }, flat, flat)], [24, feet({ ...standBase, Torso: [48, 0, 0], Head: [16, 0, 0], ArmR: [-12, 0, -6], ArmL: [-12, 0, 6] }, flat, flat)], [36, stand]]),
  (() => { const open = { ...stand, ArmR: [-70, 0, -32], ForearmR: [-70, 30, 0], ArmL: [-70, 0, 32], ForearmL: [-70, -30, 0] }, shut = { ...stand, ArmR: [-70, 0, -12], ForearmR: [-85, 50, 0], ArmL: [-70, 0, 12], ForearmL: [-85, -50, 0] }; return { name: 'SlowClap', frames: 40, loop: true, keys: [[0, open], [30, open], [34, shut], [36, shut], [40, open]] }; })(),
  once('Sneeze', 24, [[0, stand], [10, feet({ ...standBase, Torso: [-16, 0, 0], Head: [-26, 0, 0], ArmR: [-50, 0, -10], ForearmR: [-110, 0, 0] }, flat, flat)], [13, feet({ ...standBase, Pelvis: { p: [0, -0.08, 0] }, Torso: [34, 0, 0], Head: [30, 0, 0], ArmR: [-50, 0, -10], ForearmR: [-110, 0, 0] }, flat, flat)], [24, stand]], { fast: true }),
  once('CoachPoint', 30, [[0, stand], [8, { ...stand, ArmR: [-96, 0, -24], ForearmR: [-6, 0, 0] }], [24, { ...stand, ArmR: [-96, 0, -24], ForearmR: [-6, 0, 0] }], [30, stand]]),
  hold('Tuck', feet({ Pelvis: { p: [0, -0.42, -0.08] }, Torso: [46, 0, 0], Head: [-30, 0, 0], ArmR: [-40, 0, -14], ArmL: [-40, 0, 14], ForearmR: [-60, 0, 0], ForearmL: [-60, 0, 0] }, flat, flat)),
  hold('Cannonball', { Pelvis: { p: [0, 0.2, 0] }, Torso: [38, 0, 0], Head: [10, 0, 0], ArmR: [-70, 0, -8], ForearmR: [-100, 0, 0], ArmL: [-70, 0, 8], ForearmL: [-100, 0, 0], LegR: [-115, 0, 0], ShinR: [130, 0, 0], LegL: [-115, 0, 0], ShinL: [130, 0, 0] }),
  hold('SkyFlail', { Pelvis: { p: [0, 0.1, 0] }, Torso: [-12, 0, 0], Head: [-10, 0, 0], ArmR: [-140, 0, -40], ArmL: [-140, 0, 40], LegR: [-30, 0, 0], ShinR: [40, 0, 0], LegL: [20, 0, 0], ShinL: [60, 0, 0] }),
  once('PaddleRaise', 20, [[0, stand], [8, { ...stand, ArmR: [-172, 0, -8], ForearmR: [-6, 0, 0] }], [20, { ...stand, ArmR: [-172, 0, -8], ForearmR: [-6, 0, 0] }]]),
  once('StepOn', 24, [[0, stand], [8, feet(standBase, { y: 0.32, z: 0.28 }, flat)], [14, feet({ ...standBase, Pelvis: { p: [0, 0.12, 0.1] } }, { y: 0.3, z: 0.3 }, { y: 0.1, z: 0.1 })], [24, feet({ ...standBase, Pelvis: { p: [0, 0.3, 0.2] } }, { y: 0.3, z: 0.2 }, { y: 0.3, z: 0.2 })]]),
  hold('StandOn', feet({ ...standBase, Pelvis: { p: [0, 0.3, 0] } }, { y: 0.3, z: 0 }, { y: 0.3, z: 0 })),
  hold('Balance', feet({ Pelvis: { p: [0, -0.04, 0] }, ArmR: [-4, 0, -86], ArmL: [-4, 0, 86], Head: [12, 0, 0] }, { z: 0.14 }, { z: -0.14 })),
  hold('StandTall', feet({ Pelvis: { p: [0, -0.01, 0] }, ArmR: [2, 0, -5], ArmL: [2, 0, 5], Head: [-2, 0, 0] }, flat, flat)),
  (() => { const a = feet({ ...standBase, Pelvis: { p: [0, -0.1, 0] }, ArmR: [-20, 0, -38], ForearmR: [-50, 0, 0], ArmL: [-20, 0, 38], ForearmL: [-50, 0, 0] }, { z: 0.14 }, { z: -0.14 }); return hold('HoopStance', a); })(),
  { name: 'PlankBreathe', frames: 60, loop: true, keys: [[0, POSES[5].keys[0][1]], [30, POSES[5].keys[0][1]], [60, POSES[5].keys[0][1]]] },
  gaitClip(HERO_RIG, { name: 'Jog', frames: 16, speed: 3, stance: 0.42, hip: -0.04, bob: 0.03, lift: 0.1, lean: 6, sway: 2, arms: { swing: 30, elbow: 75 } }),
];
export const GAME_CLIPS = Clips;
export const ALL_CLIPS = [...HERO_CLIPS, ...GAME_CLIPS];
export const CLIP_NAMES = ALL_CLIPS.map((c) => c.name);
export const clipIndex = Object.fromEntries(CLIP_NAMES.map((n, i) => [n, i]));
