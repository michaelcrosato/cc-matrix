/** @file Authored surgery case 4: it-moves. */
import { RANKS } from './calibration';
import type { Case } from '../types';
import { at, wound, cut, phase, close, cards } from './helpers';
export default {
  id: 'it-moves',
  title: 'It Moves',
  patient: 'Gwen Abara',
  age: 34,
  detail: 'She came back before the last song. Her scar is moving.',
  sites: ['Abdomen'],
  field: 'abdomen',
  seconds: 330,
  vitals: 75,
  lead: 'wren',
  gift: 1,
  ai: false,
  ranks: RANKS['it-moves'],
  postcard: cards(
    'I wrote a song about the thing you took out. It is not a lullaby.',
    'The scar is quiet. That is enough music for today.',
  ),
  phases: [
    phase('reopen', 'The scar remembers', 'Follow the old incision. This time we keep the evidence.', [cut()]),
    phase(
      'lull',
      'LULL — the quiet is a symptom',
      'Laser the lilac Lulls. Gel their numb patches. Do not trust a quiet monitor.',
      [at('lull', -3, -1), at('lull', 2.5, -1.2), at('lull', 0.4, 1.6)],
    ),
    phase('cocoons', 'Bag the evidence', 'Forceps on the cocoons. Suture the tears.', [wound(-2, 0), wound(2, 0.8)]),
    phase(
      'matron',
      'The Matron',
      'Wait for her yawn. Hold the Syringe in her open maw: two Binder doses.',
      [at('matron', 0, 0, { radius: 1.25 })],
      { drama: 'SHE IS A MOTHER.' },
    ),
    close(),
  ],
} satisfies Case;
