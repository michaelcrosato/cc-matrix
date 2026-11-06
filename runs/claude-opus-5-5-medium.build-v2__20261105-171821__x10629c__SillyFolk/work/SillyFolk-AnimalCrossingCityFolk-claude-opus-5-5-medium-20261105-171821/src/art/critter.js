// The critter generator: every neighbour, host, pedestrian and the player come from one function.
// All share one skeleton (seven joints at the same rest positions), so one compiled clip set drives everyone.
import { model } from '../engine.js';
export const P16 = Object.fromEntries('ink plum red orange sand lime green teal navy blue sky cyan white mist slate night'.split(' ').map((c) => [c, c]));
export const RIG = { joints: ['Pelvis', 'Torso', 'Head', 'ArmR', 'ArmL', 'LegR', 'LegL'], root: 'Pelvis', mirror: { ArmR: 'ArmL', ArmL: 'ArmR', LegR: 'LegL', LegL: 'LegR' }, soles: [], trace: [], limits: {}, fps: 30 };
const HEAD_Y = 0.36;
const ball = (w, h, d, at, c, extra) => ({ ball: [w, h, d], at, c, ...extra });
const box = (w, h, d, at, c, extra) => ({ box: [w, h, d], at, c, ...extra });
const cyl = (w, h, d, at, c, extra) => ({ cyl: [w, h, d], at, c, ...extra });
const cone = (w, h, d, at, c, extra) => ({ cone: [w, h, d], at, c, ...extra });
const mx = (...parts) => ({ mirror: parts, axis: 'x' });
const y = (v) => HEAD_Y + v;

