// Results: the chart drops in, lines tally one at a time with ticks, the rank stamp slams, Reyes comments,
// then the patient's follow-up line. Also the shift report at the very end.
import { App } from '../app.js';
import { OPS, CAMPAIGN_OPS } from '../content/ops/index.js';
import { recordOp, goCampaign, toTitle } from './flow.js';
import { finalTally } from '../sim/scoring.js';
import { BustRig } from '../view/bust.js';
import { applyLook } from '../view/looks.js';
import { SetView } from '../view/sets.js';
import { Stage } from './stage.js';

const RANK_COLOR = { S: 0xf4c430, A: 0x38b764, B: 0x3b5dc9, C: 0xb13e53 };
const COMMENTS = {
  reyes: {
    S: ['...Adequate. I will deny having said so.', "That was correct. Don't let it go to your head. It's not attached to anything useful."],
    A: ['Competent. Write that down. You will not hear it twice.', 'Hm. You may finish your coffee.'],
    B: ['The patient lived. That is the job. Barely.', 'Passable. Passable is a word for gravy, Doctor.'],
    C: ["They'll keep breathing. Do better.", 'I have seen sharper work from the vending machine.'],
  },
  sabine: {
    S: ['No notes.', 'I have reviewed the report. It is short. That is praise.'],
    A: ['Adequate.', 'You may tell people I said so. They will not believe you.'],
    B: ['Acceptable, in the sense that nobody is suing.', 'You have two options. Improve is one.'],
    C: ['They lived. I do not know why. Neither do you.', 'I will be writing this one down.'],
  },
};
const OP1_C = "He'll keep the arm. Do better.";

