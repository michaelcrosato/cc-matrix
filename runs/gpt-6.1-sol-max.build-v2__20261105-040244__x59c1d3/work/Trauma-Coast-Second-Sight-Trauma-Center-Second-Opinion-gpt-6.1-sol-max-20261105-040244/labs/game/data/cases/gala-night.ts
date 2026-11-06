/** @file Authored surgery case 7: gala-night. */
import { RANKS } from './calibration';
import type { Case } from '../types';
import { at, wound, phase, close, cards } from './helpers';
export default {
  id: 'gala-night',
  title: 'Gala Night',
  patient: 'Three gala donors',
  age: 0,
  detail: 'Three tables. Voss is still making his speech.',
  sites: ['Table A', 'Table B', 'Table C'],
  field: 'abdomen',
  seconds: 390,
  vitals: 80,
  lead: 'wren',
  gift: 1,
  ai: true,
  ranks: RANKS['gala-night'],
  postcard: cards('Three signatures. Three lives. One very bad party.', 'We have cancelled next year’s gala.'),
  phases: [
    phase(
      'triage',
      'BALM — comfort is spreading',
      'Gel dissolves the pale lacquer. Drain and stitch before the film returns.',
      Array.from({ length: 3 }, (_, site) => [
        at('balm', 0, 0, { site, radius: 1.7 }),
        at('pool', -2, -0.7, { site }),
        wound(2, 1, site),
      ]).flat(),
    ),
    phase(
      'nodes',
      'Find the source',
      'Two Binder doses into each translucent Node. Clear the film around it.',
      Array.from({ length: 3 }, (_, site) => [at('node', 0, 0, { site }), at('balm', 0, 0, { site })]).flat(),
      { drama: 'THE SPEECH IS STILL PLAYING.' },
    ),
    close(),
  ],
} satisfies Case;
