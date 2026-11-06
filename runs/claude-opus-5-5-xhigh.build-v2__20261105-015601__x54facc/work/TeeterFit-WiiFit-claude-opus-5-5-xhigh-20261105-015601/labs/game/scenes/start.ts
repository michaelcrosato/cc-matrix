/**
 * @file Starting the big things: Group Class on the island and the finale. Kept apart so `use.ts` and the actions read
 * alike.
 *
 * Game code, sim-side.
 *
 * @example
 * // startGroup(w);
 */
import type { GameWorld } from './components';
import { flowOf, startActivity, type SeatUse } from './flow';

/** Starts Group Class with the seats asked for; empty seats go to CPU guests. */
export function startGroup(w: GameWorld, seats?: readonly SeatUse[]): void {
  const flow = flowOf(w);
  const cpu = (sway: number): SeatUse => ({ kind: 'cpu', skill: flow.day >= 5 ? 'perfect' : 'human', sway });
  startActivity(w, 'group', { seats: seats ?? [{ kind: 'local' }, cpu(0.9), cpu(1.2), cpu(0.5)] });
}

/** Starts the Great Tilt. */
export function startFinale(w: GameWorld): void {
  startActivity(w, 'tilt');
}
