/**
 * @file The app's screen builders that read the save: the Programme (today's list), the Noticeboard (a page of activity cards), the
 * result handler (stamps the save, the Wobble Age remark, the pebble cairn) and the evening screen. Page-side.
 * @example
 * openProgramme(env); // shows today's cards
 */
import { ACTIVITY_INFO, DAYS } from '../scenes/data/days';
import { ageOf } from '../scenes/events/morning';
import type { Env } from './appenv';
import { lineText } from './lines';
import { SCREENS } from './screens';

export function openProgramme(env: Env): void {
  const save = env.save();
  const open = env.open;
  const ctx = env.ctx;
  const day = DAYS[Math.min(save.day, 5) - 1];
  const rows = day.acts.map((a) => ({
    label: `${save.done.includes(`${save.day}:${a}`) ? '✓ ' : ''}${a === 'board' ? 'Find the Noticeboard' : ACTIVITY_INFO[a].title}`,
    id: a,
  }));
  rows.push({ label: 'Close', id: 'close' });
  open(SCREENS.programme(ctx, day.n, day.title, rows.slice(0, 6), 'Pick one. "Go" takes you there.'));
}

export function openBoard(env: Env): void {
  const save = env.save();
  const open = env.open;
  const ctx = env.ctx;
  const st = env.st;
  const all = Object.keys(ACTIVITY_INFO).filter((a) => a !== 'tilt' || save.day >= 5);
  const pages = Math.ceil(all.length / 5);
  st.page = ((st.page % pages) + pages) % pages;
  const slice = all.slice(st.page * 5, st.page * 5 + 5);
  const rows = slice.map((a) => ({
    label: `${ACTIVITY_INFO[a].title}${save.bests[a] ? ` · best ${save.bests[a]}` : ''}`,
    id: a,
    disabled: save.day < 2 && !save.done.some((d) => d.endsWith(a)) && a !== 'morning' && a !== 'poseA' && a !== 'pond',
  }));
  rows.push({ label: 'Close', id: 'close', disabled: false });
  open(SCREENS.board(ctx, st.page, pages, rows, 'Every activity you have met, to play again.'));
}

export function onResult(env: Env, r: { id: string; score: number; rank: string; pebbles: number }): void {
  const save = env.save();
  const sfx = env.sfx;
  const speak = env.speak;
  const act = env.act;
  const persist = env.persist;
  const open = env.open;
  const ctx = env.ctx;
  const st = env.st;
  const key = `${save.day}:${r.id}`;
  if (!save.done.includes(key)) save.done.push(key);
  save.pebbles += r.pebbles;
  save.bests[r.id] = Math.max(save.bests[r.id] ?? 0, r.score);
  if (r.id === 'morning') {
    const age = ageOf(r.score / 1000, 1.3);
    save.ages.push(age);
    save.checkDay = save.day;
    const prev = save.ages[save.ages.length - 2];
    speak(
      'tare',
      prev === undefined
        ? 'tare.age.first'
        : age < prev
          ? 'tare.age.better'
          : age > prev
            ? 'tare.age.worse'
            : 'tare.age.same',
      { age, prev: prev ?? 0, diff: Math.abs(age - (prev ?? age)) },
    );
  }
  persist();
  act('game.cairn', { count: save.pebbles, age: save.ages[save.ages.length - 1] ?? 18 });
  sfx('stamp');
  open(SCREENS.results(ctx, ACTIVITY_INFO[r.id]?.title ?? r.id, r.rank, r.score, r.pebbles, st.said++));
}

export function evening(env: Env): void {
  const save = env.save();
  const open = env.open;
  const ctx = env.ctx;
  const rem = lineText('evening.' + (1 + ((save.day - 1) % 5)), {}, 0);
  open(SCREENS.evening(ctx, save.day, save.ages, rem));
}
