// The Case: a grid you pack by hand. Tabs: CASE VALUABLES KEY ITEMS MAP FILES RADIO.
import { app } from '../core/app.js';
import { ui } from '../core/ui.js';
import { footprint } from '../game/caseModel.js';
import { ITEMS, VALUABLES, KEY_ITEMS, combineHerbs } from '../data/items.js';
import { WEAPONS } from '../data/weapons.js';
import { NOTES, NOTE_ORDER, HINTS, HINT_JINGLE } from '../data/notes.js';
import { drawIcon, drawValuable } from './icons.js';
import { findCells } from '../game/mapPaint.js';

const TABS = ['CASE', 'VALUABLES', 'KEY ITEMS', 'MAP', 'FILES', 'RADIO'];
let CELL = 14;
const MAP_COLORS = { '#': 'night', T: 'plum', '~': 'navy', '.': 'slate', ',': 'green', '=': 'orange', ':': 'sand', _: 'mist', '%': 'teal', H: 'plum', D: 'red', G: 'red', S: 'red', W: 'cyan', c: 'slate', r: 'sand', B: 'orange' };

export class CaseScreen {
  constructor(opts = {}) {
    this.tab = TABS.indexOf(opts.tab || 'CASE'); if (this.tab < 0) this.tab = 0;
    this.cx = 0; this.cy = 0; this.held = null; this.menu = null; this.menuState = { i: 0 }; this.combine = null; this.list = { i: 0 }; this.noteI = 0; this.msg = ''; this.msgT = 0;
    this.pending = opts.pending || null; this.arrange = !!opts.pending; this.rowsState = { i: 0 };
    this.sockets = null; this.radioI = 0; this.radioShown = null;
  }
  enter() { if (this.pending) { const p = this.pending; this.held = { kind: p.kind === 'weapon' ? 'weapon' : 'item', id: p.id, count: p.count ?? 1, rot: 0, uid: -1, fresh: true, from: null }; } }
  flash(m) { this.msg = m; this.msgT = 2; }
  frame(host) {
    const run = app.run, cs = run.case, nav = ui.nav, W = ui.W, H = ui.H;
    ui.rect(0, 0, W, H, 'ink');
    if (this.msgT > 0) this.msgT -= 1 / 60;
    const clicked = ui.tabs(10, 6, TABS, this.tab);
    if (clicked >= 0) this.tab = clicked;
    if (!this.held && !this.menu && !this.combine) { if (nav.prev) this.tab = (this.tab + TABS.length - 1) % TABS.length; if (nav.next && !this.arrangeKey()) this.tab = (this.tab + 1) % TABS.length; }
    if (nav.back && !this.held && !this.menu && !this.combine) { app.pop(); host.ctx?.audio.play('uiBack'); return; }
    if (this.tab === 0) this.caseTab(host, run, cs);
    else if (this.tab === 1) this.valuablesTab(host, run);
    else if (this.tab === 2) this.keyTab(run);
    else if (this.tab === 3) this.mapTab(host, run);
    else if (this.tab === 4) this.filesTab(run);
    else this.radioTab(host, run);
    ui.text(W - 8, 8, `${run.doubloons} DBL`, { align: 'right', color: 'sand' });
    if (this.msgT > 0) ui.text(W / 2, H - 28, this.msg, { align: 'center', color: 'sand' });
  }
  arrangeKey() { return false; }
  caseTab(host, run, cs) {
    const nav = ui.nav, ctx = host.ctx || app.engine.context;
    CELL = Math.max(12, Math.min(20, Math.floor((ui.W - 170) / cs.w)));
    const gx = 12, gy = 32, gw = cs.w * CELL, gh = cs.h * CELL;
    ui.panel(gx - 3, gy - 3, gw + 6, gh + 6, { fill: 'night', edge: 'slate' });
    for (let y = 0; y < cs.h; y++) for (let x = 0; x < cs.w; x++) ui.rect(gx + x * CELL, gy + y * CELL, CELL - 1, CELL - 1, (x + y) % 2 ? 'navy' : 'night');
    // mouse hover sets the cursor
    const inGrid = ui.ptr.over && ui.ptr.x >= gx && ui.ptr.x < gx + gw && ui.ptr.y >= gy && ui.ptr.y < gy + gh;
    if (ui.ptr.moved && inGrid && !this.menu) { this.cx = Math.floor((ui.ptr.x - gx) / CELL); this.cy = Math.floor((ui.ptr.y - gy) / CELL); }
    const confirm = nav.ok || (nav.click && inGrid);
    // items
    for (const e of cs.items) {
      if (this.held && this.held.uid === e.uid) continue;
      const f = footprint(e); const x = gx + e.x * CELL, y = gy + e.y * CELL;
      const flash = this.combine && this.combine.uid === e.uid;
      ui.rect(x, y, f[0] * CELL - 1, f[1] * CELL - 1, flash ? 'orange' : (e.kind === 'weapon' ? 'slate' : 'slate'));
      ui.rect(x + 1, y + 1, f[0] * CELL - 3, f[1] * CELL - 3, e.kind === 'weapon' ? 'navy' : 'night');
      drawIcon(ui, e.kind, e.id, x + 1, y + 1, f[0] * CELL - 3, f[1] * CELL - 3, e.rot);
      if (e.kind === 'item' && ITEMS[e.id].stack) ui.text(x + f[0] * CELL - 3, y + f[1] * CELL - 9, String(e.count), { align: 'right', color: 'white' });
      if (e.kind === 'weapon' && run.equipped === e.id) ui.text(x + 3, y + 3, 'E', { color: 'orange' });
    }
    // held item follows the cursor
    const under = cs.at(this.cx, this.cy);
    if (this.held) {
      const fp = footprint(this.held); const ok = cs.fitsAt(this.held, this.cx, this.cy, this.held.rot, this.held.uid);
      const x = gx + this.cx * CELL, y = gy + this.cy * CELL;
      ui.rect(x - 1, y - 1, fp[0] * CELL + 1, fp[1] * CELL + 1, ok ? 'lime' : 'red'); ui.rect(x, y, fp[0] * CELL - 1, fp[1] * CELL - 1, 'ink');
      drawIcon(ui, this.held.kind, this.held.id, x, y, fp[0] * CELL - 1, fp[1] * CELL - 1, this.held.rot);
    } else if (!this.menu) { const x = gx + this.cx * CELL, y = gy + this.cy * CELL; ui.rect(x - 1, y - 1, CELL + 1, 2, 'orange'); ui.rect(x - 1, y + CELL - 1, CELL + 1, 2, 'orange'); ui.rect(x - 1, y - 1, 2, CELL + 1, 'orange'); ui.rect(x + CELL - 1, y - 1, 2, CELL + 1, 'orange'); }
    // right info
    const rx = gx + gw + 14, rw = ui.W - rx - 8;
    const info = this.held || under;
    if (info) {
      const def = info.kind === 'weapon' ? WEAPONS[info.id] : ITEMS[info.id];
      ui.panel(rx, gy, rw, 86, { fill: 'night' });
      const ibox = 44; ui.rect(rx + 6, gy + 6, ibox, ibox, 'ink'); drawIcon(ui, info.kind, info.id, rx + 8, gy + 8, ibox - 4, ibox - 4, 0);
      ui.text(rx + ibox + 12, gy + 8, def.name, { color: 'sand' });
      if (info.kind === 'item' && def.stack) ui.text(rx + ibox + 12, gy + 20, `X${info.count}`, { color: 'white' });
      if (info.kind === 'weapon') { const st = run.stat(info.id); ui.text(rx + ibox + 12, gy + 20, `MAG ${run.mags[info.id] ?? 0}/${st.mag}`, { color: 'white' }); }
      ui.paragraph(rx + 6, gy + 56, rw - 12, def.text, { color: 'mist' });
    } else ui.text(rx + 6, gy + 4, `${cs.w}X${cs.h} CASE`, { color: 'mist' });
    const free = cs.w * cs.h - cs.items.reduce((a, e) => { const f = footprint(e); return a + f[0] * f[1]; }, 0);
    ui.text(gx, gy + gh + 8, `${free} CELLS FREE`, { color: 'slate' });
    // controls
    if (this.menu) return this.menuFrame(host, run, cs, gx, gy);
    if (this.combine) {
      if (nav.up && this.cy > 0) this.cy--; if (nav.down && this.cy < cs.h - 1) this.cy++; if (nav.left && this.cx > 0) this.cx--; if (nav.right && this.cx < cs.w - 1) this.cx++;
      const x = gx + this.cx * CELL, y = gy + this.cy * CELL; ui.rect(x - 1, y - 1, CELL + 1, 2, 'lime'); ui.rect(x - 1, y + CELL - 1, CELL + 1, 2, 'lime');
      ui.text(gx, gy + gh + 6, 'COMBINE WITH WHICH?', { color: 'lime' });
      this.handleCombine(host, run, cs); return;
    }
    if (nav.up && this.cy > 0) this.cy--; if (nav.down && this.cy < cs.h - 1) this.cy++; if (nav.left && this.cx > 0) this.cx--; if (nav.right && this.cx < cs.w - 1) this.cx++;
    if (this.held && (nav.second || nav.scroll !== 0 || nav.rclick)) { this.held.rot = this.held.rot ? 0 : 1; ctx.audio.play('uiMove'); }
    if (ctx.input.wasPressed('KeyF', 'PadR1')) { if (cs.arrange()) this.flash('ARRANGED'); else this.flash('CANNOT ARRANGE'); ctx.audio.play('uiOk'); }
    if (this.held) {
      if (confirm) {
        if (cs.fitsAt(this.held, this.cx, this.cy, this.held.rot, this.held.uid)) {
          const h = this.held; h.x = this.cx; h.y = this.cy; if (h.uid < 0) { h.uid = cs.nextUid++; } cs.items.push({ ...h, uid: h.uid, from: undefined, fresh: undefined });
          if (h.fresh && this.pending) { this.pending.collected = true; host.finishPendingPickup?.(this.pending); }
          this.held = null; this.arrange = false; ctx.audio.play('uiOk');
          if (this.pending) { this.pending = null; app.pop(); return; }
        } else { ctx.audio.play('uiNo'); this.flash('NO ROOM THERE'); }
      }
      if (nav.back) {
        if (this.held.from) { cs.items.push(this.held.from); this.held = null; }
        else if (this.held.fresh) { this.held = null; this.pending = null; app.pop(); return; }
        ctx.audio.play('uiBack');
      }
      if (ctx.input.wasPressed('KeyX', 'PadTriangle') && host.dropFromCase) { host.dropFromCase(this.held); this.held = null; if (this.pending) { this.pending = null; app.pop(); return; } }
    } else if (confirm && under) {
      this.menu = under; this.menuState = { i: 0 }; ctx.audio.play('uiOk');
    }
  }
  menuOptions(e) {
    const opts = ['MOVE'];
    if (e.kind === 'weapon') opts.unshift('EQUIP');
    else if (ITEMS[e.id].kind === 'herb') { opts.unshift('USE'); opts.splice(1, 0, 'COMBINE'); }
    else if (ITEMS[e.id].kind === 'grenade') opts.unshift('SELECT');
    opts.push('DROP');
    return opts;
  }
  menuFrame(host, run, cs, gx, gy) {
    const e = this.menu, nav = ui.nav, ctx = host.ctx || app.engine.context;
    const opts = this.menuOptions(e);
    const x = gx + (e.x + 1) * CELL + 2, y = gy + e.y * CELL;
    ui.panel(x, y, 70, opts.length * 14 + 6, { fill: 'ink', edge: 'orange' });
    const r = ui.list(x + 3, y + 3, 64, opts.map((o) => ({ label: o })), this.menuState, {});
    if (nav.back) { this.menu = null; return; }
    if (r.ok >= 0) {
      const o = opts[r.ok]; this.menu = null;
      if (o === 'MOVE') { cs.remove(e.uid); this.held = { ...e, from: { ...e } }; }
      else if (o === 'EQUIP') { host.player?.equip(e.id); run.equipped = e.id; this.flash(WEAPONS[e.id].name + ' EQUIPPED'); }
      else if (o === 'SELECT') { run.grenade = e.id; this.flash('SELECTED'); }
      else if (o === 'USE') { if (run.hp >= run.maxHp) this.flash('COVERAGE IS FULL'); else { const d = ITEMS[e.id]; cs.take(e.id, 1); if (d.maxUp) run.maxHp += d.maxUp; run.heal(d.heal || 0.3); this.flash('COVERAGE RESTORED'); ctx.audio.play('heal'); } }
      else if (o === 'COMBINE') { this.combine = e; this.flash('PICK THE OTHER HERB'); }
      else if (o === 'DROP') { cs.remove(e.uid); host.dropFromCase?.(e); }
      ctx.audio.play('uiOk');
    }
  }
  /** Combine mode: Cross on a second herb. */
  handleCombine(host, run, cs) {
    const nav = ui.nav;
    if (!this.combine) return;
    if (nav.back) { this.combine = null; return; }
    if (nav.ok) {
      const o = cs.at(this.cx, this.cy);
      if (o && o.uid !== this.combine.uid && o.kind === 'item') {
        const res = combineHerbs(this.combine.id, o.id);
        if (res) { const a = this.combine; cs.remove(o.uid); cs.remove(a.uid); const r = cs.add('item', res, 1); this.flash(ITEMS[res].name + ' MADE'); }
        else this.flash('THOSE DO NOT MIX');
      }
      this.combine = null;
    }
  }
  valuablesTab(host, run) {
    const x = 20, y = 30; const rows = run.valuables.map((v, i) => ({ label: VALUABLES[v.id].name + (VALUABLES[v.id].sockets ? ` (${v.sockets.length}/3)` : ''), value: run.valuableValue(v) }));
    ui.text(x, y - 2, 'VALUABLES', { scale: 2, color: 'sand' });
    if (!rows.length) { ui.text(x, y + 26, 'NOTHING OF VALUE. YET.', { color: 'mist' }); return; }
    const r = ui.list(x, y + 22, 200, rows, this.rowsState, {});
    const sel = run.valuables[this.rowsState.i];
    if (sel) {
      ui.panel(240, 52, ui.W - 252, 80, { fill: 'night' }); drawValuable(ui, sel.id, 252, 60, 40);
      ui.text(300, 62, VALUABLES[sel.id].name, { color: 'sand' }); ui.paragraph(252, 104, ui.W - 276, VALUABLES[sel.id].text, { color: 'mist' });
      const rel = run.valuables.findIndex((v) => VALUABLES[v.id].sockets);
      if (r.ok >= 0 && rel >= 0 && rel !== this.rowsState.i) { if (run.socket(rel, sel.id)) this.flash('SOCKETED INTO THE RELIQUARY'); else this.flash('DOES NOT FIT'); }
      if (rel >= 0 && rel !== this.rowsState.i) ui.text(240, 140, 'CROSS: SOCKET INTO RELIQUARY', { color: 'mist' });
    }
  }
  keyTab(run) {
    ui.text(20, 28, 'KEY ITEMS', { scale: 2, color: 'sand' });
    const rows = run.keyItems.map((k) => ({ label: KEY_ITEMS[k]?.name || k.toUpperCase() }));
    if (!rows.length) { ui.text(20, 56, 'NO KEYS. NO LUCK. NO PROBLEM.', { color: 'mist' }); return; }
    ui.list(20, 50, 190, rows, this.list, {});
    const k = KEY_ITEMS[run.keyItems[this.list.i]]; if (k) { ui.panel(230, 50, ui.W - 242, 60, { fill: 'night' }); ui.text(238, 56, k.name, { color: 'sand' }); ui.paragraph(238, 70, ui.W - 260, k.text, { color: 'mist' }); }
  }
  mapTab(host, run) {
    const map = host.map; ui.text(20, 28, 'MAP', { scale: 2, color: 'sand' });
    if (!map) { ui.text(20, 50, 'NO MAP FOR THIS PLACE.', { color: 'mist' }); return; }
    const s = Math.max(2, Math.min(3, Math.floor(Math.min((ui.W - 30) / map.W, (ui.H - 70) / map.H)))), ox = Math.floor((ui.W - map.W * s) / 2), oy = 44;
    for (let r = 0; r < map.H; r++) for (let c = 0; c < map.W; c++) { const ch = map.rows[r][c]; const col = MAP_COLORS[ch]; if (col) ui.rect(ox + c * s, oy + r * s, s, s, col); else ui.rect(ox + c * s, oy + r * s, s, s, 'slate'); }
    const mk = (ch, color, size = s + 1) => { for (const m of host.level.markers[ch] || []) ui.rect(ox + m.col * s - 1, oy + m.row * s - 1, size, size, color); };
    mk('m', 'green', s + 2); mk('t', 'lime', s + 2); mk('$', 'sand', s + 1); mk('d', 'white', s + 1);
    if (run.chart) for (const t of host.tannoys || []) if (t.alive) { const c = Math.floor(t.x + map.W / 2), r = Math.floor(t.z + map.H / 2); ui.rect(ox + c * s - 1, oy + r * s - 1, s + 1, s + 1, 'cyan'); }
    const p = host.player; if (p && Math.sin(ui.t * 8) > -0.3) { const c = Math.floor(p.x + map.W / 2), r = Math.floor(p.z + map.H / 2); ui.rect(ox + c * s - 1, oy + r * s - 1, s + 3, s + 3, 'red'); }
    ui.text(20, ui.H - 24, run.chart ? 'CYAN: TANNOYS   GREEN: FATHOM   LIME: TELEGRAPH' : 'GREEN: FATHOM   LIME: TELEGRAPH   (BUY A CHART FOR TANNOYS)', { color: 'mist' });
  }
  filesTab(run) {
    ui.text(20, 28, 'FILES', { scale: 2, color: 'sand' });
    const have = NOTE_ORDER.filter((n) => run.notes.includes(n));
    if (!have.length) { ui.text(20, 56, 'NO CLAIM NOTES FILED.', { color: 'mist' }); ui.text(20, 68, `${0}/${NOTE_ORDER.length}`, { color: 'slate' }); return; }
    this.noteI = Math.max(0, Math.min(have.length - 1, this.noteI)); if (ui.nav.down || ui.nav.right) this.noteI = Math.min(have.length - 1, this.noteI + 1); if (ui.nav.up || ui.nav.left) this.noteI = Math.max(0, this.noteI - 1);
    const n = NOTES[have[this.noteI]];
    ui.panel(30, 50, ui.W - 60, 110, { fill: 'night' }); ui.text(40, 58, n.title, { scale: 2, color: 'white' });
    n.lines.forEach((l, i) => ui.text(40, 84 + i * 14, l, { color: 'mist' }));
    ui.text(ui.W / 2, 150, `${this.noteI + 1}/${have.length} OF ${NOTE_ORDER.length}`, { align: 'center', color: 'slate' });
  }
  radioTab(host, run) {
    ui.text(20, 28, 'RADIO', { scale: 2, color: 'sand' });
    const safe = host.isSafe ? host.isSafe() : true;
    const rows = HINTS.map((h, i) => ({ label: `CLAIMS DESK HINT ${i + 1}` }));
    const r = ui.list(20, 50, 190, rows.slice(0, 7), this.list2 ||= { i: 0 }, {});
    ui.panel(230, 50, ui.W - 242, 100, { fill: 'night' });
    if (r.ok >= 0 || this.radioShown !== null) { if (r.ok >= 0) { this.radioShown = r.ok; host.ctx?.audio.play('bell'); } }
    if (this.radioShown !== null) {
      ui.text(238, 56, 'MR. PYM', { color: 'cyan' });
      ui.paragraph(238, 68, ui.W - 260, safe ? HINT_JINGLE + ' ' + HINTS[this.radioShown] : 'MS. RANSOM, I CANNOT TALK WITH THAT NOISE. PLEASE FIND A DRY ROOM.', { color: 'white' });
    } else ui.text(238, 60, 'PRESS CONFIRM FOR A HINT.', { color: 'mist' });
  }
}
