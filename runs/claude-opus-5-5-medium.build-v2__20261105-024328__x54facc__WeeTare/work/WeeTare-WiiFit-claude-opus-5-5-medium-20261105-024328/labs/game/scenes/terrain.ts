/**
 * @file Little Fulcrum's ground: a sea-girt dome with a summit, flats for its stations, hollows for the pond and the
 * lagoon, and the north cliff. `FULCRUM()` is its terrain data, for height queries.
 */
import { defineTerrain, getTerrain } from '../../../engine/sim-api';

export const FULCRUM_ID = 'terrain:fulcrum';

defineTerrain(FULCRUM_ID, {
  size: [260, 260],
  cell: 2,
  origin: [-130, 0, -130],
  height: 0,
  hills: [
    { at: [0, 0], radius: 122, height: 12.5 },
    { at: [0, 0], radius: 30, height: 4.5 },
    { at: [0, -74], radius: 26, height: 9 },
    { at: [0, -110], radius: 20, height: -22 },
    { at: [-60, 96], radius: 40, height: -13 },
    { at: [-70, -12], radius: 11, height: -5 },
    { at: [84, -60], radius: 14, height: 3 },
    { at: [0, 112], radius: 22, height: -7 },
  ],
  flats: [
    { rect: [-12, 26, 16, 46], height: 8, margin: 7 },
    { rect: [-64, 8, -40, 30], height: 7.4, margin: 6 },
    { rect: [40, 12, 66, 34], height: 7.2, margin: 6 },
    { rect: [56, 44, 78, 62], height: 5.2, margin: 6 },
    { rect: [20, -56, 40, -40], height: 7, margin: 6 },
    { rect: [-9, -93, 9, -80], height: 16, margin: 3 },
    { rect: [66, 2, 84, 16], height: 6.6, margin: 5 },
    { rect: [-77, -19, -63, -5], height: 3.6, margin: 5 },
    { rect: [52, 74, 74, 94], height: 2.7, margin: 8 },
  ],
  high: 4.6,
  materials: ['material:retreatSand', 'material:retreatStone', 'material:retreatLawn'],
  surface: 'grass',
});

/** The terrain's heights. */
let made: ReturnType<typeof getTerrain> | null = null;
export const FULCRUM = () => (made ??= getTerrain(FULCRUM_ID));
