// Consult: couch co-op. Up to 4 seats; keyboard and mouse plus pads. Press to scrub in, back out to leave, seat 1 starts.
import { app } from '../core/app.js';
import { Stage, go, setView } from './stage.js';
import { CONSULT_OPS, OPS } from '../content/ops/index.js';
import { buildSet, buildFigure } from '../view/sets.js';
import { OperationStage } from './operation.js';
import { ResultsStage } from './results.js';
import { BTN } from '../input/devices.js';

const COLORS = [0x57c7ff, 0xff6b6b, 0x7fffa0, 0xffd24d];
export class ConsultStage extends Stage {
  name = 'consult';
  seats = []; pick = 0; t = 0; figs = [];
  async build(ctx) {
    this.set = await buildSet(ctx, 'or7');
    app.applyLook(1, 0.45, 0); app.director?.play('or-calm');
    this.list = CONSULT_OPS.filter((id) => id === 'pileup' || app.save.cleared[id]);
    for (let i = 0; i < 4; i++) { const f = buildFigure(ctx, 'ilya', this.set.group, [-1.8 + i * 1.2, 0, 2.2], 0.2 - i * 0.1, { masked: true, scrub: ['teal', 'plum', 'green', 'orange'][i], tag: `consult${i}`, style: 'bald', cap: ['sky', 'red', 'lime', 'sand'][i] }); f.obj.visible = false; this.figs.push(f); }
  }
  status() { return `consult seats=${this.seats.length} pick=${this.list?.[this.pick]}`; }
  devicesHeld() { return this.seats.map((s) => s.device); }
  update(ctx, dt) {
    const devs = app.devices;
    devs.poll(ctx, dt);
    if (devs.idle >= 10) { import('./flow.js').then(({ startAttract }) => startAttract()); }
    this.t += dt;
    this.set.update(dt); app.director?.update(dt);
    this.figs.forEach((f, i) => { f.obj.visible = i < this.seats.length; f.update(dt); });
    setView(ctx, [2.5, 2.8, 7], [0, 1, 0], 34);
    const { hud } = ctx, W = hud.width, H = hud.height, input = ctx.input;
    hud.clear();
    const add = (device) => {
      if (this.seats.length < 4 && !this.seats.some((s) => s.device === device)) { this.seats.push({ device }); ctx.audio.play('uiConfirm'); return true; }
      return false;
    };
    // join / leave
    const kbmConfirm = input.wasPressed('Enter') || input.wasPressed('MouseLeft');
    const kbmBack = input.wasPressed('Escape') || input.wasPressed('MouseRight');
    let start = false, back = false;
    if (this.seats.some((s) => s.device === 'kbm')) { if (kbmConfirm && this.seats[0].device === 'kbm') start = true; if (kbmBack) { if (this.seats[0].device === 'kbm' && this.seats.length === 1) back = true; this.seats = this.seats.filter((s) => s.device !== 'kbm'); ctx.audio.play('uiBack'); } } else {
      if (kbmConfirm) add('kbm');
      if (kbmBack && !this.seats.length) back = true;
    }
    for (const pad of devs.pads) {
      if (!pad) continue;
      const hit = (b) => pad.buttons[b] > 0.5 && !(pad.prev[b] > 0.5);
      if (this.seats.some((s) => s.device === pad.index)) {
        if (hit(BTN.CROSS) && this.seats[0].device === pad.index) start = true;
        if (hit(BTN.CIRCLE)) { this.seats = this.seats.filter((s) => s.device !== pad.index); ctx.audio.play('uiBack'); }
      } else {
        if (hit(BTN.CROSS)) add(pad.index);
        if (hit(BTN.CIRCLE) && !this.seats.length) back = true;
      }
    }
    if (back) { import('./flow.js').then(({ backToMain }) => backToMain()); return; }
    if (devs.nav.left || devs.nav.right) { this.pick = (this.pick + (devs.nav.right ? 1 : -1) + this.list.length) % this.list.length; ctx.audio.play('uiMove'); }
    if (start && this.seats.length) { this.startRound(); return; }
    // draw
    const title = 'CONSULT', tw = hud.measure(title, 3).width;
    hud.text(Math.round(W / 2 - tw / 2), 12, title, { scale: 3, color: 0xf6f2e6, shadow: 0x5e1430 });
    const def = OPS[this.list[this.pick]];
    const label = `< ${def.title} >`, lw = hud.measure(label, 2).width;
    hud.text(Math.round(W / 2 - lw / 2), 44, label, { scale: 2, color: 0xffd24d });
    const obj = def.patient.objective, ow = hud.measure(obj).width;
    hud.text(Math.round(W / 2 - ow / 2), 64, obj, { color: 0x8ad0ff });
    const sw = Math.min(96, Math.floor((W - 28) / 4));
    for (let i = 0; i < 4; i++) {
      const x = Math.round(W / 2 - (sw * 4 + 12) / 2 + i * (sw + 4)), y = 84;
      const s = this.seats[i];
      hud.rect(x, y, sw, 44, s ? 0x1a1f2b : 0x12141c);
      hud.rect(x, y, sw, 2, s ? COLORS[i] : 0x2a3142);
      hud.text(x + 5, y + 7, `SEAT ${i + 1}`, { color: s ? COLORS[i] : 0x5a6172 });
      hud.text(x + 5, y + 20, s ? (s.device === 'kbm' ? 'KEYS + MOUSE' : `PAD ${s.device + 1}`) : 'EMPTY', { color: s ? 0xffffff : 0x5a6172 });
      hud.text(x + 5, y + 31, s ? (i % 2 === 0 ? 'THE QUIET' : 'SECOND LOOK') : '', { color: 0x8a93a6 });
    }
    const line = this.seats.length ? 'SEAT 1: {confirm} TO START.  OTHERS: PRESS TO SCRUB IN.' : 'PRESS {confirm} OR CLICK TO SCRUB IN.';
    app.prompts.draw(hud, 12, H - 40, line, { width: W - 24, color: 0xffffff, center: true });
    app.prompts.strip(hud, 10, H - 13, [['confirm', 'SCRUB IN'], ['back', 'LEAVE']]);
    void go;
  }
  startRound() {
    const id = this.list[this.pick];
    const def = OPS[id];
    const seats = [...this.seats];
    const gifts = seats.map((_, i) => (i % 2 === 0 ? 'quiet' : 'look'));
    go(new OperationStage({ op: id, seats, gifts, consult: true, onWin: (res) => go(new ResultsStage({ op: id, res, onDone: () => go(new ConsultStage()) })) }), 'iris');
    void def;
  }
}
