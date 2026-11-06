import { SettingsScreen } from './settings.js';
import { DevScreen } from './dev.js';
export class PauseMenu {
  constructor(A) { this.A = A; this.s = { focus: 0 }; this.ctx = A.ctx; }
  update(ui) {
    const A = this.A, inSession = A.app.session?.hub;
    if (this.sub) { this.sub.update(ui); if (this.sub.done) this.sub = null; return; }
    ui.dim(); ui.rect(0, 26, ui.W, ui.H - 62, 'ink'); ui.center(36, 'PAUSED', { scale: 2, color: 'sand' }); ui.center(58, A.objective, { color: 'mist' });
    const items = [{ label: 'RESUME' }, { label: 'SETTINGS' }]; if (!inSession) items.push({ label: 'RESTART FROM CHECKPOINT' }, { label: 'DEV MODE' }, { label: 'QUIT TO TITLE' });
    const i = ui.list(this.s, items, { x: ui.W / 2 - 100, y: 80, w: 200, rowH: 18 });
    ui.prompts([['confirm', 'SELECT'], ['back', 'RESUME']]);
    if (i === 0 || ui.back) { A.closeMenu(); return; }
    if (i === 1) this.sub = new SettingsScreen(A.app);
    if (i === 2) { A.menu = null; A.ctx.engine.timeScale = 1; A.app.restartCheckpoint(); }
    if (i === 3) this.sub = new DevScreen(A);
    if (i === 4) { A.menu = null; A.ctx.engine.timeScale = 1; A.app.goTitle(); }
  }
}
