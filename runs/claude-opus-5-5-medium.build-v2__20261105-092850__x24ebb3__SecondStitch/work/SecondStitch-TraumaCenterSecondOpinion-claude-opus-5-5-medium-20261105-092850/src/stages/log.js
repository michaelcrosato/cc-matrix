// Operating Log: one chart at a time, flip with left/right. Best rank and a patient line.
import { app } from '../core/app.js';
import { Stage, go, setView } from './stage.js';
import { OPS, CAMPAIGN_OPS } from '../content/ops/index.js';
import { buildSet } from '../view/sets.js';

export class LogStage extends Stage {
  name = 'log';
  i = 0; t = 0;
  async build(ctx) { this.set = await buildSet(ctx, 'ward'); app.applyLook(1, 0.4, 0); app.director?.play('ward'); this.list = CAMPAIGN_OPS.filter((id) => app.save.cleared[id]); if (!this.list.length) this.list = []; }
  status() { return `log ${this.i}`; }
  update(ctx, dt) {
    app.devices.poll(ctx, dt);
    if (app.devices.idle >= 10) { import('./flow.js').then(({ startAttract }) => startAttract()); }
    this.t += dt;
    this.set.update(dt); app.director?.update(dt);
    setView(ctx, [3.8, 2.4, 6.4], [0, 1, 0], 34);
    const { hud } = ctx, W = hud.width, H = hud.height, n = app.devices.nav;
    hud.clear();
    if (n.back || app.devices.rightClick(ctx.input)) { ctx.audio.play('uiBack'); import('./flow.js').then(({ backToMain }) => backToMain()); return; }
    if (!this.list.length) { hud.text(20, 40, 'NOTHING CLEARED YET.', { color: 0xffffff }); return; }
    if (n.left) { this.i = (this.i - 1 + this.list.length) % this.list.length; ctx.audio.play('uiMove'); this.t = 0; }
    if (n.right) { this.i = (this.i + 1) % this.list.length; ctx.audio.play('uiMove'); this.t = 0; }
    const def = OPS[this.list[this.i]], P = def.patient, rank = app.save.ranks[def.id] ?? 'C';
    const cw = Math.min(330, W - 40), ch = Math.min(200, H - 40), x = Math.round(W / 2 - cw / 2), y = Math.round((H - ch) / 2 - Math.max(0, 1 - this.t * 6) * 40);
    hud.rect(x, y, cw, ch, 0x7a5430); hud.rect(x + 5, y + 5, cw - 10, ch - 10, 0xf1ead4);
    const ink = 0x20202a, tx = x + 16;
    hud.text(tx, y + 14, `OP ${def.n}`, { color: 0x6a6a72, shadow: false });
    hud.text(tx, y + 26, def.title, { color: ink, scale: 2, shadow: false });
    hud.text(tx, y + 48, P.name, { color: 0x45454f, shadow: false });
    app.prompts.draw(hud, tx, y + 62, P.followUp[rank] ?? '', { width: cw - 90, color: ink });
    hud.text(tx, y + 110, `BEST ${app.save.scores[def.id] ?? 0}`, { color: 0x45454f, shadow: false });
    const col = rank === 'S' ? 0xc08a10 : rank === 'A' ? 0x2b7a40 : rank === 'B' ? 0x2b5a9a : 0x9a1020;
    hud.text(x + cw - 54, y + 18, rank, { color: col, scale: 5, shadow: false });
    if (app.save.pristine?.[def.id]) hud.text(x + cw - 66, y + 62, 'PRISTINE', { color: 0xc08a10, shadow: false });
    hud.text(tx, y + ch - 22, `${this.i + 1} / ${this.list.length}`, { color: 0x6a6a72, shadow: false });
    // arrows clickable
    hud.text(x - 14, Math.round(y + ch / 2), '<', { color: 0xffd24d, scale: 2 }); hud.text(x + cw + 3, Math.round(y + ch / 2), '>', { color: 0xffd24d, scale: 2 });
    app.prompts.strip(hud, 10, H - 13, [['confirm', 'OPERATE'], ['back', 'BACK']]);
    const c = app.devices.click(ctx.input);
    if (c && c.x < x) { this.i = (this.i - 1 + this.list.length) % this.list.length; this.t = 0; }
    else if (c && c.x > x + cw) { this.i = (this.i + 1) % this.list.length; this.t = 0; }
    else if (n.confirm || c) import('./flow.js').then(({ replayOp }) => replayOp(def.id));
    void go;
  }
}
