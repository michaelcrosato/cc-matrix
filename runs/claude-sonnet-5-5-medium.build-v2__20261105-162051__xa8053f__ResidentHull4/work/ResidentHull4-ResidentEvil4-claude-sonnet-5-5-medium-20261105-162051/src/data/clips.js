// New animation clips as ClipDef data on the hero rig, plus gait cycles. Joint pose = [x, y, z] degrees.
// Arm X: -90 straight ahead, -180 overhead, +40 back. Leg X: negative lifts forward. Shin X: positive bends the knee.
import { gaitClip, HERO_RIG } from '../../pixel-engine.js';

const clip = (name, frames, keys, o = {}) => ({ name, frames, keys, grounded: true, fast: true, ...o });
const REST_LEGS = { LegR: [-8, 0, 0], ShinR: [14, 0, 0], FootR: [-6, 0, 0], LegL: [-8, 0, 0], ShinL: [14, 0, 0], FootL: [-6, 0, 0] };
const pose = (o) => ({ ...o });

// Pistol aim: right arm extended, left hand supports. Upper body only (masked in play).
const AIM_P = { Torso: [2, 0, 0], Head: [-2, 0, 0], ArmR: [-86, 0, -4], ForearmR: [-6, 0, 0], HandR: [0, 0, 0], ArmL: [-70, 0, 26], ForearmL: [-52, 0, 0], HandL: [0, 0, 0] };
const AIM_L = { Torso: [2, 8, 0], Head: [-2, -6, 0], ArmR: [-78, 0, -10], ForearmR: [-48, 0, 0], HandR: [0, 0, 0], ArmL: [-88, 0, 22], ForearmL: [-18, 0, 0], HandL: [0, 0, 0] };

