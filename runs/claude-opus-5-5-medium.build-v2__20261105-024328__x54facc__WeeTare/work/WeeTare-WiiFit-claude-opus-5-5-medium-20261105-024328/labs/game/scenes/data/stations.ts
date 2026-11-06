/**
 * @file The island's places as data (PLAN.md section 2), metres, x east, z south. Heights come from the terrain at run
 * time. `MATS` are the four mats of the Pavilion, seat by seat, relative to its centre.
 */
export interface Station {
  readonly x: number;
  readonly z: number;
  readonly yaw: number;
  readonly title: string;
}

export const STATIONS = {
  pier: { x: 0, z: 100, yaw: Math.PI, title: 'Ferry Pier' },
  plaza: { x: 0, z: 34, yaw: 0, title: 'The Plaza' },
  pavilion: { x: -52, z: 18, yaw: 0, title: 'Pose Pavilion' },
  pond: { x: -70, z: -12, yaw: 0, title: 'Still Pond' },
  annex: { x: 52, z: 22, yaw: 0, title: 'The Annex' },
  huts: { x: 64, z: 52, yaw: 0, title: 'Guest Huts' },
  lagoon: { x: -60, z: 85, yaw: 0, title: 'South-West Lagoon' },
  terrace: { x: 30, z: -48, yaw: 0, title: 'Sand Terrace' },
  cliff: { x: 0, z: -88, yaw: Math.PI, title: 'North Cliff' },
  hoopBeach: { x: 62, z: 84, yaw: 0, title: 'Hoop Beach' },
  lighthouse: { x: 84, z: -60, yaw: 0, title: 'Lighthouse' },
  east: { x: 74, z: 8, yaw: 0, title: 'East Terrace' },
  stone: { x: 0, z: 0, yaw: 0, title: 'Centre Stone' },
} as const satisfies Record<string, Station>;

export type StationId = keyof typeof STATIONS;

/** The four mats, seat by seat: x and z from the Pavilion's centre. Seat 0 is the front right; Plumb stands north of them. */
export const MATS: readonly (readonly [number, number])[] = [
  [-1.9, 1.2],
  [1.9, 1.2],
  [-5.2, 3.6],
  [5.2, 3.6],
];

/** Where the instructor stands, from the Pavilion's centre. */
export const FRONT_MAT: readonly [number, number] = [0, -5];
