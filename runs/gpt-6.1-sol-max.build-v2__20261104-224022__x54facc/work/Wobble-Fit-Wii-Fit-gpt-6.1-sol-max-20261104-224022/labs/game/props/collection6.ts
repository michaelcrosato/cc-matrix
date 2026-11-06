/** @file Original retreat props, registered when their scene is built. */
import { box, cone, prop } from './kit';
export function makeParasol(): void {
  prop('parasol', [
    cone('pole', [0, 0, 0], 0.045, 0.045, 3, '#b69e77'),
    cone('canopy', [0, 2.7, 0], 2.3, 0.1, 0.7, '#e9cf9d', 12),
  ]);
}
export function makePier(): void {
  prop(
    'pier',
    [
      box('deck', [0, 0, 0], [5, 0.22, 16], '#c6b18a'),
      ...[-2, 2].flatMap((x) => [-6, 0, 6].map((z) => box(`pile${x}${z}`, [x, -2, z], [0.25, 3, 0.25], '#a9916c'))),
    ],
    { body: { type: 'fixed', shape: 'box', size: [5, 0.22, 16] } },
  );
}
export function makeFerry(): void {
  prop('ferry', [
    box('hull', [0, 0, 0], [6, 1.3, 12], '#f3ecdb', 0.5),
    box('stripe', [0, 0.9, 0], [6.05, 0.3, 10], '#bcdbca'),
    box('cabin', [0, 1.3, -1], [4, 2.5, 6], '#f7f1df'),
    box('glass', [0, 2.1, 2.1], [3.4, 1, 0.04], '#8baead'),
    box('roof', [0, 3.8, -1], [4.8, 0.15, 7], '#d6c599'),
  ]);
}
