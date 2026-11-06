// Screens: each a focused single idea. Pockets, Map, Almanac, Emotes, on-screen keyboard, big-card chooser, pause.
import { W, H } from './controls.js';
import { textWidth, wrapText, LINE } from './draw.js';
import { drawItemIcon, drawIcon } from './icons.js';
import { item, ITEMS } from '../data/items.js';
import { FISH, BUGS, FOSSILS, ART, byId } from '../data/collect.js';
import { SEASONS, DAY_TYPES, seasonOf } from '../core/calendar.js';
import { BUILDINGS, TW, TD, T } from '../world/townMap.js';
const backdrop = (d) => { d.rect(0, 0, W, H, 'night'); };
export class PocketsScreen {
  constructor(opts = {}) { this.id = 'pockets'; this.sel = 0; this.mode = 'browse'; this.act = { i: 0 }; this.opts = opts; this.freeze = true; }
  tick(ui, dt, active) {
    const g = ui.game, w = g.world, d = ui.d; backdrop(d); d.panel(30, 14, 420, 242, { fill: 'white', trim: 'sand' }); d.text(240, 22, this.opts.title ?? 'Pockets', 'navy', { align: 'center' });
    const slots = w.pockets; const cols = 5, cw = 44, ch = 40, x0 = 52, y0 = 40;
    if (this.mode === 'browse' && active) { const n = ui.c.nav; if (n.x) { this.sel = (this.sel + n.x + 15) % 15; g.sfx('tick'); } if (n.y) { this.sel = (this.sel + n.y * 5 + 15) % 15; g.sfx('tick'); } }
    for (let i = 0; i < 15; i++) {
      const cx = x0 + (i % cols) * cw, cy = y0 + Math.floor(i / cols) * ch; const hv = ui.hit('p' + i, cx, cy, cw - 4, ch - 4, active && this.mode === 'browse'); if (hv.over && ui.c.ptr.moved) this.sel = i; if (hv.click) { this.sel = i; if (slots[i]) this.open(g, slots[i]); }
      d.rect(cx, cy, cw - 4, ch - 4, i === this.sel ? 'red' : 'mist'); d.rect(cx + 1, cy + 1, cw - 6, ch - 6, i === this.sel ? 'sand' : 'white');
      const s = slots[i]; if (s) { drawItemIcon(d, cx + 6, cy + 4, item(s.id), 2); if ((s.n ?? 1) > 1) d.text(cx + cw - 8, cy + ch - 14, 'x' + s.n, 'ink', { align: 'right' }); }
    }
    const s = slots[this.sel]; const bx = 280, by = 40; d.rect(bx, by, 160, 114, 'sky');
    if (s) { const it = item(s.id); drawItemIcon(d, bx + 70, by + 8, it, 3); d.text(bx + 80, by + 44, it.name, 'ink', { align: 'center' }); d.para(bx + 8, by + 58, it.line ?? this.blurb(it), 144, 'navy', { maxLines: 4 }); if (it.price) d.text(bx + 80, by + 100, `Worth ${Math.round(it.price * (g.sys.economy.sellMult()))} beans`, 'night', { align: 'center' }); }
    else d.text(bx + 80, by + 50, 'Empty. Roomy.', 'navy', { align: 'center' });
    d.text(x0, 168, `Tools: ${w.tools.map(t => item(t).name).join(', ') || 'none yet'}`, 'navy'); d.text(x0, 182, `Beans ${w.beans}`, 'ink');
    if (this.mode === 'act') { const acts = this.actions(g, slots[this.sel]); const pw = 110, ph = acts.length * 16 + 10; const px = 150, py = 100; d.panel(px, py, pw, ph, { fill: 'white', trim: 'red' }); const r = ui.menu(this.act, acts.map(a => ({ label: a.label })), { x: px + 5, y: py + 5, w: pw - 10, active }); if (r.pick >= 0) { const a = acts[r.pick]; this.mode = 'browse'; Promise.resolve(a.run()).then(() => { if (this.opts.close) ui.pop(this); }); } if (r.back) this.mode = 'browse'; }
    else if (active) { if (ui.c.pressed('confirm') && slots[this.sel]) this.open(g, slots[this.sel]); if (ui.c.backPressed() || ui.c.pressed('pockets')) ui.pop(this); ui.prompt('confirm', 'Use'); ui.prompt('back', 'Close'); }
    if (this.opts.pick && this.mode === 'browse' && active && ui.c.pressed('confirm') && slots[this.sel]) { const s2 = slots[this.sel]; ui.pop(this); this.opts.pick(s2); }
  }
  blurb(it) { return it.kind === 'furniture' ? `${it.set} set. Place it at home.` : it.kind === 'clothes' ? 'Wear it. Judge yourself.' : 'A thing, in a pocket.'; }
  open(g, s) { if (this.opts.pick) return; this.mode = 'act'; this.act.i = 0; }
  actions(g, s) {
    const it = item(s.id), w = g.world, out = []; const idx = w.pockets.indexOf(s);
    if (it.kind === 'clothes') out.push({ label: 'Wear', run: () => g.sys.wardrobe.wear(g, it) });
    if (it.kind === 'fruit') out.push({ label: 'Eat', run: () => { g.take(it.id); g.sfx('chew'); g.ui.toast('Delicious. It had a point.'); } }, { label: 'Plant', run: () => g.sys.plant.sapling(g, it) });
    if (it.kind === 'seed') out.push({ label: 'Plant seeds', run: () => g.sys.plant.seeds(g, it) });
    if (it.kind === 'sapling') out.push({ label: 'Plant', run: () => g.sys.plant.sapling(g, it) });
    if (it.kind === 'beans') out.push({ label: 'Open (+1000)', run: () => { g.take(it.id); g.addBeans(1000); g.sfx('coin'); g.ui.toast('+1000 beans'); } }, { label: 'Bury it', run: () => g.sys.plant.bury(g, it) });
    if (it.kind === 'medicine') out.push({ label: 'Use', run: () => { g.take(it.id); w.flags.puffy = false; g.ui.toast('The puffiness retreats. You can see your own nose again.'); } });
    if (it.kind === 'record') out.push({ label: 'Keep for the stereo', run: () => g.ui.toast('Put it on a stereo at home.') });
    if (it.kind === 'fish' || it.kind === 'bug' || it.kind === 'fossil' || it.kind === 'art') out.push({ label: 'Donate (Museum)', run: () => g.ui.toast('Hand it to Dr. Quill at the Museum.') });
    if (it.price > 0 && g.sys.economy.canSellHere(g)) out.push({ label: 'Sell', run: () => g.sys.economy.sellItem(g, s) });
    out.push({ label: 'Drop', run: () => { g.take(it.id); const p = g.player; g.dropItem(it.id, p.pos.x + (p.facing?.x ?? 0), p.pos.z + (p.facing?.z ?? 1)); } }); out.push({ label: 'Cancel', run: () => {} });
    return out;
  }
}
export class MapScreen {
  constructor() { this.id = 'map'; this.freeze = true; }
  tick(ui, dt, active) {
    const g = ui.game, d = ui.d, w = g.world; backdrop(d); d.panel(30, 12, 420, 246, { fill: 'white', trim: 'sand' }); d.text(240, 20, `${w.townName}`, 'navy', { align: 'center' });
    const SX = 4.6, ox = 38, oy = 36; const COL = { 0: 'lime', 1: 'sand', 2: 'sky', 3: 'blue', 4: 'sand', 5: 'orange', 6: 'mist', 7: 'green', 8: 'orange' };
    for (let z = 0; z < TD; z += 1) for (let x = 0; x < TW; x += 1) { const t = g.tiles[z * TW + x]; d.rect(ox + x * SX, oy + z * 3.2, SX + 0.6, 4, COL[t] ?? 'lime'); }
    for (const b of BUILDINGS) { d.rect(ox + b.x * SX, oy + b.z * 3.2, b.w * SX, b.d * 3.2, b.kind === 'cottage' ? 'red' : 'plum'); const nm = { bus: 'Bus', hall: 'Hall', museum: 'Museum', store: 'Store', mothwick: 'Mothwick', home: 'Home' }[b.kind]; if (nm) d.text(ox + b.x * SX + b.w * SX / 2, oy + b.z * 3.2 + (b.kind === 'mothwick' ? b.d * 3.2 + 2 : -10), nm, 'ink', { align: 'center' }); }
    for (const n of g.npcs.list) if (!n.sleeping) { d.rect(ox + n.pos.x * SX - 2, oy + n.pos.z * 3.2 - 2, 5, 5, 'white'); d.rect(ox + n.pos.x * SX - 1, oy + n.pos.z * 3.2 - 1, 3, 3, 'red'); if (Math.floor(ui.t * 2) % 2 === 0) d.text(ox + n.pos.x * SX + 6, oy + n.pos.z * 3.2 - 4, n.name.split(' ').pop(), 'ink'); }
    const px = ox + g.player.pos.x * SX, pz = oy + g.player.pos.z * 3.2; if (g.place === 'town') { d.rect(px - 3, pz - 3, 7, 7, 'ink'); d.rect(px - 2, pz - 2, 5, 5, Math.floor(ui.t * 4) % 2 ? 'sand' : 'white'); } else d.text(240, 244, `You are in: ${g.placeName?.() ?? g.place}`, 'navy', { align: 'center' });
    if (active && (ui.c.backPressed() || ui.c.pressed('map'))) ui.pop(this); ui.prompt('back', 'Close');
  }
}
export class AlmanacScreen {
  constructor() { this.id = 'almanac'; this.tab = 0; this.sel = 0; this.freeze = true; this.tabs = ['Fish', 'Bugs', 'Fossils', 'Art', 'Stars', 'Calendar']; }
  list(g) { return [FISH.filter(f => !f.junk), BUGS, FOSSILS, ART][this.tab] ?? []; }
  tick(ui, dt, active) {
    const g = ui.game, d = ui.d, w = g.world; backdrop(d); d.panel(22, 10, 436, 250, { fill: 'white', trim: 'sand' });
    this.tabs.forEach((t, i) => { const x = 36 + i * 68; d.rect(x, 18, 64, 14, i === this.tab ? 'red' : 'mist'); d.text(x + 32, 21, t, i === this.tab ? 'white' : 'ink', { align: 'center' }); });
    if (active) { if (ui.c.pressed('pageL') && !ui.c.pressed('pageR')) { this.tab = (this.tab + 5) % 6; this.sel = 0; } if (ui.c.pressed('nextTool') || ui.c.input.wasPressed('KeyE')) { this.tab = (this.tab + 1) % 6; this.sel = 0; } if (ui.c.pressed('prevTool') || ui.c.input.wasPressed('KeyQ')) { this.tab = (this.tab + 5) % 6; this.sel = 0; } }
    if (this.tab <= 3) {
      const list = this.list(g); const bucket = ['fish', 'bug', 'fossil', 'art'][this.tab]; const cols = 6; if (active) { const n = ui.c.nav; if (n.x) this.sel = (this.sel + n.x + list.length) % list.length; if (n.y) this.sel = Math.min(list.length - 1, Math.max(0, this.sel + n.y * cols)); }
      list.forEach((it, i) => { const x = 40 + (i % cols) * 28, y = 42 + Math.floor(i / cols) * 28; const have = w.coll[bucket][it.id]; d.rect(x, y, 26, 26, i === this.sel ? 'red' : 'mist'); d.rect(x + 1, y + 1, 24, 24, 'white'); if (have) drawItemIcon(d, x + 5, y + 6, it, 1); else { d.rect(x + 5, y + 8, 16, 10, 'mist'); d.text(x + 13, y + 7, '?', 'slate', { align: 'center' }); } });
      const it = list[this.sel]; if (it) { const have = w.coll[bucket][it.id]; d.rect(228, 42, 212, 150, 'sky'); if (have) { drawItemIcon(d, 318, 50, it, 3); d.text(334, 86, it.name, 'ink', { align: 'center' }); d.para(236, 100, it.line, 196, 'navy', { maxLines: 3 }); const where = it.where ? `Where: ${it.where}` : ''; const when = it.seasons ? `Seasons: ${it.seasons.length === 4 ? 'all' : it.seasons.map(s => SEASONS[s]).join(', ')}` : ''; if (where) d.text(236, 140, where, 'night'); if (when) d.text(236, 152, when, 'night'); d.text(236, 164, `Worth ${it.price}`, 'night'); d.text(236, 176, `Caught ${have}`, 'night'); } else { d.text(334, 100, 'Not yet found.', 'navy', { align: 'center' }); d.text(334, 116, 'A silhouette of regret.', 'slate', { align: 'center' }); } }
      const got = list.filter(x => w.coll[bucket][x.id]).length; d.text(40, 230, `${got} of ${list.length} found`, 'navy');
    } else if (this.tab === 4) { d.para(40, 50, 'Six constellations hang over the Lookout. Find them from the bench on a clear night, then press Confirm to give one your own name.', 380, 'navy'); const NAMES = ['The Overdue Library Book', 'The Big Spoon', 'The Goose in Waiting', 'The Reluctant Ladder', 'The Slow Soup', 'The Mayor (Estimated)']; this.starSel ??= 0; const rename = (i) => { const te = new TextEntry({ title: 'Name the constellation', max: 28, text: w.almanac.named[i] ?? NAMES[i] }); ui.push(te); te.promise.then(t => { if (t && t.trim()) { w.almanac.named[i] = t.trim(); ui.game.sfx('reveal'); } }); }; if (active) { const n = ui.c.nav; if (n.y) this.starSel = (this.starSel + n.y + 6) % 6; if (ui.c.pressed('confirm') && w.almanac.stars[this.starSel]) rename(this.starSel); }
      NAMES.forEach((n, i) => { const y = 90 + i * 16; const hv = ui.hit('st' + i, 56, y - 2, 340, 15, active); if (hv.over && ui.c.ptr.moved) this.starSel = i; if (hv.click && w.almanac.stars[i]) rename(i); if (i === this.starSel) d.rect(56, y - 2, 340, 14, 'sky'); d.text(60, y, (w.almanac.stars[i] ? '\u2665 ' : '  ') + (w.almanac.stars[i] ? (w.almanac.named[i] ?? n) : '? ? ?'), w.almanac.stars[i] ? 'ink' : 'slate'); }); }
    else { d.text(240, 44, `Year ${w.year}`, 'navy', { align: 'center' }); for (let i = 0; i < 16; i++) { const x = 60 + (i % 4) * 90, y = 62 + Math.floor(i / 4) * 40; const day = i + 1; d.rect(x, y, 86, 36, day === w.day ? 'red' : 'mist'); d.text(x + 43, y + 4, `${SEASONS[seasonOf(day)]} ${day}`, day === w.day ? 'white' : 'ink', { align: 'center' }); d.text(x + 43, y + 18, ['Market', 'Errand', 'Show', 'Festival'][(day - 1) % 4], day === w.day ? 'white' : 'navy', { align: 'center' }); } d.text(240, 226, g.sys.year?.blurb?.(g) ?? '', 'navy', { align: 'center' }); }
    if (active && ui.c.backPressed()) ui.pop(this); ui.prompt('back', 'Close'); ui.prompt('page', 'Tabs');
  }
}
export class EmoteWheel {
  constructor() { this.id = 'emote'; this.sel = 0; }
  tick(ui, dt, active) {
    const g = ui.game, d = ui.d, w = g.world; const E = ['Laugh', 'Cry', 'Shock', 'Anger', 'Love', 'Shrug', 'Bow', 'Dance']; const have = E.map(e => w.emotes[e] || ['Wave'].includes(e));
    d.rect(150, 40, 180, 190, 'night'); d.text(240, 48, 'Emotes', 'sand', { align: 'center' });
    E.forEach((e, i) => { const a = i / 8 * Math.PI * 2 - Math.PI / 2; const x = 240 + Math.cos(a) * 62, y = 136 + Math.sin(a) * 62; const hv = ui.hit('e' + i, x - 24, y - 8, 48, 16, active); if (hv.over && ui.c.ptr.moved) this.sel = i; const on = have[i] || w.emotes.all; d.rect(x - 24, y - 8, 48, 16, i === this.sel ? 'red' : 'mist'); d.text(x, y - 4, on ? e : '???', i === this.sel ? 'white' : 'ink', { align: 'center' }); if (hv.click) this.go(g, E[i], on, ui); });
    if (active) { const n = ui.c.nav; if (n.x > 0 || n.y > 0) this.sel = (this.sel + 1) % 8; else if (n.x < 0 || n.y < 0) this.sel = (this.sel + 7) % 8; if (ui.c.pressed('confirm')) this.go(g, E[this.sel], have[this.sel] || w.emotes.all, ui); if (ui.c.backPressed()) ui.pop(this); }
    ui.prompt('confirm', 'Emote'); ui.prompt('back', 'Close');
  }
  go(g, e, on, ui) { if (!on) { g.ui.toast('Learn it at the Palace Theatre.'); return; } ui.pop(this); g.player.act(e, 1.6, {}); g.sfx(e === 'Laugh' ? 'laugh' : 'tick'); }
}
const KEYS = ['abcdefghij', 'klmnopqrst', 'uvwxyz.,!?', "0123456789'"];
export class TextEntry {
  constructor(o) { this.id = 'textentry'; this.o = o; this.text = o.text ?? ''; this.max = o.max ?? 120; this.r = 0; this.c = 0; this.caps = true; this.resolve = null; this.promise = new Promise(r => { this.resolve = r; }); this.freeze = true; this.capsLock = false; }
  open(ui) { this.onKey = (e) => { if (!ui.stack.includes(this) || ui.top !== this) return; ui.c.input.send({ t: 'key', key: e.key }); e.preventDefault(); }; if (typeof window !== 'undefined') window.addEventListener('keydown', this.onKey); ui.c.input.send?.({ t: 'noop' }); }
  close() { if (typeof window !== 'undefined') window.removeEventListener('keydown', this.onKey); }
  done(ui) { ui.pop(this); this.resolve(this.text); }
  tick(ui, dt, active) {
    for (const cmd of ui.c.input.commands) if (cmd && cmd.t === 'key' && active) { if (cmd.key === 'Backspace') this.text = this.text.slice(0, -1); else if (cmd.key === 'Enter') { this.done(ui); return; } else if (cmd.key.length === 1 && this.text.length < this.max) this.text += cmd.key; }
    const d = ui.d, g = ui.game; const paper = this.o.paper; backdrop(d); d.panel(30, 14, 420, 242, { fill: paper ? 'sand' : 'white', trim: 'sand' }); d.text(240, 22, this.o.title ?? 'Write something', 'navy', { align: 'center' });
    d.rect(44, 40, 392, 80, paper ? 'white' : 'mist'); const lines = wrapText(this.text + (Math.floor(ui.t * 2) % 2 ? '_' : ' '), 380); lines.slice(-6).forEach((l, i) => d.text(50, 44 + i * 12, l, 'ink'));
    const kx = 70, ky = 130; KEYS.forEach((row, ri) => [...row].forEach((ch, ci) => { const x = kx + ci * 32, y = ky + ri * 20; const sel = ri === this.r && ci === this.c; const hv = ui.hit('k' + ri + ci, x, y, 28, 17, active); if (hv.over && ui.c.ptr.moved) { this.r = ri; this.c = ci; } if (hv.click) this.press(ch, ui); d.rect(x, y, 28, 17, sel ? 'red' : 'mist'); d.text(x + 14, y + 4, this.caps ? ch.toUpperCase() : ch, sel ? 'white' : 'ink', { align: 'center' }); }));
    const by = 214; [['Space', 70], ['Delete', 130], ['Caps', 190], this.o.suggest ? ['Random', 250] : null, ['Done', 330]].filter(Boolean).forEach(([l, x], i) => { const sel = this.r === 4 && this.c === i; const hv = ui.hit('b' + i, x, by, 54, 17, active); if (hv.over && ui.c.ptr.moved) { this.r = 4; this.c = i; } if (hv.click) this.press(l, ui); d.rect(x, by, 54, 17, sel ? 'red' : 'sky'); d.text(x + 27, by + 4, l, sel ? 'white' : 'ink', { align: 'center' }); });
    if (active) { const n = ui.c.nav; const nb = this.o.suggest ? 5 : 4; if (n.y) { this.r = (this.r + n.y + 5) % 5; this.c = Math.min(this.c, this.r === 4 ? nb - 1 : 9); } if (n.x) this.c = (this.c + n.x + (this.r === 4 ? nb : 10)) % (this.r === 4 ? nb : 10);
      if (ui.c.pressed('confirm') && !ui.c.input.isDown('KeyE') || ui.c.input.wasPressed('PadCross')) { if (this.r === 4) this.press(['Space', 'Delete', 'Caps', ...(this.o.suggest ? ['Random'] : []), 'Done'][this.c], ui); else this.press(KEYS[this.r][this.c], ui); }
      if (ui.c.input.wasPressed('PadSquare')) this.text = this.text.slice(0, -1); if (ui.c.input.wasPressed('PadTriangle') && this.o.suggest) this.text = this.o.suggest(); }
    ui.prompt('confirm', 'Type'); if (this.o.suggest) ui.prompt('alt', 'Random');
  }
  press(l, ui) { if (l === 'Space') this.text += ' '; else if (l === 'Delete') this.text = this.text.slice(0, -1); else if (l === 'Caps') this.caps = !this.caps; else if (l === 'Random') this.text = this.o.suggest(); else if (l === 'Done') this.done(ui); else if (this.text.length < this.max) { this.text += this.caps && this.text.length === 0 || /[.!?] $/.test(this.text) ? l.toUpperCase() : (this.caps ? l.toUpperCase() : l); } ui.game.sfx('tick'); }
}
/** Generic list chooser with big cards (catalogue, shops). items: [{label, sub, value, item?, disabled}] */
export class ListScreen {
  constructor(o) { this.id = 'list'; this.o = o; this.st = { i: 0 }; this.freeze = true; this.promise = new Promise(r => { this.resolve = r; }); }
  tick(ui, dt, active) {
    const g = ui.game, d = ui.d, o = this.o; const items = typeof o.items === 'function' ? o.items() : o.items; backdrop(d); d.panel(40, 14, 400, 242, { fill: 'white', trim: 'sand' }); d.text(240, 22, o.title, 'navy', { align: 'center' });
    d.rect(52, 36, 200, 200, 'mist'); const r = ui.menu(this.st, items.map(i => ({ label: i.label, value: i.value, disabled: i.disabled })), { x: 54, y: 38, w: 196, rh: 17, active, scroll: true, rows: 11, focusDisabled: true });
    const cur = items[this.st.i]; d.rect(262, 36, 166, 200, 'sky'); if (cur) { if (cur.item) drawItemIcon(d, 330, 44, cur.item, 3); d.text(345, 80, cur.label, 'ink', { align: 'center' }); d.para(268, 94, cur.sub ?? '', 156, 'navy', { maxLines: 8 }); }
    d.text(268, 222, `Beans ${g.world.beans}`, 'ink'); if (r.pick >= 0 && !items[r.pick].disabled) { const res = o.onPick?.(items[r.pick], r.pick, this); if (res === 'close') { ui.pop(this); this.resolve(items[r.pick]); } }
    if (r.back) { ui.pop(this); this.resolve(null); } ui.prompt('confirm', o.pickLabel ?? 'Choose'); ui.prompt('back', 'Back');
  }
}
export const confirmBox = async (g, who, text, yes = 'Yes', no = 'No') => (await g.ask(who, text, [yes, no])) === 0;
export class PauseScreen {
  constructor() { this.id = 'pause'; this.st = { i: 0 }; this.freeze = true; }
  tick(ui, dt, active) {
    const g = ui.game, d = ui.d; d.rect(0, 0, W, H, 'night'); d.panel(150, 30, 180, 214, { fill: 'white', trim: 'sand' }); d.text(240, 38, 'Paused', 'navy', { align: 'center' });
    const items = [{ id: 'resume', label: 'Resume' }, { id: 'map', label: 'Map' }, { id: 'almanac', label: 'Almanac' }, { id: 'settings', label: 'Settings' }, { id: 'about', label: 'About' }, { id: 'dev', label: 'Dev Mode' }, { id: 'quit', label: 'Save & Quit to Title' }];
    const r = ui.menu(this.st, items, { x: 160, y: 56, w: 160, rh: 22, active });
    if (r.pick >= 0) { const id = items[r.pick].id; if (id === 'resume') ui.pop(this); else if (id === 'map') ui.push(new MapScreen()); else if (id === 'almanac') ui.push(new AlmanacScreen()); else if (id === 'settings') g.openSettings(); else if (id === 'about') g.sys.about.open(g); else if (id === 'dev') g.sys.dev.open(g); else if (id === 'quit') g.quitToTitle(); }
    if (r.back || (active && ui.c.pressed('pause'))) ui.pop(this); ui.prompt('confirm', 'Select'); ui.prompt('back', 'Resume');
  }
}
