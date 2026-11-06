/** @file Original retreat props, registered when their scene is built. */
import { box, ring, prop } from './kit';
export function makePostRetreat(): void {
  prop('postRetreat', [box('post', [0, 0, 0], [0.28, 2, 0.28], '#b49d75')]);
}
export function makeHoopRetreat(): void {
  prop('hoopRetreat', [{ ...ring('hoop', [0, 0, 0], 0.65, 0.72, '#e6b885'), rotation: [0.15, 0, 0] }]);
}
export function makeStepRetreat(): void {
  prop(
    'stepRetreat',
    [box('step', [0, 0, 0], [1.5, 0.22, 0.8], '#a2beb3'), box('top', [0, 0.23, 0], [1.4, 0.02, 0.72], '#e6ead7')],
    { body: { type: 'fixed', shape: 'box', size: [1.5, 0.25, 0.8] } },
  );
}
