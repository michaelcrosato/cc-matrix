/**
 * @file The island as data: the terrain (dome, summit, hollows, station flats) and the station table (where each place
 * is and the height of its floor). Rows added here appear in the world, the Programme and the Noticeboard.
 * @example
 * STATIONS.plaza.at; // [0, 34]
 */
import { defineTerrain, getTerrain, terrainHeight } from '../../../../engine/sim-api';

export interface Station {
  readonly at: readonly [number, number];
  readonly name: string;
  readonly y: number;
}
const S = (name: string, x: number, z: number, y: number): Station => ({ name, at: [x, z], y });
export const STATIONS = {
  pier: S('Ferry Pier and Beach', 0, 100, 2.4),
  plaza: S('The Plaza', 0, 34, 8),
  pavilion: S('Pose Pavilion', -52, 18, 6),
  pond: S('Still Pond', -70, -12, 3.2),
  annex: S('The Annex', 52, 22, 6),
  huts: S('Guest Huts', 64, 52, 4.5),
  lagoon: S('South-West Lagoon', -60, 85, 2.4),
  terrace: S('Sand Terrace', 30, -48, 6),
  cliff: S('North Cliff', 0, -88, 15),
  hoop: S('Hoop Beach', 62, 84, 2.6),
  lighthouse: S('Lighthouse', 84, -60, 5),
  east: S('East Terrace', 74, 8, 5),
  stone: S('Centre Stone', 0, 0, 14),
} as const;
export type StationId = keyof typeof STATIONS;
/** The sea's height (m). */
export const SEA_Y = 2;
const flat = (s: Station, r = 9) => ({
  rect: [s.at[0] - r, s.at[1] - r, s.at[0] + r, s.at[1] + r],
  height: s.y,
  margin: 8,
});
export const TERRAIN = defineTerrain('terrain:fulcrum', {
  size: [240, 240],
  cell: 1,
  origin: [-120, 0, -120],
  seed: 7,
  height: 0.6,
  scale: 30,
  ridges: 0.1,
  octaves: 3,
  hills: [
    { at: [0, 0], radius: 118, height: 12 },
    { at: [0, 0], radius: 30, height: 3 },
    { at: [-70, -12], radius: 12, height: -4 },
    { at: [0, -105], radius: 14, height: -3 },
  ],
  flats: [
    flat(STATIONS.plaza, 10),
    flat(STATIONS.pavilion, 10),
    flat(STATIONS.annex, 11),
    flat(STATIONS.terrace, 7),
    flat(STATIONS.cliff, 8),
    flat(STATIONS.huts, 8),
    flat(STATIONS.east, 8),
    flat(STATIONS.stone, 5),
    flat(STATIONS.lighthouse, 5),
    flat(STATIONS.hoop, 7),
    flat(STATIONS.lagoon, 7),
    flat(STATIONS.pier, 6),
  ],
  high: 6,
  materials: ['material:rsandTerrain', 'material:rsandTerrain', 'material:rlawnTerrain'],
  surface: 'sand',
} as never);
/** Ground height at (x, z), or the sea level where nothing stands. */
export function groundAt(x: number, z: number): number {
  return terrainHeight(island(), x, z) ?? SEA_Y;
}
let made: ReturnType<typeof getTerrain> | null = null;
/** The made terrain, built once (getTerrain builds a new heightfield every call). */
export function island(): ReturnType<typeof getTerrain> {
  return (made ??= getTerrain('terrain:fulcrum'));
}
