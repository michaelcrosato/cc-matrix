// What the page starts on: the game's own title, or in an AI Hub session the round itself.
import { makeScene } from './index.js';

export function firstScene(info) {
  return info ? makeScene('medley', { session: true }) : makeScene('title', {});
}
