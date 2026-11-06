/**
 * @file Floor shapes drawn as telegraphs: rings under the mat, the session's mats and floor, hoops at the waist. They warm
 * no prop's pipelines, and they fill as `u` runs.
 *
 * Game code, sim-side data.
 *
 * @example
 * // w.spawn({ matRing: { telegraph: 'telegraph:matRing', position: [x, y, z], yaw: 0, u: 1, size: 1, owner: -1 } });
 */
import { defineTelegraph } from '../../../engine/sim-api';

defineTelegraph('telegraph:matRing', {
  description: 'The ring your centre of balance should stay in, lying on the mat.',
  shape: 'ring',
  inner: 0.92,
  radius: 1,
  color: '#ff8a70',
  alpha: [0.85, 0.85],
} as never);
defineTelegraph('telegraph:focus', {
  description: 'A thin ring under the thing the Guest is looking at.',
  shape: 'ring',
  inner: 0.9,
  radius: 1,
  color: '#ff8a70',
  alpha: [0.9, 0.9],
} as never);
defineTelegraph('telegraph:calmWave', {
  description: 'The calm wave: everyone inside follows you.',
  shape: 'ring',
  inner: 0.96,
  radius: 1,
  color: '#bfead6',
  alpha: [0.9, 0.2],
} as never);
defineTelegraph('telegraph:ripple', {
  description: 'A ripple on the pond.',
  shape: 'ring',
  inner: 0.97,
  radius: 1,
  color: '#ffffff',
  alpha: [0.8, 0.1],
} as never);
defineTelegraph('telegraph:hoop', {
  description: 'A hoop, flat, at the waist.',
  shape: 'ring',
  inner: 0.46,
  radius: 0.52,
  color: '#ffb46e',
  alpha: [1, 1],
} as never);
defineTelegraph('telegraph:hoop2', {
  description: 'A hoop in the other colour.',
  shape: 'ring',
  inner: 0.48,
  radius: 0.54,
  color: '#7fd6c0',
  alpha: [1, 1],
} as never);
defineTelegraph('telegraph:floor', {
  description: "The white floor of a session's pavilion.",
  shape: 'line',
  length: 18,
  width: 25,
  color: '#f7fafc',
  alpha: [1, 1],
} as never);
for (const [name, color] of [
  ['red', '#e8443a'],
  ['blue', '#3b82f6'],
  ['green', '#22c55e'],
  ['gold', '#f5b700'],
] as const) {
  defineTelegraph(`telegraph:mat.${name}`, {
    description: `A mat in the ${name} seat's colour.`,
    shape: 'line',
    length: 2,
    width: 1.1,
    color,
    alpha: [1, 1],
  } as never);
}
for (const [name, color] of [
  ['L', '#ffe0a0'],
  ['R', '#ff8a70'],
] as const) {
  defineTelegraph(`telegraph:tile${name}`, {
    description: 'A floor tile lit for a foot, in a session.',
    shape: 'line',
    length: 0.8,
    width: 0.8,
    color,
    alpha: [1, 1],
  } as never);
}
