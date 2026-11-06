/** @file Original retreat props, registered when their scene is built. */
import { box, cone, prop } from './kit';
export function makeTare(): void {
  prop('tare', [
    box('footL', [-0.32, 0, 0], [0.25, 0.22, 0.42], '#667e70'),
    box('footR', [0.32, 0, 0], [0.25, 0.22, 0.42], '#667e70'),
    { ...cone('shell', [0, 0.73, -0.13], 0.62, 0.62, 0.3, '#e1c8a0', 40), rotation: [Math.PI / 2, 0, 0] },
    { ...cone('dial', [0, 0.73, 0.18], 0.49, 0.49, 0.035, '#fcf6dd', 40), rotation: [Math.PI / 2, 0, 0] },
    box('eyeL', [-0.18, 0.82, 0.23], [0.055, 0.085, 0.025], '#4a6156'),
    box('eyeR', [0.18, 0.82, 0.23], [0.055, 0.085, 0.025], '#4a6156'),
    { ...box('needle', [-0.04, 0.46, 0.24], [0.035, 0.23, 0.025], '#c77e64'), rotation: [0, 0, -0.35] },
    box('smile', [0, 0.57, 0.24], [0.15, 0.027, 0.02], '#4a6156'),
  ]);
}
export function makeNotice(): void {
  prop('notice', [
    box('post', [0, 0, 0], [0.18, 1.7, 0.18], '#9d8a67'),
    box('board', [0, 1.2, 0], [2.1, 1.4, 0.18], '#f4eedc'),
    box('strip', [0, 2.35, 0.11], [1.8, 0.09, 0.02], '#92b09a'),
    ...[-0.6, 0, 0.6].map((x, i) =>
      box(`paper${i}`, [x, 1.5, 0.12], [0.45, 0.5, 0.02], ['#d6e3c5', '#e6c7b3', '#d9d9c0'][i]),
    ),
  ]);
}
export function makePlaque(): void {
  prop('plaque', [
    box('post', [0, 0, 0], [0.09, 1.3, 0.09], '#9b9277'),
    box('face', [0, 1.05, 0], [1.35, 0.65, 0.09], '#eee6c9'),
    box('line', [0, 1.4, 0.055], [0.85, 0.035, 0.012], '#7e9983'),
  ]);
}
