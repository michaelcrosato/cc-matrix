// Bottom panel, three lines, nameplate, typewriter with voice, skip to end then advance.
import { drawText, panel, inRect, textWidth, LINE_H } from './draw.js';
import { tuning } from '../dev/tuning.js';

const PANEL = { x: 28, y: 186, w: 424, h: 64 };
const LINE_W = PANEL.w - 32;

/** Parse markup: *emphasis*, ~name~, | beat. Returns chars [{c, color, beat}]. */
export function parseLine(text) {
  const out = [];
  let color = 'ink';
  for (const ch of text) {
    if (ch === '*') { color = color === 'red' ? 'ink' : 'red'; continue; }
    if (ch === '~') { color = color === 'blue' ? 'ink' : 'blue'; continue; }
    if (ch === '|') { out.push({ c: '', color, beat: true }); continue; }
    out.push({ c: ch, color, beat: false });
  }
  return out;
}
function wrapChars(chars) {
  const lines = [[]];
  let lineW = 0;
  let word = [];
  let wordW = 0;
  const glyphW = (c) => textWidth(c) + 1;
  const flush = () => {
    if (lineW + wordW > LINE_W && lines[lines.length - 1].length) { lines.push([]); lineW = 0; }
    lines[lines.length - 1].push(...word);
    lineW += wordW;
    word = []; wordW = 0;
  };
  for (const ch of chars) {
    if (ch.c === '\n') { flush(); lines.push([]); lineW = 0; continue; }
    word.push(ch);
    wordW += ch.beat ? 0 : ch.c === ' ' ? 4 : glyphW(ch.c);
    if (ch.c === ' ') flush();
  }
  flush();
  return lines;
}

