/** @file Original retreat props, registered when their scene is built. */
import { box, ring, prop } from './kit';
export function makeMatMint(): void {
  prop(
    'matMint',
    [
      box('mat', [0, 0.025, 0], [2.2, 0.085, 3.4], '#a3cdbc'),
      ring('disc', [0, 0.12, -0.15], 0.64, 0.68, '#f8f4df'),
      box('stripe', [0, 0.12, 1.35], [1.7, 0.008, 0.04], '#f8f4df'),
    ],
    { body: { type: 'fixed', shape: 'box', size: [2.2, 0.11, 3.4] } },
  );
}
export function makeMatCoral(): void {
  prop(
    'matCoral',
    [
      box('mat', [0, 0.025, 0], [2.2, 0.085, 3.4], '#e7a18a'),
      ring('disc', [0, 0.12, -0.15], 0.64, 0.68, '#fff1d3'),
      box('stripe', [0, 0.12, 1.35], [1.7, 0.008, 0.04], '#fff1d3'),
    ],
    { body: { type: 'fixed', shape: 'box', size: [2.2, 0.11, 3.4] } },
  );
}
export function makePavilion(): void {
  prop(
    'pavilion',
    [
      box('deck', [0, -0.08, 0], [19, 0.14, 15], '#f4eedc'),
      box('roof', [0, 5, -1], [20, 0.22, 14], '#fbfaf0'),
      ...[-8.8, 8.8].flatMap((x) =>
        [-6, 5].map((z, i) => box(`column${x}${i}`, [x, 0, z], [0.28, 5, 0.28], '#eeeee0')),
      ),
      box('beam', [0, 4.6, -6], [18, 0.32, 0.24], '#b9cfbe'),
      ...[-7, -5, 5, 7].map((x) => box(`curtain${x}`, [x, 0.8, -6], [1.2, 3.8, 0.055], '#e3eadc')),
    ],
    { body: { type: 'fixed', shape: 'box', size: [19, 0.06, 15] } },
  );
}
