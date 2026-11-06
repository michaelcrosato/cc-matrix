// The story's set pieces on the engine's Timeline: camera shots, cues, subtitles and letterbox bars (section 21).
// Plain conversations and choices stay in dialogue.js.
import { Timeline } from '../../pixel-engine.js';

const LINE_GAP = 0.25;
export class ScenePlayer {
  tl = null; o = null; t = 0;
  constructor(game) { this.game = game; }
  get active() { return !!this.tl; }
  /** A scene with camera shots holds the player; one without leaves them free to look around. */
  get locks() { return !!this.tl && !!this.o.shots; }
  get shielded() { return !!this.tl && !!this.o.shield; }
  get skippable() { return !!this.tl && this.o.skippable !== false; }
  /** `lines` are ids from dialogue.js, played one after another from `linesAt`. */
  play(o) {
    if (this.tl) this.clear();
    const g = this.game, lines = [], cues = [...(o.cues ?? [])];
    let at = o.linesAt ?? 0.4;
    for (const [who, raw] of (o.lines ?? []).flatMap((id) => g.talk.linesOf(id))) {
      const text = raw.toUpperCase(), dur = Math.max(1.8, text.length * 0.07), until = o.duration ? Math.min(at + dur, o.duration) : at + dur;
      if (o.duration && at >= o.duration) break;
      lines.push({ at, until, text, who });
      cues.push({ at, cosmetic: true, run: () => { const v = g.talk.voiceOf(who); if (v !== 'none') g.audio.voice(v, text); } });
      at = until + LINE_GAP;
    }
    this.o = o; this.t = 0; this.aborted = false;
    this.tl = new Timeline({ shots: o.shots, cues, lines, duration: o.duration ?? at + 0.4, bars: o.shots ? (o.bars ?? 0.6) : 0, onEnd: () => this.finish() });
    this.tl.play();
    this.applyCamera();
  }
  applyCamera() { const c = this.o.shots ? this.tl.camera() : null; if (c) this.game.cam.override = c; }
  finish() {
    const o = this.o; this.tl = null; this.o = null;
    if (o.shots) this.game.cam.override = null;
    o.onEnd?.(this.aborted);
  }
  /** Called once per fixed step. */
  update(dt) {
    if (!this.tl) return;
    this.t += dt;
    if (this.skippable && this.t > 0.15 && this.game.skipPressed()) { this.tl.skip(); return; }
    this.tl.update(dt);
    if (!this.tl) return;
    this.o.tick?.(dt, this.tl.time);
    this.applyCamera();
  }
  line() { return this.tl ? this.tl.line() : null; }
  bars() { return this.tl ? this.tl.bars() : 0; }
  /** Ended from outside, by a restart or a jump to another mission. */
  clear() { if (!this.tl) return; this.aborted = true; this.tl.skip(); this.aborted = false; }
}
