// A place is somewhere you can stand: town, City or a room. Local coordinates, a group, collision.
import { THREE } from '../engine.js';
const { Group } = THREE;

export class Place {
  constructor(id, kind, { ox = 0, oz = 0, name = '' } = {}) {
    this.id = id;
    this.kind = kind;
    this.name = name;
    this.group = new Group();
    this.group.position.set(ox, 0, oz);
    this.ox = ox; this.oz = oz;
    this.nav = null;
  }
  blocked() { return false; }
  height() { return 0; }
  /** Things to interact with, as data: { id, x, z, r, label, run(g) }. */
  interactables() { return []; }
  cameraYawLocked() { return false; }
  update() {}
}
export function circleBlocked(place, x, z, r = 0.3) {
  return place.blocked(x - r, z - r) || place.blocked(x + r, z - r) || place.blocked(x - r, z + r) || place.blocked(x + r, z + r) || place.blocked(x, z);
}
/** Slide against the grid: try both axes, then each alone. */
export function moveWithCollision(place, pos, dx, dz, r0 = 0.3) {
  // Set down against something (a seat, a teleport)? Only the centre counts until you're clear.
  const r = circleBlocked(place, pos.x, pos.z, r0) ? 0.02 : r0;
  const nx = pos.x + dx, nz = pos.z + dz;
  const stepOK = (a, b) => Math.abs(place.height(a, b) - place.height(pos.x, pos.z)) < 0.55;
  if (!circleBlocked(place, nx, nz, r) && stepOK(nx, nz)) { pos.x = nx; pos.z = nz; return true; }
  let moved = false;
  if (!circleBlocked(place, nx, pos.z, r) && stepOK(nx, pos.z)) { pos.x = nx; moved = true; }
  if (!circleBlocked(place, pos.x, nz, r) && stepOK(pos.x, nz)) { pos.z = nz; moved = true; }
  return moved;
}
