/**
 * @file The residency (PLAN.md section 5), as data: each day is a Morning Check plus three activities. Adding a day is
 * adding a row. `todaysNext` says what the Programme offers next; null means the day is done and the hut is open.
 *
 * Game code, sim-side data.
 *
 * @example
 * DAYS[0].items[0]; // 'morning'
 */
import type { Flow } from '../components';

/** A day. */
export interface DayDef {
  title: string;
  items: readonly string[];
}

/** The days, Day 1 first. */
export const DAYS: readonly DayDef[] = [
  { title: 'Arrival', items: ['morning', 'poseA', 'pond', 'noticeboard'] },
  { title: 'The Mat', items: ['morning', 'reps', 'garden', 'poseB'] },
  { title: 'The Water', items: ['morning', 'paddle', 'line', 'step'] },
  { title: 'The Sand', items: ['morning', 'hoop', 'plunge', 'jog'] },
  { title: 'The Tilt', items: ['morning', 'group', 'poseC', 'tilt'] },
];

/** Free Play, after Day 5: a fresh Morning Check every day. */
export const AFTER: DayDef = { title: 'After', items: ['morning'] };

/** Today's list. */
export const dayOf = (day: number): DayDef => DAYS[day - 1] ?? AFTER;

/** What the Programme offers next today, or null when the day is done. */
export function todaysNext(flow: Pick<Flow, 'day' | 'done'>): string | null {
  for (const id of dayOf(flow.day).items) if (!flow.done.includes(id)) return id;
  return null;
}

/** Activities on the Noticeboard, in the order the cards appear. */
export const BOARD: readonly string[] = ['morning', 'poseA', 'poseB', 'poseC', 'pond', 'reps', 'garden', 'paddle', 'line', 'step', 'hoop', 'plunge', 'jog', 'group', 'tilt']; // prettier-ignore

/** Who says what at evening, by day. */
export const STORY_TILT = { start: 0.4, perDay: 0.5 };
