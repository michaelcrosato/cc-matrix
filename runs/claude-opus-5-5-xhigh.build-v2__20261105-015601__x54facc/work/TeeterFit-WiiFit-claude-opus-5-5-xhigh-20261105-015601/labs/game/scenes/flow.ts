/**
 * @file The flow of the game on one world (the one-scene rule, PLAN.md section 14): starting an activity, stepping it,
 * its results, leaving it, and the days. It owns the `activity` entity and the seats' use.
 *
 * Game code, sim-side.
 *
 * @example
 * // startActivity(w, 'pond'); // from an action or the director
 */
import { held, pressed, terrainHeight, type Intents, type Terrain } from '../../../engine/sim-api';
import type { ActivityData, Flow, GameWorld, IslandData, Seat, Wobble } from './components';
import { mash, playerOf, type Player } from './bot/players';
import { STATIONS, type Station } from './data/stations';
import { ACTIVITIES } from './events/index';
import { clearSpawned, releaseAll, say } from './events/kit';
import type { Activity, Ctx, SeatEntity } from './events/types';
import { clampScore, pebblesOf, rankOf } from './scoring';
import { resetWobble, stepWobble } from './wobble';

/** What differs between the island and the round scene. */
export interface FlowHost {
  round: boolean;
  terrain: Terrain | null;
  floorY: number;
  /** A station to use whichever one the activity names (the round: the pavilion). */
  station?: string;
}

/** The world's host, per world: held in module state keyed by the world, never read for play beyond its constants. */
const HOSTS = new WeakMap<object, FlowHost>();

/** Remembers what kind of world this is. */
export function setHost(w: GameWorld, host: FlowHost): void {
  HOSTS.set(w, host);
}

/** The world's host. */
export const hostOf = (w: GameWorld): FlowHost => HOSTS.get(w) ?? { round: false, terrain: null, floorY: 0 };

/** The ground at a place, in this world. */
export function groundAt(w: GameWorld, x: number, z: number): number {
  const host = hostOf(w);
  if (!host.terrain) return host.floorY;
  return terrainHeight(host.terrain, x, z) ?? host.floorY;
}

/** The world's flow. */
export const flowOf = (w: GameWorld): Flow => w.query('flow')[0].flow;

/** The world's island state. */
export const islandOf = (w: GameWorld): IslandData => w.query('island')[0].island;

/** The running activity's entity, if any. */
export function activityOf(w: GameWorld): { id: number; activity: ActivityData } | undefined {
  const entity = w.query('activity')[0];
  return entity && entity.activity.id !== '' ? entity : undefined;
}

/** Every seat with its body, in seat order. */
export function allSeats(w: GameWorld): SeatEntity[] {
  return w.query('seat', 'wobble') as unknown as SeatEntity[];
}

/** The seats in play. */
export const liveSeats = (w: GameWorld): SeatEntity[] => allSeats(w).filter((e) => e.seat.kind !== 'off');

/** An activity's context for this world. */
export function contextOf(w: GameWorld, mod: Activity, a: ActivityData): Ctx {
  const host = hostOf(w);
  const station: Station = STATIONS[host.station ?? mod.station] ?? STATIONS.plaza;
  return {
    w,
    a,
    flow: flowOf(w),
    seats: liveSeats(w),
    station,
    ground: (x, z) => groundAt(w, x, z),
    round: host.round,
    hud: a.hud,
  };
}

/** How a seat takes part, for an activity's start. */
export interface SeatUse {
  kind: Seat['kind'];
  skill?: string;
  sway?: number;
}