export const NEW_CLIPS = [
  clip('AimPistol', 8, [[0, pose({ ...AIM_P, ...REST_LEGS }), null], [8, pose({ ...AIM_P, Torso: [3, 0, 0], ...REST_LEGS }), null]], { loop: true }),
  clip('AimLong', 8, [[0, pose({ ...AIM_L, ...REST_LEGS }), null], [8, pose({ ...AIM_L, Torso: [3, 8, 0], ...REST_LEGS }), null]], { loop: true }),
  clip('FirePistol', 6, [[0, pose({ ...AIM_P, ArmR: [-92, 0, -4], Torso: [-3, 0, 0] }), 'outQuad'], [6, pose(AIM_P), null]]),
  clip('FireLong', 8, [[0, pose({ ...AIM_L, ArmR: [-84, 0, -10], ArmL: [-94, 0, 22], Torso: [-6, 8, 0] }), 'outQuad'], [8, pose(AIM_L), null]]),
  clip('ReloadPistol', 40, [
    [0, pose(AIM_P), 'inOutQuad'], [10, pose({ ...AIM_P, ArmR: [-50, 0, -10], ForearmR: [-60, 0, 0], ArmL: [-40, 0, 25], ForearmL: [-95, 0, 0], Head: [18, 0, 0] }), 'inOutQuad'],
    [24, pose({ ...AIM_P, ArmR: [-50, 0, -10], ForearmR: [-60, 0, 0], ArmL: [-30, 0, 20], ForearmL: [-110, 0, 0], Head: [18, 0, 0] }), 'inOutQuad'], [40, pose(AIM_P), null]]),
  clip('ReloadLong', 60, [
    [0, pose(AIM_L), 'inOutQuad'], [14, pose({ ...AIM_L, ArmR: [-45, 0, -10], ForearmR: [-70, 0, 0], ArmL: [-60, 0, 30], ForearmL: [-40, 0, 0], Head: [16, 0, 0] }), 'inOutQuad'],
    [30, pose({ ...AIM_L, ArmR: [-45, 0, -10], ForearmR: [-70, 0, 0], ArmL: [-50, 0, 20], ForearmL: [-90, 0, 0], Head: [16, 0, 0] }), 'inOutQuad'],
    [46, pose({ ...AIM_L, ArmR: [-45, 0, -10], ForearmR: [-70, 0, 0], ArmL: [-62, 0, 30], ForearmL: [-40, 0, 0], Head: [16, 0, 0] }), 'inOutQuad'], [60, pose(AIM_L), null]]),
  clip('Roundhouse', 22, [
    [0, pose({ Pelvis: { r: [0, 0, 0], p: [0, -0.05, 0], s: 1 }, Torso: [4, 0, 0], ArmR: [-60, 0, -30], ArmL: [-60, 0, 30], ForearmR: [-60, 0, 0], ForearmL: [-60, 0, 0] }), 'outQuad'],
    [7, pose({ Pelvis: { r: [0, -90, 0], p: [0, -0.07, 0], s: 1 }, Torso: [-12, 0, 0], ArmR: [-20, 0, -70], ArmL: [-20, 0, 70], LegR: [-95, 0, -4], ShinR: [4, 0, 0], FootR: [30, 0, 0], LegL: [-15, 0, 0], ShinL: [30, 0, 0] }), 'linear'],
    [12, pose({ Pelvis: { r: [0, -250, 0], p: [0, -0.07, 0], s: 1 }, Torso: [-14, 0, 0], ArmR: [-20, 0, -70], ArmL: [-20, 0, 70], LegR: [-98, 0, -4], ShinR: [4, 0, 0], FootR: [30, 0, 0], LegL: [-15, 0, 0], ShinL: [30, 0, 0] }), 'outQuad'],
    [22, pose({ Pelvis: { r: [0, -360, 0], p: [0, -0.03, 0], s: 1 }, Torso: [4, 0, 0], ...REST_LEGS }), null]], { fast: true }),
  clip('HipThrow', 24, [
    [0, pose({ Torso: [10, 0, 0], ArmR: [-60, 0, -10], ArmL: [-60, 0, 10], ForearmR: [-40, 0, 0], ForearmL: [-40, 0, 0] }), 'inOutQuad'],
    [10, pose({ Pelvis: { r: [0, 40, 0], p: [0, -0.1, 0], s: 1 }, Torso: [30, -30, 0], ArmR: [-100, 0, -30], ArmL: [-100, 0, 30], ForearmR: [-30, 0, 0], ForearmL: [-30, 0, 0] }), 'outCubic'],
    [18, pose({ Pelvis: { r: [0, -30, 0], p: [0, -0.04, 0], s: 1 }, Torso: [-5, 40, 0], ArmR: [-20, 0, -40], ArmL: [-20, 0, 40] }), 'inOutQuad'], [24, pose({ Torso: [4, 0, 0] }), null]]),
  clip('KnifeSlash', 12, [
    [0, pose({ ArmR: [-150, 0, -20], ForearmR: [-40, 0, 0], Torso: [-6, 20, 0] }), 'outQuad'], [5, pose({ ArmR: [-70, 0, -30], ForearmR: [-5, 0, 0], Torso: [8, -30, 0] }), 'outQuad'], [12, pose({ ArmR: [-60, 0, -10], ForearmR: [-40, 0, 0], Torso: [2, 0, 0] }), null]]),
  clip('DoorKick', 16, [
    [0, pose({ Torso: [6, 0, 0], ArmR: [-50, 0, -30], ArmL: [-50, 0, 30] }), 'outQuad'], [5, pose({ Pelvis: { r: [0, 0, 0], p: [0, -0.08, 0], s: 1 }, Torso: [-14, 0, 0], LegR: [-90, 0, 0], ShinR: [10, 0, 0], FootR: [-40, 0, 0], ArmR: [-30, 0, -60], ArmL: [-30, 0, 60] }), 'outCubic'], [16, pose({ Torso: [3, 0, 0], ...REST_LEGS }), null]]),
  clip('Vault', 22, [
    [0, pose({ Torso: [10, 0, 0], ArmR: [-90, 0, -10], ArmL: [-90, 0, 10] }), 'outQuad'],
    [8, pose({ Pelvis: { r: [18, 0, 0], p: [0, 0.35, 0], s: 1 }, Torso: [20, 0, 0], ArmR: [-130, 0, -10], ArmL: [-130, 0, 10], LegR: [-70, 0, 0], ShinR: [80, 0, 0], LegL: [-20, 0, 0], ShinL: [60, 0, 0] }), 'inOutQuad'],
    [16, pose({ Pelvis: { r: [4, 0, 0], p: [0, 0.2, 0], s: 1 }, Torso: [4, 0, 0], LegR: [-30, 0, 0], ShinR: [30, 0, 0], LegL: [-60, 0, 0], ShinL: [70, 0, 0] }), 'inOutQuad'], [22, pose({ Torso: [2, 0, 0], ...REST_LEGS }), null]]),
  clip('QuickTurn', 10, [[0, pose({ Pelvis: { r: [0, 0, 0], p: [0, -0.03, 0], s: 1 }, Torso: [6, 0, 0] }), 'outQuad'], [10, pose({ Pelvis: { r: [0, 0, 0], p: [0, 0, 0], s: 1 }, Torso: [2, 0, 0] }), null]]),
  clip('Throw', 16, [
    [0, pose({ ArmR: [-170, 0, -20], ForearmR: [-60, 0, 0], Torso: [-10, 25, 0] }), 'outQuad'], [6, pose({ ArmR: [-90, 0, -10], ForearmR: [-5, 0, 0], Torso: [10, -25, 0] }), 'outQuad'], [16, pose({ ArmR: [-50, 0, -10], Torso: [2, 0, 0] }), null]]),
  clip('Boost', 24, [
    [0, pose({ Pelvis: { r: [0, 0, 0], p: [0, -0.18, 0], s: 1 }, Torso: [25, 0, 0], ArmR: [-70, 0, -10], ArmL: [-70, 0, 10], LegR: [-60, 0, 0], ShinR: [100, 0, 0], LegL: [-60, 0, 0], ShinL: [100, 0, 0] }), 'outQuad'],
    [10, pose({ Pelvis: { r: [0, 0, 0], p: [0, 0, 0], s: 1 }, Torso: [-5, 0, 0], ArmR: [-170, 0, -10], ArmL: [-170, 0, 10], ...REST_LEGS }), 'inOutQuad'], [24, pose({ Torso: [0, 0, 0], ...REST_LEGS }), null]]),
  clip('Stagger', 18, [
    [0, pose({ Pelvis: { r: [-14, 0, 0], p: [0, -0.04, 0], s: 1 }, Torso: [-10, 0, 8], Head: [10, 0, 6], ArmR: [-30, 0, -50], ArmL: [-30, 0, 50] }), 'outQuad'], [18, pose({ Torso: [4, 0, 0], ...REST_LEGS }), null]]),
  clip('KnockedDown', 40, [
    [0, pose({ Pelvis: { r: [-20, 0, 0], p: [0, -0.1, 0], s: 1 }, Torso: [-20, 0, 0] }), 'outQuad'], [10, pose({ Pelvis: { r: [-88, 0, 0], p: [0, -0.5, -0.1], s: 1 }, Torso: [-10, 0, 0], ArmR: [10, 0, -50], ArmL: [10, 0, 50] }), 'outQuad'], [40, pose({ Pelvis: { r: [-88, 0, 0], p: [0, -0.5, -0.1], s: 1 }, Torso: [-10, 0, 0], ArmR: [10, 0, -50], ArmL: [10, 0, 50] }), null]], { grounded: false }),
  clip('StampForm', 30, [[0, pose({ ArmR: [-160, 0, -10], ForearmR: [-30, 0, 0] }), 'inQuad'], [14, pose({ ArmR: [-60, 0, -10], ForearmR: [-10, 0, 0], Torso: [14, 0, 0] }), 'outBack'], [30, pose({ ArmR: [-60, 0, -10], ForearmR: [-10, 0, 0], Torso: [14, 0, 0] }), null]]),
  // islanders and company
  clip('WorkChop', 40, [[0, pose({ ArmR: [-160, 0, -10], ArmL: [-150, 0, 10], ForearmR: [-30, 0, 0], ForearmL: [-30, 0, 0], Torso: [-10, 0, 0] }), 'inQuad'], [16, pose({ ArmR: [-60, 0, -10], ArmL: [-50, 0, 10], ForearmR: [-10, 0, 0], ForearmL: [-10, 0, 0], Torso: [28, 0, 0] }), 'outQuad'], [40, pose({ ArmR: [-160, 0, -10], ArmL: [-150, 0, 10], ForearmR: [-30, 0, 0], ForearmL: [-30, 0, 0], Torso: [-10, 0, 0] }), null]], { loop: true, fast: false }),
  clip('WorkMend', 60, [[0, pose({ Torso: [22, 0, 0], Head: [20, 0, 0], ArmR: [-60, 0, -10], ArmL: [-60, 0, 10], ForearmR: [-70, 0, 0], ForearmL: [-70, 0, 0] }), 'inOutSine'], [30, pose({ Torso: [26, 0, 0], Head: [24, 0, 0], ArmR: [-70, 0, -10], ArmL: [-50, 0, 10], ForearmR: [-50, 0, 0], ForearmL: [-80, 0, 0] }), 'inOutSine'], [60, pose({ Torso: [22, 0, 0], Head: [20, 0, 0], ArmR: [-60, 0, -10], ArmL: [-60, 0, 10], ForearmR: [-70, 0, 0], ForearmL: [-70, 0, 0] }), null]], { loop: true, fast: false }),
  clip('RaiseTool', 20, [[0, pose({ Torso: [4, 0, 0] }), 'outQuad'], [20, pose({ Torso: [-14, 0, 0], ArmR: [-165, 0, -15], ForearmR: [-50, 0, 0], ArmL: [-40, 0, 20] }), null]]),
  clip('Swing', 14, [[0, pose({ Torso: [-14, 0, 0], ArmR: [-165, 0, -15], ForearmR: [-50, 0, 0] }), 'inQuad'], [5, pose({ Torso: [24, 0, 0], ArmR: [-60, 0, -15], ForearmR: [-5, 0, 0] }), 'outQuad'], [14, pose({ Torso: [12, 0, 0], ArmR: [-50, 0, -15], ForearmR: [-20, 0, 0] }), null]]),
  clip('ThrowOverhand', 18, [[0, pose({ ArmR: [-170, 0, -20], ForearmR: [-70, 0, 0], Torso: [-12, 25, 0] }), 'outQuad'], [7, pose({ ArmR: [-80, 0, -10], ForearmR: [-5, 0, 0], Torso: [14, -25, 0] }), 'outQuad'], [18, pose({ ArmR: [-50, 0, -10], Torso: [4, 0, 0] }), null]]),
  clip('StunHands', 20, [[0, pose({ Torso: [14, 0, 0], Head: [14, 0, 0], ArmR: [-120, 0, -20], ArmL: [-120, 0, 20], ForearmR: [-120, 0, 0], ForearmL: [-120, 0, 0] }), 'inOutSine'], [10, pose({ Torso: [18, 0, 0], Head: [18, 0, 0], ArmR: [-124, 0, -20], ArmL: [-124, 0, 20], ForearmR: [-124, 0, 0], ForearmL: [-124, 0, 0] }), 'inOutSine'], [20, pose({ Torso: [14, 0, 0], Head: [14, 0, 0], ArmR: [-120, 0, -20], ArmL: [-120, 0, 20], ForearmR: [-120, 0, 0], ForearmL: [-120, 0, 0] }), null]], { loop: true }),
  clip('KneelHit', 24, [[0, pose({ Pelvis: { r: [10, 0, 0], p: [0, -0.3, 0], s: 1 }, Torso: [20, 0, 0], Head: [12, 0, 0], LegR: [-80, 0, 0], ShinR: [120, 0, 0], LegL: [-20, 0, 0], ShinL: [140, 0, 0], ArmR: [-20, 0, -20], ArmL: [-20, 0, 20] }), 'outQuad'], [24, pose({ Pelvis: { r: [10, 0, 0], p: [0, -0.32, 0], s: 1 }, Torso: [24, 0, 0], Head: [14, 0, 0], LegR: [-80, 0, 0], ShinR: [120, 0, 0], LegL: [-20, 0, 0], ShinL: [140, 0, 0], ArmR: [-20, 0, -20], ArmL: [-20, 0, 20] }), null]], { loop: true, grounded: false }),
  clip('BashDoor', 24, [[0, pose({ Torso: [-8, 0, 0] }), 'inQuad'], [8, pose({ Torso: [28, 0, 0], ArmR: [-90, 0, -10], ArmL: [-90, 0, 10] }), 'outQuad'], [24, pose({ Torso: [-8, 0, 0] }), null]], { loop: true }),
  clip('ClimbIn', 24, [[0, pose({ Torso: [10, 0, 0], ArmR: [-150, 0, -10], ArmL: [-100, 0, 10], LegR: [-60, 0, 0], ShinR: [90, 0, 0] }), 'inOutSine'], [12, pose({ Torso: [10, 0, 0], ArmR: [-100, 0, -10], ArmL: [-150, 0, 10], LegL: [-60, 0, 0], ShinL: [90, 0, 0] }), 'inOutSine'], [24, pose({ Torso: [10, 0, 0], ArmR: [-150, 0, -10], ArmL: [-100, 0, 10], LegR: [-60, 0, 0], ShinR: [90, 0, 0] }), null]], { loop: true }),
  clip('WalkToSea', 20, [[0, pose({ Torso: [8, 0, 0], Head: [6, 0, 0], ArmR: [10, 0, -6], ArmL: [10, 0, 6], ForearmR: [-6, 0, 0], ForearmL: [-6, 0, 0] }), 'inOutSine'], [20, pose({ Torso: [10, 0, 0], Head: [8, 0, 0], ArmR: [12, 0, -6], ArmL: [12, 0, 6], ForearmR: [-6, 0, 0], ForearmL: [-6, 0, 0] }), null]], { loop: true, fast: false }),
  clip('SawRev', 20, [[0, pose({ Torso: [14, 0, 0], ArmR: [-80, 0, -10], ArmL: [-70, 0, 20], ForearmR: [-30, 0, 0], ForearmL: [-30, 0, 0] }), 'inOutSine'], [10, pose({ Torso: [16, 3, 0], ArmR: [-82, 0, -10], ArmL: [-72, 0, 20] }), 'inOutSine'], [20, pose({ Torso: [14, 0, 0], ArmR: [-80, 0, -10], ArmL: [-70, 0, 20], ForearmR: [-30, 0, 0], ForearmL: [-30, 0, 0] }), null]], { loop: true }),
  clip('SawSwing', 20, [[0, pose({ Torso: [-6, 40, 0], ArmR: [-140, 0, -30], ArmL: [-100, 0, 10], ForearmR: [-30, 0, 0] }), 'inQuad'], [8, pose({ Torso: [18, -50, 0], ArmR: [-70, 0, -20], ArmL: [-70, 0, 20] }), 'outQuad'], [20, pose({ Torso: [14, 0, 0], ArmR: [-80, 0, -10] }), null]]),
  clip('SawLunge', 16, [[0, pose({ Torso: [26, 0, 0], ArmR: [-80, 0, -10], ArmL: [-70, 0, 20], LegR: [-50, 0, 0], ShinR: [40, 0, 0], LegL: [20, 0, 0] }), 'outQuad'], [16, pose({ Torso: [30, 0, 0], ArmR: [-82, 0, -10], ArmL: [-72, 0, 20], LegR: [-60, 0, 0], ShinR: [30, 0, 0], LegL: [30, 0, 0] }), null]], { loop: true }),
  clip('ShieldBlock', 12, [[0, pose({ ArmL: [-85, 0, 20], ForearmL: [-60, 0, 0], Torso: [4, 0, 0] }), 'inOutSine'], [12, pose({ ArmL: [-85, 0, 20], ForearmL: [-60, 0, 0], Torso: [6, 0, 0] }), null]], { loop: true }),
  clip('FlailSpin', 20, [[0, pose({ ArmR: [-170, 0, -20], Torso: [0, 0, 0] }), 'linear'], [10, pose({ ArmR: [-170, 0, -20], Torso: [0, 180, 0] }), 'linear'], [20, pose({ ArmR: [-170, 0, -20], Torso: [0, 360, 0] }), null]]),
  clip('HalberdSweep', 30, [[0, pose({ Torso: [-6, 60, 0], ArmR: [-110, 0, -20], ArmL: [-100, 0, 20] }), 'inQuad'], [14, pose({ Torso: [14, -70, 0], ArmR: [-80, 0, -20], ArmL: [-80, 0, 20] }), 'outQuad'], [30, pose({ Torso: [4, 0, 0], ArmR: [-80, 0, -20] }), null]]),
  clip('DrownedRise', 40, [[0, pose({ Pelvis: { r: [-80, 0, 0], p: [0, -0.6, 0], s: 1 }, Torso: [10, 0, 0], Head: [20, 0, 0], ArmR: [-120, 0, -20], ArmL: [-120, 0, 20] }), 'outQuad'], [40, pose({ Torso: [10, 0, 0], Head: [6, 0, 0], ...REST_LEGS }), null]], { grounded: false }),
  clip('CarrierShoulder', 24, [[0, pose({ Torso: [20, 0, 0], ArmR: [-80, 0, -20], ArmL: [-80, 0, 20] }), 'outQuad'], [24, pose({ Torso: [14, 0, 0], ArmR: [-150, 0, -20], ArmL: [-150, 0, 20], ForearmR: [-30, 0, 0], ForearmL: [-30, 0, 0] }), null]]),
  clip('DameCane', 18, [[0, pose({ ArmR: [-150, 0, -10], ForearmR: [-40, 0, 0], Torso: [-6, 20, 0] }), 'inQuad'], [6, pose({ ArmR: [-70, 0, -10], ForearmR: [-5, 0, 0], Torso: [10, -20, 0] }), 'outQuad'], [18, pose({ ArmR: [-40, 0, -10], Torso: [2, 0, 0] }), null]]),
  clip('DameBarrelIn', 30, [[0, pose({ Torso: [6, 0, 0] }), 'inOutQuad'], [14, pose({ Pelvis: { r: [0, 0, 0], p: [0, 0.4, 0], s: 1 }, Torso: [28, 0, 0], ArmR: [-120, 0, -10], ArmL: [-120, 0, 10], LegR: [-90, 0, 0], ShinR: [80, 0, 0] }), 'inOutQuad'], [30, pose({ Pelvis: { r: [0, 0, 0], p: [0, -0.35, 0], s: 1 }, Torso: [20, 0, 0], LegR: [-80, 0, 0], ShinR: [120, 0, 0], LegL: [-80, 0, 0], ShinL: [120, 0, 0] }), null]], { grounded: false }),
  clip('DameHoist', 24, [[0, pose({ ArmR: [-170, 0, -10], ArmL: [-170, 0, 10], Torso: [-6, 0, 0] }), 'inOutSine'], [24, pose({ ArmR: [-176, 0, -10], ArmL: [-176, 0, 10], Torso: [-8, 0, 0] }), null]], { loop: true }),
  clip('FathomIdle', 60, [[0, pose({ Torso: [4, 0, 0], ArmR: [10, 0, -12], ArmL: [-60, 0, 20], ForearmL: [-60, 0, 0], Head: [-4, 0, 0] }), 'inOutSine'], [20, pose({ Torso: [7, 0, 0], ArmR: [-110, 0, -10], ForearmR: [-120, 0, 0], ArmL: [-60, 0, 20], ForearmL: [-60, 0, 0], Head: [-6, 0, 3] }), 'inOutSine'], [30, pose({ Torso: [6, 0, 0], ArmR: [-120, 0, -10], ForearmR: [-130, 0, 0], ArmL: [-60, 0, 20], ForearmL: [-60, 0, 0], Head: [-6, 0, 3] }), 'inOutSine'], [60, pose({ Torso: [4, 0, 0], ArmR: [10, 0, -12], ArmL: [-60, 0, 20], ForearmL: [-60, 0, 0], Head: [-4, 0, 0] }), null]], { loop: true, fast: false }),
  clip('FathomPresent', 30, [[0, pose({ ArmR: [-70, 0, -60], ArmL: [-70, 0, 60], ForearmR: [-20, 0, 0], ForearmL: [-20, 0, 0], Torso: [2, 0, 0] }), 'inOutSine'], [30, pose({ ArmR: [-76, 0, -64], ArmL: [-76, 0, 64], ForearmR: [-20, 0, 0], ForearmL: [-20, 0, 0], Torso: [4, 0, 0] }), null]], { loop: true, fast: false }),
  clip('AnsgarHook', 30, [[0, pose({ Torso: [-8, 30, 0], ArmR: [-150, 0, -20] }), 'inQuad'], [12, pose({ Torso: [22, -40, 0], ArmR: [-70, 0, -20] }), 'outQuad'], [30, pose({ Torso: [4, 0, 0] }), null]]),
  clip('BosunDrag', 40, [[0, pose({ Torso: [20, 0, 0], ArmR: [-30, 0, -20], Head: [10, 0, 0] }), 'inOutSine'], [40, pose({ Torso: [24, 0, 0], ArmR: [-24, 0, -20], Head: [12, 0, 0] }), null]], { loop: true, fast: false }),
  clip('BosunSweep', 40, [[0, pose({ Torso: [-8, 70, 0], ArmR: [-120, 0, -30] }), 'inQuad'], [14, pose({ Torso: [-8, 70, 0], ArmR: [-120, 0, -30] }), 'outQuad'], [24, pose({ Torso: [18, -90, 0], ArmR: [-80, 0, -30] }), 'outQuad'], [40, pose({ Torso: [10, 0, 0], ArmR: [-40, 0, -20] }), null]]),
  clip('BosunThrow', 36, [[0, pose({ Torso: [-14, 20, 0], ArmR: [-175, 0, -20] }), 'inQuad'], [20, pose({ Torso: [-14, 20, 0], ArmR: [-175, 0, -20] }), 'outQuad'], [26, pose({ Torso: [28, -10, 0], ArmR: [-70, 0, -20] }), 'outQuad'], [36, pose({ Torso: [16, 0, 0], ArmR: [-40, 0, -20] }), null]]),
  clip('BosunStomp', 30, [[0, pose({ LegR: [-100, 0, 0], ShinR: [90, 0, 0], Torso: [-10, 0, 0], ArmR: [-100, 0, -40], ArmL: [-100, 0, 40] }), 'inQuad'], [14, pose({ LegR: [-100, 0, 0], ShinR: [90, 0, 0], Torso: [-10, 0, 0], ArmR: [-100, 0, -40], ArmL: [-100, 0, 40] }), 'outCubic'], [18, pose({ Pelvis: { r: [0, 0, 0], p: [0, -0.1, 0], s: 1 }, Torso: [20, 0, 0], ...REST_LEGS }), 'outQuad'], [30, pose({ Torso: [10, 0, 0], ...REST_LEGS }), null]]),
  clip('BosunKneel', 30, [[0, pose({ Pelvis: { r: [10, 0, 0], p: [0, -0.35, 0], s: 1 }, Torso: [34, 0, 0], Head: [18, 0, 0], LegR: [-85, 0, 0], ShinR: [120, 0, 0], LegL: [-20, 0, 0], ShinL: [140, 0, 0], ArmR: [-10, 0, -20], ArmL: [-10, 0, 20] }), 'outQuad'], [30, pose({ Pelvis: { r: [10, 0, 0], p: [0, -0.37, 0], s: 1 }, Torso: [38, 0, 0], Head: [20, 0, 0], LegR: [-85, 0, 0], ShinR: [120, 0, 0], LegL: [-20, 0, 0], ShinL: [140, 0, 0], ArmR: [-10, 0, -20], ArmL: [-10, 0, 20] }), null]], { loop: true, grounded: false }),
  clip('BosunRoar', 40, [[0, pose({ Torso: [-24, 0, 0], Head: [-30, 0, 0], ArmR: [-120, 0, -50], ArmL: [-120, 0, 50] }), 'outQuad'], [40, pose({ Torso: [-28, 0, 0], Head: [-34, 0, 0], ArmR: [-130, 0, -54], ArmL: [-130, 0, 54] }), null]]),
  clip('BathyWalk', 24, [[0, pose({ Torso: [4, 0, 4], LegR: [-30, 0, 0], ShinR: [20, 0, 0], LegL: [10, 0, 0], Pelvis: { r: [0, 0, 0], p: [0, 0, 0], s: 1 } }), 'inOutSine'], [12, pose({ Torso: [4, 0, -4], LegR: [10, 0, 0], LegL: [-30, 0, 0], ShinL: [20, 0, 0], Pelvis: { r: [0, 0, 0], p: [0, 0.04, 0], s: 1 } }), 'inOutSine'], [24, pose({ Torso: [4, 0, 4], LegR: [-30, 0, 0], ShinR: [20, 0, 0], LegL: [10, 0, 0], Pelvis: { r: [0, 0, 0], p: [0, 0, 0], s: 1 } }), null]], { loop: true, fast: false }),
  clip('BathySag', 40, [[0, pose({ Torso: [20, 0, 0], Pelvis: { r: [0, 0, 0], p: [0, -0.2, 0], s: 1 }, LegR: [-30, 0, 0], ShinR: [60, 0, 0], LegL: [-30, 0, 0], ShinL: [60, 0, 0] }), 'inOutSine'], [40, pose({ Torso: [24, 0, 0], Pelvis: { r: [0, 0, 0], p: [0, -0.22, 0], s: 1 }, LegR: [-30, 0, 0], ShinR: [60, 0, 0], LegL: [-30, 0, 0], ShinL: [60, 0, 0] }), null]], { loop: true, grounded: false }),
  clip('BathyCharge', 20, [[0, pose({ Torso: [30, 0, 0], LegR: [-50, 0, 0], ShinR: [50, 0, 0], LegL: [20, 0, 0] }), 'inOutSine'], [10, pose({ Torso: [32, 0, 0], LegR: [20, 0, 0], LegL: [-50, 0, 0], ShinL: [50, 0, 0] }), 'inOutSine'], [20, pose({ Torso: [30, 0, 0], LegR: [-50, 0, 0], ShinR: [50, 0, 0], LegL: [20, 0, 0] }), null]], { loop: true }),
  clip('MotherSpit', 30, [[0, pose({ Torso: [-6, 0, 0] }), 'inQuad'], [14, pose({ Torso: [-26, 0, 0] }), 'outQuad'], [22, pose({ Torso: [14, 0, 0] }), 'outQuad'], [30, pose({ Torso: [0, 0, 0] }), null]]),
  clip('Wade', 30, [[0, pose({ Pelvis: { r: [0, 0, 0], p: [0, -0.1, 0], s: 1 }, Torso: [8, 0, 0], ArmR: [10, 0, -10], ArmL: [10, 0, 10] }), 'inOutSine'], [30, pose({ Pelvis: { r: [0, 0, 0], p: [0, -0.14, 0], s: 1 }, Torso: [10, 0, 0], ArmR: [12, 0, -10], ArmL: [12, 0, 10] }), null]], { loop: true, grounded: false, fast: false }),
  clip('IdleGun', 40, [[0, pose({ Torso: [4, 0, 0], ArmR: [-40, 0, -8], ForearmR: [-50, 0, 0], ArmL: [-30, 0, 12], ForearmL: [-50, 0, 0] }), 'inOutSine'], [40, pose({ Torso: [5, 0, 0], ArmR: [-42, 0, -8], ForearmR: [-52, 0, 0], ArmL: [-32, 0, 12], ForearmL: [-52, 0, 0] }), null]], { loop: true, fast: false }),
];

