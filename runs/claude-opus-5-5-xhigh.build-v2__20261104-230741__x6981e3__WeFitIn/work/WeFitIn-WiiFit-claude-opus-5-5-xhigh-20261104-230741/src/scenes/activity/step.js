// Step Class. Footprints scroll to a hit line. Left foot, right foot. It is not complicated.
import { App } from '../../app.js';
import { T } from '../../core/tunables.js';
import { STEP_BPM, STEP_SONG, stepSongFrom } from '../../audio/songs.js';
import { STEP_CHART, STEP_CHART_HARD, STEP_CHART_MEDLEY, WEIGHTS, WINDOWS } from '../../data/charts.js';
import { sayCentered, say, sayRight } from '../../ui/font.js';
import { panel } from '../../ui/widgets.js';
import { LaneEvent, worldToArt } from './events.js';
import { LaneActivity } from './lanes.js';
import { beachSet } from '../sets.js';

export const BAR_SECONDS = (60 / STEP_BPM) * 4;
const EIGHTH = BAR_SECONDS / 8;
const FOOT_L = ['..oo.', '.ooo.', '.ooo.', '.oo..', '.....', '.oo..', '.oo..'];
const FOOT_R = ['.oo..', '.ooo.', '.ooo.', '..oo.', '.....', '..oo.', '..oo.'];

export function chartNotes(chart) {
  const notes = [];
  chart.forEach((bar, b) => {
    [...bar].forEach((c, i) => {
      if (c === 'L' || c === 'R') notes.push({ t: (b + i / 8) * BAR_SECONDS, foot: c });
    });
  });
  return notes;
}

export class StepEvent extends LaneEvent {
  kind = 'step';

  constructor(scene, lanes, rng, opts) {
    super(scene, lanes, rng, opts);
    this.chart = opts.chart ?? (this.hard.chart === 'hard' ? STEP_CHART_HARD : STEP_CHART);
    this.notes = chartNotes(this.chart);
    this.duration = opts.duration ?? this.chart.length * BAR_SECONDS + 1;
    this.windowScale = this.hard.window ?? 1;
  }

  /** The song's clock when audio runs, otherwise game time. */
  clock(t) { return this.scene.beatClock ? this.scene.beatClock(t) : t; }

  beginLane(l) {
    l.state = { i: 0, P: 0, G: 0, O: 0, M: 0, combo: 0, best: 0, last: null, lastT: 0, botI: 0, botAt: null, botFoot: null, stepClip: null };
    l.score = 0;
    l.avatar?.play('StepRest', { fade: 0.25 });
    l.judged = new Int8Array(this.notes.length);
  }

  window(name) { return WINDOWS[name] * T.stepWindow * this.windowScale; }

  press(lane, foot, now) {
    const st = lane.state;
    const off = T.stepOffsetMs / 1000;
    const notes = this.notes;
    const ok = this.window('ok');
    let found = -1, bestErr = Infinity;
    for (let i = st.i; i < notes.length; i++) {
      const n = notes[i];
      const err = now - off - n.t;
      if (err < -ok) break;
      if (err > ok || lane.judged[i] || n.foot !== foot) continue;
      if (Math.abs(err) < bestErr) { bestErr = Math.abs(err); found = i; }
    }
    lane.avatar?.play(foot === 'L' ? 'StepL' : 'StepR', { once: true, fade: 0.04, then: () => lane.avatar?.play('StepRest', { fade: 0.1 }) });
    if (found < 0) { st.combo = 0; st.last = 'Off'; st.lastT = now; return; }
    lane.judged[found] = 1;
    const grade = bestErr <= this.window('perfect') ? 'P' : bestErr <= this.window('good') ? 'G' : 'O';
    st[grade]++;
    st.combo++;
    st.best = Math.max(st.best, st.combo);
    st.last = grade === 'P' ? 'Perfect' : grade === 'G' ? 'Good' : 'OK';
    st.lastT = now;
    if (lane.isLocal) {
      App.sfx(grade === 'P' ? 'stepPerfect' : 'stepGood');
      if (st.combo % 16 === 0) { App.sfx('combo'); this.ctx.particles.burst('confetti', [lane.x, 1.6, lane.z]); }
    }
  }

