/**
 * @file Small helpers for writing props as data: parts by shape, in metres, standing on their base.
 *
 * Game code, sim-side data.
 *
 * @example
 * // box('top', 2, 0.1, 1, 'material:deck', [0, 1, 0]);
 */
import type { PropPart } from '../../../engine/sim-api';

/** A three-number list. */
type V3 = readonly [number, number, number];

/** A box part. */
export const box = (name: string, width: number, height: number, depth: number, material: string, position: V3 = [0, 0, 0], rotation: V3 = [0, 0, 0], tint = '#ffffff'): Partial<PropPart> => ({
  name, geometry: 'geometry:box', params: { width, height, depth }, material, position: [...position], rotation: [...rotation], tint,
}) as Partial<PropPart>; // prettier-ignore

/** A rounded box part. */
export const rbox = (name: string, width: number, height: number, depth: number, radius: number, material: string, position: V3 = [0, 0, 0], rotation: V3 = [0, 0, 0], tint = '#ffffff'): Partial<PropPart> => ({
  name, geometry: 'geometry:roundedBox', params: { width, height, depth, radius, segments: 2 }, material, position: [...position], rotation: [...rotation], tint,
}) as Partial<PropPart>; // prettier-ignore

/** A cylinder or cone part (frustum), standing on the ground. */
export const cyl = (name: string, radiusBottom: number, radiusTop: number, height: number, material: string, position: V3 = [0, 0, 0], rotation: V3 = [0, 0, 0], tint = '#ffffff', smooth = true): Partial<PropPart> => ({
  name, geometry: 'geometry:frustum', params: { radiusBottom, radiusTop, height, smooth, radialSegments: smooth ? 24 : 8 }, material, position: [...position], rotation: [...rotation], tint,
}) as Partial<PropPart>; // prettier-ignore

/** A ring part: flat when `height` is 0. */
export const ring = (name: string, innerRadius: number, outerRadius: number, height: number, material: string, position: V3 = [0, 0, 0], rotation: V3 = [0, 0, 0], tint = '#ffffff'): Partial<PropPart> => ({
  name, geometry: 'geometry:ring', params: { innerRadius, outerRadius, height, radialSegments: 40 }, material, position: [...position], rotation: [...rotation], tint,
}) as Partial<PropPart>; // prettier-ignore

/** A limb part: a tapered round beam from its origin along +Y. */
export const limb = (name: string, length: number, radiusStart: number, radiusEnd: number, material: string, position: V3 = [0, 0, 0], rotation: V3 = [0, 0, 0], tint = '#ffffff'): Partial<PropPart> => ({
  name, geometry: 'geometry:limb', params: { length, radiusStart, radiusEnd }, material, position: [...position], rotation: [...rotation], tint,
}) as Partial<PropPart>; // prettier-ignore
