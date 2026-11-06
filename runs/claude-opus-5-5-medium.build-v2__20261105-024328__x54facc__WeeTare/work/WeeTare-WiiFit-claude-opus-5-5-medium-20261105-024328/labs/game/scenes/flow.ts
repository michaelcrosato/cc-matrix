/**
 * @file The game's state machine: starting and ending activities, results, the day, Group Class's list of classes, the
 * scene actions every menu pick goes through, and the input each seat gets each step. Everything here is sim state, so a
 * replay holds every pick. The page sends picks with `inspector.actions.run` and reads `flow` back.
 */
import { pressed, type Intents } from '../../../engine/sim-api';
import { clearBody, setLean } from '../cast/body';
import { GUEST_SPEED, spawnPerson } from '../cast/people';
import { applyOrder, SKILLS } from './bot/players';
import { castOf } from './cast-ref';
import { ageOf, DAYS, rankOf } from './data/days';
import { STATIONS, type StationId } from './data/stations';
import { ACTIVITIES } from './events';
import { clearOwned, dropActor, standAt } from './events/kit';
import { gameNumber } from './settings';
import { cue, flowOf, islandOf, say, seatsOf, type EvState, type Flow, type SeatE, type W } from './types';
import { resetWobble } from './wobble';

/** Where you are left standing when an activity at each station ends. */
const LANDINGS: Readonly<Record<StationId, readonly [number, number]>> = {
  pier: [0, 84], plaza: [0, 40], pavilion: [-52, 28], pond: [-60, -8], annex: [52, 32], huts: [58, 46],
  lagoon: [-36, 66], terrace: [30, -41], cliff: [0, -80], hoopBeach: [58, 76], lighthouse: [78, -54], east: [70, 8], stone: [0, 6],
}; // prettier-ignore

/** Options for starting an activity. */
export interface StartOptions {
  short?: boolean;
  expert?: boolean;
  final?: boolean;
  only?: string;
  seats?: number[];
}

/** Starts activity `id`, ending any that runs. */
export function startEvent(w: W, id: string, options: StartOptions = {}): void {
  const flow = flowOf(w);
  if (flow.ev) endWithoutResult(w);
  const activity = ACTIVITIES[id];
  if (!activity) return;
  const multi = activity.multi && !options.seats;
  const seats = options.seats
    ? [...options.seats]
    : multi
      ? seatsOf(w)
          .filter((e) => e.seat.kind !== 'none')
          .map((e) => e.seat.index)
      : [0];
  // Seats not in this activity stand down; CPU guests hold the other mats.
  const ev: EvState = {
    id, phase: 'go', t: 0, total: 0, done: false, score: 0, short: !!options.short, expert: !!options.expert,
    owned: [], s: [], d: { final: !!options.final, only: options.only ?? '' }, seats,
  }; // prettier-ignore
  flow.ev = ev;
  flow.mode = 'event';
  for (const e of seatsOf(w)) {
    e.seat.extra = options.expert ? 0.35 : e.seat.kind === 'cpu' ? 0.15 + e.seat.index * 0.08 : 0;
    Object.assign(e.seat, { hx: [], hy: [], bot: {}, score: 0 });
    resetWobble(e.wobble);
  }
  activity.setup(w, ev);
  w.emit('eventStart', { id } as never);
}

/** Tears an activity down: what it spawned goes, the bodies stand down. */
function endWithoutResult(w: W): void {
  const flow = flowOf(w);
  const ev = flow.ev;
  if (!ev) return;
  ACTIVITIES[ev.id]?.teardown?.(w, ev);
  clearOwned(w, ev);
  const cast = castOf(w);
  for (const e of seatsOf(w)) {
    if (e.seat.actor >= 0 && w.get(e.seat.actor)) {
      clearBody(w, e.seat.actor);
      setLean(w, e.seat.actor, 0, 0);
    }
  }
  if (cast.plumb >= 0) clearBody(w, cast.plumb);
  if (cast.gerald >= 0) clearBody(w, cast.gerald);
  const station = ACTIVITIES[ev.id]?.station ?? 'plaza';
  const guest = cast.guest;
  if (guest >= 0 && !w.query('roundScene').length) {
    const [x, z] = LANDINGS[station];
    standAt(w, guest, x, z, 0);
  }
  flow.ev = null;
  homeAgain(w);
}

