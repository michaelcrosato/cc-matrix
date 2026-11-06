// Everything the hero rig learns here. ClipDef data, compiled once and shared between avatars.
import { gaitClip, HERO_CLIPS, HERO_RIG, mirror, placeFeet } from '../../pixel-engine.js';

const hold = (name, pose) => ({ name, frames: 60, loop: true, keys: [[0, pose], [60, pose]] });
const feet = (pose, R, L) => placeFeet(pose, HERO_RIG, { R, L });
const stand = (pose = {}) => feet({ Pelvis: { p: [0, -0.02, 0] }, ...pose }, { z: 0 }, { z: 0 });

const squatTop = { Pelvis: { p: [0, -0.02, 0] }, Torso: [2, 0, 0], ArmR: [6, 0, -9], ArmL: [6, 0, 9] };
const squatLow = { Pelvis: { p: [0, -0.3, -0.05] }, Torso: [26, 0, 0], Head: [-20, 0, 0], ArmR: [-85, 0, -8], ArmL: [-85, 0, 8] };
const lungeTop = { Pelvis: { p: [0, -0.02, 0] }, Torso: [2, 0, 0], ArmR: [0, 0, -14], ArmL: [0, 0, 14] };
const lungeLow = { Pelvis: { p: [0, -0.24, 0] }, Torso: [6, 0, 0], ArmR: [8, 0, -22], ArmL: [8, 0, 22] };
const lungeGoalsR = [{ z: 0 }, { z: 0 }];
const lungeGoalsLow = { R: { z: 0.34 }, L: { z: -0.3, pitch: 25, pivot: 'ball' } };

const pressBottom = { Pelvis: { p: [0, -0.04, 0] }, Torso: [0, 0, 0], ArmR: [-46, 0, -52], ForearmR: [-128, 0, 0], ArmL: [-46, 0, 52], ForearmL: [-128, 0, 0] };
const pressTop = { Pelvis: { p: [0, -0.01, 0] }, Torso: [-3, 0, 0], Head: [-12, 0, 0], ArmR: [-176, 0, -7], ForearmR: [-5, 0, 0], ArmL: [-176, 0, 7], ForearmL: [-5, 0, 0] };

const stepUpPose = (side) => {
  const base = { Pelvis: { p: [0, 0.04, 0] }, Torso: [4, 0, side === 'L' ? -3 : 3], ArmR: [side === 'L' ? -40 : 30, 0, -14], ForearmR: [-60, 0, 0], ArmL: [side === 'L' ? 30 : -40, 0, 14], ForearmL: [-60, 0, 0] };
  return side === 'L' ? placeFeet(base, HERO_RIG, { R: { z: 0 }, L: { z: 0.12, y: 0.22 } }) : placeFeet(base, HERO_RIG, { L: { z: 0 }, R: { z: 0.12, y: 0.22 } });
};
const stepRest = stand({ ArmR: [0, 0, -10], ForearmR: [-40, 0, 0], ArmL: [0, 0, 10], ForearmL: [-40, 0, 0] });

const nodBack = stand({ Torso: [-14, 0, 0], Head: [-34, 0, 0], ArmR: [14, 0, -24], ArmL: [14, 0, 24] });
const nodHit = stand({ Torso: [20, 0, 0], Head: [30, 0, 0], ArmR: [24, 0, -30], ArmL: [24, 0, 30] });

const flailA = stand({ Torso: [-6, 0, 8], ArmR: [-160, 0, -40], ForearmR: [-40, 0, 0], ArmL: [-30, 0, 70], ForearmL: [-30, 0, 0], Head: [-10, 0, 12] });
const flailB = stand({ Torso: [-6, 0, -8], ArmR: [-30, 0, -70], ForearmR: [-30, 0, 0], ArmL: [-160, 0, 40], ForearmL: [-40, 0, 0], Head: [-10, 0, -12] });

