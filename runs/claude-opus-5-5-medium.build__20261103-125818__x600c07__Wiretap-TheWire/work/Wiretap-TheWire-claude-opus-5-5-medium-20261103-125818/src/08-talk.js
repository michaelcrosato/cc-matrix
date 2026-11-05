// WIRETAP: talk. Dialogue runs on E.Dialog (portraits, typing, choices by keys, d-pad, hover or click) and the voice synth
// speaks each line's syllables as they type. A sequence is a list of [who, text] lines, choices and functions.
const Talk = {
  d: null, seq: null, i: 0, done: null, text: '', who: null, last: 0, phone: false,
  init() { this.d = new E.Dialog(game, { speed: 45, voice: null, lines: 3 }); this.d.bg = '#141210'; this.d.border = '#e9dcb5'; this.d.nameColor = '#ffb347'; },
  get open() { return !!(this.d && this.d.open) || !!this.seq; },
  /** run a sequence: ['who', 'text'] | { choices: [...], pick(i) } | () => {} ; done() at the end. o.phone: phone filter */
  run(seq, done, o = {}) { this.seq = seq.filter(Boolean); this.i = 0; this.done = done || null; this.phone = !!o.phone; this.auto = o.auto || 0; this.next(); },
  next() {
    const d = this.d;
    while (this.seq && this.i < this.seq.length) {
      const it = this.seq[this.i++];
      if (typeof it === 'function') { const r = it(); if (r && r.wait) { this.waiting = r.wait; return; } continue; }
      if (Array.isArray(it)) { this.say(it[0], it[1], {}); return; }
      if (it && it.choices) { const lab = it.choices.map(c => clean(c)); this.say(it.who || 'dana', it.prompt || '', { choices: lab, onChoice: i => { const r = it.pick(i); if (Array.isArray(r)) this.seq.splice(this.i, 0, ...r); } }); return; }
    }
    const f = this.done; this.seq = null; this.done = null; game.audio.duck && game.audio.duck(false);
    if (f) f();
  },
  say(who, text, o) {
    const d = this.d, nm = CAST[who] ? CAST[who].short : String(who).toUpperCase().replace(/_/g, ' '), t = clean(text);
    d.speed = TEXT_CPS[game.settings.textSpeed] || 45; this.text = t; this.who = who; this.last = 0;
    try { game.audio.duck && game.audio.duck(true); } catch (e) {}
    d.say(t || ' ', Object.assign({ name: who === 'none' ? undefined : nm, portrait: CAST[who] && !this.phone ? rigOf(who) : null, portraitSize: 40, auto: Attract.on ? 1.1 : this.auto || undefined, onDone: () => { if (!o.choices) this.next(); } }, o.choices ? { choices: o.choices, onChoice: i => { o.onChoice(i); this.next(); } } : {}));
  },
  update(dt) {
    if (!this.d) return false;
    if (this.waiting) { if (typeof this.waiting === 'function' ? this.waiting() : (this.waiting -= dt) <= 0) { this.waiting = null; this.next(); } return true; }
    const open = this.d.update(dt);
    // the voice: syllables for the letters typed since last step
    const s = this.d.shown | 0;
    if (this.d.open && s > this.last) { const flat = this.text; for (let k = this.last; k < Math.min(s, flat.length); k++) { if (flat[k] === '—') Voice.bleep(); else Voice.char(flat[k], VOICES[this.who] ? this.who : 'man', { phone: this.phone }); } }
    this.last = s;
    return open || !!this.seq;
  },
  draw(r) { if (this.d) this.d.draw(r); },
  skip() { if (this.d && this.d.open) this.d.close(); this.seq = null; this.done = null; }
};
/** first-time tips, once each */
function tip(id, title, text) { if (STATE.tips[id] || Attract.on) return; STATE.tips[id] = 1; if (ui) ui.tutorial(title, text, 6); }
function toast(title, text, s = 3) { if (ui && !Attract.on) ui.toast(title, text, s); }
const promptFor = (act, label, hint, progress) => ({ act, label, hint, progress });
BUS.on('meter', (k, o) => {
  if (Attract.on) return;
  const names = { brass: "Major's patience", heat: 'Street heat', legal: 'Legal risk', case: 'Case', fund: 'Fund' };
  if (o.why === null) return;
  if (k === 'case') { Music.sting('casePoint'); toast('Case +' + o.d, o.why || ''); }
  else if (k !== 'fund') toast(names[k] + ' ' + (o.d > 0 ? '+' : '') + o.d, o.why || '');
  if (k === 'brass' && STATE.meters.brass <= 0 && typeof Director !== 'undefined') Director.shutdown();
});
