/** @file Original retreat props, registered when their scene is built. */
import { box, cone, prop } from './kit';
export function makeDrinkTable(): void {
  prop('drinkTable', [
    box('top', [0, 0.9, 0], [2.5, 0.1, 1.4], '#e6ddc2'),
    ...[-1, 1].map((x) => box(`leg${x}`, [x, 0, 0], [0.12, 0.9, 1], '#b3bea4')),
  ]);
}
export function makeDrinkGlass(): void {
  prop('drinkGlass', [
    cone('glass', [0, 0, 0], 0.07, 0.09, 0.23, '#bdd7c4', 12),
    cone('juice', [0, 0.02, 0], 0.06, 0.072, 0.15, '#e7bd77', 12),
    box('straw', [0.02, 0.1, 0], [0.012, 0.28, 0.012], '#f4ecce'),
  ]);
}
export function makeMarbleQuiet(): void {
  prop('marbleQuiet', [box('marble', [0, 0, 0], [0.16, 0.16, 0.16], '#e8e6cd', 0.08)]);
}
export function makePhoneStone(): void {
  prop('phoneStone', [box('stone', [0, 0, 0], [0.15, 0.25, 0.065], '#9eaa9c', 0.025)]);
}
