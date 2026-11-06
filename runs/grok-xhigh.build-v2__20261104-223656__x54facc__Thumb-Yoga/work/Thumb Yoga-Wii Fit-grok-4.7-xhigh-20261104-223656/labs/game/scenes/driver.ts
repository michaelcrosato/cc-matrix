/**
 * @file The day. Boot puts a seat and a programme on the world. Each step runs the activity, or the thumb
 * that stands in for a player when `game.auto` is director or attract. Menus arrive as scene actions.
 */
import type { Intents, World } from '../../../engine/sim-api';
import './settings';
import { activityById, findActivity } from './catalog';
import { programme, type ProgrammeItem } from './data/days';
import { actOf, flowOf, rowOf } from './events/kit';
import { ageLine, clampScore, pebblesOf, rankOf, wobbleAge } from './score';
import { type Act, type Flow, type Island, emptyAct, part, resetAct, visit } from './state';
import { drawSway, resetBalance } from './wobble';

/** How long a result or an evening stays up when the director is walking. */
const BEAT = 45;

/** Attract shows each slice for about fifteen seconds, then the next. */
const SLICE = 15 * 60;

/** The demo loop. The Great Tilt slice opens on the centre stone. */
const SLICES = ['pose-a', 'pond', 'line', 'paddle', 'garden', 'tilt'];

/** A rank a dev jump can stamp without playing the hold. */
const RANK_SCORE: Readonly<Record<string, number>> = {
  Present: 0,
  Adequate: 300,
  Composed: 550,
  Serene: 750,
  Unsettling: 900,
};

/** The island lean. */
function islandOf(w: World): Island {
  return part<Island>(w, 'island');
}

/** A plain object of action arguments, or an empty one. */
function rec(args: unknown): Record<string, unknown> {
  if (typeof args === 'object' && args !== null && !Array.isArray(args)) return args as Record<string, unknown>;
  return {};
}

