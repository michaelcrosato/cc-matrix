/** @file Little Fulcrum's physical island and named station terraces. */
import { defineTerrain, getTerrain, terrainHeight } from '../../../engine/sim-api';
export const TERRAIN = defineTerrain('terrain:fulcrum', {
  size: [240, 240],
  origin: [-120, -1, -120],
  cell: 2,
  height: 0.6,
  scale: 38,
  seed: 12,
  hills: [
    { at: [0, 0], radius: 116, height: 13 },
    { at: [0, -20], radius: 45, height: 7 },
    { at: [-70, -12], radius: 15, height: -4 },
  ],
  flats: [
    { rect: [-65, 7, -40, 29], height: 8, margin: 6 },
    { rect: [-12, 24, 13, 45], height: 8, margin: 8 },
    { rect: [40, 11, 65, 36], height: 8, margin: 6 },
    { rect: [20, -58, 42, -37], height: 11, margin: 6 },
    { rect: [52, 43, 76, 64], height: 6, margin: 6 },
    { rect: [-80, -22, -60, -5], height: 4, margin: 5 },
    { rect: [-75, 50, -56, 74], height: 4, margin: 5 },
    { rect: [50, 74, 75, 92], height: 3, margin: 4 },
    { rect: [-10, -96, 12, -80], height: 14, margin: 4 },
    { rect: [-7, -6, 7, 6], height: 18, margin: 5 },
  ]
    .map((flat) => ({ ...flat, height: flat.height + 1 }))
    .concat([{ rect: [-69, 50, -60, 80], height: 0, margin: 0 }]),
  materials: ['material:retreatSand', 'material:retreatSand', 'material:retreatLawn'],
  high: 7,
  surface: 'grass',
  steep: 1,
});
const GROUND = getTerrain(TERRAIN.id);
export const islandGround = () => GROUND;
export const heightAt = (x: number, z: number) => terrainHeight(islandGround(), x, z) ?? 2;
