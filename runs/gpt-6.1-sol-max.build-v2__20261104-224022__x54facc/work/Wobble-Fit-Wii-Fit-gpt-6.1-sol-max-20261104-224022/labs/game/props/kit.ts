/** @file Small typed helpers for retreat solids. */
import { defineProp, type PropDefinition, type PropPart } from '../../../engine/sim-api';
type Part = Partial<PropPart>;
export const box = (name: string, at: number[], size: number[], tint: string, radius = 0.05): Part => ({
  name,
  geometry: 'geometry:roundedBox',
  params: { width: size[0], height: size[1], depth: size[2], radius: Math.min(radius, ...size.map((v) => v / 2)) },
  material: 'material:retreat',
  tint,
  position: at,
});
export const cone = (
  name: string,
  at: number[],
  radiusBottom: number,
  radiusTop: number,
  height: number,
  tint: string,
  radialSegments = 16,
): Part => ({
  name,
  geometry: 'geometry:frustum',
  params: { radiusBottom, radiusTop, height, radialSegments },
  material: 'material:retreat',
  tint,
  position: at,
});
export const ring = (
  name: string,
  at: number[],
  innerRadius: number,
  outerRadius: number,
  tint: string,
  height = 0.035,
): Part => ({
  name,
  geometry: 'geometry:ring',
  params: { innerRadius, outerRadius, height, radialSegments: 48 },
  material: 'material:retreat',
  tint,
  position: at,
});
export const prop = (id: string, parts: Part[], extra: PropDefinition = {}) =>
  defineProp(`prop:${id}`, { description: `Little Fulcrum ${id}.`, parts, ...extra });
