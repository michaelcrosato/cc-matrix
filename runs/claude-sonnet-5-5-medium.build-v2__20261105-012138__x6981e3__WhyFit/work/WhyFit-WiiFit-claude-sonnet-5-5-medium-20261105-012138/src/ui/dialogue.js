// Dialogue box: bottom strip, speaker name in teal, typewriter at ~40 cps in sync with voice syllables.
import { say, wrap, widthOf } from './font.js';
import { panel, layoutLog } from './widgets.js';
import { syllabify, voiceDuration } from '../audio/voice.js';
import { glyph, GLYPH_MAP } from '../art/glyphs.js';

export const SPEAKER_NAMES = { ounce: 'Ounce', coach: 'Coach Plumb', marguerite: 'Marguerite', dennis: 'Dennis', june: 'June', kevin: 'Kevin', you: 'You', narrator: '' };
export class Dialogue {
  constructor(app) { this.app = app; this.queue = []; this.cur = null; this.done = null; }
  get active() { return !!this.cur; }
  /** lines: [{ who, text }] ; resolves when the last line is dismissed. */
  play(lines, { auto = false } = {}) {
    this.queue.push(...lines.map((l) => (typeof l === 'string' ? { who: 'ounce', text: l } : l)));
    this.auto = auto;
    if (!this.cur) this.next();
    return new Promise((res) => { this.done = res; });
  }
  next() {
    const l = this.queue.shift();
    if (!l) { this.cur = null; const d = this.done; this.done = null; d?.(); return; }
    const text = l.text.length > 156 ? l.text.slice(0, 156) : l.text;
    const syls = syllabify(text, l.who);
    this.cur = { ...l, text, syls, t: 0, shown: 0, dur: voiceDuration(syls), age: 0, voiced: false };
    this.app.mood?.(l.who, l.mood);
    this.app.onLine?.(l);
  }
  skipAll() { this.queue.length = 0; this.cur = null; const d = this.done; this.done = null; d?.(); }
  update(nav, dt) {
    const c = this.cur; if (!c) return false;
    if (!c.voiced) { c.voiced = true; this.app.speak(c.who, c.text, c.syls); }
    const fast = this.app.ctx?.input?.isDown('PadCross', 'Enter', 'Space') && c.age > 0.6;
    c.t += dt * (fast ? 3 : 1); c.age += dt;
    // typewriter: reveal chars as syllables pass (~40 cps floor)
    let n = Math.min(c.text.length, Math.floor(c.t * 40));
    for (const s of c.syls) if (s.t <= c.t) n = Math.max(n, Math.min(c.text.length, s.charIndex + 1));
    c.shown = Math.max(c.shown, n);
    if (nav.confirm || nav.click) { if (c.shown < c.text.length) c.shown = c.text.length, c.t = Math.max(c.t, c.dur); else this.next(); }
    else if (this.auto && c.shown >= c.text.length && c.age > c.dur + 1.4) this.next();
    return true;
  }
  draw(hud) {
    const c = this.cur; if (!c) return;
    const w = Math.min(hud.width - 24, 440), h = 56, x = Math.floor((hud.width - w) / 2), y = hud.height - h - 14;
    panel(hud, x, y, w, h);
    const name = SPEAKER_NAMES[c.who] ?? '';
    if (name) { hud.rect(x + 6, y - 7, widthOf(name) + 8, 12, 'teal'); say(hud, x + 10, y - 5, name, { color: 'white', shadow: false }); }
    const px = c.who === 'ounce' ? 44 : 8;
    if (c.who === 'ounce') this.app.portrait?.(hud, x + 6, y + 10, 32);
    const lines = wrap(c.text.slice(0, c.shown), w - px - 12, 1);
    const full = wrap(c.text, w - px - 12, 1);
    lines.forEach((l, i) => say(hud, x + px, y + 10 + i * 12, l, { color: 'ink', shadow: false }));
    if (c.shown >= c.text.length && Math.floor(c.age * 3) % 2 === 0) glyph(hud, this.app.device.glyphSet, GLYPH_MAP.confirm[this.app.device.last === 'pad' ? 'pad' : this.app.device.last], x + w - 30, y + h - 17);
    layoutLog.add('dialogue', x, y, w, h);
    c.lines = full.length;
  }
}
