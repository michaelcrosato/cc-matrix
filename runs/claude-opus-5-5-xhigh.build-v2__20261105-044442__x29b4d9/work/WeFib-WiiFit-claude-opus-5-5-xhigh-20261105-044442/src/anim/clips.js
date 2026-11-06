import * as THREE from 'three/webgpu';

const D = Math.PI / 180;
const _e = new THREE.Euler(), _q = new THREE.Quaternion();

/**
 * Compile { t, pose: { joint: [x, y, z in degrees], ... }, pos: { joint: [x, y, z] } } keys into a clip.
 * A joint missing from a key holds its last value.
 */
export function poseClip(name, duration, keys, restPos = {}) {
  const joints = new Set(), movers = new Set();
  for (const k of keys) {
    for (const j of Object.keys(k.pose || {})) joints.add(j);
    for (const j of Object.keys(k.pos || {})) movers.add(j);
  }
  const tracks = [];
  for (const j of joints) {
    const times = [], vals = [];
    let last = [0, 0, 0];
    for (const k of keys) {
      const v = (k.pose && k.pose[j]) || last;
      last = v;
      times.push(k.t);
      _e.set(v[0] * D, v[1] * D, v[2] * D);
      _q.setFromEuler(_e);
      vals.push(_q.x, _q.y, _q.z, _q.w);
    }
    tracks.push(new THREE.QuaternionKeyframeTrack(`${j}.quaternion`, times, vals));
  }
  for (const j of movers) {
    const times = [], vals = [];
    const base = restPos[j] || [0, 0, 0];
    let last = [0, 0, 0];
    for (const k of keys) {
      const v = (k.pos && k.pos[j]) || last;
      last = v;
      times.push(k.t);
      vals.push(base[0] + v[0], base[1] + v[1], base[2] + v[2]);
    }
    tracks.push(new THREE.VectorKeyframeTrack(`${j}.position`, times, vals));
  }
  return new THREE.AnimationClip(name, duration, tracks);
}

// ---- Peg doll ---- (faces +z; L is +x. Shoulder z out, x negative forward. Knee x positive bends back.)
const HIPS = { hips: [0, 0.46, 0] };
const c = (name, dur, keys) => poseClip(name, dur, keys, HIPS);
const ARMS_REST = { shoulderL: [0, 0, 7], shoulderR: [0, 0, -7], elbowL: [-10, 0, 0], elbowR: [-10, 0, 0] };
const LEGS_REST = { hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0] };
const REST = { ...ARMS_REST, ...LEGS_REST, spine: [0, 0, 0], head: [0, 0, 0] };

function pose(name, arms, extra = {}) {
  return c(name, 2.4, [
    { t: 0, pose: { ...REST, ...arms, ...extra } },
    { t: 1.2, pose: { ...REST, ...arms, ...extra, spine: [(extra.spine?.[0] ?? 0) + 2, extra.spine?.[1] ?? 0, extra.spine?.[2] ?? 0] } },
    { t: 2.4, pose: { ...REST, ...arms, ...extra } },
  ]);
}

export const DOLL_CLIPS = {};
const add = (clip) => { DOLL_CLIPS[clip.name] = clip; };

