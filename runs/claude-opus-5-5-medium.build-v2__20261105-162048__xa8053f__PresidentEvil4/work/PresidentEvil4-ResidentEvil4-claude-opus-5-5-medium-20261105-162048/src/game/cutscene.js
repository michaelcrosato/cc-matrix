// Dialogue box and cutscene camera. Timeline drives shots, cues and letterbox. Hold confirm to skip.
import { Timeline } from '../../pixel-engine.js';
import { COLORS, SCENES } from '../data/dialogue.js';
import { VoiceLine } from '../audio/voice.js';
export class Dialog {
  constructor(area) { this.area = area; this.lines = null; this.i = 0; this.n = 0; this.auto = 0; this.voice = null; this.done = null; this.lock = false; }
  get active() { return !!this.lines; }
  start(lines, o = {}) { this.lines = lines; this.i = 0; this.done = o.done; this.lock = o.lock ?? true; this.auto = o.autoAdvance ?? 0; this.begin(); }
  begin() { const l = this.lines[this.i]; this.n = 0; this.hold = 0; const app = this.area.app; this.voice = new VoiceLine(this.area.ctx.audio, l.who, l.text, () => app.settings.voice); }
  /** Per frame, real time. confirm: was the advance button pressed. */
  update(dt, confirm) {
    if (!this.lines) return; const l = this.lines[this.i], len = l.text.length;
    this.n = Math.min(len, this.n + dt * 30 * (this.area.fastText ? 6 : 1)); this.voice.tick(Math.floor(this.n));
    const finished = this.n >= len; if (finished) this.hold += dt;
    const autoWait = this.area.autoDialog ? 0.25 : (this.lock ? 7 + len / 40 : 2.2 + len / 30);
    if (confirm) { if (!finished) { this.n = len; this.voice.i = len; } else this.next(); } else if (finished && this.hold > autoWait) this.next();
  }
  next() { this.i++; if (this.i >= this.lines.length) this.end(); else this.begin(); }
  end() { const d = this.done; this.lines = null; this.done = null; d?.(); }
  skip() { this.lines = null; const d = this.done; this.done = null; d?.(); }
  draw(ui) {
    if (!this.lines) return; const l = this.lines[this.i], W = ui.W, H = ui.H; const w = Math.min(W - 40, 400), x = (W - w) / 2, y = H - 66 - (this.area.player?.locked ? 0 : 0);
    ui.panel(x, y, w, 50, { bg: 'ink', border: 'slate' });
    ui.text(x + 8, y + 5, l.who, { color: COLORS[l.who] ?? 'mist' });
    const shown = l.text.slice(0, Math.floor(this.n)); const lines = ui.wrap(l.text, w - 16); let left = shown.length; lines.forEach((t, i) => { const s = t.slice(0, Math.max(0, left)); left -= t.length + 1; ui.text(x + 8, y + 16 + i * 10, s, { color: 'white' }); });
    if (this.n >= l.text.length && Math.floor(ui.t * 3) % 2) ui.action('confirm', x + w - 16, y + 37);
  }
}
/** A scripted shot list with letterbox. Dialogue may run alongside. */
export class Cutscene {
  constructor(area, o) { this.area = area; this.o = o; this.tl = new Timeline({ shots: o.shots, cues: o.cues ?? [], duration: o.duration, onEnd: () => { this.ended = true; } }); this.tl.play(); this.ended = false; this.linesDone = !o.lines; this.skipHold = 0; if (o.lines) area.dialog.start(o.lines, { lock: true, done: () => { this.linesDone = true; } }); }
  get finished() { return this.ended && this.linesDone; }
  update(dt, holding) {
    const A = this.area; if (!this.linesDone && this.tl.time >= this.tl.duration - 0.05) { this.tl.pause(); this.tl.time = this.tl.duration - 0.05; } else if (this.tl.time < this.tl.duration - 0.05 && !this.tl.playing && !this.ended) this.tl.play();
    if (this.linesDone && !this.tl.playing && !this.ended) { this.tl.play(); }
    this.tl.update(dt);
    if (holding) { this.skipHold += dt; if (this.skipHold >= 0.6) this.skip(); } else this.skipHold = 0;
  }
  skip() { if (this.ended && this.linesDone) return; this.area.dialog.active && this.area.dialog.skip(); this.linesDone = true; this.tl.skip(); this.ended = true; }
  camera() { return this.tl.camera(); }
  bars() { return this.ended ? 0 : this.tl.bars(); }
}
export function sceneLines(name) { return SCENES[name]; }
