/**
 * @file Rain on the harbour windows. A running emitter, started from the page while the title or a story is up.
 */
import { defineEmitter } from '../../../engine';

defineEmitter('emitter:squall', {
  description: 'Fine rain, falling past the lamp. The page runs it over the theatre.',
  rate: 90,
  area: [6, 0.2, 4],
  velocity: [0, -6, 0],
  spread: 0.4,
  gravity: 4,
  life: [0.6, 1.1],
  size: [0.015, 0.008],
  color: ['#c5d4e0', '#8aa4b8'],
});
