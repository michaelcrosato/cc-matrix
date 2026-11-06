/** @file Original retreat props, registered when their scene is built. */
import { box, cone, prop } from './kit';
export function makeBuoy(): void {
  prop('buoy', [
    cone('float', [0, 0, 0], 0.42, 0.3, 0.5, '#e6b29a'),
    cone('flag', [0, 0.5, 0], 0.05, 0.05, 1, '#eee5c9'),
    box('pennant', [0.2, 1.1, 0], [0.5, 0.3, 0.025], '#96c6b1'),
  ]);
}
export function makeBoard(): void {
  prop('board', [
    box('board', [0, 0, 0], [1.1, 0.15, 3.4], '#f1dfb5', 0.3),
    box('stripe', [0, 0.16, 0], [0.18, 0.008, 2.7], '#8cb6a6'),
  ]);
}
export function makeRope(): void {
  prop('rope', [box('line', [0, 0, 0], [0.06, 0.06, 40], '#dfc69b', 0.025)]);
}
