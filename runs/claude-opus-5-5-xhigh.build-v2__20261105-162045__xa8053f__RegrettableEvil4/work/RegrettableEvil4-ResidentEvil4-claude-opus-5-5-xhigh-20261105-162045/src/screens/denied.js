// Death: slow fall, sting, a big rubber stamp, then Continue or Quit.
import { app } from '../core/app.js';

export function openDenied(area, reason = 'CLAIM DENIED') {
  let t = 0;
  let stamped = false;
  const screen = {
    frozen: true,
    name: 'denied',
    continue() { app.close(screen); area.reloadCheckpoint(); },
    update(ctx, ui) {
      t += ui.dt;
      ui.dim();
      if (t > 0.25 && !stamped) { stamped = true; ctx.audio.play('stamp'); ctx.engine.shake.add(0.5); ctx.engine.step && 0; }
      if (stamped) {
        const w = 300; const h = 54;
        const x = (ui.W - w) >> 1; const y = (ui.H >> 1) - 60;
        const { hud } = ui;
        hud.rect(x, y, w, h, 'red');
        hud.rect(x + 3, y + 3, w - 6, h - 6, 'ink');
        hud.rect(x + 5, y + 5, w - 10, h - 10, 'red');
        hud.rect(x + 7, y + 7, w - 14, h - 14, 'ink');
        ui.centerText(y + 14, reason, { scale: reason.length > 14 ? 2 : 3, color: 'red', shadow: false }, x, w);
      }
      if (t > 0.8) {
        const w = 200; const x = (ui.W - w) >> 1; const y = (ui.H >> 1) + 8;
        if (ui.item('continue', x, y, w, 'CONTINUE')) { ctx.audio.play('uiConfirm'); screen.continue(); return; }
        if (ui.item('quit', x, y + 22, w, 'QUIT TO TITLE')) { ctx.audio.play('uiBack'); app.closeAll(); app.scenes.title(); return; }
        ui.promptBar([['confirm', 'SELECT']]);
      }
    },
  };
  app.open(screen);
  return screen;
}