  stepLane(ctx, lane, inp, dt, t, scoring) {
    const st = lane.state;
    const now = this.clock(t);
    const off = T.stepOffsetMs / 1000;
    if (inp.stepL) this.press(lane, 'L', now);
    if (inp.stepR) this.press(lane, 'R', now);
    const ok = this.window('ok');
    while (st.i < this.notes.length && now - off - this.notes[st.i].t > ok) {
      if (!lane.judged[st.i]) {
        lane.judged[st.i] = 2;
        st.M++;
        st.combo = 0;
        st.last = 'Miss';
        st.lastT = now;
        if (lane.isLocal && scoring) App.sfx('stepMiss');
      }
      st.i++;
    }
    lane.score = this.scoreOf(lane);
  }

  botInput(lane, out, dt, t, brain) {
    out.x = out.y = 0;
    out.stepL = out.stepR = false;
    if (!brain.p) return;
    const st = lane.state;
    const now = this.clock(t);
    const off = T.stepOffsetMs / 1000;
    const play = brain.play;
    while (st.botI < this.notes.length) {
      const n = this.notes[st.botI];
      if (st.botAt === null) {
        st.botAt = lane.rand() < play.miss ? Infinity : n.t + off + (lane.rand() + lane.rand() - 1) * play.timing * 1.2;
      }
      if (st.botAt === Infinity) {
        if (now - off - n.t > 0.2) { st.botI++; st.botAt = null; continue; }
        break;
      }
      if (now >= st.botAt) {
        if (n.foot === 'L') out.stepL = true; else out.stepR = true;
        st.botI++; st.botAt = null;
        if (this.notes[st.botI]?.foot === n.foot) break;
        continue;
      }
      break;
    }
  }

  scoreOf(lane) {
    const st = lane.state;
    return 100 * ((st.P * WEIGHTS.perfect + st.G * WEIGHTS.good + st.O * WEIGHTS.ok) / Math.max(1, this.notes.length));
  }

  visual(ctx, dt) {
    for (const lane of this.lanes) {
      if (!lane.avatar || lane.gone) continue;
      if (lane.ghost) { this.ghostVisual(lane, dt); continue; }
      lane.avatar.update(dt);
    }
  }

  draw(ctx, t) {
    const { hud } = ctx;
    const now = this.clock(t);
    const off = T.stepOffsetMs / 1000;
    const lanes = this.lanes.filter((l) => l.isLocal && !l.gone);
    lanes.forEach((lane) => {
      const small = this.lanes.length >= 4;
      const st = lane.state;
      const px = small ? worldToArt(ctx, lane.x, 2.2, lane.z) : null;
      const w = small ? 92 : Math.min(hud.width - 28, 380);
      const cx = small ? Math.max(w / 2 + 12, Math.min(hud.width - w / 2 - 12, px.x)) : hud.width / 2;
      const x = Math.round(cx - w / 2);
      const y = small ? Math.max(28, Math.round(px.y) - 42) : 26;
      const h = small ? 28 : 46;
      panel(hud, x, y, w, h, { fill: 'white', name: 'highway' });
      const rowL = y + Math.round(h * 0.25), rowR = y + Math.round(h * 0.75);
      hud.rect(x, y + Math.round(h / 2), w, 1, 'mist');
      const hitX = x + (small ? 16 : 40);
      hud.rect(hitX - 1, y, 3, h, 'teal');
      const pxPerSec = small ? 42 : 96;
      const horizon = (w - (hitX - x)) / pxPerSec;
      for (let i = st.i; i < this.notes.length; i++) {
        const n = this.notes[i];
        const dt2 = n.t + off - now;
        if (dt2 > horizon) break;
        if (lane.judged[i]) continue;
        const nx = hitX + dt2 * pxPerSec;
        if (nx < x + 2) continue;
        const left = n.foot === 'L';
        const yy = (left ? rowL : rowR) - 7;
        hud.sprite(Math.round(nx) - 5, yy, left ? FOOT_L : FOOT_R, { o: left ? 'blue' : 'orange' }, { scale: small ? 1 : 2, shadow: false });
      }
      if (!small) {
        say(hud, x + 3, rowL - 4, 'L', { color: 'blue', shadow: false, name: 'hw-l' });
        say(hud, x + 3, rowR - 4, 'R', { color: 'orange', shadow: false, name: 'hw-r' });
      }
      if (now - st.lastT < 0.6 && st.last) sayCentered(hud, hitX + (small ? 16 : 26), y + h + 3, st.last, { color: st.last === 'Perfect' ? 'lime' : st.last === 'Miss' || st.last === 'Off' ? 'red' : 'sand', name: 'judge' });
      if (st.combo >= 4) sayRight(hud, x + w - 2, y + h + 3, `${st.combo} combo`, { color: 'white', name: 'combo' });
    });
  }
}

