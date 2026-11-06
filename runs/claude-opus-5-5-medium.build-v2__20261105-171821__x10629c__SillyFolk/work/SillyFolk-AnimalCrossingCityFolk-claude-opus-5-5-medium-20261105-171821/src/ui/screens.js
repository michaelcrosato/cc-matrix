// The big, simple screens: Pockets, keyboard, letters, map, Almanac, catalogue, emotes, Chime, pattern studio, placement.
import { UI, panel, menu, dim, hit, hitAt, promptRow, para, drawGlyph } from './kit.js';
import { drawText, textWidth, wrap, LINE_H } from './font.js';
import { drawIcon, iconRows, iconColors, iconFor, iconColor } from './icons.js';
import { G, bus } from '../state.js';
import { ITEMS, sellPriceOf, FISH_LIST, BUG_LIST, FOSSIL_LIST, ART_LIST, EMOTES, EMOTE_CLIP, TOOL_ORDER } from '../data/items.js';
import { T } from '../dev/tuning.js';
import { fmt, clamp } from '../core/util.js';
import { TOWN_ROWS } from '../data/townMap.js';
import { BUILDINGS, LANDMARK } from '../world/layout.js';
import { CAST, NEIGHBOURS, nameOf } from '../data/cast.js';
import { info, addEnt, isFree, remember, giveItem, friendTier } from '../core/world.js';
import { DAY_TYPES, SEASON_NAMES } from '../core/calendar.js';
import { NPC } from '../actors/npcs.js';
import { fill, Toasts } from './dialogue.js';
import { PAL16 } from '../art/textures.js';
import { PALETTE } from '../engine.js';
const sentence = (e) => { const it = ITEMS[e?.id]; if (!it) return ''; if (e.value) return `Contains ${fmt(e.value)} beans. Probably.`; if (e.from) return `A gift from ${nameOf(e.from)}. Selling it would be noticed.`; if (e.id === 'cheesewheel') return 'It only goes up. Mostly. Until it goes off.'; return it.line ?? (it.tags ? `Very ${it.tags[0]}.` : 'It is what it is.'); };
// ---- Pockets
export function pocketsScreen(o = {}) {
  const w = G.world; const cols = 5, rows = 3, cell = 40;
  const scr = { id: o.id ?? 'pockets', title: o.title ?? 'Pockets', focus: 0, opaque: false, freezes: true, chosen: null,
    get prompts() { return this._p; }, focusLabel() { return ITEMS[w.p.pockets[this.focus]?.id]?.name ?? 'empty'; },
    itemsModel() { return w.p.pockets.map((e) => e?.id ?? null); },
    input(c) {
      const n = c.nav; if (n === 'left') this.focus = (this.focus + 14) % 15; if (n === 'right') this.focus = (this.focus + 1) % 15; if (n === 'up') this.focus = (this.focus + 10) % 15; if (n === 'down') this.focus = (this.focus + 5) % 15; if (n) UI.sfx('uiTick');
      if (c.moved) { const id = hitAt(c.mx, c.my); if (typeof id === 'number') this.focus = id; }
      const clicked = c.clickL() && typeof hitAt(c.mx, c.my) === 'number';
      if (clicked) this.focus = hitAt(c.mx, c.my);
      if (c.confirm() || clicked) { const e = w.p.pockets[this.focus]; if (!e) { UI.sfx('uiNo'); return; } UI.sfx('uiOk'); if (o.onPick) o.onPick(e, this.focus, this); else G.itemActions(e, this.focus, this); }
      if (c.back() || (!o.onPick && c.pressed('pockets'))) { UI.sfx('uiBack'); UI.pop(this); o.onClose?.(); }
    },
    draw(h, top) {
      const pw = cols * cell + 24, ph = rows * cell + 72, x = 240 - pw / 2, y = 22;
      panel(h, x, y, pw, ph); drawText(h, x + 12, y + 7, this.title, { color: 'ink' }); drawText(h, x + pw - 12, y + 7, `${fmt(w.p.beans)} beans`, { color: 'orange', align: 'right' });
      for (let i = 0; i < 15; i++) { const cx = x + 12 + (i % cols) * cell, cy = y + 20 + Math.floor(i / cols) * cell, f = i === this.focus; h.rect(cx + 1, cy + 1, cell - 2, cell - 2, f ? 'navy' : 'sand'); h.rect(cx + 3, cy + 3, cell - 6, cell - 6, f ? 'sky' : 'white'); const e = w.p.pockets[i]; if (e) { drawIcon(h, cx + 8, cy + 8, ITEMS[e.id], 2); if (o.quote && f) { } } hit(cx, cy, cell, cell, i); }
      const e = w.p.pockets[this.focus], it = ITEMS[e?.id]; const ty = y + 22 + rows * cell;
      if (it) { drawText(h, x + 12, ty, it.name + (o.quote ? `:  ${fmt(sellPriceOf(e, T))} beans` : ''), { color: 'navy' }); para(h, x + 12, ty + 12, sentence(e), pw - 24, { color: 'slate' }); } else drawText(h, x + 12, ty, 'Empty. Just like the promises.', { color: 'mist' });
      this._p = [['confirm', o.pickLabel ?? 'Use'], ['back', 'Close']]; promptRow(h, 240, y + ph + 5, this._p, { align: 'center', back: 'ink' });
    } };
  return scr;
}
// ---- On-screen keyboard + typing
const KEYS = ['ABCDEFGHIJ', 'KLMNOPQRST', 'UVWXYZ.,!?', "abcdefghij", 'klmnopqrst', "uvwxyz'-  "];
export function keyboardScreen(o) {
  const scr = { id: 'keyboard', title: o.title, text: o.initial ?? '', fx: 0, fy: 3, freezes: true, opaque: o.opaque, get prompts() { return this._p; }, focusLabel() { return KEYS[this.fy]?.[this.fx] ?? 'Done'; },
    input(c) {
      const n = c.nav; const rows = KEYS.length + 1;
      if (n === 'left') this.fx = (this.fx + 9) % 10; if (n === 'right') this.fx = (this.fx + 1) % 10; if (n === 'up') this.fy = (this.fy + rows - 1) % rows; if (n === 'down') this.fy = (this.fy + 1) % rows; if (n) UI.sfx('uiTick');
      for (const k of c.typed) { if (k === 'Backspace') { this.text = this.text.slice(0, -1); UI.sfx('type'); } else if (k === 'Enter') { this.finish(); return; } else if (k.length === 1 && this.text.length < (o.max ?? 14)) { this.text += k; UI.sfx('type'); } }
      if (c.moved) { const id = hitAt(c.mx, c.my); if (id && id.k != null) { this.fx = id.x; this.fy = id.y; } if (id === 'done') { this.fy = KEYS.length; } }
      const clicked = c.clickL(); if (clicked) { const id = hitAt(c.mx, c.my); if (id && id.k != null) { this.fx = id.x; this.fy = id.y; this.press(); } if (id === 'done') { this.finish(); return; } if (id === 'del') this.text = this.text.slice(0, -1); }
      if (c.input.wasPressed('PadCross')) { if (this.fy === KEYS.length) { this.finish(); return; } this.press(); }
      if (c.input.wasPressed('PadCircle')) { if (this.text) { this.text = this.text.slice(0, -1); UI.sfx('uiBack'); } else if (o.onCancel) { UI.pop(this); o.onCancel(); return; } }
      if (c.input.wasPressed('Escape') && o.onCancel) { UI.pop(this); o.onCancel(); return; }
      if ((c.input.wasPressed('PadTriangle')) && o.suggest) { this.text = o.suggest(); UI.sfx('uiOk'); }
      if (c.input.wasPressed('PadSquare')) { if (this.text.length < (o.max ?? 14)) this.text += ' '; }
    },
    press() { const ch = KEYS[this.fy]?.[this.fx]; if (ch && this.text.length < (o.max ?? 14)) { this.text += ch; UI.sfx('type'); } },
    finish() { const t = this.text.trim(); if (!t && !o.allowEmpty) { UI.sfx('uiNo'); return; } UI.sfx('uiOk'); UI.pop(this); o.onDone(t); },
    draw(h) {
      dim(h); const pw = 300, x = 90, y = 30; panel(h, x, y, pw, 196); drawText(h, x + 12, y + 8, this.title ?? 'Type', { color: 'ink' });
      h.rect(x + 12, y + 22, pw - 24, o.lines ? 44 : 18, 'mist'); h.rect(x + 13, y + 23, pw - 26, o.lines ? 42 : 16, 'white');
      const shown = wrap(this.text + (Math.floor(UI.time * 2) % 2 ? '_' : ''), pw - 32); shown.slice(-3).forEach((l, i) => drawText(h, x + 16, y + 27 + i * LINE_H, l, { color: 'ink' }));
      const ky = y + (o.lines ? 72 : 46);
      KEYS.forEach((row, ry) => { for (let i = 0; i < 10; i++) { const ch = row[i]; const kx = x + 27 + i * 25, kyy = ky + ry * 18, f = this.fx === i && this.fy === ry; h.rect(kx, kyy, 23, 16, f ? 'navy' : 'sand'); h.rect(kx + 1, kyy + 1, 21, 14, f ? 'navy' : 'white'); if (ch && ch !== ' ') drawText(h, kx + 9, kyy + 4, ch, { color: f ? 'white' : 'ink' }); hit(kx, kyy, 23, 16, { k: ch, x: i, y: ry }); } });
      const dy = ky + KEYS.length * 18 + 1; const f = this.fy === KEYS.length; h.rect(x + 27, dy, 80, 15, f ? 'navy' : 'sand'); drawText(h, x + 44, dy + 4, 'Done', { color: f ? 'white' : 'ink' }); hit(x + 27, dy, 80, 15, 'done');
      const pad = UI.ctrl.device === 'pad'; this._p = pad ? [['confirm', 'Key'], ['back', 'Delete'], ['square', 'Space'], ...(o.suggest ? [['alt', 'Suggest']] : [])] : [['back', 'Cancel']]; promptRow(h, 240, y + 196 + 5, pad ? this._p : [], { align: 'center', back: 'ink' }); if (!pad) drawText(h, 240, y + 200, 'Just type. Enter when you’re done.', { color: 'white', align: 'center', shadow: 'ink' });
    } };
  return scr;
}
// ---- Yes/no card with an item on it
export function itemCard(it, o) {
  const m = menu({ id: 'card', title: null, w: 260, y: 40, items: [{ label: o.yes ?? 'Yes', action: () => { UI.pop(m); o.onYes?.(); } }, { label: o.no ?? 'No', action: () => { UI.pop(m); o.onNo?.(); } }], onBack: () => { UI.pop(m); o.onNo?.(); }, afterDraw: (h, _m, top, x, y) => {} });
  const base = m.draw.bind(m); m.draw = (h, top) => { dim(h); const x = 110, y = 34, w = 260; panel(h, x, y, w, 76); drawIcon(h, x + 12, y + 12, it, 4); drawText(h, x + 70, y + 12, o.title ?? it.name, { color: 'navy' }); para(h, x + 70, y + 26, o.text ?? (it.line ?? ''), w - 80, { color: 'slate' }); if (o.price != null) drawText(h, x + w - 10, y + 62, `${fmt(o.price)} beans`, { color: 'orange', align: 'right' }); const oldDim = true; drawMenuNoDim(h, top, m); };
  m.dimOff = true; const drawMenuNoDim = (h, top, mm) => { const list = mm.items(); const x = 110, y = 116, w = 260; panel(h, x, y, w, list.length * 18 + 22); list.forEach((it2, i) => { const f = i === mm.focus; if (f) h.rect(x + 6, y + 6 + i * 18, w - 12, 17, 'navy'); drawText(h, x + 14, y + 11 + i * 18, it2.label, { color: f ? 'white' : 'ink' }); hit(x + 6, y + 6 + i * 18, w - 12, 17, i); }); mm._prompts = [['confirm', 'Choose'], ['back', 'Back']]; promptRow(h, x + w - 8, y + list.length * 18 + 6, mm._prompts, { align: 'right', color: 'ink', shadow: false }); };
  return m;
}
// ---- Mail
export function mailScreen() {
  const w = G.world;
  const m = menu({ id: 'mail', title: `Mailbox (${w.mail.length})`, w: 320, opaque: false, items: () => { const l = w.mail.slice(-24).reverse().map((let_) => ({ label: `${let_.read ? ' ' : '★ '}${let_.subject}`, value: () => (let_.gift ? 'gift' : ''), action: () => UI.push(readLetter(let_)) })); return l.length ? l : [{ label: 'Nothing. Not even a bill. Enjoy that.', disabled: true }]; } });
  return m;
}
export function readLetter(l) {
  const w = G.world; l.read = true;
  const scr = { id: 'letter', title: l.subject, get prompts() { return this._p; }, freezes: true, itemsModel() { return [l.body]; },
    input(c) { if (c.confirm() || c.back() || c.clickL()) { UI.sfx('page'); if (l.gift) { if (giveItem(w, l.giftFrom ? { id: l.gift, from: l.giftFrom } : { id: l.gift })) { Toasts.add(`Attached: ${ITEMS[l.gift]?.name}.`); l.gift = null; } else Toasts.add('Your pockets are full. The gift stays in the envelope.'); } UI.pop(this); l.onRead?.(); } },
    draw(h) { dim(h); const x = 70, y = 24, pw = 340, ph = 196; h.rect(x + 3, y + 3, pw, ph, 'ink'); h.rect(x, y, pw, ph, 'white'); for (let ly = y + 40; ly < y + ph - 16; ly += 12) h.rect(x + 12, ly + 9, pw - 24, 1, 'mist'); h.rect(x, y, pw, 3, 'red'); drawText(h, x + 14, y + 10, l.subject, { color: 'navy' }); para(h, x + 14, y + 40, fill(l.body), pw - 28, { color: 'ink' }); if (l.gift) { drawIcon(h, x + pw - 40, y + ph - 40, ITEMS[l.gift], 2); drawText(h, x + pw - 46, y + ph - 28, 'Attached:', { color: 'slate', align: 'right' }); } this._p = [['confirm', 'Fold it up']]; promptRow(h, 240, y + ph + 6, this._p, { align: 'center', back: 'ink' }); } };
  return scr;
}
// ---- Map
const MAPC = { '.': 'green', u: 'lime', ',': 'sand', U: 'sand', P: 'mist', s: 'sand', r: 'orange', c: 'slate', '#': 'teal', b: 'orange', w: 'blue', o: 'sky', m: 'blue', '~': 'navy' };
export function mapScreen() {
  const scr = { id: 'map', title: 'The Village', freezes: true, opaque: true, focus: 0, get prompts() { return this._p; }, focusLabel: () => 'map', itemsModel() { return this.pins?.map((p) => p.name) ?? []; },
    input(c) { if (c.back() || c.pressed('map') || c.confirm()) { UI.sfx('uiBack'); UI.pop(this); } if (c.nav === 'left') this.focus = (this.focus + (this.pins?.length ?? 1) - 1) % (this.pins?.length ?? 1); if (c.nav === 'right') this.focus = (this.focus + 1) % (this.pins?.length ?? 1); },
    draw(h) { h.rect(0, 0, 480, 270, 'navy'); const s = 3, ox = 10, oz = 14; for (let z = 0; z < 64; z++) { let run = 0; const row = TOWN_ROWS[z]; for (let x = 0; x <= 80; x++) { if (x < 80 && row[x] === row[x - run]) { run++; continue; } if (run) h.rect(ox + (x - run) * s, oz + z * s, run * s, s, MAPC[row[x - run]] ?? 'green'); run = 1; } }
      for (const b of BUILDINGS) { h.rect(ox + Math.round((b.x - b.w / 2) * s), oz + Math.round((b.z - b.d / 2) * s), Math.round(b.w * s), Math.round(b.d * s), b.id === 'home' ? 'red' : 'plum'); }
      const w = G.world; const pins = []; for (const n of NEIGHBOURS) { const st = w.npcs[n]; if (st.moved === 'gone' || st.moved === 'notyet') continue; const rt = NPC.rt[n]; let [x, z] = [rt.x, rt.z]; if (st.place !== 'town') { const b = BUILDINGS.find((bb) => bb.id === (n === 'fitch' ? 'rocco' : n)); x = b.x; z = b.z; } pins.push({ name: CAST[n].short ?? CAST[n].name, x, z, at: st.place === 'town' ? 'out' : 'home' }); } this.pins = pins; pins.forEach((p, i) => { const f = i === this.focus; h.rect(ox + Math.round(p.x * s) - 1, oz + Math.round(p.z * s) - 1, 4, 4, f ? 'white' : p.at === 'out' ? 'sand' : 'mist'); });
      if (w.p.place === 'town') { const blink = Math.floor(UI.time * 4) % 2; h.rect(ox + Math.round(w.p.x * s) - 2, oz + Math.round(w.p.z * s) - 2, 5, 5, blink ? 'red' : 'white'); }
      panel(h, 260, 18, 208, 200); drawText(h, 272, 26, `The Village of ${w.town}`, { color: 'navy' }); const inf = info(w); drawText(h, 272, 40, `${SEASON_NAMES[inf.season]} · ${inf.type}`, { color: 'slate' }); pins.forEach((p, i) => { const ly = 58 + i * 15; const f = i === this.focus; if (f) h.rect(268, ly - 3, 196, 14, 'navy'); drawText(h, 274, ly, p.name, { color: f ? 'white' : 'ink' }); drawText(h, 458, ly, p.at === 'out' ? 'out and about' : 'at home', { color: f ? 'sand' : 'slate', align: 'right' }); });
      this._p = [['back', 'Close']]; promptRow(h, 464, 228, this._p, { align: 'right', back: 'ink' }); drawText(h, 10, 212, 'You: the flashing thing.', { color: 'white', shadow: 'ink' }); } };
  return scr;
}
// ---- Almanac
const TABS = ['Fish', 'Bugs', 'Fossils', 'Art', 'Stars', 'Calendar'];
export const CONSTELLATIONS = [{ id: 'book', name: 'The Overdue Library Book', pts: [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]] }, { id: 'spoon', name: 'The Big Spoon', pts: [[0, 0], [1, 0.4], [2, 0.7], [3, 1], [3.6, 0.5], [3.1, 0]] }, { id: 'goose', name: 'The Goose (Billing)', pts: [[0, 1], [0.5, 0.2], [1.3, 0], [2.2, 0.4], [2.4, 1.1], [1.4, 1.4]] }, { id: 'kettle', name: 'The Kettle, Left On', pts: [[0, 0.5], [0.6, 0], [1.4, 0], [1.8, 0.6], [1.4, 1.2], [0.6, 1.2], [0, 0.5], [-0.5, 0.2]] }, { id: 'bus', name: 'The Last Bus', pts: [[0, 0], [2, 0], [2, 0.8], [0, 0.8], [0, 0], [0.4, 1.1], [1.6, 1.1], [2, 0.8]] }, { id: 'tuesday', name: 'Tuesday', pts: [[0, 0], [0.8, 0.8], [1.6, 0.1], [2.4, 0.9]] }];
export function almanacScreen() {
  const w = G.world; const scr = { id: 'almanac', title: 'Almanac', tab: 0, page: 0, focus: 0, opaque: true, freezes: true, get prompts() { return this._p; }, focusLabel() { return TABS[this.tab]; }, itemsModel() { return TABS.slice(); },
    list() { return [FISH_LIST, BUG_LIST, FOSSIL_LIST, ART_LIST][this.tab] ?? []; },
    input(c) { if (c.pressed('l1') || (c.nav === 'left' && this.tab >= 4)) { this.tab = (this.tab + 5) % 6; this.focus = 0; UI.sfx('page'); } if (c.pressed('r1') || (c.nav === 'right' && this.tab >= 4)) { this.tab = (this.tab + 1) % 6; this.focus = 0; UI.sfx('page'); }
      if (c.clickL()) { const id = hitAt(c.mx, c.my); if (id && id.tab != null) { this.tab = id.tab; this.focus = 0; UI.sfx('page'); } }
      const L = this.list(); if (this.tab < 4 && L.length) { const n = c.nav; const col = 6; if (n === 'left') this.focus = (this.focus + L.length - 1) % L.length; if (n === 'right') this.focus = (this.focus + 1) % L.length; if (n === 'up') this.focus = Math.max(0, this.focus - col); if (n === 'down') this.focus = Math.min(L.length - 1, this.focus + col); if (n) UI.sfx('uiTick'); if (c.moved) { const id = hitAt(c.mx, c.my); if (typeof id === 'number') this.focus = id; } }
      if (this.tab === 4) { const n = c.nav; if (n === 'up') this.focus = (this.focus + 5) % 6; if (n === 'down') this.focus = (this.focus + 1) % 6; if (c.confirm()) { const con = CONSTELLATIONS[this.focus]; UI.push(keyboardScreen({ title: `Name it: ${con.name}`, initial: w.almanac.stars[con.id]?.name ?? '', max: 22, onDone: (t) => { w.almanac.stars[con.id] = { name: t }; }, onCancel: () => {} })); } }
      if (c.back() || (c.pressed('almanac') && this.tab !== 3)) { UI.sfx('uiBack'); UI.pop(this); } },
    draw(h) { h.rect(0, 0, 480, 270, 'navy'); panel(h, 16, 12, 448, 240); TABS.forEach((t, i) => { const tx = 24 + i * 72, f = i === this.tab; h.rect(tx, 18, 68, 16, f ? 'navy' : 'sand'); drawText(h, tx + 34, 22, t, { color: f ? 'white' : 'ink', align: 'center' }); hit(tx, 18, 68, 16, { tab: i }); });
      if (this.tab < 4) { const L = this.list(); const key = ['fish', 'bug', 'fossil', 'art'][this.tab]; L.forEach((it, i) => { const cx = 30 + (i % 6) * 72, cy = 42 + Math.floor(i / 6) * 42; const f = i === this.focus; const seen = w.almanac.seen[it.id] || w.museum[key]?.[it.id]; h.rect(cx, cy, 66, 38, f ? 'navy' : 'sand'); h.rect(cx + 2, cy + 2, 62, 34, seen ? 'white' : 'mist'); const rows = iconRows(iconFor(it)); h.sprite(cx + 21, cy + 7, rows, seen ? iconColors(iconColor(it)) : { a: 'slate', b: 'slate', k: 'slate', w: 'slate', g: 'slate' }, { shadow: false, scale: 2 }); if (w.museum[key]?.[it.id]) h.rect(cx + 56, cy + 4, 6, 6, 'lime'); hit(cx, cy, 66, 38, i); }); const it = L[this.focus]; const seen = it && (w.almanac.seen[it.id] || w.museum[key]?.[it.id]); drawText(h, 28, 215, seen ? it.name : '? ? ?', { color: 'navy' }); if (seen) para(h, 28, 227, `${it.line ?? ''}${it.price ? `  (${fmt(it.price)} beans)` : ''}`, 420, { color: 'slate' }); }
      if (this.tab === 4) { CONSTELLATIONS.forEach((c0, i) => { const f = i === this.focus; const ly = 44 + i * 30; if (f) h.rect(24, ly - 2, 200, 26, 'navy'); drawText(h, 30, ly + 2, w.almanac.stars[c0.id]?.name ?? c0.name, { color: f ? 'white' : 'ink' }); drawText(h, 30, ly + 12, w.almanac.stars[c0.id] ? 'named by you' : 'unnamed, officially', { color: f ? 'sand' : 'slate' }); }); h.rect(240, 44, 210, 180, 'night'); const c0 = CONSTELLATIONS[this.focus]; const pts = c0.pts.map(([x, y]) => [280 + x * 34, 90 + y * 50]); for (let i = 0; i < pts.length - 1; i++) { const steps = 14; for (let k = 0; k <= steps; k++) { h.rect(Math.round(pts[i][0] + ((pts[i + 1][0] - pts[i][0]) * k) / steps), Math.round(pts[i][1] + ((pts[i + 1][1] - pts[i][1]) * k) / steps), 1, 1, 'slate'); } } for (const [x, y] of pts) h.rect(x - 1, y - 1, 3, 3, 'white'); drawText(h, 246, 208, 'Lookout bench, at night.', { color: 'mist' }); }
      if (this.tab === 5) { const inf = info(w); for (let i = 0; i < 16; i++) { const cx = 28 + (i % 4) * 110, cy = 42 + Math.floor(i / 4) * 48; const d = YEAR_LABEL[i]; const today = i + 1 === inf.yd; h.rect(cx, cy, 104, 44, today ? 'red' : 'sand'); h.rect(cx + 2, cy + 2, 100, 40, today ? 'navy' : 'white'); drawText(h, cx + 6, cy + 5, `${['Spr', 'Sum', 'Aut', 'Win'][Math.floor(i / 4)]} ${(i % 4) + 1}`, { color: today ? 'sand' : 'slate' }); wrap(d, 90).slice(0, 2).forEach((l, k) => drawText(h, cx + 6, cy + 16 + k * 12, l, { color: today ? 'white' : 'ink' })); } }
      this._p = [['l1', 'Previous'], ['r1', 'Next'], ['back', 'Close']]; promptRow(h, 240, 256, this._p, { align: 'center', back: 'ink' }); } };
  return scr;
}
export const YEAR_LABEL = ['Arrival', 'Museum opens', 'Chime; Vesper', 'The Seed Toss', 'Old Rind', 'Fishing Derby', 'Vesper', 'The Lantern Float', 'Goodbye, Rocco', 'Bug-Off', 'Vesper', 'The Great Soup', 'First snow', 'Snowman Contest', 'Vesper', 'The Long Night'];
// ---- Catalogue: one big item card at a time, by category
export function catalogueScreen() {
  const w = G.world; const cats = ['furn', 'shirt', 'hat', 'glasses', 'umbrella', 'wall', 'floor']; const label = { furn: 'Furniture', shirt: 'Clothes', hat: 'Hats', glasses: 'Glasses', umbrella: 'Umbrellas', wall: 'Wallpaper', floor: 'Flooring' };
  const scr = { id: 'catalogue', title: 'Catalogue', cat: 0, i: 0, freezes: true, opaque: true, focusLabel() { const it = this.list()[this.i]; return it?.name; }, get prompts() { return this._p; }, list() { return Object.keys(w.catalog).map((k) => ITEMS[k]).filter((it) => it && it.cat === cats[this.cat] && it.price > 0); },
    input(c) { const L = this.list(); if (c.nav === 'left' && L.length) { this.i = (this.i + L.length - 1) % L.length; UI.sfx('page'); } if (c.nav === 'right' && L.length) { this.i = (this.i + 1) % L.length; UI.sfx('page'); } if (c.nav === 'up' || c.pressed('l1')) { this.cat = (this.cat + cats.length - 1) % cats.length; this.i = 0; UI.sfx('page'); } if (c.nav === 'down' || c.pressed('r1')) { this.cat = (this.cat + 1) % cats.length; this.i = 0; UI.sfx('page'); }
      if (c.confirm() || c.clickL()) { const it = L[this.i]; if (!it) return; const price = Math.round(it.price * T.buy * 1.2); if (w.p.beans < price) { UI.sfx('uiNo'); Toasts.add("You can't afford it. The catalogue is very sorry and has noted it."); return; } w.p.beans -= price; w.p.spent += price; w.mailQueue.push({ from: 'narrator', subject: `Order: ${it.name}`, body: `Your order. Please do not reply to this order. The bee will not read it.`, gift: it.id, at: w.clock.day + 1 }); UI.sfx('uiOk'); G.ctx.audio.play('stamp'); Toasts.add('Ordered. It arrives by mail tomorrow.'); bus.emit('ordered', it); }
      if (c.back()) { UI.sfx('uiBack'); UI.pop(this); } },
    draw(h) { h.rect(0, 0, 480, 270, 'plum'); panel(h, 60, 22, 360, 210); drawText(h, 240, 30, label[cats[this.cat]], { color: 'navy', align: 'center', scale: 2 }); const L = this.list(), it = L[this.i]; if (!it) { drawText(h, 240, 110, 'Nothing here yet. You can only reorder what you’ve owned.', { color: 'slate', align: 'center' }); } else { drawIcon(h, 204, 62, it, 6); drawText(h, 240, 146, it.name, { color: 'ink', align: 'center' }); drawText(h, 240, 160, `${fmt(Math.round(it.price * T.buy * 1.2))} beans, posted`, { color: 'orange', align: 'center' }); drawText(h, 240, 176, `${this.i + 1} of ${L.length}`, { color: 'slate', align: 'center' }); } this._p = [['confirm', 'Order'], ['l1', 'Category'], ['back', 'Close']]; promptRow(h, 240, 214, this._p, { align: 'center', color: 'ink', shadow: false }); } };
  return scr;
}
// ---- Emote wheel: eight wedges
export function emoteWheel(onPick) {
  const w = G.world; const scr = { id: 'emotes', title: 'Emotes', focus: 0, freezes: false, get prompts() { return this._p; }, list() { return EMOTES; }, focusLabel() { return EMOTES[this.focus]; }, itemsModel() { return EMOTES.slice(); },
    input(c) { const n = c.nav; const map = { up: 0, right: 2, down: 4, left: 6 }; if (n && map[n] != null) { const t = map[n]; const d = (t - this.focus + 8) % 8; this.focus = d === 0 ? t : d <= 4 ? (this.focus + 1) % 8 : (this.focus + 7) % 8; UI.sfx('uiTick'); } if (c.moved) { const id = hitAt(c.mx, c.my); if (typeof id === 'number') this.focus = id; } const click = c.clickL() && typeof hitAt(c.mx, c.my) === 'number'; if (click) this.focus = hitAt(c.mx, c.my); if (c.confirm() || click) { const e = EMOTES[this.focus]; if (!w.p.emotes.includes(e)) { UI.sfx('uiNo'); Toasts.add('Learn that one at the Palace Theatre.'); return; } UI.pop(this); UI.sfx('uiOk'); (onPick ?? G.doEmote)(e); return; } if (c.back() || c.pressed('emotes')) { UI.sfx('uiBack'); UI.pop(this); } },
    draw(h) { const cx = 240, cy = 118, R = 74; EMOTES.forEach((e, i) => { const a = (i / 8) * Math.PI * 2 - Math.PI / 2, x = Math.round(cx + Math.cos(a) * R * 1.35), y = Math.round(cy + Math.sin(a) * R); const known = w.p.emotes.includes(e), f = i === this.focus, wd = 66; panel(h, x - wd / 2, y - 11, wd, 22, { fill: f ? 'navy' : known ? 'white' : 'mist' }); drawText(h, x, y - 3, known ? e[0].toUpperCase() + e.slice(1) : '? ? ?', { color: f ? 'white' : known ? 'ink' : 'slate', align: 'center' }); hit(x - wd / 2, y - 11, wd, 22, i); }); this._p = [['confirm', 'Do it'], ['back', 'Never mind']]; promptRow(h, 240, 228, this._p, { align: 'center', back: 'ink' }); } };
  return scr;
}
// ---- Village Chime: 16 tall chunky columns
export function chimeScreen(onDone) {
  const w = G.world; const NOTES = 25; const scr = { id: 'chime', title: 'Village Chime', col: 0, freezes: true, opaque: false, get prompts() { return this._p; }, focusLabel() { return String(this.col); }, itemsModel() { return w.chime.slice(); },
    input(c) { const ch = w.chime; if (c.nav === 'left') this.col = (this.col + 15) % 16; if (c.nav === 'right') this.col = (this.col + 1) % 16; if (c.nav === 'up') { ch[this.col] = Math.min(NOTES - 1, ch[this.col] + 1); this.play(ch[this.col]); } if (c.nav === 'down') { ch[this.col] = Math.max(0, ch[this.col] - 1); this.play(ch[this.col]); }
      if (c.moved || c.input.isDown('MouseLeft')) { const id = hitAt(c.mx, c.my); if (id && id.col != null) { this.col = id.col; if (c.input.isDown('MouseLeft')) { const v = clamp(Math.round((202 - c.my) / 6), 0, NOTES - 1); if (ch[this.col] !== v) { ch[this.col] = v; this.play(v); } } } }
      if (c.pressed('confirm') && !c.input.isDown('MouseLeft')) { G.playChime(ch); } if (c.pressed('square')) { ch[this.col] = 0; } if (c.back()) { UI.sfx('uiOk'); UI.pop(this); bus.emit('chime'); remember(w, 'chime'); w.flags.chimeSet = true; onDone?.(); } },
    play(n) { if (n) G.ctx.audio.play('bellTone', { pitch: n - 12, volume: 0.7 }); },
    draw(h) { dim(h); panel(h, 40, 20, 400, 216); drawText(h, 240, 28, 'Compose the Village Chime', { color: 'navy', align: 'center' }); drawText(h, 240, 40, 'It plays on the Old Bell every hour. No pressure. Forever.', { color: 'slate', align: 'center' }); w.chime.forEach((n, i) => { const x = 52 + i * 23, f = i === this.col; h.rect(x, 54, 20, 150, f ? 'mist' : 'white'); h.rect(x, 54, 1, 150, 'sand'); if (n) { const y = 202 - n * 6; h.rect(x + 1, y, 19, 202 - y + 2, f ? 'navy' : i % 4 === 0 ? 'red' : 'sky'); h.rect(x + 1, y, 19, 3, 'ink'); } hit(x, 54, 20, 150, { col: i }); }); this._p = [['confirm', 'Hear it'], ['square', 'Rest'], ['back', 'Done']]; promptRow(h, 240, 214, this._p, { align: 'center', color: 'ink', shadow: false }); } };
  return scr;
}
// ---- Pattern studio: big 16×16 grid, palette strip, preview
export function patternStudio(onDone) {
  const w = G.world; const blank = () => Array.from({ length: 16 }, () => Array(16).fill(12));
  const scr = { id: 'pattern', title: 'Pattern Studio', slot: 0, cx: 8, cy: 8, color: 2, mirror: false, tool: 'pen', undo: [], grid: null, opaque: false, freezes: true, get prompts() { return this._p; }, focusLabel() { return `${this.cx},${this.cy}`; },
    open() { this.load(); },
    load() { const rows = w.p.patterns[this.slot]; this.grid = rows ? rows.map((r) => (Array.isArray(r) ? r.slice() : [...r].map((c) => PAL16.indexOf(c)))) : blank(); this.undo = []; },
    save() { w.p.patterns[this.slot] = this.grid.map((r) => r.slice()); w.p.patternsV = (w.p.patternsV ?? 0) + 1; bus.emit('pattern'); w.flags.patternDrawn = true; remember(w, 'pattern'); },
    paint(x, y) { const g = this.grid; if (this.tool === 'fill') { const from = g[y][x]; if (from === this.color) return; const st = [[x, y]]; while (st.length) { const [a, b] = st.pop(); if (a < 0 || b < 0 || a > 15 || b > 15 || g[b][a] !== from) continue; g[b][a] = this.color; st.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]); } } else { g[y][x] = this.color; if (this.mirror) g[y][15 - x] = this.color; } },
    snapshot() { this.undo.push(this.grid.map((r) => r.slice())); if (this.undo.length > 30) this.undo.shift(); },
    input(c) { const n = c.nav; if (n === 'left') this.cx = (this.cx + 15) % 16; if (n === 'right') this.cx = (this.cx + 1) % 16; if (n === 'up') this.cy = (this.cy + 15) % 16; if (n === 'down') this.cy = (this.cy + 1) % 16;
      if (c.moved || c.input.isDown('MouseLeft')) { const id = hitAt(c.mx, c.my); if (id && id.gx != null) { this.cx = id.gx; this.cy = id.gy; if (c.input.isDown('MouseLeft')) { if (!this.down) { this.snapshot(); this.down = true; } this.paint(id.gx, id.gy); } } if (id && id.pal != null && c.clickL()) { this.color = id.pal; } if (id && id.btn && c.clickL()) this.button(id.btn); }
      if (!c.input.isDown('MouseLeft')) this.down = false;
      if (c.input.wasPressed('PadCross') || c.input.wasPressed('KeyE') || c.input.wasPressed('Enter')) { this.snapshot(); this.paint(this.cx, this.cy); }
      if (c.pressed('l1')) this.color = (this.color + 15) % 16; if (c.pressed('r1')) this.color = (this.color + 1) % 16;
      if (c.input.wasPressed('PadSquare') || c.input.wasPressed('Space')) this.tool = this.tool === 'pen' ? 'fill' : 'pen';
      if (c.input.wasPressed('PadTriangle') || c.input.wasPressed('KeyT')) this.mirror = !this.mirror;
      if (c.input.wasPressed('KeyZ') || c.input.wasPressed('PadDown') && false) this.button('undo'); if (c.input.wasPressed('PadL2')) this.button('undo'); if (c.input.wasPressed('PadR2') || c.input.wasPressed('KeyX')) this.button('slot');
      if (c.back()) { this.save(); UI.sfx('uiOk'); UI.pop(this); onDone?.(this.slot); } },
    button(b) { if (b === 'undo' && this.undo.length) this.grid = this.undo.pop(); if (b === 'slot') { this.save(); this.slot = (this.slot + 1) % 8; this.load(); } if (b === 'mirror') this.mirror = !this.mirror; if (b === 'fill') this.tool = this.tool === 'pen' ? 'fill' : 'pen'; UI.sfx('uiTick'); },
    draw(h) { const s = 12, ox = 12, oy = 18; panel(h, 4, 4, 300, 262); h.rect(ox - 1, oy - 1, 16 * s + 1, 16 * s + 1, 'mist'); const g = this.grid; const PAL = PAL16; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { h.rect(ox + x * s, oy + y * s, s - 1, s - 1, PAL[g[y][x]]); hit(ox + x * s, oy + y * s, s, s, { gx: x, gy: y }); } const blink = Math.floor(UI.time * 4) % 2 ? 'white' : 'ink'; for (const [a, b, c2, d] of [[0, 0, s, 1], [0, s - 1, s, 1], [0, 0, 1, s], [s - 1, 0, 1, s]]) h.rect(ox + this.cx * s + a, oy + this.cy * s + b, c2, d, blink); PAL.forEach((p, i) => { const f = i === this.color; const px = 212 + (i % 4) * 21, py = 18 + Math.floor(i / 4) * 21; h.rect(px - 1, py - 1, 20, 20, f ? 'red' : 'sand'); h.rect(px + 1, py + 1, 16, 16, p); hit(px, py, 19, 19, { pal: i }); }); drawText(h, 212, 110, `Slot ${this.slot + 1} of 8`, { color: 'navy' }); hit(212, 108, 80, 12, { btn: 'slot' }); drawText(h, 212, 124, `Tool: ${this.tool}`, { color: 'ink' }); hit(212, 122, 80, 12, { btn: 'fill' }); drawText(h, 212, 138, `Mirror: ${this.mirror ? 'on' : 'off'}`, { color: 'ink' }); hit(212, 136, 80, 12, { btn: 'mirror' }); drawText(h, 212, 152, `Undo: ${this.undo.length}`, { color: 'ink' }); hit(212, 150, 80, 12, { btn: 'undo' }); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) h.rect(226 + x * 3, 172 + y * 3, 3, 3, PAL[g[y][x]]); this._p = [['confirm', 'Paint'], ['l1', 'Colour'], ['square', 'Fill'], ['alt', 'Mirror'], ['back', 'Save']]; promptRow(h, 12, 248, this._p.slice(0, 3), { color: 'ink', shadow: false }); promptRow(h, 180, 248, this._p.slice(3), { color: 'ink', shadow: false }); } };
  return scr;
}