/** Starts an activity: the seats, its setup, the flow. Any activity running is ended first. */
export function startActivity(
  w: GameWorld,
  id: string,
  options: { short?: boolean; seats?: readonly SeatUse[]; data?: Record<string, unknown> } = {},
): void {
  const mod = ACTIVITIES[id];
  if (!mod) throw new Error(`no activity "${id}"`);
  endActivity(w);
  const flow = flowOf(w);
  const uses = options.seats ?? [{ kind: 'local' as const }];
  for (const e of allSeats(w)) {
    const use = uses[e.seat.index];
    e.seat.kind = use?.kind ?? 'off';
    e.seat.skill = use?.skill ?? '';
    e.seat.sway = use?.sway ?? 1;
    Object.assign(e.seat, {
      lx: 0,
      ly: 0,
      fl: 0,
      fr: 0,
      act: false,
      actP: false,
      pfl: false,
      pfr: false,
      hist: [],
      mem: {},
    });
    resetWobble(e.wobble);
    e.wobble.on = e.seat.kind !== 'off';
  }
  const a = w.query('activity')[0].activity;
  Object.assign(a, { id, short: options.short ?? false, phase: '', t: 0, pt: 0, done: false, score: 0, scores: [], data: options.data ?? {}, hud: {}, spawned: [], actors: [] }); // prettier-ignore
  flow.mode = 'event';
  flow.event = id;
  flow.focus = -1;
  if (!flow.seen.includes(id)) flow.seen.push(id);
  mod.setup(contextOf(w, mod, a));
  w.emit('activity', { id, start: true });
  if (!flow.attract) w.emit('fade', {});
}

/** Takes the running activity away: teardown, and its entity. */
export function endActivity(w: GameWorld): void {
  const entity = activityOf(w);
  if (entity) {
    const a = entity.activity;
    const mod = ACTIVITIES[a.id];
    const c = contextOf(w, mod, a);
    mod.teardown?.(c);
    clearSpawned(c);
    Object.assign(a, { id: '', phase: '', t: 0, pt: 0, done: false, data: {}, hud: {} });
    releaseAll({ w });
  }
  for (const e of allSeats(w)) {
    e.seat.kind = e.seat.index === 0 ? 'local' : 'off';
    e.wobble.on = false;
  }
}

/** Reads the page's intents into the seats: seat 0 from the action map, the others from `game:seats`. */
export function readSeats(w: GameWorld, intents: Intents, mod: Activity | null, a: ActivityData | null): void {
  const flow = flowOf(w);
  const seats = allSeats(w);
  const auto = w.settings.get<boolean>('game.auto') || w.settings.get<boolean>('game.botSeat') || flow.attract;
  const local = intents as unknown as Record<string, unknown>;
  const num = (key: string): number => {
    const v = local[key];
    return typeof v === 'number' ? v : 0;
  };
  const group = local['game:seats'];
  if (typeof intents.cam === 'number') flow.camYaw = intents.cam;
  const c = mod && a ? contextOf(w, mod, a) : null;
  for (const e of seats) {
    const { seat } = e;
    const before = { l: seat.fl >= 0.5, r: seat.fr >= 0.5, a: seat.act };
    seat.mx = seat.my = seat.moved = 0;
    seat.pointer = false;
    if (seat.kind === 'off') continue;
    const useBot = seat.kind === 'cpu' || (seat.kind === 'local' && auto);
    if (useBot && c && mod) {
      const name = seat.kind === 'cpu' ? seat.skill || 'human' : flow.attract ? 'perfect' : w.settings.get<string>('game.skill'); // prettier-ignore
      const player: Player = playerOf(name);
      if (name === 'mash') mash(w, seat);
      else mod.bot(c, e, player);
    } else if (seat.kind === 'local' && !Array.isArray(group)) {
      seat.lx = num('game:r') - num('game:l');
      seat.ly = num('game:f') - num('game:b');
      seat.fl = num('game:fl');
      seat.fr = num('game:fr');
      seat.gentle = held(intents, 'gentle');
      seat.act = held(intents, 'act');
      const mouse = local['game:mouse'];
      if (Array.isArray(mouse)) {
        seat.mx = Number(mouse[0]) || 0;
        seat.my = Number(mouse[1]) || 0;
        seat.moved = Math.hypot(seat.mx, seat.my);
      }
      const point = local['game:pointer'];
      if (Array.isArray(point) && point[2]) {
        seat.px = Number(point[0]) || 0;
        seat.py = Number(point[1]) || 0;
        seat.pointer = true;
      }
      if (pressed(intents, 'act')) before.a = false;
    } else if (Array.isArray(group)) {
      const at = seat.index * 5;
      seat.lx = Number(group[at]) || 0;
      seat.ly = Number(group[at + 1]) || 0;
      seat.fl = Number(group[at + 2]) || 0;
      seat.fr = Number(group[at + 3]) || 0;
      seat.act = Boolean(group[at + 4]);
    } else {
      Object.assign(seat, { lx: 0, ly: 0, fl: 0, fr: 0, act: false });
    }
    seat.pfl = seat.fl >= 0.5 && !before.l;
    seat.pfr = seat.fr >= 0.5 && !before.r;
    seat.actP = seat.act && !before.a;
  }
}