export const EAR = {
  none: () => [],
  round: (c, i) => [mx(ball(0.26, 0.26, 0.12, [0.32, y(0.34), 0], c), ball(0.14, 0.14, 0.04, [0.32, y(0.34), 0.06], i))],
  small: (c) => [mx(ball(0.15, 0.15, 0.1, [0.33, y(0.3), 0], c))],
  tall: (c, i) => [mx(ball(0.14, 0.38, 0.1, [0.25, y(0.5), 0], c), ball(0.07, 0.24, 0.03, [0.25, y(0.5), 0.05], i))],
  floppy: (c) => [mx(ball(0.14, 0.34, 0.12, [0.42, y(0.08), 0], c))],
  side: (c) => [mx(ball(0.32, 0.14, 0.1, [0.48, y(0.2), 0], c))],
  point: (c) => [mx(cone(0.2, 0.3, 0.12, [0.26, y(0.46), 0], c))],
};
/** Species: head shape, ears, muzzle, extras (added to the head), back (added to the torso), root (added to the pelvis). */
export const SPECIES = {
  person: (s) => ({ head: [0.8, 0.76, 0.76], ears: 'small', muzzle: [] }),
  wombat: (s) => ({ head: [0.9, 0.74, 0.8], ears: 'small', muzzle: [box(0.46, 0.24, 0.2, [0, y(-0.1), 0.36], s.c2), box(0.22, 0.1, 0.06, [0, y(-0.02), 0.46], 'ink')], stocky: true }),
  quokka: (s) => ({ head: [0.78, 0.76, 0.74], ears: 'round', muzzle: [ball(0.3, 0.2, 0.16, [0, y(-0.12), 0.36], s.c2), box(0.1, 0.06, 0.05, [0, y(-0.06), 0.44], 'ink')], tail: [cone(0.14, 0.4, 0.14, [0, 0.0, -0.24], s.c1, { rot: [-120, 0, 0] })] }),
  moose: (s) => ({ head: [0.66, 0.72, 0.72], ears: 'point', muzzle: [box(0.42, 0.34, 0.34, [0, y(-0.18), 0.36], s.c2), box(0.08, 0.06, 0.04, [0.1, y(-0.12), 0.54], 'ink'), box(0.08, 0.06, 0.04, [-0.1, y(-0.12), 0.54], 'ink')], extra: [mx(box(0.5, 0.08, 0.14, [0.44, y(0.42), 0], 'sand', { rot: [0, 0, 22] }), box(0.08, 0.3, 0.1, [0.62, y(0.62), 0], 'sand'), box(0.08, 0.22, 0.1, [0.44, y(0.6), 0], 'sand'), box(0.08, 0.26, 0.1, [0.78, y(0.58), 0], 'sand')), box(0.3, 0.22, 0.04, [0.62, y(0.42), 0.06], 'white'), box(0.2, 0.16, 0.04, [-0.56, y(0.44), 0.06], 'sky')] }),
  platypus: (s) => ({ head: [0.76, 0.7, 0.72], ears: 'none', muzzle: [box(0.54, 0.1, 0.44, [0, y(-0.1), 0.48], 'orange'), box(0.2, 0.04, 0.05, [0, y(-0.05), 0.6], 'ink')], extra: [cone(0.26, 0.16, 0.26, [0, y(0.42), 0], 'sky'), box(0.42, 0.06, 0.26, [0, y(0.35), 0], 'sand')], tail: [box(0.46, 0.08, 0.56, [0, -0.15, -0.42], 'orange')], neck: 'white' }),
  armadillo: (s) => ({ head: [0.62, 0.62, 0.72], ears: 'tall', muzzle: [ball(0.26, 0.2, 0.3, [0, y(-0.14), 0.36], s.c2)], back: [ball(0.68, 0.62, 0.58, [0, 0.12, -0.08], 'slate'), box(0.68, 0.06, 0.5, [0, 0.27, -0.1], 'night'), box(0.7, 0.06, 0.52, [0, 0.1, -0.1], 'night'), box(0.68, 0.06, 0.5, [0, -0.06, -0.1], 'night')] }),
  lemur: (s) => ({ head: [0.72, 0.72, 0.68], ears: 'point', muzzle: [ball(0.24, 0.16, 0.2, [0, y(-0.14), 0.34], 'ink')], eyeRing: 'white' }),
  possum: (s) => ({ head: [0.72, 0.66, 0.7], ears: 'round', muzzle: [cone(0.3, 0.42, 0.26, [0, y(-0.08), 0.46], s.c2, { rot: [90, 0, 0] }), ball(0.1, 0.08, 0.08, [0, y(-0.08), 0.66], 'plum')], tail: [{ tube: [[0, 0, 0], [0, -0.1, -0.2], [0, 0.08, -0.46], [0, 0.26, -0.42]], r: 0.05, at: [0, 0, -0.14], c: 'mist' }] }),
  yak: (s) => ({ head: [0.76, 0.72, 0.72], ears: 'side', muzzle: [box(0.4, 0.22, 0.18, [0, y(-0.2), 0.34], s.c2)], extra: [ball(0.92, 0.5, 0.86, [0, y(0.2), -0.04], s.c1), mx(box(0.3, 0.68, 0.76, [0.32, y(-0.08), -0.04], s.c1), cone(0.14, 0.26, 0.14, [0.48, y(0.42), 0], 'white', { rot: [0, 0, -30] }))], back: [ball(0.72, 0.62, 0.62, [0, 0.08, 0], s.c1)] }),
  ferret: (s) => ({ head: [0.6, 0.6, 0.74], ears: 'small', muzzle: [ball(0.22, 0.16, 0.2, [0, y(-0.12), 0.38], 'white'), box(0.08, 0.06, 0.04, [0, y(-0.06), 0.48], 'ink')], eyeRing: 'ink', tail: [ball(0.2, 0.2, 0.56, [0, -0.05, -0.42], s.c1)] }),
  goose: (s) => ({ head: [0.5, 0.52, 0.52], headLift: 0.34, ears: 'none', muzzle: [box(0.3, 0.1, 0.3, [0, y(-0.06), 0.34], 'orange')], neck: 'tall', extra: [mx(box(0.2, 0.2, 0.03, [0.13, y(0.08), 0.27], 'sky'), box(0.03, 0.03, 0.14, [0.26, y(0.08), 0.2], 'ink')), box(0.08, 0.04, 0.04, [0, y(0.08), 0.27], 'ink')], back: [cone(0.3, 0.3, 0.2, [0, 0.08, -0.32], s.c1, { rot: [-60, 0, 0] })] }),
  capybara: (s) => ({ head: [0.8, 0.66, 0.84], ears: 'small', muzzle: [box(0.5, 0.3, 0.3, [0, y(-0.12), 0.38], s.c2), box(0.16, 0.05, 0.04, [0, y(-0.03), 0.54], 'ink')], extra: [ball(0.14, 0.12, 0.18, [0.05, y(0.42), 0.06], 'sand'), box(0.15, 0.03, 0.03, [0.05, y(0.42), 0.06], 'ink'), mx(ball(0.1, 0.03, 0.08, [0.1, y(0.5), 0.02], 'white'))] }),
  snail: (s) => ({ head: [0.48, 0.52, 0.48], headLift: 0.1, ears: 'none', muzzle: [], extra: [mx(cyl(0.05, 0.3, 0.05, [0.13, y(0.38), 0.1], s.c1), ball(0.11, 0.11, 0.11, [0.13, y(0.54), 0.1], s.c1))], back: [ball(0.86, 0.86, 0.5, [0, 0.14, -0.18], 'orange'), ball(0.42, 0.42, 0.54, [0, 0.14, -0.18], 'sand'), box(0.92, 0.12, 0.05, [0, 0.0, 0.14], 'red', { rot: [0, 0, 35] })], root: [box(0.46, 0.14, 1.1, [0, -0.2, 0], s.c1)], noLegs: true, noArms: true }),
  pangolin: (s) => ({ head: [0.54, 0.56, 0.66], ears: 'none', muzzle: [cone(0.2, 0.3, 0.18, [0, y(-0.08), 0.42], s.c2, { rot: [90, 0, 0] })], extra: [mx(ball(0.3, 0.3, 0.05, [0.13, y(0.08), 0.29], 'sky'), ball(0.2, 0.2, 0.06, [0.13, y(0.08), 0.3], 'white'))], back: [...[0, 1, 2].map((i) => ball(0.62 - i * 0.1, 0.36, 0.36, [0, 0.27 - i * 0.2, -0.12 - i * 0.04], i % 2 ? 'sand' : 'orange'))], tail: [cone(0.24, 0.46, 0.14, [0, -0.04, -0.34], 'orange', { rot: [-110, 0, 0] })] }),
  moth: (s) => ({ head: [0.6, 0.6, 0.56], ears: 'none', muzzle: [], extra: [mx({ tube: [[0, 0, 0], [0.08, 0.22, 0], [0.26, 0.32, 0]], r: 0.03, at: [0.1, y(0.26), 0.06], c: 'ink' })], back: [mx(ball(0.9, 1.0, 0.08, [0.42, 0.34, -0.2], 'plum'), ball(0.34, 0.34, 0.1, [0.48, 0.42, -0.2], 'sand'))], neck: 'white' }),
  llama: (s) => ({ head: [0.46, 0.56, 0.58], headLift: 0.26, ears: 'tall', muzzle: [box(0.28, 0.2, 0.22, [0, y(-0.14), 0.3], 'white')], neck: 'tall', extra: [box(0.5, 0.08, 0.4, [0, y(0.32), -0.02], 'navy'), cyl(0.4, 0.12, 0.34, [0, y(0.4), -0.02], 'navy')] }),
  crab: (s) => ({ head: [0.5, 0.42, 0.46], ears: 'none', muzzle: [], eyeStalk: true, back: [box(0.76, 0.96, 0.68, [0, 0.14, -0.2], 'slate'), box(0.6, 0.06, 0.04, [0, 0.42, 0.15], 'mist'), box(0.6, 0.06, 0.04, [0, 0.1, 0.15], 'mist'), box(0.14, 0.05, 0.04, [0, 0.3, 0.17], 'sand'), box(0.14, 0.05, 0.04, [0, -0.02, 0.17], 'sand')] }),
  alpaca: (s) => ({ head: [0.54, 0.58, 0.56], headLift: 0.22, ears: 'tall', muzzle: [box(0.26, 0.18, 0.18, [0, y(-0.12), 0.3], 'white')], neck: 'tall', extra: [ball(0.9, 0.74, 0.86, [0, y(0.44), -0.04], s.c3 ?? 'plum'), ball(0.5, 0.42, 0.5, [0.24, y(0.74), 0], s.c3 ?? 'plum')] }),
  flamingo: (s) => ({ head: [0.44, 0.44, 0.46], headLift: 0.5, ears: 'none', muzzle: [cone(0.2, 0.3, 0.14, [0, y(-0.12), 0.32], 'ink', { rot: [130, 0, 0] })], neck: 'tall', thinLegs: true, back: [cone(0.36, 0.36, 0.2, [0, 0.0, -0.34], s.c1, { rot: [-70, 0, 0] })], extra: [mx(box(0.2, 0.08, 0.03, [0.13, y(0.02), 0.22], 'night'))] }),
  magpie: (s) => ({ head: [0.6, 0.6, 0.6], ears: 'none', muzzle: [cone(0.14, 0.32, 0.12, [0, y(-0.04), 0.4], 'ink', { rot: [90, 0, 0] })], back: [box(0.14, 0.1, 0.8, [0, -0.08, -0.5], 'navy'), mx(ball(0.14, 0.5, 0.34, [0.28, 0.14, -0.04], 'navy'))], neck: 'white' }),
  hippo: (s) => ({ head: [0.86, 0.66, 0.84], ears: 'small', muzzle: [box(0.72, 0.38, 0.34, [0, y(-0.14), 0.44], s.c2), mx(box(0.06, 0.1, 0.05, [0.2, y(0.02), 0.6], 'white'))], stocky: true, extra: [box(0.32, 0.05, 0.05, [0, y(-0.3), 0.46], 'red')], neck: 'white' }),
  dormouse: (s) => ({ head: [0.66, 0.6, 0.62], ears: 'round', muzzle: [ball(0.16, 0.12, 0.12, [0, y(-0.08), 0.32], 'plum')], extra: [mx(ball(0.18, 0.18, 0.04, [0.15, y(0.08), 0.3], 'ink'))], tail: [{ tube: [[0, 0, 0], [0, 0.2, -0.2], [0, 0.42, -0.14]], r: 0.09, at: [0, -0.06, -0.14], c: s.c1 }] }),
  badger: (s) => ({ head: [0.74, 0.66, 0.76], ears: 'small', muzzle: [ball(0.3, 0.22, 0.26, [0, y(-0.12), 0.34], 'white'), box(0.12, 0.08, 0.05, [0, y(-0.06), 0.46], 'ink')], stripes: true, extra: [box(0.8, 0.06, 0.6, [0, y(0.26), 0.02], 'navy'), cyl(0.5, 0.2, 0.42, [0, y(0.36), 0], 'navy')] }),
  sloth: (s) => ({ head: [0.72, 0.68, 0.68], ears: 'none', muzzle: [ball(0.42, 0.36, 0.12, [0, y(0), 0.32], 'sand')], eyeRing: 'night', extra: [] , longArms: true}),
  goat: (s) => ({ head: [0.56, 0.62, 0.6], ears: 'floppy', muzzle: [box(0.26, 0.22, 0.2, [0, y(-0.16), 0.32], s.c2), box(0.08, 0.2, 0.06, [0, y(-0.36), 0.3], s.c1)], extra: [mx(cone(0.1, 0.3, 0.1, [0.14, y(0.42), -0.06], 'sand', { rot: [-20, 0, 0] })), box(0.74, 0.1, 0.56, [0, y(0.26), 0], 'plum')] }),
  bat: (s) => ({ head: [0.54, 0.52, 0.5], ears: 'tall', muzzle: [ball(0.16, 0.12, 0.1, [0, y(-0.08), 0.26], 'sand')], back: [mx(ball(0.86, 0.66, 0.06, [0.42, 0.14, -0.12], 'plum'))] }),
  stoat: (s) => ({ head: [0.54, 0.56, 0.62], ears: 'small', muzzle: [ball(0.2, 0.16, 0.2, [0, y(-0.12), 0.32], 'white')], tail: [ball(0.14, 0.14, 0.42, [0, 0, -0.3], 'ink')], extra: [box(0.66, 0.08, 0.52, [0, y(0.28), 0], 'slate')] }),
  tapir: (s) => ({ head: [0.66, 0.62, 0.74], ears: 'round', muzzle: [cone(0.24, 0.36, 0.2, [0, y(-0.12), 0.46], s.c2, { rot: [110, 0, 0] })] }),
  otter: (s) => ({ head: [0.68, 0.6, 0.66], ears: 'small', muzzle: [ball(0.3, 0.2, 0.18, [0, y(-0.1), 0.32], 'white')], tail: [cone(0.2, 0.6, 0.14, [0, -0.08, -0.4], s.c1, { rot: [-100, 0, 0] })] }),
  toucan: (s) => ({ head: [0.56, 0.58, 0.58], ears: 'none', muzzle: [ball(0.26, 0.28, 0.6, [0, y(-0.04), 0.48], 'orange'), box(0.1, 0.1, 0.1, [0, y(0.0), 0.76], 'ink')], back: [box(0.2, 0.08, 0.6, [0, -0.08, -0.4], 'ink')] }),
  walrus: (s) => ({ head: [0.8, 0.64, 0.74], ears: 'none', muzzle: [ball(0.54, 0.3, 0.24, [0, y(-0.12), 0.32], s.c2), mx(cone(0.07, 0.34, 0.06, [0.14, y(-0.34), 0.36], 'white', { rot: [180, 0, 0] }))], stocky: true }),
  newt: (s) => ({ head: [0.64, 0.5, 0.7], ears: 'none', muzzle: [box(0.3, 0.05, 0.05, [0, y(-0.12), 0.36], 'ink')], tail: [cone(0.2, 0.7, 0.1, [0, -0.1, -0.44], s.c1, { rot: [-100, 0, 0] })] }),
  mink: (s) => ({ head: [0.58, 0.58, 0.6], ears: 'round', muzzle: [ball(0.2, 0.14, 0.16, [0, y(-0.1), 0.3], s.c2)], back: [ball(0.74, 0.34, 0.5, [0, 0.3, 0], 'white')] }),
};
export const HAIRS = ['Tuft', 'Bowl', 'Spikes', 'Curls', 'Bob', 'Crest', 'Bun', 'Bald-ish'];
export const hairParts = (i, c) => ([
  [cone(0.26, 0.26, 0.26, [0, y(0.46), 0.08], c), ball(0.56, 0.16, 0.5, [0, y(0.34), 0], c)],
  [ball(0.86, 0.5, 0.84, [0, y(0.18), -0.03], c, { half: true }), box(0.8, 0.1, 0.1, [0, y(0.17), 0.33], c)],
  [cone(0.18, 0.32, 0.18, [0, y(0.48), 0], c), cone(0.18, 0.3, 0.18, [0.2, y(0.4), 0], c), cone(0.18, 0.3, 0.18, [-0.2, y(0.4), 0], c), cone(0.18, 0.3, 0.18, [0, y(0.42), 0.22], c), cone(0.18, 0.3, 0.18, [0, y(0.42), -0.22], c)],
  [ball(0.3, 0.3, 0.3, [0.24, y(0.32), 0.1], c), ball(0.3, 0.3, 0.3, [-0.24, y(0.32), 0.1], c), ball(0.34, 0.34, 0.34, [0, y(0.38), 0], c), ball(0.3, 0.3, 0.3, [0.2, y(0.26), -0.2], c), ball(0.3, 0.3, 0.3, [-0.2, y(0.26), -0.2], c)],
  [ball(0.88, 0.56, 0.84, [0, y(0.12), -0.05], c, { half: true }), mx(box(0.14, 0.42, 0.42, [0.39, y(-0.1), -0.1], c))],
  [box(0.16, 0.26, 0.66, [0, y(0.42), -0.02], c), ball(0.52, 0.14, 0.5, [0, y(0.3), 0], c)],
  [ball(0.8, 0.34, 0.78, [0, y(0.24), -0.03], c, { half: true }), ball(0.3, 0.3, 0.3, [0, y(0.5), -0.12], c)],
  [ball(0.42, 0.08, 0.36, [0, y(0.38), 0], c)],
][i % 8]);
export const HATS = {
  cap: (c) => [ball(0.78, 0.36, 0.74, [0, y(0.26), -0.02], c, { half: true }), box(0.5, 0.05, 0.28, [0, y(0.25), 0.42], c)],
  beanie: (c) => [ball(0.84, 0.5, 0.8, [0, y(0.2), -0.02], c, { half: true }), ball(0.18, 0.18, 0.18, [0, y(0.48), -0.02], 'white')],
  tophat: (c) => [cyl(0.84, 0.06, 0.8, [0, y(0.28), 0], c, { seg: 10 }), cyl(0.5, 0.42, 0.46, [0, y(0.5), 0], c, { seg: 10 }), cyl(0.51, 0.08, 0.47, [0, y(0.34), 0], 'red', { seg: 10 })],
  straw: (c) => [cyl(1.1, 0.05, 1.06, [0, y(0.25), 0], c, { seg: 10 }), ball(0.56, 0.34, 0.54, [0, y(0.3), 0], c, { half: true }), cyl(0.56, 0.07, 0.54, [0, y(0.3), 0], 'red', { seg: 10 })],
  wizard: (c) => [cyl(0.96, 0.05, 0.94, [0, y(0.26), 0], c, { seg: 10 }), cone(0.54, 0.66, 0.54, [0, y(0.6), 0], c)],
  crown: (c) => [cyl(0.5, 0.2, 0.48, [0, y(0.38), 0], c, { seg: 8 }), ...[0, 1, 2, 3].map((i) => cone(0.1, 0.16, 0.1, [Math.cos(i * 1.57) * 0.22, y(0.54), Math.sin(i * 1.57) * 0.22], c))],
  bucket: (c) => [cyl(0.74, 0.34, 0.72, [0, y(0.38), 0], c, { top: 0.8, seg: 8 }), cyl(0.96, 0.05, 0.94, [0, y(0.21), 0], c, { seg: 10 })],
  bow: (c) => [ball(0.26, 0.22, 0.12, [0.2, y(0.42), 0], c), ball(0.26, 0.22, 0.12, [-0.08, y(0.42), 0], c), ball(0.1, 0.1, 0.14, [0.06, y(0.42), 0], 'white')],
  beret: (c) => [ball(0.84, 0.24, 0.84, [0.05, y(0.33), 0], c), ball(0.08, 0.1, 0.08, [0.05, y(0.46), 0], c)],
  party: (c) => [cone(0.34, 0.5, 0.34, [0, y(0.54), 0], c), ball(0.12, 0.12, 0.12, [0, y(0.8), 0], 'white')],
  antlers: () => [mx(box(0.08, 0.3, 0.08, [0.18, y(0.48), 0], 'sand'), box(0.22, 0.08, 0.08, [0.28, y(0.56), 0], 'sand'))],
  flower: (c) => [ball(0.26, 0.26, 0.1, [0.26, y(0.32), 0.2], c), ball(0.1, 0.1, 0.12, [0.26, y(0.32), 0.21], 'sand')],
};
export const GLASSES = {
  round: () => [mx(cyl(0.22, 0.03, 0.22, [0.15, y(0.05), 0.37], 'ink', { rot: [90, 0, 0] }))],
  shades: () => [box(0.6, 0.14, 0.04, [0, y(0.06), 0.37], 'ink')],
  star: () => [mx(cone(0.24, 0.2, 0.03, [0.15, y(0.05), 0.37], 'red'))],
  mono: () => [cyl(0.24, 0.03, 0.24, [0.15, y(0.05), 0.37], 'sand', { rot: [90, 0, 0] })],
  visor: () => [box(0.74, 0.08, 0.2, [0, y(0.14), 0.36], 'sky')],
  nerd: () => [mx(box(0.24, 0.16, 0.03, [0.15, y(0.05), 0.37], 'plum'))],
};
export const EYE_STYLES = ['dot', 'tall', 'wide', 'sleepy', 'sparkle', 'cross'];
const eyeParts = (i) => [
  [mx(box(0.11, 0.14, 0.04, [0.16, 0, 0], 'ink'))],
  [mx(box(0.08, 0.2, 0.04, [0.15, 0.02, 0], 'ink'))],
  [mx(box(0.17, 0.12, 0.04, [0.17, 0, 0], 'ink'))],
  [mx(box(0.14, 0.06, 0.04, [0.16, -0.02, 0], 'ink'))],
  [mx(box(0.14, 0.15, 0.04, [0.16, 0, 0], 'ink'), box(0.05, 0.05, 0.05, [0.19, 0.04, 0.01], 'white'))],
  [mx(box(0.16, 0.05, 0.04, [0.16, 0, 0], 'ink', { rot: [0, 0, 35] }), box(0.16, 0.05, 0.04, [0.16, 0, 0], 'ink', { rot: [0, 0, -35] }))],
][i % 6];

