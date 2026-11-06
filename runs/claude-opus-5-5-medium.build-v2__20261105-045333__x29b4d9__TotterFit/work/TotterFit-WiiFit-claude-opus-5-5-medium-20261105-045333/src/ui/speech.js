// A paper speech tag in the lower third, text typing out in time with the voice. Everything spoken is on screen.
import { el, txt } from './ui.js';
import { EXCLAIM } from '../audio/voice.js';
import { cosmetic, pick } from '../core/rng.js';
export const SPEAKERS = { trudy: { name: 'Trudy', rate: 16 }, stillwater: { name: 'Ms. Stillwater', rate: 7 }, bolster: { name: 'Coach Bolster', rate: 11 }, margaret: { name: 'Gentle Margaret', rate: 12 }, kevin: { name: 'Retired Kevin', rate: 12 }, sandra: { name: 'Both Sandras', rate: 12 }, paul: { name: 'Unsteady Paul', rate: 12 }, gerald: { name: 'Young Gerald', rate: 12 } };
export class Speech {
  constructor(ui, input, audio) { this.ui = ui; this.input = input; this.audio = audio; this.cur = null; this.queue = []; this.barkT = 0; this.lastText = ''; this.spoken = 0; }
  get busy() { return !!this.cur && !this.cur.bark; }
  /** Blocking line: Use advances. Returns the line record; `done` turns true. */
  say(who, text) { const r = { who, text, bark: false, done: false }; this.queue.push(r); if (!this.cur) this.next(); return r; }
  bark(who, text, sec = 3.2) { if (this.cur && !this.cur.bark) return null; if (this.exclaim !== false && cosmetic() < .14) text = `${pick(EXCLAIM)} ${text}`; const r = { who, text, bark: true, sec, done: false }; if (this.cur) this.finish(); this.cur = null; this.show(r); return r; }
  next() { const r = this.queue.shift(); if (r) this.show(r); }
  show(r) {
    this.clearDom(); this.cur = r; this.spoken++; this.lastText = r.text;
    const sp = SPEAKERS[r.who] || { name: r.who, rate: 12 };
    const box = el('div', `speech ${r.bark ? 'bark' : ''}`); box.appendChild(txt('div', 'who', sp.name));
    r.tEl = txt('div', 'text', ''); box.appendChild(r.tEl);
    if (!r.bark) { const n = el('div', 'next'); const g = el('span'); g.dataset.verb = 'use'; n.appendChild(g); box.appendChild(n); box.addEventListener('click', (e) => { e.stopPropagation(); this.advance(); }); }
    this.ui.speech.appendChild(box); this.ui.refreshGlyphs(box); this.box = box;
    r.shown = 0; r.t = 0; r.age = 0; r.rate = sp.rate * 1.6;
    if (this.audio) this.audio.speak(r.who, r.text);
  }
  advance() {
    const r = this.cur; if (!r) return;
    if (r.shown < r.text.length) { r.shown = r.text.length; r.tEl.textContent = r.text; return; }
    this.finish();
  }
  finish() { const r = this.cur; if (r) r.done = true; this.clearDom(); this.cur = null; if (this.queue.length) this.next(); }
  clearDom() { if (this.box) { this.box.remove(); this.box = null; } }
  clear() { for (const q of this.queue) q.done = true; this.queue.length = 0; if (this.cur) this.cur.done = true; this.cur = null; this.clearDom(); if (this.audio) this.audio.hushVoice?.(); }
  tick(dt, menuTop) {
    const r = this.cur; if (!r) return;
    r.age += dt;
    if (r.shown < r.text.length) { r.t += dt * r.rate; const n = Math.min(r.text.length, Math.floor(r.t)); if (n !== r.shown) { r.shown = n; r.tEl.textContent = r.text.slice(0, n); } }
    if (r.bark) { if (r.age > r.sec + r.text.length / r.rate) this.finish(); return; }
    if (!menuTop && (this.input.merged.use || this.input.merged.hop) && r.age > .1) this.advance();
  }
}
