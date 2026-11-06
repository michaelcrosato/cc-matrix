// The dialogue box: bottom strip, speaker in teal, typewriter in sync with voice syllables.
import { ACTIONS } from '../core/actions.js';
import { App } from '../app.js';
import { NAMES } from '../data/lines.js';
import { syllabify, voiceDuration } from '../audio/voice.js';
import { say, sanitize, wrap } from './font.js';
import { promptBar } from './prompts.js';
import { disc, line, note, panel, ring } from './widgets.js';

export const LINE_COLS = 52;
const MOODS = { up: -60, flat: 0, wince: 60, seven: 118 };
export function portrait(hud, cx, cy, r, mood = 'flat', t = 0) {
  disc(hud, cx, cy, r + 2, 'teal'); disc(hud, cx, cy, r, 'white'); ring(hud, cx, cy, r, 'slate', 2);
  const a = ((MOODS[mood] ?? 0) + (mood === 'wince' ? Math.sin(t * 25) * 8 : 0)) * Math.PI / 180;
  hud.rect(cx - 5, cy - 1, 3, 4, 'ink'); hud.rect(cx + 3, cy - 1, 3, 4, 'ink');
  line(hud, cx, cy + r - 5, cx + Math.sin(a) * (r - 6), cy + r - 5 - Math.cos(a) * (r - 6), 'red', 2);
}
export class Dialogue {
  id = 'dialogue'; i = 0; t = 0; holdT = 0; attractable = false;
  constructor(lines, onDone) { this.lines = lines; this.onDone = onDone; this.begin(); }
  begin() {
    const l = this.lines[this.i]; this.t = 0; this.done = false;
    this.text = sanitize(l.text); this.who = l.who ?? 'ounce';
    this.wrapped = wrap(this.text, LINE_COLS);
    this.syl = syllabify(this.text.replace(/\n/g, ' '), this.who);
    this.dur = Math.max(voiceDuration(this.syl), this.text.length / 40);
    App.say(this.text.replace(/\n/g, ' '), this.who);
  }
  shown() {
    if (this.done) return Infinity;
    let c = Math.floor(this.t * 40);
    for (const s of this.syl) if (s.t <= this.t) c = Math.max(c, s.charIndex + 1); else break;
    return c;
  }
  update(ctx, dt) {
    this.t += dt;
    if (!this.done && this.t >= this.dur) this.done = true;
    const pressed = ctx.input.wasPressed(...ACTIONS.menuConfirm, 'MouseLeft', 'KeyE');
    const held = ctx.input.anyDown(['PadCross', 'Enter', 'Space']);
    this.holdT = held ? this.holdT + dt : 0;
    if (pressed || (this.holdT > 0.5 && this.done && this.t > 0.1)) {
      if (!this.done) { this.done = true; App.voice.stop(); } else this.advance();
    } else if (this.holdT > 0.5) this.done = true;
    if (App.attract && this.t > this.dur + 0.5) this.advance();
  }
  advance() {
    this.i++; this.holdT = 0;
    if (this.i >= this.lines.length) { App.close(this); App.voice.stop(); this.onDone?.(); return; }
    this.begin();
    App.sfx('menuMove');
  }
  draw(hud) {
    const l = this.lines[this.i]; if (!l) return;
    const w = Math.min(hud.width - 24, 6 * LINE_COLS + 56), h = 56, x = Math.round((hud.width - w) / 2), y = hud.height - h - 20;
    panel(hud, x, y, w, h, 'white', 'teal');
    let tx = x + 10;
    if (this.who === 'ounce') { portrait(hud, x + 24, y + 28, 15, l.mood ?? 'flat', this.t); tx = x + 46; }
    say(hud, tx, y + 6, NAMES[this.who] ?? this.who, { color: 'teal', shadow: false });
    const n = this.shown(); let used = 0;
    this.wrapped.forEach((ln, i) => {
      const vis = ln.slice(0, Math.max(0, n - used)); used += ln.length + 1;
      say(hud, tx, y + 17 + i * 11, vis, { color: 'ink', shadow: false });
      note(tx, y + 17 + i * 11, ln.length * 6, 9, 'dialogue');
    });
    if (this.done) promptBar(hud, [['confirm', 'Next']]);
  }
}
export const talk = (lines, onDone) => App.open(new Dialogue(lines, onDone));
