/**
 * @file What activities share: phases, speech, ring markers, spawning that cleans itself up, and holding people in
 * place. Sim-side; everything spawned through it is listed on the activity, so teardown leaves nothing behind.
 *
 * Game code, sim-side.
 *
 * @example
 * // enter(c, 'hold'); say(c, 'plumb', 'pose.hold');
 */
import {
  fromCamera,
  getProp,
  propCentre,
  removeActor,
  removeProp,
  spawnProp,
  type PropPlacement,
} from '../../../../engine/sim-api';
import type { Cast, GameComponents, GameWorld } from '../components';
import type { Ctx } from './types';

/** The steps in `seconds`. */
export const steps = (c: { w: GameWorld }, seconds: number): number => Math.round(seconds * c.w.hz);

/** Moves the activity to a phase. */
export function enter(c: Ctx, phase: string): void {
  c.a.phase = phase;
  c.a.pt = 0;
  c.w.emit('phase', { event: c.a.id, phase });
}

/** Whether `seconds` have passed in this phase. */
export const after = (c: Ctx, seconds: number): boolean => c.a.pt >= steps(c, seconds);

/** Asks the page to say a line: `who` a cast id, `line` a line group's id. */
export function say(c: { w: GameWorld }, who: string, line: string): void {
  c.w.emit('say', { who, line, n: c.w.tick });
}

/** Spawns a prop for this activity; teardown removes it. */
export function propFor(c: Ctx, placement: PropPlacement): number {
  const id = spawnProp(c.w, placement);
  c.a.spawned.push(id);
  return id;
}

/** Spawns a plain entity for this activity; teardown removes it. */
export function entityFor(c: Ctx, spec: Partial<GameComponents>): number {
  const id = c.w.spawn(spec);
  c.a.spawned.push(id);
  return id;
}

/** Removes everything this activity spawned. */
export function clearSpawned(c: Ctx): void {
  for (const id of c.a.spawned) {
    const e = c.w.get(id);
    if (!e) continue;
    if (e.sceneProp) removeProp(c.w, id);
    else c.w.despawn(id);
  }
  for (const id of c.a.actors) if (c.w.get(id)) removeActor(c.w, id);
  c.a.spawned = [];
  c.a.actors = [];
}

/** The named person's entity. */
export function castOf(w: GameWorld, who: string): { id: number; cast: Cast } | undefined {
  return w.query('cast').find((e) => e.cast.who === who);
}

/** Holds a named person at a place until released. */
export function hold(w: GameWorld, who: string, x: number, y: number, z: number, yaw: number): void {
  const e = castOf(w, who);
  if (!e) return;
  Object.assign(e.cast, { hold: true, x, y, z, yaw });
}

/** Lets a named person walk again. */
export function release(w: GameWorld, who: string): void {
  const e = castOf(w, who);
  if (e) Object.assign(e.cast, { hold: false, pose: '', poseT: 0, leanX: 0, leanY: 0 });
}

/** Sets the pose strip a person scrubs, and how far along it is. */
export function pose(w: GameWorld, who: string, name: string, t: number, leanX = 0, leanY = 0): void {
  const e = castOf(w, who);
  if (e) Object.assign(e.cast, { pose: name, poseT: t, leanX, leanY });
}

/** A marker for HUD text: a score as text. */
export const pct = (v: number): string => `${Math.round(v * 100)}%`;

/** Stands each seat's person on a place round the station, facing `yaw`, with their pose reset. */
export function standSeats(c: Ctx, offsets: readonly (readonly [number, number])[], yaw: number, liftY = 0.05): void {
  for (const e of c.seats) {
    const [ox, oz] = offsets[e.seat.index] ?? [0, 0];
    const [x, z] = [c.station.x + ox, c.station.z + oz];
    const entity = c.w.get(e.seat.actor);
    if (!entity?.cast) continue;
    Object.assign(entity.cast, { hold: true, x, y: c.ground(x, z) + liftY, z, yaw, pose: '', poseT: 0, leanX: 0, leanY: 0 }); // prettier-ignore
  }
}