const clapOpen = stand({ ArmR: [-62, 0, -28], ForearmR: [-60, 0, 0], ArmL: [-62, 0, 28], ForearmL: [-60, 0, 0] });
const clapShut = stand({ ArmR: [-68, 12, -6], ForearmR: [-66, 0, 0], ArmL: [-68, -12, 6], ForearmL: [-66, 0, 0] });

const tuckCrouch = { Pelvis: { p: [0, -0.26, -0.03] }, Torso: [46, 0, 0], Head: [-34, 0, 0], ArmR: [-20, 0, -14], ForearmR: [-90, 0, 0], ArmL: [-20, 0, 14], ForearmL: [-90, 0, 0] };

const cannon = {
  Pelvis: { p: [0, 0.1, 0] }, Torso: [40, 0, 0], Head: [-20, 0, 0],
  ArmR: [-70, 0, -14], ForearmR: [-120, 0, 0], ArmL: [-70, 0, 14], ForearmL: [-120, 0, 0],
  LegR: [-118, 0, 0], ShinR: [146, 0, 0], FootR: [30, 0, 0], LegL: [-118, 0, 0], ShinL: [146, 0, 0], FootL: [30, 0, 0],
};
const flyPose = {
  Pelvis: { r: [18, 0, 0], p: [0, 0.12, 0] }, Head: [-14, 0, 0],
  ArmR: [-60, 0, -66], ArmL: [-60, 0, 66], LegR: [-12, 0, 0], ShinR: [28, 0, 0], LegL: [18, 0, 0], ShinL: [46, 0, 0],
};