export const GAITS = [
  { name: 'Shamble', frames: 40, speed: 1.1, stance: 0.62, hip: -0.05, bob: 0.02, lift: 0.04, lean: 16, sway: 7, head: 8, arms: { swing: 8, elbow: 30 } },
  { name: 'Lurch', frames: 20, speed: 2.8, stance: 0.4, hip: -0.08, bob: 0.04, lift: 0.1, lean: 22, sway: 8, head: 8, arms: { swing: 30, elbow: 40 } },
  { name: 'KnightWalk', frames: 48, speed: 0.9, stance: 0.66, hip: -0.06, bob: 0.015, lift: 0.05, lean: 8, sway: 5, head: 3, arms: { swing: 6, elbow: 20 } },
  { name: 'ShieldWalk', frames: 40, speed: 1.3, stance: 0.62, hip: -0.05, bob: 0.02, lift: 0.04, lean: 10, sway: 5, head: 4, arms: { swing: 4, elbow: 30 } },
  { name: 'DameWalk', frames: 20, speed: 2.4, stance: 0.55, hip: -0.02, bob: 0.015, lift: 0.04, lean: 4, sway: 3, head: 2, arms: { swing: 8, elbow: 28 } },
  { name: 'CarrierWalk', frames: 36, speed: 1.6, stance: 0.6, hip: -0.07, bob: 0.02, lift: 0.05, lean: 14, sway: 6, head: 4, arms: { swing: 4, elbow: 50 } },
  { name: 'MaxJog', frames: 14, speed: 4.8, stance: 0.4, hip: -0.06, bob: 0.03, lift: 0.1, lean: 12, sway: 4, head: 3, arms: { swing: 28, elbow: 60 } },
];
const ALL_JOINTS = ['Pelvis', 'Torso', 'Head', 'ArmR', 'ForearmR', 'HandR', 'ArmL', 'ForearmL', 'HandL', 'LegR', 'ShinR', 'FootR', 'LegL', 'ShinL', 'FootL'];
/** A clip must pose every joint in every key (a missing joint gives NaN): fill the rest with zeros. */
function complete(c) { return { ...c, keys: c.keys.map(([f, pose, e]) => { const full = { ...pose }; for (const j of ALL_JOINTS) if (!(j in full)) full[j] = [0, 0, 0]; const em = { inQuad: 'in', inCubic: 'in', outQuad: 'out', outCubic: 'out', outBack: 'out', inOutQuad: 'inOut', inOutSine: 'inOut', linear: null }; return [f, full, e == null ? null : (e in em ? em[e] : e)]; }) }; }
export function allClipDefs(hero) {
  return [...hero, ...NEW_CLIPS.map(complete), ...GAITS.map((g) => gaitClip(HERO_RIG, g))];
}
