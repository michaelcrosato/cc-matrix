// The telegraph key in a dry room: send the claim (save), call the Claims Desk, or leave.
import { app } from '../core/app.js';
import { PYM_HINTS } from '../data/dialogue.js';

export function openTelegraph(area) {
  let sent = 0;
  const screen = {
    frozen: true,
    name: 'telegraph',
    update(ctx, ui) {
      ui.dim();
      const w = 260; const x = (ui.W - w) >> 1;
      ui.heading('TELEGRAPH KEY', 30);
      ui.centerText(58, 'A BRASS KEY, A GREEN LAMP, A CLEAR LINE TO LONDON.', { color: 'mist' });
      let y = 76;
      if (ui.item('save', x, y, w, sent > 0 ? 'CLAIM SENT' : 'SEND THE CLAIM')) {
        area.checkpoint(area.entry);
        ctx.audio.play('telegraph');
        sent = 2;
      }
      y += 22;
      if (ui.item('call', x, y, w, 'CALL THE CLAIMS DESK')) {
        ctx.audio.play('telegraph');
        app.close(screen);
        area.radioCall([['pym', PYM_HINTS[area.id] ?? PYM_HINTS.quay]]);
        return;
      }
      y += 22;
      if (ui.item('leave', x, y, w, 'LEAVE IT')) { ctx.audio.play('uiBack'); app.close(screen); return; }
      if (sent > 0) { sent -= ui.dt * 0.5; ui.centerText(y + 28, 'SAVED. STOP.', { color: 'lime' }); }
      ui.promptBar([['confirm', 'SELECT'], ['back', 'LEAVE']]);
      if (ui.nav.back) { ctx.audio.play('uiBack'); app.close(screen); }
    },
  };
  app.open(screen);
  return screen;
}
