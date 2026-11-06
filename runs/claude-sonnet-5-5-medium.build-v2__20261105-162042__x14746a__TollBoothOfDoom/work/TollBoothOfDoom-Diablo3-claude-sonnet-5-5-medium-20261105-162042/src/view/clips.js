// New animations for the game, as ClipDefs on HERO_RIG, plus the full list used by every humanoid.
import { HERO_CLIPS, HERO_RIG, gaitClip } from '../../pixel-engine.js';

const K = (frame, pose, ease) => (ease ? [frame, pose, ease] : [frame, pose]);
const clip = (name, frames, keys, o = {}) => ({ name, frames, keys, fast: true, ...o });

export const NEW_CLIPS = [
  clip('BellOverhead', 22, [
    K(0, { Torso: [8, 0, 0], ArmR: [-60, 0, -20], ForearmR: [-60, 0, 0], ArmL: [-60, 0, 20], ForearmL: [-60, 0, 0] }, 'outCubic'),
    K(10, { Torso: [-14, 0, 0], ArmR: [-190, 0, -12], ForearmR: [-10, 0, 0], ArmL: [-190, 0, 12], ForearmL: [-10, 0, 0], Pelvis: { p: [0, 0.04, 0] } }, 'inCubic'),
    K(14, { Torso: [34, 0, 0], ArmR: [-60, 0, -10], ForearmR: [-20, 0, 0], ArmL: [-60, 0, 10], ForearmL: [-20, 0, 0], Pelvis: { p: [0, -0.12, 0] } }),
    K(22, { Torso: [10, 0, 0], ArmR: [-40, 0, -14], ForearmR: [-40, 0, 0], ArmL: [-40, 0, 14], ForearmL: [-40, 0, 0] }),
  ]),
  clip('LanternLob', 18, [
    K(0, { Torso: [-8, 14, 0], ArmR: [30, 0, -10], ForearmR: [-30, 0, 0] }, 'outCubic'),
    K(8, { Torso: [14, -16, 0], ArmR: [-110, 0, -8], ForearmR: [-14, 0, 0], Pelvis: { p: [0, -0.04, 0] } }),
    K(18, { Torso: [4, 0, 0], ArmR: [-50, 0, -10], ForearmR: [-40, 0, 0] }),
  ]),
  clip('ShovelSwat', 14, [
    K(0, { Torso: [-6, 18, 0], ArmR: [-120, 0, -16], ForearmR: [-40, 0, 0], ArmL: [-100, 0, 18], ForearmL: [-50, 0, 0] }, 'outCubic'),
    K(6, { Torso: [10, -26, 0], ArmR: [-70, 0, -10], ForearmR: [-10, 0, 0], ArmL: [-60, 0, 14], ForearmL: [-20, 0, 0] }),
    K(14, { Torso: [2, 0, 0], ArmR: [-50, 0, -10], ForearmR: [-40, 0, 0], ArmL: [-40, 0, 12], ForearmL: [-40, 0, 0] }),
  ]),
  clip('Dig', 24, [
    K(0, { Torso: [30, 0, 0], ArmR: [-70, 0, -10], ForearmR: [-50, 0, 0], ArmL: [-60, 0, 10], ForearmL: [-50, 0, 0], Pelvis: { p: [0, -0.18, 0] } }, 'outCubic'),
    K(8, { Torso: [44, 0, 0], ArmR: [-40, 0, -10], ForearmR: [-20, 0, 0], ArmL: [-30, 0, 10], ForearmL: [-20, 0, 0], Pelvis: { p: [0, -0.24, 0] } }),
    K(16, { Torso: [22, 0, 0], ArmR: [-100, 0, -10], ForearmR: [-30, 0, 0], ArmL: [-90, 0, 10], ForearmL: [-30, 0, 0], Pelvis: { p: [0, -0.1, 0] } }),
    K(24, { Torso: [4, 0, 0], ArmR: [-50, 0, -10], ForearmR: [-40, 0, 0], ArmL: [-40, 0, 10], ForearmL: [-40, 0, 0] }),
  ]),
  clip('RaiseHands', 24, [
    K(0, { Torso: [4, 0, 0], ArmR: [-20, 0, -20], ArmL: [-20, 0, 20] }, 'outCubic'),
    K(12, { Torso: [-10, 0, 0], ArmR: [-170, 0, -30], ForearmR: [-10, 0, 0], ArmL: [-170, 0, 30], ForearmL: [-10, 0, 0], Head: [-14, 0, 0] }),
    K(24, { Torso: [-4, 0, 0], ArmR: [-120, 0, -30], ForearmR: [-20, 0, 0], ArmL: [-120, 0, 30], ForearmL: [-20, 0, 0] }),
  ]),
  clip('Drink', 24, [
    K(0, { ArmR: [-30, 0, -10], ForearmR: [-40, 0, 0] }, 'outCubic'),
    K(10, { ArmR: [-80, 0, -20], ForearmR: [-130, 0, 0], Head: [-20, 0, 0] }),
    K(24, { ArmR: [-30, 0, -10], ForearmR: [-40, 0, 0] }),
  ], { fast: false }),
  clip('Revive', 30, [
    K(0, { Torso: [40, 0, 0], ArmR: [-50, 0, -10], ArmL: [-50, 0, 10], Pelvis: { p: [0, -0.3, 0] } }),
    K(15, { Torso: [50, 0, 0], ArmR: [-90, 0, -10], ArmL: [-90, 0, 10], Pelvis: { p: [0, -0.34, 0] } }),
    K(30, { Torso: [40, 0, 0], ArmR: [-50, 0, -10], ArmL: [-50, 0, 10], Pelvis: { p: [0, -0.3, 0] } }),
  ], { fast: false, loop: true }),
  clip('TalkGesture', 36, [
    K(0, { ArmR: [-40, 0, -14], ForearmR: [-60, 0, 0], Head: [0, 6, 0] }, 'inOutSine'),
    K(12, { ArmR: [-80, 0, -24], ForearmR: [-30, 0, 0], ArmL: [-30, 0, 14], Head: [-4, -8, 0] }, 'inOutSine'),
    K(24, { ArmR: [-50, 0, -12], ForearmR: [-70, 0, 0], ArmL: [-50, 0, 18], Head: [2, 6, 2] }, 'inOutSine'),
    K(36, { ArmR: [-40, 0, -14], ForearmR: [-60, 0, 0], Head: [0, 6, 0] }),
  ], { fast: false, loop: true }),
  clip('Interact', 16, [
    K(0, { Torso: [6, 0, 0], ArmR: [-40, 0, -10] }, 'outCubic'),
    K(8, { Torso: [20, 0, 0], ArmR: [-100, 0, -10], ForearmR: [-20, 0, 0] }),
    K(16, { Torso: [4, 0, 0], ArmR: [-40, 0, -10] }),
  ]),
  clip('Lurch', 20, [
    K(0, { Torso: [14, 0, 0], ArmR: [-50, 0, -10], ArmL: [-50, 0, 10] }, 'outCubic'),
    K(8, { Torso: [-18, 0, 0], ArmR: [-150, 0, -20], ArmL: [-150, 0, 20] }, 'inCubic'),
    K(12, { Torso: [36, 0, 0], ArmR: [-70, 0, -10], ArmL: [-70, 0, 10] }),
    K(20, { Torso: [14, 0, 0], ArmR: [-50, 0, -10], ArmL: [-50, 0, 10] }),
  ]),
  clip('Lunge', 14, [
    K(0, { Torso: [-10, 0, 0], ArmR: [-140, 0, -10] }, 'outCubic'),
    K(6, { Torso: [34, 0, 0], ArmR: [-80, 0, -4], ForearmR: [-6, 0, 0], Pelvis: { p: [0, -0.1, 0.1] } }),
    K(14, { Torso: [10, 0, 0], ArmR: [-50, 0, -10] }),
  ]),
  clip('CoffinSlam', 28, [
    K(0, { Torso: [-6, 0, 0], ArmR: [-190, 0, -20], ArmL: [-190, 0, 20], ForearmR: [-5, 0, 0], ForearmL: [-5, 0, 0] }, 'inCubic'),
    K(14, { Torso: [-16, 0, 0], ArmR: [-195, 0, -22], ArmL: [-195, 0, 22] }, 'inCubic'),
    K(18, { Torso: [44, 0, 0], ArmR: [-60, 0, -10], ArmL: [-60, 0, 10], Pelvis: { p: [0, -0.2, 0] } }),
    K(28, { Torso: [12, 0, 0], ArmR: [-50, 0, -10], ArmL: [-50, 0, 10] }),
  ]),
  clip('Swell', 30, [
    K(0, { Pelvis: { s: [1, 1, 1] } }, 'inOutSine'),
    K(30, { Pelvis: { s: [1.25, 1.2, 1.25] }, ArmR: [-20, 0, -40], ArmL: [-20, 0, 40] }),
  ], { fast: false }),
  clip('RopeLash', 20, [
    K(0, { Torso: [-10, -24, 0], ArmR: [-160, 0, -20], ArmL: [-40, 0, 20] }, 'outCubic'),
    K(8, { Torso: [22, 28, 0], ArmR: [-70, 0, -10], ArmL: [-70, 0, 10] }),
    K(20, { Torso: [4, 0, 0], ArmR: [-50, 0, -10], ArmL: [-40, 0, 10] }),
  ]),
  gaitClip(HERO_RIG, { name: 'Shamble', frames: 28, speed: 1.4, stance: 0.62, reach: 0.12, bounce: 0.02, armSwing: 8 }),
];

export const ALL_CLIPS = [...HERO_CLIPS, ...NEW_CLIPS];