export class Dialogue {
  /** beats: array of strings (pages), or items { text, emote, sound, who, name }. */
  constructor({ who = null, name = '', beats, choices = null, onDone = null, voice = null, id = 'dialogue', dimmed = false }) {
    this.id = id;
    this.who = who;
    this.name = name;
    this.beats = beats.map((b) => (typeof b === 'string' ? { text: b } : b));
    this.choices = choices;
    this.onDone = onDone;
    this.voice = voice;
    this.index = 0;
    this.choiceFocus = 0;
    this.chosen = -1;
    this.dimmed = dimmed;
    this.setBeat(0);
  }
  currentText() { return this.beats[this.index]?.text ?? ''; }
  setBeat(i) {
    this.index = i;
    const b = this.beats[i];
    const chars = parseLine(b.text);
    this.lines = wrapChars(chars);
    this.total = chars.filter((c) => !c.beat).length;
    this.seq = chars;
    this.shown = 0;
    this.pos = 0;
    this.timer = 0;
    this.beat = 0;
    this.done = false;
    if (b.who) this.who = b.who;
    if (b.name) this.name = b.name;
    if (b.voice) this.voice = b.voice;
    if (b.emote && this.g) this.g.actorEmote?.(this.who, b.emote);
    if (b.sound && this.g) this.g.sound(b.sound);
  }
  open(g) { this.g = g; const b = this.beats[0]; if (b.emote) g.actorEmote?.(this.who, b.emote); if (b.sound) g.sound(b.sound); }
  update(g, inp, dt) {
    const speed = g.settings.textSpeed ?? tuning.textSpeed;
    if (!this.done) {
      if (this.beat > 0) this.beat -= dt;
      else {
        this.timer += dt * speed;
        while (this.timer >= 1 && !this.done && this.beat <= 0) {
          this.timer -= 1;
          const ch = this.seq[this.pos++];
          if (!ch) { this.done = true; break; }
          if (ch.beat) { this.beat = 0.3; continue; }
          this.shown++;
          if (ch.c !== ' ') {
            g.voice?.syllable(ch.c, this.voice, this.currentText());
            if (this.who) { const a = g.actorOf?.(this.who); if (a && /[aeiouy]/i.test(ch.c)) a.talkAmp = 1; }
          }
        }
        if (this.pos >= this.seq.length) this.done = true;
      }
    }
    const m = inp.mouse;
    const last = this.index === this.beats.length - 1;
    if (this.done && last && this.choices) {
      const n = this.choices.length;
      if (inp.nav.up) { this.choiceFocus = (this.choiceFocus + n - 1) % n; g.sound('uiTick'); }
      if (inp.nav.down) { this.choiceFocus = (this.choiceFocus + 1) % n; g.sound('uiTick'); }
      const rects = this.choiceRects();
      if (m.moved) rects.forEach((r, i) => { if (inRect(m, ...r)) this.choiceFocus = i; });
      let pick = inp.confirm;
      if (m.click) rects.forEach((r, i) => { if (inRect(m, ...r)) { this.choiceFocus = i; pick = true; } });
      if (pick) {
        g.sound('uiConfirm');
        this.chosen = this.choiceFocus;
        g.ui.pop(this);
        this.onDone?.(this.chosen);
      } else if (inp.back || m.rclick) {
        // Back picks the last option: the one that means "never mind"
        this.chosen = n - 1;
        g.sound('uiCancel');
        g.ui.pop(this);
        this.onDone?.(this.chosen);
      }
      return;
    }
    if (inp.confirm || m.click || inp.back || m.rclick) {
      if (!this.done) {
        this.shown = this.total; this.pos = this.seq.length; this.done = true;
      } else if (!last) {
        g.sound('uiTick');
        this.setBeat(this.index + 1);
      } else {
        g.sound('uiTick');
        g.ui.pop(this);
        this.onDone?.(-1);
      }
    }
  }
  choiceRects() {
    const n = this.choices.length;
    let w = 0;
    for (const c of this.choices) w = Math.max(w, textWidth(c) + 26);
    w = Math.max(90, Math.min(300, w));
    const h = 19;
    const x = 480 - 28 - w;
    const y0 = PANEL.y - 8 - n * (h + 2);
    return this.choices.map((_, i) => [x, y0 + i * (h + 2), w, h]);
  }
  prompts() {
    const last = this.index === this.beats.length - 1;
    if (this.done && last && this.choices) return null;
    return null;
  }
  draw(g, hud) {
    const { x, y, w, h } = PANEL;
    panel(hud, x, y, w, h, { fill: 'white', trim: 'sand' });
    if (this.name) {
      const nw = textWidth(this.name) + 16;
      panel(hud, x + 10, y - 11, nw, 16, { fill: 'navy', trim: 'sky' });
      drawText(hud, x + 18, y - 6, this.name, { color: 'white' });
    }
    let left = this.shown;
    this.lines.slice(0, 4).forEach((line, li) => {
      let cx = x + 14;
      const ly = y + 11 + li * LINE_H;
      for (const ch of line) {
        if (ch.beat) continue;
        if (left <= 0) break;
        left--;
        if (ch.c === ' ') { cx += 4; continue; }
        cx += drawText(hud, cx, ly, ch.c, { color: ch.color });
      }
    });
    const last = this.index === this.beats.length - 1;
    if (this.done && !(last && this.choices)) {
      const bob = Math.floor((g.ctx.time * 4) % 2);
      drawText(hud, x + w - 18, y + h - 15 + bob, 'v', { color: 'orange', scale: 1 });
    }
    if (this.done && last && this.choices) {
      this.choiceRects().forEach((r, i) => {
        const focused = i === this.choiceFocus;
        panel(hud, r[0], r[1], r[2], r[3], { fill: focused ? 'sand' : 'white', trim: focused ? 'orange' : 'mist' });
        if (focused) drawText(hud, r[0] + 7, r[1] + 6, '>', { color: 'plum' });
        drawText(hud, r[0] + 16, r[1] + 6, this.choices[i], { color: 'ink' });
      });
    }
  }
}
