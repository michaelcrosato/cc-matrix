/** @file Original retreat props, registered when their scene is built. */
import { box, cone, ring, prop } from './kit';
export function makePebble(): void {
  prop('pebble', [box('stone', [0, 0, 0], [0.52, 0.22, 0.38], '#d4c8ad', 0.1)]);
}
export function makePath(): void {
  prop('path', [box('paver', [0, 0, 0], [2.4, 0.06, 1.5], '#dfe1bd', 0.16)]);
}
export function makePlatform(): void {
  prop('platform', [
    cone('base', [0, 0, 0], 2.6, 2.6, 0.2, '#eee8cd', 48),
    ring('mint', [0, 0.21, 0], 1.7, 1.75, '#a2cbb7'),
    ring('coral', [0, 0.22, 0], 0.8, 0.84, '#d98b73'),
  ]);
}
