// Results: the chart drops in, lines tally with ticks, the rank stamp slams, Reyes comments, the patient's follow-up.
import { THREE } from '../../pixel-engine.js';
import { app } from '../app.js';
import { go, swap } from '../core/nav.js';
import { BY_ID } from '../content/ops/index.js';
import { recordResult, CAMPAIGN } from '../sim/campaign.js';
import { ctext, mtext, textW, wrap, bar, prompts } from '../ui/hud.js';
import { fmtTime } from '../ui/hud.js';
import { buildSet } from '../view/sets.js';
import { LOOK } from '../core/look.js';
import { pick } from '../content/lines.js';
import { Speaker } from '../audio/speak.js';
const REYES = { S: 'Pristine hands, Doctor. I am *suspicious*.', A: '...Adequate. Do not let it go to your head. It is not attached to anything useful.', B: 'Acceptable. Do better. I believe you can. That is the problem.', C: 'He will keep the arm. Do better.' };
export class ResultsStage {
  name = 'Results';
  constructor(a) { this.a = a; this.def = BY_ID[a.opId]; }
  async setup(ctx) {
    this.ctx = ctx; this.t = 0; this.res = this.a.res; const sim = this.a.sim;
    ctx.engine.setLook(LOOK(1, 0.4, 0)); ctx.engine.sun.intensity = 0.3; ctx.engine.ambient.intensity = 0.3;
    this.set = buildSet(ctx, 'or7'); const c = ctx.camera.camera; c.position.set(0, 4.6, 8.6); c.lookAt(0, 1.6, 0); this.lines = [];
    const r = this.res; const per = this.a.sim.per;
    this.rows = [['TIME LEFT', fmtTime(r.timeLeft), `+${r.timeBonus}`], ['VITALS', `${r.vit}`, `+${r.vitBonus}`], ['TECHNIQUE', `${r.clean}C ${r.good}G ${r.sloppy}S`, `${r.points}`], ['BEST STREAK', `${r.maxStreak}`, ''], ['MISTAKES', `${r.mistakes}`, r.mistakes ? `-${r.mistakes * 150}` : '0']];
    this.shown = 0; this.stamped = false; this.speaker = new Speaker(app); this.rankPlay = r.rank;
    if (!this.a.noSave && !this.a.a?.noSave && !app.attractActive) { recordResult(app.save, this.def.id, r); if (this.def.id === 'op3') app.save.quietOn = true; app.flush(); }
    ctx.audio.stopLoops(); app.director.start(ctx, r.rank === 'C' ? 'results-sad' : 'results', 0);
    this.fu = (this.def.patient.followUp[r.rank] || this.def.patient.followUp.C); this.rc = REYES[r.rank];
    this.state = 'tally'; this.tt = 0; this.done = false; this.act0 = app.devices.activity;
  }
  cameraTarget() { return new THREE.Vector3(0, 1.6, 0); }
  status() { return `results ${this.def.id} rank ${this.res.rank} total ${this.res.total}`; }
  update(ctx, dt) {
    const hud = ctx.hud, dev = app.devices; dev.poll(dt, ctx); const nav = dev.nav; this.t += dt; this.set.update(dt, this.t);
    hud.clear(); const w = hud.width, h = hud.height;
    if (this.a.attract && dev.activity !== this.act0) return go.title(ctx, { swallow: true });
    // the chart drops in
    const drop = Math.min(1, this.t / 0.6), y0 = Math.round(-200 + 200 * (1 - Math.pow(1 - drop, 3)) + 8), cw = 320, cx = Math.round((w - cw) / 2);
    hud.rect(cx - 2, y0 - 2, cw + 4, h - 16, 'slate'); hud.rect(cx, y0, cw, h - 20, 'white'); hud.rect(cx + cw / 2 - 16, y0 - 6, 32, 8, 'ink');
    hud.text(cx + 8, y0 + 8, 'OPERATIVE REPORT', { color: 'ink', shadow: false, scale: 2 }); hud.text(cx + 8, y0 + 26, `${this.def.patient.name}  ${this.def.patient.age ? 'AGE ' + this.def.patient.age : ''}`, { color: 'navy', shadow: false }); hud.text(cx + 8, y0 + 35, this.def.title, { color: 'red', shadow: false });
    this.tt += dt; const per = 0.55; const n = Math.min(this.rows.length, Math.floor(Math.max(0, this.t - 0.8) / per) + 1); if (this.t > 0.8 && n > this.shown) { this.shown = n; ctx.audio.play('tick', { pitch: n }); }
    this.rows.forEach((r, i) => { if (i >= this.shown) return; const yy = y0 + 52 + i * 14; hud.text(cx + 10, yy, r[0], { color: 'ink', shadow: false }); hud.text(cx + 120, yy, r[1], { color: 'navy', shadow: false }); hud.text(cx + cw - 12 - textW(hud, r[2]), yy, r[2], { color: r[2].startsWith('-') ? 'red' : 'green', shadow: false }); hud.rect(cx + 10, yy + 9, cw - 20, 1, 'mist'); });
    const doneRows = this.t > 0.8 + this.rows.length * per + 0.3;
    if (doneRows) { hud.text(cx + 10, y0 + 52 + 5 * 14 + 4, 'TOTAL', { color: 'ink', shadow: false, scale: 2 }); hud.text(cx + 120, y0 + 52 + 5 * 14 + 4, String(this.res.total), { color: 'navy', shadow: false, scale: 2 }); }
    const st = this.t - (0.8 + this.rows.length * per + 0.9);
    if (st > 0) {
      if (!this.stamped) { this.stamped = true; ctx.audio.play('stamp'); ctx.engine.shake.add(app.settings.shake ? 0.8 : 0); ctx.engine.hitstop?.(0.1); app.devices.rumbleAll(1, 1, 250); if (this.res.rank === 'S') ctx.audio.play('fanfare'); this.speaker.start('reyes', this.rc.replace(/\*/g, '')); }
      const k = Math.min(1, st / 0.2), sc = 11 - Math.round(4 * k), col = { S: 'sand', A: 'lime', B: 'sky', C: 'orange' }[this.res.rank];
      const rx = cx + cw - 54 - (sc - 7) * 3, ry = y0 + 118 - (sc - 7) * 3; hud.rect(rx - 8, ry - 6, 58, 48, 'white'); hud.text(rx, ry, this.res.rank, { scale: sc, color: col, shadow: 'ink' }); if (this.res.pristine) hud.text(rx - 70, ry + 4, 'PRISTINE', { color: 'sand', scale: 1, shadow: 'ink' }); if (this.res.capped) hud.text(rx - 78, ry + 18, `CAPPED AT ${this.res.capped}`, { color: 'red', shadow: false });
      this.speaker.update(ctx, dt);
      const ty = y0 + 52 + 5 * 14 + 28; hud.text(cx + 10, ty, 'REYES:', { color: 'red', shadow: false }); wrap(hud, this.speaker.shown, cw - 70).slice(0, 3).forEach((l, i) => mtext(hud, cx + 52, ty + i * 9, l, { color: 'ink', hi: 'red', shadow: false }));
      if (st > 2.2) { hud.text(cx + 10, ty + 34, 'FOLLOW-UP:', { color: 'navy', shadow: false }); wrap(hud, this.fu, cw - 24).slice(0, 3).forEach((l, i) => hud.text(cx + 10, ty + 44 + i * 9, l, { color: 'ink', shadow: false })); this.done = true; }
    }
    if (this.done) { prompts(hud, app, [{ act: 'confirm', label: this.a.consult ? 'BACK TO CONSULT' : 'CONTINUE' }], 'center', h - 14); if (nav.confirm || nav.click) this.next(ctx); }
    else if (nav.confirm || nav.click) { if (this.t < 0.8 + this.rows.length * per + 0.5) this.t = 0.8 + this.rows.length * per + 0.5; }
    if (this.a.attract && this.t > 9) go.attractNext?.(ctx, this.a.attract);
  }
  next(ctx) {
    if (this.leaving) return; this.leaving = true; ctx.audio.play('uiOk');
    if (this.a.consult) return go.consult(ctx); if (this.a.attract) return go.attractNext?.(ctx, this.a.attract);
    if (this.a.replay) return go.menu(ctx);
    const idx = CAMPAIGN.findIndex((s) => s.op === this.def.id); const nx = CAMPAIGN[idx + 1]; if (!nx) return go.menu(ctx);
    go.story(ctx, nx.scene, { next: () => (nx.op ? go.briefing(ctx, nx.op) : go.credits(ctx)) });
  }
  dispose() {}
}
