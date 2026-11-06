// New animations, authored as ClipDef data on the engine's hero rig. analyzeClip checks them in the headless suite.
const rest = () => ({ Pelvis: { r: [0, 0, 0], p: [0, 0, 0], s: 1 }, Torso: [0, 0, 0], Head: [0, 0, 0], ArmR: [4, 0, -8], ForearmR: [-18, 0, 0], HandR: [0, 0, 0], ArmL: [4, 0, 8], ForearmL: [-18, 0, 0], HandL: [0, 0, 0], LegR: [0, 0, 0], ShinR: [0, 0, 0], FootR: [0, 0, 0], LegL: [0, 0, 0], ShinL: [0, 0, 0], FootL: [0, 0, 0] });
const pose = (o) => ({ ...rest(), ...o });
const crouch = (o = {}) => pose({ Pelvis: { r: [18, 0, 0], p: [0, -0.24, 0.02], s: 1 }, Torso: [24, 0, 0], Head: [-22, 0, 0], LegR: [-74, 0, 0], ShinR: [96, 0, 0], FootR: [-30, 0, 0], LegL: [-74, 0, 0], ShinL: [96, 0, 0], FootL: [-30, 0, 0], ...o });
const kneel = (o = {}) => pose({ Pelvis: { r: [6, 0, 0], p: [0, -0.24, 0], s: 1 }, Torso: [28, 0, 0], Head: [-20, 0, 0], LegR: [-84, 0, 0], ShinR: [84, 0, 0], FootR: [0, 0, 0], LegL: [8, 0, 0], ShinL: [112, 0, 0], FootL: [30, 0, 0], ...o });
export const GAME_CLIPS = [
  { name: 'PitJack', frames: 40, loop: true, feet: [[0, { R: { z: 0.14 }, L: { z: -0.12 } }, null], [40, { R: { z: 0.14 }, L: { z: -0.12 } }, null]], keys: [[0, crouch({ ArmR: [-70, 0, -10], ForearmR: [-30, 0, 0], ArmL: [-70, 0, 10], ForearmL: [-30, 0, 0] })], [20, crouch({ Pelvis: { r: [22, 0, 0], p: [0, -0.19, 0.02], s: 1 }, Torso: [28, 0, 0], ArmR: [-56, 0, -10], ForearmR: [-22, 0, 0], ArmL: [-56, 0, 10], ForearmL: [-22, 0, 0] })], [40, crouch({ ArmR: [-70, 0, -10], ForearmR: [-30, 0, 0], ArmL: [-70, 0, 10], ForearmL: [-30, 0, 0] })]], notes: 'Crouch and pump a jack lever.' },
  { name: 'PitWheelGun', frames: 120, loop: true, feet: [[0, { R: { z: 0.24 }, L: { z: -0.3 } }, null], [120, { R: { z: 0.24 }, L: { z: -0.3 } }, null]], keys: [
    [0, kneel({ ArmR: [-76, 0, -6], ForearmR: [-14, 0, 0], ArmL: [-60, 0, 8], ForearmL: [-40, 0, 0] })],
    [20, kneel({ Torso: [34, 6, 0], ArmR: [-82, 0, -4], ForearmR: [-8, 0, 0], ArmL: [-60, 0, 8], ForearmL: [-40, 0, 0] })],
    [45, kneel({ Torso: [22, -18, 0], ArmR: [-50, 0, -30], ForearmR: [-60, 0, 0], ArmL: [-50, 0, 30], ForearmL: [-60, 0, 0] })],
    [75, kneel({ Torso: [34, 16, 0], ArmR: [-80, 0, -24], ForearmR: [-40, 0, 0], ArmL: [-80, 0, 24], ForearmL: [-40, 0, 0] })],
    [100, kneel({ Torso: [34, 6, 0], ArmR: [-82, 0, -4], ForearmR: [-8, 0, 0], ArmL: [-60, 0, 8], ForearmL: [-40, 0, 0] })],
    [120, kneel({ ArmR: [-76, 0, -6], ForearmR: [-14, 0, 0], ArmL: [-60, 0, 8], ForearmL: [-40, 0, 0] })]], notes: 'Kneel, gun to the hub, pull a wheel, fit a wheel.' },
  { name: 'PitFuel', frames: 60, loop: true, grounded: true, feet: [[0, { R: { z: 0.08 }, L: { z: -0.08 } }, null], [60, { R: { z: 0.08 }, L: { z: -0.08 } }, null]], keys: [[0, pose({ Pelvis: { r: [0, 12, 0], p: [0, -0.04, 0], s: 1 }, Torso: [10, 10, 0], ArmR: [-74, 8, -8], ForearmR: [-16, 0, 0], ArmL: [-62, -6, 14], ForearmL: [-30, 0, 0], LegR: [-10, 0, 0], ShinR: [18, 0, 0], FootR: [-8, 0, 0], LegL: [-16, 0, 0], ShinL: [24, 0, 0], FootL: [-8, 0, 0] })], [30, pose({ Pelvis: { r: [0, 12, 0], p: [0, -0.06, 0], s: 1 }, Torso: [13, 12, 0], Head: [8, -10, 0], ArmR: [-74, 8, -8], ForearmR: [-16, 0, 0], ArmL: [-62, -6, 14], ForearmL: [-30, 0, 0], LegR: [-12, 0, 0], ShinR: [22, 0, 0], FootR: [-10, 0, 0], LegL: [-18, 0, 0], ShinL: [28, 0, 0], FootL: [-10, 0, 0] })], [60, pose({ Pelvis: { r: [0, 12, 0], p: [0, -0.04, 0], s: 1 }, Torso: [10, 10, 0], ArmR: [-74, 8, -8], ForearmR: [-16, 0, 0], ArmL: [-62, -6, 14], ForearmL: [-30, 0, 0], LegR: [-10, 0, 0], ShinR: [18, 0, 0], FootR: [-8, 0, 0], LegL: [-16, 0, 0], ShinL: [24, 0, 0], FootL: [-8, 0, 0] })]], notes: 'Hold a fuel hose to the flank.' },
  { name: 'MarshalFlag', frames: 40, loop: true, grounded: true, keys: [[0, pose({ ArmR: [-170, 0, -12], ForearmR: [-14, 0, 0], Torso: [0, 0, 5], Head: [-6, 0, 0] })], [10, pose({ ArmR: [-150, 0, -40], ForearmR: [-18, 0, 0], Torso: [0, 0, 9], Head: [-6, 0, 0] })], [20, pose({ ArmR: [-170, 0, -12], ForearmR: [-14, 0, 0], Torso: [0, 0, 5], Head: [-6, 0, 0] })], [30, pose({ ArmR: [-168, 0, 16], ForearmR: [-12, 0, 0], Torso: [0, 0, 1], Head: [-6, 0, 0] })], [40, pose({ ArmR: [-170, 0, -12], ForearmR: [-14, 0, 0], Torso: [0, 0, 5], Head: [-6, 0, 0] })]], notes: 'Wave a flag overhead; the flag mesh is parented to the hand.' },
  { name: 'ExaminerClipboard', frames: 150, loop: true, grounded: true, keys: [
    [0, pose({ ArmR: [-64, 0, 14], ForearmR: [-70, 0, 0], ArmL: [-54, 0, -14], ForearmL: [-74, 0, 0], Head: [18, 0, 0] })],
    [40, pose({ ArmR: [-68, 12, 8], ForearmR: [-86, 0, 0], ArmL: [-54, 0, -14], ForearmL: [-74, 0, 0], Head: [22, 8, 0] })],
    [60, pose({ ArmR: [-60, -6, 18], ForearmR: [-66, 0, 0], ArmL: [-54, 0, -14], ForearmL: [-74, 0, 0], Head: [20, -4, 0] })],
    [90, pose({ ArmR: [-44, 0, 8], ForearmR: [-60, 0, 0], ArmL: [-54, 0, -14], ForearmL: [-74, 0, 0], Head: [-6, 0, 0] })],
    [105, pose({ ArmR: [-44, 0, 8], ForearmR: [-60, 0, 0], ArmL: [-54, 0, -14], ForearmL: [-74, 0, 0], Head: [14, 0, 0] })],
    [120, pose({ ArmR: [-44, 0, 8], ForearmR: [-60, 0, 0], ArmL: [-54, 0, -14], ForearmL: [-74, 0, 0], Head: [-4, 0, 0] })],
    [150, pose({ ArmR: [-64, 0, 14], ForearmR: [-70, 0, 0], ArmL: [-54, 0, -14], ForearmL: [-74, 0, 0], Head: [18, 0, 0] })]], notes: 'Note something, look up, nod.' },
  { name: 'DealerPresent', frames: 90, loop: true, grounded: true, keys: [
    [0, pose({ ArmR: [8, 0, -8], ForearmR: [-40, 0, 0], ArmL: [8, 0, 8], ForearmL: [-40, 0, 0] })],
    [28, pose({ Torso: [4, 18, 0], Head: [-2, 20, 0], ArmL: [-62, 30, 42], ForearmL: [-10, 0, 0], HandL: [-16, 0, 0], ArmR: [8, 0, -8], ForearmR: [-40, 0, 0] })],
    [62, pose({ Torso: [4, 22, 0], Head: [-2, 26, 0], ArmL: [-68, 58, 34], ForearmL: [-8, 0, 0], HandL: [-16, 0, 0], ArmR: [8, 0, -8], ForearmR: [-40, 0, 0] })],
    [90, pose({ ArmR: [8, 0, -8], ForearmR: [-40, 0, 0], ArmL: [8, 0, 8], ForearmL: [-40, 0, 0] })]], notes: 'An open-handed sweep toward the car.' },
  { name: 'MechanicWipe', frames: 80, loop: true, grounded: true, keys: [
    [0, pose({ ArmR: [-50, 0, 18], ForearmR: [-76, 0, 0], ArmL: [-50, 0, -18], ForearmL: [-76, 0, 0], Head: [16, 0, 0] })],
    [20, pose({ ArmR: [-46, 0, 24], ForearmR: [-84, 0, 0], ArmL: [-54, 0, -24], ForearmL: [-68, 0, 0], Head: [16, 4, 0] })],
    [40, pose({ ArmR: [-54, 0, 12], ForearmR: [-68, 0, 0], ArmL: [-46, 0, -12], ForearmL: [-84, 0, 0], Head: [16, -4, 0] })],
    [60, pose({ ArmR: [-46, 0, 20], ForearmR: [-80, 0, 0], ArmL: [-50, 0, -20], ForearmL: [-72, 0, 0], Head: [2, 20, 0] })],
    [80, pose({ ArmR: [-50, 0, 18], ForearmR: [-76, 0, 0], ArmL: [-50, 0, -18], ForearmL: [-76, 0, 0], Head: [16, 0, 0] })]], notes: 'Wipe hands on a rag, look at the car.' },
  { name: 'PodiumCheer', frames: 40, loop: true, fast: true, feet: [[0, { R: { z: 0.05 }, L: { z: -0.05 } }, null], [20, { R: { y: 0.2, z: 0.05 }, L: { y: 0.2, z: -0.05 } }, null], [40, { R: { z: 0.05 }, L: { z: -0.05 } }, null]], keys: [
    [0, pose({ Pelvis: { r: [0, 0, 0], p: [0, -0.1, 0], s: 1 }, ArmR: [-168, 0, -24], ForearmR: [-8, 0, 0], ArmL: [-168, 0, 24], ForearmL: [-8, 0, 0], LegR: [-24, 0, 0], ShinR: [40, 0, 0], FootR: [-16, 0, 0], LegL: [-24, 0, 0], ShinL: [40, 0, 0], FootL: [-16, 0, 0], Head: [-14, 0, 0] })],
    [20, pose({ Pelvis: { r: [0, 0, 0], p: [0, 0.24, 0], s: 1 }, ArmR: [-178, 0, -10], ForearmR: [-4, 0, 0], ArmL: [-178, 0, 10], ForearmL: [-4, 0, 0], LegR: [-8, 0, 0], ShinR: [18, 0, 0], FootR: [20, 0, 0], LegL: [-8, 0, 0], ShinL: [18, 0, 0], FootL: [20, 0, 0], Head: [-20, 0, 0] })],
    [40, pose({ Pelvis: { r: [0, 0, 0], p: [0, -0.1, 0], s: 1 }, ArmR: [-168, 0, -24], ForearmR: [-8, 0, 0], ArmL: [-168, 0, 24], ForearmL: [-8, 0, 0], LegR: [-24, 0, 0], ShinR: [40, 0, 0], FootR: [-16, 0, 0], LegL: [-24, 0, 0], ShinL: [40, 0, 0], FootL: [-16, 0, 0], Head: [-14, 0, 0] })]], notes: 'Arms up, small jump.' },
  { name: 'PodiumBow', frames: 80, loop: true, grounded: true, feet: [[0, { R: { z: 0.04 }, L: { z: -0.04 } }, null], [80, { R: { z: 0.04 }, L: { z: -0.04 } }, null]], keys: [
    [0, pose({ ArmR: [4, 0, -6], ArmL: [4, 0, 6] })],
    [24, pose({ Pelvis: { r: [28, 0, 0], p: [0, -0.02, -0.04], s: 1 }, Torso: [30, 0, 0], Head: [12, 0, 0], ArmR: [-8, 0, -6], ArmL: [-8, 0, 6] })],
    [50, pose({ Pelvis: { r: [28, 0, 0], p: [0, -0.02, -0.04], s: 1 }, Torso: [30, 0, 0], Head: [12, 0, 0], ArmR: [-8, 0, -6], ArmL: [-8, 0, 6] })],
    [80, pose({ ArmR: [4, 0, -6], ArmL: [4, 0, 6] })]], notes: 'A formal bow.' },
  { name: 'CrowdCheer', frames: 24, loop: true, grounded: true, feet: [[0, { R: { z: 0.05 }, L: { z: -0.05 } }, null], [24, { R: { z: 0.05 }, L: { z: -0.05 } }, null]], keys: [
    [0, pose({ Pelvis: { r: [0, 0, 0], p: [0, -0.02, 0], s: 1 }, ArmR: [-150, 0, -14], ForearmR: [-20, 0, 0], ArmL: [-40, 0, 20], ForearmL: [-60, 0, 0], LegR: [-6, 0, 0], ShinR: [10, 0, 0], FootR: [-4, 0, 0], LegL: [-6, 0, 0], ShinL: [10, 0, 0], FootL: [-4, 0, 0] })],
    [12, pose({ Pelvis: { r: [0, 0, 0], p: [0, -0.07, 0], s: 1 }, ArmR: [-168, 0, -6], ForearmR: [-10, 0, 0], ArmL: [-50, 0, 24], ForearmL: [-70, 0, 0], LegR: [-14, 0, 0], ShinR: [24, 0, 0], FootR: [-10, 0, 0], LegL: [-14, 0, 0], ShinL: [24, 0, 0], FootL: [-10, 0, 0] })],
    [24, pose({ Pelvis: { r: [0, 0, 0], p: [0, -0.02, 0], s: 1 }, ArmR: [-150, 0, -14], ForearmR: [-20, 0, 0], ArmL: [-40, 0, 20], ForearmL: [-60, 0, 0], LegR: [-6, 0, 0], ShinR: [10, 0, 0], FootR: [-4, 0, 0], LegL: [-6, 0, 0], ShinL: [10, 0, 0], FootL: [-4, 0, 0] })]], notes: 'A looping bob for the crowd stand-ins.' },
];