/** Copies each seat's CoB onto its person's leans. They face you, so their right is your left: a mirror. */
export function leanSeats(c: Ctx, scale = 1): void {
  for (const e of c.seats) {
    const entity = c.w.get(e.seat.actor);
    if (!entity?.cast) continue;
    entity.cast.leanX = -e.wobble.x * scale;
    entity.cast.leanY = e.wobble.y * scale;
  }
}

/** Sets every seat's person to a pose strip at a progress. */
export function poseSeats(c: Ctx, name: string, t: number): void {
  for (const e of c.seats) {
    const entity = c.w.get(e.seat.actor);
    if (!entity?.cast) continue;
    entity.cast.pose = name;
    entity.cast.poseT = t;
  }
}

/** The person standing in a seat. */
export function castInSeat(c: Ctx, index: number): Cast | undefined {
  const e = c.seats.find((s) => s.seat.index === index);
  return e ? c.w.get(e.seat.actor)?.cast : undefined;
}

/** Sends a critter somewhere. */
export function critterGo(c: { w: GameWorld }, kind: string, x: number, y: number, z: number, look = 0): void {
  const e = c.w.query('critter').find((k) => k.critter.kind === kind);
  if (e) Object.assign(e.critter, { goalX: x, goalY: y, goalZ: z, look, away: false });
}

/** Sends a critter away. */
export function critterAway(c: { w: GameWorld }, kind: string): void {
  const e = c.w.query('critter').find((k) => k.critter.kind === kind);
  if (e) e.critter.away = true;
}

/** Lets every named person walk again, and sends the critters off. */
export function releaseAll(c: { w: GameWorld }): void {
  for (const e of c.w.query('cast')) Object.assign(e.cast, { hold: false, pose: '', poseT: 0, leanX: 0, leanY: 0 });
  critterAway(c, 'gull');
  critterAway(c, 'frog');
}

/** Moves a body-less prop: its base at `x, y, z`, turned by quaternion `q` (or a yaw). */
export function moveProp(w: GameWorld, id: number, x: number, y: number, z: number, turn: number | number[] = 0): void {
  const e = w.get(id);
  if (!e?.sceneProp) return;
  const centre = propCentre(getProp(e.sceneProp.prop));
  e.sceneProp.x = x;
  e.sceneProp.y = y + centre;
  e.sceneProp.z = z;
  e.sceneProp.q = (typeof turn === 'number' ? [0, Math.sin(turn / 2), 0, Math.cos(turn / 2)] : [...turn]) as [
    number,
    number,
    number,
    number,
  ];
}

/** Spawns a floor shape for this activity. Its telegraph '' draws nothing. */
export function floorShape(c: Ctx, telegraph: string, x: number, y: number, z: number, size = 1, yaw = 0): number {
  return entityFor(c, { matRing: { telegraph, position: [x, y, z], yaw, u: 1, size, owner: -1 } });
}

/** The world direction a lean means from a camera's heading. */
export function worldFromLean(lx: number, ly: number, cam: number): [number, number] {
  const [x, z] = fromCamera(cam, [lx, ly]);
  return [x, z];
}

/** The lean that means a world direction, at heading 0 (the bots steer this way). */
export function leanForWorld(wx: number, wz: number): [number, number] {
  const [rx, rz] = fromCamera(0, [1, 0]);
  const [fx, fz] = fromCamera(0, [0, 1]);
  return [wx * rx + wz * rz, wx * fx + wz * fz];
}

/** Whether this seat is being played by a bot just now. */
export function isBot(c: Ctx, index: number): boolean {
  const e = c.seats.find((s) => s.seat.index === index);
  if (!e) return false;
  return (
    e.seat.kind === 'cpu' ||
    c.flow.attract ||
    c.w.settings.get<boolean>('game.auto') ||
    c.w.settings.get<boolean>('game.botSeat')
  );
}