add(c('idle', 3, [
  { t: 0, pose: { ...REST } },
  { t: 1.5, pose: { ...REST, spine: [2, 0, 1.5], head: [-2, 6, 0], shoulderL: [2, 0, 10], shoulderR: [2, 0, -10] } },
  { t: 3, pose: { ...REST } },
]));
add(c('breathe', 4, [
  { t: 0, pose: { ...REST } },
  { t: 2, pose: { ...REST, spine: [-3, 0, 0], head: [-5, 0, 0], shoulderL: [0, 0, 16], shoulderR: [0, 0, -16] } },
  { t: 4, pose: { ...REST } },
]));
const stride = (name, dur, sw, kn, ar, bob) => c(name, dur, [
  { t: 0, pose: { ...REST, hipL: [-sw, 0, 0], hipR: [sw * 0.8, 0, 0], kneeL: [6, 0, 0], kneeR: [kn, 0, 0], shoulderL: [ar, 0, 7], shoulderR: [-ar, 0, -7], elbowL: [-28, 0, 0], elbowR: [-28, 0, 0], spine: [4, 0, 0] }, pos: { hips: [0, 0, 0] } },
  { t: dur / 4, pose: { hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [4, 0, 0], kneeR: [kn * 1.2, 0, 0], shoulderL: [0, 0, 7], shoulderR: [0, 0, -7] }, pos: { hips: [0, bob, 0] } },
  { t: dur / 2, pose: { hipL: [sw * 0.8, 0, 0], hipR: [-sw, 0, 0], kneeL: [kn, 0, 0], kneeR: [6, 0, 0], shoulderL: [-ar, 0, 7], shoulderR: [ar, 0, -7] }, pos: { hips: [0, 0, 0] } },
  { t: (3 * dur) / 4, pose: { hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [kn * 1.2, 0, 0], kneeR: [4, 0, 0], shoulderL: [0, 0, 7], shoulderR: [0, 0, -7] }, pos: { hips: [0, bob, 0] } },
  { t: dur, pose: { hipL: [-sw, 0, 0], hipR: [sw * 0.8, 0, 0], kneeL: [6, 0, 0], kneeR: [kn, 0, 0], shoulderL: [ar, 0, 7], shoulderR: [-ar, 0, -7] }, pos: { hips: [0, 0, 0] } },
]);
add(stride('walk', 0.62, 28, 30, 26, 0.02));
add(stride('jog', 0.56, 44, 62, 48, 0.05));
add(c('hop', 0.45, [
  { t: 0, pose: { ...REST, hipL: [-30, 0, 0], hipR: [-30, 0, 0], kneeL: [55, 0, 0], kneeR: [55, 0, 0], shoulderL: [0, 0, 30], shoulderR: [0, 0, -30] }, pos: { hips: [0, -0.08, 0] } },
  { t: 0.12, pose: { hipL: [-8, 0, 0], hipR: [-8, 0, 0], kneeL: [10, 0, 0], kneeR: [10, 0, 0], shoulderL: [0, 0, 140], shoulderR: [0, 0, -140] }, pos: { hips: [0, 0.22, 0] } },
  { t: 0.3, pose: { hipL: [-20, 0, 0], hipR: [-20, 0, 0], kneeL: [40, 0, 0], kneeR: [40, 0, 0], shoulderL: [0, 0, 70], shoulderR: [0, 0, -70] }, pos: { hips: [0, 0.14, 0] } },
  { t: 0.45, pose: { ...REST }, pos: { hips: [0, 0, 0] } },
]));
add(c('land', 0.4, [
  { t: 0, pose: { ...REST, hipL: [-36, 0, 0], hipR: [-36, 0, 0], kneeL: [70, 0, 0], kneeR: [70, 0, 0], shoulderL: [0, 0, 60], shoulderR: [0, 0, -60] }, pos: { hips: [0, -0.1, 0] } },
  { t: 0.4, pose: { ...REST }, pos: { hips: [0, 0, 0] } },
]));
add(c('cheer', 0.7, [
  { t: 0, pose: { ...REST, shoulderL: [0, 0, 150], shoulderR: [0, 0, -150], elbowL: [0, 0, 0], elbowR: [0, 0, 0], head: [-10, 0, 0] }, pos: { hips: [0, 0, 0] } },
  { t: 0.35, pose: { shoulderL: [0, 0, 170], shoulderR: [0, 0, -170], head: [-16, 0, 0] }, pos: { hips: [0, 0.1, 0] } },
  { t: 0.7, pose: { shoulderL: [0, 0, 150], shoulderR: [0, 0, -150], head: [-10, 0, 0] }, pos: { hips: [0, 0, 0] } },
]));
add(c('clap', 0.5, [
  { t: 0, pose: { ...REST, shoulderL: [-70, -18, 5], shoulderR: [-70, 18, -5], elbowL: [-30, -30, 0], elbowR: [-30, 30, 0] } },
  { t: 0.25, pose: { shoulderL: [-70, 18, 5], shoulderR: [-70, -18, -5], elbowL: [-30, 20, 0], elbowR: [-30, -20, 0] } },
  { t: 0.5, pose: { shoulderL: [-70, -18, 5], shoulderR: [-70, 18, -5], elbowL: [-30, -30, 0], elbowR: [-30, 30, 0] } },
]));
add(c('shrug', 1, [
  { t: 0, pose: { ...REST } },
  { t: 0.3, pose: { shoulderL: [-20, 0, 42], shoulderR: [-20, 0, -42], elbowL: [-70, 0, 0], elbowR: [-70, 0, 0], head: [0, 0, 8] } },
  { t: 0.75, pose: { shoulderL: [-20, 0, 42], shoulderR: [-20, 0, -42], elbowL: [-70, 0, 0], elbowR: [-70, 0, 0], head: [0, 0, -5] } },
  { t: 1, pose: { ...REST } },
]));
add(c('bow', 1.4, [
  { t: 0, pose: { ...REST } },
  { t: 0.5, pose: { spine: [48, 0, 0], head: [18, 0, 0], shoulderL: [20, 0, 4], shoulderR: [20, 0, -4] } },
  { t: 0.9, pose: { spine: [48, 0, 0], head: [18, 0, 0], shoulderL: [20, 0, 4], shoulderR: [20, 0, -4] } },
  { t: 1.4, pose: { ...REST } },
]));
const windmill = (t, a) => ({ t, pose: { shoulderL: [a, 0, 90], shoulderR: [-a, 0, -90], elbowL: [-20, 0, 0], elbowR: [-20, 0, 0], head: [0, 0, a * 0.12], spine: [0, 0, a * 0.1] } });
add(c('flail', 0.35, [windmill(0, 80), windmill(0.0875, -80), windmill(0.175, 80), windmill(0.2625, -80), windmill(0.35, 80)]));
add(c('sleep', 3, [
  { t: 0, pose: { ...REST, spine: [14, 0, 0], head: [28, 0, 10] } },
  { t: 1.5, pose: { spine: [18, 0, 0], head: [34, 0, 12] } },
  { t: 3, pose: { spine: [14, 0, 0], head: [28, 0, 10] } },
]));
add(c('flop', 0.5, [
  { t: 0, pose: { ...REST } },
  { t: 0.25, pose: { spine: [40, 0, 18], shoulderL: [-30, 0, 80], shoulderR: [-30, 0, -80], hipL: [-60, 0, 10], hipR: [-40, 0, -14], kneeL: [90, 0, 0], kneeR: [80, 0, 0] }, pos: { hips: [0, -0.28, 0] } },
  { t: 0.5, pose: { spine: [62, 0, 24], head: [20, 0, 18], shoulderL: [-10, 0, 110], shoulderR: [-10, 0, -110], hipL: [-80, 0, 16], hipR: [-70, 0, -20], kneeL: [100, 0, 0], kneeR: [100, 0, 0] }, pos: { hips: [0, -0.32, 0] } },
]));
// Eight poses, each named in src/data/poses.js.
add(pose('pose0', { shoulderL: [0, 0, 80], shoulderR: [0, 0, -80], elbowL: [-40, 0, 0], elbowR: [-40, 0, 0] }, { hipR: [-40, 0, 12], kneeR: [90, 0, 0], head: [0, 20, 0] }));
add(pose('pose1', { shoulderL: [0, 0, 160], shoulderR: [0, 0, -160], elbowL: [0, 0, 10], elbowR: [0, 0, -10] }, { spine: [14, 0, 0], head: [24, 0, 0] }));
add(pose('pose2', { shoulderL: [-90, 0, 0], shoulderR: [-90, 0, 0], elbowL: [0, 0, 0], elbowR: [0, 0, 0] }, { spine: [38, 0, 0], hipL: [-30, 0, 0], hipR: [-30, 0, 0], kneeL: [32, 0, 0], kneeR: [32, 0, 0], head: [-30, 0, 0] }));
add(pose('pose3', { shoulderL: [-150, 0, 0], shoulderR: [0, 0, -14], elbowL: [-40, 0, 0], elbowR: [-20, 0, 0] }, { head: [-6, 26, 0], spine: [0, 12, 0] }));
add(pose('pose4', { shoulderL: [0, 0, 130], shoulderR: [0, 0, -130], elbowL: [-60, 0, 0], elbowR: [-60, 0, 0] }, { hipL: [-70, 0, 8], kneeL: [100, 0, 0], head: [-14, 0, 8] }));
add(pose('pose5', { shoulderL: [0, 0, 95], shoulderR: [-160, 0, 0], elbowL: [-50, 0, 0], elbowR: [-10, 0, 0] }, { spine: [0, -16, 6], head: [0, -28, 0], hipR: [20, 0, 0], kneeR: [30, 0, 0] }));
add(pose('pose6', { shoulderL: [-165, 0, 0], shoulderR: [-165, 0, 0], elbowL: [0, 0, -30], elbowR: [0, 0, 30] }, { spine: [0, 0, 18], head: [0, 0, -14], hipL: [0, 0, 14] }));
add(pose('pose7', { shoulderL: [10, 0, 10], shoulderR: [10, 0, -10], elbowL: [-120, 0, 0], elbowR: [-120, 0, 0] }, { spine: [20, 0, 0], head: [40, 0, 0], hipR: [-8, 0, 0], kneeR: [14, 0, 0] }));
add(c('squat', 1, [
  { t: 0, pose: { ...REST, shoulderL: [-10, 0, 62], shoulderR: [-10, 0, -62], elbowL: [-100, 0, 0], elbowR: [-100, 0, 0], hipL: [0, 0, 8], hipR: [0, 0, -8], spine: [0, 0, 0] }, pos: { hips: [0, 0, 0] } },
  { t: 1, pose: { shoulderL: [-10, 0, 62], shoulderR: [-10, 0, -62], elbowL: [-100, 0, 0], elbowR: [-100, 0, 0], hipL: [-72, 0, 14], hipR: [-72, 0, -14], kneeL: [108, 0, 0], kneeR: [108, 0, 0], spine: [16, 0, 0], head: [-14, 0, 0] }, pos: { hips: [0, -0.18, -0.03] } },
]));
add(c('plank', 2, [
  { t: 0, pose: { ...REST, spine: [4, 0, 0], head: [-58, 0, 0], shoulderL: [-90, 0, 4], shoulderR: [-90, 0, -4], elbowL: [0, 0, 0], elbowR: [0, 0, 0], hipL: [8, 0, 0], hipR: [8, 0, 0] } },
  { t: 1, pose: { spine: [5, 0, 0], head: [-62, 0, 0] } },
  { t: 2, pose: { spine: [4, 0, 0], head: [-58, 0, 0] } },
]));
add(c('sit', 3, [
  { t: 0, pose: { ...REST, hipL: [-82, 42, 12], hipR: [-82, -42, -12], kneeL: [132, 0, 0], kneeR: [132, 0, 0], shoulderL: [-24, 0, 16], shoulderR: [-24, 0, -16], elbowL: [-50, 0, 0], elbowR: [-50, 0, 0] }, pos: { hips: [0, -0.36, 0] } },
  { t: 1.5, pose: { spine: [-3, 0, 0], head: [-4, 0, 0] }, pos: { hips: [0, -0.355, 0] } },
  { t: 3, pose: { spine: [0, 0, 0], head: [0, 0, 0] }, pos: { hips: [0, -0.36, 0] } },
]));
add(c('tug', 1.2, [
  { t: 0, pose: { ...REST, spine: [-18, 0, 0], head: [8, 0, 0], shoulderL: [-72, 12, 0], shoulderR: [-72, -12, 0], elbowL: [-6, 0, 0], elbowR: [-6, 0, 0], hipL: [-30, 0, 0], hipR: [8, 0, 0], kneeL: [14, 0, 0], kneeR: [24, 0, 0] } },
  { t: 0.6, pose: { spine: [-24, 0, 0], shoulderL: [-66, 12, 0], shoulderR: [-66, -12, 0], elbowL: [-24, 0, 0], elbowR: [-24, 0, 0] } },
  { t: 1.2, pose: { spine: [-18, 0, 0], shoulderL: [-72, 12, 0], shoulderR: [-72, -12, 0], elbowL: [-6, 0, 0], elbowR: [-6, 0, 0] } },
]));
add(c('hipCircle', 1, [
  { t: 0, pose: { ...REST, shoulderL: [0, 0, 78], shoulderR: [0, 0, -78], elbowL: [-60, 0, 0], elbowR: [-60, 0, 0] }, pos: { hips: [0.06, 0, 0] } },
  { t: 0.25, pose: { spine: [-6, 0, 0] }, pos: { hips: [0, 0, 0.06] } },
  { t: 0.5, pose: { spine: [0, 0, 6] }, pos: { hips: [-0.06, 0, 0] } },
  { t: 0.75, pose: { spine: [6, 0, 0] }, pos: { hips: [0, 0, -0.06] } },
  { t: 1, pose: { spine: [0, 0, 0] }, pos: { hips: [0.06, 0, 0] } },
]));
add(c('stepL', 0.28, [
  { t: 0, pose: { ...REST, hipL: [-52, 0, 0], kneeL: [68, 0, 0], shoulderR: [-30, 0, -12], shoulderL: [24, 0, 12] }, pos: { hips: [0, 0.03, 0] } },
  { t: 0.14, pose: { hipL: [-30, 0, 0], kneeL: [36, 0, 0] }, pos: { hips: [0, 0.01, 0] } },
  { t: 0.28, pose: { hipL: [0, 0, 0], kneeL: [0, 0, 0], shoulderR: [0, 0, -7], shoulderL: [0, 0, 7] }, pos: { hips: [0, 0, 0] } },
]));
add(c('stepR', 0.28, [
  { t: 0, pose: { ...REST, hipR: [-52, 0, 0], kneeR: [68, 0, 0], shoulderL: [-30, 0, 12], shoulderR: [24, 0, -12] }, pos: { hips: [0, 0.03, 0] } },
  { t: 0.14, pose: { hipR: [-30, 0, 0], kneeR: [36, 0, 0] }, pos: { hips: [0, 0.01, 0] } },
  { t: 0.28, pose: { hipR: [0, 0, 0], kneeR: [0, 0, 0], shoulderR: [0, 0, -7], shoulderL: [0, 0, 7] }, pos: { hips: [0, 0, 0] } },
]));
add(c('carryTray', 1.2, [
  { t: 0, pose: { ...REST, shoulderL: [-92, 0, 8], shoulderR: [-92, 0, -8], elbowL: [-32, 20, 0], elbowR: [-32, -20, 0] } },
  { t: 0.6, pose: { shoulderL: [-96, 0, 8], shoulderR: [-96, 0, -8] } },
  { t: 1.2, pose: { shoulderL: [-92, 0, 8], shoulderR: [-92, 0, -8] } },
]));
add(c('holdSlab', 1.6, [
  { t: 0, pose: { ...REST, shoulderL: [0, 0, 162], shoulderR: [0, 0, -162], elbowL: [0, 0, 8], elbowR: [0, 0, -8], head: [-8, 0, 0] } },
  { t: 0.8, pose: { shoulderL: [0, 0, 158], shoulderR: [0, 0, -158] } },
  { t: 1.6, pose: { shoulderL: [0, 0, 162], shoulderR: [0, 0, -162] } },
]));
add(c('tuck', 0.4, [
  { t: 0, pose: { ...REST, spine: [34, 0, 0], head: [20, 0, 0], hipL: [-110, 0, 0], hipR: [-110, 0, 0], kneeL: [130, 0, 0], kneeR: [130, 0, 0], shoulderL: [-70, 0, 8], shoulderR: [-70, 0, -8], elbowL: [-110, 0, 0], elbowR: [-110, 0, 0] } },
  { t: 0.4, pose: { spine: [34, 0, 0] } },
]));
add(c('pike', 0.5, [
  { t: 0, pose: { ...REST, spine: [50, 0, 0], head: [14, 0, 0], hipL: [-90, 0, 0], hipR: [-90, 0, 0], shoulderL: [-120, 0, 6], shoulderR: [-120, 0, -6], elbowL: [0, 0, 0], elbowR: [0, 0, 0] } },
  { t: 0.5, pose: { spine: [50, 0, 0] } },
]));
add(c('diveReady', 1, [
  { t: 0, pose: { ...REST, shoulderL: [0, 0, 172], shoulderR: [0, 0, -172], elbowL: [0, 0, 0], elbowR: [0, 0, 0], hipL: [0, 0, 0], hipR: [0, 0, 0] } },
  { t: 0.5, pose: { shoulderL: [0, 0, 168], shoulderR: [0, 0, -168] } },
  { t: 1, pose: { shoulderL: [0, 0, 172], shoulderR: [0, 0, -172] } },
]));
add(c('spread', 1, [
  { t: 0, pose: { ...REST, shoulderL: [0, 0, 96], shoulderR: [0, 0, -96], elbowL: [0, 0, 0], elbowR: [0, 0, 0], hipL: [0, 0, 26], hipR: [0, 0, -26] } },
  { t: 1, pose: { shoulderL: [0, 0, 96], shoulderR: [0, 0, -96], hipL: [0, 0, 26], hipR: [0, 0, -26] } },
]));
add(c('lookUp', 1.5, [
  { t: 0, pose: { ...REST, head: [-34, 0, 0], shoulderL: [0, 0, 14], shoulderR: [0, 0, -14] } },
  { t: 1.5, pose: { head: [-34, 0, 0], shoulderL: [0, 0, 14], shoulderR: [0, 0, -14] } },
]));
add(c('wave', 0.6, [
  { t: 0, pose: { ...REST, shoulderR: [0, 0, -150], elbowR: [0, 0, -30] } },
  { t: 0.3, pose: { shoulderR: [0, 0, -160], elbowR: [0, 0, 30] } },
  { t: 0.6, pose: { shoulderR: [0, 0, -150], elbowR: [0, 0, -30] } },
]));
add(c('stand', 1, [{ t: 0, pose: { ...REST }, pos: { hips: [0, 0, 0] } }, { t: 1, pose: { ...REST }, pos: { hips: [0, 0, 0] } }]));