export class StepActivity extends LaneActivity {
  counting = 0;
  localClock = 0;
  offset = 0;

  makeEvent(lanes, rng, hard) { return new StepEvent(this, lanes, rng, { hard }); }
  laneOptions() { return { mat: 'step-platform' }; }
  startMusic() {}

  async dress(ctx) {
    this.set = beachSet(ctx);
    await this.addCoach(ctx, { at: [3.6, 0, -1], yaw: -0.5, clip: 'Watch' });
  }

  onEnter(phase) {
    if (phase === 'practice' || phase === 'play') this.startSongAt(0);
    if (phase === 'countdown' || phase === 'outro') this.ctx.audio.stopMusic();
  }

  startSongAt(bar) {
    this.offset = bar * BAR_SECONDS;
    this.localClock = this.offset;
    this.ctx.audio.playMusic(bar === 0 ? { ...STEP_SONG, order: STEP_SONG.order, loop: false } : stepSongFrom(bar), 'step');
    this.songStarted = true;
  }

  /** The song's step clock when audio runs (undocumented but present), otherwise game time. */
  beatClock() {
    const a = this.ctx.audio;
    const song = a.song;
    if (a.context && a.unlocked && song && typeof song.start === 'number' && song.start >= 0 && !this.attractMode && !App.dev.autopilot) {
      const audioT = a.context.currentTime - song.start;
      if (audioT >= 0) return audioT + this.offset;
    }
    return this.localClock;
  }

  /** On pause: stop the music. On resume: count in and restart at the current bar. */
  onPause() { if (this.phase === 'play') this.ctx.audio.stopMusic(); }
  onResume() {
    if (this.phase !== 'play') return;
    const bar = Math.floor(this.beatClock() / BAR_SECONDS);
    this.resumeBar = bar;
    this.localClock = bar * BAR_SECONDS;
    this.offset = this.localClock;
    this.counting = (60 / STEP_BPM) * 4;
    this.countBeat = 4;
  }

  stepPlay(ctx, dt, scoring) {
    if (this.counting > 0) {
      this.counting -= dt;
      const n = Math.ceil(this.counting / (60 / STEP_BPM));
      if (n !== this.countBeat && n > 0) { this.countBeat = n; App.sfx('count'); }
      if (this.counting <= 0) this.startSongAt(this.resumeBar);
      return;
    }
    this.localClock += dt;
    this.eventT = this.localClock;
    this.event.step(ctx, dt, this.eventT, scoring);
  }

  isOver() { return this.localClock >= this.event.duration; }
  playLength() { return this.event.duration; }
  begin() { super.begin(); this.localClock = 0; this.offset = 0; }

  drawGame(ctx) {
    super.drawGame(ctx);
    if (this.counting > 0) sayCentered(ctx.hud, ctx.hud.width / 2, Math.round(ctx.hud.height * 0.42), String(Math.ceil(this.counting / (60 / STEP_BPM))), { scale: 4, color: 'sand', name: 'count-in' });
  }

  scoreText() { return `${Math.round(this.event.scoreOf(this.playerLane))}%`; }
  fingerprint() { const l = this.playerLane; return l ? `${l.state.P}|${l.state.G}|${l.state.O}|${l.state.M}|${l.state.combo}` : ''; }
  overlayDot() { const l = this.playerLane; return l ? `P${l.state.P} G${l.state.G} O${l.state.O} M${l.state.M}` : '-'; }
}

export { STEP_CHART_MEDLEY };
