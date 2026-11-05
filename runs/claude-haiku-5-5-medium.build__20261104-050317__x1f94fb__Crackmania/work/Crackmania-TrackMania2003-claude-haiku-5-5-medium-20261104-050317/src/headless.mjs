// The headless entry (Node tests): the same game, without a page.
import { loadEngine } from '../tools/node-env.mjs';
import { createGame } from './game.js';

export async function boot() {
  const E = await loadEngine();
  return createGame(E, { headless: true });
}
