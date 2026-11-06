/** @file A short daily programme, fast travel, and paged free practice cards. */
import { ACTIVITIES, DAYS, rank } from '../../scenes/data/days';
import { EVENING } from '../lines/cast';
import type { ScreenApp } from '../context';
export function programme(a: ScreenApp): void {
  const f = a.flow ?? a.save,
    day = DAYS[Math.min(4, f.day - 1)],
    ready = day.events.every((id) => f.done.includes(id));
  const entries = day.events.map((id) => ACTIVITIES.find((item) => item.id === id)!);
  if (f.complete && f.endingSeen) {
    a.ui.menu(
      'programme',
      `DAY ${f.day} · AT YOUR OWN PACE`,
      'Stay a little longer.',
      'Every day has a place to begin. The ferry does not return.',
      [
        {
          id: 'check',
          label: 'A fresh Morning Check',
          detail: 'A small daily ritual.',
          action: () => a.start('check'),
        },
        { id: 'board', label: 'Free practice', detail: 'Every class, every course.', action: () => a.show('board') },
        { id: 'group', label: 'Group Class', detail: 'There is room on the next mat.', action: () => a.start('group') },
        { id: 'outfit', label: 'Your retreat outfit', action: () => a.show('arrival') },
        { id: 'sleep', label: 'Sleep at your hut', action: () => a.show('evening') },
        { id: 'back', label: 'Back to the island', action: a.resume },
      ],
      { wide: true },
    );
    a.ui.back = a.resume;
    return;
  }
  a.ui.menu(
    'programme',
    `DAY ${Math.min(5, f.day)} / FIVE`,
    day.title,
    day.line,
    [
      ...entries.map((event) => ({
        id: event.id,
        label: event.title,
        detail: f.done.includes(event.id) ? '✓ A little more accomplished. Go again.' : event.sub,
        value: f.done.includes(event.id) ? 'STAMPED' : `${Math.ceil(event.seconds / 60)} MIN`,
        action: () => a.start(event.id),
        adjust: () => {
          if (f.pebbles >= 10) {
            a.run('game.expert');
            a.show('board', 0);
          }
        },
      })),
      {
        id: ready ? 'sleep' : 'board',
        label: ready ? (f.day === 5 ? 'Stay a little longer' : 'Sleep at your hut') : 'The Noticeboard',
        detail: ready ? EVENING[Math.min(4, f.day - 1)] : 'Every activity, at your own pace.',
        action: () => {
          if (ready) {
            a.show('evening');
          } else a.show('board');
        },
      },
      { id: 'back', label: 'Back to the island', detail: 'There is no hurry. There are pebbles.', action: a.resume },
    ],
    {
      wide: true,
      extra: `<div class="programme-meta"><span>${f.pebbles} pebbles in your cairn</span><span>${f.finds.length} / 20 found</span><span>${f.pebbles >= 10 ? 'Expert classes available' : `${10 - f.pebbles} pebbles to Expert classes`}</span></div>`,
    },
  );
  a.ui.back = a.resume;
}
export function noticeboard(a: ScreenApp, page: number): void {
  const f = a.flow?.mode === 'front' ? a.save : (a.flow ?? a.save);
  const met = new Set(DAYS.slice(0, Math.min(5, f.day)).flatMap((d) => d.events));
  met.add('group');
  const available = f.complete ? ACTIVITIES : ACTIVITIES.filter((event) => met.has(event.id));
  const pages = Math.ceil(available.length / 5);
  page = ((page % pages) + pages) % pages;
  const list = available.slice(page * 5, page * 5 + 5);
  a.ui.menu(
    'board',
    'THE NOTICEBOARD',
    'A little of everything.',
    'Every programme can be revisited. At 10 pebbles, left / right selects Expert.',
    [
      ...list.map((event) => ({
        id: event.id,
        label: event.title,
        detail: (a.flow?.expert ? 'Expert · ' : '') + event.sub,
        value:
          f.bests[event.id] === undefined
            ? event.icon
            : rank(event.id === 'group' ? f.bests[event.id] / 3 : f.bests[event.id]),
        action: () => a.start(event.id),
        adjust: () => {
          if (f.pebbles >= 10) {
            a.run('game.expert');
            a.show('board', page);
          }
        },
      })),
      {
        id: 'next',
        label: `Next page · ${page + 1} / ${pages}`,
        detail: 'Q / E or shoulder buttons also turn the page.',
        action: () => a.show('board', (page + 1) % pages),
      },
    ],
    { wide: true },
  );
  a.ui.back = () => a.show(a.flow?.mode === 'front' ? 'title' : 'programme');
}
