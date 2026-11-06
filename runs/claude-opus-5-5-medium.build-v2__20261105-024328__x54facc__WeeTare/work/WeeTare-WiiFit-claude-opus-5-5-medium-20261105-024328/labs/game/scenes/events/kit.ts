/**
 * @file What every activity is made of: the `Activity` shape, the running state's helpers, standing people on their marks,
 * moving props, and the small rules many activities share. An activity runs on `flow.ev`: phases, per-seat numbers in
 * `ev.s`, its own data in `ev.d`, entities it spawned in `ev.owned` (removed at the end, so nothing is left behind).
 */
import {
  physicsOf,
  placeActor,
  removeActor,
  removeProp,
  spawnProp,
  terrainHeight,
  type World,
} from '../../../../engine/sim-api';
import { setLean, setPose } from '../../cast/body';
import type { Order, Skill } from '../bot/players';
import { STATIONS, type StationId } from '../data/stations';
import { FULCRUM } from '../terrain';
import { cue, flowOf, say, seatsOf, type EvState, type SeatE, type W } from '../types';
import { stepBreath, stepWobble } from '../wobble';

/** An activity module. */
export interface Activity {
  readonly id: string;
  readonly title: string;
  readonly station: StationId;
  /** The camera's name in ui/shots.ts. */
  readonly shot: string;
  /** The action map the page uses. */
  readonly map: 'balance' | 'pointer';
  readonly song: string;
  /** Plays on every seat; others play seat 0 alone. */
  readonly multi?: boolean;
  setup(w: W, ev: EvState): void;
  step(w: W, ev: EvState): void;
  bot(w: W, ev: EvState, e: SeatE, skill: Skill): Order;
  teardown?(w: W, ev: EvState): void;
}

/** A place on the island or, in a session's little scene, the Pavilion alone. */
export function stationAt(w: W, id: StationId): { x: number; z: number; yaw: number } {
  if (w.query('roundScene').length) return { x: 0, z: 0, yaw: 0 };
  return STATIONS[id];
}

/** The ground's height at (x, z), from the terrain; `fallback` where there is none. */
export function groundAt(w: W, x: number, z: number, fallback = 0): number {
  if (w.query('roundScene').length) return fallback;
  return terrainHeight(FULCRUM(), x, z) ?? fallback;
}

/** Stands actor `id` on the ground at (x, z), at rest. */
export function standAt(w: W, id: number, x: number, z: number, yaw = 0): void {
  placeActor(w, id, [x, groundAt(w, x, z) + 0.02, z], yaw);
}

/** Holds actor `id` at a point in the air or over water: it never falls, because the step puts it back. */
export function hover(w: W, id: number, x: number, y: number, z: number, yaw: number): void {
  const entity = (w as unknown as World).get(id) as unknown as {
    actor: Record<string, unknown> & {
      body: number;
      character: { offset: number; capsule: { radius: number; height: number } };
    };
  };
  const { actor } = entity;
  const { offset, capsule } = actor.character;
  physicsOf(w as unknown as World).setBody(actor.body, {
    position: [x, y + offset + 0.005 + capsule.radius + capsule.height / 2, z],
    velocity: [0, 0, 0],
  });
  Object.assign(actor, { x, y, z, yaw: Math.atan2(Math.sin(yaw), Math.cos(yaw)), vy: 0 });
}

/** Spawns a prop for this run; the activity's end removes it. */
export function ownProp(w: W, ev: EvState, prop: string, at: readonly [number, number, number], yaw = 0): number {
  const id = spawnProp(w, { prop, at: [at[0], at[1], at[2]], yaw } as never);
  ev.owned.push(id);
  return id;
}

/** A quaternion from yaw alone. */
export const yawQuat = (yaw: number): [number, number, number, number] => [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)];

/** A quaternion for a small tilt: `rx` about east, `rz` about south, radians. */
export function tiltQuat(rx: number, rz: number): [number, number, number, number] {
  const [cx, sx, cz, sz] = [Math.cos(rx / 2), Math.sin(rx / 2), Math.cos(rz / 2), Math.sin(rz / 2)];
  return [sx * cz, -sx * sz, cx * sz, cx * cz];
}

/**
 * Moves a prop to a pose this step. Moving props here have no body: nothing collides with them, and the view reads the
 * pose straight from the component.
 */
