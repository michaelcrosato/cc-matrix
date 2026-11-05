/* ---- BODY CLIPS (plan §7.3): every celebration, taunt and dunk is a keyframed clip over the body's channels: the two hands
 * (rig frame, size 1: forward, right, up), the body's height (a hop, visual only), the rig's pose (cheer, crouch, guard,
 * hips, down, block), a squash (rig.kick) and a landing. A clip is data; the sampler interpolates the numbers and holds the
 * discrete pose. The engine's rig draws it; the match's physics doesn't read it. ---- */
const CLIP_CELEBRATE = {
  chestPound: { len: 1.2, keys: [[0, { R: [3, 1, 25], L: [3, -1, 25], z: 0, pose: 'cheer' }], [.25, { R: [3, 2, 14], L: [3, -2, 14], z: 1, pose: 'crouch', kick: -.6 }], [.5, { R: [3, 1, 25], L: [3, -1, 25], z: 0, pose: 'cheer' }], [.75, { R: [3, 2, 14], L: [3, -2, 14], z: 1, pose: 'crouch', kick: -.6 }], [1.2, { R: [3, 1, 25], L: [3, -1, 25], z: 0, pose: 'cheer' }]] },
  flex: { len: 1.2, keys: [[0, { R: [4, 3, 20], L: [4, -3, 20], z: 0, pose: 'guard' }], [.5, { R: [1, 6, 30], L: [1, -6, 30], z: 2, pose: 'cheer', kick: .8 }], [1.2, { R: [1, 6, 30], L: [1, -6, 30], z: 0, pose: 'cheer' }]] },
  raiseRoof: { len: 1.4, keys: [[0, { R: [2, 5, 34], L: [2, -5, 34], z: 0, pose: 'cheer', lean: -.12 }], [.35, { R: [2, 5, 42], L: [2, -5, 42], z: 3, pose: 'cheer', kick: .6, lean: -.18 }], [.7, { R: [2, 5, 34], L: [2, -5, 34], z: 0, pose: 'cheer', lean: -.12 }], [1.05, { R: [2, 5, 42], L: [2, -5, 42], z: 3, pose: 'cheer', kick: .6, lean: -.18 }], [1.4, { R: [2, 5, 34], L: [2, -5, 34], z: 0, pose: 'cheer', lean: -.12 }]] },
  pointSky: { len: 1.2, keys: [[0, { R: [4, 2, 22], L: [4, -2, 22], z: 0, pose: 'guard' }], [.4, { R: [2, 3, 46], L: [3, -1, 22], z: 4, pose: 'cheer', kick: .8 }], [1.2, { R: [2, 3, 46], L: [3, -1, 22], z: 2, pose: 'cheer' }]] },
  airplane: { len: 1.4, keys: [[0, { R: [2, 4, 24], L: [2, -4, 24], z: 0, pose: 'guard' }], [.5, { R: [0, 12, 24], L: [0, -12, 24], z: 3, pose: 'cheer', kick: .5 }], [1.4, { R: [0, 12, 24], L: [0, -12, 24], z: 1, pose: 'cheer' }]] },
  fingerGuns: { len: 1, keys: [[0, { R: [4, 3, 16], L: [4, -3, 16], z: 0, pose: 'guard' }], [.3, { R: [4, 3, 22], L: [4, -3, 22], z: 1, pose: 'cheer', kick: .4 }], [1, { R: [4, 3, 22], L: [4, -3, 22], z: 0, pose: 'cheer' }]] },
  surfBalance: { len: 1.2, keys: [[0, { R: [2, 6, 30], L: [2, -6, 30], z: 0, pose: 'cheer' }], [.6, { R: [1, 9, 28], L: [1, -9, 28], z: 1, pose: 'cheer' }], [1.2, { R: [2, 6, 30], L: [2, -6, 30], z: 0, pose: 'cheer' }]] },
  goggles: { len: 1, keys: [[0, { R: [4, 2, 20], L: [4, -2, 20], z: 0, pose: 'guard' }], [.5, { R: [3, 0, 36], L: [3, 0, 36], z: 0, pose: 'cheer' }], [1, { R: [3, 0, 36], L: [3, 0, 36], z: 0, pose: 'cheer' }]] },
  fingerWag: { len: 1, keys: [[0, { R: [5, 2, 26], L: [5, -2, 26], z: 0, pose: 'guard' }], [.5, { R: [5, 2, 20], L: [5, -2, 20], z: 0, pose: 'guard', kick: .2 }], [1, { R: [5, 2, 26], L: [5, -2, 26], z: 0, pose: 'guard' }]] },
  shimmy: { len: 1, keys: [[0, { R: [3, 4, 20], L: [3, -4, 20], z: 0, pose: 'guard' }], [.25, { R: [3, 5, 20], L: [3, -5, 20], z: 1, pose: 'crouch' }], [.5, { R: [3, 3, 20], L: [3, -3, 20], z: 0, pose: 'guard' }], [.75, { R: [3, 5, 20], L: [3, -5, 20], z: 1, pose: 'crouch' }], [1, { R: [3, 4, 20], L: [3, -4, 20], z: 0, pose: 'guard' }]] },
  watchTap: { len: 1, keys: [[0, { R: [4, 2, 22], L: [4, -2, 22], z: 0, pose: 'guard' }], [.5, { R: [4, 1, 18], L: [4, -1, 18], z: 0, pose: 'guard', kick: .3 }], [1, { R: [4, 2, 22], L: [4, -2, 22], z: 0, pose: 'guard' }]] },
  crossArms: { len: 1.2, keys: [[0, { R: [4, 0, 22], L: [4, 0, 22], z: 0, pose: 'guard' }], [1.2, { R: [4, 0, 22], L: [4, 0, 22], z: 0, pose: 'guard' }]] },
  blowFingers: { len: 1, keys: [[0, { R: [5, 1, 24], L: [5, -1, 24], z: 0, pose: 'guard' }], [.5, { R: [5, 1, 26], L: [5, -1, 26], z: 0, pose: 'hips' }], [1, { R: [5, 1, 24], L: [5, -1, 24], z: 0, pose: 'guard' }]] },
  pogo: { len: 1.2, keys: [[0, { R: [2, 2, 32], L: [2, -2, 32], z: 0, pose: 'cheer' }], [.2, { R: [2, 2, 32], L: [2, -2, 32], z: 0, pose: 'crouch', kick: -.5 }], [.6, { R: [2, 2, 32], L: [2, -2, 32], z: 8, pose: 'cheer', kick: .5 }], [1.0, { R: [2, 2, 32], L: [2, -2, 32], z: 0, pose: 'crouch', kick: -.5 }], [1.2, { R: [2, 2, 32], L: [2, -2, 32], z: 0, pose: 'cheer' }]] },
  robotDance: { len: 1.4, keys: [[0, { R: [3, 3, 26], L: [3, -3, 26], z: 0, pose: 'guard' }], [.35, { R: [3, 5, 26], L: [3, -5, 26], z: 1, pose: 'guard' }], [.7, { R: [3, -4, 26], L: [3, 4, 26], z: 0, pose: 'guard' }], [1.05, { R: [3, 5, 26], L: [3, -5, 26], z: 1, pose: 'guard' }], [1.4, { R: [3, 3, 26], L: [3, -3, 26], z: 0, pose: 'guard' }]] },
  robotPop: { len: 1, keys: [[0, { R: [4, 2, 24], L: [4, -2, 24], z: 0, pose: 'guard' }], [.2, { R: [5, 2, 30], L: [5, -2, 30], z: 2, pose: 'cheer', kick: .6 }], [1, { R: [4, 2, 24], L: [4, -2, 24], z: 0, pose: 'guard' }]] },
  processing: { len: 1.2, keys: [[0, { R: [4, 0, 24], L: [4, 0, 24], z: 0, pose: 'guard' }], [.6, { R: [4, 0, 24], L: [4, 0, 24], z: 0, pose: 'guard', kick: .2 }], [1.2, { R: [4, 0, 24], L: [4, 0, 24], z: 0, pose: 'guard' }]] },
  glitchWave: { len: 1.2, keys: [[0, { R: [4, -4, 22], L: [4, 4, 22], z: 0, pose: 'guard' }], [.3, { R: [4, 4, 22], L: [4, -4, 22], z: 0, pose: 'guard' }], [.6, { R: [4, -4, 22], L: [4, 4, 22], z: 0, pose: 'guard' }], [.9, { R: [4, 4, 22], L: [4, -4, 22], z: 0, pose: 'guard' }], [1.2, { R: [4, -4, 22], L: [4, 4, 22], z: 0, pose: 'guard' }]] },
  pointCam: { len: 1, keys: [[0, { R: [4, 2, 20], L: [4, -2, 20], z: 0, pose: 'guard' }], [.4, { R: [6, 0, 24], L: [4, -2, 20], z: 0, pose: 'cheer', kick: .3 }], [1, { R: [6, 0, 24], L: [4, -2, 20], z: 0, pose: 'cheer' }]] },
  micDrop: { len: 1.2, keys: [[0, { R: [5, 2, 20], L: [5, -2, 20], z: 0, pose: 'guard' }], [.5, { R: [5, 2, 16], L: [5, -2, 16], z: 0, pose: 'crouch', kick: .6 }], [1.2, { R: [5, 2, 16], L: [5, -2, 16], z: 0, pose: 'crouch' }]] },
  chestDrum: { len: 1.2, keys: [[0, { R: [3, 0, 22], L: [3, 0, 22], z: 0, pose: 'cheer' }], [.2, { R: [3, 1, 18], L: [3, -1, 18], z: 1, pose: 'crouch', kick: -.4 }], [.4, { R: [3, 0, 22], L: [3, 0, 22], z: 0, pose: 'cheer' }], [.6, { R: [3, 1, 18], L: [3, -1, 18], z: 1, pose: 'crouch', kick: -.4 }], [1.2, { R: [3, 0, 22], L: [3, 0, 22], z: 0, pose: 'cheer' }]] }
};
/** the sampler: the numbers interpolate between keys, the pose and the kick take the key at or before t */
const sampleClip = (clip, t) => {
  const K = clip.keys, tt = clamp(t, 0, clip.len);
  let i = 0; while (i < K.length - 1 && K[i + 1][0] <= tt) i++;
  const a = K[i], b = K[Math.min(i + 1, K.length - 1)];
  const f = b[0] > a[0] ? (tt - a[0]) / (b[0] - a[0]) : 0;
  const lerpV = (x, y) => [0, 1, 2].map(j => lerp(x[j], y[j], clamp(f, 0, 1)));
  return { R: lerpV(a[1].R, b[1].R), L: lerpV(a[1].L, b[1].L), z: lerp(a[1].z, b[1].z, clamp(f, 0, 1)), lean: lerp(a[1].lean || 0, b[1].lean || 0, clamp(f, 0, 1)), pose: a[1].pose, kick: a[1].kick || 0 };
};
const CLIP_ACTION = {
  pass: { len: .2, keys: [[0, { R: [4, 2, 18], L: [4, -2, 18], z: 0, pose: 'guard', lean: -.1 }], [.08, { R: [4, 2, 18], L: [4, -2, 18], z: 0, pose: 'guard', lean: -.1 }], [.2, { R: [11, 1, 20], L: [11, -1, 20], z: 0, pose: 'guard', lean: .25 }]] },
  steal: { len: .4, keys: [[0, { R: [2, 3, 10], L: [2, -3, 10], z: 0, pose: 'crouch', lean: .2 }], [.2, { R: [2, 3, 10], L: [2, -3, 10], z: 0, pose: 'crouch', lean: .2, kick: -.3 }], [.4, { R: [6, 1, 14], L: [6, -1, 14], z: 0, pose: 'guard', lean: .4 }]] },
  shove: { len: .3, keys: [[0, { R: [1, 3, 22], L: [1, -3, 22], z: 0, pose: 'crouch', lean: -.1 }], [.06, { R: [1, 3, 22], L: [1, -3, 22], z: 0, pose: 'crouch', lean: -.1, kick: -.4 }], [.3, { R: [12, 3, 21], L: [12, -3, 21], z: 0, pose: 'guard', kick: .8, lean: .35 }]] }
};
const CLIP_TAUNT = CLIP_CELEBRATE;   // (a taunt is the same clip set, keyed by the player's taunt name)
/** the dunks' body (§7.3, §10.3): the hands by DUNK_KEYS, the body's crouch, air and cheer, the slam kick, the landing */
const dunkBodyClip = id => ({ len: 1, keys: [[0, { R: [4, 3, 16], L: [4, -3, 16], z: 0, pose: 'crouch', lean: .3 }], [.12, { R: [4, 3, 16], L: [4, -3, 16], z: 0, pose: 'crouch', kick: -.5, lean: .35 }], [.5, { R: [4, 2, 30], L: [4, -2, 30], z: 0, pose: null, lean: .1 }], [.9, { R: [8, 0, 30], L: [8, 0, 30], z: 0, pose: 'cheer', kick: 1, lean: -.25 }], [1, { R: [8, 0, 30], L: [8, 0, 30], z: 0, pose: 'cheer', kick: -1.5, lean: 0 }]] });
