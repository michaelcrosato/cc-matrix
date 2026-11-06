// New animation clips on the hero rig. Everything else uses the engine's HERO_CLIPS.
import { gaitClip, HERO_CLIPS, HERO_RIG } from '../../pixel-engine.js';

const READY = { Pelvis: { r: [0, -8, 0], p: [0, -0.07, 0] }, Torso: [8, 6, 0], Head: [-6, 2, 0], ArmR: [-38, 0, -22], ForearmR: [-70, 0, 0], HandR: [10, 0, 0], ArmL: [-30, 0, 18], ForearmL: [-80, 0, 0], HandL: [-10, 0, 0], LegR: [-24, 0, 0], ShinR: [61, 0, 0], FootR: [-37, 8, 0], LegL: [-30, 0, 0], ShinL: [60, 0, 0], FootL: [-30, 8, 0] };
const CROUCH = { LegR: [-40, 0, 0], ShinR: [88, 0, 0], FootR: [-48, 0, 0], LegL: [-40, 0, 0], ShinL: [88, 0, 0], FootL: [-48, 0, 0] };
const low = (y) => ({ Pelvis: { p: [0, y, 0] }, ...CROUCH });

export const NEW_CLIPS = [
  { name: 'BellOverhead', frames: 18, fast: true, keys: [
    [0, READY],
    [5, { Pelvis: { r: [-6, 0, 0], p: [0, -0.03, 0] }, Torso: [-16, 0, 0], Head: [-10, 0, 0], ArmR: [-168, 0, -10], ForearmR: [-30, 0, 0], ArmL: [-168, 0, 10], ForearmL: [-30, 0, 0] }, 'inCubic'],
    [8, { Pelvis: { r: [16, 0, 0], p: [0, -0.18, 0.05] }, Torso: [38, 0, 0], Head: [-24, 0, 0], ArmR: [-62, 0, -4], ForearmR: [-14, 0, 0], ArmL: [-62, 0, 4], ForearmL: [-14, 0, 0], ...CROUCH }, 'outCubic'],
    [14, { Pelvis: { r: [12, 0, 0], p: [0, -0.16, 0.04] }, Torso: [30, 0, 0], Head: [-18, 0, 0], ArmR: [-54, 0, -6], ForearmR: [-20, 0, 0], ArmL: [-54, 0, 6], ForearmL: [-20, 0, 0], ...CROUCH }],
    [18, READY],
  ] },
  { name: 'ChainSweep', frames: 16, fast: true, keys: [
    [0, READY],
    [4, { Pelvis: { r: [0, 40, 0], p: [0, -0.1, 0] }, Torso: [10, 44, 0], ArmR: [-80, 0, -60], ForearmR: [-20, 0, 0], ArmL: [-40, 0, 40], ForearmL: [-60, 0, 0] }, 'inCubic'],
    [9, { Pelvis: { r: [0, -60, 0], p: [0, -0.12, 0] }, Torso: [12, -50, 0], ArmR: [-85, 0, -50], ForearmR: [-10, 0, 0], ArmL: [-50, 0, 30], ForearmL: [-40, 0, 0] }, 'outCubic'],
    [16, READY],
  ] },
  { name: 'LanternLob', frames: 16, fast: true, keys: [
    [0, READY],
    [5, { Pelvis: { r: [-4, 18, 0], p: [0, -0.1, 0] }, Torso: [-8, 22, 0], Head: [0, -14, 0], ArmR: [40, 0, -14], ForearmR: [-30, 0, 0], ArmL: [-60, 0, 20] }, 'inCubic'],
    [9, { Pelvis: { r: [8, -16, 0], p: [0, -0.06, 0.03] }, Torso: [20, -18, 0], Head: [-14, 10, 0], ArmR: [-150, 0, -16], ForearmR: [-20, 0, 0], HandR: [30, 0, 0], ArmL: [-20, 0, 20] }, 'outCubic'],
    [16, READY],
  ] },
  { name: 'ShovelSwat', frames: 14, fast: true, keys: [
    [0, READY],
    [4, { Pelvis: { r: [0, 30, 0], p: [0, -0.1, 0] }, Torso: [6, 34, 0], ArmR: [-110, 0, -70], ForearmR: [-40, 0, 0], ArmL: [-90, 0, -20], ForearmL: [-60, 0, 0] }, 'inCubic'],
    [7, { Pelvis: { r: [4, -30, 0], p: [0, -0.13, 0.02] }, Torso: [18, -36, 0], ArmR: [-85, 0, -10], ForearmR: [-10, 0, 0], ArmL: [-70, 0, 30], ForearmL: [-30, 0, 0] }, 'outCubic'],
    [14, READY],
  ] },
  { name: 'Dig', frames: 20, keys: [
    [0, READY],
    [6, { Pelvis: { r: [8, 0, 0], p: [0, -0.06, 0] }, Torso: [10, 0, 0], ArmR: [-120, 0, -10], ForearmR: [-50, 0, 0], ArmL: [-120, 0, 10], ForearmL: [-50, 0, 0] }, 'inCubic'],
    [10, { Pelvis: { r: [18, 0, 0], p: [0, -0.2, 0.05] }, Torso: [42, 0, 0], Head: [-26, 0, 0], ArmR: [-50, 0, -6], ForearmR: [-20, 0, 0], ArmL: [-50, 0, 6], ForearmL: [-20, 0, 0], ...CROUCH }, 'outCubic'],
    [16, { Pelvis: { r: [14, 0, 0], p: [0, -0.18, 0.04] }, Torso: [34, 0, 0], ArmR: [-60, 0, -6], ForearmR: [-30, 0, 0], ArmL: [-60, 0, 6], ForearmL: [-30, 0, 0], ...CROUCH }],
    [20, READY],
  ] },
  { name: 'RaiseHands', frames: 22, keys: [
    [0, READY],
    [10, { Pelvis: { r: [-4, 0, 0], p: [0, -0.02, 0] }, Torso: [-14, 0, 0], Head: [-20, 0, 0], ArmR: [-165, 0, -24], ForearmR: [-18, 0, 0], HandR: [30, 0, 0], ArmL: [-165, 0, 24], ForearmL: [-18, 0, 0], HandL: [30, 0, 0] }, 'outCubic'],
    [16, { Pelvis: { r: [-4, 0, 0], p: [0, -0.02, 0] }, Torso: [-18, 0, 0], Head: [-24, 0, 0], ArmR: [-170, 0, -30], ForearmR: [-10, 0, 0], ArmL: [-170, 0, 30], ForearmL: [-10, 0, 0] }],
    [22, READY],
  ] },
  { name: 'SinkGround', frames: 12, fast: true, keys: [
    [0, READY],
    [6, { Pelvis: { p: [0, -0.5, 0] }, Torso: [30, 0, 0], ArmR: [-20, 0, -30], ArmL: [-20, 0, 30], ...CROUCH }, 'inCubic'],
    [10, { Pelvis: { p: [0, -0.2, 0] }, Torso: [10, 0, 0], ArmR: [-120, 0, -30], ArmL: [-120, 0, 30], ...CROUCH }, 'outCubic'],
    [12, READY],
  ] },
  { name: 'Drink', frames: 20, keys: [
    [0, READY],
    [6, { Torso: [-6, 0, 0], Head: [-26, 0, 0], ArmR: [-120, 0, -6], ForearmR: [-125, 0, 0], HandR: [-20, 0, 0] }, 'outCubic'],
    [14, { Torso: [-10, 0, 0], Head: [-34, 0, 0], ArmR: [-126, 0, -6], ForearmR: [-130, 0, 0], HandR: [-30, 0, 0] }],
    [20, READY],
  ] },
  { name: 'Revive', frames: 30, loop: true, keys: [
    [0, { ...low(-0.32), Torso: [36, 0, 0], Head: [-16, 0, 0], ArmR: [-60, 0, -10], ForearmR: [-30, 0, 0], ArmL: [-60, 0, 10], ForearmL: [-30, 0, 0] }],
    [15, { ...low(-0.3), Torso: [42, 0, 0], Head: [-18, 0, 0], ArmR: [-72, 0, -10], ForearmR: [-16, 0, 0], ArmL: [-72, 0, 10], ForearmL: [-16, 0, 0] }],
    [30, { ...low(-0.32), Torso: [36, 0, 0], Head: [-16, 0, 0], ArmR: [-60, 0, -10], ForearmR: [-30, 0, 0], ArmL: [-60, 0, 10], ForearmL: [-30, 0, 0] }],
  ] },
  { name: 'TalkGesture', frames: 40, loop: true, keys: [
    [0, { Torso: [2, 6, 0], Head: [-4, -6, 0], ArmR: [-50, 0, -14], ForearmR: [-70, 0, 0], ArmL: [-8, 0, 8], ForearmL: [-20, 0, 0] }],
    [14, { Torso: [4, -6, 0], Head: [0, 8, 0], ArmR: [-74, 0, -28], ForearmR: [-50, 0, 0], ArmL: [-14, 0, 8], ForearmL: [-30, 0, 0] }],
    [28, { Torso: [0, 0, 0], Head: [-6, 0, 0], ArmR: [-30, 0, -10], ForearmR: [-80, 0, 0], ArmL: [-60, 0, 20], ForearmL: [-60, 0, 0] }],
    [40, { Torso: [2, 6, 0], Head: [-4, -6, 0], ArmR: [-50, 0, -14], ForearmR: [-70, 0, 0], ArmL: [-8, 0, 8], ForearmL: [-20, 0, 0] }],
  ] },
  { name: 'Interact', frames: 14, keys: [
    [0, READY],
    [6, { Torso: [14, 0, 0], Head: [4, 0, 0], ArmR: [-82, 0, -4], ForearmR: [-14, 0, 0], HandR: [-10, 0, 0] }, 'outCubic'],
    [10, { Torso: [14, 0, 0], ArmR: [-78, 0, -4], ForearmR: [-24, 0, 0] }],
    [14, READY],
  ] },
  gaitClip(HERO_RIG, { name: 'Shamble', frames: 18, speed: 1.4, stance: 0.62, hip: -0.05, bob: 0.015, lean: 14, sway: 6, head: -6, arms: { swing: 6, elbow: 22 }, pose: { ArmL: [-44, 0, 8], ForearmL: [-22, 0, 0], ArmR: [-16, 0, -18], ForearmR: [-10, 0, 0], Head: [-14, 12, 10] } }),
  { name: 'Lurch', frames: 20, fast: true, keys: [
    [0, READY],
    [8, { Pelvis: { r: [-6, 10, 0], p: [0, -0.04, -0.05] }, Torso: [-16, 12, 0], Head: [-12, 0, 0], ArmR: [-140, 0, -22], ForearmR: [-40, 0, 0], ArmL: [-120, 0, 22], ForearmL: [-40, 0, 0] }, 'inCubic'],
    [11, { Pelvis: { r: [16, -10, 0], p: [0, -0.16, 0.08] }, Torso: [46, -12, 0], Head: [-26, 0, 0], ArmR: [-40, 0, -6], ForearmR: [-16, 0, 0], ArmL: [-34, 0, 6], ForearmL: [-16, 0, 0], ...CROUCH }, 'outCubic'],
    [20, READY],
  ] },
  { name: 'Lunge', frames: 14, fast: true, keys: [
    [0, { ...READY, Pelvis: { r: [18, 0, 0], p: [0, -0.26, -0.05] }, Torso: [36, 0, 0], ...CROUCH }],
    [5, { Pelvis: { r: [24, 0, 0], p: [0, 0.1, 0.1] }, Torso: [34, 0, 0], Head: [-34, 0, 0], ArmR: [-110, 0, -18], ForearmR: [-12, 0, 0], ArmL: [-110, 0, 18], ForearmL: [-12, 0, 0], LegR: [-60, 0, 0], ShinR: [30, 0, 0], LegL: [30, 0, 0], ShinL: [60, 0, 0] }, 'outCubic'],
    [10, { Pelvis: { r: [18, 0, 0], p: [0, -0.2, 0.06] }, Torso: [42, 0, 0], ArmR: [-50, 0, -16], ForearmR: [-20, 0, 0], ArmL: [-50, 0, 16], ForearmL: [-20, 0, 0], ...CROUCH }],
    [14, READY],
  ] },
  { name: 'CoffinSlam', frames: 26, fast: true, keys: [
    [0, READY],
    [12, { Pelvis: { r: [-8, 0, 0], p: [0, -0.02, -0.04] }, Torso: [-22, 0, 0], Head: [-14, 0, 0], ArmR: [-172, 0, -6], ForearmR: [-24, 0, 0], ArmL: [-172, 0, 6], ForearmL: [-24, 0, 0] }, 'inCubic'],
    [16, { Pelvis: { r: [20, 0, 0], p: [0, -0.24, 0.08] }, Torso: [52, 0, 0], Head: [-30, 0, 0], ArmR: [-56, 0, -4], ForearmR: [-8, 0, 0], ArmL: [-56, 0, 4], ForearmL: [-8, 0, 0], ...CROUCH }, 'outCubic'],
    [22, { Pelvis: { r: [16, 0, 0], p: [0, -0.22, 0.06] }, Torso: [46, 0, 0], ArmR: [-50, 0, -4], ForearmR: [-14, 0, 0], ArmL: [-50, 0, 4], ForearmL: [-14, 0, 0], ...CROUCH }],
    [26, READY],
  ] },
  { name: 'Swell', frames: 30, keys: [
    [0, { Pelvis: { p: [0, 0, 0], s: 1 } }],
    [28, { Pelvis: { p: [0, 0.02, 0], s: [1.3, 1.22, 1.3] }, Torso: [-10, 0, 0], ArmR: [-60, 0, -50], ArmL: [-60, 0, 50] }, 'inQuad'],
    [30, { Pelvis: { p: [0, 0.02, 0], s: [1.3, 1.22, 1.3] }, Torso: [-10, 0, 0], ArmR: [-60, 0, -50], ArmL: [-60, 0, 50] }],
  ] },
  { name: 'RopeLash', frames: 14, fast: true, keys: [
    [0, READY],
    [5, { Pelvis: { r: [-4, 20, 0] }, Torso: [-10, 26, 0], ArmR: [-160, 0, -30], ForearmR: [-60, 0, 0], ArmL: [-40, 0, 20] }, 'inCubic'],
    [8, { Pelvis: { r: [8, -18, 0] }, Torso: [26, -24, 0], ArmR: [-60, 0, -14], ForearmR: [-6, 0, 0], ArmL: [-30, 0, 20] }, 'outCubic'],
    [14, READY],
  ] },
];

export const ALL_CLIPS = [...HERO_CLIPS, ...NEW_CLIPS];
export const UPPER_JOINTS = new Set(['Torso', 'Head', 'ArmR', 'ForearmR', 'HandR', 'ArmL', 'ForearmL', 'HandL']);
