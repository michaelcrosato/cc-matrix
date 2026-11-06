/** @file Original retreat props, registered when their scene is built. */
import { box, cone, prop } from './kit';
export function makeGull(): void {
  prop('gull', [
    box('body', [0, 0, 0], [0.22, 0.25, 0.5], '#f7f3dc', 0.1),
    box('wingL', [-0.3, 0.1, 0], [0.7, 0.055, 0.28], '#e6e9dd'),
    box('wingR', [0.3, 0.1, 0], [0.7, 0.055, 0.28], '#e6e9dd'),
    cone('beak', [0, 0.12, 0.3], 0.06, 0, 0.2, '#d4b274', 6),
  ]);
}
