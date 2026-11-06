/** @file Authored surgery case 3: crosstalk. */
import { RANKS } from './calibration';
import type { Case } from '../types';
import { at, wound, phase, close, cards } from './helpers';
export default {
  id: 'crosstalk',
  title: 'Crosstalk',
  patient: 'Hal Minsky',
  age: 58,
  detail: 'Bus driver. Route 9. He remembers every passenger’s stop.',
  sites: ['Liver', 'Lung', 'Arm'],
  field: 'liver',
  seconds: 300,
  vitals: 60,
  lead: 'wren',
  gift: 0,
  ai: false,
  ranks: RANKS['crosstalk'],
  postcard: cards(
    'Route 9 is running again. Your stop is always free.',
    'They gave my route to a younger man. I am teaching him the names.',
  ),
  phases: [
    phase('triage', 'Three sites. One patient.', 'Q / E change sites. Every wound keeps bleeding while you are away.', [
      ...Array.from({ length: 3 }, (_, site) => [
        wound(-2, -0.8, site),
        wound(2, 1, site),
        at('pool', -1, 0, { site, radius: 1 }),
      ]).flat(),
    ]),
    phase('code', 'CODE — charge the paddles', 'LMB + RMB together when the charge reaches the green band.', [], {
      code: true,
    }),
    phase(
      'discovery',
      'The room holds its breath',
      'Space starts pulse-lock. Match the next three heartbeats.',
      [wound(-2, -1, 0, true), wound(2, 1, 1, true), wound(0, 0, 2, true)],
      { gift: true, goal: 'gift', drama: 'HOLD. STILL.' },
    ),
    close(),
  ],
} satisfies Case;
