/** @file Authored surgery case 5: struck-off. */
import { RANKS } from './calibration';
import type { Case } from '../types';
import { at, phase, close, cards } from './helpers';
export default {
  id: 'struck-off',
  title: 'Struck Off',
  patient: '“Big Ana” Duarte',
  age: 46,
  detail: 'Stevedore. Her crew will not leave the ship without her.',
  sites: ['Ship clinic'],
  field: 'abdomen',
  seconds: 330,
  vitals: 70,
  lead: 'sabine',
  gift: 1,
  ai: true,
  ranks: RANKS['struck-off'],
  postcard: cards(
    'The whole crew signed this. Even the one who cannot write.',
    'The sea still makes me nervous. My crew pretends not to notice.',
  ),
  phases: [
    phase(
      'flap',
      'Lift, clip, look beneath',
      'Forceps on the gold flap handle. Lift up and release above the clip line.',
      [at('flap', 0, -1.5), at('solace', -0.7, -0.1, { generation: 1, parent: -1 })],
    ),
    phase(
      'storm',
      'SOLACE — the storm arrives',
      'Scalpel divides the large ones. Laser the smallest. Space: Second Pulse.',
      [at('solace', -3, 1, { generation: 1 }), at('solace', 3, -1, { generation: 1 })],
      { gift: true, drama: 'THEN USE THE SHAKE.' },
    ),
    phase('mother', 'Mother Solace', 'Your colleague holds the flap. Divide the mother and burn every child.', [
      at('flap', 0, -1.5),
      at('solace', 0, 0, { generation: 1, parent: -1, radius: 1.1 }),
    ]),
    close(),
  ],
} satisfies Case;