/** One step of the running activity: seats read, bodies stepped, its rules, its end. */
export function stepActivity(w: GameWorld, intents: Intents): void {
  const entity = activityOf(w);
  const flow = flowOf(w);
  if (!entity) {
    readSeats(w, intents, null, null);
    return;
  }
  const a = entity.activity;
  if (flow.mode !== 'event') {
    readSeats(w, intents, null, null);
    return;
  }
  const mod = ACTIVITIES[a.id];
  readSeats(w, intents, mod, a);
  a.t += 1;
  a.pt += 1;
  if (mod.wobble) for (const e of liveSeats(w)) if (e.wobble.on) stepWobble(w, e.seat, e.wobble as Wobble);
  const c = contextOf(w, mod, a);
  mod.step(c);
  if (a.done) finishActivity(w, entity.activity);
}

/** The score, the rank, the pebbles; flow to results. */
export function finishActivity(w: GameWorld, a: ActivityData): void {
  const mod = ACTIVITIES[a.id];
  const c = contextOf(w, mod, a);
  const flow = flowOf(w);
  a.score = clampScore(typeof a.data.forced === 'number' ? a.data.forced : mod.score(c, c.seats[0]?.seat.index ?? 0));
  a.scores = c.seats.map((e) => clampScore(mod.score(c, e.seat.index)));
  const mult = w.settings.get<number>('game.pebbles.mult');
  const pebbles = Math.round(pebblesOf(a.score) * mult);
  const rank = rankOf(a.score);
  const age = typeof a.data.age === 'number' ? a.data.age : undefined;
  const ageBefore = flow.ages.length > 0 ? flow.ages[flow.ages.length - 1] : undefined;
  if (age !== undefined && !flow.attract) flow.ages.push(age);
  flow.last = { event: a.id, score: a.score, rank, pebbles, ...(age !== undefined ? { age } : {}), ...(ageBefore !== undefined ? { ageBefore } : {}) }; // prettier-ignore
  if (!flow.attract) {
    flow.pebbles += pebbles;
    if (!flow.done.includes(a.id)) flow.done.push(a.id);
    flow.bests[a.id] = Math.max(flow.bests[a.id] ?? 0, a.score);
  }
  if (rank === 'Unsettling') {
    const cast = c.seats[0] ? w.get(c.seats[0].seat.actor)?.cast : undefined;
    if (cast) w.emit('confetti', { x: cast.x, y: cast.y + 2.2, z: cast.z });
  }
  flow.mode = 'results';
  w.emit('results', { event: a.id, score: a.score, rank, pebbles, scores: a.scores });
  say({ w }, a.score >= 550 ? 'plumb' : 'tare', `results.${rank.toLowerCase()}`);
}

/** Leaves the results (or an activity, from the pause menu) for the island. */
export function leaveActivity(w: GameWorld): void {
  endActivity(w);
  const flow = flowOf(w);
  flow.mode = 'roam';
  w.emit('activity', { id: flow.event, start: false });
}
