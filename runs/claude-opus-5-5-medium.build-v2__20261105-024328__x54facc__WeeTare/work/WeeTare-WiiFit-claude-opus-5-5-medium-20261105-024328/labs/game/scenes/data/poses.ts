/**
 * @file The poses as a table (PLAN.md section 6). A row is one pose: its strip, its seat(s) on the disc, and its rules.
 * Adding a pose is adding a row and a strip in cast/clips.ts. `CLASSES` deals them into the three Pose Classes.
 */
export interface Pose {
  readonly id: string;
  readonly title: string;
  readonly clip: string;
  readonly seats: readonly (readonly [number, number])[];
  /** Sway and instability scales. */
  readonly sway: number;
  readonly instab: number;
  /** How much the breath weighs in the score. */
  readonly breath: number;
  /** Which feet must stay down. */
  readonly hold: '' | 'l' | 'both';
  /** The ring's scale: 1 is `game.pose.ring`. */
  readonly ring: number;
  /** Sway climbs with time. */
  readonly climbs?: boolean;
  /** The gull lands halfway. */
  readonly gull?: boolean;
  /** The strip follows the lungs. */
  readonly lungs?: boolean;
  /** Each seat's hold, seconds, when it isn't `game.pose.hold`. */
  readonly each?: number;
}

export const POSES: Readonly<Record<string, Pose>> = {
  nothing: { id: 'nothing', title: 'Seated Nothing', clip: 'RETREAT/Nothing', seats: [[0, 0]], sway: 0.5, instab: 1, breath: 0.6, hold: '', ring: 1 },
  chair: { id: 'chair', title: 'The Patient Chair', clip: 'RETREAT/Chair', seats: [[0, -0.35]], sway: 1, instab: 1, breath: 0, hold: 'both', ring: 1, climbs: true },
  heron: { id: 'heron', title: 'The Heron', clip: 'RETREAT/Heron', seats: [[0, 0]], sway: 1, instab: 1.5, breath: 0.3, hold: 'l', ring: 1 },
  archer: { id: 'archer', title: 'The Archer', clip: 'RETREAT/Archer', seats: [[0.35, 0.35]], sway: 1, instab: 1.2, breath: 0.3, hold: '', ring: 1 },
  comma: { id: 'comma', title: 'The Sideways Comma', clip: 'RETREAT/CommaR', seats: [[0.5, 0], [-0.5, 0]], sway: 1, instab: 1, breath: 0.3, hold: '', ring: 1, each: 8 },
  napkin: { id: 'napkin', title: 'The Folded Napkin', clip: 'RETREAT/Napkin', seats: [[0, 0.5]], sway: 1, instab: 1, breath: 0.3, hold: '', ring: 1, gull: true },
  bridge: { id: 'bridge', title: 'The Polite Bridge', clip: 'RETREAT/Bridge', seats: [[0, 0]], sway: 1, instab: 1, breath: 0.7, hold: '', ring: 1, lungs: true },
  lighthouse: { id: 'lighthouse', title: 'The Lighthouse', clip: 'RETREAT/Lighthouse', seats: [[0, 0]], sway: 1.2, instab: 1, breath: 0.3, hold: '', ring: 0.7 },
}; // prettier-ignore

export const CLASSES: Readonly<Record<string, readonly string[]>> = {
  poseA: ['nothing', 'chair', 'heron'],
  poseB: ['archer', 'comma', 'napkin'],
  poseC: ['bridge', 'lighthouse'],
};
