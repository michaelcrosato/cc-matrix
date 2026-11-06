// Spoken lines: a dialogue box with a typed line and gibberish voice, small subtitles for barks and
// loudspeakers, radio calls with portraits. Text is typed at 30 characters a second.
import { app } from '../core/app.js';
import { SPEAKER_INFO } from '../audio/voice.js';
import { clean, wrap } from '../core/ui.js';
import { PORTRAITS } from '../data/portraits.js';

const CPS = 30;

export class Talk {
  constructor(area) {
    this.area = area;
    this.box = null; // { speaker, text, shown, hold, radio }
    this.queue = [];
    this.barkLine = null;
    this.onDone = null;
  }

  /** Lines one after another in the box. Returns a function that says when they're done. */
  lines(list, { radio = false, onDone } = {}) {
    for (const [speaker, text] of list) this.queue.push({ speaker, text: clean(text), radio });
    this.onDone = onDone ?? this.onDone;
    if (!this.box) this.next();
    return () => !this.box && !this.queue.length;
  }

  next() {
    const n = this.queue.shift();
    if (!n) { this.box = null; const d = this.onDone; this.onDone = null; d?.(); return; }
    this.box = { ...n, shown: 0, voiced: 0, age: 0, hold: 0 };
    if (n.radio) this.area.ctx.audio.play('tannoyOff', { volume: 0.5 });
  }

  /** A small subtitle: a bark or a loudspeaker line. `cut` is called if it's interrupted. */
  bark(speaker, text, o = {}) {
    if (this.barkLine && this.barkLine.prio > (o.prio ?? 1) && !this.barkLine.finished) return null;
    this.barkLine = { speaker, text: clean(text), shown: 0, voiced: 0, age: 0, hold: 0, pan: o.pan ?? 0, volume: o.volume ?? 1, prio: o.prio ?? 1, tannoy: o.tannoy ?? null, finished: false };
    return this.barkLine;
  }

  /** Cut the running line short, at a dash. */
  cutBark() {
    const b = this.barkLine;
    if (!b) return;
    b.text = `${b.text.slice(0, Math.max(1, Math.floor(b.shown)))}-`;
    b.shown = b.text.length;
    b.finished = true;
    b.hold = 0.9;
  }

  get speaking() { return !!this.box; }

  /** Confirm completes the typing, then advances. */
  advance() {
    const b = this.box;
    if (!b) return false;
    if (b.shown < b.text.length) { b.shown = b.text.length; return true; }
    this.next();
    return true;
  }

  update(dt) {
    const b = this.box;
    if (b) {
      b.age += dt;
      const before = Math.floor(b.shown);
      b.shown = Math.min(b.text.length, b.shown + dt * CPS);
      app.voice?.speak(b.speaker, b.text, before, Math.floor(b.shown), { volume: b.radio ? 0.8 : 1 });
      if (b.shown >= b.text.length) {
        b.hold += dt;
        if (b.hold > 1.4 + b.text.length * 0.012) this.next();
      }
    }
    const k = this.barkLine;
    if (k) {
      k.age += dt;
      const before = Math.floor(k.shown);
      k.shown = Math.min(k.text.length, k.shown + dt * CPS);
      if (!k.finished) app.voice?.speak(k.speaker, k.text, before, Math.floor(k.shown), { pan: k.pan, volume: k.volume });
      if (k.shown >= k.text.length) {
        k.finished = true;
        k.hold += dt;
        if (k.hold > 1.1 + k.text.length * 0.02) {
          this.barkLine = null;
          k.onEnd?.();
        }
      }
    }
  }

  /** A radio call dims the world behind it. The world keeps running, and the HUD stays clear on top. */
  drawDim(ui) {
    if (!this.box?.radio || this.area.safe) return;
    for (let y = 0; y < ui.H; y += 3) ui.hud.rect(0, y, ui.W, 1, 'ink');
  }

  draw(ui) {
    const { hud, W, H } = ui;
    const k = this.barkLine;
    if (k && !this.box) {
      const info = SPEAKER_INFO[k.speaker] ?? { label: k.speaker, color: 'white' };
      const lines = ui.fitLines(k.text.slice(0, Math.floor(k.shown)), Math.min(W - 16, 372));
      const y0 = H - 46 - lines.length * 9;
      lines.forEach((l, i) => ui.centerText(y0 + i * 9, l, { color: info.color, shadow: 'ink' }));
    }
    const b = this.box;
    if (!b) return;
    const info = SPEAKER_INFO[b.speaker] ?? { label: b.speaker, color: 'white' };
    // The panel is as tall as the whole line needs, decided up front so it doesn't grow as the text types out.
    // On the radio, whoever's talking on the left and whoever's listening on the right.
    const both = b.radio && W >= 300;
    if (b.radio && b.speaker !== 'max') this.radioOther = b.speaker;
    const margin = b.radio ? 44 : 14;
    const cols = Math.floor((W - margin - (both ? 56 : 16)) / 6);
    const boxH = Math.max(44, 18 + wrap(b.text, cols).length * 9);
    this.boxHeight = boxH;
    const y = H - boxH - 1;
    hud.rect(0, y - 1, W, boxH + 2, 'slate');
    hud.rect(0, y, W, boxH, 'ink');
    let tx = 14;
    if (b.radio) {
      const p = PORTRAITS[b.speaker] ?? PORTRAITS.pym;
      hud.rect(4, y + 5, 34, 34, 'slate');
      hud.sprite(5, y + 6, p.rows, p.colors, { scale: 2, shadow: false });
      tx = 44;
      if (both) {
        const o = PORTRAITS[b.speaker === 'max' ? (this.radioOther ?? 'pym') : 'max'] ?? PORTRAITS.pym;
        hud.rect(W - 38, y + 5, 34, 34, 'slate');
        hud.sprite(W - 37, y + 6, o.rows, o.colors, { scale: 2, shadow: false });
      }
    }
    ui.text(tx, y + 4, info.label, { color: info.color });
    const lines = wrap(b.text.slice(0, Math.floor(b.shown)), cols);
    lines.forEach((l, i) => ui.text(tx, y + 15 + i * 9, l));
    if (b.shown >= b.text.length && ui.blink(3)) ui.hud.sprite(both ? W - 50 : W - 12, H - 10, ['ooooo', '.ooo.', '..o..'], { o: 'sand' }, { shadow: false });
  }
}
