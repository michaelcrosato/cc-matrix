// Pause: Resume, Retry Stage, Restart, Settings, Dev Mode, Quit to Menu. Our own flag; the engine keeps running.
import { Menu } from './menu.js';
import { app } from '../core/app.js';
import { SettingsScreen } from './settings.js';
import { DevScreen } from './dev.js';
import { go } from '../stages/stage.js';

export class PauseOverlay {
  constructor(stage, ctx) {
    this.stage = stage; this.ctx = ctx; this.sub = null;
    this.menu = new Menu(app, [
      { label: 'RESUME', id: 'resume' }, { label: 'OBJECTIVE', id: 'obj' }, { label: 'RETRY STAGE', id: 'retry' }, { label: 'RESTART', id: 'restart' }, { label: 'SETTINGS', id: 'settings' }, { label: 'DEV MODE', id: 'dev' }, { label: 'QUIT TO MENU', id: 'quit' },
    ], { y: 74, rowH: 18, width: 170 });
    this.show = null;
  }
  openDev(ctx) { this.sub = new DevScreen(this.stage, ctx, () => { this.sub = null; if (this.stage.sim.phase !== 'play' || this.closeOnBack) this.stage.closePause(); }); }
  update(ctx, dt) {
    if (this.sub) { this.sub.update(ctx, dt); return; }
    if (app.devices.nav.pause) { this.stage.closePause(); ctx.audio.play('uiBack'); return; }
    const r = this.menu.update(ctx);
    if (!r) return;
    if (r === 'back') { this.stage.closePause(); return; }
    switch (r.id) {
      case 'resume': this.stage.closePause(); break;
      case 'obj': this.stage.closePause(); this.stage.hud.prompt(this.stage.def.patient.objective); break;
      case 'retry': this.stage.retryStage(); break;
      case 'restart': this.stage.restart(); break;
      case 'settings': this.sub = new SettingsScreen(ctx, () => { this.sub = null; }); break;
      case 'dev': this.openDev(ctx); break;
      case 'quit': import('../stages/flow.js').then(({ backToMain }) => backToMain()); break;
      default: break;
    }
  }
  draw(ctx) {
    const { hud } = ctx, W = hud.width, H = hud.height;
    if (this.sub) { hud.clear(); this.sub.draw(ctx); return; }
    hud.clear();
    hud.rect(Math.round(W / 2 - 110), 24, 220, H - 50, 0x0d0b14);
    hud.rect(Math.round(W / 2 - 110), 24, 220, 2, 0xffd24d);
    const t = 'PAUSED', tw = hud.measure(t, 2).width;
    hud.text(Math.round(W / 2 - tw / 2), 34, t, { scale: 2, color: 0xffffff });
    hud.text(Math.round(W / 2 - hud.measure(this.stage.def.title).width / 2), 56, this.stage.def.title, { color: 0x8a93a6 });
    this.menu.draw(hud);
    app.prompts.strip(hud, Math.round(W / 2 - 100), H - 38, [['confirm', 'SELECT'], ['back', 'RESUME']]);
  }
}
