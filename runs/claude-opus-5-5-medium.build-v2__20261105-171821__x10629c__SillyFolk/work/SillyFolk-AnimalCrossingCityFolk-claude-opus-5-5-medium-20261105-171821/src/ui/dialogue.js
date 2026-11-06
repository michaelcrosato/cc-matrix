// Script runner (generators), dialogue panel with typewriter and voices, choices, toasts, tag filling.
import { UI, panel, promptRow, hit, hitAt } from './kit.js';
import { drawText, wrap, textWidth, LINE_H } from './font.js';
import { CAST, nameOf } from '../data/cast.js';
import { speakChar, textSpeedOf } from '../audio/voice.js';
import { G } from '../state.js';
import { T } from '../dev/tuning.js';
import { GANDER } from '../data/lines.js';
export function fill(text, tags = {}) { const w = G.world; return String(text).replace(/\{(\w+)\}/g, (m, k) => { const v = tags[k] ?? (k === 'player' ? w?.name : k === 'town' ? w?.town : null); return v ?? m; }); }
// ---- Scripts: generator functions that yield waiters
export const Script = { list: [],
  run(gen, o = {}) { const s = { gen, wait: null, value: undefined, o }; this.list.push(s); this.step(s); return s; },
  step(s) { for (let guard = 0; guard < 100; guard++) { const r = s.gen.next(s.value); s.value = undefined; if (r.done) { this.list.splice(this.list.indexOf(s), 1); s.done = true; s.o.onDone?.(); return; } const y = r.value; if (y == null) continue; s.wait = typeof y === 'number' ? { t: y } : y; return; } },
  update(dt) { for (const s of this.list.slice()) { const w = s.wait; if (w == null) continue; if (w.t != null) { w.t -= dt; if (w.t <= 0) { s.wait = null; this.step(s); } } else if (w.done?.()) { s.value = w.value?.(); s.wait = null; this.step(s); } } },
  get active() { return this.list.some((s) => !s.o.background); }, clear() { this.list.length = 0; },
};
/** A waiter that finishes when `f` returns truthy. */
export const until = (f, value) => ({ done: f, value });
export function say(speaker, text, o = {}) { const scr = dialogueScreen(speaker, text, null, o); UI.push(scr); return until(() => scr.closed); }
export function ask(speaker, text, options, o = {}) { const scr = dialogueScreen(speaker, text, options, o); UI.push(scr); return until(() => scr.closed, () => scr.answer); }
function dialogueScreen(speaker, raw, options, o) {
  const cast = CAST[speaker] ?? CAST.narrator;
  const pages = fill(raw, o.tags).split('|').map((s) => s.trim()).filter(Boolean);
  const w = 396, pad = 14;
  const scr = { id: 'dialogue', speaker, freezes: o.freezes !== false, page: 0, chars: 0, closed: false, answer: 0, focus: 0, title: null, cast, fullText: pages.join(' '),
    get lines() { return (this._c === this.page && this._l) || (this._c = this.page, this._l = wrap(pages[this.page], w - pad * 2)); },
    get pageLen() { return pages[this.page].length; },
    get prompts() { return [['confirm', 'Next']]; },
    focusLabel() { return options ? options[this.focus] : null; }, itemsModel() { return options && this.showChoices ? options.slice() : null; },
    get showChoices() { return options && this.page === pages.length - 1 && this.chars >= this.pageLen; },
    input(c, dt) {
      if (this.chars < this.pageLen) {
        const before = Math.floor(this.chars); this.chars = Math.min(this.pageLen, this.chars + dt * textSpeedOf(cast) * (cast.voice?.speed > 1.5 ? 1 : 1));
        const text = pages[this.page];
        for (let i = before; i < Math.floor(this.chars); i++) { if (speaker === 'gander' && text.startsWith('HONK', i) ) { G.ctx.audio.play('honk'); } else speakChar(G.ctx.audio, cast, text[i], i, text, o.volume ?? 1, o.sing ? (cast.voice?.pitch ?? 0) + o.sing[i % o.sing.length] : null); }
        if (o.actor) o.actor.talking = 0.1;
        if (c.confirm() || c.clickL()) this.chars = this.pageLen;
        return;
      }
      if (this.showChoices) {
        if (c.nav === 'up') { this.focus = (this.focus + options.length - 1) % options.length; UI.sfx('uiTick'); } if (c.nav === 'down') { this.focus = (this.focus + 1) % options.length; UI.sfx('uiTick'); }
        if (c.moved) { const id = hitAt(c.mx, c.my); if (typeof id === 'number') this.focus = id; }
        if (c.confirm() || (c.clickL() && typeof hitAt(c.mx, c.my) === 'number')) { if (c.clickL()) { const id = hitAt(c.mx, c.my); if (typeof id === 'number') this.focus = id; } this.answer = this.focus; UI.sfx('uiOk'); this.close(); return; }
        if (c.back() && o.cancel != null) { this.answer = o.cancel; UI.sfx('uiBack'); this.close(); }
        return;
      }
      if (c.confirm() || c.clickL() || (o.auto && (this.waitAuto = (this.waitAuto ?? 0) + dt) > o.auto)) { this.waitAuto = 0; if (this.page < pages.length - 1) { this.page++; this.chars = 0; UI.sfx('uiTick'); } else this.close(); }
    },
    close() { this.closed = true; UI.pop(this); },
    draw(h, top) {
      const x = 42, ht = 58, y = 270 - 14 - ht;
      panel(h, x, y, w, ht);
      if (cast.name) { const nm = o.name ?? cast.name; const nw = textWidth(nm) + 12; h.rect(x + 10, y - 7, nw, 13, 'navy'); drawText(h, x + 16, y - 4, nm, { color: 'white' }); }
      let n = Math.floor(this.chars), ly = y + 12;
      for (const l of this.lines) { const show = l.slice(0, Math.max(0, n)); drawText(h, x + pad, ly, show, { color: 'ink' }); n -= l.length + 1; ly += LINE_H; }
      if (this.chars >= this.pageLen && !options) { const bob = Math.floor(UI.time * 3) % 2; h.sprite(x + w - 16, y + ht - 11 + bob, ['#####', '.###.', '..#..'], { '#': 'red' }, { shadow: false }); }
      if (this.showChoices) { const cw = Math.max(90, ...options.map((s) => textWidth(s))) + 26, chH = options.length * 16 + 8, cx = x + w - cw - 4, cy = y - chH - 4; panel(h, cx, cy, cw, chH); options.forEach((s, i) => { const f = i === this.focus; if (f) h.rect(cx + 5, cy + 4 + i * 16, cw - 10, 15, 'navy'); drawText(h, cx + 12, cy + 7 + i * 16, s, { color: f ? 'white' : 'ink' }); hit(cx + 5, cy + 4 + i * 16, cw - 10, 15, i); }); }
    } };
  return scr;
}
// ---- Toasts
export const Toasts = { list: [], add(text, ms = 2.6) { this.list.push({ text: fill(text), t: ms }); if (this.list.length > 3) this.list.shift(); }, update(dt) { for (const t of this.list) t.t -= dt; this.list = this.list.filter((t) => t.t > 0); }, draw(h) { let y = UI.stack.some((s) => s.id !== 'dialogue') ? 216 : 46; for (const t of this.list) { const w = textWidth(t.text) + 16; const x = Math.round(240 - w / 2); panel(h, x, y, w, 15); drawText(h, x + 8, y + 4, t.text, { color: 'ink' }); y += 18; } } };
