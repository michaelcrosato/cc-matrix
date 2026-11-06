/**
 * @file The scene `game:round`: the small separate scene a hub session plays (PLAN.md section 9). Just the pavilion, the
 * mats and the cast, so a copy boots inside the hub's 20 seconds. Every copy runs its own seeded round; the others are
 * ghosts on the neighbouring mats, fed by `game:ghosts` and affecting nothing.
 *
 * Game code, sim-side.
 *
 * @example
 * // ?scene=game:round&seed=7
 */
import { addTerrainBody, defineScene, getTerrain, physicsOf, type Intents } from '../../../engine/sim-api';
import { PEOPLE, SEAT_COLORS, guestBody, guestBuild, holdCast, scrubCast, spawnCast } from '../cast/roster';
import './components';
import './settings';
import type { GameComponents, GameWorld, Ghost } from './components';
import { FLAT_Y, MAT_OFFSETS, PLUMB_AT, STATIONS } from './data/stations';
import { castOf } from './events/kit';
import { activityOf, allSeats, flowOf, setHost, startActivity, stepActivity } from './flow';
import { stepCritters, spawnCritters } from './critters';
import { makeWobble } from './wobble';
import '../cast/index';
import './telegraphs';
import './terrainRound';

/** A ghost's message, as the page passes it on. */
interface GhostMessage {
  id: number;
  e: number;
  x: number;
  y: number;
  p: string;
  s: number;
  gone?: boolean;
}

/** The pillars of the session's pavilion: where each stack of blocks stands, relative to its centre. */
const PILLARS: readonly (readonly [number, number])[] = [[-11, -8], [-5.5, -8], [0, -8], [5.5, -8], [11, -8], [-11, 8], [-5.5, 8], [5.5, 8], [11, 8]]; // prettier-ignore

/**
 * Stands the pavilion, the mats and the people. A session spawns no prop at all: the engine warms a pipeline for every
 * registered prop part the moment the first prop arrives, which takes far past the hub's 20 seconds on a slow GPU. So
 * the floor and mats are telegraphs, the pillars stacks of plain blocks, the ground a small terrain.
 */
function setupRound(w: GameWorld): void {
  const { x, z } = STATIONS.pavilion;
  const terrain = getTerrain('terrain:round');
  addTerrainBody(physicsOf(w), terrain);
  setHost(w, { round: true, terrain, floorY: FLAT_Y, station: 'pavilion' });
  w.spawn({ flow: {} });
  w.spawn({ activity: {} });
  w.spawn({ island: { tilt: 0.4 } });
  w.spawn({
    matRing: { telegraph: 'telegraph:floor', position: [x, FLAT_Y + 0.01, z - 9], yaw: 0, u: 1, size: 1, owner: -1 },
  });
  for (const [px, pz] of PILLARS) {
    for (let k = 0; k < 11; k++)
      w.spawn({
        block: { x: x + px, y: FLAT_Y + k * 0.42, z: z + pz, yaw: 0, size: 0.42, material: 'material:white' },
      });
  }
  MAT_OFFSETS.forEach(([ox, oz], i) => {
    w.spawn({
      matRing: {
        telegraph: `telegraph:mat.${SEAT_COLORS[i]}`,
        position: [x + ox, FLAT_Y + 0.02, z + oz - 1],
        yaw: 0,
        u: 1,
        size: 1,
        owner: -1,
      },
    });
  });
  const people: number[] = [];
  MAT_OFFSETS.forEach(([ox, oz], i) => {
    const look = i % 3;
    const id = spawnCast(w, `seat${i}`, x + ox, FLAT_Y + 0.05, z + oz, Math.PI, { body: guestBody(look, SEAT_COLORS[i]), build: guestBuild(look), speed: 2.4 }); // prettier-ignore
    people.push(id);
  });
  spawnCast(w, 'plumb', x + PLUMB_AT[0], FLAT_Y + 0.05, z + PLUMB_AT[1], 1.35, PEOPLE.plumb);
  spawnCritters(w);
  people.forEach((actor, index) => {
    w.spawn({ seat: { index, kind: 'off', actor } as never, wobble: makeWobble(w, index) });
  });
}

/** Keeps each person on their mat, unless they left. */
function standEveryone(w: GameWorld): void {
  const { x, z } = STATIONS.pavilion;
  MAT_OFFSETS.forEach(([ox, oz], i) => {
    const e = castOf(w, `seat${i}`);
    if (e && !e.cast.hold && e.cast.home[0] !== -999) Object.assign(e.cast, { hold: true, x: x + ox, y: FLAT_Y + 0.05, z: z + oz, yaw: Math.PI }); // prettier-ignore
  });
  const plumb = castOf(w, 'plumb');
  if (plumb)
    Object.assign(plumb.cast, { hold: true, x: x + PLUMB_AT[0], y: FLAT_Y + 0.05, z: z + PLUMB_AT[1], yaw: 1.35 });
}

