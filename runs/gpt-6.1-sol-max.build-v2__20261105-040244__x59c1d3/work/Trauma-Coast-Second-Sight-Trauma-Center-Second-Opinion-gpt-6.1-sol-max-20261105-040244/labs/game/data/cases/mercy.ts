/** @file Authored surgery case 8: mercy. */
import { RANKS } from './calibration';
import type { Case } from '../types';
import { at, circle, wound, cut, phase, close, cards } from './helpers';
export default {
  id: 'mercy',
  title: 'Mercy',
  patient: 'Lucan Voss',
  age: 50,
  detail: 'His own product is inside his heart. He is still your patient.',
  sites: ['Heart'],
  field: 'heart',
  seconds: 480,
  vitals: 100,
  lead: 'wren',
  gift: 1,
  ai: true,
  ranks: RANKS['mercy'],
  postcard: cards(
    'You saved me. That is the one thing I could never have sold.',
    'The cuffs are uncomfortable. I am told that is the point.',
  ),
  phases: [
    phase('open', 'The last incision', 'Open the field. Whatever he did, your hands must be honest.', [cut()]),
    phase(
      'anesthesia',
      'MERCY / I — Anesthesia',
      'Laser all six motes. Three Binder doses while the shield is down.',
      [
        at('mercy', 0, 0, { radius: 1.4 }),
        ...Array.from({ length: 6 }, (_, i) =>
          at('mote', Math.cos((i * Math.PI) / 3) * 2.5, Math.sin((i * Math.PI) / 3) * 2.1),
        ),
      ],
      { drama: 'SHE IS SINGING.' },
    ),
    phase('kindness-code-1', 'MERCY / II — The Kindness', 'She stopped his heart. Shock in the green band.', [], {
      code: true,
    }),
    phase(
      'rakes-1',
      'Thirty seconds to close',
      'Three rakes. Thirty seconds. Stitch now.',
      [wound(-3, -1, 0, true), wound(2.7, -1, 0, true), wound(0, 1.5, 0, true)],
      { goal: 'race' },
    ),
    phase('kindness-code-2', 'The Kindness — again', 'One more shock. Do not let her call this kindness.', [], {
      code: true,
    }),
    phase(
      'rakes-2',
      'Not one stitch left behind',
      'Close all three before thirty seconds pass.',
      [wound(-3, 1, 0, true), wound(2.7, 1, 0, true), wound(0, -1.5, 0, true)],
      { goal: 'race' },
    ),
    phase(
      'last-rites',
      'MERCY / III — Last Rites',
      'Follow the guide as the ventricle beats.',
      [at('incision', 0, 0, { path: circle(0, 0, 1.7) })],
      { drama: 'WE ARE NOT FINISHED.' },
    ),
    phase(
      'tendrils',
      'Five hands around a heart',
      'Forceps. Free all five tendrils before they reattach.',
      Array.from({ length: 5 }, (_, i) =>
        at('tendril', Math.cos((i * Math.PI * 2) / 5) * 2.4, Math.sin((i * Math.PI * 2) / 5) * 2),
      ),
    ),
    phase(
      'binder-finish',
      'One Gift. Three points.',
      'A Gift is yours. Activate it, then Binder into all three gold marks.',
      [at('binder', -2, -0.8), at('binder', 2, -0.8), at('binder', 0, 1.6)],
      { gift: true, goal: 'gift-binder' },
    ),
    phase('final-code', 'Bring him back', 'Every surgeon. One heartbeat. Charge the paddles.', [], {
      code: true,
      allPaddles: true,
    }),
    close(),
  ],
} satisfies Case;
