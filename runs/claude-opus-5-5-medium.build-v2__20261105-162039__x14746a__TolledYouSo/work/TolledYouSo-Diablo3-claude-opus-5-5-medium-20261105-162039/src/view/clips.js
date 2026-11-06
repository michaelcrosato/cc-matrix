// New animation clips on the engine's hero rig. Rotations: Arm X -90 straight ahead, -180 overhead, +40 back.
import { gaitClip, HERO_CLIPS, HERO_RIG } from '../../pixel-engine.js';

// Keys here stay linear: an ease on a mid key compiled to NaN tracks on this engine (tests/ISSUES.md).
const outC = (u) => 1 - (1 - u) ** 3; const inC = (u) => u ** 3;
const STAND = { Pelvis: { r: [0, 0, 0], p: [0, -0.04, 0] }, Torso: [4, 0, 0], Head: [0, 0, 0], HandR: [0, 0, 0], HandL: [0, 0, 0], ArmR: [-20, 0, -14], ForearmR: [-40, 0, 0], ArmL: [-20, 0, 14], ForearmL: [-40, 0, 0], LegR: [-12, 0, 0], ShinR: [22, 0, 0], FootR: [-10, 0, 0], LegL: [-12, 0, 0], ShinL: [22, 0, 0], FootL: [-10, 0, 0] };
const P = (o) => { const out = { ...STAND, ...o }; if (o.Pelvis) out.Pelvis = { r: [0, 0, 0], p: [0, -0.04, 0], ...o.Pelvis }; return out; };
const C = (name, frames, keys, extra = {}) => ({ name, frames, fast: true, grounded: false, keys: keys.map((k) => [k[0], k[1]]), ...extra });