/** Reads the ghosts' messages: other players' leans, drawn on their mats. They touch nothing else. */
function stepGhosts(w: GameWorld, intents: Intents): void {
  const list = (intents as unknown as Record<string, unknown>)['game:ghosts'];
  const flow = flowOf(w);
  const entity = activityOf(w);
  const myClass = entity ? Number((entity.activity.data as { index?: number }).index ?? 0) : 0;
  const ghosts = w.query('ghost');
  if (Array.isArray(list)) {
    for (const m of list as GhostMessage[]) {
      const g = ghosts.find((e) => e.ghost.id === m.id);
      if (g) Object.assign(g.ghost, { x: m.x, y: m.y, e: m.e, p: m.p, s: m.s, gone: m.gone ?? g.ghost.gone, t: 0 });
    }
  }
  const { x, z } = STATIONS.pavilion;
  for (const g of w.query('ghost')) {
    const ghost: Ghost = g.ghost;
    ghost.t += 1;
    const person = castOf(w, `seat${ghost.id}`);
    if (!person) continue;
    if (ghost.gone) {
      // They walk off politely.
      ghost.goneT += 1;
      const cast = person.cast;
      cast.hold = true;
      cast.pose = '';
      cast.home = [-999, -999];
      cast.z = Math.min(cast.z + 2.2 * w.dt, z + 40);
      cast.yaw = 0;
      continue;
    }
    ghost.active = flow.mode === 'front' || ghost.e === myClass;
    const [ox, oz] = MAT_OFFSETS[ghost.id] ?? [0, 0];
    Object.assign(person.cast, { hold: true, x: x + ox, z: z + oz, y: ghost.active ? FLAT_Y + 0.05 : FLAT_Y - 30, yaw: Math.PI }); // prettier-ignore
    person.cast.leanX = -ghost.x; // they face you, as your own body does
    person.cast.leanY = ghost.y;
    if (ghost.p) {
      person.cast.pose = ghost.p;
      person.cast.poseT = 1;
    } else if (person.cast.pose) person.cast.pose = '';
  }
}

/** The session's actions, called by the page. */
const ROUND_ACTIONS = {
  /** Who is who: `me` plays their own mat, the others are ghosts. */
  'round.join': (w: GameWorld, args: unknown) => {
    const { me, players } = (args ?? {}) as { me: number; players: number[] };
    for (const e of allSeats(w)) e.seat.kind = e.seat.index === me ? 'local' : 'off';
    for (const id of players) {
      if (id === me) continue;
      w.spawn({ ghost: { id, x: 0, y: 0, e: 0, p: '', s: 0, gone: false, goneT: 0, t: 0, actor: castOf(w, `seat${id}`)?.id ?? -1, active: true } }); // prettier-ignore
    }
    flowOf(w).focus = me;
  },
  /** Play begins. */
  'round.go': (w: GameWorld, args: unknown) => {
    const { me } = (args ?? { me: flowOf(w).focus }) as { me?: number };
    const mine = me ?? Math.max(0, flowOf(w).focus);
    const seats = [0, 1, 2, 3].map((i) => (i === mine ? ({ kind: 'local' } as const) : ({ kind: 'off' } as const)));
    startActivity(w, 'group', { seats });
  },
  /** Someone left: they walk off politely. */
  'round.leave': (w: GameWorld, args: unknown) => {
    const { id } = (args ?? {}) as { id: number };
    const g = w.query('ghost').find((e) => e.ghost.id === id);
    if (g) g.ghost.gone = true;
    const person = castOf(w, `seat${id}`);
    if (person) person.cast.home = [-999, -999];
  },
  /** A round that plays by itself, for the page's standalone checks. */
  'round.alone': (w: GameWorld) => {
    startActivity(w, 'group', { seats: [{ kind: 'local' }, { kind: 'cpu', skill: 'human', sway: 0.9 }, { kind: 'cpu', skill: 'perfect', sway: 1.1 }, { kind: 'cpu', skill: 'perfect', sway: 0.6 }] }); // prettier-ignore
  },
};

/** The session's scene. */
export const round = defineScene<GameComponents>('game:round', {
  description: 'A hub session: three classes on four mats in the pavilion, ghosts on the neighbouring mats.',
  physics: true,
  terrain: 'terrain:round',
  setup(w) {
    setupRound(w);
    w.systems.add('game.hold', holdCast, { phase: 'readback' });
    w.systems.add('game.scrub', scrubCast, { phase: 'ai' });
    w.systems.add('game.critters', stepCritters, { phase: 'ai' });
  },
  step(w, intents) {
    standEveryone(w);
    stepGhosts(w, intents);
    stepActivity(w, intents);
  },
  actions: ROUND_ACTIONS,
});

export default round;
