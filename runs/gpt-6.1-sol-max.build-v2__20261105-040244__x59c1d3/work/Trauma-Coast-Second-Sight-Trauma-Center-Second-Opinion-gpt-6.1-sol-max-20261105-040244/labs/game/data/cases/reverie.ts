/** @file Authored surgery case 6: reverie. */
import { RANKS } from './calibration';
import type { Case } from '../types';
import { at, cut, phase, close, cards } from './helpers';
export default {
  id: 'reverie',
  title: 'Reverie',
  patient: 'Bram Achterberg',
  age: 60,
  detail: 'The Chief wore his graft under his collar. He signed every trial.',
  sites: ['Chest', 'Abdomen'],
  field: 'heart',
  seconds: 360,
  vitals: 65,
  lead: 'wren',
  gift: 1,
  ai: true,
  ranks: RANKS['reverie'],
  postcard: cards(
    'A surgeon finishes. A better surgeon admits where he began.',
    'I have started reading the names on the files.',
  ),
  phases: [
    phase('incisions', 'Two surgeons. Two incisions.', 'Tab swaps surgeons. Q / E changes sites.', [
      cut(0, 0, 0),
      cut(0, 0, 1),
    ]),
    phase(
      'hunt',
      'REVERIE — listen for the true pulse',
      'Scan the moving ripple. Laser reveals it; keep firing while it is surfaced.',
      [at('reverie', 0, 0, { site: 0 }), at('decoy', -3, -1), at('decoy', 3, 1)],
    ),
    phase('decoys', 'One heartbeat is real', 'Scan the decoys. The real ripple beats with the ECG.', [
      at('decoy', -3, -1, { site: 1 }),
      at('decoy', 3, -1, { site: 1 }),
      at('decoy', 0, 2, { site: 1 }),
      at('reverie', 0, 0, { site: 1 }),
    ]),
    phase(
      'consult',
      'Ask for another pair of hands',
      'Lift the flap. Start a Gift together: CONSULT extends both.',
      [at('flap', 0, -1.5), at('reverie', 0, 0, { parent: -1 })],
      { gift: true, drama: 'I SIGNED THEM ALL.' },
    ),
    close(),
  ],
} satisfies Case;