// ---- Trudy ----
export const TRUDY_CLIPS = {};
const tc = (name, dur, keys) => { TRUDY_CLIPS[name] = poseClip(name, dur, keys, { body: [0, 0.34, 0] }); };
tc('idle', 2.4, [
  { t: 0, pose: { body: [0, 0, 0], pegL: [0, 0, 0], pegR: [0, 0, 0] }, pos: { body: [0, 0, 0] } },
  { t: 1.2, pose: { body: [0, 0, 2.5] }, pos: { body: [0, 0.012, 0] } },
  { t: 2.4, pose: { body: [0, 0, 0] }, pos: { body: [0, 0, 0] } },
]);
tc('hop', 0.42, [
  { t: 0, pose: { body: [0, 0, 0], pegL: [0, 0, 0], pegR: [0, 0, 0] }, pos: { body: [0, -0.08, 0] } },
  { t: 0.16, pose: { body: [8, 0, 0], pegL: [24, 0, 0], pegR: [-24, 0, 0] }, pos: { body: [0, 0.34, 0] } },
  { t: 0.32, pose: { body: [-5, 0, 0], pegL: [-12, 0, 0], pegR: [12, 0, 0] }, pos: { body: [0, 0.16, 0] } },
  { t: 0.42, pose: { body: [0, 0, 0], pegL: [0, 0, 0], pegR: [0, 0, 0] }, pos: { body: [0, -0.04, 0] } },
]);
tc('gasp', 0.8, [
  { t: 0, pose: { body: [0, 0, 0] }, pos: { body: [0, 0, 0] } },
  { t: 0.12, pose: { body: [-12, 0, 0] }, pos: { body: [0, 0.2, 0] } },
  { t: 0.5, pose: { body: [-8, 0, 3] }, pos: { body: [0, 0.14, 0] } },
  { t: 0.8, pose: { body: [0, 0, 0] }, pos: { body: [0, 0, 0] } },
]);
tc('sulk', 2, [
  { t: 0, pose: { body: [14, 18, -5] }, pos: { body: [0, -0.04, 0] } },
  { t: 1, pose: { body: [16, 26, -7] }, pos: { body: [0, -0.06, 0] } },
  { t: 2, pose: { body: [14, 18, -5] }, pos: { body: [0, -0.04, 0] } },
]);
tc('faint', 1.1, [
  { t: 0, pose: { body: [0, 0, 0] }, pos: { body: [0, 0, 0] } },
  { t: 0.4, pose: { body: [-10, 0, 12] }, pos: { body: [0, 0.02, 0] } },
  { t: 0.85, pose: { body: [-82, 0, 18] }, pos: { body: [0, -0.2, -0.14] } },
  { t: 1.1, pose: { body: [-90, 0, 14] }, pos: { body: [0, -0.2, -0.14] } },
]);
tc('clipboard', 2.2, [
  { t: 0, pose: { body: [10, 0, 0] }, pos: { body: [0, 0, 0] } },
  { t: 0.9, pose: { body: [14, -8, 0] }, pos: { body: [0, 0, 0] } },
  { t: 1.4, pose: { body: [14, 8, 0] }, pos: { body: [0, 0, 0] } },
  { t: 2.2, pose: { body: [10, 0, 0] }, pos: { body: [0, 0, 0] } },
]);

