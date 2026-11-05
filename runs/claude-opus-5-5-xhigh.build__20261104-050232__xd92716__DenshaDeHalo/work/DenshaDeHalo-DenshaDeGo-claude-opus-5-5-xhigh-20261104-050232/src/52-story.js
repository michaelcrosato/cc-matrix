/* 52-story: radio chatter and subtitles during play (non-modal: the train keeps running), queued so lines never
 * overlap: a portrait, the speaker's name in their colour, the line typed out while the gibberish voice speaks it;
 * calls show the romaji and the English. First-time tips with the right button glyph (remembered in the save; the Show
 * tips setting brings them back each stage). */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, px = E.px, game = DH.game, F = E.font;
const T = (g, s, x, y, c, o = {}) => F.text(g, String(s), Math.round(x), Math.round(y), c, Object.assign({ outline: false }, o));
const TIPS = {
  ats: [['ATS bell!'], ['ats'], ['confirm, then brake.']],
  departCall: [['Signal clear. Call it:'], ['call'], ['before power.']],
  call: [['Point and call:'], ['call'], ['best at 120-60 m.']],
  yellow: [['Yellow: 45 to the next signal. YG: 65.']],
  slip: [['Wheel slip! Ease the power:'], ['down']],
  slide: [['Sliding on wet rails! Brake earlier, gentler.']],
  grace: [['Halo Time is low! Good stops earn it back.']],
  limit: [['Limit board: under it as your front passes, until your rear clears.']],
  horn: [['Horn board: hold'], ['horn'], ['half a second.']],
  stop: [['Stop Gauge: nose on the mark, ease to B1 at the end.']],
  pass: [['A PASS station: do not stop. Call it:'], ['call']],
  pilot: [['Power when the PILOT lamp lights.']],
  crossing: [['Level crossing: the bells and gates are for you.']],
  lever: [['Lever:'], ['lever'], ['power up, brake down.'], ['neutral'], ['N']]
};
DH.TIPS = TIPS;
class Story {
  constructor() { this.q = []; this.cur = null; this.tip = null; this.tipQ = []; this.seen = new Set(DH.store.get('tips', [])); this.call = null; }
  reset() { this.q.length = 0; this.cur = null; this.tip = null; this.tipQ.length = 0; this.call = null; this.stageSeen = new Set(); }
  /** queue lines: [{ who, text }] */
  say(lines, o = {}) { for (const l of lines) this.q.push(Object.assign({ delay: 0 }, l)); if (o.delayFirst && this.q.length) this.q[this.q.length - lines.length].delay = o.delayFirst; if (o.now) { this.cur = null; } }
  /** a call's subtitle (the driver): it takes over at once */
  callLine(phrase, great, auto) { this.call = { r: phrase[0], en: phrase[1], t: 0, great, auto }; if (DH.Babble) DH.Babble.say(phrase[0], 'driver', { vol: 1 }); }
  tipShow(id) {
    if (!TIPS[id]) return; const always = game.settings.tips;
    if (always ? (this.stageSeen && this.stageSeen.has(id)) : this.seen.has(id)) return;
    if (this.stageSeen) this.stageSeen.add(id); this.seen.add(id); DH.store.set('tips', [...this.seen]);
    this.tipQ.push({ id, t: 0 });
  }
  update(dt) {
    if (!this.cur && this.q.length) { const l = this.q[0]; l.delay -= dt; if (l.delay <= 0) { this.q.shift(); this.cur = { l, t: 0, dur: Math.max(2.4, l.text.length / 13 + 1.2) }; const ch = DH.CHARS[l.who] || {}; if (DH.Babble) DH.Babble.say(l.text, ch.voice || 'pa'); if (DH.Sound) DH.Sound.duck(true); } }
    if (this.cur) { this.cur.t += dt; if (this.cur.t >= this.cur.dur) { this.cur = null; if (!this.q.length && DH.Sound) DH.Sound.duck(false); } }
    if (this.call) { this.call.t += dt; if (this.call.t > 1.8) this.call = null; }
    if (!this.tip && this.tipQ.length) this.tip = this.tipQ.shift();
    if (this.tip) { this.tip.t += dt; if (this.tip.t > 5) this.tip = null; }
  }
  busy() { return !!this.cur || this.q.length > 0; }
  /** the subtitle box above the dash, the call's words, the tip */
  draw(g, W, H, top, o = {}) {
    const subs = game.settings.subtitles;
    if (this.cur && subs) {
      const l = this.cur.l, ch = DH.CHARS[l.who] || { name: l.who.toUpperCase(), col: '#ffffff' }, bw = Math.min(W - 24, 330), bx = Math.round((W - bw) / 2), lines = F.wrap(l.text, bw - 46), bh = Math.max(32, 14 + lines.length * 9), by = top - bh - (o.raise || 6);
      const a = Math.min(1, this.cur.t / .15, (this.cur.dur - this.cur.t) / .2);
      px.blend(g, Math.max(.1, a), 'normal', () => {
        E.ui.box(g, bx, by, bw, bh, { alpha: .82, bg: '#0a0c18', border: ch.col });
        const pr = DH.portrait(l.who); if (pr && pr.drawPortrait) pr.drawPortrait(g, bx + 4, by + 4, 26, { bg: '#1a2a4a' }); else if (typeof pr === 'function') pr(g, bx + 4, by + 4, 26);
        T(g, ch.name, bx + 36, by + 4, ch.col, { shadow: '#000' });
        const shown = Math.floor(this.cur.t * 40); let n = 0;
        lines.forEach((ln, i) => { const part = ln.slice(0, Math.max(0, shown - n)); n += ln.length; T(g, part, bx + 36, by + 14 + i * 9, '#f4f0e8'); });
      });
    }
    if (this.call) {
      const c = this.call, y = Math.round(H * .44), k = Math.min(1, c.t / .1);
      T(g, c.r, W / 2, y, c.great ? '#ffffff' : '#c8d0e8', { align: 'center', scale: 2, shadow: '#000', outline: '#000' });
      if (subs) T(g, c.en + (c.auto ? '  (AUTO)' : c.great ? '  GREAT' : ''), W / 2, y + 17, c.great ? '#ffe070' : '#c8d0e8', { align: 'center', shadow: '#000' });
    }
    if (this.tip && !o.noTips) {
      const parts = TIPS[this.tip.id], y = Math.round(top * .5), isGlyph = p => p.length === 1 && (game.input.map[p[0]] || p[0] === 'lever') && p[0].length < 9 && !/\s/.test(p[0]);
      const widths = parts.map(p => isGlyph(p) ? DH.Glyph.width(p[0]) + 4 : F.width(p[0]) + 4), total = widths.reduce((s, w) => s + w, 0), a = Math.min(1, this.tip.t / .2, (5 - this.tip.t) / .3);
      px.blend(g, Math.max(.1, a), 'normal', () => {
        if (total <= W - 24) {
          const x0 = Math.round(W / 2 - total / 2); E.ui.box(g, x0 - 8, y - 4, total + 16, 18, { alpha: .85, bg: '#2a2410', border: '#f2c230' });
          let x = x0; parts.forEach((p, i) => { if (isGlyph(p)) DH.Glyph.draw(g, p[0], x, y); else T(g, p[0], x, y + 2, '#fff4c8'); x += widths[i]; });
        } else {
          const text = parts.map(p => isGlyph(p) ? '[' + DH.Glyph.label(p[0]) + ']' : p[0]).join(' '), lines = F.wrap(text, W - 40), bw = Math.max(...lines.map(l => F.width(l))) + 16;
          E.ui.box(g, Math.round(W / 2 - bw / 2), y - 4, bw, lines.length * 10 + 8, { alpha: .85, bg: '#2a2410', border: '#f2c230' }); lines.forEach((l, i) => T(g, l, W / 2, y + i * 10, '#fff4c8', { align: 'center' }));
        }
      });
    }
  }
}
DH.Story = Story;
})();
