// Subtitles and spoken lines. A queue, a voice, a camera hold on the speaker, and skip.
import { LINES, NAMES } from '../content/dialogue.js';
import { hashStr } from '../core/rng.js';
export class Dialogue {
  queue = []; current = null; t = 0; onEnd = null; picks = new Map(); hold = null; lineCount = 0;
  constructor(game) { this.game = game; }
  /** Lines by key, or an array of [speaker, text]. Returns the total length in seconds. */
  play(linesOrKey, { onEnd, holdOn, skippable = true } = {}) {
    const g = this.game;
    const lines = typeof linesOrKey === 'string' ? (LINES[linesOrKey] ?? []) : linesOrKey;
    this.queue = lines.map(([who, text]) => ({ who, text }));
    this.onEnd = onEnd ?? null;
    this.current = null; this.t = 0; this.skippable = skippable;
    if (holdOn) this.setHold(holdOn);
    if (!this.queue.length) { this.finish(); return 0; }
    this.next();
    return lines.reduce((a, [w, tx]) => a + this.duration(w, tx), 0);
  }
  duration(who, text) { const v = this.game.voice.lineSeconds(who, text); return Math.max(1.6, v + 0.6, text.length / 18); }
  next() {
    const g = this.game;
    this.current = this.queue.shift() ?? null;
    if (!this.current) { this.finish(); return; }
    this.lineCount++;
    this.t = this.duration(this.current.who, this.current.text);
    g.voice.say(this.current.who, this.current.text);
    g.subtitle.set(this.current.who, this.current.text, this.t);
    g.events.emit('line', this.current.who, this.current.text);
  }
  finish() {
    this.clearHold();
    const f = this.onEnd; this.onEnd = null; this.current = null;
    f?.();
  }
  /** Advance on Cross/Enter so readers never wait. */
  skip() { if (this.current) { this.t = 0; } }
  get active() { return !!this.current; }
  setHold(target) { this.hold = target; }
  clearHold() { this.hold = null; }
  fixedUpdate(dt) {
    if (!this.current) return;
    this.t -= dt;
    if (this.t <= 0) this.next();
  }
  update() {
    if (this.current && this.skippable && this.game.actions.tapped('skip')) this.skip();
  }
  stopAll() { this.queue = []; this.current = null; this.onEnd = null; this.clearHold(); this.game.subtitle.clear(); }
  /** One line from a pool, cycling, deterministic. */
  pick(key) {
    const list = LINES[key];
    if (!list || !list.length) return null;
    const n = this.picks.get(key) ?? 0;
    this.picks.set(key, n + 1);
    return list[n % list.length][1];
  }
}
export class Subtitle {
  who = ''; text = ''; t = 0;
  get active() { return this.t > 0; }
  set(who, text, t) { this.who = who; this.text = text; this.t = t; this.minor = false; }
  clear() { this.t = 0; this.text = ''; }
}
export const speakerName = (who) => NAMES[who] ?? '';
