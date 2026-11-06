/** @file Authored surgery case 2: quiet-lump. */
import { RANKS } from './calibration';
import type { Case } from '../types';
import { at, circle, cut, phase, close, cards } from './helpers';
export default {
  id: 'quiet-lump',
  title: 'The Quiet Lump',
  patient: 'Gwen Abara',
  age: 34,
  detail: 'Trumpet player. She promised the band she would make tonight’s set.',
  sites: ['Abdomen'],
  field: 'abdomen',
  seconds: 270,
  vitals: 85,
  lead: 'wren',
  gift: 0,
  ai: false,
  ranks: RANKS['quiet-lump'],
  postcard: cards(
    'Back on the trumpet. Played your name badly on purpose.',
    'I can manage the quiet notes. The loud ones will come.',
  ),
  phases: [
    phase('open', 'A routine incision', 'Scalpel [1]. Begin at the first dot. Hold and follow the cyan guide.', [
      cut(),
    ]),
    phase('bleeders', 'A little cautery', 'Laser [5]. Hold on the tiny bright bleeders. Watch the heat.', [
      at('bleeder', -2, -0.3),
      at('bleeder', 1.4, 0.5),
    ]),
    phase('scan', 'Something beneath the scar', 'Scanner [8] reveals the mass and three nodules. Laser the nodules.', [
      at('nodule', -3, -1.3, { buried: true }),
      at('nodule', 2.8, 1.5, { buried: true }),
      at('nodule', 3, -1.5, { buried: true }),
      at('mass', 0, 0, { path: circle(0, 0), buried: true }),
    ]),
    phase('reveal', 'It flinched', 'Forceps. The specimen just moved. Keep your hand steady.', [at('cocoon', 0, 0)], {
      drama: 'IT MOVED.',
    }),
    close(),
  ],
} satisfies Case;