/** Records a finished activity and moves on. */
function finishEvent(w: W): void {
  const flow = flowOf(w);
  const ev = flow.ev as EvState;
  const { id, score } = ev;
  const final = !!ev.d.final;
  const seatScores = seatsOf(w).map((e) => e.seat.score);
  endWithoutResult(w);
  if (flow.group && flow.group.at < flow.group.list.length) {
    flow.group.scores = flow.group.scores.map((sum, i) => sum + (seatScores[i] ?? 0));
    flow.group.at += 1;
    w.emit('classDone', { at: flow.group.at, score: seatScores } as never);
    if (flow.group.at < flow.group.list.length) {
      startEvent(w, flow.group.list[flow.group.at], { short: true, seats: flow.group.seats });
      return;
    }
    const scores = flow.group.scores;
    flow.bests.group = Math.max(flow.bests.group ?? 0, scores[flow.group.seats[0]] / 3);
    recordResult(w, 'group', Math.round(scores[flow.group.seats[0]] / 3));
    return;
  }
  if (id === 'tilt') {
    flow.tiltScore = score;
    markDone(flow, 'tilt');
    startEvent(w, 'check', { final: true });
    return;
  }
  recordResult(w, id, score, final);
}

function markDone(flow: Flow, id: string): void {
  if (!flow.done.includes(id)) flow.done.push(id);
}

/** Puts the result in `flow.last`, pays pebbles, opens the results. */
function recordResult(w: W, id: string, score: number, final = false): void {
  const flow = flowOf(w);
  const rank = rankOf(score);
  const mult = gameNumber(w, 'game.pebbles.mult');
  const pebbles = flow.auto ? 0 : Math.max(0, Math.round(rank.pebbles * mult));
  let age = 0;
  if (id === 'check') {
    age = ageOf(score / 1000, gameNumber(w, 'game.age.k'));
    flow.ages.push(age);
    if (flow.ages.length > 7) flow.ages.shift();
  }
  flow.pebbles += pebbles;
  flow.bests[id] = Math.max(flow.bests[id] ?? 0, score);
  flow.last = { id, score, rank: rank.name, pebbles, age };
  markDone(flow, id);
  flow.mode = final ? 'credits' : 'results';
  w.emit('results', { id, score, rank: rank.name, pebbles, age, final } as never);
  cue(w, 'stampJingle');
}

/** Starts Group Class: three short classes, dealt, on every occupied seat. */
export function startGroup(w: W, seats?: number[]): void {
  const flow = flowOf(w);
  const middle = ['heron', 'hoopS', 'stepS'][w.rng('deal').int(0, 2)];
  const list = ['ring', middle, 'pondS'];
  const who =
    seats ??
    seatsOf(w)
      .filter((e) => e.seat.kind !== 'none')
      .map((e) => e.seat.index);
  flow.group = { list, at: 0, scores: [0, 0, 0, 0], seats: who };
  startEvent(w, list[0], { short: true, seats: who });
}

/** The next thing today, or null when today is finished. */
export function nextItem(flow: Flow): string | null {
  const list = DAYS[flow.day - 1] ?? [];
  return list.find((id) => !flow.done.includes(id)) ?? null;
}

/** Sets who sits where outside a session: seat 0 is the guest; the rest are CPU guests in classes. */
function defaultSeats(w: W): void {
  const cast = castOf(w);
  const others = [cast.gerald, cast.bex, cast.nan];
  for (const e of seatsOf(w)) {
    if (e.seat.index === 0) Object.assign(e.seat, { kind: 'human', actor: cast.guest });
    else Object.assign(e.seat, { kind: 'cpu', actor: others[e.seat.index - 1] });
  }
}

/** Stands a new guest in the old one's place: a body and build are set when an actor is made. */
function dress(w: W, body: string, build: string): void {
  const cast = castOf(w);
  const old = w.get(cast.guest) as unknown as
    { actor: { x: number; y: number; z: number }; puppet?: { body: string } } | undefined;
  if (!old || old.puppet?.body === body) return;
  const at: [number, number, number] = [old.actor.x, old.actor.y + 0.05, old.actor.z];
  dropActor(w, cast.guest);
  cast.guest = spawnPerson(w, { at, body, build, speed: GUEST_SPEED, yaw: Math.PI });
  for (const e of seatsOf(w)) if (e.seat.index === 0) e.seat.actor = cast.guest;
}

