import * as THREE from 'three/webgpu';
const D = Math.PI / 180;
// A pose spec in friendly terms -> joint euler degrees.
// aL/aR: {out, fwd, el}  lL/lR: {out, fwd, knee}  spine/head/hips: [x,y,z]  hy: hips height offset
export function pose(s = {}) {
  const o = {}; const arm = (n, sign, a) => { if (!a) return; o['shoulder' + n] = [-(a.fwd || 0), 0, sign * (a.out || 0)]; if (a.el) o['elbow' + n] = [-a.el, 0, 0]; };
  const leg = (n, sign, a) => { if (!a) return; o['hip' + n] = [-(a.fwd || 0), 0, sign * (a.out || 0)]; if (a.knee) o['knee' + n] = [a.knee, 0, 0]; if (a.ank) o['ankle' + n] = [a.ank, 0, 0]; };
  arm('L', -1, s.aL); arm('R', 1, s.aR); leg('L', -1, s.lL); leg('R', 1, s.lR);
  if (s.spine) o.spine = s.spine; if (s.head) o.head = s.head; if (s.hips) o.hips = s.hips; if (s.root) o.root = s.root;
  o._hy = s.hy || 0; return o;
}
const JOINTS = ['hips', 'spine', 'head', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR', 'root'];
export function poseClip(name, duration, keys, loop = true) {
  const tracks = []; const tms = keys.map((k) => k.t);
  for (const j of JOINTS) {
    const used = keys.some((k) => k.p[j]); if (!used) continue;
    const vals = [];
    keys.forEach((k) => { const e = k.p[j] || [0, 0, 0]; const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(e[0] * D, e[1] * D, e[2] * D)); vals.push(q.x, q.y, q.z, q.w); });
    tracks.push(new THREE.QuaternionKeyframeTrack(j + '.quaternion', tms, vals));
  }
  if (keys.some((k) => k.p._hy)) tracks.push(new THREE.VectorKeyframeTrack('hips.position', tms, keys.flatMap((k) => [0, 0.46 + (k.p._hy || 0), 0])));
  const c = new THREE.AnimationClip(name, duration, tracks); return c;
}
const loopKeys = (dur, ps) => ps.map((p, i) => ({ t: dur * i / (ps.length - 1), p }));
const A = (out, fwd = 0, el = 0) => ({ out, fwd, el });
const L = (out, fwd = 0, knee = 0) => ({ out, fwd, knee });
const idleP = (a) => pose({ aL: A(6 + a, 0, 5), aR: A(6 + a, 0, 5), lL: L(2), lR: L(2) });
export const POSES8 = [
  pose({ aL: A(20, 10), aR: A(100, 0), lL: L(0, 0, 0), lR: L(5, -55, 90), spine: [0, 0, 4] }), // Contented Heron
  pose({ aL: A(150), aR: A(150), lL: L(3), lR: L(3), spine: [-6, 0, 0] }), // Apologetic Pine
  pose({ aL: A(20, 100), aR: A(20, 100), lL: L(6, 5, 35), lR: L(6, 5, 35), spine: [14, 0, 0], hy: -0.12 }), // Deck Chair
  pose({ aL: A(100), aR: A(100), lL: L(2), lR: L(2), head: [0, 0, 8] }), // Lighthouse Keeper
  pose({ aL: A(125, 0, 10), aR: A(40, 10), lL: L(10, 0, 0), lR: L(30, 15, 60), spine: [0, 0, -5] }), // Startled Flamingo
  pose({ aL: A(20, 160), aR: A(20, 160), lL: L(20), lR: L(20), spine: [-8, 0, 0], head: [-10, 0, 0] }), // Long Goodbye
  pose({ aL: A(150, 0), aR: A(110, 20), lL: L(4), lR: L(4), spine: [0, 0, 6] }), // Umbrella
  pose({ aL: A(5, 70, 100), aR: A(5, 70, 100), lL: L(0), lR: L(0), head: [20, 0, 0], spine: [8, 0, 0] }), // Quiet Regret
];
const swing = (a) => pose({ aL: A(4, a, 12), aR: A(4, -a, 12), lL: L(0, -a), lR: L(0, a) });
const hopA = pose({ aL: A(40), aR: A(40), lL: L(0, 0, 20), lR: L(0, 0, 20), hy: -0.12 });
export const CLIPS = {
  idle: poseClip('idle', 3, loopKeys(3, [idleP(0), idleP(4), idleP(0)])),
  breathe: poseClip('breathe', 8, loopKeys(8, [pose({ aL: A(6, 0, 5), aR: A(6, 0, 5), spine: [-2, 0, 0] }), pose({ aL: A(22, 0, 5), aR: A(22, 0, 5), spine: [-4, 0, 0] }), pose({ aL: A(6, 0, 5), aR: A(6, 0, 5), spine: [-2, 0, 0] })])),
  walk: poseClip('walk', 0.7, loopKeys(0.7, [swing(32), pose({ aL: A(4, 0, 12), aR: A(4, 0, 12), hy: 0.02 }), swing(-32), pose({ aL: A(4, 0, 12), aR: A(4, 0, 12), hy: 0.02 }), swing(32)])),
  jog: poseClip('jog', 0.5, loopKeys(0.5, [pose({ aL: A(4, 50, 90), aR: A(4, -40, 90), lL: L(0, 45, 20), lR: L(0, -35, 70), hy: 0.02 }), pose({ aL: A(4, -40, 90), aR: A(4, 50, 90), lL: L(0, -35, 70), lR: L(0, 45, 20), hy: 0.02 }), pose({ aL: A(4, 50, 90), aR: A(4, -40, 90), lL: L(0, 45, 20), lR: L(0, -35, 70), hy: 0.02 })])),
  hop: poseClip('hop', 0.5, loopKeys(0.5, [hopA, pose({ aL: A(160), aR: A(160), lL: L(0, 0, 0), lR: L(0, 0, 0), hy: 0.05 }), hopA]), false),
  cheer: poseClip('cheer', 0.8, loopKeys(0.8, [pose({ aL: A(160), aR: A(100), hy: 0.02 }), pose({ aL: A(100), aR: A(160), hy: -0.03 }), pose({ aL: A(160), aR: A(100), hy: 0.02 })])),
  clap: poseClip('clap', 0.5, loopKeys(0.5, [pose({ aL: A(15, 80, 90), aR: A(15, 80, 90) }), pose({ aL: A(15, 80, 90), aR: A(15, 80, 90), spine: [0, 0, 0] }), pose({ aL: A(40, 60, 70), aR: A(40, 60, 70) }), pose({ aL: A(15, 80, 90), aR: A(15, 80, 90) })])),
  shrug: poseClip('shrug', 1.2, loopKeys(1.2, [idleP(0), pose({ aL: A(50, 0, 90), aR: A(50, 0, 90), head: [0, 0, 6] }), pose({ aL: A(50, 0, 90), aR: A(50, 0, 90), head: [0, 0, 6] }), idleP(0)]), false),
  bow: poseClip('bow', 1.6, loopKeys(1.6, [idleP(0), pose({ aL: A(6, 0, 5), aR: A(6, 0, 5), spine: [60, 0, 0] }), pose({ aL: A(6, 0, 5), aR: A(6, 0, 5), spine: [60, 0, 0] }), idleP(0)]), false),
  flail: poseClip('flail', 0.3, [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({ t: 0.3 * i / 8, p: pose({ aL: { out: 0, fwd: i * 45, el: 0 }, aR: { out: 0, fwd: -i * 45 + 0, el: 0 }, spine: [0, 0, (i % 2) * 4] }) }))),
  sleep: poseClip('sleep', 4, loopKeys(4, [pose({ aL: A(15, 0, 40), aR: A(15, 0, 40), head: [15, 0, 8], spine: [8, 0, 0] }), pose({ aL: A(18, 0, 40), aR: A(18, 0, 40), head: [18, 0, 8], spine: [10, 0, 0] }), pose({ aL: A(15, 0, 40), aR: A(15, 0, 40), head: [15, 0, 8], spine: [8, 0, 0] })])),
  squat: poseClip('squat', 1, [{ t: 0, p: pose({ aL: A(80, 10), aR: A(80, 10), hy: 0 }) }, { t: 1, p: pose({ aL: A(80, 20), aR: A(80, 20), lL: L(10, 70, 120), lR: L(10, 70, 120), spine: [18, 0, 0], hy: -0.22 }) }]),
  plank: poseClip('plank', 2, loopKeys(2, [pose({ aL: A(0, 0), aR: A(0, 0), lL: L(0), lR: L(0), root: [80, 0, 0], head: [-60, 0, 0] }), pose({ aL: A(0, 0), aR: A(0, 0), lL: L(0), lR: L(0), root: [82, 0, 0], head: [-62, 0, 0] }), pose({ aL: A(0, 0), aR: A(0, 0), lL: L(0), lR: L(0), root: [80, 0, 0], head: [-60, 0, 0] })])),
  sit: poseClip('sit', 3, loopKeys(3, [pose({ aL: A(15, 40, 80), aR: A(15, 40, 80), lL: L(25, 85, 110), lR: L(25, 85, 110), hy: -0.3 }), pose({ aL: A(16, 40, 80), aR: A(16, 40, 80), lL: L(25, 85, 110), lR: L(25, 85, 110), hy: -0.3 }), pose({ aL: A(15, 40, 80), aR: A(15, 40, 80), lL: L(25, 85, 110), lR: L(25, 85, 110), hy: -0.3 })])),
  tug: poseClip('tug', 1, loopKeys(1, [pose({ aL: A(10, 70, 40), aR: A(10, 70, 40), spine: [-14, 0, 0], lL: L(0, 20, 20), lR: L(0, -10, 30) }), pose({ aL: A(10, 80, 50), aR: A(10, 80, 50), spine: [-18, 0, 0], lL: L(0, 20, 20), lR: L(0, -10, 30) }), pose({ aL: A(10, 70, 40), aR: A(10, 70, 40), spine: [-14, 0, 0], lL: L(0, 20, 20), lR: L(0, -10, 30) })])),
  stepL: poseClip('stepL', 0.3, [{ t: 0, p: idleP(0) }, { t: 0.15, p: pose({ aL: A(30, 20, 40), aR: A(10), lL: L(8, 0, 30), lR: L(0), hy: 0.02 }) }, { t: 0.3, p: idleP(0) }], false),
  stepR: poseClip('stepR', 0.3, [{ t: 0, p: idleP(0) }, { t: 0.15, p: pose({ aR: A(30, 20, 40), aL: A(10), lR: L(8, 0, 30), lL: L(0), hy: 0.02 }) }, { t: 0.3, p: idleP(0) }], false),
  carry: poseClip('carry', 1, loopKeys(1, [pose({ aL: A(10, 80, 90), aR: A(10, 80, 90) }), pose({ aL: A(12, 82, 92), aR: A(12, 82, 92) }), pose({ aL: A(10, 80, 90), aR: A(10, 80, 90) })])),
  holdSlab: poseClip('holdSlab', 1, loopKeys(1, [pose({ aL: A(35, 0, 90), aR: A(35, 0, 90) }), pose({ aL: A(36, 0, 92), aR: A(36, 0, 92) }), pose({ aL: A(35, 0, 90), aR: A(35, 0, 90) })])),
  tuck: poseClip('tuck', 0.3, [{ t: 0, p: idleP(0) }, { t: 0.3, p: pose({ aL: A(10, 80, 100), aR: A(10, 80, 100), lL: L(0, 100, 130), lR: L(0, 100, 130), spine: [40, 0, 0] }) }], false),
  pike: poseClip('pike', 0.3, [{ t: 0, p: idleP(0) }, { t: 0.3, p: pose({ aL: A(10, 90), aR: A(10, 90), lL: L(0, 95), lR: L(0, 95), spine: [60, 0, 0] }) }], false),
  diveReady: poseClip('diveReady', 0.8, loopKeys(0.8, [pose({ aL: A(170), aR: A(170), lL: L(0, 0, 5), lR: L(0, 0, 5) }), pose({ aL: A(150), aR: A(150), lL: L(0, 0, 25), lR: L(0, 0, 25), hy: -0.06 }), pose({ aL: A(170), aR: A(170) })])),
  hip: poseClip('hip', 1, loopKeys(1, [pose({ aL: A(70, 40, 40), aR: A(70, 40, 40), spine: [0, 0, 8] }), pose({ aL: A(70, 40, 40), aR: A(70, 40, 40), spine: [8, 0, 0] }), pose({ aL: A(70, 40, 40), aR: A(70, 40, 40), spine: [0, 0, -8] }), pose({ aL: A(70, 40, 40), aR: A(70, 40, 40), spine: [-8, 0, 0] }), pose({ aL: A(70, 40, 40), aR: A(70, 40, 40), spine: [0, 0, 8] })])),
  flop: poseClip('flop', 1, loopKeys(1, [pose({ aL: A(90), aR: A(90), lL: L(30), lR: L(30), root: [-80, 0, 0], hy: -0.3 }), pose({ aL: A(100), aR: A(100), lL: L(35), lR: L(35), root: [-82, 0, 0], hy: -0.3 }), pose({ aL: A(90), aR: A(90), lL: L(30), lR: L(30), root: [-80, 0, 0], hy: -0.3 })])),
};
POSES8.forEach((p, i) => { CLIPS['pose' + i] = poseClip('pose' + i, 1, [{ t: 0, p: idleP(0) }, { t: 0.6, p }, { t: 1, p }], false); });
