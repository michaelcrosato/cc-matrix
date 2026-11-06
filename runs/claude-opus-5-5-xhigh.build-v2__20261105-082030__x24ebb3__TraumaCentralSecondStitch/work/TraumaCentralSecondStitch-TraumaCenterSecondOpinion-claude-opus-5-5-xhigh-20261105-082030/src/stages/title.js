// Title and main menu: a dark operating theatre with one swinging lamp. An EKG line draws itself through
// the title. Ten idle seconds start the attract reel.
import { App } from '../app.js';
import { SUBTITLE, TITLE } from '../core/meta.js';
import { Menu } from '../ui/menu.js';
import { applyLook } from '../view/looks.js';
import { Figure } from '../view/figure.js';
import { SetView } from '../view/sets.js';
import { Stage } from './stage.js';

export const TITLE_CAM = { preset: 'fixed', position: [5.4, 3.3, 6.2], target: [0, 1.5, -3], fov: 38, minZoom: 1, maxZoom: 1 };

export class TitleStage extends Stage {
  name = 'title';
  attractable = true;
  cameraConfig = TITLE_CAM;
  constructor(state = 'title') { super(); this.state = state; this.ekgX = 0; this.menuAlpha = 0; this.flick = 0; }
  async build(ctx) {
    this.set = new SetView(ctx, 'or7');
    this.set.lampSwing = 0.12;
    this.figure = new Figure(ctx, 'patient', [-1.2, 1.2, -3], Math.PI / 2, 'LieIdle');
    this.figure.object.visible = false;
    applyLook(ctx.engine, App.save.settings, 1, 0.42, 0);
    App.director.play('title', { now: App.director.current == null });
    this.rain = ctx.audio.loop('rainLoop', { volume: 0.35 });
    this.buildMenu();
    if ((App.touchOnly || App.startAttractOnBoot) && !App.attractStarted) { App.attractStarted = true; this.startAttract(); }
    if (App.bootScene) {
      const id = App.bootScene;
      App.bootScene = null;
      const [{ StoryStage }, { toTitle, CLOSE_CAM }] = await Promise.all([import('./story.js'), import('./flow.js')]);
      this.afterBoot = () => App.goto(new StoryStage({ sceneId: id, onDone: () => toTitle() }), { camera: CLOSE_CAM });
    }
  }
  buildMenu() {
    const prog = App.save.progress;
    const items = [
      { label: 'ON CALL', blurb: prog ? 'THE SHIFT IS WAITING.' : 'A STORM. 3 A.M. THE CHIEF IS UNREACHABLE.', onConfirm: () => this.onCall() },
      { label: 'OPERATING LOG', disabled: Object.keys(App.save.log).length === 0, blurb: 'REPLAY CLEARED OPERATIONS.', onConfirm: () => this.openLog() },
      { label: 'CONSULT', blurb: 'A SECOND PAIR OF HANDS. UP TO FOUR, ON ONE TV.', onConfirm: () => this.openConsult() },
      { label: 'SETTINGS', blurb: 'SOUND, GLYPHS, AIM, LOOK.', onConfirm: () => this.overlay('SettingsOverlay') },
      { label: 'ABOUT', blurb: 'SOURCE, FEEDBACK, CREDITS.', onConfirm: () => this.overlay('AboutOverlay') },
    ];
    this.menu = new Menu(App, items, { w: 150, y: 150, rowH: 15, rows: 5 });
    this.menu.fixFocus();
  }
  async overlay(name, arg) {
    const m = await import('../ui/overlays.js');
    App.overlays.push(new m[name](this, arg));
  }
  async onCall() {
    const m = await import('../ui/overlays.js');
    App.overlays.push(new m.OnCallOverlay(this));
  }
  async openLog() {
    const { LogStage } = await import('./log.js');
    App.goto(new LogStage());
  }
  async openConsult() {
    const { ConsultStage } = await import('./consult.js');
    App.goto(new ConsultStage());
  }
  async startAttract() {
    const { startAttractReel } = await import('./attract.js');
    startAttractReel();
  }
  frame(ctx, dt, overlay) {
    if (this.afterBoot) { const go = this.afterBoot; this.afterBoot = null; go(); }
    this.set.update(dt, ctx.camera.camera.position);
    this.ekgX += dt * 90;
    const cam = ctx.camera.camera;
    const k = this.state === 'main' ? 1 : 0;
    this.menuAlpha += (k - this.menuAlpha) * Math.min(1, dt * 6);
    cam.position.set(5.4 + Math.sin(this.t * 0.13) * 0.8 - this.menuAlpha * 0.6, 3.3 + Math.sin(this.t * 0.2) * 0.12, 6.2);
    cam.lookAt(0, 1.5, -3);
    if (overlay) return;
    if (App.touchOnly) return;
    const d = App.devices;
    if (this.state === 'title') {
      if (d.anyPress) {
        App.sfx('uiConfirm');
        this.state = 'main';
      }
    } else {
      this.menu.update(this.ui);
      if (d.nav.back || d.rightClick) { this.state = 'title'; App.sfx('uiBack'); }
    }
  }
  drawTitle(ui, y) {
    const w = ui.w;
    const mid = y + 12;
    const scale = ui.fit(TITLE, w - 16, 4);
    const tw = ui.hud.measure(TITLE, scale).width;
    const x = (w - tw) / 2;
    ui.text(x, y, TITLE, { color: 'white', scale, shadow: 'plum' });
    ui.center(y + 8 * scale + 4, SUBTITLE, { color: 'sand', scale: 2, shadow: 'plum' });
    // The EKG line drawing itself through the title.
    const span = w + 90;
    const head = this.ekgX % span;
    for (let px = 0; px < w; px++) {
      if (px > head) break;
      const age = head - px;
      if (age > 260) continue;
      const p = ((px + 60) % 120) / 120;
      let yy = 0;
      if (p > 0.4 && p < 0.44) yy = -5;
      else if (p >= 0.44 && p < 0.47) yy = 16;
      else if (p >= 0.47 && p < 0.5) yy = -22;
      else if (p >= 0.5 && p < 0.53) yy = 9;
      ui.rect(px, mid + yy, 1, 2, age < 30 ? 'white' : age < 130 ? 'red' : 'plum');
      if (Math.abs(yy) > 4) { for (let q = 0; q < Math.abs(yy); q += 2) ui.rect(px, mid + Math.sign(yy) * q, 1, 2, age < 130 ? 'red' : 'plum'); }
    }
  }
  draw(ctx, ui) {
    const w = ui.w, h = ui.h;
    this.drawTitle(ui, Math.round(h * 0.07));
    if (App.touchOnly) return;
    if (this.state === 'title') {
      if (Math.sin(this.t * 3.4) > -0.4) {
        const label = 'PRESS ';
        const device = ui.device;
        const list = device === 'pad' ? [['confirm', '']] : [['confirm', ' OR CLICK']];
        const lw = ui.hud.measure(label, 1).width + ui.actionWidth('confirm') + ui.hud.measure(list[0][1], 1).width + 2;
        let x = (w - lw) / 2;
        const y = h * 0.72;
        ui.text(x, y, label);
        x += ui.hud.measure(label, 1).width;
        x += ui.action(x, y - 1, 'confirm') + 2;
        ui.text(x, y, list[0][1]);
      }
      ui.center(h - 12, '"THE TRUTH, STAT." - OVER THE DOOR OF OR-7', { color: 'slate' });
    } else {
      this.menu.y = Math.round(h * 0.42);
      this.menu.draw(ui);
    }
  }
  status() { return `title state=${this.state} idle=${App.idle.toFixed(1)}`; }
  dispose() { this.rain?.stop(); }
}
