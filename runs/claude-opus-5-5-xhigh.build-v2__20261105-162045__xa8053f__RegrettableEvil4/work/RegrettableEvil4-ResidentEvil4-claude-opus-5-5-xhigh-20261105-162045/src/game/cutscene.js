// A cutscene is a script: camera shots, spoken lines, waits and cues, turned into one engine Timeline.
// Skippable: hold Cross or Space for 0.6 s. Confirm completes a line, then hurries to the next.
import { Timeline } from '../../pixel-engine.js';
import { clean } from '../core/ui.js';
import { app } from '../core/app.js';
import { SPEAKER_INFO } from '../audio/voice.js';

const CPS = 30;
const SKIP_HOLD = 0.6;

export class Cutscene {
  /**
   * script entries:
   *  { cam: [pos, look, fov?], to?: [pos, look], cut?: true }  a shot, drifting to `to` until the next shot
   *  { say: [speaker, text], hold?: seconds }                  a line in the letterbox
   *  { wait: seconds }
   *  { cue: fn, cosmetic?: true }
   */
  constructor(area, script, { onEnd, skippable = true, silentBars = false } = {}) {
    this.area = area;
    this.onEnd = onEnd;
    this.skippable = skippable;
    this.skipHeld = 0;
    this.lines = [];
    const shots = [];
    const cues = [];
    let t = 0;
    let lastShot = null;
    const closeShot = (at) => {
      if (!lastShot) return;
      const end = lastShot.to ?? [lastShot.pos, lastShot.look];
      shots.push({ at: Math.max(lastShot.at + 0.01, at - 0.005), position: end[0], target: end[1], fov: lastShot.fov });
      lastShot = null;
    };
    for (const e of script) {
      if (e.cam) {
        closeShot(t);
        const [pos, look, fov = 42] = e.cam;
        shots.push({ at: t, position: pos, target: look, fov, cut: true });
        lastShot = { at: t, pos, look, fov, to: e.to };
      } else if (e.say) {
        const text = clean(e.say[1]);
        const dur = text.length / CPS + (e.hold ?? 1.1);
        this.lines.push({ at: t, until: t + dur, speaker: e.say[0], text });
        t += dur;
      } else if (e.wait) t += e.wait;
      else if (e.cue) cues.push({ at: t, run: e.cue, cosmetic: !!e.cosmetic, name: e.name });
    }
    closeShot(t);
    this.duration = t;
    this.tl = new Timeline({
      shots, cues, duration: Math.max(t, 0.1), bars: silentBars ? 0 : 0.45,
      lines: this.lines.map((l) => ({ at: l.at, until: l.until, text: l.text })),
      onEnd: () => { this.done = true; },
    });
    this.done = false;
    this.tl.play();
    this.voiced = 0;
    this.lineIdx = -1;
    this.hurry = false;
  }

  currentLine() {
    const t = this.tl.time;
    for (let i = this.lines.length - 1; i >= 0; i--) {
      const l = this.lines[i];
      if (t >= l.at && t < l.until) return i;
    }
    return -1;
  }

  update(dt, input, it) {
    if (this.done) return;
    const hold = input.isDown('PadCross', 'Space', 'MouseLeft', 'Enter');
    if (this.skippable && hold) {
      this.skipHeld += dt;
      if (this.skipHeld >= SKIP_HOLD) { this.skip(); return; }
    } else if (!hold) this.skipHeld = 0;
    const press = input.wasPressed('PadCross', 'Space', 'MouseLeft', 'Enter', 'KeyE') || it?.action;
    const idx = this.currentLine();
    if (idx !== this.lineIdx) { this.lineIdx = idx; this.voiced = 0; this.complete = false; this.hurry = false; this.tl.speed = 1; }
    if (idx >= 0) {
      const l = this.lines[idx];
      const shown = this.complete ? l.text.length : Math.min(l.text.length, Math.floor((this.tl.time - l.at) * CPS));
      if (shown > this.voiced) { app.voice?.speak(l.speaker, l.text, this.voiced, shown); this.voiced = shown; }
      if (press && this.skippable) {
        if (shown < l.text.length) { this.complete = true; this.voiced = l.text.length; }
        else this.tl.speed = 8; // hurry on to the next line; cues still fire
      }
    } else if (press && this.skippable) this.tl.speed = 4;
    this.tl.update(dt);
  }

  skip() {
    if (this.done) return;
    this.tl.speed = 1;
    this.tl.skip();
    this.done = true;
  }

  camera() { return this.tl.camera(); }

  draw(ui) {
    const { hud, W, H } = ui;
    const bars = this.tl.bars();
    const bh = Math.round(bars * 30);
    if (bh > 0) {
      hud.rect(0, 0, W, bh, 'ink');
      hud.rect(0, H - bh, W, bh, 'ink');
    }
    const idx = this.lineIdx;
    if (idx >= 0) {
      const l = this.lines[idx];
      const shown = this.complete ? l.text.length : Math.min(l.text.length, Math.floor((this.tl.time - l.at) * CPS));
      const info = SPEAKER_INFO[l.speaker] ?? { label: l.speaker, color: 'white' };
      const lines = ui.fitLines(l.text.slice(0, shown), Math.min(W - 16, 420));
      const y0 = H - 25 - Math.max(0, lines.length - 2) * 9 - 2;
      const lastPad = H - 28;
      ui.text(10, Math.min(y0 - 10, lastPad - 2), info.label, { color: info.color, shadow: 'ink' });
      lines.forEach((t, i) => ui.text(10, y0 + i * 9, t, { shadow: 'ink' }));
    }
    // The skip bar, small, only while held.
    if (this.skipHeld > 0.05 && this.skippable) {
      ui.bar(W - 64, H - 12, 58, 6, this.skipHeld / SKIP_HOLD, 'sand');
    } else if (bh >= 20 && this.skippable) {
      const pw = ui.promptWidth('skip', 'HOLD: SKIP');
      ui.prompt(W - pw - 6, H - 14, 'skip', 'HOLD: SKIP', { color: 'slate' });
    }
  }
}
