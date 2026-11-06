/**
 * @file Sand Garden trays as data: marbles (1-3), holes, ridge segments, moving rakes and a gap in the rim. Coordinates are
 * metres on the 3 m tray (-1.4..1.4, z south). Add a row to add a tray.
 * @example
 * TRAYS.length; // 5
 */
export interface Tray {
  marbles: [number, number][];
  holes: [number, number][];
  ridges: [number, number, number, number][];
  rakes: { x: number; z: number; len: number; amp: number; rate: number; vertical: boolean }[];
  gap?: { side: 'e' | 'w'; z0: number; z1: number };
  seconds: number;
}
export const HOLE_R = 0.17;
export const TRAYS: readonly Tray[] = [
  { marbles: [[-0.9, 0.8]], holes: [[0.8, -0.7]], ridges: [], rakes: [], seconds: 16 },
  {
    marbles: [
      [-1, -0.8],
      [1, 0.9],
    ],
    holes: [
      [0.6, -0.6],
      [-0.7, 0.7],
    ],
    ridges: [[-0.3, 0, 0.5, 0]],
    rakes: [],
    seconds: 18,
  },
  {
    marbles: [
      [-1, 0.9],
      [0.9, 0.9],
    ],
    holes: [
      [0, -0.9],
      [0.9, -0.3],
    ],
    ridges: [
      [-0.8, 0.2, 0.1, 0.2],
      [0.3, -0.5, 0.3, 0.4],
    ],
    rakes: [],
    gap: { side: 'e', z0: 0.4, z1: 1.0 },
    seconds: 18,
  },
  {
    marbles: [
      [-1, -0.9],
      [0, 0.9],
      [1, -0.9],
    ],
    holes: [
      [0, -0.2],
      [-0.8, 0.5],
      [0.8, 0.5],
    ],
    ridges: [],
    rakes: [{ x: 0, z: 0.4, len: 0.8, amp: 0.7, rate: 0.5, vertical: false }],
    seconds: 20,
  },
  {
    marbles: [
      [-1.1, 0.9],
      [0, -1],
      [1.1, 0.9],
    ],
    holes: [
      [0, 0.6],
      [-0.9, -0.5],
      [0.9, -0.5],
    ],
    ridges: [[-0.5, 0, 0.5, 0]],
    rakes: [{ x: 0, z: -0.4, len: 0.7, amp: 0.8, rate: 0.4, vertical: false }],
    gap: { side: 'w', z0: -0.2, z1: 0.4 },
    seconds: 22,
  },
];