export class ResultsStage extends Stage {
  name = 'results';
  constructor(o) {
    super();
    this.o = o;
    this.def = OPS[o.opId];
    this.tally = finalTally(o.sim);
    this.lineI = -1;
    this.lineT = 0;
    this.shown = 0;
    this.slide = 0;
    this.stampT = -1;
    this.phase = 0;
    this.chars = 0;
    this.commentChars = 0;
    this.followChars = 0;
    this.pristineT = -1;
    recordOp(o.opId, this.tally, o.mode);
    this.lines = [
      ['TIME LEFT', this.tally.time], ['VITALS', this.tally.vitals], ['TECHNIQUE', this.tally.technique],
      ['BEST STREAK', `x${this.tally.bestStreak}`], ['MISTAKES', this.tally.mistakes],
    ];
    if (this.tally.penalty) this.lines.push(['SECOND LOOKS', -this.tally.penalty]);
    this.lines.push(['TOTAL', this.tally.total]);
    const pool = COMMENTS[this.def.id === 'op9' || this.def.surgeon === 'sabine' ? 'sabine' : 'reyes'][this.tally.rank];
    this.comment = o.opId === 'op1' && this.tally.rank === 'C' ? OP1_C : pool[o.sim.tick % pool.length];
    this.commenter = this.def.id === 'op9' || this.def.surgeon === 'sabine' ? 'sabine' : 'reyes';
    this.follow = this.def.patient.followUp[this.tally.rank];
    this.seatRows = o.sim.seats.filter((s) => !s.bot).length > 1 ? o.sim.seats.filter((s) => !s.bot) : null;
  }
  cameraConfig = { preset: 'fixed', position: [0.2, 1.75, 5.1], target: [0, 1.42, 0], fov: 30, minZoom: 1, maxZoom: 1 };
  async build(ctx) {
    this.set = new SetView(ctx, 'or7');
    this.set.lampSwing = 0.02;
    this.bust = new BustRig(ctx, this.commenter);
    this.bust.object.position.set(1.62, 0, 0.2);
    this.bust.object.rotation.y = -0.3;
    ctx.scene.add(this.bust.object);
    this.key = ctx.lights.request({ position: [1, 3, 3.4], color: 0xfff0e0, intensity: 7, radius: 8, priority: 8 });
    applyLook(ctx.engine, App.save.settings);
    App.director.play(this.tally.rank === 'C' ? 'results-sad' : 'results-win', { now: true });
  }
  frame(ctx, dt, overlay) {
    this.set.update(dt, ctx.camera.camera.position);
    this.bust.update(dt);
    const cam = ctx.camera.camera;
    cam.position.set(0.2, 1.75, 5.1 * Math.max(1, (16 / 9) / Math.max(0.2, cam.aspect)));
    cam.lookAt(0, 1.42, 0);
    this.slide = Math.min(1, this.slide + dt * 2.6);
    if (this.slide < 1) return;
    if (this.phase === 0) {
      this.lineT += dt;
      if (this.lineT >= 0.34) {
        this.lineT = 0;
        this.shown++;
        App.sfx('tally', { pitch: this.shown });
        if (this.shown >= this.lines.length) { this.phase = 1; this.stampT = 0.3; }
      }
    } else if (this.phase === 1) {
      this.stampT -= dt;
      if (this.stampT <= 0) {
        this.phase = 2;
        this.slam = 1;
        App.sfx('stamp');
        App.shake(0.8);
        App.rumble({ strong: 1, weak: 0.6, ms: 250 });
        ctx.engine.hitstop(0.08);
        this.bust.setEmotion(this.tally.rank === 'C' ? 'stern' : this.tally.rank === 'S' ? 'smile' : 'neutral');
        if (this.tally.pristine) { this.pristineT = 0.5; }
      }
    } else if (this.phase === 2) {
      this.commentChars += dt * 34;
      const i = Math.floor(this.commentChars);
      if (i !== this.lastSyl && i < this.comment.length) { this.lastSyl = i; if (App.voiceChar(this.commenter, this.comment, i)) this.bust.syllable(); }
      if (this.commentChars >= this.comment.length + 24) this.phase = 3;
    } else if (this.phase === 3) {
      this.followChars += dt * 30;
    }
    if (this.pristineT > 0) { this.pristineT -= dt; if (this.pristineT <= 0) { App.sfx('stamp', { pitch: 7 }); App.flash('sand', { duration: 0.2, strength: 0.5 }); this.pristineShown = true; } }
    this.slam = Math.max(0, (this.slam ?? 0) - dt * 4);
    if (overlay) return;
    const d = App.devices;
    if (d.nav.confirm || d.click) {
      if (this.phase < 3) {
        this.shown = this.lines.length;
        if (this.phase < 2) { this.phase = 1; this.stampT = 0; }
        else { this.commentChars = this.comment.length + 30; this.phase = 3; this.followChars = 999; }
        return;
      }
      if (this.followChars < this.follow.length) { this.followChars = 999; return; }
      App.sfx('uiConfirm');
      this.leave();
    }
  }
  async leave() {
    if (this.leaving) return;
    this.leaving = true;
    if (this.o.mode === 'story') return goCampaign();
    if (this.o.mode === 'consult') {
      const { ConsultStage } = await import('./consult.js');
      return App.goto(new ConsultStage());
    }
    if (this.o.mode === 'replay' && this.o.fromLog) {
      const { LogStage } = await import('./log.js');
      return App.goto(new LogStage(this.o.opId));
    }
    return toTitle();
  }
  draw(ctx, ui) {
    const w = ui.w, h = ui.h;
    const cw = Math.min(250, w * 0.56), ch = Math.min(190, h - 62);
    const x = 14, y = 16 + (1 - this.slide) * -h;
    ui.clipboard(x, y, cw, ch);
    const ink = 0x28203a;
    ui.text(x + 10, y + 12, this.def.title, { color: ink, shadow: false });
    ui.text(x + 10, y + 22, this.def.patient.name, { color: 0x7a6a4a, shadow: false });
    ui.rect(x + 10, y + 32, cw - 20, 1, 0xa89a78);
    if (this.seatRows) {
      this.seatRows.forEach((s, i) => {
        const yy = y + 38 + i * 12;
        ui.rect(x + 10, yy, 8, 8, ['red', 'sky', 'lime', 'sand'][i % 4]);
        ui.text(x + 22, yy, s.name ?? `SEAT ${i + 1}`, { color: ink, shadow: false });
        ui.right(x + cw - 10, yy, String(Math.round(s.score)), { color: ink, shadow: false });
      });
      this.lines.slice(0, this.shown).forEach((l, i) => {
        if (i < 4 && l[0] !== 'TOTAL') return;
        const yy = y + 38 + this.seatRows.length * 12 + 4;
        ui.text(x + 10, yy, 'TOTAL', { color: ink, shadow: false });
        ui.right(x + cw - 10, yy, String(l[1]), { color: ink, shadow: false });
      });
    } else {
      this.lines.slice(0, this.shown).forEach((l, i) => {
        const yy = y + 38 + i * 12;
        const isT = l[0] === 'TOTAL';
        ui.text(x + 10, yy, l[0], { color: isT ? 0x8a1f38 : ink, shadow: false });
        ui.right(x + cw - 10, yy, String(l[1]), { color: isT ? 0x8a1f38 : ink, shadow: false });
      });
    }
    if (this.phase >= 2) {
      const scale = 7 + Math.round((this.slam ?? 0) * 6);
      ui.stamp(x + cw - 34, y + ch - 30, this.tally.rank, RANK_COLOR[this.tally.rank], Math.min(8, scale));
      if (this.pristineShown) ui.stamp(x + 56, y + ch - 20, 'PRISTINE', 0xc99a1a, 1);
    }
    // The comment, the follow-up.
    const by = h - 58;
    if (this.phase >= 2) {
      ui.rect(8, by, w - 16, 52, 'night');
      ui.outline(8, by, w - 16, 52, 'mist');
      const nm = this.commenter === 'sabine' ? 'DR. ACHTERBERG' : 'NURSE REYES';
      ui.text(16, by + 4, nm, { color: 'sand', shadow: false });
      ui.text(16, by + 15, this.comment.slice(0, Math.floor(this.commentChars)), { color: 'white', shadow: false });
      if (this.phase >= 3) {
        const lines = ui.wrap(this.follow, w - 36);
        let left = Math.floor(this.followChars);
        lines.slice(0, 2).forEach((l, i) => { ui.text(16, by + 28 + i * 10, l.slice(0, Math.max(0, left)), { color: 'mist', shadow: false }); left -= l.length + 1; });
        if (Math.sin(this.t * 5) > -0.2) ui.action(w - 14 - ui.actionWidth('confirm'), by + 40, 'confirm');
      }
    }
  }
  showCursor() { return App.devices.last === 'kbm'; }
  status() { return `results ${this.def.id} rank=${this.tally.rank} total=${this.tally.total}`; }
  dispose() { this.key?.release(); }
}

