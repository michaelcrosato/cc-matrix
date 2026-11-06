// The briefing: a clipboard chart over the theatre. Patient name, age, job, hook, the op's title
// stamped, and the one-line objective. Then the camera dives down onto the field.
import { App } from '../app.js';
import { DIFFICULTIES } from '../core/config.js';
import { OPS } from '../content/ops/index.js';
import { Figure } from '../view/figure.js';
import { applyLook } from '../view/looks.js';
import { SetView } from '../view/sets.js';
import { OperationStage, OP_CAMERA } from './operation.js';
import { Stage } from './stage.js';
import { toTitle } from './flow.js';

export class BriefingStage extends Stage {
  name = 'briefing';
  constructor(o) { super(); this.o = o; this.def = OPS[o.opId]; this.slide = 0; this.dive = 0; this.seats = o.seats; }
  cameraConfig = { preset: 'fixed', position: [5.2, 3.6, 5.2], target: [0, 1.2, -2.8], fov: 38, minZoom: 1, maxZoom: 1 };
  async build(ctx) {
    this.set = new SetView(ctx, 'or7');
    this.set.lampSwing = 0.03;
    this.figs = [new Figure(ctx, this.def.surgeon === 'sabine' ? 'sabine' : 'ilya', [-1.9, 0, -2.2], 1.1), new Figure(ctx, 'reyes', [1.9, 0, -2.3], -1), new Figure(ctx, 'pem', [-3, 0, -3.8], 0.8, 'Sit')];
    applyLook(ctx.engine, App.save.settings);
    App.director.play(this.def.music && this.def.music !== 'silence' ? 'title' : 'title');
  }
  frame(ctx, dt, overlay) {
    this.set.update(dt, ctx.camera.camera.position);
    for (const f of this.figs) f.update(dt);
    this.slide = Math.min(1, this.slide + dt * 3);
    const cam = ctx.camera.camera;
    if (this.dive > 0) {
      this.dive += dt / 1.1;
      const k = Math.min(1, this.dive);
      const e = k * k * (3 - 2 * k);
      cam.position.set(5.2 * (1 - e), 3.6 + e * 0.8, 5.2 + (-3 + 1.4 - 5.2) * e);
      cam.fov = 38 + e * 12;
      cam.updateProjectionMatrix();
      cam.lookAt(0, 1.1 * e + 1.2 * (1 - e), -3 * e + -2.8 * (1 - e));
      if (k >= 1 && !this.left) { this.left = true; this.launch(); }
      return;
    }
    cam.position.set(5.2 + Math.sin(this.t * 0.2) * 0.2, 3.6, 5.2);
    cam.lookAt(0, 1.2, -2.8);
    if (overlay) return;
    const d = App.devices;
    if (d.nav.confirm || d.click) { App.sfx('uiConfirm'); App.sfx('whoosh'); this.dive = 0.001; }
    else if (d.nav.back || d.rightClick) {
      if (this.o.onBack) this.o.onBack(); else toTitle();
    }
  }
  launch() {
    App.goto(new OperationStage({ opId: this.o.opId, mode: this.o.mode, difficulty: this.o.difficulty, seats: this.o.seats, startStage: this.o.startStage, fromLog: this.o.mode === 'replay' }), { kind: 'iris', duration: 0.28, camera: OP_CAMERA });
  }
  draw(ctx, ui) {
    if (this.dive > 0) return;
    const p = this.def.patient;
    const w = ui.w, h = ui.h;
    const cw = Math.min(330, w - 30), ch = Math.min(210, h - 40);
    const x = (w - cw) / 2, y = (h - ch) / 2 + (1 - this.slide) * h - 4;
    ui.clipboard(x, y, cw, ch);
    const ink = 0x28203a;
    const tx = x + 14;
    ui.text(tx, y + 13, this.def.num ? `OPERATION ${this.def.num}` : 'CONSULT', { color: 0x7a6a4a, shadow: false });
    ui.text(tx, y + 25, p.name, { color: ink, scale: 2, shadow: false });
    ui.text(tx, y + 45, `AGE ${p.age}   ${p.job}`, { color: ink, shadow: false });
    ui.rect(tx, y + 56, cw - 28, 1, 0xa89a78);
    const hookLines = ui.wrap(p.hook, cw - 30);
    hookLines.slice(0, 3).forEach((l, i) => ui.text(tx, y + 62 + i * 10, l, { color: ink, shadow: false }));
    ui.rect(tx, y + 96, cw - 28, 1, 0xa89a78);
    const obj = ui.wrap(p.objective, cw - 30);
    obj.slice(0, 2).forEach((l, i) => ui.rich(tx, y + 102 + i * 10, l, { color: 0x8a1f38, shadow: false, hi: 0x8a1f38 }));
    const ttl = this.def.title;
    const ts = ui.hud.measure(ttl, 2).width > cw - 30 ? 1 : 2;
    ui.stamp(x + cw / 2, y + ch - 60, ttl, 0xb13e53, ts);
    const best = App.save.log[this.def.id];
    if (best) ui.text(tx, y + ch - 30, `BEST: ${best.rank}${best.pristine ? '  PRISTINE' : ''}`, { color: ink, shadow: false });
    ui.text(tx, y + ch - 19, DIFFICULTIES[this.o.difficulty ?? 'resident'].label, { color: 0x7a6a4a, shadow: false });
    const label = 'SCRUB IN';
    const lw = ui.hud.measure(label, 1).width + ui.actionWidth('confirm') + 4;
    const lx = x + cw - lw - 12;
    ui.action(lx, y + ch - 19, 'confirm');
    ui.text(lx + ui.actionWidth('confirm') + 4, y + ch - 18, label, { color: ink, shadow: false });
  }
  status() { return `briefing ${this.def.id}`; }
}
