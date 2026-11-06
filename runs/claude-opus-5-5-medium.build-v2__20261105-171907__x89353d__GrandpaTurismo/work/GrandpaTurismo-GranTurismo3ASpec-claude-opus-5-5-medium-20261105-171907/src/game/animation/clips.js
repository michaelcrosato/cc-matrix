// New clips as ClipDef data, on the engine's hero rig. Faces +Z; arms: X -90 ahead, -180 overhead; Z spreads.
const stand = { LegR: [0, 0, 0], ShinR: [0, 0, 0], FootR: [0, 0, 0], LegL: [0, 0, 0], ShinL: [0, 0, 0], FootL: [0, 0, 0] };
const crouch = { LegR: [-70, 0, 0], ShinR: [110, 0, 0], FootR: [-40, 0, 0], LegL: [-40, 0, 0], ShinL: [100, 0, 0], FootL: [-60, 0, 0] };
const P = (y, r = [0, 0, 0]) => ({ r, p: [0, y, 0], s: 1 });
const k = (f, pose) => [f, pose];
export const GAME_CLIPS = [
  { name: 'PitJack', frames: 40, loop: true, keys: [
    k(0, { Pelvis: P(-0.28, [20, 0, 0]), Torso: [20, 0, 0], Head: [-20, 0, 0], ...crouch, ArmR: [-60, 0, -10], ForearmR: [-30, 0, 0], ArmL: [-60, 0, 10], ForearmL: [-30, 0, 0] }),
    k(20, { Pelvis: P(-0.34, [30, 0, 0]), Torso: [35, 0, 0], Head: [-30, 0, 0], ...crouch, ArmR: [-25, 0, -10], ForearmR: [-10, 0, 0], ArmL: [-25, 0, 10], ForearmL: [-10, 0, 0] }),
    k(40, { Pelvis: P(-0.28, [20, 0, 0]), Torso: [20, 0, 0], Head: [-20, 0, 0], ...crouch, ArmR: [-60, 0, -10], ForearmR: [-30, 0, 0], ArmL: [-60, 0, 10], ForearmL: [-30, 0, 0] }) ] },
  { name: 'PitWheelGun', frames: 80, keys: [
    k(0, { Pelvis: P(-0.02), Torso: [5, 0, 0], ...stand, ArmR: [-50, 0, -10], ForearmR: [-40, 0, 0], ArmL: [-20, 0, 10], ForearmL: [-40, 0, 0] }),
    k(12, { Pelvis: P(-0.34, [10, 0, 0]), Torso: [25, 0, 0], Head: [-15, 0, 0], ...crouch, ArmR: [-80, 0, -5], ForearmR: [-15, 0, 0], ArmL: [-70, 0, 10], ForearmL: [-15, 0, 0] }),
    k(30, { Pelvis: P(-0.36, [10, 0, 0]), Torso: [28, -6, 0], Head: [-15, 0, 0], ...crouch, ArmR: [-85, 0, -5], ForearmR: [-10, 0, 0], ArmL: [-70, 0, 10], ForearmL: [-20, 0, 0] }),
    k(45, { Pelvis: P(-0.34, [10, 0, 0]), Torso: [15, 16, 0], Head: [-10, 10, 0], ...crouch, ArmR: [-40, 30, -20], ForearmR: [-40, 0, 0], ArmL: [-40, 30, 20], ForearmL: [-40, 0, 0] }),
    k(60, { Pelvis: P(-0.36, [10, 0, 0]), Torso: [28, 6, 0], Head: [-15, 0, 0], ...crouch, ArmR: [-85, 0, -5], ForearmR: [-10, 0, 0], ArmL: [-70, 0, 10], ForearmL: [-20, 0, 0] }),
    k(80, { Pelvis: P(-0.02), Torso: [5, 0, 0], ...stand, ArmR: [-50, 0, -10], ForearmR: [-40, 0, 0], ArmL: [-20, 0, 10], ForearmL: [-40, 0, 0] }) ] },
  { name: 'PitFuel', frames: 60, loop: true, keys: [
    k(0, { Pelvis: P(0), Torso: [8, 0, 0], Head: [-4, 0, 0], ...stand, ArmR: [-70, 0, -8], ForearmR: [-20, 0, 0], ArmL: [-60, 0, 12], ForearmL: [-40, 0, 0] }),
    k(30, { Pelvis: P(-0.015), Torso: [11, 0, 0], Head: [-2, 6, 0], ...stand, ArmR: [-72, 0, -8], ForearmR: [-20, 0, 0], ArmL: [-62, 0, 12], ForearmL: [-40, 0, 0] }),
    k(60, { Pelvis: P(0), Torso: [8, 0, 0], Head: [-4, 0, 0], ...stand, ArmR: [-70, 0, -8], ForearmR: [-20, 0, 0], ArmL: [-60, 0, 12], ForearmL: [-40, 0, 0] }) ] },
  { name: 'MarshalFlag', frames: 28, loop: true, keys: [
    k(0, { Pelvis: P(0), Torso: [0, 0, -4], Head: [-8, 0, 0], ...stand, ArmR: [-170, 0, -28], ForearmR: [-12, 0, 0], ArmL: [6, 0, 9], ForearmL: [-14, 0, 0] }),
    k(14, { Pelvis: P(0), Torso: [0, 0, 4], Head: [-8, 0, 0], ...stand, ArmR: [-170, 0, 22], ForearmR: [-12, 0, 0], ArmL: [6, 0, 9], ForearmL: [-14, 0, 0] }),
    k(28, { Pelvis: P(0), Torso: [0, 0, -4], Head: [-8, 0, 0], ...stand, ArmR: [-170, 0, -28], ForearmR: [-12, 0, 0], ArmL: [6, 0, 9], ForearmL: [-14, 0, 0] }) ] },
  { name: 'ExaminerClipboard', frames: 120, loop: true, keys: [
    k(0, { Pelvis: P(0), Torso: [4, 0, 0], Head: [18, 0, 0], ...stand, ArmL: [-60, 0, 14], ForearmL: [-60, 0, 0], ArmR: [-50, 0, -14], ForearmR: [-70, 0, 0], HandR: [0, 0, 0] }),
    k(40, { Pelvis: P(0), Torso: [5, 0, 0], Head: [22, 4, 0], ...stand, ArmL: [-60, 0, 14], ForearmL: [-60, 0, 0], ArmR: [-54, 8, -12], ForearmR: [-74, 0, 0], HandR: [12, 0, 0] }),
    k(70, { Pelvis: P(0), Torso: [2, 0, 0], Head: [-4, 0, 0], ...stand, ArmL: [-60, 0, 14], ForearmL: [-60, 0, 0], ArmR: [-50, 0, -14], ForearmR: [-70, 0, 0] }),
    k(90, { Pelvis: P(0), Torso: [3, 0, 0], Head: [12, 0, 0], ...stand, ArmL: [-60, 0, 14], ForearmL: [-60, 0, 0], ArmR: [-50, 0, -14], ForearmR: [-70, 0, 0] }),
    k(104, { Pelvis: P(0), Torso: [2, 0, 0], Head: [-2, 0, 0], ...stand, ArmL: [-60, 0, 14], ForearmL: [-60, 0, 0], ArmR: [-50, 0, -14], ForearmR: [-70, 0, 0] }),
    k(120, { Pelvis: P(0), Torso: [4, 0, 0], Head: [18, 0, 0], ...stand, ArmL: [-60, 0, 14], ForearmL: [-60, 0, 0], ArmR: [-50, 0, -14], ForearmR: [-70, 0, 0] }) ] },
  { name: 'DealerPresent', frames: 90, loop: true, keys: [
    k(0, { Pelvis: P(0), Torso: [2, 0, 0], Head: [0, 0, 0], ...stand, ArmR: [6, 0, -9], ForearmR: [-22, 0, 0], ArmL: [6, 0, 9], ForearmL: [-22, 0, 0] }),
    k(24, { Pelvis: P(0), Torso: [2, -14, 0], Head: [-4, -20, 0], ...stand, ArmR: [-70, -30, -30], ForearmR: [-14, 0, 0], HandR: [-10, 0, 0], ArmL: [6, 0, 9], ForearmL: [-22, 0, 0] }),
    k(55, { Pelvis: P(0), Torso: [2, -6, 0], Head: [-4, -24, 0], ...stand, ArmR: [-82, -60, -34], ForearmR: [-8, 0, 0], HandR: [-10, 0, 0], ArmL: [6, 0, 9], ForearmL: [-22, 0, 0] }),
    k(90, { Pelvis: P(0), Torso: [2, 0, 0], Head: [0, 0, 0], ...stand, ArmR: [6, 0, -9], ForearmR: [-22, 0, 0], ArmL: [6, 0, 9], ForearmL: [-22, 0, 0] }) ] },
  { name: 'MechanicWipe', frames: 80, loop: true, keys: [
    k(0, { Pelvis: P(0), Torso: [6, 0, 0], Head: [10, 0, 0], ...stand, ArmR: [-40, 10, -6], ForearmR: [-60, 0, 0], ArmL: [-40, -10, 6], ForearmL: [-60, 0, 0] }),
    k(20, { Pelvis: P(0), Torso: [6, 0, 0], Head: [12, 4, 0], ...stand, ArmR: [-36, 20, -2], ForearmR: [-70, 0, 0], ArmL: [-44, -2, 8], ForearmL: [-54, 0, 0] }),
    k(40, { Pelvis: P(0), Torso: [6, 0, 0], Head: [10, -4, 0], ...stand, ArmR: [-44, 2, -8], ForearmR: [-54, 0, 0], ArmL: [-36, -20, 2], ForearmL: [-70, 0, 0] }),
    k(60, { Pelvis: P(0), Torso: [2, 0, 0], Head: [-6, -22, 0], ...stand, ArmR: [-36, 16, -2], ForearmR: [-66, 0, 0], ArmL: [-36, -16, 2], ForearmL: [-66, 0, 0] }),
    k(80, { Pelvis: P(0), Torso: [6, 0, 0], Head: [10, 0, 0], ...stand, ArmR: [-40, 10, -6], ForearmR: [-60, 0, 0], ArmL: [-40, -10, 6], ForearmL: [-60, 0, 0] }) ] },
  { name: 'PodiumCheer', frames: 30, loop: true, keys: [
    k(0, { Pelvis: P(-0.06), Torso: [2, 0, 0], Head: [-14, 0, 0], ...stand, ArmR: [-175, 0, -18], ForearmR: [-8, 0, 0], ArmL: [-175, 0, 18], ForearmL: [-8, 0, 0] }),
    k(15, { Pelvis: P(0.2), Torso: [-3, 0, 0], Head: [-18, 0, 0], LegR: [-12, 0, 0], ShinR: [24, 0, 0], FootR: [-10, 0, 0], LegL: [-12, 0, 0], ShinL: [24, 0, 0], FootL: [-10, 0, 0], ArmR: [-170, 0, -28], ForearmR: [-4, 0, 0], ArmL: [-170, 0, 28], ForearmL: [-4, 0, 0] }),
    k(30, { Pelvis: P(-0.06), Torso: [2, 0, 0], Head: [-14, 0, 0], ...stand, ArmR: [-175, 0, -18], ForearmR: [-8, 0, 0], ArmL: [-175, 0, 18], ForearmL: [-8, 0, 0] }) ] },
  { name: 'PodiumBow', frames: 70, keys: [
    k(0, { Pelvis: P(0), Torso: [0, 0, 0], ...stand, ArmR: [4, 0, -6], ForearmR: [-8, 0, 0], ArmL: [4, 0, 6], ForearmL: [-8, 0, 0] }),
    k(24, { Pelvis: P(-0.04, [18, 0, 0]), Torso: [32, 0, 0], Head: [12, 0, 0], ...stand, ArmR: [20, 0, -2], ForearmR: [-4, 0, 0], ArmL: [20, 0, 2], ForearmL: [-4, 0, 0] }),
    k(44, { Pelvis: P(-0.04, [18, 0, 0]), Torso: [32, 0, 0], Head: [12, 0, 0], ...stand, ArmR: [20, 0, -2], ForearmR: [-4, 0, 0], ArmL: [20, 0, 2], ForearmL: [-4, 0, 0] }),
    k(70, { Pelvis: P(0), Torso: [0, 0, 0], ...stand, ArmR: [4, 0, -6], ForearmR: [-8, 0, 0], ArmL: [4, 0, 6], ForearmL: [-8, 0, 0] }) ] },
  { name: 'CrowdCheer', frames: 20, loop: true, keys: [
    k(0, { Pelvis: P(-0.03), ...stand, ArmR: [-150, 0, -20], ForearmR: [-20, 0, 0], ArmL: [-150, 0, 20], ForearmL: [-20, 0, 0] }),
    k(10, { Pelvis: P(0.06), ...stand, ArmR: [-172, 0, -24], ForearmR: [-6, 0, 0], ArmL: [-172, 0, 24], ForearmL: [-6, 0, 0] }),
    k(20, { Pelvis: P(-0.03), ...stand, ArmR: [-150, 0, -20], ForearmR: [-20, 0, 0], ArmL: [-150, 0, 20], ForearmL: [-20, 0, 0] }) ] },
];
