/**
 * @file The score scene. No terrain and no physics: the bot matrix is a balance problem, not a render.
 */
import { defineScene } from '../../../engine/sim-api';
import { boot, frame, retreatActions } from './driver';
import './settings';

/** Headless play and the page's balance tests share this scene. */
export const bench = defineScene('game:bench', {
  description: 'The retreat with no island mesh. Activities, the day, and the balance step.',
  physics: false,
  setup(w) {
    boot(w);
  },
  step(w, intents) {
    frame(w, intents);
  },
  actions: retreatActions,
});

export default bench;
