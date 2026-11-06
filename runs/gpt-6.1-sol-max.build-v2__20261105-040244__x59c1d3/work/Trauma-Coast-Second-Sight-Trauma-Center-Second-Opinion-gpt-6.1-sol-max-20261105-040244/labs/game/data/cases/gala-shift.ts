/** @file The standalone co-op Gala Shift session case. */
import { RANKS } from './calibration';
import type { Case } from '../types';
import { at, wound, phase, close, cards } from './helpers';
export default {
  id: 'gala-shift',
  title: 'The Gala Shift',
  patient: 'The night shift',
  age: 0,
  detail: 'Two patients. One team. Keep both alive.',
  sites: ['Table A', 'Table B'],
  field: 'abdomen',
  seconds: 270,
  vitals: 80,
  lead: 'wren',
  gift: 1,
  ai: true,
  ranks: RANKS['gala-shift'],
  postcard: cards('The night shift held.', 'Both tables made it to morning.'),
  phases: [
    phase('team', 'Two tables. One team.', 'Split the work. Q / E switches tables. Keep both patients alive.', [
      wound(-3, -1, 0),
      wound(2, 1, 1),
      at('pool', -2, 0),
      at('pool', 2, 1, { site: 1 }),
      at('shard', 3, -1),
      at('lull', -2, -1, { site: 1 }),
      at('node', 0, 1, { site: 1 }),
      at('balm', 0, 1, { site: 1 }),
      at('flap', 0, -1.5),
      at('shard', 0, 0, { parent: -1 }),
    ]),
    close(),
  ],
} satisfies Case;
