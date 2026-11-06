// Briefing: a clipboard chart. Patient, age, job, hook, op title stamped, one-line objective.
import { app } from '../core/app.js';
import { Stage, setView } from './stage.js';
import { OPS } from '../content/ops/index.js';
import { buildSet } from '../view/sets.js';

export class BriefingStage extends Stage {
  name = 'briefing';
  constructor(opts) { super(); this.opts = opts; this.def = OPS[opts.op]; this.t = 0; }
  async build(ctx) { this.set = await buildSet(ctx, 'or7'); app.applyLook(1, 0.4, 0); app.director?.play(this.def.n >= 5 ? 'or-tense' : 'or-calm'); ctx.audio.play('stamp'); }
  status() { return `briefing ${this.def.id}`; }
  update(ctx, dt) {
    app.devices.poll(ctx, dt);
    this.t += dt;
    this.set.update(dt);
    app.director?.update(dt);
    setView(ctx, [2.6 - this.t * 0.04, 3.1, 4.8], [0, 1, 0], 34);
    const { hud } = ctx, W = hud.width, H = hud.height, P = this.def.patient;
    hud.clear();
    const cw = Math.min(330, W - 30), ch = Math.min(216, H - 30), x = Math.round(W / 2 - cw / 2), drop = Math.max(0, 1 - this.t * 4), y = Math.round((H - ch) / 2 - drop * 240);
    hud.rect(x, y, cw, ch, 0x7a5430);
    hud.rect(x + 6, y + 6, cw - 12, ch - 12, 0xf1ead4);
    hud.rect(x + cw / 2 - 26, y - 4, 52, 12, 0x8a93a6);
    hud.rect(x + cw / 2 - 18, y - 7, 36, 5, 0xc8d0da);
    const ink = 0x20202a, tx = x + 16, tw = cw - 32;
    hud.text(tx, y + 18, 'VERITY GENERAL  /  OR-7', { color: 0x6a6a72, shadow: false });
    hud.text(tx, y + 32, P.name, { color: ink, scale: 2, shadow: false });
    hud.text(tx, y + 54, `${P.age ? `AGE ${P.age}   ` : ''}${P.job}`, { color: 0x45454f, shadow: false });
    hud.rect(tx, y + 66, tw, 1, 0xa8a090);
    app.prompts.draw(hud, tx, y + 74, P.hook, { width: tw, color: 0x7a1020, lineH: 11 });
    hud.text(tx, y + 104, 'OBJECTIVE', { color: 0x6a6a72, shadow: false });
    app.prompts.draw(hud, tx, y + 116, P.objective, { width: tw, color: ink, lineH: 11 });
    // stamped op title
    const stampIn = Math.min(1, Math.max(0, (this.t - 0.4) * 6));
    if (stampIn > 0) {
      const label = this.def.title, tw2 = hud.measure(label, 2).width;
      const sx = x + cw - tw2 - 22, sy = y + ch - 44;
      hud.rect(sx - 5, sy - 5, tw2 + 10, 25, 0x9a1020);
      hud.rect(sx - 3, sy - 3, tw2 + 6, 21, 0xf1ead4);
      hud.text(sx, sy, label, { color: 0x9a1020, scale: 2, shadow: false });
      if (!this.stamped) { this.stamped = true; ctx.audio.play('stamp'); app.shake(0.3); }
    }
    hud.text(tx, y + ch - 28, this.def.surgeon === 'sabine' ? 'SURGEON: DR. ACHTERBERG' : 'SURGEON: DR. MARSH', { color: 0x45454f, shadow: false });
    app.prompts.strip(hud, 10, H - 13, [['confirm', 'SCRUB IN']]);
    if (this.t > 0.5 && (app.devices.nav.confirm || app.devices.click(ctx.input))) { if (!this.left) { this.left = true; ctx.audio.play('uiConfirm'); this.opts.onGo(); } }
  }
}
