import { h } from './dom.js';
import { promptHTML } from '../input/glyphs.js';
import { VOICES, nonsense } from '../audio/voice.js';

export const SPEAKERS = {
  trudy: { name: 'Trudy', voice: 'trudy' }, stillwater: { name: 'Ms. Stillwater', voice: 'stillwater' },
  bolster: { name: 'Coach Bolster', voice: 'bolster' }, margaret: { name: 'Gentle Margaret', voice: 'margaret' },
  kevin: { name: 'Retired Kevin', voice: 'kevin' }, sandras: { name: 'Both Sandras', voice: 'sandras' },
  paul: { name: 'Unsteady Paul', voice: 'paul' }, gerald: { name: 'Young Gerald', voice: 'gerald' },
  gary: { name: 'Gary', voice: null },
};

/** A paper speech tag in the lower third. Text types out in time with the voice. Every word is on screen. */
export class Speech {
  constructor(game, root) {
    this.game = game;
    this.el = h('div.speech'); this.el.style.display = 'none';
    this.who = h('div.who'); this.text = h('div.text'); this.next = h('div.next');
    this.el.append(this.who, this.text, this.next);
    root.append(this.el);
    this.line = null; this.t = 0; this.left = 0; this.shown = 0; this.history = [];
  }
  /** blocking: Use advances. auto: seconds until it clears by itself. */
  say(who, text, { auto = 0, top = false } = {}) {
    const sp = SPEAKERS[who] || { name: who, voice: null };
    // Now and then a passing remark starts with an exclamation in nonsense. It is written as well as said.
    this.count = (this.count || 0) + 1;
    if (auto && sp.voice && this.count % 6 === 0) text = `${nonsense(this.count / 6)} ${text}`;
    this.line = { who, text, auto, cps: this._cps(sp), done: false, finished: false };
    this.who.textContent = sp.name;
    this.text.textContent = '';
    this.shown = 0; this.t = 0;
    this.el.style.display = '';
    this.el.classList.toggle('top', !!top);
    this.el.classList.toggle('high', !!(top && this.game.currentEvent && this.game.currentEvent.barkHigh));
    this.next.innerHTML = '';
    this.history.push({ who, text });
    if (this.history.length > 40) this.history.shift();
    if (sp.voice) this.game.audio.say(sp.voice, text);
    else if (who === 'gary') this.game.audio.sfx('squawk');
    return this.line;
  }
  _cps(sp) {
    const v = VOICES[sp.voice];
    if (!v) return 30;
    return Math.min(46, v.rate * 2.7);
  }
  get active() { return !!this.line; }
  clear() {
    this.line = null;
    this.el.style.display = 'none';
    this.game.audio.stopVoice();
  }
  /** Use: finish typing, or move on. */
  advance() {
    const l = this.line;
    if (!l) return true;
    if (!l.finished) { this.t = 1e9; this._type(); return false; }
    l.done = true;
    this.clear();
    return true;
  }
  _type() {
    const l = this.line;
    const n = Math.min(l.text.length, Math.floor(this.t * l.cps));
    if (n !== this.shown) { this.shown = n; this.text.textContent = l.text.slice(0, n); }
    if (n >= l.text.length && !l.finished) {
      l.finished = true;
      if (!l.auto) this.next.innerHTML = promptHTML('use', 'Next', this.game.input.lastDevice, this.game.save.settings.glyphs);
    }
  }
  fixed(dt) {
    const l = this.line;
    if (!l) return;
    this.t += dt;
    this._type();
    if (l.auto && l.finished) {
      l.auto -= dt;
      if (l.auto <= 0) { l.done = true; this.clear(); }
    }
  }
}
