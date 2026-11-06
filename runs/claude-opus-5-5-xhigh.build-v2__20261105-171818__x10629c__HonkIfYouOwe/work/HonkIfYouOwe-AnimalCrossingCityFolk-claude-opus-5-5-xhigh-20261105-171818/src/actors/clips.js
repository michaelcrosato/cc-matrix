// All animation, as data: full poses, frames at 30 fps. Compiled per body shape by rig.js.
const REST = {};
const P = (y = 0, x = 0, z = 0, r = [0, 0, 0], s) => ({ p: [x, y, z], r, ...(s ? { s } : {}) });
// Arms: negative X swings forward and up. Z: + moves ArmL... keep small.
const clip = (name, frames, keys, o = {}) => ({ name, frames, keys, ...o });
const loop = (name, frames, keys, o = {}) => ({ name, frames, loop: true, keys, ...o });
const breathe = (period = 40, a = 0.012) => [{ joint: 'Pelvis', channel: 'py', amplitude: a, period }, { joint: 'Head', channel: 'rx', amplitude: 1.5, period, phase: 0.3 }];

function gait(name, frames, { leg, arm, bob, lean = 0, headBob = 0, speed }) {
  const a = (t) => ({
    Pelvis: P(t ? bob * 0.5 : -bob * 0.5, 0, 0, [lean, t ? 3 : -3, 0]),
    Torso: [0, t ? -5 : 5, 0],
    Head: [headBob, t ? 3 : -3, 0],
    LegR: [t ? leg : -leg, 0, 0], LegL: [t ? -leg : leg, 0, 0],
    ArmR: [t ? -arm : arm, 0, -4], ArmL: [t ? arm : -arm, 0, 4],
  });
  const mid = (t) => ({
    Pelvis: P(bob, 0, 0, [lean, 0, 0]), Torso: [0, 0, 0], Head: [headBob, 0, 0],
    LegR: [t ? -leg * 0.15 : leg * 0.15, 0, 0], LegL: [t ? leg * 0.15 : -leg * 0.15, 0, 0],
    ArmR: [0, 0, -4], ArmL: [0, 0, 4],
  });
  const h = frames / 2, q = frames / 4;
  return loop(name, frames, [[0, a(true)], [q, mid(true)], [h, a(false)], [h + q, mid(false)], [frames, a(true)]], { speed });
}
const ARM_FWD = { ArmR: [-70, 0, 0], ArmL: [-70, 0, 0] };
const ARMS_UP = { ArmR: [-170, 0, -8], ArmL: [-170, 0, 8] };

