/** @file Geometry parts for the basin's procedural props. All lengths are metres. */
import { defineProp, type PropPart } from '../../../engine/sim-api';
export function box(
  name: string,
  size: number[],
  at: number[],
  tint: string,
  rotation: number[] = [0, 0, 0],
): Partial<PropPart> {
  return {
    name,
    geometry: 'geometry:box',
    params: { width: size[0], height: size[1], depth: size[2] },
    position: at,
    tint,
    rotation,
    material: 'material:field',
  };
}
export function cone(
  name: string,
  r: number,
  h: number,
  at: number[],
  tint: string,
  top = r,
  rotation: number[] = [0, 0, 0],
): Partial<PropPart> {
  return {
    name,
    geometry: 'geometry:frustum',
    params: { radiusBottom: r, radiusTop: top, height: h, radialSegments: 7 },
    position: at,
    tint,
    rotation,
    material: 'material:field',
  };
}
export function prop(name: string, parts: Partial<PropPart>[], solid = false): void {
  let maxX = 0.1,
    maxY = 0.1,
    maxZ = 0.1;
  for (const p of parts) {
    const q = p.params ?? {},
      at = p.position ?? [0, 0, 0],
      radius = Number(q.radiusBottom ?? q.radiusTop ?? 0.2);
    maxX = Math.max(maxX, Math.abs(at[0]) + Number(q.width ?? radius * 2) / 2);
    maxY = Math.max(maxY, at[1] + Number(q.height ?? 1));
    maxZ = Math.max(maxZ, Math.abs(at[2]) + Number(q.depth ?? radius * 2) / 2);
  }
  defineProp(`prop:field-${name}`, {
    description: `Hand-built ${name} in the dry-season basin.`,
    parts,
    body: solid ? { type: 'fixed', size: [maxX * 2, maxY, maxZ * 2] } : { type: 'none' },
  });
}
