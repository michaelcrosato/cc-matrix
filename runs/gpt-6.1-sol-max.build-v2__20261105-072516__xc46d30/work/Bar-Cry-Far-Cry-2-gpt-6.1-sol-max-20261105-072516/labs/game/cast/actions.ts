/** @file Authored body actions: medicine, field surgery, rescue, repair and mercenary mannerisms. */
import { defineAction } from '../../../engine/sim-api';
const poses: [string, number, number[], number[]][] = [
  ['syrette', 0.9, [0.45, -0.14, -0.32], [0.46, 0.06, -0.26]],
  ['pill', 1.2, [0.36, -0.13, -0.25], [0.16, 0.02, 0.08]],
  ['surgery-dig', 2.6, [0.5, -0.15, -0.25], [0.48, -0.11, -0.2]],
  ['surgery-finger', 2.6, [0.48, -0.04, -0.2], [0.48, 0.04, -0.2]],
  ['surgery-burn', 2.6, [0.5, -0.16, -0.3], [0.45, -0.1, -0.25]],
  ['repair', 3, [0.6, -0.15, -0.35], [0.65, 0.16, -0.35]],
  ['rescue', 2, [0.6, -0.18, -0.4], [0.6, 0.18, -0.4]],
  ['jam-clear', 0.9, [0.5, -0.08, -0.2], [0.34, 0.13, -0.15]],
  ['map-hold', 0.4, [0.46, -0.24, -0.27], [0.46, 0.24, -0.27]],
  ['drive', 0.4, [0.48, -0.22, -0.2], [0.48, 0.22, -0.2]],
  ['machete-chop', 0.6, [0.3, -0.2, -0.2], [0.65, 0.15, 0.25]],
  ['throw', 0.65, [0.3, -0.2, -0.2], [0.4, 0.2, 0.4]],
  ['pray', 3, [0.25, -0.02, -0.1], [0.25, 0.02, -0.1]],
  ['mercy-plea', 3, [0.3, -0.2, -0.5], [0.38, 0.2, -0.1]],
  ['officer-point', 1, [0.3, -0.2, -0.2], [0.75, 0.12, 0]],
  ['panic-burn', 1, [0.1, -0.35, 0.2], [0.1, 0.35, 0.2]],
];
for (const [key, seconds, left, right] of poses)
  defineAction(`action:field-${key}`, {
    desc: `${key}: a real-time field action with visible hands.`,
    ...(key === 'drive' || key === 'map-hold'
      ? { check: { seconds: 2, signals: [{ at: 1.5, do: 'next' }], lift: [] } }
      : {}),
    beats: [
      {
        name: 'reach',
        seconds: seconds * 0.3,
        effectors: { handL: left, handR: right },
        motion: { crouch: key === 'drive' ? 0.65 : key.startsWith('surgery') ? 0.25 : 0 },
      },
      {
        name: 'work',
        until: key === 'drive' || key === 'map-hold' ? 'next' : 'time',
        motion: { crouch: key === 'drive' ? 0.65 : 0 },
        seconds: seconds * 0.5,
        effectors: { handL: left, handR: [right[0] - 0.08, right[1] + 0.04, right[2] - 0.07] },
      },
      { name: 'release', seconds: seconds * 0.2 },
    ],
  });
