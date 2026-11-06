// The Case: an Ostrander Mutual sample case. Tabs: CASE, VALUABLES, KEY ITEMS, MAP, FILES, RADIO. Time frozen.
import { ITEMS } from '../data/items.js';
import { WEAPONS } from '../data/weapons.js';
import { NOTES } from '../data/notes.js';
import { PYM_HINTS } from '../data/dialogue.js';
import { addItem, arrange, combinable, combine, fits, fp, removeItem, socketInto, treasureValue, useHerb, reliquaryFull } from '../core/run.js';
import { device } from '../core/device.js';
import { iconFor } from '../models/icons.js';
import { pymLine } from '../game/director.js';
const CELL = 14; const TABS = ['CASE', 'VALUABLES', 'KEY ITEMS', 'MAP', 'FILES', 'RADIO'];
export function openCase(A, o = {}) { A.openMenu(new CaseScreen(A, o)); }
export const openMapTab = (A) => openCase(A, { tab: 3 });
export class CaseScreen {
  constructor(A, o) { this.A = A; this.s = { tab: o.tab ?? 0, focus: 0 }; this.cx = 0; this.cy = 0; this.held = null; this.menu = null; this.incoming = o.incoming ?? null; this.r1 = 0; if (o.focusNote) this.s.focus = A.run.notes.indexOf(o.focusNote); if (o.incoming) { this.held = { id: o.incoming.id, count: o.incoming.count, rot: false, fresh: true }; } if (this.A.ctx.audio) this.A.ctx.audio.play('uiconfirm'); }
  close() { const A = this.A; if (this.held) { if (this.held.orig) { Object.assign(this.held.orig, { x: this.held.ox, y: this.held.oy, rot: this.held.orot }); A.run.items.push(this.held.orig); } this.held = null; } if (this.incoming) this.incoming = null; A.closeMenu(); A.ctx.audio.play('uiback'); }
  update(ui) {
    const A = this.A, run = A.run; ui.rect(0, 0, ui.W, ui.H, 'ink');
    // R1 tap changes tab; hold arranges (CASE tab).
    if (this.s.tab === 0) { const I = ui.input; if (ui.padDown('PadR1')) { this.r1 += 1 / 60; if (this.r1 > 0.45 && !this.arrDone) { this.arrDone = true; this.doArrange(); } ui.tabNext = false; } else { if (this.r1 > 0 && this.r1 <= 0.45) ui.tabNext = true; else if (I.wasPressed('KeyE')) ui.tabNext = true; else ui.tabNext = false; this.r1 = 0; this.arrDone = false; } }
    if (!this.menu && !this.held) ui.tabs(this.s, TABS, 10);
    const tab = this.s.tab; ui.text(ui.W - 66, ui.H - 26, `${run.money} D`, { color: 'sand' });
    if (tab === 0) this.caseTab(ui); else if (tab === 1) this.listTab(ui, run.valuables, 'treasure'); else if (tab === 2) this.listTab(ui, run.keys, 'key'); else if (tab === 3) this.mapTab(ui); else if (tab === 4) this.filesTab(ui); else this.radioTab(ui);
    if (ui.back && !this.menu && !this.held) this.close(); else if (ui.back && this.menu) { this.menu = null; ui.back = false; ui.sound('uiback'); } else if (ui.back && this.held && !this.menu) this.cancelHeld(ui);
    if (this.opened && BIND_CLOSE(ui) && !this.held && !this.menu) this.close(); this.opened = true;
  }
  cancelHeld(ui) { const h = this.held; if (h.orig) { Object.assign(h.orig, { x: h.ox, y: h.oy, rot: h.orot }); this.A.run.items.push(h.orig); this.held = null; } else if (h.fresh) { this.held = null; this.incoming = null; this.close(); } ui.sound('uiback'); }
  doArrange() { const r = this.A.run; if (arrange(r)) this.A.ctx.audio.play('uiconfirm'); else this.A.ctx.audio.play('uideny'); }
  caseTab(ui) {
    const A = this.A, run = A.run, G = run.grid, gx = 18, gy = 34, gw = G.w * CELL, gh = G.h * CELL;
    ui.panel(gx - 2, gy - 2, gw + 4, gh + 4, { bg: 'night', border: 'slate' });
    for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) { ui.rect(gx + x * CELL, gy + y * CELL, CELL - 1, CELL - 1, 'navy'); }
    for (const it of run.items) { const [w, h] = fp(it), px = gx + it.x * CELL, py = gy + it.y * CELL; ui.rect(px, py, w * CELL - 1, h * CELL - 1, run.weapon === it.id ? 'plum' : 'night'); const ic = iconFor(it.id, it.rot); ui.hud.sprite(px, py, ic.rows, ic.colors); if (ITEMS[it.id].max) ui.text(px + 1, py + h * CELL - 9, String(it.count), { color: 'white' }); }
    // Cursor
    if (!this.menu) {
      if (ui.nav.left) this.cx--; if (ui.nav.right) this.cx++; if (ui.nav.up) this.cy--; if (ui.nav.down) this.cy++;
      if (Object.keys(ui.nav).length) ui.sound('uimove');
      if (ui.hover && ui.within(gx, gy, gw, gh)) { this.cx = Math.floor((ui.px - gx) / CELL); this.cy = Math.floor((ui.py - gy) / CELL); }
      this.cx = Math.max(0, Math.min(G.w - 1, this.cx)); this.cy = Math.max(0, Math.min(G.h - 1, this.cy));
    }
    const under = run.items.find((it) => { const [w, h] = fp(it); return this.cx >= it.x && this.cx < it.x + w && this.cy >= it.y && this.cy < it.y + h; });
    const focus = this.held ?? under;
    if (this.held) {
      const h = this.held, [w, hh] = fp(h); const nx = Math.min(this.cx, G.w - w), ny = Math.min(this.cy, G.h - hh); const ok = fits(run, h, Math.max(0, nx), Math.max(0, ny)); const px = gx + Math.max(0, nx) * CELL, py = gy + Math.max(0, ny) * CELL;
      ui.rect(px - 1, py - 1, w * CELL + 1, hh * CELL + 1, ok ? 'green' : 'red'); ui.rect(px, py, w * CELL - 1, hh * CELL - 1, 'night'); const ic = iconFor(h.id, h.rot); ui.hud.sprite(px, py, ic.rows, ic.colors);
      if (ui.secondary || ui.rclick || ui.wheel) { h.rot = !h.rot; ui.sound('uimove'); }
      if (ui.confirm || (ui.click && ui.within(gx, gy, gw, gh, ui.cx, ui.cy))) {
        if (ok) { this.placeHeld(Math.max(0, nx), Math.max(0, ny), ui); } else ui.sound('uideny');
      }
      if (ui.tertiary) this.dropHeld(ui);
    } else if (this.menu) { this.itemMenu(ui, gx, gy); } else {
      const px = gx + this.cx * CELL, py = gy + this.cy * CELL; const bl = Math.floor(ui.t * 4) % 2 ? 'sand' : 'white';
      if (under) { const [w, h] = fp(under); const ux = gx + under.x * CELL, uy = gy + under.y * CELL, uw = w * CELL - 1, uh = h * CELL - 1; ui.rect(ux, uy, uw, 1, bl); ui.rect(ux, uy + uh, uw, 1, bl); ui.rect(ux, uy, 1, uh, bl); ui.rect(ux + uw, uy, 1, uh + 1, bl); } else { ui.rect(px, py, CELL - 1, 1, bl); ui.rect(px, py + CELL - 2, CELL - 1, 1, bl); ui.rect(px, py, 1, CELL - 1, bl); ui.rect(px + CELL - 2, py, 1, CELL - 1, bl); }
      if ((ui.confirm || (ui.click && ui.within(gx, gy, gw, gh, ui.cx, ui.cy))) && under) { this.menu = { it: under, s: { focus: 0 }, mode: 'root' }; ui.confirm = false; ui.click = false; ui.sound('uiconfirm'); }
      else if (ui.secondary && under) this.pickUp(under, ui);
      else if (ui.tertiary && under) { this.pickUp(under, ui); this.dropHeld(ui); }
      if (ui.input.wasPressed('KeyF')) this.doArrange();
    }
    this.infoPanel(ui, focus, gx + gw + 14, gy);
    const pr = this.held ? [['confirm', 'PLACE'], ['secondary', 'ROTATE'], ['tertiary', 'DROP'], ['back', 'CANCEL']] : this.menu ? [['confirm', 'SELECT'], ['back', 'BACK']] : [['confirm', 'USE'], ['secondary', 'MOVE'], ['tertiary', 'DROP'], [device.last === 'pad' ? 'PadR1' : 'KeyF', 'HOLD: ARRANGE'], ['back', 'CLOSE']];
    if (this.incoming && this.held?.fresh) ui.center(gy + gh + 8, 'NO ROOM. PLACE IT, OR LEAVE IT ON THE GROUND.', { color: 'orange' });
    ui.prompts(pr);
  }
  pickUp(it, ui) { const r = this.A.run; removeItem(r, it); this.held = { id: it.id, rot: it.rot, count: it.count, orig: it, ox: it.x, oy: it.y, orot: it.rot }; ui.sound('uimove'); }
  placeHeld(x, y, ui) {
    const A = this.A, run = A.run, h = this.held; ui.sound('uiconfirm');
    if (h.orig) { Object.assign(h.orig, { x, y, rot: h.rot }); run.items.push(h.orig); }
    else { run.items.push({ uid: run.uid++, id: h.id, x, y, rot: h.rot, count: h.count ?? 1 }); if (this.incoming) { A.finishDrop(this.incoming); this.incoming = null; } }
    this.held = null;
  }
  dropHeld(ui) {
    const A = this.A, h = this.held, P = A.player; const d = ITEMS[h.id];
    if (h.fresh) { this.held = null; this.incoming = null; this.close(); return; }
    if (d.kind === 'weapon' && A.run.items.filter((i) => ITEMS[i.id].kind === 'weapon').length === 0) { ui.sound('uideny'); return; }
    A.spawnDrop(P.pos.x + Math.sin(P.yaw) * 0.9, P.pos.z + Math.cos(P.yaw) * 0.9, { id: h.id, count: h.count ?? 1 }); if (A.run.weapon === h.id) { const w = A.run.items.find((i) => ITEMS[i.id].kind === 'weapon'); if (w) P.setWeapon(w.id); }
    this.held = null; ui.sound('uiback');
  }
  itemMenu(ui, gx, gy) {
    const A = this.A, run = A.run, M = this.menu, it = M.it, d = ITEMS[it.id]; const x = gx + 30, y = gy + 24;
    if (M.mode === 'root') {
      const list = []; if (d.kind === 'weapon') list.push({ label: run.weapon === it.id ? 'EQUIPPED' : 'EQUIP', disabled: run.weapon === it.id, go: 'equip' }); if (d.kind === 'herb') list.push({ label: 'USE', disabled: !d.heal, go: 'use' }); if (combinable(run, it).length) list.push({ label: 'COMBINE', go: 'combine' }); list.push({ label: 'MOVE', go: 'move' });
      ui.panel(x - 4, y - 6, 110, list.length * 15 + 8, { bg: 'ink', border: 'sand' }); const i = ui.list(M.s, list, { x, y, w: 102, rowH: 15 });
      if (i >= 0) { const g = list[i].go; if (g === 'equip') { A.player.setWeapon(it.id); this.menu = null; } else if (g === 'use') { useHerb(run, it); ui.sound('pickup'); this.menu = null; } else if (g === 'combine') { M.mode = 'combine'; M.s = { focus: 0 }; } else { this.menu = null; this.pickUp(it, ui); } }
    } else {
      const opts = combinable(run, it); const list = opts.map((o) => ({ label: ITEMS[o.id].name })); ui.panel(x - 4, y - 6, 170, list.length * 15 + 8, { bg: 'ink', border: 'sand' }); const i = ui.list(M.s, list, { x, y, w: 162, rowH: 15 });
      if (i >= 0) { combine(run, it, opts[i]); ui.sound('pickup'); this.menu = null; }
    }
  }
  infoPanel(ui, it, x, y) {
    if (!it) { ui.text(x, y + 4, 'EMPTY', { color: 'slate' }); return; } const d = ITEMS[it.id]; const ic = iconFor(it.id); const w = ui.W - x - 12;
    ui.hud.sprite(x, y, ic.rows, ic.colors); ui.text(x, y + ic.h + 6, d.name, { color: 'white' });
    const about = d.kind === 'weapon' ? WEAPONS[d.weapon].about : (d.about ?? []); let yy = y + ic.h + 18; for (const l of about) { yy += ui.para(x, yy, l, w, { color: 'mist' }) * 10; }
    if (d.kind === 'weapon') { const st = this.A.run.weapons[d.weapon]; ui.text(x, yy + 4, `LOADED ${st?.ammo ?? 0}`, { color: 'sand' }); }
    if (d.kind === 'ammo') ui.text(x, yy + 4, `${it.count} OF ${d.max}`, { color: 'sand' });
  }
  listTab(ui, list, kind) {
    const A = this.A, run = A.run, x = 34, y = 44; if (!list.length) { ui.center(90, kind === 'key' ? 'NO KEY ITEMS' : 'NOTHING OF VALUE', { color: 'slate' }); ui.prompts([['back', 'CLOSE']]); return; }
    const items = list.map((id) => ({ label: ITEMS[id].name, value: kind === 'treasure' ? `${treasureValue(run, id)}` : null })); const i = ui.list(this.s, items, { x, y, w: 210, rowH: 17, max: 7 }); const id = list[this.s.focus]; if (!id) return; const ic = iconFor(id); const px = 270; ui.hud.sprite(px, y, ic.rows, ic.colors, { scale: 2 }); ui.text(px, y + 62, ITEMS[id].name, { color: 'white' }); let yy = y + 74; for (const l of ITEMS[id].about ?? []) yy += ui.para(px, yy, l, ui.W - px - 12, { color: 'mist' }) * 10;
    if (id === 'reliquary') { const s = run.sockets; ui.text(px, yy + 4, `SOCKETS ${['pearl', 'blackpearl', 'amber'].filter((k) => s[k]).length}/3`, { color: 'sand' }); }
    const socketable = ['pearl', 'blackpearl', 'amber'].includes(id) && run.valuables.includes('reliquary') && !run.sockets[id];
    if (socketable && i >= 0) { socketInto(run, id); ui.sound('pickup'); }
    ui.prompts(socketable ? [['confirm', 'SET IN RELIQUARY'], ['back', 'CLOSE']] : [['back', 'CLOSE']]);
  }
  mapTab(ui) {
    const A = this.A, L = A.level, run = A.run, rows = L.rows, s = Math.min(2, Math.floor(Math.min((ui.W - 60) / L.W, (ui.H - 70) / L.H))) || 1, ox = Math.floor(ui.W / 2 - (L.W * s) / 2), oy = 26 + Math.floor((ui.H - 60 - L.H * s) / 2);
    const col = { '#': 'night', T: 'slate', '~': 'navy', H: 'plum', D: 'orange', G: 'red', S: 'red', W: 'cyan', B: 'orange' };
    for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) { const c = rows[y][x]; ui.rect(ox + x * s, oy + y * s, s, s, col[c] ?? 'teal'); }
    const mark = (m, c) => ui.rect(ox + m.col * s - 1, oy + m.row * s - 1, 3, 3, c); for (const m of L.markers.t) mark(m, 'white'); for (const m of L.markers.m) mark(m, 'lime'); if (run.keys.includes('chart')) for (const t of A.tannoys) if (!t.dead) mark(t.m, 'red');
    const P = A.player; const b = Math.floor(ui.t * 3) % 2; ui.rect(ox + L.col(P.pos.x) * s - 1, oy + L.row(P.pos.z) * s - 1, 3, 3, b ? 'sand' : 'white');
    ui.text(10, 28, A.def.title ?? A.id, { color: 'sand' }); ui.text(10, 40, A.objective, { color: 'mist' }); ui.text(10, ui.H - 34, `LOUDSPEAKERS ${run.tannoys.length}/15`, { color: 'mist' }); ui.prompts([['back', 'CLOSE']]);
  }
  filesTab(ui) {
    const run = this.A.run; if (!run.notes.length) { ui.center(90, 'NO FILES YET', { color: 'slate' }); ui.prompts([['back', 'CLOSE']]); return; }
    ui.list(this.s, run.notes.map((id) => ({ label: NOTES[id].title })), { x: 16, y: 44, w: 200, rowH: 17, max: 6, noConfirm: true }); const n = NOTES[run.notes[this.s.focus]]; const x = 232; ui.panel(x, 40, ui.W - x - 12, 120, { bg: 'white', border: 'sand' }); ui.text(x + 8, 48, n.title, { color: 'plum', shadow: false }); let y = 64; for (const l of n.lines) y += ui.para(x + 8, y, l, ui.W - x - 28, { color: 'ink', shadow: false }) * 10 + 3; ui.prompts([['back', 'CLOSE']]);
  }
  radioTab(ui) {
    const A = this.A, safe = (A.safeRooms ?? []).some((m) => Math.hypot(m.x - A.player.pos.x, m.z - A.player.pos.z) < 8);
    const px = 40, py = 50; const a = iconFor('pym'), b = iconFor('max'); ui.hud.sprite(px, py, a.rows, a.colors, { scale: 2 }); ui.hud.sprite(ui.W - px - 64, py, b.rows, b.colors, { scale: 2 }); ui.center(52, 'CLAIMS DESK', { color: 'cyan' });
    ui.para(px + 76, 70, A.def.hint ? PYM_HINTS[A.def.hint] : PYM_HINTS.general, ui.W - 2 * px - 152, { color: safe ? 'white' : 'slate' }); ui.center(136, safe ? 'THE LINE IS CLEAR' : 'LONG CALLS ONLY IN DRY ROOMS. SHORT HINT ON HOLD.', { color: 'sand' });
    const i = ui.list(this.s, [{ label: 'CALL THE DESK' }], { x: ui.W / 2 - 70, y: 156, w: 140, rowH: 16 }); if (i === 0) { A.closeMenu(); A.radio(A.def.hint ?? 'general'); A.app.mix.play('onhold'); A.ctx.tweens.call(6, () => A.app.mix.play(A.def.music ?? null)); return; }
    ui.prompts([['confirm', 'CALL'], ['back', 'CLOSE']]);
  }
}
function BIND_CLOSE(ui) { return ui.input.wasPressed('Tab') || ui.input.wasPressed('KeyI') || (ui.tertiary && false); }
