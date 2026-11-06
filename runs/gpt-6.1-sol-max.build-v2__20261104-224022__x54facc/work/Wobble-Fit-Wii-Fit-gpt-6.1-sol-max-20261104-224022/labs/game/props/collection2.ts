/** @file Original retreat props, registered when their scene is built. */
import { box, cone, prop } from './kit';
export function makePalm(): void {
  prop('palm', [
    cone('trunk', [0, 0, 0], 0.19, 0.1, 5.7, '#b49b75', 8),
    ...Array.from({ length: 7 }, (_, i) => {
      const a = (i * Math.PI * 2) / 7;
      return {
        ...box(
          `frond${i}`,
          [Math.sin(a) * 0.9, 5.25, Math.cos(a) * 0.9],
          [0.64, 0.12, 3.2],
          i % 2 ? '#6f9f6f' : '#83b581',
        ),
        rotation: [0.25, a, 0],
      };
    }),
    cone('crown', [0, 5.2, 0], 0.35, 0.05, 0.8, '#729b61', 7),
  ]);
}
export function makeShrub(): void {
  prop('shrub', [
    cone('leaves', [0, 0, 0], 0.75, 0.35, 0.75, '#88ac76', 8),
    cone('top', [0, 0.4, 0], 0.5, 0.08, 0.55, '#a5be86', 7),
  ]);
}
export function makeRock(): void {
  prop('rock', [box('stone', [0, 0, 0], [2.1, 1.2, 1.55], '#b6b6a2', 0.4)]);
}
