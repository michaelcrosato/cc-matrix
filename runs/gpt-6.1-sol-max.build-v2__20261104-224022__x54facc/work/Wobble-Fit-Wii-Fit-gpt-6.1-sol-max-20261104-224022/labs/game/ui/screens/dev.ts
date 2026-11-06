/** @file Live tuning and repeatable scene tools, available only outside sessions. */
import { TUNING } from '../../scenes/settings';
import { rank, ACTIVITIES } from '../../scenes/data/days';
import type { ScreenApp } from '../context';
export function dev(a: ScreenApp, page: number): void {
  if (a.hubActive) return;
  const settings = TUNING.slice(page * 4, page * 4 + 4);
  const groups = Math.ceil(TUNING.length / 4);
  a.ui.menu(
    'dev',
    `LIVE TUNING · ${page + 1} / ${groups}`,
    'Find the wobble.',
    'Changes apply at once. Left / right adjusts the selected value.',
    [
      ...settings.map(([key, defaultValue, min, max]) => {
        const path = `game.${key}`,
          value = Number(a.setting(path) ?? defaultValue),
          step = max >= 10 ? 0.1 : 0.01;
        const change = (v: number) => {
          a.engine?.inspector?.set(path, Math.max(min, Math.min(max, v)));
        };
        return {
          id: path,
          label: key.replaceAll('.', ' / '),
          value: value.toFixed(2),
          action: () => {},
          adjust: (n: number) => {
            change(value + n * step);
            a.show('dev', page);
          },
          slider: { min, max, step, value, change },
        };
      }),
      {
        id: 'next',
        label: 'Next tuning group',
        detail: 'Left / right resets this group.',
        action: () => a.show('dev', (page + 1) % groups),
        adjust: () => {
          for (const [key, value] of settings) a.engine?.inspector?.set(`game.${key}`, value);
          a.show('dev', page);
        },
      },
      { id: 'devtools', label: 'Tools, jumps & Reset', action: () => a.show('devtools') },
    ],
  );
  a.ui.back = () => a.show('pause');
}
export function devtools(a: ScreenApp, page: number): void {
  if (a.hubActive) return;
  const e = a.engine?.inspector;
  const refresh = () => a.show('devtools', page);
  if (page === 0)
    a.ui.menu('dev', 'THE RETREAT LAB', 'A little assistance.', 'All cheats and tuning are local to this copy.', [
      {
        id: 'bot',
        label: 'Bot plays for me',
        value: a.setting('game.auto') ? 'On' : 'Off',
        action: () => {
          e?.set('game.auto', !a.setting('game.auto'));
          refresh();
        },
      },
      {
        id: 'no-topple',
        label: 'No topple',
        value: a.setting('game.noTopple') ? 'On' : 'Off',
        action: () => {
          e?.set('game.noTopple', !a.setting('game.noTopple'));
          refresh();
        },
      },
      { id: 'jump', label: 'Jump to activity', action: () => a.show('devjump') },
      {
        id: 'finish',
        label: `Finish now · ${rank(a.devScore)}`,
        value: String(a.devScore),
        action: () => {
          a.run('game.finish', { score: a.devScore });
          a.resume();
        },
        adjust: (n) => {
          a.devScore = Math.max(0, Math.min(1000, a.devScore + n * 100));
          refresh();
        },
      },
      {
        id: 'reset',
        label: 'Reset all tuning to defaults',
        action: () => {
          for (const [key, value] of TUNING) e?.set(`game.${key}`, value);
          e?.set('game.auto', false);
          e?.set('game.noTopple', false);
          refresh();
        },
      },
      { id: 'next', label: 'More tools', action: () => a.show('devtools', 1) },
    ]);
  else if (page === 1)
    a.ui.menu('dev', 'TIME & SPACE', 'Some useful shortcuts.', '', [
      {
        id: 'day',
        label: `Jump to day ${Math.min(5, (a.flow?.day ?? 1) + 1)}`,
        action: () => {
          a.run('game.day', { day: Math.min(5, (a.flow?.day ?? 1) + 1) });
          a.resume();
        },
      },
      {
        id: 'finale',
        label: 'Jump to finale step',
        value: `${(a.flow?.event.phase ?? 0) + 1}`,
        action: () => {
          a.run('game.finale', { tick: 140 * 60 });
          a.resume();
        },
        adjust: (n) => {
          const times = [0, 20, 95, 140, 200],
            next = Math.max(0, Math.min(4, (a.flow?.event.phase ?? 0) + n));
          a.run('game.finale', { tick: times[next] * 60 });
          refresh();
        },
      },
      {
        id: 'step',
        label: 'Frame step / time scale',
        value: `${e?.timeScale() ?? 1}×`,
        adjust: (n) => {
          const values = [0.25, 1, 4],
            index = values.indexOf(e?.timeScale() ?? 1);
          e?.timeScale(values[(index + n + 3) % 3]);
          refresh();
        },
        action: () => {
          e?.step(1);
          refresh();
        },
      },
      {
        id: 'camera',
        label: 'Free camera',
        action: () => {
          a.resume();
          a.freeCamera = true;
          e?.camera.set('cam3=fly');
        },
      },
      {
        id: 'overlay',
        label: 'State overlay',
        value: a.overlay ? 'On' : 'Off',
        action: () => {
          a.overlay = !a.overlay;
          refresh();
        },
      },
      { id: 'next', label: 'Save, seed & export', action: () => a.show('devtools', 2) },
    ]);
  else
    a.ui.menu('dev', 'A THROWAWAY AFTERNOON', 'Nothing you cannot undo.', '', [
      {
        id: 'pebbles',
        label: 'Give 20 pebbles / unlock outfits',
        detail: 'Left / right unlocks everything.',
        adjust: () => {
          a.run('game.unlock');
          refresh();
        },
        action: () => {
          a.run('game.pebbles');
          refresh();
        },
      },
      {
        id: 'sandbox',
        label: 'Throwaway save mode',
        value: a.sandbox ? 'On' : 'Off',
        action: () => {
          a.sandbox = !a.sandbox;
          refresh();
        },
      },
      {
        id: 'seed',
        label: 'New seed',
        value: String(e?.seed() ?? 'unknown'),
        action: () => {
          e?.seed((e.seed() ?? 0) + 1);
          a.run('game.begin', a.save);
          a.resume();
        },
      },
      {
        id: 'copy',
        label: 'Copy tuned settings as JSON',
        action: () => {
          const text = JSON.stringify(
            Object.fromEntries(TUNING.map(([key]) => [`game.${key}`, a.setting(`game.${key}`)])),
            null,
            2,
          );
          navigator.clipboard?.writeText(text).catch(() => {});
          const heading = a.ui.root.querySelector('h1');
          if (heading) heading.textContent = 'Settings copied.';
        },
      },
      { id: 'reset-save', label: 'Reset residency', action: () => a.show('erase') },
      { id: 'back', label: 'Back to live tuning', action: () => a.show('dev') },
    ]);
  a.ui.back = () => a.show('dev');
}
export function devjump(a: ScreenApp, page: number): void {
  if (a.hubActive) return;
  a.ui.menu('dev', 'GO ANYWHERE', 'Your next small challenge.', '', [
    ...ACTIVITIES.slice(page * 5, page * 5 + 5).map((event) => ({
      id: event.id,
      label: event.title,
      action: () => a.start(event.id),
    })),
    { id: 'next', label: 'Next page', action: () => a.show('devjump', (page + 1) % 3) },
  ]);
  a.ui.back = () => a.show('devtools');
}
