/**
 * @file Who is on the island: `spawnCast` stands a named person in a world, with a character on the controller, a body
 * and build by id, the retreat's clip set, and (for Plumb) a long plait the view swings by itself. Every person is
 * `player: false`: the pilot (scenes/pilot.ts) writes their intents. Scrubbing writes the clip slots directly.
 *
 * Game code, sim-side.
 *
 * @example
 * // spawnCast(w, 'plumb', 2, 8, 3, 0);
 */
import { createCharacter, placeActor, playClip, spawnActor, stopClip, type ClipsData } from '../../../engine/sim-api';
import type { Cast, GameWorld } from '../scenes/components';
import './builds';
import { CLIPSET, LEANS } from './clips';

/** The guests' tracksuit colours, the first free, the rest bought with pebbles. */
export const COLORS = ['coral', 'teal', 'plum', 'sun', 'sky', 'forest'] as const;
/** The hub's seat colours, by name. */
export const SEAT_COLORS = ['red', 'blue', 'green', 'gold'] as const;

/** How each person is made: a body and a build by id, and how fast they walk. */
export const PEOPLE: Readonly<Record<string, { body: string; build: string; speed: number; hair?: string }>> = {
  plumb: { body: 'body:plumb', build: 'build:plumb', speed: 2.4, hair: 'ponytail' },
  tare: { body: 'body:tare', build: 'build:tare', speed: 4.8 },
  gerald: { body: 'body:gerald', build: 'build:gerald', speed: 3.6 },
  bex: { body: 'body:bex', build: 'build:bex', speed: 3.2 },
  nan: { body: 'body:nan', build: 'build:nan', speed: 1.6 },
};

/** The Guest's body id, by look and colour. */
export const guestBody = (look: number, color: string, band = false): string =>
  `body:guest${look}.${color}${band ? '.band' : ''}`;
/** The Guest's build id, by look. */
export const guestBuild = (look: number): string => `build:guest${look}`;

/** Spawns a person: returns the entity id. */
export function spawnCast(
  w: GameWorld,
  who: string,
  x: number,
  y: number,
  z: number,
  yaw = 0,
  make?: { body: string; build: string; speed: number; hair?: string; small?: boolean; extra?: Record<string, object> },
): number {
  const person = make ?? PEOPLE[who];
  const character = createCharacter({
    speed: person.speed,
    jumpSpeed: 6.5,
    ...(make?.small ? { capsule: { radius: 0.08, height: 0.05 } } : {}),
  });
  const cast: Cast = { who, hold: false, x, y, z, yaw, pose: '', poseT: 0, leanX: 0, leanY: 0, home: [x, z] };
  const components: Record<string, object> = { cast };
  if (person.hair) components.secondary = { hair: person.hair, color: '#3a4a55' };
  Object.assign(components, make?.extra ?? {});
  return spawnActor(w, {
    at: [x, y, z],
    character,
    player: false,
    yaw,
    anim: { build: person.build, weapon: 'none' },
    body: person.body,
    clips: { sets: [CLIPSET], ik: false },
    components,
  });
}

/** Strips that run round in a ring, scrubbed by an angle or a clock. */
const LOOPED = new Set(['HipCircle', 'Paddling', 'Crank', 'Flap']);

/** The clip layer of an entity, as data. */
type Clipped = { clips: ClipsData; cast: Cast; id: number };

/** Puts a strip plus the four leans on a person's clip layer. */
function dress(w: GameWorld, e: Clipped, pose: string): void {
  stopClip(w, e.id, 0.25);
  if (!pose) return;
  playClip(w, e.id, `RETREAT/${pose}`, {
    speed: 0,
    hold: true,
    walk: true,
    loop: LOOPED.has(pose),
    fade: 0.2,
    out: 0.25,
  });
  for (const lean of LEANS) playClip(w, e.id, lean, { speed: 0, hold: true, walk: true, loop: false, additive: true, fade: 0.2, out: 0.25 }); // prettier-ignore
}

/**
 * Keeps each person's clips matching their `cast`: dresses them when the pose changes, and writes each slot's time: the
 * pose by its progress, the leans by the CoB. A pose named `~Clip` plays a looping library clip instead.
 */
export function scrubCast(w: GameWorld): void {
  for (const e of w.query('cast', 'clips') as unknown as Clipped[]) {
    const { cast, clips } = e;
    const state = clips.state;
    const name = cast.pose || (cast.hold ? 'Stand' : '');
    const top = state.slots.find((slot) => slot.stopping === 0 && !slot.play.additive);
    const playing = top ? top.clip.split('/')[1] : '';
    const wanted = name.startsWith('~') ? name.slice(1) : name;
    if (playing !== wanted) {
      if (name.startsWith('~')) {
        stopClip(w, e.id, 0.25);
        playClip(w, e.id, `RETREAT/${wanted}`, { walk: true, loop: true, fade: 0.25, out: 0.25 });
      } else dress(w, e, wanted);
    }
    if (name.startsWith('~')) continue;
    for (const slot of clips.state.slots) {
      if (slot.stopping > 0) continue;
      if (slot.clip === 'RETREAT/LeanR') slot.t = Math.max(0, Math.min(1, cast.leanX));
      else if (slot.clip === 'RETREAT/LeanL') slot.t = Math.max(0, Math.min(1, -cast.leanX));
      else if (slot.clip === 'RETREAT/LeanF') slot.t = Math.max(0, Math.min(1, cast.leanY));
      else if (slot.clip === 'RETREAT/LeanB') slot.t = Math.max(0, Math.min(1, -cast.leanY));
      else slot.t = slot.play.loop ? cast.poseT : Math.max(0, Math.min(1, cast.poseT));
    }
  }
}

/** Holds people where the activity or scene wants them, after the physics, so nothing drifts. */
export function holdCast(w: GameWorld): void {
  for (const e of w.query('cast', 'actor')) {
    const c = e.cast;
    if (!c.hold) continue;
    try {
      placeActor(w, e.id, [c.x, c.y, c.z], c.yaw);
    } catch {
      // A place under the ground, a moment's fall through a cliff face: they stay where they were this step.
      e.actor.yaw = c.yaw;
    }
  }
}
