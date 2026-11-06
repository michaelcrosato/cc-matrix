/** @file Original retreat props, registered when their scene is built. */
import { box, cone, prop } from './kit';
export function makeGardenTable(): void {
  prop('gardenTable', [
    box('stand', [0, 0, 0], [0.3, 1.1, 0.3], '#a89472'),
    box('tray', [0, 1.1, 0], [3, 0.18, 3], '#c1aa80'),
    box('sand', [0, 1.28, 0], [2.7, 0.04, 2.7], '#eee0b7'),
  ]);
}
export function makeStone(): void {
  prop('stone', [
    box('summit', [0, 0, 0], [4, 0.4, 3.2], '#b7b6a0', 0.18),
    box('plate', [0, 0.41, 0], [1, 0.03, 0.6], '#d6b77c'),
  ]);
}
export function makeFrog(): void {
  prop('frog', [
    cone('body', [0, 0, 0], 0.28, 0.2, 0.28, '#92ad78', 12),
    ...[-0.15, 0.15].map((x) => cone(`eye${x}`, [x, 0.2, 0.1], 0.07, 0.07, 0.12, '#e6e0bc', 10)),
  ]);
}
