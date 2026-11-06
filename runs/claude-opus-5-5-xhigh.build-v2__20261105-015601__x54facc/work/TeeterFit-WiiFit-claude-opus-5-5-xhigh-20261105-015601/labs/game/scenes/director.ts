/**
 * @file The director: the attract loop (15 s of each activity, round and round) and `game.auto`'s scripted playthrough
 * of the whole game, which the tests use as a softlock finder.
 *
 * Game code, sim-side.
 *
 * @example
 * // stepDirector(w); // first thing, each step
 */
import type { GameWorld } from './components';
import { todaysNext } from './data/days';
import { activityOf, endActivity, flowOf, startActivity } from './flow';
import { leaveResults } from './ending';
import { releaseAll } from './events/kit';
import { sleepNow } from './days';
import { activitySeats } from './use';
import { startFinale, startGroup } from './start';
import { ACTIVITIES } from './events/index';

/** The attract roster, in order: each shows for this many seconds. */
export const ATTRACT: readonly string[] = ['jog', 'poseA', 'pond', 'line', 'paddle', 'garden', 'step', 'hoop', 'plunge', 'tilt']; // prettier-ignore
/** Seconds an attract act lasts. */
export const ATTRACT_SECONDS = 15;
/** Steps results stay when nobody presses anything, in auto mode. */
const AUTO_RESULTS = 90;

/** One step of the attract loop. */
function stepAttract(w: GameWorld): void {
  const flow = flowOf(w);
  flow.actTick += 1;
  const known = ATTRACT.filter((id) => ACTIVITIES[id]);
  const running = activityOf(w);
  if (!running || flow.mode !== 'event' || flow.actTick >= ATTRACT_SECONDS * w.hz) {
    if (running) endActivity(w);
    const id = known[flow.roster % known.length];
    flow.roster += 1;
    flow.actTick = 0;
    startActivity(w, id, { ...activitySeats(id), data: id === 'tilt' ? { attract: true } : {} });
  }
}

/** One step of the playthrough: starts what the Programme offers; leaves results; sleeps. */
function stepAuto(w: GameWorld): void {
  const flow = flowOf(w);
  flow.actTick = flow.mode === 'event' ? 0 : flow.actTick + 1;
  if (flow.mode === 'results') {
    if (flow.actTick >= AUTO_RESULTS) {
      flow.actTick = 0;
      leaveResults(w);
    }
    return;
  }
  if (flow.mode === 'event') return;
  if (flow.credits) {
    flow.cutTick += 1;
    if (flow.cutTick > 600) {
      flow.credits = false;
      flow.cutTick = 0;
      releaseAll({ w });
    }
    return;
  }
  if (flow.mode !== 'roam') return;
  if (flow.day > 5) return;
  const next = todaysNext(flow);
  flow.actTick = 0;
  if (next === null) {
    if (flow.day < 5) sleepNow(w);
    return;
  }
  if (next === 'noticeboard') {
    flow.done.push('noticeboard');
    return;
  }
  if (next === 'group') startGroup(w);
  else if (next === 'tilt') startFinale(w);
  else if (ACTIVITIES[next]) startActivity(w, next, activitySeats(next));
  else flow.done.push(next);
}

/** One step of whichever the director is doing. */
export function stepDirector(w: GameWorld): void {
  const flow = flowOf(w);
  if (flow.attract) stepAttract(w);
  else if (w.settings.get<boolean>('game.auto')) stepAuto(w);
}