export const NEW_CLIPS = [
  C('BellOverhead', 18, [
    [0, P({})],
    [5, P({ Torso: [-14, 0, 0], ArmR: [-175, 0, -8], ForearmR: [-20, 0, 0], ArmL: [-170, 0, 8], ForearmL: [-20, 0, 0], Pelvis: { p: [0, 0.02, 0] } }), outC],
    [9, P({ Torso: [30, 0, 0], ArmR: [-60, 0, -8], ForearmR: [-10, 0, 0], ArmL: [-60, 0, 8], ForearmL: [-10, 0, 0], Pelvis: { p: [0, -0.16, 0.06] }, LegR: [-40, 0, 0], ShinR: [60, 0, 0], LegL: [-20, 0, 0], ShinL: [40, 0, 0] }), inC],
    [18, P({})],
  ]),
  C('ChainSweep', 16, [
    [0, P({})],
    [4, P({ Pelvis: { r: [0, -35, 0], p: [0, -0.06, 0] }, Torso: [6, -40, 0], ArmR: [-80, 0, -70], ForearmR: [-20, 0, 0] }), outC],
    [10, P({ Pelvis: { r: [0, 50, 0], p: [0, -0.1, 0] }, Torso: [10, 50, 0], ArmR: [-85, 0, 40], ForearmR: [-10, 0, 0] }), inC],
    [16, P({})],
  ]),
  C('LanternLob', 14, [
    [0, P({})],
    [4, P({ Torso: [-8, -10, 0], ArmR: [30, 0, -14], ForearmR: [-30, 0, 0] }), outC],
    [8, P({ Torso: [10, 8, 0], ArmR: [-160, 0, -10], ForearmR: [-16, 0, 0], ArmL: [-40, 0, 20] }), inC],
    [14, P({})],
  ]),
  C('ShovelSwat', 12, [
    [0, P({})],
    [3, P({ Pelvis: { r: [0, -20, 0], p: [0, -0.04, 0] }, Torso: [-4, -30, 0], ArmR: [-130, 0, -60], ForearmR: [-60, 0, 0], ArmL: [-80, 0, 30], ForearmL: [-60, 0, 0] }), outC],
    [6, P({ Pelvis: { r: [0, 30, 0], p: [0, -0.1, 0.06] }, Torso: [22, 30, 0], ArmR: [-80, 0, 20], ForearmR: [-16, 0, 0], ArmL: [-60, 0, -10], ForearmL: [-30, 0, 0] }), inC],
    [12, P({})],
  ]),
  C('Dig', 16, [
    [0, P({})],
    [5, P({ Torso: [-8, 0, 0], ArmR: [-120, 0, -10], ForearmR: [-40, 0, 0], ArmL: [-110, 0, 10], ForearmL: [-40, 0, 0] }), outC],
    [10, P({ Torso: [42, 0, 0], ArmR: [-70, 0, -10], ForearmR: [-10, 0, 0], ArmL: [-70, 0, 10], ForearmL: [-10, 0, 0], Pelvis: { p: [0, -0.14, 0] }, LegR: [-40, 0, 0], ShinR: [50, 0, 0], LegL: [-30, 0, 0], ShinL: [40, 0, 0] }), inC],
    [16, P({})],
  ]),
  C('RaiseHands', 20, [
    [0, P({ Torso: [14, 0, 0], ArmR: [-20, 0, -20], ArmL: [-20, 0, 20] })],
    [8, P({ Torso: [-14, 0, 0], ArmR: [-165, 0, -24], ForearmR: [-12, 0, 0], ArmL: [-165, 0, 24], ForearmL: [-12, 0, 0], Head: [-22, 0, 0], Pelvis: { p: [0, 0.03, 0] } }), outC],
    [14, P({ Torso: [-14, 0, 0], ArmR: [-172, 0, -28], ForearmR: [-8, 0, 0], ArmL: [-172, 0, 28], ForearmL: [-8, 0, 0], Head: [-26, 0, 0] })],
    [20, P({})],
  ]),
  C('SinkGround', 14, [
    [0, P({})],
    [6, P({ Pelvis: { p: [0, -0.5, 0] }, Torso: [30, 0, 0], ArmR: [-110, 0, -20], ArmL: [-110, 0, 20], LegR: [-80, 0, 0], ShinR: [110, 0, 0], LegL: [-80, 0, 0], ShinL: [110, 0, 0] }), inC],
    [9, P({ Pelvis: { p: [0, -0.9, 0] }, Torso: [40, 0, 0], ArmR: [-165, 0, -20], ArmL: [-165, 0, 20], LegR: [-90, 0, 0], ShinR: [120, 0, 0], LegL: [-90, 0, 0], ShinL: [120, 0, 0] })],
    [14, P({})],
  ]),
  C('Drink', 18, [
    [0, P({})],
    [6, P({ ArmR: [-140, 0, -30], ForearmR: [-110, 0, 0], Head: [-20, 0, 0], Torso: [-6, 0, 0] }), outC],
    [12, P({ ArmR: [-150, 0, -30], ForearmR: [-120, 0, 0], Head: [-30, 0, 0], Torso: [-10, 0, 0] })],
    [18, P({})],
  ]),
  C('Revive', 18, [
    [0, P({})],
    [8, P({ Pelvis: { p: [0, -0.3, 0.05] }, Torso: [40, 0, 0], ArmR: [-90, 0, -8], ForearmR: [-20, 0, 0], ArmL: [-90, 0, 8], ForearmL: [-20, 0, 0], LegR: [-70, 0, 0], ShinR: [90, 0, 0], LegL: [-40, 0, 0], ShinL: [70, 0, 0] }), outC],
    [18, P({ Pelvis: { p: [0, -0.3, 0.05] }, Torso: [40, 0, 0], ArmR: [-90, 0, -8], ForearmR: [-20, 0, 0], ArmL: [-90, 0, 8], ForearmL: [-20, 0, 0], LegR: [-70, 0, 0], ShinR: [90, 0, 0], LegL: [-40, 0, 0], ShinL: [70, 0, 0] })],
  ]),
  C('TalkGesture', 24, [
    [0, P({})],
    [6, P({ ArmR: [-70, 0, -30], ForearmR: [-70, 0, 0], Head: [0, 10, 0], Torso: [4, 6, 0] }), outC],
    [12, P({ ArmR: [-50, 0, -40], ForearmR: [-90, 0, 0], ArmL: [-60, 0, 30], ForearmL: [-80, 0, 0], Head: [6, -6, 0], Torso: [4, -4, 0] })],
    [18, P({ ArmL: [-90, 0, 40], ForearmL: [-60, 0, 0], Head: [-4, -10, 0] }), outC],
    [24, P({})],
  ], { loop: true }),
  C('Interact', 12, [
    [0, P({})],
    [5, P({ Torso: [16, 0, 0], ArmR: [-85, 0, -8], ForearmR: [-10, 0, 0] }), outC],
    [12, P({})],
  ]),
  C('Lurch', 16, [
    [0, P({ Head: [10, 0, 10] })],
    [8, P({ Pelvis: { p: [0, 0, -0.05] }, Torso: [-14, 0, -6], ArmR: [-150, 0, -14], ForearmR: [-30, 0, 0], ArmL: [-150, 0, 14], ForearmL: [-30, 0, 0] }), outC],
    [11, P({ Pelvis: { p: [0, -0.1, 0.1] }, Torso: [34, 0, 6], ArmR: [-60, 0, -14], ForearmR: [-20, 0, 0], ArmL: [-60, 0, 14], ForearmL: [-20, 0, 0] }), inC],
    [16, P({ Head: [10, 0, 10] })],
  ]),
  C('Lunge', 12, [
    [0, P({ Pelvis: { p: [0, -0.16, -0.06] }, Torso: [24, 0, 0], LegR: [-60, 0, 0], ShinR: [80, 0, 0], LegL: [-60, 0, 0], ShinL: [80, 0, 0] })],
    [5, P({ Pelvis: { p: [0, 0.12, 0.2] }, Torso: [44, 0, 0], ArmR: [-110, 0, -8], ForearmR: [-5, 0, 0], ArmL: [-110, 0, 8], ForearmL: [-5, 0, 0], LegR: [30, 0, 0], ShinR: [8, 0, 0], LegL: [20, 0, 0], ShinL: [20, 0, 0] }), outC],
    [12, P({})],
  ]),
  C('CoffinSlam', 24, [
    [0, P({})],
    [12, P({ Torso: [-20, 0, 0], ArmR: [-178, 0, -6], ForearmR: [-6, 0, 0], ArmL: [-178, 0, 6], ForearmL: [-6, 0, 0], Pelvis: { p: [0, 0.03, -0.04] }, Head: [-14, 0, 0] }), outC],
    [16, P({ Torso: [42, 0, 0], ArmR: [-45, 0, -6], ForearmR: [-6, 0, 0], ArmL: [-45, 0, 6], ForearmL: [-6, 0, 0], Pelvis: { p: [0, -0.2, 0.1] }, LegR: [-45, 0, 0], ShinR: [65, 0, 0], LegL: [-25, 0, 0], ShinL: [50, 0, 0] }), inC],
    [24, P({})],
  ]),
  C('RopeLash', 14, [
    [0, P({})],
    [5, P({ Torso: [-6, -20, 0], ArmR: [-170, 0, -40], ForearmR: [-40, 0, 0] }), outC],
    [8, P({ Torso: [20, 16, 0], ArmR: [-70, 0, 10], ForearmR: [-10, 0, 0] }), inC],
    [14, P({})],
  ]),
  C('Swell', 20, [
    [0, P({})],
    [20, P({ Torso: [-20, 0, 0], ArmR: [-90, 0, -60], ArmL: [-90, 0, 60], Head: [-20, 0, 0], Pelvis: { p: [0, 0.03, 0] } })],
  ]),
  gaitClip(HERO_RIG, { name: 'Shamble', frames: 32, speed: 1.4, stance: 0.55, hip: -0.08, bob: 0.02, lift: 0.08, lean: 14, sway: 8, head: 16, arms: { swing: 10, elbow: 16 }, pose: { ArmR: [-68, 0, -12], ArmL: [-40, 0, 16], ForearmR: [-30, 0, 0], ForearmL: [-20, 0, 0] }, notes: 'A dragging corpse walk with one arm reaching.' }),
];
export const ALL_CLIPS = [...HERO_CLIPS, ...NEW_CLIPS];
const UPPER = new Set(['Torso', 'Head', 'ArmR', 'ForearmR', 'HandR', 'ArmL', 'ForearmL', 'HandL']);
export const upperOnly = (THREE, clip) => new THREE.AnimationClip(`${clip.name}_upper`, clip.duration, clip.tracks.filter((t) => UPPER.has(t.name.split('.')[0])));
