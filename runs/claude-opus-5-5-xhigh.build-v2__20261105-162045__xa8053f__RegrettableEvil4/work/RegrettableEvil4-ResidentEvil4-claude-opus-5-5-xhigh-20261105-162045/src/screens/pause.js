// Pause: RESUME, SETTINGS, RESTART FROM CHECKPOINT, DEV MODE, QUIT TO TITLE.
import { app } from '../core/app.js';
import { openSettings } from './settings.js';
import { openDev } from './dev.js';

export function openPause(area) {
  area.ctx.audio.play('uiConfirm');
  const screen = {
    frozen: true,
    name: 'pause',
    update(ctx, ui) {
      ui.dim();
      const w = 220; const x = (ui.W - w) >> 1;
      const y0 = 56;
      ui.heading('CLAIM ON HOLD', 26);
      let y = y0;
      const row = (id, label, fn, o) => { if (ui.item(id, x, y, w, label, o)) { ctx.audio.play('uiConfirm'); fn(); } y += 22; };
      row('resume', 'RESUME', () => { app.close(screen); });
      row('settings', 'SETTINGS', () => openSettings());
      row('restart', 'RESTART FROM CHECKPOINT', () => { app.close(screen); area.reloadCheckpoint(); }, { scale: 1 });
      row('dev', 'DEV MODE', () => { app.dev.used = true; openDev(area); });
      row('quit', 'QUIT TO TITLE', () => { app.closeAll(); app.scenes.title(); });
      if (area.objective) ui.centerText(y + 8, area.objective, { color: 'sand' });
      ui.promptBar([['confirm', 'SELECT'], ['back', 'RESUME']]);
      if (ui.nav.back || ctx.input.wasPressed('PadOptions', 'KeyP')) { ctx.audio.play('uiBack'); app.close(screen); }
    },
  };
  app.open(screen);
  return screen;
}