// ---- Ms. Stillwater ----
export const HERON_CLIPS = {};
const hc = (name, dur, keys) => { HERON_CLIPS[name] = poseClip(name, dur, keys, { body: [0, 1.08, 0] }); };
const NECK0 = { n1: [0, 0, 0], n2: [0, 0, 0], n3: [0, 0, 0], n4: [0, 0, 0], n5: [0, 0, 0], hhead: [0, 0, 0] };
hc('stand', 4, [
  { t: 0, pose: { body: [0, 0, 0], wingL: [0, 0, 0], wingR: [0, 0, 0], ...NECK0, legTuck: [-70, 0, 0], shin: [120, 0, 0] } },
  { t: 2, pose: { body: [1.5, 0, 0], n1: [3, 0, 0], n3: [-3, 0, 0], hhead: [2, 0, 0] } },
  { t: 4, pose: { body: [0, 0, 0], n1: [0, 0, 0], n3: [0, 0, 0], hhead: [0, 0, 0] } },
]);
hc('bow', 2.2, [
  { t: 0, pose: { body: [0, 0, 0], ...NECK0, legTuck: [-70, 0, 0], shin: [120, 0, 0] } },
  { t: 0.9, pose: { body: [16, 0, 0], n1: [26, 0, 0], n2: [24, 0, 0], n3: [20, 0, 0], n4: [16, 0, 0], hhead: [10, 0, 0] } },
  { t: 1.4, pose: { body: [16, 0, 0], n1: [26, 0, 0], n2: [24, 0, 0], n3: [20, 0, 0], n4: [16, 0, 0], hhead: [10, 0, 0] } },
  { t: 2.2, pose: { body: [0, 0, 0], ...NECK0 } },
]);
hc('turn', 3, [
  { t: 0, pose: { ...NECK0, legTuck: [-70, 0, 0], shin: [120, 0, 0] } },
  { t: 0.8, pose: { n4: [0, 30, 0], n5: [0, 30, 0], hhead: [0, 40, 0] } },
  { t: 2.2, pose: { n4: [0, 30, 0], n5: [0, 30, 0], hhead: [0, 40, 0] } },
  { t: 3, pose: { n4: [0, 0, 0], n5: [0, 0, 0], hhead: [0, 0, 0] } },
]);
hc('pat', 1.6, [
  { t: 0, pose: { body: [0, 0, 0], ...NECK0, legTuck: [-70, 0, 0], shin: [120, 0, 0] } },
  { t: 0.5, pose: { body: [10, 0, 0], n1: [30, 0, 0], n2: [34, 0, 0], n3: [28, 0, 0], n4: [10, 0, 0], hhead: [-16, 0, 0], wingL: [0, 0, 40] } },
  { t: 0.8, pose: { hhead: [6, 0, 0] } },
  { t: 1.1, pose: { hhead: [-16, 0, 0] } },
  { t: 1.6, pose: { body: [0, 0, 0], ...NECK0, wingL: [0, 0, 0] } },
]);
hc('demoL', 3, [
  { t: 0, pose: { body: [0, 0, 8], wingL: [0, 0, 44], wingR: [0, 0, -44], ...NECK0, n2: [0, 0, -10], legTuck: [-70, 0, 0], shin: [120, 0, 0] } },
  { t: 1.5, pose: { body: [0, 0, 10], wingL: [0, 0, 50], wingR: [0, 0, -50] } },
  { t: 3, pose: { body: [0, 0, 8], wingL: [0, 0, 44], wingR: [0, 0, -44] } },
]);
hc('demoR', 3, [
  { t: 0, pose: { body: [0, 0, -8], wingL: [0, 0, 44], wingR: [0, 0, -44], ...NECK0, n2: [0, 0, 10], legTuck: [-70, 0, 0], shin: [120, 0, 0] } },
  { t: 1.5, pose: { body: [0, 0, -10], wingL: [0, 0, 50], wingR: [0, 0, -50] } },
  { t: 3, pose: { body: [0, 0, -8], wingL: [0, 0, 44], wingR: [0, 0, -44] } },
]);
hc('demoF', 3, [
  { t: 0, pose: { body: [14, 0, 0], wingL: [-40, 0, 20], wingR: [-40, 0, -20], ...NECK0, n1: [8, 0, 0], legTuck: [-70, 0, 0], shin: [120, 0, 0] } },
  { t: 1.5, pose: { body: [18, 0, 0] } },
  { t: 3, pose: { body: [14, 0, 0] } },
]);
hc('demoB', 3, [
  { t: 0, pose: { body: [-12, 0, 0], wingL: [30, 0, 30], wingR: [30, 0, -30], ...NECK0, n1: [-8, 0, 0], legTuck: [-70, 0, 0], shin: [120, 0, 0] } },
  { t: 1.5, pose: { body: [-15, 0, 0] } },
  { t: 3, pose: { body: [-12, 0, 0] } },
]);
hc('lower', 1.4, [
  { t: 0, pose: { body: [0, 0, 0], ...NECK0, legTuck: [-70, 0, 0], shin: [120, 0, 0] } },
  { t: 0.7, pose: { body: [12, 0, 0], n1: [16, 0, 0], n2: [18, 0, 0], n3: [14, 0, 0], hhead: [14, 0, 0] } },
  { t: 1.4, pose: { body: [0, 0, 0], ...NECK0 } },
]);
hc('tiptoe', 0.8, [
  { t: 0, pose: { body: [4, 0, 2], legTuck: [-30, 0, 0], shin: [60, 0, 0], ...NECK0 } },
  { t: 0.4, pose: { body: [4, 0, -2], legTuck: [-70, 0, 0], shin: [120, 0, 0], n3: [6, 0, 0] } },
  { t: 0.8, pose: { body: [4, 0, 2], legTuck: [-30, 0, 0], shin: [60, 0, 0], n3: [0, 0, 0] } },
]);