/** Where the others go back to after a class: Gerald is already at your next thing, having finished. */
function homeAgain(w: W): void {
  const flow = flowOf(w);
  const cast = castOf(w);
  if (cast.tare < 0 || w.query('roundScene').length) return;
  standAt(w, cast.plumb, -52, 12, 0);
  standAt(w, cast.bex, 15, 24, -0.6);
  standAt(w, cast.nan, -8, 30, 1.8);
  const next = nextItem(flow);
  const id = next === 'group' ? 'poseA' : next;
  const station = (id && ACTIVITIES[id] && STATIONS[ACTIVITIES[id].station]) || STATIONS.plaza;
  const [x, z] = LANDINGS[Object.entries(STATIONS).find(([, s]) => s === station)?.[0] as StationId];
  standAt(w, cast.gerald, x + 3.2, z + 1.5, 0.8);
}

/** The morning: the day turns, the tilt grows a little. */
export function nextDay(w: W): void {
  const flow = flowOf(w);
  flow.day += 1;
  flow.done = [];
  flow.talk = {};
  islandOf(w).tilt = 0.4 + 0.5 * (flow.day - 1);
  flow.mode = 'roam';
  w.emit('morning', { day: flow.day } as never);
}

/** Reads the page's input for a seat from the step's intents. */
function readHuman(w: W, intents: Intents, e: SeatE): void {
  const read = (key: string): number => {
    const value = (intents as unknown as Record<string, unknown>)[key];
    return typeof value === 'number' ? value : 0;
  };
  const seats = (intents as unknown as Record<string, unknown>)['game:seats'] as number[] | undefined;
  const { index } = e.seat;
  if (seats && seats[index]) {
    const o = 4 + index * 5;
    Object.assign(e.seat.input, {
      x: seats[o],
      y: seats[o + 1],
      l: seats[o + 2],
      r: seats[o + 3],
      act: seats[o + 4] > 0.5,
      gentle: false,
    });
  } else if (index === (w.query('roundScene').length ? flowOf(w).meSeat : 0)) {
    const held = (intents.b ?? []) as readonly string[];
    Object.assign(e.seat.input, {
      x: read('game:r') - read('game:l'), y: read('game:f') - read('game:b'), l: read('game:fl'), r: read('game:fr'),
      act: pressed(intents, 'act') || held.includes('act'), gentle: held.includes('gentle'),
    }); // prettier-ignore
    const mouse = (intents as unknown as Record<string, unknown>)['game:mouse'] as number[] | undefined;
    if (mouse) {
      const bot = e.seat.bot;
      if (bot.mx !== undefined) {
        e.wobble.mx += mouse[0] - bot.mx;
        e.wobble.my += mouse[1] - bot.my;
      }
      [bot.mx, bot.my] = [mouse[0], mouse[1]];
    }
    const pointer = (intents as unknown as Record<string, unknown>)['game:pointer'] as number[] | undefined;
    if (pointer && flowOf(w).ev?.id === 'garden') [e.wobble.mx, e.wobble.my] = [pointer[0], pointer[1]];
  } else Object.assign(e.seat.input, { x: 0, y: 0, l: 0, r: 0, act: false, gentle: false });
}

/** Writes this step's input into every seat. */
function readSeats(w: W, intents: Intents): void {
  const flow = flowOf(w);
  const ev = flow.ev;
  for (const e of seatsOf(w)) {
    if (e.seat.kind === 'ghost' || e.seat.kind === 'none') continue;
    const skillName = e.seat.kind === 'cpu' ? 'cpu' : flow.bot;
    if (skillName) {
      const skill = SKILLS[skillName] ?? SKILLS.perfect;
      const running = ev && ev.seats.includes(e.seat.index) ? ACTIVITIES[ev.id] : null;
      applyOrder(w, e, skill, running ? running.bot(w, ev as EvState, e, skill) : {});
    } else readHuman(w, intents, e);
  }
}

/** One step of the running activity. Run the input first, then the rules, then remember the feet. */
export function flowStep(w: W, intents: Intents): void {
  const flow = flowOf(w);
  readSeats(w, intents);
  const ev = flow.ev;
  if (flow.mode === 'event' && ev) {
    ACTIVITIES[ev.id].step(w, ev);
    ev.t += 1;
    ev.total += 1;
    if (ev.done) finishEvent(w);
  }
  for (const e of seatsOf(w)) {
    e.seat.pl = e.seat.input.l;
    e.seat.pr = e.seat.input.r;
    e.seat.pact = e.seat.input.act;
  }
}

