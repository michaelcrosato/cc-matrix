// The Operating Log: one chart at a time, flip with left and right. Replay anything cleared.
import { App } from '../app.js';
import { CAMPAIGN_OPS } from '../content/ops/index.js';
import { applyLook } from '../view/looks.js';
import { SetView } from '../view/sets.js';
import { BriefingStage } from './briefing.js';
import { CLOSE_CAM, toTitle } from './flow.js';
import { Stage } from './stage.js';
import { TITLE_CAM } from './title.js';

export class LogStage extends Stage {
  name = 'log';
  attractable = true;
  cameraConfig = TITLE_CAM;
  constructor(opId) {
    super();
    this.list = CAMPAIGN_OPS.filter((o) => App.save.log[o.id] || App.unlockAll);
    this.i = Math.max(0, this.list.findIndex((o) => o.id === opId));
    this.dir = 0;
    this.flip = 0;
  }
  async build(ctx) {
    this.set = new SetView(ctx, 'or7');
    applyLook(ctx.engine, App.save.settings, 1, 0.5, 0);
    App.director.play('ward');
  }
  frame(ctx, dt, overlay) {
    this.set.update(dt, ctx.camera.camera.position);
    const cam = ctx.camera.camera;
    cam.position.set(TITLE_CAM.position[0] + Math.sin(this.t * 0.12) * 0.5, TITLE_CAM.position[1], TITLE_CAM.position[2]);
    cam.lookAt(...TITLE_CAM.target);
    this.flip = Math.max(0, this.flip - dt * 5);
    if (overlay) return;
    const d = App.devices;
    if (!this.list.length) { if (d.nav.back || d.nav.confirm) toTitle(); return; }
    if (d.nav.left) { this.i = (this.i + this.list.length - 1) % this.list.length; this.flip = 1; this.dir = -1; App.sfx('uiMove'); }
    if (d.nav.right) { this.i = (this.i + 1) % this.list.length; this.flip = 1; this.dir = 1; App.sfx('uiMove'); }
    const hitL = this.arrowL && this.ui.hit(...this.arrowL), hitR = this.arrowR && this.ui.hit(...this.arrowR);
    if (d.click && hitL) { this.i = (this.i + this.list.length - 1) % this.list.length; this.flip = 1; App.sfx('uiMove'); return; }
    if (d.click && hitR) { this.i = (this.i + 1) % this.list.length; this.flip = 1; App.sfx('uiMove'); return; }
    if (d.nav.confirm || d.click) {
      const op = this.list[this.i];
      App.sfx('uiConfirm');
      App.goto(new BriefingStage({ opId: op.id, mode: 'replay', difficulty: App.save.progress?.difficulty ?? 'resident', onBack: () => App.goto(new LogStage(op.id)) }), { camera: CLOSE_CAM });
    }
    if (d.nav.back || d.rightClick) { App.sfx('uiBack'); toTitle(); }
  }
  draw(ctx, ui) {
    const w = ui.w, h = ui.h;
    ui.center(8, 'OPERATING LOG', { color: 'sand', scale: 2 });
    if (!this.list.length) { ui.center(h / 2, 'NOTHING CLEARED YET.', { color: 'white' }); return; }
    const op = this.list[this.i];
    const r = App.save.log[op.id];
    const cw = Math.min(300, w - 70), ch = 180;
    const x = (w - cw) / 2 + this.flip * this.dir * 40, y = 32;
    ui.clipboard(x, y, cw, ch);
    const ink = 0x28203a;
    ui.text(x + 12, y + 12, `OPERATION ${op.num}`, { color: 0x7a6a4a, shadow: false });
    ui.text(x + 12, y + 22, op.title, { color: ink, scale: 2, shadow: false });
    ui.text(x + 12, y + 44, op.patient.name, { color: ink, shadow: false });
    ui.text(x + 12, y + 54, op.patient.job, { color: 0x7a6a4a, shadow: false });
    ui.rect(x + 12, y + 66, cw - 24, 1, 0xa89a78);
    const rank = r?.rank ?? 'C';
    const lines = ui.wrap(op.patient.followUp[rank], cw - 26);
    lines.slice(0, 4).forEach((l, i) => ui.text(x + 12, y + 74 + i * 10, l, { color: ink, shadow: false }));
    if (r) {
      ui.text(x + 12, y + ch - 30, `BEST SCORE ${r.total}`, { color: ink, shadow: false });
      ui.stamp(x + cw - 34, y + ch - 32, r.rank, { S: 0xf4c430, A: 0x38b764, B: 0x3b5dc9, C: 0xb13e53 }[r.rank], 4);
      if (r.pristine) ui.text(x + 12, y + ch - 19, 'PRISTINE', { color: 0xc99a1a, shadow: false });
    }
    this.arrowL = [x - 30, y + ch / 2 - 15, 24, 30];
    this.arrowR = [x + cw + 6, y + ch / 2 - 15, 24, 30];
    ui.text(x - 22, y + ch / 2 - 8, '<', { color: 'sand', scale: 2 });
    ui.text(x + cw + 12, y + ch / 2 - 8, '>', { color: 'sand', scale: 2 });
    ui.center(y + ch + 7, `${this.i + 1} / ${this.list.length}`, { color: 'mist' });
    ui.hints([['confirm', 'OPERATE'], ['back', 'BACK']], h - 12);
  }
  status() { return `log ${this.list[this.i]?.id}`; }
}