// ---- Coach Bolster ----
export const WALRUS_CLIPS = {};
const wc = (name, dur, keys) => { WALRUS_CLIPS[name] = poseClip(name, dur, keys, { wbody: [0, 1.1, 0] }); };
wc('bounce', 0.8, [
  { t: 0, pose: { wbody: [0, 0, 0], flipL: [0, 0, 20], flipR: [0, 0, -20], whead: [0, 0, 0] }, pos: { wbody: [0, 0, 0] } },
  { t: 0.4, pose: { wbody: [4, 0, 0], flipL: [0, 0, 32], flipR: [0, 0, -32], whead: [-6, 0, 0] }, pos: { wbody: [0, 0.08, 0] } },
  { t: 0.8, pose: { wbody: [0, 0, 0], flipL: [0, 0, 20], flipR: [0, 0, -20], whead: [0, 0, 0] }, pos: { wbody: [0, 0, 0] } },
]);
wc('clap', 0.46, [
  { t: 0, pose: { wbody: [2, 0, 0], flipL: [-70, -30, 30], flipR: [-70, 30, -30], whead: [-6, 0, 0] }, pos: { wbody: [0, 0, 0] } },
  { t: 0.23, pose: { flipL: [-76, 24, 10], flipR: [-76, -24, -10] }, pos: { wbody: [0, 0.03, 0] } },
  { t: 0.46, pose: { flipL: [-70, -30, 30], flipR: [-70, 30, -30] }, pos: { wbody: [0, 0, 0] } },
]);
wc('inhale', 1.8, [
  { t: 0, pose: { wbody: [0, 0, 0], flipL: [0, 0, 20], flipR: [0, 0, -20], whead: [0, 0, 0] }, pos: { wbody: [0, 0, 0] } },
  { t: 1, pose: { wbody: [-12, 0, 0], flipL: [0, 0, 70], flipR: [0, 0, -70], whead: [-18, 0, 0] }, pos: { wbody: [0, 0.16, 0] } },
  { t: 1.25, pose: { wbody: [10, 0, 0], flipL: [0, 0, 16], flipR: [0, 0, -16], whead: [8, 0, 0] }, pos: { wbody: [0, -0.04, 0] } },
  { t: 1.8, pose: { wbody: [0, 0, 0], flipL: [0, 0, 20], flipR: [0, 0, -20], whead: [0, 0, 0] }, pos: { wbody: [0, 0, 0] } },
]);
wc('salute', 1.2, [
  { t: 0, pose: { wbody: [0, 0, 0], flipL: [0, 0, 20], flipR: [0, 0, -20], whead: [0, 0, 0] }, pos: { wbody: [0, 0, 0] } },
  { t: 0.3, pose: { flipR: [-120, 0, -68], whead: [-4, 0, 0] } },
  { t: 0.9, pose: { flipR: [-120, 0, -68], whead: [-4, 0, 0] } },
  { t: 1.2, pose: { flipR: [0, 0, -20], whead: [0, 0, 0] } },
]);
wc('catch', 0.9, [
  { t: 0, pose: { wbody: [0, 0, 0], flipL: [0, 0, 20], flipR: [0, 0, -20] }, pos: { wbody: [0, 0, 0] } },
  { t: 0.25, pose: { wbody: [14, 0, 0], flipL: [-60, 0, 44], flipR: [-60, 0, -44] }, pos: { wbody: [0, -0.1, 0] } },
  { t: 0.6, pose: { wbody: [-6, 0, 0], flipL: [-110, 0, 30], flipR: [-110, 0, -30] }, pos: { wbody: [0, 0.06, 0] } },
  { t: 0.9, pose: { wbody: [0, 0, 0], flipL: [0, 0, 20], flipR: [0, 0, -20] }, pos: { wbody: [0, 0, 0] } },
]);
wc('stand', 2, [
  { t: 0, pose: { wbody: [0, 0, 0], flipL: [0, 0, 18], flipR: [0, 0, -18], whead: [0, 0, 0] }, pos: { wbody: [0, 0, 0] } },
  { t: 1, pose: { wbody: [1, 0, 0], flipL: [0, 0, 22], flipR: [0, 0, -22], whead: [-2, 0, 0] }, pos: { wbody: [0, 0.015, 0] } },
  { t: 2, pose: { wbody: [0, 0, 0], flipL: [0, 0, 18], flipR: [0, 0, -18], whead: [0, 0, 0] }, pos: { wbody: [0, 0, 0] } },
]);

