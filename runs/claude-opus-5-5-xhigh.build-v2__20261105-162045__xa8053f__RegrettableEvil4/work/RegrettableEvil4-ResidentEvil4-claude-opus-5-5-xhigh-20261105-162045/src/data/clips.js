// New animation clips as data. Rotations are Euler degrees relative to rest (see HERO_RIG):
// Pelvis +X tips forward, +Y turns left, +Z rolls right; Arm X -90 is straight ahead, -180 overhead;
// ArmR -Z and ArmL +Z spread outward; Forearm -X bends the elbow; Leg -X swings forward; Shin +X bends the knee.
import { gaitClip, HERO_RIG, HERO_CLIPS } from '../../pixel-engine.js';

const clip = (name, frames, keys, o = {}) => ({ name, frames, keys, ...o });
const sq = (x, y, z, px = 0, py = 0, pz = 0) => ({ r: [x, y, z], p: [px, py, pz], s: 1 });

// A neutral standing stance, for the feet of upper-body clips.
const STAND = { Pelvis: sq(0, 0, 0), LegR: [0, 0, -3], ShinR: [4, 0, 0], FootR: [-2, 0, 0], LegL: [0, 0, 3], ShinL: [4, 0, 0], FootL: [-2, 0, 0] };
const BRACE = { Pelvis: sq(0, 0, 0, 0, -0.03, 0), LegR: [-14, 0, -5], ShinR: [20, 0, 0], FootR: [-6, 0, 0], LegL: [12, 0, 5], ShinL: [14, 0, 0], FootL: [-12, 0, 0] };

const AIM_PISTOL = { ...BRACE, Torso: [2, -12, 0], Head: [0, 10, 0], ArmR: [-88, -4, -4], ForearmR: [-3, 0, 0], HandR: [0, 0, 0], ArmL: [-72, 26, 28], ForearmL: [-34, 0, 0], HandL: [0, 0, 0] };
const AIM_LONG = { ...BRACE, Torso: [4, -22, 0], Head: [0, 20, 0], ArmR: [-62, 8, -14], ForearmR: [-62, 0, 0], HandR: [0, 0, 0], ArmL: [-82, 24, 18], ForearmL: [-14, 0, 0], HandL: [0, 0, 0] };