/** A finite number argument. */
function numArg(args: Record<string, unknown>, key: string): number | undefined {
  const value = args[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** A string argument. */
function strArg(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key];
  return typeof value === 'string' ? value : undefined;
}

/** Who is driving this step. */
function autoOf(w: World): string {
  return String(w.settings.get('game.auto'));
}

/** Story lean for a residency day. Day 1 is 0.4 degrees, and each day adds half a degree. */
function leanFor(day: number): number {
  return 0.4 + 0.5 * (day - 1);
}

/** Writes the day's lean onto the island. The mesh does not move. */
function applyLean(w: World, day: number): void {
  const island = islandOf(w);
  const base = leanFor(day);
  island.base = base;
  island.tiltX = base;
  island.tiltZ = 0;
}

/** Starts one activity. Setup runs now, so its spawned guests exist before the next step. */
export function startEvent(w: World, id: string): void {
  const flow = flowOf(w);
  const previous = findActivity(flow.event);
  if (previous && flow.mode === 'event') previous.teardown(w);
  const activity = activityById(id);
  const act = actOf(w);
  resetAct(act);
  const row = rowOf(w, 0);
  resetBalance(row.wobble, row.hist);
  flow.mode = 'event';
  flow.event = id;
  visit(flow, id);
  if (id.startsWith('pose')) visit(flow, 'pose');
  activity.setup(w);
}

/** Scores the activity that just ended, then results, the next demo slice, or nothing for attract pebbles. */
function finishEvent(w: World, rank?: string): void {
  const flow = flowOf(w);
  const activity = activityById(flow.event);
  let value = activity.score(w);
  activity.teardown(w);
  if (rank !== undefined && Object.hasOwn(RANK_SCORE, rank)) value = RANK_SCORE[rank] ?? value;
  value = clampScore(value);
  flow.result = value;
  flow.rank = rank !== undefined && Object.hasOwn(RANK_SCORE, rank) ? rank : rankOf(value);
  const auto = autoOf(w);
  if (auto !== 'attract') flow.pebbles += pebblesOf(flow.rank, Number(w.settings.get('game.pebbles.mult')));
  if (flow.event === 'morning') {
    flow.prior = flow.age;
    flow.age = wobbleAge(value / 1000, Number(w.settings.get('game.age.k')));
    flow.line = ageLine(flow.age, flow.prior);
  }
  const act = actOf(w);
  act.done = 0;
  act.wait = 0;
  if (auto === 'attract') {
    const at = SLICES.indexOf(flow.event);
    startEvent(w, SLICES[(at + 1) % SLICES.length] ?? 'pose-a');
    return;
  }
  flow.mode = 'results';
}

/** The next programme row, when the one that just finished is the row the cursor is on. */
function advance(w: World): void {
  const flow = flowOf(w);
  const list = programme();
  const here = list[flow.cursor];
  if (!here || here.event !== flow.event) {
    flow.mode = 'roam';
    flow.event = '';
    return;
  }
  flow.cursor += 1;
  openItem(w, list[flow.cursor]);
}

/** Opens a programme row: an activity, the evening, or the credits. */
function openItem(w: World, item: ProgrammeItem | undefined): void {
  const flow = flowOf(w);
  if (!item) {
    flow.mode = 'roam';
    flow.event = '';
    return;
  }
  flow.day = item.day;
  if (item.event === 'evening') openEvening(w);
  else if (item.event === 'credits') openCredits(w);
  else startEvent(w, item.event);
}

/** The stamp at the end of a day. */
function openEvening(w: World): void {
  const flow = flowOf(w);
  const act = actOf(w);
  resetAct(act);
  flow.mode = 'evening';
  flow.event = 'evening';
  flow.line = 'evening.close';
  visit(flow, 'evening');
}

/** The credits. The ferry does not come back. Free play stays available. */
function openCredits(w: World): void {
  const flow = flowOf(w);
  resetAct(actOf(w));
  flow.mode = 'credits';
  flow.event = 'credits';
  flow.credits = 1;
  flow.line = 'credits.roll';
  visit(flow, 'credits');
}

/** Leaves the evening for the next morning, and leans the island a little more. */
function sleep(w: World): void {
  const flow = flowOf(w);
  const list = programme();
  if (list[flow.cursor]?.event === 'evening') flow.cursor += 1;
  const next = list[flow.cursor];
  if (!next) {
    openCredits(w);
    return;
  }
  flow.day = next.day;
  applyLean(w, next.day);
  if (next.event === 'credits') openCredits(w);
  else if (next.event === 'evening') openEvening(w);
  else startEvent(w, next.event);
}

/** Puts the finale on a named step. Storm is where the activity already starts. */
function jumpTilt(w: World, step: string): void {
  startEvent(w, 'tilt');
  const act: Act = actOf(w);
  const flow: Flow = flowOf(w);
  const name = step.startsWith('tilt:') ? step : `tilt:${step}`;
  if (name === 'tilt:east') {
    act.phase = 1;
    act.a = 1;
    act.left = 0;
    flow.line = 'tilt.east';
    visit(flow, 'tilt:east');
  } else if (name === 'tilt:stone') {
    act.phase = 2;
    act.a = 1;
    act.b = 1;
    act.left = 0;
    flow.line = 'tilt.stone';
    visit(flow, 'tilt:east');
    visit(flow, 'tilt:stone');
  } else if (name === 'tilt:dawn') {
    act.phase = 3;
    act.a = 1;
    act.b = 1;
    act.c = 1;
    act.hz = 1;
    act.left = 0;
    flow.line = 'tilt.dawn';
    visit(flow, 'tilt:east');
    visit(flow, 'tilt:stone');
    visit(flow, 'tilt:dawn');
  }
}

/** Marks pebbles the save already found. The count is restored separately, so this does not add any. */
function applyFinds(w: World, args: Record<string, unknown>): void {
  const raw = args.finds;
  if (!Array.isArray(raw)) return;
  const found = new Set(raw.filter((id) => typeof id === 'string'));
  if (found.size === 0) return;
  for (const row of w.query('mark') as unknown as { mark: { kind: string; text: string; taken: number } }[]) {
    if (row.mark.kind === 'pebble' && found.has(row.mark.text)) row.mark.taken = 1;
  }
}

/** Copies a save the page handed in. The sim never reads the store itself. */
function applySave(w: World, args: Record<string, unknown>): void {
  const flow = flowOf(w);
  const day = numArg(args, 'day');
  const cursor = numArg(args, 'cursor');
  const pebbles = numArg(args, 'pebbles');
  const age = numArg(args, 'age');
  const prior = numArg(args, 'prior');
  const credits = numArg(args, 'credits');
  const result = numArg(args, 'result');
  const seen = strArg(args, 'seen');
  const rank = strArg(args, 'rank');
  if (day !== undefined) flow.day = day;
  if (cursor !== undefined) flow.cursor = cursor;
  if (pebbles !== undefined) flow.pebbles = pebbles;
  if (age !== undefined) flow.age = age;
  if (prior !== undefined) flow.prior = prior;
  if (credits !== undefined) flow.credits = credits;
  if (result !== undefined) flow.result = result;
  if (seen !== undefined) flow.seen = seen;
  if (rank !== undefined) flow.rank = rank;
  applyFinds(w, args);
}

/** One seat, the day, and the island. The first step starts a director or a demo. */
export function boot(w: World): void {
  drawSway(w);
  w.spawn({
    flow: { mode: 'title', day: 1 },
    act: emptyAct() as unknown as Record<string, unknown>,
    island: { tiltX: 0.4, tiltZ: 0, base: 0.4 },
  });
}

/** One step of whatever the day is doing. */
export function frame(w: World, intents: Intents): void {
  const flow = flowOf(w);
  const auto = autoOf(w);
  if (flow.mode === 'title' && auto === 'director') {
    openItem(w, programme()[flow.cursor]);
    return;
  }
  if (flow.mode === 'title' && auto === 'attract') {
    startEvent(w, 'pose-a');
    return;
  }
  if (flow.mode === 'event') {
    const activity = activityById(flow.event);
    let use = intents;
    if (auto === 'director') use = activity.bot(w, 'human');
    else if (auto === 'attract') use = activity.bot(w, 'perfect');
    activity.step(w, use);
    const act = actOf(w);
    if (act.done === 1 || (auto === 'attract' && act.tick >= SLICE)) finishEvent(w);
    return;
  }
  if ((flow.mode === 'results' || flow.mode === 'evening') && (auto === 'director' || auto === 'attract')) {
    const act = actOf(w);
    act.wait += 1;
    if (act.wait >= BEAT) {
      if (flow.mode === 'results') advance(w);
      else sleep(w);
    }
  }
}

/** Menu picks. Each one runs between steps. */
export const retreatActions = {
  'game.begin': (w: World, args: unknown) => {
    const given = rec(args);
    applySave(w, given);
    const flow = flowOf(w);
    applyLean(w, flow.day);
    if (flow.credits) {
      flow.mode = 'roam';
      flow.event = '';
      return;
    }
    openItem(w, programme()[flow.cursor]);
  },
  'game.start': (w: World, args: unknown) => {
    const event = strArg(rec(args), 'event');
    if (!event) return;
    if (event === 'evening') openEvening(w);
    else if (event === 'credits') openCredits(w);
    else startEvent(w, event);
  },
  'game.carry': (w: World) => {
    if (flowOf(w).mode === 'results') advance(w);
  },
  'game.sleep': (w: World) => {
    if (flowOf(w).mode === 'evening') sleep(w);
  },
  'game.leave': (w: World) => {
    const flow = flowOf(w);
    const activity = findActivity(flow.event);
    if (activity && flow.mode === 'event') activity.teardown(w);
    flow.mode = 'roam';
    flow.event = '';
  },
  'game.jump': (w: World, args: unknown) => {
    const given = rec(args);
    const step = strArg(given, 'step');
    const event = strArg(given, 'event');
    const day = numArg(given, 'day');
    if (step) {
      jumpTilt(w, step);
      return;
    }
    if (event) {
      startEvent(w, event);
      return;
    }
    if (day === undefined) return;
    const list = programme();
    const at = list.findIndex((item) => item.day === day);
    if (at < 0) return;
    const flow = flowOf(w);
    flow.cursor = at;
    flow.day = day;
    applyLean(w, day);
    openItem(w, list[at]);
  },
  'game.finish': (w: World, args: unknown) => {
    if (flowOf(w).mode !== 'event') return;
    finishEvent(w, strArg(rec(args), 'rank'));
  },
};