/** The end of the shift: every rank, a stamp each, then credits and back to title. */
export class ShiftReportStage extends Stage {
  name = 'shiftreport';
  cameraConfig = { preset: 'fixed', position: [4.5, 3.6, 5.8], target: [0, 1, -3], fov: 44, minZoom: 1, maxZoom: 1 };
  async build(ctx) {
    this.set = new SetView(ctx, 'morning');
    this.page = 0;
    this.creditT = 0;
    App.director.play('credits', { now: true });
    applyLook(ctx.engine, App.save.settings);
    if (App.save.progress) { App.save.progress.finished = true; App.persist(); }
  }
  frame(ctx, dt, overlay) {
    this.set.update(dt, ctx.camera.camera.position);
    const cam = ctx.camera.camera;
    cam.position.set(4.5 + Math.sin(this.t * 0.1), 3.6, 5.8);
    cam.lookAt(0, 1, -3);
    if (overlay) return;
    const d = App.devices;
    if (this.page === 1) this.creditT += dt * 12;
    if (d.nav.confirm || d.click) {
      App.sfx('uiConfirm');
      if (this.page === 0) this.page = 1;
      else toTitle('title');
    }
  }
  draw(ctx, ui) {
    const w = ui.w, h = ui.h;
    if (this.page === 0) {
      const cw = Math.min(340, w - 30), ch = Math.min(226, h - 24);
      const x = (w - cw) / 2, y = (h - ch) / 2 + 2;
      ui.clipboard(x, y, cw, ch);
      const ink = 0x28203a;
      ui.text(x + 12, y + 12, 'SHIFT REPORT', { color: ink, scale: 2, shadow: false });
      ui.text(x + 12, y + 32, 'DR. I. MARSH. VERITY GENERAL. SIGNED OFF.', { color: 0x7a6a4a, shadow: false });
      CAMPAIGN_OPS.forEach((o, i) => {
        const yy = y + 45 + i * 15;
        const r = App.save.log[o.id];
        ui.text(x + 12, yy, `${o.num}`.padStart(2, ' '), { color: 0x7a6a4a, shadow: false });
        ui.text(x + 30, yy, o.title, { color: ink, shadow: false });
        if (r) {
          ui.stamp(x + cw - 24, yy + 3, r.rank, RANK_COLOR[r.rank], 1);
          if (r.pristine) ui.text(x + cw - 84, yy, 'PRISTINE', { color: 0xc99a1a, shadow: false });
        }
      });
      ui.action(x + cw - 6 - ui.actionWidth('confirm'), y + ch - 13, 'confirm');
    } else {
      const lines = ['THE RAIN STOPPED.', '', 'THE TRUTH, STAT.', '', '', 'A GAME WRITTEN IN CODE, ALL OF IT.', '', 'ART, MUSIC, VOICES: CODE.', 'ENGINE: PIXEL ENGINE (MIT).', 'THREE.JS (MIT). RAPIER (APACHE-2.0).', 'FURNITURE KIT BY KENNEY (CC0).', '', '', 'NO ONE SHOULD HURT, HE SAID, ONCE.', 'NOW HE TELLS THEM: IT IS INFORMATION.', '', '', 'OPERATING LOG UNLOCKED.', '', 'YOU HAVE A SEVEN A.M.'];
      lines.forEach((l, i) => {
        const y = h + i * 14 - this.creditT;
        if (y > -10 && y < h) ui.center(y, l, { color: 'white', shadow: 'ink' });
      });
      ui.hints([['confirm', 'TITLE']], h - 12);
    }
  }
  status() { return 'shift report'; }
}
