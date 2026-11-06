/**
 * @file The Round's deal (PLAN.md section 9): Still Ring, then one of Heron, Hoop or Step, then Still Pond.
 *
 * Game code, sim-side data.
 *
 * @example
 * MIDDLE_CLASSES.length; // 3
 */

/** What the middle class may be. */
export const MIDDLE_CLASSES = ['heron', 'hoop', 'step'] as const;

/** Seconds a class's short form takes, including lead-in. */
export const SHORT_SECONDS = 51;

/** Seconds of the podium in Group Class. */
export const PODIUM_SECONDS = 8;
