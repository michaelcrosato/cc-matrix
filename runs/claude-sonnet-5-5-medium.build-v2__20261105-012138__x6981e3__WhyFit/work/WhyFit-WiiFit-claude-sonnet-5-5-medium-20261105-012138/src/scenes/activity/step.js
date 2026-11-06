// Step Class: footprints scroll to a hit line at 104 BPM. L1/L2/F for the left foot, R1/R2/J for the right.
import { LaneActivity } from './lane.js';
import { T } from '../../core/tunables.js';
import { SKILLS } from '../../core/drivers.js';
import { notes, songLength, STEP_BPM, barLen, BARS } from '../../data/charts.js';
import { say } from '../../ui/font.js';
import { panel, bar } from '../../ui/widgets.js';
import { place } from '../../art/world.js';
import { SONGS } from '../../audio/songs.js';
import { Decals } from '../../../pixel-engine.js';

export class StepActivity extends LaneActivity {
  constructor(app, args) { super(app, args); this.notes = notes(); this.len = songLength(); }
  get duration() { return this.len + 1.5; }
  goal() { return 'Step on the beat. Left foot, right foot. Perfect is within a hair. Good is within two.'; }
  controls() { return [['footL', 'Left foot'], ['footR', 'Right foot']]; }
  win() { return { p: 0.055 * T.stepWindow, g: 0.1 * T.stepWindow, o: 0.14 * T.stepWindow }; }
  async stageExtra(ctx) {
    for (const l of this.lanes) { l.st = this.fresh(); l.plat = place(ctx, 'step-platform', [l.x, 0, 0.1], { scale: 1.1 }); }
  }
  fresh() { return { idx: 0, P: 0, G: 0, O: 0, M: 0, combo: 0, best: 0, flash: 0, grade: '', used: new Set(), t0: 0 }; }
  resetLanes() { for (const l of this.lanes) l.st = this.fresh(); }
  /** The beat clock: game time minus the user offset. */
  beat() { return (this.phase === 'play' ? this.playT : this.phase === 'practice' ? this.phaseT : -1) - T.stepOffsetMs / 1000; }
  onPlayStart() { this.app.music('step'); }
  onOutro() { this.app.stopMusic(); }
  botControl(l, inp, dt) {
    const sk = SKILLS[l.driver.skill]; if (!sk) return;
    const errMs = { sloppy: 85, average: 52, good: 30, expert: 12 }[l.driver.skill] ?? 60, missP = { sloppy: 0.35, average: 0.12, good: 0.04, expert: 0.01 }[l.driver.skill] ?? 0.1;
    const t = this.beat(), st = l.st;
    for (let i = st.idx; i < this.notes.length; i++) {
      const n = this.notes[i]; if (n.t > t + 0.2) break;
      const h = Math.sin(i * 12.9898 + l.idx * 78.233) * 43758.5453; const r = h - Math.floor(h), r2 = Math.sin(i * 4.1 + l.idx) * 0.5 + 0.5;
      const when = n.t + (r - 0.5) * 2 * errMs / 1000;
      if (!st.fired?.has(i) && t >= when) { (st.fired ??= new Set()).add(i); if (r2 > missP) { if (n.foot === 'L') inp.stepL = true; else inp.stepR = true; } }
    }
  }
  laneStep(l, inp, dt) {
    const st = l.st, t = this.beat(), W = this.win();
    // misses: notes that slipped past the OK window
    while (st.idx < this.notes.length && this.notes[st.idx].t < t - W.o) { if (!st.used.has(st.idx)) { st.M++; st.combo = 0; st.grade = 'Miss'; } st.idx++; }
    for (const [pressed, foot] of [[inp.stepL, 'L'], [inp.stepR, 'R']]) {
      if (!pressed) continue;
      if (l.kind === 'local' && this.phase === 'play') { this.prints ??= new Decals(this.ctx.scene); this.prints.add('footprint', [l.x + (foot === 'L' ? -0.15 : 0.15), 0.02, 0.9], [0, 1, 0], { size: 0.3 }); }
      st.pressed = foot; st.flash = 0.18; l.stepFoot = foot; l.stepT = 0.25;
      let best = -1, bd = 1e9;
      for (let i = st.idx; i < this.notes.length; i++) { const n = this.notes[i]; if (n.t > t + W.o) break; if (n.foot !== foot || st.used.has(i)) continue; const d = Math.abs(n.t - t); if (d < bd) { bd = d; best = i; } }
      if (best >= 0 && bd <= W.o && this.phase === 'play') {
        st.used.add(best);
        if (bd <= W.p) { st.P++; st.grade = 'Perfect'; } else if (bd <= W.g) { st.G++; st.grade = 'Good'; } else { st.O++; st.grade = 'OK'; }
        st.combo++; st.best = Math.max(st.best, st.combo);
        if (l.kind === 'local') { this.app.sfx(st.grade === 'Perfect' ? 'stepPerfect' : 'stepGood'); if (st.combo % 10 === 0) { this.app.sfx('combo'); this.ctx.particles.burst('confetti', [l.x, 2, 0.8]); } }
      } else if (l.kind === 'local' && this.phase === 'play') { st.grade = 'Miss'; st.combo = 0; this.app.sfx('stepMiss'); }
    }
    st.flash = Math.max(0, st.flash - dt);
    l.score = this.accuracy(st) * 100;
  }
  accuracy(st) { const N = this.notes.length; return (st.P + 0.7 * st.G + 0.4 * st.O) / N; }
  scoreNow() { return this.accuracy(this.me.st) * 100; }
  poseLane(l, dt) {
    if (this.phase === 'intro' || this.phase === 'countdown') { l.avatar.play('Idle'); return; }
    if ((l.stepT ?? 0) > 0) { l.stepT -= dt; l.avatar.play(l.stepFoot === 'L' ? 'StepL' : 'StepR', { restart: l.stepT > 0.2, fade: 0.04, loop: false }); } else l.avatar.play('Idle', { fade: 0.1 });
  }
  extraFrame(ctx, dt) { this.prints?.update(dt); }
  laneLabel(l) { return this.phase === 'play' ? `${Math.round(l.score)}%` : ''; }
  drawPlay(hud) {
    const w = hud.width, me = this.me, st = me.st, t = this.beat();
    this.drawTags(hud);
    say(hud, 12, 12, this.A.name, { color: 'white' });
    say(hud, 12, 24, `${Math.round(me.score)}%`, { scale: 2, color: 'sand' });
    say(hud, w - 12, 12, `Combo ${st.combo}`, { anchor: 'r', color: st.combo >= 10 ? 'orange' : 'white', scale: 2 });
    const cx = Math.floor(w / 2), top = 40, hit = hud.height - 70, scroll = 90; // px per second
    panel(hud, cx - 44, top - 6, 88, hit - top + 36, { shadow: false, fill: 'night', edge: 'slate' });
    hud.rect(cx - 40, hit, 80, 3, 'white');
    hud.rect(cx - 1, top, 2, hit - top, 'navy');
    for (let i = st.idx; i < this.notes.length; i++) {
      const n = this.notes[i], dy = (n.t - t) * scroll; if (dy > hit - top) break; if (st.used.has(i) || dy < -30) continue;
      const y = Math.round(hit - dy), x = n.foot === 'L' ? cx - 22 : cx + 22;
      hud.rect(x - 8, y - 5, 16, 10, n.foot === 'L' ? 'sky' : 'orange'); hud.rect(x - 4, y - 8, 8, 4, n.foot === 'L' ? 'sky' : 'orange');
      say(hud, x, y - 3, n.foot, { anchor: 'c', color: 'ink', shadow: false });
    }
    if (st.flash > 0) hud.rect(cx - 40, hit - 2, 80, 7, 'white');
    if (st.grade) say(hud, cx, hit + 10, st.grade, { anchor: 'c', color: st.grade === 'Perfect' ? 'lime' : st.grade === 'Good' ? 'sky' : st.grade === 'OK' ? 'sand' : 'red' });
    const prog = this.playT / this.len; bar(hud, cx - 40, hit + 26, 80, 3, prog, { fill: 'lime' });
  }
}
