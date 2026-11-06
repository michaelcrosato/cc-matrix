/**
 * @file The eight poses. A class is three of them, or two, read from here. The hold is data.
 * Changing a seat means editing a row, not the class.
 */

/** How a pose wants the thumb, the feet and the score. */
export interface Pose {
  id: string;
  title: string;
  /** One seat, or two for the comma. */
  seats: readonly { x: number; y: number }[];
  /** Hold length in seconds. 0 uses `game.pose.hold`. */
  hold: number;
  /** Ring radius. 0 uses `game.pose.ring`. */
  ring: number;
  noise: number;
  instability: number;
  /** Weight of the ring, then of the breath (or the feet, for the chair). */
  weights: readonly [number, number];
  /** none breathes. both holds the feet and does not score breath. left or right is the standing foot. */
  feet: 'none' | 'both' | 'left' | 'right';
  gull: boolean;
}

/** Every pose the pavilion knows. */
export const POSES: readonly Pose[] = [
  {
    id: 'nothing',
    title: 'Seated Nothing',
    seats: [{ x: 0, y: 0 }],
    hold: 0,
    ring: 0,
    noise: 0.5,
    instability: 1,
    weights: [0.4, 0.6],
    feet: 'none',
    gull: false,
  },
  {
    id: 'chair',
    title: 'The Patient Chair',
    seats: [{ x: 0, y: -0.35 }],
    hold: 0,
    ring: 0,
    noise: 0.7,
    instability: 1,
    weights: [0.7, 0.3],
    feet: 'both',
    gull: false,
  },
  {
    id: 'heron',
    title: 'The Heron',
    seats: [{ x: 0, y: 0 }],
    hold: 0,
    ring: 0,
    noise: 1,
    instability: 1.5,
    weights: [0.7, 0.3],
    feet: 'left',
    gull: false,
  },
  {
    id: 'archer',
    title: 'The Archer',
    seats: [{ x: 0.35, y: 0.35 }],
    hold: 0,
    ring: 0,
    noise: 1,
    instability: 1.2,
    weights: [0.7, 0.3],
    feet: 'none',
    gull: false,
  },
  {
    id: 'comma',
    title: 'The Sideways Comma',
    seats: [
      { x: 0.5, y: 0 },
      { x: -0.5, y: 0 },
    ],
    hold: 8,
    ring: 0,
    noise: 1,
    instability: 1,
    weights: [0.7, 0.3],
    feet: 'none',
    gull: false,
  },
  {
    id: 'napkin',
    title: 'The Folded Napkin',
    seats: [{ x: 0, y: 0.5 }],
    hold: 0,
    ring: 0,
    noise: 1,
    instability: 1,
    weights: [0.7, 0.3],
    feet: 'none',
    gull: true,
  },
  {
    id: 'bridge',
    title: 'The Polite Bridge',
    seats: [{ x: 0, y: 0 }],
    hold: 0,
    ring: 0,
    noise: 1,
    instability: 1,
    weights: [0.3, 0.7],
    feet: 'none',
    gull: false,
  },
  {
    id: 'lighthouse',
    title: 'The Lighthouse',
    seats: [{ x: 0, y: 0 }],
    hold: 0,
    ring: 0.14,
    noise: 1.2,
    instability: 1,
    weights: [0.7, 0.3],
    feet: 'none',
    gull: false,
  },
];

/** A pose by id. */
export function poseById(id: string): Pose {
  const found = POSES.find((pose) => pose.id === id);
  if (!found) throw new Error(`no pose ${id}`);
  return found;
}

/** The three classes. */
export const POSE_SETS: Readonly<Record<string, readonly string[]>> = {
  'pose-a': ['nothing', 'chair', 'heron'],
  'pose-b': ['archer', 'comma', 'napkin'],
  'pose-c': ['bridge', 'lighthouse'],
};
