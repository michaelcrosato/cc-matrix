/** @file Authored surgery case 1: first-cut. */
import { RANKS } from './calibration';
import type { Case } from '../types';
import { at, wound, phase, close, cards } from './helpers';
export default {
  id: 'first-cut',
  title: 'First Cut',
  patient: 'Tomás Reyes',
  age: 52,
  detail: 'Harbor pilot. His dog is waiting outside the ward.',
  sites: ['Chest'],
  field: 'chest',
  seconds: 240,
  vitals: 70,
  lead: 'wren',
  gift: 0,
  ai: false,
  ranks: RANKS['first-cut'],
  postcard: cards(
    'Pepper and I walked the seawall. She still thinks you saved me for her.',
    'Pepper has forgiven the stitches. I am trying to.',
  ),
  phases: [
    phase('blood', 'Clear the field', 'Choose Drain [4]. Hold over each dark pool until I can see.', [
      at('pool', -3, -1, { radius: 1.15 }),
      at('pool', 2.5, -0.8, { radius: 1.05 }),
      at('pool', 0, 1.7, { radius: 0.9 }),
    ]),
    phase('glass', 'Four pieces of glass', 'Forceps [2]. Hold a shard, then pull away slowly.', [
      at('shard', -3.2, -0.9),
      at('shard', 2.6, -1.4),
      at('shard', 0.8, 1.4),
      at('shard', -1.5, 1.8),
    ]),
    phase('stabilize', 'Steady the heart', 'Press F. Hold to fill the Syringe; release in the green band.', [], {
      goal: 'stabilize',
    }),
    phase('suture', 'Bring the edges together', 'Suture [3]. Hold and weave from one side of the wound to the other.', [
      wound(-3, -0.7),
      wound(2.8, -0.6),
      wound(0, 1.5),
    ]),
    close(),
  ],
} satisfies Case;
