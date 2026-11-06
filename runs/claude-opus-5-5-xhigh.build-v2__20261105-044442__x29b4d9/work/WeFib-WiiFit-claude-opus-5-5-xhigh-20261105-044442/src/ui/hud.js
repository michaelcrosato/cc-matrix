import { h } from './dom.js';
import { BalanceDisc } from './disc.js';
import { promptHTML, glyphHTML } from '../input/glyphs.js';

/** Disc bottom left, one big score top right, time top centre, event widgets, this event's verbs. */
export class HUD {
  constructor(game, root) {
    this.game = game;
    this.el = h('div.hud'); this.el.style.display = 'none'; root.append(this.el);
    this.score = h('div.hud-score.tag'); this.time = h('div.hud-time.tag'); this.big = h('div.hud-big');
    this.widgets = h('div.hud-widgets'); this.widgetsR = h('div.hud-widgetsR'); this.note = h('div.hud-note.tag'); this.promptEl = h('div.hud-prompts');
    this.discsEl = h('div.discs');
    this.el.append(this.score, this.time, this.big, this.widgets, this.widgetsR, this.note, this.promptEl, this.discsEl);
    this.discs = []; this.promptList = []; this.frameN = 0; this.lastDevice = null; this.bigT = 0; this.noteT = 0;
    this.scoreText = null; this.timeText = null; this.promptDevice = null; this.promptGlyphs = null;
    this.note.style.display = 'none';
    this.discsVisible = true;
  }
  show(on = true) { this.el.style.display = on ? '' : 'none'; }
  reset() {
    for (const d of this.discs) d.disc.remove();
    this.discs = [];
    this.widgets.innerHTML = ''; this.widgetsR.innerHTML = '';
    this.big.textContent = ''; this.note.style.display = 'none';
    this.setScore('', ''); this.setTime(null); this.setPrompts([]);
    this.discsEl.classList.remove('group');
  }
  /** One disc per lane to show. group: small discs along the bottom edge. */
  setDiscs(lanes, group = false) {
    for (const d of this.discs) d.disc.remove();
    this.discs = [];
    this.discsEl.classList.toggle('group', group);
    for (const lane of lanes) {
      const disc = new BalanceDisc(this.discsEl, { small: group, colour: lane.colour || '#1A1420', name: group ? lane.name : null });
      if (!group) disc.addBreathWord();
      else {
        // Each player's disc shows that player's own device.
        const dev = lane.source === 'kbm' || lane.source === 'any' ? 'kbm' : 'pad';
        disc.root.append(h('div.disc-dev', { html: glyphHTML('lean', dev, this.game.save.settings.glyphs) }));
      }
      this.discs.push({ lane, disc });
    }
  }
  setScore(v, label = '') {
    const t = `${v}|${label}`;
    if (t === this.scoreText) return;
    this.scoreText = t;
    this.score.style.display = v === '' ? 'none' : '';
    this.score.innerHTML = '';
    this.score.append(document.createTextNode(String(v)));
    if (label) this.score.append(h('small', label));
  }
  setTime(sec) {
    const t = sec === null ? '' : String(Math.ceil(Math.max(0, sec)));
    if (t === this.timeText) return;
    this.timeText = t;
    this.time.style.display = sec === null ? 'none' : '';
    this.time.textContent = t;
  }
  setPrompts(list) { this.promptList = list; this.promptDevice = null; }
  flash(text, sec = 0.9) { this.big.textContent = text; this.bigT = sec; }
  setNote(text, sec = 2) { this.note.textContent = text; this.note.style.display = text ? '' : 'none'; this.noteT = sec; }
  addWidget(el, right = false) { (right ? this.widgetsR : this.widgets).append(el); return el; }
  meter(label, colour) {
    const fill = h('div.fill'); if (colour) fill.style.background = colour;
    const m = h('div.meter', fill);
    const el = h('div.meter-wrap', h('span.tag', { style: 'padding:0 1.2rem;font-size:3rem;border-width:.4rem;box-shadow:none' }, label), m);
    el.set = (v) => { fill.style.width = `${Math.max(0, Math.min(1, v)) * 100}%`; };
    return el;
  }
  frame(dt) {
    const { input, save } = this.game;
    if (input.lastDevice !== this.promptDevice || save.settings.glyphs !== this.promptGlyphs) {
      this.promptDevice = input.lastDevice; this.promptGlyphs = save.settings.glyphs;
      this.promptEl.innerHTML = this.promptList.map(([v, t]) => promptHTML(v, t, input.lastDevice, save.settings.glyphs)).join('');
    }
    const hide = this.game.paused;
    if (hide !== this.promptsHidden) { this.promptsHidden = hide; this.promptEl.style.display = hide ? 'none' : ''; }
    if (this.bigT > 0) { this.bigT -= dt; if (this.bigT <= 0) this.big.textContent = ''; }
    if (this.noteT > 0) { this.noteT -= dt; if (this.noteT <= 0) this.note.style.display = 'none'; }
    this.frameN++;
    for (const { lane, disc } of this.discs) {
      const v = lane.discView;
      if (v) { v.frame = this.frameN; disc.update(v); }
    }
  }
}
