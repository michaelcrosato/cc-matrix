/**
 * @file Makes the four seats: each a `seat` and a `wobble`, tied to the person who stands in it.
 *
 * Game code, sim-side.
 *
 * @example
 * // makeSeats(w); // once, in setup
 */
import type { GameWorld } from './components';
import { makeWobble } from './wobble';

/** Spawns the four seats: `actors` are who stands in each, by entity id (setup's spawns are not live yet). */
export function makeSeats(w: GameWorld, actors: readonly number[]): void {
  actors.forEach((actor, index) => {
    w.spawn({
      seat: { index, kind: index === 0 ? 'local' : 'off', actor } as never,
      wobble: makeWobble(w, index),
    });
  });
}
