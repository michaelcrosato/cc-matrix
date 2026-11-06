/**
 * @file The cast, sim-side, all in one import: builds, the clip set, the roster, and the core props a session needs.
 *
 * Game code, sim-side.
 *
 * @example
 * // import '../cast';
 */
import './builds';
import './clips';

/** The floor rings an activity puts under a body. */
export { COLORS, SEAT_COLORS, guestBody, guestBuild } from './roster';
