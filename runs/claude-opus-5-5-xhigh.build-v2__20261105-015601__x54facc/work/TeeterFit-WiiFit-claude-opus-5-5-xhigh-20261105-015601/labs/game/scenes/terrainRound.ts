/**
 * @file The session's little ground: a lawn at the pavilion's height and a flat sea round it.
 *
 * Game code, sim-side data.
 *
 * @example
 * // getTerrain('terrain:round');
 */
import { defineTerrain } from '../../../engine/sim-api';
import { FLAT_Y, SEA_Y, STATIONS } from './data/stations';

const { x, z } = STATIONS.pavilion;

defineTerrain('terrain:round', {
  size: [240, 240],
  cell: 4,
  origin: [x - 120, SEA_Y, z - 120],
  flats: [{ rect: [x - 30, z - 24, x + 30, z + 24], height: FLAT_Y - SEA_Y, margin: 16 }],
  surface: 'grass',
  materials: ['material:seawater', 'material:sand', 'material:lawn'],
  high: 3.5,
} as never);