/** The scene actions that belong to the flow. */
export const FLOW_ACTIONS = {
  /** Hands the sim the save and walks onto the island. */
  'game.begin': (w: W, args: unknown) => {
    const flow = flowOf(w);
    const { outfit, outfitBuild, ...save } = (args ?? {}) as Partial<Flow> & { outfit?: string; outfitBuild?: string };
    if (flow.ev) endWithoutResult(w);
    Object.assign(flow, { auto: false, bot: '', noTopple: false, drive: false, group: null, ...save, mode: 'roam' });
    defaultSeats(w);
    islandOf(w).tilt = 0.4 + 0.5 * Math.min(4, flow.day - 1);
    const cast = castOf(w);
    if (cast.guest >= 0) {
      const fresh = flow.day === 1 && flow.done.length === 0;
      const at = fresh ? STATIONS.pier : STATIONS.plaza;
      standAt(w, cast.guest, at.x, at.z + (fresh ? -14 : 10), Math.PI);
    }
    if (outfit && outfitBuild) dress(w, outfit, outfitBuild);
    w.emit('begin', { day: flow.day } as never);
  },
  /** Starts an activity by id. */
  'game.start': (w: W, args: unknown) => {
    const { id, expert, only } = args as { id: string; expert?: boolean; only?: string };
    if (id === 'group') return startGroup(w);
    if (id === 'walk') return standAt(w, castOf(w).guest, 12, 38, Math.PI); // the pilot notices you have arrived
    flowOf(w).group = null;
    startEvent(w, id, { expert, only });
  },
  /** Leaves results or an activity, back to the island. */
  'game.leave': (w: W) => {
    const flow = flowOf(w);
    if (flow.ev) endWithoutResult(w);
    flow.group = null;
    flow.mode = 'roam';
    if (nextItem(flow) === null && !flow.free) say(w, 'day.finished', 'tare');
  },
  /** Again: runs the last activity. */
  'game.again': (w: W) => {
    const flow = flowOf(w);
    if (flow.ev) endWithoutResult(w);
    if (flow.last.id === 'group') return startGroup(w);
    startEvent(w, flow.last.id);
  },
  /** Finish now, at a score (dev). */
  'game.finishAt': (w: W, args: unknown) => {
    const flow = flowOf(w);
    if (!flow.ev) return;
    flow.ev.score = (args as { score: number }).score;
    flow.ev.done = true;
    if (flow.group) flow.group.at = flow.group.list.length - 1;
  },
  /** Opens the evening screen. */
  'game.evening': (w: W) => void Object.assign(flowOf(w), { mode: 'evening' }),
  /** Sleep: the next day. Day 5's end is the credits. */
  'game.sleep': (w: W) => {
    const flow = flowOf(w);
    if (flow.ev) endWithoutResult(w);
    nextDay(w);
    const cast = castOf(w);
    if (cast.guest >= 0) standAt(w, cast.guest, 60, 44, 3.14);
  },
  /** After the credits: Free Play. */
  'game.after': (w: W) => {
    const flow = flowOf(w);
    flow.day = 6;
    flow.free = true;
    flow.mode = 'roam';
    flow.done = [];
    w.emit('free', {} as never);
  },
  /** Back to the title. */
  'game.front': (w: W) => {
    const flow = flowOf(w);
    if (flow.ev) endWithoutResult(w);
    Object.assign(flow, { mode: 'front', auto: false, bot: '', drive: false, noTopple: false, group: null });
  },
  /** Jumps to a day (dev). */
  'game.day': (w: W, args: unknown) => {
    const flow = flowOf(w);
    if (flow.ev) endWithoutResult(w);
    Object.assign(flow, { day: (args as { day: number }).day, done: [], mode: 'roam' });
    islandOf(w).tilt = 0.4 + 0.5 * (flow.day - 1);
    w.emit('morning', { day: flow.day } as never);
  },
  /** A bot plays seat 0 ('' a person). */
  'game.bot': (w: W, args: unknown) => void (flowOf(w).bot = (args as { skill: string }).skill),
  /** Cheats and assists. */
  'game.flags': (w: W, args: unknown) => void Object.assign(flowOf(w), args as object),
  /** Group Class seats: who is human, who is CPU, who is empty. */
  'game.seats': (w: W, args: unknown) => {
    const { kinds } = args as { kinds: Flow['mode'][] };
    const cast = castOf(w);
    const others = [cast.guest, cast.gerald, cast.bex, cast.nan];
    for (const e of seatsOf(w)) Object.assign(e.seat, { kind: kinds[e.seat.index], actor: others[e.seat.index] });
  },
};
