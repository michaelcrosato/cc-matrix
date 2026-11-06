/**
 * @file The five days, and the only programme the director walks. Evening sits between days.
 * The last morning comes after the fifth evening. Then the credits. The ferry does not return.
 */

/** One residency day and the activities on it, in order. */
export interface DayPlan {
  day: number;
  events: readonly string[];
}

/** What a new guest does. Free play later offers the same ids from the noticeboard. */
export const DAYS: readonly DayPlan[] = [
  { day: 1, events: ['morning', 'pose-a', 'pond'] },
  { day: 2, events: ['morning', 'pose-b', 'garden'] },
  { day: 3, events: ['morning', 'paddle', 'line'] },
  { day: 4, events: ['morning', 'pose-c'] },
  { day: 5, events: ['morning', 'group', 'tilt'] },
];

/** One stop on the programme, including evenings, the last morning and the credits. */
export interface ProgrammeItem {
  day: number;
  event: string;
}

/** The whole residency in order. Tests and the director both read this. There is no second copy. */
export function programme(): ProgrammeItem[] {
  const out: ProgrammeItem[] = [];
  for (const day of DAYS) {
    for (const event of day.events) out.push({ day: day.day, event });
    out.push({ day: day.day, event: 'evening' });
  }
  out.push({ day: 5, event: 'morning' });
  out.push({ day: 5, event: 'credits' });
  return out;
}