export const CLIP_DEFS = [
  // ---- Max ----
  clip('AimPistol', 40, [[0, AIM_PISTOL], [20, { ...AIM_PISTOL, Torso: [3, -12, 0] }], [40, AIM_PISTOL]], { loop: true }),
  clip('AimLong', 40, [[0, AIM_LONG], [20, { ...AIM_LONG, Torso: [5, -22, 0] }], [40, AIM_LONG]], { loop: true }),
  clip('FirePistol', 6, [[0, { ...AIM_PISTOL, ArmR: [-104, -4, -4], ForearmR: [-14, 0, 0], Torso: [-2, -12, 0] }], [6, AIM_PISTOL]], { fast: true }),
  clip('FireLong', 10, [[0, { ...AIM_LONG, ArmR: [-54, 8, -14], ArmL: [-92, 24, 18], Torso: [-6, -24, 0] }], [10, AIM_LONG]], { fast: true }),
  clip('ReloadPistol', 40, [
    [0, { ...STAND, Torso: [6, -6, 0], ArmR: [-52, 0, -8], ForearmR: [-68, 0, 0], ArmL: [-30, 20, 8], ForearmL: [-80, 0, 0], Head: [18, 8, 0] }],
    [12, { ...STAND, Torso: [8, -6, 0], ArmR: [-58, 0, -8], ForearmR: [-74, 0, 0], ArmL: [10, 0, 14], ForearmL: [-20, 0, 0], Head: [22, 4, 0] }],
    [24, { ...STAND, Torso: [8, -6, 0], ArmR: [-58, 0, -8], ForearmR: [-74, 0, 0], ArmL: [-44, 26, 12], ForearmL: [-92, 0, 0], Head: [22, 6, 0] }],
    [34, { ...STAND, Torso: [4, -6, 0], ArmR: [-74, 0, -6], ForearmR: [-30, 0, 0], ArmL: [-52, 26, 18], ForearmL: [-62, 0, 0], Head: [10, 6, 0] }],
    [40, { ...STAND, Torso: [2, -8, 0], ArmR: [-80, 0, -4], ForearmR: [-12, 0, 0], ArmL: [-60, 26, 22], ForearmL: [-44, 0, 0] }],
  ]),
  clip('ReloadPump', 42, [
    [0, { ...STAND, Torso: [5, -18, 0], ArmR: [-30, 0, -12], ForearmR: [-70, 0, 0], ArmL: [-70, 20, 10], ForearmL: [-40, 0, 0], Head: [14, 12, 0] }],
    [12, { ...STAND, Torso: [8, -18, 0], ArmR: [-30, 0, -12], ForearmR: [-70, 0, 0], ArmL: [-30, 10, 18], ForearmL: [-95, 0, 0], Head: [18, 10, 0] }],
    [24, { ...STAND, Torso: [8, -18, 0], ArmR: [-30, 0, -12], ForearmR: [-70, 0, 0], ArmL: [-62, 24, 10], ForearmL: [-60, 0, 0], Head: [18, 10, 0] }],
    [32, { ...STAND, Torso: [4, -18, 0], ArmR: [-40, 0, -12], ForearmR: [-70, 0, 0], ArmL: [-80, 22, 16], ForearmL: [-20, 0, 0] }],
    [37, { ...STAND, Torso: [4, -18, 0], ArmR: [-40, 0, -12], ForearmR: [-70, 0, 0], ArmL: [-62, 22, 16], ForearmL: [-50, 0, 0] }],
    [42, { ...STAND, Torso: [2, -18, 0], ArmR: [-50, 0, -12], ForearmR: [-66, 0, 0], ArmL: [-78, 22, 18], ForearmL: [-22, 0, 0] }],
  ]),
  clip('ReloadBolt', 40, [
    [0, { ...STAND, Torso: [4, -20, 0], ArmR: [-50, 8, -14], ForearmR: [-90, 0, 0], ArmL: [-82, 24, 18], ForearmL: [-14, 0, 0] }],
    [10, { ...STAND, Torso: [6, -20, 0], ArmR: [-74, 8, -8], ForearmR: [-74, 0, 0], ArmL: [-82, 24, 18], ForearmL: [-14, 0, 0], Head: [10, 16, 0] }],
    [20, { ...STAND, Torso: [6, -20, 0], ArmR: [-40, 8, -14], ForearmR: [-110, 0, 0], ArmL: [-82, 24, 18], ForearmL: [-14, 0, 0], Head: [10, 16, 0] }],
    [30, { ...STAND, Torso: [6, -20, 0], ArmR: [-74, 8, -8], ForearmR: [-74, 0, 0], ArmL: [-82, 24, 18], ForearmL: [-14, 0, 0], Head: [10, 16, 0] }],
    [40, { ...STAND, Torso: [4, -22, 0], ArmR: [-62, 8, -14], ForearmR: [-62, 0, 0], ArmL: [-82, 24, 18], ForearmL: [-14, 0, 0] }],
  ]),
  clip('Roundhouse', 20, [
    [0, { Pelvis: sq(0, 0, 0, 0, -0.05, 0), Torso: [6, 0, 0], ArmR: [-20, 0, -30], ForearmR: [-80, 0, 0], ArmL: [-40, 0, 30], ForearmL: [-90, 0, 0], LegR: [-10, 0, -4], ShinR: [24, 0, 0], LegL: [8, 0, 4], ShinL: [24, 0, 0] }],
    [4, { Pelvis: sq(0, -90, 8, 0, -0.04, 0), Torso: [2, 10, 0], ArmR: [10, 0, -60], ForearmR: [-40, 0, 0], ArmL: [-60, 0, 60], ForearmL: [-40, 0, 0], LegR: [-30, 0, -14], ShinR: [50, 0, 0], LegL: [0, 0, 4], ShinL: [12, 0, 0] }],
    [9, { Pelvis: sq(0, -220, 18, 0, 0.02, 0), Torso: [-8, 20, 0], ArmR: [20, 0, -70], ForearmR: [-20, 0, 0], ArmL: [-40, 0, 70], ForearmL: [-20, 0, 0], LegR: [-96, 0, -24], ShinR: [6, 0, 0], FootR: [-20, 0, 0], LegL: [0, 0, 4], ShinL: [6, 0, 0] }],
    [13, { Pelvis: sq(0, -310, 10, 0, 0, 0), Torso: [-2, 12, 0], ArmR: [0, 0, -50], ForearmR: [-50, 0, 0], ArmL: [-50, 0, 50], ForearmL: [-50, 0, 0], LegR: [-60, 0, -18], ShinR: [60, 0, 0], LegL: [0, 0, 4], ShinL: [14, 0, 0] }],
    [20, { Pelvis: sq(0, -360, 0, 0, -0.03, 0), Torso: [4, 0, 0], ArmR: [-30, 0, -20], ForearmR: [-70, 0, 0], ArmL: [-40, 0, 20], ForearmL: [-70, 0, 0], LegR: [-10, 0, -4], ShinR: [20, 0, 0], LegL: [8, 0, 4], ShinL: [20, 0, 0] }],
  ], { fast: true }),
  clip('HipThrow', 28, [
    [0, { Pelvis: sq(0, 0, 0, 0, -0.04, 0), Torso: [10, 0, 0], ArmR: [-80, 0, -6], ForearmR: [-50, 0, 0], ArmL: [-80, 0, 6], ForearmL: [-50, 0, 0], LegR: [-12, 0, 0], ShinR: [20, 0, 0], LegL: [10, 0, 0], ShinL: [16, 0, 0] }],
    [8, { Pelvis: sq(14, -80, 0, 0, -0.18, 0), Torso: [30, 0, 0], ArmR: [-100, 0, 0], ForearmR: [-90, 0, 0], ArmL: [-120, 0, 0], ForearmL: [-60, 0, 0], LegR: [-46, 0, 0], ShinR: [60, 0, 0], LegL: [-30, 0, 0], ShinL: [50, 0, 0] }],
    [16, { Pelvis: sq(40, -150, 0, 0, -0.12, 0), Torso: [40, 0, 0], ArmR: [-60, 0, 0], ForearmR: [-30, 0, 0], ArmL: [-40, 0, 0], ForearmL: [-40, 0, 0], LegR: [-60, 0, 0], ShinR: [70, 0, 0], LegL: [-30, 0, 0], ShinL: [40, 0, 0] }],
    [28, { Pelvis: sq(0, -360, 0), Torso: [4, 0, 0], ArmR: [-20, 0, -8], ForearmR: [-30, 0, 0], ArmL: [-20, 0, 8], ForearmL: [-30, 0, 0], LegR: [0, 0, -3], ShinR: [6, 0, 0], LegL: [0, 0, 3], ShinL: [6, 0, 0] }],
  ], { fast: true }),
  clip('KnifeSlash', 12, [
    [0, { ...BRACE, Torso: [6, 34, 0], ArmR: [-90, 0, -60], ForearmR: [-40, 0, 0], ArmL: [-30, 0, 20], ForearmL: [-60, 0, 0] }],
    [4, { ...BRACE, Torso: [10, -32, 0], ArmR: [-100, 0, 24], ForearmR: [-6, 0, 0], ArmL: [-20, 0, 20], ForearmL: [-60, 0, 0] }],
    [12, { ...STAND, Torso: [4, -10, 0], ArmR: [-50, 0, -10], ForearmR: [-40, 0, 0], ArmL: [-20, 0, 12], ForearmL: [-40, 0, 0] }],
  ], { fast: true }),
  clip('DoorKick', 12, [
    [0, { Pelvis: sq(-4, 0, 0, 0, 0, 0), Torso: [-6, 0, 0], ArmR: [-30, 0, -30], ForearmR: [-70, 0, 0], ArmL: [-30, 0, 30], ForearmL: [-70, 0, 0], LegR: [-60, 0, 0], ShinR: [90, 0, 0], LegL: [4, 0, 0], ShinL: [8, 0, 0] }],
    [4, { Pelvis: sq(-18, 0, 0, 0, 0.02, 0), Torso: [-12, 0, 0], ArmR: [20, 0, -30], ForearmR: [-40, 0, 0], ArmL: [20, 0, 30], ForearmL: [-40, 0, 0], LegR: [-90, 0, 0], ShinR: [6, 0, 0], FootR: [-20, 0, 0], LegL: [8, 0, 0], ShinL: [4, 0, 0] }],
    [12, { Pelvis: sq(0, 0, 0), Torso: [2, 0, 0], ArmR: [-10, 0, -10], ForearmR: [-30, 0, 0], ArmL: [-10, 0, 10], ForearmL: [-30, 0, 0], LegR: [-10, 0, 0], ShinR: [14, 0, 0], LegL: [0, 0, 0], ShinL: [4, 0, 0] }],
  ], { fast: true }),
  clip('Vault', 21, [
    [0, { Pelvis: sq(10, 0, 0, 0, -0.04, 0), Torso: [20, 0, 0], ArmR: [-90, 0, -8], ForearmR: [-16, 0, 0], ArmL: [-90, 0, 8], ForearmL: [-16, 0, 0], LegR: [-30, 0, 0], ShinR: [50, 0, 0], LegL: [10, 0, 0], ShinL: [30, 0, 0] }],
    [7, { Pelvis: sq(24, -30, 30, 0, 0.5, 0), Torso: [24, 0, 0], ArmR: [-60, 0, -8], ForearmR: [-4, 0, 0], ArmL: [-60, 0, 8], ForearmL: [-4, 0, 0], LegR: [-70, 0, -30], ShinR: [50, 0, 0], LegL: [-70, 0, 30], ShinL: [60, 0, 0] }],
    [14, { Pelvis: sq(10, -40, 30, 0, 0.4, 0), Torso: [4, 0, 0], ArmR: [-20, 0, -20], ForearmR: [-20, 0, 0], ArmL: [-20, 0, 20], ForearmL: [-20, 0, 0], LegR: [-60, 0, -10], ShinR: [30, 0, 0], LegL: [-50, 0, 10], ShinL: [40, 0, 0] }],
    [21, { Pelvis: sq(0, 0, 0, 0, -0.14, 0), Torso: [18, 0, 0], ArmR: [-30, 0, -14], ForearmR: [-30, 0, 0], ArmL: [-30, 0, 14], ForearmL: [-30, 0, 0], LegR: [-36, 0, 0], ShinR: [66, 0, 0], FootR: [-20, 0, 0], LegL: [-24, 0, 0], ShinL: [60, 0, 0], FootL: [-20, 0, 0] }],
  ], { fast: true }),
  clip('LadderUp', 18, [
    [0, { Pelvis: sq(0, 0, 0), Torso: [6, 0, 0], ArmR: [-170, 0, -6], ForearmR: [-16, 0, 0], ArmL: [-120, 0, 6], ForearmL: [-60, 0, 0], LegR: [-60, 0, 0], ShinR: [80, 0, 0], FootR: [-10, 0, 0], LegL: [-14, 0, 0], ShinL: [22, 0, 0] }],
    [9, { Pelvis: sq(0, 0, 0), Torso: [6, 0, 0], ArmR: [-120, 0, -6], ForearmR: [-60, 0, 0], ArmL: [-170, 0, 6], ForearmL: [-16, 0, 0], LegR: [-14, 0, 0], ShinR: [22, 0, 0], LegL: [-60, 0, 0], ShinL: [80, 0, 0], FootL: [-10, 0, 0] }],
    [18, { Pelvis: sq(0, 0, 0), Torso: [6, 0, 0], ArmR: [-170, 0, -6], ForearmR: [-16, 0, 0], ArmL: [-120, 0, 6], ForearmL: [-60, 0, 0], LegR: [-60, 0, 0], ShinR: [80, 0, 0], FootR: [-10, 0, 0], LegL: [-14, 0, 0], ShinL: [22, 0, 0] }],
  ], { loop: true }),
  clip('QuickTurn', 9, [
    [0, { Pelvis: sq(0, 0, 0, 0, -0.08, 0), Torso: [8, 0, 0], ArmR: [10, 0, -20], ForearmR: [-40, 0, 0], ArmL: [10, 0, 20], ForearmL: [-40, 0, 0], LegR: [-20, 0, -8], ShinR: [34, 0, 0], LegL: [10, 0, 8], ShinL: [34, 0, 0] }],
    [9, { Pelvis: sq(0, 0, 0), Torso: [2, 0, 0], ArmR: [0, 0, -6], ForearmR: [-14, 0, 0], ArmL: [0, 0, 6], ForearmL: [-14, 0, 0], LegR: [0, 0, -3], ShinR: [4, 0, 0], LegL: [0, 0, 3], ShinL: [4, 0, 0] }],
  ], { fast: true }),
  clip('Throw', 16, [
    [0, { ...STAND, Torso: [-10, 24, 0], ArmR: [-160, 0, -24], ForearmR: [-70, 0, 0], ArmL: [-60, 0, 20], ForearmL: [-30, 0, 0] }],
    [6, { ...BRACE, Torso: [18, -14, 0], ArmR: [-70, 0, -12], ForearmR: [-6, 0, 0], ArmL: [-10, 0, 20], ForearmL: [-40, 0, 0] }],
    [16, { ...STAND, Torso: [3, 0, 0], ArmR: [-20, 0, -10], ForearmR: [-30, 0, 0], ArmL: [-10, 0, 10], ForearmL: [-30, 0, 0] }],
  ], { fast: true }),
  clip('Boost', 30, [
    [0, { Pelvis: sq(0, 0, 0, 0, -0.26, 0), Torso: [24, 0, 0], Head: [-20, 0, 0], ArmR: [-50, 16, -10], ForearmR: [-70, 0, 0], ArmL: [-50, -16, 10], ForearmL: [-70, 0, 0], LegR: [-62, 0, -8], ShinR: [96, 0, 0], FootR: [-34, 0, 0], LegL: [-20, 0, 8], ShinL: [60, 0, 0], FootL: [-40, 0, 0] }],
    [14, { Pelvis: sq(0, 0, 0, 0, -0.1, 0), Torso: [8, 0, 0], Head: [-34, 0, 0], ArmR: [-150, 10, -6], ForearmR: [-20, 0, 0], ArmL: [-150, -10, 6], ForearmL: [-20, 0, 0], LegR: [-30, 0, -6], ShinR: [50, 0, 0], FootR: [-20, 0, 0], LegL: [-10, 0, 6], ShinL: [30, 0, 0], FootL: [-20, 0, 0] }],
    [30, { Pelvis: sq(0, 0, 0), Torso: [2, 0, 0], Head: [-20, 0, 0], ArmR: [-170, 6, -4], ForearmR: [-6, 0, 0], ArmL: [-170, -6, 4], ForearmL: [-6, 0, 0], LegR: [0, 0, -3], ShinR: [4, 0, 0], LegL: [0, 0, 3], ShinL: [4, 0, 0] }],
  ]),
  clip('Stagger', 18, [
    [0, { Pelvis: sq(-10, 0, 4, 0, -0.03, -0.04), Torso: [-16, -10, 0], Head: [-14, 0, 0], ArmR: [-30, 0, -40], ForearmR: [-40, 0, 0], ArmL: [-30, 0, 40], ForearmL: [-40, 0, 0], LegR: [-20, 0, -4], ShinR: [20, 0, 0], LegL: [14, 0, 4], ShinL: [20, 0, 0] }],
    [18, { Pelvis: sq(0, 0, 0), Torso: [2, 0, 0], Head: [4, 0, 0], ArmR: [-4, 0, -8], ForearmR: [-20, 0, 0], ArmL: [-4, 0, 8], ForearmL: [-20, 0, 0], LegR: [0, 0, -3], ShinR: [4, 0, 0], LegL: [0, 0, 3], ShinL: [4, 0, 0] }],
  ], { fast: true }),
  clip('KnockedDown', 24, [
    [0, { Pelvis: sq(-20, 0, 0, 0, -0.04, 0), Torso: [-20, 0, 0], ArmR: [-60, 0, -50], ForearmR: [-40, 0, 0], ArmL: [-60, 0, 50], ForearmL: [-40, 0, 0], LegR: [-30, 0, 0], ShinR: [30, 0, 0], LegL: [-20, 0, 0], ShinL: [20, 0, 0] }],
    [10, { Pelvis: sq(-60, 0, 0, 0, -0.34, -0.18), Torso: [-16, 0, 0], ArmR: [-110, 0, -60], ForearmR: [-30, 0, 0], ArmL: [-110, 0, 60], ForearmL: [-30, 0, 0], LegR: [-50, 0, 0], ShinR: [50, 0, 0], LegL: [-40, 0, 0], ShinL: [40, 0, 0] }],
    [24, { Pelvis: sq(-88, 0, 0, 0, -0.5, -0.32), Torso: [-2, 0, 0], Head: [-8, 0, 0], ArmR: [-160, 0, -30], ForearmR: [-10, 0, 0], ArmL: [-160, 0, 30], ForearmL: [-10, 0, 0], LegR: [-20, 0, -6], ShinR: [24, 0, 0], LegL: [-8, 0, 6], ShinL: [10, 0, 0] }],
  ], { fast: true }),
  clip('StampForm', 24, [
    [0, { ...STAND, Torso: [-6, 0, 0], ArmR: [-170, 0, -6], ForearmR: [-40, 0, 0], ArmL: [-50, 0, 10], ForearmL: [-70, 0, 0], Head: [10, 0, 0] }],
    [10, { ...STAND, Torso: [-10, 0, 0], ArmR: [-190, 0, -6], ForearmR: [-20, 0, 0], ArmL: [-50, 0, 10], ForearmL: [-70, 0, 0], Head: [14, 0, 0] }],
    [14, { ...BRACE, Torso: [34, 0, 0], ArmR: [-80, 0, -6], ForearmR: [-6, 0, 0], ArmL: [-50, 0, 10], ForearmL: [-70, 0, 0], Head: [34, 0, 0] }],
    [24, { ...BRACE, Torso: [30, 0, 0], ArmR: [-82, 0, -6], ForearmR: [-6, 0, 0], ArmL: [-40, 0, 10], ForearmL: [-60, 0, 0], Head: [26, 0, 0] }],
  ], { fast: true }),

  // ---- Islanders ----
  gaitClip(HERO_RIG, { name: 'Shamble', frames: 40, speed: 1.1, stance: 0.62, hip: -0.05, bob: 0.02, lift: 0.04, lean: 16, sway: 7, head: 8, arms: { swing: 8, elbow: 30 } }),
  gaitClip(HERO_RIG, { name: 'Lurch', frames: 22, speed: 2.8, stance: 0.42, hip: -0.06, bob: 0.03, lift: 0.1, lean: 24, sway: 10, head: -4, arms: { swing: 30, elbow: 70 } }),
  gaitClip(HERO_RIG, { name: 'WalkToSea', frames: 56, speed: 0.9, stance: 0.66, hip: -0.02, bob: 0.012, lift: 0.03, lean: 4, sway: 2, head: 22, arms: { swing: 2, elbow: 6 } }),
  gaitClip(HERO_RIG, { name: 'Wade', frames: 60, speed: 0.6, stance: 0.7, hip: -0.1, bob: 0.015, lift: 0.08, lean: 8, sway: 5, head: 18, arms: { swing: 4, elbow: 12 } }),
  gaitClip(HERO_RIG, { name: 'ShieldWalk', frames: 40, speed: 1.3, stance: 0.6, hip: -0.05, bob: 0.015, lift: 0.05, lean: 10, sway: 3, head: 2, arms: { swing: 2, elbow: 50 }, extra: (u, pose) => { pose.ArmL = [-70, 20, 20]; pose.ForearmL = [-60, 0, 0]; } }),
  gaitClip(HERO_RIG, { name: 'KnightWalk', frames: 48, speed: 0.9, stance: 0.66, hip: -0.07, bob: 0.03, lift: 0.05, lean: 8, sway: 8, head: 0, arms: { swing: 3, elbow: 30 } }),
  gaitClip(HERO_RIG, { name: 'CarrierWalk', frames: 44, speed: 1.6, stance: 0.58, hip: -0.08, bob: 0.03, lift: 0.05, lean: 22, sway: 6, head: -10, arms: { swing: 2, elbow: 70 }, extra: (u, pose) => { pose.ArmL = [-140, 0, 16]; pose.ForearmL = [-70, 0, 0]; pose.ArmR = [-40, 0, -10]; } }),
  gaitClip(HERO_RIG, { name: 'DameWalk', frames: 20, speed: 2.6, stance: 0.58, hip: 0, bob: 0.02, lift: 0.04, lean: 4, sway: 8, head: -4, arms: { swing: 3, elbow: 20 }, extra: (u, pose) => { pose.ArmR = [-22 + Math.sin(u * 6.283) * 18, 0, -8]; pose.ForearmL = [-90, 0, 0]; pose.ArmL = [-14, 0, 8]; } }),
  gaitClip(HERO_RIG, { name: 'DameRun', frames: 14, speed: 3.8, stance: 0.46, hip: -0.02, bob: 0.03, lift: 0.07, lean: 12, sway: 8, head: -6, arms: { swing: 14, elbow: 40 }, extra: (u, pose) => { pose.ForearmL = [-90, 0, 0]; pose.ArmL = [-20, 0, 12]; } }),
  gaitClip(HERO_RIG, { name: 'SawWalk', frames: 36, speed: 2.2, stance: 0.54, hip: -0.1, bob: 0.03, lift: 0.06, lean: 18, sway: 7, head: -8, arms: { swing: 0, elbow: 30 }, extra: (u, pose) => { pose.ArmR = [-74, 10, -8]; pose.ForearmR = [-40, 0, 0]; pose.ArmL = [-64, -12, 20]; pose.ForearmL = [-60, 0, 0]; } }),
  gaitClip(HERO_RIG, { name: 'BosunDrag', frames: 60, speed: 1.4, stance: 0.62, hip: -0.1, bob: 0.03, lift: 0.05, lean: 26, sway: 12, head: -18, arms: { swing: 6, elbow: 14 }, extra: (u, pose) => { pose.ArmR = [-14, 0, -16]; pose.ForearmR = [-6, 0, 0]; } }),
  gaitClip(HERO_RIG, { name: 'BathyWalk', frames: 48, speed: 1.4, stance: 0.62, hip: -0.05, bob: 0.05, lift: 0.1, lean: 0, sway: 9, head: 0, arms: { swing: 12, elbow: 40 } }),
  gaitClip(HERO_RIG, { name: 'BathyCharge', frames: 20, speed: 6, stance: 0.4, hip: -0.08, bob: 0.05, lift: 0.16, lean: 18, sway: 12, head: 0, arms: { swing: 30, elbow: 60 } }),

  clip('WorkChop', 40, [
    [0, { ...STAND, Torso: [14, 0, 0], ArmR: [-140, 0, -8], ForearmR: [-50, 0, 0], ArmL: [-40, 0, 10], ForearmL: [-40, 0, 0], Head: [14, 0, 0] }],
    [24, { ...STAND, Torso: [14, 0, 0], ArmR: [-140, 0, -8], ForearmR: [-50, 0, 0], ArmL: [-40, 0, 10], ForearmL: [-40, 0, 0], Head: [14, 0, 0] }],
    [30, { ...STAND, Torso: [28, 0, 0], ArmR: [-64, 0, -8], ForearmR: [-14, 0, 0], ArmL: [-40, 0, 10], ForearmL: [-40, 0, 0], Head: [24, 0, 0] }],
    [40, { ...STAND, Torso: [14, 0, 0], ArmR: [-140, 0, -8], ForearmR: [-50, 0, 0], ArmL: [-40, 0, 10], ForearmL: [-40, 0, 0], Head: [14, 0, 0] }],
  ], { loop: true }),
  clip('WorkMend', 44, [
    [0, { Pelvis: sq(0, 0, 0, 0, -0.26, 0), Torso: [16, 0, 0], Head: [26, 0, 0], ArmR: [-54, 14, -6], ForearmR: [-70, 0, 0], ArmL: [-54, -14, 6], ForearmL: [-70, 0, 0], LegR: [-74, 0, -6], ShinR: [80, 0, 0], FootR: [-6, 0, 0], LegL: [-74, 0, 6], ShinL: [80, 0, 0], FootL: [-6, 0, 0] }],
    [22, { Pelvis: sq(0, 0, 0, 0, -0.26, 0), Torso: [18, 0, 0], Head: [28, -4, 0], ArmR: [-62, 14, -6], ForearmR: [-50, 0, 0], ArmL: [-48, -14, 6], ForearmL: [-84, 0, 0], LegR: [-74, 0, -6], ShinR: [80, 0, 0], FootR: [-6, 0, 0], LegL: [-74, 0, 6], ShinL: [80, 0, 0], FootL: [-6, 0, 0] }],
    [44, { Pelvis: sq(0, 0, 0, 0, -0.26, 0), Torso: [16, 0, 0], Head: [26, 0, 0], ArmR: [-54, 14, -6], ForearmR: [-70, 0, 0], ArmL: [-54, -14, 6], ForearmL: [-70, 0, 0], LegR: [-74, 0, -6], ShinR: [80, 0, 0], FootR: [-6, 0, 0], LegL: [-74, 0, 6], ShinL: [80, 0, 0], FootL: [-6, 0, 0] }],
  ], { loop: true }),
  clip('RaiseTool', 21, [
    [0, { ...BRACE, Torso: [10, 0, 0], ArmR: [-40, 0, -10], ForearmR: [-60, 0, 0], ArmL: [-20, 0, 14], ForearmL: [-40, 0, 0] }],
    [21, { ...BRACE, Torso: [-14, 14, 0], Head: [-4, -8, 0], ArmR: [-170, 0, -16], ForearmR: [-56, 0, 0], ArmL: [-50, 0, 26], ForearmL: [-40, 0, 0] }],
  ]),
  clip('Swing', 12, [
    [0, { ...BRACE, Torso: [-14, 14, 0], ArmR: [-170, 0, -16], ForearmR: [-56, 0, 0], ArmL: [-50, 0, 26], ForearmL: [-40, 0, 0] }],
    [4, { ...BRACE, Torso: [32, -12, 0], Head: [10, 0, 0], ArmR: [-62, 0, -4], ForearmR: [-8, 0, 0], ArmL: [-10, 0, 26], ForearmL: [-30, 0, 0] }],
    [12, { ...BRACE, Torso: [18, -4, 0], Head: [8, 0, 0], ArmR: [-40, 0, -6], ForearmR: [-30, 0, 0], ArmL: [-10, 0, 20], ForearmL: [-30, 0, 0] }],
  ], { fast: true }),
  clip('ThrowOverhand', 24, [
    [0, { ...STAND, Torso: [-6, 16, 0], ArmR: [-170, 0, -20], ForearmR: [-60, 0, 0], ArmL: [-70, 0, 20], ForearmL: [-20, 0, 0] }],
    [14, { ...STAND, Torso: [-14, 26, 0], ArmR: [-190, 0, -26], ForearmR: [-80, 0, 0], ArmL: [-80, 0, 26], ForearmL: [-10, 0, 0] }],
    [18, { ...BRACE, Torso: [22, -16, 0], ArmR: [-70, 0, -8], ForearmR: [-6, 0, 0], ArmL: [-10, 0, 20], ForearmL: [-30, 0, 0] }],
    [24, { ...STAND, Torso: [8, -4, 0], ArmR: [-30, 0, -8], ForearmR: [-30, 0, 0], ArmL: [-10, 0, 16], ForearmL: [-30, 0, 0] }],
  ], { fast: true }),
  clip('StunHands', 45, [
    [0, { ...STAND, Pelvis: sq(4, 0, 4, 0, -0.04, 0), Torso: [18, 10, 6], Head: [18, 10, 8], ArmR: [-96, 20, -8], ForearmR: [-120, 0, 0], ArmL: [-96, -20, 8], ForearmL: [-120, 0, 0], LegR: [-8, 0, -6], ShinR: [18, 0, 0], LegL: [12, 0, 6], ShinL: [18, 0, 0] }],
    [22, { ...STAND, Pelvis: sq(6, 0, -5, 0, -0.06, 0), Torso: [24, -10, -6], Head: [22, -10, -8], ArmR: [-100, 20, -8], ForearmR: [-124, 0, 0], ArmL: [-100, -20, 8], ForearmL: [-124, 0, 0], LegR: [10, 0, -6], ShinR: [20, 0, 0], LegL: [-8, 0, 6], ShinL: [20, 0, 0] }],
    [45, { ...STAND, Pelvis: sq(4, 0, 4, 0, -0.04, 0), Torso: [18, 10, 6], Head: [18, 10, 8], ArmR: [-96, 20, -8], ForearmR: [-120, 0, 0], ArmL: [-96, -20, 8], ForearmL: [-120, 0, 0], LegR: [-8, 0, -6], ShinR: [18, 0, 0], LegL: [12, 0, 6], ShinL: [18, 0, 0] }],
  ], { loop: true }),
  clip('KneelHit', 16, [
    [0, { Pelvis: sq(8, 0, 6, 0, -0.1, 0), Torso: [20, 0, 0], Head: [16, 0, 0], ArmR: [-20, 0, -30], ForearmR: [-30, 0, 0], ArmL: [-20, 0, 30], ForearmL: [-30, 0, 0], LegR: [-20, 0, -4], ShinR: [50, 0, 0], FootR: [-20, 0, 0], LegL: [-10, 0, 4], ShinL: [40, 0, 0], FootL: [-20, 0, 0] }],
    [16, { Pelvis: sq(12, 0, 6, 0, -0.36, 0), Torso: [26, 0, 4], Head: [24, 0, 0], ArmR: [-40, 0, -14], ForearmR: [-60, 0, 0], ArmL: [-56, 0, 14], ForearmL: [-80, 0, 0], LegR: [-80, 0, -4], ShinR: [120, 0, 0], FootR: [-30, 0, 0], LegL: [10, 0, 4], ShinL: [104, 0, 0], FootL: [50, 0, 0] }],
  ], { fast: true }),
  clip('BashDoor', 26, [
    [0, { ...STAND, Torso: [-8, 18, 0], ArmR: [-140, 0, -8], ForearmR: [-80, 0, 0], ArmL: [-140, 0, 8], ForearmL: [-80, 0, 0] }],
    [14, { ...STAND, Torso: [-12, 22, 0], ArmR: [-150, 0, -8], ForearmR: [-80, 0, 0], ArmL: [-150, 0, 8], ForearmL: [-80, 0, 0] }],
    [18, { ...BRACE, Torso: [24, -14, 0], ArmR: [-90, 0, -4], ForearmR: [-6, 0, 0], ArmL: [-90, 0, 4], ForearmL: [-6, 0, 0] }],
    [26, { ...STAND, Torso: [-8, 18, 0], ArmR: [-140, 0, -8], ForearmR: [-80, 0, 0], ArmL: [-140, 0, 8], ForearmL: [-80, 0, 0] }],
  ], { loop: true, fast: true }),
  clip('ClimbIn', 24, [
    [0, { Pelvis: sq(10, 0, 0, 0, 0, 0), Torso: [20, 0, 0], ArmR: [-150, 0, -6], ForearmR: [-10, 0, 0], ArmL: [-150, 0, 6], ForearmL: [-10, 0, 0], LegR: [-50, 0, 0], ShinR: [70, 0, 0], LegL: [-10, 0, 0], ShinL: [30, 0, 0] }],
    [12, { Pelvis: sq(30, 0, 12, 0, 0.3, 0), Torso: [30, 0, 0], ArmR: [-90, 0, -6], ForearmR: [-40, 0, 0], ArmL: [-90, 0, 6], ForearmL: [-40, 0, 0], LegR: [-90, 0, -10], ShinR: [80, 0, 0], LegL: [-40, 0, 10], ShinL: [70, 0, 0] }],
    [24, { Pelvis: sq(4, 0, 0, 0, -0.1, 0), Torso: [20, 0, 0], ArmR: [-30, 0, -10], ForearmR: [-40, 0, 0], ArmL: [-30, 0, 10], ForearmL: [-40, 0, 0], LegR: [-30, 0, 0], ShinR: [50, 0, 0], LegL: [-20, 0, 0], ShinL: [40, 0, 0] }],
  ], { fast: true }),

  // ---- Flenser, monks, knights, drowned, carrier ----
  clip('SawRev', 26, [
    [0, { ...BRACE, Torso: [6, 10, 0], ArmR: [-74, 10, -8], ForearmR: [-40, 0, 0], ArmL: [-64, -12, 20], ForearmL: [-60, 0, 0] }],
    [10, { ...BRACE, Torso: [-10, 16, 0], ArmR: [-110, 10, -8], ForearmR: [-30, 0, 0], ArmL: [-100, -12, 20], ForearmL: [-50, 0, 0], Head: [-14, 0, 0] }],
    [14, { ...BRACE, Torso: [-8, 14, 0], ArmR: [-106, 10, -8], ForearmR: [-30, 0, 0], ArmL: [-96, -12, 20], ForearmL: [-50, 0, 0], Head: [-12, 0, 0] }],
    [26, { ...BRACE, Torso: [-10, 16, 0], ArmR: [-110, 10, -8], ForearmR: [-30, 0, 0], ArmL: [-100, -12, 20], ForearmL: [-50, 0, 0], Head: [-14, 0, 0] }],
  ], { fast: true }),
  clip('SawSwing', 16, [
    [0, { ...BRACE, Torso: [-10, 26, 0], ArmR: [-120, 14, -28], ForearmR: [-30, 0, 0], ArmL: [-110, -6, 20], ForearmL: [-50, 0, 0] }],
    [6, { ...BRACE, Torso: [28, -28, 0], ArmR: [-80, 8, 24], ForearmR: [-6, 0, 0], ArmL: [-70, -24, 30], ForearmL: [-24, 0, 0] }],
    [16, { ...BRACE, Torso: [14, -8, 0], ArmR: [-70, 10, -6], ForearmR: [-30, 0, 0], ArmL: [-60, -12, 20], ForearmL: [-50, 0, 0] }],
  ], { fast: true }),
  clip('SawLunge', 18, [
    [0, { Pelvis: sq(14, 0, 0, 0, -0.1, 0), Torso: [24, 0, 0], ArmR: [-90, 10, -6], ForearmR: [-20, 0, 0], ArmL: [-80, -12, 20], ForearmL: [-40, 0, 0], LegR: [-50, 0, 0], ShinR: [50, 0, 0], LegL: [34, 0, 0], ShinL: [40, 0, 0] }],
    [9, { Pelvis: sq(20, 0, 0, 0, -0.08, 0), Torso: [30, 0, 0], ArmR: [-90, 10, -6], ForearmR: [-10, 0, 0], ArmL: [-84, -12, 20], ForearmL: [-30, 0, 0], LegR: [30, 0, 0], ShinR: [50, 0, 0], LegL: [-50, 0, 0], ShinL: [50, 0, 0] }],
    [18, { Pelvis: sq(14, 0, 0, 0, -0.1, 0), Torso: [24, 0, 0], ArmR: [-90, 10, -6], ForearmR: [-20, 0, 0], ArmL: [-80, -12, 20], ForearmL: [-40, 0, 0], LegR: [-50, 0, 0], ShinR: [50, 0, 0], LegL: [34, 0, 0], ShinL: [40, 0, 0] }],
  ], { loop: true, fast: true }),
  clip('ShieldBlock', 14, [
    [0, { ...BRACE, Torso: [-8, 0, 0], Head: [-4, 0, 0], ArmL: [-70, 20, 20], ForearmL: [-60, 0, 0], ArmR: [-20, 0, -20], ForearmR: [-40, 0, 0] }],
    [14, { ...BRACE, Torso: [8, 0, 0], ArmL: [-70, 20, 20], ForearmL: [-60, 0, 0], ArmR: [-30, 0, -20], ForearmR: [-40, 0, 0] }],
  ], { fast: true }),
  clip('FlailSpin', 27, [
    [0, { ...BRACE, Torso: [-4, 20, 0], ArmR: [-150, 0, -40], ForearmR: [-30, 0, 0], ArmL: [-70, 20, 20], ForearmL: [-60, 0, 0] }],
    [9, { ...BRACE, Torso: [-4, 0, 0], ArmR: [-170, 60, -20], ForearmR: [-20, 0, 0], ArmL: [-70, 20, 20], ForearmL: [-60, 0, 0] }],
    [18, { ...BRACE, Torso: [-4, -20, 0], ArmR: [-150, -20, 10], ForearmR: [-30, 0, 0], ArmL: [-70, 20, 20], ForearmL: [-60, 0, 0] }],
    [27, { ...BRACE, Torso: [-4, 20, 0], ArmR: [-170, 0, -40], ForearmR: [-40, 0, 0], ArmL: [-70, 20, 20], ForearmL: [-60, 0, 0] }],
  ], { fast: true }),
  clip('HalberdSweep', 24, [
    [0, { ...BRACE, Torso: [-6, 40, 0], ArmR: [-110, 14, -40], ForearmR: [-40, 0, 0], ArmL: [-90, -14, 10], ForearmL: [-60, 0, 0] }],
    [10, { ...BRACE, Torso: [-8, 44, 0], ArmR: [-120, 14, -46], ForearmR: [-40, 0, 0], ArmL: [-96, -14, 10], ForearmL: [-60, 0, 0] }],
    [15, { ...BRACE, Torso: [16, -40, 0], ArmR: [-90, 4, 20], ForearmR: [-14, 0, 0], ArmL: [-70, -24, 40], ForearmL: [-24, 0, 0] }],
    [24, { ...BRACE, Torso: [10, -14, 0], ArmR: [-70, 6, -10], ForearmR: [-30, 0, 0], ArmL: [-60, -14, 20], ForearmL: [-40, 0, 0] }],
  ], { fast: true }),
  clip('DrownedRise', 36, [
    [0, { Pelvis: sq(26, 0, 6, 0, -0.62, 0), Torso: [30, 0, 0], Head: [30, 0, 0], ArmR: [-170, 0, -20], ForearmR: [-20, 0, 0], ArmL: [-150, 0, 20], ForearmL: [-30, 0, 0], LegR: [-70, 0, 0], ShinR: [120, 0, 0], LegL: [-70, 0, 0], ShinL: [120, 0, 0] }],
    [20, { Pelvis: sq(16, 0, -4, 0, -0.3, 0), Torso: [24, 0, 0], Head: [10, 0, 0], ArmR: [-120, 0, -20], ForearmR: [-30, 0, 0], ArmL: [-150, 0, 20], ForearmL: [-20, 0, 0], LegR: [-46, 0, 0], ShinR: [80, 0, 0], LegL: [-40, 0, 0], ShinL: [80, 0, 0] }],
    [36, { Pelvis: sq(4, 0, 0, 0, -0.04, 0), Torso: [14, 0, 0], Head: [4, 0, 0], ArmR: [-80, 0, -14], ForearmR: [-20, 0, 0], ArmL: [-90, 0, 14], ForearmL: [-20, 0, 0], LegR: [-6, 0, 0], ShinR: [12, 0, 0], LegL: [-4, 0, 0], ShinL: [12, 0, 0] }],
  ]),
  clip('CarrierShoulder', 24, [
    [0, { Pelvis: sq(36, 0, 0, 0, -0.26, 0), Torso: [40, 0, 0], ArmR: [-80, 0, -6], ForearmR: [-20, 0, 0], ArmL: [-80, 0, 6], ForearmL: [-20, 0, 0], LegR: [-60, 0, 0], ShinR: [90, 0, 0], LegL: [-40, 0, 0], ShinL: [70, 0, 0] }],
    [24, { Pelvis: sq(4, 0, 0, 0, -0.06, 0), Torso: [20, 0, 0], ArmL: [-140, 0, 16], ForearmL: [-70, 0, 0], ArmR: [-40, 0, -10], ForearmR: [-30, 0, 0], LegR: [-8, 0, 0], ShinR: [16, 0, 0], LegL: [-4, 0, 0], ShinL: [14, 0, 0] }],
  ]),

  // ---- The Dame ----
  clip('DameCane', 16, [
    [0, { ...STAND, Torso: [-8, 26, 0], ArmR: [-160, 0, -30], ForearmR: [-40, 0, 0], ArmL: [-14, 0, 10], ForearmL: [-90, 0, 0] }],
    [5, { ...BRACE, Torso: [24, -20, 0], ArmR: [-80, 0, -4], ForearmR: [-6, 0, 0], ArmL: [-14, 0, 10], ForearmL: [-90, 0, 0] }],
    [16, { ...STAND, Torso: [4, 0, 0], ArmR: [-22, 0, -8], ForearmR: [-20, 0, 0], ArmL: [-14, 0, 8], ForearmL: [-90, 0, 0] }],
  ], { fast: true }),
  clip('DameBarrelIn', 20, [
    [0, { Pelvis: sq(30, 0, 0, 0, 0.1, 0), Torso: [30, 0, 0], ArmR: [-100, 0, -8], ForearmR: [-10, 0, 0], ArmL: [-100, 0, 8], ForearmL: [-10, 0, 0], LegR: [-70, 0, 0], ShinR: [90, 0, 0], LegL: [-10, 0, 0], ShinL: [20, 0, 0] }],
    [20, { Pelvis: sq(4, 0, 0, 0, -0.46, 0), Torso: [12, 0, 0], ArmR: [-60, 14, -8], ForearmR: [-80, 0, 0], ArmL: [-60, -14, 8], ForearmL: [-80, 0, 0], LegR: [-90, 0, 0], ShinR: [130, 0, 0], LegL: [-90, 0, 0], ShinL: [130, 0, 0] }],
  ]),
  clip('DameHoist', 30, [
    [0, { ...STAND, Torso: [-4, 0, 0], Head: [-20, 0, 0], ArmR: [-170, 0, -4], ForearmR: [-14, 0, 0], ArmL: [-170, 0, 4], ForearmL: [-14, 0, 0] }],
    [15, { ...BRACE, Torso: [10, 0, 0], Head: [-14, 0, 0], ArmR: [-120, 0, -4], ForearmR: [-50, 0, 0], ArmL: [-120, 0, 4], ForearmL: [-50, 0, 0] }],
    [30, { ...STAND, Torso: [-4, 0, 0], Head: [-20, 0, 0], ArmR: [-170, 0, -4], ForearmR: [-14, 0, 0], ArmL: [-170, 0, 4], ForearmL: [-14, 0, 0] }],
  ], { loop: true }),
  clip('DameScold', 40, [
    [0, { ...STAND, Torso: [-4, 0, 0], Head: [-6, 0, 0], ArmR: [-22, 0, -8], ForearmR: [-20, 0, 0], ArmL: [-14, 0, 8], ForearmL: [-90, 0, 0] }],
    [20, { ...STAND, Torso: [-4, 0, 0], Head: [-10, 8, 0], ArmR: [-70, 0, -12], ForearmR: [-40, 0, 0], ArmL: [-14, 0, 8], ForearmL: [-90, 0, 0] }],
    [40, { ...STAND, Torso: [-4, 0, 0], Head: [-6, 0, 0], ArmR: [-22, 0, -8], ForearmR: [-20, 0, 0], ArmL: [-14, 0, 8], ForearmL: [-90, 0, 0] }],
  ], { loop: true }),
  clip('DameDuck', 18, [[0, { Pelvis: sq(14, 0, 0, 0, -0.14, 0), Torso: [20, 0, 0], Head: [10, 0, 0], ArmR: [-60, 20, -10], ForearmR: [-100, 0, 0], ArmL: [-60, -20, 10], ForearmL: [-100, 0, 0], LegR: [-40, 0, 0], ShinR: [70, 0, 0], FootR: [-30, 0, 0], LegL: [-40, 0, 0], ShinL: [70, 0, 0], FootL: [-30, 0, 0] }], [18, { Pelvis: sq(16, 0, 0, 0, -0.16, 0), Torso: [22, 0, 0], Head: [10, 0, 0], ArmR: [-60, 20, -10], ForearmR: [-100, 0, 0], ArmL: [-60, -20, 10], ForearmL: [-100, 0, 0], LegR: [-44, 0, 0], ShinR: [76, 0, 0], FootR: [-32, 0, 0], LegL: [-44, 0, 0], ShinL: [76, 0, 0], FootL: [-32, 0, 0] }]]),
  clip('DameCarried', 30, [
    [0, { Pelvis: sq(0, 0, 0), Torso: [14, 0, 0], Head: [14, 0, 0], ArmR: [-40, 0, -30], ForearmR: [-40, 0, 0], ArmL: [-14, 0, 20], ForearmL: [-90, 0, 0], LegR: [-40, 0, 0], ShinR: [60, 0, 0], LegL: [-20, 0, 0], ShinL: [80, 0, 0] }],
    [15, { Pelvis: sq(0, 0, 0), Torso: [14, 0, 0], Head: [10, 0, 0], ArmR: [-120, 0, -30], ForearmR: [-10, 0, 0], ArmL: [-14, 0, 20], ForearmL: [-90, 0, 0], LegR: [-20, 0, 0], ShinR: [80, 0, 0], LegL: [-40, 0, 0], ShinL: [60, 0, 0] }],
    [30, { Pelvis: sq(0, 0, 0), Torso: [14, 0, 0], Head: [14, 0, 0], ArmR: [-40, 0, -30], ForearmR: [-40, 0, 0], ArmL: [-14, 0, 20], ForearmL: [-90, 0, 0], LegR: [-40, 0, 0], ShinR: [60, 0, 0], LegL: [-20, 0, 0], ShinL: [80, 0, 0] }],
  ], { loop: true }),

  // ---- Mr. Fathom ----
  clip('FathomIdle', 80, [
    [0, { ...STAND, Pelvis: sq(0, 0, 3, 0, -0.01, 0), Torso: [2, 0, 3], Head: [2, 0, 3], ArmR: [-14, 0, -8], ForearmR: [-20, 0, 0], ArmL: [-34, 0, 14], ForearmL: [-40, 0, 0] }],
    [30, { ...STAND, Pelvis: sq(0, 0, -3, 0, 0.012, 0), Torso: [2, 0, -3], Head: [6, 0, -3], ArmR: [-14, 0, -8], ForearmR: [-20, 0, 0], ArmL: [-38, 0, 14], ForearmL: [-44, 0, 0] }],
    [50, { ...STAND, Pelvis: sq(0, 0, -2, 0, 0.01, 0), Torso: [2, 0, -2], Head: [-2, 0, -2], ArmR: [-140, 14, -14], ForearmR: [-90, 0, 0], ArmL: [-34, 0, 14], ForearmL: [-40, 0, 0] }],
    [58, { ...STAND, Pelvis: sq(0, 0, -1, 0, 0.0, 0), Torso: [2, 0, -1], Head: [-2, 0, -1], ArmR: [-150, 14, -14], ForearmR: [-100, 0, 0], ArmL: [-34, 0, 14], ForearmL: [-40, 0, 0] }],
    [80, { ...STAND, Pelvis: sq(0, 0, 3, 0, -0.01, 0), Torso: [2, 0, 3], Head: [2, 0, 3], ArmR: [-14, 0, -8], ForearmR: [-20, 0, 0], ArmL: [-34, 0, 14], ForearmL: [-40, 0, 0] }],
  ], { loop: true }),
  clip('FathomPresent', 30, [
    [0, { ...STAND, Torso: [-4, 0, 0], Head: [-4, 0, 0], ArmR: [-40, 0, -50], ForearmR: [-20, 0, 0], ArmL: [-40, 0, 50], ForearmL: [-40, 0, 0] }],
    [15, { ...STAND, Torso: [-8, 0, 0], Head: [-8, 0, 0], ArmR: [-60, 0, -70], ForearmR: [-10, 0, 0], ArmL: [-60, 0, 66], ForearmL: [-30, 0, 0] }],
    [30, { ...STAND, Torso: [-4, 0, 0], Head: [-4, 0, 0], ArmR: [-40, 0, -50], ForearmR: [-20, 0, 0], ArmL: [-40, 0, 50], ForearmL: [-40, 0, 0] }],
  ]),

  // ---- Bosses ----
  clip('AnsgarHook', 20, [
    [0, { ...BRACE, Torso: [-10, 34, 0], ArmR: [-150, 0, -40], ForearmR: [-30, 0, 0], ArmL: [-50, 0, 20], ForearmL: [-40, 0, 0] }],
    [10, { ...BRACE, Torso: [24, -24, 0], ArmR: [-74, 0, 10], ForearmR: [-4, 0, 0], ArmL: [-20, 0, 20], ForearmL: [-40, 0, 0] }],
    [20, { ...BRACE, Torso: [10, -10, 0], ArmR: [-70, 0, -10], ForearmR: [-30, 0, 0], ArmL: [-20, 0, 14], ForearmL: [-40, 0, 0] }],
  ], { fast: true }),
  clip('AnsgarSwing', 24, [
    [0, { Pelvis: sq(0, 0, 0, 0, -0.34, 0), Torso: [-10, 20, 0], ArmR: [-170, 0, -20], ForearmR: [-60, 0, 0], ArmL: [-60, 0, 20], ForearmL: [-30, 0, 0], LegR: [-80, 0, -6], ShinR: [110, 0, 0], LegL: [-40, 0, 6], ShinL: [110, 0, 0] }],
    [14, { Pelvis: sq(0, 0, 0, 0, -0.34, 0), Torso: [-16, 26, 0], ArmR: [-190, 0, -20], ForearmR: [-70, 0, 0], ArmL: [-70, 0, 20], ForearmL: [-30, 0, 0], LegR: [-80, 0, -6], ShinR: [110, 0, 0], LegL: [-40, 0, 6], ShinL: [110, 0, 0] }],
    [18, { Pelvis: sq(0, 0, 0, 0, -0.34, 0), Torso: [34, -20, 0], ArmR: [-70, 0, -4], ForearmR: [-6, 0, 0], ArmL: [-20, 0, 20], ForearmL: [-30, 0, 0], LegR: [-80, 0, -6], ShinR: [110, 0, 0], LegL: [-40, 0, 6], ShinL: [110, 0, 0] }],
    [24, { Pelvis: sq(0, 0, 0, 0, -0.34, 0), Torso: [10, 0, 0], ArmR: [-60, 0, -14], ForearmR: [-30, 0, 0], ArmL: [-30, 0, 14], ForearmL: [-40, 0, 0], LegR: [-80, 0, -6], ShinR: [110, 0, 0], LegL: [-40, 0, 6], ShinL: [110, 0, 0] }],
  ], { fast: true }),
  clip('BosunSweep', 30, [
    [0, { ...BRACE, Torso: [-8, 50, 0], Head: [0, -30, 0], ArmR: [-50, 30, -70], ForearmR: [-10, 0, 0], ArmL: [-30, 0, 20], ForearmL: [-40, 0, 0] }],
    [18, { ...BRACE, Torso: [-10, 56, 0], Head: [0, -36, 0], ArmR: [-60, 30, -80], ForearmR: [-10, 0, 0], ArmL: [-30, 0, 20], ForearmL: [-40, 0, 0] }],
    [24, { ...BRACE, Torso: [10, -50, 0], Head: [0, 20, 0], ArmR: [-90, 0, 30], ForearmR: [-4, 0, 0], ArmL: [-10, 0, 30], ForearmL: [-40, 0, 0] }],
    [30, { ...BRACE, Torso: [6, -14, 0], ArmR: [-30, 0, -14], ForearmR: [-14, 0, 0], ArmL: [-20, 0, 20], ForearmL: [-40, 0, 0] }],
  ], { fast: true }),
  clip('BosunThrow', 36, [
    [0, { ...STAND, Torso: [-10, 26, 0], ArmR: [-170, 0, -20], ForearmR: [-60, 0, 0], ArmL: [-70, 0, 20], ForearmL: [-20, 0, 0] }],
    [24, { ...STAND, Torso: [-18, 34, 0], ArmR: [-200, 0, -26], ForearmR: [-70, 0, 0], ArmL: [-80, 0, 26], ForearmL: [-10, 0, 0] }],
    [28, { ...BRACE, Torso: [26, -20, 0], ArmR: [-70, 0, -4], ForearmR: [-4, 0, 0], ArmL: [-10, 0, 20], ForearmL: [-30, 0, 0] }],
    [36, { ...STAND, Torso: [12, -4, 0], ArmR: [-50, 0, -10], ForearmR: [-14, 0, 0], ArmL: [-10, 0, 16], ForearmL: [-30, 0, 0] }],
  ], { fast: true }),
  clip('BosunStomp', 26, [
    [0, { Pelvis: sq(-6, 0, 0, 0, 0.02, 0), Torso: [-10, 0, 0], ArmR: [-40, 0, -40], ForearmR: [-20, 0, 0], ArmL: [-40, 0, 40], ForearmL: [-20, 0, 0], LegR: [-90, 0, 0], ShinR: [90, 0, 0], LegL: [0, 0, 3], ShinL: [4, 0, 0] }],
    [14, { Pelvis: sq(-8, 0, 0, 0, 0.04, 0), Torso: [-14, 0, 0], ArmR: [-50, 0, -50], ForearmR: [-20, 0, 0], ArmL: [-50, 0, 50], ForearmL: [-20, 0, 0], LegR: [-100, 0, 0], ShinR: [80, 0, 0], LegL: [0, 0, 3], ShinL: [4, 0, 0] }],
    [18, { ...BRACE, Pelvis: sq(14, 0, 0, 0, -0.1, 0), Torso: [24, 0, 0], ArmR: [-20, 0, -30], ForearmR: [-30, 0, 0], ArmL: [-20, 0, 30], ForearmL: [-30, 0, 0], LegR: [-30, 0, 0], ShinR: [20, 0, 0], LegL: [10, 0, 3], ShinL: [20, 0, 0] }],
    [26, { ...STAND, Torso: [8, 0, 0], ArmR: [-14, 0, -14], ForearmR: [-20, 0, 0], ArmL: [-14, 0, 14], ForearmL: [-20, 0, 0] }],
  ], { fast: true }),
  clip('BosunKneel', 30, [
    [0, { Pelvis: sq(10, 0, 6, 0, -0.06, 0), Torso: [20, 0, 0], Head: [20, 0, 0], ArmR: [-20, 0, -30], ForearmR: [-20, 0, 0], ArmL: [-20, 0, 30], ForearmL: [-20, 0, 0], LegR: [-20, 0, -4], ShinR: [40, 0, 0], LegL: [-10, 0, 4], ShinL: [30, 0, 0] }],
    [14, { Pelvis: sq(22, 0, 6, 0, -0.34, 0), Torso: [50, 0, 0], Head: [24, 0, 0], ArmR: [-70, 0, -14], ForearmR: [-14, 0, 0], ArmL: [-70, 0, 14], ForearmL: [-14, 0, 0], LegR: [-90, 0, -4], ShinR: [120, 0, 0], FootR: [-30, 0, 0], LegL: [-80, 0, 4], ShinL: [120, 0, 0], FootL: [-30, 0, 0] }],
    [30, { Pelvis: sq(24, 0, 4, 0, -0.36, 0), Torso: [54, 0, 0], Head: [30, 0, 0], ArmR: [-74, 0, -14], ForearmR: [-14, 0, 0], ArmL: [-74, 0, 14], ForearmL: [-14, 0, 0], LegR: [-92, 0, -4], ShinR: [124, 0, 0], FootR: [-30, 0, 0], LegL: [-84, 0, 4], ShinL: [124, 0, 0], FootL: [-30, 0, 0] }],
  ]),
  clip('BosunRoar', 40, [
    [0, { ...BRACE, Torso: [10, 0, 0], Head: [10, 0, 0], ArmR: [-30, 0, -30], ForearmR: [-40, 0, 0], ArmL: [-30, 0, 30], ForearmL: [-40, 0, 0] }],
    [12, { ...BRACE, Torso: [-20, 0, 0], Head: [-34, 0, 0], ArmR: [-60, 0, -70], ForearmR: [-50, 0, 0], ArmL: [-60, 0, 70], ForearmL: [-50, 0, 0] }],
    [30, { ...BRACE, Torso: [-22, 0, 0], Head: [-36, 0, 0], ArmR: [-64, 0, -74], ForearmR: [-54, 0, 0], ArmL: [-64, 0, 74], ForearmL: [-54, 0, 0] }],
    [40, { ...STAND, Torso: [8, 0, 0], ArmR: [-14, 0, -14], ForearmR: [-20, 0, 0], ArmL: [-14, 0, 14], ForearmL: [-20, 0, 0] }],
  ]),
  clip('BathySag', 40, [
    [0, { Pelvis: sq(6, 0, 4, 0, -0.08, 0), Torso: [8, 0, 0], ArmR: [-10, 0, -20], ForearmR: [-10, 0, 0], ArmL: [-10, 0, 20], ForearmL: [-10, 0, 0], LegR: [-30, 0, -6], ShinR: [50, 0, 0], FootR: [-20, 0, 0], LegL: [-30, 0, 6], ShinL: [50, 0, 0], FootL: [-20, 0, 0] }],
    [20, { Pelvis: sq(10, 0, -4, 0, -0.16, 0), Torso: [14, 0, 0], ArmR: [-20, 0, -40], ForearmR: [-30, 0, 0], ArmL: [-60, 0, 30], ForearmL: [-40, 0, 0], LegR: [-46, 0, -6], ShinR: [74, 0, 0], FootR: [-26, 0, 0], LegL: [-46, 0, 6], ShinL: [74, 0, 0], FootL: [-26, 0, 0] }],
    [40, { Pelvis: sq(6, 0, 4, 0, -0.08, 0), Torso: [8, 0, 0], ArmR: [-10, 0, -20], ForearmR: [-10, 0, 0], ArmL: [-10, 0, 20], ForearmL: [-10, 0, 0], LegR: [-30, 0, -6], ShinR: [50, 0, 0], FootR: [-20, 0, 0], LegL: [-30, 0, 6], ShinL: [50, 0, 0], FootL: [-20, 0, 0] }],
  ], { loop: true }),
  clip('SteamBlast', 30, [
    [0, { ...BRACE, Torso: [-10, 0, 0], ArmR: [-90, 0, -20], ForearmR: [-40, 0, 0], ArmL: [-90, 0, 20], ForearmL: [-40, 0, 0] }],
    [14, { ...BRACE, Torso: [16, 0, 0], ArmR: [-100, 0, -20], ForearmR: [-10, 0, 0], ArmL: [-100, 0, 20], ForearmL: [-10, 0, 0] }],
    [30, { ...STAND, Torso: [4, 0, 0], ArmR: [-20, 0, -20], ForearmR: [-40, 0, 0], ArmL: [-20, 0, 20], ForearmL: [-40, 0, 0] }],
  ], { fast: true }),
  // A Commodore at the microphone: lean in, gesticulate.
  clip('Broadcast', 50, [
    [0, { Pelvis: sq(0, 0, 0, 0, -0.26, 0), Torso: [16, 0, 0], Head: [-4, 0, 0], ArmR: [-90, 0, -20], ForearmR: [-90, 0, 0], ArmL: [-50, 0, 10], ForearmL: [-60, 0, 0], LegR: [-74, 0, -6], ShinR: [80, 0, 0], FootR: [-6, 0, 0], LegL: [-74, 0, 6], ShinL: [80, 0, 0], FootL: [-6, 0, 0] }],
    [25, { Pelvis: sq(0, 0, 0, 0, -0.26, 0), Torso: [20, 0, 0], Head: [-10, 6, 0], ArmR: [-140, 0, -30], ForearmR: [-60, 0, 0], ArmL: [-50, 0, 10], ForearmL: [-60, 0, 0], LegR: [-74, 0, -6], ShinR: [80, 0, 0], FootR: [-6, 0, 0], LegL: [-74, 0, 6], ShinL: [80, 0, 0], FootL: [-6, 0, 0] }],
    [50, { Pelvis: sq(0, 0, 0, 0, -0.26, 0), Torso: [16, 0, 0], Head: [-4, 0, 0], ArmR: [-90, 0, -20], ForearmR: [-90, 0, 0], ArmL: [-50, 0, 10], ForearmL: [-60, 0, 0], LegR: [-74, 0, -6], ShinR: [80, 0, 0], FootR: [-6, 0, 0], LegL: [-74, 0, 6], ShinL: [80, 0, 0], FootL: [-6, 0, 0] }],
  ], { loop: true }),
];