export const GAME_CLIPS = [
  hold('Tree', { Pelvis: { p: [0.03, -0.02, 0] }, ArmR: [-172, 0, -6], ForearmR: [-14, 0, 0], ArmL: [-172, 0, 6], ForearmL: [-14, 0, 0], LegR: [-62, 0, -58], ShinR: [150, 0, 0], FootR: [30, 0, 0] }),
  hold('Heron', { Pelvis: { p: [0, -0.02, 0] }, Torso: [10, 0, 0], Head: [-14, 0, 0], ArmR: [-20, 0, -80], ArmL: [-20, 0, 80], ForearmR: [-30, 0, 0], ForearmL: [-30, 0, 0], LegR: [-85, 0, 0], ShinR: [95, 0, 0], FootR: [35, 0, 0] }),
  hold('Warrior', feet({ Pelvis: { p: [0, -0.2, 0] }, Torso: [0, 25, 0], Head: [0, 40, 0], ArmR: [0, 0, -90], ArmL: [0, 0, 90] }, { z: 0.38 }, { z: -0.38 })),
  hold('Chair', feet({ Pelvis: { p: [0, -0.28, -0.06] }, Torso: [24, 0, 0], Head: [-18, 0, 0], ArmR: [-110, 0, -8], ArmL: [-110, 0, 8] }, { z: 0 }, { z: 0 })),
  hold('Fold', feet({ Pelvis: { p: [0, -0.03, -0.03] }, Torso: [88, 0, 0], Head: [10, 0, 0], ArmR: [-70, 0, -6], ArmL: [-70, 0, 6], ForearmR: [-8, 0, 0], ForearmL: [-8, 0, 0] }, { z: 0 }, { z: 0 })),
  hold('Plank', { Pelvis: { r: [66, 0, 0], p: [0, -0.2, 0] }, Head: [-48, 0, 0], ArmR: [-63, 0, -5], ArmL: [-63, 0, 5], HandR: [-40, 0, 0], HandL: [-40, 0, 0], FootR: [55, 0, 0], FootL: [55, 0, 0] }),

  // Scrubbed reps: keys built with placeFeet AND a feet track, or the sole dips through the floor mid-clip.
  { name: 'SquatRep', frames: 30, grounded: true, keys: [[0, feet(squatTop, { z: 0 }, { z: 0 })], [30, feet(squatLow, { z: 0 }, { z: 0 })]], feet: [[0, { R: { z: 0 }, L: { z: 0 } }], [30, { R: { z: 0 }, L: { z: 0 } }]] },
  { name: 'LungeRep', frames: 30, grounded: true, keys: [[0, feet(lungeTop, ...lungeGoalsR)], [30, feet(lungeLow, lungeGoalsLow.R, lungeGoalsLow.L)]], feet: [[0, { R: { z: 0 }, L: { z: 0 } }], [30, lungeGoalsLow]] },
  { name: 'LungeRepL', frames: 30, grounded: true,
    keys: [[0, feet(mirror(lungeTop, HERO_RIG), ...lungeGoalsR)], [30, placeFeet(mirror(lungeLow, HERO_RIG), HERO_RIG, { L: lungeGoalsLow.R, R: lungeGoalsLow.L })]],
    feet: [[0, { R: { z: 0 }, L: { z: 0 } }], [30, { L: lungeGoalsLow.R, R: lungeGoalsLow.L }]] },
  { name: 'Press', frames: 30, grounded: true, keys: [[0, feet(pressBottom, { z: 0 }, { z: 0 })], [30, feet(pressTop, { z: 0 }, { z: 0 })]], feet: [[0, { R: { z: 0 }, L: { z: 0 } }], [30, { R: { z: 0 }, L: { z: 0 } }]] },

  { name: 'StepRest', frames: 60, loop: true, keys: [[0, stepRest], [60, stepRest]] },
  { name: 'StepL', frames: 12, keys: [[0, stepRest], [4, stepUpPose('L'), 'out'], [12, stepRest]] },
  { name: 'StepR', frames: 12, keys: [[0, stepRest], [4, stepUpPose('R'), 'out'], [12, stepRest]] },

  { name: 'HeaderNod', frames: 12, fast: true, keys: [[0, nodBack], [4, nodHit, 'out'], [12, stand()]] },
  { name: 'Flail', frames: 16, loop: true, fast: true, keys: [[0, flailA], [8, flailB], [16, flailA]] },
  { name: 'Daze', frames: 40, loop: true, keys: [[0, stand({ Torso: [4, 0, 6], Head: [14, 0, 14], ArmR: [8, 0, -18], ArmL: [8, 0, 18] })], [20, stand({ Torso: [4, 0, -6], Head: [14, 0, -14], ArmR: [8, 0, -18], ArmL: [8, 0, 18] })], [40, stand({ Torso: [4, 0, 6], Head: [14, 0, 14], ArmR: [8, 0, -18], ArmL: [8, 0, 18] })]] },
  { name: 'Bow', frames: 44, keys: [[0, stand()], [16, stand({ Torso: [52, 0, 0], Head: [12, 0, 0], ArmR: [-8, 0, -6], ArmL: [-8, 0, 6] })], [30, stand({ Torso: [52, 0, 0], Head: [12, 0, 0], ArmR: [-8, 0, -6], ArmL: [-8, 0, 6] })], [44, stand()]] },
  { name: 'SlowClap', frames: 36, loop: true, keys: [[0, clapOpen], [14, clapOpen], [18, clapShut, 'out'], [20, clapShut], [36, clapOpen]] },
  { name: 'Sneeze', frames: 26, fast: true, keys: [[0, stand()], [10, stand({ Torso: [-20, 0, 0], Head: [-34, 0, 0], ArmR: [-20, 0, -12], ArmL: [-20, 0, 12] })], [14, stand({ Torso: [38, 0, 0], Head: [30, 0, 0], ArmR: [-30, 0, -12], ArmL: [-30, 0, 12] }), 'out'], [26, stand()]] },
  hold('Point', stand({ Head: [0, 0, 0], ArmR: [-90, 0, -8], ForearmR: [-4, 0, 0], ArmL: [10, 0, 16], ForearmL: [-90, 0, 0] })),
  hold('CoachStand', stand({ Torso: [0, 0, 0], ArmR: [0, 0, -9], ForearmR: [-6, 0, 0], ArmL: [0, 0, 9], ForearmL: [-6, 0, 0] })),
  hold('Stretch', stand({ Torso: [0, 0, 22], Head: [0, 0, 10], ArmR: [-170, 0, 10], ForearmR: [-8, 0, 0], ArmL: [6, 0, 14] })),
  hold('Watch', stand({ Head: [-4, 0, 0], ArmR: [10, 0, -22], ForearmR: [-100, 0, 0], ArmL: [10, 0, 22], ForearmL: [-100, 0, 0] })),
  hold('TuckHold', feet(tuckCrouch, { z: 0.06 }, { z: -0.06 })),
  hold('Cannonball', cannon),
  hold('Fly', flyPose),
  { name: 'PaddleUp', frames: 16, keys: [[0, stand({ ArmR: [-60, 0, -8], ForearmR: [-60, 0, 0] })], [8, stand({ ArmR: [-176, 0, -10], ForearmR: [-6, 0, 0] }), 'out'], [16, stand({ ArmR: [-176, 0, -10], ForearmR: [-6, 0, 0] })]] },
  { name: 'StepOn', frames: 24, keys: [[0, stand()], [10, placeFeet({ Pelvis: { p: [0, 0.14, 0] }, Torso: [10, 0, 0], ArmR: [-20, 0, -30], ArmL: [-20, 0, 30] }, HERO_RIG, { L: { z: 0 }, R: { z: 0.24, y: 0.36 } })], [24, stand()]] },
  { name: 'HopDown', frames: 20, keys: [[0, stand()], [8, stand({ Pelvis: { p: [0, -0.2, 0] }, Torso: [18, 0, 0], ArmR: [20, 0, -20], ArmL: [20, 0, 20] })], [20, stand()]] },
  { name: 'Slump', frames: 40, loop: true, keys: [[0, stand({ Torso: [22, 0, 0], Head: [20, 0, 0], ArmR: [-6, 0, -4], ArmL: [-6, 0, 4] })], [20, stand({ Torso: [26, 0, 0], Head: [24, 0, 0], ArmR: [-6, 0, -4], ArmL: [-6, 0, 4] })], [40, stand({ Torso: [22, 0, 0], Head: [20, 0, 0], ArmR: [-6, 0, -4], ArmL: [-6, 0, 4] })]] },
  { name: 'ArmsOut', frames: 60, loop: true, keys: [[0, stand({ ArmR: [0, 0, -86], ArmL: [0, 0, 86] })], [30, stand({ ArmR: [0, 0, -78], ArmL: [0, 0, 94] })], [60, stand({ ArmR: [0, 0, -86], ArmL: [0, 0, 86] })]] },

  gaitClip(HERO_RIG, { name: 'Jog', frames: 16, speed: 3, stance: 0.42, hip: -0.04, bob: 0.03, lift: 0.1, lean: 6, sway: 2, arms: { swing: 30, elbow: 75 } }),
  gaitClip(HERO_RIG, { name: 'SlackWalk', frames: 28, speed: 1.1, stance: 0.62, hip: -0.05, bob: 0.015, lift: 0.08, lean: 3, sway: 5, tiptoe: 12, pose: { ArmR: [0, 0, -84], ArmL: [0, 0, 84] } }),
  gaitClip(HERO_RIG, { name: 'TuckRun', frames: 12, speed: 8, stance: 0.34, hip: -0.14, bob: 0.03, lift: 0.14, lean: 34, arms: { swing: 42, elbow: 92 } }),
];

export const ALL_CLIPS = [...HERO_CLIPS, ...GAME_CLIPS];
export const CLIP_NAMES = ALL_CLIPS.map((c) => c.name);
/** Clips worth listing in the Dev Tools animation viewer. */
export const VIEWER_CLIPS = GAME_CLIPS.map((c) => c.name).concat(['Idle', 'Walk', 'Run', 'Sit', 'LieIdle', 'Wave', 'Victory', 'Teeter', 'Hurt', 'Fall', 'GetUp', 'Tiptoe', 'StepUp', 'StepDown']);
