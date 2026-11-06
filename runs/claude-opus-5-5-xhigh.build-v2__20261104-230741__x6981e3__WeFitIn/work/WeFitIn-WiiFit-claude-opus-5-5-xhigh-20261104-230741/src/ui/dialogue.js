// Dialogue: bottom strip, typewriter in step with the voice, a dial portrait for Ounce.
import { App } from '../app.js';
import { CONFIRM } from '../core/actions.js';
import { revealAt, syllabify, voiceLength } from '../audio/voice.js';
import { ABOVE_PROMPTS } from './layout.js';
import { SPEAKERS } from '../data/classmates.js';
import { say, sanitize, wrap, charsIn } from './font.js';
import { panel } from './widgets.js';
import { drawOuncePortrait } from '../art/portraits.js';
import { promptBar } from './prompts.js';


/** Lines: strings "who: text" or { who, text, mood, run }. */
export function normaliseLines(lines) {
  return (Array.isArray(lines) ? lines : [lines]).map((l) => {
    if (typeof l !== 'string') return l;
    const m = /^([a-z]+):\s?(.*)$/s.exec(l);
    return m && SPEAKERS[m[1]] ? { who: m[1], text: m[2] } : { who: 'narrator', text: l };
  });
}

export class DialogueScreen {
  name = 'dialogue';
  opaque = false;
  i = 0; t = 0; shown = 0; complete = false; hold = 0;

  constructor(lines, { onDone = null, skippable = true } = {}) {
    this.lines = normaliseLines(lines);
    this.onDone = onDone;
    this.skippable = skippable;
  }

  onOpen() { this.begin(); }

  begin() {
    const l = this.lines[this.i];
    if (!l) return;
    l.run?.();
    this.text = sanitize(l.text);
    this.syl = syllabify(this.text, l.who);
    this.dur = voiceLength(this.syl);
    this.t = 0; this.complete = false; this.shown = 0;
    if (l.who === 'kevin') App.sfx('gullSquawk');
    else App.speak(this.syl, l.who);
    if (l.mood && App.scene?.ounce) App.scene.ounce.setMood(l.mood);
  }

  advance() {
    App.voice.stop();
    this.i++;
    if (this.i >= this.lines.length) {
      App.stack.pop(this);
      this.onDone?.();
      return;
    }
    this.begin();
  }

  update(ctx, dt) {
    const uiDt = dt || 1 / 60;
    const { input } = ctx;
    const pressed = input.wasPressed(...CONFIRM) || input.wasPressed('MouseLeft');
    const held = input.anyDown(CONFIRM) || input.isDown('MouseLeft');
    this.hold = held ? this.hold + uiDt : 0;
    this.t += uiDt * (this.hold > 0.45 ? 4 : 1);
    this.shown = revealAt(this.syl, this.text, this.t);
    if (!this.complete && (this.t >= this.dur + 0.05 || this.shown >= this.text.length)) { this.complete = true; this.shown = this.text.length; }
    if (pressed) {
      if (!this.complete) { this.complete = true; this.shown = this.text.length; this.t = this.dur + 1; App.voice.stop(); } else this.advance();
    } else if (this.complete && this.hold > 0.45) this.advance();
  }

  draw(ctx) {
    const l = this.lines[this.i];
    if (!l) return;
    drawDialogueBox(ctx.hud, l.who, this.text.slice(0, this.shown), this.text, l.mood, this.t);
    if (this.complete) promptBar(ctx.hud, App.device, [['confirm', 'Next']]);
  }
}

/** Box shared by dialogue and barks. Returns its rect. */
export function drawDialogueBox(hud, who, shownText, fullText, mood = 'neutral', t = 0, bottom = ABOVE_PROMPTS) {
  const speaker = SPEAKERS[who] ?? SPEAKERS.narrator;
  const portrait = who === 'ounce' ? 26 : 0;
  const w = Math.min(hud.width - 24, 338 + portrait);
  const x = Math.round((hud.width - w) / 2);
  const textW = w - 14 - portrait;
  const cols = charsIn(textW);
  const lines = wrap(fullText, cols);
  const nameH = speaker.name ? 12 : 0;
  const h = Math.max(portrait ? 34 : 0, nameH + lines.length * 11 + 10);
  const y = hud.height - h - bottom;
  panel(hud, x, y, w, h, { fill: 'white', border: 'ink', name: 'dialogue' });
  if (portrait) drawOuncePortrait(hud, x + 15, y + Math.round(h / 2), 11, mood, t);
  const tx = x + 7 + portrait;
  if (speaker.name) say(hud, tx, y + 4, speaker.name, { color: speaker.color, shadow: false, name: 'speaker' });
  // Print the typewriter's part of the wrapped text, so words never jump lines.
  let left = shownText.length;
  lines.forEach((ln, i) => {
    const part = ln.slice(0, Math.max(0, left));
    if (part) say(hud, tx, y + 4 + nameH + i * 11, part, { color: 'ink', shadow: false, name: 'dialogue-text' });
    left -= ln.length + 1;
  });
  return { x, y, w, h };
}

/** A remark that doesn't stop anything: small, up for a few seconds, voiced. */
export class Bark {
  who = null; text = ''; t = 0; dur = 0;
  say(who, text) {
    this.who = who;
    this.text = sanitize(text);
    this.syl = syllabify(this.text, who);
    this.t = 0;
    this.dur = Math.max(2.4, voiceLength(this.syl) + 1.5);
    if (who === 'kevin') App.sfx('gullSquawk'); else App.speak(this.syl, who);
  }
  get active() { return this.who !== null; }
  tick(dt) {
    if (!this.who) return;
    this.t += dt;
    if (this.t > this.dur) this.who = null;
  }
  draw(hud, bottom = 12) {
    if (!this.who) return;
    drawDialogueBox(hud, this.who, this.text.slice(0, revealAt(this.syl, this.text, this.t)), this.text, 'neutral', this.t, bottom);
  }
}

