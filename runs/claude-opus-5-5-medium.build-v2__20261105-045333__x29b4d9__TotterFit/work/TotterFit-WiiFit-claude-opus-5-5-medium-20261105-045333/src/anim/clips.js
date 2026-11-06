// poseClip compiles { t, pose: { joint: [x,y,z deg] } } keyframes into quaternion tracks.
import * as THREE from 'three/webgpu';
const e = new THREE.Euler(), q = new THREE.Quaternion(), D = Math.PI / 180;
export function poseClip(name, duration, keys, loop = true) {
  const joints = new Set(); for (const k of keys) for (const j in k.pose) joints.add(j);
  const tracks = [];
  for (const j of joints) {
    const times = [], vals = []; let last = [0, 0, 0];
    for (const k of keys) {
      const a = k.pose[j] || (k.keep ? last : [0, 0, 0]); last = a;
      e.set(a[0] * D, a[1] * D, a[2] * D); q.setFromEuler(e); times.push(k.t); vals.push(q.x, q.y, q.z, q.w);
    }
    tracks.push(new THREE.QuaternionKeyframeTrack(`${j}.quaternion`, times, vals));
  }
  const c = new THREE.AnimationClip(name, duration, tracks); c.userData = { loop }; return c;
}
const A = (o) => o; // readability
const armsDown = { shoulderL: [0, 0, -8], shoulderR: [0, 0, 8] };
function hold(name, pose) { return poseClip(name, 1, [{ t: 0, pose }, { t: 1, pose }]); }
const loopKeys = (name, dur, poses) => poseClip(name, dur, poses.map((pose, i) => ({ t: i / (poses.length - 1) * dur, pose })));
export const DOLL_CLIPS = () => [
  loopKeys('idle', 2.4, [A({ ...armsDown, spine: [2, 0, 0], head: [-2, 0, 0] }), A({ shoulderL: [0, 0, -11], shoulderR: [0, 0, 11], spine: [-1, 0, 0], head: [2, 4, 0] }), A({ ...armsDown, spine: [2, 0, 0], head: [-2, 0, 0] })]),
  loopKeys('breathe', 4, [A({ ...armsDown, spine: [0, 0, 0] }), A({ shoulderL: [0, 0, -24], shoulderR: [0, 0, 24], spine: [-4, 0, 0], head: [-6, 0, 0] }), A({ ...armsDown, spine: [0, 0, 0] })]),
  loopKeys('walk', .7, [
    A({ hipL: [-26, 0, 0], kneeL: [8, 0, 0], hipR: [26, 0, 0], kneeR: [28, 0, 0], shoulderL: [24, 0, -6], shoulderR: [-24, 0, 6], elbowL: [-14, 0, 0], elbowR: [-20, 0, 0] }),
    A({ hipL: [26, 0, 0], kneeL: [28, 0, 0], hipR: [-26, 0, 0], kneeR: [8, 0, 0], shoulderL: [-24, 0, -6], shoulderR: [24, 0, 6], elbowL: [-20, 0, 0], elbowR: [-14, 0, 0] }),
    A({ hipL: [-26, 0, 0], kneeL: [8, 0, 0], hipR: [26, 0, 0], kneeR: [28, 0, 0], shoulderL: [24, 0, -6], shoulderR: [-24, 0, 6], elbowL: [-14, 0, 0], elbowR: [-20, 0, 0] })]),
  loopKeys('jog', .48, [
    A({ hipL: [-44, 0, 0], kneeL: [20, 0, 0], hipR: [34, 0, 0], kneeR: [62, 0, 0], shoulderL: [40, 0, -10], shoulderR: [-40, 0, 10], elbowL: [-70, 0, 0], elbowR: [-70, 0, 0], spine: [8, 0, 0] }),
    A({ hipL: [34, 0, 0], kneeL: [62, 0, 0], hipR: [-44, 0, 0], kneeR: [20, 0, 0], shoulderL: [-40, 0, -10], shoulderR: [40, 0, 10], elbowL: [-70, 0, 0], elbowR: [-70, 0, 0], spine: [8, 0, 0] }),
    A({ hipL: [-44, 0, 0], kneeL: [20, 0, 0], hipR: [34, 0, 0], kneeR: [62, 0, 0], shoulderL: [40, 0, -10], shoulderR: [-40, 0, 10], elbowL: [-70, 0, 0], elbowR: [-70, 0, 0], spine: [8, 0, 0] })]),
  poseClip('hop', .4, [{ t: 0, pose: { hipL: [-30, 0, 0], kneeL: [50, 0, 0], hipR: [-30, 0, 0], kneeR: [50, 0, 0], shoulderL: [40, 0, -30], shoulderR: [40, 0, 30] } }, { t: .15, pose: { hipL: [10, 0, 0], kneeL: [10, 0, 0], hipR: [10, 0, 0], kneeR: [10, 0, 0], shoulderL: [-20, 0, -130], shoulderR: [-20, 0, 130] } }, { t: .4, pose: { hipL: [-10, 0, 0], kneeL: [20, 0, 0], hipR: [-10, 0, 0], kneeR: [20, 0, 0], shoulderL: [0, 0, -40], shoulderR: [0, 0, 40] } }], false),
  poseClip('land', .3, [{ t: 0, pose: { hipL: [-40, 0, 0], kneeL: [70, 0, 0], hipR: [-40, 0, 0], kneeR: [70, 0, 0], spine: [24, 0, 0], shoulderL: [0, 0, -60], shoulderR: [0, 0, 60] } }, { t: .3, pose: { spine: [0, 0, 0], ...armsDown } }], false),
  loopKeys('cheer', .6, [A({ shoulderL: [0, 0, -150], shoulderR: [0, 0, 150], elbowL: [0, 0, -10], elbowR: [0, 0, 10], head: [-8, 0, 0] }), A({ shoulderL: [0, 0, -170], shoulderR: [0, 0, 170], elbowL: [-30, 0, 0], elbowR: [-30, 0, 0], head: [4, 0, 0], spine: [-6, 0, 0] }), A({ shoulderL: [0, 0, -150], shoulderR: [0, 0, 150], elbowL: [0, 0, -10], elbowR: [0, 0, 10], head: [-8, 0, 0] })]),
  loopKeys('clap', .4, [A({ shoulderL: [-60, 30, -6], shoulderR: [-60, -30, 6], elbowL: [-50, 0, 0], elbowR: [-50, 0, 0] }), A({ shoulderL: [-60, 6, -6], shoulderR: [-60, -6, 6], elbowL: [-60, 0, 0], elbowR: [-60, 0, 0], head: [6, 0, 0] }), A({ shoulderL: [-60, 30, -6], shoulderR: [-60, -30, 6], elbowL: [-50, 0, 0], elbowR: [-50, 0, 0] })]),
  poseClip('shrug', .8, [{ t: 0, pose: { ...armsDown } }, { t: .3, pose: { shoulderL: [0, 0, -52], shoulderR: [0, 0, 52], elbowL: [-80, 0, 0], elbowR: [-80, 0, 0], head: [0, 0, 12] } }, { t: .8, pose: { ...armsDown } }], false),
  poseClip('bow', 1, [{ t: 0, pose: { spine: [0, 0, 0] } }, { t: .4, pose: { spine: [52, 0, 0], head: [14, 0, 0], ...armsDown } }, { t: 1, pose: { spine: [0, 0, 0] } }], false),
  loopKeys('flail', .22, [A({ shoulderL: [120, 0, -100], shoulderR: [-120, 0, 100], elbowL: [-40, 0, 0], elbowR: [-40, 0, 0], head: [0, 0, 10] }), A({ shoulderL: [-120, 0, -100], shoulderR: [120, 0, 100], elbowL: [-40, 0, 0], elbowR: [-40, 0, 0], head: [0, 0, -10] }), A({ shoulderL: [120, 0, -100], shoulderR: [-120, 0, 100], elbowL: [-40, 0, 0], elbowR: [-40, 0, 0], head: [0, 0, 10] })]),
  hold('sleep', { spine: [20, 0, 0], head: [32, 0, 16], ...armsDown }),
  hold('flop', { spine: [70, 0, 0], head: [20, 0, 0], shoulderL: [-160, 0, -20], shoulderR: [-160, 0, 20], hipL: [10, 0, 6], hipR: [10, 0, -6] }),
  // The eight poses (src/data/poses.js).
  hold('pose_heron', { hipR: [-70, 0, 0], kneeR: [100, 0, 0], shoulderL: [0, 0, -92], shoulderR: [0, 0, 92], head: [6, 0, 0] }),
  hold('pose_pine', { shoulderL: [0, 0, -170], shoulderR: [0, 0, 170], spine: [-10, 0, 0], head: [22, 0, 0], hipL: [0, 0, -4], hipR: [0, 0, 4] }),
  hold('pose_chair', { hipL: [-68, 0, 0], kneeL: [80, 0, 0], hipR: [-68, 0, 0], kneeR: [80, 0, 0], spine: [34, 0, 0], shoulderL: [-90, 0, -10], shoulderR: [-90, 0, 10] }),
  hold('pose_keeper', { shoulderL: [-175, 0, -6], shoulderR: [0, 0, 62], elbowR: [-110, 0, 0], head: [-14, 30, 0], hipL: [0, 0, -14] }),
  hold('pose_flamingo', { hipL: [-20, 0, -40], kneeL: [100, 0, 0], shoulderL: [-30, 0, -120], shoulderR: [-30, 0, 120], elbowL: [-60, 0, 0], elbowR: [-60, 0, 0], head: [-12, 0, 8] }),
  hold('pose_goodbye', { hipR: [40, 0, 0], kneeR: [20, 0, 0], shoulderL: [-160, 0, -30], spine: [20, 0, 0], shoulderR: [30, 0, 10], head: [-20, 0, 0] }),
  hold('pose_umbrella', { shoulderL: [0, 0, -40], shoulderR: [-170, 0, 12], elbowR: [-30, 0, 0], spine: [0, 0, -12], head: [0, 0, -16], hipL: [0, 0, -12], hipR: [0, 0, 12] }),
  hold('pose_regret', { spine: [46, 0, 12], head: [30, 0, 0], shoulderL: [-40, 0, -10], shoulderR: [-40, 0, 10], elbowL: [-80, 0, 0], elbowR: [-80, 0, 0], hipL: [-14, 0, 0], kneeL: [28, 0, 0] }),
  // Scrubbed.
  poseClip('squat', 1, [{ t: 0, pose: { hipL: [0, 0, 0], kneeL: [0, 0, 0], ankleL: [0, 0, 0], hipR: [0, 0, 0], kneeR: [0, 0, 0], ankleR: [0, 0, 0], spine: [0, 0, 0], shoulderL: [0, 0, -150], shoulderR: [0, 0, 150], elbowL: [-120, 0, 0], elbowR: [-120, 0, 0] } }, { t: 1, pose: { hipL: [-96, 0, 0], kneeL: [120, 0, 0], ankleL: [-24, 0, 0], hipR: [-96, 0, 0], kneeR: [120, 0, 0], ankleR: [-24, 0, 0], spine: [28, 0, 0], shoulderL: [0, 0, -150], shoulderR: [0, 0, 150], elbowL: [-120, 0, 0], elbowR: [-120, 0, 0] } }]),
  hold('plank', { spine: [0, 0, 0], head: [-50, 0, 0], shoulderL: [-90, 0, 0], shoulderR: [-90, 0, 0], hipL: [0, 0, 0], hipR: [0, 0, 0] }),
  hold('sit', { hipL: [-90, 30, -30], kneeL: [130, 0, 0], hipR: [-90, -30, 30], kneeR: [130, 0, 0], shoulderL: [-30, 0, -14], shoulderR: [-30, 0, 14], elbowL: [-50, 0, 0], elbowR: [-50, 0, 0] }),
  hold('tug', { spine: [-16, 0, 0], hipL: [-46, 0, 0], kneeL: [46, 0, 0], hipR: [-20, 0, 0], kneeR: [14, 0, 0], shoulderL: [-84, 16, 0], shoulderR: [-84, -16, 0], elbowL: [-12, 0, 0], elbowR: [-12, 0, 0] }),
  poseClip('hipCircle', 1, [{ t: 0, pose: { hips: [0, 0, 10], spine: [0, 0, -10], shoulderL: [0, 0, -60], shoulderR: [0, 0, 60], elbowL: [-60, 0, 0], elbowR: [-60, 0, 0] } }, { t: .25, pose: { hips: [10, 0, 0], spine: [-10, 0, 0], shoulderL: [0, 0, -60], shoulderR: [0, 0, 60], elbowL: [-60, 0, 0], elbowR: [-60, 0, 0] } }, { t: .5, pose: { hips: [0, 0, -10], spine: [0, 0, 10], shoulderL: [0, 0, -60], shoulderR: [0, 0, 60], elbowL: [-60, 0, 0], elbowR: [-60, 0, 0] } }, { t: .75, pose: { hips: [-10, 0, 0], spine: [10, 0, 0], shoulderL: [0, 0, -60], shoulderR: [0, 0, 60], elbowL: [-60, 0, 0], elbowR: [-60, 0, 0] } }, { t: 1, pose: { hips: [0, 0, 10], spine: [0, 0, -10], shoulderL: [0, 0, -60], shoulderR: [0, 0, 60], elbowL: [-60, 0, 0], elbowR: [-60, 0, 0] } }]),
  poseClip('stepL', .35, [{ t: 0, pose: { hipL: [-48, 0, 0], kneeL: [70, 0, 0], shoulderR: [30, 0, 10], shoulderL: [-20, 0, -10] } }, { t: .35, pose: { ...armsDown } }], false),
  poseClip('stepR', .35, [{ t: 0, pose: { hipR: [-48, 0, 0], kneeR: [70, 0, 0], shoulderL: [30, 0, -10], shoulderR: [-20, 0, 10] } }, { t: .35, pose: { ...armsDown } }], false),
  hold('carryTray', { shoulderL: [-78, 14, 0], shoulderR: [-78, -14, 0], elbowL: [-26, 0, 0], elbowR: [-26, 0, 0], head: [8, 0, 0] }),
  hold('holdSlab', { shoulderL: [0, 0, -170], shoulderR: [0, 0, 170], elbowL: [0, 0, 8], elbowR: [0, 0, -8], head: [-16, 0, 0] }),
  hold('holdHat', { shoulderL: [0, 0, -40], shoulderR: [0, 0, 40], elbowL: [-40, 0, 0], elbowR: [-40, 0, 0] }),
  hold('tuck', { hipL: [-120, 0, 0], kneeL: [130, 0, 0], hipR: [-120, 0, 0], kneeR: [130, 0, 0], spine: [40, 0, 0], head: [20, 0, 0], shoulderL: [-80, 0, 0], shoulderR: [-80, 0, 0], elbowL: [-100, 0, 0], elbowR: [-100, 0, 0] }),
  hold('pike', { hipL: [-100, 0, 0], hipR: [-100, 0, 0], spine: [20, 0, 0], shoulderL: [-100, 0, 0], shoulderR: [-100, 0, 0] }),
  hold('diveReady', { shoulderL: [-170, 0, -6], shoulderR: [-170, 0, 6], head: [-8, 0, 0] }),
  hold('splay', { shoulderL: [0, 0, -95], shoulderR: [0, 0, 95], hipL: [0, 0, -34], hipR: [0, 0, 34] }),
];
