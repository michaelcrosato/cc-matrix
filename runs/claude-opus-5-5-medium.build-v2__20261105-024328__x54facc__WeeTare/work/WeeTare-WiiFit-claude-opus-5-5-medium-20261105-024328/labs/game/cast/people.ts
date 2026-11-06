/**
 * @file Who is who: the characters' numbers, bodies and builds as data, and `spawnPerson`, which stands one in a scene as
 * an actor the pilot drives (`player: false`). Gull and Frog are blob crowd bodies, spawned in critters.ts.
 */
import { createCharacter, spawnActor, type Character } from '../../../engine/sim-api';
import '../builds';
import { CLIP_SETS } from './clips';

export interface Person {
  readonly body: string;
  readonly build: string;
  readonly speed: number;
  readonly secondary?: Readonly<Record<string, unknown>>;
}

export const PEOPLE: Readonly<Record<string, Person>> = {
  plumb: { body: 'body:plumb', build: 'build:plumb', speed: 2.4, secondary: { hair: 'ponytail' } },
  tare: { body: 'body:tare', build: 'build:tare', speed: 5 },
  gerald: { body: 'body:gerald', build: 'build:gerald', speed: 4.6 },
  bex: { body: 'body:bex', build: 'build:bex', speed: 4 },
  nan: { body: 'body:nan', build: 'build:nan', speed: 2 },
  extra0: { body: 'body:extra0', build: 'build:chibi', speed: 3 },
  extra1: { body: 'body:extra1', build: 'build:chibi', speed: 3 },
  extra2: { body: 'body:extra2', build: 'build:chibi', speed: 3 },
};

export const GUEST_SPEED = 5.4;
export const GUEST_JUMP = 7.5;

/** Guest bodies by look and colour: `body:guest<look>c<colour>`; hub seats use `body:seat<i>`. */
export const GUEST_BUILDS = ['build:chibi', 'build:guestTall', 'build:guestRound'] as const;
export const guestBody = (look: number, colour: number, headband = false): string =>
  `body:guest${look}c${colour}${headband ? 'h' : ''}`;

/** A character at `speed` m/s. */
export const characterAt = (speed: number): Character => createCharacter({ speed, jumpSpeed: GUEST_JUMP });

/** Stands a person at `at`, facing `yaw`. Keep every character at `player: false`: the pilot writes their intents. */
export function spawnPerson(
  w: object,
  spec: {
    at: [number, number, number];
    body: string;
    build: string;
    speed: number;
    yaw?: number;
    secondary?: Readonly<Record<string, unknown>>;
  },
): number {
  return spawnActor(w as never, {
    at: spec.at,
    character: characterAt(spec.speed),
    player: false,
    yaw: spec.yaw ?? 0,
    anim: { build: spec.build, weapon: 'none' },
    body: spec.body,
    clips: { sets: [...CLIP_SETS] },
    components: spec.secondary ? { secondary: spec.secondary } : {},
  });
}
