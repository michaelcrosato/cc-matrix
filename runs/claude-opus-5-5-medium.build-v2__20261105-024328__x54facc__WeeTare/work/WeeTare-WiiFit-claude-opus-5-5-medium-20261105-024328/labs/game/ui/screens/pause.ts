/**
 * @file The pause menu, split at six rows: the things you want now, then More. A real pause: the sim stops, nothing costs.
 * Create + Options belongs to the hub; a session's pause is an overlay that never stops the sim, with no dev mode.
 */
import { closer, panel, type Ctx, type Screen } from '../ctx';
import { createRows } from '../menu';
import { aboutScreen } from './front';
import { controlsScreen, settingsScreen } from './settings';
import { devScreen } from '../dev/panel';

/** The pause menu. `onQuit` goes to the title. */
export function pauseScreen(ctx: Ctx, onQuit: () => void, onClose: () => void): Screen {
  const { layer, box } = panel(ctx, 'Paused');
  layer.dataset.ui = 'pause';
  const flow = ctx.flow();
  const inEvent = flow.mode === 'event';
  const first = [
    { id: 'resume', label: 'Resume' },
    { id: 'restart', label: 'Restart Activity', off: !inEvent },
    { id: 'island', label: 'Back to the Island', off: !inEvent },
    { id: 'settings', label: 'Settings' },
    { id: 'more', label: 'More' },
    { id: 'quit', label: 'Quit to Title' },
  ];
  const more = [
    { id: 'controls', label: 'Controls' },
    { id: 'dev', label: 'Dev Mode' },
    { id: 'about', label: 'About / Credits' },
    { id: 'less', label: 'Back' },
  ];
  const close = () => {
    ctx.pop();
    onClose();
  };
  const menu = createRows(
    box,
    first,
    ctx.nav,
    (id) => {
      if (id === 'resume') close();
      else if (id === 'restart') {
        const current = ctx.flow().ev?.id;
        close();
        if (current) ctx.run('game.start', { id: current });
      } else if (id === 'island') {
        close();
        ctx.run('game.leave');
      } else if (id === 'settings') ctx.push(settingsScreen(ctx));
      else if (id === 'more') menu.setRows(more);
      else if (id === 'less') menu.setRows(first);
      else if (id === 'controls') ctx.push(controlsScreen(ctx));
      else if (id === 'dev') ctx.push(devScreen(ctx));
      else if (id === 'about') ctx.push(aboutScreen(ctx));
      else if (id === 'quit') {
        ctx.pop();
        onQuit();
      }
    },
    close,
    () => ctx.sound.audio.play('sfx:select'),
  );
  return { el: layer, update: (dt) => menu.update(dt), close: closer(layer) };
}

/** A session's pause: an overlay that never stops the sim. Resume, volume, button icons; no dev mode, no quitting. */
export function sessionPauseScreen(ctx: Ctx): Screen {
  const { layer, box } = panel(ctx, 'The class goes on');
  layer.dataset.ui = 'session-pause';
  const s = ctx.settings;
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const step = (v: number, d: number) => Math.round(Math.max(0, Math.min(1, v + d * 0.1)) * 100) / 100;
  const menu = createRows(box, [
    { id: 'resume', label: 'Resume' },
    { id: 'music', label: 'Music', value: () => pct(s.music), change: (d) => { s.music = step(s.music, d); ctx.sound.audio.volume('music', s.music); } },
    { id: 'effects', label: 'Effects', value: () => pct(s.effects), change: (d) => { s.effects = step(s.effects, d); ctx.sound.audio.volume('effects', s.effects); } },
    { id: 'icons', label: 'Button icons', value: () => (s.icons === 'ps' ? 'PlayStation' : 'Xbox'), change: () => { s.icons = s.icons === 'ps' ? 'xbox' : 'ps'; ctx.root.dataset.pad = s.icons; } },
  ], ctx.nav, () => ctx.pop(), () => ctx.pop()); // prettier-ignore
  return { el: layer, update: (dt) => menu.update(dt), close: closer(layer) };
}