const HERO_WANTED = ['Idle', 'IdleLook', 'Walk', 'Run', 'Crouch', 'CrouchWalk', 'Climb', 'Push', 'Hurt', 'HitReact', 'Death', 'GetUp', 'Roll', 'Kick', 'Punch', 'Shout', 'Slam', 'Slash1', 'Slash2', 'Slash3', 'Sit', 'LieIdle', 'Fall', 'Land', 'Victory', 'Wave', 'SitDown', 'StandUp', 'LieDown'];
export const HERO_SUBSET = HERO_CLIPS.filter((c) => HERO_WANTED.includes(c.name));
export const ALL_CLIP_DEFS = [...HERO_SUBSET, ...CLIP_DEFS];
export const CLIP_SPEED = Object.fromEntries(ALL_CLIP_DEFS.filter((c) => c.speed).map((c) => [c.name, c.speed]));

// The Mother isn't on the hero rig: her clips drive the pivots her own model names.
export const MOTHER_RIG = { joints: ['Rider', 'Eye'], root: 'Rider', mirror: {}, soles: [], trace: [], limits: {}, fps: 30 };
export const MOTHER_CLIP_DEFS = [
  clip('MotherSpit', 20, [
    [0, { Rider: [0, 0, 0], Eye: [0, 0, 0] }],
    [7, { Rider: [-20, 0, 0], Eye: [16, 0, 0] }],
    [11, { Rider: [14, 0, 0], Eye: [-12, 0, 0] }],
    [20, { Rider: [0, 0, 0], Eye: [0, 0, 0] }],
  ], { fast: true, notes: 'She rears, the rider thrown back, then lunges to spit.' }),
];
