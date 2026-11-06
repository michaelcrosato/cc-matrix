// Typewriter + gibberish voice. One Speaker per screen; reveals characters and plays a syllable per letter pair.
import { CAST_VOICES, syllableFor } from './voice.js';
import { clean } from '../ui/hud.js';
export class Speaker {
  constructor(app) { this.app = app; this.text = ''; this.n = 0; this.acc = 0; this.who = 'narrator'; this.mouth = 0; this.syl = 0; this.silent = false; this.plain = ''; this.done = true; }
  start(who, text, o = {}) { this.who = who; this.text = clean(text).toUpperCase(); this.plain = this.text.replace(/\*/g, ''); this.n = 0; this.acc = 0; this.done = false; this.silent = !!o.silent; this.syl = 0; this.speed = o.speed || 1; }
  skip() { this.n = this.plain.length; this.done = true; this.mouth = 0; }
  get shown() { // text up to n plain characters, with the markup kept
    let c = 0, out = ''; for (const ch of this.text) { if (ch === '*') { out += ch; continue; } if (c >= this.n) break; out += ch; c++; } return out;
  }
  update(ctx, dt) {
    this.mouth = Math.max(0, this.mouth - dt * 7);
    if (this.done) return;
    const cps = [16, 28, 46][(this.app.settings.textSpeed || 2) - 1], v = CAST_VOICES[this.who] || CAST_VOICES.narrator;
    this.acc += dt * cps * v.speed * this.speed;
    while (this.acc >= 1 && this.n < this.plain.length) {
      this.acc -= 1; const ch = this.plain[this.n]; this.n++;
      if (/[A-Z]/.test(ch) && this.n % 2 === 0 && !this.silent) {
        const s = syllableFor(this.plain, this.n - 1, v);
        const vol = this.app.settings.voices * s.volume * 0.7; if (vol > 0.01) ctx.audio.play(s.name, { pitch: s.pitch, volume: vol, pan: 0 });
        this.mouth = 1;
      } else if (/[A-Z]/.test(ch) && this.n % 2 === 0) this.mouth = 1;
      if (ch === '.' || ch === ',' || ch === '?' || ch === '!') this.acc -= ch === ',' ? 2 : 5;
    }
    if (this.n >= this.plain.length) { this.done = true; }
  }
}