export const CLIPS = [
  loop('Idle', 80, [[0, REST], [80, REST]], { layers: breathe() }),
  loop('IdleBored', 120, [[0, REST], [40, { Head: [0, 28, 0], Torso: [0, 6, 0] }], [70, { Head: [0, -26, 0], Torso: [0, -6, 0] }], [120, REST]], { layers: breathe() }),
  gait('Tiptoe', 36, { leg: 16, arm: 8, bob: 0.035, lean: 8, headBob: 6, speed: 1.2 }),
  gait('Walk', 28, { leg: 26, arm: 18, bob: 0.04, speed: 2.6 }),
  gait('Jog', 20, { leg: 40, arm: 34, bob: 0.06, lean: 5, speed: 4.2 }),
  gait('Run', 15, { leg: 58, arm: 56, bob: 0.08, lean: 12, headBob: -6, speed: 6 }),
  loop('Talk', 24, [[0, { Head: [4, 0, 0] }], [8, { Head: [-3, 3, 1], Torso: [-2, 0, 0], ArmR: [-12, 0, -6] }], [16, { Head: [5, -3, -1], ArmL: [-12, 0, 6] }], [24, { Head: [4, 0, 0] }]], { layers: breathe(24, 0.008) }),
  loop('Listen', 48, [[0, { Head: [3, 0, 3] }], [24, { Head: [6, 0, -3] }], [48, { Head: [3, 0, 3] }]], { layers: breathe(48) }),
  clip('Nod', 18, [[0, REST], [5, { Head: [16, 0, 0] }, 'out'], [10, { Head: [-4, 0, 0] }], [14, { Head: [10, 0, 0] }], [18, REST]]),
  clip('ShakeHead', 24, [[0, REST], [6, { Head: [0, 22, 0] }], [12, { Head: [0, -22, 0] }], [18, { Head: [0, 16, 0] }], [24, REST]]),
  clip('Laugh', 30, [[0, REST], [6, { Pelvis: P(0.04), Torso: [-10, 0, 0], Head: [-16, 0, 0], ArmR: [-30, 0, -20], ArmL: [-30, 0, 20] }], [12, { Pelvis: P(-0.02), Torso: [4, 0, 0], Head: [2, 0, 0], ArmR: [-20, 0, -14], ArmL: [-20, 0, 14] }], [18, { Pelvis: P(0.04), Torso: [-10, 0, 0], Head: [-16, 0, 0], ArmR: [-30, 0, -20], ArmL: [-30, 0, 20] }], [24, { Pelvis: P(-0.02), Torso: [4, 0, 0], Head: [2, 0, 0] }], [30, REST]]),
  clip('Cry', 40, [[0, REST], [10, { Head: [22, 0, 0], ArmR: [-120, 0, 14], ArmL: [-120, 0, -14], Torso: [10, 0, 0] }], [20, { Head: [28, 0, 3], ArmR: [-125, 0, 14], ArmL: [-125, 0, -14], Torso: [14, 0, 0] }], [30, { Head: [22, 0, -3], ArmR: [-120, 0, 14], ArmL: [-120, 0, -14], Torso: [10, 0, 0] }], [40, REST]]),
  clip('Shock', 30, [[0, REST], [3, { Pelvis: P(0.12, 0, 0, [0, 0, 0], [0.92, 1.12, 0.92]), Head: [-12, 0, 0], ...ARMS_UP }, 'out'], [18, { Pelvis: P(0.02), Head: [-6, 0, 0], ArmR: [-140, 0, -24], ArmL: [-140, 0, 24] }], [30, REST]]),
  clip('Anger', 30, [[0, REST], [5, { Torso: [10, 0, 0], Head: [8, 0, 0], ArmR: [-50, 0, -30], ArmL: [-50, 0, 30] }], [10, { Pelvis: P(0.04), Torso: [12, 8, 0], ArmR: [-70, 0, -30], ArmL: [-40, 0, 30] }], [15, { Torso: [12, -8, 0], ArmR: [-40, 0, -30], ArmL: [-70, 0, 30] }], [20, { Pelvis: P(0.04), Torso: [12, 8, 0], ArmR: [-70, 0, -30], ArmL: [-40, 0, 30] }], [30, REST]]),
  clip('Love', 36, [[0, REST], [8, { Torso: [-6, 0, 0], Head: [-10, 0, 8], ArmR: [-100, 40, 20], ArmL: [-100, -40, -20] }], [24, { Torso: [-6, 0, 0], Head: [-10, 0, -8], ArmR: [-110, 40, 20], ArmL: [-110, -40, -20] }], [36, REST]]),
  clip('Shrug', 26, [[0, REST], [6, { ArmR: [-20, 0, -50], ArmL: [-20, 0, 50], Head: [4, 0, 8], Torso: [0, 0, 0], Pelvis: P(0.02) }], [18, { ArmR: [-20, 0, -50], ArmL: [-20, 0, 50], Head: [4, 0, -8], Pelvis: P(0.02) }], [26, REST]]),
  clip('Bow', 30, [[0, REST], [10, { Torso: [50, 0, 0], Head: [12, 0, 0], ArmR: [10, 0, 0], ArmL: [-90, 0, -30] }], [20, { Torso: [50, 0, 0], Head: [12, 0, 0], ArmR: [10, 0, 0], ArmL: [-90, 0, -30] }], [30, REST]]),
  loop('Dance', 40, [[0, { Pelvis: P(0, 0.06), Torso: [0, 0, 8], ArmR: [-120, 0, -30], ArmL: [-30, 0, 30], LegR: [-20, 0, 0], Head: [0, 0, -6] }], [10, { Pelvis: P(0.08), ArmR: [-90, 0, -30], ArmL: [-90, 0, 30] }], [20, { Pelvis: P(0, -0.06), Torso: [0, 0, -8], ArmR: [-30, 0, -30], ArmL: [-120, 0, 30], LegL: [-20, 0, 0], Head: [0, 0, 6] }], [30, { Pelvis: P(0.08), ArmR: [-90, 0, -30], ArmL: [-90, 0, 30] }], [40, { Pelvis: P(0, 0.06), Torso: [0, 0, 8], ArmR: [-120, 0, -30], ArmL: [-30, 0, 30], LegR: [-20, 0, 0], Head: [0, 0, -6] }]]),
  clip('Wave', 30, [[0, REST], [5, { ArmR: [-160, 0, -30] }], [10, { ArmR: [-160, 0, -55], Head: [0, 0, 4] }], [15, { ArmR: [-160, 0, -20], Head: [0, 0, -4] }], [20, { ArmR: [-160, 0, -55], Head: [0, 0, 4] }], [25, { ArmR: [-160, 0, -30] }], [30, REST]]),
  loop('Sit', 60, [[0, { Pelvis: P(-0.14), LegR: [-85, 0, 0], LegL: [-85, 0, 0], ArmR: [-20, 0, 0], ArmL: [-20, 0, 0] }], [60, { Pelvis: P(-0.14), LegR: [-85, 0, 0], LegL: [-85, 0, 0], ArmR: [-20, 0, 0], ArmL: [-20, 0, 0] }]], { layers: breathe(60, 0.006) }),
  loop('Sleep', 80, [[0, { Pelvis: P(-0.1, 0, 0, [-85, 0, 0]), ArmR: [0, 0, -8], ArmL: [0, 0, 8], Head: [-5, 0, 10] }], [80, { Pelvis: P(-0.1, 0, 0, [-85, 0, 0]), ArmR: [0, 0, -8], ArmL: [0, 0, 8], Head: [-5, 0, 10] }]], { layers: [{ joint: 'Torso', channel: 'rx', amplitude: 2, period: 80 }] }),
  clip('PlayDead', 24, [[0, REST], [6, { Pelvis: P(0.06), ...ARMS_UP }, 'out'], [18, { Pelvis: P(-0.2, 0, 0, [90, 0, 0]), ArmR: [-90, 0, -50], ArmL: [-90, 0, 50], LegR: [-60, 0, 0], LegL: [-50, 0, 0], Head: [-6, 0, 24] }, 'in'], [24, { Pelvis: P(-0.22, 0, 0, [92, 0, 0]), ArmR: [-90, 0, -50], ArmL: [-90, 0, 50], LegR: [-60, 0, 0], LegL: [-50, 0, 0], Head: [-6, 0, 24] }]]),
  clip('HoldUp', 40, [[0, REST], [4, { Pelvis: P(-0.06, 0, 0, [0, 0, 0], [1.1, 0.88, 1.1]) }], [8, { Pelvis: P(0.1, 0, 0, [0, 0, 0], [0.94, 1.08, 0.94]), Head: [-14, 0, 0], ...ARMS_UP }, 'outBack'], [34, { Pelvis: P(0.02), Head: [-14, 0, 0], ...ARMS_UP }], [40, { Head: [-10, 0, 0], ...ARMS_UP }]]),
  clip('PickUp', 20, [[0, REST], [7, { Pelvis: P(-0.1), Torso: [45, 0, 0], ArmR: [-60, 0, 0], ArmL: [-60, 0, 0], LegR: [-18, 0, 0], LegL: [-18, 0, 0] }], [12, { Pelvis: P(-0.1), Torso: [45, 0, 0], ArmR: [-70, 0, 0], ArmL: [-70, 0, 0], LegR: [-18, 0, 0], LegL: [-18, 0, 0] }], [20, REST]]),
  clip('Give', 24, [[0, REST], [8, { Torso: [8, 0, 0], ...ARM_FWD }], [18, { Torso: [8, 0, 0], ...ARM_FWD }], [24, REST]]),
  loop('NetReady', 30, [[0, { ArmR: [-150, -30, -10], Torso: [-6, -25, 0], Head: [0, 20, 0], LegR: [10, 0, 0], LegL: [-10, 0, 0] }], [30, { ArmR: [-150, -30, -10], Torso: [-6, -25, 0], Head: [0, 20, 0], LegR: [10, 0, 0], LegL: [-10, 0, 0] }]], { layers: breathe(30, 0.01) }),
  clip('NetSweep', 15, [[0, { ArmR: [-150, -30, -10], Torso: [-6, -25, 0] }], [3, { ArmR: [-165, -45, -10], Torso: [-8, -35, 0] }, 'in'], [8, { ArmR: [-70, 60, -30], Torso: [14, 45, 0], Head: [8, -10, 0] }, 'out'], [15, REST]], { fast: true }),
  clip('Cast', 20, [[0, REST], [6, { ArmR: [-170, 0, 0], Torso: [-12, 0, 0] }, 'in'], [12, { ArmR: [-70, 0, 0], Torso: [14, 0, 0], Head: [10, 0, 0] }, 'out'], [20, { ArmR: [-60, 0, 0], Torso: [4, 0, 0] }]], { fast: true }),
  loop('Reel', 16, [[0, { ArmR: [-70, 0, 0], ArmL: [-50, 0, 10], Torso: [-6, 0, 0] }], [8, { ArmR: [-80, 0, 0], ArmL: [-40, 0, 10], Torso: [-10, 0, 0] }], [16, { ArmR: [-70, 0, 0], ArmL: [-50, 0, 10], Torso: [-6, 0, 0] }]]),
  clip('Dig', 22, [[0, REST], [6, { ArmR: [-120, 0, 0], ArmL: [-110, 0, 0], Torso: [-10, 0, 0] }], [11, { Pelvis: P(-0.08), ArmR: [-30, 0, 0], ArmL: [-30, 0, 0], Torso: [40, 0, 0], LegR: [-14, 0, 0] }, 'out'], [16, { ArmR: [-70, 30, 0], ArmL: [-70, 30, 0], Torso: [10, 30, 0] }], [22, REST]], { fast: true }),
  clip('Chop', 18, [[0, REST], [6, { ArmR: [-170, 0, 0], Torso: [-10, -15, 0], Head: [-6, 0, 0] }, 'in'], [10, { ArmR: [-70, 0, 0], Torso: [18, 15, 0], Head: [6, 0, 0] }, 'out'], [18, REST]], { fast: true }),
  clip('Water', 28, [[0, REST], [6, { ArmR: [-80, 0, 0], Torso: [10, 0, 0], Head: [12, 0, 0] }], [22, { ArmR: [-70, 0, 12], Torso: [12, 0, 0], Head: [14, 0, 0] }], [28, REST]]),
  clip('ShakeTree', 24, [[0, REST], [4, { ArmR: [-90, 0, 0], ArmL: [-90, 0, 0], Torso: [8, 0, 0] }], [8, { Pelvis: P(0, 0, 0.06), ArmR: [-80, 0, 0], ArmL: [-100, 0, 0], Torso: [14, 6, 0] }], [12, { Pelvis: P(0, 0, -0.06), ArmR: [-100, 0, 0], ArmL: [-80, 0, 0], Torso: [2, -6, 0] }], [16, { Pelvis: P(0, 0, 0.06), ArmR: [-80, 0, 0], ArmL: [-100, 0, 0], Torso: [14, 6, 0] }], [24, REST]]),
  clip('Slingshot', 20, [[0, REST], [6, { ArmR: [-85, 10, 0], ArmL: [-85, -30, 0], Torso: [-4, 15, 0], Head: [-14, -10, 0] }], [12, { ArmR: [-85, 10, 0], ArmL: [-100, -60, 0], Torso: [-4, 20, 0], Head: [-14, -10, 0] }], [14, { ArmR: [-90, 10, 0], ArmL: [-50, 0, 0], Torso: [-4, 5, 0] }, 'out'], [20, REST]], { fast: true }),
  loop('PushSnow', 24, [[0, { Pelvis: P(0, 0, 0, [18, 0, 0]), ArmR: [-90, 0, 0], ArmL: [-90, 0, 0], LegR: [30, 0, 0], LegL: [-30, 0, 0] }], [12, { Pelvis: P(0.03, 0, 0, [18, 0, 0]), ArmR: [-90, 0, 0], ArmL: [-90, 0, 0], LegR: [-30, 0, 0], LegL: [30, 0, 0] }], [24, { Pelvis: P(0, 0, 0, [18, 0, 0]), ArmR: [-90, 0, 0], ArmL: [-90, 0, 0], LegR: [30, 0, 0], LegL: [-30, 0, 0] }]]),
  clip('Eat', 26, [[0, REST], [6, { ArmR: [-140, 30, 20], Head: [6, 0, 0] }], [12, { ArmR: [-150, 30, 20], Head: [-6, 0, 0] }], [18, { ArmR: [-140, 30, 20], Head: [6, 0, 0] }], [26, REST]]),
  loop('Hum', 40, [[0, { Head: [-6, 0, 6], Torso: [0, 0, 2] }], [20, { Head: [-6, 0, -6], Torso: [0, 0, -2] }], [40, { Head: [-6, 0, 6], Torso: [0, 0, 2] }]]),
  loop('Sway', 48, [[0, { Pelvis: P(0, 0.05), Torso: [0, 0, 6], Head: [0, 0, 4], ArmR: [-6, 0, -8], ArmL: [-6, 0, 8] }], [24, { Pelvis: P(0, -0.05), Torso: [0, 0, -6], Head: [0, 0, -4], ArmR: [-6, 0, -8], ArmL: [-6, 0, 8] }], [48, { Pelvis: P(0, 0.05), Torso: [0, 0, 6], Head: [0, 0, 4], ArmR: [-6, 0, -8], ArmL: [-6, 0, 8] }]]),
  clip('Sting', 28, [[0, REST], [3, { Pelvis: P(0.16), Head: [-20, 0, 0], ...ARMS_UP }, 'out'], [10, { Pelvis: P(0.02), Head: [10, 16, 0], ArmR: [-140, 0, -8], ArmL: [-140, 0, 8] }], [18, { Head: [10, -16, 0], ArmR: [-140, 0, -8], ArmL: [-140, 0, 8] }], [28, REST]]),
  clip('Slip', 30, [[0, REST], [5, { Pelvis: P(0.02, 0, 0, [-20, 0, 0]), LegR: [-60, 0, 0], ArmR: [-120, 0, -40], ArmL: [-120, 0, 40] }], [12, { Pelvis: P(-0.14, 0, 0, [-50, 0, 0]), LegR: [-90, 0, 0], LegL: [-70, 0, 0], ArmR: [-100, 0, -40], ArmL: [-100, 0, 40] }], [22, { Pelvis: P(-0.14, 0, 0, [-50, 0, 0]), LegR: [-90, 0, 0], LegL: [-70, 0, 0], Head: [14, 0, 0] }], [30, REST]]),
  // species specials
  loop('MayorSlide', 60, [[0, { Pelvis: P(0, 0, 0, [0, 0, 0], [1.06, 0.94, 1.06]), Head: [4, 0, 0] }], [30, { Pelvis: P(0.01, 0, 0, [0, 0, 0], [0.96, 1.04, 0.96]), Head: [-4, 0, 0] }], [60, { Pelvis: P(0, 0, 0, [0, 0, 0], [1.06, 0.94, 1.06]), Head: [4, 0, 0] }]]),
  loop('VesperHang', 40, [[0, { Pelvis: P(0, 0, 0, [180, 0, 0]), ArmR: [-80, 30, 0], ArmL: [-80, -30, 0], LegR: [0, 0, 0], LegL: [0, 0, 0], Head: [10, 0, 6] }], [20, { Pelvis: P(0, 0, 0, [180, 0, 6]), ArmR: [-90, 16, 0], ArmL: [-90, -16, 0], Head: [10, 0, -6] }], [40, { Pelvis: P(0, 0, 0, [180, 0, 0]), ArmR: [-80, 30, 0], ArmL: [-80, -30, 0], LegR: [0, 0, 0], LegL: [0, 0, 0], Head: [10, 0, 6] }]]),
  loop('PimmScuttle', 16, [[0, { Pelvis: P(0.02, 0.04), LegR: [30, 0, 0], LegL: [-30, 0, 0], ArmR: [-50, 0, -20], ArmL: [-50, 0, 20] }], [8, { Pelvis: P(0.04, -0.04), LegR: [-30, 0, 0], LegL: [30, 0, 0], ArmR: [-70, 0, -20], ArmL: [-70, 0, 20] }], [16, { Pelvis: P(0.02, 0.04), LegR: [30, 0, 0], LegL: [-30, 0, 0], ArmR: [-50, 0, -20], ArmL: [-50, 0, 20] }]]),
  loop('RoccoRoll', 20, [[0, { Pelvis: P(-0.1, 0, 0, [0, 0, 0]), Torso: [40, 0, 0], Head: [40, 0, 0], ArmR: [-120, 0, 0], ArmL: [-120, 0, 0], LegR: [-90, 0, 0], LegL: [-90, 0, 0] }, 'linear'], [10, { Pelvis: P(-0.1, 0, 0, [180, 0, 0]), Torso: [40, 0, 0], Head: [40, 0, 0], ArmR: [-120, 0, 0], ArmL: [-120, 0, 0], LegR: [-90, 0, 0], LegL: [-90, 0, 0] }, 'linear'], [20, { Pelvis: P(-0.1, 0, 0, [360, 0, 0]), Torso: [40, 0, 0], Head: [40, 0, 0], ArmR: [-120, 0, 0], ArmL: [-120, 0, 0], LegR: [-90, 0, 0], LegL: [-90, 0, 0] }, 'linear']], { fast: true }),
  loop('QuillBall', 16, [[0, { Pelvis: P(-0.12, 0, 0, [0, 0, 0], [1, 0.8, 1]), Torso: [50, 0, 0], Head: [50, 0, 0], ArmR: [-120, 0, 0], ArmL: [-120, 0, 0], LegR: [-90, 0, 0], LegL: [-90, 0, 0] }, 'linear'], [8, { Pelvis: P(-0.04, 0, 0, [180, 0, 0], [1, 0.8, 1]), Torso: [50, 0, 0], Head: [50, 0, 0], ArmR: [-120, 0, 0], ArmL: [-120, 0, 0], LegR: [-90, 0, 0], LegL: [-90, 0, 0] }, 'linear'], [16, { Pelvis: P(-0.12, 0, 0, [360, 0, 0], [1, 0.8, 1]), Torso: [50, 0, 0], Head: [50, 0, 0], ArmR: [-120, 0, 0], ArmL: [-120, 0, 0], LegR: [-90, 0, 0], LegL: [-90, 0, 0] }, 'linear']], { fast: true }),
  loop('Accordion', 30, [[0, { ArmR: [-70, 40, -20], ArmL: [-70, -40, 20], Head: [4, 0, 6] }], [15, { ArmR: [-70, 10, -40], ArmL: [-70, -10, 40], Head: [4, 0, -6] }], [30, { ArmR: [-70, 40, -20], ArmL: [-70, -40, 20], Head: [4, 0, 6] }]]),
  clip('Paddle', 14, [[0, REST], [5, { ArmR: [-170, 0, -6], Torso: [-6, 0, 0], Pelvis: P(0.06) }, 'out'], [10, { ArmR: [-165, 0, -6] }], [14, REST]], { fast: true }),
  clip('Honk', 26, [[0, REST], [6, { Pelvis: P(-0.04), Torso: [10, 0, 0], Head: [18, 0, 0] }], [10, { Pelvis: P(0.08, 0, 0, [0, 0, 0], [0.92, 1.12, 0.92]), Torso: [-16, 0, 0], Head: [-30, 0, 0] }, 'out'], [18, { Torso: [-12, 0, 0], Head: [-24, 0, 0] }], [26, REST]]),
];
export const CLIP_NAMES = CLIPS.map((c) => c.name);