// ---- Gary ----
export const GULL_CLIPS = {};
const gc = (name, dur, keys) => { GULL_CLIPS[name] = poseClip(name, dur, keys, { gbody: [0, 0.28, 0] }); };
gc('fly', 0.4, [
  { t: 0, pose: { gwingL: [0, 0, 44], gwingR: [0, 0, -44], gbody: [12, 0, 0], ghead: [-10, 0, 0] } },
  { t: 0.2, pose: { gwingL: [0, 0, -36], gwingR: [0, 0, 36] } },
  { t: 0.4, pose: { gwingL: [0, 0, 44], gwingR: [0, 0, -44] } },
]);
gc('land', 0.4, [
  { t: 0, pose: { gwingL: [0, 0, 60], gwingR: [0, 0, -60], gbody: [-16, 0, 0], ghead: [10, 0, 0] } },
  { t: 0.25, pose: { gwingL: [0, 0, 30], gwingR: [0, 0, -30], gbody: [-6, 0, 0] } },
  { t: 0.4, pose: { gwingL: [0, 0, 0], gwingR: [0, 0, 0], gbody: [0, 0, 0], ghead: [0, 0, 0] } },
]);
gc('peck', 0.6, [
  { t: 0, pose: { gwingL: [0, 0, 0], gwingR: [0, 0, 0], gbody: [0, 0, 0], ghead: [0, 0, 0] } },
  { t: 0.15, pose: { gbody: [30, 0, 0], ghead: [20, 0, 0] } },
  { t: 0.3, pose: { gbody: [8, 0, 0], ghead: [0, 0, 0] } },
  { t: 0.45, pose: { gbody: [30, 0, 0], ghead: [20, 0, 0] } },
  { t: 0.6, pose: { gbody: [0, 0, 0], ghead: [0, 0, 0] } },
]);
gc('squawk', 0.7, [
  { t: 0, pose: { gwingL: [0, 0, 0], gwingR: [0, 0, 0], gbody: [0, 0, 0], ghead: [0, 0, 0] } },
  { t: 0.15, pose: { gwingL: [0, 0, 50], gwingR: [0, 0, -50], gbody: [-14, 0, 0], ghead: [-34, 0, 0] } },
  { t: 0.5, pose: { gwingL: [0, 0, 40], gwingR: [0, 0, -40], gbody: [-14, 0, 0], ghead: [-40, 0, 0] } },
  { t: 0.7, pose: { gwingL: [0, 0, 0], gwingR: [0, 0, 0], gbody: [0, 0, 0], ghead: [0, 0, 0] } },
]);
gc('stand', 2, [
  { t: 0, pose: { gwingL: [0, 0, 0], gwingR: [0, 0, 0], gbody: [0, 0, 0], ghead: [0, 0, 0] } },
  { t: 1, pose: { ghead: [0, 22, 0] } },
  { t: 2, pose: { ghead: [0, 0, 0] } },
]);
