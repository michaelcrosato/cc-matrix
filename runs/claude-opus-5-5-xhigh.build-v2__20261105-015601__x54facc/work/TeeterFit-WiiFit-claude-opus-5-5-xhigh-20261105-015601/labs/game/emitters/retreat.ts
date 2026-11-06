/**
 * @file The game's particles as data (PLAN.md section 10): ripples, splashes small and huge, clack dust, a calm wave,
 * stamp sparkle, gull feathers, confetti on Unsettling, rain and spray in the storm. Each bursts on the sim event named in
 * `events`, where the event's `position` says.
 *
 * Game code, a page's.
 *
 * @example
 * // w.emit('splash', { position: [0, 2, 0] });
 */
import { defineEmitter } from '../../../engine';

defineEmitter('emitter:teeterSplash', {
  description: 'A small splash: a white crown of drops.',
  area: [0.3, 0.05, 0.3],
  velocity: [0, 3.2, 0],
  spread: 1.6,
  gravity: 9,
  drag: 0.2,
  life: [0.5, 0.9],
  size: [0.09, 0.02],
  color: ['#ffffff', '#bfe9ff'],
  alpha: [1, 0.2],
  additive: false,
  count: 36,
  events: ['splash'],
} as never);
defineEmitter('emitter:teeterSplashBig', {
  description: 'A huge splash: a tall white crown, the best shot in the attract mode.',
  area: [0.6, 0.1, 0.6],
  velocity: [0, 8.5, 0],
  spread: 3,
  gravity: 10,
  drag: 0.15,
  life: [0.9, 1.5],
  size: [0.15, 0.03],
  color: ['#ffffff', '#cfefff'],
  alpha: [1, 0.15],
  additive: false,
  count: 130,
  events: ['splashBig'],
} as never);
defineEmitter('emitter:teeterRipple', {
  description: 'A little ring of droplets when somebody moves.',
  area: [0.8, 0.01, 0.8],
  velocity: [0, 0.3, 0],
  spread: 0.5,
  gravity: 0.6,
  life: [0.5, 1],
  size: [0.05, 0.01],
  color: ['#ffffff', '#bfe9ff'],
  alpha: [0.8, 0],
  additive: false,
  count: 22,
  events: ['ripple'],
} as never);
defineEmitter('emitter:teeterClack', {
  description: 'Dust as a pebble lands on the cairn.',
  area: [0.2, 0.05, 0.2],
  velocity: [0, 0.6, 0],
  spread: 0.5,
  gravity: 0.4,
  drag: 2,
  life: [0.4, 0.8],
  size: [0.06, 0.12],
  color: ['#e6d6ac', '#f4e8c8'],
  alpha: [0.7, 0],
  additive: false,
  count: 12,
  events: ['clack'],
} as never);
defineEmitter('emitter:teeterCalm', {
  description: 'The calm wave leaving your hands.',
  area: [2.4, 0.1, 2.4],
  velocity: [0, 0.8, 0],
  spread: 1.2,
  gravity: -0.3,
  drag: 1,
  life: [0.8, 1.4],
  size: [0.08, 0],
  color: ['#bfead6', '#ffffff'],
  brightness: [1.4, 1],
  alpha: [0.9, 0],
  additive: true,
  count: 60,
  events: ['calmCall'],
} as never);
defineEmitter('emitter:teeterSparkle', {
  description: 'Sparkle when a rep banks or a stamp lands.',
  area: [0.3, 0.3, 0.3],
  velocity: [0, 1.4, 0],
  spread: 1,
  gravity: 1.5,
  life: [0.4, 0.8],
  size: [0.05, 0],
  color: ['#fff3c0', '#ff8a70'],
  brightness: [1.6, 1],
  alpha: [1, 0],
  additive: true,
  count: 18,
  events: ['sparkle', 'gate', 'hoopCatch', 'lineFlag', 'guestDelivered', 'marbleSunk'],
} as never);
defineEmitter('emitter:teeterFeathers', {
  description: 'Gull feathers, drifting down. They are not sorry.',
  area: [0.2, 0.1, 0.2],
  velocity: [0, 0.4, 0],
  spread: 1,
  gravity: 0.6,
  drag: 1.6,
  turbulence: 1.5,
  life: [1, 1.8],
  size: [0.06, 0.04],
  color: ['#ffffff', '#e8eef2'],
  alpha: [1, 0],
  additive: false,
  count: 14,
  events: ['gullFlicked', 'feathers'],
} as never);
defineEmitter('emitter:teeterRain', {
  description: 'Storm rain, emitted over the camera.',
  area: [22, 2, 22],
  velocity: [-3, -16, 0],
  spread: 0.6,
  gravity: 2,
  life: [0.9, 1.3],
  size: [0.024, 0.014],
  color: ['#c8d8e8', '#a8b8c8'],
  alpha: [0.7, 0.4],
  additive: false,
  stretch: true,
  rate: 520,
} as never);
defineEmitter('emitter:teeterSpray', {
  description: 'Spray off the shore in the storm.',
  area: [8, 0.5, 8],
  velocity: [-2, 3, 0],
  spread: 2,
  gravity: 6,
  life: [0.5, 1],
  size: [0.07, 0.02],
  color: ['#e4f2f8', '#b8d0dc'],
  alpha: [0.7, 0],
  additive: false,
  rate: 60,
} as never);

defineEmitter('emitter:teeterConfetti', {
  description: 'Confetti, on Unsettling. Polite confetti.',
  area: [0.4, 0.1, 0.4],
  velocity: [0, 5, 0],
  spread: 3,
  gravity: 4,
  drag: 1.2,
  turbulence: 2,
  life: [2, 3],
  size: [0.06, 0.06],
  color: ['#ff8a70', '#bfead6'],
  alpha: [1, 0.8],
  additive: false,
  count: 90,
  events: ['confetti'],
} as never);
