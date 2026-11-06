/**
 * @file Little Fulcrum's terrain (PLAN.md section 10): 240 by 240 m, a dome with a summit hill, flats for each station,
 * negative hills for the pond and the north cove; sand shores and lawn uplands by height.
 *
 * Game code, sim-side data.
 *
 * @example
 * // getTerrain('terrain:fulcrum');
 */
import { defineTerrain } from '../../../engine/sim-api';
import { FLAT_Y, STATIONS } from './data/stations';

/** A flat footprint round a station. */
const flat = (id: string, half: number, height: number, margin = 7) => {
  const s = STATIONS[id];
  return { rect: [s.x - half, s.z - half, s.x + half, s.z + half] as const, height, margin };
};

defineTerrain('terrain:fulcrum', {
  size: [240, 240],
  cell: 2,
  origin: [-120, 0, -120],
  height: 0.5,
  scale: 34,
  seed: 11,
  hills: [
    { at: [0, 0], radius: 118, height: 12.5 },
    { at: [0, 0], radius: 44, height: 3.5 },
    { at: [-70, -12], radius: 18, height: -3 },
    { at: [0, -58], radius: 34, height: 6 },
    { at: [0, -82], radius: 16, height: 5 },
    { at: [0, -106], radius: 26, height: -9 },
    { at: [70, -96], radius: 20, height: -6 },
    { at: [-90, -80], radius: 26, height: -5 },
  ],
  flats: [
    flat('plaza', 16, FLAT_Y),
    flat('pavilion', 12, FLAT_Y),
    flat('annex', 14, FLAT_Y),
    flat('terrace', 8, 8),
    flat('huts', 8, 5.2),
    flat('eastTerrace', 8, 7),
    flat('pond', 3, 5.4, 6),
    flat('centre', 3, 14, 12),
    flat('cliff', 7, 15, 9),
    flat('hoopBeach', 7, 3.4, 8),
    flat('lighthouse', 4, 4, 6),
  ],
  surface: 'grass',
  materials: ['material:sand', 'material:sand', 'material:lawn'],
  high: 5,
} as never);
