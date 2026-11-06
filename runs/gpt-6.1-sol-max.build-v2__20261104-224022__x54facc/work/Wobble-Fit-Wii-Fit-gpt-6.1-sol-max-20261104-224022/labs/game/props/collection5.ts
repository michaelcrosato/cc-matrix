/** @file Original retreat props, registered when their scene is built. */
import { box, cone, prop } from './kit';
export function makeHut(): void {
  prop('hut', [
    box('room', [0, 0, 0], [5, 3, 5], '#f3eddb'),
    box('door', [0, 0.05, 2.52], [1.25, 2.3, 0.06], '#a9c0a3'),
    cone('roof', [0, 3, 0], 4.2, 0.2, 1.6, '#c0b08e', 4),
    box('window', [2.53, 1.2, 0], [0.04, 1, 1.4], '#9ebdb6'),
  ]);
}
export function makeLighthouse(): void {
  prop('lighthouse', [
    cone('tower', [0, 0, 0], 2, 1.3, 13, '#f8f2dc', 16),
    cone('stripe', [0, 8, 0], 1.57, 1.5, 1.3, '#c98e79', 16),
    cone('lantern', [0, 13, 0], 1.5, 1.5, 1.8, '#97b9b3', 12),
    cone('cap', [0, 14.8, 0], 2, 0.05, 1.3, '#728b79', 12),
  ]);
}
export function makeBenchRetreat(): void {
  prop('benchRetreat', [
    box('seat', [0, 0.5, 0], [2.6, 0.12, 0.8], '#c7b895'),
    box('back', [0, 0.65, -0.35], [2.6, 0.65, 0.12], '#c7b895'),
    ...[-1, 1].map((x) => box(`leg${x}`, [x, 0, 0], [0.1, 0.5, 0.6], '#7d9683')),
  ]);
}
