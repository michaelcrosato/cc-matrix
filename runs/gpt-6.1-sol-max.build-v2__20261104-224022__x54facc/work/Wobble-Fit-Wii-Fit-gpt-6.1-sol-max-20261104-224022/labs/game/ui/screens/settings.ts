/** @file Six-row settings pages, including a real in-game erase confirmation. */
import type { ScreenApp } from '../context';
import type { Options } from '../options';
import { freshProgress } from '../../scenes/state';
export function settings(a: ScreenApp, page: number): void {
  const back = () => a.show(a.flow && !['front', 'credits'].includes(a.flow.mode) ? 'pause' : 'title');
  const toggle = (key: keyof Options, label: string, yes = 'On', no = 'Off') => ({
    id: key,
    label,
    value: a.options[key] ? yes : no,
    action: () => {
      (a.options as unknown as Record<string, unknown>)[key] = !a.options[key];
      a.applyOptions();
      a.show('settings', page);
    },
    adjust: () => {
      (a.options as unknown as Record<string, unknown>)[key] = !a.options[key];
      a.applyOptions();
      a.show('settings', page);
    },
  });
  const volume = (key: 'music' | 'effects' | 'voices', label: string) => {
    const change = (value: number) => {
      a.options[key] = Math.max(0, Math.min(1, value));
      a.applyOptions();
    };
    return {
      id: key,
      label,
      value: `${Math.round(a.options[key] * 100)}%`,
      action: () => {},
      adjust: (n: number) => {
        change(a.options[key] + n * 0.05);
        a.show('settings', page);
      },
      slider: { min: 0, max: 1, step: 0.01, value: a.options[key], change },
    };
  };
  const next = {
    id: 'next',
    label: 'More settings',
    value: `${page + 1} / 3`,
    action: () => a.show('settings', (page + 1) % 3),
  };
  const rows =
    page === 0
      ? [
          volume('music', 'Music'),
          volume('effects', 'Effects'),
          volume('voices', 'Voices'),
          toggle('xbox', 'Button icons', 'Xbox', 'PlayStation'),
          next,
          { id: 'back', label: 'Back', action: back },
        ]
      : page === 1
        ? [
            {
              id: 'sensitivity',
              label: 'Mouse sensitivity',
              value: a.options.sensitivity.toFixed(3),
              action: () => {},
              adjust: (n: number) => {
                a.options.sensitivity = Math.max(0.001, Math.min(0.012, a.options.sensitivity + n * 0.001));
                a.applyOptions();
                a.show('settings', page);
              },
            },
            toggle('invert', 'Invert look'),
            toggle('rumble', 'Controller rumble'),
            toggle('assist', 'Steadier Hands'),
            toggle('reduced', 'Reduced Motion'),
            next,
          ]
        : [
            toggle('cpu', 'CPU guests'),
            { id: 'outfit', label: 'Your retreat outfit', action: () => a.show('arrival') },
            {
              id: 'fullscreen',
              label: 'Fullscreen',
              action: () => {
                if (document.fullscreenElement) document.exitFullscreen?.();
                else document.documentElement.requestFullscreen?.().catch(() => {});
              },
            },
            { id: 'erase', label: 'Erase residency', action: () => a.show('erase') },
            next,
            { id: 'back', label: 'Back', action: back },
          ];
  a.ui.menu(
    'settings',
    'A LITTLE PERSONAL PREFERENCE',
    ['Make it your own.', 'A comfortable pace.', 'Room for a fresh start.'][page],
    page === 1 ? 'Steadier Hands halves the sway. Every achievement still counts.' : '',
    rows,
  );
  a.ui.back = back;
}
export function erase(a: ScreenApp): void {
  a.ui.menu(
    'erase',
    'ONE LAST SMALL QUESTION',
    'Start your stay again?',
    'Your pebbles, stamps and Wobble Ages will be cleared. Your preferences will stay.',
    [
      { id: 'keep', label: 'Keep my residency', action: () => a.show('settings', 2) },
      {
        id: 'erase-confirm',
        label: 'Yes. A fresh beginning.',
        action: () => {
          a.save = freshProgress();
          if (!a.sandbox) a.store.remove('progress');
          const e = a.engine?.inspector;
          if (e) e.seed(e.seed());
          a.run('game.begin', a.save);
          a.run('game.front');
          a.engine?.inspector?.resume();
          a.show('title');
        },
      },
    ],
  );
  a.ui.back = () => a.show('settings', 2);
}