export function moveProp(
  w: W,
  id: number,
  at: readonly [number, number, number],
  q: readonly [number, number, number, number] = [0, 0, 0, 1],
): void {
  const entity = (w as unknown as World).get(id) as unknown as
    { sceneProp?: { x: number; y: number; z: number; q: number[] } } | undefined;
  if (!entity?.sceneProp) return;
  [entity.sceneProp.x, entity.sceneProp.y, entity.sceneProp.z] = [at[0], at[1], at[2]];
  entity.sceneProp.q = [q[0], q[1], q[2], q[3]];
}

/** The seats an activity plays on. */
export const playing = (w: W, ev: EvState): SeatE[] => {
  const seats = seatsOf(w);
  return ev.seats.map((i) => seats.find((e) => e.seat.index === i) as SeatE).filter((e) => e && e.seat.kind !== 'none');
};

/** Moves the activity on a phase. */
export function phase(ev: EvState, name: string): void {
  ev.phase = name;
  ev.t = 0;
}

/** Whether a foot just went down. */
export const footDown = (e: SeatE, side: 'l' | 'r'): boolean =>
  side === 'l' ? e.seat.input.l >= 0.5 && e.seat.pl < 0.5 : e.seat.input.r >= 0.5 && e.seat.pr < 0.5;

/** Whether the seat's `act` was just pressed. */
export const actDown = (e: SeatE): boolean => e.seat.input.act && !e.seat.pact;

/** Whether both feet are down. */
export const bothHeld = (e: SeatE): boolean => e.seat.input.l >= 0.5 && e.seat.input.r >= 0.5;

/** Whether the CoB is inside a ring. */
export const inRing = (e: SeatE, x: number, y: number, r: number): boolean =>
  Math.hypot(e.wobble.x - x, e.wobble.y - y) <= r;

/** A line out of `count` numbered ones, by the stream `lines`. */
export function sayOne(w: W, base: string, count: number, who: string): void {
  say(w, `${base}.${w.rng('lines').int(1, count)}`, who);
}

/** Runs balance and breath for every playing seat. Ghosts only show what their messages say. */
export function balanceAll(w: W, ev: EvState, disturb?: (e: SeatE) => [number, number]): void {
  for (const e of playing(w, ev)) {
    if (e.seat.kind === 'ghost') continue;
    stepBreath(w, e, w.tick);
    if (!e.wobble.off) stepWobble(w, e, disturb ? disturb(e) : [0, 0]);
  }
}

/** Puts a body in a pose, tips it by its CoB, and lets it stumble while it recovers from a topple. */
export function bodyPose(w: W, e: SeatE, clip: string, t: number, mirror = false, lean = 1): void {
  if (e.wobble.recover > 0) setPose(w, e.seat.actor, 'RETREAT/Stumble', Math.min(1, e.wobble.recover / 30));
  else setPose(w, e.seat.actor, clip, t, mirror);
  setLean(w, e.seat.actor, e.wobble.x * lean, e.wobble.y * lean);
}

/** The opening of every activity's short form: a lead-in the whole class stands through. */
export function leadIn(w: W, ev: EvState, steps = 360): boolean {
  if (ev.phase !== 'lead') return false;
  if (ev.t === 0) cue(w, 'whistle');
  if (ev.t >= steps) phase(ev, 'go');
  return ev.phase === 'lead';
}

/**
 * Takes an actor away safely. Its body goes at once but its entity only at the step's end, so removing one before the actors move
 * would have the system step a body that is gone: it waits for the phase `rules`, out of sight until then.
 */
export function dropActor(w: W, id: number): void {
  hover(w, id, 0, -40, 0, 0);
  flowOf(w).dropping.push(id);
}

/** The system that does it: added once per scene. */
export function dropActors(w: W): void {
  const flow = flowOf(w);
  for (const id of flow.dropping) if ((w as unknown as World).get(id)) removeActor(w, id);
  flow.dropping.length = 0;
}

/** Removes everything this run spawned. */
export function clearOwned(w: W, ev: EvState): void {
  const world = w as unknown as World;
  for (const id of ev.owned) {
    const entity = world.get(id) as unknown as { sceneProp?: unknown; actor?: unknown } | undefined;
    if (!entity) continue;
    if (entity.sceneProp) removeProp(w, id);
    else if (entity.actor) dropActor(w, id);
    else world.despawn(id);
  }
  ev.owned.length = 0;
}

/** Whether the game is running attract. */
export const inAttract = (w: W): boolean => flowOf(w).auto;

/** Clamps. */
export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