/**
 * Build a critter ModelDef. o: { id, species, c1 (fur), c2 (muzzle), c3 (feature), shirt, trousers, hair, hairColor, eyes, hat, hatColor, glasses, extra (parts on head), scale }
 */
export function critterDef(o) {
  const s = { c1: o.c1 ?? 'sand', c2: o.c2 ?? 'white', c3: o.c3 };
  const sp = SPECIES[o.species ?? 'person'](s);
  const shirt = o.shirt ?? s.c1, skin = s.c1, legsC = o.trousers ?? s.c1;
  const [hw, hh, hd] = sp.head;
  const lift = sp.headLift ?? 0;
  const eyeW = hd / 2 - 0.015;
  const headParts = [
    ball(hw, hh, hd, [0, HEAD_Y, 0], skin),
    ...(sp.eyeRing ? [mx(ball(0.2, 0.2, 0.05, [0.16, y(0.07), eyeW - 0.01], sp.eyeRing))] : []),
    ...(sp.stripes ? [box(0.14, hh * 0.72, 0.1, [0.17, y(0.1), hd * 0.42], 'ink'), box(0.14, hh * 0.72, 0.1, [-0.17, y(0.1), hd * 0.42], 'ink')] : []),
    { group: eyeParts(o.eyes ?? 0), at: [0, y(0.07), eyeW], pivot: true, name: 'Eyes' },
    { group: [box(0.17, 0.05, 0.04, [0, 0, 0], sp.muzzle.length ? 'ink' : 'plum')], at: [0, y(-0.13), hd / 2 - 0.02 + (sp.muzzle.length ? 0.06 : 0)], pivot: true, name: 'Mouth' },
    ...(EAR[sp.ears] ?? EAR.none)(skin, s.c2),
    ...sp.muzzle,
    ...(sp.extra ?? []),
    ...(o.hair != null ? hairParts(o.hair, o.hairColor ?? 'orange') : []),
    ...(o.hat ? HATS[o.hat](o.hatColor ?? 'red') : []),
    ...(o.glasses ? GLASSES[o.glasses]() : []),
    ...(o.extra ?? []),
  ];
  if (sp.eyeStalk) headParts.push(mx(cyl(0.05, 0.22, 0.05, [0.16, y(0.32), 0.05], skin)));
  const armLen = sp.longArms ? 0.46 : 0.28;
  const arm = (side) => (sp.noArms ? [] : [cyl(0.13, armLen, 0.13, [0, -armLen / 2 + 0.03, 0], shirt), ball(0.15, 0.15, 0.15, [0, -armLen + 0.02, 0], skin)]);
  const legW = sp.thinLegs ? 0.07 : sp.stocky ? 0.2 : 0.17;
  const leg = () => (sp.noLegs ? [] : [cyl(legW, 0.26, legW, [0, -0.12, 0], sp.thinLegs ? 'sand' : legsC), box(sp.thinLegs ? 0.14 : 0.2, 0.09, 0.28, [0, -0.235, 0.04], sp.thinLegs ? 'sand' : o.shoes ?? 'ink')]);
  const neck = sp.neck === 'tall' ? [cyl(0.18, 0.5 + lift * 0.4, 0.18, [0, 0.32 + lift * 0.2, 0.02], skin)] : sp.neck ? [box(0.34, 0.08, 0.3, [0, 0.31, 0.04], sp.neck)] : [];
  const torsoC = sp.noLegs ? s.c1 : shirt;
  return model({
    id: o.id, about: `Critter: ${o.species ?? 'person'}`, tags: ['critter'], palette: P16, floats: false,
    parts: [{ group: [
      ...(sp.root ?? []),
      ball(sp.stocky ? 0.56 : 0.46, 0.32, 0.38, [0, 0.02, 0], legsC, { name: 'hips' }),
      { group: leg(), at: [-0.13, -0.02, 0], pivot: true, name: 'LegR' },
      { group: leg(), at: [0.13, -0.02, 0], pivot: true, name: 'LegL' },
      ...(sp.tail ?? []),
      { group: [
        { ball: [sp.stocky ? 0.56 : 0.46, 0.46, 0.38], at: [0, 0.12, 0], c: torsoC, name: 'shirt' },
        ...(sp.back ?? []), ...neck,
        { group: arm('R'), at: [-0.26, 0.26, 0], pivot: true, name: 'ArmR' },
        { group: arm('L'), at: [0.26, 0.26, 0], pivot: true, name: 'ArmL' },
        { group: headParts, at: [0, 0.31 + lift, 0], pivot: true, name: 'Head' },
      ], at: [0, 0.08, 0], pivot: true, name: 'Torso' },
    ], at: [0, 0.3, 0], pivot: true, name: 'Pelvis' }],
  });
}
