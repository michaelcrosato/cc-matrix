/**
 * @file Little Fulcrum's station layout, in metres: x east, z south, island centre at 0, 0. Later content adds rows.
 *
 * Game code, sim-side data.
 *
 * @example
 * STATIONS.plaza.x; // 0
 */

/** A place on the island. */
export interface Station {
  id: string;
  title: string;
  x: number;
  z: number;
  /** Where a person faces on arrival, rad. */
  yaw: number;
  /** Flat ground height, when the station has a flat. */
  y: number;
}

/** Height of the island's flat stations, m. */
export const FLAT_Y = 8;

/** The stations (PLAN.md section 2). */
export const STATIONS: Readonly<Record<string, Station>> = Object.freeze({
  pier: { id: 'pier', title: 'Ferry Pier', x: 0, z: 94, yaw: Math.PI, y: 3.5 },
  plaza: { id: 'plaza', title: 'The Plaza', x: 0, z: 34, yaw: 0, y: FLAT_Y },
  pavilion: { id: 'pavilion', title: 'Pose Pavilion', x: -52, z: 18, yaw: 0, y: FLAT_Y },
  pond: { id: 'pond', title: 'Still Pond', x: -70, z: -12, yaw: 0, y: 5.4 },
  annex: { id: 'annex', title: 'The Annex', x: 52, z: 22, yaw: 0, y: FLAT_Y },
  huts: { id: 'huts', title: 'Guest Huts', x: 64, z: 52, yaw: 0, y: 5.2 },
  lagoon: { id: 'lagoon', title: 'South-West Lagoon', x: -60, z: 85, yaw: Math.PI / 2, y: 3.4 },
  terrace: { id: 'terrace', title: 'Sand Terrace', x: 30, z: -48, yaw: 0, y: 8 },
  cliff: { id: 'cliff', title: 'North Cliff', x: 0, z: -80, yaw: Math.PI, y: 15 },
  hoopBeach: { id: 'hoopBeach', title: 'Hoop Beach', x: 62, z: 84, yaw: 0, y: 3.4 },
  lighthouse: { id: 'lighthouse', title: 'Lighthouse', x: 84, z: -60, yaw: 0, y: 4 },
  eastTerrace: { id: 'eastTerrace', title: 'East Terrace', x: 74, z: 8, yaw: 0, y: 7 },
  centre: { id: 'centre', title: 'Centre Stone', x: 0, z: 0, yaw: 0, y: 14 },
});

/** The sea's height, m. */
export const SEA_Y = 2;

/** The offset of each of four mats from the pavilion's centre: seat 0 front left, then along. */
export const MAT_OFFSETS: readonly (readonly [number, number])[] = [
  [-4.5, 3],
  [-1.5, 3],
  [1.5, 3],
  [4.5, 3],
];

/** Where Plumb teaches from, as an offset from the pavilion's centre: the end of the row of mats, facing along it. */
export const PLUMB_AT = [-8.4, 3] as const;

/** The Annex's four step platforms and rep mats, as offsets from its centre. */
export const ANNEX_OFFSETS: readonly (readonly [number, number])[] = [
  [-4.5, 3],
  [-1.5, 3],
  [1.5, 3],
  [4.5, 3],
];
