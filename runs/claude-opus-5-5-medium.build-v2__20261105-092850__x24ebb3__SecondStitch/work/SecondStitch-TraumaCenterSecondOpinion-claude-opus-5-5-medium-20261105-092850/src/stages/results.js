// Results: the chart drops in, lines tally with ticks, the rank stamp slams, Reyes comments, then the patient's follow-up.
import { app } from '../core/app.js';
import { Stage, setView } from './stage.js';
import { OPS } from '../content/ops/index.js';
import { buildSet } from '../view/sets.js';

const COMMENT = {
  S: ['...Adequate.', "Don't get used to the feeling.", 'I have seen worse. From better.'],
  A: ['That will do. Barely.', 'Your hands are improving. Your face is not.'],
  B: ['He will keep it. Do better.', "It'll hold. Probably."],
  C: ["He'll keep the arm. Do better.", 'I have seen tidier work from a raccoon.'],
};
export class ResultsStage extends Stage {
  name = 'results';
  constructor(opts) { super(); this.opts = opts; this.def = OPS[opts.op]; this.t = 0; this.line = -1; }
  async build(ctx) { this.set = await buildSet(ctx, 'or7'); app.applyLook(1, 0.4, 0); app.director?.play('results'); this.rows = this.buildRows(); }
  buildRows() {
    const r = this.opts.res;
    return [['TECHNIQUE', r.technique], ['TIME', r.timeBonus], ['VITALS', r.vitalBonus], ['BEST STREAK', r.bestStreak], ['MISTAKES', r.mistakes], ...(r.looks ? [['SECOND LOOKS', `-${r.looks * 5}%`]] : []), ['TOTAL', r.total]];
  }
  status() { return `results ${this.def.id} rank=${this.opts.res.rank}`; }
  update(ctx, dt) {
    app.devices.poll(ctx, dt);
    this.t += dt;
    this.set.update(dt);
    app.director?.update(dt);
    setView(ctx, [2.6, 3.1, 4.8], [0, 1, 0], 34);
    const { hud } = ctx, W = hud.width, H = hud.height, R = this.opts.res;
    hud.clear();
    const cw = Math.min(340, W - 20), ch = Math.min(232, H - 20), x = Math.round(W / 2 - cw / 2), drop = Math.max(0, 1 - this.t * 4), y = Math.round((H - ch) / 2 - drop * 260);
    hud.rect(x, y, cw, ch, 0x7a5430); hud.rect(x + 5, y + 5, cw - 10, ch - 10, 0xf1ead4);
    const ink = 0x20202a, tx = x + 14;
    hud.text(tx, y + 12, this.def.title, { color: ink, scale: 2, shadow: false });
    hud.text(tx, y + 32, this.def.patient.name, { color: 0x6a6a72, shadow: false });
    const nShown = Math.min(this.rows.length, Math.floor((this.t - 0.4) / 0.28));
    if (nShown > this.line) { this.line = nShown; if (nShown > 0) { ctx.audio.play('tick'); ctx.audio.play('uiMove'); } }
    for (let i = 0; i < nShown; i++) {
      const [label, val] = this.rows[i], ry = y + 46 + i * 12, last = label === 'TOTAL';
      hud.text(tx, ry, label, { color: last ? ink : 0x45454f, shadow: false });
      const v = String(val);
      hud.text(tx + 150 - hud.measure(v).width, ry, v, { color: ink, shadow: false });
    }
    const stampT = 0.4 + this.rows.length * 0.28 + 0.3;
    if (this.t > stampT) {
      if (!this.slammed) { this.slammed = true; ctx.audio.play('stamp'); app.shake(0.6); app.rumble(0.8, 0.6, 180); }
      const k = Math.max(1, 3 - (this.t - stampT) * 12), big = Math.round(6 * k) ;
      const sc = Math.min(8, big), lw = hud.measure(R.rank, sc).width;
      const col = R.rank === 'S' ? 0xc08a10 : R.rank === 'A' ? 0x2b7a40 : R.rank === 'B' ? 0x2b5a9a : 0x9a1020;
      const sx = x + cw - 70 - lw / 2, sy = y + 72 - (7 * sc) / 2;
      hud.rect(sx - 8, sy - 8, lw + 16, 7 * sc + 16, col);
      hud.rect(sx - 5, sy - 5, lw + 10, 7 * sc + 10, 0xf1ead4);
      hud.text(Math.round(sx), Math.round(sy), R.rank, { color: col, scale: sc, shadow: false });
      if (R.pristine) { const t = 'PRISTINE', w = hud.measure(t).width; hud.rect(x + cw - 70 - w / 2 - 3, y + 118, w + 6, 11, 0xc08a10); hud.text(x + cw - 70 - w / 2, y + 120, t, { color: 0xffffff, shadow: false }); }
    }
    if (this.t > stampT + 0.6) {
      const list = COMMENT[R.rank]; const line = list[(this.def.n ?? 0) % list.length];
      hud.text(tx, y + ch - 62, 'NURSE REYES', { color: 0x9a1020, shadow: false });
      app.prompts.draw(hud, tx, y + ch - 52, line, { width: cw - 30, color: ink });
    }
    if (this.t > stampT + 1.2) {
      hud.text(tx, y + ch - 36, 'AFTERWARD', { color: 0x6a6a72, shadow: false });
      app.prompts.draw(hud, tx, y + ch - 26, this.def.patient.followUp[R.rank] ?? this.def.patient.followUp.C, { width: cw - 30, color: 0x45454f });
    }
    app.prompts.strip(hud, 10, H - 13, [['confirm', 'NEXT']]);
    const go2 = app.devices.nav.confirm || app.devices.click(ctx.input);
    if (go2) { if (this.t < stampT + 1.2) this.t = stampT + 1.3; else if (!this.left) { this.left = true; ctx.audio.play('uiConfirm'); this.opts.onDone(); } }
  }
}
