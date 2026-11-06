/**
 * @file The tilt as a force: while the Great Tilt runs, every walker gets a downhill push. The island's geometry never
 * moves (PLAN.md section 7); the slope pushes, the camera banks and the sea counter-rotates.
 *
 * Game code, sim-side.
 *
 * @example
 * // const [px, pz] = tiltPushFor(w, x, z);
 */
import type { GameWorld } from './components';
import { islandOf } from './flow';

/** How much of the walker's speed a degree of tilt takes. */
const PUSH_PER_DEGREE = 0.055;

/** The downhill push on a walker, as a share of its move. The story tilt is too small to push. */
export function tiltPushFor(w: GameWorld, _x: number, _z: number): [number, number] {
  const { tiltX, tiltZ } = islandOf(w);
  return [tiltX * PUSH_PER_DEGREE, tiltZ * PUSH_PER_DEGREE];
}

/** How far a topple on the Centre Stone throws the island, in degrees, and what is left of it each step. */
const LURCH = 3;
const LURCH_SETTLE = 0.98;

/** A topple on the Stone lurches the island 3 degrees the way you fell; it settles over about two seconds. */
export function stepLurch(d: { lurchX: number; lurchZ: number }, wob: { x: number; y: number; recover: number }): void {
  if (wob.recover === 59) {
    const r = Math.hypot(wob.x, wob.y) || 1;
    d.lurchX = (LURCH * wob.x) / r;
    d.lurchZ = (LURCH * wob.y) / r;
  }
  d.lurchX *= LURCH_SETTLE;
  d.lurchZ *= LURCH_SETTLE;
}
