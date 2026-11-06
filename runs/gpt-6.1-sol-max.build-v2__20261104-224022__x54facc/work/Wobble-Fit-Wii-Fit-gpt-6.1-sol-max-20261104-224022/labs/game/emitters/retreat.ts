/** @file Original ripple, splash, stamp and calm effects, built on the native emitter system. */
import { defineEmitter } from '../../../engine';
for (const [id, color, velocity, gravity, count] of [
  ['ripple', '#b9e1d0', [0, 0.1, 0], 0, 18],
  ['splash', '#eef9e9', [0, 5, 0], -8, 70],
  ['stamp', '#dcc794', [0, 1, 0], -2, 24],
  ['calm', '#c8e6b3', [0, 0.4, 0], -0.1, 36],
] as const)
  defineEmitter(`emitter:retreat.${id}`, {
    description: `Little Fulcrum ${id}.`,
    area: id === 'ripple' ? [1, 0.02, 1] : [0.4, 0.1, 0.4],
    velocity: [...velocity],
    spread: id === 'splash' ? 3 : 1.3,
    gravity,
    drag: 0.7,
    life: [0.6, 1.4],
    size: id === 'ripple' ? [0.07, 0.24] : [0.09, 0],
    color: [color, color],
    alpha: [0.8, 0],
    count,
    events: [`retreat.${id}`],
  });
