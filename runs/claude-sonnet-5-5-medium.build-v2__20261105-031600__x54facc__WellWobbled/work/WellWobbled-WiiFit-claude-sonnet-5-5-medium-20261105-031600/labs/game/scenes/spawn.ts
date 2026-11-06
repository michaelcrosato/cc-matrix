/**
 * @file Small spawn helpers: despawn a list of ids, spawn a drawn marker, stand a prop on the ground.
 * @example
 * despawnAll(w, [1, 2]);
 */
import { spawnProp, removeProp } from '../../../engine/sim-api';
import type { W } from './events/types';
import { groundAt } from './data/world';

export function despawnAll(w: W, ids: number[]): void {
  for (const id of ids)
    if (w.has(id)) {
      const e = w.get(id) as unknown as { sceneProp?: unknown };
      if (e.sceneProp) removeProp(w as never, id);
      else w.despawn(id);
    }
}
/** Stands a prop at (x, z) on the ground (or at height y when given); returns its entity id. */
export function stand(w: W, prop: string, x: number, z: number, yaw = 0, y?: number): number {
  return spawnProp(w as never, { prop, at: [x, y ?? groundAt(x, z), z], yaw } as never);
}
export function mark(w: W, x: number, y: number, z: number, size: number, material: string, kind = ''): number {
  return w.spawn({ mark: { x, y, z, size, material, yaw: 0, kind } });
}
