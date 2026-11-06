/**
 * @file The pose table (PLAN.md section 6): adding a row adds a pose. Seats are places on the balance disc.
 *
 * Game code, sim-side data.
 *
 * @example
 * POSES.heron.needs; // 'L'
 */

/** A pose. */
export interface PoseDef {
  id: string;
  name: string;
  /** The clip strip it scrubs. */
  clip: string;
  /** The seat on the disc, and a second seat for two-part holds. */
  seat: readonly [number, number];
  seat2?: readonly [number, number];
  clip2?: string;
  /** Sway and instability multipliers. */
  sway?: number;
  inst?: number;
  /** How much the breath weighs in its score (0.3 by default; 0 when feet are busy). */
  breath?: number;
  /** Feet that must stay held. */
  needs?: 'both' | 'L' | 'R';
  /** Its own ring, when not the default. */
  ring?: number;
  /** Sway climbs through the hold. */
  climbs?: boolean;
  /** The Gull lands halfway. */
  gull?: boolean;
  /** Hips follow your lungs: the strip from t = 0.5 on. */
  lungs?: boolean;
}

/** The poses. */
export const POSES: Readonly<Record<string, PoseDef>> = Object.freeze({
  nothing: { id: 'nothing', name: 'Seated Nothing', clip: 'Nothing', seat: [0, 0], sway: 0.5, breath: 0.6 },
  chair: { id: 'chair', name: 'The Patient Chair', clip: 'Chair', seat: [0, -0.35], needs: 'both', breath: 0, climbs: true },
  heron: { id: 'heron', name: 'The Heron', clip: 'Heron', seat: [0, 0], needs: 'L', inst: 1.5 },
  archer: { id: 'archer', name: 'The Archer', clip: 'Archer', seat: [0.35, 0.35], inst: 1.2 },
  comma: { id: 'comma', name: 'The Sideways Comma', clip: 'CommaL', clip2: 'CommaR', seat: [0.5, 0], seat2: [-0.5, 0] },
  napkin: { id: 'napkin', name: 'The Folded Napkin', clip: 'Napkin', seat: [0, 0.5], gull: true },
  bridge: { id: 'bridge', name: 'The Polite Bridge', clip: 'Bridge', seat: [0, 0], breath: 0.7, lungs: true },
  lighthouse: { id: 'lighthouse', name: 'The Lighthouse', clip: 'Lighthouse', seat: [0, 0], ring: 0.14, sway: 1.2 },
}); // prettier-ignore

/** The classes: each activity id and its poses. */
export const CLASSES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  poseA: ['nothing', 'chair', 'heron'],
  poseB: ['archer', 'comma', 'napkin'],
  poseC: ['bridge', 'lighthouse'],
  heron: ['heron'],
});
